'use strict';

const { Worker } = require('bullmq');
const axios = require('axios');
const { Op } = require('sequelize');
const { connection } = require('../../queues/connection');
const orderWebhookPayloadBuilder = require('../../services/orderWebhookPayloadBuilder.service');
const { WebhookEndpoint, WebhookDelivery } = require('../../models');
const { validateWebhookUrl } = require('../../utils/ssrfProtector.util');
const { generateTimestampedSignature } = require('../../utils/webhookSigning.util');
const logger = require('../../utils/logger');

const ADMIN_EVENTS_LIST = [
  'order.booked',
  'order.pickup_scheduled',
  'order.picked_up',
  'order.in_transit',
  'order.out_for_delivery',
  'order.delivered',
  'order.ndr',
  'order.rto_initiated',
  'order.rto_delivered',
  'order.cancelled',
  'order.status_changed',
];

/**
 * 30-Day Retention Cleanup for Admin Order Webhook Deliveries (Rule 10)
 */
async function cleanupOldDeliveryLogs() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await WebhookDelivery.destroy({
      where: {
        event: { [Op.in]: ADMIN_EVENTS_LIST },
        created_at: { [Op.lt]: thirtyDaysAgo },
      },
      skipTenantScope: true,
    });
  } catch (err) {
    logger.warn(`[AdminOrderWebhookWorker] Retention cleanup notice: ${err.message}`);
  }
}

/**
 * Process a single admin order webhook dispatch job
 */
async function processAdminOrderWebhookJob(job) {
  // Feature flag check (Rule 3)
  if (process.env.ADMIN_ORDER_WEBHOOK_ENABLED !== 'true') {
    logger.debug('[AdminOrderWebhookWorker] Feature flag disabled; skipping job.');
    return { skipped: true, reason: 'flag_disabled' };
  }

  const { orderId, eventKey, eventTime } = job.data;
  if (!orderId) {
    logger.warn('[AdminOrderWebhookWorker] Missing orderId in job data, skipping.');
    return { skipped: true, reason: 'missing_order_id' };
  }

  logger.info(`[AdminOrderWebhookWorker] Processing job ${job.id} for order ${orderId} (${eventKey})`);

  // Reload and build fresh sanitized payload (Rule 4 & 7)
  let payload;
  try {
    payload = await orderWebhookPayloadBuilder.buildPayload(orderId, eventKey, { eventTime });
  } catch (err) {
    logger.error(`[AdminOrderWebhookWorker] Failed to build payload for order ${orderId}: ${err.message}`);
    throw err;
  }

  // Skip sandbox orders by default (Rule 7)
  if (payload.sandbox && process.env.ADMIN_ORDER_WEBHOOK_ALLOW_SANDBOX !== 'true') {
    logger.debug(`[AdminOrderWebhookWorker] Order ${orderId} is sandbox mode; skipping by default.`);
    return { skipped: true, reason: 'sandbox_order' };
  }

  // Find subscribed active endpoints
  const tenantId = payload.seller?.tenant_id || null;
  const whereClause = { is_active: true };

  if (tenantId) {
    whereClause[Op.or] = [
      { tenant_id: tenantId },
      { tenant_id: null },
    ];
  }

  const endpoints = await WebhookEndpoint.findAll({
    where: whereClause,
    skipTenantScope: true,
  });

  const matchingEndpoints = endpoints.filter((ep) => {
    let evList = ep.events;
    if (typeof evList === 'string') {
      try { evList = JSON.parse(evList); } catch { evList = []; }
    }
    if (!Array.isArray(evList)) evList = [];
    return evList.includes(payload.event) || evList.includes('*') || evList.includes('all');
  });

  if (matchingEndpoints.length === 0) {
    logger.debug(`[AdminOrderWebhookWorker] No active subscribers for event "${payload.event}"`);
    return { skipped: true, reason: 'no_subscribers' };
  }

  let dispatchedCount = 0;

  for (const endpoint of matchingEndpoints) {
    // Idempotency check: Skip if already sent or queued for this endpoint (Rule 6)
    const existing = await WebhookDelivery.findOne({
      where: {
        endpoint_id: endpoint.id,
        event_id: payload.event_id,
      },
      skipTenantScope: true,
    });

    if (existing) {
      logger.info(`[AdminOrderWebhookWorker] Event ${payload.event_id} already exists for endpoint ${endpoint.id}, skipping duplicate.`);
      continue;
    }

    // SSRF URL validation
    const urlValidation = await validateWebhookUrl(endpoint.url);
    if (!urlValidation.isValid) {
      logger.warn(`[AdminOrderWebhookWorker] Blocked delivery to restricted URL: ${endpoint.url} (${urlValidation.reason})`);
      await WebhookDelivery.create({
        endpoint_id: endpoint.id,
        tenant_id: tenantId,
        event: payload.event,
        event_key: payload.event,
        event_id: payload.event_id,
        payload,
        status: 'failed',
        last_error: `Blocked by SSRF protection: ${urlValidation.reason}`,
      }, { skipTenantScope: true });
      continue;
    }

    // Create delivery record
    const delivery = await WebhookDelivery.create({
      endpoint_id: endpoint.id,
      tenant_id: tenantId,
      event: payload.event,
      event_key: payload.event,
      event_id: payload.event_id,
      payload,
      status: 'pending',
      attempts: 1,
      attempt_number: 1,
    }, { skipTenantScope: true });

    // Compute signature headers
    const signature = generateTimestampedSignature(payload, endpoint.secret);
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'NanoShipy-Admin-Webhook/1.0',
      'X-NanoShipy-Event': payload.event,
      'X-NanoShipy-Delivery': delivery.id,
      'X-NanoShipy-Signature': signature,
    };

    const startTime = Date.now();
    try {
      const response = await axios.post(endpoint.url, payload, {
        headers,
        timeout: 10000,
        maxContentLength: 1048576,
      });

      const durationMs = Date.now() - startTime;
      const rawBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      // Truncate response body (Rule 10)
      const truncatedBody = String(rawBody || '').slice(0, 1000);

      await delivery.update({
        status: 'delivered',
        response_status_code: response.status,
        response_body: truncatedBody,
        delivered_at: new Date(),
        last_error: null,
      });

      dispatchedCount++;
      logger.info(`[AdminOrderWebhookWorker] Successfully delivered ${payload.event} to ${endpoint.url} (${response.status}, ${durationMs}ms)`);
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const respStatus = err.response?.status || null;
      const respData = err.response?.data ? (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data)) : null;
      // Truncate response body (Rule 10)
      const truncatedBody = respData ? String(respData).slice(0, 1000) : null;

      await delivery.update({
        status: 'failed',
        response_status_code: respStatus,
        response_body: truncatedBody,
        last_error: err.message,
      });

      logger.warn(`[AdminOrderWebhookWorker] Failed delivery of ${payload.event} to ${endpoint.url}: ${err.message} (${durationMs}ms)`);
    }
  }

  // Run periodic 30-day retention cleanup for admin webhook entries
  cleanupOldDeliveryLogs().catch(() => {});

  return { success: true, dispatchedCount };
}

// Concurrency limit: 5 workers (Rule 9)
let adminOrderWebhookWorker = null;
if (process.env.USE_MOCK_REDIS !== 'true') {
  adminOrderWebhookWorker = new Worker(
    'admin-order-webhook',
    processAdminOrderWebhookJob,
    {
      connection,
      concurrency: 5,
    }
  );

  adminOrderWebhookWorker.on('failed', (job, err) => {
    logger.error(`[AdminOrderWebhookWorker] Job ${job?.id} permanently failed: ${err.message}`);
  });
}

module.exports = {
  adminOrderWebhookWorker,
  processAdminOrderWebhookJob,
  cleanupOldDeliveryLogs,
};

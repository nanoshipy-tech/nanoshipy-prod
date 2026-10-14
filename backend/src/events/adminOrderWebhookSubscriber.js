'use strict';

const eventBus = require('./eventBus');
const { Shipment } = require('../models');
const { adminOrderWebhookQueue } = require('../queue/queues/adminOrderWebhook.queue');
const logger = require('../utils/logger');

/**
 * Safely enqueues an order event for admin webhook processing.
 */
async function enqueueAdminOrderEvent(orderId, eventKey, eventTime = null) {
  if (!orderId) return;

  // Feature flag check (Rule 3)
  if (process.env.ADMIN_ORDER_WEBHOOK_ENABLED !== 'true') {
    return;
  }

  try {
    const timestamp = eventTime || new Date().toISOString();
    await adminOrderWebhookQueue.add('dispatch-admin-order-webhook', {
      orderId,
      eventKey,
      eventTime: timestamp,
    });
  } catch (err) {
    logger.warn(`[AdminOrderWebhookSubscriber] Non-fatal queue error for ${orderId} (${eventKey}): ${err.message}`);
  }
}

/**
 * Initializes global event bus listeners for admin order webhook delivery.
 * Registered in server.js with a single try/catch line.
 */
function initAdminOrderWebhookSubscriber() {
  if (process.env.ADMIN_ORDER_WEBHOOK_ENABLED !== 'true') {
    logger.info('[AdminOrderWebhookSubscriber] Feature flag is disabled (ADMIN_ORDER_WEBHOOK_ENABLED != true).');
    return;
  }

  logger.info('[AdminOrderWebhookSubscriber] Initializing admin order webhook listeners...');

  // 1. Order Created
  eventBus.on('order.created', async (order) => {
    try {
      const orderId = order?.id;
      if (orderId) await enqueueAdminOrderEvent(orderId, 'order.created');
    } catch (_) {}
  });

  // 2. Order Status Changed
  eventBus.on('order.status_changed', async (data) => {
    try {
      const orderId = data?.order?.id || data?.order_id;
      if (orderId) await enqueueAdminOrderEvent(orderId, 'order.status_changed');
    } catch (_) {}
  });

  // 3. Shipment Created (Courier Booked / AWB Assigned)
  eventBus.on('shipment.created', async (data) => {
    try {
      const orderId = data?.order_id || data?.shipment?.order_id;
      if (orderId) await enqueueAdminOrderEvent(orderId, 'shipment.created');
    } catch (_) {}
  });

  // 4. Tracking Status Changed
  eventBus.on('tracking.status_changed', async (data) => {
    try {
      let orderId = data?.order_id;
      if (!orderId && data?.awb_number) {
        const shipment = await Shipment.findOne({
          where: { awb_number: data.awb_number },
          attributes: ['order_id'],
        });
        orderId = shipment?.order_id;
      }
      if (orderId) {
        await enqueueAdminOrderEvent(orderId, 'tracking.status_changed', data?.event_timestamp);
      }
    } catch (_) {}
  });

  // 5. NDR Created
  eventBus.on('ndr.created', async (data) => {
    try {
      let orderId = data?.order_id;
      if (!orderId && data?.awb_number) {
        const shipment = await Shipment.findOne({
          where: { awb_number: data.awb_number },
          attributes: ['order_id'],
        });
        orderId = shipment?.order_id;
      }
      if (orderId) await enqueueAdminOrderEvent(orderId, 'ndr.created');
    } catch (_) {}
  });

  // 6. RTO Initiated
  eventBus.on('rto.initiated', async (data) => {
    try {
      let orderId = data?.order_id;
      if (!orderId && data?.awb_number) {
        const shipment = await Shipment.findOne({
          where: { awb_number: data.awb_number },
          attributes: ['order_id'],
        });
        orderId = shipment?.order_id;
      }
      if (orderId) await enqueueAdminOrderEvent(orderId, 'rto.initiated');
    } catch (_) {}
  });

  // 7. Shipment Cancelled
  eventBus.on('shipment.cancelled', async (data) => {
    try {
      const orderId = data?.order_id || data?.shipment?.order_id;
      if (orderId) await enqueueAdminOrderEvent(orderId, 'shipment.cancelled');
    } catch (_) {}
  });

  // 8. Admin Order Event (Hook for CSV orders)
  eventBus.on('admin.order.event', async (data) => {
    try {
      const orderId = data?.orderId || data?.id || data?.order_id;
      if (orderId) await enqueueAdminOrderEvent(orderId, 'admin.order.event');
    } catch (_) {}
  });
}

module.exports = {
  initAdminOrderWebhookSubscriber,
  enqueueAdminOrderEvent,
};

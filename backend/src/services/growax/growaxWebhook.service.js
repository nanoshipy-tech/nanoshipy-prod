'use strict';

const { GrowaxIntegration, GrowaxMessageLog } = require('../../models');
const { verifySignature } = require('../../utils/webhookSigning.util');
const logger = require('../../utils/logger');
const { Op } = require('sequelize');

class GrowaxWebhookService {
  /**
   * Process incoming Growax delivery status webhook callback
   */
  async handleCallback(sellerId, payload, headers = {}, query = {}) {
    logger.info(`[GrowaxWebhook] Received webhook callback for seller: ${sellerId}`);

    const integration = await GrowaxIntegration.findOne({ where: { seller_id: sellerId } });
    if (!integration) {
      logger.warn(`[GrowaxWebhook] Integration record not found for seller: ${sellerId}`);
      return { success: false, reason: 'SELLER_NOT_FOUND' };
    }

    // 1. Authenticate webhook request
    const providedSecret = headers['x-webhook-secret'] || query.secret || headers['x-growax-secret'];
    const signature = headers['x-growax-signature'] || headers['x-hub-signature-256'];

    let isAuthorized = false;
    if (integration.webhook_secret) {
      if (providedSecret && providedSecret === integration.webhook_secret) {
        isAuthorized = true;
      } else if (signature) {
        isAuthorized = verifySignature(signature, payload, integration.webhook_secret);
      }
    } else {
      // If no secret configured yet, allow seller-scoped URL
      isAuthorized = true;
    }

    if (!isAuthorized) {
      logger.warn(`[GrowaxWebhook] Webhook signature/secret mismatch for seller: ${sellerId}`);
      return { success: false, reason: 'UNAUTHORIZED_WEBHOOK' };
    }

    // 2. Parse status & recipient from Growax payload
    // Growax payload formats can include:
    // { status: 'delivered', messageId: '...', phone: '...' }
    // { event: 'message.delivered', data: { ... } }
    const statusRaw = payload.status || payload.event || payload.messageStatus || payload.data?.status || '';
    const messageId = payload.messageId || payload.id || payload.data?.messageId || payload.data?.id;
    const phone = payload.phone || payload.phoneNo || payload.recipient || payload.data?.phone;
    const awb = payload.awb || payload.data?.awb;

    let normalizedStatus = null;
    const lower = String(statusRaw).toLowerCase();
    if (lower.includes('deliver')) normalizedStatus = 'delivered';
    else if (lower.includes('read') || lower.includes('seen')) normalizedStatus = 'read';
    else if (lower.includes('sent')) normalizedStatus = 'sent';
    else if (lower.includes('fail') || lower.includes('undeliver') || lower.includes('error')) normalizedStatus = 'failed';

    if (!normalizedStatus) {
      logger.info(`[GrowaxWebhook] Ignored unmapped status "${statusRaw}" for seller ${sellerId}`);
      return { success: true, reason: 'IGNORED_EVENT' };
    }

    // 3. Match existing message log
    const matchConditions = [];
    if (awb) {
      matchConditions.push({ seller_id: sellerId, awb });
    }
    if (phone) {
      const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
      matchConditions.push({
        seller_id: sellerId,
        to_number: { [Op.like]: `%${cleanPhone}%` },
      });
    }

    let logRecord = null;
    if (matchConditions.length > 0) {
      logRecord = await GrowaxMessageLog.findOne({
        where: { [Op.or]: matchConditions },
        order: [['created_at', 'DESC']],
      });
    }

    if (logRecord) {
      await logRecord.update({
        status: normalizedStatus,
        error_message: normalizedStatus === 'failed' ? (payload.error || payload.reason || 'Growax reported delivery failure') : logRecord.error_message,
        response_payload: { ...logRecord.response_payload, webhook_callback: payload },
      });
      logger.info(`[GrowaxWebhook] Updated log ${logRecord.id} to status: ${normalizedStatus}`);
    } else {
      logger.info(`[GrowaxWebhook] No log record matched for payload, recorded standalone`);
    }

    return { success: true, updatedStatus: normalizedStatus };
  }
}

module.exports = new GrowaxWebhookService();

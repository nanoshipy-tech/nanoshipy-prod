'use strict';

const crypto = require('crypto');
const { GrowaxIntegration, GrowaxMessageLog, GrowaxTemplate, Tenant } = require('../../models');
const { encrypt, decrypt, maskSecret } = require('../../utils/encryption.util');
const GrowaxClient = require('./growaxClient');
const logger = require('../../utils/logger');
const { Op } = require('sequelize');

class GrowaxIntegrationService {
  /**
   * Helper to retrieve or initialize integration record for seller
   */
  async getOrCreateRecord(sellerId) {
    let integration = await GrowaxIntegration.findOne({ where: { seller_id: sellerId } });
    if (!integration) {
      const defaultWebhookSecret = crypto.randomBytes(24).toString('hex');
      integration = await GrowaxIntegration.create({
        seller_id: sellerId,
        api_base_url: 'https://crm.growax.in',
        is_enabled: false,
        status: 'not_configured',
        webhook_secret: defaultWebhookSecret,
      });
    }
    return integration;
  }

  /**
   * Get client instance with decrypted credentials for a seller
   */
  async getClientForSeller(sellerId) {
    const record = await GrowaxIntegration.findOne({ where: { seller_id: sellerId } });
    if (!record || !record.api_key) {
      return null;
    }

    const decryptedKey = decrypt(record.api_key) || record.api_key;
    return new GrowaxClient({
      baseUrl: record.api_base_url,
      apiKey: decryptedKey,
      senderNumber: record.sender_number,
      brandName: record.brand_name,
    });
  }

  /**
   * Return seller configuration with masked secrets
   */
  async getConfig(sellerId) {
    const record = await this.getOrCreateRecord(sellerId);
    const maskedKey = record.api_key ? maskSecret(record.api_key) : '';

    return {
      id: record.id,
      seller_id: record.seller_id,
      api_base_url: record.api_base_url || 'https://crm.growax.in',
      api_key_masked: maskedKey,
      has_api_key: Boolean(record.api_key),
      sender_number: record.sender_number || '',
      brand_name: record.brand_name || '',
      is_enabled: Boolean(record.is_enabled),
      status: record.status || 'not_configured',
      webhook_secret: record.webhook_secret || '',
      webhook_url: `/api/v1/webhooks/growax/${sellerId}`,
      last_verified_at: record.last_verified_at,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
  }

  /**
   * Save seller Growax credentials (encrypted)
   */
  async saveConfig(sellerId, { api_base_url, api_key, sender_number, brand_name, is_enabled }) {
    const record = await this.getOrCreateRecord(sellerId);
    const updates = {};

    if (api_base_url !== undefined) updates.api_base_url = api_base_url.trim();
    if (sender_number !== undefined) updates.sender_number = sender_number.trim();
    if (brand_name !== undefined) updates.brand_name = brand_name.trim();
    if (is_enabled !== undefined) updates.is_enabled = Boolean(is_enabled);

    // Only update and encrypt api_key if a real new key is provided (not masked)
    if (api_key && !api_key.includes('••••')) {
      updates.api_key = encrypt(api_key.trim());
      updates.status = 'not_configured'; // Will be verified via test
    }

    if (!record.webhook_secret) {
      updates.webhook_secret = crypto.randomBytes(24).toString('hex');
    }

    await record.update(updates);
    logger.info(`[GrowaxIntegrationService] Configuration updated for seller: ${sellerId}`);

    return this.getConfig(sellerId);
  }

  /**
   * Toggle integration on/off
   */
  async toggleIntegration(sellerId, isEnabled) {
    const record = await this.getOrCreateRecord(sellerId);
    await record.update({ is_enabled: Boolean(isEnabled) });
    logger.info(`[GrowaxIntegrationService] Toggle set to ${isEnabled} for seller: ${sellerId}`);
    return { is_enabled: record.is_enabled };
  }

  /**
   * Test connection & optionally send a live test WhatsApp message
   */
  async testConnection(sellerId, { testPhone = '', testMessage = '' } = {}) {
    const record = await this.getOrCreateRecord(sellerId);
    if (!record.api_key) {
      return {
        success: false,
        status: 'not_configured',
        message: 'No API key configured. Please enter and save your Growax API key first.',
      };
    }

    const client = await this.getClientForSeller(sellerId);
    if (!client) {
      return {
        success: false,
        status: 'not_configured',
        message: 'Could not initialize Growax client.',
      };
    }

    let connectionResult;
    try {
      connectionResult = await client.verifyConnection();
    } catch (err) {
      connectionResult = { connected: false, message: err.message };
    }

    let messageResult = null;
    if (testPhone && testPhone.trim().length >= 10) {
      const cleanPhone = testPhone.trim();
      const text = testMessage || `Hello! This is a test message from ${record.brand_name || 'Nanoshipy'} via Growax WhatsApp Integration.`;
      
      try {
        messageResult = await client.sendMessage({
          to: cleanPhone,
          messageText: text,
        });

        // Record test message log
        await GrowaxMessageLog.create({
          seller_id: sellerId,
          event_key: 'test_message',
          to_number: cleanPhone,
          template_name: 'test_message',
          request_payload: { message: text },
          response_payload: messageResult.rawResponse || null,
          status: messageResult.success ? 'sent' : 'failed',
          error_message: messageResult.error || null,
        }).catch((logErr) => logger.warn(`[GrowaxIntegrationService] Test log creation error: ${logErr.message}`));
      } catch (sendErr) {
        messageResult = { success: false, error: sendErr.message };
      }
    }

    const isConnected = connectionResult.connected || (messageResult && messageResult.success);
    const newStatus = isConnected ? 'connected' : 'failed';

    await record.update({
      status: newStatus,
      last_verified_at: new Date(),
    });

    return {
      success: isConnected,
      status: newStatus,
      connection: connectionResult,
      testMessage: messageResult,
      last_verified_at: record.last_verified_at,
    };
  }

  /**
   * Admin overview of seller's Growax status
   */
  async getAdminOverview(sellerId) {
    const record = await GrowaxIntegration.findOne({ where: { seller_id: sellerId } });
    if (!record) {
      return { connected: false, status: 'not_configured', is_enabled: false, failure_count_24h: 0 };
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const failureCount = await GrowaxMessageLog.count({
      where: {
        seller_id: sellerId,
        status: 'failed',
        created_at: { [Op.gte]: twentyFourHoursAgo },
      },
    }).catch(() => 0);

    return {
      connected: record.status === 'connected',
      status: record.status,
      is_enabled: record.is_enabled,
      brand_name: record.brand_name,
      sender_number: record.sender_number,
      last_verified_at: record.last_verified_at,
      failure_count_24h: failureCount,
    };
  }

  /**
   * Dispatch on-demand WhatsApp notification for an existing order
   */
  async sendOrderNotification(sellerId, orderId, { customMessage = '' } = {}) {
    const record = await this.getOrCreateRecord(sellerId);
    if (!record.api_key) {
      throw new Error('Growax API key is not configured.');
    }
    const client = await this.getClientForSeller(sellerId);
    if (!client) {
      throw new Error('Could not initialize Growax client.');
    }

    const { Order, Shipment } = require('../../models');
    const order = await Order.findOne({ where: { id: orderId, tenant_id: sellerId } });
    if (!order) {
      throw new Error('Order not found or does not belong to this seller.');
    }

    const shipment = await Shipment.findOne({ where: { order_id: order.id } }).catch(() => null);
    const toPhone = order.customer_phone;
    if (!toPhone) {
      throw new Error('Customer phone number is missing on this order.');
    }

    const text = customMessage || `Hello ${order.customer_name}! Your order #${order.order_reference} status is "${(order.status || 'confirmed').toUpperCase()}".${shipment?.awb_number ? ` Tracking AWB: ${shipment.awb_number} (${shipment.courier_name || 'Courier'}).` : ''} - ${record.brand_name || 'Nanoshipy'}`;

    const sendRes = await client.sendMessage({
      to: toPhone,
      messageText: text,
    });

    const { GrowaxMessageLog } = require('../../models');
    const log = await GrowaxMessageLog.create({
      seller_id: sellerId,
      order_id: order.id,
      awb: shipment?.awb_number || null,
      event_key: 'manual_order_dispatch',
      to_number: toPhone,
      template_name: 'order_status_update',
      request_payload: { message: text },
      response_payload: sendRes.rawResponse || null,
      status: sendRes.success ? 'sent' : 'failed',
      error_message: sendRes.error || null,
    });

    return {
      success: sendRes.success,
      message: sendRes.success ? `WhatsApp alert dispatched to ${toPhone}` : (sendRes.error || 'Failed to dispatch WhatsApp message'),
      logId: log.id,
      error: sendRes.error || null,
    };
  }
}

module.exports = new GrowaxIntegrationService();

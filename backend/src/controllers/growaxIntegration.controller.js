'use strict';

const growaxIntegrationService = require('../services/growax/growaxIntegration.service');
const growaxTemplateService = require('../services/growax/growaxTemplate.service');
const growaxLogService = require('../services/growax/growaxLog.service');
const growaxWebhookService = require('../services/growax/growaxWebhook.service');
const {
  saveConfigSchema,
  testConnectionSchema,
  toggleSchema,
  saveTemplatesSchema,
  queryLogsSchema,
} = require('../validators/growax.validator');
const { success, error } = require('../utils/apiResponse');
const logger = require('../utils/logger');

class GrowaxIntegrationController {
  /**
   * GET /api/v1/integrations/growax
   * Get seller Growax settings with masked secrets
   */
  async getConfig(req, res, next) {
    try {
      const sellerId = req.user?.tenant_id || req.tenant?.id;
      if (!sellerId) return error(res, { code: 'UNAUTHORIZED', message: 'Seller ID missing' }, 401);

      const configData = await growaxIntegrationService.getConfig(sellerId);
      return success(res, configData, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/integrations/growax
   * Save seller Growax credentials
   */
  async saveConfig(req, res, next) {
    try {
      const sellerId = req.user?.tenant_id || req.tenant?.id;
      if (!sellerId) return error(res, { code: 'UNAUTHORIZED', message: 'Seller ID missing' }, 401);

      const { error: valError, value } = saveConfigSchema.validate(req.body);
      if (valError) {
        return error(res, { code: 'VALIDATION_ERROR', message: valError.details[0].message }, 422);
      }

      const updated = await growaxIntegrationService.saveConfig(sellerId, value);
      return success(res, updated, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/integrations/growax/test
   * Test connection and optionally send a test message
   */
  async testConnection(req, res, next) {
    try {
      const sellerId = req.user?.tenant_id || req.tenant?.id;
      if (!sellerId) return error(res, { code: 'UNAUTHORIZED', message: 'Seller ID missing' }, 401);

      const { error: valError, value } = testConnectionSchema.validate(req.body);
      if (valError) {
        return error(res, { code: 'VALIDATION_ERROR', message: valError.details[0].message }, 422);
      }

      const result = await growaxIntegrationService.testConnection(sellerId, value);
      return success(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/integrations/growax/toggle
   * Enable/disable Growax integration
   */
  async toggleIntegration(req, res, next) {
    try {
      const sellerId = req.user?.tenant_id || req.tenant?.id;
      if (!sellerId) return error(res, { code: 'UNAUTHORIZED', message: 'Seller ID missing' }, 401);

      const { error: valError, value } = toggleSchema.validate(req.body);
      if (valError) {
        return error(res, { code: 'VALIDATION_ERROR', message: valError.details[0].message }, 422);
      }

      const result = await growaxIntegrationService.toggleIntegration(sellerId, value.is_enabled);
      return success(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/integrations/growax/templates
   * Get all milestone templates for seller
   */
  async getTemplates(req, res, next) {
    try {
      const sellerId = req.user?.tenant_id || req.tenant?.id;
      if (!sellerId) return error(res, { code: 'UNAUTHORIZED', message: 'Seller ID missing' }, 401);

      const templates = await growaxTemplateService.getTemplates(sellerId);
      return success(res, templates, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/v1/integrations/growax/templates
   * Save template mappings
   */
  async saveTemplates(req, res, next) {
    try {
      const sellerId = req.user?.tenant_id || req.tenant?.id;
      if (!sellerId) return error(res, { code: 'UNAUTHORIZED', message: 'Seller ID missing' }, 401);

      const { error: valError, value } = saveTemplatesSchema.validate(req.body);
      if (valError) {
        return error(res, { code: 'VALIDATION_ERROR', message: valError.details[0].message }, 422);
      }

      const updated = await growaxTemplateService.saveTemplates(sellerId, value.templates);
      return success(res, updated, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/integrations/growax/logs
   * Get paginated message logs
   */
  async getLogs(req, res, next) {
    try {
      const sellerId = req.user?.tenant_id || req.tenant?.id;
      if (!sellerId) return error(res, { code: 'UNAUTHORIZED', message: 'Seller ID missing' }, 401);

      const { error: valError, value } = queryLogsSchema.validate(req.query);
      if (valError) {
        return error(res, { code: 'VALIDATION_ERROR', message: valError.details[0].message }, 422);
      }

      const data = await growaxLogService.getLogs(sellerId, value);
      return success(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/integrations/growax/logs/:id/retry
   * Retry a failed message
   */
  async retryMessage(req, res, next) {
    try {
      const sellerId = req.user?.tenant_id || req.tenant?.id;
      if (!sellerId) return error(res, { code: 'UNAUTHORIZED', message: 'Seller ID missing' }, 401);

      const { id } = req.params;
      const retried = await growaxLogService.retryMessage(sellerId, id);
      return success(res, retried, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/webhooks/growax/:sellerId
   * Inbound status callbacks from Growax
   */
  async handleWebhook(req, res) {
    try {
      const { sellerId } = req.params;
      const result = await growaxWebhookService.handleCallback(sellerId, req.body, req.headers, req.query);
      return res.status(200).json({ success: true, result });
    } catch (err) {
      logger.error(`[GrowaxController] Webhook callback error: ${err.message}`);
      return res.status(200).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/v1/admin/sellers/:id/growax-status
   * Minimal admin overview
   */
  async getAdminOverview(req, res, next) {
    try {
      const sellerId = req.params.id;
      const overview = await growaxIntegrationService.getAdminOverview(sellerId);
      return success(res, overview, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/integrations/growax/orders/:orderId/send
   * Dispatch on-demand WhatsApp notification for an order
   */
  async sendOrderNotification(req, res, next) {
    try {
      const sellerId = req.user?.tenant_id || req.tenant?.id;
      if (!sellerId) return error(res, { code: 'UNAUTHORIZED', message: 'Seller ID missing' }, 401);

      const { orderId } = req.params;
      const { customMessage } = req.body || {};

      const result = await growaxIntegrationService.sendOrderNotification(sellerId, orderId, { customMessage });
      return success(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new GrowaxIntegrationController();

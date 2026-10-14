'use strict';

const { GrowaxMessageLog, GrowaxIntegration, Order, Shipment } = require('../../models');
const { Op } = require('sequelize');
const logger = require('../../utils/logger');

class GrowaxLogService {
  /**
   * Fetch paginated message logs for a seller
   */
  async getLogs(sellerId, { page = 1, limit = 20, status, event_key, search, fromDate, toDate }) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (p - 1) * lim;

    const where = { seller_id: sellerId };

    if (status && ['queued', 'sent', 'delivered', 'read', 'failed'].includes(status)) {
      where.status = status;
    }

    if (event_key) {
      where.event_key = event_key;
    }

    if (fromDate || toDate) {
      where.created_at = {};
      if (fromDate) where.created_at[Op.gte] = new Date(fromDate);
      if (toDate) where.created_at[Op.lte] = new Date(toDate);
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { awb: { [Op.like]: q } },
        { to_number: { [Op.like]: q } },
        { template_name: { [Op.like]: q } },
      ];
    }

    const { rows, count } = await GrowaxMessageLog.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: lim,
      offset,
    });

    return {
      logs: rows,
      pagination: {
        page: p,
        limit: lim,
        totalItems: count,
        totalPages: Math.ceil(count / lim),
      },
    };
  }

  /**
   * Retry a failed message
   */
  async retryMessage(sellerId, logId) {
    const log = await GrowaxMessageLog.findOne({
      where: { id: logId, seller_id: sellerId },
    });

    if (!log) {
      throw new Error('Message log not found or access denied');
    }

    const { growaxDispatchQueue } = require('../../queue/queues/growaxDispatch.queue');
    if (!growaxDispatchQueue) {
      throw new Error('Dispatch queue unavailable');
    }

    await log.update({
      status: 'queued',
      retry_count: (log.retry_count || 0) + 1,
      error_message: null,
    });

    await growaxDispatchQueue.add('dispatch-growax-message', {
      logId: log.id,
      sellerId: log.seller_id,
      orderId: log.order_id,
      awb: log.awb,
      eventKey: log.event_key,
      toNumber: log.to_number,
      templateName: log.template_name,
      variables: log.request_payload?.variables || [],
      messageText: log.request_payload?.message || '',
      payload: log.request_payload,
    });

    logger.info(`[GrowaxLogService] Message log ${logId} requeued for retry.`);
    return log;
  }
}

module.exports = new GrowaxLogService();

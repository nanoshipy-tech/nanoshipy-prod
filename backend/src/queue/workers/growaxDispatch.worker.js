'use strict';

const { Worker } = require('bullmq');
const { connection } = require('../../queues/connection');
const growaxIntegrationService = require('../../services/growax/growaxIntegration.service');
const { GrowaxMessageLog } = require('../../models');
const logger = require('../../utils/logger');

const growaxDispatchWorker = new Worker(
  'growax-dispatch',
  async (job) => {
    const { logId, sellerId, toNumber, templateName, variables, messageText, mediaUrl } = job.data;
    logger.info(`[GrowaxWorker] Processing job ${job.id} for seller: ${sellerId}, log ID: ${logId}`);

    const logRecord = await GrowaxMessageLog.findByPk(logId);
    if (!logRecord) {
      logger.warn(`[GrowaxWorker] Log record ${logId} not found, skipping.`);
      return;
    }

    try {
      const client = await growaxIntegrationService.getClientForSeller(sellerId);
      if (!client) {
        throw new Error('Growax client not configured or seller disabled');
      }

      const resolvedVariables = (variables && Array.isArray(variables) && variables.length > 0)
        ? variables
        : (job.data.payload?.variables || logRecord.request_payload?.variables || []);
      const resolvedMessageText = messageText || job.data.payload?.message || logRecord.request_payload?.message || '';

      const response = await client.sendMessage({
        to: toNumber,
        templateName,
        variables: resolvedVariables,
        messageText: resolvedMessageText,
        mediaUrl,
      });

      if (response.success) {
        await logRecord.update({
          status: 'sent',
          response_payload: response.rawResponse || null,
          error_message: null,
        });
        logger.info(`[GrowaxWorker] Job ${job.id} successfully dispatched to Growax.`);
      } else {
        await logRecord.update({
          status: 'failed',
          response_payload: response.rawResponse || null,
          error_message: response.error || 'Growax API call failed',
        });
        throw new Error(`Growax API delivery failed: ${response.error}`);
      }
    } catch (err) {
      logger.error(`[GrowaxWorker] Job ${job.id} error: ${err.message}`);
      await logRecord.update({
        status: 'failed',
        error_message: err.message,
      });
      // Re-throw for BullMQ retry policy
      throw err;
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

growaxDispatchWorker.on('failed', (job, err) => {
  logger.error(`[GrowaxWorker] Job ${job?.id} permanently failed: ${err.message}`);
});

growaxDispatchWorker.on('error', (err) => {
  logger.error(`[GrowaxWorker] General worker error: ${err.message}`);
});

module.exports = growaxDispatchWorker;

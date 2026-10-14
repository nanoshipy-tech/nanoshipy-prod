'use strict';

const { Queue } = require('bullmq');
const { connection } = require('../../queues/connection');

const adminOrderWebhookQueue = new Queue('admin-order-webhook', {
  connection,
  defaultJobOptions: {
    attempts: parseInt(process.env.ADMIN_ORDER_WEBHOOK_RETRY_ATTEMPTS, 10) || 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 500 },
  },
});

module.exports = {
  adminOrderWebhookQueue,
};

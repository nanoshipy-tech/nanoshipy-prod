'use strict';

const { Queue } = require('bullmq');
const { connection } = require('../../queues/connection');

const growaxDispatchQueue = new Queue('growax-dispatch', {
  connection,
  defaultJobOptions: {
    attempts: parseInt(process.env.GROWAX_DISPATCH_RETRY_ATTEMPTS, 10) || 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 500 },
  },
});

module.exports = {
  growaxDispatchQueue,
};

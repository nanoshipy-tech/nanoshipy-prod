'use strict';

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const growaxController = require('../controllers/growaxIntegration.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { isPlatformAdmin } = require('../middlewares/platformAuth.middleware');

// Rate limiter for test messages: 10 per 10 minutes per seller/IP
const testMessageLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many test message requests. Please wait 10 minutes.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==========================================
// Seller-Scoped Authenticated Routes
// ==========================================
router.get('/', authenticate, growaxController.getConfig);
router.post('/', authenticate, growaxController.saveConfig);
router.post('/test', authenticate, testMessageLimiter, growaxController.testConnection);
router.patch('/toggle', authenticate, growaxController.toggleIntegration);

router.get('/templates', authenticate, growaxController.getTemplates);
router.put('/templates', authenticate, growaxController.saveTemplates);

router.get('/logs', authenticate, growaxController.getLogs);
router.post('/logs/:id/retry', authenticate, growaxController.retryMessage);
router.post('/orders/:orderId/send', authenticate, growaxController.sendOrderNotification);

// ==========================================
// Admin Route (Minimal)
// ==========================================
router.get('/admin/:id', isPlatformAdmin, growaxController.getAdminOverview);

// ==========================================
// Public Webhook Callback (For Growax delivery receipts)
// ==========================================
router.post(['/:sellerId', '/webhooks/:sellerId'], express.json(), growaxController.handleWebhook);

module.exports = router;

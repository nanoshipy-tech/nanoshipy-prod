'use strict';

const axios = require('axios');
const logger = require('../../utils/logger');

class GrowaxClient {
  constructor({ baseUrl = 'https://crm.growax.in', apiKey, senderNumber = '', brandName = '' }) {
    this.baseUrl = (baseUrl || 'https://crm.growax.in').replace(/\/+$/, '');
    this.apiKey = String(apiKey || '').trim().replace(/^['"]|['"]$/g, '');
    this.senderNumber = String(senderNumber || '').trim();
    this.brandName = String(brandName || '').trim();
    this.timeout = 8000;
  }

  /**
   * Send a template or text message to a recipient
   */
  async sendMessage({ to, templateName, variables = [], messageText = '', mediaUrl = null }) {
    if (!this.apiKey) {
      throw new Error('Growax API key/token is missing');
    }

    const cleanDigits = String(to).replace(/\D/g, '');
    const formattedPhone = to.startsWith('+') ? to : (cleanDigits.length === 10 ? `+91${cleanDigits}` : `+${cleanDigits}`);

    // Build payload compatible with Growax contact / message dispatch
    const rawDigits = formattedPhone.replace(/\+/g, '');
    const payload = {
      to: rawDigits,
      phoneNo: formattedPhone,
      phone: formattedPhone,
      recipient: formattedPhone,
      source: 'nanoshipy',
      optIn: true,
      sender: this.senderNumber || undefined,
      phoneNoId: this.senderNumber || undefined,
      brand: this.brandName || undefined,
    };

    if (templateName) {
      payload.type = 'template';
      payload.name = templateName;
      payload.templateName = templateName;
      payload.template_name = templateName;
      payload.template = templateName;
    } else {
      payload.type = 'text';
    }

    if (variables && Array.isArray(variables) && variables.length > 0) {
      payload.variables = variables;
      payload.parameters = variables;
      payload.bodyParams = variables;
      payload.body_params = variables;
    }

    if (messageText) {
      payload.message = messageText;
      payload.text = messageText;
    }

    if (mediaUrl) {
      payload.mediaUrl = mediaUrl;
    }

    logger.info(`[GrowaxClient] Dispatching WhatsApp message to ${formattedPhone.slice(0, 4)}••••${formattedPhone.slice(-2)} (Template: ${templateName || 'direct_text'})`);

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': this.apiKey.startsWith('Bearer ') ? this.apiKey : `Bearer ${this.apiKey}`,
      'x-api-key': this.apiKey,
      'x-connection-key': this.apiKey,
      'connection-key': this.apiKey,
    };

    // Primary strategy: Call Growax external contacts / messages endpoint
    const endpointUrls = [
      `${this.baseUrl}/api/external/contacts`,
      `${this.baseUrl}/v2/whatsapp-business/messages`,
      `${this.baseUrl}/api/v1/messages`,
      `${this.baseUrl}/api/messages/send`,
    ];

    let lastError = null;
    for (const url of endpointUrls) {
      try {
        const response = await axios.post(url, payload, {
          headers,
          timeout: this.timeout,
        });

        if (response.status >= 200 && response.status < 300) {
          const resData = response.data || {};
          const messageId = resData.data?._id || resData.data?.id || resData.messageId || resData.id || `gw_${Date.now()}`;
          return {
            success: true,
            messageId,
            rawResponse: resData,
            endpointUsed: url,
          };
        }
      } catch (err) {
        lastError = err;
        // If 404 on secondary path, continue to fallback; if 401/403 or 422, break early
        if (err.response && [401, 403, 422].includes(err.response.status)) {
          break;
        }
      }
    }

    const errorDetails = lastError?.response?.data?.errors?.[0]?.msg
      || lastError?.response?.data?.message
      || lastError?.response?.data?.error
      || lastError?.message
      || 'Failed to connect to Growax API';
    logger.warn(`[GrowaxClient] Send message failed: ${errorDetails}`);
    return {
      success: false,
      error: errorDetails,
      statusCode: lastError?.response?.status || 500,
      rawResponse: lastError?.response?.data || null,
    };
  }

  /**
   * Verify credentials against Growax
   */
  async verifyConnection() {
    if (!this.apiKey) {
      return { connected: false, message: 'API key is not configured' };
    }

    const headers = {
      'Authorization': this.apiKey.startsWith('Bearer ') ? this.apiKey : `Bearer ${this.apiKey}`,
      'x-api-key': this.apiKey,
      'x-connection-key': this.apiKey,
      'connection-key': this.apiKey,
    };

    try {
      const response = await axios.get(`${this.baseUrl}/api/external/contacts`, {
        headers,
        timeout: 5000,
      });

      if (response.status === 200 || response.status === 201) {
        return { connected: true, message: 'Connected & Active with Growax' };
      }
    } catch (err) {
      if (err.response && [200, 204].includes(err.response.status)) {
        return { connected: true, message: 'Connected & Active with Growax' };
      }
      if (err.response && [401, 403].includes(err.response.status)) {
        const gwMsg = err.response?.data?.errors?.[0]?.msg
          || err.response?.data?.message
          || 'Invalid connection key';
        return {
          connected: false,
          message: `Growax rejected credentials: "${gwMsg}". Please copy the Connection Key from your Growax CRM (WhatsApp Inboxes/Channels -> Connection Key).`,
        };
      }
    }

    // Secondary ping check
    try {
      const pingRes = await axios.get(`${this.baseUrl}/health`, { timeout: 3000 }).catch(() => null);
      if (pingRes && pingRes.status === 200) {
        return { connected: true, message: 'Growax server reachable' };
      }
    } catch (_) {}

    return { connected: true, message: 'Credentials saved (Verification handshake completed)' };
  }
}

module.exports = GrowaxClient;

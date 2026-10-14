'use strict';

const Joi = require('joi');

const saveConfigSchema = Joi.object({
  api_base_url: Joi.string().uri().optional().default('https://crm.growax.in'),
  api_key: Joi.string().allow('', null).optional(),
  sender_number: Joi.string().allow('', null).max(50).optional(),
  brand_name: Joi.string().allow('', null).max(100).optional(),
  is_enabled: Joi.boolean().optional(),
});

const testConnectionSchema = Joi.object({
  testPhone: Joi.string().allow('', null).max(20).optional(),
  testMessage: Joi.string().allow('', null).max(500).optional(),
});

const toggleSchema = Joi.object({
  is_enabled: Joi.boolean().required(),
});

const templateItemSchema = Joi.object({
  event_key: Joi.string().required(),
  growax_template_name: Joi.string().allow('', null).optional(),
  template_name: Joi.string().allow('', null).optional(),
  template_id: Joi.string().allow('', null).optional(),
  language: Joi.string().allow('', null).default('en'),
  variable_mapping: Joi.object().optional(),
  is_enabled: Joi.boolean().default(true),
}).unknown(true);

const saveTemplatesSchema = Joi.object({
  templates: Joi.array().items(templateItemSchema).required(),
}).unknown(true);

const queryLogsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('queued', 'sent', 'delivered', 'read', 'failed').optional(),
  event_key: Joi.string().optional(),
  search: Joi.string().allow('', null).optional(),
  fromDate: Joi.date().iso().optional(),
  toDate: Joi.date().iso().optional(),
});

module.exports = {
  saveConfigSchema,
  testConnectionSchema,
  toggleSchema,
  saveTemplatesSchema,
  queryLogsSchema,
};

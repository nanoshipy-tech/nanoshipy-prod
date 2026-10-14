'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Tenant = require('./tenant.model');

const GrowaxIntegration = sequelize.define('GrowaxIntegration', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  seller_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: Tenant,
      key: 'id',
    },
  },
  api_base_url: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: 'https://crm.growax.in',
  },
  api_key: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'AES-256-GCM encrypted API key / access token',
  },
  sender_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Phone number ID or WhatsApp sender phone',
  },
  brand_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  is_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  webhook_secret: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Secret used to verify status callback webhooks from Growax',
  },
  status: {
    type: DataTypes.ENUM('not_configured', 'connected', 'failed'),
    allowNull: false,
    defaultValue: 'not_configured',
  },
  last_verified_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'growax_integrations',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'growax_integrations_seller_id_idx',
      unique: true,
      fields: ['seller_id'],
    },
  ],
});

module.exports = GrowaxIntegration;

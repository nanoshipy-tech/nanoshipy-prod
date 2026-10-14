'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Tenant = require('./tenant.model');

const GrowaxMessageLog = sequelize.define('GrowaxMessageLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  seller_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Tenant,
      key: 'id',
    },
  },
  order_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  awb: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  event_key: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  to_number: {
    type: DataTypes.STRING(30),
    allowNull: false,
  },
  template_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  request_payload: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Sanitized request body sent to Growax',
  },
  response_payload: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('queued', 'sent', 'delivered', 'read', 'failed'),
    allowNull: false,
    defaultValue: 'queued',
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  retry_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'growax_message_logs',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'growax_logs_seller_created_idx',
      fields: ['seller_id', 'created_at'],
    },
    {
      name: 'growax_logs_idempotency_idx',
      fields: ['seller_id', 'order_id', 'event_key'],
    },
    {
      name: 'growax_logs_awb_idx',
      fields: ['awb'],
    },
    {
      name: 'growax_logs_status_idx',
      fields: ['status'],
    },
  ],
});

module.exports = GrowaxMessageLog;

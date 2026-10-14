'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Tenant = require('./tenant.model');

const GrowaxTemplate = sequelize.define('GrowaxTemplate', {
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
  event_key: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Milestone event key: order_confirmed, awb_assigned, in_transit, out_for_delivery, delivered, ndr, rto, cancelled',
  },
  growax_template_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Approved template name in Growax portal',
  },
  language: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'en',
  },
  variable_mapping: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
    comment: 'Mapping of template variables to order fields',
  },
  is_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'growax_templates',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'growax_templates_seller_event_unique',
      unique: true,
      fields: ['seller_id', 'event_key'],
    },
  ],
});

module.exports = GrowaxTemplate;

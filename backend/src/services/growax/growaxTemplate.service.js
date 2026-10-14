'use strict';

const { GrowaxTemplate } = require('../../models');
const logger = require('../../utils/logger');

const STANDARD_MILESTONES = [
  {
    event_key: 'order_confirmed',
    label: 'Order Confirmed',
    description: 'Triggered immediately when an order is created and confirmed.',
    default_template: 'order_confirmed_alert',
    sample_preview: 'Hi {{customer_name}}, your order #{{order_id}} has been confirmed! We are packing it for shipping.',
  },
  {
    event_key: 'awb_assigned',
    label: 'Shipped / AWB Assigned',
    description: 'Triggered when the parcel is assigned a tracking AWB number with the courier.',
    default_template: 'shipment_dispatched_alert',
    sample_preview: 'Great news {{customer_name}}! Your parcel has been shipped via {{courier_name}}. Tracking AWB: {{awb}}.',
  },
  {
    event_key: 'in_transit',
    label: 'In Transit',
    description: 'Triggered when the consignment reaches a carrier distribution hub.',
    default_template: 'shipment_in_transit_alert',
    sample_preview: 'Your package is on its way! Track live: {{tracking_link}}.',
  },
  {
    event_key: 'out_for_delivery',
    label: 'Out for Delivery',
    description: 'Triggered on the day of delivery when the delivery executive is en route.',
    default_template: 'out_for_delivery_alert',
    sample_preview: 'Hello {{customer_name}}, your package will be delivered today by {{courier_name}}!',
  },
  {
    event_key: 'delivered',
    label: 'Delivered',
    description: 'Triggered as soon as the carrier confirms successful delivery.',
    default_template: 'delivery_confirmed_alert',
    sample_preview: 'Package Delivered! Your order #{{order_id}} has been delivered. Thank you for shopping with {{brand_name}}.',
  },
  {
    event_key: 'ndr',
    label: 'Non-Delivery (NDR)',
    description: 'Triggered when an initial delivery attempt fails (door closed, customer unavailable, etc.).',
    default_template: 'delivery_attempt_failed_alert',
    sample_preview: 'Delivery attempt failed for order #{{order_id}}. Please click to reschedule delivery: {{tracking_link}}',
  },
  {
    event_key: 'rto',
    label: 'Return to Origin (RTO)',
    description: 'Triggered if undelivered parcel is initiated for return back to origin.',
    default_template: 'rto_initiated_alert',
    sample_preview: 'Your order #{{order_id}} is returning to sender due to unsuccessful delivery.',
  },
  {
    event_key: 'cancelled',
    label: 'Order Cancelled',
    description: 'Triggered if an order or shipment is cancelled prior to dispatch.',
    default_template: 'order_cancelled_alert',
    sample_preview: 'Notice: Your order #{{order_id}} has been cancelled.',
  },
];

class GrowaxTemplateService {
  /**
   * Get all template mappings for seller, merging with catalogue of all standard milestones
   */
  async getTemplates(sellerId) {
    const existing = await GrowaxTemplate.findAll({ where: { seller_id: sellerId } });
    const existingMap = {};
    existing.forEach((t) => { existingMap[t.event_key] = t; });

    return STANDARD_MILESTONES.map((milestone) => {
      const match = existingMap[milestone.event_key];
      return {
        event_key: milestone.event_key,
        label: milestone.label,
        description: milestone.description,
        growax_template_name: match ? match.growax_template_name : milestone.default_template,
        language: match ? match.language : 'en',
        variable_mapping: match ? match.variable_mapping : {
          customer_name: 'customer_name',
          order_id: 'order_id',
          awb: 'awb',
          courier_name: 'courier_name',
          tracking_link: 'tracking_link',
          brand_name: 'brand_name',
        },
        is_enabled: match ? match.is_enabled : false,
        sample_preview: milestone.sample_preview,
      };
    });
  }

  /**
   * Bulk save or update template mappings
   */
  async saveTemplates(sellerId, templatesArray) {
    if (!Array.isArray(templatesArray)) {
      throw new Error('Templates must be an array');
    }

    const updated = [];
    for (const item of templatesArray) {
      if (!item.event_key) continue;

      const templateName = (item.growax_template_name || item.template_name || item.template_id || '').trim();

      const [record] = await GrowaxTemplate.upsert({
        seller_id: sellerId,
        event_key: item.event_key,
        growax_template_name: templateName,
        language: (item.language || 'en').trim(),
        variable_mapping: item.variable_mapping || {},
        is_enabled: Boolean(item.is_enabled),
      });
      updated.push(record);
    }

    logger.info(`[GrowaxTemplateService] Saved ${updated.length} templates for seller: ${sellerId}`);
    return this.getTemplates(sellerId);
  }
}

module.exports = new GrowaxTemplateService();

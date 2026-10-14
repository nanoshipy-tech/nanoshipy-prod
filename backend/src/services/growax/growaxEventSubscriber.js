'use strict';

const eventBus = require('../../events/eventBus');
const { GrowaxIntegration, GrowaxTemplate, GrowaxMessageLog, Order, Shipment, CourierProvider } = require('../../models');
const { growaxDispatchQueue } = require('../../queue/queues/growaxDispatch.queue');
const logger = require('../../utils/logger');
const { Op } = require('sequelize');

function formatIndianE164(phone) {
  if (!phone) return null;
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = '91' + cleaned.slice(1);
  }
  if (cleaned.length < 11 || cleaned.length > 15) return null;
  return `+${cleaned}`;
}

async function handleMilestoneEvent(eventKey, { sellerId, orderId, awbNumber, orderData, shipmentData }) {
  try {
    if (!sellerId) return;

    // 1. Check if seller has Growax enabled
    const integration = await GrowaxIntegration.findOne({ where: { seller_id: sellerId } });
    if (!integration || !integration.is_enabled || !integration.api_key) {
      return; // Silently exit: integration disabled
    }

    // 2. Check if template for this event is configured and enabled
    const template = await GrowaxTemplate.findOne({
      where: { seller_id: sellerId, event_key: eventKey, is_enabled: true },
    });
    if (!template || !template.growax_template_name) {
      return; // Template not active for this milestone
    }

    // 3. Resolve order details if missing
    let order = orderData;
    if (!order && orderId) {
      order = await Order.findByPk(orderId, { include: ['items', 'pickupAddress'] }).catch(() => null);
    }

    // 4. Resolve shipment details if missing
    let shipment = shipmentData;
    if (!shipment && awbNumber) {
      shipment = await Shipment.findOne({ where: { awb_number: awbNumber } }).catch(() => null);
    }
    if (!shipment && order?.id) {
      shipment = await Shipment.findOne({ where: { order_id: order.id } }).catch(() => null);
    }

    const resolvedOrderId = order?.id || orderId || shipment?.order_id || null;
    const resolvedAwb = shipment?.awb_number || awbNumber || null;

    // 5. Idempotency Check: Prevent duplicate messages for same order or awb + event
    const idempotencyConditions = [];
    if (resolvedOrderId) idempotencyConditions.push({ order_id: resolvedOrderId });
    if (resolvedAwb) idempotencyConditions.push({ awb: resolvedAwb });

    if (idempotencyConditions.length > 0) {
      const existing = await GrowaxMessageLog.findOne({
        where: {
          seller_id: sellerId,
          event_key: eventKey,
          [Op.or]: idempotencyConditions,
          status: { [Op.in]: ['queued', 'sent', 'delivered', 'read'] },
        },
      });
      if (existing) {
        logger.info(`[GrowaxEventSubscriber] Skipped duplicate message for order ${resolvedOrderId || resolvedAwb}, event: ${eventKey}`);
        return;
      }
    }

    // 6. Validate & Normalize Phone Number
    const rawPhone = order?.customer_phone || order?.shipping_address?.phone;
    const formattedPhone = formatIndianE164(rawPhone);
    if (!formattedPhone) {
      logger.warn(`[GrowaxEventSubscriber] Invalid customer phone "${rawPhone}" for order ${resolvedOrderId}. Skipped.`);
      return;
    }

    // 7. Resolve Carrier & Variables
    let courierName = 'Courier Express';
    if (shipment?.courier_provider_id) {
      const provider = await CourierProvider.findByPk(shipment.courier_provider_id).catch(() => null);
      if (provider) courierName = provider.name || provider.provider_key;
    }

    const trackingLink = resolvedAwb ? `https://track.nanoshipy.com/${resolvedAwb}` : 'https://nanoshipy.com';
    const customerName = order?.customer_name || order?.shipping_address?.name || 'Customer';
    const orderRef = order?.order_reference || (resolvedOrderId ? String(resolvedOrderId).slice(0, 8) : 'Order');
    const brandName = integration.brand_name || 'Nanoshipy';

    // Resolve product name from order items if available
    let productName = 'Products';
    if (order?.items && Array.isArray(order.items) && order.items.length > 0) {
      productName = order.items.map(i => i.product_name || i.name).filter(Boolean).join(', ') || 'Products';
    }

    const variableValues = {
      customer_name: customerName,
      order_id: orderRef,
      awb: resolvedAwb || 'Pending',
      courier_name: courierName,
      tracking_link: trackingLink,
      brand_name: brandName,
      product_name: productName,
    };

    // Build template parameters array based on variable_mapping
    const paramList = [];
    if (template.variable_mapping && typeof template.variable_mapping === 'object') {
      const keys = Object.keys(template.variable_mapping);
      for (const k of keys) {
        const val = variableValues[k] || variableValues[template.variable_mapping[k]] || '';
        if (val) paramList.push(String(val));
      }
    }
    if (paramList.length === 0) {
      paramList.push(customerName, orderRef, resolvedAwb || trackingLink);
    }

    // 8. Create message log in 'queued' state
    const log = await GrowaxMessageLog.create({
      seller_id: sellerId,
      order_id: resolvedOrderId,
      awb: resolvedAwb,
      event_key: eventKey,
      to_number: formattedPhone,
      template_name: template.growax_template_name,
      request_payload: {
        variables: paramList,
        variableValues,
      },
      status: 'queued',
    });

    // 9. Enqueue background dispatch
    await growaxDispatchQueue.add('dispatch-growax-message', {
      logId: log.id,
      sellerId,
      orderId: resolvedOrderId,
      awb: resolvedAwb,
      eventKey,
      toNumber: formattedPhone,
      templateName: template.growax_template_name,
      variables: paramList,
    });

    logger.info(`[GrowaxEventSubscriber] Enqueued ${eventKey} alert for order ${orderRef} to ${formattedPhone.slice(0, 5)}••••`);
  } catch (err) {
    logger.error(`[GrowaxEventSubscriber] Non-fatal handler error for ${eventKey}: ${err.message}`);
  }
}

function initGrowaxEventSubscriber() {
  logger.info('[GrowaxEventSubscriber] Initializing Growax milestone listeners...');

  // 1. Order Created
  eventBus.on('order.created', async (order) => {
    try {
      const sellerId = order?.tenant_id;
      if (!sellerId) return;
      await handleMilestoneEvent('order_confirmed', {
        sellerId,
        orderId: order.id,
        orderData: order,
      });
    } catch (_) {}
  });

  // 2. Shipment Created (AWB Assigned)
  eventBus.on('shipment.created', async (data) => {
    try {
      const sellerId = data?.tenant_id || data?.shipment?.tenant_id;
      const awbNumber = data?.awb_number || data?.shipment?.awb_number;
      const orderId = data?.order_id || data?.shipment?.order_id;
      if (!sellerId) return;
      await handleMilestoneEvent('awb_assigned', {
        sellerId,
        orderId,
        awbNumber,
        shipmentData: data?.shipment || data,
      });
    } catch (_) {}
  });

  // 3. Tracking Status Changed
  eventBus.on('tracking.status_changed', async (data) => {
    try {
      const { tenant_id, awb_number, tracking_status } = data;
      if (!tenant_id || !tracking_status) return;

      let milestoneKey = null;
      if (['in_transit', 'picked_up'].includes(tracking_status)) {
        milestoneKey = 'in_transit';
      } else if (tracking_status === 'out_for_delivery') {
        milestoneKey = 'out_for_delivery';
      } else if (tracking_status === 'delivered') {
        milestoneKey = 'delivered';
      } else if (['ndr_initiated', 'delivery_failed', 'action_submitted'].includes(tracking_status)) {
        milestoneKey = 'ndr';
      } else if (['rto_initiated', 'rto_in_transit', 'rto_delivered'].includes(tracking_status)) {
        milestoneKey = 'rto';
      }

      if (milestoneKey) {
        await handleMilestoneEvent(milestoneKey, {
          sellerId: tenant_id,
          awbNumber: awb_number,
        });
      }
    } catch (_) {}
  });

  // 4. NDR Created
  eventBus.on('ndr.created', async (data) => {
    try {
      const sellerId = data?.tenant_id;
      if (!sellerId) return;
      await handleMilestoneEvent('ndr', {
        sellerId,
        awbNumber: data.awb_number,
        orderId: data.order_id,
      });
    } catch (_) {}
  });

  // 5. RTO Initiated
  eventBus.on('rto.initiated', async (data) => {
    try {
      const sellerId = data?.tenant_id;
      if (!sellerId) return;
      await handleMilestoneEvent('rto', {
        sellerId,
        awbNumber: data.awb_number,
        orderId: data.order_id,
      });
    } catch (_) {}
  });

  // 6. Shipment Cancelled
  eventBus.on('shipment.cancelled', async (data) => {
    try {
      const sellerId = data?.tenant_id;
      if (!sellerId) return;
      await handleMilestoneEvent('cancelled', {
        sellerId,
        awbNumber: data.awb_number,
        orderId: data.order_id,
      });
    } catch (_) {}
  });

  logger.info('[GrowaxEventSubscriber] Growax milestone listeners registered successfully.');
}

module.exports = {
  initGrowaxEventSubscriber,
  handleMilestoneEvent,
};

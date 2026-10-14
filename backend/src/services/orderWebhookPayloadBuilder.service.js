'use strict';

const crypto = require('crypto');
const { Order, OrderItem, PickupAddress, Tenant, Shipment, CourierProvider, TrackingEvent } = require('../models');
const { NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Normalizes raw internal event keys and status strings to standard admin webhook event names.
 * Supported target admin events:
 * - order.booked
 * - order.pickup_scheduled
 * - order.picked_up
 * - order.in_transit
 * - order.out_for_delivery
 * - order.delivered
 * - order.ndr
 * - order.rto_initiated
 * - order.rto_delivered
 * - order.cancelled
 * - order.status_changed (catch-all)
 */
function normalizeEventName(rawEvent, orderStatus = null, trackingStatus = null) {
  const normEvent = String(rawEvent || '').trim().toLowerCase();
  const normOrdStatus = String(orderStatus || '').trim().toLowerCase();
  const normTrkStatus = String(trackingStatus || '').trim().toLowerCase();

  // 1. Direct shipment booking or shipped status
  if (normEvent === 'shipment.created' || normEvent === 'courier.booked' || normOrdStatus === 'shipped') {
    return 'order.booked';
  }

  // 2. Tracking status mapped milestones
  if (normTrkStatus === 'pickup_scheduled' || normEvent === 'order.pickup_scheduled') {
    return 'order.pickup_scheduled';
  }
  if (normTrkStatus === 'picked_up' || normEvent === 'order.picked_up') {
    return 'order.picked_up';
  }
  if (normTrkStatus === 'in_transit' || normEvent === 'order.in_transit' || normOrdStatus === 'in_transit') {
    return 'order.in_transit';
  }
  if (normTrkStatus === 'out_for_delivery' || normEvent === 'order.out_for_delivery' || normOrdStatus === 'out_for_delivery') {
    return 'order.out_for_delivery';
  }
  if (normTrkStatus === 'delivered' || normOrdStatus === 'delivered' || normOrdStatus === 'fulfilled' || normEvent === 'order.delivered') {
    return 'order.delivered';
  }

  // 3. NDR and RTO milestones
  if (
    normEvent === 'ndr.created' ||
    normEvent === 'order.ndr' ||
    ['ndr_initiated', 'delivery_failed', 'undelivered'].includes(normTrkStatus)
  ) {
    return 'order.ndr';
  }
  if (
    normEvent === 'rto.initiated' ||
    normEvent === 'order.rto_initiated' ||
    normTrkStatus === 'rto_initiated'
  ) {
    return 'order.rto_initiated';
  }
  if (
    normTrkStatus === 'rto_delivered' ||
    normTrkStatus === 'reverse_delivered' ||
    normOrdStatus === 'rto_delivered' ||
    normOrdStatus === 'returned' ||
    normEvent === 'order.rto_delivered'
  ) {
    return 'order.rto_delivered';
  }

  // 4. Cancellation
  if (normEvent === 'shipment.cancelled' || normOrdStatus === 'cancelled' || normEvent === 'order.cancelled') {
    return 'order.cancelled';
  }

  // 5. Catch-all for status changes or created
  if (normEvent === 'order.status_changed' || normEvent === 'admin.order.event' || normEvent === 'order.created') {
    return normEvent === 'order.created' || normEvent === 'admin.order.event' ? 'order.status_changed' : 'order.status_changed';
  }

  return 'order.status_changed';
}

/**
 * Deterministically generates an idempotent event ID from order ID, normalized event, and event time.
 */
function generateEventId(orderId, normalizedEvent, eventTime) {
  const timeKey = eventTime ? new Date(eventTime).toISOString() : new Date().toISOString().slice(0, 16);
  const hash = crypto.createHash('sha256').update(`${orderId}:${normalizedEvent}:${timeKey}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

/**
 * Round number to 3 decimal places
 */
function round3(num) {
  return Math.round((parseFloat(num) || 0) * 1000) / 1000;
}

/**
 * Round number to 2 decimal places
 */
function round2(num) {
  return Math.round((parseFloat(num) || 0) * 100) / 100;
}

/**
 * Loads order and all associations fresh from the database and builds the standardized webhook payload.
 *
 * @param {string|object} orderOrId - UUID or Order model instance
 * @param {string} rawEvent - Raw event name
 * @param {object} [options] - Additional metadata like eventTime, trackingStatus, etc.
 * @returns {Promise<object>} Clean, sanitized webhook payload
 */
async function buildPayload(orderOrId, rawEvent, options = {}) {
  const orderId = typeof orderOrId === 'string' ? orderOrId : orderOrId?.id;
  if (!orderId) {
    throw new Error('orderId is required to build webhook payload');
  }

  // Fresh load with all necessary associations
  const order = await Order.unscoped().findByPk(orderId, {
    include: [
      {
        model: OrderItem,
        as: 'items',
        attributes: ['id', 'product_name', 'sku', 'quantity', 'unit_price'],
      },
      {
        model: PickupAddress.unscoped(),
        as: 'pickupAddress',
      },
      {
        model: Tenant.unscoped(),
        as: 'tenant',
        attributes: [
          'id',
          'company_name',
          'legal_business_name',
          'gst_number',
          'support_phone',
          'support_email',
        ],
      },
      {
        model: Shipment.unscoped(),
        as: 'shipments',
        include: [
          {
            model: CourierProvider.unscoped(),
            as: 'provider',
            attributes: ['id', 'display_name', 'provider_key'],
          },
          {
            model: TrackingEvent,
            as: 'trackingEvents',
            attributes: ['status', 'raw_status', 'location', 'remark', 'event_timestamp', 'created_at'],
            required: false,
          },
        ],
      },
    ],
  });

  if (!order) {
    throw new NotFoundError(`Order ${orderId} not found`);
  }

  // Resolve active shipment (first non-cancelled or newest)
  const allShipments = order.shipments || [];
  const activeShipment = allShipments.find(s => s.status !== 'cancelled' && s.status !== 'failed') || allShipments[0] || null;

  // Resolve normalized event name
  const trackingStatus = options.trackingStatus || options.tracking_status || (activeShipment ? activeShipment.status : null);
  const normalizedEvent = normalizeEventName(rawEvent, order.status, trackingStatus);

  const eventTime = options.eventTime || options.event_timestamp || new Date().toISOString();
  const eventId = generateEventId(order.id, normalizedEvent, eventTime);

  // Compute package weight and dimensions
  const deadWeight = parseFloat(order.weight_kg) || 0.5;
  const l = parseFloat(order.length_cm) || 10;
  const w = parseFloat(order.width_cm) || 10;
  const h = parseFloat(order.height_cm) || 10;
  const volumetricWeight = round3((l * w * h) / 5000);
  const billableWeight = Math.max(deadWeight, volumetricWeight);

  // Clean items array
  const items = (order.items || []).map(item => ({
    id: item.id,
    product_name: item.product_name,
    sku: item.sku || null,
    quantity: parseInt(item.quantity, 10) || 1,
    unit_price: round2(item.unit_price),
    total_price: round2((item.quantity || 1) * (item.unit_price || 0)),
  }));

  // Clean shipment details (NO internal fields like cost_rate, margin_amount, provider_raw_response)
  let shipmentBlock = null;
  let trackingHistory = [];

  if (activeShipment) {
    const courierDisplayName = activeShipment.provider?.display_name || activeShipment.provider?.name || 'Standard Courier';
    const awb = activeShipment.awb_number || null;

    shipmentBlock = {
      id: activeShipment.id,
      awb_number: awb,
      courier_name: courierDisplayName,
      courier_service_type: activeShipment.service_type || 'express',
      status: activeShipment.status,
      shipping_charge: round2(activeShipment.sell_rate || activeShipment.selected_rate || 0),
      cod_charge: round2(activeShipment.cod_charge || 0),
      label_url: activeShipment.label_url || null,
      tracking_url: awb ? `https://app.nanoshipy.com/track/${encodeURIComponent(awb)}` : null,
      estimated_delivery_date: activeShipment.estimated_delivery_date ? new Date(activeShipment.estimated_delivery_date).toISOString() : null,
    };

    // Tracking history (last 50 events, newest first)
    if (Array.isArray(activeShipment.trackingEvents)) {
      trackingHistory = activeShipment.trackingEvents
        .slice()
        .sort((a, b) => new Date(b.event_timestamp || b.created_at) - new Date(a.event_timestamp || a.created_at))
        .slice(0, 50)
        .map(te => ({
          status: te.status,
          activity: te.remark || te.raw_status || '',
          location: te.location || '',
          timestamp: te.event_timestamp ? new Date(te.event_timestamp).toISOString() : (te.created_at ? new Date(te.created_at).toISOString() : null),
        }));
    }
  }

  // Construct master webhook payload
  return {
    payload_version: '1.0',
    event: normalizedEvent,
    event_id: eventId,
    timestamp: eventTime,
    sandbox: Boolean(order.sandbox),
    order: {
      id: order.id,
      order_reference: order.order_reference,
      status: order.status,
      source: order.source,
      booking_type: order.booking_type,
      is_walkin: Boolean(order.is_walkin),
      created_at: order.created_at ? new Date(order.created_at).toISOString() : null,
      updated_at: order.updated_at ? new Date(order.updated_at).toISOString() : null,
    },
    seller: {
      tenant_id: order.tenant_id,
      company_name: order.tenant?.company_name || 'Nanoshipy Merchant',
      legal_business_name: order.tenant?.legal_business_name || order.tenant?.company_name || 'Nanoshipy Merchant',
      gstin: order.tenant?.gst_number || null,
      support_phone: order.tenant?.support_phone || null,
      support_email: order.tenant?.support_email || null,
    },
    customer: {
      name: order.customer_name,
      phone: order.customer_phone,
      email: order.customer_email || null,
    },
    shipping_address: {
      address_line1: order.shipping_address_line1,
      address_line2: order.shipping_address_line2 || null,
      city: order.shipping_city,
      state: order.shipping_state,
      pincode: order.shipping_pincode,
      country: order.shipping_country || 'India',
    },
    pickup_address: order.pickupAddress ? {
      id: order.pickupAddress.id,
      label: order.pickupAddress.label || 'Default Warehouse',
      contact_name: order.pickupAddress.contact_name || '',
      contact_phone: order.pickupAddress.contact_phone || '',
      address_line1: order.pickupAddress.address_line1 || '',
      address_line2: order.pickupAddress.address_line2 || null,
      city: order.pickupAddress.city || '',
      state: order.pickupAddress.state || '',
      pincode: order.pickupAddress.pincode || '',
      shipway_location_id: order.pickupAddress.shipway_location_id || null,
    } : null,
    package: {
      dead_weight_kg: deadWeight,
      volumetric_weight_kg: volumetricWeight,
      billable_weight_kg: billableWeight,
      length_cm: l,
      width_cm: w,
      height_cm: h,
      consignment_type: order.consignment_type || 'non_document',
    },
    payment: {
      payment_mode: order.payment_mode,
      order_value: round2(order.order_value),
      cod_amount: round2(order.cod_amount || 0),
      collected_amount: round2(order.amount_collected || order.counter_amount_collected || 0),
      counter_payment_method: order.counter_payment_method || null,
    },
    items,
    shipment: shipmentBlock,
    tracking_history: trackingHistory,
  };
}

module.exports = {
  buildPayload,
  normalizeEventName,
  generateEventId,
};

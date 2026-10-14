'use strict';

const { Shipment, Order, CourierProvider, PickupAddress, ShipmentStatusHistory } = require('../models');
const { Op } = require('sequelize');

const findById = async (id, tenantId) => {
  const where = { id };
  if (tenantId) where.tenant_id = tenantId;
  return Shipment.scope('detailed').findOne({
    where,
    include: [
      {
        model: Order,
        as: 'order',
        attributes: [
          'id',
          'order_reference',
          'customer_name',
          'customer_phone',
          'customer_email',
          'shipping_address_line1',
          'shipping_address_line2',
          'shipping_city',
          'shipping_state',
          'shipping_pincode',
          'shipping_country',
          'order_value',
          'payment_mode',
          'cod_amount',
        ],
      },
      {
        model: CourierProvider,
        as: 'provider',
        attributes: ['id', 'provider_key', 'display_name', 'logo_url'],
      },
      {
        model: PickupAddress,
        as: 'pickupAddress',
        attributes: ['id', 'label', 'contact_name', 'contact_phone', 'address_line1', 'address_line2', 'city', 'state', 'pincode', 'country', 'is_default', 'is_active'],
      },
      {
        model: ShipmentStatusHistory,
        as: 'statusHistory',
        attributes: ['id', 'shipment_id', 'old_status', 'new_status', 'source', 'note', 'created_at'],
      },
    ],
    order: [[{ model: ShipmentStatusHistory, as: 'statusHistory' }, 'created_at', 'DESC']],
  });

  if (shipment) {
    try {
      const sType = String(shipment.service_type || '').toLowerCase();
      let matchedKey = null;
      if (sType === '19339' || sType.includes('amazon')) matchedKey = 'amazon';
      else if (['80622', '7442', '80734', '80977', '7613', '7666'].includes(sType) || sType.includes('delhivery')) matchedKey = 'delhivery';
      else if (['81769', '7377'].includes(sType) || sType.includes('bluedart')) matchedKey = 'bluedart';
      else if (['80593', '80652'].includes(sType) || sType.includes('xpressbees')) matchedKey = 'xpressbees';
      else if (['79681', '79930'].includes(sType) || sType.includes('shadowfax')) matchedKey = 'shadowfax';
      else if (['71468', '80275', '81514', '80063', '80064', '82861'].includes(sType) || sType.includes('ekart')) matchedKey = 'ekart';
      else if (sType === '80800' || sType.includes('dtdc')) matchedKey = 'dtdc';
      else if (sType.includes('st_courier') || sType.includes('stcourier')) matchedKey = 'stcourier';

      if (matchedKey) {
        const found = await CourierProvider.findOne({ where: { provider_key: matchedKey }, attributes: ['logo_url'], raw: true });
        if (found?.logo_url) shipment.setDataValue('courier_logo_url', found.logo_url);
      } else if (shipment.provider?.logo_url) {
        shipment.setDataValue('courier_logo_url', shipment.provider.logo_url);
      }
    } catch (e) {}
  }

  return shipment;
};

const findAll = async ({
  tenant_id,
  status,
  courier_provider_id,
  awb_number,
  date_from,
  date_to,
  from,
  to,
  all_time,
  search,
  page = 1,
  limit = 20,
  sort = 'created_at',
  order = 'DESC',
}) => {
  const offset = (page - 1) * limit;
  const where = {};
  if (tenant_id) {
    where.tenant_id = tenant_id;
  }

  if (status) {
    where.status = status;
  }

  if (courier_provider_id) {
    where.courier_provider_id = courier_provider_id;
  }

  const likeOperator = Op.iLike && process.env.USE_SQLITE !== 'true' ? Op.iLike : Op.like;

  if (awb_number) {
    where.awb_number = {
      [likeOperator]: `%${awb_number}%`,
    };
  }

  const effectiveFrom = from || date_from;
  const effectiveTo = to || date_to;
  if (effectiveFrom || effectiveTo) {
    where.created_at = {};
    if (effectiveFrom) where.created_at[Op.gte] = new Date(`${effectiveFrom.split('T')[0]}T00:00:00.000Z`);
    if (effectiveTo) where.created_at[Op.lte] = new Date(`${effectiveTo.split('T')[0]}T23:59:59.999Z`);
  } else if (all_time !== true && all_time !== 'true') {
    where.created_at = {
      [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    };
  }

  const orderInclude = [];
  if (search) {
    orderInclude.push({
      model: Order,
      as: 'order',
      where: {
        [Op.or]: [
          { order_reference: { [likeOperator]: `%${search}%` } },
          { customer_name: { [likeOperator]: `%${search}%` } },
        ],
      },
    });
  } else {
    orderInclude.push({
      model: Order,
      as: 'order',
      attributes: ['id', 'order_reference', 'customer_name'],
    });
  }

  // Include CourierProvider for display
  orderInclude.push({
    model: CourierProvider,
    as: 'provider',
    attributes: ['id', 'display_name', 'provider_key', 'logo_url'],
  });

  const { count, rows } = await Shipment.findAndCountAll({
    where,
    limit,
    offset,
    include: orderInclude,
    order: [[sort, order]],
  });

  // Attach dynamically resolved courier provider logos for sub-carriers (e.g. Amazon 19339, Delhivery 80622, etc.)
  try {
    const allProviders = await CourierProvider.findAll({
      attributes: ['id', 'provider_key', 'display_name', 'logo_url'],
      raw: true,
    });
    const providerMap = {};
    for (const p of allProviders) {
      if (p.provider_key && p.logo_url) providerMap[p.provider_key.toLowerCase()] = p.logo_url;
      if (p.id && p.logo_url) providerMap[p.id] = p.logo_url;
    }

    for (const row of rows) {
      const sType = String(row.service_type || '').toLowerCase();
      let matchedKey = null;
      if (sType === '19339' || sType.includes('amazon')) matchedKey = 'amazon';
      else if (['80622', '7442', '80734', '80977', '7613', '7666'].includes(sType) || sType.includes('delhivery')) matchedKey = 'delhivery';
      else if (['81769', '7377'].includes(sType) || sType.includes('bluedart')) matchedKey = 'bluedart';
      else if (['80593', '80652'].includes(sType) || sType.includes('xpressbees')) matchedKey = 'xpressbees';
      else if (['79681', '79930'].includes(sType) || sType.includes('shadowfax')) matchedKey = 'shadowfax';
      else if (['71468', '80275', '81514', '80063', '80064', '82861'].includes(sType) || sType.includes('ekart')) matchedKey = 'ekart';
      else if (sType === '80800' || sType.includes('dtdc')) matchedKey = 'dtdc';
      else if (sType.includes('st_courier') || sType.includes('stcourier')) matchedKey = 'stcourier';

      if (matchedKey && providerMap[matchedKey]) {
        row.setDataValue('courier_logo_url', providerMap[matchedKey]);
      } else if (row.courier_provider_id && providerMap[row.courier_provider_id]) {
        row.setDataValue('courier_logo_url', providerMap[row.courier_provider_id]);
      } else if (row.provider?.logo_url) {
        row.setDataValue('courier_logo_url', row.provider.logo_url);
      }
    }
  } catch (attachErr) {
    // Non-blocking fallback
  }

  return {
    rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};

const create = async (data, transaction = null) => {
  return Shipment.create(data, { transaction });
};

const update = async (id, data, transaction = null) => {
  const shipment = await Shipment.findByPk(id, { transaction });
  if (!shipment) return null;
  await shipment.update(data, { transaction });
  return shipment;
};

module.exports = {
  findById,
  findAll,
  create,
  update,
};

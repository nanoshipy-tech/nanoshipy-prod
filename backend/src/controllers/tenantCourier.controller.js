'use strict';

const courierProviderService = require('../services/courierProvider.service');
const { CourierProvider } = require('../models');
const { success } = require('../utils/apiResponse');

const listAvailable = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const couriers = await courierProviderService.getForTenant(tenantId);
    return success(res, couriers);
  } catch (err) {
    next(err);
  }
};

const getBranding = async (req, res, next) => {
  try {
    const providers = await CourierProvider.findAll({
      attributes: ['provider_key', 'display_name', 'logo_url'],
      raw: true,
    });
    const map = {};
    for (const p of providers) {
      if (p.provider_key && p.logo_url) {
        map[p.provider_key.toLowerCase()] = p.logo_url;
      }
    }
    return success(res, map);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listAvailable,
  getBranding,
};

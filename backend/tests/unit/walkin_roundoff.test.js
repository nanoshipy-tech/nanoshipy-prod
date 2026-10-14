'use strict';

const pricingService = require('../../src/services/pricing.service');

describe('Walk-in Booking vs Seller Rate Round-off Logic', () => {
  it('1. Seller account booking (isWalkin = false) retains exact decimal paise', async () => {
    // Shipway baseCost 46.02 + 4.00 surcharge * 1.18 GST = 59.0236
    // Markup 30% + 5 flat markup -> sellPrice has paise
    const sellerResult = await pricingService.calculateSellerRate({
      costPrice: 45.00,
      sellerId: 'test-seller',
      carrierId: 'test-carrier',
      zone: 'B',
      applyShipwayTaxAndFee: true,
      isWalkin: false,
    });

    // Should NOT be forced to integer
    expect(sellerResult.sellPrice % 1).not.toBe(0);
    expect(sellerResult.totalPrice % 1).not.toBe(0);
  });

  it('2. Walk-in counter booking (isWalkin = true) is rounded off to whole rupee (no paise)', async () => {
    const walkinResult = await pricingService.calculateSellerRate({
      costPrice: 45.00,
      sellerId: 'test-seller',
      carrierId: 'test-carrier',
      zone: 'B',
      applyShipwayTaxAndFee: true,
      isWalkin: true,
    });

    // Must be whole number (zero paise)
    expect(walkinResult.sellPrice % 1).toBe(0);
    expect(walkinResult.totalPrice % 1).toBe(0);
    expect(Number.isInteger(walkinResult.sellPrice)).toBe(true);
    expect(Number.isInteger(walkinResult.totalPrice)).toBe(true);
  });
});

import { resolveAssetUrl } from './urlUtils';

export const CARRIER_ID_LOGOS: Record<string, string> = {
  '80622': '/couriers/delhivery.svg', // Delhivery Surface
  '7442':  '/couriers/delhivery.svg', // Delhivery Express
  '80734': '/couriers/delhivery.svg', // Delhivery Surface 1kg
  '80977': '/couriers/delhivery.svg', // Delhivery Surface 2kg
  '7613':  '/couriers/delhivery.svg', // Delhivery Surface 5kg
  '7666':  '/couriers/delhivery.svg', // Delhivery Surface 10kg
  '81769': '/couriers/bluedart.svg',  // Blue Dart Surface
  '7377':  '/couriers/bluedart.svg',  // Blue Dart Express
  '80593': '/couriers/xpressbees.svg',// Xpressbees Surface
  '80652': '/couriers/xpressbees.svg',// Xpressbees Air Priority
  '79681': '/couriers/shadowfax.svg', // Shadowfax Surface
  '79930': '/couriers/shadowfax.svg', // Shadowfax Surface 1kg
  '71468': '/couriers/ekart.svg',     // Ekart Surface
  '80275': '/couriers/ekart.svg',     // Ekart Surface 1kg
  '81514': '/couriers/ekart.svg',     // Ekart Express
  '80063': '/couriers/ekart.svg',     // Ekart Surface 5kg
  '80064': '/couriers/ekart.svg',     // Ekart Surface 10kg
  '82861': '/couriers/ekart.svg',     // Ekart Logistics
  '19339': '/couriers/amazon.png',    // Amazon Shipping (Original Uploaded Logo)
  '80800': '/couriers/dtdc.svg',      // DTDC Express
};

export const DEFAULT_COURIER_LOGOS: Record<string, string> = {
  delhivery: '/couriers/delhivery.svg',
  bluedart: '/couriers/bluedart.svg',
  'blue dart': '/couriers/bluedart.svg',
  xpressbees: '/couriers/xpressbees.svg',
  'xpress bees': '/couriers/xpressbees.svg',
  shadowfax: '/couriers/shadowfax.svg',
  ekart: '/couriers/ekart.svg',
  dtdc: '/couriers/dtdc.svg',
  ecomexpress: '/couriers/ecomexpress.svg',
  'ecom express': '/couriers/ecomexpress.svg',
  stcourier: '/couriers/stcourier.svg',
  'st courier': '/couriers/stcourier.svg',
  amazon: '/couriers/amazon.png',
  'amazon shipping': '/couriers/amazon.png',
  indiapost: '/couriers/indiapost.svg',
  'india post': '/couriers/indiapost.svg',
  nanoshipy: '/logo.png',
  smartr: '/couriers/smartr.svg',
  fedex: '/couriers/fedex.svg',
};

// ── Dynamic logo store synced with Admin Panel uploads ──
let dynamicCourierLogos: Record<string, string> = {
  amazon: '/uploads/couriers/courier_amazon_1791741838191_iuerz.png',
  '19339': '/uploads/couriers/courier_amazon_1791741838191_iuerz.png',
  'amazon shipping': '/uploads/couriers/courier_amazon_1791741838191_iuerz.png',
  delhivery: '/uploads/couriers/courier_delhivery_1791744492686_p2ubw.png',
  '80622': '/uploads/couriers/courier_delhivery_1791744492686_p2ubw.png',
  '7442': '/uploads/couriers/courier_delhivery_1791744492686_p2ubw.png',
  '80734': '/uploads/couriers/courier_delhivery_1791744492686_p2ubw.png',
  '80977': '/uploads/couriers/courier_delhivery_1791744492686_p2ubw.png',
  '7613': '/uploads/couriers/courier_delhivery_1791744492686_p2ubw.png',
  '7666': '/uploads/couriers/courier_delhivery_1791744492686_p2ubw.png',
  stcourier: '/uploads/couriers/courier_stcourier_1791744383227_f77db.png',
  'st courier': '/uploads/couriers/courier_stcourier_1791744383227_f77db.png',
  st_courier_surface: '/uploads/couriers/courier_stcourier_1791744383227_f77db.png',
  bluedart: '/uploads/couriers/courier_bluedart_1791744667690_ad3ko.png',
  'blue dart': '/uploads/couriers/courier_bluedart_1791744667690_ad3ko.png',
  '81769': '/uploads/couriers/courier_bluedart_1791744667690_ad3ko.png',
  '7377': '/uploads/couriers/courier_bluedart_1791744667690_ad3ko.png',
  ekart: '/uploads/couriers/courier_ekart_1791744580999_lt94n.png',
  '80275': '/uploads/couriers/courier_ekart_1791744580999_lt94n.png',
  '71468': '/uploads/couriers/courier_ekart_1791744580999_lt94n.png',
  '81514': '/uploads/couriers/courier_ekart_1791744580999_lt94n.png',
  '80063': '/uploads/couriers/courier_ekart_1791744580999_lt94n.png',
  '80064': '/uploads/couriers/courier_ekart_1791744580999_lt94n.png',
  '82861': '/uploads/couriers/courier_ekart_1791744580999_lt94n.png',
  xpressbees: '/uploads/couriers/courier_xpressbees_1791744759067_8zpe0.png',
  '80593': '/uploads/couriers/courier_xpressbees_1791744759067_8zpe0.png',
  '80652': '/uploads/couriers/courier_xpressbees_1791744759067_8zpe0.png',
  shadowfax: '/uploads/couriers/courier_shadowfax_1791744849858_70syt.png',
  '79681': '/uploads/couriers/courier_shadowfax_1791744849858_70syt.png',
  '79930': '/uploads/couriers/courier_shadowfax_1791744849858_70syt.png',
  ecomexpress: '/uploads/couriers/courier_ecomexpress_1791744933636_knvgu.png',
  dtdc: '/uploads/couriers/courier_dtdc_1791745039216_fayqq.png',
  '80800': '/uploads/couriers/courier_dtdc_1791745039216_fayqq.png',
};

export function setDynamicCourierLogos(map: Record<string, string>) {
  if (!map || typeof map !== 'object') return;
  for (const [k, v] of Object.entries(map)) {
    if (v) {
      const lower = k.toLowerCase().trim();
      dynamicCourierLogos[lower] = v;
      if (lower === 'amazon') dynamicCourierLogos['19339'] = v;
      if (lower === 'delhivery') dynamicCourierLogos['80622'] = v;
      if (lower === 'bluedart') dynamicCourierLogos['81769'] = v;
      if (lower === 'xpressbees') dynamicCourierLogos['80593'] = v;
      if (lower === 'ekart') dynamicCourierLogos['80275'] = v;
      if (lower === 'stcourier') dynamicCourierLogos['st_courier_surface'] = v;
      if (lower === 'dtdc') dynamicCourierLogos['80800'] = v;
      if (lower === 'shadowfax') dynamicCourierLogos['79681'] = v;
    }
  }
}

export function getDynamicCourierLogo(keyOrCode?: string | null): string | null {
  if (!keyOrCode) return null;
  const k = keyOrCode.toLowerCase().trim();
  const found = dynamicCourierLogos[k];
  if (found) {
    return resolveAssetUrl(found);
  }
  return null;
}

export function resolveCourierLogo(
  nameOrKey?: string | null,
  customLogoUrl?: string | null,
  serviceType?: string | null
): string {
  // If custom logo is an uploaded file (/uploads/) or custom external URL (http), prioritize it
  if (customLogoUrl && customLogoUrl.trim() && !customLogoUrl.includes('logo.clearbit.com')) {
    if (customLogoUrl.startsWith('/uploads/')) {
      return resolveAssetUrl(customLogoUrl);
    }
    if (customLogoUrl.startsWith('http') && !customLogoUrl.includes('nanoshipy.com/couriers/')) {
      return customLogoUrl;
    }
  }

  // Check dynamic admin uploads by serviceType or name
  const sType = String(serviceType || '').trim();
  const dynFromService = getDynamicCourierLogo(sType);
  if (dynFromService) return dynFromService;

  const dynFromName = getDynamicCourierLogo(nameOrKey);
  if (dynFromName) return dynFromName;

  // 1. Match by carrierId / serviceType (exact or extracted numeric code)
  if (sType) {
    if (CARRIER_ID_LOGOS[sType]) return CARRIER_ID_LOGOS[sType];
    const numMatch = sType.match(/\b\d{4,6}\b/)?.[0];
    if (numMatch) {
      const dynNum = getDynamicCourierLogo(numMatch);
      if (dynNum) return dynNum;
      if (CARRIER_ID_LOGOS[numMatch]) return CARRIER_ID_LOGOS[numMatch];
    }

    // Check if serviceType mentions a known courier
    const sTypeLower = sType.toLowerCase();
    for (const [k, v] of Object.entries(DEFAULT_COURIER_LOGOS)) {
      if (k !== 'nanoshipy' && sTypeLower.includes(k)) {
        const dynK = getDynamicCourierLogo(k);
        return dynK || v;
      }
    }
  }

  if (!nameOrKey) return '/logo.png';
  const clean = nameOrKey.toLowerCase().trim();

  // 2. Match if nameOrKey is carrier ID (exact or extracted numeric code)
  if (CARRIER_ID_LOGOS[clean]) {
    return CARRIER_ID_LOGOS[clean];
  }
  const cleanNumMatch = clean.match(/\b\d{4,6}\b/)?.[0];
  if (cleanNumMatch) {
    const dynCleanNum = getDynamicCourierLogo(cleanNumMatch);
    if (dynCleanNum) return dynCleanNum;
    if (CARRIER_ID_LOGOS[cleanNumMatch]) return CARRIER_ID_LOGOS[cleanNumMatch];
  }

  // 3. Match courier name substrings (prioritize non-nanoshipy specific couriers first)
  for (const [k, v] of Object.entries(DEFAULT_COURIER_LOGOS)) {
    if (k !== 'nanoshipy' && clean.includes(k)) {
      const dynK = getDynamicCourierLogo(k);
      return dynK || v;
    }
  }

  if (clean.includes('nanoshipy')) return '/logo.png';

  return '/logo.png';
}

export const CARRIER_METADATA: Record<string, { brand: string; service: string }> = {
  '80622': { brand: 'Delhivery', service: 'Surface Express' },
  '7442':  { brand: 'Delhivery', service: 'Air Express' },
  '80734': { brand: 'Delhivery', service: 'Surface (1kg)' },
  '80977': { brand: 'Delhivery', service: 'Surface (2kg)' },
  '7613':  { brand: 'Delhivery', service: 'Surface (5kg)' },
  '7666':  { brand: 'Delhivery', service: 'Surface (10kg)' },
  '81769': { brand: 'Blue Dart', service: 'Surface Express' },
  '7377':  { brand: 'Blue Dart', service: 'Air Priority' },
  '80593': { brand: 'XpressBees', service: 'Surface Express' },
  '80652': { brand: 'XpressBees', service: 'Air Priority' },
  '79681': { brand: 'Shadowfax', service: 'Surface Express' },
  '79930': { brand: 'Shadowfax', service: 'Surface (1kg)' },
  '71468': { brand: 'Ekart', service: 'Surface Express' },
  '80275': { brand: 'Ekart', service: 'Surface (1kg)' },
  '81514': { brand: 'Ekart', service: 'Express' },
  '80063': { brand: 'Ekart', service: 'Surface (5kg)' },
  '80064': { brand: 'Ekart', service: 'Surface (10kg)' },
  '82861': { brand: 'Ekart', service: 'Logistics' },
  '19339': { brand: 'Amazon Shipping', service: 'Standard Surface' },
  '80800': { brand: 'DTDC', service: 'Express' },
};

export interface CourierDisplayInfo {
  brand: string;
  service: string;
  logoUrl: string;
}

export function resolveCourierInfo(
  rawName?: string | null,
  serviceType?: string | null,
  customLogoUrl?: string | null
): CourierDisplayInfo {
  const sType = String(serviceType || '').trim();
  const raw = String(rawName || '').trim();
  const lowerRaw = raw.toLowerCase();
  const lowerSType = sType.toLowerCase();

  // 0. Check if a custom uploaded logo exists
  const customResolved = customLogoUrl && customLogoUrl.trim() ? resolveCourierLogo(rawName, customLogoUrl, serviceType) : null;
  const hasCustomUploadedLogo = !!(customResolved && (customResolved.startsWith('http') || customResolved.includes('/uploads/')));

  // Helper to get dynamic logo or fallback
  const getLogoWithDynamic = (codeOrKey: string, fallbackUrl: string) => {
    if (hasCustomUploadedLogo && customResolved) return customResolved;
    const dyn = getDynamicCourierLogo(codeOrKey);
    if (dyn) return dyn;
    return fallbackUrl;
  };

  // 1. Try to find carrier by numeric ID (e.g. 80622, 19339) in serviceType or rawName
  const numId = sType.match(/\b\d{4,6}\b/)?.[0] || raw.match(/\b\d{4,6}\b/)?.[0];
  if (numId && CARRIER_METADATA[numId]) {
    const meta = CARRIER_METADATA[numId];
    const fallback = CARRIER_ID_LOGOS[numId] || resolveCourierLogo(meta.brand, customLogoUrl, sType);
    return {
      brand: meta.brand,
      service: meta.service,
      logoUrl: getLogoWithDynamic(numId, fallback),
    };
  }

  // 2. ST Courier match
  if (
    lowerSType.includes('st_courier') ||
    lowerSType.includes('stcourier') ||
    lowerRaw.includes('st courier') ||
    lowerRaw.includes('stcourier') ||
    lowerSType.includes('tamil') ||
    lowerRaw.includes('tamil')
  ) {
    const isAir = lowerSType.includes('air') || lowerRaw.includes('air');
    return {
      brand: 'ST Courier',
      service: isAir ? 'Air Express' : 'Surface Express (TN)',
      logoUrl: getLogoWithDynamic('stcourier', '/couriers/stcourier.svg'),
    };
  }

  // 3. Delhivery match
  if (lowerSType.includes('delhivery') || lowerRaw.includes('delhivery')) {
    const isAir = lowerSType.includes('air') || lowerRaw.includes('air');
    return {
      brand: 'Delhivery',
      service: isAir ? 'Air Express' : 'Surface Express',
      logoUrl: getLogoWithDynamic('delhivery', '/couriers/delhivery.svg'),
    };
  }

  // 4. Amazon Shipping match
  if (lowerSType.includes('amazon') || lowerRaw.includes('amazon')) {
    return {
      brand: 'Amazon Shipping',
      service: 'Standard Surface',
      logoUrl: getLogoWithDynamic('amazon', '/couriers/amazon.png'),
    };
  }

  // 5. Blue Dart match
  if (
    lowerSType.includes('bluedart') ||
    lowerSType.includes('blue dart') ||
    lowerRaw.includes('bluedart') ||
    lowerRaw.includes('blue dart')
  ) {
    const isAir = lowerSType.includes('air') || lowerRaw.includes('air');
    return {
      brand: 'Blue Dart',
      service: isAir ? 'Air Priority' : 'Surface Express',
      logoUrl: getLogoWithDynamic('bluedart', '/couriers/bluedart.svg'),
    };
  }

  // 6. XpressBees match
  if (lowerSType.includes('xpressbees') || lowerSType.includes('xpress') || lowerRaw.includes('xpressbees')) {
    const isAir = lowerSType.includes('air') || lowerRaw.includes('air');
    return {
      brand: 'XpressBees',
      service: isAir ? 'Air Priority' : 'Surface Express',
      logoUrl: getLogoWithDynamic('xpressbees', '/couriers/xpressbees.svg'),
    };
  }

  // 7. Shadowfax match
  if (lowerSType.includes('shadowfax') || lowerRaw.includes('shadowfax')) {
    return {
      brand: 'Shadowfax',
      service: 'Surface Express',
      logoUrl: getLogoWithDynamic('shadowfax', '/couriers/shadowfax.svg'),
    };
  }

  // 8. Ekart match
  if (lowerSType.includes('ekart') || lowerRaw.includes('ekart')) {
    return {
      brand: 'Ekart',
      service: 'Surface Express',
      logoUrl: getLogoWithDynamic('ekart', '/couriers/ekart.svg'),
    };
  }

  // 9. DTDC match
  if (lowerSType.includes('dtdc') || lowerRaw.includes('dtdc')) {
    return {
      brand: 'DTDC',
      service: 'Express Service',
      logoUrl: getLogoWithDynamic('dtdc', '/couriers/dtdc.svg'),
    };
  }

  // Fallback: resolve logo
  const logo = resolveCourierLogo(rawName, customLogoUrl, serviceType);

  // Clean human-friendly service label
  let cleanService = sType
    .replace(/[_-]+/g, ' ')
    .replace(/\b\d{4,6}\b/g, '')
    .trim();
  if (!cleanService) cleanService = 'Express Logistics';
  else if (!cleanService.toLowerCase().includes('express') && !cleanService.toLowerCase().includes('surface')) {
    cleanService = `${cleanService} Express`;
  }
  cleanService = cleanService.replace(/\b\w/g, (c) => c.toUpperCase());

  // Clean brand name - never show "Nanoshipy" as delivery courier partner
  let brandName = raw && !lowerRaw.includes('nanoshipy') ? raw : 'Express Logistics';
  for (const [key, val] of Object.entries(DEFAULT_COURIER_LOGOS)) {
    if (key !== 'nanoshipy' && logo === val) {
      brandName = key.charAt(0).toUpperCase() + key.slice(1);
      break;
    }
  }

  return {
    brand: brandName,
    service: cleanService,
    logoUrl: logo,
  };
}

/**
 * Best-effort public IP + province/state-level region for admin review.
 * Display precision: China province / US state (not city).
 */

function withTimeout(ms) {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

const US_STATE_BY_CODE = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};

/** Map English / pinyin / code → Chinese province name */
const CN_PROVINCE_MAP = {
  beijing: '北京',
  bj: '北京',
  tianjin: '天津',
  tj: '天津',
  shanghai: '上海',
  sh: '上海',
  chongqing: '重庆',
  cq: '重庆',
  hebei: '河北',
  he: '河北',
  shanxi: '山西',
  sx: '山西',
  'nei mongol': '内蒙古',
  neimenggu: '内蒙古',
  'inner mongolia': '内蒙古',
  nm: '内蒙古',
  liaoning: '辽宁',
  ln: '辽宁',
  jilin: '吉林',
  jl: '吉林',
  heilongjiang: '黑龙江',
  hl: '黑龙江',
  jiangsu: '江苏',
  js: '江苏',
  zhejiang: '浙江',
  zj: '浙江',
  anhui: '安徽',
  ah: '安徽',
  fujian: '福建',
  fj: '福建',
  jiangxi: '江西',
  jx: '江西',
  shandong: '山东',
  sd: '山东',
  henan: '河南',
  ha: '河南',
  hubei: '湖北',
  hb: '湖北',
  hunan: '湖南',
  hn: '湖南',
  guangdong: '广东',
  gd: '广东',
  guangxi: '广西',
  gx: '广西',
  hainan: '海南',
  hi: '海南',
  sichuan: '四川',
  sc: '四川',
  guizhou: '贵州',
  gz: '贵州',
  yunnan: '云南',
  yn: '云南',
  xizang: '西藏',
  tibet: '西藏',
  xz: '西藏',
  shaanxi: '陕西',
  sn: '陕西',
  gansu: '甘肃',
  gs: '甘肃',
  qinghai: '青海',
  qh: '青海',
  ningxia: '宁夏',
  nx: '宁夏',
  xinjiang: '新疆',
  xj: '新疆',
  'hong kong': '香港',
  hongkong: '香港',
  hk: '香港',
  macao: '澳门',
  macau: '澳门',
  mo: '澳门',
  taiwan: '台湾',
  tw: '台湾',
};

function normalizeKey(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[省市区县壮族回族维吾尔自治区特别行政]/g, '')
    .replace(/\b(sheng|province|shi|zizhiqu|autonomous region|municipality)\b/gi, '')
    .replace(/[^a-z0-9\u4e00-\u9fff\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeChinaProvince(region, regionCode) {
  const raw = String(region || '').trim();
  if (/[\u4e00-\u9fff]/.test(raw)) {
    // Already Chinese — strip trailing 省/市/自治区 etc. then re-add standard suffix if needed
    const base = raw
      .replace(/(壮族|回族|维吾尔)?自治区$/, '')
      .replace(/特别行政区$/, '')
      .replace(/省$/, '')
      .replace(/市$/, '')
      .trim();
    return base || raw;
  }
  const byCode = CN_PROVINCE_MAP[String(regionCode || '').toLowerCase()];
  if (byCode) return byCode;
  const byName = CN_PROVINCE_MAP[normalizeKey(raw)];
  if (byName) return byName;
  return raw || null;
}

function normalizeUsState(region, regionCode) {
  const code = String(regionCode || '').toUpperCase();
  if (US_STATE_BY_CODE[code]) return US_STATE_BY_CODE[code];
  const raw = String(region || '').trim();
  if (/^[A-Za-z]{2}$/.test(raw) && US_STATE_BY_CODE[raw.toUpperCase()]) {
    return US_STATE_BY_CODE[raw.toUpperCase()];
  }
  return raw || null;
}

/**
 * Province/state-level label only (no city).
 * CN → "山东, 中国" ; US → "California, United States"
 */
export function formatProvinceState({ region, regionCode, country, countryCode }) {
  const cc = String(countryCode || '').toUpperCase();
  const countryName = String(country || '').trim();
  const isCN = cc === 'CN' || /^china$/i.test(countryName) || countryName === '中国';
  const isUS = cc === 'US' || /^united states/i.test(countryName) || countryName === '美国';

  let province = String(region || '').trim() || null;
  let countryLabel = countryName || cc || null;

  if (isCN) {
    province = normalizeChinaProvince(region, regionCode);
    countryLabel = '中国';
  } else if (isUS) {
    province = normalizeUsState(region, regionCode);
    countryLabel = 'United States';
  }

  if (province && countryLabel) {
    if (province.toLowerCase() === countryLabel.toLowerCase()) return countryLabel;
    return `${province}, ${countryLabel}`;
  }
  return province || countryLabel || null;
}

async function lookupGeoByIp(ip) {
  if (!ip) return null;

  // ipwho.is usually includes province/state; geojs often only has country
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: withTimeout(4500),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.success !== false) {
        const label = formatProvinceState({
          region: data.region,
          regionCode: data.region_code,
          country: data.country,
          countryCode: data.country_code,
        });
        if (label) return label;
      }
    }
  } catch {
    // fallback
  }

  try {
    const res = await fetch(
      `https://api.country.is/${encodeURIComponent(ip)}?fields=subdivision,country`,
      { signal: withTimeout(4500) }
    );
    if (res.ok) {
      const data = await res.json();
      const label = formatProvinceState({
        region: data.subdivision || data.region,
        regionCode: data.subdivision_code || data.region_code,
        country: data.country_name || data.country,
        countryCode: data.country,
      });
      if (label) return label;
    }
  } catch {
    // fallback
  }

  try {
    const res = await fetch(`https://get.geojs.io/v1/ip/geo/${encodeURIComponent(ip)}.json`, {
      signal: withTimeout(4500),
    });
    if (res.ok) {
      const data = await res.json();
      return formatProvinceState({
        region: data.region,
        regionCode: data.region_code,
        country: data.country,
        countryCode: data.country_code,
      });
    }
  } catch {
    // ignore
  }

  return null;
}

async function detectPublicIp() {
  try {
    const res = await fetch('https://api.ipify.org?format=json', {
      signal: withTimeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.ip && typeof data.ip === 'string') return data.ip.trim();
    }
  } catch {
    // fallback
  }

  try {
    const res = await fetch('https://www.cloudflare.com/cdn-cgi/trace', {
      signal: withTimeout(4000),
    });
    if (res.ok) {
      const text = await res.text();
      const match = text.match(/(?:^|\n)ip=([^\n]+)/);
      if (match?.[1]) return match[1].trim();
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * @returns {Promise<{ ip: string|null, region: string|null }>}
 */
export async function getClientIpInfo() {
  // Prefer ipwho for caller IP + province/state
  try {
    const res = await fetch('https://ipwho.is/', { signal: withTimeout(4500) });
    if (res.ok) {
      const data = await res.json();
      if (data?.success !== false) {
        const ip = data?.ip ? String(data.ip).trim() : null;
        const region = formatProvinceState({
          region: data.region,
          regionCode: data.region_code,
          country: data.country,
          countryCode: data.country_code,
        });
        if (ip || region) {
          return { ip, region: region || (ip ? await lookupGeoByIp(ip) : null) };
        }
      }
    }
  } catch {
    // fallback
  }

  const ip = await detectPublicIp();
  if (!ip) return { ip: null, region: null };
  const region = await lookupGeoByIp(ip);
  return { ip, region };
}

/** @returns {Promise<string|null>} */
export async function getClientIp() {
  const info = await getClientIpInfo();
  return info.ip;
}

/** Resolve province/state label for a known IP (admin backfill / display). */
export async function resolveIpRegion(ip) {
  return lookupGeoByIp(ip);
}

export default getClientIp;

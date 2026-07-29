/**
 * Best-effort public IP + province/state-level region for admin review.
 * Display in English: China province / US state (not city).
 * e.g. "Yunnan, China" / "California, United States"
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

/** English province names by code / pinyin / Chinese */
const CN_PROVINCE_BY_KEY = {
  beijing: 'Beijing', 北京: 'Beijing', bj: 'Beijing',
  tianjin: 'Tianjin', 天津: 'Tianjin', tj: 'Tianjin',
  shanghai: 'Shanghai', 上海: 'Shanghai', sh: 'Shanghai',
  chongqing: 'Chongqing', 重庆: 'Chongqing', cq: 'Chongqing',
  hebei: 'Hebei', 河北: 'Hebei', he: 'Hebei',
  shanxi: 'Shanxi', 山西: 'Shanxi', sx: 'Shanxi',
  'nei mongol': 'Inner Mongolia', neimenggu: 'Inner Mongolia',
  'inner mongolia': 'Inner Mongolia', 内蒙古: 'Inner Mongolia', nm: 'Inner Mongolia',
  liaoning: 'Liaoning', 辽宁: 'Liaoning', ln: 'Liaoning',
  jilin: 'Jilin', 吉林: 'Jilin', jl: 'Jilin',
  heilongjiang: 'Heilongjiang', 黑龙江: 'Heilongjiang', hl: 'Heilongjiang',
  jiangsu: 'Jiangsu', 江苏: 'Jiangsu', js: 'Jiangsu',
  zhejiang: 'Zhejiang', 浙江: 'Zhejiang', zj: 'Zhejiang',
  anhui: 'Anhui', 安徽: 'Anhui', ah: 'Anhui',
  fujian: 'Fujian', 福建: 'Fujian', fj: 'Fujian',
  jiangxi: 'Jiangxi', 江西: 'Jiangxi', jx: 'Jiangxi',
  shandong: 'Shandong', 山东: 'Shandong', sd: 'Shandong',
  henan: 'Henan', 河南: 'Henan', ha: 'Henan',
  hubei: 'Hubei', 湖北: 'Hubei', hb: 'Hubei',
  hunan: 'Hunan', 湖南: 'Hunan', hn: 'Hunan',
  guangdong: 'Guangdong', 广东: 'Guangdong', gd: 'Guangdong',
  guangxi: 'Guangxi', 广西: 'Guangxi', gx: 'Guangxi',
  hainan: 'Hainan', 海南: 'Hainan', hi: 'Hainan',
  sichuan: 'Sichuan', 四川: 'Sichuan', sc: 'Sichuan',
  guizhou: 'Guizhou', 贵州: 'Guizhou', gz: 'Guizhou',
  yunnan: 'Yunnan', 云南: 'Yunnan', yn: 'Yunnan',
  xizang: 'Tibet', tibet: 'Tibet', 西藏: 'Tibet', xz: 'Tibet',
  shaanxi: 'Shaanxi', 陕西: 'Shaanxi', sn: 'Shaanxi',
  gansu: 'Gansu', 甘肃: 'Gansu', gs: 'Gansu',
  qinghai: 'Qinghai', 青海: 'Qinghai', qh: 'Qinghai',
  ningxia: 'Ningxia', 宁夏: 'Ningxia', nx: 'Ningxia',
  xinjiang: 'Xinjiang', 新疆: 'Xinjiang', xj: 'Xinjiang',
  'hong kong': 'Hong Kong', hongkong: 'Hong Kong', 香港: 'Hong Kong', hk: 'Hong Kong',
  macao: 'Macao', macau: 'Macao', 澳门: 'Macao', mo: 'Macao',
  taiwan: 'Taiwan', 台湾: 'Taiwan', tw: 'Taiwan',
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

function titleCaseEnglish(text) {
  return String(text || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function normalizeChinaProvince(region, regionCode) {
  const raw = String(region || '').trim();
  const codeKey = String(regionCode || '').toLowerCase();
  if (CN_PROVINCE_BY_KEY[codeKey]) return CN_PROVINCE_BY_KEY[codeKey];

  // Direct Chinese lookup
  const zhBase = raw
    .replace(/(壮族|回族|维吾尔)?自治区$/, '')
    .replace(/特别行政区$/, '')
    .replace(/省$/, '')
    .replace(/市$/, '')
    .trim();
  if (CN_PROVINCE_BY_KEY[zhBase]) return CN_PROVINCE_BY_KEY[zhBase];

  const key = normalizeKey(raw);
  if (CN_PROVINCE_BY_KEY[key]) return CN_PROVINCE_BY_KEY[key];

  // Strip English suffixes like "Yunnan Province" / "Shandong Sheng"
  const cleaned = titleCaseEnglish(
    raw
      .replace(/\b(sheng|province|shi|zizhiqu|autonomous region|municipality)\b/gi, '')
      .replace(/[^A-Za-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
  if (cleaned && CN_PROVINCE_BY_KEY[cleaned.toLowerCase()]) {
    return CN_PROVINCE_BY_KEY[cleaned.toLowerCase()];
  }
  return cleaned || raw || null;
}

function normalizeUsState(region, regionCode) {
  const code = String(regionCode || '').toUpperCase();
  if (US_STATE_BY_CODE[code]) return US_STATE_BY_CODE[code];
  const raw = String(region || '').trim();
  if (/^[A-Za-z]{2}$/.test(raw) && US_STATE_BY_CODE[raw.toUpperCase()]) {
    return US_STATE_BY_CODE[raw.toUpperCase()];
  }
  return titleCaseEnglish(raw) || null;
}

/**
 * Province/state-level label in English only (no city).
 * CN → "Yunnan, China" ; US → "California, United States"
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
    countryLabel = 'China';
  } else if (isUS) {
    province = normalizeUsState(region, regionCode);
    countryLabel = 'United States';
  } else if (countryLabel === '中国') {
    countryLabel = 'China';
  } else if (countryLabel === '美国') {
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

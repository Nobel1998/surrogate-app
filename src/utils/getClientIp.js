/**
 * Best-effort public IP + province/state-level region for admin review.
 * Display in English: China province / US state (not city).
 * e.g. "Yunnan, China" / "California, United States"
 *
 * Note: Global geo DBs (ipwho etc.) are often wrong for China IPs.
 * Prefer ipinfo / pconline for CN, and never trust a single flaky source alone when better ones exist.
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

  const zhBase = raw
    .replace(/(壮族|回族|维吾尔)?自治区$/, '')
    .replace(/特别行政区$/, '')
    .replace(/省$/, '')
    .replace(/市$/, '')
    .trim();
  if (CN_PROVINCE_BY_KEY[zhBase]) return CN_PROVINCE_BY_KEY[zhBase];

  const key = normalizeKey(raw);
  if (CN_PROVINCE_BY_KEY[key]) return CN_PROVINCE_BY_KEY[key];

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

function looksLikeChinaLabel(label) {
  return /,\s*China$/i.test(String(label || ''));
}

async function lookupFromIpInfo(ip) {
  const res = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/json`, {
    signal: withTimeout(4500),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || data.bogon || data.error) return null;
  return formatProvinceState({
    region: data.region,
    country: data.country === 'CN' ? 'China' : data.country,
    countryCode: data.country,
  });
}

async function lookupFromPconline(ip) {
  const res = await fetch(
    `https://whois.pconline.com.cn/ipJson.jsp?ip=${encodeURIComponent(ip)}&json=true`,
    { signal: withTimeout(5000) }
  );
  if (!res.ok) return null;
  const text = (await res.text()).replace(/^\uFEFF/, '').trim();
  // Response may be UTF-8 or GBK; if Chinese chars look fine, parse JSON
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  const pro = String(data.pro || '').trim();
  if (!pro || data.err) return null;
  // Reject mojibake (no CJK and no latin province token)
  if (!/[\u4e00-\u9fffA-Za-z]/.test(pro)) return null;
  return formatProvinceState({
    region: pro,
    country: 'China',
    countryCode: 'CN',
  });
}

async function lookupFromIpSb(ip) {
  const res = await fetch(`https://api.ip.sb/geoip/${encodeURIComponent(ip)}`, {
    signal: withTimeout(4500),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return formatProvinceState({
    region: data.region || data.region_name,
    country: data.country || data.country_code,
    countryCode: data.country_code,
  });
}

/**
 * zxinc (纯真/国内库) — far more accurate for China IPv6 than global DBs.
 * Example: country "中国\t云南省" → Yunnan, China
 */
async function lookupFromZxinc(ip) {
  const res = await fetch(
    `https://ip.zxinc.org/api.php?type=json&ip=${encodeURIComponent(ip)}`,
    { signal: withTimeout(5000), headers: { Accept: 'application/json' } }
  );
  if (!res.ok) return null;
  const payload = await res.json();
  if (payload?.code !== 0 || !payload?.data) return null;
  const data = payload.data;
  const candidates = [data.country, data.location, data.local]
    .map((v) => String(v || '').trim())
    .filter(Boolean);
  for (const raw of candidates) {
    // Prefer "中国\t云南省" / "中国 云南省 …"
    const parts = raw.split(/[\t]+/).map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      const token = part
        .replace(/中国联通|中国电信|中国移动|联通|电信|移动|无线基站网络.*$/g, '')
        .trim()
        .split(/\s+/)[0];
      if (!token || token === '中国' || token === 'China') continue;
      const labeled = formatProvinceState({
        region: token,
        country: 'China',
        countryCode: 'CN',
      });
      if (labeled && labeled !== 'China' && looksLikeChinaLabel(labeled)) {
        return labeled;
      }
    }
    const m = raw.match(
      /(?:中国|China)[\t\s]+([^\t\s,]+(?:省|市|自治区)?|内蒙古|广西|西藏|宁夏|新疆|香港|澳门)/i
    );
    if (m?.[1]) {
      const labeled = formatProvinceState({
        region: m[1],
        country: 'China',
        countryCode: 'CN',
      });
      if (labeled && labeled !== 'China') return labeled;
    }
  }
  return null;
}

async function lookupFromIpWho(ip) {
  const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
    signal: withTimeout(4500),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data?.success === false) return null;
  return formatProvinceState({
    region: data.region,
    regionCode: data.region_code,
    country: data.country,
    countryCode: data.country_code,
  });
}

function isIPv6(ip) {
  return String(ip || '').includes(':');
}

function provinceKey(label) {
  const s = String(label || '');
  const m = s.match(/^(.+),\s*(China|United States)$/i);
  return (m ? m[1] : s).trim().toLowerCase();
}

/**
 * Prefer a province that at least 2 sources agree on.
 * If all disagree (common for China IPv6), return null rather than a wrong guess.
 */
function pickByMajority(sourceLabels) {
  const votes = new Map();
  for (const row of sourceLabels) {
    if (!row?.region) continue;
    const key = provinceKey(row.region);
    if (!key || key === 'china' || key === 'united states') continue;
    const entry = votes.get(key) || { count: 0, label: row.region, sources: [] };
    entry.count += 1;
    entry.sources.push(row.src);
    votes.set(key, entry);
  }
  let best = null;
  for (const entry of votes.values()) {
    if (!best || entry.count > best.count) best = entry;
  }
  if (best && best.count >= 2) {
    return { label: best.label, via: `majority_${best.count}`, sources: best.sources };
  }
  if (best && best.count === 1 && sourceLabels.filter((r) => r?.region).length === 1) {
    // Only one source answered — accept for IPv4; reject lone guess for IPv6
    return null;
  }
  return null;
}

/**
 * Resolve province/state for an IP.
 * China: prefer zxinc (accurate IPv6 provinces) + pconline (IPv4).
 * Global DBs alone often mislabel CN IPv6 (Shanghai/Heilongjiang/Beijing).
 */
async function lookupGeoByIp(ip) {
  if (!ip) return null;

  const results = [];
  const sourceLabels = [];
  const v6 = isIPv6(ip);

  const settled = await Promise.allSettled([
    lookupFromZxinc(ip).then((v) => ({ src: 'zxinc', v })),
    lookupFromPconline(ip).then((v) => ({ src: 'pconline', v })),
    lookupFromIpInfo(ip).then((v) => ({ src: 'ipinfo', v })),
    lookupFromIpSb(ip).then((v) => ({ src: 'ipsb', v })),
  ]);
  for (const s of settled) {
    if (s.status === 'fulfilled' && s.value?.v) {
      results.push(s.value.v);
      sourceLabels.push({ src: s.value.src, region: s.value.v });
    } else if (s.status === 'fulfilled') {
      sourceLabels.push({ src: s.value?.src, region: null });
    } else {
      sourceLabels.push({ src: 'unknown', error: String(s.reason?.message || s.reason || 'rejected') });
    }
  }

  let chosen = null;
  let chosenVia = 'none';

  // zxinc first for any China province hit (verified accurate for this Unicom IPv6 → Yunnan)
  const zxinc = sourceLabels.find((r) => r.src === 'zxinc' && r.region);
  if (zxinc?.region) {
    chosen = zxinc.region;
    chosenVia = 'zxinc';
  } else if (!v6) {
    const pconline = sourceLabels.find((r) => r.src === 'pconline' && r.region);
    if (pconline) {
      chosen = pconline.region;
      chosenVia = 'pconline';
    } else {
      const maj = pickByMajority(sourceLabels);
      if (maj) {
        chosen = maj.label;
        chosenVia = maj.via;
      } else {
        const chinaHit = results.find((r) => looksLikeChinaLabel(r) && !/^China$/i.test(r));
        chosen = chinaHit || results[0] || null;
        chosenVia = chinaHit ? 'first_china_hit' : results[0] ? 'first_result' : 'none';
      }
    }
  } else {
    // IPv6 without zxinc: only accept majority of non-zxinc sources (still often wrong)
    const maj = pickByMajority(sourceLabels.filter((r) => r.src !== 'zxinc'));
    if (maj) {
      chosen = maj.label;
      chosenVia = maj.via;
    } else {
      chosenVia = 'ipv6_no_majority';
    }
  }

  if (!chosen && !v6) {
    try {
      const who = await lookupFromIpWho(ip);
      if (who) {
        chosen = who;
        chosenVia = 'ipwho_fallback';
        sourceLabels.push({ src: 'ipwho', region: who });
      }
    } catch {
      // ignore
    }
  }

  return chosen;
}

async function detectPublicIp() {
  // Prefer IPv4 — China province DBs are unreliable / conflicting for IPv6
  const v4Candidates = [
    async () => {
      const res = await fetch('https://api.ipify.org?format=json', { signal: withTimeout(4000) });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.ip && !String(data.ip).includes(':') ? String(data.ip).trim() : null;
    },
    async () => {
      const res = await fetch('https://ipv4.icanhazip.com', { signal: withTimeout(4000) });
      if (!res.ok) return null;
      const text = (await res.text()).trim();
      return text && !text.includes(':') ? text : null;
    },
    async () => {
      const res = await fetch('https://v4.ident.me', { signal: withTimeout(4000) });
      if (!res.ok) return null;
      const text = (await res.text()).trim();
      return text && !text.includes(':') ? text : null;
    },
  ];

  for (const get of v4Candidates) {
    try {
      const ip = await get();
      if (ip) return ip;
    } catch {
      // try next
    }
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
  // Always detect IP first, then resolve region with CN-accurate sources.
  // Do NOT use ipwho's self-geo as primary — it frequently mislabels China provinces.
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

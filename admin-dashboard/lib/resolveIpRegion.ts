/**
 * Resolve IP to province/state-level region for admin display (English).
 * Prefer China-accurate sources for IPv4; require majority for IPv6
 * (single sources often disagree: Shanghai vs Heilongjiang vs Beijing).
 */

const US_STATE_BY_CODE: Record<string, string> = {
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

const CN_PROVINCE_BY_KEY: Record<string, string> = {
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

function normalizeKey(text: string) {
  return String(text || '')
    .toLowerCase()
    .replace(/[省市区县壮族回族维吾尔自治区特别行政]/g, '')
    .replace(/\b(sheng|province|shi|zizhiqu|autonomous region|municipality)\b/gi, '')
    .replace(/[^a-z0-9\u4e00-\u9fff\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCaseEnglish(text: string) {
  return String(text || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function normalizeChinaProvince(region?: string | null, regionCode?: string | null) {
  const raw = String(region || '').trim();
  const codeKey = String(regionCode || '').toLowerCase();
  if (CN_PROVINCE_BY_KEY[codeKey]) return CN_PROVINCE_BY_KEY[codeKey];

  // First segment only — drop city/district if present (e.g. "云南/昆明")
  const firstSeg = raw.split(/[\/|,，、\t]/)[0].trim();
  const zhBase = firstSeg
    .replace(/(壮族|回族|维吾尔)?自治区$/, '')
    .replace(/特别行政区$/, '')
    .replace(/省$/, '')
    .replace(/市$/, '')
    .trim();
  if (CN_PROVINCE_BY_KEY[zhBase]) return CN_PROVINCE_BY_KEY[zhBase];

  const key = normalizeKey(firstSeg);
  if (CN_PROVINCE_BY_KEY[key]) return CN_PROVINCE_BY_KEY[key];

  const cleaned = titleCaseEnglish(
    firstSeg
      .replace(/\b(sheng|province|shi|zizhiqu|autonomous region|municipality)\b/gi, '')
      .replace(/[^A-Za-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
  if (cleaned && CN_PROVINCE_BY_KEY[cleaned.toLowerCase()]) {
    return CN_PROVINCE_BY_KEY[cleaned.toLowerCase()];
  }
  // Province-level only: never pass through city names or raw Chinese
  return null;
}

function normalizeUsState(region?: string | null, regionCode?: string | null) {
  const code = String(regionCode || '').toUpperCase();
  if (US_STATE_BY_CODE[code]) return US_STATE_BY_CODE[code];
  const raw = String(region || '').trim().split(/[\/|,]/)[0].trim();
  if (/^[A-Za-z]{2}$/.test(raw) && US_STATE_BY_CODE[raw.toUpperCase()]) {
    return US_STATE_BY_CODE[raw.toUpperCase()];
  }
  const titled = titleCaseEnglish(raw.replace(/[^A-Za-z\s]/g, ' '));
  return titled || null;
}

function englishOnlyLabel(label: string | null) {
  const s = String(label || '').trim();
  if (!s) return null;
  if (/[\u4e00-\u9fff]/.test(s)) return null;
  return s;
}

export function formatProvinceState(input: {
  region?: string | null;
  regionCode?: string | null;
  country?: string | null;
  countryCode?: string | null;
}): string | null {
  const cc = String(input.countryCode || '').toUpperCase();
  const countryName = String(input.country || '').trim();
  const isCN =
    cc === 'CN' ||
    /^china$/i.test(countryName) ||
    countryName === '中国' ||
    /中国|China/i.test(String(input.region || ''));
  const isUS = cc === 'US' || /^united states/i.test(countryName) || countryName === '美国';

  let province: string | null = null;
  let countryLabel: string | null = null;

  if (isCN) {
    province = normalizeChinaProvince(input.region, input.regionCode);
    countryLabel = 'China';
  } else if (isUS) {
    province = normalizeUsState(input.region, input.regionCode);
    countryLabel = 'United States';
  } else {
    countryLabel =
      countryName === '中国'
        ? 'China'
        : countryName === '美国'
          ? 'United States'
          : titleCaseEnglish(String(countryName || cc).replace(/[^A-Za-z\s]/g, ' ')) || null;
    province =
      normalizeChinaProvince(input.region, input.regionCode) ||
      normalizeUsState(input.region, input.regionCode);
  }

  let out: string | null = null;
  if (province && countryLabel) {
    out =
      province.toLowerCase() === countryLabel.toLowerCase()
        ? countryLabel
        : `${province}, ${countryLabel}`;
  } else {
    out = province || countryLabel || null;
  }
  return englishOnlyLabel(out);
}

/** Re-normalize stored labels to English province/state for admin UI. */
export function toEnglishProvinceLabel(stored: string | null | undefined): string | null {
  const raw = String(stored || '').trim();
  if (!raw || raw === 'N/A') return null;
  if (/^china$/i.test(raw)) return 'China';
  if (/^united states$/i.test(raw)) return 'United States';

  const m = raw.match(/^(.+?)\s*,\s*(.+)$/);
  if (m) {
    return formatProvinceState({
      region: m[1],
      country: m[2],
      countryCode: /china|中国/i.test(m[2]) ? 'CN' : /united states|美国/i.test(m[2]) ? 'US' : null,
    });
  }
  return (
    formatProvinceState({ region: raw, country: 'China', countryCode: 'CN' }) ||
    formatProvinceState({ region: raw, country: 'United States', countryCode: 'US' }) ||
    englishOnlyLabel(raw)
  );
}

function looksLikeChinaLabel(label: string) {
  return /,\s*China$/i.test(label);
}

function isIPv6(ip: string) {
  return ip.includes(':');
}

function provinceKey(label: string) {
  const m = label.match(/^(.+),\s*(China|United States)$/i);
  return (m ? m[1] : label).trim().toLowerCase();
}

function pickByMajority(
  sourceLabels: Array<{ src?: string; region?: string | null }>
): { label: string; via: string } | null {
  const votes = new Map<string, { count: number; label: string }>();
  for (const row of sourceLabels) {
    if (!row?.region) continue;
    const key = provinceKey(row.region);
    if (!key || key === 'china' || key === 'united states') continue;
    const entry = votes.get(key) || { count: 0, label: row.region };
    entry.count += 1;
    votes.set(key, entry);
  }
  let best: { count: number; label: string } | null = null;
  for (const entry of votes.values()) {
    if (!best || entry.count > best.count) best = entry;
  }
  if (best && best.count >= 2) return { label: best.label, via: `majority_${best.count}` };
  return null;
}

async function lookupFromIpInfo(ip: string) {
  const res = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/json`, {
    signal: AbortSignal.timeout(8000),
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

async function lookupFromPconline(ip: string) {
  // pconline is IPv4-oriented; skip obvious IPv6 to avoid wrong empty results
  if (isIPv6(ip)) return null;
  const res = await fetch(
    `https://whois.pconline.com.cn/ipJson.jsp?ip=${encodeURIComponent(ip)}&json=true`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) return null;
  const text = (await res.text()).replace(/^\uFEFF/, '').trim();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  const pro = String(data.pro || '').trim();
  if (!pro || data.err) return null;
  if (!/[\u4e00-\u9fffA-Za-z]/.test(pro)) return null;
  return formatProvinceState({
    region: pro,
    country: 'China',
    countryCode: 'CN',
  });
}

async function lookupFromIpSb(ip: string) {
  const res = await fetch(`https://api.ip.sb/geoip/${encodeURIComponent(ip)}`, {
    signal: AbortSignal.timeout(8000),
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

/** Domestic zxinc DB — accurate China provinces (IPv4/IPv6). */
async function lookupFromZxinc(ip: string) {
  const res = await fetch(
    `https://ip.zxinc.org/api.php?type=json&ip=${encodeURIComponent(ip)}`,
    { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' } }
  );
  if (!res.ok) return null;
  const payload = await res.json();
  if (payload?.code !== 0 || !payload?.data) return null;
  const data = payload.data;
  const candidates = [data.country, data.location, data.local]
    .map((v: unknown) => String(v || '').trim())
    .filter(Boolean);
  for (const raw of candidates) {
    // IPv4 often uses en-dash: "中国–云南–昆明" (province then city)
    const parts = raw
      .replace(/[–—−]/g, '\t')
      .split(/[\t\/|,，]+/)
      .map((p: string) => p.trim())
      .filter(Boolean);
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
      /(?:中国|China)[\t\s–—−\-]+([^\t\s,–—−\-\/]+(?:省|市|自治区)?|内蒙古|广西|西藏|宁夏|新疆|香港|澳门)/i
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

async function lookupFromIpWho(ip: string) {
  const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
    signal: AbortSignal.timeout(8000),
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

export type ResolveIpRegionResult = {
  region: string | null;
  confidence: 'high' | 'low' | 'none';
  reason: string;
};

export async function resolveIpRegionDetailed(
  ip: string | null | undefined
): Promise<ResolveIpRegionResult> {
  const raw = String(ip || '').trim();
  if (!raw || raw === 'N/A') return { region: null, confidence: 'none', reason: 'no_ip' };

  const v6 = isIPv6(raw);
  const settled = await Promise.allSettled([
    lookupFromZxinc(raw).then((v) => ({ src: 'zxinc', v })),
    lookupFromPconline(raw).then((v) => ({ src: 'pconline', v })),
    lookupFromIpInfo(raw).then((v) => ({ src: 'ipinfo', v })),
    lookupFromIpSb(raw).then((v) => ({ src: 'ipsb', v })),
  ]);
  const results: string[] = [];
  const sourceLabels: Array<{ src?: string; region?: string | null; error?: string }> = [];
  for (const s of settled) {
    if (s.status === 'fulfilled' && s.value?.v) {
      results.push(s.value.v);
      sourceLabels.push({ src: s.value.src, region: s.value.v });
    } else if (s.status === 'fulfilled') {
      sourceLabels.push({ src: s.value?.src, region: null });
    } else {
      sourceLabels.push({ error: String((s as PromiseRejectedResult).reason) });
    }
  }

  let chosen: string | null = null;
  let reason = 'none';
  let confidence: 'high' | 'low' | 'none' = 'none';

  const zxinc = sourceLabels.find((r) => r.src === 'zxinc' && r.region);
  if (zxinc?.region) {
    chosen = zxinc.region;
    reason = 'zxinc';
    confidence = 'high';
  } else if (v6) {
    const maj = pickByMajority(sourceLabels.filter((r) => r.src !== 'zxinc'));
    if (maj) {
      chosen = maj.label;
      reason = maj.via;
      confidence = 'high';
    } else {
      reason = 'ipv6_no_majority';
      confidence = 'none';
    }
  } else {
    const pconline = sourceLabels.find((r) => r.src === 'pconline' && r.region);
    if (pconline?.region) {
      chosen = pconline.region;
      reason = 'pconline';
      confidence = 'high';
    } else {
      const maj = pickByMajority(sourceLabels);
      if (maj) {
        chosen = maj.label;
        reason = maj.via;
        confidence = 'high';
      } else {
        // Never take ipinfo first when sources disagree (Unicom backbone → false Shanghai).
        // Prefer ipsb for CN; otherwise only accept a single unanimous China province.
        const ipsb = sourceLabels.find(
          (r) => r.src === 'ipsb' && r.region && looksLikeChinaLabel(r.region) && !/^China$/i.test(r.region!)
        );
        if (ipsb?.region) {
          chosen = ipsb.region;
          reason = 'ipsb_cn';
          confidence = 'high';
        } else {
          const chinaProvinces = results.filter(
            (r) => looksLikeChinaLabel(r) && !/^China$/i.test(r)
          );
          const distinct = new Set(chinaProvinces.map((r) => provinceKey(r)));
          if (distinct.size === 1) {
            chosen = chinaProvinces[0];
            reason = 'single_china_hit';
            confidence = 'low';
          } else {
            reason = distinct.size > 1 ? 'cn_sources_disagree' : 'none';
            confidence = 'none';
          }
        }
      }
    }
  }

  return { region: chosen, confidence, reason };
}

export async function resolveIpRegion(ip: string | null | undefined): Promise<string | null> {
  const detailed = await resolveIpRegionDetailed(ip);
  return detailed.region;
}

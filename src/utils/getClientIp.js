/**
 * Best-effort public IP + approximate region for admin review.
 * Not security-critical; soft-fails to nulls.
 */

function withTimeout(ms) {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

function formatRegion({ city, region, regionName, country, country_name, countryCode }) {
  const parts = [
    city,
    regionName || region,
    country_name || country || countryCode,
  ]
    .map((p) => String(p || '').trim())
    .filter(Boolean);
  // Dedupe adjacent duplicates (e.g. region === city)
  const deduped = [];
  for (const p of parts) {
    if (!deduped.length || deduped[deduped.length - 1].toLowerCase() !== p.toLowerCase()) {
      deduped.push(p);
    }
  }
  return deduped.join(', ') || null;
}

async function lookupGeoByIp(ip) {
  if (!ip) return null;

  try {
    const res = await fetch(`https://get.geojs.io/v1/ip/geo/${encodeURIComponent(ip)}.json`, {
      signal: withTimeout(4500),
    });
    if (res.ok) {
      const data = await res.json();
      return formatRegion({
        city: data.city,
        region: data.region,
        country: data.country,
        countryCode: data.country_code,
      });
    }
  } catch {
    // try fallback
  }

  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: withTimeout(4500),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.success !== false) {
        return formatRegion({
          city: data.city,
          region: data.region,
          country: data.country,
          countryCode: data.country_code,
        });
      }
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
  // Prefer geo endpoint that also returns the caller IP
  try {
    const res = await fetch('https://get.geojs.io/v1/ip/geo.json', {
      signal: withTimeout(4500),
    });
    if (res.ok) {
      const data = await res.json();
      const ip = data?.ip ? String(data.ip).trim() : null;
      const region = formatRegion({
        city: data.city,
        region: data.region,
        country: data.country,
        countryCode: data.country_code,
      });
      if (ip || region) {
        return { ip, region: region || (ip ? await lookupGeoByIp(ip) : null) };
      }
    }
  } catch {
    // fallback path below
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

/** Resolve region label for a known IP (admin backfill / display). */
export async function resolveIpRegion(ip) {
  return lookupGeoByIp(ip);
}

export default getClientIp;

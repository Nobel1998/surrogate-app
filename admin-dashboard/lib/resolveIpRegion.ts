/**
 * Resolve approximate IP region for admin display (city, region, country).
 */

function formatRegion(parts: Array<string | null | undefined>): string | null {
  const cleaned = parts
    .map((p) => String(p || '').trim())
    .filter(Boolean);
  const deduped: string[] = [];
  for (const p of cleaned) {
    if (!deduped.length || deduped[deduped.length - 1].toLowerCase() !== p.toLowerCase()) {
      deduped.push(p);
    }
  }
  return deduped.join(', ') || null;
}

export async function resolveIpRegion(ip: string | null | undefined): Promise<string | null> {
  const raw = String(ip || '').trim();
  if (!raw || raw === 'N/A') return null;

  try {
    const res = await fetch(`https://get.geojs.io/v1/ip/geo/${encodeURIComponent(raw)}.json`, {
      signal: AbortSignal.timeout(4500),
    });
    if (res.ok) {
      const data = await res.json();
      return formatRegion([data.city, data.region, data.country || data.country_code]);
    }
  } catch {
    // fallback
  }

  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(raw)}`, {
      signal: AbortSignal.timeout(4500),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.success !== false) {
        return formatRegion([data.city, data.region, data.country || data.country_code]);
      }
    }
  } catch {
    // ignore
  }

  return null;
}

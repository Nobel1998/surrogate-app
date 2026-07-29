/**
 * Best-effort public IP for the current device.
 * Used at Sign Up / application submit for admin review (not security-critical).
 */
export async function getClientIp() {
  const controllers = [];
  const withTimeout = (ms) => {
    const c = new AbortController();
    controllers.push(c);
    setTimeout(() => c.abort(), ms);
    return c.signal;
  };

  try {
    const res = await fetch('https://api.ipify.org?format=json', {
      signal: withTimeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.ip && typeof data.ip === 'string') return data.ip.trim();
    }
  } catch {
    // try fallback
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

export default getClientIp;

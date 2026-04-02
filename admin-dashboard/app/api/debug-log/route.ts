export const runtime = 'nodejs';

import { appendFile } from 'fs/promises';
import path from 'path';

const LOG_PATH = '/Users/wangxinheng/Desktop/代孕app/.cursor/debug-c24916.log';
const ENDPOINT = 'http://127.0.0.1:7242/ingest/ae0d1be9-2477-4454-828d-6c03ee3b2577';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = { ...body, sessionId: 'c24916' };

    // Try network ingest
    try {
      await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': 'c24916',
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      // ignore network failure
    }

    // Also append locally to keep evidence
    try {
      const line = JSON.stringify(payload) + '\n';
      await appendFile(path.join(LOG_PATH), line, { encoding: 'utf8' });
    } catch (e) {
      // ignore fs failure
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: String(error) }), { status: 500 });
  }
}

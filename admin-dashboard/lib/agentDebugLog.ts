// #region agent log
/**
 * Temporary debug channel. A deployed https page cannot POST to the local ingest
 * server, so every entry is also mirrored to the console (browser DevTools) and,
 * on the server, to the platform runtime logs.
 */
const AGENT_DEBUG_ENDPOINT = 'http://127.0.0.1:7292/ingest/ae0d1be9-2477-4454-828d-6c03ee3b2577';

export function agentDebugLog(payload: {
  hypothesisId?: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
}) {
  const entry = {
    sessionId: '5244e3',
    runId: 'pre-fix',
    timestamp: Date.now(),
    ...payload,
  };

  try {
    console.error('[agent log]', JSON.stringify(entry));
  } catch {
    console.error('[agent log]', entry);
  }

  fetch(AGENT_DEBUG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '5244e3' },
    body: JSON.stringify(entry),
  }).catch(() => {});
}
// #endregion

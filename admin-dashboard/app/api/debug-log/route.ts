export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await fetch('http://127.0.0.1:7242/ingest/ae0d1be9-2477-4454-828d-6c03ee3b2577', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': 'c24916',
      },
      body: JSON.stringify({
        ...body,
        sessionId: 'c24916',
      }),
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: String(error) }), { status: 500 });
  }
}

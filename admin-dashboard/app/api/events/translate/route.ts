import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const translateApiKey = process.env.TRANSLATE_API_KEY || '';
const translateApiUrl = process.env.TRANSLATE_API_URL || 'https://api-free.deepl.com/v2/translate';

export const dynamic = 'force-dynamic';

const requestTimestamps = new Map<string, number>();
const MIN_TRANSLATE_INTERVAL_MS = 30_000;

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
};

function getRateLimitKey(eventId: string) {
  return `event:${eventId}`;
}

function isRateLimited(key: string) {
  const now = Date.now();
  const previous = requestTimestamps.get(key);
  if (previous && now - previous < MIN_TRANSLATE_INTERVAL_MS) {
    return true;
  }
  requestTimestamps.set(key, now);
  return false;
}

async function deeplTranslate(text: string, targetLang: 'ZH' | 'ES'): Promise<string> {
  const payload = new URLSearchParams();
  payload.append('text', text);
  payload.append('source_lang', 'EN');
  payload.append('target_lang', targetLang);

  const resp = await fetch(translateApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `DeepL-Auth-Key ${translateApiKey}`,
    },
    body: payload.toString(),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Translate API failed (${resp.status}): ${body}`);
  }

  const data = await resp.json();
  const translated = data?.translations?.[0]?.text;
  if (!translated || typeof translated !== 'string') {
    throw new Error('Translate API returned invalid response.');
  }
  return translated;
}

async function translateField(value: string | null, targetLang: 'ZH' | 'ES') {
  const normalized = (value || '').trim();
  if (!normalized) return null;
  return deeplTranslate(normalized, targetLang);
}

export async function POST(req: NextRequest) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }
  if (!translateApiKey) {
    return NextResponse.json({ error: 'Missing TRANSLATE_API_KEY' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let eventId = '';
  try {
    const body = await req.json();
    eventId = String(body?.eventId || '').trim();
    const force = Boolean(body?.force);

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    const key = getRateLimitKey(eventId);
    if (!force && isRateLimited(key)) {
      return NextResponse.json(
        { error: 'Translation requested too frequently. Please retry shortly.' },
        { status: 429 },
      );
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, description, content')
      .eq('id', eventId)
      .single<EventRow>();

    if (eventError || !event) {
      return NextResponse.json({ error: eventError?.message || 'Event not found' }, { status: 404 });
    }

    if (!event.title?.trim()) {
      return NextResponse.json({ error: 'Event title is required for translation' }, { status: 400 });
    }

    const [{ titleZh, descriptionZh, contentZh }, { titleEs, descriptionEs, contentEs }] = await Promise.all([
      (async () => ({
        titleZh: await deeplTranslate(event.title, 'ZH'),
        descriptionZh: await translateField(event.description, 'ZH'),
        contentZh: await translateField(event.content, 'ZH'),
      }))(),
      (async () => ({
        titleEs: await deeplTranslate(event.title, 'ES'),
        descriptionEs: await translateField(event.description, 'ES'),
        contentEs: await translateField(event.content, 'ES'),
      }))(),
    ]);

    const { error: updateError } = await supabase
      .from('events')
      .update({
        title_zh: titleZh,
        description_zh: descriptionZh,
        content_zh: contentZh,
        title_es: titleEs,
        description_es: descriptionEs,
        content_es: contentEs,
        translation_status: 'done',
        translation_updated_at: new Date().toISOString(),
      })
      .eq('id', eventId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      eventId,
      translationStatus: 'done',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Translation failed';
    console.error('[events/translate] Error:', message);

    if (eventId) {
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      await supabase
        .from('events')
        .update({
          translation_status: 'failed',
          translation_updated_at: new Date().toISOString(),
        })
        .eq('id', eventId);
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

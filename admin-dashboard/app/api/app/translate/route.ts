import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const translateApiKey = process.env.TRANSLATE_API_KEY || '';
const translateApiUrl = process.env.TRANSLATE_API_URL || 'https://api-free.deepl.com/v2/translate';

export const dynamic = 'force-dynamic';

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function getAuthedUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return { error: jsonError('Missing Authorization bearer token', 401) };

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return { error: jsonError('Invalid or expired session', 401) };
  }
  return { user: data.user };
}

function normalizeTargetLang(language: string): 'ZH' | 'ES' | 'EN' | null {
  const value = String(language || '').toLowerCase();
  if (value.startsWith('zh')) return 'ZH';
  if (value.startsWith('es')) return 'ES';
  if (value.startsWith('en')) return 'EN';
  return null;
}

async function deeplTranslate(text: string, targetLang: 'ZH' | 'ES' | 'EN'): Promise<string> {
  const body = new URLSearchParams();
  body.append('text', text);
  // Auto-detect source so ZH→EN and EN→ZH both work.
  body.append('target_lang', targetLang);

  const resp = await fetch(translateApiUrl, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${translateApiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`DeepL request failed (${resp.status}): ${errText || 'unknown error'}`);
  }

  const data = await resp.json().catch(() => null);
  const translated = data?.translations?.[0]?.text;
  if (!translated || typeof translated !== 'string') {
    throw new Error('Invalid DeepL response');
  }
  return translated;
}

export async function POST(req: NextRequest) {
  if (!supabaseUrl || !serviceKey) {
    return jsonError('Missing Supabase env vars', 500);
  }

  const auth = await getAuthedUser(req);
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const text = String(body?.text || '').trim();
  const target = normalizeTargetLang(String(body?.targetLanguage || ''));

  if (!text) return jsonError('text is required', 400);
  if (!target) {
    return NextResponse.json({ translatedText: text, translated: false, reason: 'unsupported-target' });
  }

  if (!translateApiKey) {
    return jsonError('Missing TRANSLATE_API_KEY', 500);
  }

  try {
    const translatedText = await deeplTranslate(text, target);
    return NextResponse.json({ translatedText, translated: true });
  } catch (error: any) {
    console.error('[app/translate] error:', error?.message || error);
    return jsonError(error?.message || 'DeepL translate failed', 500);
  }
}

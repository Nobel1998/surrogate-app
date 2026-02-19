import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const STORAGE_BUCKET = 'documents';
const DOCUMENT_TYPE = 'benefit_package';
const STORAGE_PATH = 'benefit-package/benefit-package.pdf';

function getPublicUrl(path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

export const dynamic = 'force-dynamic';

/** GET: Return current Benefit Package PDF URL for admin UI */
export async function GET() {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase env vars' },
      { status: 500 }
    );
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase
    .from('global_documents')
    .select('file_url, updated_at')
    .eq('document_type', DOCUMENT_TYPE)
    .maybeSingle();
  if (error) {
    console.error('[benefit-package] GET error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json(data || { file_url: null, updated_at: null });
}

/** POST: Upload new Benefit Package PDF (replace existing) */
export async function POST(req: NextRequest) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase env vars' },
      { status: 500 }
    );
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    const validTypes = ['application/pdf'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF is allowed.' },
        { status: 400 }
      );
    }
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 20MB.' },
        { status: 400 }
      );
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(STORAGE_PATH, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });
    if (uploadError) {
      console.error('[benefit-package] upload error:', uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }
    const file_url = getPublicUrl(STORAGE_PATH);
    const { error: upsertError } = await supabase
      .from('global_documents')
      .upsert(
        {
          document_type: DOCUMENT_TYPE,
          file_url,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'document_type' }
      );
    if (upsertError) {
      console.error('[benefit-package] upsert error:', upsertError);
      return NextResponse.json(
        { error: `Save failed: ${upsertError.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      file_url,
    });
  } catch (err: any) {
    console.error('[benefit-package] error:', err);
    return NextResponse.json(
      { error: err.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

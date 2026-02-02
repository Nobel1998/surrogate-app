import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const STORAGE_BUCKET = 'documents';

export const dynamic = 'force-dynamic';

function buildPublicUrl(path: string) {
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

/** GET: fetch current global document by type (for admin UI) */
export async function GET(req: Request) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { searchParams } = new URL(req.url);
  const documentType = searchParams.get('document_type') || 'benefit_package';

  try {
    const { data, error } = await supabase
      .from('global_documents')
      .select('document_type, file_url, file_name, updated_at')
      .eq('document_type', documentType)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json(data || null);
  } catch (err: unknown) {
    console.error('[global-documents] GET error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch global document' },
      { status: 500 }
    );
  }
}

/** POST: upload/upsert a global document (e.g. Benefit Package PDF) */
export async function POST(req: Request) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const documentType = (formData.get('document_type') as string) || 'benefit_package';

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
    const allowedExtensions = ['.pdf'];
    if (ext && !allowedExtensions.includes(ext.toLowerCase())) {
      return NextResponse.json(
        { error: 'Only PDF files are allowed for Benefit Package.' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).slice(2);
    const path = `global/${documentType}-${timestamp}-${randomStr}${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        contentType: file.type || 'application/pdf',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const publicUrl = buildPublicUrl(path);

    const { error: upsertError } = await supabase
      .from('global_documents')
      .upsert(
        {
          document_type: documentType,
          file_url: publicUrl,
          file_name: file.name,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'document_type' }
      );

    if (upsertError) throw upsertError;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path,
      document_type: documentType,
      file_name: file.name,
    });
  } catch (err: unknown) {
    console.error('[global-documents] POST error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to upload global document' },
      { status: 500 }
    );
  }
}

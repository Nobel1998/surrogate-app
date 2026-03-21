import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const STORAGE_BUCKET = 'documents';

export const dynamic = 'force-dynamic';

function buildPublicUrl(path: string) {
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

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
    const userId = formData.get('user_id') as string | null;
    const kind = (formData.get('kind') as string | null)?.toLowerCase();

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }
    if (kind !== 'parent' && kind !== 'surrogate') {
      return NextResponse.json(
        { error: 'kind must be "parent" or "surrogate"' },
        { status: 400 }
      );
    }

    const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
    if (!ext || ext.toLowerCase() !== '.pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed for application uploads.' },
        { status: 400 }
      );
    }

    const documentType =
      kind === 'parent' ? 'parent_application_pdf' : 'surrogate_application_pdf';
    const folder = kind === 'parent' ? 'parent' : 'surrogate';

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).slice(2);
    const path = `application-pdf/${folder}/${userId}-${timestamp}-${randomStr}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        contentType: file.type || 'application/pdf',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const publicUrl = buildPublicUrl(path);

    const { error: insertError } = await supabase.from('documents').insert({
      document_type: documentType,
      file_url: publicUrl,
      file_name: file.name,
      user_id: userId,
    });
    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path,
      user_id: userId,
      document_type: documentType,
    });
  } catch (err: any) {
    console.error('[matches/application-pdf] POST error', err);
    return NextResponse.json(
      { error: err.message || 'Failed to upload application PDF' },
      { status: 500 }
    );
  }
}

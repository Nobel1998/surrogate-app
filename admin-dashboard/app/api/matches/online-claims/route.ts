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
    const surrogateId = formData.get('surrogate_id') as string | null;
    const parentId = formData.get('parent_id') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }
    if (!surrogateId || !parentId) {
      return NextResponse.json({ error: 'surrogate_id and parent_id are required' }, { status: 400 });
    }

    // Validate file extension
    const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt'];
    if (ext && !allowedExtensions.includes(ext.toLowerCase())) {
      return NextResponse.json({ error: `File format not supported. Allowed formats: ${allowedExtensions.join(', ')}` }, { status: 400 });
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).slice(2);
    
    const results: any[] = [];

    // Upload file to storage
    const path = `online-claims/${timestamp}-${randomStr}${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const publicUrl = buildPublicUrl(path);

    // Insert documents for both parties (same document, both can see it)
    const { error: insertParentError } = await supabase
      .from('documents')
      .insert({
        document_type: 'online_claims',
        file_url: publicUrl,
        file_name: file.name,
        user_id: parentId,
      });
    if (insertParentError) throw insertParentError;
    results.push({ user_id: parentId, document_type: 'online_claims' });

    const { error: insertSurrogateError } = await supabase
      .from('documents')
      .insert({
        document_type: 'online_claims',
        file_url: publicUrl,
        file_name: file.name,
        user_id: surrogateId,
      });
    if (insertSurrogateError) throw insertSurrogateError;
    results.push({ user_id: surrogateId, document_type: 'online_claims' });

    return NextResponse.json({ success: true, url: publicUrl, path, results });
  } catch (err: any) {
    console.error('[matches/online-claims] POST error', err);
    return NextResponse.json({ error: err.message || 'Failed to upload online claims document' }, { status: 500 });
  }
}

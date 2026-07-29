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
    const parentId = formData.get('parent_id') as string | null;
    const surrogateId = formData.get('surrogate_id') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }
    if (!parentId || !surrogateId) {
      return NextResponse.json({ error: 'parent_id and surrogate_id are required' }, { status: 400 });
    }

    // Validate file extension
    const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'];
    if (ext && !allowedExtensions.includes(ext.toLowerCase())) {
      return NextResponse.json({ error: `File format not supported. Allowed formats: ${allowedExtensions.join(', ')}` }, { status: 400 });
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).slice(2);

    // Upload file to storage once (shared between both parties)
    const path = `trust-account/${timestamp}-${randomStr}${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const publicUrl = buildPublicUrl(path);

    // Insert the same document for both parties so each side sees it in My Match
    const { error: insertError } = await supabase
      .from('documents')
      .insert([
        {
          document_type: 'trust_account',
          file_url: publicUrl,
          file_name: file.name,
          user_id: parentId,
        },
        {
          document_type: 'trust_account',
          file_url: publicUrl,
          file_name: file.name,
          user_id: surrogateId,
        },
      ]);
    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path,
      parent_id: parentId,
      surrogate_id: surrogateId,
    });
  } catch (err: any) {
    console.error('[matches/trust-account] POST error', err);
    return NextResponse.json({ error: err.message || 'Failed to upload trust account document' }, { status: 500 });
  }
}

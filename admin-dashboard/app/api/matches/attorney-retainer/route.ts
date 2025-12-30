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
    const userType = formData.get('user_type') as string | null; // 'parent' or 'surrogate'

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }
    if (!userId || !userType) {
      return NextResponse.json({ error: 'user_id and user_type are required' }, { status: 400 });
    }
    if (userType !== 'parent' && userType !== 'surrogate') {
      return NextResponse.json({ error: 'user_type must be "parent" or "surrogate"' }, { status: 400 });
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
    const path = `attorney-retainer/${timestamp}-${randomStr}${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const publicUrl = buildPublicUrl(path);

    // Insert document for the selected user only
    const { error: insertError } = await supabase
      .from('documents')
      .insert({
        document_type: 'attorney_retainer',
        file_url: publicUrl,
        file_name: file.name,
        user_id: userId,
      });
    if (insertError) throw insertError;
    results.push({ user_id: userId, document_type: 'attorney_retainer', user_type: userType });

    return NextResponse.json({ success: true, url: publicUrl, path, results });
  } catch (err: any) {
    console.error('[matches/attorney-retainer] POST error', err);
    return NextResponse.json({ error: err.message || 'Failed to upload attorney retainer agreement' }, { status: 500 });
  }
}



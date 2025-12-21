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
    const matchId = formData.get('match_id') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }
    if (!matchId) {
      return NextResponse.json({ error: 'match_id is required' }, { status: 400 });
    }

    // Validate file extension - only image formats allowed
    const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    if (ext && !allowedExtensions.includes(ext.toLowerCase())) {
      return NextResponse.json({ error: `File format not supported. Only image formats are allowed: ${allowedExtensions.join(', ')}` }, { status: 400 });
    }

    // Get match details to find surrogate_id and parent_id
    const { data: match, error: matchError } = await supabase
      .from('surrogate_matches')
      .select('surrogate_id, parent_id, first_parent_id, second_parent_id')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).slice(2);
    
    // Upload file to storage - one file for the match
    const path = `photo-release/${matchId}-${timestamp}-${randomStr}${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const publicUrl = buildPublicUrl(path);

    // Insert a single document record associated with the match
    // This file will be visible to all users in the match (surrogate and parents)
    const { error: insertError } = await supabase
      .from('documents')
      .insert({
        document_type: 'photo_release',
        file_url: publicUrl,
        file_name: file.name,
        match_id: matchId,
        // user_id is null - this file is associated with the match, not a specific user
      });
    
    if (insertError) throw insertError;

    return NextResponse.json({ 
      success: true, 
      url: publicUrl, 
      path, 
      match_id: matchId
    });
  } catch (err: any) {
    console.error('[matches/photo-release] POST error', err);
    return NextResponse.json({ error: err.message || 'Failed to upload photo release' }, { status: 500 });
  }
}



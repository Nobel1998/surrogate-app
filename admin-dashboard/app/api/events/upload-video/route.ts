import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

const STORAGE_BUCKET = 'documents';
const MAX_SIZE = 100 * 1024 * 1024; // 100MB
const VALID_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const VALID_EXTS = ['mp4', 'mov', 'webm'];

function getPublicUrl(path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

/**
 * Returns a signed upload URL so the browser uploads the video directly to
 * Supabase Storage (avoids Vercel/Next request body size limits that cause
 * "Uploading..." to hang forever for larger videos).
 */
export async function POST(req: NextRequest) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json().catch(() => null);
    const fileName = typeof body?.file_name === 'string' ? body.file_name.trim() : '';
    const contentType =
      typeof body?.content_type === 'string' ? body.content_type.trim() : '';
    const fileSize = Number(body?.file_size);

    if (!fileName) {
      return NextResponse.json({ error: 'Missing file_name' }, { status: 400 });
    }

    const fileExt = (fileName.split('.').pop() || '').toLowerCase();
    const typeOk = VALID_TYPES.includes(contentType) || VALID_EXTS.includes(fileExt);
    if (!typeOk) {
      return NextResponse.json(
        { error: 'Invalid file type. Only MP4, MOV, WebM are allowed.' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json({ error: 'Missing or invalid file_size' }, { status: 400 });
    }
    if (fileSize > MAX_SIZE) {
      return NextResponse.json({ error: 'File size too large. Max 100MB.' }, { status: 400 });
    }

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const safeExt = VALID_EXTS.includes(fileExt) ? fileExt : 'mp4';
    const storageName = `${timestamp}-${randomString}.${safeExt}`;
    const filePath = `blog/videos/${storageName}`;

    const { data: signed, error: signedError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(filePath, { upsert: false });

    if (signedError || !signed?.signedUrl) {
      console.error('[events/upload-video] Signed URL error:', signedError);
      return NextResponse.json(
        { error: `Failed to create upload URL: ${signedError?.message || 'unknown'}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      path: filePath,
      token: signed.token,
      signedUrl: signed.signedUrl,
      url: getPublicUrl(filePath),
      contentType: contentType || (safeExt === 'mov' ? 'video/quicktime' : `video/${safeExt}`),
    });
  } catch (error: any) {
    console.error('[events/upload-video] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start video upload' },
      { status: 500 }
    );
  }
}

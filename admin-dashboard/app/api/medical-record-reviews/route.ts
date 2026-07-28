import { NextRequest, NextResponse } from 'next/server';
import {
  MEDICAL_RECORD_STORAGE_BUCKET,
  MEDICAL_RECORD_STORAGE_PREFIX,
  buildDocumentsPublicUrl,
  requireMedicalRecordAccess,
} from '@/lib/medicalRecordReviews';

export const dynamic = 'force-dynamic';

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100MB

async function runReviewsQueryWithRetry(run: () => Promise<{ data: any; error: any }>) {
  const first = await run();
  if (!first.error) return first;

  const msg = String(first.error?.message || '').toLowerCase();
  const code = String(first.error?.code || '').toUpperCase();
  const details = String(first.error?.details || '').toLowerCase();
  const transient =
    msg.includes('fetch failed') ||
    msg.includes('econnreset') ||
    details.includes('econnreset') ||
    code == 'ECONNRESET';

  if (!transient) return first;
  return await run();
}

export async function GET(req: NextRequest) {
  
  const auth = await requireMedicalRecordAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const q = (searchParams.get('q') || '').trim();
    const surrogateUserId = searchParams.get('surrogate_user_id');
    const matchId = searchParams.get('match_id');

    let query = auth.supabase
      .from('medical_record_reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (surrogateUserId) {
      query = query.eq('surrogate_user_id', surrogateUserId);
    }
    if (matchId) {
      query = query.eq('match_id', matchId);
    }
    if (q) {
      const escaped = q.replace(/[%_,]/g, '');
      if (escaped) {
        query = query.or(`title.ilike.%${escaped}%,file_name.ilike.%${escaped}%`);
      }
    }

    // PostgrestFilterBuilder is PromiseLike, not Promise — wrap so the retry helper type-checks.
    const { data, error } = await runReviewsQueryWithRetry(async () => await query);
    if (error) {
            throw error;
    }

    
    return NextResponse.json({ reviews: data || [] });
  } catch (error: any) {
    console.error('[medical-record-reviews] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch medical record reviews' },
      { status: 500 }
    );
  }
}

/**
 * Initialize upload: create DB row + signed upload URL.
 * Client uploads the PDF directly to storage (avoids Next/Vercel body size limits).
 */
export async function POST(req: NextRequest) {
  const auth = await requireMedicalRecordAccess({ requireWrite: true });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const title = typeof body?.title === 'string' ? body.title.trim() || null : null;
    const fileName = typeof body?.file_name === 'string' ? body.file_name.trim() : '';
    const contentType =
      typeof body?.content_type === 'string' && body.content_type
        ? body.content_type
        : 'application/pdf';
    const fileSize = Number(body?.file_size);
    const surrogateUserId =
      typeof body?.surrogate_user_id === 'string' ? body.surrogate_user_id.trim() || null : null;
    const matchId = typeof body?.match_id === 'string' ? body.match_id.trim() || null : null;

    if (!fileName) {
      return NextResponse.json({ error: 'Missing file_name' }, { status: 400 });
    }

    const ext = fileName.includes('.')
      ? fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
      : '';
    if (ext !== '.pdf' && contentType !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json({ error: 'Missing or invalid file_size' }, { status: 400 });
    }
    if (fileSize > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.` },
        { status: 400 }
      );
    }

    const { data: inserted, error: insertError } = await auth.supabase
      .from('medical_record_reviews')
      .insert({
        title,
        file_url: 'pending',
        file_name: fileName,
        storage_path: 'pending',
        surrogate_user_id: surrogateUserId,
        match_id: matchId,
        status: 'uploaded',
        created_by: auth.adminUserId,
      })
      .select()
      .single();

    if (insertError || !inserted) {
      throw insertError || new Error('Failed to create review record');
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${MEDICAL_RECORD_STORAGE_PREFIX}/${inserted.id}/${Date.now()}-${safeName}`;

    const { data: signed, error: signedError } = await auth.supabase.storage
      .from(MEDICAL_RECORD_STORAGE_BUCKET)
      .createSignedUploadUrl(path, { upsert: true });

    if (signedError || !signed?.signedUrl || !signed?.token) {
      await auth.supabase.from('medical_record_reviews').delete().eq('id', inserted.id);
      throw signedError || new Error('Failed to create signed upload URL');
    }

    const { error: pathUpdateError } = await auth.supabase
      .from('medical_record_reviews')
      .update({
        storage_path: path,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inserted.id);

    if (pathUpdateError) {
      await auth.supabase.from('medical_record_reviews').delete().eq('id', inserted.id);
      throw pathUpdateError;
    }

    return NextResponse.json({
      reviewId: inserted.id,
      path,
      token: signed.token,
      signedUrl: signed.signedUrl,
      publicUrl: buildDocumentsPublicUrl(path),
    });
  } catch (error: any) {
    console.error('[medical-record-reviews] POST init error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start medical record upload' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import {
  MEDICAL_RECORD_STORAGE_BUCKET,
  MEDICAL_RECORD_STORAGE_PREFIX,
  buildDocumentsPublicUrl,
  requireMedicalRecordAccess,
} from '@/lib/medicalRecordReviews';

export const dynamic = 'force-dynamic';

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

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ reviews: data || [] });
  } catch (error: any) {
    console.error('[medical-record-reviews] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch medical record reviews' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireMedicalRecordAccess({ requireWrite: true });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string | null)?.trim() || null;
    const surrogateUserId = (formData.get('surrogate_user_id') as string | null)?.trim() || null;
    const matchId = (formData.get('match_id') as string | null)?.trim() || null;

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    const ext = file.name.includes('.')
      ? file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
      : '';
    if (ext !== '.pdf' && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    const { data: inserted, error: insertError } = await auth.supabase
      .from('medical_record_reviews')
      .insert({
        title,
        file_url: 'pending',
        file_name: file.name,
        storage_path: 'pending',
        surrogate_user_id: surrogateUserId || null,
        match_id: matchId || null,
        status: 'uploaded',
        created_by: auth.adminUserId,
      })
      .select()
      .single();

    if (insertError || !inserted) {
      throw insertError || new Error('Failed to create review record');
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${MEDICAL_RECORD_STORAGE_PREFIX}/${inserted.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await auth.supabase.storage
      .from(MEDICAL_RECORD_STORAGE_BUCKET)
      .upload(path, file, {
        contentType: file.type || 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      await auth.supabase.from('medical_record_reviews').delete().eq('id', inserted.id);
      throw uploadError;
    }

    const publicUrl = buildDocumentsPublicUrl(path);
    const { data: updated, error: updateError } = await auth.supabase
      .from('medical_record_reviews')
      .update({
        file_url: publicUrl,
        storage_path: path,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inserted.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ review: updated });
  } catch (error: any) {
    console.error('[medical-record-reviews] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload medical record' },
      { status: 500 }
    );
  }
}

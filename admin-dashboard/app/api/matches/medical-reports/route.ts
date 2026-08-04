import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { syncAppointmentFromMedicalReport, resolveProviderContact, isDateOnlyBeforeToday } from '@/lib/syncAppointmentFromMedicalReport';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = 'force-dynamic';

const STORAGE_BUCKET = 'post-media';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

function sanitizeFilename(name: string): string {
  const base = name.includes('/') ? name.substring(name.lastIndexOf('/') + 1) : name;
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  return cleaned || 'image';
}

function validateImageFile(file: File): string | null {
  if (file.size > MAX_IMAGE_BYTES) {
    return `Each image must be at most ${MAX_IMAGE_BYTES / (1024 * 1024)}MB`;
  }
  const mime = (file.type || '').toLowerCase();
  if (mime && ALLOWED_MIME_TYPES.has(mime)) {
    return null;
  }
  const lower = file.name.toLowerCase();
  if (/\.(jpe?g|png|webp)$/.test(lower)) {
    return null;
  }
  return 'Only JPG, PNG, and WebP images are allowed';
}

function buildPublicUrl(storagePath: string) {
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${storagePath}`;
}

async function uploadProofImage(file: File, surrogateId: string): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const extMatch = file.name.match(/\.(jpe?g|png|webp)$/i);
  const ext = extMatch ? extMatch[0].toLowerCase() : '.jpg';
  const safeName = sanitizeFilename(file.name);
  const randomStr = Math.random().toString(36).slice(2);
  let path = `medical-reports/${surrogateId}_${Date.now()}_${randomStr}_${safeName}`;
  if (!/\.(jpe?g|png|webp)$/i.test(path)) {
    path += ext;
  }

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      contentType: file.type || 'image/jpeg',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || 'Failed to upload image');
  }

  return buildPublicUrl(path);
}

// POST medical report (admin helping surrogate)
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const adminUserId = cookieStore.get('admin_user_id')?.value;
    const { isReadOnlyBranchManager } = await import('@/lib/checkReadOnly');
    if (await isReadOnlyBranchManager(supabase, adminUserId)) {
      return NextResponse.json(
        { error: 'View-only access. You cannot modify data.' },
        { status: 403 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    let surrogate_id: string;
    let stage: string;
    let visit_date: string;
    let provider_name: string | null = null;
    let proof_image_url: string | null = null;
    let report_data: Record<string, any> = {};
    let uploadedPath: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      surrogate_id = String(form.get('surrogate_id') || '').trim();
      stage = String(form.get('stage') || '').trim();
      visit_date = String(form.get('visit_date') || '').trim();
      provider_name = String(form.get('provider_name') || '').trim() || null;

      const reportDataRaw = form.get('report_data');
      if (typeof reportDataRaw === 'string' && reportDataRaw.trim()) {
        try {
          report_data = JSON.parse(reportDataRaw);
        } catch {
          return NextResponse.json(
            { error: 'Invalid report_data JSON' },
            { status: 400 }
          );
        }
      }

      const proofFile = form.get('proof_image');
      if (proofFile instanceof File && proofFile.size > 0) {
        try {
          proof_image_url = await uploadProofImage(proofFile, surrogate_id);
          const pathMatch = proof_image_url.match(
            /\/storage\/v1\/object\/public\/post-media\/(.+)$/
          );
          uploadedPath = pathMatch ? decodeURIComponent(pathMatch[1]) : null;
        } catch (uploadErr: any) {
          return NextResponse.json(
            { error: uploadErr.message || 'Failed to upload image' },
            { status: 400 }
          );
        }
      } else {
        const urlFromForm = String(form.get('proof_image_url') || '').trim();
        proof_image_url = urlFromForm || null;
      }
    } else {
      const body = await request.json();
      surrogate_id = body.surrogate_id;
      stage = body.stage;
      visit_date = body.visit_date;
      provider_name = body.provider_name || null;
      proof_image_url = body.proof_image_url || null;
      report_data = body.report_data || {};
    }

    if (!surrogate_id || !stage || !visit_date) {
      if (uploadedPath) {
        await supabase.storage.from(STORAGE_BUCKET).remove([uploadedPath]);
      }
      return NextResponse.json(
        { error: 'Surrogate ID, stage, and visit date are required' },
        { status: 400 }
      );
    }

    report_data = {
      ...(report_data || {}),
      provider_contact: resolveProviderContact(
        (report_data || {}).provider_contact
      ),
    };

    if (
      report_data.next_appointment_date &&
      isDateOnlyBeforeToday(report_data.next_appointment_date)
    ) {
      return NextResponse.json(
        { error: 'Next appointment date cannot be in the past.' },
        { status: 400 }
      );
    }

    const { data, error: insertError } = await supabase
      .from('medical_reports')
      .insert({
        user_id: surrogate_id,
        stage,
        visit_date,
        provider_name: provider_name || null,
        proof_image_url: proof_image_url || null,
        report_data: report_data || {},
        uploaded_by: 'admin',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting medical report:', insertError);
      if (uploadedPath) {
        await supabase.storage.from(STORAGE_BUCKET).remove([uploadedPath]);
      }
      return NextResponse.json(
        { error: 'Failed to create medical report', details: insertError.message },
        { status: 500 }
      );
    }

    try {
      await syncAppointmentFromMedicalReport(supabase, {
        reportId: data.id,
        userId: surrogate_id,
        stage,
        providerName: provider_name,
        reportData: report_data || {},
        visitDate: visit_date,
      });
    } catch (syncErr: any) {
      console.warn('[medical-reports] POST appointment sync warning:', syncErr?.message || syncErr);
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error in POST medical report:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH medical report (admin edit)
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const adminUserId = cookieStore.get('admin_user_id')?.value;
    const { isReadOnlyBranchManager } = await import('@/lib/checkReadOnly');
    if (await isReadOnlyBranchManager(supabase, adminUserId)) {
      return NextResponse.json(
        { error: 'View-only access. You cannot modify data.' },
        { status: 403 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    let id: string;
    let stage: string;
    let visit_date: string;
    let provider_name: string | null = null;
    let proof_image_url: string | null | undefined = undefined;
    let report_data: Record<string, any> = {};
    let uploadedPath: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      id = String(form.get('id') || '').trim();
      stage = String(form.get('stage') || '').trim();
      visit_date = String(form.get('visit_date') || '').trim();
      provider_name = String(form.get('provider_name') || '').trim() || null;

      const reportDataRaw = form.get('report_data');
      if (typeof reportDataRaw === 'string' && reportDataRaw.trim()) {
        try {
          report_data = JSON.parse(reportDataRaw);
        } catch {
          return NextResponse.json(
            { error: 'Invalid report_data JSON' },
            { status: 400 }
          );
        }
      }

      const proofFile = form.get('proof_image');
      if (proofFile instanceof File && proofFile.size > 0) {
        const surrogateId = String(form.get('surrogate_id') || 'admin').trim() || 'admin';
        try {
          proof_image_url = await uploadProofImage(proofFile, surrogateId);
          const pathMatch = proof_image_url.match(
            /\/storage\/v1\/object\/public\/post-media\/(.+)$/
          );
          uploadedPath = pathMatch ? decodeURIComponent(pathMatch[1]) : null;
        } catch (uploadErr: any) {
          return NextResponse.json(
            { error: uploadErr.message || 'Failed to upload image' },
            { status: 400 }
          );
        }
      } else if (form.has('proof_image_url')) {
        const urlFromForm = String(form.get('proof_image_url') || '').trim();
        proof_image_url = urlFromForm || null;
      }
    } else {
      const body = await request.json();
      id = String(body.id || '').trim();
      stage = body.stage;
      visit_date = body.visit_date;
      provider_name = body.provider_name || null;
      report_data = body.report_data || {};
      if ('proof_image_url' in body) {
        proof_image_url = body.proof_image_url || null;
      }
    }

    if (!id || !stage || !visit_date) {
      if (uploadedPath) {
        await supabase.storage.from(STORAGE_BUCKET).remove([uploadedPath]);
      }
      return NextResponse.json(
        { error: 'Report ID, stage, and visit date are required' },
        { status: 400 }
      );
    }

    report_data = {
      ...(report_data || {}),
      provider_contact: resolveProviderContact(
        (report_data || {}).provider_contact
      ),
    };

    if (
      report_data.next_appointment_date &&
      isDateOnlyBeforeToday(report_data.next_appointment_date)
    ) {
      return NextResponse.json(
        { error: 'Next appointment date cannot be in the past.' },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, any> = {
      stage,
      visit_date,
      provider_name: provider_name || null,
      report_data: report_data || {},
      updated_at: new Date().toISOString(),
    };
    if (proof_image_url !== undefined) {
      updatePayload.proof_image_url = proof_image_url;
    }

    const { data, error: updateError } = await supabase
      .from('medical_reports')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating medical report:', updateError);
      if (uploadedPath) {
        await supabase.storage.from(STORAGE_BUCKET).remove([uploadedPath]);
      }
      return NextResponse.json(
        { error: 'Failed to update medical report', details: updateError.message },
        { status: 500 }
      );
    }

    try {
      await syncAppointmentFromMedicalReport(supabase, {
        reportId: data.id,
        userId: data.user_id,
        stage: data.stage || stage,
        providerName: data.provider_name ?? provider_name,
        reportData: data.report_data || report_data || {},
        visitDate: data.visit_date || visit_date,
      });
    } catch (syncErr: any) {
      console.warn('[medical-reports] PATCH appointment sync warning:', syncErr?.message || syncErr);
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error in PATCH medical report:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE medical report
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const adminUserId = cookieStore.get('admin_user_id')?.value;
    const { isReadOnlyBranchManager } = await import('@/lib/checkReadOnly');
    if (await isReadOnlyBranchManager(supabase, adminUserId)) {
      return NextResponse.json(
        { error: 'View-only access. You cannot modify data.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('id');

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    // Delete associated points rewards if any
    const { error: pointsError } = await supabase
      .from('points_rewards')
      .delete()
      .eq('source_type', 'medical_report')
      .eq('source_id', reportId);

    if (pointsError) {
      console.error('Error deleting associated points:', pointsError);
      // Continue with report deletion even if points deletion fails
    }

    // Delete the medical report
    const { error: deleteError } = await supabase
      .from('medical_reports')
      .delete()
      .eq('id', reportId);

    if (deleteError) {
      console.error('Error deleting medical report:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete medical report', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE medical report:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

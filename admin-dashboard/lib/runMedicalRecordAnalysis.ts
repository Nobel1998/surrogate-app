import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { analyzeMedicalRecordPdf } from '@/lib/kimiMedicalReview';
import {
  MEDICAL_RECORD_STORAGE_BUCKET,
  buildDocumentsPublicUrl,
  formatStorageDownloadError,
  isMedicalRecordPdfReady,
  medicalRecordPdfExists,
  purgeMedicalRecordPdf,
} from '@/lib/medicalRecordReviews';

export function getMedicalRecordTempPath(reviewId: string) {
  return path.join(os.tmpdir(), `medical-record-review-${reviewId}.pdf`);
}

export async function saveMedicalRecordTempPdf(reviewId: string, bytes: Buffer | Uint8Array) {
  const tmpPath = getMedicalRecordTempPath(reviewId);
  await fs.writeFile(tmpPath, Buffer.from(bytes));
  return tmpPath;
}

export async function readMedicalRecordTempPdf(reviewId: string): Promise<Uint8Array | null> {
  try {
    const tmpPath = getMedicalRecordTempPath(reviewId);
    const buf = await fs.readFile(tmpPath);
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

export async function clearMedicalRecordTempPdf(reviewId: string) {
  try {
    await fs.unlink(getMedicalRecordTempPath(reviewId));
  } catch {
    // ignore missing temp files
  }
}

function toStorageCdnUrl(url: string) {
  return url.replace(
    /https:\/\/([^.]+)\.supabase\.co\/storage\//,
    'https://$1.storage.supabase.co/storage/'
  );
}

async function downloadPdfBytes(url: string, timeoutMs: number): Promise<Uint8Array> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const downloadRes = await fetch(url, { signal: controller.signal });
    if (!downloadRes.ok) {
      throw new Error(`PDF download failed (${downloadRes.status})`);
    }
    const arrayBuffer = await downloadRes.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error(`PDF download timed out after ${Math.round(timeoutMs / 60000)} minutes.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function runMedicalRecordAnalysis(
  supabase: SupabaseClient,
  reviewId: string,
  providedPdfBytes?: Uint8Array | null,
) {
  const { data: existing, error: fetchError } = await supabase
    .from('medical_record_reviews')
    .select('*')
    .eq('id', reviewId)
    .single();

  if (fetchError || !existing) {
    throw new Error('Record not found');
  }

  if (!existing.storage_path || existing.storage_path === 'pending') {
    throw new Error('PDF file is missing');
  }

  if (!isMedicalRecordPdfReady(existing) && !(providedPdfBytes && providedPdfBytes.byteLength > 0)) {
    throw new Error('PDF upload is incomplete. Please delete this record and upload the PDF again.');
  }

  let pdfBytes: Uint8Array | null =
    providedPdfBytes && providedPdfBytes.byteLength > 0 ? providedPdfBytes : null;

  if (!pdfBytes) {
    pdfBytes = await readMedicalRecordTempPdf(reviewId);
  }

  if (!pdfBytes) {
    const pdfExists = await medicalRecordPdfExists(supabase, existing.storage_path);
    if (!pdfExists) {
      throw new Error('PDF file not found in storage. Please delete this record and upload the PDF again.');
    }

    const publicUrl =
      existing.file_url && existing.file_url !== 'pending'
        ? existing.file_url
        : buildDocumentsPublicUrl(existing.storage_path);
    const cdnUrl = toStorageCdnUrl(publicUrl);

    try {
      pdfBytes = await downloadPdfBytes(cdnUrl, 3 * 60 * 1000);
    } catch (cdnError: any) {
      const { data: signed, error: signedError } = await supabase.storage
        .from(MEDICAL_RECORD_STORAGE_BUCKET)
        .createSignedUrl(existing.storage_path, 60 * 30);

      if (signedError || !signed?.signedUrl) {
        const detail = await formatStorageDownloadError(signedError);
        throw new Error(detail || cdnError?.message || 'Failed to download PDF');
      }

      pdfBytes = await downloadPdfBytes(signed.signedUrl, 3 * 60 * 1000);
    }
  }

  let patientName: string | null = null;
  if (existing.surrogate_user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', existing.surrogate_user_id)
      .maybeSingle();
    patientName = profile?.name || null;
  }

  const result = await analyzeMedicalRecordPdf(pdfBytes, {
    fileName: existing.file_name || 'medical-record.pdf',
    patientName,
  });

  const { data: updated, error: updateError } = await supabase
    .from('medical_record_reviews')
    .update({
      status: 'analyzed',
      complications: result.complications,
      intro: result.intro || null,
      summary: result.summary || null,
      clinic_report: result.clinicReport || null,
      staff_report: result.staffReport || null,
      complexity_tier: result.complexityTier,
      raw_ai_response: result.rawAiResponse,
      error_message: null,
      analyzed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
    .select()
    .single();

  if (updateError) throw updateError;

  let finalReview = updated;
  try {
    const purge = await purgeMedicalRecordPdf(supabase, {
      id: reviewId,
      storage_path: existing.storage_path,
      file_deleted_at: existing.file_deleted_at,
    });
    if (purge.purged && purge.review) {
      finalReview = purge.review;
    }
  } catch (purgeError: any) {
    console.error('[runMedicalRecordAnalysis] PDF purge failed:', purgeError);
  }

  await clearMedicalRecordTempPdf(reviewId);
  return finalReview;
}

export async function markMedicalRecordAnalysisFailed(
  supabase: SupabaseClient,
  reviewId: string,
  message: string,
) {
  await supabase
    .from('medical_record_reviews')
    .update({
      status: 'failed',
      error_message: message.slice(0, 1000),
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId);
}

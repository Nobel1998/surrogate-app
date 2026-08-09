import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  analyzeMedicalRecordPdf,
  parseFactsCheckpoint,
  serializeFactsCheckpoint,
  synthesizeReportsFromFacts,
  type MedicalRecordFactsCheckpoint,
} from '@/lib/kimiMedicalReview';
import {
  MEDICAL_RECORD_STORAGE_BUCKET,
  buildDocumentsPublicUrl,
  createServiceSupabase,
  formatStorageDownloadError,
  isMedicalRecordPdfReady,
  medicalRecordPdfExists,
  purgeMedicalRecordPdf,
} from '@/lib/medicalRecordReviews';

const PROGRESS_PREFIX = 'PROGRESS:';

/** Live progress written to error_message so the admin UI can show it while status=analyzing. */
export async function setAnalysisProgress(
  supabase: SupabaseClient,
  reviewId: string,
  step: string,
  detail?: string
) {
  const stamp = new Date().toISOString();
  const msg = `${PROGRESS_PREFIX} ${step}${detail ? ` — ${detail}` : ''} @ ${stamp}`.slice(0, 1000);
  await supabase
    .from('medical_record_reviews')
    .update({
      error_message: msg,
      updated_at: stamp,
    })
    .eq('id', reviewId);
}

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

export function getSiteBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}`;
  return 'http://localhost:3000';
}

export function getMrrInternalSecret() {
  return (
    process.env.MRR_INTERNAL_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.MOONSHOT_API_KEY ||
    process.env.KIMI_API_KEY ||
    ''
  );
}

/** Fire phase-2 report synthesis as a NEW serverless invocation (fresh duration budget). */
export async function triggerSynthesizePhase(reviewId: string) {
  const secret = getMrrInternalSecret();
  if (!secret) {
    throw new Error('Missing internal secret for report synthesis trigger');
  }
  const url = `${getSiteBaseUrl()}/api/medical-record-reviews/${reviewId}/synthesize`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-mrr-internal-secret': secret,
    },
    body: JSON.stringify({ reviewId }),
  });
  const text = await res.text().catch(() => '');
  if (!res.ok && res.status !== 202) {
    throw new Error(`Failed to start report phase (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  return true;
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

export async function persistFactsCheckpoint(
  supabase: SupabaseClient,
  reviewId: string,
  checkpoint: MedicalRecordFactsCheckpoint
) {
  const complications = checkpoint.facts.map((f) => ({
    complication: f.finding,
    page: f.page,
    ...(f.detail ? { note: f.detail.slice(0, 500) } : {}),
  }));
  const slim: MedicalRecordFactsCheckpoint = {
    ...checkpoint,
    // Never store huge Kimi raw dumps — they break the checkpoint write.
    extractRaw: String(checkpoint.extractRaw || '').slice(0, 4000),
  };
  const { error } = await supabase
    .from('medical_record_reviews')
    .update({
      complications,
      raw_ai_response: serializeFactsCheckpoint(slim),
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId);
  if (error) {
    throw new Error(`Failed to save facts checkpoint: ${error.message}`);
  }
}

async function loadPdfBytes(
  supabase: SupabaseClient,
  existing: any,
  reviewId: string,
  providedPdfBytes?: Uint8Array | null
) {
  if (!isMedicalRecordPdfReady(existing) && !(providedPdfBytes && providedPdfBytes.byteLength > 0)) {
    throw new Error('PDF upload is incomplete. Please delete this record and upload the PDF again.');
  }

  let pdfBytes: Uint8Array | null =
    providedPdfBytes && providedPdfBytes.byteLength > 0 ? providedPdfBytes : null;

  if (!pdfBytes) {
    await setAnalysisProgress(supabase, reviewId, '2.temp_pdf', 'reading local temp cache');
    pdfBytes = await readMedicalRecordTempPdf(reviewId);
  }

  if (!pdfBytes) {
    await setAnalysisProgress(
      supabase,
      reviewId,
      '3.storage_check',
      `path=${String(existing.storage_path).slice(0, 80)}`);
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
      await setAnalysisProgress(supabase, reviewId, '4.download_cdn', 'downloading PDF from CDN');
      pdfBytes = await downloadPdfBytes(cdnUrl, 3 * 60 * 1000);
    } catch (cdnError: any) {
      await setAnalysisProgress(
        supabase,
        reviewId,
        '4b.download_signed',
        `CDN failed: ${String(cdnError?.message || cdnError).slice(0, 120)}`);
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

  return pdfBytes;
}

/** Phase 1: extract facts + persist checkpoint. Does NOT generate reports. */
export async function runExtractPhase(
  supabase: SupabaseClient,
  reviewId: string,
  providedPdfBytes?: Uint8Array | null
) {
  await setAnalysisProgress(supabase, reviewId, '1.load_record', 'phase1 extract');

  const { data: existing, error: fetchError } = await supabase
    .from('medical_record_reviews')
    .select('*')
    .eq('id', reviewId)
    .single();

  if (fetchError || !existing) throw new Error('Record not found');
  if (!existing.storage_path || existing.storage_path === 'pending') {
    throw new Error('PDF file is missing');
  }

  const existingCheckpoint = parseFactsCheckpoint(existing.raw_ai_response);
  if (
    existingCheckpoint &&
    existingCheckpoint.facts.length > 0 &&
    !existing.clinic_report &&
    !existing.staff_report
  ) {
    await setAnalysisProgress(
      supabase,
      reviewId,
      '1.checkpoint_exists',
      `facts=${existingCheckpoint.facts.length} — skip extract`);
    return { checkpoint: existingCheckpoint, skippedExtract: true as const };
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

  const pdfBytes = await loadPdfBytes(supabase, existing, reviewId, providedPdfBytes);

  await setAnalysisProgress(
    supabase,
    reviewId,
    '5.ai_extract',
    `pdfBytes=${pdfBytes.byteLength}`);

  const savedHolder: { checkpoint: MedicalRecordFactsCheckpoint | null } = {
    checkpoint: null,
  };

  await analyzeMedicalRecordPdf(pdfBytes, {
    fileName: existing.file_name || 'medical-record.pdf',
    patientName,
    extractOnly: true,
    onProgress: async (step, detail) => {
      await setAnalysisProgress(supabase, reviewId, `5.ai:${step}`, detail);
    },
    onFactsReady: async (checkpoint) => {
      await persistFactsCheckpoint(supabase, reviewId, checkpoint);
      savedHolder.checkpoint = checkpoint;
      await setAnalysisProgress(
        supabase,
        reviewId,
        '5.facts_saved',
        `facts=${checkpoint.facts.length} checkpoint persisted`);
    },
  });

  if (!savedHolder.checkpoint) {
    throw new Error('Extract finished but facts checkpoint was not saved');
  }

  await setAnalysisProgress(
    supabase,
    reviewId,
    '5.phase1_done',
    `facts=${savedHolder.checkpoint.facts.length} — starting phase2 automatically`);

  return { checkpoint: savedHolder.checkpoint, skippedExtract: false as const };
}

/** Phase 2: generate clinic + staff reports from checkpoint (fresh time budget). */
export async function runSynthesizePhase(supabase: SupabaseClient, reviewId: string) {
  await setAnalysisProgress(supabase, reviewId, '2.load_checkpoint', 'phase2 reports');

  const { data: existing, error: fetchError } = await supabase
    .from('medical_record_reviews')
    .select('*')
    .eq('id', reviewId)
    .single();

  if (fetchError || !existing) throw new Error('Record not found');

  const checkpoint = parseFactsCheckpoint(existing.raw_ai_response);
  if (!checkpoint?.facts?.length) {
    throw new Error('No facts checkpoint found. Run Review again to extract facts first.');
  }

  if (existing.clinic_report || existing.staff_report) {
    await setAnalysisProgress(supabase, reviewId, '2.already_done', 'reports already present');
    return existing;
  }

  let patientName = checkpoint.patientName;
  if (!patientName && existing.surrogate_user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', existing.surrogate_user_id)
      .maybeSingle();
    patientName = profile?.name || null;
  }

  await setAnalysisProgress(
    supabase,
    reviewId,
    '5.resume_reports',
    `facts=${checkpoint.facts.length} (phase2 only)`);

  const synthesized = await synthesizeReportsFromFacts(
    checkpoint.facts,
    checkpoint.pageCount,
    patientName,
    async (step, detail) => {
      await setAnalysisProgress(supabase, reviewId, `5.ai:${step}`, detail);
    }
  );

  const intro = synthesized.clinicReport
    ? 'Clinic-ready and internal staff reports were generated from this medical record. Open each report tab below (or download PDFs).'
    : '';
  const summary = synthesized.staffReport
    ? synthesized.complexityTier
      ? `Internal Case Complexity Flag: Tier ${synthesized.complexityTier}. See Staff Report for details.`
      : 'See Staff Report for the internal Case Complexity Flag and triage notes.'
    : '';

  const complications = checkpoint.facts.map((f) => ({
    complication: f.finding,
    page: f.page,
    ...(f.detail ? { note: f.detail.slice(0, 500) } : {}),
  }));

  await setAnalysisProgress(
    supabase,
    reviewId,
    '6.db_update',
    `clinic=${synthesized.clinicReport.length} staff=${synthesized.staffReport.length}`);

  const { data: updated, error: updateError } = await supabase
    .from('medical_record_reviews')
    .update({
      status: 'analyzed',
      complications,
      intro: intro || null,
      summary: summary || null,
      clinic_report: synthesized.clinicReport || null,
      staff_report: synthesized.staffReport || null,
      complexity_tier: synthesized.complexityTier,
      raw_ai_response: serializeFactsCheckpoint({
        ...checkpoint,
        extractRaw: JSON.stringify({
          prior: String(checkpoint.extractRaw || '').slice(0, 1000),
          reportParts: synthesized.rawParts.length,
          warnings: synthesized.chatErrors.slice(0, 20),
        }),
      }),
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
    console.error('[runSynthesizePhase] PDF purge failed:', purgeError);
  }

  await clearMedicalRecordTempPdf(reviewId);
  return finalReview;
}

/** Full pipeline helper used by local/tests: extract then synthesize in-process. */
export async function runMedicalRecordAnalysis(
  supabase: SupabaseClient,
  reviewId: string,
  providedPdfBytes?: Uint8Array | null
) {
  await runExtractPhase(supabase, reviewId, providedPdfBytes);
  return runSynthesizePhase(supabase, reviewId);
}

export async function markMedicalRecordAnalysisFailed(
  supabase: SupabaseClient,
  reviewId: string,
  message: string
) {
  // #region agent log
  fetch('http://127.0.0.1:7292/ingest/ae0d1be9-2477-4454-828d-6c03ee3b2577',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5244e3'},body:JSON.stringify({sessionId:'5244e3',runId:'pre-fix',hypothesisId:'H-A-D',location:'runMedicalRecordAnalysis.ts:markFailed',message:'mark analysis failed',data:{reviewId,errorMessage:String(message||'').slice(0,800)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  // Preserve raw_ai_response / facts checkpoint so Retry / phase2 can resume.
  await supabase
    .from('medical_record_reviews')
    .update({
      status: 'failed',
      error_message: message.slice(0, 1000),
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId);
}

export { createServiceSupabase };

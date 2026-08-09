import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import {
  markMedicalRecordAnalysisFailed,
  runExtractPhase,
  saveMedicalRecordTempPdf,
  setAnalysisProgress,
  triggerSynthesizePhase,
} from '@/lib/runMedicalRecordAnalysis';
import { requireMedicalRecordAccess } from '@/lib/medicalRecordReviews';
import { parseFactsCheckpoint } from '@/lib/kimiMedicalReview';

export const dynamic = 'force-dynamic';
/** Vercel Pro allows up to 800s — keep analysis in fewer phases without a 270s cut-off. */
export const maxDuration = 800;

type RouteContext = { params: Promise<{ id: string }> };

const analyzeTimestamps = new Map<string, number>();
const MIN_ANALYZE_INTERVAL_MS = 15_000;

function isRateLimited(id: string) {
  const now = Date.now();
  const previous = analyzeTimestamps.get(id);
  if (previous && now - previous < MIN_ANALYZE_INTERVAL_MS) {
    return true;
  }
  analyzeTimestamps.set(id, now);
  return false;
}

function hasKimiApiKey() {
  return !!(process.env.MOONSHOT_API_KEY || process.env.KIMI_API_KEY);
}

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireMedicalRecordAccess({ requireWrite: true });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!hasKimiApiKey()) {
    return NextResponse.json(
      {
        error: 'AI review is not configured on the server. Please contact the administrator.',
      },
      { status: 500 }
    );
  }

  const { id } = await context.params;

  if (isRateLimited(id)) {
    return NextResponse.json(
      { error: 'Please wait a few seconds before running review again.' },
      { status: 429 }
    );
  }

  try {
    const { data: existing, error: fetchError } = await auth.supabase
      .from('medical_record_reviews')
      .select(
        'id, status, storage_path, file_url, file_deleted_at, updated_at, error_message, raw_ai_response, clinic_report, staff_report'
      )
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // #region agent log
    fetch('http://127.0.0.1:7292/ingest/ae0d1be9-2477-4454-828d-6c03ee3b2577',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5244e3'},body:JSON.stringify({sessionId:'5244e3',runId:'pre-fix',hypothesisId:'H-A',location:'analyze/route.ts:existing',message:'analyze start record state',data:{id,status:existing.status,storagePath:existing.storage_path?String(existing.storage_path).slice(0,80):null,fileDeleted:!!existing.file_deleted_at,hasFileUrl:!!existing.file_url,prevError:String(existing.error_message||'').slice(0,200),hasClinic:!!existing.clinic_report,hasStaff:!!existing.staff_report,hasRaw:!!existing.raw_ai_response},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    if (existing.status === 'analyzing') {
      const updatedAt = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
      const staleMs = 2 * 60 * 1000;
      if (updatedAt && Date.now() - updatedAt < staleMs) {
        return NextResponse.json(
          { started: true, reviewId: id, alreadyRunning: true },
          { status: 202 }
        );
      }
    }

    const checkpoint = parseFactsCheckpoint(existing.raw_ai_response);
    const hasCheckpoint =
      !!checkpoint &&
      checkpoint.facts.length > 0 &&
      !existing.clinic_report &&
      !existing.staff_report;

    // If facts already saved, skip extract and only start phase 2.
    if (hasCheckpoint) {
      await auth.supabase
        .from('medical_record_reviews')
        .update({
          status: 'analyzing',
          error_message: `PROGRESS: skip_extract — facts=${checkpoint!.facts.length}; starting report phase`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      after(async () => {
        try {
          await setAnalysisProgress(
            auth.supabase,
            id,
            'auto_phase2',
            `facts=${checkpoint!.facts.length}`
          );
          await triggerSynthesizePhase(id);
        } catch (error: any) {
          await markMedicalRecordAnalysisFailed(
            auth.supabase,
            id,
            error?.message || 'Failed to start report phase'
          );
        }
      });

      return NextResponse.json(
        { started: true, reviewId: id, phase: 2 },
        { status: 202 }
      );
    }

    let providedPdfBytes: Uint8Array | null = null;
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      if (file instanceof File && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        providedPdfBytes = new Uint8Array(arrayBuffer);
        try {
          await saveMedicalRecordTempPdf(id, providedPdfBytes);
        } catch (tempError) {
          console.warn('[analyze] temp cache failed:', tempError);
        }
      }
    }

    await auth.supabase
      .from('medical_record_reviews')
      .update({
        status: 'analyzing',
        error_message: 'PROGRESS: queued — phase 1 extract starting',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    const supabase = auth.supabase;
    after(async () => {
      // Leave ~20s headroom under maxDuration=800 for cleanup / phase-2 trigger.
      const budgetMs = 780_000;
      try {
        await setAnalysisProgress(supabase, id, 'phase1_started', 'extracting medical record');
        await Promise.race([
          runExtractPhase(supabase, id, providedPdfBytes),
          new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(
                new Error(
                  `Extract phase timed out after ${Math.round(budgetMs / 1000)}s. If facts were saved, Retry Review will run reports only.`
                )
              );
            }, budgetMs);
          }),
        ]);

        // Fresh serverless invocation for reports (new duration budget).
        await triggerSynthesizePhase(id);
      } catch (error: any) {
        console.error('[medical-record-reviews/:id/analyze] phase1 error:', error);
        const message = error?.message || 'Failed to extract medical record';
        // #region agent log
        fetch('http://127.0.0.1:7292/ingest/ae0d1be9-2477-4454-828d-6c03ee3b2577',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5244e3'},body:JSON.stringify({sessionId:'5244e3',runId:'pre-fix',hypothesisId:'H-C',location:'analyze/route.ts:phase1-catch',message:'phase1 error catch',data:{id,errorMessage:String(message).slice(0,800)},timestamp:Date.now()})}).catch(()=>{});
        // #endregion

        // If checkpoint was saved before timeout, still try to start phase 2.
        try {
          const { data: row } = await supabase
            .from('medical_record_reviews')
            .select('raw_ai_response, clinic_report, staff_report')
            .eq('id', id)
            .maybeSingle();
          const cp = parseFactsCheckpoint(row?.raw_ai_response);
          if (cp?.facts?.length && !row?.clinic_report && !row?.staff_report) {
            await setAnalysisProgress(
              supabase,
              id,
              'extract_timeout_checkpoint_ok',
              `facts=${cp.facts.length} — starting report phase`
            );
            await triggerSynthesizePhase(id);
            return;
          }
        } catch (resumeErr) {
          console.error('[analyze] failed to auto-start phase2 after extract error:', resumeErr);
        }

        await markMedicalRecordAnalysisFailed(supabase, id, message);
      }
    });

    return NextResponse.json({ started: true, reviewId: id, phase: 1 }, { status: 202 });
  } catch (error: any) {
    console.error('[medical-record-reviews/:id/analyze] error:', error);
    const message = error?.message || 'Failed to start analysis';
    await markMedicalRecordAnalysisFailed(auth.supabase, id, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

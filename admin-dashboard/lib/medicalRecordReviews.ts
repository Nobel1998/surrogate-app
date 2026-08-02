import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getAdminSession } from '@/lib/adminSession';
import { isReadOnlyBranchManager } from '@/lib/checkReadOnly';
import {
  MEDICAL_RECORD_STORAGE_BUCKET,
  MEDICAL_RECORD_STORAGE_PREFIX,
} from '@/lib/medicalRecordReviewConstants';

export {
  MEDICAL_RECORD_STORAGE_BUCKET,
  MEDICAL_RECORD_STORAGE_PREFIX,
  MEDICAL_RECORD_REVIEW_DISCLAIMER,
} from '@/lib/medicalRecordReviewConstants';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export type MedicalRecordReviewStatus =
  | 'uploaded'
  | 'analyzing'
  | 'analyzed'
  | 'failed'
  | 'reviewed';

export type MedicalComplication = {
  complication: string;
  page: number;
  note?: string;
};

export function createServiceSupabase(): SupabaseClient {
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function buildDocumentsPublicUrl(path: string) {
  return `${supabaseUrl}/storage/v1/object/public/${MEDICAL_RECORD_STORAGE_BUCKET}/${path}`;
}

export function isMedicalRecordPdfReady(review: {
  file_url?: string | null;
  storage_path?: string | null;
  file_deleted_at?: string | null;
}) {
  return !!(
    review.storage_path &&
    review.storage_path !== 'pending' &&
    review.file_url &&
    review.file_url !== 'pending' &&
    !review.file_deleted_at
  );
}

export async function formatStorageDownloadError(error: unknown): Promise<string> {
  const err = error as {
    message?: string;
    status?: number;
    originalError?: Response;
  };

  const orig = err?.originalError;
  if (orig && typeof orig.text === 'function') {
    try {
      const bodyText = await orig.clone().text();
      let parsed: { message?: string; error?: string; statusCode?: string } | null = null;
      try {
        parsed = JSON.parse(bodyText);
      } catch {
        parsed = null;
      }
      const detail = parsed?.message || parsed?.error || bodyText.slice(0, 200);
      const status = orig.status || err.status;
      if (status === 404 || parsed?.error === 'not_found') {
        return 'PDF file not found in storage. Please delete this record and upload the PDF again.';
      }
      if (detail) {
        return `Failed to download PDF from storage (${status || 'error'}): ${detail}`;
      }
    } catch {
      // fall through
    }
  }

  const message = err?.message || '';
  if (message.startsWith('{') && message.includes('"url"')) {
    return 'PDF file not found in storage. Please delete this record and upload the PDF again.';
  }

  return message || 'Failed to download PDF from storage';
}

export async function medicalRecordPdfExists(
  supabase: SupabaseClient,
  storagePath: string
): Promise<boolean> {
  if (!storagePath || storagePath === 'pending') return false;

  const folder = storagePath.includes('/')
    ? storagePath.slice(0, storagePath.lastIndexOf('/'))
    : '';
  const fileName = storagePath.includes('/')
    ? storagePath.slice(storagePath.lastIndexOf('/') + 1)
    : storagePath;

  const { data, error } = await supabase.storage
    .from(MEDICAL_RECORD_STORAGE_BUCKET)
    .list(folder, { search: fileName, limit: 10 });

  if (error) return false;
  return (data || []).some((item) => item.name === fileName);
}

/** Remove PDF from storage after review; keep DB row + complications. */
export async function purgeMedicalRecordPdf(
  supabase: SupabaseClient,
  review: { id: string; storage_path?: string | null; file_deleted_at?: string | null }
) {
  if (review.file_deleted_at) {
    return { purged: false as const, reason: 'already_deleted' as const };
  }

  const path = review.storage_path;
  if (path && path !== 'pending') {
    const { error } = await supabase.storage.from(MEDICAL_RECORD_STORAGE_BUCKET).remove([path]);
    if (error) {
      console.error('[medical-record-reviews] storage purge error:', error);
      throw new Error(error.message || 'Failed to delete PDF from storage');
    }
  }

  const { data, error } = await supabase
    .from('medical_record_reviews')
    .update({
      file_url: null,
      storage_path: null,
      file_deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', review.id)
    .select()
    .single();

  if (error) throw error;
  return { purged: true as const, review: data };
}

export async function requireMedicalRecordAccess(opts?: { requireWrite?: boolean }) {
  const session = await getAdminSession();
  if (!session.ok) {
    return { ok: false as const, status: session.status, error: session.error };
  }

  const role = session.role;
  if (role === 'finance_manager') {
    return {
      ok: false as const,
      status: 403 as const,
      error: 'Finance manager cannot access this section.',
    };
  }
  if (role !== 'admin' && role !== 'branch_manager') {
    return { ok: false as const, status: 403 as const, error: 'Forbidden' };
  }

  if (!supabaseUrl || !serviceKey) {
    return { ok: false as const, status: 500 as const, error: 'Missing Supabase env vars' };
  }

  const supabase = createServiceSupabase();

  if (opts?.requireWrite) {
    if (await isReadOnlyBranchManager(supabase, session.adminUserId)) {
      return {
        ok: false as const,
        status: 403 as const,
        error: 'View-only access. You cannot modify data.',
      };
    }
  }

  return {
    ok: true as const,
    supabase,
    adminUserId: session.adminUserId,
    role,
  };
}

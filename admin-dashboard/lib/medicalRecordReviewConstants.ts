/** Client-safe constants for Medical Record Reviews (no next/headers). */

export const MEDICAL_RECORD_STORAGE_BUCKET = 'documents';
export const MEDICAL_RECORD_STORAGE_PREFIX = 'medical-record-reviews';

/** Shown at the top of Medical Record Review reports (PDF + admin UI). */
export const MEDICAL_RECORD_REVIEW_DISCLAIMER =
  'This document is a non-clinical summary prepared by Babytree Surrogacy based on medical records provided by the applicant. ' +
  'Babytree does not provide medical opinions, risk assessments, or suitability determinations. ' +
  'All medical decisions must be made exclusively by the clinic\'s licensed medical team.';

/** Prefix stored in raw_ai_response when extract facts are checkpointed for resume. */
export const MRR_FACTS_CHECKPOINT_PREFIX = '__MRR_FACTS_V1__';

/** Inserted at the start of clinic reports (before Current Pregnancy Overview). */
export const CLINIC_REPORT_PREAMBLE =
  'To support clinics in reducing review time and in early identification of surrogate candidates who may not meet medical criteria, ' +
  'Babytree Surrogacy now conducts a preliminary medical record screening. Our key observations are summarized below with page references for verification. ' +
  'This is a non-clinical review; all medical decisions must be made by the clinic’s licensed professionals.';

export function ensureClinicReportPreamble(markdown: string): string {
  const text = String(markdown || '').trim();
  if (!text) return text;
  if (text.includes('Babytree Surrogacy now conducts a preliminary medical record screening')) {
    return text;
  }
  return `${CLINIC_REPORT_PREAMBLE}\n\n${text}`;
}

export function hasFactsCheckpointRaw(raw?: string | null): boolean {
  return !!raw && raw.includes(MRR_FACTS_CHECKPOINT_PREFIX);
}

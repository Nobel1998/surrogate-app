import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { MedicalComplication } from '@/lib/medicalRecordReviews';
import {
  CLINIC_REPORT_SYSTEM_PROMPT,
  FACT_EXTRACTION_SYSTEM_PROMPT,
  STAFF_REPORT_SYSTEM_PROMPT,
} from '@/lib/medicalRecordReviewPrompts';

const DEFAULT_BASE_URL = 'https://api.moonshot.ai/v1';
const DEFAULT_MODEL = 'kimi-k3';
const PAGES_PER_CHUNK = 8;
const UPLOAD_MAX_ATTEMPTS = 3;
const CHAT_MAX_ATTEMPTS = 2;
/** Fact-extraction chats (longer OK). Must stay under Vercel maxDuration budget. */
const CHAT_TIMEOUT_MS = 4 * 60 * 1000;
/** Clinic/staff synthesis — keep short so we fail before the serverless kill. */
const REPORT_CHAT_TIMEOUT_MS = 120 * 1000;
const CHAT_BATCH_CHAR_LIMIT = 60000;

export type ExtractedFact = {
  category: string;
  pregnancyLabel: string | null;
  finding: string;
  detail: string;
  page: number;
};

export type MedicalRecordFactsCheckpoint = {
  v: 1;
  facts: ExtractedFact[];
  pageCount: number;
  patientName: string | null;
  extractRaw: string;
};

export const MRR_FACTS_CHECKPOINT_PREFIX = '__MRR_FACTS_V1__';

export function serializeFactsCheckpoint(checkpoint: MedicalRecordFactsCheckpoint): string {
  return `${MRR_FACTS_CHECKPOINT_PREFIX}${JSON.stringify(checkpoint)}`;
}

export function parseFactsCheckpoint(raw: string | null | undefined): MedicalRecordFactsCheckpoint | null {
  if (!raw || typeof raw !== 'string') return null;
  const idx = raw.indexOf(MRR_FACTS_CHECKPOINT_PREFIX);
  if (idx < 0) return null;
  try {
    const parsed = JSON.parse(raw.slice(idx + MRR_FACTS_CHECKPOINT_PREFIX.length)) as MedicalRecordFactsCheckpoint;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.facts) || parsed.facts.length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function getApiKey() {
  return process.env.MOONSHOT_API_KEY || process.env.KIMI_API_KEY || '';
}

function getBaseUrl() {
  const raw = process.env.MOONSHOT_BASE_URL || process.env.KIMI_BASE_URL || DEFAULT_BASE_URL;
  return raw.replace(/\/$/, '');
}

function getModel() {
  return process.env.MOONSHOT_MODEL || process.env.KIMI_MODEL || DEFAULT_MODEL;
}

function formatFetchError(error: unknown, fallback: string) {
  const err = error as { message?: string; cause?: { code?: string; message?: string } };
  const cause = err?.cause?.code || err?.cause?.message || '';
  const message = err?.message || fallback;
  return cause ? `${message} (${cause})` : message;
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('AI review did not return valid JSON');
  }
}

function normalizeFacts(raw: unknown): ExtractedFact[] {
  if (!raw || typeof raw !== 'object') return [];
  const list = (raw as { facts?: unknown; complications?: unknown }).facts
    ?? (raw as { complications?: unknown }).complications;
  if (!Array.isArray(list)) return [];

  const results: ExtractedFact[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const finding = String(row.finding || row.complication || '').trim();
    const pageRaw = row.page;
    const pageNum = typeof pageRaw === 'number' ? pageRaw : Number(pageRaw);
    if (!finding || !Number.isFinite(pageNum)) continue;
    const page = Math.max(1, Math.round(pageNum));
    const detail = String(row.detail || row.summary || row.remark || row.note || '').trim();
    const category = String(row.category || 'other').trim() || 'other';
    const pregnancyLabelRaw = row.pregnancyLabel ?? row.pregnancy_label;
    const pregnancyLabel = pregnancyLabelRaw
      ? String(pregnancyLabelRaw).trim() || null
      : null;
    results.push({
      category,
      pregnancyLabel,
      finding,
      detail,
      page,
    });
  }
  return results;
}

function dedupeFacts(items: ExtractedFact[]): ExtractedFact[] {
  const seen = new Set<string>();
  const out: ExtractedFact[] = [];
  for (const item of items) {
    const key = `${item.page}::${item.finding.toLowerCase()}::${item.category}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  out.sort(
    (a, b) =>
      a.page - b.page ||
      a.category.localeCompare(b.category) ||
      a.finding.localeCompare(b.finding)
  );
  return out;
}

function factsToComplications(facts: ExtractedFact[]): MedicalComplication[] {
  const eventCategories = new Set([
    'pregnancy_complication',
    'obstetric_history',
    'labor_delivery',
    'past_medical',
    'surgical',
    'infectious_disease',
    'gynecologic',
    'mental_health',
    'lab_abnormality',
    'imaging',
    'weight_bmi',
  ]);
  const out: MedicalComplication[] = [];
  for (const fact of facts) {
    if (!eventCategories.has(fact.category) && fact.category !== 'other') continue;
    if (
      fact.category === 'other' &&
      !/complicat|cesarean|c-section|preterm|preeclamp|hemorrhage|abortion|infection|surgery|diagnos/i.test(
        `${fact.finding} ${fact.detail}`
      )
    ) {
      continue;
    }
    out.push({
      complication: fact.pregnancyLabel
        ? `${fact.finding} (${fact.pregnancyLabel})`
        : fact.finding,
      page: fact.page,
      ...(fact.detail ? { note: fact.detail } : {}),
    });
  }
  return dedupeComplications(out);
}

function dedupeComplications(items: MedicalComplication[]): MedicalComplication[] {
  const seen = new Set<string>();
  const out: MedicalComplication[] = [];
  for (const item of items) {
    const key = `${item.page}::${item.complication.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  out.sort((a, b) => a.page - b.page || a.complication.localeCompare(b.complication));
  return out;
}

async function countPdfPages(pdfBytes: Uint8Array): Promise<number> {
  const source = await PDFDocument.load(pdfBytes);
  return source.getPageCount();
}

const PAGE_MARKER_TOP_MARGIN = 18;
const PAGE_MARKER_BOTTOM_MARGIN = 16;

/**
 * Stamp the original page number into the page itself so the extracted text
 * carries real page anchors instead of the model having to infer them.
 * The content is shifted into a slightly taller page so nothing gets covered.
 */
async function stampOriginalPageNumber(
  chunkDoc: PDFDocument,
  page: Awaited<ReturnType<PDFDocument['copyPages']>>[number],
  originalPage: number,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>
) {
  const { width, height } = page.getSize();
  page.setSize(width, height + PAGE_MARKER_TOP_MARGIN + PAGE_MARKER_BOTTOM_MARGIN);
  page.translateContent(0, PAGE_MARKER_BOTTOM_MARGIN);

  const marker = { size: 9, font, color: rgb(0, 0, 0) };
  page.drawText(`[[PAGE ${originalPage} START]]`, {
    x: 6,
    y: height + PAGE_MARKER_BOTTOM_MARGIN + 5,
    ...marker,
  });
  page.drawText(`[[PAGE ${originalPage} END]]`, { x: 6, y: 5, ...marker });
  chunkDoc.addPage(page);
}

async function splitPdfIntoPageChunks(
  pdfBytes: Uint8Array,
  pagesPerChunk: number
): Promise<Array<{ startPage: number; endPage: number; bytes: Uint8Array }>> {
  const source = await PDFDocument.load(pdfBytes);
  const totalPages = source.getPageCount();
  const chunks: Array<{ startPage: number; endPage: number; bytes: Uint8Array }> = [];

  for (let start = 0; start < totalPages; start += pagesPerChunk) {
    const end = Math.min(totalPages, start + pagesPerChunk);
    const chunkDoc = await PDFDocument.create();
    const font = await chunkDoc.embedFont(StandardFonts.Helvetica);
    const pageIndexes = Array.from({ length: end - start }, (_, i) => start + i);
    const copied = await chunkDoc.copyPages(source, pageIndexes);
    for (let i = 0; i < copied.length; i++) {
      await stampOriginalPageNumber(chunkDoc, copied[i], start + i + 1, font);
    }
    const bytes = await chunkDoc.save();
    chunks.push({
      startPage: start + 1,
      endPage: end,
      bytes: new Uint8Array(bytes),
    });
  }

  return chunks;
}

async function uploadPdfForExtract(pdfBytes: Uint8Array, fileName: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Missing MOONSHOT_API_KEY (or KIMI_API_KEY)');
  }

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= UPLOAD_MAX_ATTEMPTS; attempt++) {
    try {
      const form = new FormData();
      const blob = new Blob([Buffer.from(pdfBytes)], { type: 'application/pdf' });
      form.append('file', blob, fileName || 'medical-record.pdf');
      form.append('purpose', 'file-extract');

      const resp = await fetch(`${getBaseUrl()}/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: form,
        signal: AbortSignal.timeout(3 * 60 * 1000),
      });

      const bodyText = await resp.text();
      if (!resp.ok) {
        throw new Error(`File upload failed (${resp.status}): ${bodyText.slice(0, 500)}`);
      }

      let data: { id?: string };
      try {
        data = JSON.parse(bodyText);
      } catch {
        throw new Error('File upload returned non-JSON response');
      }

      if (!data.id) {
        throw new Error('File upload did not return a file id');
      }
      return data.id;
    } catch (error) {
      lastError = error;
      if (attempt < UPLOAD_MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
        continue;
      }
    }
  }

  throw new Error(formatFetchError(lastError, 'File upload failed'));
}

async function getExtractedFileContent(fileId: string): Promise<string> {
  const apiKey = getApiKey();
  try {
    const resp = await fetch(`${getBaseUrl()}/files/${fileId}/content`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(3 * 60 * 1000),
    });

    const bodyText = await resp.text();
    if (!resp.ok) {
      throw new Error(`File content failed (${resp.status}): ${bodyText.slice(0, 500)}`);
    }
    if (!bodyText.trim()) {
      throw new Error('Extracted file content was empty');
    }
    return bodyText;
  } catch (error) {
    throw new Error(formatFetchError(error, 'File content failed'));
  }
}

async function deleteRemoteFile(fileId: string): Promise<void> {
  try {
    const apiKey = getApiKey();
    await fetch(`${getBaseUrl()}/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
  } catch (error) {
    console.warn('[kimiMedicalReview] failed to delete remote file:', error);
  }
}

async function callKimiChat(
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  options?: { timeoutMs?: number; maxCompletionTokens?: number }
): Promise<{ text: string; raw: string }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Missing MOONSHOT_API_KEY (or KIMI_API_KEY)');
  }

  const timeoutMs = options?.timeoutMs ?? CHAT_TIMEOUT_MS;
  const maxCompletionTokens = options?.maxCompletionTokens ?? 32768;

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= CHAT_MAX_ATTEMPTS; attempt++) {
    try {
      // kimi-k3 always thinks; reasoning + answer share the same token budget.
      // A low max_tokens often yields empty content after thinking exhausts the budget.
      const resp = await fetch(`${getBaseUrl()}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: getModel(),
          reasoning_effort: 'low',
          max_completion_tokens: maxCompletionTokens,
          messages,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      const bodyText = await resp.text();
      if (!resp.ok) {
        throw new Error(`AI review failed (${resp.status}): ${bodyText.slice(0, 500)}`);
      }

      let data: {
        choices?: Array<{
          finish_reason?: string;
          message?: {
            content?: string | Array<{ type?: string; text?: string }> | null;
            reasoning_content?: string | null;
          };
        }>;
      };
      try {
        data = JSON.parse(bodyText);
      } catch {
        throw new Error('AI review returned non-JSON response');
      }

      const choice = data.choices?.[0];
      const message = choice?.message;
      const content = message?.content;
      let text = '';
      if (typeof content === 'string') {
        text = content.trim();
      } else if (Array.isArray(content)) {
        text = content
          .map((part) => (typeof part?.text === 'string' ? part.text : ''))
          .join('\n')
          .trim();
      }

      // Fallback: some thinking responses put usable JSON only in reasoning_content
      // when the answer budget was exhausted (finish_reason=length).
      if (!text && typeof message?.reasoning_content === 'string') {
        const reasoning = message.reasoning_content.trim();
        if (reasoning.includes('{') && reasoning.includes('}')) {
          text = reasoning;
        }
      }

      if (!text) {
        throw new Error(
          `AI review returned empty content (finish_reason=${choice?.finish_reason || 'unknown'})`
        );
      }

      return { text, raw: bodyText };
    } catch (error) {
      lastError = error;
      const msg = String((error as any)?.message || '').toLowerCase();
      const isTimeout = msg.includes('timeout') || msg.includes('aborted');
      const isEmpty = msg.includes('empty content');
      if ((isTimeout || isEmpty) && attempt < CHAT_MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
        continue;
      }
      throw new Error(formatFetchError(error, 'AI review failed'));
    }
  }

  throw new Error(formatFetchError(lastError, 'AI review failed'));
}

function cleanPatientName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.replace(/\s+/g, ' ').trim();
  if (!name) return null;
  const lower = name.toLowerCase();
  if (
    lower === 'null' ||
    lower === 'undefined' ||
    lower === 'unknown' ||
    lower === 'n/a' ||
    lower === 'na' ||
    lower === 'none' ||
    lower.includes('not stated') ||
    lower.includes('not provided') ||
    lower.includes('not available')
  ) {
    return null;
  }
  return name;
}

/** Best-effort patient name from page-1 extract text when the model returns null. */
function extractPatientNameFromPage1Text(text: string): string | null {
  const page1Match = text.match(/\[\[PAGE\s*1\s*START\]\]([\s\S]*?)\[\[PAGE\s*1\s*END\]\]/i);
  const page1 = (page1Match ? page1Match[1] : text.slice(0, 4000)).replace(/\u0000/g, ' ');

  const patterns = [
    /(?:patient\s*name|member\s*name|applicant\s*name|client\s*name|full\s*name|patient)\s*[:：\-]\s*([A-Z][A-Za-z'’.\-]+(?:\s+[A-Z][A-Za-z'’.\-]+){0,4})/i,
    /(?:name)\s*[:：\-]\s*([A-Z][A-Za-z'’.\-]+(?:\s+[A-Z][A-Za-z'’.\-]+){1,4})/i,
  ];

  for (const pattern of patterns) {
    const match = page1.match(pattern);
    const candidate = cleanPatientName(match?.[1]);
    if (candidate && candidate.split(' ').length >= 1) return candidate;
  }

  return null;
}

function formatFactsForPrompt(facts: ExtractedFact[]): string {
  if (!facts.length) return 'No factual findings were extracted from the record.';
  // Keep prompts bounded so clinic/staff synthesis finishes inside Vercel time limits.
  const maxFacts = 60;
  const sliced = facts.length > maxFacts ? facts.slice(0, maxFacts) : facts;
  const lines = sliced.map((f, i) => {
    const preg = f.pregnancyLabel ? ` [${f.pregnancyLabel}]` : '';
    const detail = f.detail ? ` — ${f.detail.slice(0, 180)}` : '';
    return `${i + 1}. [${f.category}]${preg} ${f.finding} (page ${f.page})${detail}`;
  });
  if (facts.length > maxFacts) {
    lines.push(
      `... plus ${facts.length - maxFacts} additional facts omitted from this prompt for length; still cite only facts listed above.`
    );
  }
  return lines.join('\n');
}

function remapFactPages(
  items: ExtractedFact[],
  startPage: number,
  endPage: number
): ExtractedFact[] {
  return items.map((item) => {
    if (item.page >= 1 && item.page <= endPage - startPage + 1 && item.page < startPage) {
      return { ...item, page: startPage + item.page - 1 };
    }
    if (item.page < startPage || item.page > endPage) {
      const local = Math.min(Math.max(item.page, 1), endPage - startPage + 1);
      return { ...item, page: startPage + local - 1 };
    }
    return item;
  });
}

async function generateClinicReport(
  facts: ExtractedFact[],
  pageCount: number,
  patientName?: string | null
): Promise<{ report: string; raw: string }> {
  const resolvedName = cleanPatientName(patientName);
  const userPrompt = [
    resolvedName
      ? `Patient / surrogate candidate name: ${resolvedName}.`
      : 'Patient name was not identified. Refer to the candidate as "the applicant".',
    `Pages reviewed in source PDF: ${pageCount || 'unknown'}.`,
    `Extracted factual inventory (use ONLY these facts; cite page numbers):\n${formatFactsForPrompt(facts)}`,
    'Produce the clinic-ready Markdown summary with all 10 required sections. Return JSON only.',
  ].join('\n\n');

  const { text, raw } = await callKimiChat(
    [
      { role: 'system', content: CLINIC_REPORT_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    { timeoutMs: REPORT_CHAT_TIMEOUT_MS, maxCompletionTokens: 12288 }
  );
  const parsed = extractJsonObject(text) as { report?: unknown };
  const report = String(parsed?.report || '').trim();
  if (!report) throw new Error('Clinic report generation returned empty content');
  return { report, raw };
}

async function generateStaffReport(
  facts: ExtractedFact[],
  pageCount: number,
  patientName?: string | null
): Promise<{ report: string; complexityTier: number | null; raw: string }> {
  const resolvedName = cleanPatientName(patientName);
  const userPrompt = [
    resolvedName
      ? `Patient / surrogate candidate name: ${resolvedName}.`
      : 'Patient name was not identified. Refer to the candidate as "the applicant".',
    `Pages reviewed in source PDF: ${pageCount || 'unknown'}.`,
    `Extracted factual inventory (use ONLY these facts; cite page numbers):\n${formatFactsForPrompt(facts)}`,
    'Produce the internal Babytree staff Markdown reference with all 6 required sections and complexityTier. Return JSON only.',
  ].join('\n\n');

  const { text, raw } = await callKimiChat(
    [
      { role: 'system', content: STAFF_REPORT_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    { timeoutMs: REPORT_CHAT_TIMEOUT_MS, maxCompletionTokens: 12288 }
  );
  const parsed = extractJsonObject(text) as {
    report?: unknown;
    complexityTier?: unknown;
  };
  const report = String(parsed?.report || '').trim();
  if (!report) throw new Error('Staff report generation returned empty content');
  const tierRaw = Number(parsed?.complexityTier);
  const complexityTier =
    tierRaw === 1 || tierRaw === 2 || tierRaw === 3 ? tierRaw : null;
  return { report, complexityTier, raw };
}

function buildExtractBatches(
  parts: Array<{ startPage: number; endPage: number; text: string }>
): Array<{ startPage: number; endPage: number; text: string }> {
  const batches: Array<{ startPage: number; endPage: number; text: string }> = [];
  let currentText = '';
  let currentStart = 0;
  let currentEnd = 0;

  for (const part of parts) {
    const block =
      `\n\n===== ORIGINAL PAGES ${part.startPage}-${part.endPage} =====\n` + part.text;
    if (currentText && currentText.length + block.length > CHAT_BATCH_CHAR_LIMIT) {
      batches.push({ startPage: currentStart, endPage: currentEnd, text: currentText });
      currentText = '';
      currentStart = 0;
      currentEnd = 0;
    }
    if (!currentText) {
      currentStart = part.startPage;
      currentText = block;
    } else {
      currentText += block;
    }
    currentEnd = part.endPage;
  }

  if (currentText) {
    batches.push({ startPage: currentStart, endPage: currentEnd, text: currentText });
  }
  return batches;
}

export async function synthesizeReportsFromFacts(
  facts: ExtractedFact[],
  pageCount: number,
  patientName: string | null | undefined,
  onProgress?: (step: string, detail?: string) => void | Promise<void>
): Promise<{
  clinicReport: string;
  staffReport: string;
  complexityTier: number | null;
  rawParts: string[];
  chatErrors: string[];
}> {
  const report = async (step: string, detail?: string) => {
    try {
      await onProgress?.(step, detail);
    } catch {
      // best-effort
    }
  };

  const resolvedPatientName = cleanPatientName(patientName);
  const rawParts: string[] = [];
  const chatErrors: string[] = [];
  let clinicReport = '';
  let staffReport = '';
  let complexityTier: number | null = null;

  await report('reports_parallel', `facts=${facts.length}`);
  const [clinicResult, staffResult] = await Promise.allSettled([
    generateClinicReport(facts, pageCount, resolvedPatientName),
    generateStaffReport(facts, pageCount, resolvedPatientName),
  ]);

  if (clinicResult.status === 'fulfilled') {
    clinicReport = clinicResult.value.report;
    rawParts.push(JSON.stringify({ clinicReport: clinicResult.value.raw }));
    await report('clinic_report_ok', `len=${clinicReport.length}`);
  } else {
    const msg =
      (clinicResult.reason as Error)?.message || String(clinicResult.reason) || 'failed';
    chatErrors.push(`clinic_report: ${msg}`);
    await report('clinic_report_FAILED', String(msg).slice(0, 160));
  }

  if (staffResult.status === 'fulfilled') {
    staffReport = staffResult.value.report;
    complexityTier = staffResult.value.complexityTier;
    rawParts.push(JSON.stringify({ staffReport: staffResult.value.raw }));
    await report('staff_report_ok', `len=${staffReport.length} tier=${complexityTier}`);
  } else {
    const msg =
      (staffResult.reason as Error)?.message || String(staffResult.reason) || 'failed';
    chatErrors.push(`staff_report: ${msg}`);
    await report('staff_report_FAILED', String(msg).slice(0, 160));
  }

  if (!clinicReport && !staffReport) {
    throw new Error(chatErrors[0] || 'Failed to generate clinic and staff reports');
  }

  return { clinicReport, staffReport, complexityTier, rawParts, chatErrors };
}

export async function analyzeMedicalRecordPdf(
  pdfBytes: Uint8Array,
  options?: {
    fileName?: string;
    patientName?: string | null;
    onProgress?: (step: string, detail?: string) => void | Promise<void>;
    /** Called after facts are extracted so the caller can checkpoint before report synthesis. */
    onFactsReady?: (checkpoint: MedicalRecordFactsCheckpoint) => void | Promise<void>;
  }
): Promise<{
  complications: MedicalComplication[];
  intro: string;
  summary: string;
  clinicReport: string;
  staffReport: string;
  complexityTier: number | null;
  rawAiResponse: string;
  pageCount: number;
}> {
  const report = async (step: string, detail?: string) => {
    try {
      await options?.onProgress?.(step, detail);
    } catch {
      // progress is best-effort
    }
  };

  const pageCount = await countPdfPages(pdfBytes);
  const fileName = options?.fileName || 'medical-record.pdf';

  await report('split_pdf', `pages=${pageCount}`);
  const chunks = await splitPdfIntoPageChunks(pdfBytes, PAGES_PER_CHUNK);

  const extractedParts: Array<{ startPage: number; endPage: number; text: string }> = [];
  const extractErrors: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkName = `${fileName.replace(/\.pdf$/i, '')}.p${chunk.startPage}-${chunk.endPage}.pdf`;
    let fileId: string | null = null;

    await report(
      'extract_chunk',
      `${i + 1}/${chunks.length} pages ${chunk.startPage}-${chunk.endPage}`
    );

    try {
      fileId = await uploadPdfForExtract(chunk.bytes, chunkName);
      const extractedText = await getExtractedFileContent(fileId);

      if (extractedText.trim()) {
        extractedParts.push({
          startPage: chunk.startPage,
          endPage: chunk.endPage,
          text: extractedText,
        });
      }
    } catch (error: any) {
      const message = error?.message || 'chunk extract failed';
      extractErrors.push(`pages ${chunk.startPage}-${chunk.endPage}: ${message}`);
    } finally {
      if (fileId) {
        await deleteRemoteFile(fileId);
      }
    }
  }

  if (extractedParts.length === 0) {
    throw new Error(
      extractErrors[0] || 'No text could be extracted from the PDF for AI review.'
    );
  }

  const chatBatches = buildExtractBatches(extractedParts);

  const allFacts: ExtractedFact[] = [];
  const rawParts: string[] = [];
  const chatErrors: string[] = [];
  let recordPatientName: string | null = null;

  for (let i = 0; i < chatBatches.length; i++) {
    const batch = chatBatches[i];
    await report(
      'fact_batch',
      `${i + 1}/${chatBatches.length} pages ${batch.startPage}-${batch.endPage}`
    );
    try {
      const { text, raw } = await callKimiChat([
        { role: 'system', content: FACT_EXTRACTION_SYSTEM_PROMPT },
        { role: 'system', content: batch.text },
        {
          role: 'user',
          content:
            `Extract a complete factual inventory from the medical record above, covering all required categories. ` +
            `Cite page numbers from [[PAGE n START]] / [[PAGE n END]] markers. ` +
            (batch.startPage === 1
              ? `The patient's full name is on page 1. Read it from [[PAGE 1 START]]…[[PAGE 1 END]] and return it as patientName. `
              : `Return patientName as null because this section does not contain page 1. `) +
            `This section covers ORIGINAL pages ${batch.startPage}-${batch.endPage}. Return JSON only.`,
        },
      ]);

      const parsed = extractJsonObject(text) as {
        patientName?: unknown;
        facts?: unknown;
      };
      if (!recordPatientName && batch.startPage === 1) {
        recordPatientName = cleanPatientName(parsed.patientName);
      }
      if (!recordPatientName && /\[\[PAGE\s*1\s*START\]\]/i.test(batch.text)) {
        recordPatientName = extractPatientNameFromPage1Text(batch.text);
      }
      allFacts.push(...remapFactPages(normalizeFacts(parsed), batch.startPage, batch.endPage));
      rawParts.push(
        JSON.stringify({
          batch: i + 1,
          startPage: batch.startPage,
          endPage: batch.endPage,
          raw,
        })
      );
    } catch (error: any) {
      const message = error?.message || 'chat failed';
      chatErrors.push(`pages ${batch.startPage}-${batch.endPage}: ${message}`);
    }
  }

  if (allFacts.length === 0 && chatErrors.length > 0) {
    throw new Error(chatErrors[0]);
  }

  const facts = dedupeFacts(allFacts);
  const complications = factsToComplications(facts);

  if (!recordPatientName) {
    for (const part of extractedParts) {
      if (part.startPage === 1 || /\[\[PAGE\s*1\s*START\]\]/i.test(part.text)) {
        recordPatientName = extractPatientNameFromPage1Text(part.text);
        if (recordPatientName) break;
      }
    }
  }

  const resolvedPatientName =
    cleanPatientName(recordPatientName) || cleanPatientName(options?.patientName);

  const checkpoint: MedicalRecordFactsCheckpoint = {
    v: 1,
    facts,
    pageCount,
    patientName: resolvedPatientName,
    extractRaw: `[${rawParts.join(',')}]`,
  };

  await report('facts_checkpoint', `facts=${facts.length}`);
  try {
    await options?.onFactsReady?.(checkpoint);
  } catch {
    // checkpoint persist is best-effort; reports may still succeed in this run
  }

  const synthesized = await synthesizeReportsFromFacts(
    facts,
    pageCount,
    resolvedPatientName,
    options?.onProgress
  );

  rawParts.push(...synthesized.rawParts);
  chatErrors.push(...synthesized.chatErrors);

  const notes = [...extractErrors, ...chatErrors];
  if (notes.length) {
    rawParts.push(JSON.stringify({ warnings: notes }));
  }

  const clinicReport = synthesized.clinicReport;
  const staffReport = synthesized.staffReport;
  const complexityTier = synthesized.complexityTier;

  // Keep intro/summary for older UI: short pointers into the dual reports.
  const intro = clinicReport
    ? 'Clinic-ready and internal staff reports were generated from this medical record. Open each report tab below (or download PDFs).'
    : '';
  const summary = staffReport
    ? complexityTier
      ? `Internal Case Complexity Flag: Tier ${complexityTier}. See Staff Report for details.`
      : 'See Staff Report for the internal Case Complexity Flag and triage notes.'
    : '';

  await report('ai_done', `clinic=${clinicReport.length} staff=${staffReport.length}`);

  return {
    complications,
    intro,
    summary,
    clinicReport,
    staffReport,
    complexityTier,
    rawAiResponse: serializeFactsCheckpoint({
      ...checkpoint,
      extractRaw: `[${rawParts.join(',')}]`,
    }),
    pageCount,
  };
}

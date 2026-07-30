import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { MedicalComplication } from '@/lib/medicalRecordReviews';

const DEFAULT_BASE_URL = 'https://api.moonshot.ai/v1';
const DEFAULT_MODEL = 'kimi-k3';
const PAGES_PER_CHUNK = 8;
const UPLOAD_MAX_ATTEMPTS = 3;
const CHAT_MAX_ATTEMPTS = 2;
const CHAT_TIMEOUT_MS = 15 * 60 * 1000;
const CHAT_BATCH_CHAR_LIMIT = 60000;

const REVIEW_SYSTEM_PROMPT = `You are an experienced OB/GYN nursing team reviewing a surrogacy medical record with a highly professional nursing clinical perspective.
Review as skilled OB/GYN nurses would: precise, disciplined, and focused on the findings that matter for obstetric, gynecologic, and fertility care. Your analysis should reflect nursing chart-review rigor—clear clinical language, attention to course and treatment, and no speculation.
Return ONLY valid JSON with this exact shape:
{"patientName":"string or null","complications":[{"complication":"string","summary":"string","page":1}]}
What counts as significant (from a professional OB/GYN nursing review standpoint, aligned with OB/GYN and IVF clinic clinical priorities):
- Pregnancy, delivery, or postpartum complications.
- Surgeries and procedures done for a problem.
- Chronic, recurrent, or ongoing conditions, including mental health conditions.
- Infections or diseases that required treatment.
- Abnormal results that changed management or required follow-up.
- Obstetric, gynecologic, or fertility-related history that would matter to an OB/GYN nurse or IVF clinician reviewing a surrogacy candidate.
What to leave out:
- Minor, incidental, or self-limited findings.
- Isolated borderline or mildly abnormal lab values that were not acted on, such as a mild vitamin deficiency.
- Normal or routine findings, administrative text, and billing or scheduling notes.
Rules:
- patientName: when the supplied section contains [[PAGE 1 START]], read the patient's full name directly from the first page and return it. Use only a name explicitly identified as the patient/member/applicant on page 1; do not use a provider, doctor, facility, guarantor, or emergency contact name. If page 1 is absent or the patient's name cannot be identified confidently, return null.
- Report the same problem only once. If it appears in several places, use the documentation that describes it best.
- complication: the short clinical name of the complication (a few words).
- summary: 1-2 sentences summarizing what the record says about that complication. Include the specifics that are stated, such as onset or date, diagnosis, severity, treatment or medication, and outcome. Do not copy long passages verbatim, and do not invent details that are not in the record.
- Every page of the record carries the markers [[PAGE n START]] and [[PAGE n END]], where n is the ORIGINAL page number of that page.
- page MUST be the n of the marker pair that surrounds the text you are citing. Never guess, estimate, or calculate a page number, and never use a page number that has no marker in the text.
- If nothing significant is found, still return patientName and return an empty complications array.`;

const OVERVIEW_SYSTEM_PROMPT = `You write the introductory paragraph and overall summary of a surrogacy medical-record review.
Write in the voice of an experienced OB/GYN nursing team reviewing with a highly professional nursing clinical perspective and precise analysis.
Return ONLY valid JSON with this exact shape:
{"introductory":"string","overallSummary":"string"}
Rules:
- introductory: one short paragraph. It MUST begin with the exact words: "Our experienced OB/GYN nursing team has" and then continue naturally (for example, "...reviewed the medical records of [patient]..."). Identify the patient by name when provided (otherwise the applicant). State that the team reviewed this surrogacy medical record with a professional nursing clinical perspective, that we know which findings matter and present them clearly and concisely, mention how many pages were reviewed, and say that the significant issues identified are listed below. Do not name the individual findings in this paragraph. Do not start with any other phrasing.
- overallSummary: write 2-3 short, clearly separated paragraphs summarizing the findings as a whole after they have been listed, in the same professional OB/GYN nursing voice. Separate paragraphs with a blank line using "\\n\\n" inside the JSON string. Organize related findings together (for example, obstetric/gynecologic history in one paragraph and other clinically significant history in another), then use the final paragraph to summarize whether the findings are mostly historical, resolved, recurrent, chronic, or ongoing when supported by the supplied findings. Do not repeat the same finding across paragraphs. If there are too few findings for multiple meaningful topics, use two concise paragraphs rather than adding filler.
- The overallSummary is a summary, not an assessment. Do not make an eligibility decision, risk rating, recommendation, or surrogacy screening judgment.
- Use only the findings supplied to you. Do not invent findings, diagnoses, dates, outcomes, or recommendations.
- Plain professional English. No bullet points, no markdown, no headings.`;

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

function normalizeComplications(raw: unknown): MedicalComplication[] {
  if (!raw || typeof raw !== 'object') return [];
  const list = (raw as { complications?: unknown }).complications;
  if (!Array.isArray(list)) return [];

  const results: MedicalComplication[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const complication = String((item as { complication?: unknown }).complication || '').trim();
    const pageRaw = (item as { page?: unknown }).page;
    const pageNum = typeof pageRaw === 'number' ? pageRaw : Number(pageRaw);
    if (!complication || !Number.isFinite(pageNum)) continue;
    const page = Math.max(1, Math.round(pageNum));
    const detail = item as { summary?: unknown; remark?: unknown; note?: unknown };
    const note = String(detail.summary || detail.remark || detail.note || '').trim();
    results.push(note ? { complication, page, note } : { complication, page });
  }
  return results;
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
  messages: Array<{ role: 'system' | 'user'; content: string }>
): Promise<{ text: string; raw: string }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Missing MOONSHOT_API_KEY (or KIMI_API_KEY)');
  }

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
          max_completion_tokens: 32768,
          messages,
        }),
        signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
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

async function callKimiForOverview(
  complications: MedicalComplication[],
  pageCount: number,
  patientName?: string | null
): Promise<{ intro: string; summary: string; raw: string }> {
  const findings = complications
    .map(
      (item, index) =>
        `${index + 1}. ${item.complication} (page ${item.page})${item.note ? `: ${item.note}` : ''}`
    )
    .join('\n');

  const userPrompt = [
    patientName ? `Patient: ${patientName}.` : 'Patient name: not stated in the record.',
    `Pages reviewed: ${pageCount || 'unknown'}.`,
    complications.length
      ? `Findings from the review:\n${findings}`
      : 'The review found no significant complications.',
    'Write the introductory paragraph and a 2-3 paragraph overall summary from a highly professional OB/GYN nursing perspective. The introductory paragraph MUST begin exactly with: "Our experienced OB/GYN nursing team has". Separate the overall-summary paragraphs with a blank line. Return JSON only.',
  ].join('\n\n');

  const { text, raw } = await callKimiChat([
    { role: 'system', content: OVERVIEW_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ]);

  const parsed = extractJsonObject(text) as {
    introductory?: unknown;
    overallSummary?: unknown;
  };
  return {
    intro: String(parsed?.introductory || '').trim(),
    summary: String(parsed?.overallSummary || '').trim(),
    raw,
  };
}

function remapChunkPages(
  items: MedicalComplication[],
  startPage: number,
  endPage: number
): MedicalComplication[] {
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

export async function analyzeMedicalRecordPdf(
  pdfBytes: Uint8Array,
  options?: {
    fileName?: string;
    patientName?: string | null;
  }
): Promise<{
  complications: MedicalComplication[];
  intro: string;
  summary: string;
  rawAiResponse: string;
  pageCount: number;
}> {
  const pageCount = await countPdfPages(pdfBytes);
  const fileName = options?.fileName || 'medical-record.pdf';

  const chunks = await splitPdfIntoPageChunks(pdfBytes, PAGES_PER_CHUNK);

  const extractedParts: Array<{ startPage: number; endPage: number; text: string }> = [];
  const extractErrors: string[] = [];

  // Phase 1: upload+extract all PDF chunks (chat is the slow step; do it once after).
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkName = `${fileName.replace(/\.pdf$/i, '')}.p${chunk.startPage}-${chunk.endPage}.pdf`;
    let fileId: string | null = null;

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

  // Phase 2: fewer chat calls over extracted text (avoids 11 sequential chat timeouts).
  const chatBatches = buildExtractBatches(extractedParts);

  const allComplications: MedicalComplication[] = [];
  const rawParts: string[] = [];
  const chatErrors: string[] = [];
  let recordPatientName: string | null = null;

  for (let i = 0; i < chatBatches.length; i++) {
    const batch = chatBatches[i];
    try {
      const { text, raw } = await callKimiChat([
        { role: 'system', content: REVIEW_SYSTEM_PROMPT },
        { role: 'system', content: batch.text },
        {
          role: 'user',
          content:
            `Review the medical record above and report only the significant complications, ` +
            `each with a short summary and the page number taken from its [[PAGE n START]] / [[PAGE n END]] markers. ` +
            (batch.startPage === 1
              ? `Read the patient's full name from the content between [[PAGE 1 START]] and [[PAGE 1 END]] and return it as patientName. `
              : `Return patientName as null because this section does not contain page 1. `) +
            `This section covers ORIGINAL pages ${batch.startPage}-${batch.endPage}. Return JSON only.`,
        },
      ]);

      const parsed = extractJsonObject(text) as {
        patientName?: unknown;
        complications?: unknown;
      };
      if (batch.startPage === 1 && typeof parsed.patientName === 'string') {
        recordPatientName = parsed.patientName.trim() || null;
      }
      allComplications.push(
        ...remapChunkPages(normalizeComplications(parsed), batch.startPage, batch.endPage)
      );
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

  if (allComplications.length === 0 && chatErrors.length > 0) {
    throw new Error(chatErrors[0]);
  }

  const complications = dedupeComplications(allComplications);

  // Phase 3: one pass over the merged findings for the opening/closing paragraphs.
  let intro = '';
  let summary = '';
  try {
    const overview = await callKimiForOverview(
      complications,
      pageCount,
      recordPatientName || options?.patientName
    );
    intro = overview.intro;
    summary = overview.summary;
    rawParts.push(JSON.stringify({ overview: overview.raw }));
  } catch (error: any) {
    chatErrors.push(`overview: ${error?.message || 'failed'}`);
  }

  const notes = [...extractErrors, ...chatErrors];
  if (notes.length) {
    rawParts.push(JSON.stringify({ warnings: notes }));
  }

  return {
    complications,
    intro,
    summary,
    rawAiResponse: `[${rawParts.join(',')}]`,
    pageCount,
  };
}

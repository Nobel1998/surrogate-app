import { PDFDocument } from 'pdf-lib';
import type { MedicalComplication } from '@/lib/medicalRecordReviews';

const DEFAULT_BASE_URL = 'https://api.moonshot.ai/v1';
const DEFAULT_MODEL = 'kimi-k3';
const PAGES_PER_CHUNK = 8;
const UPLOAD_MAX_ATTEMPTS = 3;
const CHAT_MAX_ATTEMPTS = 2;
const CHAT_TIMEOUT_MS = 15 * 60 * 1000;
const CHAT_BATCH_CHAR_LIMIT = 60000;

const REVIEW_SYSTEM_PROMPT = `You review medical records and extract complications only.
Return ONLY valid JSON with this exact shape:
{"complications":[{"complication":"string","page":1}]}
Rules:
- List medical complications found in the document.
- Each item MUST include the page number where it appears.
- If there are no complications, return {"complications":[]}.
- Do not summarize the full record.
- Do not include routine findings or administrative text unless they clearly describe a complication.
- page must be an integer (1-based) using the ORIGINAL document page numbers provided in the instructions.`;

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
    const note = String((item as { note?: unknown }).note || '').trim();
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
    const pageIndexes = Array.from({ length: end - start }, (_, i) => start + i);
    const copied = await chunkDoc.copyPages(source, pageIndexes);
    copied.forEach((page) => chunkDoc.addPage(page));
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
  extractedText: string,
  pageCount: number,
  pageRange?: { startPage: number; endPage: number }
): Promise<{ text: string; raw: string }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Missing MOONSHOT_API_KEY (or KIMI_API_KEY)');
  }

  const rangeHint = pageRange
    ? `This section covers ORIGINAL pages ${pageRange.startPage}-${pageRange.endPage}. ` +
      `Always report absolute original page numbers in that range.`
    : `The document has approximately ${pageCount || 'unknown'} pages.`;

  const userPrompt =
    `Extract complications with page numbers from the medical record above. ` +
    `${rangeHint} Return JSON only.`;

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
          messages: [
            { role: 'system', content: REVIEW_SYSTEM_PROMPT },
            { role: 'system', content: extractedText },
            { role: 'user', content: userPrompt },
          ],
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
        if (reasoning.includes('{') && reasoning.includes('complications')) {
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
  }
): Promise<{
  complications: MedicalComplication[];
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

  for (let i = 0; i < chatBatches.length; i++) {
    const batch = chatBatches[i];
    try {
      const { text, raw } = await callKimiChat(batch.text, pageCount, {
        startPage: batch.startPage,
        endPage: batch.endPage,
      });

      const parsed = extractJsonObject(text);
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

  const notes = [...extractErrors, ...chatErrors];
  if (notes.length) {
    rawParts.push(JSON.stringify({ warnings: notes }));
  }

  return {
    complications: dedupeComplications(allComplications),
    rawAiResponse: `[${rawParts.join(',')}]`,
    pageCount,
  };
}

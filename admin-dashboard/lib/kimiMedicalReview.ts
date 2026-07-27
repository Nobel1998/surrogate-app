import { PDFDocument } from 'pdf-lib';
import type { MedicalComplication } from '@/lib/medicalRecordReviews';

const DEFAULT_BASE_URL = 'https://api.moonshot.ai/v1';
const DEFAULT_MODEL = 'kimi-k3';

const REVIEW_SYSTEM_PROMPT = `You review medical records and extract complications only.
Return ONLY valid JSON with this exact shape:
{"complications":[{"complication":"string","page":1}]}
Rules:
- List medical complications found in the document.
- Each item MUST include the page number where it appears.
- If there are no complications, return {"complications":[]}.
- Do not summarize the full record.
- Do not include routine findings or administrative text unless they clearly describe a complication.
- page must be an integer (1-based).`;

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

async function uploadPdfForExtract(pdfBytes: Uint8Array, fileName: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Missing MOONSHOT_API_KEY (or KIMI_API_KEY)');
  }

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
}

async function getExtractedFileContent(fileId: string): Promise<string> {
  const apiKey = getApiKey();
  const resp = await fetch(`${getBaseUrl()}/files/${fileId}/content`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const bodyText = await resp.text();
  if (!resp.ok) {
    throw new Error(`File content failed (${resp.status}): ${bodyText.slice(0, 500)}`);
  }
  if (!bodyText.trim()) {
    throw new Error('Extracted file content was empty');
  }
  return bodyText;
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

async function callKimiChat(extractedText: string, pageCount: number): Promise<{ text: string; raw: string }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Missing MOONSHOT_API_KEY (or KIMI_API_KEY)');
  }

  const userPrompt =
    `Extract complications with page numbers from the medical record above. ` +
    `The document has approximately ${pageCount || 'unknown'} pages. ` +
    `Return JSON only.`;

  const resp = await fetch(`${getBaseUrl()}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: getModel(),
      temperature: 0.1,
      messages: [
        { role: 'system', content: REVIEW_SYSTEM_PROMPT },
        { role: 'system', content: extractedText },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  const bodyText = await resp.text();
  if (!resp.ok) {
    throw new Error(`AI review failed (${resp.status}): ${bodyText.slice(0, 500)}`);
  }

  let data: {
    choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
  };
  try {
    data = JSON.parse(bodyText);
  } catch {
    throw new Error('AI review returned non-JSON response');
  }

  const content = data.choices?.[0]?.message?.content;
  let text = '';
  if (typeof content === 'string') {
    text = content.trim();
  } else if (Array.isArray(content)) {
    text = content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('\n')
      .trim();
  }

  if (!text) {
    throw new Error('AI review returned empty content');
  }

  return { text, raw: bodyText };
}

export async function analyzeMedicalRecordPdf(
  pdfBytes: Uint8Array,
  options?: { fileName?: string }
): Promise<{
  complications: MedicalComplication[];
  rawAiResponse: string;
  pageCount: number;
}> {
  const pageCount = await countPdfPages(pdfBytes);
  const fileName = options?.fileName || 'medical-record.pdf';

  let fileId: string | null = null;
  try {
    fileId = await uploadPdfForExtract(pdfBytes, fileName);
    const extractedText = await getExtractedFileContent(fileId);
    const { text, raw } = await callKimiChat(extractedText, pageCount);
    const parsed = extractJsonObject(text);

    return {
      complications: dedupeComplications(normalizeComplications(parsed)),
      rawAiResponse: raw,
      pageCount,
    };
  } finally {
    if (fileId) {
      await deleteRemoteFile(fileId);
    }
  }
}

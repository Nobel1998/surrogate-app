import { PDFDocument } from 'pdf-lib';
import type { MedicalComplication } from '@/lib/medicalRecordReviews';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const PAGES_PER_CHUNK = 80;

const SYSTEM_PROMPT = `You review medical records and extract complications only.
Return ONLY valid JSON with this exact shape:
{"complications":[{"complication":"string","page":1}]}
Rules:
- List medical complications found in the document.
- Each item MUST include the page number where it appears.
- If there are no complications, return {"complications":[]}.
- Do not summarize the full record.
- Do not include routine findings or administrative text unless they clearly describe a complication.
- page must be an integer.`;

function getApiKey() {
  return process.env.ANTHROPIC_API_KEY || '';
}

function getModel() {
  return process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
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
    throw new Error('Claude did not return valid JSON');
  }
}

function normalizeComplications(raw: unknown, pageOffset: number): MedicalComplication[] {
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
    const absolutePage = Math.max(1, Math.round(pageNum) + pageOffset);
    const note = String((item as { note?: unknown }).note || '').trim();
    results.push(note ? { complication, page: absolutePage, note } : { complication, page: absolutePage });
  }
  return results;
}

async function callClaudeWithPdf(pdfBase64: string, userText: string): Promise<{ text: string; raw: string }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY');
  }

  const resp = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: getModel(),
      max_tokens: 4096,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            { type: 'text', text: userText },
          ],
        },
      ],
    }),
  });

  const bodyText = await resp.text();
  if (!resp.ok) {
    throw new Error(`Anthropic API failed (${resp.status}): ${bodyText.slice(0, 500)}`);
  }

  let data: { content?: Array<{ type?: string; text?: string }> };
  try {
    data = JSON.parse(bodyText);
  } catch {
    throw new Error('Anthropic API returned non-JSON response');
  }

  const text = (data.content || [])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text as string)
    .join('\n')
    .trim();

  if (!text) {
    throw new Error('Anthropic API returned empty content');
  }

  return { text, raw: bodyText };
}

async function splitPdfByPageRanges(pdfBytes: Uint8Array): Promise<
  Array<{ bytes: Uint8Array; startPage: number; endPage: number }>
> {
  const source = await PDFDocument.load(pdfBytes);
  const pageCount = source.getPageCount();
  if (pageCount <= 0) {
    throw new Error('PDF has no pages');
  }

  const chunks: Array<{ bytes: Uint8Array; startPage: number; endPage: number }> = [];
  for (let start = 0; start < pageCount; start += PAGES_PER_CHUNK) {
    const end = Math.min(pageCount, start + PAGES_PER_CHUNK);
    const chunkDoc = await PDFDocument.create();
    const indices = Array.from({ length: end - start }, (_, i) => start + i);
    const copied = await chunkDoc.copyPages(source, indices);
    copied.forEach((page) => chunkDoc.addPage(page));
    const bytes = await chunkDoc.save();
    chunks.push({
      bytes: bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes),
      startPage: start + 1,
      endPage: end,
    });
  }
  return chunks;
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

export async function analyzeMedicalRecordPdf(pdfBytes: Uint8Array): Promise<{
  complications: MedicalComplication[];
  rawAiResponse: string;
  pageCount: number;
}> {
  const chunks = await splitPdfByPageRanges(pdfBytes);
  const pageCount = chunks.length ? chunks[chunks.length - 1].endPage : 0;
  const all: MedicalComplication[] = [];
  const rawParts: string[] = [];

  for (const chunk of chunks) {
    const base64 = Buffer.from(chunk.bytes).toString('base64');
    // Ask Claude for pages relative to this chunk (1 = first page of chunk), then add offset.
    const pageOffset = chunk.startPage - 1;
    const userText =
      `Extract complications from this medical record PDF chunk. ` +
      `Use page numbers relative to THIS chunk only (page 1 is the first page of this file). ` +
      `This chunk is absolute pages ${chunk.startPage}-${chunk.endPage} of the full record. ` +
      `Return JSON only.`;

    const { text, raw } = await callClaudeWithPdf(base64, userText);
    rawParts.push(raw);
    const parsed = extractJsonObject(text);
    all.push(...normalizeComplications(parsed, pageOffset));
  }

  return {
    complications: dedupeComplications(all),
    rawAiResponse: rawParts.join('\n---\n'),
    pageCount,
  };
}

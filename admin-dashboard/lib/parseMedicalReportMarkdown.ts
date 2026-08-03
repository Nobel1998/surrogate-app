/** Lightweight Markdown block parser for medical record reports (headings, tables, paragraphs). */

export type ReportHeadingBlock = {
  type: 'heading';
  level: 1 | 2 | 3;
  text: string;
};

export type ReportParagraphBlock = {
  type: 'paragraph';
  text: string;
};

export type ReportTableBlock = {
  type: 'table';
  headers: string[];
  rows: string[][];
};

export type ReportListBlock = {
  type: 'list';
  ordered: boolean;
  items: string[];
};

export type ReportBlock =
  | ReportHeadingBlock
  | ReportParagraphBlock
  | ReportTableBlock
  | ReportListBlock;

function splitCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  const cells = splitCells(line);
  if (cells.length === 0) return false;
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, '')));
}

function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.includes('|') && (t.startsWith('|') || /\|/.test(t));
}

/**
 * Parse medical-report Markdown into structured blocks.
 * Supports: #/##/### headings, GFM tables, bullet/numbered lists, paragraphs.
 */
export function parseMedicalReportMarkdown(markdown: string): ReportBlock[] {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const blocks: ReportBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2].trim(),
      });
      i += 1;
      continue;
    }

    // Markdown table: header + separator + body rows
    if (
      isTableRow(trimmed) &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1].trim())
    ) {
      const headers = splitCells(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i].trim()) && !isTableSeparator(lines[i].trim())) {
        const cells = splitCells(lines[i]);
        // Pad / trim to header width for stable columns
        const row = headers.map((_, idx) => cells[idx] ?? '');
        rows.push(row);
        i += 1;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // Bullet / ordered list
    if (/^[-*•]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
      const ordered = /^\d+[.)]\s+/.test(trimmed);
      const items: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (!t) break;
        const bullet = t.match(/^[-*•]\s+(.+)$/);
        const numbered = t.match(/^\d+[.)]\s+(.+)$/);
        if (ordered && numbered) {
          items.push(numbered[1].trim());
          i += 1;
          continue;
        }
        if (!ordered && bullet) {
          items.push(bullet[1].trim());
          i += 1;
          continue;
        }
        break;
      }
      if (items.length) {
        blocks.push({ type: 'list', ordered, items });
        continue;
      }
    }

    // Paragraph: gather consecutive non-empty, non-special lines
    const parts: string[] = [trimmed];
    i += 1;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (!next) break;
      if (/^#{1,3}\s+/.test(next)) break;
      if (isTableRow(next) && i + 1 < lines.length && isTableSeparator(lines[i + 1].trim())) break;
      if (/^[-*•]\s+/.test(next) || /^\d+[.)]\s+/.test(next)) break;
      parts.push(next);
      i += 1;
    }
    blocks.push({ type: 'paragraph', text: parts.join(' ') });
  }

  return blocks;
}

/** Strip simple inline markdown markers for plain-text PDF cells. */
export function stripInlineMarkdown(text: string): string {
  return String(text || '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .trim();
}

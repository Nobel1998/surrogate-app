import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MEDICAL_RECORD_REVIEW_DISCLAIMER } from './medicalRecordReviewConstants';
import {
  parseMedicalReportMarkdown,
  stripInlineMarkdown,
} from './parseMedicalReportMarkdown';

export type MedicalRecordReviewComplication = {
  complication: string;
  page: number;
  note?: string;
};

export type MedicalRecordReviewForPDF = {
  id: string;
  title?: string | null;
  file_name?: string | null;
  file_url?: string | null;
  file_deleted_at?: string | null;
  status?: string | null;
  complications?: MedicalRecordReviewComplication[] | null;
  intro?: string | null;
  summary?: string | null;
  clinic_report?: string | null;
  staff_report?: string | null;
  complexity_tier?: number | null;
  analyzed_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type MedicalRecordReviewPDFContext = {
  surrogateName?: string | null;
  matchLabel?: string | null;
};

export type MedicalRecordReportKind = 'clinic' | 'staff' | 'legacy';

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return 'N/A';
  return String(value);
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString('en-US');
};

function writeWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y, { lineHeightFactor: 1.35 });
  return lines.length * lineHeight;
}

export const generateMedicalRecordReviewPDF = (
  review: MedicalRecordReviewForPDF,
  context: MedicalRecordReviewPDFContext = {},
  kind: MedicalRecordReportKind = 'clinic'
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const maxWidth = pageWidth - margin * 2;
  let yPosition = 20;

  const ensureSpace = (needed: number) => {
    if (yPosition + needed > pageHeight - 18) {
      doc.addPage();
      yPosition = 20;
    }
  };

  const isStaff = kind === 'staff';
  const title =
    kind === 'staff'
      ? 'Medical Record Review — Internal Staff'
      : kind === 'clinic'
        ? 'Medical Record Review — Clinic'
        : 'Medical Record Review';

  doc.setFontSize(20);
  doc.setTextColor(102, 51, 153);
  doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  if (isStaff) {
    doc.setFontSize(10);
    doc.setTextColor(180, 40, 40);
    doc.text('INTERNAL USE ONLY — Do not share with IPs, clinics, or surrogates', pageWidth / 2, yPosition, {
      align: 'center',
    });
    yPosition += 8;
  }

  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(
    formatValue(review.title || review.file_name || 'Medical Record'),
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );
  yPosition += 7;
  const tierLabel =
    isStaff && review.complexity_tier
      ? ` | Complexity Tier ${review.complexity_tier}`
      : '';
  doc.text(
    `Status: ${(review.status || 'unknown').toUpperCase()}${tierLabel}`,
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );
  yPosition += 12;

  // Disclaimer box (clinic + legacy; staff has its own section 6)
  if (kind !== 'staff') {
    const disclaimerLines = doc.splitTextToSize(MEDICAL_RECORD_REVIEW_DISCLAIMER, maxWidth - 8);
    const boxHeight = disclaimerLines.length * 4.2 + 8;
    ensureSpace(boxHeight + 6);
    doc.setFillColor(252, 248, 243);
    doc.setDrawColor(210, 180, 140);
    doc.roundedRect(margin, yPosition - 2, maxWidth, boxHeight, 2, 2, 'FD');
    doc.setFontSize(9);
    doc.setTextColor(90, 70, 40);
    doc.text(disclaimerLines, margin + 4, yPosition + 4, { lineHeightFactor: 1.35 });
    yPosition += boxHeight + 10;
  }

  doc.setFontSize(14);
  doc.setTextColor(102, 51, 153);
  doc.text('Record Details', margin, yPosition);
  yPosition += 3;

  autoTable(doc, {
    startY: yPosition,
    head: [],
    body: [
      ['Surrogate', formatValue(context.surrogateName)],
      ['Match', formatValue(context.matchLabel)],
      ['File Name', formatValue(review.file_name)],
      ['Reviewed At', formatDateTime(review.reviewed_at || review.analyzed_at)],
      ['Reviewed By', formatValue(review.reviewed_by_name)],
    ] as [string, string][],
    theme: 'plain',
    styles: { fontSize: 11, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, textColor: [80, 80, 80] },
      1: { cellWidth: 'auto', textColor: [0, 0, 0] },
    },
    margin: { left: margin },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 12;

  const reportText =
    kind === 'staff'
      ? review.staff_report
      : kind === 'clinic'
        ? review.clinic_report
        : null;

  if (reportText && String(reportText).trim()) {
    const blocks = parseMedicalReportMarkdown(String(reportText));
    const headFill: [number, number, number] = isStaff ? [67, 56, 202] : [51, 65, 85];

    for (const block of blocks) {
      if (block.type === 'heading') {
        ensureSpace(16);
        doc.setFontSize(block.level === 1 ? 14 : 12);
        doc.setTextColor(102, 51, 153);
        const text = stripInlineMarkdown(block.text);
        yPosition += writeWrappedText(doc, text, margin, yPosition, maxWidth, 6) + 5;
        continue;
      }

      if (block.type === 'paragraph') {
        doc.setFontSize(10);
        doc.setTextColor(30);
        const text = stripInlineMarkdown(block.text);
        const blockH = doc.splitTextToSize(text, maxWidth).length * 5 + 2;
        ensureSpace(blockH);
        yPosition += writeWrappedText(doc, text, margin, yPosition, maxWidth, 5) + 3;
        continue;
      }

      if (block.type === 'list') {
        doc.setFontSize(10);
        doc.setTextColor(30);
        for (let itemIdx = 0; itemIdx < block.items.length; itemIdx++) {
          const prefix = block.ordered ? `${itemIdx + 1}. ` : '• ';
          const text = `${prefix}${stripInlineMarkdown(block.items[itemIdx])}`;
          const blockH = doc.splitTextToSize(text, maxWidth - 4).length * 5 + 1;
          ensureSpace(blockH);
          yPosition += writeWrappedText(doc, text, margin + 2, yPosition, maxWidth - 4, 5) + 1;
        }
        yPosition += 3;
        continue;
      }

      if (block.type === 'table') {
        ensureSpace(24);
        const colCount = Math.max(block.headers.length, 1);
        const pageColWidth = (maxWidth - 2) / colCount;
        autoTable(doc, {
          startY: yPosition,
          head: [block.headers.map(stripInlineMarkdown)],
          body:
            block.rows.length > 0
              ? block.rows.map((row) => row.map(stripInlineMarkdown))
              : [block.headers.map(() => '—')],
          theme: 'grid',
          headStyles: {
            fillColor: headFill,
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
            cellPadding: 3,
            valign: 'middle',
          },
          bodyStyles: {
            fontSize: 9,
            cellPadding: 3,
            valign: 'top',
            textColor: [30, 30, 30],
            lineColor: [200, 200, 210],
            lineWidth: 0.2,
          },
          alternateRowStyles: {
            fillColor: isStaff ? [238, 242, 255] : [248, 250, 252],
          },
          columnStyles: Object.fromEntries(
            block.headers.map((_, idx) => [idx, { cellWidth: pageColWidth }])
          ),
          margin: { left: margin, right: margin },
          tableWidth: maxWidth,
        });
        yPosition = (doc as any).lastAutoTable.finalY + 8;
      }
    }
  } else {
    // Legacy fallback: intro / events / summary
    const complications = Array.isArray(review.complications) ? review.complications : [];
    if (review.intro) {
      ensureSpace(20);
      doc.setFontSize(13);
      doc.setTextColor(102, 51, 153);
      doc.text('Introductory', margin, yPosition);
      yPosition += 7;
      doc.setFontSize(11);
      doc.setTextColor(0);
      yPosition +=
        writeWrappedText(doc, review.intro, margin, yPosition, maxWidth, 5.5) + 8;
    }

    ensureSpace(20);
    doc.setFontSize(13);
    doc.setTextColor(102, 51, 153);
    doc.text(`Events (${complications.length})`, margin, yPosition);
    yPosition += 4;

    if (complications.length === 0) {
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text('No events found.', margin, yPosition + 6);
      yPosition += 14;
    } else {
      autoTable(doc, {
        startY: yPosition,
        head: [['Event', 'Details', 'Page']],
        body: complications.map((item) => [
          formatValue(item.complication),
          formatValue(item.note),
          formatValue(item.page),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [102, 51, 153], textColor: [255, 255, 255], fontSize: 11 },
        styles: { fontSize: 10, cellPadding: 3, valign: 'top' },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 18, halign: 'center' },
        },
        margin: { left: margin, right: margin },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    if (review.summary) {
      ensureSpace(20);
      doc.setFontSize(13);
      doc.setTextColor(102, 51, 153);
      doc.text('Summary', margin, yPosition);
      yPosition += 7;
      doc.setFontSize(11);
      doc.setTextColor(0);
      yPosition +=
        writeWrappedText(doc, review.summary, margin, yPosition, maxWidth, 5.5) + 6;
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    const footer =
      kind === 'staff'
        ? `Page ${i} of ${pageCount} | INTERNAL ONLY | ${new Date().toLocaleString('en-US')} | Babytree Surrogacy`
        : `Page ${i} of ${pageCount} | Generated on ${new Date().toLocaleString('en-US')} | Babytree Surrogacy`;
    doc.text(footer, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  const kindTag = kind === 'staff' ? 'Staff' : kind === 'clinic' ? 'Clinic' : 'Review';
  const label = (review.title || context.surrogateName || review.file_name || 'Record')
    .replace(/\.pdf$/i, '')
    .replace(/[^\w\u4e00-\u9fff-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'Record';
  doc.save(
    `Medical_Record_${kindTag}_${label}_${new Date().toISOString().split('T')[0]}.pdf`
  );
};

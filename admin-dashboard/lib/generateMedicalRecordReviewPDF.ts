import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MEDICAL_RECORD_REVIEW_DISCLAIMER } from './medicalRecordReviewConstants';

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

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return 'N/A';
  return String(value);
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString('en-US');
};

export const generateMedicalRecordReviewPDF = (
  review: MedicalRecordReviewForPDF,
  context: MedicalRecordReviewPDFContext = {}
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const complications = Array.isArray(review.complications) ? review.complications : [];
  let yPosition = 20;

  doc.setFontSize(24);
  doc.setTextColor(102, 51, 153);
  doc.text('Medical Record Review', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 11;

  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text(
    formatValue(review.title || review.file_name || 'Medical Record'),
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );
  yPosition += 7;
  doc.text(
    `Status: ${(review.status || 'unknown').toUpperCase()} | Findings: ${complications.length}`,
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );
  yPosition += 16;

  // Non-clinical disclaimer — shown before any clinical-looking content
  {
    const disclaimerLines = doc.splitTextToSize(
      MEDICAL_RECORD_REVIEW_DISCLAIMER,
      pageWidth - 36
    );
    const boxPad = 4;
    const boxHeight = disclaimerLines.length * 4.2 + boxPad * 2;
    doc.setFillColor(252, 248, 243);
    doc.setDrawColor(210, 180, 140);
    doc.roundedRect(14, yPosition - 2, pageWidth - 28, boxHeight, 2, 2, 'FD');
    doc.setFontSize(9);
    doc.setTextColor(90, 70, 40);
    doc.text(disclaimerLines, 14 + boxPad, yPosition + boxPad + 2.5, {
      lineHeightFactor: 1.35,
    });
    yPosition += boxHeight + 10;
  }

  doc.setFontSize(16);
  doc.setTextColor(102, 51, 153);
  doc.text('Record Details', 14, yPosition);
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
    styles: { fontSize: 12, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, textColor: [80, 80, 80] },
      1: { cellWidth: 'auto', textColor: [0, 0, 0] },
    },
    margin: { left: 14 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 12;

  const paragraphLineHeight = 6;

  const writeParagraph = (heading: string, body: string) => {
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(body, pageWidth - 28);
    const blockHeight = lines.length * paragraphLineHeight + 16;

    if (yPosition + blockHeight > 280) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setTextColor(102, 51, 153);
    doc.text(heading, 14, yPosition);
    yPosition += 8;

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(lines, 14, yPosition, { lineHeightFactor: 1.4 });
    yPosition += lines.length * paragraphLineHeight + 8;
  };

  if (review.intro) {
    writeParagraph('Introductory', review.intro);
  }

  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(16);
  doc.setTextColor(102, 51, 153);
  doc.text(`Events (${complications.length})`, 14, yPosition);
  yPosition += 3;

  if (complications.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text('No events found.', 14, yPosition + 7);
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
      headStyles: { fillColor: [102, 51, 153], textColor: [255, 255, 255], fontSize: 12 },
      styles: { fontSize: 12, cellPadding: 3.5, valign: 'top' },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 18, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });
  }

  if (review.summary) {
    yPosition =
      complications.length === 0
        ? yPosition + 18
        : (doc as any).lastAutoTable.finalY + 12;
    writeParagraph('Summary', review.summary);
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount} | Generated on ${new Date().toLocaleString('en-US')} | Babytree Surrogacy`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  const label = (review.title || context.surrogateName || review.file_name || 'Record')
    .replace(/\.pdf$/i, '')
    .replace(/[^\w\u4e00-\u9fff-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'Record';
  doc.save(`Medical_Record_Review_${label}_${new Date().toISOString().split('T')[0]}.pdf`);
};

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  conclusion?: string | null;
  analyzed_at?: string | null;
  reviewed_at?: string | null;
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

  doc.setFontSize(20);
  doc.setTextColor(102, 51, 153);
  doc.text('Medical Record Review', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(
    formatValue(review.title || review.file_name || 'Medical Record'),
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );
  yPosition += 6;
  doc.text(
    `Status: ${(review.status || 'unknown').toUpperCase()} | Findings: ${complications.length}`,
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );
  yPosition += 15;

  doc.setFontSize(14);
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
      ['Uploaded At', formatDateTime(review.created_at)],
      ['Analyzed At', formatDateTime(review.analyzed_at)],
      ['Reviewed At', formatDateTime(review.reviewed_at)],
      [
        'Source PDF',
        review.file_deleted_at
          ? `Deleted after review (${formatDateTime(review.file_deleted_at)})`
          : 'Available in storage',
      ],
    ] as [string, string][],
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, textColor: [80, 80, 80] },
      1: { cellWidth: 'auto', textColor: [0, 0, 0] },
    },
    margin: { left: 14 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 12;

  const writeParagraph = (heading: string, body: string) => {
    const lines = doc.splitTextToSize(body, pageWidth - 28);
    const blockHeight = lines.length * 5 + 14;

    if (yPosition + blockHeight > 280) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(102, 51, 153);
    doc.text(heading, 14, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(lines, 14, yPosition);
    yPosition += lines.length * 5 + 7;
  };

  if (review.intro) {
    writeParagraph('Introductory', review.intro);
  }

  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setTextColor(102, 51, 153);
  doc.text(`Complications (${complications.length})`, 14, yPosition);
  yPosition += 3;

  if (complications.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('No complications found.', 14, yPosition + 6);
  } else {
    autoTable(doc, {
      startY: yPosition,
      head: [['Page', 'Complication', 'Summary']],
      body: complications.map((item) => [
        formatValue(item.page),
        formatValue(item.complication),
        formatValue(item.note),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [102, 51, 153], textColor: [255, 255, 255], fontSize: 10 },
      styles: { fontSize: 10, cellPadding: 3, valign: 'top' },
      columnStyles: {
        0: { cellWidth: 18, halign: 'center' },
        1: { cellWidth: 90 },
        2: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14 },
    });
  }

  if (review.conclusion) {
    yPosition =
      complications.length === 0
        ? yPosition + 16
        : (doc as any).lastAutoTable.finalY + 12;
    writeParagraph('Overall Summary', review.conclusion);
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
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

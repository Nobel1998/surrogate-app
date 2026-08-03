'use client';

import {
  parseMedicalReportMarkdown,
  type ReportBlock,
} from '@/lib/parseMedicalReportMarkdown';

type Props = {
  markdown: string;
  /** Visual variant for clinic vs staff panels */
  variant?: 'clinic' | 'staff';
};

function renderInline(text: string) {
  // Minimal bold support: **text**
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) {
      return (
        <strong key={i} className="font-semibold">
          {bold[1]}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function ReportBlocks({ blocks, variant }: { blocks: ReportBlock[]; variant: 'clinic' | 'staff' }) {
  const headingColor = variant === 'staff' ? 'text-indigo-950' : 'text-gray-900';
  const bodyColor = variant === 'staff' ? 'text-indigo-950' : 'text-gray-800';
  const headingBorder = variant === 'staff' ? 'border-indigo-200' : 'border-slate-200';
  const tableHead = 'bg-indigo-700 text-white';
  const tableStripe = 'even:bg-indigo-50/80';
  const tableBorder = 'border-indigo-200';

  return (
    <div className={`space-y-4 text-sm leading-relaxed ${bodyColor}`}>
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          const size =
            block.level === 1 ? 'text-lg' : block.level === 2 ? 'text-base' : 'text-sm';
          return (
            <h4
              key={idx}
              className={`${size} font-semibold ${headingColor} pt-1 border-b ${headingBorder} pb-1`}
            >
              {renderInline(block.text)}
            </h4>
          );
        }

        if (block.type === 'paragraph') {
          return (
            <p key={idx} className="whitespace-pre-wrap">
              {renderInline(block.text)}
            </p>
          );
        }

        if (block.type === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul';
          return (
            <ListTag
              key={idx}
              className={`pl-5 space-y-1 ${block.ordered ? 'list-decimal' : 'list-disc'}`}
            >
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx}>{renderInline(item)}</li>
              ))}
            </ListTag>
          );
        }

        if (block.type === 'table') {
          return (
            <div
              key={idx}
              className={`overflow-x-auto rounded-lg border ${tableBorder} shadow-sm bg-white`}
            >
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className={tableHead}>
                    {block.headers.map((header, hIdx) => (
                      <th
                        key={hIdx}
                        className="px-3 py-2.5 text-left font-semibold whitespace-nowrap border-r border-white/20 last:border-r-0"
                      >
                        {renderInline(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={Math.max(block.headers.length, 1)}
                        className="px-3 py-3 text-gray-500 italic"
                      >
                        No rows
                      </td>
                    </tr>
                  ) : (
                    block.rows.map((row, rIdx) => (
                      <tr key={rIdx} className={`border-t ${tableBorder} ${tableStripe}`}>
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className={`px-3 py-2.5 align-top border-r ${tableBorder} last:border-r-0`}
                          >
                            {cell ? renderInline(cell) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

export default function MedicalReportMarkdown({ markdown, variant = 'clinic' }: Props) {
  const blocks = parseMedicalReportMarkdown(markdown);
  if (!blocks.length) {
    return <p className="text-sm text-gray-500">Empty report.</p>;
  }
  return <ReportBlocks blocks={blocks} variant={variant} />;
}

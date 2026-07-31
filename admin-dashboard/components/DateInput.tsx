'use client';

import React from 'react';

type DateFormat = 'YYYY-MM-DD' | 'MM-DD-YYYY' | 'MM/DD/YYYY';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function parseToParts(value?: string | null): { y: number; m: number; d: number } | null {
  const s = String(value || '').trim();
  if (!s) return null;

  let match = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (match) {
    return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
  }

  match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    return { y: Number(match[3]), m: Number(match[1]), d: Number(match[2]) };
  }

  return null;
}

function toIsoValue(value?: string | null): string {
  const parts = parseToParts(value);
  if (!parts) return '';
  return `${parts.y}-${pad(parts.m)}-${pad(parts.d)}`;
}

function fromIsoValue(iso: string, format: DateFormat): string {
  if (!iso) return '';
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  const [, y, m, d] = match;
  if (format === 'YYYY-MM-DD') return `${y}-${m}-${d}`;
  if (format === 'MM/DD/YYYY') return `${m}/${d}/${y}`;
  return `${m}-${d}-${y}`;
}

type Props = {
  value?: string | null;
  onChange: (next: string) => void;
  /** Storage/display format expected by the parent form. Native input always uses YYYY-MM-DD. */
  format?: DateFormat;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
};

/**
 * Clickable native date picker that preserves existing stored date formats.
 */
export default function DateInput({
  value,
  onChange,
  format = 'YYYY-MM-DD',
  className = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
  required,
  disabled,
  id,
  name,
}: Props) {
  return (
    <input
      id={id}
      name={name}
      type="date"
      required={required}
      disabled={disabled}
      value={toIsoValue(value)}
      onChange={(e) => onChange(fromIsoValue(e.target.value, format))}
      className={className}
    />
  );
}

'use client';

import { useState, useEffect } from 'react';

const DOCUMENT_TYPE = 'benefit_package';

interface GlobalDoc {
  document_type: string;
  file_url: string;
  file_name: string;
  updated_at: string;
}

export default function BenefitPackagePage() {
  const [current, setCurrent] = useState<GlobalDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCurrent = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/global-documents?document_type=${DOCUMENT_TYPE}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to load: ${res.status}`);
      }
      const data = await res.json();
      setCurrent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrent();
  }, []);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.querySelector<HTMLInputElement>('input[type="file"]');
    const file = fileInput?.files?.[0];
    if (!file) {
      setError('Please select a PDF file.');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are allowed.');
      return;
    }
    try {
      setUploading(true);
      setError(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', DOCUMENT_TYPE);
      const res = await fetch('/api/global-documents', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Upload failed: ${res.status}`);
      await loadCurrent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      form.reset();
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Benefit Package PDF</h1>
      <p className="text-gray-600 mb-6">
        Upload the Benefit Package PDF. This file will be shown to app users on the Benefits screen instead of the income calculator.
      </p>

      {loading && <p className="text-gray-500">Loading...</p>}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {!loading && (
        <>
          {current && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Current file</p>
              <p className="font-medium text-gray-900">{current.file_name}</p>
              <p className="text-xs text-gray-500 mt-1">
                Updated: {new Date(current.updated_at).toLocaleString()}
              </p>
              <a
                href={current.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-blue-600 hover:underline text-sm"
              >
                Open PDF
              </a>
            </div>
          )}
          {!current && (
            <p className="mb-6 text-gray-500">No Benefit Package PDF has been uploaded yet.</p>
          )}

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload new Benefit Package PDF
              </label>
              <input
                type="file"
                accept=".pdf"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700"
              />
            </div>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload PDF'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

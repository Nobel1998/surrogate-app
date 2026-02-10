'use client';

import { useState, useEffect } from 'react';

export default function BenefitPackagePage() {
  const [currentDoc, setCurrentDoc] = useState<{
    file_url: string | null;
    file_path: string | null;
    updated_at: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    loadCurrent();
  }, []);

  const loadCurrent = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/benefit-package');
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCurrentDoc(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setSuccess(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a PDF file');
      return;
    }
    try {
      setUploading(true);
      setError(null);
      setSuccess(null);
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/benefit-package', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setSuccess('Benefit Package PDF uploaded successfully. App users will see it in the Benefits screen.');
      setFile(null);
      (document.getElementById('pdf-input') as HTMLInputElement).value = '';
      await loadCurrent();
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Benefit Package PDF</h1>
      <p className="text-gray-600 mb-6">
        Upload the Benefit Package PDF. It will replace the income calculator on the app&apos;s Benefits screen; users will see a button to open this PDF.
      </p>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <>
          {currentDoc?.file_url && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Current PDF</p>
              <a
                href={currentDoc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Open current Benefit Package PDF
              </a>
              {currentDoc.updated_at && (
                <p className="text-xs text-gray-500 mt-2">
                  Last updated: {new Date(currentDoc.updated_at).toLocaleString()}
                </p>
              )}
            </div>
          )}
          {!currentDoc?.file_url && (
            <p className="mb-6 text-amber-700">No PDF uploaded yet. App will show &quot;PDF not available&quot; until you upload one.</p>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload new PDF</label>
              <input
                id="pdf-input"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700"
              />
            </div>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || uploading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading…' : 'Upload PDF'}
            </button>
          </div>

          {error && <p className="mt-4 text-red-600">{error}</p>}
          {success && <p className="mt-4 text-green-600">{success}</p>}
        </>
      )}
    </div>
  );
}

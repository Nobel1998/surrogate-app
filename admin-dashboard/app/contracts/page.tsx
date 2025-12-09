'use client';

import { useEffect, useState } from 'react';

type Contract = {
  id: string;
  document_type: string;
  file_url: string;
  file_name?: string | null;
  created_at?: string | null;
  user_id?: string | null;
};

const typeOptions = [
  { key: 'parent', label: 'Parent Contract' },
  { key: 'surrogate', label: 'Surrogate Contract' },
];

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('parent');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadContracts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/contracts');
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to load contracts');
      }
      const data = await res.json();
      setContracts(data.contracts || []);
    } catch (err: any) {
      console.error('Load contracts error', err);
      setError(err.message || 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  const handleUpload = async () => {
    if (!file) {
      alert('Please choose a file');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('contract_type', selectedType);
      fd.append('file', file);
      const res = await fetch('/api/contracts', {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Upload failed');
      }
      setFile(null);
      await loadContracts();
      alert('Uploaded successfully');
    } catch (err: any) {
      console.error('Upload contract error', err);
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Contracts</h1>
        <p className="text-sm text-gray-600 mb-6">
          Upload parent/surrogate contract templates. Files are stored in Supabase storage bucket <code>contracts</code> and recorded in the <code>documents</code> table.
        </p>

        <div className="grid md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Contract type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {typeOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">File</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {file && <div className="text-xs text-gray-500 truncate">Selected: {file.name}</div>}
          </div>

          <div className="space-y-2">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className={`w-full px-4 py-2 rounded-md text-white font-medium ${uploading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} transition-colors`}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
            {error && <div className="text-xs text-red-600">{error}</div>}
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Uploaded Contracts</h2>
          <button
            onClick={loadContracts}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-gray-600">Loading...</div>
        ) : contracts.length === 0 ? (
          <div className="text-sm text-gray-500">No contracts uploaded yet.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {contracts.map((c) => {
              const label = c.document_type === 'parent_contract' ? 'Parent' : 'Surrogate';
              return (
                <div key={c.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {label} Contract
                    </div>
                    <div className="text-xs text-gray-500">
                      {c.file_name || 'Unnamed file'}{' '}
                      {c.created_at ? `· ${new Date(c.created_at).toLocaleString()}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={c.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Download
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


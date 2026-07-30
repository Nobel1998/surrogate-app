export type UploadProgress = {
  bytesUploaded: number;
  bytesTotal: number;
  percentage: number;
};

export function uploadMedicalRecordPdfToSignedUrl(
  signedUrl: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/pdf');

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      // 100% means the browser finished sending bytes, but Storage has not
      // necessarily accepted the object yet. Reserve 100% for a successful response.
      const percentage =
        event.total > 0 ? Math.min(99, (event.loaded / event.total) * 100) : 0;
      onProgress?.({
        bytesUploaded: event.loaded,
        bytesTotal: event.total,
        percentage,
      });
    };

    xhr.onload = () => {
      // #region agent log
      fetch('http://127.0.0.1:7292/ingest/ae0d1be9-2477-4454-828d-6c03ee3b2577', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '5244e3' },
        body: JSON.stringify({
          sessionId: '5244e3',
          runId: 'pre-fix',
          hypothesisId: 'B,C',
          location: 'uploadMedicalRecordPdf.ts:onload',
          message: 'storage PUT completed',
          data: {
            origin: window.location.origin,
            status: xhr.status,
            fileBytes: file.size,
            responsePreview: (xhr.responseText || '').slice(0, 300),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.({
          bytesUploaded: file.size,
          bytesTotal: file.size,
          percentage: 100,
        });
        resolve();
        return;
      }

      let message = `Storage upload failed (${xhr.status})`;
      try {
        const data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        message = data?.message || data?.error || message;
      } catch {
        // Keep the status-based message for non-JSON responses.
      }
      reject(new Error(message));
    };

    xhr.onerror = () => {
      // #region agent log
      fetch('http://127.0.0.1:7292/ingest/ae0d1be9-2477-4454-828d-6c03ee3b2577', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '5244e3' },
        body: JSON.stringify({
          sessionId: '5244e3',
          runId: 'pre-fix',
          hypothesisId: 'B,C',
          location: 'uploadMedicalRecordPdf.ts:onerror',
          message: 'storage PUT network error',
          data: {
            origin: window.location.origin,
            status: xhr.status,
            readyState: xhr.readyState,
            fileBytes: file.size,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      reject(new Error('Storage upload failed: network error'));
    };

    xhr.send(file);
  });
}

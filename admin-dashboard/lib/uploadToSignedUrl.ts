export type UploadProgress = {
  bytesUploaded: number;
  bytesTotal: number;
  percentage: number;
};

/** PUT a file to a Supabase signed upload URL (browser → storage, bypasses Next/Vercel body limits). */
export function uploadFileToSignedUrl(
  signedUrl: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percentage =
        event.total > 0 ? Math.min(99, (event.loaded / event.total) * 100) : 0;
      onProgress?.({
        bytesUploaded: event.loaded,
        bytesTotal: event.total,
        percentage,
      });
    };

    xhr.onload = () => {
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
        // keep status-based message
      }
      reject(new Error(message));
    };

    xhr.onerror = () => {
      reject(new Error('Storage upload failed: network error'));
    };

    xhr.send(file);
  });
}

export type UploadProgress = {
  bytesUploaded: number;
  bytesTotal: number;
  percentage: number;
};

export function uploadMedicalRecordPdfViaServer(
  reviewId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/medical-record-reviews/${reviewId}/upload`);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress?.({
        bytesUploaded: event.loaded,
        bytesTotal: event.total,
        percentage: event.total > 0 ? (event.loaded / event.total) * 100 : 0,
      });
    };

    xhr.onload = () => {
      let data: any = null;
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        reject(new Error(`Server upload failed (${xhr.status}): invalid response`));
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }

      reject(new Error(data?.error || `Server upload failed (${xhr.status})`));
    };

    xhr.onerror = () => {
      reject(new Error('Server upload failed: network error'));
    };

    const formData = new FormData();
    formData.append('file', file);
    xhr.send(formData);
  });
}

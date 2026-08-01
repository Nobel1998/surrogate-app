/** Extract storage object path from a public Supabase documents URL */
export function storagePathFromDocumentsPublicUrl(url: string): string | null {
  const m = String(url).match(/\/storage\/v1\/object\/public\/documents\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Resolve bucket + path for admin-update images (documents or post-media). */
export function storageRefFromPublicUrl(
  url: string
): { bucket: string; path: string } | null {
  const docs = String(url).match(/\/storage\/v1\/object\/public\/documents\/(.+)$/);
  if (docs) {
    return { bucket: 'documents', path: decodeURIComponent(docs[1]) };
  }
  const postMedia = String(url).match(
    /\/storage\/v1\/object\/public\/post-media\/(.+)$/
  );
  if (postMedia) {
    return { bucket: 'post-media', path: decodeURIComponent(postMedia[1]) };
  }
  return null;
}

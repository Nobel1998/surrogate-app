/** Extract storage object path from a public Supabase documents URL */
export function storagePathFromDocumentsPublicUrl(url: string): string | null {
  const m = String(url).match(/\/storage\/v1\/object\/public\/documents\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

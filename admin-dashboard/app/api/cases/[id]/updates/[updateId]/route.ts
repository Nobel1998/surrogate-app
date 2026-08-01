import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { storageRefFromPublicUrl } from '@/lib/matchUpdateImages';
import { isReadOnlyBranchManager } from '@/lib/checkReadOnly';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const STORAGE_BUCKET = 'documents';

export const dynamic = 'force-dynamic';

const MAX_IMAGES_PER_NOTE = 6;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

function buildPublicUrl(storagePath: string) {
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${storagePath}`;
}

function sanitizeFilename(name: string): string {
  const base = name.includes('/') ? name.substring(name.lastIndexOf('/') + 1) : name;
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  return cleaned || 'image';
}

function validateImageFile(file: File): string | null {
  if (file.size > MAX_IMAGE_BYTES) {
    return `Each image must be at most ${MAX_IMAGE_BYTES / (1024 * 1024)}MB`;
  }
  const mime = (file.type || '').toLowerCase();
  if (mime && ALLOWED_MIME_TYPES.has(mime)) {
    return null;
  }
  const lower = file.name.toLowerCase();
  if (/\.(jpe?g|png|webp)$/.test(lower)) {
    return null;
  }
  return 'Only JPG, PNG, and WebP images are allowed';
}

async function assertUpdateBelongsToMatch(
  supabase: any,
  matchId: string,
  updateId: string
) {
  const { data: update, error: fetchError } = await supabase
    .from('match_updates')
    .select('id, match_id, update_type, content, title, stage')
    .eq('id', updateId)
    .single();

  if (fetchError || !update) {
    return { error: NextResponse.json({ error: 'Update not found' }, { status: 404 }) };
  }
  if (update.match_id !== matchId) {
    return {
      error: NextResponse.json(
        { error: 'Update does not belong to this match' },
        { status: 403 }
      ),
    };
  }
  return { update: update as {
    id: string;
    match_id: string;
    update_type: string | null;
    content: string | null;
    title: string | null;
    stage: string | null;
  } };
}

// PATCH edit admin note (content/stage/title + optional image add/remove)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; updateId: string }> }
) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const cookieStore = await cookies();
    const adminUserId = cookieStore.get('admin_user_id')?.value;
    if (await isReadOnlyBranchManager(supabase as any, adminUserId)) {
      return NextResponse.json(
        { error: 'View-only access. You cannot modify data.' },
        { status: 403 }
      );
    }

    const { id: matchId, updateId } = await params;
    const owned = await assertUpdateBelongsToMatch(supabase, matchId, updateId);
    if (owned.error) return owned.error;

    const contentType = req.headers.get('content-type') || '';
    let content: string | null = null;
    let title: string | null | undefined = undefined;
    let stage: string | null | undefined = undefined;
    let removeImageIds: string[] = [];
    let rawFiles: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      if (formData.has('content')) {
        content = String(formData.get('content') ?? '');
      }
      if (formData.has('title')) {
        title = formData.get('title') != null ? String(formData.get('title')) : null;
      }
      if (formData.has('stage')) {
        stage = formData.get('stage') != null ? String(formData.get('stage')) : null;
      }
      const removeRaw = formData.get('remove_image_ids');
      if (typeof removeRaw === 'string' && removeRaw.trim()) {
        try {
          const parsed = JSON.parse(removeRaw);
          if (Array.isArray(parsed)) {
            removeImageIds = parsed.map(String).filter(Boolean);
          }
        } catch {
          return NextResponse.json({ error: 'Invalid remove_image_ids JSON' }, { status: 400 });
        }
      }
      rawFiles = formData
        .getAll('images')
        .filter(
          (x): x is File =>
            typeof x === 'object' &&
            x !== null &&
            'size' in x &&
            typeof (x as Blob).size === 'number' &&
            (x as Blob).size > 0
        );
    } else {
      const body = await req.json();
      if ('content' in body) content = body.content == null ? '' : String(body.content);
      if ('title' in body) title = body.title == null ? null : String(body.title);
      if ('stage' in body) stage = body.stage == null ? null : String(body.stage);
      if (Array.isArray(body.remove_image_ids)) {
        removeImageIds = body.remove_image_ids.map(String).filter(Boolean);
      }
    }

    const { data: existingImages, error: listErr } = await supabase
      .from('match_update_images')
      .select('id, image_url, sort_order')
      .eq('update_id', updateId)
      .order('sort_order', { ascending: true });

    if (listErr) {
      return NextResponse.json(
        { error: listErr.message || 'Failed to load existing images' },
        { status: 500 }
      );
    }

    const existing = existingImages || [];
    const removeSet = new Set(removeImageIds);
    const kept = existing.filter((img) => !removeSet.has(String(img.id)));
    const finalCount = kept.length + rawFiles.length;
    if (finalCount > MAX_IMAGES_PER_NOTE) {
      return NextResponse.json(
        { error: `You can attach at most ${MAX_IMAGES_PER_NOTE} images` },
        { status: 400 }
      );
    }

    const nextContent =
      content !== null ? (content.trim() ? content : null) : owned.update!.content;
    if (!nextContent && finalCount === 0) {
      return NextResponse.json(
        { error: 'Please enter note text or keep at least one image' },
        { status: 400 }
      );
    }

    for (const file of rawFiles) {
      const err = validateImageFile(file);
      if (err) {
        return NextResponse.json({ error: err }, { status: 400 });
      }
    }

    // Remove images first
    if (removeImageIds.length > 0) {
      const toRemove = existing.filter((img) => removeSet.has(String(img.id)));
      const byBucket: Record<string, string[]> = {};
      for (const row of toRemove) {
        const ref = storageRefFromPublicUrl(row.image_url);
        if (!ref) continue;
        if (!byBucket[ref.bucket]) byBucket[ref.bucket] = [];
        byBucket[ref.bucket].push(ref.path);
      }
      for (const [bucket, paths] of Object.entries(byBucket)) {
        if (paths.length > 0) {
          await supabase.storage.from(bucket).remove(paths);
        }
      }
      const { error: delImgErr } = await supabase
        .from('match_update_images')
        .delete()
        .eq('update_id', updateId)
        .in('id', removeImageIds);
      if (delImgErr) {
        return NextResponse.json(
          { error: delImgErr.message || 'Failed to remove images' },
          { status: 500 }
        );
      }
    }

    const updatePayload: Record<string, any> = {
      updated_by: adminUserId || null,
    };
    if (content !== null) updatePayload.content = nextContent;
    if (title !== undefined) updatePayload.title = title;
    if (stage !== undefined) updatePayload.stage = stage;

    const { data: updated, error: updateError } = await supabase
      .from('match_updates')
      .update(updatePayload)
      .eq('id', updateId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Failed to update note' },
        { status: 500 }
      );
    }

    const uploadedPaths: string[] = [];
    try {
      const startOrder =
        kept.reduce((max, img) => Math.max(max, Number(img.sort_order) || 0), -1) + 1;
      for (let i = 0; i < rawFiles.length; i++) {
        const file = rawFiles[i];
        const extMatch = file.name.match(/\.(jpe?g|png|webp)$/i);
        const ext = extMatch ? extMatch[0].toLowerCase() : '.jpg';
        const safeName = sanitizeFilename(file.name);
        const randomStr = Math.random().toString(36).slice(2);
        let path = `admin-updates/${matchId}/${updateId}/${startOrder + i}-${randomStr}-${safeName}`;
        if (!/\.(jpe?g|png|webp)$/i.test(path)) path += ext;

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, file, {
            contentType: file.type || 'image/jpeg',
            upsert: false,
          });
        if (uploadError) throw new Error(uploadError.message || 'Upload failed');
        uploadedPaths.push(path);

        const { error: imgInsertErr } = await supabase.from('match_update_images').insert({
          update_id: updateId,
          image_url: buildPublicUrl(path),
          file_name: file.name,
          sort_order: startOrder + i,
        });
        if (imgInsertErr) throw new Error(imgInsertErr.message || 'Failed to save image record');
      }
    } catch (inner: any) {
      for (const p of uploadedPaths) {
        await supabase.storage.from(STORAGE_BUCKET).remove([p]);
      }
      return NextResponse.json(
        { error: inner.message || 'Failed to update note images' },
        { status: 500 }
      );
    }

    const { data: images } = await supabase
      .from('match_update_images')
      .select('id, update_id, image_url, file_name, sort_order, created_at')
      .eq('update_id', updateId)
      .order('sort_order', { ascending: true });

    return NextResponse.json({ update: { ...updated, images: images || [] } });
  } catch (error: any) {
    console.error('[cases/[id]/updates/[updateId]] PATCH error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update note' },
      { status: 500 }
    );
  }
}

// DELETE case update (and storage files for attached images)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; updateId: string }> }
) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase env vars' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const cookieStore = await cookies();
    const adminUserId = cookieStore.get('admin_user_id')?.value;
    if (await isReadOnlyBranchManager(supabase as any, adminUserId)) {
      return NextResponse.json(
        { error: 'View-only access. You cannot modify data.' },
        { status: 403 }
      );
    }

    const { id: matchId, updateId } = await params;
    const owned = await assertUpdateBelongsToMatch(supabase, matchId, updateId);
    if (owned.error) return owned.error;

    const { data: attachments, error: attErr } = await supabase
      .from('match_update_images')
      .select('image_url')
      .eq('update_id', updateId);

    if (attErr) {
      console.warn('[cases/[id]/updates/[updateId]] Could not list attachments:', attErr.message);
    }

    const byBucket: Record<string, string[]> = {};
    for (const row of attachments || []) {
      const ref = storageRefFromPublicUrl(row.image_url);
      if (!ref) continue;
      if (!byBucket[ref.bucket]) byBucket[ref.bucket] = [];
      byBucket[ref.bucket].push(ref.path);
    }
    for (const [bucket, paths] of Object.entries(byBucket)) {
      if (paths.length === 0) continue;
      const { error: removeErr } = await supabase.storage.from(bucket).remove(paths);
      if (removeErr) {
        console.warn(
          `[cases/[id]/updates/[updateId]] Storage remove warning (${bucket}):`,
          removeErr.message
        );
      }
    }

    const { error: deleteError } = await supabase
      .from('match_updates')
      .delete()
      .eq('id', updateId);

    if (deleteError) {
      console.error('[cases/[id]/updates/[updateId]] DELETE error:', deleteError);
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete update' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[cases/[id]/updates/[updateId]] DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete update' },
      { status: 500 }
    );
  }
}

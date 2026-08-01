import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { storageRefFromPublicUrl } from '@/lib/matchUpdateImages';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

const MAX_IMAGES_PER_NOTE = 6;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function getAuthedUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return { error: jsonError('Missing Authorization bearer token', 401) };

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return { error: jsonError('Invalid or expired session', 401) };
  }
  return { supabase, user: data.user };
}

// PATCH: surrogate edits own match admin note (bypasses client RLS gaps)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ updateId: string }> }
) {
  if (!supabaseUrl || !serviceKey) {
    return jsonError('Missing Supabase env vars', 500);
  }

  try {
    const auth = await getAuthedUser(req);
    if (auth.error) return auth.error;
    const { supabase, user } = auth;
    const { updateId } = await params;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return jsonError('Invalid JSON body', 400);
    }

    const content =
      'content' in body ? (body.content == null ? null : String(body.content)) : undefined;
    const title =
      'title' in body ? (body.title == null ? null : String(body.title)) : undefined;
    const stage =
      'stage' in body ? (body.stage == null ? null : String(body.stage)) : undefined;
    const removeImageIds = Array.isArray(body.remove_image_ids)
      ? body.remove_image_ids.map(String).filter(Boolean)
      : [];
    const newImages = Array.isArray(body.new_images)
      ? body.new_images
          .map((img: any) => ({
            image_url: String(img?.image_url || '').trim(),
            file_name: img?.file_name != null ? String(img.file_name) : null,
          }))
          .filter((img: { image_url: string }) => !!img.image_url)
      : [];

    const { data: update, error: fetchError } = await supabase
      .from('match_updates')
      .select('id, match_id, update_type, content, title, stage')
      .eq('id', updateId)
      .single();

    if (fetchError || !update) {
      return jsonError('Update not found', 404);
    }
    if (update.update_type !== 'admin_note') {
      return jsonError('Only admin notes can be edited', 403);
    }

    const { data: match, error: matchError } = await supabase
      .from('surrogate_matches')
      .select('id, surrogate_id')
      .eq('id', update.match_id)
      .single();

    if (matchError || !match) {
      return jsonError('Match not found', 404);
    }
    if (String(match.surrogate_id) !== String(user.id)) {
      return jsonError('Only the matched surrogate can edit this note', 403);
    }

    const { data: existingImages, error: listErr } = await supabase
      .from('match_update_images')
      .select('id, image_url, sort_order')
      .eq('update_id', updateId)
      .order('sort_order', { ascending: true });

    if (listErr) {
      return jsonError(listErr.message || 'Failed to load images', 500);
    }

    const existing = existingImages || [];
    const removeSet = new Set(removeImageIds);
    const kept = existing.filter((img: any) => !removeSet.has(String(img.id)));
    const finalCount = kept.length + newImages.length;
    if (finalCount > MAX_IMAGES_PER_NOTE) {
      return jsonError(`You can attach at most ${MAX_IMAGES_PER_NOTE} images`, 400);
    }

    const nextContent =
      content !== undefined ? (content && content.trim() ? content : null) : update.content;
    if (!nextContent && finalCount === 0) {
      return jsonError('Please enter note text or keep at least one image', 400);
    }

    if (removeImageIds.length > 0) {
      const toRemove = existing.filter((img: any) => removeSet.has(String(img.id)));
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
        return jsonError(delImgErr.message || 'Failed to remove images', 500);
      }
    }

    const updatePayload: Record<string, any> = {};
    if (content !== undefined) updatePayload.content = nextContent;
    if (title !== undefined) updatePayload.title = title;
    if (stage !== undefined) updatePayload.stage = stage;

    if (Object.keys(updatePayload).length > 0) {
      const { data: updatedRows, error: updateError } = await supabase
        .from('match_updates')
        .update(updatePayload)
        .eq('id', updateId)
        .select('id, content, title, stage, created_at, match_id, update_type');

      if (updateError) {
        return jsonError(updateError.message || 'Failed to update note', 500);
      }
      if (!updatedRows?.length) {
        return jsonError('Update did not apply', 500);
      }
    }

    const startOrder =
      kept.reduce((max: number, img: any) => Math.max(max, Number(img.sort_order) || 0), -1) + 1;
    for (let i = 0; i < newImages.length; i++) {
      const img = newImages[i];
      const { error: imgInsertErr } = await supabase.from('match_update_images').insert({
        update_id: updateId,
        image_url: img.image_url,
        file_name: img.file_name,
        sort_order: startOrder + i,
      });
      if (imgInsertErr) {
        return jsonError(imgInsertErr.message || 'Failed to save image record', 500);
      }
    }

    const { data: images } = await supabase
      .from('match_update_images')
      .select('id, update_id, image_url, file_name, sort_order, created_at')
      .eq('update_id', updateId)
      .order('sort_order', { ascending: true });

    const { data: fresh } = await supabase
      .from('match_updates')
      .select('id, content, title, stage, created_at, match_id, update_type')
      .eq('id', updateId)
      .single();

    return NextResponse.json({
      update: { ...(fresh || {}), images: images || [] },
    });
  } catch (error: any) {
    console.error('[app/match-updates/[updateId]] PATCH error:', error);
    return jsonError(error.message || 'Failed to update note', 500);
  }
}

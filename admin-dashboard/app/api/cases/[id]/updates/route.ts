import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

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

async function attachImagesToUpdates(
  // Table may not be in generated DB types yet; keep API route flexible.
  supabase: ReturnType<typeof createClient> | any,
  updates: any[] | null
): Promise<any[]> {
  const list = updates || [];
  const updateIds = list.map((u) => u.id).filter(Boolean);
  if (updateIds.length === 0) {
    return list.map((u) => ({ ...u, images: [] }));
  }

  const { data: imgRows, error: imgErr } = await supabase
    .from('match_update_images')
    .select('id, update_id, image_url, file_name, sort_order, created_at')
    .in('update_id', updateIds)
    .order('sort_order', { ascending: true });

  if (imgErr) {
    console.warn('[cases/[id]/updates] attach images query failed:', imgErr.message);
    return list.map((u) => ({ ...u, images: [] }));
  }

  const byUpdate: Record<string, any[]> = {};
  for (const row of imgRows || []) {
    const uid = row.update_id as string;
    if (!byUpdate[uid]) byUpdate[uid] = [];
    byUpdate[uid].push(row);
  }

  return list.map((u) => ({
    ...u,
    images: byUpdate[u.id] || [],
  }));
}

// GET case updates
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const { id: matchId } = await params;

    let { data: updates, error: updatesError } = await supabase
      .from('match_updates')
      .select(`
        *,
        updated_by_user:admin_users!match_updates_updated_by_fkey(id, name)
      `)
      .eq('match_id', matchId)
      .order('created_at', { ascending: false });

    if (updatesError) {
      console.warn('[cases/[id]/updates] Foreign key query failed, trying without relation:', updatesError.message);
      const { data: updatesWithoutRelation, error: updatesError2 } = await supabase
        .from('match_updates')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false });

      if (updatesError2) throw updatesError2;
      updates = updatesWithoutRelation;
    }

    const withImages = await attachImagesToUpdates(supabase, updates);
    return NextResponse.json({ updates: withImages });
  } catch (error: any) {
    console.error('[cases/[id]/updates] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load updates' },
      { status: 500 }
    );
  }
}

// POST create case update (JSON or multipart with images)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const { id: matchId } = await params;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const update_type = String(formData.get('update_type') || '');
      const title = formData.get('title') != null ? String(formData.get('title')) : null;
      const content =
        formData.get('content') != null ? String(formData.get('content')) : '';
      const amountRaw = formData.get('amount');
      const amount =
        amountRaw != null && String(amountRaw).trim() !== ''
          ? Number(amountRaw)
          : null;
      const status =
        formData.get('status') != null ? String(formData.get('status')) : null;
      const stage =
        formData.get('stage') != null ? String(formData.get('stage')) : null;

      const rawFiles = formData
        .getAll('images')
        .filter(
          (x): x is File =>
            typeof x === 'object' &&
            x !== null &&
            'size' in x &&
            typeof (x as Blob).size === 'number' &&
            (x as Blob).size > 0 &&
            'arrayBuffer' in x
        );

      if (!update_type) {
        return NextResponse.json(
          { error: 'update_type is required' },
          { status: 400 }
        );
      }

      if (!content.trim() && rawFiles.length === 0) {
        return NextResponse.json(
          { error: 'Please enter note text or attach at least one image' },
          { status: 400 }
        );
      }

      if (rawFiles.length > MAX_IMAGES_PER_NOTE) {
        return NextResponse.json(
          { error: `You can attach at most ${MAX_IMAGES_PER_NOTE} images` },
          { status: 400 }
        );
      }

      for (const file of rawFiles) {
        const err = validateImageFile(file);
        if (err) {
          return NextResponse.json({ error: err }, { status: 400 });
        }
      }

      const { data: update, error: updateError } = await supabase
        .from('match_updates')
        .insert({
          match_id: matchId,
          update_type,
          title: title || null,
          content: content.trim() ? content : null,
          amount: Number.isFinite(amount as number) ? amount : null,
          status: status || null,
          stage: stage || null,
          updated_by: adminUserId || null,
        })
        .select()
        .single();

      if (updateError) {
        console.error('[cases/[id]/updates] POST insert error:', updateError);
        return NextResponse.json(
          { error: updateError.message || 'Failed to create update' },
          { status: 500 }
        );
      }

      const updateId = update.id as string;
      const uploadedPaths: string[] = [];

      try {
        for (let i = 0; i < rawFiles.length; i++) {
          const file = rawFiles[i];
          const extMatch = file.name.match(/\.(jpe?g|png|webp)$/i);
          const ext = extMatch ? extMatch[0].toLowerCase() : '.jpg';
          const safeName = sanitizeFilename(file.name);
          const randomStr = Math.random().toString(36).slice(2);
          let path = `admin-updates/${matchId}/${updateId}/${i}-${randomStr}-${safeName}`;
          if (!/\.(jpe?g|png|webp)$/i.test(path)) {
            path += ext;
          }

          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(path, file, {
              contentType: file.type || 'image/jpeg',
              upsert: false,
            });

          if (uploadError) {
            throw new Error(uploadError.message || 'Upload failed');
          }

          uploadedPaths.push(path);
          const publicUrl = buildPublicUrl(path);

          const { error: imgInsertErr } = await supabase
            .from('match_update_images')
            .insert({
              update_id: updateId,
              image_url: publicUrl,
              file_name: file.name,
              sort_order: i,
            });

          if (imgInsertErr) {
            throw new Error(imgInsertErr.message || 'Failed to save image record');
          }
        }
      } catch (inner: any) {
        for (const p of uploadedPaths) {
          await supabase.storage.from(STORAGE_BUCKET).remove([p]);
        }
        await supabase.from('match_updates').delete().eq('id', updateId);
        console.error('[cases/[id]/updates] POST multipart rollback:', inner);
        return NextResponse.json(
          { error: inner.message || 'Failed to create update with images' },
          { status: 500 }
        );
      }

      const [withImages] = await attachImagesToUpdates(supabase, [update]);
      return NextResponse.json({ update: withImages[0] || update });
    }

    // JSON body (no file upload)
    const body = await req.json();

    const {
      update_type,
      title,
      content,
      amount,
      status,
      stage,
    } = body;

    if (!update_type) {
      return NextResponse.json(
        { error: 'update_type is required' },
        { status: 400 }
      );
    }

    const { data: update, error: updateError } = await supabase
      .from('match_updates')
      .insert({
        match_id: matchId,
        update_type,
        title: title || null,
        content: content || null,
        amount: amount || null,
        status: status || null,
        stage: stage || null,
        updated_by: adminUserId || null,
      })
      .select()
      .single();

    if (updateError) {
      console.error('[cases/[id]/updates] POST error:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to create update' },
        { status: 500 }
      );
    }

    const [withImages] = await attachImagesToUpdates(supabase, [update]);
    return NextResponse.json({ update: withImages[0] || update });
  } catch (error: any) {
    console.error('[cases/[id]/updates] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create update' },
      { status: 500 }
    );
  }
}

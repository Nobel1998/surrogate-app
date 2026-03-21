import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const STORAGE_BUCKET = 'documents';

export const dynamic = 'force-dynamic';

function buildPublicUrl(path: string) {
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

type AuthContext =
  | { ok: true; adminUserId: string; role: string; branchId: string | null }
  | { ok: false; error: string; status: number };

// Helper function to check admin authentication
async function getAuthContext(): Promise<AuthContext> {
  const cookieStore = await cookies();
  const adminUserId = cookieStore.get('admin_user_id')?.value;

  if (!adminUserId) {
    return { ok: false, error: 'Not authenticated', status: 401 };
  }

  if (!supabaseUrl || !serviceKey) {
    return { ok: false, error: 'Missing Supabase env vars', status: 500 };
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: adminUser, error } = await supabase
    .from('admin_users')
    .select('id, role, branch_id')
    .eq('id', adminUserId)
    .single();

  if (error || !adminUser) {
    return { ok: false, error: 'Invalid admin session', status: 401 };
  }

  return {
    ok: true,
    adminUserId: adminUser.id,
    role: (adminUser.role || '').toLowerCase(),
    branchId: adminUser.branch_id || null,
  };
}

// Use SupabaseClient (not ReturnType<typeof createClient>) — Vercel/TS resolves
// createClient() to a wider schema generic than ReturnType<> and rejects the call.
async function getAccessibleMatchIds(
  supabase: SupabaseClient,
  auth: Extract<AuthContext, { ok: true }>
): Promise<string[] | null> {
  if (auth.role === 'admin') {
    return null; // null means unrestricted
  }

  const { data: assignedMatches } = await supabase
    .from('match_managers')
    .select('match_id')
    .eq('manager_id', auth.adminUserId);

  const assignedMatchIds =
    assignedMatches?.map((row: { match_id: string | null }) => row.match_id).filter((id): id is string => !!id) || [];

  if (auth.role === 'branch_manager') {
    let branchMatchIds: string[] = [];
    if (auth.branchId) {
      const { data: branchMatches } = await supabase
        .from('surrogate_matches')
        .select('id')
        .eq('branch_id', auth.branchId);
      branchMatchIds =
        branchMatches?.map((row: { id: string | null }) => row.id).filter((id): id is string => !!id) || [];
    }
    return Array.from(new Set([...assignedMatchIds, ...branchMatchIds]));
  }

  return Array.from(new Set(assignedMatchIds));
}

// GET - Fetch journey pics
export async function GET(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: auth.status || 401 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get('match_id');
    const accessibleMatchIds = await getAccessibleMatchIds(supabase, auth);

    if (accessibleMatchIds && accessibleMatchIds.length === 0) {
      return NextResponse.json({ pics: [] });
    }
    if (matchId && accessibleMatchIds && !accessibleMatchIds.includes(matchId)) {
      return NextResponse.json({ pics: [] });
    }

    let query = supabase
      .from('journey_pics')
      .select('*')
      .order('photo_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (matchId) {
      query = query.eq('match_id', matchId);
    } else if (accessibleMatchIds) {
      query = query.in('match_id', accessibleMatchIds);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ pics: data || [] });
  } catch (error: any) {
    console.error('[journey-pics] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch journey pics' },
      { status: 500 }
    );
  }
}

// POST - Upload journey pic
export async function POST(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: auth.status || 401 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const matchId = formData.get('match_id') as string | null;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const photoDate = formData.get('photo_date') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Missing file' },
        { status: 400 }
      );
    }

    if (!matchId) {
      return NextResponse.json(
        { error: 'Missing required field: match_id' },
        { status: 400 }
      );
    }

    const accessibleMatchIds = await getAccessibleMatchIds(supabase, auth);
    if (accessibleMatchIds && !accessibleMatchIds.includes(matchId)) {
      return NextResponse.json(
        { error: 'You do not have permission to upload journey pics for this match.' },
        { status: 403 }
      );
    }

    // Validate file extension - only images
    const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (ext && !allowedExtensions.includes(ext.toLowerCase())) {
      return NextResponse.json(
        { error: `File format not supported. Allowed formats: ${allowedExtensions.join(', ')}` },
        { status: 400 }
      );
    }

    // Upload file to storage
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).slice(2);
    const path = `journey-pics/${matchId}-${timestamp}-${randomStr}${ext}`;
    
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const publicUrl = buildPublicUrl(path);

    // Insert journey pic record
    const { data, error: insertError } = await supabase
      .from('journey_pics')
      .insert({
        match_id: matchId,
        image_url: publicUrl,
        file_name: file.name,
        title: title?.trim() || null,
        description: description?.trim() || null,
        photo_date: photoDate || null,
        uploaded_by: auth.adminUserId || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ pic: data });
  } catch (error: any) {
    console.error('[journey-pics] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload journey pic' },
      { status: 500 }
    );
  }
}

// PUT - Update journey pic
export async function PUT(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: auth.status || 401 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json();
    const {
      id,
      title,
      description,
      photo_date,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing pic ID' },
        { status: 400 }
      );
    }

    const { data: existingPic, error: existingPicError } = await supabase
      .from('journey_pics')
      .select('id, match_id')
      .eq('id', id)
      .single();
    if (existingPicError || !existingPic) {
      return NextResponse.json(
        { error: 'Journey pic not found' },
        { status: 404 }
      );
    }

    const accessibleMatchIds = await getAccessibleMatchIds(supabase, auth);
    if (accessibleMatchIds && !accessibleMatchIds.includes(existingPic.match_id)) {
      return NextResponse.json(
        { error: 'You do not have permission to update this journey pic.' },
        { status: 403 }
      );
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    if (title !== undefined) updateData.title = title?.trim() || null;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (photo_date !== undefined) updateData.photo_date = photo_date || null;

    const { data, error } = await supabase
      .from('journey_pics')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ pic: data });
  } catch (error: any) {
    console.error('[journey-pics] PUT error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update journey pic' },
      { status: 500 }
    );
  }
}

// DELETE - Delete journey pic
export async function DELETE(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: auth.status || 401 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing pic ID' },
        { status: 400 }
      );
    }

    // Get the pic to find the file path
    const { data: pic, error: fetchError } = await supabase
      .from('journey_pics')
      .select('image_url, match_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const accessibleMatchIds = await getAccessibleMatchIds(supabase, auth);
    if (accessibleMatchIds && !accessibleMatchIds.includes(pic.match_id)) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this journey pic.' },
        { status: 403 }
      );
    }

    // Delete file from storage if exists
    if (pic?.image_url) {
      const urlParts = pic.image_url.split('/');
      const filePath = urlParts.slice(urlParts.indexOf('journey-pics')).join('/');
      await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([filePath])
        .catch((err) => console.error('Error deleting file from storage:', err));
    }

    // Delete pic record
    const { error } = await supabase
      .from('journey_pics')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[journey-pics] DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete journey pic' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const STORAGE_BUCKET = 'documents';

export const dynamic = 'force-dynamic';

function buildPublicUrl(path: string) {
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

// Helper function to check admin authentication
async function checkAdminAuth() {
  const cookieStore = await cookies();
  const adminUserId = cookieStore.get('admin_user_id')?.value;
  
  if (!adminUserId) {
    return { isAdmin: false, error: 'Not authenticated' };
  }

  if (!supabaseUrl || !serviceKey) {
    return { isAdmin: false, error: 'Missing Supabase env vars' };
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: adminUser, error } = await supabase
    .from('admin_users')
    .select('id, role')
    .eq('id', adminUserId)
    .single();

  if (error || !adminUser) {
    return { isAdmin: false, error: 'Invalid admin session' };
  }

  return { isAdmin: true, adminUser };
}

// GET - Fetch journey pics
export async function GET(req: NextRequest) {
  const authCheck = await checkAdminAuth();
  if (!authCheck.isAdmin) {
    return NextResponse.json(
      { error: authCheck.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get('match_id');

    let query = supabase
      .from('journey_pics')
      .select('*')
      .order('photo_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (matchId) {
      query = query.eq('match_id', matchId);
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
  const authCheck = await checkAdminAuth();
  if (!authCheck.isAdmin) {
    return NextResponse.json(
      { error: authCheck.error || 'Unauthorized' },
      { status: 401 }
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

    const cookieStore = await cookies();
    const adminUserId = cookieStore.get('admin_user_id')?.value;

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
        uploaded_by: adminUserId || null,
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
  const authCheck = await checkAdminAuth();
  if (!authCheck.isAdmin) {
    return NextResponse.json(
      { error: authCheck.error || 'Unauthorized' },
      { status: 401 }
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
  const authCheck = await checkAdminAuth();
  if (!authCheck.isAdmin) {
    return NextResponse.json(
      { error: authCheck.error || 'Unauthorized' },
      { status: 401 }
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
      .select('image_url')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

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


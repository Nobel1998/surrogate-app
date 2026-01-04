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

// GET - Fetch psychological evaluations
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
    const userId = searchParams.get('user_id');
    const matchId = searchParams.get('match_id');

    let query = supabase
      .from('psychological_evaluations')
      .select('*')
      .order('evaluation_date', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (matchId) {
      query = query.eq('match_id', matchId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ evaluations: data || [] });
  } catch (error: any) {
    console.error('[psychological-evaluations] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch psychological evaluations' },
      { status: 500 }
    );
  }
}

// POST - Upload psychological evaluation report
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
    const userId = formData.get('user_id') as string | null;
    const matchId = formData.get('match_id') as string | null;
    const evaluationDate = formData.get('evaluation_date') as string | null;
    const evaluatorName = formData.get('evaluator_name') as string | null;
    const notes = formData.get('notes') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Missing file' },
        { status: 400 }
      );
    }

    if (!userId || !evaluationDate) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, evaluation_date' },
        { status: 400 }
      );
    }

    // Validate file extension
    const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'];
    if (ext && !allowedExtensions.includes(ext.toLowerCase())) {
      return NextResponse.json(
        { error: `File format not supported. Allowed formats: ${allowedExtensions.join(', ')}` },
        { status: 400 }
      );
    }

    // Upload file to storage
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).slice(2);
    const path = `psychological-evaluations/${timestamp}-${randomStr}${ext}`;
    
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const publicUrl = buildPublicUrl(path);

    // Insert evaluation record
    const { data, error: insertError } = await supabase
      .from('psychological_evaluations')
      .insert({
        user_id: userId,
        match_id: matchId || null,
        evaluation_date: evaluationDate,
        evaluator_name: evaluatorName?.trim() || null,
        report_url: publicUrl,
        file_name: file.name,
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ evaluation: data });
  } catch (error: any) {
    console.error('[psychological-evaluations] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload psychological evaluation' },
      { status: 500 }
    );
  }
}

// PUT - Update psychological evaluation
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
      evaluation_date,
      evaluator_name,
      notes,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing evaluation ID' },
        { status: 400 }
      );
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    if (evaluation_date !== undefined) updateData.evaluation_date = evaluation_date;
    if (evaluator_name !== undefined) updateData.evaluator_name = evaluator_name?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    const { data, error } = await supabase
      .from('psychological_evaluations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ evaluation: data });
  } catch (error: any) {
    console.error('[psychological-evaluations] PUT error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update psychological evaluation' },
      { status: 500 }
    );
  }
}

// DELETE - Delete psychological evaluation
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
        { error: 'Missing evaluation ID' },
        { status: 400 }
      );
    }

    // Get the evaluation to find the file path
    const { data: evaluation, error: fetchError } = await supabase
      .from('psychological_evaluations')
      .select('report_url')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Delete file from storage if exists
    if (evaluation?.report_url) {
      const urlParts = evaluation.report_url.split('/');
      const filePath = urlParts.slice(urlParts.indexOf('psychological-evaluations')).join('/');
      await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([filePath])
        .catch((err) => console.error('Error deleting file from storage:', err));
    }

    // Delete evaluation record
    const { error } = await supabase
      .from('psychological_evaluations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[psychological-evaluations] DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete psychological evaluation' },
      { status: 500 }
    );
  }
}


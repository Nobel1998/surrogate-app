import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { isReadOnlyBranchManager } from '@/lib/checkReadOnly';
import {
  buildMatchOrNullSurrogateOrFilter,
  getAccessibleMatchIds,
  getPartyUserIdsForMatches,
  getSurrogateIdsForMatches,
  rowAllowedForScopedManager,
} from '@/lib/managerMatchScope';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const STORAGE_BUCKET = 'documents';

export const dynamic = 'force-dynamic';

function buildPublicUrl(path: string) {
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

type AuthOk = { isAdmin: true; adminUser: { id: string; role: string | null } };
type AuthFail = { isAdmin: false; error: string };

async function checkAdminAuth(): Promise<AuthOk | AuthFail> {
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

// GET - Fetch monthly assessments
export async function GET(req: NextRequest) {
  const authCheck = await checkAdminAuth();
  if (!authCheck.isAdmin) {
    return NextResponse.json(
      { error: authCheck.error || 'Unauthorized' },
      { status: 401 }
    );
  }
  if ((authCheck.adminUser.role || '').toLowerCase() === 'finance_manager') {
    return NextResponse.json(
      { error: 'Finance manager cannot access this section.' },
      { status: 403 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');
    const matchId = searchParams.get('match_id');

    const role = (authCheck.adminUser.role || '').toLowerCase();
    const accessible = await getAccessibleMatchIds(supabase, authCheck.adminUser.id, role);

    if (accessible !== null) {
      if (accessible.length === 0) {
        return NextResponse.json({ assessments: [] });
      }
      if (matchId && !accessible.includes(matchId)) {
        return NextResponse.json({ assessments: [] });
      }
      if (userId) {
        const party = await getPartyUserIdsForMatches(supabase, accessible);
        if (!party.has(userId)) {
          return NextResponse.json({ assessments: [] });
        }
      }
    }

    let query = supabase
      .from('monthly_assessments')
      .select('*')
      .order('assessment_date', { ascending: false });

    if (accessible !== null) {
      const sur = await getSurrogateIdsForMatches(supabase, accessible);
      query = query.or(buildMatchOrNullSurrogateOrFilter(accessible, sur));
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (matchId) {
      query = query.eq('match_id', matchId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ assessments: data || [] });
  } catch (error: any) {
    console.error('[monthly-assessments] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch monthly assessments' },
      { status: 500 }
    );
  }
}

// POST - Upload monthly assessment report
export async function POST(req: NextRequest) {
  const authCheck = await checkAdminAuth();
  if (!authCheck.isAdmin) {
    return NextResponse.json(
      { error: authCheck.error || 'Unauthorized' },
      { status: 401 }
    );
  }
  if ((authCheck.adminUser.role || '').toLowerCase() === 'finance_manager') {
    return NextResponse.json(
      { error: 'Finance manager cannot access this section.' },
      { status: 403 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const cookieStore = await cookies();
    if (await isReadOnlyBranchManager(supabase, cookieStore.get('admin_user_id')?.value)) {
      return NextResponse.json(
        { error: 'View-only access. You cannot modify data.' },
        { status: 403 }
      );
    }

    const role = (authCheck.adminUser.role || '').toLowerCase();
    const accessible = await getAccessibleMatchIds(supabase, authCheck.adminUser.id, role);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('user_id') as string | null;
    const matchId = formData.get('match_id') as string | null;
    const assessmentDate = formData.get('assessment_date') as string | null;
    const assessorName = formData.get('assessor_name') as string | null;
    const notes = formData.get('notes') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Missing file' },
        { status: 400 }
      );
    }

    if (!userId || !assessmentDate) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, assessment_date' },
        { status: 400 }
      );
    }

    if (accessible !== null) {
      const ok = await rowAllowedForScopedManager(supabase, accessible, {
        match_id: matchId || null,
        user_id: userId,
      });
      if (!ok) {
        return NextResponse.json({ error: 'Not allowed for this match or user' }, { status: 403 });
      }
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
    const path = `monthly-assessments/${timestamp}-${randomStr}${ext}`;
    
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const publicUrl = buildPublicUrl(path);

    // Insert assessment record
    const { data, error: insertError } = await supabase
      .from('monthly_assessments')
      .insert({
        user_id: userId,
        match_id: matchId || null,
        assessment_date: assessmentDate,
        assessor_name: assessorName?.trim() || null,
        report_url: publicUrl,
        file_name: file.name,
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ assessment: data });
  } catch (error: any) {
    console.error('[monthly-assessments] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload monthly assessment' },
      { status: 500 }
    );
  }
}

// PUT - Update monthly assessment
export async function PUT(req: NextRequest) {
  const authCheck = await checkAdminAuth();
  if (!authCheck.isAdmin) {
    return NextResponse.json(
      { error: authCheck.error || 'Unauthorized' },
      { status: 401 }
    );
  }
  if ((authCheck.adminUser.role || '').toLowerCase() === 'finance_manager') {
    return NextResponse.json(
      { error: 'Finance manager cannot access this section.' },
      { status: 403 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const cookieStore = await cookies();
    if (await isReadOnlyBranchManager(supabase, cookieStore.get('admin_user_id')?.value)) {
      return NextResponse.json(
        { error: 'View-only access. You cannot modify data.' },
        { status: 403 }
      );
    }

    const role = (authCheck.adminUser.role || '').toLowerCase();
    const accessible = await getAccessibleMatchIds(supabase, authCheck.adminUser.id, role);

    const body = await req.json();
    const {
      id,
      assessment_date,
      assessor_name,
      notes,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing assessment ID' },
        { status: 400 }
      );
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    if (assessment_date !== undefined) updateData.assessment_date = assessment_date;
    if (assessor_name !== undefined) updateData.assessor_name = assessor_name?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    const { data: existing, error: fetchErr } = await supabase
      .from('monthly_assessments')
      .select('id, match_id, user_id')
      .eq('id', id)
      .single();
    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    if (accessible !== null) {
      const ok = await rowAllowedForScopedManager(supabase, accessible, {
        match_id: existing.match_id,
        user_id: existing.user_id,
      });
      if (!ok) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from('monthly_assessments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ assessment: data });
  } catch (error: any) {
    console.error('[monthly-assessments] PUT error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update monthly assessment' },
      { status: 500 }
    );
  }
}

// DELETE - Delete monthly assessment
export async function DELETE(req: NextRequest) {
  const authCheck = await checkAdminAuth();
  if (!authCheck.isAdmin) {
    return NextResponse.json(
      { error: authCheck.error || 'Unauthorized' },
      { status: 401 }
    );
  }
  if ((authCheck.adminUser.role || '').toLowerCase() === 'finance_manager') {
    return NextResponse.json(
      { error: 'Finance manager cannot access this section.' },
      { status: 403 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const cookieStore = await cookies();
    if (await isReadOnlyBranchManager(supabase, cookieStore.get('admin_user_id')?.value)) {
      return NextResponse.json(
        { error: 'View-only access. You cannot modify data.' },
        { status: 403 }
      );
    }

    const role = (authCheck.adminUser.role || '').toLowerCase();
    const accessible = await getAccessibleMatchIds(supabase, authCheck.adminUser.id, role);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing assessment ID' },
        { status: 400 }
      );
    }

    // Get the assessment to find the file path
    const { data: assessment, error: fetchError } = await supabase
      .from('monthly_assessments')
      .select('report_url, match_id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !assessment) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    if (accessible !== null) {
      const ok = await rowAllowedForScopedManager(supabase, accessible, {
        match_id: assessment.match_id,
        user_id: assessment.user_id,
      });
      if (!ok) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Delete file from storage if exists
    if (assessment?.report_url) {
      const urlParts = assessment.report_url.split('/');
      const filePath = urlParts.slice(urlParts.indexOf('monthly-assessments')).join('/');
      await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([filePath])
        .catch((err) => console.error('Error deleting file from storage:', err));
    }

    // Delete assessment record
    const { error } = await supabase
      .from('monthly_assessments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[monthly-assessments] DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete monthly assessment' },
      { status: 500 }
    );
  }
}


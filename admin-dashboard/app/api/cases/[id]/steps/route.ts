import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

// GET case steps
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
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
    const caseId = params.id;

    const { data: steps, error: stepsError } = await supabase
      .from('case_steps')
      .select('*')
      .eq('case_id', caseId)
      .order('stage_number', { ascending: true })
      .order('step_number', { ascending: true });

    if (stepsError) throw stepsError;

    return NextResponse.json({ steps: steps || [] });
  } catch (error: any) {
    console.error('[cases/[id]/steps] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load steps' },
      { status: 500 }
    );
  }
}

// POST create/update case step
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
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
    const caseId = params.id;
    const body = await req.json();

    const {
      stage_number,
      stage_name,
      step_number,
      step_name,
      status,
      notes,
    } = body;

    if (!stage_number || !step_number) {
      return NextResponse.json(
        { error: 'stage_number and step_number are required' },
        { status: 400 }
      );
    }

    // Upsert step
    const { data: step, error: stepError } = await supabase
      .from('case_steps')
      .upsert({
        case_id: caseId,
        stage_number,
        stage_name: stage_name || `Stage ${stage_number}`,
        step_number,
        step_name: step_name || `Step ${step_number}`,
        status: status || 'pending',
        notes: notes || null,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        completed_by: status === 'completed' ? adminUserId : null,
      }, {
        onConflict: 'case_id,stage_number,step_number',
      })
      .select()
      .single();

    if (stepError) {
      console.error('[cases/[id]/steps] POST error:', stepError);
      return NextResponse.json(
        { error: stepError.message || 'Failed to save step' },
        { status: 500 }
      );
    }

    return NextResponse.json({ step });
  } catch (error: any) {
    console.error('[cases/[id]/steps] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save step' },
      { status: 500 }
    );
  }
}

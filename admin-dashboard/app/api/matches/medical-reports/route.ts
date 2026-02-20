import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// POST medical report (admin helping surrogate)
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const adminUserId = cookieStore.get('admin_user_id')?.value;
    const { isReadOnlyBranchManager } = await import('@/lib/checkReadOnly');
    if (await isReadOnlyBranchManager(supabase, adminUserId)) {
      return NextResponse.json(
        { error: 'View-only access. You cannot modify data.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { surrogate_id, stage, visit_date, provider_name, proof_image_url } = body;

    if (!surrogate_id || !stage || !visit_date) {
      return NextResponse.json(
        { error: 'Surrogate ID, stage, and visit date are required' },
        { status: 400 }
      );
    }

    const { data, error: insertError } = await supabase
      .from('medical_reports')
      .insert({
        user_id: surrogate_id,
        stage,
        visit_date,
        provider_name: provider_name || null,
        proof_image_url: proof_image_url || null,
        report_data: {}, // Admin can add basic info, complex form left to app or can be expanded later
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting medical report:', insertError);
      return NextResponse.json(
        { error: 'Failed to create medical report', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error in POST medical report:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE medical report
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('id');

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    // Delete associated points rewards if any
    const { error: pointsError } = await supabase
      .from('points_rewards')
      .delete()
      .eq('source_type', 'medical_report')
      .eq('source_id', reportId);

    if (pointsError) {
      console.error('Error deleting associated points:', pointsError);
      // Continue with report deletion even if points deletion fails
    }

    // Delete the medical report
    const { error: deleteError } = await supabase
      .from('medical_reports')
      .delete()
      .eq('id', reportId);

    if (deleteError) {
      console.error('Error deleting medical report:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete medical report', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE medical report:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

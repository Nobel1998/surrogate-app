import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

// PATCH: Update available status for a profile
export async function PATCH(
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
    const { id } = await params;
    const body = await req.json();
    const { available } = body;

    if (typeof available !== 'boolean') {
      return NextResponse.json(
        { error: 'available must be a boolean' },
        { status: 400 }
      );
    }

    // Verify admin authentication
    const cookieStore = await cookies();
    const adminUserId = cookieStore.get('admin_user_id')?.value;
    
    if (!adminUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify the profile exists and is a surrogate
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (profile.role?.toLowerCase() !== 'surrogate') {
      return NextResponse.json(
        { error: 'Only surrogates can have available status updated' },
        { status: 400 }
      );
    }

    // When setting to available, reject if surrogate has an active match
    if (available === true) {
      const { data: activeMatch, error: matchError } = await supabase
        .from('surrogate_matches')
        .select('id')
        .eq('surrogate_id', id)
        .in('status', ['matched', 'pending', 'pregnant'])
        .limit(1)
        .maybeSingle();
      if (matchError) {
        console.error('[profiles/available] Error checking match:', matchError);
      } else if (activeMatch) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-dashboard/app/api/profiles/[id]/available/route.ts:PATCH:rejectAlreadyMatched',message:'Reject Set Available: surrogate has active match',data:{profileId:id},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        return NextResponse.json(
          { error: 'This surrogate is already matched. They cannot be set to Available.' },
          { status: 400 }
        );
      }
    }

    // Update the available status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ available })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, available });
  } catch (error: any) {
    console.error('Error updating available status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update available status' },
      { status: 500 }
    );
  }
}


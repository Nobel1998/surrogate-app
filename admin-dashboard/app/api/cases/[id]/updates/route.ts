import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

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

    // First try with the foreign key relation
    let { data: updates, error: updatesError } = await supabase
      .from('match_updates')
      .select(`
        *,
        updated_by_user:admin_users!match_updates_updated_by_fkey(id, name)
      `)
      .eq('match_id', matchId)
      .order('created_at', { ascending: false });

    // If foreign key query fails, try without it
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

    return NextResponse.json({ updates: updates || [] });
  } catch (error: any) {
    console.error('[cases/[id]/updates] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load updates' },
      { status: 500 }
    );
  }
}

// POST create case update
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
    const body = await req.json();

    const {
      update_type,
      title,
      content,
      amount,
      status,
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

    return NextResponse.json({ update });
  } catch (error: any) {
    console.error('[cases/[id]/updates] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create update' },
      { status: 500 }
    );
  }
}

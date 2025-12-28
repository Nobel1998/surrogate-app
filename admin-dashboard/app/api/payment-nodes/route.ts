import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

// GET: Fetch all payment nodes with match and profile information
export async function GET(req: NextRequest) {
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
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get('match_id');
    const status = searchParams.get('status');

    let query = supabase
      .from('payment_nodes')
      .select(`
        *,
        match:surrogate_matches!match_id (
          id,
          surrogate_id,
          parent_id,
          status,
          surrogate:profiles!surrogate_id (
            id,
            name,
            phone
          ),
          parent:profiles!parent_id (
            id,
            name,
            phone
          )
        )
      `)
      .order('due_date', { ascending: true, nullsLast: true })
      .order('created_at', { ascending: false });

    if (matchId) {
      query = query.eq('match_id', matchId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error('[payment-nodes] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payment nodes' },
      { status: 500 }
    );
  }
}

// POST: Create a new payment node
export async function POST(req: NextRequest) {
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
    const body = await req.json();
    const {
      match_id,
      node_name,
      node_type,
      amount,
      due_date,
      status = 'pending',
      notes,
    } = body;

    if (!match_id || !node_name || !node_type || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: match_id, node_name, node_type, amount' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('payment_nodes')
      .insert({
        match_id,
        node_name,
        node_type,
        amount: parseFloat(amount),
        due_date: due_date || null,
        status,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    console.error('[payment-nodes] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment node' },
      { status: 500 }
    );
  }
}

// PATCH: Update a payment node
export async function PATCH(req: NextRequest) {
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
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing payment node id' },
        { status: 400 }
      );
    }

    // If marking as paid, set payment_date to today
    if (updates.status === 'paid' && !updates.payment_date) {
      updates.payment_date = new Date().toISOString().split('T')[0];
    }

    // If amount is provided, ensure it's a number
    if (updates.amount !== undefined) {
      updates.amount = parseFloat(updates.amount);
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('payment_nodes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    console.error('[payment-nodes] PATCH error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update payment node' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a payment node
export async function DELETE(req: NextRequest) {
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
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing payment node id' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('payment_nodes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[payment-nodes] DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete payment node' },
      { status: 500 }
    );
  }
}


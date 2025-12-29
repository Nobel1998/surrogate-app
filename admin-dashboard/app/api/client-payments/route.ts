import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

// GET: Fetch all client payments with match and profile information
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
    const installment = searchParams.get('installment');

    // First, get client payments with match information
    let query = supabase
      .from('client_payments')
      .select(`
        *,
        match:surrogate_matches!match_id (
          id,
          surrogate_id,
          parent_id,
          status
        )
      `)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (matchId) {
      query = query.eq('match_id', matchId);
    }

    if (installment) {
      query = query.eq('payment_installment', installment);
    }

    const { data: payments, error } = await query;

    if (error) throw error;

    // If no payments, return empty array
    if (!payments || payments.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Collect all unique surrogate and parent IDs
    const surrogateIds = new Set<string>();
    const parentIds = new Set<string>();
    
    payments.forEach((payment: any) => {
      if (payment.match?.surrogate_id) {
        surrogateIds.add(payment.match.surrogate_id);
      }
      if (payment.match?.parent_id) {
        parentIds.add(payment.match.parent_id);
      }
    });

    // Fetch all profiles in one query
    const allProfileIds = [...surrogateIds, ...parentIds];
    let profilesMap: Record<string, any> = {};
    
    if (allProfileIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, phone')
        .in('id', allProfileIds);

      if (profilesError) {
        console.error('[client-payments] Error fetching profiles:', profilesError);
        // Continue without profiles - they'll just be null
      } else if (profiles) {
        profiles.forEach((profile: any) => {
          profilesMap[profile.id] = profile;
        });
      }
    }

    // Enrich payments with profile information
    const enrichedPayments = payments.map((payment: any) => {
      const enrichedMatch = payment.match ? {
        ...payment.match,
        surrogate: payment.match.surrogate_id ? profilesMap[payment.match.surrogate_id] : null,
        parent: payment.match.parent_id ? profilesMap[payment.match.parent_id] : null,
      } : null;

      return {
        ...payment,
        match: enrichedMatch,
      };
    });

    return NextResponse.json({ data: enrichedPayments });
  } catch (error: any) {
    console.error('[client-payments] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch client payments' },
      { status: 500 }
    );
  }
}

// POST: Create a new client payment
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
      payment_installment,
      amount,
      payment_date,
      payment_method,
      payment_reference,
      notes,
    } = body;

    if (!match_id || !payment_installment || !amount || !payment_date) {
      return NextResponse.json(
        { error: 'Missing required fields: match_id, payment_installment, amount, payment_date' },
        { status: 400 }
      );
    }

    if (!['Installment 1', 'Installment 2', 'Installment 3', 'Installment 4'].includes(payment_installment)) {
      return NextResponse.json(
        { error: 'Invalid payment_installment. Must be one of: Installment 1, Installment 2, Installment 3, Installment 4' },
        { status: 400 }
      );
    }

    const { data: insertedData, error } = await supabase
      .from('client_payments')
      .insert({
        match_id,
        payment_installment,
        amount: parseFloat(amount),
        payment_date,
        payment_method: payment_method || null,
        payment_reference: payment_reference || null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Fetch the created payment with match information
    const { data: paymentWithMatch, error: fetchError } = await supabase
      .from('client_payments')
      .select(`
        *,
        match:surrogate_matches!match_id (
          id,
          surrogate_id,
          parent_id,
          status
        )
      `)
      .eq('id', insertedData.id)
      .single();

    if (fetchError) {
      console.error('[client-payments] Error fetching match data:', fetchError);
      return NextResponse.json({ data: insertedData, success: true });
    }

    // Fetch profile information if match exists
    let enrichedData = paymentWithMatch;
    if (paymentWithMatch?.match) {
      const profileIds = [
        paymentWithMatch.match.surrogate_id,
        paymentWithMatch.match.parent_id,
      ].filter(Boolean);

      if (profileIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, phone')
          .in('id', profileIds);

        if (!profilesError && profiles) {
          const profilesMap: Record<string, any> = {};
          profiles.forEach((profile: any) => {
            profilesMap[profile.id] = profile;
          });

          enrichedData = {
            ...paymentWithMatch,
            match: {
              ...paymentWithMatch.match,
              surrogate: paymentWithMatch.match.surrogate_id ? profilesMap[paymentWithMatch.match.surrogate_id] : null,
              parent: paymentWithMatch.match.parent_id ? profilesMap[paymentWithMatch.match.parent_id] : null,
            },
          };
        }
      }
    }

    return NextResponse.json({ data: enrichedData, success: true });
  } catch (error: any) {
    console.error('[client-payments] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create client payment' },
      { status: 500 }
    );
  }
}

// PATCH: Update a client payment
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
        { error: 'Missing payment id' },
        { status: 400 }
      );
    }

    // If amount is provided, ensure it's a number
    if (updates.amount !== undefined) {
      updates.amount = parseFloat(updates.amount);
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('client_payments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    console.error('[client-payments] PATCH error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update client payment' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a client payment
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
        { error: 'Missing payment id' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('client_payments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[client-payments] DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete client payment' },
      { status: 500 }
    );
  }
}


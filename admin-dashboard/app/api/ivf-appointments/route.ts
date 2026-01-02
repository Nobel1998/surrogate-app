import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

// GET - Fetch IVF appointments
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
    const userId = searchParams.get('user_id');
    const matchId = searchParams.get('match_id');

    let query = supabase
      .from('ivf_appointments')
      .select('*')
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (matchId) {
      query = query.eq('match_id', matchId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ appointments: data || [] });
  } catch (error: any) {
    console.error('[ivf-appointments] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}

// POST - Create IVF appointment
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
    const { user_id, match_id, appointment_date, appointment_time, provider_name, clinic_name, clinic_address, clinic_phone, notes, status } = body;

    if (!user_id || !appointment_date || !appointment_time || !provider_name || !clinic_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('ivf_appointments')
      .insert({
        user_id,
        match_id: match_id || null,
        appointment_date,
        appointment_time,
        provider_name,
        clinic_name,
        clinic_address: clinic_address || null,
        clinic_phone: clinic_phone || null,
        notes: notes || null,
        status: status || 'scheduled',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ appointment: data });
  } catch (error: any) {
    console.error('[ivf-appointments] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create appointment' },
      { status: 500 }
    );
  }
}

// PUT - Update IVF appointment
export async function PUT(req: NextRequest) {
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
    const { id, appointment_date, appointment_time, provider_name, clinic_name, clinic_address, clinic_phone, notes, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing appointment ID' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (appointment_date !== undefined) updateData.appointment_date = appointment_date;
    if (appointment_time !== undefined) updateData.appointment_time = appointment_time;
    if (provider_name !== undefined) updateData.provider_name = provider_name;
    if (clinic_name !== undefined) updateData.clinic_name = clinic_name;
    if (clinic_address !== undefined) updateData.clinic_address = clinic_address;
    if (clinic_phone !== undefined) updateData.clinic_phone = clinic_phone;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('ivf_appointments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ appointment: data });
  } catch (error: any) {
    console.error('[ivf-appointments] PUT error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update appointment' },
      { status: 500 }
    );
  }
}

// DELETE - Delete IVF appointment
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
        { error: 'Missing appointment ID' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('ivf_appointments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[ivf-appointments] DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete appointment' },
      { status: 500 }
    );
  }
}


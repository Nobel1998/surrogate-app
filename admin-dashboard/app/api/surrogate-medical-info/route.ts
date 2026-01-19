import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

// GET: Fetch medical info for a surrogate user
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

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing user_id parameter' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('surrogate_medical_info')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[surrogate-medical-info] GET error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch medical info' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || null });
  } catch (error: any) {
    console.error('[surrogate-medical-info] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch medical info' },
      { status: 500 }
    );
  }
}

// POST/PUT: Create or update medical info for a surrogate user (admin only)
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
    const { user_id, ...medicalData } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'Missing user_id' },
        { status: 400 }
      );
    }

    // Check if record exists
    const { data: existing, error: checkError } = await supabase
      .from('surrogate_medical_info')
      .select('id')
      .eq('user_id', user_id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    const updateData: any = {
      ...medicalData,
      updated_at: new Date().toISOString(),
    };

    // Remove undefined values and user_id (user_id is only for lookup, not for update)
    delete updateData.user_id;
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      } else if (typeof updateData[key] === 'string') {
        updateData[key] = updateData[key].trim() || null;
      }
    });

    let result;
    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from('surrogate_medical_info')
        .update(updateData)
        .eq('user_id', user_id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from('surrogate_medical_info')
        .insert({
          user_id,
          ...updateData,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error('[surrogate-medical-info] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save medical info' },
      { status: 500 }
    );
  }
}

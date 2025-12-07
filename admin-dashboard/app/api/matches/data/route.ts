import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET() {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Missing Supabase configuration' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const [{ data: profiles, error: profilesError }, { data: matches, error: matchesError }] =
      await Promise.all([
        supabase
          .from('profiles')
          .select('id, name, phone, role, email')
          .in('role', ['surrogate', 'parent'])
          .order('created_at', { ascending: false }),
        supabase
          .from('surrogate_matches')
          .select('id, surrogate_id, parent_id, status, created_at, updated_at, notes')
          .order('created_at', { ascending: false }),
      ]);

    if (profilesError) throw profilesError;
    if (matchesError) throw matchesError;

    return NextResponse.json({
      profiles: profiles || [],
      matches: matches || [],
    });
  } catch (error: any) {
    console.error('Error fetching matches data (service role):', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load matches data' },
      { status: 500 }
    );
  }
}

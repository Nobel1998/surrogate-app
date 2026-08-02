import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = new Set(['admin', 'finance_manager', 'branch_manager']);

const VALID_CATEGORIES = new Set([
  'ivf_clinic',
  'attorney_escrow',
  'insurance_broker',
  'therapist',
  'ob_office',
  'retreat',
]);

function getServiceClient() {
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireStaff(req: NextRequest) {
  const adminUserId = req.cookies.get('admin_user_id')?.value;
  if (!adminUserId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!supabaseUrl || !serviceKey) {
    return {
      error: NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 }),
    };
  }

  const supabase = getServiceClient();
  const { data: sessionData, error: sessionError } = await supabase
    .from('admin_users')
    .select('id, role')
    .eq('id', adminUserId)
    .single();

  if (sessionError || !sessionData) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const role = String(sessionData.role || '').toLowerCase();
  if (!ALLOWED_ROLES.has(role)) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden. You do not have access to frequent contacts.' },
        { status: 403 }
      ),
    };
  }

  return { supabase, role, adminUserId };
}

function normalizeOptional(value: unknown) {
  if (value == null) return null;
  const s = String(value).trim();
  return s ? s : null;
}

// GET list (optional ?category=)
export async function GET(req: NextRequest) {
  const auth = await requireStaff(req);
  if ('error' in auth && auth.error) return auth.error;
  const { supabase } = auth as { supabase: ReturnType<typeof getServiceClient> };

  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const activeOnly = searchParams.get('active') === '1';

    let query = supabase
      .from('frequent_contacts')
      .select(
        'id, category, name, contact_person, phone, email, address, company, website, notes, is_active, created_at, updated_at'
      )
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (category && category !== 'all') {
      if (!VALID_CATEGORIES.has(category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      }
      query = query.eq('category', category);
    }

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ contacts: data || [] });
  } catch (error: any) {
    console.error('[frequent-contacts] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load contacts' },
      { status: 500 }
    );
  }
}

// POST create
export async function POST(req: NextRequest) {
  const auth = await requireStaff(req);
  if ('error' in auth && auth.error) return auth.error;
  const { supabase } = auth as { supabase: ReturnType<typeof getServiceClient> };

  try {
    const body = await req.json();
    const category = String(body.category || '').trim();
    const name = String(body.name || '').trim();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!VALID_CATEGORIES.has(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const email = normalizeOptional(body.email);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('frequent_contacts')
      .insert({
        category,
        name,
        contact_person: normalizeOptional(body.contact_person),
        phone: normalizeOptional(body.phone),
        email,
        address: normalizeOptional(body.address),
        company: normalizeOptional(body.company),
        website: normalizeOptional(body.website),
        notes: normalizeOptional(body.notes),
        is_active: body.is_active === false ? false : true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    console.error('[frequent-contacts] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create contact' },
      { status: 500 }
    );
  }
}

// PATCH update
export async function PATCH(req: NextRequest) {
  const auth = await requireStaff(req);
  if ('error' in auth && auth.error) return auth.error;
  const { supabase } = auth as { supabase: ReturnType<typeof getServiceClient> };

  try {
    const body = await req.json();
    const id = body.id;
    if (!id) {
      return NextResponse.json({ error: 'Missing contact id' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if (body.category != null) {
      const category = String(body.category).trim();
      if (!VALID_CATEGORIES.has(category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      }
      updates.category = category;
    }
    if (body.name != null) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }
      updates.name = name;
    }
    if ('contact_person' in body) updates.contact_person = normalizeOptional(body.contact_person);
    if ('phone' in body) updates.phone = normalizeOptional(body.phone);
    if ('email' in body) {
      const email = normalizeOptional(body.email);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }
      updates.email = email;
    }
    if ('address' in body) updates.address = normalizeOptional(body.address);
    if ('company' in body) updates.company = normalizeOptional(body.company);
    if ('website' in body) updates.website = normalizeOptional(body.website);
    if ('notes' in body) updates.notes = normalizeOptional(body.notes);
    if ('is_active' in body) updates.is_active = !!body.is_active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('frequent_contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    console.error('[frequent-contacts] PATCH error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update contact' },
      { status: 500 }
    );
  }
}

// DELETE
export async function DELETE(req: NextRequest) {
  const auth = await requireStaff(req);
  if ('error' in auth && auth.error) return auth.error;
  const { supabase } = auth as { supabase: ReturnType<typeof getServiceClient> };

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing contact id' }, { status: 400 });
    }

    const { error } = await supabase.from('frequent_contacts').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[frequent-contacts] DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete contact' },
      { status: 500 }
    );
  }
}

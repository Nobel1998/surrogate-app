'use server';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const STORAGE_BUCKET = 'contracts';

export const dynamic = 'force-dynamic';

function buildPublicUrl(path: string) {
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

export async function GET() {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data, error } = await supabase
      .from('documents')
      .select('id, document_type, url, file_name, created_at, stage_updated_by')
      .in('document_type', ['parent_contract', 'surrogate_contract'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ contracts: data || [] });
  } catch (err: any) {
    console.error('[contracts] GET error', err);
    return NextResponse.json({ error: err.message || 'Failed to load contracts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const contractType = (formData.get('contract_type') as string | null)?.toLowerCase();

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }
    if (!contractType || !['parent', 'surrogate'].includes(contractType)) {
      return NextResponse.json({ error: 'contract_type must be parent or surrogate' }, { status: 400 });
    }

    const documentType = contractType === 'parent' ? 'parent_contract' : 'surrogate_contract';
    const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
    const path = `${documentType}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const publicUrl = buildPublicUrl(path);

    const { error: insertError } = await supabase
      .from('documents')
      .insert({
        document_type: documentType,
        url: publicUrl,
        file_name: file.name,
        user_id: null,
        stage_updated_by: 'admin',
      });

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, url: publicUrl, path });
  } catch (err: any) {
    console.error('[contracts] POST error', err);
    return NextResponse.json({ error: err.message || 'Failed to upload contract' }, { status: 500 });
  }
}


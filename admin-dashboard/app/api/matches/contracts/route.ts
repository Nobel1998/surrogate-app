import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const STORAGE_BUCKET = 'documents';

export const dynamic = 'force-dynamic';

function buildPublicUrl(path: string) {
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
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
    const surrogateId = formData.get('surrogate_id') as string | null;
    const parentId = formData.get('parent_id') as string | null;
    const contractType = (formData.get('contract_type') as string | null)?.toLowerCase();

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }
    if (!surrogateId || !parentId) {
      return NextResponse.json({ error: 'surrogate_id and parent_id are required' }, { status: 400 });
    }
    if (!contractType || contractType !== 'both') {
      return NextResponse.json({ error: 'contract_type must be both' }, { status: 400 });
    }

    // Validate file extension
    const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt'];
    if (ext && !allowedExtensions.includes(ext.toLowerCase())) {
      return NextResponse.json({ error: `File format not supported. Allowed formats: ${allowedExtensions.join(', ')}` }, { status: 400 });
    }
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).slice(2);
    
    const results: any[] = [];

    // Upload file to storage
    const path = `match-contracts/${timestamp}-${randomStr}${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const publicUrl = buildPublicUrl(path);

    // Insert documents for both parties (same contract, each signs their own copy)
    const { error: insertParentError } = await supabase
      .from('documents')
      .insert({
        document_type: 'parent_contract',
        file_url: publicUrl,
        file_name: file.name,
        user_id: parentId,
      });
    if (insertParentError) throw insertParentError;
    results.push({ user_id: parentId, document_type: 'parent_contract' });

    const { error: insertSurrogateError } = await supabase
      .from('documents')
      .insert({
        document_type: 'surrogate_contract',
        file_url: publicUrl,
        file_name: file.name,
        user_id: surrogateId,
      });
    if (insertSurrogateError) throw insertSurrogateError;
    results.push({ user_id: surrogateId, document_type: 'surrogate_contract' });

    return NextResponse.json({ success: true, url: publicUrl, path, results });
  } catch (err: any) {
    console.error('[matches/contracts] POST error', err);
    return NextResponse.json({ error: err.message || 'Failed to upload contract' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { searchParams } = new URL(req.url);
    const contractId = searchParams.get('id');

    if (!contractId) {
      return NextResponse.json({ error: 'Contract ID is required' }, { status: 400 });
    }

    // First, get the contract to find the file URL
    const { data: contract, error: fetchError } = await supabase
      .from('documents')
      .select('id, file_url')
      .eq('id', contractId)
      .single();

    if (fetchError || !contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Extract file path from public URL
    // URL format: https://xxx.supabase.co/storage/v1/object/public/documents/match-contracts/xxx.txt
    const fileUrl = contract.file_url;
    let filePath: string | null = null;
    
    if (fileUrl) {
      // Try to extract path from URL
      const urlMatch = fileUrl.match(/\/storage\/v1\/object\/public\/documents\/(.+)$/);
      if (urlMatch && urlMatch[1]) {
        filePath = urlMatch[1];
      }
    }

    // Delete from documents table
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', contractId);

    if (deleteError) throw deleteError;

    // Delete file from storage if path is available
    // Note: We only delete the file if this is the last document using it
    // Check if other documents use the same file_url
    if (filePath) {
      const { data: otherDocs, error: checkError } = await supabase
        .from('documents')
        .select('id')
        .eq('file_url', fileUrl)
        .limit(1);

      // If no other documents use this file, delete it from storage
      if (!checkError && (!otherDocs || otherDocs.length === 0)) {
        const { error: storageError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([filePath]);

        if (storageError) {
          console.error('[matches/contracts] Failed to delete file from storage:', storageError);
          // Don't fail the request if storage deletion fails
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[matches/contracts] DELETE error', err);
    return NextResponse.json({ error: err.message || 'Failed to delete contract' }, { status: 500 });
  }
}



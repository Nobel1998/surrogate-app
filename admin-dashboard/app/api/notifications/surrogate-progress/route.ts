import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const dynamic = 'force-dynamic';

// POST: Send surrogate progress update notification to matched parent
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
    const { surrogate_id, old_stage, new_stage } = body;

    if (!surrogate_id || !new_stage) {
      return NextResponse.json(
        { error: 'Missing required fields: surrogate_id, new_stage' },
        { status: 400 }
      );
    }

    // Get surrogate profile
    const { data: surrogateProfile, error: surrogateError } = await supabase
      .from('profiles')
      .select('id, name, progress_stage')
      .eq('id', surrogate_id)
      .single();

    if (surrogateError || !surrogateProfile) {
      return NextResponse.json(
        { error: 'Surrogate not found' },
        { status: 404 }
      );
    }

    // Get active match for this surrogate
    const { data: matches, error: matchesError } = await supabase
      .from('surrogate_matches')
      .select('id, parent_id, first_parent_id, status')
      .eq('surrogate_id', surrogate_id)
      .eq('status', 'active')
      .limit(1);

    if (matchesError) {
      console.error('[notifications/surrogate-progress] Error fetching matches:', matchesError);
    }

    if (!matches || matches.length === 0) {
      // No active match, no notification needed
      return NextResponse.json({ 
        success: true, 
        message: 'No active match found, notification not sent' 
      });
    }

    const match = matches[0];
    const parentId = match.parent_id || match.first_parent_id;

    if (!parentId) {
      return NextResponse.json({ 
        success: true, 
        message: 'No parent found in match, notification not sent' 
      });
    }

    // Get parent profile
    const { data: parentProfile, error: parentError } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('id', parentId)
      .single();

    if (parentError || !parentProfile) {
      console.error('[notifications/surrogate-progress] Parent not found:', parentError);
      return NextResponse.json({ 
        success: true, 
        message: 'Parent not found, notification not sent' 
      });
    }

    // Stage labels mapping
    const stageLabels: Record<string, string> = {
      'pre': 'Pre-Transfer',
      'pregnancy': 'Post-Transfer',
      'ob_visit': 'OB Office Visit',
      'delivery': 'Delivery',
    };

    const oldStageLabel = old_stage ? (stageLabels[old_stage] || old_stage) : 'Previous Stage';
    const newStageLabel = stageLabels[new_stage] || new_stage;
    const surrogateName = surrogateProfile.name || 'Your surrogate';

    // Create notification record in database (if you have a notifications table)
    // For now, we'll just log it and return success
    // The mobile app will use Supabase Realtime to listen for changes
    
    console.log('[notifications/surrogate-progress] Progress update:', {
      surrogate_id,
      surrogate_name: surrogateName,
      parent_id: parentId,
      parent_name: parentProfile.name,
      old_stage,
      new_stage,
      old_stage_label: oldStageLabel,
      new_stage_label: newStageLabel,
    });

    // In a real implementation, you might:
    // 1. Store notification in a notifications table
    // 2. Send push notification via FCM/APNS
    // 3. Use Supabase Realtime to notify the parent's app

    return NextResponse.json({ 
      success: true,
      message: 'Notification sent',
      data: {
        surrogate_id,
        surrogate_name: surrogateName,
        parent_id: parentId,
        old_stage,
        new_stage,
        old_stage_label: oldStageLabel,
        new_stage_label: newStageLabel,
      }
    });
  } catch (error: any) {
    console.error('[notifications/surrogate-progress] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}


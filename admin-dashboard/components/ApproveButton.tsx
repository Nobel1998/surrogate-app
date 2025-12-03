'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface ApproveButtonProps {
  id: number;
  currentStatus?: string;
  onUpdate?: () => void;
}

export default function ApproveButton({ id, currentStatus, onUpdate }: ApproveButtonProps) {
  const [loading, setLoading] = useState(false);

  const updateStatus = async (newStatus: 'approved' | 'rejected' | 'pending') => {
    setLoading(true);
    try {
      console.log('Attempting to update application:', { id, newStatus });
      
      const { data, error } = await supabase
        .from('applications')
        .update({ 
          status: newStatus
        })
        .eq('id', id)
        .select();

      console.log('Update result:', { data, error });

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log('Application updated successfully:', data);
      
      // 触发页面刷新
      if (onUpdate) {
        onUpdate();
      } else {
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Error updating application:', error);
      alert(`Error updating application status: ${error.message || error.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    if (confirm('Are you sure you want to approve this application?')) {
      updateStatus('approved');
    }
  };

  const handleReject = () => {
    if (confirm('Are you sure you want to reject this application?')) {
      updateStatus('rejected');
    }
  };

  const handlePending = () => {
    if (confirm('Set this application back to pending status?')) {
      updateStatus('pending');
    }
  };

  if (currentStatus === 'approved') {
    return (
      <div className="flex space-x-2">
        <span className="text-green-600 text-xs font-medium">✅ Approved</span>
        <button
          onClick={handleReject}
          disabled={loading}
          className="text-red-600 hover:text-red-800 text-xs disabled:opacity-50"
        >
          {loading ? '...' : 'Reject'}
        </button>
      </div>
    );
  }

  if (currentStatus === 'rejected') {
    return (
      <div className="flex space-x-2">
        <span className="text-red-600 text-xs font-medium">❌ Rejected</span>
        <button
          onClick={handleApprove}
          disabled={loading}
          className="text-green-600 hover:text-green-800 text-xs disabled:opacity-50"
        >
          {loading ? '...' : 'Approve'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex space-x-2">
      <button
        onClick={handleApprove}
        disabled={loading}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-xs disabled:opacity-50"
      >
        {loading ? '...' : 'Approve'}
      </button>
      <button
        onClick={handleReject}
        disabled={loading}
        className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-xs disabled:opacity-50"
      >
        {loading ? '...' : 'Reject'}
      </button>
    </div>
  );
}


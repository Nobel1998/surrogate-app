'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type PaymentNode = {
  id: string;
  match_id: string;
  node_name: string;
  node_type: 'milestone' | 'monthly' | 'one-time';
  amount: number;
  due_date: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_date: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  receipt_image_url: string | null;
  created_at: string;
  updated_at: string;
  match?: {
    id: string;
    surrogate_id: string;
    parent_id: string;
    status: string;
    surrogate?: {
      id: string;
      name: string;
      phone: string;
    };
    parent?: {
      id: string;
      name: string;
      phone: string;
    };
  };
};

type Match = {
  id: string;
  surrogate_id: string;
  parent_id: string;
  status: string;
  surrogate?: {
    id: string;
    name: string;
    phone: string;
  };
  parent?: {
    id: string;
    name: string;
    phone: string;
  };
};

type ClientPayment = {
  id: string;
  match_id: string;
  payment_installment: 'Installment 1' | 'Installment 2' | 'Installment 3' | 'Installment 4';
  amount: number;
  payment_date: string;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  receipt_image_url: string | null;
  created_at: string;
  updated_at: string;
  match?: {
    id: string;
    surrogate_id: string;
    parent_id: string;
    status: string;
    surrogate?: {
      id: string;
      name: string;
      phone: string;
    };
    parent?: {
      id: string;
      name: string;
      phone: string;
    };
  };
};

const INSTALLMENT_OPTIONS: Array<'Installment 1' | 'Installment 2' | 'Installment 3' | 'Installment 4'> = 
  ['Installment 1', 'Installment 2', 'Installment 3', 'Installment 4'];

export default function PaymentNodesPage() {
  const [paymentNodes, setPaymentNodes] = useState<PaymentNode[]>([]);
  const [clientPayments, setClientPayments] = useState<ClientPayment[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [selectedNode, setSelectedNode] = useState<PaymentNode | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<ClientPayment | null>(null);
  const [filterPaymentType, setFilterPaymentType] = useState<string>('all'); // 'all', 'nodes', 'payments'
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMatchId, setFilterMatchId] = useState<string>('all');
  const [filterMatchStatus, setFilterMatchStatus] = useState<string>('all');
  const [filterInstallment, setFilterInstallment] = useState<string>('all');

  // Form state for payment nodes
  const [formData, setFormData] = useState({
    match_id: '',
    node_name: '',
    node_type: 'milestone' as 'milestone' | 'monthly' | 'one-time',
    amount: '',
    due_date: '',
    status: 'pending' as 'pending' | 'paid' | 'overdue' | 'cancelled',
    payment_date: '',
    payment_method: '',
    payment_reference: '',
    notes: '',
    receipt_image_url: '',
  });
  const [uploadingNodeImage, setUploadingNodeImage] = useState(false);
  const [previewNodeImage, setPreviewNodeImage] = useState<string | null>(null);

  // Form state for client payments
  const [paymentFormData, setPaymentFormData] = useState({
    match_id: '',
    payment_installment: 'Installment 1' as 'Installment 1' | 'Installment 2' | 'Installment 3' | 'Installment 4',
    amount: '',
    payment_date: '',
    payment_method: '',
    payment_reference: '',
    notes: '',
    receipt_image_url: '',
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [filterStatus, filterMatchId, filterMatchStatus, filterInstallment, filterPaymentType]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load matches
      const matchesRes = await fetch('/api/matches/options');
      if (!matchesRes.ok) {
        throw new Error(`Failed to load matches: ${matchesRes.statusText}`);
      }
      const matchesData = await matchesRes.json();
      
      console.log('[payment-nodes] API response:', {
        hasMatches: !!matchesData.matches,
        matchesCount: matchesData.matches?.length || 0,
        hasProfiles: !!matchesData.profiles,
        profilesCount: matchesData.profiles?.length || 0,
        keys: Object.keys(matchesData),
      });
      
      // The API returns { matches: [...], profiles: [...] }
      // We need to enrich matches with surrogate and parent info from profiles
      const matches = matchesData.matches || [];
      const profiles = matchesData.profiles || [];
      
      // Create a map of profiles by id for quick lookup
      const profilesMap = new Map(profiles.map((p: any) => [p.id, p]));
      
      // Enrich matches with surrogate and parent information
      const enrichedMatches = matches.map((match: any) => {
        const surrogate = profilesMap.get(match.surrogate_id) || null;
        const parent = profilesMap.get(match.parent_id) || null;
        
        return {
          ...match,
          surrogate,
          parent,
        };
      });
      
      console.log('[payment-nodes] Loaded matches:', {
        total: enrichedMatches.length,
        sample: enrichedMatches.slice(0, 3).map((m: any) => ({
          id: m.id,
          surrogate_id: m.surrogate_id,
          parent_id: m.parent_id,
          surrogate: m.surrogate?.name || 'N/A',
          parent: m.parent?.name || 'N/A',
          status: m.status,
        })),
      });
      
      if (enrichedMatches.length === 0) {
        console.warn('[payment-nodes] No matches found!');
      }
      
      setMatches(enrichedMatches);

      // Load payment nodes
      let url = '/api/payment-nodes';
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      if (filterMatchId !== 'all') {
        params.append('match_id', filterMatchId);
      }
      if (params.toString()) {
        url += '?' + params.toString();
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load payment nodes: ${res.statusText}`);
      }
      const data = await res.json();
      
      console.log('[payment-nodes] Loaded payment nodes:', {
        response: data,
        nodesCount: data.data?.length || 0,
        nodes: data.data?.slice(0, 3) || [],
      });
      
      setPaymentNodes(data.data || []);

      // Always load client payments
      let paymentsUrl = '/api/client-payments';
      const paymentParams = new URLSearchParams();
      if (filterMatchId !== 'all') {
        paymentParams.append('match_id', filterMatchId);
      }
      if (filterInstallment !== 'all') {
        paymentParams.append('installment', filterInstallment);
      }
      if (paymentParams.toString()) {
        paymentsUrl += '?' + paymentParams.toString();
      }

      const paymentsRes = await fetch(paymentsUrl);
      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        setClientPayments(paymentsData.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      match_id: '',
      node_name: '',
      node_type: 'milestone',
      amount: '',
      due_date: '',
      status: 'pending',
      payment_date: '',
      payment_method: '',
      payment_reference: '',
      notes: '',
      receipt_image_url: '',
    });
    setPreviewNodeImage(null);
    setShowAddModal(true);
  };

  const handleEdit = (node: PaymentNode) => {
    setSelectedNode(node);
    
    // Extract date part (YYYY-MM-DD) for date inputs
    // This ensures the date input shows the correct date without timezone issues
    const formatDateForInput = (dateStr: string | null) => {
      if (!dateStr) return '';
      // Extract date part if it's a full ISO string, otherwise use as-is
      return dateStr.split('T')[0];
    };
    
    setFormData({
      match_id: node.match_id,
      node_name: node.node_name,
      node_type: node.node_type,
      amount: node.amount.toString(),
      due_date: formatDateForInput(node.due_date),
      status: node.status,
      payment_date: formatDateForInput(node.payment_date),
      payment_method: node.payment_method || '',
      payment_reference: node.payment_reference || '',
      notes: node.notes || '',
      receipt_image_url: node.receipt_image_url || '',
    });
    setPreviewNodeImage(node.receipt_image_url || null);
    setShowEditModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = showEditModal ? '/api/payment-nodes' : '/api/payment-nodes';
      const method = showEditModal ? 'PATCH' : 'POST';
      const body = showEditModal
        ? { id: selectedNode?.id, ...formData }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      const result = await res.json();
      console.log('[payment-nodes] Save result:', {
        method,
        result,
        success: result.success,
        data: result.data,
      });

      if (!result.success && result.error) {
        throw new Error(result.error);
      }

      alert(showEditModal ? 'Payment node updated successfully' : 'Payment node created successfully');
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedNode(null);
      setPreviewNodeImage(null);
      
      // Reload data to get the latest payment nodes with match information
      // Use setTimeout to ensure modal is fully closed before reloading
      setTimeout(async () => {
        try {
          await loadData();
          console.log('[payment-nodes] Data reloaded after save');
        } catch (err) {
          console.error('[payment-nodes] Error reloading data after save:', err);
          // Don't show error to user, just log it - the data will refresh on next page load
        }
      }, 200);
    } catch (error: any) {
      console.error('Error saving payment node:', error);
      alert(error.message || 'Failed to save payment node');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment node?')) {
      return;
    }

    try {
      const res = await fetch(`/api/payment-nodes?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete payment node');
      }

      alert('Payment node deleted successfully');
      loadData();
    } catch (error: any) {
      console.error('Error deleting payment node:', error);
      alert(error.message || 'Failed to delete payment node');
    }
  };

  // Client Payment handlers
  const handleAddPayment = () => {
    setPaymentFormData({
      match_id: '',
      payment_installment: 'Installment 1',
      amount: '',
      payment_date: '',
      payment_method: '',
      payment_reference: '',
      notes: '',
      receipt_image_url: '',
    });
    setPreviewImage(null);
    setShowAddPaymentModal(true);
  };

  const handleEditPayment = (payment: ClientPayment) => {
    setSelectedPayment(payment);
    
    // Format date for input field (handle both DATE and TIMESTAMP formats)
    const formatDateForInput = (dateStr: string) => {
      if (!dateStr) return '';
      // Extract date part if it's a full ISO string, otherwise use as-is
      return dateStr.split('T')[0];
    };
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'payment-nodes/page.tsx:381',
        message: 'handleEditPayment called',
        data: {
          paymentId: payment.id,
          hasReceiptImageUrl: !!payment.receipt_image_url,
          receiptImageUrl: payment.receipt_image_url,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'A',
      }),
    }).catch(() => {});
    // #endregion
    
    setPaymentFormData({
      match_id: payment.match_id,
      payment_installment: payment.payment_installment,
      amount: payment.amount.toString(),
      payment_date: formatDateForInput(payment.payment_date),
      payment_method: payment.payment_method || '',
      payment_reference: payment.payment_reference || '',
      notes: payment.notes || '',
      receipt_image_url: payment.receipt_image_url || '',
    });
    setPreviewImage(payment.receipt_image_url || null);
    setShowEditPaymentModal(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = '/api/client-payments';
      const method = showEditPaymentModal ? 'PATCH' : 'POST';
      const body = showEditPaymentModal
        ? { id: selectedPayment?.id, ...paymentFormData }
        : paymentFormData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      const result = await res.json();
      if (!result.success && result.error) {
        throw new Error(result.error);
      }

      alert(showEditPaymentModal ? 'Payment record updated successfully' : 'Payment record created successfully');
      setShowAddPaymentModal(false);
      setShowEditPaymentModal(false);
      setSelectedPayment(null);
      setPreviewImage(null);
      
      setTimeout(async () => {
        try {
          await loadData();
        } catch (err) {
          console.error('Error reloading data:', err);
        }
      }, 200);
    } catch (error: any) {
      console.error('Error saving payment:', error);
      alert(error.message || 'Failed to save payment record');
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment record?')) {
      return;
    }

    try {
      const res = await fetch(`/api/client-payments?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete payment record');
      }

      alert('Payment record deleted successfully');
      loadData();
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      alert(error.message || 'Failed to delete payment record');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Only images (JPEG, PNG, GIF, WebP) are allowed.');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('File size too large. Maximum size is 5MB.');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/client-payments/upload-receipt', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to upload image');
      }

      const result = await res.json();
      setPaymentFormData({ ...paymentFormData, receipt_image_url: result.url });
      setPreviewImage(result.url);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert(error.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setPaymentFormData({ ...paymentFormData, receipt_image_url: '' });
    setPreviewImage(null);
  };

  const handleNodeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Only images (JPEG, PNG, GIF, WebP) are allowed.');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('File size too large. Maximum size is 5MB.');
      return;
    }

    setUploadingNodeImage(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const res = await fetch('/api/client-payments/upload-receipt', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to upload image');
      }

      const result = await res.json();
      setFormData((prev) => ({ ...prev, receipt_image_url: result.url }));
      setPreviewNodeImage(result.url);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert(error.message || 'Failed to upload image');
    } finally {
      setUploadingNodeImage(false);
    }
  };

  const handleRemoveNodeImage = () => {
    setFormData({ ...formData, receipt_image_url: '' });
    setPreviewNodeImage(null);
  };

  const getInstallmentColor = (installment: string) => {
    switch (installment) {
      case 'Installment 1':
        return 'bg-blue-100 text-blue-800';
      case 'Installment 2':
        return 'bg-green-100 text-green-800';
      case 'Installment 3':
        return 'bg-yellow-100 text-yellow-800';
      case 'Installment 4':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredPayments = clientPayments.filter((payment) => {
    if (filterMatchId !== 'all' && payment.match_id !== filterMatchId) return false;
    if (filterInstallment !== 'all' && payment.payment_installment !== filterInstallment) return false;
    if (filterMatchStatus !== 'all') {
      const match = matches.find((m) => m.id === payment.match_id);
      if (!match || match.status !== filterMatchStatus) return false;
    }
    return true;
  });

  const totalPaymentAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);

  const filteredNodes = paymentNodes.filter((node) => {
    if (filterStatus !== 'all' && node.status !== filterStatus) return false;
    if (filterMatchId !== 'all' && node.match_id !== filterMatchId) return false;
    if (filterMatchStatus !== 'all') {
      const match = matches.find((m) => m.id === node.match_id);
      if (!match || match.status !== filterMatchStatus) return false;
    }
    return true;
  });

  // Combined filtered data for unified view
  type UnifiedPayment = {
    id: string;
    type: 'node' | 'payment';
    match_id: string;
    match?: {
      id: string;
      surrogate_id: string;
      parent_id: string;
      status: string;
      surrogate?: { id: string; name: string; phone: string };
      parent?: { id: string; name: string; phone: string };
    };
    // Payment Node fields
    node_name?: string;
    node_type?: 'milestone' | 'monthly' | 'one-time';
    due_date?: string | null;
    status?: 'pending' | 'paid' | 'overdue' | 'cancelled';
    payment_date?: string | null;
    payment_method?: string | null;
    payment_reference?: string | null;
    notes?: string | null;
    // Client Payment fields
    payment_installment?: 'Installment 1' | 'Installment 2' | 'Installment 3' | 'Installment 4';
    receipt_image_url?: string | null;
    // Common fields
    amount: number;
    created_at: string;
    updated_at: string;
  };

  const unifiedPayments: UnifiedPayment[] = [
    ...filteredNodes.map((node): UnifiedPayment => ({
      id: node.id,
      type: 'node',
      match_id: node.match_id,
      match: node.match,
      node_name: node.node_name,
      node_type: node.node_type,
      due_date: node.due_date,
      status: node.status,
      payment_date: node.payment_date,
      payment_method: node.payment_method,
      payment_reference: node.payment_reference,
      notes: node.notes,
      receipt_image_url: node.receipt_image_url,
      amount: node.amount,
      created_at: node.created_at,
      updated_at: node.updated_at,
    })),
    ...filteredPayments.map((payment): UnifiedPayment => ({
      id: payment.id,
      type: 'payment',
      match_id: payment.match_id,
      match: payment.match,
      payment_installment: payment.payment_installment,
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      payment_reference: payment.payment_reference,
      notes: payment.notes,
      receipt_image_url: payment.receipt_image_url,
      amount: payment.amount,
      created_at: payment.created_at,
      updated_at: payment.updated_at,
    })),
  ].sort((a, b) => {
    // Sort by payment date (most recent first), then by created_at
    const dateA = a.payment_date || a.created_at;
    const dateB = b.payment_date || b.created_at;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  // Filter by payment type
  const finalFilteredPayments = unifiedPayments.filter((payment) => {
    if (filterPaymentType === 'nodes' && payment.type !== 'node') return false;
    if (filterPaymentType === 'payments' && payment.type !== 'payment') return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getNodeTypeColor = (type: string) => {
    switch (type) {
      case 'milestone':
        return 'bg-blue-100 text-blue-800';
      case 'monthly':
        return 'bg-purple-100 text-purple-800';
      case 'one-time':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    
    // For DATE type (YYYY-MM-DD), parse directly without timezone conversion
    // Extract date part if it's a full ISO string
    const dateOnly = dateString.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    
    // Create date in local timezone to avoid UTC conversion issues
    const date = new Date(year, month - 1, day);
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Payment Nodes represent amounts that should be paid (not actual payments)
  // They are just records of what customers should pay, regardless of status
  const totalNodeAmount = filteredNodes.reduce((sum, node) => sum + node.amount, 0);
  const pendingNodeAmount = filteredNodes
    .filter((node) => node.status === 'pending')
    .reduce((sum, node) => sum + node.amount, 0);

  // Combined statistics
  const combinedTotalRecords = finalFilteredPayments.length;
  // Total Amount Due: Payment nodes total minus actual payments made
  // This shows the remaining amount that customers still need to pay
  const totalAmountDue = Math.max(0, totalNodeAmount - totalPaymentAmount);
  // Paid Amount: Only Client Payments (actual payments made)
  // Payment Nodes are just records of amounts due, not actual payments
  const combinedPaidAmount = totalPaymentAmount;
  // Pending Amount: Only pending payment nodes (amounts that should be paid but haven't been)
  const combinedPendingAmount = pendingNodeAmount;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
            <p className="text-gray-600 mt-1">Manage payment nodes and client payment records</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <span>+</span>
              <span>Add Payment Node</span>
            </button>
            <button
              onClick={handleAddPayment}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <span>+</span>
              <span>Add Payment Record</span>
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Records</div>
            <div className="text-2xl font-bold text-gray-900">{combinedTotalRecords}</div>
            <div className="text-xs text-gray-500 mt-1">
              {filteredNodes.length} nodes, {filteredPayments.length} payments
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Amount Due</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmountDue)}</div>
            <div className="text-xs text-gray-500 mt-1">
              Payment nodes - Payments made
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Paid Amount</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(combinedPaidAmount)}</div>
            <div className="text-xs text-gray-500 mt-1">
              Client payments (actual payments)
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Pending Amount</div>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(combinedPendingAmount)}</div>
            <div className="text-xs text-gray-500 mt-1">
              Unpaid payment nodes
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Type
              </label>
              <select
                value={filterPaymentType}
                onChange={(e) => setFilterPaymentType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">All Types</option>
                <option value="nodes">Payment Nodes</option>
                <option value="payments">Client Payments</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Match Status
              </label>
              <select
                value={filterMatchStatus}
                onChange={(e) => setFilterMatchStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Match
              </label>
              <select
                value={filterMatchId}
                onChange={(e) => setFilterMatchId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">All Matches</option>
                {matches.length === 0 ? (
                  <option value="all" disabled>No matches available</option>
                ) : (
                  matches.map((match: any) => {
                    const surrogateName = match.surrogate?.name || match.surrogate_id?.substring(0, 8) || 'Surrogate';
                    const parentName = match.parent?.name || match.parent_id?.substring(0, 8) || 'Parent';
                    return (
                      <option key={match.id} value={match.id}>
                        {surrogateName} - {parentName} {match.status ? `(${match.status})` : ''}
                      </option>
                    );
                  })
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Installment
              </label>
              <select
                value={filterInstallment}
                onChange={(e) => setFilterInstallment(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">All Installments</option>
                {INSTALLMENT_OPTIONS.map((inst) => (
                  <option key={inst} value={inst}>
                    {inst}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Unified Payment Table */}
        {loading ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <div className="text-gray-600">Loading payments...</div>
          </div>
        ) : finalFilteredPayments.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <div className="text-gray-600">No payments found</div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Match
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name/Installment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Node Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Receipt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {finalFilteredPayments.map((payment) => (
                  <tr key={`${payment.type}-${payment.id}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        payment.type === 'node' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {payment.type === 'node' ? 'Node' : 'Payment'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {payment.match?.surrogate?.name || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {payment.match?.parent?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.type === 'node' ? (
                        <div className="text-sm font-medium text-gray-900">{payment.node_name}</div>
                      ) : (
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getInstallmentColor(payment.payment_installment!)}`}>
                          {payment.payment_installment}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.type === 'node' && payment.node_type ? (
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getNodeTypeColor(payment.node_type)}`}>
                          {payment.node_type}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {payment.type === 'node' ? formatDate(payment.due_date || null) : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.type === 'node' && payment.status ? (
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Paid
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(payment.payment_date || null)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{payment.payment_method || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{payment.payment_reference || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.receipt_image_url ? (
                        <a
                          href={payment.receipt_image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block"
                        >
                          <img
                            src={payment.receipt_image_url}
                            alt="Payment receipt"
                            className="w-16 h-16 object-cover rounded border border-gray-300 hover:opacity-75 cursor-pointer"
                          />
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {payment.type === 'node' ? (
                        <>
                          <button
                            onClick={() => {
                              // Find the node from the original paymentNodes array
                              const node = paymentNodes.find(n => n.id === payment.id);
                              if (node) {
                                handleEdit(node);
                              } else {
                                console.error('Payment node not found:', payment.id);
                                alert('Payment node not found. Please refresh the page.');
                              }
                            }}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(payment.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              const clientPayment = clientPayments.find(p => p.id === payment.id);
                              if (clientPayment) {
                                handleEditPayment(clientPayment);
                              } else {
                                console.error('Client payment not found:', payment.id);
                                alert('Client payment not found. Please refresh the page.');
                              }
                            }}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePayment(payment.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add/Edit Modal for Payment Nodes */}
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  {showEditModal ? 'Edit Payment Node' : 'Add Payment Node'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedNode(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Match *
                  </label>
                  <select
                    required
                    value={formData.match_id}
                    onChange={(e) => setFormData({ ...formData, match_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    disabled={showEditModal}
                  >
                    <option value="">Select a match</option>
                    {matches.length === 0 ? (
                      <option value="" disabled>No matches available</option>
                    ) : (
                      matches.map((match: any) => {
                        const surrogateName = match.surrogate?.name || match.surrogate_id?.substring(0, 8) || 'Surrogate';
                        const parentName = match.parent?.name || match.parent_id?.substring(0, 8) || 'Parent';
                        return (
                          <option key={match.id} value={match.id}>
                            {surrogateName} - {parentName} {match.status ? `(${match.status})` : ''}
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Node Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.node_name}
                    onChange={(e) => setFormData({ ...formData, node_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., Contract Signing, Transfer Success, Monthly Allowance"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Node Type *
                    </label>
                    <select
                      required
                      value={formData.node_type}
                      onChange={(e) => setFormData({ ...formData, node_type: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="milestone">Milestone</option>
                      <option value="monthly">Monthly</option>
                      <option value="one-time">One-time</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount ($) *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status *
                    </label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {formData.status === 'paid' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Date
                      </label>
                      <input
                        type="date"
                        value={formData.payment_date}
                        onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Method
                      </label>
                      <input
                        type="text"
                        value={formData.payment_method}
                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="e.g., Bank Transfer, Check, Wire"
                      />
                    </div>
                  </div>
                )}

                {formData.status === 'paid' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Reference
                    </label>
                    <input
                      type="text"
                      value={formData.payment_reference}
                      onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Transaction ID, Check Number, etc."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    rows={3}
                    placeholder="Additional notes about this payment node..."
                  />
                </div>

                <div className="border-t-2 border-blue-200 pt-6 mt-4 bg-blue-50 p-4 rounded-lg">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Payment Receipt Image
                  </label>
                  <div className="space-y-3">
                    {previewNodeImage || formData.receipt_image_url ? (
                      <div className="relative inline-block">
                        <img
                          src={previewNodeImage || formData.receipt_image_url || ''}
                          alt="Receipt preview"
                          className="w-full max-w-md h-48 object-contain border-2 border-gray-300 rounded-lg bg-white shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveNodeImage}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 text-lg font-bold shadow-lg"
                          title="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 italic">
                        No receipt image uploaded yet
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <label className="flex-1 cursor-pointer">
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                          onChange={handleNodeImageUpload}
                          disabled={uploadingNodeImage}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                        />
                      </label>
                      {uploadingNodeImage && (
                        <span className="text-sm text-blue-600 font-medium">Uploading...</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {showEditModal 
                        ? 'Upload or update the payment receipt screenshot (JPEG, PNG, GIF, WebP, max 5MB)'
                        : 'Upload a screenshot of the payment receipt (JPEG, PNG, GIF, WebP, max 5MB)'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      setSelectedNode(null);
                      setPreviewNodeImage(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {showEditModal ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add/Edit Modal for Client Payments */}
        {(showAddPaymentModal || showEditPaymentModal) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {showEditPaymentModal ? 'Edit Payment Record' : 'Add Payment Record'}
                </h2>
                <form onSubmit={handleSubmitPayment} className="space-y-4">
                  {/* #region agent log */}
                  {(() => {
                    fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        location: 'payment-nodes/page.tsx:1271',
                        message: 'Payment form rendered',
                        data: {
                          showAddPaymentModal,
                          showEditPaymentModal,
                          hasReceiptImageUrl: !!paymentFormData.receipt_image_url,
                          hasPreviewImage: !!previewImage,
                        },
                        timestamp: Date.now(),
                        sessionId: 'debug-session',
                        runId: 'run1',
                        hypothesisId: 'A',
                      }),
                    }).catch(() => {});
                    return null;
                  })()}
                  {/* #endregion */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Match *
                    </label>
                    <select
                      required
                      value={paymentFormData.match_id}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, match_id: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      disabled={showEditPaymentModal}
                    >
                      <option value="">Select a match</option>
                      {matches.map((match: any) => {
                        const surrogateName = match.surrogate?.name || match.surrogate_id?.substring(0, 8) || 'Surrogate';
                        const parentName = match.parent?.name || match.parent_id?.substring(0, 8) || 'Parent';
                        return (
                          <option key={match.id} value={match.id}>
                            {surrogateName} - {parentName} {match.status ? `(${match.status})` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Installment *
                    </label>
                    <select
                      required
                      value={paymentFormData.payment_installment}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_installment: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">Select an installment</option>
                      <option value="Installment 1">Installment 1</option>
                      <option value="Installment 2">Installment 2</option>
                      <option value="Installment 3">Installment 3</option>
                      <option value="Installment 4">Installment 4</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={paymentFormData.amount}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={paymentFormData.payment_date}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method
                    </label>
                    <input
                      type="text"
                      value={paymentFormData.payment_method}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_method: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="e.g., Bank Transfer, Credit Card, Check"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Reference
                    </label>
                    <input
                      type="text"
                      value={paymentFormData.payment_reference}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_reference: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Transaction ID, Check Number, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={paymentFormData.notes}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      rows={3}
                      placeholder="Additional notes..."
                    />
                  </div>

                  <div className="border-t-2 border-blue-200 pt-6 mt-4 bg-blue-50 p-4 rounded-lg">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      Payment Receipt Image
                    </label>
                    {/* #region agent log */}
                    {(() => {
                      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          location: 'payment-nodes/page.tsx:1405',
                          message: 'Receipt image section rendered',
                          data: {
                            showEditPaymentModal,
                            showAddPaymentModal,
                            hasPreviewImage: !!previewImage,
                            hasReceiptImageUrl: !!paymentFormData.receipt_image_url,
                            receiptImageUrl: paymentFormData.receipt_image_url,
                          },
                          timestamp: Date.now(),
                          sessionId: 'debug-session',
                          runId: 'run1',
                          hypothesisId: 'B',
                        }),
                      }).catch(() => {});
                      return null;
                    })()}
                    {/* #endregion */}
                    <div className="space-y-3">
                      {previewImage || paymentFormData.receipt_image_url ? (
                        <div className="relative inline-block">
                          <img
                            src={previewImage || paymentFormData.receipt_image_url || ''}
                            alt="Receipt preview"
                            className="w-full max-w-md h-48 object-contain border-2 border-gray-300 rounded-lg bg-white shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 text-lg font-bold shadow-lg"
                            title="Remove image"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 italic">
                          No receipt image uploaded yet
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <label className="flex-1 cursor-pointer">
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                          />
                        </label>
                        {uploadingImage && (
                          <span className="text-sm text-blue-600 font-medium">Uploading...</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {showEditPaymentModal 
                          ? 'Upload or update the payment receipt screenshot (JPEG, PNG, GIF, WebP, max 5MB)'
                          : 'Upload a screenshot of the payment receipt (JPEG, PNG, GIF, WebP, max 5MB)'}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddPaymentModal(false);
                        setShowEditPaymentModal(false);
                        setSelectedPayment(null);
                        setPreviewImage(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      {showEditPaymentModal ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


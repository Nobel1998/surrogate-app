'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import DateInput from '@/components/DateInput';

// Stage labels for displaying friendly names
const STAGE_LABELS: Record<string, string> = {
  'pre': 'Pre-Screening',
  'match': 'Matching',
  'medical': 'Medical Screening',
  'legal': 'Legal Process',
  'transfer': 'Embryo Transfer',
  'pregnancy': 'Pregnancy',
  'delivery': 'Delivery',
  'postpartum': 'Postpartum',
  'complete': 'Complete',
};

// Admin note stage options (for Add Admin Note) — stage is required
const ADMIN_NOTE_STAGES: { value: string; label: string }[] = [
  { value: 'pre_transfer', label: 'Pre-Transfer' },
  { value: 'post_transfer', label: 'Post-Transfer' },
  { value: 'ob_visit', label: 'OB Office Visit' },
  { value: 'delivery', label: 'Delivery' },
];
const ADMIN_NOTE_STAGE_LABEL: Record<string, string> = Object.fromEntries(
  ADMIN_NOTE_STAGES.map((s) => [s.value, s.label])
);

const MAX_ADMIN_NOTE_IMAGES = 6;
const MAX_ADMIN_NOTE_IMAGE_MB = 8;
const MAX_MEDICAL_PROOF_IMAGE_MB = 8;

type PendingAdminNoteImage = { file: File; url: string };
type PendingMedicalProofImage = { file: File; url: string };

type CaseDetail = {
  id: string;
  claim_id: string;
  surrogate_id?: string;
  first_parent_id?: string;
  second_parent_id?: string;
  case_type?: string;
  current_step?: string;
  weeks_pregnant?: number;
  estimated_due_date?: string;
  number_of_fetuses?: number;
  fetal_beat_confirm?: string;
  sign_date?: string;
  transfer_date?: string;
  beta_confirm_date?: string;
  due_date?: string;
  clinic?: string;
  embryos?: string;
  lawyer?: string;
  company?: string;
  egg_donation?: string;
  sperm_donation?: string;
  status?: string;
  surrogate?: any;
  first_parent?: any;
  second_parent?: any;
  managers?: Array<{ id: string; name: string }>;
};

type SurrogateApplication = {
  full_name?: string;
  phone?: string;
  form_data?: string;
  status?: string;
  created_at?: string;
};

type MedicalInfo = {
  ivf_clinic_name?: string;
  ivf_clinic_doctor_name?: string;
  ivf_clinic_address?: string;
  ivf_clinic_phone?: string;
  obgyn_doctor_name?: string;
  obgyn_clinic_name?: string;
  obgyn_clinic_address?: string;
  obgyn_clinic_phone?: string;
  delivery_hospital_name?: string;
  delivery_hospital_address?: string;
  delivery_hospital_phone?: string;
};

export default function StepStatusPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [adminUpdate, setAdminUpdate] = useState('');
  const [adminNoteStage, setAdminNoteStage] = useState('pre_transfer');
  const [editingAdminNoteId, setEditingAdminNoteId] = useState<string | null>(null);
  const [existingAdminNoteImages, setExistingAdminNoteImages] = useState<
    Array<{ id: string; image_url: string; file_name?: string | null }>
  >([]);
  const [removedAdminNoteImageIds, setRemovedAdminNoteImageIds] = useState<string[]>([]);
  const [pendingAdminNoteImages, setPendingAdminNoteImages] = useState<PendingAdminNoteImage[]>([]);
  const pendingAdminNoteImagesRef = useRef<PendingAdminNoteImage[]>([]);
  const adminNoteFileInputRef = useRef<HTMLInputElement | null>(null);
  const adminNoteFormSectionRef = useRef<HTMLDivElement | null>(null);
  const [pendingMedicalProofImage, setPendingMedicalProofImage] = useState<PendingMedicalProofImage | null>(null);
  const [existingMedicalProofUrl, setExistingMedicalProofUrl] = useState<string | null>(null);
  const [editingMedicalReportId, setEditingMedicalReportId] = useState<string | null>(null);
  const medicalProofFileInputRef = useRef<HTMLInputElement | null>(null);
  const medicalFormSectionRef = useRef<HTMLDivElement | null>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [medicalReports, setMedicalReports] = useState<any[]>([]);
  const [obAppointments, setObAppointments] = useState<any[]>([]);
  const [ivfAppointments, setIvfAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [surrogateApp, setSurrogateApp] = useState<SurrogateApplication | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [medicalInfo, setMedicalInfo] = useState<MedicalInfo | null>(null);

  const [updateTab, setUpdateTab] = useState<'note' | 'medical'>('note');
  const [medicalStage, setMedicalStage] = useState('Pre-Transfer');
  const [medicalVisitDate, setMedicalVisitDate] = useState('');
  const [medicalProviderName, setMedicalProviderName] = useState('');
  const [medicalProviderContact, setMedicalProviderContact] = useState('');
  const [savingMedical, setSavingMedical] = useState(false);
  const [selectedMedicalReport, setSelectedMedicalReport] = useState<any | null>(null);
  const [selectedAdminNote, setSelectedAdminNote] = useState<any | null>(null);
  const [medicalReportData, setMedicalReportData] = useState<any>({});

  const handleMedicalReportDataChange = (key: string, value: any) => {
    setMedicalReportData((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleMedicalReportCheckboxChange = (groupKey: string, value: string, checked: boolean) => {
    setMedicalReportData((prev: any) => {
      const current = prev[groupKey] || [];
      if (checked) {
        return { ...prev, [groupKey]: [...current, value] };
      } else {
        return { ...prev, [groupKey]: current.filter((item: string) => item !== value) };
      }
    });
  };

  const isMedicalCheckboxChecked = (groupKey: string, value: string) => {
    const arr = medicalReportData[groupKey] || [];
    return Array.isArray(arr) && arr.includes(value);
  };

  useEffect(() => {
    if (caseId) {
      loadData();
    }
  }, [caseId]);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const res = await fetch('/api/auth/check');
        if (res.ok) {
          const data = await res.json();
          setReadOnly(!!data.user?.read_only);
        }
      } catch {
        // ignore
      }
    };
    loadAuth();
  }, []);

  useEffect(() => {
    pendingAdminNoteImagesRef.current = pendingAdminNoteImages;
  }, [pendingAdminNoteImages]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [caseRes, updatesRes] = await Promise.all([
        fetch(`/api/cases/${caseId}`),
        fetch(`/api/cases/${caseId}/updates`),
      ]);

      if (!caseRes.ok) throw new Error('Failed to load case');

      const caseDataRes = await caseRes.json();
      const updatesData = updatesRes.ok ? await updatesRes.json() : { updates: [] };

      setCaseData(caseDataRes.case);
      setUpdates(updatesData.updates || []);

      // Load surrogate application if surrogate exists
      if (caseDataRes.case?.surrogate_id) {
        try {
          const appRes = await fetch(`/api/applications?user_id=${caseDataRes.case.surrogate_id}`);
          if (appRes.ok) {
            const appData = await appRes.json();
            if (appData.data && appData.data.length > 0) {
              setSurrogateApp(appData.data[0]);
              if (appData.data[0].form_data) {
                try {
                  setFormData(JSON.parse(appData.data[0].form_data));
                } catch (e) {
                  console.error('Error parsing form_data:', e);
                }
              }
            }
          }
        } catch (e) {
          console.error('Error loading surrogate application:', e);
        }

        // Load medical info
        try {
          const medRes = await fetch(`/api/surrogate-medical-info?user_id=${caseDataRes.case.surrogate_id}`);
          if (medRes.ok) {
            const medData = await medRes.json();
            setMedicalInfo(medData.data);
          }
        } catch (e) {
          console.error('Error loading medical info:', e);
        }

        // Load activity data (medical reports, appointments)
        // We'll load this data from the matches/options API.
        try {
          const activityRes = await fetch('/api/matches/options');
          if (activityRes.ok) {
            const activityData = await activityRes.json();
            const allReports = activityData.medicalReports || [];
            const allOBAppointments = activityData.obAppointments || [];
            const allIVFAppointments = activityData.ivfAppointments || [];
            
            // Filter by surrogate_id
            const surrogateReports = allReports.filter((r: any) => r.user_id === caseDataRes.case.surrogate_id);
            const surrogateOBAppointments = allOBAppointments.filter((a: any) => a.user_id === caseDataRes.case.surrogate_id);
            const surrogateIVFAppointments = allIVFAppointments.filter((a: any) => a.user_id === caseDataRes.case.surrogate_id);
            
            setMedicalReports(surrogateReports);
            setObAppointments(surrogateOBAppointments);
            setIvfAppointments(surrogateIVFAppointments);
          }
        } catch (e) {
          console.error('Error loading activity data:', e);
        }
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        return `${month}/${day}/${year}`;
      }
      return new Date(dateStr).toLocaleDateString('en-US');
    } catch {
      return dateStr;
    }
  };

  const formatDateOnly = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        return `${month}/${day}/${year}`;
      }
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const year = date.getUTCFullYear();
      return `${month}/${day}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const deleteMedicalReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this medical check-in? This action cannot be undone and will also remove associated points rewards.')) {
      return;
    }

    try {
      const res = await fetch(`/api/matches/medical-reports?id=${reportId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Delete failed: ${res.status} ${errText}`);
      }

      alert('Medical check-in deleted successfully!');
      await loadData();
    } catch (err: any) {
      console.error('Error deleting medical report:', err);
      alert(err.message || 'Failed to delete medical check-in');
    }
  };

  // Calculate estimated due date from transfer date if not available
  const calculateEstimatedDueDate = () => {
    // First check if estimated_due_date or due_date is already set
    if (caseData?.estimated_due_date) return formatDate(caseData.estimated_due_date);
    if (caseData?.due_date) return formatDate(caseData.due_date);
    
    // Otherwise, calculate from transfer_date
    const transferDate = caseData?.transfer_date;
    if (!transferDate) return '—';
    
    try {
      const dateMatch = transferDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
      let transfer: Date;
      
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        transfer = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        transfer = new Date(transferDate);
        transfer.setHours(0, 0, 0, 0);
      }
      
      // Day 5 embryo = 19 days gestational at transfer (14+5)
      // Normal pregnancy is 280 days (40 weeks)
      // So from transfer date, we need 280 - 19 = 261 days to reach full term
      const daysToAdd = 261;
      const dueDate = new Date(transfer);
      dueDate.setDate(dueDate.getDate() + daysToAdd);
      
      return `${(dueDate.getMonth() + 1).toString().padStart(2, '0')}/${dueDate.getDate().toString().padStart(2, '0')}/${dueDate.getFullYear()}`;
    } catch {
      return '—';
    }
  };

  // Keep Weeks Pregnant display aligned with Matches page:
  // 1) prefer stored weeks_pregnant when > 0
  // 2) otherwise calculate from transfer date using day-5 embryo baseline (19 gestational days)
  const calculateWeeksPregnantDisplay = () => {
    if (caseData?.weeks_pregnant && caseData.weeks_pregnant > 0) {
      return `${caseData.weeks_pregnant} weeks`;
    }

    const transferDate = caseData?.transfer_date || caseData?.surrogate?.transfer_date;
    if (!transferDate) return '—';

    try {
      const dateMatch = String(transferDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
      let transfer: Date;

      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        transfer = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        transfer = new Date(transferDate);
        transfer.setHours(0, 0, 0, 0);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((today.getTime() - transfer.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays < 0) return '—';

      const transferGestationalDays = 19; // day-5 embryo transfer baseline
      const gestationalDays = diffDays + transferGestationalDays;
      const weeks = Math.floor(gestationalDays / 7);
      const days = gestationalDays % 7;

      return `${weeks} weeks ${days} days`;
    } catch {
      return '—';
    }
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  const clearPendingAdminNoteImages = () => {
    const toRevoke = pendingAdminNoteImagesRef.current.map((p) => p.url);
    pendingAdminNoteImagesRef.current = [];
    setPendingAdminNoteImages([]);
    toRevoke.forEach((url) => URL.revokeObjectURL(url));
  };

  const keptExistingAdminNoteImageCount = () =>
    existingAdminNoteImages.filter((img) => !removedAdminNoteImageIds.includes(img.id)).length;

  const validateAndAppendAdminNoteFiles = (files: File[] | FileList | null) => {
    // Snapshot immediately — clearing the file input empties the live FileList.
    const list = files ? Array.from(files) : [];
    if (!list.length) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxBytes = MAX_ADMIN_NOTE_IMAGE_MB * 1024 * 1024;

    const validFiles: File[] = [];
    for (const file of list) {
      const mime = (file.type || '').toLowerCase();
      const nameOk = /\.(jpe?g|png|webp)$/i.test(file.name);
      if (mime && !allowed.includes(mime) && !nameOk) {
        alert(`${file.name}: only JPG, PNG, or WebP images are allowed`);
        continue;
      }
      if (!mime && !nameOk) {
        alert(`${file.name}: only JPG, PNG, or WebP images are allowed`);
        continue;
      }
      if (file.size > maxBytes) {
        alert(`${file.name}: each image must be at most ${MAX_ADMIN_NOTE_IMAGE_MB}MB`);
        continue;
      }
      validFiles.push(file);
    }
    if (validFiles.length === 0) return;

    const prev = pendingAdminNoteImagesRef.current;
    const room = MAX_ADMIN_NOTE_IMAGES - keptExistingAdminNoteImageCount() - prev.length;
    if (room <= 0) {
      alert(`You can attach at most ${MAX_ADMIN_NOTE_IMAGES} images`);
      return;
    }
    if (validFiles.length > room) {
      alert(`You can attach at most ${MAX_ADMIN_NOTE_IMAGES} images`);
    }

    // Build previews once outside setState (avoids Strict Mode double createObjectURL).
    const toAdd: PendingAdminNoteImage[] = validFiles.slice(0, room).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    const next = [...prev, ...toAdd];
    pendingAdminNoteImagesRef.current = next;
    setPendingAdminNoteImages(next);
  };

  const resetAdminNoteForm = () => {
    setEditingAdminNoteId(null);
    setAdminUpdate('');
    setAdminNoteStage('pre_transfer');
    setExistingAdminNoteImages([]);
    setRemovedAdminNoteImageIds([]);
    clearPendingAdminNoteImages();
  };

  const startEditAdminNote = (update: any) => {
    if (readOnly || !update?.id) return;
    setEditingAdminNoteId(String(update.id));
    setAdminUpdate(update.content || '');
    setAdminNoteStage(update.stage || 'pre_transfer');
    setExistingAdminNoteImages(
      Array.isArray(update.images)
        ? update.images.map((img: any) => ({
            id: String(img.id),
            image_url: img.image_url,
            file_name: img.file_name,
          }))
        : []
    );
    setRemovedAdminNoteImageIds([]);
    clearPendingAdminNoteImages();
    setSelectedAdminNote(null);
    setUpdateTab('note');
    setTimeout(() => {
      adminNoteFormSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const removePendingAdminNoteImage = (index: number) => {
    const prev = pendingAdminNoteImagesRef.current;
    if (index < 0 || index >= prev.length) return;
    const removed = prev[index];
    const next = prev.filter((_, i) => i !== index);
    pendingAdminNoteImagesRef.current = next;
    setPendingAdminNoteImages(next);
    URL.revokeObjectURL(removed.url);
  };

  const clearPendingMedicalProofImage = () => {
    setPendingMedicalProofImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  };

  const clearMedicalProof = () => {
    clearPendingMedicalProofImage();
    setExistingMedicalProofUrl(null);
  };

  const resetMedicalCheckInForm = () => {
    setEditingMedicalReportId(null);
    setMedicalVisitDate('');
    setMedicalProviderName('');
    setMedicalProviderContact('');
    setMedicalReportData({});
    setExistingMedicalProofUrl(null);
    clearPendingMedicalProofImage();
  };

  const startEditMedicalCheckIn = (report: any) => {
    if (!report?.id) return;
    const reportData = parseMedicalReportData(report.report_data);
    const contact = reportData.provider_contact || '';
    const rest = { ...reportData };
    delete rest.provider_contact;

    setEditingMedicalReportId(String(report.id));
    setMedicalStage(report.stage || 'Pre-Transfer');
    setMedicalVisitDate(String(report.visit_date || '').slice(0, 10));
    setMedicalProviderName(report.provider_name || '');
    setMedicalProviderContact(contact);
    setMedicalReportData(rest);
    setExistingMedicalProofUrl(report.proof_image_url || null);
    clearPendingMedicalProofImage();
    setSelectedMedicalReport(null);
    setUpdateTab('medical');

    setTimeout(() => {
      medicalFormSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const validateAndSetMedicalProofFile = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const file = fileList[0];
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxBytes = MAX_MEDICAL_PROOF_IMAGE_MB * 1024 * 1024;
    const mime = (file.type || '').toLowerCase();
    const nameOk = /\.(jpe?g|png|webp)$/i.test(file.name);
    if (mime && !allowed.includes(mime) && !nameOk) {
      alert(`${file.name}: only JPG, PNG, or WebP images are allowed`);
      return;
    }
    if (!mime && !nameOk) {
      alert(`${file.name}: only JPG, PNG, or WebP images are allowed`);
      return;
    }
    if (file.size > maxBytes) {
      alert(`${file.name}: image must be at most ${MAX_MEDICAL_PROOF_IMAGE_MB}MB`);
      return;
    }
    setPendingMedicalProofImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { file, url: URL.createObjectURL(file) };
    });
  };

  const saveAdminUpdate = async () => {
    if (readOnly) return;
    const keptExisting = keptExistingAdminNoteImageCount();
    if (!adminUpdate.trim() && keptExisting === 0 && pendingAdminNoteImages.length === 0) {
      alert('Please enter note text or add at least one image');
      return;
    }

    setSaving(true);
    try {
      let res: Response;
      if (editingAdminNoteId) {
        const needsMultipart =
          pendingAdminNoteImages.length > 0 || removedAdminNoteImageIds.length > 0;
        if (needsMultipart) {
          const fd = new FormData();
          fd.append('content', adminUpdate);
          fd.append('title', 'Admin Update');
          fd.append('stage', adminNoteStage);
          if (removedAdminNoteImageIds.length > 0) {
            fd.append('remove_image_ids', JSON.stringify(removedAdminNoteImageIds));
          }
          pendingAdminNoteImages.forEach((p) => fd.append('images', p.file));
          res = await fetch(`/api/cases/${caseId}/updates/${editingAdminNoteId}`, {
            method: 'PATCH',
            body: fd,
          });
        } else {
          res = await fetch(`/api/cases/${caseId}/updates/${editingAdminNoteId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: adminUpdate,
              title: 'Admin Update',
              stage: adminNoteStage,
            }),
          });
        }
      } else if (pendingAdminNoteImages.length > 0) {
        const fd = new FormData();
        fd.append('update_type', 'admin_note');
        fd.append('title', 'Admin Update');
        fd.append('content', adminUpdate);
        fd.append('stage', adminNoteStage);
        pendingAdminNoteImages.forEach((p) => fd.append('images', p.file));
        res = await fetch(`/api/cases/${caseId}/updates`, {
          method: 'POST',
          body: fd,
        });
      } else {
        res = await fetch(`/api/cases/${caseId}/updates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            update_type: 'admin_note',
            title: 'Admin Update',
            content: adminUpdate,
            stage: adminNoteStage,
          }),
        });
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to save update');
      }

      const wasEditing = !!editingAdminNoteId;
      resetAdminNoteForm();
      await loadData();
      alert(wasEditing ? 'Update edited successfully' : 'Update saved successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to save update');
    } finally {
      setSaving(false);
    }
  };

  const deleteAdminUpdate = async (updateId: string) => {
    if (readOnly) return;
    if (!confirm('Are you sure you want to delete this update?')) {
      return;
    }

    try {
      const res = await fetch(`/api/cases/${caseId}/updates/${updateId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to delete update');
      }

      if (editingAdminNoteId === updateId) {
        resetAdminNoteForm();
      }
      await loadData();
      alert('Update deleted successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to delete update');
    }
  };

  const saveMedicalCheckIn = async () => {
    if (!caseData?.surrogate_id) {
      alert('No surrogate assigned to this case');
      return;
    }
    if (!medicalVisitDate) {
      alert('Please select a visit date');
      return;
    }

    setSavingMedical(true);
    try {
      const reportData = {
        ...medicalReportData,
        ...(medicalProviderContact.trim() ? { provider_contact: medicalProviderContact.trim() } : {}),
      };
      const isEditing = !!editingMedicalReportId;
      const method = isEditing ? 'PATCH' : 'POST';
      const proofImageUrl = pendingMedicalProofImage
        ? undefined
        : existingMedicalProofUrl || null;

      let res: Response;
      if (pendingMedicalProofImage) {
        const fd = new FormData();
        if (isEditing) fd.append('id', editingMedicalReportId);
        fd.append('surrogate_id', caseData.surrogate_id);
        fd.append('stage', medicalStage);
        fd.append('visit_date', medicalVisitDate);
        fd.append('provider_name', medicalProviderName || '');
        fd.append('report_data', JSON.stringify(reportData));
        fd.append('proof_image', pendingMedicalProofImage.file);
        res = await fetch('/api/matches/medical-reports', {
          method,
          body: fd,
        });
      } else {
        res = await fetch('/api/matches/medical-reports', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(isEditing ? { id: editingMedicalReportId } : {}),
            surrogate_id: caseData.surrogate_id,
            stage: medicalStage,
            visit_date: medicalVisitDate,
            provider_name: medicalProviderName,
            proof_image_url: isEditing ? proofImageUrl : null,
            report_data: reportData,
          }),
        });
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData.error ||
            (isEditing ? 'Failed to update medical check in' : 'Failed to save medical check in')
        );
      }

      resetMedicalCheckInForm();
      await loadData();
      alert(isEditing ? 'Medical check in updated successfully' : 'Medical check in saved successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to save medical check in');
    } finally {
      setSavingMedical(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-gray-500">Loading case document...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-800">{error || 'Case not found'}</div>
          </div>
          <Link href="/matches" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
            ← Back to Matches
          </Link>
        </div>
      </div>
    );
  }

  const renderDocumentSection = (title: string, icon: string, children: React.ReactNode) => (
    <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>{icon}</span> {title}
        </h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );

  const renderField = (label: string, value: any, highlight?: boolean) => (
    <div className={`flex justify-between py-2 border-b border-gray-100 ${highlight ? 'bg-yellow-50 -mx-2 px-2' : ''}`}>
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm ${highlight ? 'font-semibold text-purple-700' : 'text-gray-900'}`}>
        {formatValue(value)}
      </span>
    </div>
  );

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white p-8 rounded-lg mb-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Link href="/matches" className="text-purple-200 hover:text-white text-sm">
              ← Back to Matches
            </Link>
            <span className="bg-white/20 px-3 py-1 rounded text-sm">
              Case ID: {caseData?.claim_id || caseId.slice(0, 8)}
            </span>
          </div>
          <h1 className="text-3xl font-bold mb-2">📋 Case Document</h1>
          <p className="text-purple-200">Complete case overview and status tracking</p>
        </div>

        {/* Case Summary */}
            {renderDocumentSection('Case Summary', '📊',
              <div className="grid grid-cols-2 gap-x-8">
                {renderField('Case Status', caseData?.status?.toUpperCase() || 'ACTIVE', true)}
                {renderField('Current Step', caseData?.current_step ? (STAGE_LABELS[caseData.current_step] || caseData.current_step) : undefined)}
                {renderField('Case Type', caseData?.case_type)}
                {renderField('Weeks Pregnant', calculateWeeksPregnantDisplay())}
                {renderField('Number of Fetuses', caseData?.number_of_fetuses)}
                {renderField('Fetal Beat Confirm', caseData?.fetal_beat_confirm)}
              </div>
            )}

            {/* Important Dates */}
            {renderDocumentSection('Important Dates', '📅',
              <div className="grid grid-cols-2 gap-x-8">
                {renderField('Sign Date', formatDate(caseData?.sign_date))}
                {renderField('Transfer Date', formatDate(caseData?.transfer_date))}
                {renderField('Beta Confirm Date', formatDate(caseData?.beta_confirm_date))}
                {renderField('Estimated Due Date', calculateEstimatedDueDate(), true)}
              </div>
            )}

            {/* Surrogate Information */}
            {renderDocumentSection('Surrogate Information', '👩',
              <>
                <div className="grid grid-cols-2 gap-x-8">
                  {renderField('Name', caseData?.surrogate?.name || formData.fullName)}
                  {renderField('Phone', caseData?.surrogate?.phone || formData.phoneNumber)}
                  {renderField('Email', caseData?.surrogate?.email || formData.email)}
                  {renderField('Location', caseData?.surrogate?.location)}
                  {renderField('Address', formData.address || formData.applicantAddress)}
                  {renderField('Date of Birth', formData.dateOfBirth)}
                  {renderField('Age', formData.age)}
                  {renderField('Blood Type', formData.bloodType)}
                  {renderField('Height', formData.height)}
                  {renderField('Weight', formData.weight)}
                  {renderField('Race/Ethnicity', formData.race)}
                  {renderField('Marital Status', formData.maritalStatus)}
                  {renderField('Previous Surrogacy', formData.previousSurrogacy)}
                  {renderField('Previous Surrogacy Count', formData.previousSurrogacyCount)}
                </div>
                {surrogateApp && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-500">
                      Application Status: <span className="font-medium text-green-600">{surrogateApp.status?.toUpperCase()}</span>
                      {surrogateApp.created_at && ` • Submitted: ${formatDate(surrogateApp.created_at)}`}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Surrogate Health & Pregnancy History */}
            {renderDocumentSection('Surrogate Health & History', '🏥',
              <div className="grid grid-cols-2 gap-x-8">
                {renderField('Total Deliveries', formData.totalDeliveries)}
                {renderField('Previous Surrogacy', formData.previousSurrogacy)}
                {renderField('Health Insurance', formData.healthInsurance)}
                {renderField('Maternity Coverage', formData.maternityCoverage)}
                {renderField('Abnormal Pap Smear', formData.abnormalPapSmear)}
                {renderField('Infertility Doctor', formData.infertilityDoctor)}
                {renderField('Household Marijuana Use', formData.householdMarijuana)}
                {renderField('Pregnancy Problems', formData.pregnancyProblems)}
                {renderField('Children Health Problems', formData.childrenHealthProblems)}
                {renderField('Currently Breastfeeding', formData.breastfeeding)}
                {renderField('Tattoos/Piercings (Last 1.5 years)', formData.tattoosPiercings)}
                {renderField('Depression Medication', formData.depressionMedication)}
                {renderField('Drug/Alcohol Abuse', formData.drugAlcoholAbuse)}
                {renderField('Excess Heat Exposure', formData.excessHeat)}
                {renderField('Alcohol Limit Advised', formData.alcoholLimitAdvised)}
                {renderField('Smoking Status', formData.smokingStatus)}
                {renderField('Alcohol Usage', formData.alcoholUsage)}
                {renderField('Mental Health Treatment', formData.mentalHealthTreatment)}
                {renderField('Postpartum Depression', formData.postpartumDepression)}
              </div>
            )}

            {/* Medical Providers */}
            {medicalInfo && (
              renderDocumentSection('Medical Providers', '⚕️',
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">IVF Clinic</h4>
                    <div className="grid grid-cols-2 gap-x-8 bg-gray-50 p-4 rounded">
                      {renderField('Clinic Name', medicalInfo.ivf_clinic_name)}
                      {renderField('Doctor', medicalInfo.ivf_clinic_doctor_name)}
                      {renderField('Address', medicalInfo.ivf_clinic_address)}
                      {renderField('Phone', medicalInfo.ivf_clinic_phone)}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">OB/GYN</h4>
                    <div className="grid grid-cols-2 gap-x-8 bg-gray-50 p-4 rounded">
                      {renderField('Doctor', medicalInfo.obgyn_doctor_name)}
                      {renderField('Clinic', medicalInfo.obgyn_clinic_name)}
                      {renderField('Address', medicalInfo.obgyn_clinic_address)}
                      {renderField('Phone', medicalInfo.obgyn_clinic_phone)}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Delivery Hospital</h4>
                    <div className="grid grid-cols-2 gap-x-8 bg-gray-50 p-4 rounded">
                      {renderField('Hospital', medicalInfo.delivery_hospital_name)}
                      {renderField('Address', medicalInfo.delivery_hospital_address)}
                      {renderField('Phone', medicalInfo.delivery_hospital_phone)}
                    </div>
                  </div>
                </div>
              )
            )}

            {/* Parent Information */}
            {renderDocumentSection('Intended Parents', '👨‍👩‍👧',
              <div className="grid grid-cols-2 gap-8">
                <div className="bg-blue-50 p-4 rounded">
                  <h4 className="font-medium text-blue-800 mb-3">Parent 1</h4>
                  {renderField('Name', caseData?.first_parent?.name)}
                  {renderField('Phone', caseData?.first_parent?.phone)}
                  {renderField('Email', caseData?.first_parent?.email)}
                  {renderField('Location', caseData?.first_parent?.location)}
                </div>
                <div className="bg-pink-50 p-4 rounded">
                  <h4 className="font-medium text-pink-800 mb-3">Parent 2</h4>
                  {renderField('Name', caseData?.second_parent?.name)}
                  {renderField('Phone', caseData?.second_parent?.phone)}
                  {renderField('Email', caseData?.second_parent?.email)}
                  {renderField('Location', caseData?.second_parent?.location)}
                </div>
              </div>
            )}

            {/* Case Details */}
            {renderDocumentSection('Case Details', '📝',
              <div className="grid grid-cols-2 gap-x-8">
                {renderField('Clinic', caseData?.clinic)}
                {renderField('Lawyer', caseData?.lawyer)}
                {renderField('Escrow', caseData?.company)}
                {renderField('Embryos', caseData?.embryos)}
                {renderField('Egg Donation', caseData?.egg_donation)}
                {renderField('Sperm Donation', caseData?.sperm_donation)}
              </div>
            )}

            {/* Case Managers */}
            {caseData?.managers && caseData.managers.length > 0 && (
              renderDocumentSection('Case Managers', '👥',
                <div className="flex flex-wrap gap-2">
                  {caseData.managers.map((manager) => (
                    <span key={manager.id} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                      {manager.name}
                    </span>
                  ))}
                </div>
              )
            )}

            {/* Surrogate Preferences */}
            {(formData.sameSexCouple !== undefined || formData.carryTwins !== undefined) && (
              renderDocumentSection('Surrogate Preferences', '💭',
                <div className="grid grid-cols-3 gap-4">
                  <div className={`p-3 rounded text-center ${formData.sameSexCouple ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    <div className="text-lg mb-1">{formData.sameSexCouple ? '✓' : '✗'}</div>
                    <div className="text-xs">Same Sex Couple</div>
                  </div>
                  <div className={`p-3 rounded text-center ${formData.singleMale ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    <div className="text-lg mb-1">{formData.singleMale ? '✓' : '✗'}</div>
                    <div className="text-xs">Single Male</div>
                  </div>
                  <div className={`p-3 rounded text-center ${formData.singleFemale ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    <div className="text-lg mb-1">{formData.singleFemale ? '✓' : '✗'}</div>
                    <div className="text-xs">Single Female</div>
                  </div>
                  <div className={`p-3 rounded text-center ${formData.internationalCouple ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    <div className="text-lg mb-1">{formData.internationalCouple ? '✓' : '✗'}</div>
                    <div className="text-xs">International</div>
                  </div>
                  <div className={`p-3 rounded text-center ${formData.carryTwins ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    <div className="text-lg mb-1">{formData.carryTwins ? '✓' : '✗'}</div>
                    <div className="text-xs">Carry Twins</div>
                  </div>
                  <div className={`p-3 rounded text-center ${formData.parentsInDeliveryRoom ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    <div className="text-lg mb-1">{formData.parentsInDeliveryRoom ? '✓' : '✗'}</div>
                    <div className="text-xs">Parents in Delivery</div>
                  </div>
                </div>
              )
            )}

            {/* Activity Section */}
            {caseData?.surrogate_id && (() => {
              const surrogateReports = medicalReports.filter((r) => r.user_id === caseData.surrogate_id);
              const latestReports = surrogateReports; // Show all medical reports instead of slicing

              return renderDocumentSection('Activity', '📊',
                <div className="space-y-4">
                  <div>
                    <div className="font-semibold text-sm text-green-700 mb-2">
                      Medical Check-ins: {surrogateReports.length}
                    </div>
                    {latestReports.length === 0 ? (
                      <div className="text-gray-500 text-xs">No medical reports</div>
                    ) : (
                      <div className="space-y-2">
                        {latestReports.map((r) => {
                          const reportData = parseMedicalReportData(r.report_data);
                          const visitDate = formatDateOnly(r.visit_date);
                          let keyMetrics: string[] = [];
                          const noteText = String(
                            reportData.notes ||
                              reportData.note ||
                              reportData.additional_notes ||
                              ''
                          ).trim();
                          
                          if (r.stage === 'Pre-Transfer') {
                            if (reportData.endometrial_thickness) keyMetrics.push(`Endometrial: ${reportData.endometrial_thickness}mm`);
                            if (reportData.follicle_1_mm) keyMetrics.push(`Follicle: ${reportData.follicle_1_mm}mm`);
                            if (reportData.labs && Array.isArray(reportData.labs) && reportData.labs.length > 0) {
                              keyMetrics.push(`Labs: ${reportData.labs.slice(0, 2).join(', ')}`);
                            }
                          } else if (r.stage === 'Post-Transfer') {
                            if (reportData.fetal_heart_rate) keyMetrics.push(`HR: ${reportData.fetal_heart_rate}bpm`);
                            if (reportData.gestational_sac_diameter) keyMetrics.push(`Sac: ${reportData.gestational_sac_diameter}mm`);
                            if (reportData.beta_hcg) keyMetrics.push(`Beta HCG: ${reportData.beta_hcg}`);
                          } else if (r.stage === 'OBGYN') {
                            if (reportData.weight) keyMetrics.push(`Weight: ${reportData.weight}lbs`);
                            if (reportData.blood_pressure) keyMetrics.push(`BP: ${reportData.blood_pressure}`);
                            if (reportData.fetal_heartbeats) keyMetrics.push(`FHR: ${reportData.fetal_heartbeats}bpm`);
                          }
                          
                          const uploadedByAdmin = r.uploaded_by === 'admin';
                          return (
                            <div key={r.id} className="p-2 rounded border border-green-200 bg-green-50">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="text-[11px] text-gray-600 font-semibold">
                                  {r.stage} · {visitDate}
                                  {r.provider_name && ` · ${r.provider_name}`}
                                </div>
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                    uploadedByAdmin
                                      ? 'bg-violet-100 text-violet-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                  title={uploadedByAdmin ? 'Uploaded by admin' : 'Uploaded by surrogate'}
                                >
                                  {uploadedByAdmin ? 'Admin' : 'Surrogate'}
                                </span>
                              </div>
                              {keyMetrics.length > 0 && (
                                <div className="text-xs text-gray-700 mt-1">
                                  {keyMetrics.join(' · ')}
                                </div>
                              )}
                              {noteText ? (
                                <div className="text-xs text-amber-900 mt-1 bg-amber-50 border border-amber-100 rounded px-1.5 py-1 whitespace-pre-wrap">
                                  <span className="font-semibold">Notes: </span>
                                  {noteText.length > 120 ? `${noteText.slice(0, 120)}…` : noteText}
                                </div>
                              ) : null}
                              <div className="flex items-center gap-2 mt-1">
                                {r.proof_image_url && (
                                  <a
                                    href={r.proof_image_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    📎 View Proof
                                  </a>
                                )}
                                <button
                                  onClick={() => setSelectedMedicalReport(r)}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                                  title="View detailed medical report"
                                >
                                  👁️ View Details
                                </button>
                                <button
                                  onClick={() => startEditMedicalCheckIn(r)}
                                  className="text-xs text-amber-700 hover:text-amber-900 font-semibold"
                                  title="Edit this medical report"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => deleteMedicalReport(r.id)}
                                  className="text-xs text-red-600 hover:text-red-800 font-semibold"
                                  title="Delete this medical report"
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-300">
                    {(() => {
                      const renderAppointmentCard = (appointment: any, colorScheme: 'blue' | 'purple') => {
                        const appointmentDate = formatDateOnly(appointment.appointment_date);
                        const appointmentTime = appointment.appointment_time ?
                          new Date(`2000-01-01T${appointment.appointment_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
                        const borderColor = colorScheme === 'blue' ? 'border-blue-200' : 'border-purple-200';
                        const bgColor = colorScheme === 'blue' ? 'bg-blue-50' : 'bg-purple-50';

                        return (
                          <div key={appointment.id} className={`p-3 rounded-lg border ${borderColor} ${bgColor}`}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-sm font-semibold text-gray-800">
                                {appointmentDate} {appointmentTime && `· ${appointmentTime}`}
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                appointment.status === 'completed' ? 'bg-green-100 text-green-700' :
                                appointment.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {appointment.status}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 mt-1">
                              {appointment.provider_name && (
                                <div><span className="font-medium text-gray-700">Provider:</span> {appointment.provider_name}</div>
                              )}
                              {appointment.clinic_name && (
                                <div><span className="font-medium text-gray-700">Clinic:</span> {appointment.clinic_name}</div>
                              )}
                              {appointment.clinic_address && (
                                <div className="col-span-2"><span className="font-medium text-gray-700">Address:</span> {appointment.clinic_address}</div>
                              )}
                              {appointment.clinic_phone && (
                                <div><span className="font-medium text-gray-700">Phone:</span> {appointment.clinic_phone}</div>
                              )}
                              {appointment.appointment_type && (
                                <div><span className="font-medium text-gray-700">Type:</span> {appointment.appointment_type}</div>
                              )}
                            </div>
                            {appointment.notes && (
                              <div className="mt-1.5 text-xs text-gray-500 bg-white/60 rounded p-1.5 italic">{appointment.notes}</div>
                            )}
                          </div>
                        );
                      };

                      return (
                        <>
                          <div className="font-semibold text-sm text-blue-700 mb-2">
                            OB Appointments ({obAppointments.length})
                          </div>
                          {obAppointments.length === 0 ? (
                            <div className="text-gray-500 text-xs">No OB appointments</div>
                          ) : (
                            <div className="space-y-2">
                              {obAppointments.map((a) => renderAppointmentCard(a, 'blue'))}
                            </div>
                          )}
                          <div className="font-semibold text-sm text-purple-700 mb-2 mt-4">
                            IVF Appointments ({ivfAppointments.length})
                          </div>
                          {ivfAppointments.length === 0 ? (
                            <div className="text-gray-500 text-xs">No IVF appointments</div>
                          ) : (
                            <div className="space-y-2">
                              {ivfAppointments.map((a) => renderAppointmentCard(a, 'purple'))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              );
            })()}
          {/* Admin Updates Section */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Updates:</h2>
          
          {/* Display existing updates */}
          {updates.length > 0 && (
            <div className="mb-6 space-y-4">
              {updates
                .filter((update: any) => update.update_type === 'admin_note')
                .map((update: any) => {
                  const contentPreview = update.content && update.content.length > 80 
                    ? update.content.slice(0, 80) + '...' 
                    : update.content;
                  const imageCount = Array.isArray(update.images) ? update.images.length : 0;
                  return (
                    <div 
                      key={update.id} 
                      onClick={() => setSelectedAdminNote(update)}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-900">{update.title || 'Admin Update'}</p>
                            {update.stage && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {ADMIN_NOTE_STAGE_LABEL[update.stage] || update.stage}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {update.created_at ? new Date(update.created_at).toLocaleString('en-US') : '—'}
                            {update.updated_by_user?.name && ` • By ${update.updated_by_user.name}`}
                          </p>
                        </div>
                        {!readOnly && (
                          <div className="ml-4 flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditAdminNote(update);
                              }}
                              className="px-3 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                              title="Edit this update"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteAdminUpdate(update.id);
                              }}
                              className="px-3 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                              title="Delete this update"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{contentPreview}</p>
                      {imageCount > 0 && (
                        <p className="text-xs text-gray-500 mt-2">
                          {imageCount} {imageCount === 1 ? 'image' : 'images'} attached
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* Add new update / medical check in */}
          <div className="border-b border-gray-200 mb-4">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setUpdateTab('note')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  updateTab === 'note'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {editingAdminNoteId ? 'Edit Admin Note' : 'Add Admin Note'}
              </button>
              <button
                onClick={() => setUpdateTab('medical')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  updateTab === 'medical'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {editingMedicalReportId ? 'Edit Medical Check In' : 'Help Upload Medical Check In'}
              </button>
            </nav>
          </div>

          {updateTab === 'note' ? (
            readOnly ? (
              <p className="text-sm text-gray-500">View-only access — you cannot add or edit admin notes.</p>
            ) : (
            <div ref={adminNoteFormSectionRef}>
              {editingAdminNoteId && (
                <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 flex items-center justify-between gap-3">
                  <span>Editing existing admin note</span>
                  <button
                    type="button"
                    onClick={resetAdminNoteForm}
                    className="text-amber-800 hover:text-amber-950 font-semibold underline"
                  >
                    Cancel edit
                  </button>
                </div>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                <select
                  value={adminNoteStage}
                  onChange={(e) => setAdminNoteStage(e.target.value)}
                  className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ADMIN_NOTE_STAGES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={adminUpdate}
                onChange={(e) => setAdminUpdate(e.target.value)}
                placeholder="Enter admin update notes..."
                className="w-full h-32 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Images (optional)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Up to {MAX_ADMIN_NOTE_IMAGES} images (JPG, PNG, WebP), {MAX_ADMIN_NOTE_IMAGE_MB}MB each.
                </p>
                {existingAdminNoteImages.filter((img) => !removedAdminNoteImageIds.includes(img.id)).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {existingAdminNoteImages
                      .filter((img) => !removedAdminNoteImageIds.includes(img.id))
                      .map((img) => (
                        <div key={img.id} className="relative group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.image_url}
                            alt={img.file_name || 'Attachment'}
                            className="h-20 w-20 object-cover rounded-md border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setRemovedAdminNoteImageIds((prev) =>
                                prev.includes(img.id) ? prev : [...prev, img.id]
                              )
                            }
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center shadow"
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                  </div>
                )}
                <input
                  ref={adminNoteFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files ? Array.from(e.target.files) : [];
                    e.target.value = '';
                    validateAndAppendAdminNoteFiles(files);
                  }}
                />
                <button
                  type="button"
                  onClick={() => adminNoteFileInputRef.current?.click()}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-800"
                >
                  Add images
                </button>
                {pendingAdminNoteImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {pendingAdminNoteImages.map((p, idx) => (
                      <div key={`${p.file.name}-${p.file.size}-${p.file.lastModified}-${idx}`} className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.url}
                          alt=""
                          className="h-20 w-20 object-cover rounded-md border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removePendingAdminNoteImage(idx)}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center shadow"
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={saveAdminUpdate}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                    >
                  {saving ? 'Saving...' : editingAdminNoteId ? 'Save Changes' : 'Save Update'}
                </button>
                {editingAdminNoteId && (
                  <button
                    type="button"
                    onClick={resetAdminNoteForm}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
            )
          ) : (
            <div ref={medicalFormSectionRef} className="space-y-4">
              {editingMedicalReportId && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 flex items-center justify-between gap-3">
                  <span>Editing existing medical check-in</span>
                  <button
                    type="button"
                    onClick={resetMedicalCheckInForm}
                    className="text-amber-800 hover:text-amber-950 font-semibold underline"
                  >
                    Cancel edit
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                  <select
                    value={medicalStage}
                    onChange={(e) => {
                      const next = e.target.value;
                      setMedicalStage(next);
                      // Only clear stage-specific fields when creating, or when stage actually changes while editing
                      if (!editingMedicalReportId || next !== medicalStage) {
                        setMedicalReportData((prev: any) => {
                          if (!editingMedicalReportId) return {};
                          // Keep notes/contact-like free text when switching stage during edit
                          const keep: Record<string, any> = {};
                          if (prev.notes != null) keep.notes = prev.notes;
                          if (prev.additional_notes != null) keep.additional_notes = prev.additional_notes;
                          return keep;
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Pre-Transfer">Pre-Transfer</option>
                    <option value="Post-Transfer">Post-Transfer</option>
                    <option value="OBGYN">OBGYN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visit Date</label>
                  <input
                    type="date"
                    value={medicalVisitDate}
                    onChange={(e) => setMedicalVisitDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider Name (Optional)</label>
                  <input
                    type="text"
                    value={medicalProviderName}
                    onChange={(e) => setMedicalProviderName(e.target.value)}
                    placeholder="e.g. Dr. Smith"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider Contact (Optional)</label>
                  <input
                    type="text"
                    value={medicalProviderContact}
                    onChange={(e) => setMedicalProviderContact(e.target.value)}
                    placeholder="e.g. phone, email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Dynamic Fields based on Stage */}
              <div className="pt-4 border-t border-gray-200 mt-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Additional Report Data</h4>
                <div className="grid grid-cols-2 gap-4">
                  {medicalStage === 'Pre-Transfer' && (
                    <>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Labs</label>
                        <div className="flex flex-wrap gap-4 mt-1">
                          {['estradiol', 'progesterone', 'fsh', 'lh', 'beta_hgc'].map((lab) => {
                            const labels: Record<string, string> = {
                              estradiol: 'Estradiol', progesterone: 'Progesterone', fsh: 'FSH', lh: 'LH', beta_hgc: 'β-hCG test'
                            };
                            return (
                              <label key={lab} className="inline-flex items-center">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                  checked={isMedicalCheckboxChecked('labs', lab)}
                                  onChange={(e) => handleMedicalReportCheckboxChange('labs', lab, e.target.checked)}
                                />
                                <span className="ml-2 text-sm text-gray-700">{labels[lab]}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Test Site</label>
                        <div className="flex flex-wrap gap-4 mt-1">
                          {['labcorp', 'ivf_clinic', 'others'].map((site) => {
                            const labels: Record<string, string> = {
                              labcorp: 'Labcorp', ivf_clinic: 'IVF clinic', others: 'Others'
                            };
                            return (
                              <label key={site} className="inline-flex items-center">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                  checked={isMedicalCheckboxChecked('test_site', site)}
                                  onChange={(e) => handleMedicalReportCheckboxChange('test_site', site, e.target.checked)}
                                />
                                <span className="ml-2 text-sm text-gray-700">{labels[site]}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lab Test Date</label>
                        <DateInput
                          value={medicalReportData.lab_test_date || ''}
                          onChange={(next) => handleMedicalReportDataChange('lab_test_date', next)}
                          format="MM-DD-YYYY"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="col-span-2 mt-2">
                        <h5 className="text-sm font-semibold text-gray-700 mb-2">Follicle Ultrasound</h5>
                        <p className="text-xs text-gray-500 mb-2">Top 4 Follicles Measurement</p>
                        <div className="space-y-3">
                          {[1, 2, 3, 4].map((num) => (
                            <div key={num} className="flex items-center gap-4">
                              <input
                                type="number" step="0.1"
                                value={medicalReportData[`follicle_${num}_mm`] || ''}
                                onChange={(e) => handleMedicalReportDataChange(`follicle_${num}_mm`, e.target.value)}
                                placeholder={`${num}. mm`}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleMedicalReportDataChange(`follicle_${num}_ovary`, 'L')}
                                  className={`w-10 h-10 rounded-full border ${medicalReportData[`follicle_${num}_ovary`] === 'L' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-500'} flex items-center justify-center font-medium`}
                                >
                                  L
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMedicalReportDataChange(`follicle_${num}_ovary`, 'R')}
                                  className={`w-10 h-10 rounded-full border ${medicalReportData[`follicle_${num}_ovary`] === 'R' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-500'} flex items-center justify-center font-medium`}
                                >
                                  R
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Endometrial Thickness (mm)</label>
                        <input
                          type="number" step="0.1"
                          value={medicalReportData.endometrial_thickness || ''}
                          onChange={(e) => handleMedicalReportDataChange('endometrial_thickness', e.target.value)}
                          placeholder="e.g. 8.5"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Endometrial Type</label>
                        <input
                          type="text"
                          value={medicalReportData.endometrial_type || ''}
                          onChange={(e) => handleMedicalReportDataChange('endometrial_type', e.target.value)}
                          placeholder="e.g. Triple line"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ultrasound Test Date</label>
                        <DateInput
                          value={medicalReportData.ultrasound_test_date || ''}
                          onChange={(next) => handleMedicalReportDataChange('ultrasound_test_date', next)}
                          format="MM-DD-YYYY"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                          value={medicalReportData.notes || ''}
                          onChange={(e) => handleMedicalReportDataChange('notes', e.target.value)}
                          placeholder="Additional notes..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                      </div>
                    </>
                  )}

                  {medicalStage === 'Post-Transfer' && (
                    <>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Labs</label>
                        <div className="flex flex-wrap gap-4 mt-1">
                          {['beta_hgc', 'progesterone', 'estradiol', 'tsh'].map((lab) => {
                            const labels: Record<string, string> = {
                              beta_hgc: 'β-hCG test', progesterone: 'Progesterone', estradiol: 'Estradiol', tsh: 'TSH'
                            };
                            return (
                              <label key={lab} className="inline-flex items-center">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                  checked={isMedicalCheckboxChecked('labs', lab)}
                                  onChange={(e) => handleMedicalReportCheckboxChange('labs', lab, e.target.checked)}
                                />
                                <span className="ml-2 text-sm text-gray-700">{labels[lab]}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Test Site</label>
                        <div className="flex flex-wrap gap-4 mt-1">
                          {['labcorp', 'ivf_clinic', 'others'].map((site) => {
                            const labels: Record<string, string> = {
                              labcorp: 'Labcorp', ivf_clinic: 'IVF clinic', others: 'Others'
                            };
                            return (
                              <label key={site} className="inline-flex items-center">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                  checked={isMedicalCheckboxChecked('test_site', site)}
                                  onChange={(e) => handleMedicalReportCheckboxChange('test_site', site, e.target.checked)}
                                />
                                <span className="ml-2 text-sm text-gray-700">{labels[site]}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lab Test Date</label>
                        <DateInput
                          value={medicalReportData.lab_test_date || ''}
                          onChange={(next) => handleMedicalReportDataChange('lab_test_date', next)}
                          format="MM-DD-YYYY"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="col-span-2 mt-2">
                        <h5 className="text-sm font-semibold text-gray-700 mb-2">Transvaginal Ultrasound</h5>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gestational Sac Diameter (mm)</label>
                        <input
                          type="number" step="0.1"
                          value={medicalReportData.gestational_sac_diameter || ''}
                          onChange={(e) => handleMedicalReportDataChange('gestational_sac_diameter', e.target.value)}
                          placeholder="e.g. 15.2"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Yolk Sac Diameter (mm)</label>
                        <input
                          type="number" step="0.1"
                          value={medicalReportData.yolk_sac_diameter || ''}
                          onChange={(e) => handleMedicalReportDataChange('yolk_sac_diameter', e.target.value)}
                          placeholder="e.g. 3.5"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Crown Rump Length (mm)</label>
                        <input
                          type="number" step="0.1"
                          value={medicalReportData.crown_rump_length || ''}
                          onChange={(e) => handleMedicalReportDataChange('crown_rump_length', e.target.value)}
                          placeholder="e.g. 5.2"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fetal Heart Rate (bpm)</label>
                        <input
                          type="number"
                          value={medicalReportData.fetal_heart_rate || ''}
                          onChange={(e) => handleMedicalReportDataChange('fetal_heart_rate', e.target.value)}
                          placeholder="e.g. 150"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gestational Age</label>
                        <input
                          type="text"
                          value={medicalReportData.gestational_age || ''}
                          onChange={(e) => handleMedicalReportDataChange('gestational_age', e.target.value)}
                          placeholder="e.g. 6 weeks 3 days"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">EDD (Estimated Due Date)</label>
                        <DateInput
                          value={medicalReportData.edd || ''}
                          onChange={(next) => handleMedicalReportDataChange('edd', next)}
                          format="MM-DD-YYYY"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ultrasound Test Date</label>
                        <DateInput
                          value={medicalReportData.ultrasound_test_date || ''}
                          onChange={(next) => handleMedicalReportDataChange('ultrasound_test_date', next)}
                          format="MM-DD-YYYY"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                          value={medicalReportData.notes || ''}
                          onChange={(e) => handleMedicalReportDataChange('notes', e.target.value)}
                          placeholder="Additional notes..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                      </div>
                    </>
                  )}

                  {medicalStage === 'OBGYN' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Surrogate&apos;s Weight (lbs)</label>
                        <input
                          type="number" step="0.1"
                          value={medicalReportData.weight || ''}
                          onChange={(e) => handleMedicalReportDataChange('weight', e.target.value)}
                          placeholder="e.g. 145"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Blood Pressure</label>
                        <input
                          type="text"
                          value={medicalReportData.blood_pressure || ''}
                          onChange={(e) => handleMedicalReportDataChange('blood_pressure', e.target.value)}
                          placeholder="e.g. 120/80"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stomach Measurement (cm)</label>
                        <input
                          type="number" step="0.1"
                          value={medicalReportData.stomach_measurement || ''}
                          onChange={(e) => handleMedicalReportDataChange('stomach_measurement', e.target.value)}
                          placeholder="e.g. 32"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fetal Heartbeats (bpm)</label>
                        <input
                          type="number"
                          value={medicalReportData.fetal_heartbeats || ''}
                          onChange={(e) => handleMedicalReportDataChange('fetal_heartbeats', e.target.value)}
                          placeholder="e.g. 150"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Effacement</label>
                        <input
                          type="text"
                          value={medicalReportData.effacement || ''}
                          onChange={(e) => handleMedicalReportDataChange('effacement', e.target.value)}
                          placeholder="e.g. 50% or 2cm"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dilation (cm)</label>
                        <input
                          type="text"
                          value={medicalReportData.dilation || ''}
                          onChange={(e) => handleMedicalReportDataChange('dilation', e.target.value)}
                          placeholder="e.g. 2"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="col-span-2 mt-2">
                        <h5 className="text-sm font-semibold text-gray-700 mb-2">Screening Tests</h5>
                        <div className="space-y-3">
                          {[
                            { key: 'nt_screen', label: 'NT Screen Normal' },
                            { key: 'quad_screen', label: 'Quad Screen Normal' },
                            { key: 'anatomy_scan', label: 'Anatomy Scan Normal' },
                            { key: 'glucose_screening', label: 'Glucose Screening Normal' },
                            { key: 'gbs_testing', label: 'GBS Testing Normal' },
                            { key: 'nipt_cvs_amniocentesis', label: 'NIPT/CVS/Amniocentesis Normal (not required)' },
                          ].map((test) => (
                            <div key={test.key} className="flex flex-wrap items-center gap-3 p-2 bg-gray-50 rounded-md">
                              <span className="text-sm font-medium text-gray-700 w-48 shrink-0">{test.label}</span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleMedicalReportDataChange(`${test.key}_normal`, 'yes')}
                                  className={`px-3 py-1.5 rounded-full border text-sm font-medium ${medicalReportData[`${test.key}_normal`] === 'yes' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-500'}`}
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMedicalReportDataChange(`${test.key}_normal`, 'no')}
                                  className={`px-3 py-1.5 rounded-full border text-sm font-medium ${medicalReportData[`${test.key}_normal`] === 'no' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-500'}`}
                                >
                                  No
                                </button>
                              </div>
                              <DateInput
                                value={medicalReportData[`${test.key}_test_date`] || ''}
                                onChange={(next) => handleMedicalReportDataChange(`${test.key}_test_date`, next)}
                                format="MM-DD-YYYY"
                                className="flex-1 min-w-[140px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gestational Age</label>
                        <input
                          type="text"
                          value={medicalReportData.gestational_age || ''}
                          onChange={(e) => handleMedicalReportDataChange('gestational_age', e.target.value)}
                          placeholder="e.g. 28 weeks 3 days"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                          value={medicalReportData.notes || ''}
                          onChange={(e) => handleMedicalReportDataChange('notes', e.target.value)}
                          placeholder="Additional notes..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Next Appointment Date</label>
                        <DateInput
                          value={medicalReportData.next_appointment_date || ''}
                          onChange={(next) => handleMedicalReportDataChange('next_appointment_date', next)}
                          format="MM-DD-YYYY"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </>
                  )}

                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Clinic Note / Ultrasound Image
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Optional. JPG, PNG, or WebP, up to {MAX_MEDICAL_PROOF_IMAGE_MB}MB.
                </p>
                <input
                  ref={medicalProofFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => {
                    validateAndSetMedicalProofFile(e.target.files);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => medicalProofFileInputRef.current?.click()}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-800"
                >
                  {(pendingMedicalProofImage || existingMedicalProofUrl) ? 'Change image' : 'Add image'}
                </button>
                {(pendingMedicalProofImage || existingMedicalProofUrl) && (
                  <div className="mt-3 relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pendingMedicalProofImage?.url || existingMedicalProofUrl || ''}
                      alt="Proof preview"
                      className="h-32 w-auto max-w-full object-cover rounded-md border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={clearMedicalProof}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center shadow"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex items-center gap-2">
                {editingMedicalReportId && (
                  <button
                    type="button"
                    onClick={resetMedicalCheckInForm}
                    disabled={savingMedical}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={saveMedicalCheckIn}
                  disabled={savingMedical}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {savingMedical
                    ? 'Saving...'
                    : editingMedicalReportId
                      ? 'Update Medical Check In'
                      : 'Save Medical Check In'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-gray-400 text-sm py-6">
          Generated on {new Date().toLocaleString('en-US')} • Babytree Surrogacy
        </div>
      </div>

      {/* Detail Modal */}
      {selectedMedicalReport && renderMedicalReportDetailModal(
        selectedMedicalReport, 
        () => setSelectedMedicalReport(null),
        formatDateOnly,
        () => startEditMedicalCheckIn(selectedMedicalReport)
      )}

      {/* Admin Note Detail Modal */}
      {selectedAdminNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto pt-10 pb-10">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 my-auto flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{selectedAdminNote.title || 'Admin Update'}</h3>
              <button 
                onClick={() => setSelectedAdminNote(null)} 
                className="text-gray-500 hover:text-gray-700 font-bold text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  {selectedAdminNote.stage && (
                    <div>
                      <span className="block text-xs font-semibold text-gray-500 uppercase">Stage</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                        {ADMIN_NOTE_STAGE_LABEL[selectedAdminNote.stage] || selectedAdminNote.stage}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="block text-xs font-semibold text-gray-500 uppercase">Created</span>
                    <span className="block text-sm font-medium text-gray-900 mt-1">
                      {selectedAdminNote.created_at ? new Date(selectedAdminNote.created_at).toLocaleString('en-US') : '—'}
                    </span>
                  </div>
                  {selectedAdminNote.updated_by_user?.name && (
                    <div>
                      <span className="block text-xs font-semibold text-gray-500 uppercase">Author</span>
                      <span className="block text-sm font-medium text-gray-900 mt-1">{selectedAdminNote.updated_by_user.name}</span>
                    </div>
                  )}
                </div>
              </div>

              <h4 className="font-semibold text-md text-gray-800 border-b border-gray-200 pb-2 mb-4">Content</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap mb-6">{selectedAdminNote.content}</p>

              {Array.isArray(selectedAdminNote.images) && selectedAdminNote.images.length > 0 && (
                <>
                  <h4 className="font-semibold text-md text-gray-800 border-b border-gray-200 pb-2 mb-4">
                    Images ({selectedAdminNote.images.length})
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {selectedAdminNote.images.map((img: any) => (
                      <a
                        key={img.id}
                        href={img.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.image_url}
                          alt={img.file_name || 'Attachment'}
                          className="h-24 w-24 object-cover rounded-md border border-gray-200 hover:opacity-90 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 shrink-0">
              {!readOnly && (
                <>
                  <button
                    onClick={() => startEditAdminNote(selectedAdminNote)}
                    className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      deleteAdminUpdate(selectedAdminNote.id);
                      setSelectedAdminNote(null);
                    }}
                    className="px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                  >
                    Delete
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedAdminNote(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function parseMedicalReportData(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  return {};
}

function hasMedicalReportValue(val: any): boolean {
  if (val === null || val === undefined || val === '') return false;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'string') return val.trim() !== '';
  return true;
}

function formatMedicalReportValue(value: any): string {
  if (Array.isArray(value)) {
    const valLabels: Record<string, string> = {
      estradiol: 'Estradiol',
      progesterone: 'Progesterone',
      fsh: 'FSH',
      lh: 'LH',
      beta_hgc: 'β-hCG test',
      tsh: 'TSH',
      labcorp: 'Labcorp',
      ivf_clinic: 'IVF clinic',
      others: 'Others',
    };
    return value.map((v) => valLabels[String(v)] || String(v)).join(', ');
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
}

const renderMedicalReportDetailModal = (
  report: any,
  onClose: () => void,
  formatDateOnly: (dateStr: string | null | undefined) => string,
  onEdit?: () => void
) => {
  if (!report) return null;

  const reportDataLabelMap: Record<string, string> = {
    endometrial_thickness: 'Endometrial Thickness (mm)',
    endometrial_type: 'Endometrial Type',
    ultrasound_test_date: 'Ultrasound Test Date',
    follicle_1_mm: 'Follicle 1 (mm)',
    follicle_1_ovary: 'Follicle 1 Ovary',
    follicle_2_mm: 'Follicle 2 (mm)',
    follicle_2_ovary: 'Follicle 2 Ovary',
    follicle_3_mm: 'Follicle 3 (mm)',
    follicle_3_ovary: 'Follicle 3 Ovary',
    follicle_4_mm: 'Follicle 4 (mm)',
    follicle_4_ovary: 'Follicle 4 Ovary',
    labs: 'Labs',
    test_site: 'Test Site',
    lab_test_date: 'Lab Test Date',
    next_appointment_date: 'Next Appt Date',
    next_appointment_type: 'Next Appt Type',
    questions_for_team: 'Questions',
    gestational_sac_diameter: 'Gestational Sac Diameter (mm)',
    yolk_sac_diameter: 'Yolk Sac Diameter (mm)',
    crown_rump_length: 'Crown Rump Length (mm)',
    fetal_heart_rate: 'Fetal Heart Rate (bpm)',
    gestational_age: 'Gestational Age',
    edd: 'EDD (Estimated Due Date)',
    beta_hcg: 'Beta hCG',
    weight: 'Surrogate\'s Weight (lbs)',
    blood_pressure: 'Blood Pressure',
    stomach_measurement: 'Stomach Measurement (cm)',
    fetal_heartbeats: 'Fetal Heartbeats (bpm)',
    effacement: 'Effacement',
    dilation: 'Dilation (cm)',
    fundal_height: 'Fundal Height',
    cervix_length: 'Cervix Length',
    urine_test_results: 'Urine Test Results',
    other_concerns: 'Other Concerns',
    notes: 'Notes',
    note: 'Notes',
    additional_notes: 'Additional Notes',
    nt_screen_normal: 'NT Screen Normal',
    nt_screen_test_date: 'NT Screen Test Date',
    quad_screen_normal: 'Quad Screen Normal',
    quad_screen_test_date: 'Quad Screen Test Date',
    anatomy_scan_normal: 'Anatomy Scan Normal',
    anatomy_scan_test_date: 'Anatomy Scan Test Date',
    glucose_screening_normal: 'Glucose Screening Normal',
    glucose_screening_test_date: 'Glucose Screening Test Date',
    gbs_testing_normal: 'GBS Testing Normal',
    gbs_testing_test_date: 'GBS Testing Test Date',
    nipt_cvs_amniocentesis_normal: 'NIPT/CVS/Amniocentesis Normal',
    nipt_cvs_amniocentesis_test_date: 'NIPT/CVS/Amniocentesis Test Date',
  };

  const reportData = parseMedicalReportData(report.report_data);
  const noteKeys = ['notes', 'note', 'additional_notes', 'questions_for_team', 'other_concerns'];
  const noteEntries = noteKeys
    .filter((key) => hasMedicalReportValue(reportData[key]))
    .map((key) => ({
      key,
      label: reportDataLabelMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      value: formatMedicalReportValue(reportData[key]),
    }));
  // Deduplicate identical note text shown under multiple keys
  const seenNoteText = new Set<string>();
  const uniqueNoteEntries = noteEntries.filter((entry) => {
    const normalized = entry.value.trim();
    if (seenNoteText.has(normalized)) return false;
    seenNoteText.add(normalized);
    return true;
  });

  const dataKeys = Object.keys(reportData).filter((key) => {
    if (key === 'provider_contact' || noteKeys.includes(key)) return false;
    return hasMedicalReportValue(reportData[key]);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto pt-10 pb-10">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 my-auto flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 shrink-0 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 truncate">Medical Check-in Details</h3>
            <span
              className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                report.uploaded_by === 'admin'
                  ? 'bg-violet-100 text-violet-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {report.uploaded_by === 'admin' ? 'Admin' : 'Surrogate'}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-bold text-xl leading-none">
            &times;
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase">Stage</span>
                <span className="block text-sm font-medium text-gray-900 mt-1">{report.stage}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase">Visit Date</span>
                <span className="block text-sm font-medium text-gray-900 mt-1">{formatDateOnly(report.visit_date)}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase">Uploaded By</span>
                <span className="block text-sm font-medium text-gray-900 mt-1">
                  {report.uploaded_by === 'admin' ? 'Admin' : 'Surrogate'}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase">Provider</span>
                <span className="block text-sm font-medium text-gray-900 mt-1">{report.provider_name || '—'}</span>
              </div>
              {hasMedicalReportValue(reportData.provider_contact) && (
                <div>
                  <span className="block text-xs font-semibold text-gray-500 uppercase">Provider Contact</span>
                  <span className="block text-sm font-medium text-gray-900 mt-1">{String(reportData.provider_contact)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-semibold text-md text-gray-800 border-b border-gray-200 pb-2 mb-3">Notes</h4>
            {uniqueNoteEntries.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No notes provided.</p>
            ) : (
              <div className="space-y-3">
                {uniqueNoteEntries.map((entry) => (
                  <div
                    key={entry.key}
                    className="rounded-lg border border-amber-200 bg-amber-50 p-4"
                  >
                    {uniqueNoteEntries.length > 1 && (
                      <span className="block text-xs font-semibold text-amber-800 uppercase mb-1">
                        {entry.label}
                      </span>
                    )}
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{entry.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <h4 className="font-semibold text-md text-gray-800 border-b border-gray-200 pb-2 mb-4">Report Data</h4>
          
          {dataKeys.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No additional report data provided.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {dataKeys.map((key) => {
                const value = formatMedicalReportValue(reportData[key]);
                const label = reportDataLabelMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                
                return (
                  <div key={key} className="break-words">
                    <span className="block text-xs font-semibold text-gray-500">{label}</span>
                    <span className="block text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">{value}</span>
                  </div>
                );
              })}
            </div>
          )}

          {report.proof_image_url && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="font-semibold text-sm text-gray-800 mb-2">Proof Image</h4>
              <a 
                href={report.proof_image_url} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                📎 View Uploaded Document/Image
              </a>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-200 shrink-0 flex justify-end gap-2 bg-gray-50 rounded-b-lg">
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-sm font-medium transition-colors"
            >
              ✏️ Edit
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

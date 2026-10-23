import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Plus, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Send, 
  MessageSquare, 
  Search, 
  Filter, 
  Calendar, 
  FileText,
  X,
  ChevronRight,
  ShieldCheck,
  Check,
  RotateCcw,
  Paperclip,
  UploadCloud,
  FileCheck,
  ExternalLink,
  Trash2,
  CalendarCheck,
  Eye,
  Lock,
  Download,
  AlertTriangle,
  Info
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  setDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  addDoc 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { uploadJournalAttachments, deleteJournalAttachment, UploadProgressCallback } from '../firebase/storageHelper';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { JournalItem, JournalStatus, JournalAttachment, ScheduleItem } from '../types';

interface JournalViewProps {
  initialSelectedScheduleId?: string | null;
  onNavigateToSchedule?: (scheduleId: string) => void;
  onClearInitialScheduleId?: () => void;
}

export const JournalView: React.FC<JournalViewProps> = ({
  initialSelectedScheduleId,
  onNavigateToSchedule,
  onClearInitialScheduleId,
}) => {
  const { profile, effectiveRole } = useAuth();
  const { t } = useLanguage();

  const isStaff = effectiveRole === 'supervisor' || effectiveRole === 'admin' || effectiveRole === 'teacher';
  const isSupervisorOrAdmin = effectiveRole === 'supervisor' || effectiveRole === 'admin';
  const isStudent = effectiveRole === 'student';

  const [journals, setJournals] = useState<JournalItem[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scheduleFilter, setScheduleFilter] = useState<string>('all');

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<JournalItem | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Form input states
  const [formId, setFormId] = useState<string | null>(null);
  const [formScheduleId, setFormScheduleId] = useState<string>('');
  const [formScheduleTitle, setFormScheduleTitle] = useState<string>('');
  const [formScheduleDate, setFormScheduleDate] = useState<string>('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTitle, setFormTitle] = useState('');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('17:00');
  const [formDescription, setFormDescription] = useState('');
  const [formTasks, setFormTasks] = useState('');
  const [formResults, setFormResults] = useState('');
  const [formChallenges, setFormChallenges] = useState('');
  const [formSolutions, setFormSolutions] = useState('');
  const [formLearnings, setFormLearnings] = useState('');
  const [existingAttachments, setExistingAttachments] = useState<JournalAttachment[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Supervisor review state
  const [feedbackAction, setFeedbackAction] = useState<'approve' | 'revise'>('approve');
  const [feedbackText, setFeedbackText] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch schedules from Firestore
  useEffect(() => {
    const qSchedules = query(collection(db, 'schedules'), orderBy('date', 'desc'));
    const unsubSchedules = onSnapshot(qSchedules, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ScheduleItem));
      setSchedules(items);
    }, (err) => {
      console.warn('Schedules listener notice:', err);
    });

    return () => unsubSchedules();
  }, []);

  // 2. Fetch journals from Firestore
  useEffect(() => {
    let qJournals;
    if (isStaff) {
      qJournals = query(collection(db, 'journals'), orderBy('date', 'desc'));
    } else {
      qJournals = query(
        collection(db, 'journals'), 
        where('studentId', '==', profile?.uid || 'none')
      );
    }

    const unsubJournals = onSnapshot(qJournals, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as JournalItem));
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setJournals(items);
      setLoading(false);
    }, (error) => {
      console.warn('Journals snapshot notice:', error);
      setLoading(false);
    });

    return () => unsubJournals();
  }, [isStaff, profile?.uid]);

  // 3. Handle incoming initialSelectedScheduleId from navigation
  useEffect(() => {
    if (initialSelectedScheduleId && schedules.length > 0) {
      const targetSchedule = schedules.find(s => s.id === initialSelectedScheduleId);
      if (targetSchedule) {
        openCreateModal(targetSchedule);
        if (onClearInitialScheduleId) {
          onClearInitialScheduleId();
        }
      }
    }
  }, [initialSelectedScheduleId, schedules]);

  // Realtime calculated statistics
  const stats = {
    total: journals.length,
    draft: journals.filter(j => j.status === 'draft').length,
    submitted: journals.filter(j => j.status === 'submitted' || j.status === 'under_review').length,
    revision: journals.filter(j => j.status === 'revision_requested').length,
    approved: journals.filter(j => j.status === 'approved').length,
  };

  // Open Create Modal
  const openCreateModal = (prefillSchedule?: ScheduleItem) => {
    const today = new Date().toISOString().split('T')[0];
    setFormId(null);
    setFormError(null);
    setExistingAttachments([]);
    setNewFiles([]);
    setUploadProgress(null);

    if (prefillSchedule) {
      setFormScheduleId(prefillSchedule.id);
      setFormScheduleTitle(prefillSchedule.title);
      setFormScheduleDate(prefillSchedule.date);
      setFormDate(prefillSchedule.date || today);
      setFormStartTime(prefillSchedule.startTime || '08:00');
      setFormEndTime(prefillSchedule.endTime || '17:00');
      setFormTitle(`Jurnal Kegiatan: ${prefillSchedule.title}`);
    } else {
      // Pick first upcoming/available schedule if possible
      const available = schedules.filter(s => s.status !== 'cancelled');
      const firstSch = available[0];
      if (firstSch) {
        setFormScheduleId(firstSch.id);
        setFormScheduleTitle(firstSch.title);
        setFormScheduleDate(firstSch.date);
        setFormDate(firstSch.date || today);
        setFormStartTime(firstSch.startTime || '08:00');
        setFormEndTime(firstSch.endTime || '17:00');
        setFormTitle(`Jurnal Kegiatan: ${firstSch.title}`);
      } else {
        setFormScheduleId('');
        setFormScheduleTitle('');
        setFormScheduleDate('');
        setFormDate(today);
        setFormStartTime('08:00');
        setFormEndTime('17:00');
        setFormTitle('');
      }
    }

    setFormDescription('');
    setFormTasks('');
    setFormResults('');
    setFormChallenges('');
    setFormSolutions('');
    setFormLearnings('');
    setShowFormModal(true);
  };

  // Open Edit Modal
  const openEditModal = (j: JournalItem) => {
    setFormId(j.id);
    setFormError(null);
    setFormScheduleId(j.scheduleId || '');
    setFormScheduleTitle(j.scheduleTitle || '');
    setFormScheduleDate(j.scheduleDate || '');
    setFormDate(j.date);
    setFormTitle(j.title);
    setFormStartTime(j.startTime || '08:00');
    setFormEndTime(j.endTime || '17:00');
    setFormDescription(j.description);
    setFormTasks(j.tasks || '');
    setFormResults(j.results || '');
    setFormChallenges(j.challenges || '');
    setFormSolutions(j.solutions || '');
    setFormLearnings(j.learnings || '');
    setExistingAttachments(j.attachments || []);
    setNewFiles([]);
    setUploadProgress(null);
    setShowFormModal(true);
  };

  // Handle schedule select change in form
  const handleScheduleSelectChange = (schId: string) => {
    setFormScheduleId(schId);
    const chosen = schedules.find(s => s.id === schId);
    if (chosen) {
      setFormScheduleTitle(chosen.title);
      setFormScheduleDate(chosen.date);
      setFormDate(chosen.date);
      if (chosen.startTime) setFormStartTime(chosen.startTime);
      if (chosen.endTime) setFormEndTime(chosen.endTime);
      if (!formTitle || formTitle.startsWith('Jurnal Kegiatan:')) {
        setFormTitle(`Jurnal Kegiatan: ${chosen.title}`);
      }
    }
  };

  // File selection & validation
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    setFormError(null);

    const totalCount = existingAttachments.length + newFiles.length + filesArray.length;
    if (totalCount > 10) {
      setFormError('Batas maksimal lampiran adalah 10 berkas per jurnal.');
      return;
    }

    const validFiles: File[] = [];
    for (const f of filesArray) {
      const ext = f.name.split('.').pop()?.toLowerCase();
      const isAllowedType = f.type.startsWith('image/') || f.type === 'application/pdf' || ext === 'pdf';
      if (!isAllowedType) {
        setFormError(`Format berkas "${f.name}" tidak didukung. Harap unggah Gambar (JPG, PNG, WEBP) atau PDF.`);
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        setFormError(`Berkas "${f.name}" melebihi batas 10MB.`);
        return;
      }
      validFiles.push(f);
    }

    setNewFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeNewFile = (idx: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const removeExistingAttachment = (fileId: string) => {
    setExistingAttachments(prev => prev.filter(att => att.fileId !== fileId));
  };

  // Save Journal (Draft or Submitted)
  const handleSaveJournal = async (targetStatus: 'draft' | 'submitted') => {
    setFormError(null);

    if (!profile?.uid) {
      setFormError('Sesi pengguna tidak valid. Silakan muat ulang halaman.');
      return;
    }

    if (!formScheduleId) {
      setFormError('Wajib memilih jadwal magang resmi yang menjadi acuan kegiatan.');
      return;
    }

    if (!formTitle.trim()) {
      setFormError('Judul kegiatan wajib diisi.');
      return;
    }

    // Time validation
    if (formStartTime && formEndTime && formStartTime >= formEndTime) {
      setFormError('Jam mulai kegiatan harus lebih awal daripada jam selesai.');
      return;
    }

    // If submitting for review, enforce minimum details
    if (targetStatus === 'submitted') {
      if (!formDescription.trim() || formDescription.trim().length < 15) {
        setFormError('Deskripsi aktivitas wajib diisi minimal 15 karakter sebelum diajukan.');
        return;
      }
      if (!formTasks.trim()) {
        setFormError('Tugas yang dikerjakan wajib diisi sebelum diajukan.');
        return;
      }
      if (!formResults.trim()) {
        setFormError('Hasil pekerjaan / capaian wajib diisi sebelum diajukan.');
        return;
      }
    }

    setSaving(true);
    try {
      const jId = formId || `jrn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const nowStr = new Date().toISOString();

      // Check if duplicate approved/submitted journal exists for this schedule (only on new creates)
      if (!formId) {
        const existingForSchedule = journals.find(
          j => j.scheduleId === formScheduleId && j.id !== jId && (j.status === 'approved' || j.status === 'submitted')
        );
        if (existingForSchedule) {
          const confirmDuplicate = window.confirm(
            `Anda sudah memiliki jurnal berstatus "${existingForSchedule.status === 'approved' ? 'Disetujui' : 'Menunggu Review'}" untuk jadwal ini. Tetap ingin membuat jurnal tambahan?`
          );
          if (!confirmDuplicate) {
            setSaving(false);
            return;
          }
        }
      }

      // Upload newly added files
      let uploadedAttachments: JournalAttachment[] = [];
      if (newFiles.length > 0) {
        setUploadProgress({ percent: 10, text: 'Memulai pengunggahan lampiran...' });
        uploadedAttachments = await uploadJournalAttachments(
          newFiles,
          profile.uid,
          jId,
          (percent, current, total, text) => {
            setUploadProgress({ percent, text });
          }
        );
      }

      const finalAttachments: JournalAttachment[] = [
        ...existingAttachments,
        ...uploadedAttachments
      ];

      const chosenSchedule = schedules.find(s => s.id === formScheduleId);

      const journalPayload: JournalItem = {
        id: jId,
        studentId: profile.uid,
        studentName: profile.displayName || 'Peserta Magang',
        studentEmail: profile.email || '',
        scheduleId: formScheduleId,
        scheduleTitle: chosenSchedule?.title || formScheduleTitle || 'Agenda Magang',
        scheduleDate: chosenSchedule?.date || formScheduleDate || formDate,
        date: formDate,
        title: formTitle.trim(),
        startTime: formStartTime,
        endTime: formEndTime,
        description: formDescription.trim(),
        tasks: formTasks.trim(),
        results: formResults.trim(),
        challenges: formChallenges.trim(),
        solutions: formSolutions.trim(),
        learnings: formLearnings.trim(),
        attachments: finalAttachments,
        status: targetStatus,
        submittedAt: targetStatus === 'submitted' ? nowStr : (selectedJournal?.submittedAt || ''),
        updatedAt: nowStr,
        feedback: selectedJournal?.feedback || '',
        reviewFeedback: selectedJournal?.reviewFeedback || '',
        reviewerName: selectedJournal?.reviewerName || '',
        reviewedAt: selectedJournal?.reviewedAt || '',
      };

      await setDoc(doc(db, 'journals', jId), journalPayload);

      // Create notification for supervisor if submitted
      if (targetStatus === 'submitted') {
        const supervisorTargetUid = profile.supervisorId || 'supervisor';
        await addDoc(collection(db, 'notifications'), {
          userId: supervisorTargetUid,
          title: `Jurnal Diajukan: ${profile.displayName}`,
          message: `${profile.displayName} telah mengajukan jurnal harian "${journalPayload.title}" untuk jadwal ${journalPayload.scheduleDate}.`,
          type: 'info',
          read: false,
          createdAt: nowStr,
        });
      }

      setShowFormModal(false);
      setShowPreviewModal(false);
      setNewFiles([]);
      setUploadProgress(null);
    } catch (err: any) {
      console.error('Error saving journal:', err);
      setFormError(`Gagal menyimpan jurnal: ${err?.message || 'Terjadi kesalahan sistem.'}`);
    } finally {
      setSaving(false);
    }
  };

  // Supervisor Review Submission
  const handleSupervisorReview = async () => {
    if (!selectedJournal) return;
    setReviewError(null);

    if (feedbackAction === 'revise' && !feedbackText.trim()) {
      setReviewError('Wajib menyertakan catatan revisi yang jelas untuk siswa.');
      return;
    }

    setSaving(true);
    try {
      const nowStr = new Date().toISOString();
      const newStatus: JournalStatus = feedbackAction === 'approve' ? 'approved' : 'revision_requested';

      await updateDoc(doc(db, 'journals', selectedJournal.id), {
        status: newStatus,
        feedback: feedbackText.trim(),
        reviewFeedback: feedbackText.trim(),
        reviewedBy: profile?.uid || 'supervisor',
        reviewerName: profile?.displayName || 'Pembimbing Industri',
        reviewedAt: nowStr,
      });

      // Notify student
      await addDoc(collection(db, 'notifications'), {
        userId: selectedJournal.studentId,
        title: newStatus === 'approved' ? 'Jurnal Harian Disetujui' : 'Catatan Revisi Jurnal Harian',
        message: newStatus === 'approved'
          ? `Jurnal "${selectedJournal.title}" telah disetujui oleh pembimbing.`
          : `Pembimbing meminta revisi pada jurnal "${selectedJournal.title}": "${feedbackText.trim()}"`,
        type: newStatus === 'approved' ? 'success' : 'warning',
        read: false,
        createdAt: nowStr,
      });

      setShowFeedbackModal(false);
      setShowDetailModal(false);
    } catch (err: any) {
      console.error('Supervisor review failed:', err);
      setReviewError(`Gagal menyimpan evaluasi: ${err?.message || 'Kesalahan sistem'}`);
    } finally {
      setSaving(false);
    }
  };

  // Delete Journal (Only student's own draft or rejected)
  const handleDeleteJournal = async () => {
    if (!selectedJournal) return;
    setSaving(true);
    try {
      // Delete attachments from storage if any
      if (selectedJournal.attachments && selectedJournal.attachments.length > 0) {
        for (const att of selectedJournal.attachments) {
          if (att.storagePath) {
            await deleteJournalAttachment(att.storagePath);
          }
        }
      }

      await deleteDoc(doc(db, 'journals', selectedJournal.id));
      setShowDeleteConfirm(false);
      setShowDetailModal(false);
      setSelectedJournal(null);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setSaving(false);
    }
  };

  // Filter journals
  const filteredJournals = journals.filter(j => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = 
      j.title.toLowerCase().includes(term) ||
      (j.studentName && j.studentName.toLowerCase().includes(term)) ||
      (j.scheduleTitle && j.scheduleTitle.toLowerCase().includes(term)) ||
      (j.description && j.description.toLowerCase().includes(term)) ||
      (j.tasks && j.tasks.toLowerCase().includes(term));

    const matchesStatus = 
      statusFilter === 'all' ? true :
      statusFilter === 'submitted' ? (j.status === 'submitted' || j.status === 'under_review') :
      j.status === statusFilter;

    const matchesSchedule = scheduleFilter === 'all' || j.scheduleId === scheduleFilter;

    return matchesSearch && matchesStatus && matchesSchedule;
  });

  const getStatusBadge = (status: JournalStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Disetujui</span>
          </span>
        );
      case 'revision_requested':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 flex items-center gap-1 border border-red-200">
            <RotateCcw className="w-3 h-3 text-red-600" />
            <span>Perlu Revisi</span>
          </span>
        );
      case 'submitted':
      case 'under_review':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Menunggu Review</span>
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 flex items-center gap-1 border border-gray-200">
            <FileText className="w-3 h-3 text-gray-500" />
            <span>Draf</span>
          </span>
        );
    }
  };

  const selectedFormSchedule = schedules.find(s => s.id === formScheduleId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#111A16] flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#0B3325]" />
            <span>{t.journal.title}</span>
          </h2>
          <p className="text-xs text-[#718078] mt-0.5">
            {t.journal.subtitle || 'Kelola, simpan, dan ajukan jurnal harian kegiatan magang Anda berdasarkan jadwal resmi PT One Data Security.'}
          </p>
        </div>

        {isStudent && (
          <button
            onClick={() => openCreateModal()}
            className="self-start sm:self-auto px-4 py-2 rounded-full text-xs font-bold bg-[#0B3325] text-white hover:bg-[#102F23] flex items-center gap-2 shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 text-[#B7F500]" />
            <span>+ Tulis Jurnal</span>
          </button>
        )}
      </div>

      {/* 5 Realtime Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total */}
        <div 
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-3xl border transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-[#061F16] text-white border-[#061F16] shadow-sm'
              : 'bg-white border-[#E6ECE8] text-[#111A16] hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-semibold ${statusFilter === 'all' ? 'text-gray-300' : 'text-[#718078]'}`}>
              Total Jurnal
            </span>
            <BookOpen className={`w-4 h-4 ${statusFilter === 'all' ? 'text-[#B7F500]' : 'text-[#0B3325]'}`} />
          </div>
          <span className="text-2xl font-extrabold">{stats.total}</span>
          <span className={`block text-[10px] mt-1 ${statusFilter === 'all' ? 'text-[#B7F500]' : 'text-[#718078]'}`}>
            Seluruh catatan kegiatan
          </span>
        </div>

        {/* Draf */}
        <div 
          onClick={() => setStatusFilter('draft')}
          className={`p-4 rounded-3xl border transition-all cursor-pointer ${
            statusFilter === 'draft'
              ? 'bg-gray-800 text-white border-gray-800 shadow-sm'
              : 'bg-white border-[#E6ECE8] text-[#111A16] hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-semibold ${statusFilter === 'draft' ? 'text-gray-300' : 'text-[#718078]'}`}>
              Draf
            </span>
            <FileText className={`w-4 h-4 ${statusFilter === 'draft' ? 'text-gray-200' : 'text-gray-500'}`} />
          </div>
          <span className="text-2xl font-extrabold">{stats.draft}</span>
          <span className={`block text-[10px] mt-1 ${statusFilter === 'draft' ? 'text-gray-300' : 'text-[#718078]'}`}>
            Belum diajukan
          </span>
        </div>

        {/* Menunggu Review */}
        <div 
          onClick={() => setStatusFilter('submitted')}
          className={`p-4 rounded-3xl border transition-all cursor-pointer ${
            statusFilter === 'submitted'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-white border-[#E6ECE8] text-[#111A16] hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-semibold ${statusFilter === 'submitted' ? 'text-amber-100' : 'text-amber-700'}`}>
              Menunggu Review
            </span>
            <Clock className={`w-4 h-4 ${statusFilter === 'submitted' ? 'text-amber-200' : 'text-amber-500'}`} />
          </div>
          <span className="text-2xl font-extrabold">{stats.submitted}</span>
          <span className={`block text-[10px] mt-1 ${statusFilter === 'submitted' ? 'text-amber-100' : 'text-[#718078]'}`}>
            Perlu evaluasi pembimbing
          </span>
        </div>

        {/* Perlu Revisi */}
        <div 
          onClick={() => setStatusFilter('revision_requested')}
          className={`p-4 rounded-3xl border transition-all cursor-pointer ${
            statusFilter === 'revision_requested'
              ? 'bg-red-600 text-white border-red-600 shadow-sm'
              : 'bg-white border-[#E6ECE8] text-[#111A16] hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-semibold ${statusFilter === 'revision_requested' ? 'text-red-100' : 'text-red-700'}`}>
              Perlu Revisi
            </span>
            <RotateCcw className={`w-4 h-4 ${statusFilter === 'revision_requested' ? 'text-red-200' : 'text-red-500'}`} />
          </div>
          <span className="text-2xl font-extrabold">{stats.revision}</span>
          <span className={`block text-[10px] mt-1 ${statusFilter === 'revision_requested' ? 'text-red-100' : 'text-[#718078]'}`}>
            Memerlukan perbaikan
          </span>
        </div>

        {/* Disetujui */}
        <div 
          onClick={() => setStatusFilter('approved')}
          className={`p-4 rounded-3xl border transition-all cursor-pointer ${
            statusFilter === 'approved'
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
              : 'bg-white border-[#E6ECE8] text-[#111A16] hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-semibold ${statusFilter === 'approved' ? 'text-emerald-100' : 'text-emerald-700'}`}>
              Jurnal Disetujui
            </span>
            <CheckCircle2 className={`w-4 h-4 ${statusFilter === 'approved' ? 'text-[#B7F500]' : 'text-emerald-600'}`} />
          </div>
          <span className="text-2xl font-extrabold">{stats.approved}</span>
          <span className={`block text-[10px] mt-1 ${statusFilter === 'approved' ? 'text-emerald-100' : 'text-[#718078]'}`}>
            Telah divalidasi
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E6ECE8] shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#718078]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari jurnal berdasarkan judul kegiatan, agenda jadwal, rincian tugas..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#F3F6F4] border border-[#E6ECE8] focus:outline-none focus:ring-2 focus:ring-[#0B3325]/20 focus:border-[#0B3325]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Schedule Filter */}
          <div className="flex items-center gap-1.5 bg-[#F3F6F4] px-3 py-1.5 rounded-xl border border-[#E6ECE8]">
            <CalendarCheck className="w-3.5 h-3.5 text-[#718078]" />
            <select
              value={scheduleFilter}
              onChange={(e) => setScheduleFilter(e.target.value)}
              className="text-xs font-medium bg-transparent text-[#111A16] focus:outline-none max-w-[150px] sm:max-w-[200px] truncate"
            >
              <option value="all">Semua Agenda Jadwal</option>
              {schedules.map(sch => (
                <option key={sch.id} value={sch.id}>
                  {sch.date} - {sch.title}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-[#F3F6F4] px-3 py-1.5 rounded-xl border border-[#E6ECE8]">
            <Filter className="w-3.5 h-3.5 text-[#718078]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-medium bg-transparent text-[#111A16] focus:outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="draft">Draf</option>
              <option value="submitted">Menunggu Review</option>
              <option value="revision_requested">Perlu Revisi</option>
              <option value="approved">Disetujui</option>
            </select>
          </div>
        </div>
      </div>

      {/* Journal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center">
            <div className="w-8 h-8 border-2 border-[#0B3325] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#718078]">Memuat daftar jurnal...</p>
          </div>
        ) : filteredJournals.length === 0 ? (
          <div className="col-span-full py-16 bg-white rounded-3xl border border-[#E6ECE8] text-center p-6 space-y-3">
            <BookOpen className="w-12 h-12 text-[#718078] mx-auto opacity-40" />
            <div className="max-w-md mx-auto">
              <h3 className="text-sm font-bold text-[#111A16]">Belum Ada Jurnal Harian</h3>
              <p className="text-xs text-[#718078] mt-1">
                {statusFilter !== 'all' || scheduleFilter !== 'all'
                  ? 'Tidak ada jurnal yang sesuai dengan filter pencarian Anda.'
                  : 'Siswa dapat mulai mencatat aktivitas harian sesuai jadwal kegiatan resmi magang.'}
              </p>
            </div>
            {isStudent && (
              <button
                onClick={() => openCreateModal()}
                className="mt-2 px-5 py-2 rounded-full text-xs font-bold bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23] inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Tulis Jurnal Pertama</span>
              </button>
            )}
          </div>
        ) : (
          filteredJournals.map((j) => {
            const hasAttachments = j.attachments && j.attachments.length > 0;
            const hasFeedback = j.feedback || j.reviewFeedback;
            const isApproved = j.status === 'approved';

            return (
              <div
                key={j.id}
                className={`bg-white rounded-3xl p-5 border shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between ${
                  j.status === 'revision_requested' 
                    ? 'border-red-300 ring-1 ring-red-200' 
                    : 'border-[#E6ECE8]'
                }`}
              >
                <div>
                  {/* Top status & date info */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[11px] font-semibold text-[#718078] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {j.date}
                    </span>
                    {getStatusBadge(j.status)}
                  </div>

                  {/* Connected Schedule Pill */}
                  {j.scheduleTitle && (
                    <div className="mb-2.5 px-3 py-1.5 rounded-xl bg-[#F3F6F4] border border-[#E6ECE8] flex items-center justify-between gap-1 text-[11px]">
                      <div className="flex items-center gap-1.5 truncate text-[#0B3325] font-semibold">
                        <CalendarCheck className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                        <span className="truncate">Jadwal: {j.scheduleTitle}</span>
                      </div>
                      {onNavigateToSchedule && j.scheduleId && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToSchedule(j.scheduleId!);
                          }}
                          className="text-[10px] text-[#16A34A] hover:underline font-bold shrink-0 ml-1"
                          title="Buka agenda jadwal"
                        >
                          Lihat
                        </button>
                      )}
                    </div>
                  )}

                  {/* Title & Author */}
                  <h3 className="text-sm font-bold text-[#111A16] line-clamp-1 mb-1">
                    {j.title}
                  </h3>

                  {isStaff && (
                    <p className="text-[11px] font-medium text-[#16A34A] mb-2">
                      Siswa: {j.studentName}
                    </p>
                  )}

                  {/* Time Range */}
                  {(j.startTime || j.endTime) && (
                    <p className="text-[10px] text-[#718078] font-medium flex items-center gap-1 mb-2">
                      <Clock className="w-3 h-3" />
                      <span>{j.startTime || '08:00'} - {j.endTime || '17:00'} WIB</span>
                    </p>
                  )}

                  {/* Description preview */}
                  <p className="text-xs text-[#718078] line-clamp-3 mb-3">
                    {j.description}
                  </p>

                  {/* Attachments preview snippet */}
                  {hasAttachments && (
                    <div className="p-2.5 rounded-2xl bg-[#F3F6F4]/70 border border-[#E6ECE8] flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-3.5 h-3.5 text-[#0B3325]" />
                        <span className="text-[11px] font-bold text-[#111A16]">
                          {j.attachments!.length} Lampiran
                        </span>
                      </div>
                      <div className="flex items-center -space-x-1.5">
                        {j.attachments!.slice(0, 3).map((att) => (
                          att.mimeType.startsWith('image/') ? (
                            <img
                              key={att.fileId}
                              src={att.fileUrl}
                              alt={att.fileName}
                              className="w-6 h-6 rounded-md object-cover border border-white shadow-2xs"
                            />
                          ) : (
                            <div key={att.fileId} className="w-6 h-6 rounded-md bg-red-100 text-red-700 flex items-center justify-center text-[8px] font-bold border border-white">
                              PDF
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Supervisor feedback preview if revision requested */}
                  {j.status === 'revision_requested' && hasFeedback && (
                    <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-[11px] text-red-900 mb-3 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-red-800">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>Catatan Revisi Pembimbing:</span>
                      </div>
                      <p className="italic line-clamp-2">"{j.feedback || j.reviewFeedback}"</p>
                    </div>
                  )}

                  {/* Approved notice */}
                  {isApproved && (
                    <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 mb-3 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-emerald-800 truncate">
                        Disetujui oleh {j.reviewerName || 'Pembimbing'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-[#E6ECE8] flex items-center justify-between mt-2">
                  <button
                    onClick={() => {
                      setSelectedJournal(j);
                      setShowDetailModal(true);
                    }}
                    className="text-xs font-semibold text-[#0B3325] hover:text-[#16A34A] flex items-center gap-1"
                  >
                    <span>Detail Jurnal</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Student edit button (only if not approved) */}
                    {isStudent && !isApproved && (
                      <button
                        onClick={() => openEditModal(j)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                          j.status === 'revision_requested'
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-[#F3F6F4] text-[#111A16] hover:bg-[#E6ECE8]'
                        }`}
                        title={j.status === 'revision_requested' ? 'Perbaiki Jurnal' : 'Edit Jurnal'}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{j.status === 'revision_requested' ? 'Perbaiki' : 'Edit'}</span>
                      </button>
                    )}

                    {/* Approved indicator for student */}
                    {isStudent && isApproved && (
                      <span className="p-1.5 text-emerald-700 text-[11px] font-semibold flex items-center gap-1" title="Terkunci - Sudah Disetujui">
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                    )}

                    {/* Supervisor Review button */}
                    {isSupervisorOrAdmin && (j.status === 'submitted' || j.status === 'under_review') && (
                      <button
                        onClick={() => {
                          setSelectedJournal(j);
                          setFeedbackText(j.feedback || j.reviewFeedback || '');
                          setShowFeedbackModal(true);
                        }}
                        className="px-3 py-1 rounded-full text-xs font-bold bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23] flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Tinjau</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DETAIL MODAL */}
      {showDetailModal && selectedJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#E6ECE8] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#718078] font-semibold">
                    {selectedJournal.date} • {selectedJournal.startTime || '08:00'} - {selectedJournal.endTime || '17:00'} WIB
                  </span>
                  {getStatusBadge(selectedJournal.status)}
                </div>
                <h3 className="text-lg font-bold text-[#111A16]">
                  {selectedJournal.title}
                </h3>
                <p className="text-xs text-[#16A34A] font-semibold">
                  Siswa: {selectedJournal.studentName} ({selectedJournal.studentEmail})
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 rounded-full hover:bg-[#F3F6F4] text-[#718078]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Linked Schedule Info Box */}
            <div className="p-4 rounded-2xl bg-[#F3F6F4] border border-[#E6ECE8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#16A34A]">
                  Jadwal Magang Terhubung
                </span>
                <p className="font-bold text-[#111A16]">{selectedJournal.scheduleTitle || 'Agenda Terjadwal'}</p>
                <p className="text-[11px] text-[#718078]">Tanggal Pelaksanaan: {selectedJournal.scheduleDate || selectedJournal.date}</p>
              </div>

              {onNavigateToSchedule && selectedJournal.scheduleId && (
                <button
                  type="button"
                  onClick={() => {
                    const schId = selectedJournal.scheduleId!;
                    setShowDetailModal(false);
                    onNavigateToSchedule(schId);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-[#0B3325] hover:bg-emerald-50 border border-[#E6ECE8] self-start sm:self-auto flex items-center gap-1"
                >
                  <CalendarCheck className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>Lihat Jadwal Resmi</span>
                </button>
              )}
            </div>

            {/* Content Sections */}
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-[#111A16] mb-1">Deskripsi Rinci Aktivitas</h4>
                <p className="text-[#718078] whitespace-pre-wrap bg-[#F3F6F4] p-3.5 rounded-2xl">
                  {selectedJournal.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <h4 className="font-bold text-[#111A16] mb-1">Tugas / Target yang Dikerjakan</h4>
                  <p className="text-[#718078] whitespace-pre-wrap bg-[#F3F6F4] p-3.5 rounded-2xl min-h-[60px]">
                    {selectedJournal.tasks || '-'}
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-[#111A16] mb-1">Hasil Pekerjaan / Capaian</h4>
                  <p className="text-[#718078] whitespace-pre-wrap bg-[#F3F6F4] p-3.5 rounded-2xl min-h-[60px]">
                    {selectedJournal.results || '-'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <h4 className="font-bold text-[#111A16] mb-1">Kendala yang Dihadapi</h4>
                  <p className="text-[#718078] whitespace-pre-wrap bg-[#F3F6F4] p-3.5 rounded-2xl min-h-[60px]">
                    {selectedJournal.challenges || 'Tidak ada kendala berarti.'}
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-[#111A16] mb-1">Solusi & Tindakan Mengatasi</h4>
                  <p className="text-[#718078] whitespace-pre-wrap bg-[#F3F6F4] p-3.5 rounded-2xl min-h-[60px]">
                    {selectedJournal.solutions || '-'}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#111A16] mb-1">Pembelajaran & Refleksi Diri</h4>
                <p className="text-[#718078] whitespace-pre-wrap bg-[#F3F6F4] p-3.5 rounded-2xl">
                  {selectedJournal.learnings || '-'}
                </p>
              </div>

              {/* Attachments Section */}
              {selectedJournal.attachments && selectedJournal.attachments.length > 0 && (
                <div>
                  <h4 className="font-bold text-[#111A16] mb-2 flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-[#0B3325]" />
                    <span>Lampiran Pendukung ({selectedJournal.attachments.length})</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedJournal.attachments.map((att) => {
                      const isImage = att.mimeType.startsWith('image/');
                      return (
                        <div
                          key={att.fileId}
                          className="p-2.5 rounded-2xl border border-[#E6ECE8] bg-white space-y-2 flex flex-col justify-between"
                        >
                          {isImage ? (
                            <img
                              src={att.fileUrl}
                              alt={att.fileName}
                              onClick={() => setLightboxUrl(att.fileUrl)}
                              className="w-full h-24 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                            />
                          ) : (
                            <div className="w-full h-24 bg-red-50 text-red-700 rounded-xl flex flex-col items-center justify-center p-2 text-center">
                              <FileText className="w-8 h-8 mb-1" />
                              <span className="text-[10px] font-bold">PDF Dokumen</span>
                            </div>
                          )}

                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-[#111A16] truncate" title={att.fileName}>
                              {att.fileName}
                            </p>
                            <a
                              href={att.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] font-semibold text-[#16A34A] hover:underline flex items-center gap-1"
                            >
                              <span>Buka / Unduh</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Catatan Pembimbing Section */}
              {(selectedJournal.feedback || selectedJournal.reviewFeedback) && (
                <div className={`p-4 rounded-2xl border ${
                  selectedJournal.status === 'approved' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-red-50 border-red-200 text-red-950'
                }`}>
                  <h4 className="font-bold mb-1 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4" />
                    <span>Catatan Evaluasi Pembimbing Industri</span>
                  </h4>
                  <p className="italic text-xs">
                    "{selectedJournal.feedback || selectedJournal.reviewFeedback}"
                  </p>
                  <p className="text-[10px] opacity-80 mt-2">
                    Ditinjau oleh: {selectedJournal.reviewerName || 'Pembimbing'} {selectedJournal.reviewedAt ? `pada ${selectedJournal.reviewedAt.split('T')[0]}` : ''}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E6ECE8]">
              {/* Delete button (student only, draft or revision) */}
              {isStudent && selectedJournal.status !== 'approved' ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-2 rounded-full text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus Jurnal</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                {/* Student Edit button */}
                {isStudent && selectedJournal.status !== 'approved' && (
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      openEditModal(selectedJournal);
                    }}
                    className="px-4 py-2 rounded-full text-xs font-bold bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23] flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Perbaiki / Edit</span>
                  </button>
                )}

                {/* Supervisor Review button */}
                {isSupervisorOrAdmin && selectedJournal.status !== 'approved' && (
                  <button
                    onClick={() => {
                      setFeedbackText(selectedJournal.feedback || selectedJournal.reviewFeedback || '');
                      setShowFeedbackModal(true);
                    }}
                    className="px-4 py-2 rounded-full text-xs font-bold bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23]"
                  >
                    Tinjau / Beri Masukan
                  </button>
                )}

                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold bg-[#F3F6F4] text-[#111A16] hover:bg-[#E6ECE8]"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT FORM MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E6ECE8] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#111A16]">
                  {formId ? 'Edit Jurnal Harian Magang' : 'Tulis Jurnal Harian Baru'}
                </h3>
                <p className="text-xs text-[#718078]">
                  Hubungkan dengan jadwal magang resmi PT One Data Security
                </p>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-1.5 rounded-full hover:bg-[#F3F6F4] text-[#718078]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-4 text-xs">
              {/* 1. Schedule Selection (MANDATORY LINKAGE) */}
              <div className="space-y-1.5">
                <label className="block font-bold text-[#111A16]">
                  Pilih Jadwal Magang Terkait <span className="text-red-500">*</span>
                </label>
                <select
                  value={formScheduleId}
                  onChange={(e) => handleScheduleSelectChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4] text-[#111A16] font-medium focus:outline-none focus:border-[#0B3325]"
                >
                  <option value="">-- Pilih Jadwal Magang Resmi --</option>
                  {schedules.filter(s => s.status !== 'cancelled').map(sch => (
                    <option key={sch.id} value={sch.id}>
                      [{sch.date}] {sch.title} ({sch.startTime} - {sch.endTime})
                    </option>
                  ))}
                </select>

                {/* Schedule Summary Card */}
                {selectedFormSchedule && (
                  <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-[11px] space-y-1">
                    <div className="flex items-center justify-between font-bold text-[#0B3325]">
                      <span>{selectedFormSchedule.title}</span>
                      <span className="text-[10px] bg-emerald-200/80 px-2 py-0.5 rounded-full">
                        {selectedFormSchedule.date} • {selectedFormSchedule.startTime} - {selectedFormSchedule.endTime} WIB
                      </span>
                    </div>
                    <p className="text-[#718078] line-clamp-2">
                      Lokasi: {selectedFormSchedule.location} | {selectedFormSchedule.description || 'Tidak ada deskripsi'}
                    </p>
                  </div>
                )}
              </div>

              {/* 2. Activity Title */}
              <div>
                <label className="block font-bold text-[#111A16] mb-1">
                  Judul Kegiatan Jurnal <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: Konfigurasi Snort IDS & Analisis Log Serangan Brute Force"
                  className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-white focus:outline-none focus:border-[#0B3325]"
                />
              </div>

              {/* 3. Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#111A16] mb-1">
                    Tanggal Pelaksanaan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#111A16] mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#111A16] mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                  />
                </div>
              </div>

              {/* 4. Activity Description */}
              <div>
                <label className="block font-bold text-[#111A16] mb-1">
                  Deskripsi Rinci Aktivitas <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Deskripsikan jalannya kegiatan magang yang Anda lakukan secara komprehensif..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] focus:border-[#0B3325] bg-white"
                />
              </div>

              {/* 5. Tasks & Results */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#111A16] mb-1">
                    Tugas yang Dikerjakan <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={formTasks}
                    onChange={(e) => setFormTasks(e.target.value)}
                    placeholder="Contoh: Menginstal modul Suricata, mengaudit rule firewall..."
                    className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#111A16] mb-1">
                    Hasil Pekerjaan / Capaian <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={formResults}
                    onChange={(e) => setFormResults(e.target.value)}
                    placeholder="Contoh: Berhasil mendeteksi 14 false positive dan membuat dashboard alert..."
                    className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8]"
                  />
                </div>
              </div>

              {/* 6. Challenges & Solutions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#111A16] mb-1">Kendala yang Dihadapi</label>
                  <textarea
                    rows={2}
                    value={formChallenges}
                    onChange={(e) => setFormChallenges(e.target.value)}
                    placeholder="Contoh: Terjadi packet drop saat lalu lintas data mencapai 1 Gbps..."
                    className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#111A16] mb-1">Solusi / Tindakan Mengatasi</label>
                  <textarea
                    rows={2}
                    value={formSolutions}
                    onChange={(e) => setFormSolutions(e.target.value)}
                    placeholder="Contoh: Melakukan tuning buffer memory kernel Linux dan mematikan checksum offloading..."
                    className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8]"
                  />
                </div>
              </div>

              {/* 7. Reflection & Learnings */}
              <div>
                <label className="block font-bold text-[#111A16] mb-1">Pembelajaran & Refleksi Diri</label>
                <textarea
                  rows={2}
                  value={formLearnings}
                  onChange={(e) => setFormLearnings(e.target.value)}
                  placeholder="Hal baru apa yang Anda pelajari hari ini terkait etika kerja, teknologi, atau manajemen waktu..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8]"
                />
              </div>

              {/* 8. Attachments Upload */}
              <div className="space-y-2 pt-2 border-t border-[#E6ECE8]">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-[#111A16]">
                    Lampiran Pendukung (Foto / PDF)
                  </label>
                  <span className="text-[10px] text-[#718078]">
                    Maks. 10 berkas (hingga 10MB/berkas)
                  </span>
                </div>

                {/* Dropzone / Upload button */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-2xl border-2 border-dashed border-[#E6ECE8] hover:border-[#0B3325] bg-[#F3F6F4]/50 hover:bg-[#F3F6F4] transition-all cursor-pointer text-center space-y-1.5"
                >
                  <UploadCloud className="w-6 h-6 text-[#0B3325] mx-auto" />
                  <p className="font-bold text-[#111A16]">
                    Klik untuk memilih foto kegiatan atau dokumen PDF
                  </p>
                  <p className="text-[10px] text-[#718078]">
                    Format didukung: JPG, PNG, WEBP, PDF
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Upload Progress bar */}
                {uploadProgress && (
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-[#0B3325] space-y-1">
                    <div className="flex items-center justify-between font-bold text-[11px]">
                      <span>{uploadProgress.text}</span>
                      <span>{uploadProgress.percent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-emerald-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#16A34A] transition-all duration-300"
                        style={{ width: `${uploadProgress.percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Existing Attachments list */}
                {existingAttachments.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-[#718078] block">Lampiran Tersimpan:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {existingAttachments.map((att) => (
                        <div key={att.fileId} className="p-2 rounded-xl bg-white border border-[#E6ECE8] flex items-center justify-between gap-1 text-[11px]">
                          <span className="truncate font-medium">{att.fileName}</span>
                          <button
                            type="button"
                            onClick={() => removeExistingAttachment(att.fileId)}
                            className="p-1 rounded-md text-red-500 hover:bg-red-50 shrink-0"
                            title="Hapus berkas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Newly selected files list */}
                {newFiles.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-[#16A34A] block">Berkas Baru Akan Diunggah:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {newFiles.map((f, i) => (
                        <div key={i} className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-1 text-[11px]">
                          <span className="truncate font-medium text-emerald-950">{f.name}</span>
                          <button
                            type="button"
                            onClick={() => removeNewFile(i)}
                            className="p-1 rounded-md text-red-500 hover:bg-red-50 shrink-0"
                            title="Batalkan berkas"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-[#E6ECE8]">
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="px-4 py-2 rounded-full font-semibold text-[#718078] hover:text-[#111A16]"
              >
                Batal
              </button>

              <div className="flex items-center gap-2">
                {/* Preview Button */}
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="px-3.5 py-2 rounded-full font-bold bg-[#F3F6F4] text-[#0B3325] hover:bg-[#E6ECE8] flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Pratinjau</span>
                </button>

                {/* Save Draft */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveJournal('draft')}
                  className="px-4 py-2 rounded-full font-semibold bg-[#F3F6F4] text-[#111A16] hover:bg-[#E6ECE8]"
                >
                  Simpan Draf
                </button>

                {/* Submit for Review */}
                <button
                  type="button"
                  disabled={saving || !formScheduleId || !formTitle.trim()}
                  onClick={() => handleSaveJournal('submitted')}
                  className="px-5 py-2 rounded-full font-bold bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23] flex items-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Jurnal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E6ECE8] pb-3">
              <h3 className="text-base font-bold text-[#111A16] flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#16A34A]" />
                <span>Pratinjau Jurnal Harian</span>
              </h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1 rounded-full hover:bg-[#F3F6F4] text-[#718078]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-[#16A34A]">Jadwal Terhubung</span>
                <p className="font-bold text-[#0B3325]">{formScheduleTitle || 'Belum dipilih'}</p>
                <p className="text-[11px] text-[#718078]">{formDate} • {formStartTime} - {formEndTime} WIB</p>
              </div>

              <div>
                <span className="font-bold block text-[#111A16]">Judul Kegiatan:</span>
                <p className="text-[#111A16] font-semibold">{formTitle || '-'}</p>
              </div>

              <div>
                <span className="font-bold block text-[#111A16]">Deskripsi Aktivitas:</span>
                <p className="text-[#718078] bg-[#F3F6F4] p-3 rounded-xl whitespace-pre-wrap">{formDescription || '-'}</p>
              </div>

              <div>
                <span className="font-bold block text-[#111A16]">Tugas & Hasil:</span>
                <p className="text-[#718078] bg-[#F3F6F4] p-3 rounded-xl whitespace-pre-wrap">
                  Tugas: {formTasks || '-'}{'\n\n'}Hasil: {formResults || '-'}
                </p>
              </div>

              <div>
                <span className="font-bold block text-[#111A16]">Lampiran yang Disertakan:</span>
                <p className="text-[#718078]">
                  {existingAttachments.length + newFiles.length} berkas terlampir.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E6ECE8]">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 rounded-full font-semibold text-xs bg-[#F3F6F4] text-[#111A16]"
              >
                Kembali Edit
              </button>
              <button
                disabled={saving}
                onClick={() => handleSaveJournal('submitted')}
                className="px-5 py-2 rounded-full font-bold text-xs bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23] flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUPERVISOR REVIEW MODAL */}
      {showFeedbackModal && selectedJournal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#111A16]">
              Evaluasi & Tinjau Jurnal Siswa
            </h3>
            <p className="text-xs text-[#718078]">
              {selectedJournal.studentName} — "{selectedJournal.title}" ({selectedJournal.scheduleTitle})
            </p>

            {reviewError && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{reviewError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFeedbackAction('approve')}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  feedbackAction === 'approve' 
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                    : 'border-[#E6ECE8] text-[#718078] hover:bg-[#F3F6F4]'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Setujui Jurnal</span>
              </button>
              <button
                type="button"
                onClick={() => setFeedbackAction('revise')}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  feedbackAction === 'revise' 
                    ? 'bg-red-600 text-white border-red-600 shadow-xs' 
                    : 'border-[#E6ECE8] text-[#718078] hover:bg-[#F3F6F4]'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Minta Revisi</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111A16] mb-1">
                Catatan / Masukan Pembimbing {feedbackAction === 'revise' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                rows={4}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder={
                  feedbackAction === 'approve' 
                    ? 'Catatan apresiasi atau arahan teknis selanjutnya (opsional)...' 
                    : 'Jelaskan bagian mana yang perlu diperbaiki oleh siswa (wajib)...'
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6ECE8] focus:border-[#0B3325]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6ECE8]">
              <button
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-[#718078]"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSupervisorReview}
                className="px-5 py-2 rounded-full text-xs font-bold bg-[#0B3325] text-white hover:bg-[#102F23]"
              >
                Simpan Keputusan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && selectedJournal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111A16]">Hapus Jurnal Harian?</h3>
              <p className="text-xs text-[#718078] mt-1">
                Jurnal "{selectedJournal.title}" beserta berkas lampirannya akan dihapus permanen.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-[#F3F6F4] text-[#111A16]"
              >
                Batal
              </button>
              <button
                disabled={saving}
                onClick={handleDeleteJournal}
                className="px-5 py-2 rounded-full text-xs font-bold bg-red-600 text-white hover:bg-red-700"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE LIGHTBOX */}
      {lightboxUrl && (
        <div 
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={lightboxUrl} alt="Preview" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

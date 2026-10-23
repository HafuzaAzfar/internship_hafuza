import React, { useState, useEffect, useRef } from 'react';
import { 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Calendar, 
  Clock,
  MapPin,
  ExternalLink, 
  X, 
  Upload, 
  Search,
  Eye,
  Filter,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileCheck,
  ShieldCheck,
  CalendarCheck,
  Layers,
  Paperclip,
  Camera,
  Edit3,
  RotateCcw
} from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  setDoc, 
  doc, 
  deleteDoc, 
  updateDoc,
  where,
  addDoc 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { DocumentationItem, DocumentationFile, ScheduleItem } from '../types';
import { uploadDocumentationFiles, deleteDocumentationFile } from '../firebase/storageHelper';

interface DocumentationViewProps {
  initialSelectedScheduleId?: string | null;
  onNavigateToSchedule?: (scheduleId: string) => void;
  onClearInitialScheduleId?: () => void;
}

export const DocumentationView: React.FC<DocumentationViewProps> = ({
  initialSelectedScheduleId,
  onNavigateToSchedule,
  onClearInitialScheduleId,
}) => {
  const { profile, effectiveRole } = useAuth();
  const { t } = useLanguage();

  const isStaff = effectiveRole === 'supervisor' || effectiveRole === 'admin' || effectiveRole === 'teacher';
  const isStudent = effectiveRole === 'student';

  // Active view tab: 'schedules' (Cards per Schedule) or 'gallery' (All Documentation items)
  const [activeTab, setActiveTab] = useState<'schedules' | 'gallery'>('schedules');

  // Realtime Data
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [documentations, setDocumentations] = useState<DocumentationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScheduleFilter, setSelectedScheduleFilter] = useState<string>('all');
  const [docPresenceFilter, setDocPresenceFilter] = useState<'all' | 'with_doc' | 'without_doc'>('all');

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedScheduleForUpload, setSelectedScheduleForUpload] = useState<ScheduleItem | null>(null);
  const [manualScheduleSearch, setManualScheduleSearch] = useState('');
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activityDate, setActivityDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ file: File; previewUrl: string; size: string }[]>([]);
  
  // Upload status and progress
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Detail & Lightbox Modal State
  const [detailModalDoc, setDetailModalDoc] = useState<DocumentationItem | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Edit Modal State
  const [editModalDoc, setEditModalDoc] = useState<DocumentationItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editActivityDate, setEditActivityDate] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // File input ref for camera/upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Listen to schedules
  useEffect(() => {
    const qSchedules = query(collection(db, 'schedules'), orderBy('date', 'desc'));
    const unsubSchedules = onSnapshot(qSchedules, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as ScheduleItem));
      setSchedules(items);
    }, (err) => console.warn('Schedules listener notice:', err));

    return () => unsubSchedules();
  }, []);

  // 2. Listen to documentation records
  useEffect(() => {
    const qDocs = isStaff 
      ? query(collection(db, 'documentation'), orderBy('uploadedAt', 'desc'))
      : query(collection(db, 'documentation'), where('studentId', '==', profile?.uid || 'none'));

    const unsubDocs = onSnapshot(qDocs, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as DocumentationItem));
      items.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      setDocumentations(items);
      setLoading(false);
    }, (err) => {
      console.warn('Documentation listener notice:', err);
      setLoading(false);
    });

    return () => unsubDocs();
  }, [isStaff, profile?.uid]);

  // 3. Handle initialSelectedScheduleId from props (e.g. navigation from ScheduleView)
  useEffect(() => {
    if (initialSelectedScheduleId && schedules.length > 0) {
      const targetSch = schedules.find(s => s.id === initialSelectedScheduleId);
      if (targetSch) {
        openUploadModalWithSchedule(targetSch);
        if (onClearInitialScheduleId) onClearInitialScheduleId();
      }
    }
  }, [initialSelectedScheduleId, schedules]);

  // Open Upload Modal with a preselected schedule
  const openUploadModalWithSchedule = (sch?: ScheduleItem) => {
    if (sch) {
      setSelectedScheduleForUpload(sch);
      setActivityDate(sch.date);
      setTitle(`Dokumentasi: ${sch.title}`);
    } else {
      setSelectedScheduleForUpload(null);
      setActivityDate(new Date().toISOString().split('T')[0]);
      setTitle('');
    }
    setDescription('');
    setSelectedFiles([]);
    setFilePreviews([]);
    setUploadStatus('idle');
    setUploadProgress(0);
    setUploadStatusText('');
    setErrorMessage('');
    setShowUploadModal(true);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Handle file selection (Multiple files)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check maximum 10 files
    if (selectedFiles.length + files.length > 10) {
      setErrorMessage('Maksimal 10 foto atau dokumen per satu dokumentasi kegiatan.');
      return;
    }

    const validNewFiles: File[] = [];
    const newPreviews: { file: File; previewUrl: string; size: string }[] = [];

    for (const file of files) {
      // Validate file size <= 10MB
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage(`File "${file.name}" melebihi batas maksimal 10MB.`);
        return;
      }

      // Validate allowed mime types: images (jpg, jpeg, png, webp) or documents (pdf, docx)
      const isAllowed = 
        file.type.startsWith('image/') || 
        file.type === 'application/pdf' || 
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      if (!isAllowed) {
        setErrorMessage(`Tipe file "${file.name}" tidak didukung. Gunakan gambar JPG/PNG/WEBP atau PDF.`);
        return;
      }

      validNewFiles.push(file);
      newPreviews.push({
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
        size: formatFileSize(file.size)
      });
    }

    setErrorMessage('');
    setSelectedFiles(prev => [...prev, ...validNewFiles]);
    setFilePreviews(prev => [...prev, ...newPreviews]);
  };

  // Remove a selected file from preview before submit
  const handleRemoveSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => {
      const removed = prev[index];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Upload and Save documentation to Firebase Cloud Storage and Cloud Firestore
  const handleSaveDocumentation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;

    if (!selectedScheduleForUpload) {
      setErrorMessage('Silakan pilih jadwal magang yang terkait.');
      return;
    }

    if (selectedScheduleForUpload.status === 'cancelled') {
      setErrorMessage('Jadwal ini telah dibatalkan dan tidak dapat didokumentasikan.');
      return;
    }

    if (!title.trim()) {
      setErrorMessage('Judul dokumentasi wajib diisi.');
      return;
    }

    if (selectedFiles.length === 0) {
      setErrorMessage('Pilih minimal satu foto dokumentasi untuk diunggah.');
      return;
    }

    setUploadStatus('uploading');
    setErrorMessage('');
    setUploadProgress(5);
    setUploadStatusText('Menyiapkan berkas dan menginisialisasi penyimpanan Cloud Storage...');

    try {
      const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      
      // Upload files to Firebase Cloud Storage
      const uploadedFileList: DocumentationFile[] = await uploadDocumentationFiles(
        selectedFiles,
        profile.uid,
        selectedScheduleForUpload.id,
        docId,
        (overall, current, total, text) => {
          setUploadProgress(overall);
          setUploadStatusText(text);
        }
      );

      const primaryFile = uploadedFileList[0];
      const nowStr = new Date().toISOString();

      // Save metadata to Cloud Firestore in collection `documentation`
      const newDocRecord: DocumentationItem = {
        id: docId,
        studentId: profile.uid,
        studentName: profile.displayName || 'Peserta Magang',
        studentEmail: profile.email || '',
        scheduleId: selectedScheduleForUpload.id,
        scheduleTitle: selectedScheduleForUpload.title,
        scheduleDate: selectedScheduleForUpload.date,
        title: title.trim(),
        description: description.trim(),
        activityDate: activityDate || selectedScheduleForUpload.date,
        fileUrl: primaryFile.fileUrl,
        fileName: primaryFile.fileName,
        fileSize: primaryFile.size,
        files: uploadedFileList,
        status: 'published',
        uploadedBy: profile.displayName || 'Peserta Magang',
        uploadedAt: nowStr,
        updatedAt: nowStr,
      };

      await setDoc(doc(db, 'documentation', docId), newDocRecord);

      // Notify supervisor
      try {
        await addDoc(collection(db, 'notifications'), {
          userId: profile.supervisorId || 'supervisor',
          title: `Dokumentasi Baru: ${selectedScheduleForUpload.title}`,
          message: `${profile.displayName} mengunggah ${uploadedFileList.length} dokumentasi untuk jadwal "${selectedScheduleForUpload.title}".`,
          type: 'info',
          read: false,
          createdAt: nowStr,
        });
      } catch (notifErr) {
        console.warn('Notification non-critical failure:', notifErr);
      }

      setUploadStatus('success');
      setUploadStatusText('Dokumentasi kegiatan berhasil diunggah dan disimpan!');

      setTimeout(() => {
        setShowUploadModal(false);
        setUploadStatus('idle');
      }, 1500);

    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadStatus('error');
      setErrorMessage(err.message || 'Gagal mengunggah dokumentasi ke Cloud Storage. Silakan coba kembali.');
    }
  };

  // Delete documentation
  const handleDeleteDoc = async (item: DocumentationItem) => {
    if (!confirm('Apakah Anda yakin ingin menghapus dokumentasi ini beserta seluruh fotonya?')) {
      return;
    }

    try {
      // Delete files from storage if paths exist
      if (item.files && item.files.length > 0) {
        for (const f of item.files) {
          if (f.storagePath) {
            await deleteDocumentationFile(f.storagePath);
          }
        }
      }

      // Delete Firestore document
      await deleteDoc(doc(db, 'documentation', item.id));

      if (detailModalDoc?.id === item.id) {
        setDetailModalDoc(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Gagal menghapus dokumentasi: ' + err);
    }
  };

  // Edit documentation info
  const handleOpenEditModal = (item: DocumentationItem) => {
    setEditModalDoc(item);
    setEditTitle(item.title);
    setEditDescription(item.description);
    setEditActivityDate(item.activityDate);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalDoc) return;

    setEditSaving(true);
    try {
      const nowStr = new Date().toISOString();
      await updateDoc(doc(db, 'documentation', editModalDoc.id), {
        title: editTitle.trim(),
        description: editDescription.trim(),
        activityDate: editActivityDate,
        updatedAt: nowStr,
      });

      if (detailModalDoc?.id === editModalDoc.id) {
        setDetailModalDoc(prev => prev ? {
          ...prev,
          title: editTitle.trim(),
          description: editDescription.trim(),
          activityDate: editActivityDate,
          updatedAt: nowStr,
        } : null);
      }

      setEditModalDoc(null);
    } catch (err) {
      console.error('Save edit error:', err);
      alert('Gagal menyimpan perubahan: ' + err);
    } finally {
      setEditSaving(false);
    }
  };

  // Map of documentations per scheduleId
  const docsByScheduleId: Record<string, DocumentationItem[]> = {};
  documentations.forEach(docItem => {
    if (docItem.scheduleId) {
      if (!docsByScheduleId[docItem.scheduleId]) {
        docsByScheduleId[docItem.scheduleId] = [];
      }
      docsByScheduleId[docItem.scheduleId].push(docItem);
    }
  });

  // Filtered schedules for Tab 1
  const filteredSchedules = schedules.filter(sch => {
    const matchesSearch = 
      sch.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sch.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sch.description.toLowerCase().includes(searchQuery.toLowerCase());

    const hasDocs = (docsByScheduleId[sch.id]?.length || 0) > 0;
    const matchesDocPresence = 
      docPresenceFilter === 'all' ? true :
      docPresenceFilter === 'with_doc' ? hasDocs :
      !hasDocs;

    return matchesSearch && matchesDocPresence;
  });

  // Filtered documentations for Tab 2 (Gallery)
  const filteredDocumentations = documentations.filter(d => {
    const matchesSearch = 
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.scheduleTitle && d.scheduleTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      d.studentName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSchedule = selectedScheduleFilter === 'all' || d.scheduleId === selectedScheduleFilter;

    return matchesSearch && matchesSchedule;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#111A16]">
            Dokumentasi Kegiatan
          </h2>
          <p className="text-xs text-[#718078] mt-0.5">
            Kelola dan unggah dokumentasi kegiatan magang berdasarkan jadwal yang telah ditentukan.
          </p>
        </div>

        {isStudent && (
          <button
            onClick={() => openUploadModalWithSchedule()}
            className="self-start sm:self-auto px-5 py-2.5 rounded-full text-xs font-bold bg-[#0B3325] text-white hover:bg-[#102F23] flex items-center gap-2 shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 text-[#B7F500]" />
            <span>+ Tambah Dokumentasi</span>
          </button>
        )}
      </div>

      {/* Navigation Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6ECE8] pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('schedules')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'schedules'
                ? 'bg-[#0B3325] text-[#B7F500] shadow-xs'
                : 'bg-white border border-[#E6ECE8] text-[#718078] hover:text-[#111A16] hover:bg-[#F3F6F4]'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Jadwal Kegiatan ({schedules.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'gallery'
                ? 'bg-[#0B3325] text-[#B7F500] shadow-xs'
                : 'bg-white border border-[#E6ECE8] text-[#718078] hover:text-[#111A16] hover:bg-[#F3F6F4]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Semua Foto & Galeri ({documentations.length})</span>
          </button>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#718078]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari jadwal atau dokumentasi..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white border border-[#E6ECE8] text-[#111A16] focus:outline-none"
            />
          </div>

          {activeTab === 'schedules' && (
            <select
              value={docPresenceFilter}
              onChange={(e: any) => setDocPresenceFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-[#E6ECE8] text-[#111A16] focus:outline-none"
            >
              <option value="all">Semua Jadwal</option>
              <option value="with_doc">Ada Dokumentasi</option>
              <option value="without_doc">Belum Ada Dokumentasi</option>
            </select>
          )}

          {activeTab === 'gallery' && (
            <select
              value={selectedScheduleFilter}
              onChange={(e) => setSelectedScheduleFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-[#E6ECE8] text-[#111A16] focus:outline-none max-w-[200px] truncate"
            >
              <option value="all">Semua Jadwal Terkait</option>
              {schedules.map(s => (
                <option key={s.id} value={s.id}>
                  {s.date} - {s.title}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tab 1: SCHEDULE CARDS (Tahap A) */}
      {activeTab === 'schedules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSchedules.length === 0 ? (
            <div className="col-span-full py-16 bg-white rounded-3xl border border-[#E6ECE8] text-center p-8">
              <CalendarCheck className="w-12 h-12 text-[#718078] mx-auto mb-3 opacity-40" />
              <h3 className="text-sm font-bold text-[#111A16]">
                Belum ada jadwal magang yang tersedia untuk didokumentasikan.
              </h3>
              <p className="text-xs text-[#718078] mt-1">
                Jadwal resmi dari pembimbing industri PT One Data Security akan muncul di sini.
              </p>
            </div>
          ) : (
            filteredSchedules.map((sch) => {
              const linkedDocs = docsByScheduleId[sch.id] || [];
              const docCount = linkedDocs.length;
              const latestDoc = linkedDocs[0];
              const isCancelled = sch.status === 'cancelled';
              const isFuture = new Date(sch.date) > new Date();

              return (
                <div
                  key={sch.id}
                  className="bg-white rounded-3xl p-5 border border-[#E6ECE8] shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Status & Date */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isCancelled ? 'bg-red-100 text-red-800' :
                        sch.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                        sch.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {isCancelled ? 'Dibatalkan' :
                         sch.status === 'completed' ? 'Selesai' :
                         sch.status === 'in_progress' ? 'Berlangsung' : 'Mendatang'}
                      </span>

                      <span className="text-[11px] font-semibold text-[#718078] flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {sch.date}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-sm font-bold text-[#111A16] line-clamp-1 mb-1">
                      {sch.title}
                    </h3>
                    <p className="text-xs text-[#718078] line-clamp-2 mb-3">
                      {sch.description}
                    </p>

                    <div className="space-y-1 text-[11px] text-[#718078] mb-4">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#0B3325] shrink-0" />
                        <span>{sch.startTime} - {sch.endTime} WIB</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#0B3325] shrink-0" />
                        <span className="truncate">{sch.location}</span>
                      </div>
                    </div>

                    {/* Documentation Summary Banner / Thumbnail */}
                    <div className="p-3 rounded-2xl bg-[#F3F6F4]/80 border border-[#E6ECE8] mb-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-[#718078] block">
                          Dokumentasi Terunggah
                        </span>
                        <p className="text-xs font-bold text-[#111A16] mt-0.5">
                          {docCount > 0 ? `${docCount} Dokumen (${linkedDocs.reduce((acc, d) => acc + (d.files?.length || 1), 0)} Foto)` : 'Belum Ada Dokumentasi'}
                        </p>
                      </div>

                      {latestDoc ? (
                        <img
                          src={latestDoc.fileUrl}
                          alt="Thumbnail"
                          className="w-11 h-11 rounded-xl object-cover border border-[#E6ECE8] shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-white border border-[#E6ECE8] flex items-center justify-center text-[#718078] shrink-0">
                          <ImageIcon className="w-5 h-5 opacity-40" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-[#E6ECE8] flex items-center justify-between gap-2">
                    {docCount > 0 ? (
                      <button
                        onClick={() => {
                          setSelectedScheduleFilter(sch.id);
                          setActiveTab('gallery');
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#0B3325] hover:bg-[#F3F6F4] flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#16A34A]" />
                        <span>Lihat Dokumentasi ({docCount})</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#718078] italic">
                        Perlu dokumentasi
                      </span>
                    )}

                    {isStudent && (
                      <button
                        disabled={isCancelled}
                        onClick={() => openUploadModalWithSchedule(sch)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                          isCancelled
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23] shadow-xs active:scale-95'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Unggah Dokumentasi</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: ALL DOCUMENTATION GALLERY (Tahap E) */}
      {activeTab === 'gallery' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredDocumentations.length === 0 ? (
            <div className="col-span-full py-16 bg-white rounded-3xl border border-[#E6ECE8] text-center p-8">
              <ImageIcon className="w-12 h-12 text-[#718078] mx-auto mb-3 opacity-40" />
              <h3 className="text-sm font-bold text-[#111A16]">
                Tidak ada dokumentasi kegiatan ditemukan.
              </h3>
              <p className="text-xs text-[#718078] mt-1">
                Pilih tab "Jadwal Kegiatan" untuk mengunggah foto kegiatan magang Anda.
              </p>
            </div>
          ) : (
            filteredDocumentations.map((item) => {
              const photoCount = item.files?.length || 1;
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl overflow-hidden border border-[#E6ECE8] shadow-2xs hover:shadow-xs transition-all flex flex-col group"
                >
                  {/* Photo Preview Container */}
                  <div
                    onClick={() => {
                      setDetailModalDoc(item);
                      setCurrentPhotoIndex(0);
                    }}
                    className="relative h-44 bg-[#061F16] overflow-hidden cursor-pointer"
                  >
                    <img
                      src={item.fileUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Photo count badge */}
                    {photoCount > 1 && (
                      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#061F16]/80 text-[#B7F500] backdrop-blur-xs border border-[#B7F500]/30 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        {photoCount} Foto
                      </span>
                    )}

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Eye className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Linked Schedule Badge */}
                      {item.scheduleTitle && (
                        <div className="mb-2">
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.scheduleId && onNavigateToSchedule) {
                                onNavigateToSchedule(item.scheduleId);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#0B3325] border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                          >
                            <CalendarCheck className="w-3 h-3 text-[#16A34A]" />
                            <span className="truncate max-w-[170px]">{item.scheduleTitle}</span>
                          </span>
                        </div>
                      )}

                      <span className="text-[10px] font-semibold text-[#718078] flex items-center gap-1 mb-1">
                        <Calendar className="w-3 h-3" />
                        {item.activityDate}
                      </span>
                      <h4 className="text-xs font-bold text-[#111A16] line-clamp-1 mb-1">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-[#718078] line-clamp-2">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-[#E6ECE8] flex items-center justify-between text-[10px] text-[#718078]">
                      <span className="truncate max-w-[120px]">Oleh: {item.studentName}</span>

                      <div className="flex items-center gap-1">
                        {(item.studentId === profile?.uid || isStaff) && (
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1 text-[#718078] hover:text-[#0B3325] hover:bg-[#F3F6F4] rounded-lg"
                            title="Ubah info"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {(item.studentId === profile?.uid || effectiveRole === 'admin') && (
                          <button
                            onClick={() => handleDeleteDoc(item)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* UPLOAD MODAL (Tahap B, C, D) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-7 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-[#E6ECE8] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#111A16]">
                  Unggah Dokumentasi Kegiatan Magang
                </h3>
                <p className="text-[11px] text-[#718078]">
                  Terkoneksi langsung ke Cloud Firestore & Firebase Cloud Storage PT One Data Security
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={uploadStatus === 'uploading'}
                className="p-1.5 rounded-full hover:bg-[#F3F6F4] text-[#718078]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveDocumentation} className="space-y-4 text-xs">
              {/* 1. Schedule Selection & Summary */}
              <div>
                <label className="block font-bold text-[#111A16] mb-1">
                  Pilih Jadwal Magang Terkait <span className="text-red-500">*</span>
                </label>

                {selectedScheduleForUpload ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#0B3325] uppercase mb-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                        <span>Jadwal Terpilih</span>
                      </div>
                      <p className="font-bold text-xs text-[#111A16] truncate">
                        {selectedScheduleForUpload.title}
                      </p>
                      <p className="text-[11px] text-[#718078] mt-0.5">
                        {selectedScheduleForUpload.date} • {selectedScheduleForUpload.startTime} - {selectedScheduleForUpload.endTime} WIB • {selectedScheduleForUpload.location}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedScheduleForUpload(null)}
                      className="px-2.5 py-1 rounded-xl text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 border border-emerald-300"
                    >
                      Ganti Jadwal
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      required
                      value=""
                      onChange={(e) => {
                        const sch = schedules.find(s => s.id === e.target.value);
                        if (sch) {
                          setSelectedScheduleForUpload(sch);
                          setActivityDate(sch.date);
                          if (!title) setTitle(`Dokumentasi: ${sch.title}`);
                        }
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4] text-[#111A16] focus:border-[#0B3325]"
                    >
                      <option value="">-- Pilih Jadwal Magang dari Sistem --</option>
                      {schedules.map(s => (
                        <option key={s.id} value={s.id} disabled={s.status === 'cancelled'}>
                          {s.date} — {s.title} {s.status === 'cancelled' ? '(Dibatalkan)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* 2. Judul Dokumentasi */}
              <div>
                <label className="block font-bold text-[#111A16] mb-1">
                  Judul Dokumentasi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Implementasi Log Monitoring SIEM & Pengujian Firewall"
                  className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4] focus:outline-none focus:border-[#0B3325]"
                />
              </div>

              {/* 3. Tanggal Kegiatan */}
              <div>
                <label className="block font-bold text-[#111A16] mb-1">
                  Tanggal Kegiatan <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={activityDate}
                  onChange={(e) => setActivityDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4] focus:outline-none focus:border-[#0B3325]"
                />
              </div>

              {/* 4. Deskripsi Kegiatan */}
              <div>
                <label className="block font-bold text-[#111A16] mb-1">
                  Deskripsi Kegiatan, Tugas & Hasil Capaian
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Rincian aktivitas yang dilakukan, hasil penugasan, dan kendala yang dihadapi saat jadwal berlangsung..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4] focus:outline-none focus:border-[#0B3325]"
                />
              </div>

              {/* 5. Upload Foto (Multiple File Support) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-[#111A16]">
                    Upload Foto Dokumentasi <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-[#718078]">
                    JPG, PNG, WEBP (Maks 10MB/file, Maks 10 Foto)
                  </span>
                </div>

                <div className="border-2 border-dashed border-[#E6ECE8] rounded-2xl p-4 text-center hover:border-emerald-400 transition-colors bg-[#F3F6F4]/50">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="doc-file-upload-input"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-white shadow-2xs flex items-center justify-center text-[#0B3325]">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-[#111A16]">
                      Pilih foto dari perangkat atau kamera HP
                    </p>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="doc-file-upload-input"
                        className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23] cursor-pointer shadow-xs"
                      >
                        Pilih File
                      </label>
                    </div>
                  </div>
                </div>

                {/* Pre-upload File Preview Grid */}
                {filePreviews.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <span className="text-[10px] font-bold text-[#718078] uppercase">
                      File Dipilih ({filePreviews.length}):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1">
                      {filePreviews.map((p, idx) => (
                        <div
                          key={idx}
                          className="relative p-2 rounded-xl bg-white border border-[#E6ECE8] shadow-2xs flex items-center gap-2"
                        >
                          {p.previewUrl ? (
                            <img
                              src={p.previewUrl}
                              alt="thumb"
                              className="w-10 h-10 rounded-lg object-cover border border-[#E6ECE8] shrink-0"
                            />
                          ) : (
                            <FileText className="w-10 h-10 text-emerald-800 shrink-0 p-1" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold text-[#111A16] truncate">
                              {p.file.name}
                            </p>
                            <p className="text-[9px] text-[#718078]">{p.size}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSelectedFile(idx)}
                            className="p-1 rounded-full text-red-500 hover:bg-red-50 shrink-0"
                            title="Hapus dari pilihan"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Progress & Upload State Bar */}
              {uploadStatus === 'uploading' && (
                <div className="p-3.5 rounded-2xl bg-[#061F16] text-white space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-emerald-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#B7F500] animate-pulse" />
                      {uploadStatusText}
                    </span>
                    <span className="text-[#B7F500] font-mono">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#102F23] overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#16A34A] to-[#B7F500] transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {uploadStatus === 'success' && (
                <div className="p-3 rounded-2xl bg-emerald-50 text-[#16A34A] border border-emerald-200 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{uploadStatusText}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E6ECE8]">
                <button
                  type="button"
                  disabled={uploadStatus === 'uploading'}
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-full font-semibold text-[#718078] hover:bg-[#F3F6F4]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={uploadStatus === 'uploading' || selectedFiles.length === 0 || !selectedScheduleForUpload}
                  className="px-6 py-2.5 rounded-full font-bold bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23] disabled:opacity-50 flex items-center gap-2 transition-all shadow-xs"
                >
                  <Upload className="w-4 h-4" />
                  <span>{uploadStatus === 'uploading' ? 'Mengunggah...' : 'Upload dan Simpan Dokumentasi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL & LIGHTBOX MODAL (Tahap E) */}
      {detailModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative max-w-4xl w-full bg-[#FFFFFF] rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E6ECE8] flex items-center justify-between bg-white z-10">
              <div className="min-w-0 pr-4">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {detailModalDoc.scheduleTitle && (
                    <button
                      onClick={() => {
                        if (detailModalDoc.scheduleId && onNavigateToSchedule) {
                          onNavigateToSchedule(detailModalDoc.scheduleId);
                        }
                      }}
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#0B3325] hover:bg-emerald-200 flex items-center gap-1 transition-colors"
                      title="Buka Jadwal Magang Terkait"
                    >
                      <CalendarCheck className="w-3 h-3 text-[#16A34A]" />
                      <span>Jadwal: {detailModalDoc.scheduleTitle}</span>
                      <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                    </button>
                  )}
                  <span className="text-[11px] font-semibold text-[#718078]">
                    {detailModalDoc.activityDate}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#111A16] truncate">
                  {detailModalDoc.title}
                </h3>
                <p className="text-[11px] text-[#718078]">
                  Diunggah oleh: <strong className="text-[#111A16]">{detailModalDoc.studentName}</strong> • {new Date(detailModalDoc.uploadedAt).toLocaleString('id-ID')} WIB
                </p>
              </div>

              <button
                onClick={() => setDetailModalDoc(null)}
                className="p-2 rounded-full hover:bg-[#F3F6F4] text-[#718078] hover:text-[#111A16]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo Gallery Viewer */}
            {(() => {
              const fileList = detailModalDoc.files && detailModalDoc.files.length > 0 
                ? detailModalDoc.files 
                : [{ fileId: '1', fileName: detailModalDoc.fileName, fileUrl: detailModalDoc.fileUrl, storagePath: '', mimeType: 'image/jpeg', size: detailModalDoc.fileSize || 0, uploadedAt: detailModalDoc.uploadedAt }];
              
              const currentFile = fileList[currentPhotoIndex] || fileList[0];

              return (
                <div className="flex-1 overflow-y-auto">
                  {/* Large viewer */}
                  <div className="relative bg-[#061F16] min-h-[300px] max-h-[50vh] flex items-center justify-center p-4">
                    {currentFile.mimeType.startsWith('image/') || currentFile.fileUrl.startsWith('data:image') || currentFile.fileUrl.includes('.jpg') || currentFile.fileUrl.includes('.png') ? (
                      <img
                        src={currentFile.fileUrl}
                        alt={currentFile.fileName}
                        className="max-h-[46vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
                      />
                    ) : (
                      <div className="text-center text-white p-8">
                        <FileText className="w-16 h-16 text-[#B7F500] mx-auto mb-2" />
                        <p className="text-sm font-bold">{currentFile.fileName}</p>
                        <a
                          href={currentFile.fileUrl}
                          download={currentFile.fileName}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-block px-4 py-1.5 rounded-full text-xs font-bold bg-[#B7F500] text-[#061F16]"
                        >
                          Unduh Dokumen
                        </a>
                      </div>
                    )}

                    {/* Nav Prev / Next buttons */}
                    {fileList.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentPhotoIndex(prev => (prev > 0 ? prev - 1 : fileList.length - 1))}
                          className="absolute left-3 p-2 rounded-full bg-black/60 text-white hover:bg-[#0B3325] hover:text-[#B7F500] transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setCurrentPhotoIndex(prev => (prev < fileList.length - 1 ? prev + 1 : 0))}
                          className="absolute right-3 p-2 rounded-full bg-black/60 text-white hover:bg-[#0B3325] hover:text-[#B7F500] transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>

                        <div className="absolute bottom-3 px-3 py-1 rounded-full bg-black/70 text-[10px] font-bold text-white">
                          Foto {currentPhotoIndex + 1} dari {fileList.length}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Thumbnails Strip */}
                  {fileList.length > 1 && (
                    <div className="p-3 bg-[#F3F6F4] border-b border-[#E6ECE8] flex items-center gap-2 overflow-x-auto">
                      {fileList.map((f, i) => (
                        <button
                          key={f.fileId || i}
                          onClick={() => setCurrentPhotoIndex(i)}
                          className={`relative rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                            currentPhotoIndex === i ? 'border-[#0B3325] ring-2 ring-[#B7F500]' : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={f.fileUrl}
                            alt={f.fileName}
                            className="w-12 h-12 object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Description & File Metadata Info */}
                  <div className="p-6 space-y-4 text-xs">
                    <div>
                      <h4 className="font-bold text-[#111A16] uppercase text-[10px] tracking-wider mb-1">
                        Deskripsi Kegiatan & Capaian
                      </h4>
                      <p className="text-[#718078] leading-relaxed whitespace-pre-wrap bg-[#F3F6F4] p-3.5 rounded-2xl">
                        {detailModalDoc.description || 'Tidak ada deskripsi tambahan.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-[#718078]">
                      <div className="p-3 rounded-xl border border-[#E6ECE8] bg-white">
                        <span className="font-bold text-[#111A16] block">Nama File Aktif:</span>
                        <p className="truncate mt-0.5">{currentFile.fileName}</p>
                      </div>
                      <div className="p-3 rounded-xl border border-[#E6ECE8] bg-white">
                        <span className="font-bold text-[#111A16] block">Ukuran File:</span>
                        <p className="mt-0.5">{formatFileSize(currentFile.size)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Modal Footer Actions */}
            <div className="p-4 bg-[#F3F6F4] border-t border-[#E6ECE8] flex items-center justify-between">
              <div>
                {detailModalDoc.scheduleId && onNavigateToSchedule && (
                  <button
                    onClick={() => {
                      onNavigateToSchedule(detailModalDoc.scheduleId!);
                      setDetailModalDoc(null);
                    }}
                    className="px-3.5 py-1.5 rounded-full text-xs font-bold text-[#0B3325] bg-white border border-[#E6ECE8] hover:bg-emerald-50 flex items-center gap-1.5"
                  >
                    <CalendarCheck className="w-3.5 h-3.5 text-[#16A34A]" />
                    <span>Lihat Jadwal Asli</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {(detailModalDoc.studentId === profile?.uid || isStaff) && (
                  <button
                    onClick={() => {
                      handleOpenEditModal(detailModalDoc);
                      setDetailModalDoc(null);
                    }}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#111A16] bg-white border border-[#E6ECE8] hover:bg-gray-100 flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Ubah Info</span>
                  </button>
                )}

                {(detailModalDoc.studentId === profile?.uid || effectiveRole === 'admin') && (
                  <button
                    onClick={() => handleDeleteDoc(detailModalDoc)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                )}

                <button
                  onClick={() => setDetailModalDoc(null)}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[#0B3325] text-white hover:bg-[#102F23]"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6ECE8] pb-3">
              <h3 className="text-base font-bold text-[#111A16]">
                Ubah Informasi Dokumentasi
              </h3>
              <button
                onClick={() => setEditModalDoc(null)}
                className="p-1.5 rounded-full hover:bg-[#F3F6F4] text-[#718078]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#111A16] mb-1">
                  Judul Dokumentasi
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#111A16] mb-1">
                  Tanggal Kegiatan
                </label>
                <input
                  type="date"
                  required
                  value={editActivityDate}
                  onChange={(e) => setEditActivityDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#111A16] mb-1">
                  Deskripsi Kegiatan
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6ECE8]">
                <button
                  type="button"
                  onClick={() => setEditModalDoc(null)}
                  className="px-4 py-2 rounded-full font-semibold text-[#718078]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2 rounded-full font-bold bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23]"
                >
                  {editSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

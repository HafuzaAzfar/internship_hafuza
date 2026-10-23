import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  MapPin, 
  Users, 
  Search, 
  Filter, 
  X, 
  CheckCircle2, 
  CalendarCheck, 
  Image as ImageIcon, 
  Upload, 
  Eye, 
  ExternalLink, 
  ChevronRight, 
  ShieldCheck,
  BookOpen,
  FileText,
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
  where 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ScheduleItem, DocumentationItem, JournalItem } from '../types';

interface ScheduleViewProps {
  onNavigateToDocumentationWithSchedule?: (scheduleId: string) => void;
  onNavigateToDocumentationGallery?: (scheduleId?: string) => void;
  onNavigateToJournalWithSchedule?: (scheduleId: string) => void;
  highlightScheduleId?: string | null;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  onNavigateToDocumentationWithSchedule,
  onNavigateToDocumentationGallery,
  onNavigateToJournalWithSchedule,
  highlightScheduleId,
}) => {
  const { profile, effectiveRole } = useAuth();
  const { t } = useLanguage();

  const isStaff = effectiveRole === 'supervisor' || effectiveRole === 'admin' || effectiveRole === 'teacher';
  const isStudent = effectiveRole === 'student';

  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [documentations, setDocumentations] = useState<DocumentationItem[]>([]);
  const [journals, setJournals] = useState<JournalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScheduleDetail, setSelectedScheduleDetail] = useState<ScheduleItem | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('11:00');
  const [formLocation, setFormLocation] = useState('Cyber Security Lab PT One Data Security');
  const [formDescription, setFormDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // 1. Fetch schedules
  useEffect(() => {
    const q = query(collection(db, 'schedules'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ScheduleItem));
      setSchedules(items);
      setLoading(false);
    }, (err) => {
      console.warn('Schedules snapshot:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // 2. Fetch documentations to display counts and thumbnails on schedules
  useEffect(() => {
    const qDocs = isStaff
      ? query(collection(db, 'documentation'), orderBy('uploadedAt', 'desc'))
      : query(collection(db, 'documentation'), where('studentId', '==', profile?.uid || 'none'));

    const unsubDocs = onSnapshot(qDocs, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DocumentationItem));
      setDocumentations(items);
    }, (err) => {
      console.warn('Doc snapshot in ScheduleView:', err);
    });

    return () => unsubDocs();
  }, [isStaff, profile?.uid]);

  // 3. Fetch journals to display counts and statuses on schedules
  useEffect(() => {
    const qJournals = isStaff
      ? query(collection(db, 'journals'), orderBy('date', 'desc'))
      : query(collection(db, 'journals'), where('studentId', '==', profile?.uid || 'none'));

    const unsubJournals = onSnapshot(qJournals, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as JournalItem));
      setJournals(items);
    }, (err) => {
      console.warn('Journals snapshot in ScheduleView:', err);
    });

    return () => unsubJournals();
  }, [isStaff, profile?.uid]);

  // 4. Highlight schedule if provided from navigation
  useEffect(() => {
    if (highlightScheduleId && schedules.length > 0) {
      const target = schedules.find(s => s.id === highlightScheduleId);
      if (target) {
        setSelectedScheduleDetail(target);
      }
    }
  }, [highlightScheduleId, schedules]);

  // Group documentation by scheduleId
  const docsByScheduleId: Record<string, DocumentationItem[]> = {};
  documentations.forEach(d => {
    if (d.scheduleId) {
      if (!docsByScheduleId[d.scheduleId]) docsByScheduleId[d.scheduleId] = [];
      docsByScheduleId[d.scheduleId].push(d);
    }
  });

  // Group journals by scheduleId
  const journalsByScheduleId: Record<string, JournalItem[]> = {};
  journals.forEach(j => {
    if (j.scheduleId) {
      if (!journalsByScheduleId[j.scheduleId]) journalsByScheduleId[j.scheduleId] = [];
      journalsByScheduleId[j.scheduleId].push(j);
    }
  });


  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    setSaving(true);
    try {
      const schId = `sch-${Date.now()}`;
      const newSchedule: ScheduleItem = {
        id: schId,
        title: formTitle.trim(),
        date: formDate,
        startTime: formStartTime,
        endTime: formEndTime,
        location: formLocation.trim(),
        description: formDescription.trim(),
        createdBy: profile?.uid || 'staff',
        creatorName: profile?.displayName || 'Pembimbing Industri',
        status: 'upcoming',
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'schedules', schId), newSchedule);
      setShowModal(false);
      setFormTitle('');
      setFormDescription('');
    } catch (err) {
      console.error('Failed to save schedule:', err);
    } finally {
      setSaving(false);
    }
  };

  const filtered = schedules.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#111A16]">
            {t.nav.schedule}
          </h2>
          <p className="text-xs text-[#718078] mt-0.5">
            Agenda kerja, sesi bimbingan teknis, dan evaluasi berkala magang di PT One Data Security
          </p>
        </div>

        {isStaff && (
          <button
            onClick={() => setShowModal(true)}
            className="self-start sm:self-auto px-4 py-2 rounded-full text-xs font-bold bg-[#0B3325] text-white hover:bg-[#102F23] flex items-center gap-2 shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 text-[#B7F500]" />
            <span>Tambah Agenda Baru</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-2xl border border-[#E6ECE8] shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#718078]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari agenda atau lokasi..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#F3F6F4] border border-[#E6ECE8] focus:outline-none"
          />
        </div>
      </div>

      {/* Schedule list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-full py-16 bg-white rounded-3xl border border-[#E6ECE8] text-center p-6">
            <CalendarCheck className="w-12 h-12 text-[#718078] mx-auto mb-3 opacity-40" />
            <p className="text-xs text-[#718078]">{t.dashboard.noSchedules}</p>
          </div>
        ) : (
          filtered.map((sch) => {
            const linkedDocs = docsByScheduleId[sch.id] || [];
            const linkedJournals = journalsByScheduleId[sch.id] || [];
            const isHighlighted = highlightScheduleId === sch.id;

            return (
              <div
                key={sch.id}
                className={`bg-white rounded-3xl p-5 border shadow-2xs flex flex-col justify-between transition-all cursor-pointer ${
                  isHighlighted 
                    ? 'border-[#0B3325] ring-2 ring-[#B7F500] shadow-md' 
                    : 'border-[#E6ECE8] hover:border-emerald-300'
                }`}
                onClick={() => setSelectedScheduleDetail(sch)}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-[#16A34A] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {sch.startTime} - {sch.endTime} WIB
                    </span>
                    <span className="text-[11px] font-semibold text-[#718078]">
                      {sch.date}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#111A16] mb-1.5">
                    {sch.title}
                  </h3>
                  <p className="text-xs text-[#718078] line-clamp-2 mb-3">
                    {sch.description}
                  </p>

                  <div className="space-y-1 text-[11px] text-[#718078] mb-3">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#0B3325] shrink-0" />
                      <span className="truncate">{sch.location}</span>
                    </div>
                  </div>

                  {/* Documentation Badge & Thumbnails Section */}
                  <div className="p-2.5 rounded-2xl bg-[#F3F6F4]/80 border border-[#E6ECE8] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-white border border-[#E6ECE8] flex items-center justify-center text-[#0B3325]">
                        <ImageIcon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-[#111A16] block">
                          {linkedDocs.length > 0 ? `${linkedDocs.length} Dokumentasi` : 'Belum Ada Dokumentasi'}
                        </span>
                        <span className="text-[9px] text-[#718078]">Foto & Berkas Kegiatan</span>
                      </div>
                    </div>

                    {/* Small Thumbnails strip */}
                    {linkedDocs.length > 0 && (
                      <div className="flex items-center -space-x-2">
                        {linkedDocs.slice(0, 3).map((d, idx) => (
                          <img
                            key={d.id || idx}
                            src={d.fileUrl}
                            alt="Doc thumb"
                            className="w-6 h-6 rounded-full object-cover border-2 border-white shadow-2xs"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Jurnal Harian Integration Badge */}
                  <div className="p-2.5 rounded-2xl bg-[#F3F6F4]/80 border border-[#E6ECE8] flex items-center justify-between gap-2 mt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-white border border-[#E6ECE8] flex items-center justify-center text-[#0B3325]">
                        <BookOpen className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-[#111A16] block">
                          {linkedJournals.length > 0 
                            ? `${linkedJournals.length} Jurnal Harian` 
                            : 'Belum Ada Jurnal'}
                        </span>
                        <span className="text-[9px] text-[#718078]">Refleksi & Log Kegiatan</span>
                      </div>
                    </div>

                    {linkedJournals.length > 0 ? (
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        linkedJournals[0].status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        linkedJournals[0].status === 'revision_requested' ? 'bg-red-100 text-red-800' :
                        linkedJournals[0].status === 'submitted' ? 'bg-amber-100 text-amber-800' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {linkedJournals[0].status === 'approved' ? 'Disetujui' :
                         linkedJournals[0].status === 'revision_requested' ? 'Revisi' :
                         linkedJournals[0].status === 'submitted' ? 'Review' : 'Draf'}
                      </span>
                    ) : (
                      isStudent && sch.status !== 'cancelled' && (
                        <span className="text-[10px] text-[#16A34A] font-bold">Siap Ditulis</span>
                      )
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-[#E6ECE8] flex items-center justify-between text-xs mt-3">
                  <span className="text-[11px] font-semibold text-[#0B3325] hover:underline flex items-center gap-1">
                    <span>Detail Agenda</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>

                  {isStudent && sch.status !== 'cancelled' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onNavigateToJournalWithSchedule) {
                            onNavigateToJournalWithSchedule(sch.id);
                          }
                        }}
                        className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-white text-[#0B3325] border border-[#E6ECE8] hover:bg-emerald-50 flex items-center gap-1 transition-all"
                        title="Tulis Jurnal untuk jadwal ini"
                      >
                        <BookOpen className="w-3 h-3 text-[#16A34A]" />
                        <span>+ Jurnal</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onNavigateToDocumentationWithSchedule) {
                            onNavigateToDocumentationWithSchedule(sch.id);
                          }
                        }}
                        className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23] flex items-center gap-1 transition-all"
                        title="Unggah dokumentasi foto"
                      >
                        <Upload className="w-3 h-3" />
                        <span>+ Foto</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* SCHEDULE DETAIL MODAL WITH DOCUMENTASI KEGIATAN SECTION (Section 4) */}
      {selectedScheduleDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#E6ECE8] pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-[#16A34A] border border-emerald-200">
                  {selectedScheduleDetail.date} • {selectedScheduleDetail.startTime} - {selectedScheduleDetail.endTime} WIB
                </span>
                <h3 className="text-lg font-bold text-[#111A16] mt-1">
                  {selectedScheduleDetail.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedScheduleDetail(null)}
                className="p-1.5 rounded-full hover:bg-[#F3F6F4] text-[#718078]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Schedule Details */}
            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-[#111A16] block mb-0.5">Deskripsi Kegiatan</span>
                <p className="text-[#718078] bg-[#F3F6F4] p-3 rounded-2xl whitespace-pre-wrap">
                  {selectedScheduleDetail.description || 'Tidak ada deskripsi rinci.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] text-[#718078]">
                <div className="p-3 rounded-xl border border-[#E6ECE8] bg-white">
                  <span className="font-bold text-[#111A16] block">Lokasi:</span>
                  <p className="truncate mt-0.5">{selectedScheduleDetail.location}</p>
                </div>
                <div className="p-3 rounded-xl border border-[#E6ECE8] bg-white">
                  <span className="font-bold text-[#111A16] block">Dibuat Oleh:</span>
                  <p className="truncate mt-0.5">{selectedScheduleDetail.creatorName || 'Pembimbing'}</p>
                </div>
              </div>
            </div>

            {/* INTEGRATED DOKUMENTASI KEGIATAN SECTION (Section 4) */}
            <div className="pt-4 border-t border-[#E6ECE8] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#111A16] flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#16A34A]" />
                    <span>Dokumentasi Kegiatan ({docsByScheduleId[selectedScheduleDetail.id]?.length || 0})</span>
                  </h4>
                  <p className="text-[10px] text-[#718078]">
                    Foto dan bukti pelaksanaan agenda magang ini
                  </p>
                </div>

                {/* For student: Button to add documentation with this schedule automatically selected */}
                {isStudent && selectedScheduleDetail.status !== 'cancelled' && (
                  <button
                    onClick={() => {
                      const schId = selectedScheduleDetail.id;
                      setSelectedScheduleDetail(null);
                      if (onNavigateToDocumentationWithSchedule) {
                        onNavigateToDocumentationWithSchedule(schId);
                      }
                    }}
                    className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23] flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tambah Dokumentasi</span>
                  </button>
                )}
              </div>

              {/* Documentation items list for this schedule */}
              {(() => {
                const linked = docsByScheduleId[selectedScheduleDetail.id] || [];
                if (linked.length === 0) {
                  return (
                    <div className="p-6 rounded-2xl border-2 border-dashed border-[#E6ECE8] text-center text-xs text-[#718078]">
                      <p>Belum ada dokumentasi yang diunggah untuk jadwal ini.</p>
                      {isStudent && (
                        <p className="mt-1 text-[11px] text-[#16A34A] font-semibold">
                          Klik tombol "+ Tambah Dokumentasi" di atas untuk mengunggah foto kegiatan Anda.
                        </p>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {linked.map((d) => (
                      <div
                        key={d.id}
                        className="p-3 rounded-2xl bg-[#F3F6F4] border border-[#E6ECE8] flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={d.fileUrl}
                            alt={d.title}
                            className="w-12 h-12 rounded-xl object-cover border border-[#E6ECE8] shrink-0"
                          />
                          <div className="min-w-0">
                            <h5 className="font-bold text-[#111A16] truncate">{d.title}</h5>
                            <p className="text-[10px] text-[#718078] truncate">{d.description || 'Tanpa keterangan'}</p>
                            <p className="text-[9px] text-[#718078]/80 mt-0.5">
                              Oleh {d.studentName} • {d.files?.length || 1} Foto
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const schId = selectedScheduleDetail.id;
                            setSelectedScheduleDetail(null);
                            if (onNavigateToDocumentationGallery) {
                              onNavigateToDocumentationGallery(schId);
                            }
                          }}
                          className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-white text-[#0B3325] hover:bg-emerald-50 border border-[#E6ECE8] shrink-0"
                        >
                          Lihat
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* INTEGRATED JURNAL HARIAN SECTION */}
            <div className="pt-4 border-t border-[#E6ECE8] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#111A16] flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[#0B3325]" />
                    <span>Jurnal Harian ({journalsByScheduleId[selectedScheduleDetail.id]?.length || 0})</span>
                  </h4>
                  <p className="text-[10px] text-[#718078]">
                    Log aktivitas harian, pencapaian, dan refleksi magang untuk jadwal ini
                  </p>
                </div>

                {isStudent && selectedScheduleDetail.status !== 'cancelled' && (
                  <button
                    onClick={() => {
                      const schId = selectedScheduleDetail.id;
                      setSelectedScheduleDetail(null);
                      if (onNavigateToJournalWithSchedule) {
                        onNavigateToJournalWithSchedule(schId);
                      }
                    }}
                    className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23] flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tulis Jurnal</span>
                  </button>
                )}
              </div>

              {(() => {
                const linkedJrn = journalsByScheduleId[selectedScheduleDetail.id] || [];
                if (linkedJrn.length === 0) {
                  return (
                    <div className="p-5 rounded-2xl border-2 border-dashed border-[#E6ECE8] text-center text-xs text-[#718078]">
                      <p>Belum ada jurnal harian yang dibuat untuk jadwal ini.</p>
                      {isStudent && (
                        <p className="mt-1 text-[11px] text-[#16A34A] font-semibold">
                          Klik tombol "+ Tulis Jurnal" di atas untuk mencatat aktivitas Anda.
                        </p>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {linkedJrn.map((j) => (
                      <div
                        key={j.id}
                        className="p-3 rounded-2xl bg-[#F3F6F4] border border-[#E6ECE8] flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              j.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                              j.status === 'revision_requested' ? 'bg-red-100 text-red-800' :
                              j.status === 'submitted' ? 'bg-amber-100 text-amber-800' :
                              'bg-gray-200 text-gray-700'
                            }`}>
                              {j.status === 'approved' ? 'Disetujui' :
                               j.status === 'revision_requested' ? 'Perlu Revisi' :
                               j.status === 'submitted' ? 'Menunggu Review' : 'Draf'}
                            </span>
                            <span className="text-[10px] text-[#718078]">{j.date}</span>
                          </div>
                          <h5 className="font-bold text-[#111A16] truncate">{j.title}</h5>
                          <p className="text-[10px] text-[#718078] truncate">{j.description}</p>
                          <p className="text-[9px] text-[#718078]/80 mt-0.5">
                            Oleh {j.studentName} {j.attachments?.length ? `• ${j.attachments.length} Lampiran` : ''}
                          </p>
                        </div>

                        {onNavigateToJournalWithSchedule && (
                          <button
                            onClick={() => {
                              const schId = selectedScheduleDetail.id;
                              setSelectedScheduleDetail(null);
                              onNavigateToJournalWithSchedule(schId);
                            }}
                            className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-white text-[#0B3325] hover:bg-emerald-50 border border-[#E6ECE8] shrink-0"
                          >
                            Buka
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-[#E6ECE8]">
              <button
                type="button"
                onClick={() => setSelectedScheduleDetail(null)}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-[#F3F6F4] text-[#111A16] hover:bg-[#E6ECE8]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Schedule (Staff) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6ECE8] pb-3">
              <h3 className="text-base font-bold text-[#111A16]">
                Tambah Jadwal Agenda Magang
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-full hover:bg-[#F3F6F4] text-[#718078]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#111A16] mb-1">Judul Agenda</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: Bimbingan Proyek SOC Monitoring"
                  className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-[#111A16] mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#111A16] mb-1">Mulai</label>
                  <input
                    type="time"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#111A16] mb-1">Selesai</label>
                  <input
                    type="time"
                    required
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#111A16] mb-1">Lokasi / Ruangan / Link</label>
                <input
                  type="text"
                  required
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="Cyber Security Lab / Google Meet"
                  className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#111A16] mb-1">Deskripsi Agenda</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Instruksi, materi yang dibahas, atau persiapan siswa..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6ECE8]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-full font-semibold text-[#718078]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-full font-bold bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23]"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

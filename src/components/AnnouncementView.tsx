import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Plus, 
  Calendar, 
  AlertCircle, 
  Bell, 
  ShieldCheck, 
  X,
  Filter,
  CheckCheck
} from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  setDoc, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AnnouncementItem } from '../types';

export const AnnouncementView: React.FC = () => {
  const { profile, effectiveRole } = useAuth();
  const { t } = useLanguage();

  const isStaff = effectiveRole === 'supervisor' || effectiveRole === 'admin' || effectiveRole === 'teacher';

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [targetAudience, setTargetAudience] = useState<'all' | 'student' | 'supervisor' | 'teacher'>('all');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('publishedAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AnnouncementItem));
      setAnnouncements(items);
      setLoading(false);
    }, (err) => {
      console.warn('Announcements snapshot notice:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSaving(true);
    try {
      const annId = `ann-${Date.now()}`;
      const newAnn: AnnouncementItem = {
        id: annId,
        title: title.trim(),
        content: content.trim(),
        priority,
        targetAudience,
        authorName: profile?.displayName || 'Administrator PT One Data Security',
        authorId: profile?.uid || 'admin',
        publishedAt: new Date().toISOString(),
        readBy: [],
      };

      await setDoc(doc(db, 'announcements', annId), newAnn);

      setShowModal(false);
      setTitle('');
      setContent('');
    } catch (err) {
      console.error('Failed to create announcement:', err);
    } finally {
      setSaving(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'normal':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#111A16]">
            {t.announcements.title}
          </h2>
          <p className="text-xs text-[#718078] mt-0.5">
            {t.announcements.subtitle}
          </p>
        </div>

        {isStaff && (
          <button
            onClick={() => setShowModal(true)}
            className="self-start sm:self-auto px-4 py-2 rounded-full text-xs font-bold bg-[#0B3325] text-white hover:bg-[#102F23] flex items-center gap-2 shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 text-[#B7F500]" />
            <span>{t.announcements.createButton}</span>
          </button>
        )}
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="py-16 bg-white rounded-3xl border border-[#E6ECE8] text-center p-6">
            <Megaphone className="w-12 h-12 text-[#718078] mx-auto mb-3 opacity-40" />
            <p className="text-xs text-[#718078]">{t.dashboard.noAnnouncements}</p>
          </div>
        ) : (
          announcements.map((ann) => (
            <div
              key={ann.id}
              className="bg-white rounded-3xl p-6 border border-[#E6ECE8] shadow-2xs hover:border-emerald-300 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getPriorityBadge(ann.priority)}`}>
                    {ann.priority}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F3F6F4] text-[#718078] uppercase">
                    Untuk: {ann.targetAudience}
                  </span>
                </div>
                <span className="text-[11px] text-[#718078] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(ann.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>

              <h3 className="text-base font-bold text-[#111A16]">
                {ann.title}
              </h3>

              <p className="text-xs text-[#718078] whitespace-pre-wrap leading-relaxed">
                {ann.content}
              </p>

              <div className="pt-3 border-t border-[#E6ECE8] flex items-center justify-between text-[11px] text-[#718078]">
                <span>Diterbitkan oleh: <strong className="text-[#111A16]">{ann.authorName}</strong></span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  PT One Data Security
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6ECE8] pb-3">
              <h3 className="text-base font-bold text-[#111A16]">
                {t.announcements.createButton}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-full hover:bg-[#F3F6F4] text-[#718078]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#111A16] mb-1">
                  {t.announcements.announcementTitle}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Jadwal Libur Nasional & Pengisian Presensi"
                  className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#111A16] mb-1">
                    {t.announcements.priority}
                  </label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                  >
                    <option value="normal">{t.announcements.normal}</option>
                    <option value="high">{t.announcements.high}</option>
                    <option value="urgent">{t.announcements.urgent}</option>
                    <option value="low">{t.announcements.low}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#111A16] mb-1">
                    {t.announcements.target}
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e: any) => setTargetAudience(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                  >
                    <option value="all">Semua Peran</option>
                    <option value="student">Siswa Magang</option>
                    <option value="supervisor">Pembimbing Industri</option>
                    <option value="teacher">Guru Pembimbing</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#111A16] mb-1">
                  {t.announcements.content}
                </label>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Isi informasi pengumuman resmi..."
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
                  {t.announcements.publish}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

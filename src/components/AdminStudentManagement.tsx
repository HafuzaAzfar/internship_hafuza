import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  UserCheck, 
  Filter, 
  Search, 
  Calendar,
  AlertTriangle,
  Edit,
  Save,
  X
} from 'lucide-react';
import { collection, query, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { UserProfile, UserRole, UserStatus } from '../types';

export const AdminStudentManagement: React.FC = () => {
  const { profile, effectiveRole } = useAuth();
  const { t } = useLanguage();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Assign modal
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [supervisorName, setSupervisorName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const items = snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      setUsers(items);
      setLoading(false);
    }, (err) => {
      console.warn('Users snapshot note:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleUpdateStatus = async (uid: string, newStatus: UserStatus) => {
    try {
      await updateDoc(doc(db, 'users', uid), { status: newStatus });
    } catch (err) {
      console.error('Update status failed:', err);
    }
  };

  const handleUpdateRole = async (uid: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
    } catch (err) {
      console.error('Update role failed:', err);
    }
  };

  const openAssignModal = (u: UserProfile) => {
    setSelectedUser(u);
    setSupervisorName(u.supervisorName || 'Budi Santoso, S.Kom (PT One Data Security)');
    setTeacherName(u.teacherName || 'Dra. Nurhayati, M.Pd');
    setStartDate(u.internshipStartDate || '2026-08-01');
    setEndDate(u.internshipEndDate || '2026-12-31');
  };

  const handleSaveAssignments = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', selectedUser.uid), {
        supervisorName,
        teacherName,
        internshipStartDate: startDate,
        internshipEndDate: endDate,
      });
      setSelectedUser(null);
    } catch (err) {
      console.error('Save assignments error:', err);
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (u.schoolOrUniv && u.schoolOrUniv.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#111A16]">
          {t.admin.title}
        </h2>
        <p className="text-xs text-[#718078] mt-0.5">
          {t.admin.subtitle}
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E6ECE8] shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#718078]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, email, sekolah..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#F3F6F4] border border-[#E6ECE8] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-xl bg-[#F3F6F4] border border-[#E6ECE8] text-[#111A16] focus:outline-none"
          >
            <option value="all">Semua Peran</option>
            <option value="student">Siswa</option>
            <option value="supervisor">Pembimbing</option>
            <option value="teacher">Guru</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-xl bg-[#F3F6F4] border border-[#E6ECE8] text-[#111A16] focus:outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="pending">Menunggu</option>
            <option value="rejected">Ditolak</option>
            <option value="suspended">Ditangguhkan</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl p-6 border border-[#E6ECE8] shadow-2xs overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#E6ECE8] text-[#718078] uppercase text-[10px] font-bold">
              <th className="py-3 px-3">Pengguna</th>
              <th className="py-3 px-3">Asal Sekolah / Univ</th>
              <th className="py-3 px-3">Peran</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Pembimbing & Guru</th>
              <th className="py-3 px-3 text-right">Aksi Manajemen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6ECE8]/60">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#718078]">
                  Tidak ada data pengguna yang cocok.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.uid} className="hover:bg-[#F3F6F4]/50 transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-bold text-[#111A16] block">{u.displayName}</span>
                    <span className="text-[10px] text-[#718078]">{u.email}</span>
                  </td>
                  <td className="py-3 px-3 text-[#111A16]">
                    <span>{u.schoolOrUniv || '-'}</span>
                    <span className="block text-[10px] text-[#718078]">{u.studentClass}</span>
                  </td>
                  <td className="py-3 px-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateRole(u.uid, e.target.value as any)}
                      className="px-2 py-1 text-[11px] font-bold rounded-lg border border-[#E6ECE8] bg-white text-[#111A16]"
                    >
                      <option value="student">Siswa</option>
                      <option value="supervisor">Pembimbing</option>
                      <option value="teacher">Guru</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                      u.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {u.status === 'active' && 'Aktif'}
                      {u.status === 'pending' && 'Menunggu'}
                      {u.status === 'rejected' && 'Ditolak'}
                      {u.status === 'suspended' && 'Ditangguhkan'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[11px] text-[#718078]">
                    <div>Pembimbing: <strong className="text-[#111A16]">{u.supervisorName || '-'}</strong></div>
                    <div>Guru: <strong className="text-[#111A16]">{u.teacherName || '-'}</strong></div>
                  </td>
                  <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                    {u.status === 'pending' && (
                      <button
                        onClick={() => handleUpdateStatus(u.uid, 'active')}
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        Setujui
                      </button>
                    )}
                    {u.status === 'active' && (
                      <button
                        onClick={() => handleUpdateStatus(u.uid, 'suspended')}
                        className="px-2 py-1 rounded-full text-[10px] font-semibold text-red-600 hover:bg-red-50"
                      >
                        Tangguhkan
                      </button>
                    )}
                    <button
                      onClick={() => openAssignModal(u)}
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23]"
                    >
                      Penugasan
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Assignment Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6ECE8] pb-3">
              <h3 className="text-base font-bold text-[#111A16]">
                Penugasan Pembimbing & Guru
              </h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-full hover:bg-[#F3F6F4] text-[#718078]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#718078]">
                Atur pembimbing industri dan guru sekolah untuk <strong className="text-[#111A16]">{selectedUser.displayName}</strong>.
              </p>

              <div>
                <label className="block font-bold text-[#111A16] mb-1">
                  Pembimbing Industri (PT One Data Security)
                </label>
                <input
                  type="text"
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#111A16] mb-1">
                  Guru Pembimbing Sekolah
                </label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-[#111A16] mb-1">Mulai Magang</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#111A16] mb-1">Selesai Magang</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6ECE8]">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 rounded-full font-semibold text-[#718078]"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveAssignments}
                  className="px-5 py-2 rounded-full font-bold bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23]"
                >
                  Simpan Penugasan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

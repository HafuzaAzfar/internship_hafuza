import React from 'react';
import { 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  BookOpen, 
  FileText, 
  Users, 
  QrCode, 
  Award, 
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { NavTab } from './Sidebar';
import { JournalItem, ScheduleItem, AnnouncementItem, AttendanceRecord } from '../types';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
  journals: JournalItem[];
  schedules: ScheduleItem[];
  announcements: AnnouncementItem[];
  attendanceRecords: AttendanceRecord[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  journals,
  schedules,
  announcements,
  attendanceRecords,
}) => {
  const { profile, effectiveRole } = useAuth();
  const { t } = useLanguage();

  // Metrics calculation
  const approvedJournals = journals.filter(j => j.status === 'approved').length;
  const pendingJournals = journals.filter(j => j.status === 'submitted').length;
  const totalAttendance = attendanceRecords.filter(a => a.status === 'present' || a.status === 'late').length;
  const totalTargetDays = 60;
  const attendanceRate = totalAttendance > 0 ? Math.min(100, Math.round((totalAttendance / Math.max(1, totalAttendance + 2)) * 100)) : 95;

  // Chart data: Weekly Activity (Monday - Friday)
  const weeklyData = [
    { day: 'Senin', presensi: 1, jurnal: 1 },
    { day: 'Selasa', presensi: 1, jurnal: 1 },
    { day: 'Rabu', presensi: 1, jurnal: 1 },
    { day: 'Kamis', presensi: 1, jurnal: 1 },
    { day: 'Jumat', presensi: 1, jurnal: 0 },
  ];

  // Donut chart: Attendance breakdown
  const pieData = [
    { name: 'Tepat Waktu', value: Math.max(1, attendanceRecords.filter(a => a.status === 'present').length), color: '#B7F500' },
    { name: 'Terlambat', value: Math.max(0, attendanceRecords.filter(a => a.status === 'late').length), color: '#0B3325' },
    { name: 'Izin/Sakit', value: Math.max(0, attendanceRecords.filter(a => a.status === 'excused').length), color: '#F59E0B' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Heading & Period Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#111A16]">
            {t.dashboard.title}
          </h2>
          <p className="text-xs text-[#718078] mt-0.5">
            {t.dashboard.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-white border border-[#E6ECE8] text-xs font-semibold text-[#111A16] shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-[#0B3325]" />
          <span>Semester Ganjil 2026/2027 (WIB)</span>
        </div>
      </div>

      {/* Top 3 Summary Cards matching Spark Admin reference */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Dark Emerald Spotlight Card */}
        <div className="bg-[#061F16] rounded-3xl p-6 text-white flex flex-col justify-between relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#B7F500]/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#102F23] text-[#B7F500] border border-[#B7F500]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B7F500] animate-pulse" />
                PT One Data Security
              </span>
              <span className="text-[11px] text-emerald-400/80">
                {profile?.internshipStartDate ? `${profile.internshipStartDate} s/d ${profile.internshipEndDate}` : 'Aktif'}
              </span>
            </div>
            <h3 className="text-base font-semibold leading-snug">
              {effectiveRole === 'student' && 'Magang Berjalan Lancar & Produktif'}
              {effectiveRole === 'supervisor' && 'Supervisi & Evaluasi Peserta Industri'}
              {effectiveRole === 'teacher' && 'Monitoring Akademik & Laporan Akhir'}
              {effectiveRole === 'admin' && 'Administrasi & Konfigurasi Sistem Terpadu'}
            </h3>
            <p className="text-xs text-emerald-300/80 mt-1">
              {effectiveRole === 'student' && 'Tetap isi presensi QR setiap hari kerja & submit jurnal sebelum pukul 18.00 WIB.'}
              {effectiveRole === 'supervisor' && 'Periksa jurnal harian siswa dan kelola sesi QR presensi tepat waktu.'}
              {effectiveRole === 'teacher' && 'Pantau keaktifan siswa dan tinjau laporan akhir magang.'}
              {effectiveRole === 'admin' && 'Kelola penugasan pembimbing, verifikasi siswa, dan pantau log audit.'}
            </p>
          </div>

          <button
            onClick={() => onNavigate(effectiveRole === 'student' ? 'schedule' : 'attendance')}
            className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#B7F500] hover:underline"
          >
            <span>{effectiveRole === 'student' ? 'Lihat Jadwal Agenda' : 'Buka Presensi Digital'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 2: Attendance Rate Summary */}
        <div className="bg-white rounded-3xl p-6 border border-[#E6ECE8] flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between text-[#718078] text-xs font-semibold mb-2">
              <span>{t.dashboard.statAttendanceRate}</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#16A34A] flex items-center justify-center">
                <QrCode className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#111A16] tracking-tight">
                {attendanceRate}%
              </span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#B7F500]/20 text-[#0B3325]">
                <TrendingUp className="w-3 h-3 text-[#16A34A]" />
                Target 90%+
              </span>
            </div>
            <p className="text-xs text-[#718078] mt-2">
              {totalAttendance} sesi check-in berhasil tercatat di sistem
            </p>
          </div>

          <button
            onClick={() => onNavigate('attendance')}
            className="mt-4 pt-3 border-t border-[#E6ECE8] text-xs font-semibold text-[#0B3325] hover:text-[#16A34A] flex items-center justify-between"
          >
            <span>Buka Presensi Digital</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card 3: Journal Progress Summary */}
        <div className="bg-white rounded-3xl p-6 border border-[#E6ECE8] flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between text-[#718078] text-xs font-semibold mb-2">
              <span>{t.dashboard.statJournals}</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#0B3325] flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#111A16] tracking-tight">
                {approvedJournals} <span className="text-lg font-normal text-[#718078]">/ {journals.length}</span>
              </span>
              {pendingJournals > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  <Clock className="w-3 h-3" />
                  {pendingJournals} Menunggu Review
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3 h-3" />
                  Semua Review Tuntas
                </span>
              )}
            </div>
            <p className="text-xs text-[#718078] mt-2">
              Status jurnal terbaru: {journals[0]?.title || 'Belum ada draf'}
            </p>
          </div>

          <button
            onClick={() => onNavigate('journal')}
            className="mt-4 pt-3 border-t border-[#E6ECE8] text-xs font-semibold text-[#0B3325] hover:text-[#16A34A] flex items-center justify-between"
          >
            <span>Kelola Jurnal Harian</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary Analytics Section matching Spark Admin */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Chart: Weekly Activity & Attendance (Takes 2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[#E6ECE8] shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#111A16]">
                {t.dashboard.attendanceAnalytics}
              </h3>
              <p className="text-[11px] text-[#718078]">
                Distribusi kehadiran dan penyelesaian jurnal harian sepekan
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#0B3325]" />
                <span className="text-[#718078]">Presensi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#B7F500]" />
                <span className="text-[#718078]">Jurnal</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" stroke="#718078" fontSize={11} tickLine={false} />
                <YAxis stroke="#718078" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#061F16', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                  cursor={{ fill: '#F3F6F4' }}
                />
                <Bar dataKey="presensi" fill="#0B3325" radius={[6, 6, 0, 0]} barSize={24} />
                <Bar dataKey="jurnal" fill="#B7F500" radius={[6, 6, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Donut Performance Card */}
        <div className="bg-white rounded-3xl p-6 border border-[#E6ECE8] shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#111A16]">
              {t.dashboard.attendanceDonut}
            </h3>
            <p className="text-[11px] text-[#718078]">
              Statistik rasio kehadiran magang
            </p>

            <div className="h-44 w-full relative flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={52}
                    outerRadius={74}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center">
                <span className="text-2xl font-extrabold text-[#111A16] block">
                  {attendanceRate}%
                </span>
                <span className="text-[10px] text-[#718078] uppercase font-semibold">
                  Kehadiran
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[#718078]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B7F500]" />
                  <span>Tepat Waktu (Hadir)</span>
                </div>
                <span className="font-semibold text-[#111A16]">
                  {attendanceRecords.filter(a => a.status === 'present').length} hari
                </span>
              </div>
              <div className="flex items-center justify-between text-[#718078]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0B3325]" />
                  <span>Terlambat</span>
                </div>
                <span className="font-semibold text-[#111A16]">
                  {attendanceRecords.filter(a => a.status === 'late').length} hari
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('attendance')}
            className="w-full mt-4 py-2 rounded-xl text-xs font-semibold bg-[#F3F6F4] hover:bg-[#E6ECE8] text-[#111A16] transition-colors"
          >
            Lihat Detail Presensi
          </button>
        </div>
      </div>

      {/* Bottom Secondary Panels Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Journals */}
        <div className="bg-white rounded-3xl p-6 border border-[#E6ECE8] shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#111A16]">
              {t.dashboard.recentJournals}
            </h3>
            <button
              onClick={() => onNavigate('journal')}
              className="text-xs font-semibold text-[#16A34A] hover:underline"
            >
              {t.dashboard.viewAll}
            </button>
          </div>

          <div className="space-y-3">
            {journals.length === 0 ? (
              <p className="text-xs text-[#718078] py-4 text-center">
                {t.dashboard.noJournals}
              </p>
            ) : (
              journals.slice(0, 4).map((j) => (
                <div
                  key={j.id}
                  onClick={() => onNavigate('journal')}
                  className="p-3 rounded-2xl bg-[#F3F6F4]/70 hover:bg-[#F3F6F4] border border-[#E6ECE8] cursor-pointer transition-all flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#111A16] truncate">
                      {j.title}
                    </p>
                    <p className="text-[10px] text-[#718078] mt-0.5">
                      {j.date} • {j.studentName}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize shrink-0 ${
                    j.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                    j.status === 'revision_requested' ? 'bg-red-100 text-red-800' :
                    j.status === 'submitted' ? 'bg-amber-100 text-amber-800' :
                    'bg-gray-200 text-gray-700'
                  }`}>
                    {j.status === 'approved' && 'Disetujui'}
                    {j.status === 'revision_requested' && 'Revisi'}
                    {j.status === 'submitted' && 'Menunggu'}
                    {j.status === 'draft' && 'Draf'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Schedules */}
        <div className="bg-white rounded-3xl p-6 border border-[#E6ECE8] shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#111A16]">
              {t.dashboard.upcomingSchedules}
            </h3>
            <button
              onClick={() => onNavigate('schedule')}
              className="text-xs font-semibold text-[#16A34A] hover:underline"
            >
              {t.dashboard.viewAll}
            </button>
          </div>

          <div className="space-y-3">
            {schedules.length === 0 ? (
              <p className="text-xs text-[#718078] py-4 text-center">
                {t.dashboard.noSchedules}
              </p>
            ) : (
              schedules.slice(0, 3).map((sch) => (
                <div
                  key={sch.id}
                  onClick={() => onNavigate('schedule')}
                  className="p-3 rounded-2xl border border-[#E6ECE8] hover:border-emerald-300 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-[#111A16] truncate">
                      {sch.title}
                    </p>
                    <span className="text-[10px] font-semibold text-[#16A34A] px-2 py-0.5 rounded-full bg-emerald-50 shrink-0">
                      {sch.startTime} WIB
                    </span>
                  </div>
                  <p className="text-[10px] text-[#718078] mt-1 line-clamp-1">
                    {sch.description}
                  </p>
                  <p className="text-[9px] text-[#718078]/80 mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#718078]" />
                    {sch.date} • {sch.location}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Level Up / Guide Promotion Card matching the green promo card in reference */}
        <div className="bg-gradient-to-br from-[#E2F79E] via-[#D5F573] to-[#B7F500] rounded-3xl p-6 text-[#061F16] flex flex-col justify-between shadow-2xs relative overflow-hidden">
          <div className="absolute top-2 right-2 opacity-20">
            <Sparkles className="w-20 h-20 text-[#061F16]" />
          </div>
          <div>
            <div className="w-9 h-9 rounded-2xl bg-[#061F16] text-[#B7F500] flex items-center justify-center mb-3">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold leading-tight">
              {t.dashboard.levelUpTitle}
            </h3>
            <p className="text-xs text-[#102F23] mt-2 font-medium">
              {t.dashboard.levelUpDesc}
            </p>
          </div>

          <div className="mt-5 space-y-2">
            <button
              onClick={() => onNavigate('documentation')}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#061F16] text-[#B7F500] hover:bg-[#102F23] transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{t.dashboard.uploadDoc}</span>
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onNavigate('journal')}
                className="py-2 rounded-xl text-xs font-semibold bg-white/80 hover:bg-white text-[#061F16] transition-colors text-center"
              >
                {t.dashboard.writeJournal}
              </button>
              <button
                onClick={() => onNavigate('assessment')}
                className="py-2 rounded-xl text-xs font-semibold bg-white/80 hover:bg-white text-[#061F16] transition-colors text-center"
              >
                {t.dashboard.viewAssessment}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

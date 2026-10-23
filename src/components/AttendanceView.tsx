import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  QrCode, 
  Camera, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Calendar, 
  UserCheck, 
  Users, 
  ShieldCheck,
  Timer,
  FileCheck,
  Edit3
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  setDoc, 
  doc, 
  updateDoc, 
  onSnapshot, 
  orderBy 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AttendanceRecord, AttendanceSession, AttendancePhase } from '../types';

export const AttendanceView: React.FC = () => {
  const { profile, effectiveRole } = useAuth();
  const { t } = useLanguage();

  const isStaff = effectiveRole === 'supervisor' || effectiveRole === 'admin' || effectiveRole === 'teacher';

  const [activeTab, setActiveTab] = useState<'scan' | 'generate' | 'history'>(isStaff ? 'generate' : 'scan');

  // Generator state
  const [phase, setPhase] = useState<AttendancePhase>('check_in');
  const [durationSeconds, setDurationSeconds] = useState<number>(120);
  const [currentSession, setCurrentSession] = useState<AttendanceSession | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [generating, setGenerating] = useState(false);

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [scanResult, setScanResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [processingScan, setProcessingScan] = useState(false);

  // Attendance Records
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  // Listen to attendance records
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const q = isStaff 
      ? query(collection(db, 'attendanceRecords'), orderBy('timestamp', 'desc'))
      : query(collection(db, 'attendanceRecords'), where('studentId', '==', profile?.uid || 'none'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      setRecords(docs);
      setLoadingRecords(false);
    }, (error) => {
      console.warn('Attendance records snapshot note:', error);
      setLoadingRecords(false);
    });

    return () => unsubscribe();
  }, [isStaff, profile?.uid]);

  // Generate QR code session
  const handleGenerateSession = async () => {
    setGenerating(true);
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + durationSeconds * 1000).toISOString();
      const code = `ODS-${phase.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const token = btoa(JSON.stringify({ code, phase, expiresAt, date: now.toISOString().split('T')[0] }));

      const sessionData: AttendanceSession = {
        id: `sess-${Date.now()}`,
        code,
        phase,
        date: now.toISOString().split('T')[0],
        startTime: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        expiresAt,
        durationSeconds,
        createdBy: profile?.uid || 'supervisor',
        creatorName: profile?.displayName || 'Pembimbing Industri',
        isActive: true,
        token,
      };

      await setDoc(doc(db, 'attendanceSessions', sessionData.id), sessionData);

      // Generate visual QR
      const dataUrl = await QRCode.toDataURL(token, {
        width: 320,
        margin: 2,
        color: { dark: '#061F16', light: '#FFFFFF' }
      });

      setCurrentSession(sessionData);
      setQrDataUrl(dataUrl);
      setSecondsRemaining(durationSeconds);
    } catch (err) {
      console.error('Failed to generate QR session:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Countdown timer for active session
  useEffect(() => {
    if (!currentSession || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentSession, secondsRemaining]);

  // Html5Qrcode scanner setup
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (isScanning && activeTab === 'scan') {
      scanner = new Html5QrcodeScanner(
        'qr-reader-container',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        (decodedText) => {
          scanner?.clear();
          setIsScanning(false);
          handleValidateAttendance(decodedText);
        },
        (error) => {
          // scanning frame error - ignore
        }
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
  }, [isScanning, activeTab]);

  // Validate and record attendance
  const handleValidateAttendance = async (rawToken: string) => {
    if (!profile?.uid) return;
    setProcessingScan(true);
    setScanResult(null);

    try {
      let payload: { code: string; phase: AttendancePhase; expiresAt: string; date: string };
      try {
        payload = JSON.parse(atob(rawToken.trim()));
      } catch {
        throw new Error(t.attendance.scanExpired);
      }

      const now = new Date();
      const expiry = new Date(payload.expiresAt);

      if (now > expiry) {
        throw new Error(t.attendance.scanExpired);
      }

      const today = now.toISOString().split('T')[0];
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      // Check for duplicate in records
      const existing = records.find(r => r.studentId === profile.uid && r.date === today && r.phase === payload.phase);
      if (existing) {
        throw new Error(t.attendance.scanDuplicate);
      }

      // Check phase sequence: Check-in must come before Check-out
      if (payload.phase === 'check_out') {
        const hasCheckIn = records.some(r => r.studentId === profile.uid && r.date === today && r.phase === 'check_in');
        if (!hasCheckIn) {
          throw new Error('Anda harus melakukan Check-in terlebih dahulu sebelum Check-out.');
        }
      }

      // Calculate status: Late if check-in after 08:30
      let status: 'present' | 'late' = 'present';
      if (payload.phase === 'check_in') {
        const hours = now.getHours();
        const minutes = now.getMinutes();
        if (hours > 8 || (hours === 8 && minutes > 30)) {
          status = 'late';
        }
      }

      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}-${profile.uid.substring(0, 5)}`,
        studentId: profile.uid,
        studentName: profile.displayName || 'Peserta Magang',
        studentEmail: profile.email || '',
        sessionId: payload.code,
        phase: payload.phase,
        date: today,
        timestamp: `${timeStr} WIB`,
        status,
        verifiedBy: 'QR Scanner PT One Data Security',
      };

      await setDoc(doc(db, 'attendanceRecords', newRecord.id), newRecord);

      // Create notification for student
      await addDoc(collection(db, 'notifications'), {
        userId: profile.uid,
        title: `Presensi ${payload.phase === 'check_in' ? 'Check-in' : 'Check-out'} Berhasil`,
        message: `Kehadiran pada ${today} pukul ${timeStr} WIB tercatat dengan status: ${status === 'present' ? 'Hadir Tepat Waktu' : 'Terlambat'}.`,
        type: 'success',
        read: false,
        createdAt: new Date().toISOString(),
      });

      setScanResult({
        type: 'success',
        message: `${t.attendance.scanSuccess} (${payload.phase === 'check_in' ? 'Check-in' : 'Check-out'} - ${status === 'present' ? 'Hadir Tepat Waktu' : 'Terlambat'})`
      });
      setManualToken('');
    } catch (err: any) {
      setScanResult({
        type: 'error',
        message: err.message || t.attendance.cameraError
      });
    } finally {
      setProcessingScan(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#111A16]">
            {t.attendance.title}
          </h2>
          <p className="text-xs text-[#718078] mt-0.5">
            {t.attendance.subtitle}
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-white border border-[#E6ECE8] shadow-2xs self-start sm:self-auto">
          {effectiveRole === 'student' && (
            <button
              onClick={() => setActiveTab('scan')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTab === 'scan' ? 'bg-[#0B3325] text-[#B7F500]' : 'text-[#718078] hover:text-[#111A16]'
              }`}
            >
              {t.attendance.tabScan}
            </button>
          )}

          {isStaff && (
            <button
              onClick={() => setActiveTab('generate')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTab === 'generate' ? 'bg-[#0B3325] text-[#B7F500]' : 'text-[#718078] hover:text-[#111A16]'
              }`}
            >
              {t.attendance.tabGenerate}
            </button>
          )}

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTab === 'history' ? 'bg-[#0B3325] text-[#B7F500]' : 'text-[#718078] hover:text-[#111A16]'
            }`}
          >
            {t.attendance.tabHistory} ({records.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Scanner (Student Flow) */}
      {activeTab === 'scan' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Camera Card */}
          <div className="bg-white rounded-3xl p-6 border border-[#E6ECE8] shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#0B3325] flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111A16]">
                    Pindai Kamera QR
                  </h3>
                  <p className="text-[11px] text-[#718078]">
                    Gunakan kamera perangkat untuk memindai kode QR pembimbing
                  </p>
                </div>
              </div>

              {scanResult && (
                <div className={`p-4 rounded-2xl mb-4 text-xs font-medium flex items-start gap-3 ${
                  scanResult.type === 'success' 
                    ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {scanResult.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 shrink-0" />
                  )}
                  <span>{scanResult.message}</span>
                </div>
              )}

              {isScanning ? (
                <div className="rounded-2xl overflow-hidden border border-[#E6ECE8] my-3 bg-[#061F16]">
                  <div id="qr-reader-container" className="w-full" />
                  <div className="p-3 bg-[#061F16] text-center">
                    <button
                      onClick={() => setIsScanning(false)}
                      className="px-4 py-1.5 rounded-full text-xs font-semibold bg-red-600 text-white hover:bg-red-700"
                    >
                      {t.attendance.cameraStop}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-12 border-2 border-dashed border-[#E6ECE8] rounded-2xl flex flex-col items-center justify-center text-center p-6 my-3">
                  <div className="w-14 h-14 rounded-full bg-[#F3F6F4] flex items-center justify-center text-[#0B3325] mb-3">
                    <QrCode className="w-7 h-7" />
                  </div>
                  <p className="text-xs font-semibold text-[#111A16] max-w-xs">
                    {t.attendance.scanQrPrompt}
                  </p>
                  <button
                    onClick={() => setIsScanning(true)}
                    className="mt-4 px-5 py-2.5 rounded-full text-xs font-bold bg-[#0B3325] text-white hover:bg-[#102F23] flex items-center gap-2 shadow-xs active:scale-95 transition-all"
                  >
                    <Camera className="w-4 h-4 text-[#B7F500]" />
                    <span>{t.attendance.cameraStart}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Manual Token input fallback */}
            <div className="pt-4 border-t border-[#E6ECE8]">
              <label className="block text-xs font-bold text-[#111A16] mb-1.5">
                {t.attendance.manualTokenLabel}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Tempelkan token presensi di sini..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#E6ECE8] focus:outline-none focus:ring-2 focus:ring-[#0B3325]/20 focus:border-[#0B3325]"
                />
                <button
                  onClick={() => handleValidateAttendance(manualToken)}
                  disabled={!manualToken.trim() || processingScan}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23] disabled:opacity-50 transition-all shrink-0"
                >
                  {processingScan ? 'Memproses...' : t.attendance.submitScan}
                </button>
              </div>
            </div>
          </div>

          {/* Today's Status Card */}
          <div className="bg-white rounded-3xl p-6 border border-[#E6ECE8] shadow-2xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#111A16] mb-1">
                Status Presensi Hari Ini
              </h3>
              <p className="text-xs text-[#718078] mb-4">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} (Asia/Jakarta)
              </p>

              {/* Status Pills */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {['check_in', 'check_out'].map((phaseKey) => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const rec = records.find(r => r.studentId === profile?.uid && r.date === todayStr && r.phase === phaseKey);
                  return (
                    <div 
                      key={phaseKey}
                      className={`p-4 rounded-2xl border ${
                        rec 
                          ? 'bg-emerald-50/60 border-emerald-200' 
                          : 'bg-[#F3F6F4]/60 border-[#E6ECE8]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase text-[#718078]">
                          {phaseKey === 'check_in' ? 'Check-in (Masuk)' : 'Check-out (Pulang)'}
                        </span>
                        {rec ? (
                          <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                        ) : (
                          <Clock className="w-4 h-4 text-[#718078]" />
                        )}
                      </div>
                      <p className="text-base font-extrabold text-[#111A16]">
                        {rec ? rec.timestamp : 'Belum Presensi'}
                      </p>
                      {rec && (
                        <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rec.status === 'present' ? 'bg-[#B7F500]/30 text-[#0B3325]' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {rec.status === 'present' ? 'Hadir Tepat Waktu' : 'Terlambat'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Rules info box */}
              <div className="p-4 rounded-2xl bg-[#061F16] text-white space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#B7F500]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Ketentuan Presensi PT One Data Security</span>
                </div>
                <ul className="text-[11px] text-emerald-200/80 space-y-1 list-disc pl-4">
                  <li>Check-in pagi: 07.30 - 08.30 WIB (lebih dari 08.30 terhitung Terlambat).</li>
                  <li>Check-out sore: 16.30 - 18.00 WIB.</li>
                  <li>Scan hanya valid saat sesi QR aktif dibagikan oleh pembimbing industri.</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E6ECE8] flex items-center justify-between text-xs text-[#718078]">
              <span>Asal Institusi: {profile?.schoolOrUniv || 'SMK Negeri 1 Jakarta'}</span>
              <span className="font-semibold text-[#111A16]">{profile?.studentClass}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Generator (Supervisor / Admin Flow) */}
      {activeTab === 'generate' && isStaff && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls & Active Session */}
          <div className="bg-white rounded-3xl p-6 border border-[#E6ECE8] shadow-2xs space-y-5">
            <div>
              <h3 className="text-sm font-bold text-[#111A16]">
                {t.attendance.generateSession}
              </h3>
              <p className="text-xs text-[#718078] mt-0.5">
                Buat kode QR dinamis dengan batas waktu token untuk siswa magang
              </p>
            </div>

            {/* Phase Selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPhase('check_in')}
                className={`p-3 rounded-2xl border text-left font-semibold text-xs transition-all ${
                  phase === 'check_in' 
                    ? 'border-[#0B3325] bg-emerald-50/70 text-[#0B3325] ring-2 ring-[#0B3325]/10' 
                    : 'border-[#E6ECE8] hover:bg-[#F3F6F4] text-[#718078]'
                }`}
              >
                <span className="block text-[10px] text-[#718078] uppercase">Pagi</span>
                {t.attendance.phaseCheckIn}
              </button>

              <button
                onClick={() => setPhase('check_out')}
                className={`p-3 rounded-2xl border text-left font-semibold text-xs transition-all ${
                  phase === 'check_out' 
                    ? 'border-[#0B3325] bg-emerald-50/70 text-[#0B3325] ring-2 ring-[#0B3325]/10' 
                    : 'border-[#E6ECE8] hover:bg-[#F3F6F4] text-[#718078]'
                }`}
              >
                <span className="block text-[10px] text-[#718078] uppercase">Sore</span>
                {t.attendance.phaseCheckOut}
              </button>
            </div>

            {/* Validity Duration */}
            <div>
              <label className="block text-xs font-bold text-[#111A16] mb-1.5">
                {t.attendance.sessionDuration}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[60, 120, 300].map(sec => (
                  <button
                    key={sec}
                    onClick={() => setDurationSeconds(sec)}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      durationSeconds === sec 
                        ? 'bg-[#0B3325] text-white border-[#0B3325]' 
                        : 'border-[#E6ECE8] hover:bg-[#F3F6F4] text-[#111A16]'
                    }`}
                  >
                    {sec >= 60 ? `${sec / 60} ${t.attendance.minutes}` : `${sec} ${t.attendance.seconds}`}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateSession}
              disabled={generating}
              className="w-full py-3 rounded-2xl text-xs font-bold bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23] shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              <span>{currentSession ? t.attendance.refreshCode : 'Generate QR Presensi Sekarang'}</span>
            </button>

            {/* Token preview for manual sharing */}
            {currentSession && (
              <div className="p-3 rounded-2xl bg-[#F3F6F4] border border-[#E6ECE8] text-[11px] text-[#718078] space-y-1">
                <span className="font-bold text-[#111A16] block">Token Cadangan (Manual):</span>
                <p className="font-mono text-[10px] break-all bg-white p-2 rounded-lg border border-[#E6ECE8]">
                  {currentSession.token}
                </p>
              </div>
            )}
          </div>

          {/* Dynamic QR Display Card */}
          <div className="bg-[#061F16] rounded-3xl p-6 text-white flex flex-col items-center justify-between shadow-sm relative overflow-hidden">
            <div className="w-full flex items-center justify-between mb-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#102F23] text-[#B7F500] border border-[#B7F500]/30">
                {phase === 'check_in' ? 'Check-in Sesi' : 'Check-out Sesi'}
              </span>
              <span className="text-xs text-emerald-300">
                {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>

            {currentSession && qrDataUrl ? (
              <div className="flex flex-col items-center my-4">
                <div className="p-3 bg-white rounded-3xl shadow-xl">
                  <img src={qrDataUrl} alt="Dynamic QR Code" className="w-60 h-60 object-contain rounded-2xl" />
                </div>

                {/* Expiry countdown */}
                <div className="mt-4 flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#102F23] text-xs font-semibold">
                  <Timer className={`w-4 h-4 ${secondsRemaining <= 10 ? 'text-red-400 animate-bounce' : 'text-[#B7F500]'}`} />
                  <span>
                    {t.attendance.qrExpiresIn}: <strong className={secondsRemaining <= 10 ? 'text-red-400 font-mono' : 'text-[#B7F500] font-mono'}>{secondsRemaining}s</strong>
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <QrCode className="w-16 h-16 text-emerald-600 mb-3" />
                <p className="text-xs text-emerald-300/70 max-w-xs">
                  Klik tombol "Generate QR Presensi Sekarang" untuk memulai sesi kehadiran baru.
                </p>
              </div>
            )}

            <div className="w-full text-center text-[11px] text-emerald-400/80 pt-3 border-t border-[#102F23]">
              PT One Data Security • Kehadiran Otomatis & Terverifikasi
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Attendance History Table */}
      {(activeTab === 'history' || activeTab === 'generate') && (
        <div className="bg-white rounded-3xl p-6 border border-[#E6ECE8] shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#111A16]">
                {t.attendance.todayRecords}
              </h3>
              <p className="text-[11px] text-[#718078]">
                Catatan presensi masuk dan pulang terverifikasi sistem
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#F3F6F4] text-[#111A16]">
              Total: {records.length} Presensi
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E6ECE8] text-[#718078] uppercase text-[10px] font-bold">
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">Nama Siswa</th>
                  <th className="py-3 px-3">Fase</th>
                  <th className="py-3 px-3">Waktu (WIB)</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Verifikator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6ECE8]/60">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#718078]">
                      Belum ada catatan presensi.
                    </td>
                  </tr>
                ) : (
                  records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-[#F3F6F4]/50 transition-colors">
                      <td className="py-3 px-3 font-medium text-[#111A16]">{rec.date}</td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-[#111A16] block">{rec.studentName}</span>
                        <span className="text-[10px] text-[#718078]">{rec.studentEmail}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6ECE8] text-[#111A16] uppercase">
                          {rec.phase === 'check_in' ? 'Check-in' : 'Check-out'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-[#111A16]">{rec.timestamp}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.status === 'present' ? 'bg-[#B7F500]/30 text-[#0B3325]' :
                          rec.status === 'late' ? 'bg-amber-100 text-amber-800' :
                          'bg-sky-100 text-sky-800'
                        }`}>
                          {rec.status === 'present' && 'Hadir Tepat Waktu'}
                          {rec.status === 'late' && 'Terlambat'}
                          {rec.status === 'excused' && 'Izin'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-[#718078]">{rec.verifiedBy || 'Sistem QR'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

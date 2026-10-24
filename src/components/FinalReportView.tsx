import React, { useState, useEffect } from 'react';
import { 
  FileCheck, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileText, 
  MessageSquare,
  ShieldCheck,
  Check,
  RotateCcw
} from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { FinalReportItem, FinalReportStatus } from '../types';
import { uploadSingleFile } from '../firebase/storageHelper';

export const FinalReportView: React.FC = () => {
  const { profile, effectiveRole } = useAuth();
  const { t } = useLanguage();

  const isTeacher = effectiveRole === 'teacher';
  const isAdmin = effectiveRole === 'admin';
  const isStudent = effectiveRole === 'student';

  const [report, setReport] = useState<FinalReportItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [reportTitle, setReportTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Teacher feedback state
  const [feedbackText, setFeedbackText] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'revise'>('approve');

  const studentUid = isStudent ? (profile?.uid || '') : (profile?.uid || 'student-demo');

  useEffect(() => {
    if (!studentUid) return;

    const unsub = onSnapshot(doc(db, 'finalReports', studentUid), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as FinalReportItem;
        setReport(data);
        setReportTitle(data.title || '');
        setFeedbackText(data.teacherFeedback || '');
      } else {
        setReport(null);
      }
      setLoading(false);
    }, (err) => {
      console.warn('Final report snapshot notice:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [studentUid]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setErrorMsg('Hanya file dokumen PDF resmi yang diperbolehkan.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('Ukuran file maksimal 25MB.');
      return;
    }

    setErrorMsg('');
    setFileName(file.name);
    setFileSize(file.size);
    setSelectedFile(file);
  };

  const handleUploadReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid || !selectedFile) {
      setErrorMsg('Silakan pilih berkas dokumen PDF laporan akhir terlebih dahulu.');
      return;
    }

    setUploading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const nowStr = new Date().toISOString();
      const newVersion = (report?.version || 0) + 1;
      const cleanFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `finalReports/${profile.uid}/v${newVersion}_${Date.now()}_${cleanFileName}`;

      setUploadProgressText('Mengunggah dokumen laporan ke Cloud Storage...');
      const uploadResult = await uploadSingleFile(selectedFile, storagePath, (pct, txt) => {
        setUploadProgressText(txt);
      });

      const reportData: FinalReportItem = {
        id: profile.uid,
        studentId: profile.uid,
        studentName: profile.displayName || 'Peserta Magang',
        studentEmail: profile.email || '',
        title: reportTitle.trim() || `Laporan Akhir Magang - ${profile.displayName}`,
        fileUrl: uploadResult.url,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        version: newVersion,
        status: 'submitted',
        submittedAt: nowStr,
      };

      await setDoc(doc(db, 'finalReports', profile.uid), reportData);

      // Notify academic teacher
      await addDoc(collection(db, 'notifications'), {
        userId: profile.teacherId || 'teacher',
        title: `Laporan Akhir Magang Masuk: ${profile.displayName}`,
        message: `${profile.displayName} telah mengunggah versi ${newVersion} laporan akhir magang untuk ditinjau.`,
        type: 'info',
        read: false,
        createdAt: nowStr,
      });

      setSelectedFile(null);
      setSuccessMsg(`Laporan akhir magang (versi ${newVersion}) berhasil dikirim untuk verifikasi guru.`);
      setTimeout(() => setSuccessMsg(''), 4500);
    } catch (err: any) {
      console.error('Failed to submit final report:', err);
      setErrorMsg(`Gagal mengunggah laporan akhir: ${err?.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setUploading(false);
      setUploadProgressText('');
    }
  };


  const handleTeacherReview = async () => {
    if (!studentUid) return;
    setUploading(true);
    try {
      const nowStr = new Date().toISOString();
      const newStatus: FinalReportStatus = reviewAction === 'approve' ? 'approved' : 'revision_requested';

      await updateDoc(doc(db, 'finalReports', studentUid), {
        status: newStatus,
        teacherFeedback: feedbackText.trim(),
        reviewedBy: profile?.displayName || 'Guru Pembimbing',
        reviewedAt: nowStr,
      });

      // Notify student
      await addDoc(collection(db, 'notifications'), {
        userId: studentUid,
        title: newStatus === 'approved' ? 'Laporan Akhir Magang Disetujui' : 'Revisi Laporan Akhir Magang',
        message: newStatus === 'approved' 
          ? 'Selamat! Laporan akhir magang Anda telah diverifikasi dan disetujui oleh guru pembimbing.'
          : `Guru pembimbing meminta revisi pada laporan akhir: "${feedbackText}"`,
        type: newStatus === 'approved' ? 'success' : 'warning',
        read: false,
        createdAt: nowStr,
      });
    } catch (err) {
      console.error('Review final report error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = () => {
    if (!report?.fileUrl) return;
    const a = document.createElement('a');
    a.href = report.fileUrl;
    a.download = report.fileName || 'Laporan_Akhir_Magang.pdf';
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#111A16]">
            {t.finalReport.title}
          </h2>
          <p className="text-xs text-[#718078] mt-0.5">
            {t.finalReport.subtitle}
          </p>
        </div>

        {report && (
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            report.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
            report.status === 'revision_requested' ? 'bg-red-100 text-red-800' :
            report.status === 'submitted' ? 'bg-amber-100 text-amber-800' :
            'bg-gray-100 text-gray-700'
          }`}>
            Status: {report.status === 'approved' ? 'Disetujui Guru' :
                     report.status === 'revision_requested' ? 'Perlu Revisi' :
                     report.status === 'submitted' ? 'Menunggu Tinjauan' : report.status}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Guidelines & Submission (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Guidelines Box */}
          <div className="bg-white rounded-3xl p-6 border border-[#E6ECE8] shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0B3325]">
              <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
              <span>Ketentuan & Pedoman Penulisan Laporan Akhir</span>
            </div>
            <ul className="text-xs text-[#718078] space-y-2 list-disc pl-5">
              <li>Laporan wajib disusun dalam format PDF dengan ukuran maksimal 20MB.</li>
              <li>Struktur minimal laporan: Halaman Judul, Lembar Pengesahan, Bab I Pendahuluan, Bab II Gambaran Umum PT One Data Security, Bab III Pelaksanaan Magang & Analisis Proyek, Bab IV Penutup & Rekomendasi, Lampiran Dokumentasi.</li>
              <li>Laporan yang telah disetujui guru menjadi syarat mutlak penerbitan sertifikat kelulusan magang.</li>
            </ul>
          </div>

          {/* Student Upload Card */}
          {isStudent && (
            <div className="bg-white rounded-3xl p-6 border border-[#E6ECE8] shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-[#111A16]">
                {report ? `Unggah Versi Revisi (Versi Sekarang: v${report.version})` : 'Unggah Laporan Akhir Magang'}
              </h3>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleUploadReport} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#111A16] mb-1">
                    Judul Laporan Akhir
                  </label>
                  <input
                    type="text"
                    required
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder="Contoh: Implementasi SIEM & Log Security Monitoring pada PT One Data Security"
                    className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#111A16] mb-1">
                    Pilih File PDF Laporan
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    required
                    onChange={handleFileChange}
                    className="w-full text-xs text-[#718078] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#0B3325] file:text-[#B7F500] hover:file:bg-[#102F23]"
                  />
                </div>

                {fileName && (
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-[#16A34A] flex items-center justify-between">
                    <span className="font-semibold">{fileName}</span>
                    <span className="text-[10px] font-bold">{(fileSize / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                )}

                {uploadProgressText && (
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-[#0B3325] flex items-center gap-2 animate-pulse">
                    <Upload className="w-4 h-4 text-[#16A34A]" />
                    <span>{uploadProgressText}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {errorMsg && (
                  <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23] flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>{uploading ? 'Mengunggah ke Cloud Storage...' : 'Kirim Laporan Akhir ke Guru'}</span>
                </button>
              </form>
            </div>
          )}

          {/* Teacher Review Card */}
          {(isTeacher || isAdmin) && report && (
            <div className="bg-white rounded-3xl p-6 border border-[#E6ECE8] shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-[#111A16]">
                Review Akademik Guru Pembimbing
              </h3>
              <p className="text-xs text-[#718078]">
                Peserta: {report.studentName} ({report.studentEmail}) • Versi {report.version}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setReviewAction('approve')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    reviewAction === 'approve' 
                      ? 'bg-emerald-600 text-white border-emerald-600' 
                      : 'border-[#E6ECE8] text-[#718078]'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>Setujui Laporan</span>
                </button>
                <button
                  onClick={() => setReviewAction('revise')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    reviewAction === 'revise' 
                      ? 'bg-red-600 text-white border-red-600' 
                      : 'border-[#E6ECE8] text-[#718078]'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Minta Revisi</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111A16] mb-1">
                  Catatan Evaluasi / Masukan Perbaikan Guru
                </label>
                <textarea
                  rows={3}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Tuliskan catatan akademik atau poin revisi..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                />
              </div>

              <button
                onClick={handleTeacherReview}
                disabled={uploading}
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#0B3325] text-white hover:bg-[#102F23]"
              >
                Simpan Keputusan Review
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Status & Current File (1 col) */}
        <div className="space-y-6">
          <div className="bg-[#061F16] rounded-3xl p-6 text-white shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#B7F500]">
              Status Berkas Laporan
            </h3>

            {report ? (
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-2xl bg-[#102F23] border border-[#B7F500]/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#B7F500]" />
                    <span className="font-bold truncate">{report.fileName}</span>
                  </div>
                  <p className="text-[11px] text-emerald-300">
                    Versi: v{report.version} • Diajukan: {new Date(report.submittedAt).toLocaleDateString('id-ID')}
                  </p>
                </div>

                {report.teacherFeedback && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-200">
                    <span className="font-bold block text-[10px] uppercase text-amber-300">
                      Catatan Guru Pembimbing:
                    </span>
                    <p className="mt-1 italic">"{report.teacherFeedback}"</p>
                  </div>
                )}

                <button
                  onClick={handleDownload}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#B7F500] text-[#061F16] hover:bg-[#a6de00] flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>{t.finalReport.downloadReport}</span>
                </button>
              </div>
            ) : (
              <div className="py-8 text-center text-emerald-300/60 text-xs">
                Belum ada laporan akhir yang diunggah.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

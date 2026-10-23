import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { 
  Award, 
  Download, 
  CheckCircle2, 
  RotateCcw, 
  Send, 
  ShieldCheck, 
  Lock, 
  Sparkles,
  FileText,
  UserCheck,
  Building,
  GraduationCap,
  AlertTriangle
} from 'lucide-react';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { DEFAULT_RUBRIC_CRITERIA } from '../firebase/seed';
import { AssessmentItem, RubricCriterion, AssessmentStatus } from '../types';

export const AssessmentView: React.FC = () => {
  const { profile, effectiveRole } = useAuth();
  const { t } = useLanguage();

  const isSupervisor = effectiveRole === 'supervisor';
  const isTeacher = effectiveRole === 'teacher';
  const isAdmin = effectiveRole === 'admin';
  const isStudent = effectiveRole === 'student';

  const [assessment, setAssessment] = useState<AssessmentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [criteria, setCriteria] = useState<RubricCriterion[]>(DEFAULT_RUBRIC_CRITERIA);
  const [supervisorComments, setSupervisorComments] = useState('');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Student ID to assess: for student, their own uid; for supervisor/teacher/admin, either student or selected student
  const studentUid = isStudent ? (profile?.uid || '') : (profile?.uid || 'student-demo');

  useEffect(() => {
    if (!studentUid) return;

    const unsub = onSnapshot(doc(db, 'assessments', studentUid), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as AssessmentItem;
        setAssessment(data);
        if (data.criteriaScores && data.criteriaScores.length > 0) {
          setCriteria(data.criteriaScores);
        }
        setSupervisorComments(data.supervisorComments || '');
        setTeacherNotes(data.teacherNotes || '');
      } else {
        // Initialize template
        setAssessment(null);
        setCriteria(DEFAULT_RUBRIC_CRITERIA);
      }
      setLoading(false);
    }, (err) => {
      console.warn('Assessment snapshot notice:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [studentUid]);

  // Calculate final weighted score (0 - 100)
  const calculateFinalScore = (critList: RubricCriterion[]) => {
    const rawTotal = critList.reduce((acc, c) => acc + (c.score / c.maxScore) * c.weight, 0);
    return Math.round(rawTotal * 10) / 10;
  };

  const currentFinalScore = calculateFinalScore(criteria);

  const getScoreGrade = (score: number) => {
    if (score >= 90) return { grade: 'A (Sangat Memuaskan)', color: 'text-emerald-700 bg-emerald-100' };
    if (score >= 80) return { grade: 'B (Memuaskan / Baik)', color: 'text-[#0B3325] bg-[#B7F500]/30' };
    if (score >= 70) return { grade: 'C (Cukup)', color: 'text-amber-800 bg-amber-100' };
    return { grade: 'D (Kurang)', color: 'text-red-800 bg-red-100' };
  };

  const handleScoreChange = (critId: string, val: number) => {
    setCriteria(prev => prev.map(c => c.id === critId ? { ...c, score: val } : c));
  };

  // Supervisor submits to teacher
  const handleSupervisorSubmit = async () => {
    setSaving(true);
    try {
      const nowStr = new Date().toISOString();
      const finalScore = calculateFinalScore(criteria);

      const assessData: AssessmentItem = {
        id: studentUid,
        studentId: studentUid,
        studentName: profile?.displayName || 'Peserta Magang',
        studentEmail: profile?.email || '',
        studentClass: profile?.studentClass || 'XII RPL 1',
        studentMajor: profile?.major || 'Rekayasa Perangkat Lunak',
        companyName: 'PT One Data Security',
        internshipPeriod: `${profile?.internshipStartDate || '2026-08-01'} s/d ${profile?.internshipEndDate || '2026-12-31'}`,
        criteriaScores: criteria,
        finalScore,
        supervisorComments: supervisorComments.trim(),
        supervisorId: profile?.uid || 'supervisor-1',
        supervisorName: profile?.displayName || 'Pembimbing Industri',
        supervisorSubmittedAt: nowStr,
        status: 'submitted_to_teacher',
      };

      await setDoc(doc(db, 'assessments', studentUid), assessData);
      setStatusMessage('Penilaian berhasil disimpan dan dikirim ke guru pembimbing.');
    } catch (err) {
      console.error('Submit assessment error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Teacher verifies or returns
  const handleTeacherAction = async (action: 'verify' | 'return') => {
    setSaving(true);
    try {
      const nowStr = new Date().toISOString();
      const newStatus: AssessmentStatus = action === 'verify' ? 'verified' : 'correction_requested';

      await updateDoc(doc(db, 'assessments', studentUid), {
        status: newStatus,
        teacherNotes: teacherNotes.trim(),
        teacherId: profile?.uid || 'teacher-1',
        teacherName: profile?.displayName || 'Guru Pembimbing',
        teacherVerifiedAt: nowStr,
      });

      setStatusMessage(action === 'verify' ? 'Penilaian berhasil diverifikasi.' : 'Penilaian dikembalikan ke pembimbing untuk perbaikan.');
    } catch (err) {
      console.error('Teacher action error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Admin or supervisor publishes to student
  const handlePublishAssessment = async () => {
    setSaving(true);
    try {
      const nowStr = new Date().toISOString();
      await updateDoc(doc(db, 'assessments', studentUid), {
        status: 'published',
        publishedAt: nowStr,
      });
      setStatusMessage('Penilaian resmi diterbitkan ke peserta magang.');
    } catch (err) {
      console.error('Publish error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Download official PDF assessment
  const handleDownloadPdf = () => {
    const docPdf = new jsPDF();

    // Primary Brand Header
    docPdf.setFillColor(6, 31, 22); // #061F16
    docPdf.rect(0, 0, 210, 36, 'F');

    docPdf.setTextColor(183, 245, 0); // #B7F500
    docPdf.setFontSize(16);
    docPdf.setFont('helvetica', 'bold');
    docPdf.text('PT ONE DATA SECURITY', 15, 16);

    docPdf.setTextColor(255, 255, 255);
    docPdf.setFontSize(10);
    docPdf.setFont('helvetica', 'normal');
    docPdf.text('LEMBAR PENILAIAN & EVALUASI AKHIR PRAKTIK KERJA LAPANGAN (MAGANG)', 15, 24);
    docPdf.setFontSize(8);
    docPdf.text('Gedung Cyber One, Jl. HR Rasuna Said, Jakarta Selatan • Hotline: support@onedatasecurity.id', 15, 30);

    // Student Info Block
    docPdf.setTextColor(17, 26, 22);
    docPdf.setFontSize(11);
    docPdf.setFont('helvetica', 'bold');
    docPdf.text('DATA PESERTA MAGANG', 15, 46);

    docPdf.setFontSize(9);
    docPdf.setFont('helvetica', 'normal');
    docPdf.text(`Nama Peserta        : ${assessment?.studentName || profile?.displayName || 'Peserta'}`, 15, 54);
    docPdf.text(`Institusi Asal      : ${profile?.schoolOrUniv || 'SMK Negeri 1 Jakarta'}`, 15, 60);
    docPdf.text(`Kelas / Jurusan     : ${profile?.studentClass || 'XII RPL'} / ${profile?.major || 'Rekayasa Perangkat Lunak'}`, 15, 66);
    docPdf.text(`Periode Magang      : ${assessment?.internshipPeriod || 'Semester Ganjil 2026/2027'}`, 15, 72);
    docPdf.text(`Divisi Penugasan    : Information Security & IT Infrastructure`, 15, 78);

    // Table Header
    let yPos = 88;
    docPdf.setFillColor(243, 246, 244);
    docPdf.rect(15, yPos - 5, 180, 8, 'F');
    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(8);
    docPdf.text('NO', 18, yPos);
    docPdf.text('KRITERIA KOMPETENSI / PENILAIAN', 30, yPos);
    docPdf.text('BOBOT', 130, yPos);
    docPdf.text('NILAI (1-5)', 150, yPos);
    docPdf.text('SKOR (0-100)', 172, yPos);

    // Table Rows
    yPos += 7;
    docPdf.setFont('helvetica', 'normal');
    criteria.forEach((c, index) => {
      const rowScore = Math.round((c.score / c.maxScore) * c.weight * 10) / 10;
      docPdf.text(String(index + 1), 18, yPos);
      docPdf.text(c.name, 30, yPos);
      docPdf.text(`${c.weight}%`, 132, yPos);
      docPdf.text(`${c.score} / 5`, 154, yPos);
      docPdf.text(String(rowScore), 176, yPos);
      yPos += 6.5;
    });

    // Total Score Block
    yPos += 3;
    docPdf.setFillColor(6, 31, 22);
    docPdf.rect(15, yPos - 5, 180, 10, 'F');
    docPdf.setTextColor(255, 255, 255);
    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(10);
    docPdf.text('NILAI AKHIR KUMULATIF', 30, yPos + 2);
    docPdf.setTextColor(183, 245, 0);
    docPdf.text(`${currentFinalScore} / 100  (${getScoreGrade(currentFinalScore).grade})`, 140, yPos + 2);

    // Comments Section
    yPos += 16;
    docPdf.setTextColor(17, 26, 22);
    docPdf.setFontSize(9);
    docPdf.setFont('helvetica', 'bold');
    docPdf.text('Catatan & Rekomendasi Pembimbing Industri:', 15, yPos);
    docPdf.setFont('helvetica', 'italic');
    docPdf.setFontSize(8);
    docPdf.text(supervisorComments || 'Peserta menunjukkan dedikasi dan pemahaman teknis yang sangat baik selama magang.', 15, yPos + 5, { maxWidth: 180 });

    yPos += 16;
    docPdf.setFont('helvetica', 'bold');
    docPdf.text('Catatan Evaluasi Guru Pembimbing Sekolah:', 15, yPos);
    docPdf.setFont('helvetica', 'italic');
    docPdf.setFontSize(8);
    docPdf.text(teacherNotes || 'Seluruh tugas dan capaian akademik telah diverifikasi memenuhi standar kompetensi keahlian.', 15, yPos + 5, { maxWidth: 180 });

    // Signature Area
    yPos += 22;
    docPdf.setFont('helvetica', 'normal');
    docPdf.setFontSize(8);
    docPdf.text('Jakarta, ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), 140, yPos);

    yPos += 8;
    docPdf.text('Pembimbing Industri (PT One Data Security)', 20, yPos);
    docPdf.text('Guru Pembimbing Sekolah', 135, yPos);

    yPos += 24;
    docPdf.setFont('helvetica', 'bold');
    docPdf.text(assessment?.supervisorName || 'Budi Santoso, S.Kom', 20, yPos);
    docPdf.text(assessment?.teacherName || 'Dra. Nurhayati, M.Pd', 135, yPos);

    // Save
    docPdf.save(`Lembar_Penilaian_Magang_${assessment?.studentName || 'Peserta'}_PT_One_Data_Security.pdf`);
  };

  const isPublished = assessment?.status === 'published';
  const isVerified = assessment?.status === 'verified';
  const isSubmittedToTeacher = assessment?.status === 'submitted_to_teacher';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#111A16]">
            {t.assessment.title}
          </h2>
          <p className="text-xs text-[#718078] mt-0.5">
            {t.assessment.subtitle}
          </p>
        </div>

        {/* Download PDF button (when published or staff view) */}
        {(isPublished || !isStudent) && (
          <button
            onClick={handleDownloadPdf}
            className="self-start sm:self-auto px-4 py-2 rounded-full text-xs font-bold bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23] flex items-center gap-2 shadow-xs active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{t.assessment.downloadPdf}</span>
          </button>
        )}
      </div>

      {statusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-[#16A34A] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Warning if student views unpublished */}
      {isStudent && !isPublished && (
        <div className="p-6 bg-amber-50 rounded-3xl border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
          <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm text-amber-900">Penilaian Masih Dalam Proses Evaluasi</h4>
            <p className="mt-1 text-amber-800">
              {t.assessment.notPublishedWarning} Nilai akhir akan ditampilkan dan dapat diunduh dalam format PDF resmi setelah diverifikasi oleh guru dan diterbitkan oleh administrator PT One Data Security.
            </p>
            <p className="mt-2 text-[11px] font-semibold text-amber-900/80">
              Status saat ini: {assessment ? assessment.status.replace('_', ' ').toUpperCase() : 'Belum dinilai pembimbing'}
            </p>
          </div>
        </div>
      )}

      {/* Main Rubric & Scoring Interface */}
      {(!isStudent || isPublished) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rubric Criteria List (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[#E6ECE8] shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-[#E6ECE8] pb-4">
              <div>
                <h3 className="text-sm font-bold text-[#111A16]">
                  {t.assessment.rubricRubric}
                </h3>
                <p className="text-[11px] text-[#718078]">
                  {t.assessment.rubricScaleInfo}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#F3F6F4] text-[#0B3325]">
                Total Bobot: 100%
              </span>
            </div>

            <div className="space-y-4">
              {criteria.map((c, idx) => (
                <div key={c.id} className="p-4 rounded-2xl bg-[#F3F6F4]/50 border border-[#E6ECE8] space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <span className="text-[10px] font-bold text-[#718078] uppercase">
                        Kriteria {idx + 1} • Bobot {c.weight}%
                      </span>
                      <h4 className="text-xs font-bold text-[#111A16]">{c.name}</h4>
                      {c.description && (
                        <p className="text-[11px] text-[#718078]">{c.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 self-start sm:self-auto">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          disabled={isStudent || (isTeacher && !isAdmin)}
                          onClick={() => handleScoreChange(c.id, val)}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                            c.score === val
                              ? 'bg-[#0B3325] text-[#B7F500] shadow-xs'
                              : 'bg-white border border-[#E6ECE8] text-[#718078] hover:bg-[#F3F6F4]'
                          } disabled:cursor-not-allowed`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Written Comments */}
            <div className="space-y-4 pt-4 border-t border-[#E6ECE8]">
              <div>
                <label className="block text-xs font-bold text-[#111A16] mb-1.5">
                  {t.assessment.supervisorNotes}
                </label>
                <textarea
                  rows={3}
                  disabled={isStudent || isTeacher}
                  value={supervisorComments}
                  onChange={(e) => setSupervisorComments(e.target.value)}
                  placeholder="Catatan perkembangan, kekuatan kerja, dan rekomendasi industri..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6ECE8] bg-white focus:border-[#0B3325] disabled:bg-[#F3F6F4]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111A16] mb-1.5">
                  {t.assessment.teacherNotes}
                </label>
                <textarea
                  rows={3}
                  disabled={isStudent || isSupervisor}
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  placeholder="Evaluasi ketercapaian kompetensi kurikulum akademik..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6ECE8] bg-white focus:border-[#0B3325] disabled:bg-[#F3F6F4]"
                />
              </div>
            </div>
          </div>

          {/* Right Summary Card (1 col) */}
          <div className="space-y-5">
            {/* Final Score Card */}
            <div className="bg-[#061F16] rounded-3xl p-6 text-white shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#102F23] text-[#B7F500] border border-[#B7F500]/30">
                    Nilai Akhir Terhitung
                  </span>
                  <span className="text-[11px] text-emerald-400">
                    Skala 100
                  </span>
                </div>

                <div className="text-center my-4">
                  <span className="text-5xl font-black text-[#B7F500] tracking-tight">
                    {currentFinalScore}
                  </span>
                  <span className="block text-xs text-emerald-300 font-semibold mt-1">
                    {getScoreGrade(currentFinalScore).grade}
                  </span>
                </div>

                <div className="space-y-2 text-xs pt-4 border-t border-[#102F23]">
                  <div className="flex items-center justify-between text-emerald-300/80">
                    <span>Status Nilai:</span>
                    <span className="font-bold text-white uppercase">
                      {assessment?.status || 'Draf'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-300/80">
                    <span>Target Kelulusan:</span>
                    <span className="font-bold text-[#B7F500]">≥ 75.0</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons based on Role */}
              <div className="mt-6 space-y-2">
                {(isSupervisor || isAdmin) && (
                  <button
                    onClick={handleSupervisorSubmit}
                    disabled={saving}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#B7F500] text-[#061F16] hover:bg-[#a6de00] flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{t.assessment.submitToTeacher}</span>
                  </button>
                )}

                {(isTeacher || isAdmin) && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleTeacherAction('verify')}
                      disabled={saving}
                      className="py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verifikasi</span>
                    </button>
                    <button
                      onClick={() => handleTeacherAction('return')}
                      disabled={saving}
                      className="py-2.5 rounded-xl text-xs font-bold bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center gap-1 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Kembalikan</span>
                    </button>
                  </div>
                )}

                {(isAdmin || isSupervisor) && isVerified && !isPublished && (
                  <button
                    onClick={handlePublishAssessment}
                    disabled={saving}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-400 text-[#061F16] hover:bg-emerald-300 flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t.assessment.publishAssessment}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Workflow steps badge */}
            <div className="bg-white rounded-3xl p-5 border border-[#E6ECE8] shadow-2xs space-y-3 text-xs">
              <h4 className="font-bold text-[#111A16]">Alur Pengesahan Nilai</h4>
              <div className="space-y-2 text-[#718078]">
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    assessment?.status ? 'bg-[#0B3325] text-[#B7F500]' : 'bg-[#E6ECE8] text-[#718078]'
                  }`}>1</span>
                  <span>Input Nilai Rubrik oleh Pembimbing Industri</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    isVerified || isPublished ? 'bg-[#0B3325] text-[#B7F500]' : 'bg-[#E6ECE8] text-[#718078]'
                  }`}>2</span>
                  <span>Verifikasi Akademik oleh Guru Pembimbing</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    isPublished ? 'bg-[#0B3325] text-[#B7F500]' : 'bg-[#E6ECE8] text-[#718078]'
                  }`}>3</span>
                  <span>Penerbitan Resmi & Pengunduhan PDF Peserta</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db, auth } from './config';
import { ScheduleItem, AnnouncementItem, RubricCriterion } from '../types';

export const DEFAULT_RUBRIC_CRITERIA: RubricCriterion[] = [
  { id: 'crit-1', name: 'Profesionalisme & Sikap Kerja', nameEn: 'Professionalism & Work Ethic', weight: 15, score: 5, maxScore: 5, description: 'Integritas, kepatuhan kode etik, dan dedikasi di lingkungan PT One Data Security' },
  { id: 'crit-2', name: 'Kedisiplinan & Ketepatan Waktu', nameEn: 'Discipline & Punctuality', weight: 15, score: 4, maxScore: 5, description: 'Kehadiran presensi digital tepat waktu dan penyelesaian tugas sesuai tenggat' },
  { id: 'crit-3', name: 'Kompetensi Teknis / Keahlian', nameEn: 'Technical Competence', weight: 20, score: 5, maxScore: 5, description: 'Kecakapan teknis keamanan siber, pemrograman, basis data, dan infrastruktur IT' },
  { id: 'crit-4', name: 'Kualitas Hasil Kerja', nameEn: 'Quality of Work Output', weight: 15, score: 4, maxScore: 5, description: 'Kerapian, akurasi, dan ketelitian hasil tugas/proyek yang didelegasikan' },
  { id: 'crit-5', name: 'Komunikasi & Koordinasi', nameEn: 'Communication & Coordination', weight: 10, score: 4, maxScore: 5, description: 'Kemampuan menyampaikan ide, laporan kemajuan, dan responsivitas terhadap mentor' },
  { id: 'crit-6', name: 'Kerja Sama Tim (Teamwork)', nameEn: 'Teamwork & Collaboration', weight: 10, score: 5, maxScore: 5, description: 'Kemampuan berkolaborasi secara produktif dengan rekan divisi dan staf industri' },
  { id: 'crit-7', name: 'Inisiatif & Pemecahan Masalah', nameEn: 'Initiative & Problem Solving', weight: 10, score: 4, maxScore: 5, description: 'Proaktif mencari solusi kreatif atas kendala teknis yang dihadapi' },
  { id: 'crit-8', name: 'Kemampuan Belajar & Adaptasi', nameEn: 'Learning Ability & Adaptability', weight: 5, score: 5, maxScore: 5, description: 'Cepat menyerap teknologi baru dan prosedur standar operasional perusahaan' },
];

export async function checkAndSeedInitialData() {
  // Only attempt seeding when user is authenticated to prevent permission-denied noise on login screen
  if (!auth.currentUser) {
    return;
  }
  try {
    const annSnap = await getDocs(collection(db, 'announcements'));
    if (annSnap.empty) {
      console.log('Seeding initial announcements and schedules...');
      
      const sampleAnnouncements: AnnouncementItem[] = [
        {
          id: 'ann-1',
          title: 'Sosialisasi SOP Keamanan Informasi & Kebijakan Magang Q4',
          content: 'Seluruh peserta magang PT One Data Security diwajibkan mematuhi pedoman keamanan akses data, penggunaan VPN kantor, serta pengisian presensi digital QR tepat waktu setiap hari kerja (pukul 08.00 - 17.00 WIB).',
          priority: 'urgent',
          targetAudience: 'all',
          authorName: 'HR & IT Security PT One Data Security',
          authorId: 'admin-seed',
          publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          readBy: []
        },
        {
          id: 'ann-2',
          title: 'Jadwal Pengunggahan Laporan Akhir Magang & Verifikasi Akademik',
          content: 'Pemberitahuan kepada seluruh siswa dan guru pembimbing: Pengunggahan draft laporan akhir magang dimulai 2 minggu sebelum periode magang berakhir. Pastikan jurnal harian telah disetujui minimal 90%.',
          priority: 'high',
          targetAudience: 'student',
          authorName: 'Koordinator Magang Industri',
          authorId: 'admin-seed',
          publishedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          readBy: []
        },
        {
          id: 'ann-3',
          title: 'Workshop Pengenalan Cloud Security & SOC Monitoring',
          content: 'Workshop teknis internal bersama tim Security Operations Center (SOC) akan diselenggarakan hari Jumat pekan ini. Link sesi dan agenda dapat dilihat di menu Jadwal Magang.',
          priority: 'normal',
          targetAudience: 'all',
          authorName: 'Budi Santoso, S.Kom',
          authorId: 'sup-1',
          publishedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
          readBy: []
        }
      ];

      for (const ann of sampleAnnouncements) {
        await setDoc(doc(db, 'announcements', ann.id), ann);
      }

      const sampleSchedules: ScheduleItem[] = [
        {
          id: 'sch-1',
          title: 'Daily Standup & Review Tugas Tim SOC',
          description: 'Sinkronisasi harian penugasan analisis log sistem dan verifikasi insiden keamanan jaringan.',
          date: new Date().toISOString().split('T')[0],
          startTime: '08:30',
          endTime: '09:00',
          location: 'Ruang Rapat Utama Lt. 3 / Google Meet',
          createdBy: 'sup-1',
          creatorName: 'Budi Santoso, S.Kom',
          status: 'upcoming',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'sch-2',
          title: 'Hands-on Lab: Web Vulnerability Assessment',
          description: 'Praktik pengujian celah keamanan web aplikasi menggunakan tools terstandarisasi industri.',
          date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
          startTime: '13:30',
          endTime: '16:00',
          location: 'Cyber Security Lab PT One Data Security',
          createdBy: 'sup-1',
          creatorName: 'Budi Santoso, S.Kom',
          status: 'upcoming',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'sch-3',
          title: 'Bimbingan & Monitoring Akademik dengan Guru',
          description: 'Evaluasi mingguan progres jurnal harian dan kesiapan laporan akhir magang bersama guru pembimbing sekolah.',
          date: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
          startTime: '10:00',
          endTime: '11:30',
          location: 'Virtual Conference Room 2',
          createdBy: 'teach-1',
          creatorName: 'Dra. Nurhayati, M.Pd',
          status: 'upcoming',
          createdAt: new Date().toISOString(),
        }
      ];

      for (const sch of sampleSchedules) {
        await setDoc(doc(db, 'schedules', sch.id), sch);
      }

      // App Settings with rubric
      await setDoc(doc(db, 'appSettings', 'general'), {
        companyName: 'PT One Data Security',
        assessmentCriteria: DEFAULT_RUBRIC_CRITERIA.map(({ score, ...rest }) => rest),
        attendanceCheckInStart: '07:30',
        attendanceCheckInEnd: '09:00',
        attendanceCheckOutStart: '16:30',
        attendanceCheckOutEnd: '18:30',
        defaultQrExpirySeconds: 120,
        updatedAt: new Date().toISOString(),
      });

      // Initial Documentation seed linked to sch-1
      const docSnap = await getDocs(collection(db, 'documentation'));
      if (docSnap.empty) {
        const sampleDoc = {
          id: 'doc-seed-1',
          studentId: 'hafuza-sample-student',
          studentName: 'Muhammad Hafuza',
          studentEmail: 'hafuza@narmadi.com',
          scheduleId: 'sch-1',
          scheduleTitle: 'Daily Standup & Review Tugas Tim SOC',
          scheduleDate: new Date().toISOString().split('T')[0],
          title: 'Dokumentasi Standup & Briefing Tim Keamanan Siber SOC',
          description: 'Mengikuti sesi sinkronisasi harian bersama mentor industri PT One Data Security membahas penanganan alert dan log anomali jaringan.',
          activityDate: new Date().toISOString().split('T')[0],
          fileUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&auto=format&fit=crop&q=80',
          fileName: 'soc_briefing_standup.jpg',
          fileSize: 1854200,
          files: [
            {
              fileId: 'f-1',
              fileName: 'soc_briefing_standup.jpg',
              fileUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&auto=format&fit=crop&q=80',
              storagePath: 'documentation/seed/sch-1/soc_briefing.jpg',
              mimeType: 'image/jpeg',
              size: 1854200,
              uploadedAt: new Date().toISOString(),
            },
            {
              fileId: 'f-2',
              fileName: 'monitoring_dashboard_setup.jpg',
              fileUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
              storagePath: 'documentation/seed/sch-1/dashboard_setup.jpg',
              mimeType: 'image/jpeg',
              size: 1420100,
              uploadedAt: new Date().toISOString(),
            }
          ],
          status: 'published',
          uploadedBy: 'Muhammad Hafuza',
          uploadedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'documentation', sampleDoc.id), sampleDoc);
      }

      // Initial Journal seed linked to sch-1
      const jrnSnap = await getDocs(collection(db, 'journals'));
      if (jrnSnap.empty) {
        const todayStr = new Date().toISOString().split('T')[0];
        const sampleJournal = {
          id: 'jrn-seed-1',
          studentId: 'hafuza-sample-student',
          studentName: 'Muhammad Hafuza',
          studentEmail: 'hafuza@narmadi.com',
          scheduleId: 'sch-1',
          scheduleTitle: 'Daily Standup & Review Tugas Tim SOC',
          scheduleDate: todayStr,
          date: todayStr,
          title: 'Analisis Log SIEM & Penanganan Alert Keamanan Jaringan',
          startTime: '08:30',
          endTime: '17:00',
          description: 'Mengikuti daily standup tim SOC PT One Data Security dan melanjutkan analisis lalu lintas paket mencurigakan dari segmentasi DMZ.',
          tasks: 'Memfilter IP berbahaya menggunakan Suricata IDS, membuat query rule baru pada Wazuh SIEM, dan menyusun rekap mitigasi harian.',
          results: 'Berhasil mengisolasi 3 percobaan port scanning eksternal dan memblokir 12 IP penyerang pada rule perimeter firewall.',
          challenges: 'Banyak log false positive yang dipicu oleh aktivitas pemindaian berkala server backup internal.',
          solutions: 'Menambahkan subnet internal ke whitelist rule filter IDS untuk mengeliminasi false positive tanpa mengurangi visibilitas ancaman eksternal.',
          learnings: 'Memahami pentingnya tuning threshold alarm agar analis SOC tidak mengalami alert fatigue saat bertugas memantau sistem.',
          attachments: [
            {
              fileId: 'att-seed-1',
              fileName: 'wazuh_alerts_report.png',
              fileUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
              storagePath: 'journals/seed/sch-1/wazuh_alerts_report.png',
              mimeType: 'image/png',
              size: 890400,
              uploadedAt: new Date().toISOString(),
            }
          ],
          status: 'approved',
          feedback: 'Analisis yang sangat terstruktur dan solutif. Pertahankan ketelitian tuning alert dan dokumentasi rule teknisnya.',
          reviewFeedback: 'Analisis yang sangat terstruktur dan solutif. Pertahankan ketelitian tuning alert dan dokumentasi rule teknisnya.',
          reviewerName: 'Budi Santoso, S.Kom',
          reviewedBy: 'sup-1',
          reviewedAt: new Date().toISOString(),
          submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'journals', sampleJournal.id), sampleJournal);
      }

      console.log('Seed completed successfully.');
    }
  } catch (err) {
    console.warn('Initial seed skipped or permission denied:', err);
  }
}

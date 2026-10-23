/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, where, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase/config';
import { checkAndSeedInitialData } from './firebase/seed';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Sidebar, NavTab } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { DashboardView } from './components/DashboardView';
import { AttendanceView } from './components/AttendanceView';
import { JournalView } from './components/JournalView';
import { DocumentationView } from './components/DocumentationView';
import { AssessmentView } from './components/AssessmentView';
import { FinalReportView } from './components/FinalReportView';
import { ScheduleView } from './components/ScheduleView';
import { AnnouncementView } from './components/AnnouncementView';
import { ProfileView } from './components/ProfileView';
import { AdminStudentManagement } from './components/AdminStudentManagement';
import { AuthView } from './components/AuthView';
import { 
  JournalItem, 
  ScheduleItem, 
  AnnouncementItem, 
  AttendanceRecord, 
  NotificationItem, 
  RubricCriterion,
  DocumentationItem 
} from './types';
import { DEFAULT_RUBRIC_CRITERIA } from './firebase/seed';

function MainAppContent() {
  const { currentUser, profile, effectiveRole, loading } = useAuth();
  const { t } = useLanguage();

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [docTargetScheduleId, setDocTargetScheduleId] = useState<string | null>(null);
  const [journalTargetScheduleId, setJournalTargetScheduleId] = useState<string | null>(null);
  const [highlightScheduleId, setHighlightScheduleId] = useState<string | null>(null);

  const handleNavigateToDocWithSchedule = (scheduleId: string) => {
    setDocTargetScheduleId(scheduleId);
    setCurrentTab('documentation');
  };

  const handleNavigateToDocGallery = (scheduleId?: string) => {
    setDocTargetScheduleId(null);
    setCurrentTab('documentation');
  };

  const handleNavigateToJournalWithSchedule = (scheduleId: string) => {
    setJournalTargetScheduleId(scheduleId);
    setCurrentTab('journal');
  };

  const handleNavigateToSchedule = (scheduleId: string) => {
    setHighlightScheduleId(scheduleId);
    setCurrentTab('schedule');
  };

  // App-level realtime data for dashboard & navigation badges
  const [journals, setJournals] = useState<JournalItem[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [documentations, setDocumentations] = useState<DocumentationItem[]>([]);

  // Seed on boot
  useEffect(() => {
    checkAndSeedInitialData();
  }, []);

  // Realtime listeners
  useEffect(() => {
    if (!currentUser) return;

    // Journals listener
    const isStaff = effectiveRole === 'supervisor' || effectiveRole === 'teacher' || effectiveRole === 'admin';
    const journalQuery = isStaff
      ? query(collection(db, 'journals'), orderBy('date', 'desc'))
      : query(collection(db, 'journals'), where('studentId', '==', currentUser.uid));

    const unsubJournals = onSnapshot(journalQuery, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalItem));
      docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setJournals(docs);
    }, (e) => console.warn('Journals stream:', e));

    // Schedules listener
    const unsubSchedules = onSnapshot(query(collection(db, 'schedules'), orderBy('date', 'asc')), (snap) => {
      setSchedules(snap.docs.map(d => ({ id: d.id, ...d.data() } as ScheduleItem)));
    }, (e) => console.warn('Schedules stream:', e));

    // Announcements listener
    const unsubAnn = onSnapshot(query(collection(db, 'announcements'), orderBy('publishedAt', 'desc')), (snap) => {
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() } as AnnouncementItem)));
    }, (e) => console.warn('Announcements stream:', e));

    // Attendance listener
    const attQuery = isStaff
      ? query(collection(db, 'attendanceRecords'), orderBy('timestamp', 'desc'))
      : query(collection(db, 'attendanceRecords'), where('studentId', '==', currentUser.uid));

    const unsubAttendance = onSnapshot(attQuery, (snap) => {
      setAttendanceRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
    }, (e) => console.warn('Attendance stream:', e));

    // Notifications listener
    const unsubNotif = onSnapshot(
      query(collection(db, 'notifications'), where('userId', '==', currentUser.uid)), 
      (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as NotificationItem));
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(items);
      }, 
      (e) => console.warn('Notifications stream:', e)
    );

    // Documentation listener
    const docQuery = isStaff
      ? query(collection(db, 'documentation'), orderBy('uploadedAt', 'desc'))
      : query(collection(db, 'documentation'), where('studentId', '==', currentUser.uid));

    const unsubDoc = onSnapshot(docQuery, (snap) => {
      setDocumentations(snap.docs.map(d => ({ id: d.id, ...d.data() } as DocumentationItem)));
    }, (e) => console.warn('Doc stream in App:', e));

    return () => {
      unsubJournals();
      unsubSchedules();
      unsubAnn();
      unsubAttendance();
      unsubNotif();
      unsubDoc();
    };
  }, [currentUser, effectiveRole]);

  // Mark all notifications read
  const handleMarkAllNotificationsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.read).forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (e) {
      console.warn('Mark notifications error:', e);
    }
  };

  // Search items aggregation for topbar search
  const searchItems = [
    ...schedules.map(s => ({ id: s.id, title: s.title, category: 'Jadwal Magang', tab: 'schedule' as NavTab })),
    ...documentations.map(d => ({ id: d.id, title: d.title, category: 'Dokumentasi Kegiatan', tab: 'documentation' as NavTab })),
    ...journals.map(j => ({ id: j.id, title: j.title, category: 'Jurnal Harian', tab: 'journal' as NavTab })),
    ...announcements.map(a => ({ id: a.id, title: a.title, category: 'Pengumuman', tab: 'announcements' as NavTab })),
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F6F4] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#061F16] text-[#B7F500] flex items-center justify-center animate-spin">
          <div className="w-6 h-6 border-2 border-[#B7F500] border-t-transparent rounded-full" />
        </div>
        <p className="text-xs font-bold text-[#111A16] uppercase tracking-wider">
          Memuat Sistem Magang PT One Data Security...
        </p>
      </div>
    );
  }

  // If unauthenticated or pending approval, show auth screen
  if (!currentUser || profile?.status === 'pending') {
    return <AuthView />;
  }

  const pendingJournalsCount = journals.filter(j => j.status === 'submitted').length;

  return (
    <div className="min-h-screen bg-[#F3F6F4] flex">
      {/* Persistent Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        pendingJournalsCount={pendingJournalsCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        <TopNavbar
          onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
          onNavigate={setCurrentTab}
          onQuickAction={
            effectiveRole === 'student'
              ? () => setCurrentTab('attendance')
              : () => setCurrentTab('schedule')
          }
          quickActionLabel={effectiveRole === 'student' ? 'Presensi QR' : 'Tambah Agenda'}
          notifications={notifications}
          onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          searchItems={searchItems}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigate={setCurrentTab}
              journals={journals}
              schedules={schedules}
              announcements={announcements}
              attendanceRecords={attendanceRecords}
            />
          )}

          {currentTab === 'attendance' && <AttendanceView />}

          {currentTab === 'journal' && (
            <JournalView
              initialSelectedScheduleId={journalTargetScheduleId}
              onNavigateToSchedule={handleNavigateToSchedule}
              onClearInitialScheduleId={() => setJournalTargetScheduleId(null)}
            />
          )}

          {currentTab === 'documentation' && (
            <DocumentationView
              initialSelectedScheduleId={docTargetScheduleId}
              onNavigateToSchedule={handleNavigateToSchedule}
              onClearInitialScheduleId={() => setDocTargetScheduleId(null)}
            />
          )}

          {currentTab === 'assessment' && <AssessmentView />}

          {currentTab === 'finalReport' && <FinalReportView />}

          {currentTab === 'schedule' && (
            <ScheduleView
              onNavigateToDocumentationWithSchedule={handleNavigateToDocWithSchedule}
              onNavigateToDocumentationGallery={handleNavigateToDocGallery}
              onNavigateToJournalWithSchedule={handleNavigateToJournalWithSchedule}
              highlightScheduleId={highlightScheduleId}
            />
          )}

          {currentTab === 'announcements' && <AnnouncementView />}

          {currentTab === 'studentManagement' && <AdminStudentManagement />}

          {currentTab === 'profile' && <ProfileView />}

          {currentTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold tracking-tight text-[#111A16]">
                {t.nav.settings}
              </h2>
              <div className="bg-white rounded-3xl p-6 border border-[#E6ECE8] shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-[#111A16]">
                  Bobot Rubrik Penilaian Akhir (PT One Data Security)
                </h3>
                <p className="text-xs text-[#718078]">
                  Kriteria penilaian kompetensi industri yang digunakan oleh pembimbing saat mengevaluasi siswa.
                </p>
                <div className="space-y-2">
                  {DEFAULT_RUBRIC_CRITERIA.map(c => (
                    <div key={c.id} className="p-3 rounded-xl bg-[#F3F6F4] flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#111A16] block">{c.name}</span>
                        <span className="text-[10px] text-[#718078]">{c.description}</span>
                      </div>
                      <span className="font-extrabold text-[#0B3325] px-2.5 py-1 rounded-full bg-white border border-[#E6ECE8]">
                        {c.weight}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}

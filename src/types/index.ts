export type UserRole = 'student' | 'supervisor' | 'teacher' | 'admin';
export type UserStatus = 'pending' | 'active' | 'rejected' | 'suspended';
export type AppLanguage = 'id' | 'en';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  photoURL?: string;
  phone?: string;
  schoolOrUniv?: string;
  studentClass?: string;
  birthPlace?: string;
  birthDate?: string;
  major?: 'IPA' | 'IPS' | 'Teknik Komputer / TI' | 'Rekayasa Perangkat Lunak' | 'Lainnya';
  companyName?: string;
  internshipStartDate?: string;
  internshipEndDate?: string;
  supervisorId?: string;
  supervisorName?: string;
  teacherId?: string;
  teacherName?: string;
  cvUrl?: string;
  cvFileName?: string;
  preferredLanguage?: AppLanguage;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScheduleItem {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location: string;
  assignedStudentIds?: string[];
  createdBy: string;
  creatorName?: string;
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
  createdAt?: string;
}

export type AttendancePhase = 'check_in' | 'check_out';
export type AttendanceStatus = 'present' | 'late' | 'excused' | 'incomplete';

export interface AttendanceSession {
  id: string;
  code: string;
  phase: AttendancePhase;
  date: string;
  startTime: string;
  expiresAt: string;
  durationSeconds: number;
  createdBy: string;
  creatorName?: string;
  isActive: boolean;
  token: string;
  targetStudentIds?: string[];
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  sessionId: string;
  phase: AttendancePhase;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO string or Asia/Jakarta local
  status: AttendanceStatus;
  notes?: string;
  verifiedBy?: string;
}

export type JournalStatus = 'draft' | 'submitted' | 'under_review' | 'revision_requested' | 'approved';

export interface JournalAttachment {
  fileId: string;
  fileName: string;
  fileUrl: string;
  storagePath: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface JournalItem {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  scheduleId?: string;
  scheduleTitle?: string;
  scheduleDate?: string;
  date: string; // YYYY-MM-DD
  title: string;
  startTime?: string;
  endTime?: string;
  description: string;
  tasks: string;
  results: string;
  challenges: string;
  solutions?: string;
  learnings: string;
  attachments?: JournalAttachment[];
  status: JournalStatus;
  feedback?: string;
  reviewFeedback?: string;
  supervisorUid?: string;
  reviewedBy?: string;
  reviewerName?: string;
  reviewedAt?: string;
  submittedAt?: string;
  updatedAt?: string;
}

export interface DocumentationFile {
  fileId: string;
  fileName: string;
  fileUrl: string;
  storagePath: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface DocumentationItem {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  scheduleId?: string;
  scheduleTitle?: string;
  scheduleDate?: string;
  title: string;
  description: string;
  activityDate: string;
  fileUrl: string; // primary image thumbnail/preview
  fileName: string;
  fileSize?: number;
  files?: DocumentationFile[];
  status?: 'draft' | 'published';
  journalId?: string;
  uploadedBy?: string;
  uploadedAt: string;
  updatedAt?: string;
}

export interface RubricCriterion {
  id: string;
  name: string;
  nameEn: string;
  weight: number; // percentage (e.g. 15 for 15%)
  score: number; // 1 to 5
  maxScore: number; // 5
  description?: string;
}

export type AssessmentStatus = 'draft' | 'submitted_to_teacher' | 'correction_requested' | 'verified' | 'published';

export interface AssessmentItem {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  studentClass?: string;
  studentMajor?: string;
  companyName: string;
  internshipPeriod: string;
  criteriaScores: RubricCriterion[];
  finalScore: number; // 0 - 100
  supervisorComments: string;
  supervisorId: string;
  supervisorName: string;
  supervisorSubmittedAt?: string;
  teacherNotes?: string;
  teacherId?: string;
  teacherName?: string;
  teacherVerifiedAt?: string;
  status: AssessmentStatus;
  publishedAt?: string;
  pdfUrl?: string;
}

export type FinalReportStatus = 'not_submitted' | 'submitted' | 'under_review' | 'revision_requested' | 'approved' | 'finalized';

export interface FinalReportItem {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  title: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  version: number;
  status: FinalReportStatus;
  teacherFeedback?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submittedAt: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  targetAudience: 'all' | 'student' | 'supervisor' | 'teacher';
  authorName: string;
  authorId: string;
  publishedAt: string;
  readBy?: string[];
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'action';
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface AppSettings {
  companyName: string;
  assessmentCriteria: Omit<RubricCriterion, 'score'>[];
  attendanceCheckInStart: string;
  attendanceCheckInEnd: string;
  attendanceCheckOutStart: string;
  attendanceCheckOutEnd: string;
  defaultQrExpirySeconds: number;
  updatedAt?: string;
}

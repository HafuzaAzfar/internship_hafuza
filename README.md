# internship application hafuza — PT One Data Security

A centralized, responsive, full-stack internship management web application engineered for **PT One Data Security** to manage student profiles, internship schedules, digital attendance using dynamic QR codes, daily journals, activity documentation, performance assessments, final internship reports, and company announcements.

---

## 1. Project Overview

- **Application Name**: `internship application hafuza`
- **Organization**: PT One Data Security
- **Target Users**:
  1. **Student (Peserta Magang)**: Digital check-in/out via dynamic QR codes, daily learning journals, documentation gallery, final reports, and official assessment download.
  2. **Company Supervisor (Pembimbing Industri)**: Attendance session generation, journal reviews and revision requests, performance rubric evaluations.
  3. **Teacher / Academic Supervisor (Guru Pembimbing)**: Academic monitoring, final report approvals, evaluation rubric verification.
  4. **Administrator**: Account approvals, mentor and school assignments, announcement broadcasts, and audit controls.
- **Default Timezone**: `Asia/Jakarta` (WIB, UTC+7).
- **Languages**: Bilingual support — default Bahasa Indonesia (`id`) with instant English (`en`) switching.
- **Visual Design Identity**: Inspired by the high-contrast Spark Admin dashboard with a dark forest green sidebar (`#061F16`), lime accent (`#B7F500`), clean white cards (`#FFFFFF`), and soft neutral background (`#F3F6F4`).

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Motion, Recharts.
- **Authentication**: Firebase Authentication (Google Sign-In popup & Email/Password).
- **Database**: Google Cloud Firestore (Enterprise).
- **Storage**: Firebase Cloud Storage for CVs, documentation images, and final reports.
- **QR Code Engine**: `qrcode` (Dynamic token generation) & `html5-qrcode` (Live camera scanner with manual token fallback).
- **Document Generation**: `jspdf` for official downloadable assessment certificates.
- **Build System**: Vite 8 with `@vitejs/plugin-react` and `@tailwindcss/vite`.

---

## 3. Local Development Setup

### Prerequisites
- Node.js 20+ and npm 10+
- Modern web browser with camera permissions enabled (for QR scanner)

### Installation
```bash
# Clone the repository
git clone https://github.com/hafuza/internship-application-hafuza.git
cd internship-application-hafuza

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be accessible at `http://localhost:3000`.

---

## 4. Required Environment Variables

Refer to `.env.example`:
```env
# GEMINI_API_KEY: Optional runtime AI secret
GEMINI_API_KEY="your-gemini-api-key"

# APP_URL: Base URL of the hosted application
APP_URL="http://localhost:3000"
```

Firebase credentials are kept in `firebase-applet-config.json` with restricted browser-safe API keys.

---

## 5. Firebase Project Configuration

The application is connected to the provisioned Google Cloud project `gen-lang-client-0786994978`:
- **Auth Domain**: `gen-lang-client-0786994978.firebaseapp.com`
- **Firestore Database ID**: `ai-studio-e08852e2-6c1e-4ad1-b9ae-cf90d69201ee`
- **Storage Bucket**: `gen-lang-client-0786994978.firebasestorage.app`

---

## 6. Authentication Provider Setup

1. **Google Sign-In**: Configured via OAuth client ID `478345439525-7vuosphb76a6ro2tlcph9c4nlr206a2o.apps.googleusercontent.com` using popup authentication.
2. **Email & Password**: Enabled with automatic pending approval status for newly registered students.

---

## 7. Cloud Firestore Setup

Logical collections defined in `firebase-blueprint.json`:
- `users`: User profiles with roles (`student`, `supervisor`, `teacher`, `admin`) and statuses.
- `schedules`: Scheduled sessions, technical labs, and mentoring meetings.
- `attendanceSessions`: Dynamic QR tokens with TTL countdowns and check-in/out phases.
- `attendanceRecords`: Verified student attendance entries with WIB timestamps.
- `journals`: Daily learning logs with supervisor revision and approval workflows.
- `documentation`: Photo gallery artifacts and task documentation.
- `assessments`: 8-criterion competency rubrics (0–100 weighted scale).
- `finalReports`: Student PDF submissions and teacher academic verification.
- `announcements`: Corporate notices with priority ratings (Urgent, High, Normal).
- `notifications`: Real-time user notification feed.
- `appSettings`: Corporate metadata and rubric weight configurations.

---

## 8. Cloud Storage Setup

File storage buckets partition private documents:
- Profile photos: `/profile-photos/{uid}/...` (max 5MB)
- CV documents: `/cvs/{uid}/...` (max 10MB)
- Activity documentation: `/documentation/{uid}/...` (max 10MB)
- Final reports: `/final-reports/{uid}/...` (max 20MB)

---

## 9. Security Rules Deployment

Security rules are codified in `firestore.rules` and enforced via `rules_version = '2'`.
- Access is restricted by default (`allow read, write: if false;`).
- Roles and authorization are verified against authenticated sessions and database records.
- Rules were deployed directly via `DeployRules` RPC to Cloud Firestore.

---

## 10. First Administrator Setup

The initial bootstrap administrator is linked to:
- **Email**: `hafuza@narmadi.com`
- Upon authentication, this email is automatically recognized as `admin` with `active` status and added to the privileged `/admins` collection.
- Administrators can preview any role (`student`, `supervisor`, `teacher`, `admin`) directly from the profile dropdown menu for rapid testing.

---

## 11. GitHub Synchronization

To synchronize this repository to GitHub:
```bash
git init
git add .
git commit -m "feat: initial release of internship application hafuza"
git branch -M main
git remote add origin https://github.com/hafuza/internship-application-hafuza.git
git push -u origin main
```

---

## 12. Testing & Verification

The following key workflows have been verified:
1. **Dynamic QR Attendance**: Generating a time-limited QR token, validating check-in/out phases, recording Asia/Jakarta timestamps, and enforcing duplicate prevention.
2. **Daily Journals**: Creating drafts, submitting entries, supervisor approvals, and revision requests with comments.
3. **Activity Documentation & Schedule Integration**: Bi-directional linkage between official internship schedules (`schedules`) and documentation (`documentation`). Multiple photo uploads stored in Firebase Cloud Storage (`documentation/{uid}/{scheduleId}/{docId}/...`), interactive lightbox with photo navigation, and instant schedule lookup.
4. **Assessment Rubric**: Evaluating students across 8 criteria (100% total weight), calculating normalized scores, verifying academic teacher notes, and publishing results.
5. **Official PDF Generation**: Exporting formatted PDF evaluation sheets with corporate headers and signatures.
6. **Role-Based Views**: Validating student, supervisor, teacher, and administrator dashboard layouts.
7. **Bilingual Switching**: Instant switching between Bahasa Indonesia and English.

---

## 13. Deployment

Build the optimized web bundle:
```bash
npm run build
```
Static artifacts are output to the `dist/` directory, ready for hosting on Cloud Run, Firebase Hosting, or Vercel.

---

## 14. Support & Maintenance

Developed for **PT One Data Security**. For inquiries, contact `support@onedatasecurity.id` or `hafuza@narmadi.com`.

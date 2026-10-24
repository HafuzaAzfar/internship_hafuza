import React, { useState } from 'react';
import { 
  User, 
  Camera, 
  Upload, 
  FileText, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  Calendar, 
  Building, 
  Mail, 
  Phone, 
  Award,
  Save,
  Download,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { uploadSingleFile } from '../firebase/storageHelper';

export const ProfileView: React.FC = () => {
  const { profile, effectiveRole, updateUserProfile } = useAuth();
  const { t } = useLanguage();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [schoolOrUniv, setSchoolOrUniv] = useState(profile?.schoolOrUniv || '');
  const [studentClass, setStudentClass] = useState(profile?.studentClass || '');
  const [birthPlace, setBirthPlace] = useState(profile?.birthPlace || '');
  const [birthDate, setBirthDate] = useState(profile?.birthDate || '');
  const [major, setMajor] = useState(profile?.major || 'Rekayasa Perangkat Lunak');

  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [cvUrl, setCvUrl] = useState(profile?.cvUrl || '');
  const [cvFileName, setCvFileName] = useState(profile?.cvFileName || '');

  const [saving, setSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cvMsg, setCvMsg] = useState('');

  // Handle Photo upload to Cloud Storage
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.uid) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran foto profil maksimal 5MB.');
      return;
    }

    try {
      setUploadStatus('Mengunggah foto profil...');
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `profilePhotos/${profile.uid}/${Date.now()}_${cleanName}`;
      const result = await uploadSingleFile(file, storagePath, (pct, txt) => {
        setUploadStatus(txt);
      });
      setPhotoURL(result.url);
      setUploadStatus(null);
    } catch (err: any) {
      console.error('Photo upload failed:', err);
      setUploadStatus(null);
      setErrorMsg(`Gagal mengunggah foto profil: ${err.message || 'Kesalahan penyimpanan'}`);
    }
  };

  // Handle CV Upload to Cloud Storage
  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.uid) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Ukuran file CV maksimal 10MB.');
      return;
    }

    try {
      setUploadStatus('Mengunggah berkas CV...');
      setCvFileName(file.name);
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `userCvs/${profile.uid}/${Date.now()}_${cleanName}`;
      const result = await uploadSingleFile(file, storagePath, (pct, txt) => {
        setUploadStatus(txt);
      });
      setCvUrl(result.url);
      setUploadStatus(null);
      setCvMsg('CV berhasil diunggah. Klik Simpan Perubahan Profil untuk menyimpan.');
    } catch (err: any) {
      console.error('CV upload failed:', err);
      setUploadStatus(null);
      setErrorMsg(`Gagal mengunggah CV: ${err.message || 'Kesalahan penyimpanan'}`);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(false);
    setErrorMsg(null);
    try {
      await updateUserProfile({
        displayName: displayName.trim(),
        phone: phone.trim(),
        schoolOrUniv: schoolOrUniv.trim(),
        studentClass: studentClass.trim(),
        birthPlace: birthPlace.trim(),
        birthDate: birthDate.trim(),
        major: major as any,
        photoURL,
        cvUrl,
        cvFileName,
      });
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3500);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setErrorMsg(`Gagal menyimpan perubahan profil: ${err?.message || 'Periksa koneksi Anda'}`);
    } finally {
      setSaving(false);
    }
  };

  const downloadCv = () => {
    if (!cvUrl) return;
    const a = document.createElement('a');
    a.href = cvUrl;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.download = cvFileName || 'Curriculum_Vitae.pdf';
    a.click();
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#111A16]">
            {t.profile.title}
          </h2>
          <p className="text-xs text-[#718078] mt-0.5">
            {t.profile.subtitle}
          </p>
        </div>

        {successMsg && (
          <div className="px-4 py-2 rounded-full bg-emerald-50 text-[#16A34A] text-xs font-semibold flex items-center gap-2 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4" />
            <span>Perubahan berhasil disimpan!</span>
          </div>
        )}

        {errorMsg && (
          <div className="px-4 py-2 rounded-2xl bg-red-50 text-red-700 text-xs font-medium flex items-center gap-2 border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {uploadStatus && (
          <div className="px-4 py-2 rounded-full bg-emerald-50 text-[#0B3325] text-xs font-bold flex items-center gap-2 border border-emerald-200 animate-pulse">
            <Upload className="w-3.5 h-3.5 text-[#16A34A]" />
            <span>{uploadStatus}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Top Profile Card */}
        <div className="bg-white rounded-3xl p-6 border border-[#E6ECE8] shadow-2xs flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            {photoURL ? (
              <img
                src={photoURL}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-4 border-[#0B3325]/10"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[#061F16] text-[#B7F500] font-bold text-2xl flex items-center justify-center">
                {displayName.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <label className="absolute bottom-0 right-0 p-2 rounded-full bg-[#0B3325] text-white hover:bg-[#102F23] cursor-pointer shadow-md transition-all">
              <Camera className="w-4 h-4 text-[#B7F500]" />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="text-center sm:text-left flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h3 className="text-lg font-bold text-[#111A16] truncate">
                {profile?.displayName}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0B3325] text-[#B7F500] uppercase">
                {effectiveRole}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#16A34A] border border-emerald-200 uppercase">
                {profile?.status || 'active'}
              </span>
            </div>
            <p className="text-xs text-[#718078]">{profile?.email}</p>
            <p className="text-[11px] text-emerald-800 font-medium mt-1 flex items-center justify-center sm:justify-start gap-1">
              <Building className="w-3.5 h-3.5" />
              {profile?.companyName || 'PT One Data Security'}
            </p>
          </div>
        </div>

        {/* 2 Column Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Editable Personal Info */}
          <div className="bg-white rounded-3xl p-6 border border-[#E6ECE8] shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-[#111A16] border-b border-[#E6ECE8] pb-3">
              {t.profile.personalInfo}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#111A16] mb-1">
                  {t.profile.fullName}
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#111A16] mb-1">
                  {t.profile.email} (Firebase Auth)
                </label>
                <input
                  type="email"
                  disabled
                  value={profile?.email || ''}
                  className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-gray-100 text-[#718078] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-[#111A16] mb-1">
                  {t.profile.phone}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812-3456-7890"
                  className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#111A16] mb-1">
                    Tempat Lahir
                  </label>
                  <input
                    type="text"
                    value={birthPlace}
                    onChange={(e) => setBirthPlace(e.target.value)}
                    placeholder="Jakarta"
                    className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#111A16] mb-1">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#111A16] mb-1">
                    {t.profile.studentClass}
                  </label>
                  <input
                    type="text"
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    placeholder="XII RPL 1"
                    className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#111A16] mb-1">
                    {t.profile.major}
                  </label>
                  <select
                    value={major}
                    onChange={(e) => setMajor(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                  >
                    <option value="Rekayasa Perangkat Lunak">Rekayasa Perangkat Lunak</option>
                    <option value="Teknik Komputer / TI">Teknik Komputer / TI</option>
                    <option value="IPA">IPA</option>
                    <option value="IPS">IPS</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#111A16] mb-1">
                  {t.profile.schoolOrUniv}
                </label>
                <input
                  type="text"
                  value={schoolOrUniv}
                  onChange={(e) => setSchoolOrUniv(e.target.value)}
                  placeholder="SMK Negeri 1 Jakarta"
                  className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
                />
              </div>
            </div>
          </div>

          {/* Right: Academic Assignments & CV Upload */}
          <div className="space-y-6">
            {/* Protected Academic Assignments Box */}
            <div className="bg-white rounded-3xl p-6 border border-[#E6ECE8] shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E6ECE8] pb-3">
                <h3 className="text-sm font-bold text-[#111A16]">
                  {t.profile.academicInfo}
                </h3>
                <span className="text-[10px] font-semibold text-[#718078] flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#718078]" />
                  Ditetapkan Administrator
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-[#F3F6F4]/70 border border-[#E6ECE8]">
                  <span className="text-[10px] uppercase font-bold text-[#718078] block">
                    {t.profile.supervisor}
                  </span>
                  <p className="font-bold text-[#111A16] mt-0.5">
                    {profile?.supervisorName || 'Budi Santoso, S.Kom (PT One Data Security)'}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-[#F3F6F4]/70 border border-[#E6ECE8]">
                  <span className="text-[10px] uppercase font-bold text-[#718078] block">
                    {t.profile.teacher}
                  </span>
                  <p className="font-bold text-[#111A16] mt-0.5">
                    {profile?.teacherName || 'Dra. Nurhayati, M.Pd'}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-[#F3F6F4]/70 border border-[#E6ECE8]">
                  <span className="text-[10px] uppercase font-bold text-[#718078] block">
                    {t.profile.internshipPeriod}
                  </span>
                  <p className="font-bold text-[#111A16] mt-0.5">
                    {profile?.internshipStartDate || '2026-08-01'} s/d {profile?.internshipEndDate || '2026-12-31'}
                  </p>
                </div>
              </div>
            </div>

            {/* CV Upload Card */}
            <div className="bg-white rounded-3xl p-6 border border-[#E6ECE8] shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E6ECE8] pb-3">
                <h3 className="text-sm font-bold text-[#111A16]">
                  {t.profile.cvDocument}
                </h3>
                <span className="text-[10px] font-semibold text-[#718078]">
                  PDF / DOCX (Maks 10MB)
                </span>
              </div>

              {cvMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs">
                  {cvMsg}
                </div>
              )}

              {cvFileName ? (
                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#16A34A]" />
                    <div>
                      <span className="text-xs font-bold text-[#111A16] block">{cvFileName}</span>
                      <span className="text-[10px] text-[#718078]">Tersimpan di portal</span>
                    </div>
                  </div>
                  {cvUrl && (
                    <button
                      type="button"
                      onClick={downloadCv}
                      className="p-1.5 rounded-lg text-[#0B3325] hover:bg-emerald-100"
                      title="Unduh CV"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-4 border-2 border-dashed border-[#E6ECE8] rounded-2xl text-center text-xs text-[#718078]">
                  Belum ada dokumen CV yang diunggah.
                </div>
              )}

              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-[#F3F6F4] text-[#111A16] hover:bg-[#E6ECE8] cursor-pointer transition-all">
                <Upload className="w-3.5 h-3.5 text-[#0B3325]" />
                <span>{t.profile.uploadCv}</span>
                <input
                  type="file"
                  accept="application/pdf,.docx"
                  onChange={handleCvUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Save Changes Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-full text-xs font-bold bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23] flex items-center gap-2 shadow-xs active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : t.profile.saveChanges}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

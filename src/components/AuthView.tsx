import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  LogOut,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const AuthView: React.FC = () => {
  const { 
    currentUser, 
    profile, 
    loginWithGoogle, 
    loginWithEmail, 
    registerWithEmail, 
    logout, 
    resetPassword,
    refreshProfile 
  } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

  const copyHostToClipboard = () => {
    navigator.clipboard.writeText(currentHost);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2500);
  };

  // If user is authenticated but status is pending approval
  if (currentUser && profile?.status === 'pending') {
    return (
      <div className="min-h-screen bg-[#F3F6F4] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-[#E6ECE8] shadow-xl text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#111A16]">
              {language === 'en' ? 'Account Pending Approval' : 'Akun Menunggu Persetujuan'}
            </h2>
            <p className="text-xs text-[#718078] mt-2 leading-relaxed">
              {language === 'en' ? (
                <>Hello, <strong className="text-[#111A16]">{profile.displayName || 'Internship Student'}</strong>. Your internship account at <strong>PT One Data Security</strong> has been created and is currently awaiting administrator verification and approval.</>
              ) : (
                <>Halo, <strong className="text-[#111A16]">{profile.displayName || 'Peserta Magang'}</strong>. Pendaftaran akun magang Anda di <strong>PT One Data Security</strong> telah berhasil dibuat dan saat ini sedang menunggu verifikasi serta persetujuan dari Administrator.</>
              )}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F3F6F4] border border-[#E6ECE8] text-xs text-left space-y-2 text-[#718078]">
            <div className="flex justify-between items-center">
              <span>{language === 'en' ? 'Email:' : 'Email:'}</span>
              <strong className="text-[#111A16] font-mono text-[11px] truncate max-w-[200px]">{profile.email}</strong>
            </div>
            <div className="flex justify-between items-center">
              <span>{language === 'en' ? 'Role:' : 'Peran:'}</span>
              <span className="font-semibold text-emerald-800 uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-[10px]">
                {language === 'en' ? 'Student' : 'Peserta Magang'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>{language === 'en' ? 'Approval Status:' : 'Status Persetujuan:'}</span>
              <span className="font-bold text-amber-700 px-2 py-0.5 rounded-md bg-amber-100 text-[10px]">
                {language === 'en' ? 'Pending Approval' : 'Menunggu Verifikasi'}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-[#E6ECE8] text-[10px]">
              <span>Perusahaan:</span>
              <span className="font-medium text-[#111A16]">PT One Data Security</span>
            </div>
          </div>

          <p className="text-[11px] text-[#718078] leading-tight">
            {language === 'en' 
              ? 'Access to schedule, attendance, daily journal, and other internship features will be unlocked once approved.'
              : 'Akses ke jadwal, presensi, jurnal harian, dan fitur magang lainnya akan otomatis terbuka setelah akun disetujui.'}
          </p>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => refreshProfile()}
              className="w-full py-2.5 rounded-full text-xs font-bold bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23] flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'Check Approval Status' : 'Periksa Status Persetujuan'}</span>
            </button>

            <button
              onClick={() => logout()}
              className="w-full py-2 rounded-full text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center justify-center gap-1.5 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'Sign Out' : 'Keluar dari Akun'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setUnauthorizedDomain(null);

    // Client-side validations
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMsg(language === 'en' ? 'Please enter a valid email address.' : 'Format alamat email tidak valid.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg(language === 'en' ? 'Password must be at least 6 characters.' : 'Kata sandi minimal 6 karakter.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim() || name.trim().length < 2) {
        setErrorMsg(language === 'en' ? 'Please enter your full name.' : 'Nama lengkap wajib diisi (minimal 2 karakter).');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg(language === 'en' ? 'Password confirmation does not match.' : 'Konfirmasi kata sandi tidak cocok.');
        return;
      }
      if (!agreeTerms) {
        setErrorMsg(language === 'en' ? 'You must agree to the terms and privacy policy to register.' : 'Anda harus menyetujui syarat & ketentuan magang untuk mendaftar.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(cleanEmail, password);
      } else {
        await registerWithEmail(cleanEmail, password, name.trim());
      }
    } catch (err: any) {
      console.error('Auth submit error:', err);
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setErrorMsg(language === 'en' ? 'Incorrect email or password.' : 'Email atau kata sandi tidak sesuai.');
      } else if (code === 'auth/email-already-in-use') {
        setErrorMsg(language === 'en' ? 'This email is already registered. Please log in.' : 'Alamat email ini sudah terdaftar. Silakan masuk menggunakan kata sandi Anda.');
      } else if (code === 'auth/weak-password') {
        setErrorMsg(language === 'en' ? 'Password is too weak. Must be at least 6 characters.' : 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.');
      } else if (code === 'auth/invalid-email') {
        setErrorMsg(language === 'en' ? 'Invalid email format.' : 'Format alamat email tidak valid.');
      } else if (code === 'auth/user-disabled') {
        setErrorMsg(language === 'en' ? 'This account has been disabled by administrator.' : 'Akun ini telah dinonaktifkan oleh administrator.');
      } else if (code === 'auth/too-many-requests') {
        setErrorMsg(language === 'en' ? 'Too many failed attempts. Please try again later.' : 'Terlalu banyak percobaan gagal. Silakan coba kembali beberapa saat lagi.');
      } else if (code === 'auth/network-request-failed') {
        setErrorMsg(language === 'en' ? 'Network issue. Check your internet connection.' : 'Terjadi kendala jaringan. Periksa koneksi internet Anda dan coba kembali.');
      } else {
        setErrorMsg(err.message || (language === 'en' ? 'Authentication failed. Please verify credentials.' : 'Gagal memproses autentikasi. Silakan periksa kredensial Anda.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setUnauthorizedDomain(null);
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google Sign In:', err);
      const code = err?.code || '';
      if (code === 'auth/unauthorized-domain' || err?.hostname) {
        setUnauthorizedDomain(currentHost);
        setErrorMsg(language === 'en' 
          ? `Domain "${currentHost}" is not authorized in Firebase Authentication.`
          : `Domain "${currentHost}" belum didaftarkan di Firebase Authentication Authorized Domains.`);
      } else if (code === 'auth/popup-closed-by-user') {
        setErrorMsg(language === 'en' ? 'Google sign-in was cancelled.' : 'Proses login Google dibatalkan.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg(language === 'en' ? 'Popup was blocked by browser. Redirecting...' : 'Jendela popup diblokir oleh peramban. Mengalihkan ke halaman login Google...');
      } else if (code === 'auth/network-request-failed') {
        setErrorMsg(language === 'en' ? 'Network connection error with Google servers.' : 'Terjadi kendala jaringan saat menghubungi server Google. Periksa koneksi Anda.');
      } else {
        setErrorMsg(err?.message || (language === 'en' ? 'Failed to sign in with Google.' : 'Gagal masuk dengan Google.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    try {
      await resetPassword(forgotEmail.trim());
      setResetSent(true);
      setTimeout(() => {
        setShowForgotModal(false);
        setResetSent(false);
      }, 4000);
    } catch (err: any) {
      setErrorMsg(language === 'en' ? 'Failed to send reset link: ' + err.message : 'Gagal mengirim email reset kata sandi: ' + (err.message || 'Periksa kembali email Anda.'));
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F6F4] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      {/* Top bar with language switcher */}
      <div className="max-w-md mx-auto w-full flex justify-end mb-3">
        <button
          type="button"
          onClick={() => setLanguage(language === 'id' ? 'en' : 'id')}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E6ECE8] text-[11px] font-semibold text-[#111A16] hover:bg-[#F3F6F4] transition-all shadow-2xs"
          title="Ganti Bahasa / Switch Language"
        >
          <Globe className="w-3.5 h-3.5 text-[#0B3325]" />
          <span>{language === 'id' ? 'ID (Bahasa Indonesia)' : 'EN (English)'}</span>
        </button>
      </div>

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-[#061F16] text-[#B7F500] items-center justify-center shadow-lg shadow-[#0B3325]/10 border border-[#B7F500]/20 mb-1">
          <Sparkles className="w-7 h-7 text-[#B7F500]" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-[#111A16] capitalize">
          internship application hafuza
        </h1>
        <p className="text-xs font-semibold text-[#16A34A] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
          <span>PT One Data Security</span>
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-[#E6ECE8] shadow-xl space-y-5">
          {/* Welcome Heading per prompt requirement */}
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-[#111A16]">
              {mode === 'login' 
                ? (language === 'en' ? 'Welcome Back' : 'Selamat Datang Kembali')
                : (language === 'en' ? 'Create New Account' : 'Buat Akun Baru')}
            </h2>
            <p className="text-xs text-[#718078] leading-relaxed">
              {mode === 'login'
                ? (language === 'en' ? 'Sign in to continue your internship activity at PT One Data Security.' : 'Masuk untuk melanjutkan aktivitas magang Anda di PT One Data Security.')
                : (language === 'en' ? 'Register your student account to start using internship application hafuza.' : 'Daftarkan akun Anda untuk mulai menggunakan internship application hafuza.')}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#F3F6F4] text-xs font-bold text-[#718078]">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); setUnauthorizedDomain(null); }}
              className={`py-2 rounded-xl transition-all ${
                mode === 'login' ? 'bg-white text-[#111A16] shadow-xs' : 'hover:text-[#111A16]'
              }`}
            >
              {language === 'en' ? 'Login' : 'Masuk'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setErrorMsg(''); setUnauthorizedDomain(null); }}
              className={`py-2 rounded-xl transition-all ${
                mode === 'register' ? 'bg-white text-[#111A16] shadow-xs' : 'hover:text-[#111A16]'
              }`}
            >
              {language === 'en' ? 'Register' : 'Daftar Akun'}
            </button>
          </div>

          {/* Diagnostic Banner if Domain is Unauthorized on Vercel */}
          {unauthorizedDomain && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="flex items-start gap-2 font-bold text-amber-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>Konfigurasi Domain Diperlukan untuk Google Login</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Domain aplikasi <strong>{unauthorizedDomain}</strong> belum dimasukkan ke daftar Authorized Domains di Firebase Console.
              </p>
              <div className="p-2.5 rounded-xl bg-white border border-amber-200 flex items-center justify-between gap-2 text-[11px]">
                <code className="text-[#0B3325] font-mono font-bold truncate">{unauthorizedDomain}</code>
                <button
                  type="button"
                  onClick={copyHostToClipboard}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold flex items-center gap-1 shrink-0"
                >
                  {copiedDomain ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedDomain ? 'Disalin' : 'Salin Domain'}</span>
                </button>
              </div>
              <p className="text-[10px] text-amber-700">
                Langkah: Buka <strong>Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains</strong>, lalu klik <em>Add domain</em> dan tempel domain di atas.
              </p>
            </div>
          )}

          {/* General Error Banner */}
          {errorMsg && !unauthorizedDomain && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Google Sign-in Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 rounded-2xl border border-[#E6ECE8] bg-white hover:bg-[#F3F6F4] text-xs font-bold text-[#111A16] flex items-center justify-center gap-3 shadow-2xs transition-all active:scale-95 disabled:opacity-60"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{loading ? (language === 'en' ? 'Connecting...' : 'Menghubungkan...') : (language === 'en' ? 'Sign in with Google' : 'Masuk dengan Google')}</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#E6ECE8] w-full" />
            <span className="bg-white px-3 text-[11px] uppercase font-bold text-[#718078] absolute">
              {language === 'en' ? 'or with email' : 'atau dengan email'}
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
            {mode === 'register' && (
              <div>
                <label className="block font-bold text-[#111A16] mb-1">
                  {language === 'en' ? 'Full Name' : 'Nama Lengkap'}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#718078]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={language === 'en' ? 'e.g. Muhammad Hafuza' : 'Contoh: Muhammad Hafuza'}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4] focus:outline-none focus:border-[#0B3325] text-xs"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-bold text-[#111A16] mb-1">
                {language === 'en' ? 'Email Address' : 'Alamat Email'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#718078]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hafuza@narmadi.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4] focus:outline-none focus:border-[#0B3325] text-xs"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-[#111A16]">
                  {language === 'en' ? 'Password' : 'Kata Sandi'}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setForgotEmail(email); setShowForgotModal(true); }}
                    className="text-[11px] font-semibold text-[#16A34A] hover:underline"
                  >
                    {language === 'en' ? 'Forgot password?' : 'Lupa kata sandi?'}
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#718078]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4] focus:outline-none focus:border-[#0B3325] text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718078] hover:text-[#111A16]"
                  title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'register' && (
                <p className="text-[10px] text-[#718078] mt-1">
                  {language === 'en' ? 'Minimum 6 characters.' : 'Minimal 6 karakter.'}
                </p>
              )}
            </div>

            {mode === 'register' && (
              <div>
                <label className="block font-bold text-[#111A16] mb-1">
                  {language === 'en' ? 'Confirm Password' : 'Konfirmasi Kata Sandi'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#718078]" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-9 pr-10 py-2.5 rounded-xl border bg-[#F3F6F4] focus:outline-none text-xs ${
                      confirmPassword && confirmPassword !== password
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-[#E6ECE8] focus:border-[#0B3325]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718078] hover:text-[#111A16]"
                    title={showConfirmPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {language === 'en' ? 'Password does not match.' : 'Kata sandi tidak cocok.'}
                  </p>
                )}
                {confirmPassword && confirmPassword === password && (
                  <p className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>{language === 'en' ? 'Password matches.' : 'Kata sandi cocok.'}</span>
                  </p>
                )}
              </div>
            )}

            {mode === 'register' && (
              <div className="pt-1">
                <label className="flex items-start gap-2 text-[11px] text-[#718078] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="rounded border-[#E6ECE8] text-[#0B3325] focus:ring-[#0B3325] mt-0.5"
                  />
                  <span>
                    {language === 'en' ? (
                      <>I agree to the internship terms and data privacy policy of <strong>PT One Data Security</strong>.</>
                    ) : (
                      <>Saya menyetujui syarat & ketentuan magang serta kebijakan privasi data <strong>PT One Data Security</strong>.</>
                    )}
                  </span>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'register' && !agreeTerms)}
              className="w-full py-3 rounded-full text-xs font-bold bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23] flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all disabled:opacity-50"
            >
              <span>
                {loading 
                  ? (language === 'en' ? 'Processing...' : 'Memproses...') 
                  : mode === 'login' 
                    ? (language === 'en' ? 'Sign In' : 'Masuk') 
                    : (language === 'en' ? 'Register Account' : 'Daftar Akun')}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Toggle between Login and Register Prominent Links per requirement */}
          <div className="pt-2 text-center text-xs">
            {mode === 'login' ? (
              <p className="text-[#718078]">
                {language === 'en' ? 'Don\'t have an account? ' : 'Belum punya akun? '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setErrorMsg(''); setUnauthorizedDomain(null); }}
                  className="font-bold text-[#0B3325] hover:underline"
                >
                  {language === 'en' ? 'Register now' : 'Daftar sekarang'}
                </button>
              </p>
            ) : (
              <p className="text-[#718078]">
                {language === 'en' ? 'Already have an account? ' : 'Sudah punya akun? '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(''); setUnauthorizedDomain(null); }}
                  className="font-bold text-[#0B3325] hover:underline"
                >
                  {language === 'en' ? 'Login' : 'Login'}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#111A16]">
              {language === 'en' ? 'Reset Password' : 'Atur Ulang Kata Sandi'}
            </h3>
            <p className="text-xs text-[#718078] leading-relaxed">
              {language === 'en' 
                ? 'Enter your registered email address. A password reset link will be sent to your inbox.'
                : 'Masukkan alamat email Anda. Tautan resmi pengaturan ulang kata sandi akan dikirim ke kotak masuk Anda.'}
            </p>

            {resetSent && (
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200">
                {language === 'en' ? 'Password reset link sent to your email!' : 'Tautan reset kata sandi telah dikirim ke email Anda!'}
              </div>
            )}

            <form onSubmit={handleSendReset} className="space-y-3 text-xs">
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="email@anda.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4] text-xs focus:outline-none focus:border-[#0B3325]"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2 rounded-full font-semibold text-[#718078] hover:text-[#111A16]"
                >
                  {language === 'en' ? 'Cancel' : 'Batal'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full font-bold bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23]"
                >
                  {language === 'en' ? 'Send Link' : 'Kirim Tautan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

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
  Zap
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
  const { t } = useLanguage();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  // If user is logged in but pending approval
  if (currentUser && profile?.status === 'pending') {
    return (
      <div className="min-h-screen bg-[#F3F6F4] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-[#E6ECE8] shadow-xl text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#111A16]">
              Akun Menunggu Persetujuan
            </h2>
            <p className="text-xs text-[#718078] mt-2 leading-relaxed">
              Halo, <strong className="text-[#111A16]">{profile.displayName}</strong>. Pendaftaran akun magang Anda di <strong>PT One Data Security</strong> sedang ditinjau oleh Administrator.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F3F6F4] border border-[#E6ECE8] text-xs text-left space-y-1.5 text-[#718078]">
            <div className="flex justify-between">
              <span>Email:</span>
              <strong className="text-[#111A16]">{profile.email}</strong>
            </div>
            <div className="flex justify-between">
              <span>Peran:</span>
              <span className="font-semibold text-emerald-800 uppercase">Peserta Magang</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-bold text-amber-600">Pending Approval</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => refreshProfile()}
              className="w-full py-2.5 rounded-full text-xs font-bold bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23] flex items-center justify-center gap-2 shadow-xs transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Periksa Status Persetujuan</span>
            </button>

            <button
              onClick={() => logout()}
              className="w-full py-2 rounded-full text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center justify-center gap-1.5 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar dari Akun</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else {
        if (!name.trim()) throw new Error('Nama lengkap wajib diisi');
        await registerWithEmail(email, password, name);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setErrorMsg('Email atau kata sandi tidak sesuai.');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('Email ini sudah terdaftar. Silakan login.');
      } else if (err.code === 'auth/weak-password') {
        setErrorMsg('Kata sandi minimal 6 karakter.');
      } else {
        setErrorMsg(err.message || 'Gagal melakukan autentikasi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google Sign In:', err);
      setErrorMsg(err.message || 'Gagal masuk dengan Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await resetPassword(forgotEmail);
      setResetSent(true);
      setTimeout(() => {
        setShowForgotModal(false);
        setResetSent(false);
      }, 3000);
    } catch (err: any) {
      alert('Gagal mengirim email reset kata sandi: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F6F4] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-[#061F16] text-[#B7F500] items-center justify-center shadow-lg shadow-[#0B3325]/10 border border-[#B7F500]/20 mb-2">
          <Sparkles className="w-7 h-7 text-[#B7F500]" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-[#111A16] capitalize">
          internship application hafuza
        </h1>
        <p className="text-xs font-semibold text-[#16A34A] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
          PT One Data Security
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-[#E6ECE8] shadow-xl space-y-6">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#F3F6F4] text-xs font-bold text-[#718078]">
            <button
              onClick={() => { setMode('login'); setErrorMsg(''); }}
              className={`py-2 rounded-xl transition-all ${
                mode === 'login' ? 'bg-white text-[#111A16] shadow-xs' : 'hover:text-[#111A16]'
              }`}
            >
              Masuk (Login)
            </button>
            <button
              onClick={() => { setMode('register'); setErrorMsg(''); }}
              className={`py-2 rounded-xl transition-all ${
                mode === 'register' ? 'bg-white text-[#111A16] shadow-xs' : 'hover:text-[#111A16]'
              }`}
            >
              Daftar Peserta
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Google Sign-in */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 rounded-2xl border border-[#E6ECE8] bg-white hover:bg-[#F3F6F4] text-xs font-bold text-[#111A16] flex items-center justify-center gap-3 shadow-2xs transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Lanjutkan dengan Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#E6ECE8] w-full" />
            <span className="bg-white px-3 text-[11px] uppercase font-bold text-[#718078] absolute">
              atau email
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
            {mode === 'register' && (
              <div>
                <label className="block font-bold text-[#111A16] mb-1">
                  Nama Lengkap Siswa
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#718078]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Muhammad Hafuza"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4] focus:outline-none focus:border-[#0B3325]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-bold text-[#111A16] mb-1">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#718078]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4] focus:outline-none focus:border-[#0B3325]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-[#111A16]">
                  Kata Sandi
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setForgotEmail(email); setShowForgotModal(true); }}
                    className="text-[11px] text-[#16A34A] hover:underline"
                  >
                    Lupa sandi?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#718078]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4] focus:outline-none focus:border-[#0B3325]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-full text-xs font-bold bg-[#0B3325] text-[#B7F500] hover:bg-[#102F23] flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all"
            >
              <span>{loading ? 'Memproses...' : mode === 'login' ? 'Masuk Sekarang' : 'Daftar Sebagai Siswa'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#111A16]">Reset Kata Sandi</h3>
            <p className="text-xs text-[#718078]">
              Masukkan email akun Anda. Kami akan mengirimkan tautan reset kata sandi resmi Firebase.
            </p>

            {resetSent && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-medium">
                Tautan reset kata sandi telah dikirim ke email Anda!
              </div>
            )}

            <form onSubmit={handleSendReset} className="space-y-3 text-xs">
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="email@anda.com"
                className="w-full px-3 py-2 rounded-xl border border-[#E6ECE8] bg-[#F3F6F4]"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2 rounded-full font-semibold text-[#718078]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full font-bold bg-[#0B3325] text-[#B7F500]"
                >
                  Kirim Tautan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

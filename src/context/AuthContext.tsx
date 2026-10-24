import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  User as FirebaseUser, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile as updateAuthProfile,
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase/config';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  profile: UserProfile | null;
  effectiveRole: UserRole;
  previewRole: UserRole | null;
  setPreviewRole: (role: UserRole | null) => void;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [previewRole, setPreviewRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const isRegisteringRef = useRef(false);

  // Check if an email is bootstrap admin
  const checkIsAdmin = (email?: string | null): boolean => {
    if (!email) return false;
    return email.trim().toLowerCase() === 'hafuza@narmadi.com';
  };

  const fetchProfile = async (user: FirebaseUser): Promise<UserProfile> => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      const isBootstrapAdmin = checkIsAdmin(user.email);

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        // If it's hafuza and not yet marked admin, upgrade to admin
        if (isBootstrapAdmin && data.role !== 'admin') {
          try {
            await updateDoc(userRef, { role: 'admin', status: 'active' });
            data.role = 'admin';
            data.status = 'active';
          } catch (e) {
            console.warn('Notice upgrading admin status:', e);
          }
        }
        setProfile(data);
        return data;
      } else {
        // If currently in middle of registerWithEmail, wait briefly so we don't overwrite custom name
        if (isRegisteringRef.current) {
          // Profile will be set by registerWithEmail
          return {} as UserProfile;
        }

        // Create initial default profile
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'User Hafuza'),
          role: isBootstrapAdmin ? 'admin' : 'student',
          status: isBootstrapAdmin ? 'active' : 'pending',
          photoURL: user.photoURL || '',
          phone: '',
          schoolOrUniv: 'SMK Negeri 1 Jakarta',
          studentClass: 'XII RPL 1',
          birthPlace: 'Jakarta',
          birthDate: '2007-04-15',
          major: 'Rekayasa Perangkat Lunak',
          companyName: 'PT One Data Security',
          internshipStartDate: '2026-08-01',
          internshipEndDate: '2026-12-31',
          supervisorId: 'sup-1',
          supervisorName: 'Budi Santoso, S.Kom (PT One Data Security)',
          teacherId: 'teach-1',
          teacherName: 'Dra. Nurhayati, M.Pd',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        try {
          await setDoc(userRef, newProfile);
        } catch (setErr) {
          console.warn('Could not persist initial user profile to Firestore:', setErr);
        }

        // Also add to admins collection if bootstrap admin
        if (isBootstrapAdmin) {
          try {
            await setDoc(doc(db, 'admins', user.uid), {
              email: user.email,
              createdAt: new Date().toISOString()
            });
          } catch (e) {
            console.warn('Notice setting admins collection marker:', e);
          }
        }

        setProfile(newProfile);
        return newProfile;
      }
    } catch (error) {
      console.warn('Error fetching Firestore user profile, providing safe fallback session:', error);
      // Fallback safe in-memory profile so user is NEVER locked out by network blips
      const fallbackProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
        role: checkIsAdmin(user.email) ? 'admin' : 'student',
        status: checkIsAdmin(user.email) ? 'active' : 'pending',
        photoURL: user.photoURL || '',
        companyName: 'PT One Data Security',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setProfile(fallbackProfile);
      return fallbackProfile;
    }
  };

  useEffect(() => {
    // 1. Check for incoming redirect sign-in result from Google
    getRedirectResult(auth)
      .then((res) => {
        if (res?.user) {
          console.log('Redirect sign-in resolved for:', res.user.email);
        }
      })
      .catch((err) => {
        console.warn('Redirect sign-in notice:', err);
      });

    // 2. Auth state observer
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchProfile(user);
      } else {
        setProfile(null);
        setPreviewRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Google Sign In error:', error);
      // If popup is blocked by the browser (very common on mobile / Vercel), fall back to redirect
      if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/cancelled-popup-request') {
        try {
          console.log('Popup blocked, attempting redirect sign-in...');
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr) {
          console.error('Redirect sign-in fallback failed:', redirectErr);
          throw redirectErr;
        }
      }

      // If domain is unauthorized on Vercel
      if (error?.code === 'auth/unauthorized-domain') {
        const currentHost = window.location.hostname;
        const helpfulMsg = `Domain "${currentHost}" belum didaftarkan di Authorized Domains Firebase Authentication. Tambahkan "${currentHost}" di Firebase Console > Authentication > Settings > Authorized domains.`;
        const enrichedError = new Error(helpfulMsg);
        (enrichedError as any).code = 'auth/unauthorized-domain';
        (enrichedError as any).hostname = currentHost;
        throw enrichedError;
      }

      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (error) {
      console.error('Email login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    setLoading(true);
    isRegisteringRef.current = true;
    try {
      const cleanEmail = email.trim();
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      const cleanName = name.trim();

      try {
        await updateAuthProfile(cred.user, { displayName: cleanName });
      } catch (err) {
        console.warn('Notice setting Firebase Auth displayName:', err);
      }

      const isBootstrapAdmin = checkIsAdmin(cleanEmail);

      const newProfile: UserProfile = {
        uid: cred.user.uid,
        email: cleanEmail,
        displayName: cleanName,
        role: isBootstrapAdmin ? 'admin' : 'student',
        status: isBootstrapAdmin ? 'active' : 'pending',
        photoURL: '',
        schoolOrUniv: 'SMK Negeri 1 Jakarta',
        studentClass: 'XII RPL 1',
        birthPlace: 'Jakarta',
        birthDate: '2007-04-15',
        major: 'Rekayasa Perangkat Lunak',
        companyName: 'PT One Data Security',
        internshipStartDate: '2026-08-01',
        internshipEndDate: '2026-12-31',
        supervisorId: 'sup-1',
        supervisorName: 'Budi Santoso, S.Kom (PT One Data Security)',
        teacherId: 'teach-1',
        teacherName: 'Dra. Nurhayati, M.Pd',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', cred.user.uid), newProfile);
      setProfile(newProfile);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      isRegisteringRef.current = false;
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
    setPreviewRole(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser || !profile) return;
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(userRef, updateData);
      setProfile({ ...profile, ...updateData });
    } catch (error) {
      console.error('Profile update error:', error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const refreshProfile = async () => {
    if (currentUser) {
      setLoading(true);
      await fetchProfile(currentUser);
      setLoading(false);
    }
  };

  // Determine effective role: if user is admin, allow them to preview other roles
  const effectiveRole: UserRole = (profile?.role === 'admin' && previewRole) 
    ? previewRole 
    : (profile?.role || 'student');

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        effectiveRole,
        previewRole,
        setPreviewRole,
        loading,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        resetPassword,
        updateUserProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

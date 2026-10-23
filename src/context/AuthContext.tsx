import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User as FirebaseUser, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
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

  const fetchProfile = async (user: FirebaseUser) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      const isBootstrapAdmin = user.email?.toLowerCase() === 'hafuza@narmadi.com';

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        // If it's hafuza and not yet marked admin, upgrade to admin
        if (isBootstrapAdmin && data.role !== 'admin') {
          await updateDoc(userRef, { role: 'admin', status: 'active' });
          data.role = 'admin';
          data.status = 'active';
        }
        setProfile(data);
      } else {
        // Create initial profile
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'User Hafuza',
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

        await setDoc(userRef, newProfile);
        setProfile(newProfile);

        // Also add to admins collection if bootstrap admin
        if (isBootstrapAdmin) {
          try {
            await setDoc(doc(db, 'admins', user.uid), {
              email: user.email,
              createdAt: new Date().toISOString()
            });
          } catch (e) {
            console.warn('Failed to set admins collection marker:', e);
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    }
  };

  useEffect(() => {
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
    } catch (error) {
      console.error('Google Sign In error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error('Email login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const isBootstrapAdmin = email.toLowerCase() === 'hafuza@narmadi.com';
      const newProfile: UserProfile = {
        uid: cred.user.uid,
        email: email,
        displayName: name,
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
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
    setPreviewRole(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
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
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await fetchProfile(currentUser);
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

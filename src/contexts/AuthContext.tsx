import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile, UserRole, TABLES } from '@/lib/supabase';
import {
  isEmailPasswordUser,
  isEmailVerified,
  needsEmailVerification,
  isEmailNotConfirmedError,
  EMAIL_NOT_CONFIRMED_MESSAGE,
} from '@/lib/authUtils';

export {
  getAuthProvider,
  isEmailPasswordUser,
  isEmailVerified,
  needsEmailVerification,
} from '@/lib/authUtils';

/** Prefer VITE_SUPER_ADMIN_EMAIL per deploy; when unset, legacy bootstrap email is used. */
const SUPER_ADMIN_EMAIL = (import.meta.env.VITE_SUPER_ADMIN_EMAIL?.trim() || 'dreamkids617@gmail.com').toLowerCase();

type ProfileIntent = 'user' | 'admin' | 'super_admin';

type EnsureProfileInput = {
  intent: ProfileIntent;
  email?: string;
  name?: string;
};

const isDuplicateKeyError = (error: { code?: string; message?: string } | null) =>
  error?.code === '23505' || (error?.message?.includes('duplicate key') ?? false);

const buildProfilePayload = (
  user: User,
  intent: ProfileIntent,
  email: string,
  name: string
) => {
  switch (intent) {
    case 'super_admin':
      return {
        user_id: user.id,
        email,
        name,
        role: 'super_admin' as const,
        is_active: true,
        is_approved: true,
      };
    case 'admin':
      return {
        user_id: user.id,
        email,
        name,
        role: 'admin' as const,
        is_active: true,
        is_approved: false,
      };
    case 'user':
    default:
      return {
        user_id: user.id,
        email,
        name,
        role: 'user' as const,
        is_active: true,
        is_approved: true,
      };
  }
};

const resolveProfileIntent = (user: User): ProfileIntent => {
  const email = user.email?.trim().toLowerCase() || '';
  if (email === SUPER_ADMIN_EMAIL) {
    return 'super_admin';
  }
  const metaIntent = user.user_metadata?.signup_intent;
  if (metaIntent === 'admin') return 'admin';
  return 'user';
};

const fetchProfileByUserId = async (userId: string) => {
  const { data, error } = await supabase
    .from(TABLES.profiles)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { profile: null as Profile | null, error: error.message };
  return { profile: data as Profile | null, error: null as string | null };
};

const upgradeToSuperAdmin = async (profile: Profile): Promise<Profile> => {
  if (profile.role === 'super_admin' && profile.is_approved && profile.is_active) {
    return profile;
  }

  const { data: updated } = await supabase
    .from(TABLES.profiles)
    .update({ role: 'super_admin', is_approved: true, is_active: true })
    .eq('id', profile.id)
    .select('*')
    .maybeSingle();

  return (updated as Profile) || { ...profile, role: 'super_admin', is_approved: true, is_active: true };
};

/** Single entry point for profile creation and retrieval. */
const ensureProfile = async (
  user: User,
  input?: Partial<EnsureProfileInput>
): Promise<{ profile: Profile | null; error: string | null }> => {
  const email = (input?.email || user.email || '').trim().toLowerCase();
  const name = input?.name || user.user_metadata?.name || '';
  const intent = input?.intent || resolveProfileIntent(user);

  const { profile: existing, error: fetchError } = await fetchProfileByUserId(user.id);
  if (fetchError) return { profile: null, error: fetchError };

  if (existing) {
    if (email === SUPER_ADMIN_EMAIL && existing.role !== 'super_admin') {
      const upgraded = await upgradeToSuperAdmin(existing);
      return { profile: upgraded, error: null };
    }
    return { profile: existing, error: null };
  }

  const payload = buildProfilePayload(user, intent, email, name);
  const { data: created, error: insertError } = await supabase
    .from(TABLES.profiles)
    .insert(payload)
    .select('*')
    .maybeSingle();

  if (created) {
    return { profile: created as Profile, error: null };
  }

  if (insertError && isDuplicateKeyError(insertError)) {
    const { profile: raced, error: raceFetchError } = await fetchProfileByUserId(user.id);
    if (raceFetchError) return { profile: null, error: raceFetchError };
    if (raced) {
      if (email === SUPER_ADMIN_EMAIL && raced.role !== 'super_admin') {
        const upgraded = await upgradeToSuperAdmin(raced);
        return { profile: upgraded, error: null };
      }
      return { profile: raced, error: null };
    }
  }

  if (insertError) {
    return { profile: null, error: insertError.message };
  }

  return { profile: null, error: '프로필을 생성하지 못했습니다.' };
};

export type SignUpResult = {
  error: string | null;
  needsEmailVerification?: boolean;
  email?: string;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: UserRole;
  isEmailVerified: boolean;
  isEmailPasswordUser: boolean;
  needsEmailVerification: boolean;
  signUp: (email: string, password: string, name: string) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  adminSignUp: (email: string, password: string, name: string) => Promise<SignUpResult>;
  adminSignIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const role: UserRole = profile?.role || 'user';
  const isSuperAdmin = !!profile && profile.role === 'super_admin' && profile.is_active;
  const isAdmin =
    !!profile &&
    profile.is_active &&
    (role === 'super_admin' || (role === 'admin' && profile.is_approved));

  const emailVerified = isEmailVerified(user);
  const emailPasswordUser = isEmailPasswordUser(user);
  const emailVerificationRequired = needsEmailVerification(user);

  const loadProfile = async (currentUser: User) => {
    const { profile: loaded, error } = await ensureProfile(currentUser);
    if (loaded) {
      setProfile(loaded);
    } else if (error) {
      console.error('Failed to load profile:', error);
      setProfile(null);
    } else {
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setLoading(true);
        loadProfile(session.user).then(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string): Promise<SignUpResult> => {
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email`,
        data: { name, signup_intent: 'user' },
      },
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: '회원가입에 실패했습니다.' };

    if (!data.session) {
      return { error: null, needsEmailVerification: true, email: normalizedEmail };
    }

    const { error: profileError } = await ensureProfile(data.user, {
      intent: 'user',
      email: normalizedEmail,
      name,
    });
    if (profileError) return { error: profileError };

    return { error: null, needsEmailVerification: false, email: normalizedEmail };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (isEmailNotConfirmedError(error.message)) {
        return { error: EMAIL_NOT_CONFIRMED_MESSAGE };
      }
      return { error: error.message };
    }
    return { error: null };
  };

  const resendVerificationEmail = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email`,
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const adminSignUp = async (email: string, password: string, name: string): Promise<SignUpResult> => {
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/admin/login`,
        data: { name, signup_intent: 'admin' },
      },
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: '회원가입에 실패했습니다.' };

    if (!data.session) {
      return { error: null, needsEmailVerification: true, email: normalizedEmail };
    }

    const { error: profileError } = await ensureProfile(data.user, {
      intent: 'admin',
      email: normalizedEmail,
      name,
    });
    if (profileError) return { error: profileError };

    return { error: null, needsEmailVerification: false, email: normalizedEmail };
  };

  const adminSignIn = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) {
      if (isEmailNotConfirmedError(error.message)) {
        return { error: EMAIL_NOT_CONFIRMED_MESSAGE };
      }
      return { error: error.message };
    }

    if (normalizedEmail === SUPER_ADMIN_EMAIL && data.user) {
      const { profile: superProfile, error: profileError } = await ensureProfile(data.user, {
        intent: 'super_admin',
        email: normalizedEmail,
      });
      if (profileError) return { error: profileError };
      if (superProfile) return { error: null };
    }

    const { data: profileData } = await supabase
      .from(TABLES.profiles)
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (!profileData) {
      await supabase.auth.signOut();
      return { error: '관리자 계정이 등록되어 있지 않습니다.' };
    }

    if (profileData.role === 'user') {
      await supabase.auth.signOut();
      return { error: '관리자 권한이 없는 계정입니다.' };
    }

    if (!profileData.is_approved) {
      await supabase.auth.signOut();
      return { error: '관리자 승인 대기 중입니다. 대표 관리자에게 문의하세요.' };
    }

    if (!profileData.is_active) {
      await supabase.auth.signOut();
      return { error: '비활성화된 계정입니다. 대표 관리자에게 문의하세요.' };
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading,
      isAdmin, isSuperAdmin, role,
      isEmailVerified: emailVerified,
      isEmailPasswordUser: emailPasswordUser,
      needsEmailVerification: emailVerificationRequired,
      signUp, signIn, adminSignUp, adminSignIn, signOut, refreshProfile,
      resendVerificationEmail,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

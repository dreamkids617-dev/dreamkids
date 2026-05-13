import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile, UserRole, TABLES } from '@/lib/supabase';

const SUPER_ADMIN_EMAIL = 'dreamkids617@gmail.com';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: UserRole;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  adminSignUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  adminSignIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const role: UserRole = profile?.role || 'user';
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'super_admin' || role === 'admin';

  const loadProfile = async (currentUser: User) => {
    const { data: existingProfile } = await supabase
      .from(TABLES.profiles)
      .select('*')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    if (existingProfile) {
      // If this is the super admin email, ensure role is super_admin
      if (currentUser.email === SUPER_ADMIN_EMAIL && existingProfile.role !== 'super_admin') {
        await supabase
          .from(TABLES.profiles)
          .update({ role: 'super_admin', is_approved: true, is_active: true })
          .eq('id', existingProfile.id);
        setProfile({ ...existingProfile, role: 'super_admin', is_approved: true, is_active: true });
      } else {
        setProfile(existingProfile as Profile);
      }
    } else {
      // Create profile for new user
      const isSuperAdminUser = currentUser.email === SUPER_ADMIN_EMAIL;
      const newProfile = {
        user_id: currentUser.id,
        email: currentUser.email || '',
        name: currentUser.user_metadata?.name || '',
        role: isSuperAdminUser ? 'super_admin' : 'user',
        is_active: true,
        is_approved: isSuperAdminUser ? true : false,
      };

      const { data: created } = await supabase
        .from(TABLES.profiles)
        .insert(newProfile)
        .select()
        .single();

      if (created) {
        setProfile(created as Profile);
      }
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
        loadProfile(session.user).then(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Regular user sign up
  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name },
      },
    });
    if (error) return { error: error.message };

    // Create profile as regular user
    if (data.user) {
      await supabase.from(TABLES.profiles).insert({
        user_id: data.user.id,
        email,
        name,
        role: 'user',
        is_active: true,
        is_approved: true,
      });
    }
    return { error: null };
  };

  // Regular user sign in
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  // Admin sign up - requires approval from super_admin
  const adminSignUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name },
      },
    });
    if (error) return { error: error.message };

    // Create profile as admin (pending approval)
    if (data.user) {
      const isSuperAdminUser = email === SUPER_ADMIN_EMAIL;
      await supabase.from(TABLES.profiles).insert({
        user_id: data.user.id,
        email,
        name,
        role: isSuperAdminUser ? 'super_admin' : 'admin',
        is_active: true,
        is_approved: isSuperAdminUser ? true : false,
      });
    }
    return { error: null };
  };

  // Admin sign in - check if user has admin role and is approved
  const adminSignIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    // Check profile role
    const { data: profileData } = await supabase
      .from(TABLES.profiles)
      .select('*')
      .eq('email', email)
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
      signUp, signIn, adminSignUp, adminSignIn, signOut, refreshProfile
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
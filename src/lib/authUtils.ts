import { User } from '@supabase/supabase-js';

export function getAuthProvider(user: User | null): string | null {
  if (!user) return null;
  const fromMeta = user.app_metadata?.provider as string | undefined;
  if (fromMeta) return fromMeta;
  const fromIdentity = user.identities?.[0]?.provider;
  return fromIdentity ?? 'email';
}

export function isEmailPasswordUser(user: User | null): boolean {
  if (!user) return false;
  return getAuthProvider(user) === 'email';
}

export function isEmailVerified(user: User | null): boolean {
  if (!user) return false;
  return !!user.email_confirmed_at;
}

/** Email/password users who still need to confirm their inbox. OAuth users are excluded. */
export function needsEmailVerification(user: User | null): boolean {
  if (!user) return false;
  return isEmailPasswordUser(user) && !isEmailVerified(user);
}

export function isEmailNotConfirmedError(message: string): boolean {
  return /email not confirmed/i.test(message) || /email_not_confirmed/i.test(message);
}

export const EMAIL_NOT_CONFIRMED_MESSAGE = '이메일 인증 후 로그인해주세요.';

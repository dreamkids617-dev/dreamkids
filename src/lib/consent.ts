import { LEGAL_DOC_VERSIONS } from '@/lib/legalDocs';
import { supabase, TABLES } from '@/lib/supabase';

export type SignupConsentState = {
  terms: boolean;
  privacyCollect: boolean;
  ageOver14: boolean;
  marketing: boolean;
};

export type SignupConsentPayload = {
  terms_agreed: true;
  privacy_collect_agreed: true;
  age_confirmed: true;
  marketing_agreed: boolean;
  terms_version: string;
  privacy_version: string;
  privacy_collect_version: string;
  marketing_version: string;
  agreed_at: string;
};

export const emptySignupConsent = (): SignupConsentState => ({
  terms: false,
  privacyCollect: false,
  ageOver14: false,
  marketing: false,
});

export function validateSignupConsent(state: SignupConsentState): string | null {
  if (!state.terms) return '이용약관에 동의해 주세요';
  if (!state.privacyCollect) return '개인정보 수집·이용에 동의해 주세요';
  if (!state.ageOver14) return '만 14세 이상만 가입할 수 있습니다';
  return null;
}

export function requiredConsentsAccepted(state: SignupConsentState): boolean {
  return state.terms && state.privacyCollect && state.ageOver14;
}

export function buildConsentPayload(state: SignupConsentState): SignupConsentPayload | null {
  if (validateSignupConsent(state)) return null;
  return {
    terms_agreed: true,
    privacy_collect_agreed: true,
    age_confirmed: true,
    marketing_agreed: !!state.marketing,
    terms_version: LEGAL_DOC_VERSIONS.terms,
    privacy_version: LEGAL_DOC_VERSIONS.privacy,
    privacy_collect_version: LEGAL_DOC_VERSIONS.privacyCollect,
    marketing_version: LEGAL_DOC_VERSIONS.marketing,
    agreed_at: new Date().toISOString(),
  };
}

/** Persist consent audit row after profile exists (session required). */
export async function persistConsentRecord(input: {
  userId: string;
  profileId: string | null;
  roleIntent: 'user' | 'admin';
  consent: SignupConsentPayload;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from(TABLES.consent_records).insert({
    user_id: input.userId,
    profile_id: input.profileId,
    role_intent: input.roleIntent,
    terms_version: input.consent.terms_version,
    privacy_version: input.consent.privacy_version,
    privacy_collect_version: input.consent.privacy_collect_version,
    marketing_version: input.consent.marketing_version,
    terms_agreed: true,
    privacy_collect_agreed: true,
    age_confirmed: true,
    marketing_agreed: input.consent.marketing_agreed,
    agreed_at: input.consent.agreed_at,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
  });
  if (error) return { error: error.message };
  return { error: null };
}

export function consentFromUserMetadata(meta: Record<string, unknown> | undefined): SignupConsentPayload | null {
  if (!meta) return null;
  const c = meta.consent as Partial<SignupConsentPayload> | undefined;
  if (!c) return null;
  if (!c.terms_agreed || !c.privacy_collect_agreed || !c.age_confirmed) return null;
  if (!c.terms_version || !c.privacy_version || !c.privacy_collect_version || !c.agreed_at) return null;
  return {
    terms_agreed: true,
    privacy_collect_agreed: true,
    age_confirmed: true,
    marketing_agreed: !!c.marketing_agreed,
    terms_version: String(c.terms_version),
    privacy_version: String(c.privacy_version),
    privacy_collect_version: String(c.privacy_collect_version),
    marketing_version: String(c.marketing_version || LEGAL_DOC_VERSIONS.marketing),
    agreed_at: String(c.agreed_at),
  };
}

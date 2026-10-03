import type { ChildAgeBand } from '@/lib/supabase';
import { CHILD_AGE_BANDS } from '@/lib/supabase';
import { isValidSido, isValidSigungu } from '@/lib/koreaRegions';

/** Optional parent fields collected at signup or MyPage (community-facing). */
export type ParentSignupProfile = {
  display_name?: string | null;
  region_sido?: string | null;
  region_sigungu?: string | null;
  child_age_band?: ChildAgeBand | '' | null;
};

export function emptyParentSignupProfile(): ParentSignupProfile {
  return {
    display_name: '',
    region_sido: '',
    region_sigungu: '',
    child_age_band: '',
  };
}

export function normalizeParentSignupProfile(
  input?: ParentSignupProfile | null
): {
  display_name: string | null;
  region_sido: string | null;
  region_sigungu: string | null;
  child_age_band: string | null;
} {
  const display_name = input?.display_name?.trim() || null;
  let region_sido = input?.region_sido?.trim() || null;
  let region_sigungu = input?.region_sigungu?.trim() || null;
  if (region_sido && !isValidSido(region_sido)) region_sido = null;
  if (!region_sido || !region_sigungu || !isValidSigungu(region_sido, region_sigungu)) {
    region_sigungu = null;
  }
  const band = (input?.child_age_band || '').toString().trim();
  const child_age_band = CHILD_AGE_BANDS.some((b) => b.value === band) ? band : null;
  return { display_name, region_sido, region_sigungu, child_age_band };
}

export function parentProfileFromUserMetadata(
  meta: Record<string, unknown> | undefined
): ParentSignupProfile | null {
  if (!meta) return null;
  const raw = meta.parent_profile as Partial<ParentSignupProfile> | undefined;
  if (!raw || typeof raw !== 'object') return null;
  return normalizeParentSignupProfile({
    display_name: typeof raw.display_name === 'string' ? raw.display_name : '',
    region_sido: typeof raw.region_sido === 'string' ? raw.region_sido : '',
    region_sigungu: typeof raw.region_sigungu === 'string' ? raw.region_sigungu : '',
    child_age_band: (raw.child_age_band as ChildAgeBand | '') || '',
  });
}

/** Community-facing author label — never fall back to account real name. */
export function communityAuthorLabel(input: {
  displayName?: string | null;
  fallback?: string;
}): string {
  const nick = input.displayName?.trim();
  if (nick) return nick;
  return input.fallback || '학부모';
}

/** Soft prompt — missing nickname or region for community trust. */
export function isParentCommunityProfileIncomplete(profile: {
  display_name?: string | null;
  region_sido?: string | null;
} | null | undefined): boolean {
  if (!profile) return true;
  return !profile.display_name?.trim() || !profile.region_sido?.trim();
}

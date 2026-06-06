import { COMMUNITY_CATEGORIES, type CommunityCategory, type Profile } from '@/lib/supabase';
import {
  isValidSido,
  isValidSigungu,
  normalizeSidoInput,
} from '@/lib/koreaRegions';

export type CommunityCategoryFilter = 'all' | CommunityCategory;

export type CommunityRegionFilterState = {
  category: CommunityCategoryFilter;
  mine: boolean;
  sido: string;
  sigungu: string;
};

export function hasProfileRegion(profile: Profile | null | undefined): boolean {
  return !!(profile?.region_sido?.trim());
}

export function getProfileRegion(profile: Profile | null | undefined): {
  sido: string | null;
  sigungu: string | null;
} {
  if (!profile) return { sido: null, sigungu: null };
  const rawSido = profile.region_sido?.trim() || null;
  let sido: string | null = null;
  if (rawSido) {
    if (isValidSido(rawSido)) {
      sido = rawSido;
    } else {
      const normalized = normalizeSidoInput(rawSido);
      sido = normalized && isValidSido(normalized) ? normalized : null;
    }
  }
  const rawSigungu = profile.region_sigungu?.trim() || null;
  const sigungu =
    rawSigungu && sido && isValidSigungu(sido, rawSigungu) ? rawSigungu : null;
  return { sido, sigungu };
}

const VALID_CATEGORY_VALUES = new Set<string>(COMMUNITY_CATEGORIES.map((c) => c.value));

export function parseCommunityFiltersFromSearchParams(
  params: URLSearchParams
): CommunityRegionFilterState {
  const rawCategory = params.get('category')?.trim() ?? '';
  const category: CommunityCategoryFilter =
    rawCategory && VALID_CATEGORY_VALUES.has(rawCategory)
      ? (rawCategory as CommunityCategory)
      : 'all';

  const mine = params.get('mine') === '1';

  let sido = params.get('sido')?.trim() ?? '';
  let sigungu = params.get('sigungu')?.trim() ?? '';

  if (sido && !isValidSido(sido)) {
    const normalized = normalizeSidoInput(sido);
    sido = normalized && isValidSido(normalized) ? normalized : '';
  }

  if (sido && sigungu && !isValidSigungu(sido, sigungu)) {
    sigungu = '';
  }

  if (!sido) sigungu = '';

  return { category, mine, sido, sigungu };
}

export function buildCommunitySearchParams(
  filters: CommunityRegionFilterState
): URLSearchParams {
  const next = new URLSearchParams();
  if (filters.category !== 'all') next.set('category', filters.category);
  if (filters.mine) next.set('mine', '1');
  if (filters.sido) next.set('sido', filters.sido);
  if (filters.sigungu) next.set('sigungu', filters.sigungu);
  return next;
}

export function isCommunityRegionFilterActive(filters: CommunityRegionFilterState): boolean {
  return filters.mine || !!filters.sido || !!filters.sigungu;
}

export function getActiveRegionQuery(filters: CommunityRegionFilterState, profile: Profile | null) {
  if (filters.mine) {
    const { sido, sigungu } = getProfileRegion(profile);
    return { sido, sigungu, mineRequested: true, mineApplied: !!sido };
  }
  return {
    sido: filters.sido || null,
    sigungu: filters.sigungu || null,
    mineRequested: false,
    mineApplied: false,
  };
}

export function getCommunityCategoryLabel(category: CommunityCategory | string): string {
  const found = COMMUNITY_CATEGORIES.find((c) => c.value === category);
  return found?.label ?? category;
}

export function formatCommunityDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatCommunityRegion(sido: string | null, sigungu: string | null): string | null {
  if (!sido && !sigungu) return null;
  if (sido && sigungu) return `${sido} ${sigungu}`;
  return sido || sigungu;
}

export function truncatePostContent(content: string, max = 120): string {
  const trimmed = content.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

import { COMMUNITY_CATEGORIES, type CommunityCategory } from '@/lib/supabase';

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

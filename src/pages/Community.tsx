import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PenLine, MessageCircle, MapPin, RotateCcw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  supabase,
  TABLES,
  COMMUNITY_CATEGORIES,
  ParentPost,
  type Profile,
} from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  buildCommunitySearchParams,
  getActiveRegionQuery,
  hasProfileRegion,
  isCommunityRegionFilterActive,
  parseCommunityFiltersFromSearchParams,
  type CommunityRegionFilterState,
} from '@/lib/communityUtils';
import { KOREA_SIDO_LIST, getSigunguOptions } from '@/lib/koreaRegions';
import BottomNav from '@/components/BottomNav';
import CommunityPostCard from '@/components/CommunityPostCard';

const ALL_SIDO_VALUE = '__all_sido__';
const ALL_SIGUNGU_VALUE = '__all_sigungu__';

export default function CommunityPage() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<ParentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMineRegionBanner, setShowMineRegionBanner] = useState(false);

  const filters = useMemo(
    () => parseCommunityFiltersFromSearchParams(searchParams),
    [searchParams]
  );

  const regionQuery = useMemo(
    () => getActiveRegionQuery(filters, profile as Profile | null),
    [filters, profile]
  );

  const sigunguOptions = useMemo(
    () => (filters.sido ? getSigunguOptions(filters.sido) : []),
    [filters.sido]
  );

  const updateFilters = useCallback(
    (patch: Partial<CommunityRegionFilterState>, options?: { replace?: boolean }) => {
      const next: CommunityRegionFilterState = { ...filters, ...patch };
      if (patch.sido !== undefined && patch.sido !== filters.sido) {
        next.sigungu = '';
        next.mine = false;
      }
      if (patch.sigungu !== undefined || patch.sido !== undefined) {
        next.mine = false;
      }
      if (patch.mine === true) {
        next.sido = '';
        next.sigungu = '';
      }
      setSearchParams(buildCommunitySearchParams(next), { replace: options?.replace ?? true });
    },
    [filters, setSearchParams]
  );

  const resetRegionFilters = useCallback(() => {
    setShowMineRegionBanner(false);
    updateFilters({ mine: false, sido: '', sigungu: '' });
  }, [updateFilters]);

  const resetAllFilters = useCallback(() => {
    setShowMineRegionBanner(false);
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const handleMineRegionClick = () => {
    if (!hasProfileRegion(profile as Profile | null)) {
      setShowMineRegionBanner(true);
      return;
    }
    setShowMineRegionBanner(false);
    updateFilters({ mine: true, sido: '', sigungu: '' });
  };

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from(TABLES.parent_posts)
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    const activeRegion = getActiveRegionQuery(filters, profile as Profile | null);
    if (activeRegion.mineRequested && !activeRegion.mineApplied) {
      setPosts([]);
      setLoading(false);
      return;
    }

    if (activeRegion.sido) {
      query = query.eq('region_sido', activeRegion.sido);
    }
    if (activeRegion.sigungu) {
      query = query.eq('region_sigungu', activeRegion.sigungu);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError('글 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      setPosts([]);
    } else {
      setPosts((data as ParentPost[]) || []);
    }
    setLoading(false);
  }, [filters, profile]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    if (filters.mine && !hasProfileRegion(profile as Profile | null)) {
      setShowMineRegionBanner(true);
    }
  }, [filters.mine, profile]);

  const regionFilterActive = isCommunityRegionFilterActive(filters);
  const anyFilterActive = filters.category !== 'all' || regionFilterActive;
  const isFilteredEmpty = !loading && !error && posts.length === 0 && anyFilterActive;
  const isGlobalEmpty = !loading && !error && posts.length === 0 && !anyFilterActive;

  return (
    <div className="app-container">
      <header className="flex-shrink-0 bg-white px-5 pt-3 pb-3 safe-top border-b border-slate-50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[18px] font-bold text-slate-800">커뮤니티</h1>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              학부모가 유아 관련 질문, 입학 준비, 유아용품 추천, 공동구매 모집, 나눔/중고, 지역
              육아 정보를 나누는 공간
            </p>
          </div>
          <Link
            to="/community/new"
            className="flex-shrink-0 flex items-center gap-1 px-3 h-9 rounded-[12px] bg-indigo-600 text-white text-[12px] font-semibold shadow-sm shadow-indigo-200 touch-active"
          >
            <PenLine className="w-4 h-4" />
            글쓰기
          </Link>
        </div>
      </header>

      <div className="page-content">
        <div className="px-5 pt-3 pb-4 animate-slide-up">
          <div className="flex gap-[6px] overflow-x-auto scrollbar-hide pb-3 -mx-1 px-1">
            <button
              type="button"
              onClick={() => updateFilters({ category: 'all' })}
              className={`flex-shrink-0 px-3 py-[6px] rounded-full text-[11px] font-semibold touch-active ${
                filters.category === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              전체
            </button>
            {COMMUNITY_CATEGORIES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => updateFilters({ category: value })}
                className={`flex-shrink-0 px-3 py-[6px] rounded-full text-[11px] font-semibold touch-active whitespace-nowrap ${
                  filters.category === value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="pb-3 space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-[11px] font-semibold text-slate-600">지역</span>
              {regionFilterActive && (
                <button
                  type="button"
                  onClick={resetRegionFilters}
                  className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-slate-500 touch-active"
                >
                  <RotateCcw className="w-3 h-3" />
                  지역 초기화
                </button>
              )}
            </div>

            <div className="flex gap-[6px] overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
              <button
                type="button"
                onClick={() => {
                  setShowMineRegionBanner(false);
                  updateFilters({ mine: false, sido: '', sigungu: '' });
                }}
                className={`flex-shrink-0 px-3 py-[6px] rounded-full text-[11px] font-semibold touch-active ${
                  !filters.mine && !filters.sido
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                전체 지역
              </button>
              <button
                type="button"
                onClick={handleMineRegionClick}
                className={`flex-shrink-0 px-3 py-[6px] rounded-full text-[11px] font-semibold touch-active whitespace-nowrap ${
                  filters.mine && regionQuery.mineApplied
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                내 지역
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Select
                value={filters.sido || ALL_SIDO_VALUE}
                onValueChange={(value) => {
                  setShowMineRegionBanner(false);
                  if (value === ALL_SIDO_VALUE) {
                    updateFilters({ mine: false, sido: '', sigungu: '' });
                  } else {
                    updateFilters({ mine: false, sido: value, sigungu: '' });
                  }
                }}
              >
                <SelectTrigger className="h-10 rounded-[12px] text-[12px]">
                  <SelectValue placeholder="시/도 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SIDO_VALUE}>시/도 전체</SelectItem>
                  {KOREA_SIDO_LIST.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.sigungu || ALL_SIGUNGU_VALUE}
                onValueChange={(value) => {
                  setShowMineRegionBanner(false);
                  if (value === ALL_SIGUNGU_VALUE) {
                    updateFilters({ mine: false, sigungu: '' });
                  } else {
                    updateFilters({ mine: false, sigungu: value });
                  }
                }}
                disabled={!filters.sido}
              >
                <SelectTrigger className="h-10 rounded-[12px] text-[12px]">
                  <SelectValue placeholder="시/군/구 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SIGUNGU_VALUE}>시/군/구 전체</SelectItem>
                  {sigunguOptions.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {showMineRegionBanner && (
            <div className="bg-amber-50 border border-amber-100 rounded-[14px] px-4 py-3 mb-3">
              <p className="text-[11px] text-amber-800 leading-relaxed">
                마이페이지에서 지역을 설정하면 내 지역 글을 빠르게 볼 수 있어요.
              </p>
              <Link
                to="/mypage"
                className="inline-flex mt-2 text-[11px] font-semibold text-amber-700 touch-active"
              >
                마이페이지로 이동 →
              </Link>
            </div>
          )}

          {filters.mine && regionQuery.mineApplied && (
            <p className="text-[10px] text-slate-400 mb-3">
              내 지역: {regionQuery.sido}
              {regionQuery.sigungu ? ` ${regionQuery.sigungu}` : ''}
            </p>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-6 h-6 border-3 border-indigo-200 border-t-indigo-600 rounded-full" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-[16px] px-4 py-4 text-center">
              <p className="text-[12px] text-red-600">{error}</p>
              <button
                type="button"
                onClick={() => void loadPosts()}
                className="mt-3 text-[12px] font-semibold text-indigo-600 touch-active"
              >
                다시 시도
              </button>
            </div>
          ) : isFilteredEmpty ? (
            <div className="text-center py-16">
              <MapPin className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-[13px] text-slate-500 font-medium">선택한 지역에 등록된 글이 없어요.</p>
              <p className="text-[11px] text-slate-400 mt-1">다른 지역을 선택하거나 전체 지역을 확인해보세요</p>
              <div className="flex flex-col items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="inline-flex items-center gap-1 px-4 h-10 rounded-[12px] bg-slate-100 text-slate-600 text-[12px] font-semibold touch-active"
                >
                  <RotateCcw className="w-4 h-4" />
                  전체 지역 보기
                </button>
                <Link
                  to="/community/new"
                  className="inline-flex items-center gap-1 px-4 h-10 rounded-[12px] bg-indigo-600 text-white text-[12px] font-semibold touch-active"
                >
                  <PenLine className="w-4 h-4" />
                  글쓰기
                </Link>
              </div>
            </div>
          ) : isGlobalEmpty ? (
            <div className="text-center py-16">
              <MessageCircle className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-[13px] text-slate-500 font-medium">아직 등록된 글이 없어요</p>
              <p className="text-[11px] text-slate-400 mt-1">첫 글을 작성해 학부모들과 정보를 나눠보세요</p>
              <Link
                to="/community/new"
                className="inline-flex items-center gap-1 mt-4 px-4 h-10 rounded-[12px] bg-indigo-600 text-white text-[12px] font-semibold touch-active"
              >
                <PenLine className="w-4 h-4" />
                글쓰기
              </Link>
            </div>
          ) : (
            <div className="space-y-[10px]">
              {posts.map((post) => (
                <CommunityPostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, MapPin, Star, Heart, X, GitCompareArrows } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase, Institution, TABLES } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCompare } from '@/contexts/CompareContext';
import { useToast } from '@/hooks/use-toast';
import BottomNav from '@/components/BottomNav';

const regions = [
  '전체',
  '서울 강남구',
  '서울 서초구',
  '서울 송파구',
  '서울 마포구',
  '경기 성남시',
  '경기 용인시',
];

const filterOptions = [
  { key: 'all', label: '전체' },
  { key: '영어유치원', label: '영어유치원' },
  { key: '놀이형', label: '놀이형' },
  { key: '학습형', label: '학습형' },
  { key: 'vehicle', label: '🚌 차량' },
];

function recruitingParamIsTrue(raw: string | null): boolean {
  const v = (raw ?? '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCompare, isInCompare, removeFromCompare } = useCompare();
  const { toast } = useToast();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedRegion, setSelectedRegion] = useState(searchParams.get('region') || '전체');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [geoDraft, setGeoDraft] = useState({
    sido: '',
    sigungu: '',
    dong: '',
    recruiting: false,
  });

  useEffect(() => {
    setQuery(searchParams.get('q') || '');
    setSelectedRegion(searchParams.get('region') || '전체');
  }, [searchParams]);

  useEffect(() => {
    setGeoDraft({
      sido: searchParams.get('sido') || '',
      sigungu: searchParams.get('sigungu') || '',
      dong: searchParams.get('dong') || '',
      recruiting: recruitingParamIsTrue(searchParams.get('recruiting')),
    });
  }, [searchParams]);

  const loadFavorites = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from(TABLES.favorites)
      .select('institution_id')
      .eq('user_id', user.id);
    setFavorites(data?.map(f => f.institution_id) || []);
  }, [user]);

  const loadInstitutions = useCallback(async () => {
    setLoading(true);
    const sido = searchParams.get('sido')?.trim() ?? '';
    const sigungu = searchParams.get('sigungu')?.trim() ?? '';
    const dong = searchParams.get('dong')?.trim() ?? '';
    const recruitingOnly = recruitingParamIsTrue(searchParams.get('recruiting'));

    let instQuery = supabase
      .from(TABLES.institutions)
      .select('*')
      .eq('status', 'approved');

    if (sido) instQuery = instQuery.ilike('sido', `%${sido}%`);
    if (sigungu) instQuery = instQuery.ilike('sigungu', `%${sigungu}%`);
    if (dong) instQuery = instQuery.ilike('eupmyeondong', `%${dong}%`);
    if (recruitingOnly) instQuery = instQuery.eq('is_recruiting', true);

    const { data } = await instQuery.order('rating', { ascending: false });
    setInstitutions((data as Institution[]) || []);
    setLoading(false);
  }, [searchParams]);

  useEffect(() => {
    void loadInstitutions();
  }, [loadInstitutions]);

  useEffect(() => {
    if (!user) {
      setFavorites([]);
      return;
    }
    void loadFavorites();
  }, [user, loadFavorites]);

  const applyGeoFilters = () => {
    const next = new URLSearchParams(searchParams);
    const setOrDelete = (key: string, val: string) => {
      const t = val.trim();
      if (t) next.set(key, t);
      else next.delete(key);
    };
    setOrDelete('sido', geoDraft.sido);
    setOrDelete('sigungu', geoDraft.sigungu);
    setOrDelete('dong', geoDraft.dong);
    if (geoDraft.recruiting) next.set('recruiting', 'true');
    else next.delete('recruiting');
    next.set('q', query);
    next.set('region', selectedRegion);
    setSearchParams(next, { replace: true });
  };
  const toggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    if (favorites.includes(id)) {
      await supabase
        .from(TABLES.favorites)
        .delete()
        .eq('user_id', user.id)
        .eq('institution_id', id);
      setFavorites(prev => prev.filter(f => f !== id));
    } else {
      await supabase
        .from(TABLES.favorites)
        .insert({ user_id: user.id, institution_id: id });
      setFavorites(prev => [...prev, id]);
    }
  };

  const filteredInstitutions = useMemo(() => {
    return institutions.filter(inst => {
      const matchesQuery = query === '' || inst.name.includes(query) || inst.tags.some(t => t.includes(query));
      const matchesRegion = selectedRegion === '전체' || inst.region === selectedRegion;
      const matchesFilter =
        selectedFilter === 'all' ||
        (selectedFilter === 'vehicle' ? inst.has_vehicle : inst.type === selectedFilter || inst.tags.includes(selectedFilter));
      return matchesQuery && matchesRegion && matchesFilter;
    });
  }, [query, selectedRegion, selectedFilter, institutions]);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="flex-shrink-0 bg-white px-5 pt-3 pb-3 safe-top border-b border-slate-50">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
          <Input
            placeholder="유치원/어린이집 검색"
            className="pl-10 pr-10 h-[42px] rounded-[14px] border-0 bg-slate-50 text-[14px] placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-indigo-200"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-slate-300 rounded-full flex items-center justify-center"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          )}
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="page-content">
        <div className="px-5 pt-3 pb-4 animate-slide-up">
          {/* Region Filter */}
          <div className="flex gap-[6px] overflow-x-auto scrollbar-hide pb-2">
            {regions.map(region => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={`flex-shrink-0 px-3 py-[7px] rounded-full text-[11px] font-semibold transition-all touch-active ${
                  selectedRegion === region
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-300'
                    : 'bg-white text-slate-500 border border-slate-150'
                }`}
              >
                {region}
              </button>
            ))}
          </div>

          {/* 행정구역 URL 필터 (?sido=&sigungu=&dong=&recruiting=) — 지도 SDK는 추후 연동 */}
          <div className="bg-slate-50 rounded-[14px] p-3 mt-2 mb-2 space-y-2 border border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500">행정구역 · 모집 필터</p>
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="시/도"
                className="h-[38px] text-[12px] rounded-[10px] bg-white"
                value={geoDraft.sido}
                onChange={(e) => setGeoDraft(d => ({ ...d, sido: e.target.value }))}
              />
              <Input
                placeholder="시/군/구"
                className="h-[38px] text-[12px] rounded-[10px] bg-white col-span-2"
                value={geoDraft.sigungu}
                onChange={(e) => setGeoDraft(d => ({ ...d, sigungu: e.target.value }))}
              />
            </div>
            <Input
              placeholder="읍/면/동 (dong)"
              className="h-[38px] text-[12px] rounded-[10px] bg-white"
              value={geoDraft.dong}
              onChange={(e) => setGeoDraft(d => ({ ...d, dong: e.target.value }))}
            />
            <label className="flex items-center gap-2 text-[12px] text-slate-600">
              <input
                type="checkbox"
                checked={geoDraft.recruiting}
                onChange={(e) => setGeoDraft(d => ({ ...d, recruiting: e.target.checked }))}
                className="rounded w-4 h-4 accent-indigo-600"
              />
              모집 중만
            </label>
            <button
              type="button"
              onClick={applyGeoFilters}
              className="w-full h-[38px] rounded-[10px] bg-slate-700 text-white text-[12px] font-semibold touch-active"
            >
              필터 적용 (URL 반영)
            </button>
          </div>

          {/* Type Filter */}
          <div className="flex gap-[6px] mt-2 mb-4 overflow-x-auto scrollbar-hide">
            {filterOptions.map(filter => (
              <button
                key={filter.key}
                onClick={() => setSelectedFilter(filter.key)}
                className={`flex-shrink-0 px-3 py-[7px] rounded-full text-[11px] font-semibold transition-all touch-active ${
                  selectedFilter === filter.key
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
                    : 'bg-white text-slate-500 border border-slate-150'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Results Count */}
          <p className="text-[11px] text-slate-400 mb-3 font-medium">
            검색 결과 <span className="text-indigo-600 font-bold">{filteredInstitutions.length}</span>개
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full" />
            </div>
          ) : (
            <>
              {/* Results List */}
              <div className="space-y-[10px]">
                {filteredInstitutions.map(inst => (
                  <Link
                    key={inst.id}
                    to={`/detail/${inst.id}`}
                    className="block bg-white rounded-[16px] overflow-hidden card-shadow touch-active"
                  >
                    <div className="flex">
                      <img src={inst.image} alt={inst.name} className="w-[105px] h-[105px] object-cover" />
                      <div className="flex-1 p-3 pr-3.5">
                        <div className="flex items-start justify-between">
                          <h3 className="font-semibold text-[13px] text-slate-800 line-clamp-1 pr-2">{inst.name}</h3>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (isInCompare(inst.id)) {
                                  removeFromCompare(inst.id);
                                  toast({ description: '비교함에서 제거했습니다' });
                                } else {
                                  const success = addToCompare(inst);
                                  if (success) {
                                    toast({ description: '비교함에 추가! 📊' });
                                  } else {
                                    toast({ description: '최대 3개까지 가능합니다', variant: 'destructive' });
                                  }
                                }
                              }}
                              className="touch-active"
                            >
                              <GitCompareArrows
                                className={`w-[15px] h-[15px] transition-colors ${isInCompare(inst.id) ? 'text-indigo-600' : 'text-slate-300'}`}
                              />
                            </button>
                            <button
                              onClick={(e) => toggleFavorite(inst.id, e)}
                              className="flex-shrink-0 touch-active"
                            >
                              <Heart
                                className={`w-[16px] h-[16px] transition-colors ${favorites.includes(inst.id) ? 'fill-red-500 text-red-500' : 'text-slate-300'}`}
                              />
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-[3px] flex items-center">
                          <MapPin className="w-[11px] h-[11px] mr-[2px]" />{inst.region}
                        </p>
                        <div className="flex items-center gap-[3px] mt-[5px]">
                          <Star className="w-[13px] h-[13px] fill-amber-400 text-amber-400" />
                          <span className="text-[12px] font-semibold text-slate-700">{inst.rating}</span>
                          <span className="text-[10px] text-slate-400">({inst.review_count})</span>
                        </div>
                        <div className="flex gap-[5px] mt-[6px] flex-wrap">
                          {inst.tags.map(tag => (
                            <span key={tag} className="text-[9px] px-[6px] py-[2px] bg-indigo-50 text-indigo-600 rounded-[4px] font-medium">
                              {tag}
                            </span>
                          ))}
                          {inst.has_vehicle && (
                            <span className="text-[9px] px-[6px] py-[2px] bg-emerald-50 text-emerald-600 rounded-[4px] font-medium">
                              🚌 차량
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {filteredInstitutions.length === 0 && (
                <div className="text-center py-16 animate-fade-in">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <SearchIcon className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-slate-500 text-[13px] font-medium">검색 결과가 없습니다</p>
                  <p className="text-slate-400 text-[11px] mt-1">다른 키워드로 검색해보세요</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, Heart, Star, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase, Institution, TABLES } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('전체');
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const regions = [
    '전체',
    '서울 강남구',
    '서울 서초구',
    '서울 송파구',
    '서울 마포구',
    '경기 성남시',
    '경기 용인시',
  ];

  useEffect(() => {
    loadInstitutions();
    if (user) loadFavorites();
  }, [user]);

  const loadInstitutions = async () => {
    const { data } = await supabase
      .from(TABLES.institutions)
      .select('*')
      .eq('status', 'approved')
      .order('rating', { ascending: false });
    setInstitutions((data as Institution[]) || []);
    setLoading(false);
  };

  const loadFavorites = async () => {
    if (!user) return;
    const { data } = await supabase
      .from(TABLES.favorites)
      .select('institution_id')
      .eq('user_id', user.id);
    setFavorites(data?.map(f => f.institution_id) || []);
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

  const handleSearch = () => {
    const params = new URLSearchParams();
    params.set('q', searchQuery);
    params.set('region', selectedRegion);
    navigate(`/search?${params.toString()}`);
  };

  const recommendedInstitutions = [...institutions].sort((a, b) => b.rating - a.rating).slice(0, 4);
  const popularInstitutions = [...institutions].sort((a, b) => b.review_count - a.review_count).slice(0, 4);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="flex-shrink-0 bg-white px-5 pt-3 pb-2 safe-top">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
            드림키즈
          </h1>
          <p className="text-[11px] text-slate-400 mt-[-1px]">우리 아이 맞춤 유치원 찾기</p>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="page-content">
        <div className="px-5 pt-3 pb-4 animate-slide-up">
          {/* Search Section */}
          <div className="bg-white rounded-[20px] p-4 card-shadow-md mb-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
              <Input
                placeholder="유치원/어린이집 이름으로 검색"
                className="pl-10 h-[44px] rounded-[14px] border-0 bg-slate-50 text-[14px] placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-indigo-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            {/* Region Chips */}
            <div className="flex gap-[6px] mt-3 overflow-x-auto scrollbar-hide">
              {regions.slice(0, 5).map(region => (
                <button
                  key={region}
                  onClick={() => setSelectedRegion(region)}
                  className={`flex-shrink-0 px-3 py-[7px] rounded-full text-[11px] font-semibold transition-all touch-active ${
                    selectedRegion === region
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-300'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {region}
                </button>
              ))}
            </div>
            <button
              onClick={handleSearch}
              className="w-full mt-3 h-[44px] rounded-[14px] bg-indigo-600 text-white text-[14px] font-semibold shadow-sm shadow-indigo-300 touch-active"
            >
              검색하기
            </button>
          </div>

          {/* Hero Banner */}
          <div className="relative rounded-[20px] overflow-hidden mb-6 card-shadow-lg">
            <img
              src="https://mgx-backend-cdn.metadl.com/generate/images/1218366/2026-05-11/olwjeoiaagoq/hero-banner-kids-learning.png"
              alt="드림키즈 스튜디오"
              className="w-full h-[160px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent flex items-end p-5">
              <div>
                <p className="text-white font-bold text-[17px] leading-tight">우리 아이 첫 교육,</p>
                <p className="text-white/85 text-[13px] mt-0.5">신중하게 선택하세요 ✨</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full" />
            </div>
          ) : (
            <>
              {/* Recommended Section */}
              <section className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[15px] font-bold text-slate-800">⭐ 추천 유치원</h2>
                  <Link to="/search" className="text-[11px] text-indigo-500 font-semibold flex items-center touch-active">
                    더보기 <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="space-y-[10px]">
                  {recommendedInstitutions.map(inst => (
                    <Link
                      key={inst.id}
                      to={`/detail/${inst.id}`}
                      className="block bg-white rounded-[16px] overflow-hidden card-shadow touch-active"
                    >
                      <div className="flex">
                        <img src={inst.image} alt={inst.name} className="w-[96px] h-[96px] object-cover" />
                        <div className="flex-1 p-3 pr-3.5">
                          <div className="flex items-start justify-between">
                            <h3 className="font-semibold text-[13px] text-slate-800 line-clamp-1 pr-2">{inst.name}</h3>
                            <button
                              onClick={(e) => toggleFavorite(inst.id, e)}
                              className="flex-shrink-0 touch-active"
                            >
                              <Heart
                                className={`w-[16px] h-[16px] transition-colors ${favorites.includes(inst.id) ? 'fill-red-500 text-red-500' : 'text-slate-300'}`}
                              />
                            </button>
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
                            {inst.tags.slice(0, 2).map(tag => (
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
              </section>

              {/* Popular Section */}
              <section className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[15px] font-bold text-slate-800">🔥 인기 기관</h2>
                  <Link to="/search" className="text-[11px] text-indigo-500 font-semibold flex items-center touch-active">
                    더보기 <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-[10px]">
                  {popularInstitutions.map(inst => (
                    <Link
                      key={inst.id}
                      to={`/detail/${inst.id}`}
                      className="bg-white rounded-[16px] overflow-hidden card-shadow touch-active"
                    >
                      <div className="relative">
                        <img src={inst.image} alt={inst.name} className="w-full h-[100px] object-cover" />
                        <div className="absolute top-[6px] right-[6px] bg-white/95 backdrop-blur-sm rounded-full px-[6px] py-[2px] flex items-center gap-[2px]">
                          <Star className="w-[10px] h-[10px] fill-amber-400 text-amber-400" />
                          <span className="text-[9px] font-bold text-slate-700">{inst.rating}</span>
                        </div>
                      </div>
                      <div className="p-[10px]">
                        <h3 className="font-semibold text-[12px] text-slate-800 line-clamp-1">{inst.name}</h3>
                        <p className="text-[10px] text-slate-400 mt-[2px] flex items-center">
                          <MapPin className="w-[10px] h-[10px] mr-[2px]" />{inst.region}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
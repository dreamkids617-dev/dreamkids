import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Heart, Info, Newspaper } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { InstitutionNotice, TABLES, supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type FeedItem = InstitutionNotice & { institution_name?: string };

export default function NewsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'favorites' | 'all'>('favorites');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      let institutionIds: string[] = [];
      const nameMap = new Map<string, string>();

      if (user && mode === 'favorites') {
        const { data: favs } = await supabase
          .from(TABLES.favorites)
          .select('institution_id')
          .eq('user_id', user.id);
        institutionIds = (favs || []).map((f: { institution_id: string }) => f.institution_id);
      }

      let instQuery = supabase
        .from(TABLES.institutions)
        .select('id, name')
        .eq('status', 'approved');

      if (mode === 'favorites') {
        if (!user || institutionIds.length === 0) {
          if (!cancelled) {
            setItems([]);
            setLoading(false);
          }
          return;
        }
        instQuery = instQuery.in('id', institutionIds);
      }

      const { data: institutions } = await instQuery;
      const instRows = (institutions || []) as { id: string; name: string }[];
      instRows.forEach((i) => nameMap.set(i.id, i.name));
      const ids = instRows.map((i) => i.id);

      if (ids.length === 0) {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
        return;
      }

      const { data: notices } = await supabase
        .from(TABLES.notices)
        .select('*')
        .in('institution_id', ids)
        .order('created_at', { ascending: false })
        .limit(40);

      if (cancelled) return;
      const feed = ((notices as InstitutionNotice[]) || []).map((n) => ({
        ...n,
        institution_name: nameMap.get(n.institution_id) || '기관',
      }));
      setItems(feed);
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, mode]);

  return (
    <div className="app-container">
      <header className="flex-shrink-0 bg-white px-5 pt-3 pb-3 safe-top border-b border-slate-50">
        <h1 className="text-[18px] font-bold text-slate-800">소식</h1>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          찜한 기관·전체 승인 기관의 소식을 모아서 봅니다
        </p>
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={() => setMode('favorites')}
            className={`text-[11px] px-3 py-1.5 rounded-full font-semibold ${
              mode === 'favorites' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            찜한 기관
          </button>
          <button
            type="button"
            onClick={() => setMode('all')}
            className={`text-[11px] px-3 py-1.5 rounded-full font-semibold ${
              mode === 'all' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            전체 소식
          </button>
        </div>
      </header>

      <div className="page-content">
        <div className="px-5 pt-4 pb-4 animate-slide-up space-y-3">
          <div className="bg-amber-50 border border-amber-100 rounded-[16px] px-4 py-3 flex gap-2">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700/90 leading-relaxed">
              팔로우·푸시 알림은 아직 없습니다. 지금은 찜 목록과 공개 소식을 기준으로 피드를 만듭니다.
            </p>
          </div>

          {mode === 'favorites' && !user && (
            <div className="bg-white rounded-[16px] p-4 card-shadow text-center">
              <Heart className="w-7 h-7 text-slate-200 mx-auto mb-2" />
              <p className="text-[12px] text-slate-500">찜한 기관 소식을 보려면 로그인해 주세요</p>
              <Link to="/login" className="inline-block mt-2 text-[12px] text-indigo-600 font-semibold">
                로그인
              </Link>
            </div>
          )}

          {loading ? (
            <p className="text-center text-[12px] text-slate-400 py-10">불러오는 중…</p>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-[16px] p-6 card-shadow text-center">
              <Newspaper className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-[13px] text-slate-500">표시할 소식이 없습니다</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {mode === 'favorites'
                  ? '기관을 찜하거나 「전체 소식」을 눌러 보세요'
                  : '관리자가 기관 소식을 등록하면 여기에 나타납니다'}
              </p>
            </div>
          ) : (
            items.map((item) => (
              <Link
                key={item.id}
                to={`/detail/${item.institution_id}`}
                className="block bg-white rounded-[16px] p-4 card-shadow"
              >
                <div className="flex items-center gap-1.5 text-[10px] text-indigo-500 font-semibold">
                  <Bell className="w-3 h-3" />
                  {item.institution_name}
                </div>
                <h2 className="text-[14px] font-semibold text-slate-800 mt-1">{item.title}</h2>
                <p className="text-[12px] text-slate-500 mt-1 line-clamp-3 whitespace-pre-wrap">
                  {item.content}
                </p>
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt=""
                    className="mt-2 w-full max-h-40 object-cover rounded-[12px]"
                  />
                ) : null}
                <p className="text-[10px] text-slate-300 mt-2">
                  {new Date(item.created_at).toLocaleDateString('ko-KR')}
                </p>
              </Link>
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PenLine, MessageCircle } from 'lucide-react';
import {
  supabase,
  TABLES,
  COMMUNITY_CATEGORIES,
  ParentPost,
  CommunityCategory,
} from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import CommunityPostCard from '@/components/CommunityPostCard';

type CategoryFilter = 'all' | CommunityCategory;

export default function CommunityPage() {
  const [posts, setPosts] = useState<ParentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  useEffect(() => {
    loadPosts();
  }, [categoryFilter]);

  const loadPosts = async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from(TABLES.parent_posts)
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (categoryFilter !== 'all') {
      query = query.eq('category', categoryFilter);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError('글 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      setPosts([]);
    } else {
      setPosts((data as ParentPost[]) || []);
    }
    setLoading(false);
  };

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
              onClick={() => setCategoryFilter('all')}
              className={`flex-shrink-0 px-3 py-[6px] rounded-full text-[11px] font-semibold touch-active ${
                categoryFilter === 'all'
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
                onClick={() => setCategoryFilter(value)}
                className={`flex-shrink-0 px-3 py-[6px] rounded-full text-[11px] font-semibold touch-active whitespace-nowrap ${
                  categoryFilter === value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-6 h-6 border-3 border-indigo-200 border-t-indigo-600 rounded-full" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-[16px] px-4 py-4 text-center">
              <p className="text-[12px] text-red-600">{error}</p>
              <button
                type="button"
                onClick={loadPosts}
                className="mt-3 text-[12px] font-semibold text-indigo-600 touch-active"
              >
                다시 시도
              </button>
            </div>
          ) : posts.length === 0 ? (
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

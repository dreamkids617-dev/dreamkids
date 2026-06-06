import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  CommunityCategory,
  ParentPostInsert,
} from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import BottomNav from '@/components/BottomNav';

type ProfileWithDisplay = {
  id: string;
  name: string;
  display_name?: string | null;
  role: string;
};

export default function CommunityNewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, loading: authLoading, role, isAdmin, needsEmailVerification } = useAuth();

  const [category, setCategory] = useState<CommunityCategory | ''>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [regionSido, setRegionSido] = useState('');
  const [regionSigungu, setRegionSigungu] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isParentUser = !!user && !!profile && role === 'user' && !isAdmin;
  const canWriteCommunity = isParentUser && !needsEmailVerification;

  const getAuthorDisplayName = () => {
    const extended = profile as ProfileWithDisplay | null;
    return (
      extended?.display_name?.trim() ||
      profile?.name?.trim() ||
      user?.user_metadata?.name?.trim() ||
      '학부모'
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !profile) {
      toast({ description: '로그인이 필요합니다', variant: 'destructive' });
      navigate('/login');
      return;
    }

    if (!isParentUser) {
      toast({
        description: '일반 학부모 계정만 커뮤니티 글을 작성할 수 있습니다',
        variant: 'destructive',
      });
      return;
    }

    if (needsEmailVerification) {
      toast({
        description: '이메일 인증 후 커뮤니티 글을 작성할 수 있습니다',
        variant: 'destructive',
      });
      return;
    }

    if (!category || !title.trim() || !content.trim()) {
      toast({ description: '카테고리, 제목, 내용을 입력해주세요', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    const payload: ParentPostInsert = {
      author_profile_id: profile.id,
      author_user_id: user.id,
      author_display_name: getAuthorDisplayName(),
      category,
      title: title.trim(),
      content: content.trim(),
      region_sido: regionSido.trim() || null,
      region_sigungu: regionSigungu.trim() || null,
      status: 'published',
      report_count: 0,
    };

    const { data, error } = await supabase
      .from(TABLES.parent_posts)
      .insert(payload)
      .select('id')
      .single();

    setSubmitting(false);

    if (error) {
      toast({
        description: error.message || '글 작성에 실패했습니다',
        variant: 'destructive',
      });
      return;
    }

    toast({ description: '글이 등록되었습니다' });
    if (data?.id) {
      navigate(`/community/${data.id}`);
    } else {
      navigate('/community');
    }
  };

  if (authLoading) {
    return (
      <div className="app-container">
        <div className="flex items-center justify-center flex-1 py-20">
          <div className="animate-spin w-6 h-6 border-3 border-indigo-200 border-t-indigo-600 rounded-full" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-container">
        <header className="flex-shrink-0 bg-white px-5 pt-3 pb-3 safe-top border-b border-slate-50">
          <Link to="/community" className="inline-flex items-center gap-1 text-[12px] text-slate-500 touch-active">
            <ArrowLeft className="w-4 h-4" />
            커뮤니티
          </Link>
          <h1 className="text-[18px] font-bold text-slate-800 mt-2">글쓰기</h1>
        </header>
        <div className="page-content px-5 pt-8 pb-4 text-center">
          <p className="text-[13px] text-slate-500 mb-4">글을 작성하려면 로그인이 필요합니다</p>
          <Link
            to="/login"
            className="inline-flex px-6 h-11 rounded-[12px] bg-indigo-600 text-white text-[13px] font-semibold items-center touch-active"
          >
            로그인 / 회원가입
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!isParentUser) {
    return (
      <div className="app-container">
        <header className="flex-shrink-0 bg-white px-5 pt-3 pb-3 safe-top border-b border-slate-50">
          <Link to="/community" className="inline-flex items-center gap-1 text-[12px] text-slate-500 touch-active">
            <ArrowLeft className="w-4 h-4" />
            커뮤니티
          </Link>
          <h1 className="text-[18px] font-bold text-slate-800 mt-2">글쓰기</h1>
        </header>
        <div className="page-content px-5 pt-6 pb-4">
          <div className="bg-amber-50 border border-amber-100 rounded-[16px] px-4 py-4">
            <p className="text-[12px] font-semibold text-amber-800">작성 권한 안내</p>
            <p className="text-[11px] text-amber-700/90 mt-2 leading-relaxed">
              커뮤니티 글 작성은 일반 학부모(role=user) 계정만 가능합니다. 관리자 계정은 운영·신고
              처리 전용입니다.
            </p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!canWriteCommunity) {
    return (
      <div className="app-container">
        <header className="flex-shrink-0 bg-white px-5 pt-3 pb-3 safe-top border-b border-slate-50">
          <Link to="/community" className="inline-flex items-center gap-1 text-[12px] text-slate-500 touch-active">
            <ArrowLeft className="w-4 h-4" />
            커뮤니티
          </Link>
          <h1 className="text-[18px] font-bold text-slate-800 mt-2">글쓰기</h1>
        </header>
        <div className="page-content px-5 pt-6 pb-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-[16px] px-4 py-4">
            <p className="text-[12px] font-semibold text-indigo-800">이메일 인증 필요</p>
            <p className="text-[11px] text-indigo-700/90 mt-2 leading-relaxed">
              이메일 인증 후 커뮤니티 글을 작성할 수 있습니다. 인증 메일을 확인하거나 다시
              보내주세요.
            </p>
            <Link
              to="/verify-email"
              state={{ email: user?.email || '' }}
              className="inline-flex mt-4 px-4 h-10 rounded-[12px] bg-indigo-600 text-white text-[12px] font-semibold items-center touch-active"
            >
              인증 안내 화면으로
            </Link>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="flex-shrink-0 bg-white px-5 pt-3 pb-3 safe-top border-b border-slate-50">
        <Link to="/community" className="inline-flex items-center gap-1 text-[12px] text-slate-500 touch-active">
          <ArrowLeft className="w-4 h-4" />
          커뮤니티
        </Link>
        <h1 className="text-[18px] font-bold text-slate-800 mt-2">글쓰기</h1>
      </header>

      <div className="page-content">
        <form onSubmit={handleSubmit} className="px-5 pt-4 pb-6 animate-slide-up space-y-4">
          <div className="bg-slate-50 border border-slate-100 rounded-[14px] px-4 py-3">
            <p className="text-[11px] text-slate-600 leading-relaxed">
              아이 이름, 연락처, 사진, 교사 실명 등 민감정보는 작성하지 마세요.
            </p>
          </div>

          <div>
            <label className="text-[12px] font-semibold text-slate-700 mb-2 block">카테고리</label>
            <Select value={category} onValueChange={(v) => setCategory(v as CommunityCategory)}>
              <SelectTrigger className="h-11 rounded-[12px]">
                <SelectValue placeholder="카테고리를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {COMMUNITY_CATEGORIES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {category === 'group_buy' && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-[14px] px-4 py-3">
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                현재는 공동구매 모집 글만 가능하며, 결제/주문/정산은 지원하지 않습니다.
              </p>
            </div>
          )}

          <div>
            <label className="text-[12px] font-semibold text-slate-700 mb-2 block">제목</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="h-11 rounded-[12px]"
              maxLength={120}
            />
          </div>

          <div>
            <label className="text-[12px] font-semibold text-slate-700 mb-2 block">내용</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요"
              className="min-h-[180px] rounded-[12px] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-semibold text-slate-700 mb-2 block">시/도</label>
              <Input
                value={regionSido}
                onChange={(e) => setRegionSido(e.target.value)}
                placeholder="예: 서울"
                className="h-11 rounded-[12px]"
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-slate-700 mb-2 block">시/군/구</label>
              <Input
                value={regionSigungu}
                onChange={(e) => setRegionSigungu(e.target.value)}
                placeholder="예: 강남구"
                className="h-11 rounded-[12px]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-[14px] bg-indigo-600 text-white text-[14px] font-semibold shadow-sm shadow-indigo-200 touch-active disabled:opacity-60"
          >
            {submitting ? '등록 중...' : '글 등록'}
          </button>
        </form>
      </div>

      <BottomNav />
    </div>
  );
}

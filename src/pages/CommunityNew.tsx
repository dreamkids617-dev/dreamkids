import { useEffect, useState } from 'react';
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
import { getProfileRegion } from '@/lib/communityUtils';
import { KOREA_SIDO_LIST, getSigunguOptions } from '@/lib/koreaRegions';
import { communityAuthorLabel } from '@/lib/parentProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import BottomNav from '@/components/BottomNav';

export default function CommunityNewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, loading: authLoading, role, isAdmin, needsEmailVerification, refreshProfile } =
    useAuth();

  const [category, setCategory] = useState<CommunityCategory | ''>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [regionSido, setRegionSido] = useState('');
  const [regionSigungu, setRegionSigungu] = useState('');
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [regionPrefilled, setRegionPrefilled] = useState(false);

  const sigunguOptions = regionSido ? getSigunguOptions(regionSido) : [];

  useEffect(() => {
    if (regionPrefilled || !profile) return;
    const { sido, sigungu } = getProfileRegion(profile);
    if (sido) setRegionSido(sido);
    if (sigungu) setRegionSigungu(sigungu);
    if (sido || sigungu) setRegionPrefilled(true);
  }, [profile, regionPrefilled]);

  useEffect(() => {
    if (profile?.display_name?.trim()) {
      setNicknameDraft(profile.display_name.trim());
    }
  }, [profile?.display_name]);

  const isParentUser = !!user && !!profile && role === 'user' && !isAdmin;
  const canWriteCommunity = isParentUser && !needsEmailVerification;
  const needsNicknameOnForm = canWriteCommunity && !profile?.display_name?.trim();

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

    const nickname = (profile.display_name?.trim() || nicknameDraft.trim());
    if (!nickname) {
      toast({
        description: '커뮤니티는 익명이 아닙니다. 닉네임을 입력해 주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!regionSido.trim() || !regionSigungu.trim()) {
      toast({
        description: '우리 동네(시/도·시/군/구)를 선택해 주세요. 동네 정보는 필수입니다.',
        variant: 'destructive',
      });
      return;
    }

    if (!category || !title.trim() || !content.trim()) {
      toast({ description: '카테고리, 제목, 내용을 입력해주세요', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    const profilePatch: {
      display_name?: string;
      region_sido?: string;
      region_sigungu?: string;
    } = {};
    if (!profile.display_name?.trim() || profile.display_name.trim() !== nickname) {
      profilePatch.display_name = nickname;
    }
    if (
      profile.region_sido?.trim() !== regionSido.trim() ||
      profile.region_sigungu?.trim() !== regionSigungu.trim()
    ) {
      profilePatch.region_sido = regionSido.trim();
      profilePatch.region_sigungu = regionSigungu.trim();
    }

    if (Object.keys(profilePatch).length > 0) {
      const { error: profileError } = await supabase
        .from(TABLES.profiles)
        .update(profilePatch)
        .eq('id', profile.id);
      if (profileError) {
        setSubmitting(false);
        toast({
          description: profileError.message || '프로필 저장에 실패했습니다',
          variant: 'destructive',
        });
        return;
      }
      await refreshProfile();
    }

    const payload: ParentPostInsert = {
      author_profile_id: profile.id,
      author_user_id: user.id,
      author_display_name: communityAuthorLabel({ displayName: nickname }),
      category,
      title: title.trim(),
      content: content.trim(),
      region_sido: regionSido.trim(),
      region_sigungu: regionSigungu.trim(),
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
              커뮤니티는 익명이 아닙니다. 닉네임이 글에 표시됩니다. 아이 이름·연락처·사진·교사 실명
              등 민감정보는 적지 마세요.{' '}
              <Link to="/community/guidelines" className="text-indigo-600 font-semibold">
                이용 안내
              </Link>
            </p>
          </div>

          {needsNicknameOnForm && (
            <div className="rounded-[14px] border border-indigo-100 bg-indigo-50/50 px-4 py-3 space-y-2">
              <label className="text-[12px] font-semibold text-slate-800 block">
                닉네임 <span className="text-indigo-600">(필수)</span>
              </label>
              <Input
                value={nicknameDraft}
                onChange={(e) => setNicknameDraft(e.target.value)}
                placeholder="다른 학부모에게 보일 이름"
                className="h-11 rounded-[12px] bg-white"
                maxLength={30}
              />
              <p className="text-[10px] text-slate-500 leading-relaxed">
                한 번 저장되면 프로필에도 반영됩니다. 글쓰기는 바로 이어서 할 수 있어요.
              </p>
            </div>
          )}

          {!needsNicknameOnForm && profile?.display_name?.trim() && (
            <p className="text-[11px] text-slate-500">
              작성자 표시: <span className="font-semibold text-slate-700">{profile.display_name.trim()}</span>
            </p>
          )}

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

          <div>
            <label className="text-[12px] font-semibold text-slate-700 mb-2 block">
              동네 <span className="text-indigo-600 font-semibold">(필수)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Select
                value={regionSido || undefined}
                onValueChange={(value) => {
                  setRegionSido(value);
                  setRegionSigungu('');
                }}
              >
                <SelectTrigger className="h-11 rounded-[12px]">
                  <SelectValue placeholder="시/도" />
                </SelectTrigger>
                <SelectContent>
                  {KOREA_SIDO_LIST.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={regionSigungu || undefined}
                onValueChange={(value) => {
                  setRegionSigungu(value);
                }}
                disabled={!regionSido}
              >
                <SelectTrigger className="h-11 rounded-[12px]">
                  <SelectValue placeholder="시/군/구" />
                </SelectTrigger>
                <SelectContent>
                  {sigunguOptions.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              프로필 동네와 맞춰 저장됩니다. 상세 주소는 받지 않아요. 이용자가 늘어나면 휴대폰·주소
              기반 자동 동네 인증으로 강화할 예정이에요.
            </p>
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

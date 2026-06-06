import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Flag, MapPin, Trash2, User } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  supabase,
  TABLES,
  ParentPost,
  PostReportReason,
  POST_REPORT_REASONS,
} from '@/lib/supabase';
import {
  formatCommunityDate,
  formatCommunityRegion,
  getCommunityCategoryLabel,
} from '@/lib/communityUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import BottomNav from '@/components/BottomNav';

export default function CommunityPostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, role, isAdmin, loading: authLoading } = useAuth();
  const loadSeqRef = useRef(0);

  const [post, setPost] = useState<ParentPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notAccessible, setNotAccessible] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<PostReportReason | ''>('');
  const [reportDetail, setReportDetail] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAuthor = !!user && !!post && post.author_user_id === user.id;
  const isParentUser = !!user && !!profile && role === 'user' && !isAdmin;
  const canReport = isParentUser && !!post && post.status === 'published' && !isAuthor;

  useEffect(() => {
    if (!id) return;

    if (authLoading) {
      setLoading(true);
      setNotAccessible(false);
      return;
    }

    const seq = ++loadSeqRef.current;
    let cancelled = false;

    const loadPost = async (postId: string) => {
      setLoading(true);
      setNotAccessible(false);

      const { data, error } = await supabase
        .from(TABLES.parent_posts)
        .select('*')
        .eq('id', postId)
        .maybeSingle();

      if (cancelled || seq !== loadSeqRef.current) return;

      if (error || !data) {
        setPost(null);
        setNotAccessible(true);
        setLoading(false);
        return;
      }

      const loaded = data as ParentPost;
      const isPublished = loaded.status === 'published';
      const isAuthorPost = !!user && loaded.author_user_id === user.id;

      if (isPublished || isAuthorPost) {
        setPost(loaded);
        setNotAccessible(false);
      } else {
        setPost(null);
        setNotAccessible(true);
      }
      setLoading(false);
    };

    loadPost(id);

    return () => {
      cancelled = true;
    };
  }, [id, user?.id, authLoading]);

  const handleDelete = async () => {
    if (!post || !isAuthor || post.status !== 'published') return;
    if (!window.confirm('이 글을 삭제할까요? 삭제 후에는 목록에 표시되지 않습니다.')) return;

    setDeleting(true);
    const { error } = await supabase
      .from(TABLES.parent_posts)
      .update({ status: 'deleted_by_author' })
      .eq('id', post.id);

    setDeleting(false);

    if (error) {
      toast({ description: '글 삭제에 실패했습니다', variant: 'destructive' });
      return;
    }

    toast({ description: '글이 삭제되었습니다' });
    navigate('/community');
  };

  const handleReport = async () => {
    if (!post || !profile || !reportReason) {
      toast({ description: '신고 사유를 선택해주세요', variant: 'destructive' });
      return;
    }

    setReportSubmitting(true);

    const { error } = await supabase.from(TABLES.post_reports).insert({
      reporter_profile_id: profile.id,
      post_id: post.id,
      reason_code: reportReason,
      reason_detail: reportDetail.trim() || null,
      status: 'pending',
    });

    setReportSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        toast({ description: '이미 신고한 글입니다' });
      } else {
        toast({ description: error.message || '신고에 실패했습니다', variant: 'destructive' });
      }
      return;
    }

    setReportOpen(false);
    setReportReason('');
    setReportDetail('');
    toast({ description: '신고가 접수되었습니다. 검토 후 조치됩니다.' });
  };

  const region = post ? formatCommunityRegion(post.region_sido, post.region_sigungu) : null;

  return (
    <div className="app-container">
      <header className="flex-shrink-0 bg-white px-5 pt-3 pb-3 safe-top border-b border-slate-50">
        <Link to="/community" className="inline-flex items-center gap-1 text-[12px] text-slate-500 touch-active">
          <ArrowLeft className="w-4 h-4" />
          커뮤니티
        </Link>
      </header>

      <div className="page-content">
        <div className="px-5 pt-4 pb-6 animate-slide-up">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-6 h-6 border-3 border-indigo-200 border-t-indigo-600 rounded-full" />
            </div>
          ) : notAccessible || !post ? (
            <div className="text-center py-16">
              <p className="text-[13px] text-slate-500 font-medium">글을 불러올 수 없습니다</p>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                삭제되었거나 숨김 처리된 글일 수 있습니다
              </p>
              <Link
                to="/community"
                className="inline-flex mt-4 text-[12px] font-semibold text-indigo-600 touch-active"
              >
                목록으로 돌아가기
              </Link>
            </div>
          ) : (
            <>
              {post.status === 'deleted_by_author' && isAuthor && (
                <div className="bg-slate-50 border border-slate-100 rounded-[14px] px-4 py-3 mb-4">
                  <p className="text-[11px] text-slate-600">작성자가 삭제한 글입니다. 본인에게만 보입니다.</p>
                </div>
              )}

              <div className="bg-white rounded-[16px] p-5 card-shadow">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-[3px] rounded-full">
                    {getCommunityCategoryLabel(post.category)}
                  </span>
                  <span className="text-[10px] text-slate-400">{formatCommunityDate(post.created_at)}</span>
                </div>

                <h1 className="text-[18px] font-bold text-slate-800 leading-snug">{post.title}</h1>

                <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {post.author_display_name}
                  </span>
                  {region && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {region}
                    </span>
                  )}
                </div>

                <p className="text-[14px] text-slate-700 mt-5 leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
              </div>

              <div className="flex gap-2 mt-4">
                {canReport && (
                  <button
                    type="button"
                    onClick={() => setReportOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[12px] border border-slate-200 text-[12px] font-semibold text-slate-600 touch-active"
                  >
                    <Flag className="w-4 h-4" />
                    신고
                  </button>
                )}
                {isAuthor && post.status === 'published' && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 flex items-center justify-center gap-2 h-11 rounded-[12px] border border-red-100 text-[12px] font-semibold text-red-500 touch-active disabled:opacity-60"
                  >
                    <Trash2 className="w-4 h-4" />
                    {deleting ? '삭제 중...' : '삭제'}
                  </button>
                )}
              </div>

              {!user && (
                <p className="text-[11px] text-slate-400 text-center mt-4">
                  신고는 로그인한 학부모만 가능합니다
                </p>
              )}
              {user && isAdmin && (
                <p className="text-[11px] text-slate-400 text-center mt-4">
                  관리자 계정은 커뮤니티 신고·작성이 제한됩니다
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="rounded-[16px] max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="text-[16px]">글 신고</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-[12px] font-semibold text-slate-700 mb-2 block">신고 사유</label>
              <Select value={reportReason} onValueChange={(v) => setReportReason(v as PostReportReason)}>
                <SelectTrigger className="h-11 rounded-[12px]">
                  <SelectValue placeholder="사유를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {POST_REPORT_REASONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[12px] font-semibold text-slate-700 mb-2 block">추가 설명 (선택)</label>
              <Textarea
                value={reportDetail}
                onChange={(e) => setReportDetail(e.target.value)}
                placeholder="추가로 전달할 내용이 있으면 입력하세요"
                className="min-h-[100px] rounded-[12px] resize-none"
              />
            </div>
            <button
              type="button"
              onClick={handleReport}
              disabled={reportSubmitting || !reportReason}
              className="w-full h-11 rounded-[12px] bg-indigo-600 text-white text-[13px] font-semibold touch-active disabled:opacity-60"
            >
              {reportSubmitting ? '접수 중...' : '신고 접수'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}

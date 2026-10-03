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
  PostComment,
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
  const { user, profile, role, isAdmin, loading: authLoading, needsEmailVerification } = useAuth();
  const loadSeqRef = useRef(0);

  const [post, setPost] = useState<ParentPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notAccessible, setNotAccessible] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<PostReportReason | ''>('');
  const [reportDetail, setReportDetail] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSaving, setCommentSaving] = useState(false);

  const isAuthor = !!user && !!post && post.author_user_id === user.id;
  const isParentUser = !!user && !!profile && role === 'user' && !isAdmin;
  const canReport =
    isParentUser && !needsEmailVerification && !!post && post.status === 'published' && !isAuthor;
  const canComment =
    isParentUser && !needsEmailVerification && !!post && post.status === 'published';

  const loadComments = async (postId: string) => {
    const { data } = await supabase
      .from(TABLES.post_comments)
      .select('*')
      .eq('post_id', postId)
      .eq('status', 'published')
      .order('created_at', { ascending: true })
      .limit(100);
    setComments((data as PostComment[]) || []);
  };

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
        if (isPublished) {
          await loadComments(postId);
        } else {
          setComments([]);
        }
      } else {
        setPost(null);
        setNotAccessible(true);
        setComments([]);
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

  const handleComment = async () => {
    if (!post || !user || !profile || !canComment) {
      toast({ description: '학부모 로그인·이메일 인증 후 댓글을 작성할 수 있습니다', variant: 'destructive' });
      return;
    }
    const content = commentDraft.trim();
    if (!content) {
      toast({ description: '댓글 내용을 입력해 주세요', variant: 'destructive' });
      return;
    }
    setCommentSaving(true);
    const display =
      profile.display_name?.trim() || profile.name?.trim() || user.email?.split('@')[0] || '학부모';
    const { data, error } = await supabase
      .from(TABLES.post_comments)
      .insert({
        post_id: post.id,
        author_profile_id: profile.id,
        author_user_id: user.id,
        author_display_name: display,
        content,
        status: 'published',
      })
      .select('*')
      .single();
    setCommentSaving(false);
    if (error) {
      toast({
        description: error.message || '댓글 등록 실패 (DB 마이그레이션 필요할 수 있음)',
        variant: 'destructive',
      });
      return;
    }
    setComments((prev) => [...prev, data as PostComment]);
    setCommentDraft('');
    toast({ description: '댓글을 등록했습니다' });
  };

  const handleDeleteComment = async (comment: PostComment) => {
    if (!user || comment.author_user_id !== user.id) return;
    if (!window.confirm('이 댓글을 삭제할까요?')) return;
    const { error } = await supabase
      .from(TABLES.post_comments)
      .update({ status: 'deleted_by_author', updated_at: new Date().toISOString() })
      .eq('id', comment.id);
    if (error) {
      toast({ description: '댓글 삭제에 실패했습니다', variant: 'destructive' });
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== comment.id));
    toast({ description: '댓글을 삭제했습니다' });
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

              {post.status === 'published' && (
                <div className="mt-5 bg-white rounded-[16px] p-4 card-shadow space-y-3">
                  <h2 className="text-[13px] font-bold text-slate-700">댓글 {comments.length}</h2>
                  {canComment ? (
                    <div className="space-y-2">
                      <Textarea
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        placeholder="댓글을 입력하세요"
                        className="min-h-[72px] rounded-[12px] text-[12px]"
                      />
                      <button
                        type="button"
                        onClick={() => void handleComment()}
                        disabled={commentSaving}
                        className="w-full h-10 rounded-[10px] bg-indigo-600 text-white text-[12px] font-semibold disabled:opacity-60"
                      >
                        {commentSaving ? '등록 중…' : '댓글 등록'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      학부모 로그인·이메일 인증 후 댓글을 작성할 수 있습니다.
                    </p>
                  )}
                  {comments.length === 0 ? (
                    <p className="text-[12px] text-slate-400 py-2">아직 댓글이 없습니다</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="p-3 bg-slate-50 rounded-[12px]">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[12px] font-semibold text-slate-700">{c.author_display_name}</p>
                          {user && c.author_user_id === user.id && (
                            <button
                              type="button"
                              onClick={() => void handleDeleteComment(c)}
                              className="text-[10px] text-red-500 font-semibold"
                            >
                              삭제
                            </button>
                          )}
                        </div>
                        <p className="text-[12px] text-slate-600 mt-1 whitespace-pre-wrap">{c.content}</p>
                        <p className="text-[10px] text-slate-300 mt-1">
                          {formatCommunityDate(c.created_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {!user && (
                <p className="text-[11px] text-slate-400 text-center mt-4">
                  신고·댓글은 로그인한 학부모만 가능합니다
                </p>
              )}
              {user && isAdmin && (
                <p className="text-[11px] text-slate-400 text-center mt-4">
                  관리자 계정은 커뮤니티 신고·작성이 제한됩니다
                </p>
              )}
              {user && isParentUser && needsEmailVerification && (
                <p className="text-[11px] text-slate-400 text-center mt-4">
                  이메일 인증 후 신고·댓글을 할 수 있습니다.{' '}
                  <Link to="/verify-email" state={{ email: user.email || '' }} className="text-indigo-600 font-semibold">
                    인증 안내
                  </Link>
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

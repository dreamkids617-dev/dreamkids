import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flag, ExternalLink } from 'lucide-react';
import {
  supabase,
  TABLES,
  POST_REPORT_REASONS,
  type PostReport,
  type PostReportStatus,
  type ParentPost,
  type ParentPostStatus,
  type Profile,
  logAdminAction,
} from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import {
  formatCommunityDate,
  formatCommunityRegion,
  getCommunityCategoryLabel,
  truncatePostContent,
} from '@/lib/communityUtils';
import { useToast } from '@/hooks/use-toast';

type StatusFilter = 'pending' | 'all' | 'handled';

type Props = {
  profile: Profile | null;
  user: User | null;
  onPendingCountChange?: (count: number) => void;
};

const REPORT_STATUS_LABELS: Record<PostReportStatus, string> = {
  pending: '대기',
  reviewed: '검토 완료',
  dismissed: '기각',
  action_taken: '조치 완료',
};

const POST_STATUS_LABELS: Record<ParentPostStatus, string> = {
  published: '게시중',
  hidden: '숨김',
  deleted_by_author: '작성자 삭제',
  removed_by_admin: '관리자 제거',
};

function getReportReasonLabel(code: string): string {
  return POST_REPORT_REASONS.find((r) => r.value === code)?.label ?? code;
}

function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

export default function AdminCommunityReports({ profile, user, onPendingCountChange }: Props) {
  const { toast } = useToast();
  const [reports, setReports] = useState<PostReport[]>([]);
  const [postsById, setPostsById] = useState<Record<string, ParentPost>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [actingId, setActingId] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from(TABLES.post_reports)
      .select('*')
      .order('created_at', { ascending: false });

    if (statusFilter === 'pending') {
      query = query.eq('status', 'pending');
    } else if (statusFilter === 'handled') {
      query = query.in('status', ['reviewed', 'dismissed', 'action_taken'] satisfies PostReportStatus[]);
    }

    const { data: reportData, error: reportError } = await query;

    if (reportError) {
      setError('신고 목록을 불러오지 못했습니다.');
      setReports([]);
      setPostsById({});
      setLoading(false);
      return;
    }

    const loadedReports = (reportData as PostReport[]) || [];
    setReports(loadedReports);

    const postIds = [...new Set(loadedReports.map((r) => r.post_id))];
    if (postIds.length === 0) {
      setPostsById({});
      setLoading(false);
      if (onPendingCountChange) {
        const { count } = await supabase
          .from(TABLES.post_reports)
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        onPendingCountChange(count ?? 0);
      }
      return;
    }

    const { data: postData, error: postError } = await supabase
      .from(TABLES.parent_posts)
      .select('*')
      .in('id', postIds);

    if (postError) {
      setError('신고 대상 글을 불러오지 못했습니다.');
      setPostsById({});
    } else {
      const map: Record<string, ParentPost> = {};
      for (const post of (postData as ParentPost[]) || []) {
        map[post.id] = post;
      }
      setPostsById(map);
    }

    if (onPendingCountChange) {
      const { count } = await supabase
        .from(TABLES.post_reports)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      onPendingCountChange(count ?? 0);
    }

    setLoading(false);
  }, [statusFilter, onPendingCountChange]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const ensureProfile = (): string | null => {
    if (!profile?.id) {
      toast({ description: '관리자 프로필 정보를 확인할 수 없습니다', variant: 'destructive' });
      return null;
    }
    return profile.id;
  };

  const handledPayload = (profileId: string) => ({
    handled_by_profile_id: profileId,
    handled_at: new Date().toISOString(),
  });

  const markPendingReportsActionTaken = async (postId: string, profileId: string) => {
    const { error } = await supabase
      .from(TABLES.post_reports)
      .update({ status: 'action_taken', ...handledPayload(profileId) })
      .eq('post_id', postId)
      .eq('status', 'pending');

    return error;
  };

  const updateReportStatus = async (
    reportId: string,
    status: PostReportStatus,
    profileId: string,
  ) => {
    const { error } = await supabase
      .from(TABLES.post_reports)
      .update({ status, ...handledPayload(profileId) })
      .eq('id', reportId);

    return error;
  };

  const handlePostModeration = async (
    report: PostReport,
    postStatus: 'hidden' | 'removed_by_admin',
    actionLabel: string,
  ) => {
    const profileId = ensureProfile();
    if (!profileId) return;

    setActingId(report.id);
    const post = postsById[report.post_id];

    const { error: postError } = await supabase
      .from(TABLES.parent_posts)
      .update({ status: postStatus })
      .eq('id', report.post_id);

    if (postError) {
      setActingId(null);
      toast({ description: '글 상태 변경에 실패했습니다', variant: 'destructive' });
      await loadReports();
      return;
    }

    const reportError = await markPendingReportsActionTaken(report.post_id, profileId);
    setActingId(null);

    if (reportError) {
      toast({
        description: '글은 처리됐으나 신고 상태 업데이트에 실패했습니다. 목록을 새로고침합니다.',
        variant: 'destructive',
      });
      await loadReports();
      return;
    }

    if (user?.email) {
      logAdminAction(
        user.email,
        actionLabel,
        `${post?.title ?? report.post_id} (post: ${shortId(report.post_id)})`,
      );
    }
    toast({ description: `${actionLabel} 완료` });
    await loadReports();
  };

  const handleReportOnly = async (
    report: PostReport,
    status: PostReportStatus,
    actionLabel: string,
  ) => {
    const profileId = ensureProfile();
    if (!profileId) return;

    setActingId(report.id);
    const error = await updateReportStatus(report.id, status, profileId);
    setActingId(null);

    if (error) {
      toast({ description: '신고 처리에 실패했습니다', variant: 'destructive' });
      await loadReports();
      return;
    }

    if (user?.email) {
      logAdminAction(user.email, actionLabel, `report ${shortId(report.id)} / post ${shortId(report.post_id)}`);
    }
    toast({ description: `${actionLabel} 완료` });
    await loadReports();
  };

  if (!profile) {
    return (
      <div className="text-center py-16 bg-white rounded-[16px] card-shadow">
        <p className="text-[13px] text-slate-500">관리자 프로필을 불러올 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-rose-50 to-orange-50 rounded-[14px] p-3">
        <p className="text-[11px] text-rose-700 font-medium leading-relaxed">
          커뮤니티 신고를 검토하고 글을 숨김·제거할 수 있습니다. 숨김/제거 시 동일 글의 대기 중 신고가 함께 조치 완료 처리됩니다.
        </p>
      </div>

      <div className="flex gap-[6px] overflow-x-auto scrollbar-hide">
        {(
          [
            { key: 'pending' as const, label: '대기' },
            { key: 'all' as const, label: '전체' },
            { key: 'handled' as const, label: '처리됨' },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(key)}
            className={`flex-shrink-0 px-3 py-[6px] rounded-full text-[11px] font-semibold touch-active ${
              statusFilter === key ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
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
            onClick={loadReports}
            className="mt-3 text-[12px] font-semibold text-indigo-600 touch-active"
          >
            다시 시도
          </button>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-[16px] card-shadow">
          <Flag className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-[13px] text-slate-400">
            {statusFilter === 'pending' ? '대기 중인 신고가 없습니다' : '표시할 신고가 없습니다'}
          </p>
        </div>
      ) : (
        <div className="space-y-[10px]">
          {reports.map((report) => {
            const post = postsById[report.post_id];
            const region = post ? formatCommunityRegion(post.region_sido, post.region_sigungu) : null;
            const isPending = report.status === 'pending';
            const isActing = actingId === report.id;

            return (
              <div key={report.id} className="bg-white rounded-[14px] p-4 card-shadow">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-[3px] rounded-full">
                        {getReportReasonLabel(report.reason_code)}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-[3px] rounded-full">
                        {REPORT_STATUS_LABELS[report.status]}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      신고일 {formatCommunityDate(report.created_at)} · 학부모 신고자 · post {shortId(report.post_id)}
                    </p>
                  </div>
                </div>

                {report.reason_detail && (
                  <p className="text-[11px] text-slate-600 bg-slate-50 rounded-[10px] px-3 py-2 mb-3 leading-relaxed">
                    {report.reason_detail}
                  </p>
                )}

                {post ? (
                  <div className="border border-slate-100 rounded-[12px] p-3 mb-3">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-[3px] rounded-full">
                        {getCommunityCategoryLabel(post.category)}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-[3px] rounded-full">
                        {POST_STATUS_LABELS[post.status]}
                      </span>
                    </div>
                    <h3 className="text-[13px] font-semibold text-slate-800">{post.title}</h3>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                      {truncatePostContent(post.content, 200)}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-slate-400">
                      <span>{post.author_display_name}</span>
                      {region && <span>· {region}</span>}
                      <span>· {formatCommunityDate(post.created_at)}</span>
                    </div>
                    {post.status === 'published' && (
                      <Link
                        to={`/community/${post.id}`}
                        className="inline-flex items-center gap-1 mt-3 text-[11px] font-semibold text-indigo-600 touch-active"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        공개 상세 보기
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="border border-amber-100 bg-amber-50 rounded-[12px] px-3 py-2 mb-3">
                    <p className="text-[11px] text-amber-700">신고 대상 글을 불러올 수 없습니다 (삭제·권한 제한 등)</p>
                  </div>
                )}

                {isPending && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isActing || !post}
                      onClick={() => handlePostModeration(report, 'hidden', '커뮤니티 글 숨김')}
                      className="text-[10px] px-3 py-[6px] bg-slate-700 text-white rounded-[8px] font-semibold touch-active disabled:opacity-50"
                    >
                      숨김 처리
                    </button>
                    <button
                      type="button"
                      disabled={isActing || !post}
                      onClick={() => handlePostModeration(report, 'removed_by_admin', '커뮤니티 글 관리자 제거')}
                      className="text-[10px] px-3 py-[6px] bg-red-500 text-white rounded-[8px] font-semibold touch-active disabled:opacity-50"
                    >
                      관리자 제거
                    </button>
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => handleReportOnly(report, 'dismissed', '커뮤니티 신고 기각')}
                      className="text-[10px] px-3 py-[6px] bg-slate-100 text-slate-600 rounded-[8px] font-semibold touch-active disabled:opacity-50"
                    >
                      신고 기각
                    </button>
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => handleReportOnly(report, 'reviewed', '커뮤니티 신고 검토 완료')}
                      className="text-[10px] px-3 py-[6px] bg-indigo-50 text-indigo-600 rounded-[8px] font-semibold touch-active disabled:opacity-50"
                    >
                      검토 완료
                    </button>
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => handleReportOnly(report, 'action_taken', '커뮤니티 신고 조치 완료')}
                      className="text-[10px] px-3 py-[6px] bg-emerald-50 text-emerald-600 rounded-[8px] font-semibold touch-active disabled:opacity-50"
                    >
                      조치 완료
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

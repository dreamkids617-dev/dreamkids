import { Link } from 'react-router-dom';
import { ChevronRight, MapPin, User } from 'lucide-react';
import { ParentPost } from '@/lib/supabase';
import {
  formatCommunityDate,
  formatCommunityRegion,
  getCommunityCategoryLabel,
  truncatePostContent,
} from '@/lib/communityUtils';

type Props = {
  post: ParentPost;
};

export default function CommunityPostCard({ post }: Props) {
  const region = formatCommunityRegion(post.region_sido, post.region_sigungu);

  return (
    <Link
      to={`/community/${post.id}`}
      className="block bg-white rounded-[16px] p-4 card-shadow touch-active"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-[3px] rounded-full">
          {getCommunityCategoryLabel(post.category)}
        </span>
        <span className="text-[10px] text-slate-400 flex-shrink-0">
          {formatCommunityDate(post.created_at)}
        </span>
      </div>
      <h2 className="text-[14px] font-semibold text-slate-800 line-clamp-2">{post.title}</h2>
      <p className="text-[12px] text-slate-500 mt-2 leading-relaxed line-clamp-3">
        {truncatePostContent(post.content)}
      </p>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
        <div className="flex items-center gap-3 min-w-0 text-[10px] text-slate-400">
          <span className="flex items-center gap-1 min-w-0">
            <User className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{post.author_display_name}</span>
          </span>
          {region && (
            <span className="flex items-center gap-1 min-w-0">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{region}</span>
            </span>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
      </div>
    </Link>
  );
}

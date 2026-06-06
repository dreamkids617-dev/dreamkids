import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export interface Institution {
  id: string;
  name: string;
  region: string;
  address: string;
  description: string;
  image: string;
  tags: string[];
  type: string;
  has_vehicle: boolean;
  rating: number;
  review_count: number;
  status?: 'pending' | 'approved' | 'rejected';
  created_by?: string;
  business_no?: string;
  inst_no?: string;
  manager_name?: string;
  created_at?: string;
  director_message?: string;
  education_philosophy?: string;
  kindergarten_strengths?: string;
  recruitment_info?: string;
  /** Administrative region (e.g. 시/도) — used with sigungu/eupmyeondong for search; not map SDK. */
  sido?: string;
  sigungu?: string;
  eupmyeondong?: string;
  /** For a future map SDK only; no map integration in the app yet. */
  latitude?: number;
  /** For a future map SDK only; no map integration in the app yet. */
  longitude?: number;
  is_recruiting?: boolean;
}

export interface Favorite {
  id: string;
  user_id: string;
  institution_id: string;
  created_at: string;
}

export interface Inquiry {
  id: string;
  user_id: string;
  institution_id: string;
  institution_name: string;
  message: string;
  status: 'pending' | 'replied';
  created_at: string;
}

export interface RecentView {
  id: string;
  user_id: string;
  institution_id: string;
  viewed_at: string;
}

export type UserRole = 'super_admin' | 'admin' | 'user';

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  display_name?: string | null;
  region_sido?: string | null;
  region_sigungu?: string | null;
  child_age_band?: string | null;
}

export interface AdminLog {
  id: string;
  admin_email: string;
  action: string;
  detail: string;
  created_at: string;
}

export interface Reservation {
  id: string;
  user_id: string;
  institution_id: string;
  institution_name: string;
  reservation_date: string;
  time_slot: string;
  child_age: string;
  memo: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
}

export interface InstitutionNotice {
  id: string;
  institution_id: string;
  author_id: string;
  title: string;
  content: string;
  image_url: string;
  created_at: string;
}

export const COMMUNITY_CATEGORIES = [
  { value: 'admission_prep', label: '입학 준비' },
  { value: 'adaptation', label: '적응 기간' },
  { value: 'product_recommend', label: '유아용품 추천' },
  { value: 'group_buy', label: '공동구매 모집' },
  { value: 'share_used', label: '나눔/중고' },
  { value: 'local_info', label: '지역 육아 정보' },
  { value: 'institution_question', label: '기관 상담 질문' },
] as const;

export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number]['value'];

export const PARENT_POST_STATUSES = [
  'published',
  'hidden',
  'deleted_by_author',
  'removed_by_admin',
] as const;

export type ParentPostStatus = (typeof PARENT_POST_STATUSES)[number];

export const POST_REPORT_REASONS = [
  { value: 'spam', label: '광고/도배' },
  { value: 'privacy', label: '개인정보 노출' },
  { value: 'abuse', label: '욕설/비방' },
  { value: 'institution_defamation', label: '기관/교사 비방' },
  { value: 'unsafe_trade', label: '안전하지 않은 거래' },
  { value: 'other', label: '기타' },
] as const;

export type PostReportReason = (typeof POST_REPORT_REASONS)[number]['value'];

export const POST_REPORT_STATUSES = [
  'pending',
  'reviewed',
  'dismissed',
  'action_taken',
] as const;

export type PostReportStatus = (typeof POST_REPORT_STATUSES)[number];

export interface ParentPost {
  id: string;
  author_profile_id: string;
  author_user_id: string;
  author_display_name: string;
  category: CommunityCategory;
  title: string;
  content: string;
  region_sido: string | null;
  region_sigungu: string | null;
  status: ParentPostStatus;
  institution_id: string | null;
  report_count: number;
  created_at: string;
  updated_at: string;
}

export type ParentPostInsert = Pick<
  ParentPost,
  'author_profile_id' | 'author_user_id' | 'author_display_name' | 'category' | 'title' | 'content'
> & {
  region_sido?: string | null;
  region_sigungu?: string | null;
  status?: ParentPostStatus;
  institution_id?: string | null;
  report_count?: number;
};

export type ParentPostUpdate = Partial<
  Pick<ParentPost, 'title' | 'content' | 'category' | 'region_sido' | 'region_sigungu' | 'status'>
>;

export interface PostReport {
  id: string;
  reporter_profile_id: string;
  post_id: string;
  reason_code: PostReportReason;
  reason_detail: string | null;
  status: PostReportStatus;
  handled_by_profile_id: string | null;
  handled_at: string | null;
  created_at: string;
}

export type PostReportInsert = Pick<PostReport, 'reporter_profile_id' | 'post_id' | 'reason_code'> & {
  reason_detail?: string | null;
  status?: PostReportStatus;
};

export type PostReportUpdate = Partial<Pick<PostReport, 'status' | 'handled_by_profile_id' | 'handled_at'>>;

// Table names with session ID
const SESSION_ID = 'ffc7da1b64';
export const TABLES = {
  institutions: `institutions_${SESSION_ID}`,
  favorites: `favorites_${SESSION_ID}`,
  inquiries: `inquiries_${SESSION_ID}`,
  recent_views: `recent_views_${SESSION_ID}`,
  profiles: `profiles_${SESSION_ID}`,
  admin_logs: `admin_logs_${SESSION_ID}`,
  reservations: `reservations_${SESSION_ID}`,
  notices: `institution_notices_${SESSION_ID}`,
  parent_posts: `parent_posts_${SESSION_ID}`,
  post_reports: `post_reports_${SESSION_ID}`,
} as const;

export const STORAGE = {
  notice_images: `notice_images_${SESSION_ID}`,
} as const;

// Helper to log admin activity
export async function logAdminAction(email: string, action: string, detail: string = '') {
  await supabase.from(TABLES.admin_logs).insert({ admin_email: email, action, detail });
}
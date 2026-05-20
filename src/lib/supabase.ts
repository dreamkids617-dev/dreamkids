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
} as const;

export const STORAGE = {
  notice_images: `notice_images_${SESSION_ID}`,
} as const;

// Helper to log admin activity
export async function logAdminAction(email: string, action: string, detail: string = '') {
  await supabase.from(TABLES.admin_logs).insert({ admin_email: email, action, detail });
}
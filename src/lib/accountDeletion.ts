import { supabase } from '@/lib/supabase';

export const ACCOUNT_DELETION_RETENTION_DAYS = 30;

export function deletionPurgeDate(requestedAt: string): Date {
  const d = new Date(requestedAt);
  d.setDate(d.getDate() + ACCOUNT_DELETION_RETENTION_DAYS);
  return d;
}

export function isDeletionPending(deletionRequestedAt?: string | null): boolean {
  if (!deletionRequestedAt) return false;
  return deletionPurgeDate(deletionRequestedAt).getTime() > Date.now();
}

export async function requestAccountDeletion(): Promise<{ error: string | null; at: string | null }> {
  const { data, error } = await supabase.rpc('dk_request_account_deletion');
  if (error) return { error: error.message, at: null };
  return { error: null, at: (data as string) || new Date().toISOString() };
}

export async function cancelAccountDeletion(): Promise<{ error: string | null; cancelled: boolean }> {
  const { data, error } = await supabase.rpc('dk_cancel_account_deletion');
  if (error) return { error: error.message, cancelled: false };
  return { error: null, cancelled: !!data };
}

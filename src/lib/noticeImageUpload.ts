import { supabase, STORAGE } from '@/lib/supabase';

function extFromFile(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fromName)) {
    return fromName === 'jpeg' ? 'jpg' : fromName;
  }
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  return 'jpg';
}

/** Upload notice image to Storage path `{institution_id}/{uuid}.ext`. Returns public URL. */
export async function uploadNoticeImage(institutionId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 업로드할 수 있습니다');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('이미지는 5MB 이하만 업로드할 수 있습니다');
  }

  const path = `${institutionId}/${crypto.randomUUID()}.${extFromFile(file)}`;
  const { error } = await supabase.storage.from(STORAGE.notice_images).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error) {
    throw new Error(error.message || '이미지 업로드에 실패했습니다');
  }

  const { data } = supabase.storage.from(STORAGE.notice_images).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error('업로드 URL을 만들지 못했습니다');
  }
  return data.publicUrl;
}

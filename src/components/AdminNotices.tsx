import { useEffect, useState } from 'react';
import { Newspaper, Plus, Trash2, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Institution,
  InstitutionNotice,
  TABLES,
  logAdminAction,
  supabase,
} from '@/lib/supabase';
import { uploadNoticeImage } from '@/lib/noticeImageUpload';
import { useToast } from '@/hooks/use-toast';

type Props = {
  institutions: Institution[];
  profileId?: string;
  adminEmail?: string;
};

export default function AdminNotices({ institutions, profileId, adminEmail }: Props) {
  const { toast } = useToast();
  const [notices, setNotices] = useState<InstitutionNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    institution_id: institutions[0]?.id || '',
    title: '',
    content: '',
    image_url: '',
  });

  const activeInstitutions = institutions.filter((i) => i.status !== 'deleted');

  const loadNotices = async () => {
    setLoading(true);
    const ids = activeInstitutions.map((i) => i.id);
    if (ids.length === 0) {
      setNotices([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from(TABLES.notices)
      .select('*')
      .in('institution_id', ids)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      toast({ description: '소식을 불러오지 못했습니다', variant: 'destructive' });
      setNotices([]);
    } else {
      setNotices((data as InstitutionNotice[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadNotices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutions.map((i) => i.id).join(',')]);

  useEffect(() => {
    if (!form.institution_id && activeInstitutions[0]?.id) {
      setForm((prev) => ({ ...prev, institution_id: activeInstitutions[0].id }));
    }
  }, [activeInstitutions, form.institution_id]);

  const handleUpload = async (file: File | undefined) => {
    if (!file || !form.institution_id) return;
    setUploading(true);
    try {
      const url = await uploadNoticeImage(form.institution_id, file);
      setForm((prev) => ({ ...prev, image_url: url }));
      toast({ description: '이미지를 업로드했습니다' });
    } catch (e) {
      toast({
        description: e instanceof Error ? e.message : '업로드 실패',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!profileId) {
      toast({ description: '프로필을 확인할 수 없습니다', variant: 'destructive' });
      return;
    }
    if (!form.institution_id || !form.title.trim() || !form.content.trim()) {
      toast({ description: '기관·제목·내용을 입력해주세요', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from(TABLES.notices)
      .insert({
        institution_id: form.institution_id,
        author_id: profileId,
        title: form.title.trim(),
        content: form.content.trim(),
        image_url: form.image_url.trim(),
      })
      .select('*')
      .single();
    setSaving(false);
    if (error) {
      toast({ description: error.message || '등록 실패', variant: 'destructive' });
      return;
    }
    const instName = activeInstitutions.find((i) => i.id === form.institution_id)?.name || '';
    if (adminEmail) logAdminAction(adminEmail, '기관 소식 등록', instName);
    setNotices((prev) => [data as InstitutionNotice, ...prev]);
    setForm((prev) => ({ ...prev, title: '', content: '', image_url: '' }));
    toast({ description: '소식을 등록했습니다' });
  };

  const handleDelete = async (notice: InstitutionNotice) => {
    if (!confirm('이 소식을 삭제할까요?')) return;
    const { error } = await supabase.from(TABLES.notices).delete().eq('id', notice.id);
    if (error) {
      toast({ description: '삭제 실패', variant: 'destructive' });
      return;
    }
    if (adminEmail) logAdminAction(adminEmail, '기관 소식 삭제', notice.title);
    setNotices((prev) => prev.filter((n) => n.id !== notice.id));
    toast({ description: '삭제되었습니다' });
  };

  const nameOf = (id: string) => activeInstitutions.find((i) => i.id === id)?.name || id;

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-[12px] p-4 card-shadow space-y-3">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-indigo-500" />
          <h3 className="text-[13px] font-semibold text-slate-800">소식 등록</h3>
        </div>
        {activeInstitutions.length === 0 ? (
          <p className="text-[12px] text-slate-400">등록할 기관이 없습니다</p>
        ) : (
          <>
            <select
              className="w-full h-10 rounded-md border border-slate-200 px-3 text-[12px]"
              value={form.institution_id}
              onChange={(e) => setForm((prev) => ({ ...prev, institution_id: e.target.value }))}
            >
              {activeInstitutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} {inst.status && inst.status !== 'approved' ? `(${inst.status})` : ''}
                </option>
              ))}
            </select>
            <Input
              placeholder="제목"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="text-[12px]"
            />
            <Textarea
              placeholder="내용"
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              className="text-[12px] min-h-[90px]"
            />
            <Input
              placeholder="이미지 URL (선택) — 업로드 또는 URL 입력"
              value={form.image_url}
              onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
              className="text-[12px]"
            />
            <label className="inline-flex items-center gap-2 text-[11px] text-indigo-600 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              {uploading ? '업로드 중…' : '이미지 파일 업로드'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading || !form.institution_id}
                onChange={(e) => void handleUpload(e.target.files?.[0])}
              />
            </label>
            <p className="text-[10px] text-slate-400">
              Storage 버킷/정책 적용 전에는 업로드가 실패할 수 있습니다. URL 입력은 그대로 사용 가능합니다.
            </p>
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={saving}
              className="w-full h-10 rounded-[10px] bg-indigo-500 text-white text-[12px] font-semibold flex items-center justify-center gap-1 disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              {saving ? '등록 중…' : '소식 등록'}
            </button>
          </>
        )}
      </div>

      {loading ? (
        <p className="text-center text-[12px] text-slate-400 py-8">불러오는 중…</p>
      ) : notices.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-[16px] card-shadow">
          <Newspaper className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-[13px] text-slate-400">등록된 소식이 없습니다</p>
        </div>
      ) : (
        notices.map((n) => (
          <div key={n.id} className="bg-white rounded-[12px] p-4 card-shadow">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] text-indigo-500 font-semibold">{nameOf(n.institution_id)}</p>
                <h4 className="text-[13px] font-semibold text-slate-800 mt-0.5">{n.title}</h4>
                <p className="text-[11px] text-slate-500 mt-1 whitespace-pre-wrap">{n.content}</p>
                {n.image_url ? (
                  <img src={n.image_url} alt="" className="mt-2 max-h-32 rounded-lg object-cover" />
                ) : null}
                <p className="text-[10px] text-slate-300 mt-2">
                  {new Date(n.created_at).toLocaleString('ko-KR')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleDelete(n)}
                className="p-2 text-slate-400 hover:text-red-500"
                aria-label="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

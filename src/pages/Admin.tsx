import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, MessageCircle, Building2, Users, Shield, CheckCircle, XCircle, BarChart3, Clock, CalendarCheck, Image, X, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase, Institution, Inquiry, Profile, AdminLog, Reservation, TABLES, logAdminAction } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

type AdminTab = 'dashboard' | 'institutions' | 'inquiries' | 'reservations' | 'admins';

const AVAILABLE_TAGS = [
  '놀이형', '학습형', '영어유치원', '자연친화', '소규모', '원어민',
  '예술', '창의력', '숲체험', 'STEAM', '체험학습', '독서',
  '안전', '정서발달', '음악', '체육', '과학', '요리',
];

export default function AdminPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin, isSuperAdmin, loading: authLoading, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [institutionsList, setInstitutionsList] = useState<Institution[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [adminsList, setAdminsList] = useState<Profile[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    region: '',
    address: '',
    sido: '',
    sigungu: '',
    eupmyeondong: '',
    latitude: '',
    longitude: '',
    is_recruiting: false,
    business_no: '',
    inst_no: '',
    manager_name: '',
    description: '',
    director_message: '',
    education_philosophy: '',
    kindergarten_strengths: '',
    recruitment_info: '',
    type: '놀이형',
    has_vehicle: false,
    selectedTags: [] as string[],
    imageUrls: [''] as string[],
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      const t = toast({ description: '관리자 권한이 없습니다', variant: 'destructive', className: 'text-[12px] py-2 px-3' });
      setTimeout(() => t.dismiss(), 3000);
      navigate('/admin/login');
    }
  }, [authLoading, isAdmin, navigate, toast]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
      if (user?.email) {
        logAdminAction(user.email, '로그인', '관리자 페이지 접속');
      }
    }
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);

    if (!isSuperAdmin && !profile?.id) {
      setInstitutionsList([]);
      setInquiries([]);
      setAdminsList([]);
      setTotalUsers(0);
      setReservations([]);
      setLogs([]);
      setLoading(false);
      return;
    }

    let instQuery = supabase
      .from(TABLES.institutions)
      .select('*')
      .order('created_at', { ascending: false });

    if (!isSuperAdmin && profile?.id) {
      instQuery = instQuery.eq('created_by', profile.id);
    }

    const { data: instData } = await instQuery;
    const scopedInstitutions = (instData as Institution[]) || [];
    const scopedInstitutionIds = scopedInstitutions.map(inst => inst.id);
    setInstitutionsList(scopedInstitutions);

    if (isSuperAdmin || scopedInstitutionIds.length > 0) {
      let inqQuery = supabase
        .from(TABLES.inquiries)
        .select('*')
        .order('created_at', { ascending: false });

      if (!isSuperAdmin) {
        inqQuery = inqQuery.in('institution_id', scopedInstitutionIds);
      }

      const { data: inqData } = await inqQuery;
      setInquiries((inqData as Inquiry[]) || []);
    } else {
      setInquiries([]);
    }

    if (isSuperAdmin) {
      const { data: adminsData } = await supabase
        .from(TABLES.profiles)
        .select('*')
        .in('role', ['super_admin', 'admin'])
        .order('created_at', { ascending: false });
      setAdminsList((adminsData as Profile[]) || []);

      const { data: usersData } = await supabase
        .from(TABLES.profiles)
        .select('id');
      setTotalUsers(usersData?.length || 0);
    } else {
      setAdminsList([]);
      setTotalUsers(0);
    }

    if (isSuperAdmin || scopedInstitutionIds.length > 0) {
      let resQuery = supabase
        .from(TABLES.reservations)
        .select('*')
        .order('created_at', { ascending: false });

      if (!isSuperAdmin) {
        resQuery = resQuery.in('institution_id', scopedInstitutionIds);
      }

      const { data: resData } = await resQuery;
      setReservations((resData as Reservation[]) || []);
    } else {
      setReservations([]);
    }

    let logsQuery = supabase
      .from(TABLES.admin_logs)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!isSuperAdmin && user?.email) {
      logsQuery = logsQuery.eq('admin_email', user.email);
    }

    const { data: logsData } = await logsQuery;
    setLogs((logsData as AdminLog[]) || []);

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.region) {
      toast({ description: '기관명과 지역은 필수입니다', variant: 'destructive' });
      return;
    }
    if (!formData.business_no || !formData.inst_no || !formData.manager_name) {
      toast({ description: '사업자 번호, 기관 번호, 담당자 정보는 필수입니다', variant: 'destructive' });
      return;
    }
    if (!editingId && !profile?.id) {
      toast({ description: '관리자 프로필 정보를 확인할 수 없습니다', variant: 'destructive' });
      return;
    }

    const validImages = formData.imageUrls.filter(url => url.trim() !== '');
    const mainImage = validImages.length > 0
      ? validImages[0]
      : 'https://mgx-backend-cdn.metadl.com/generate/images/1218366/2026-05-11/olwjb3qaagnq/kindergarten-classroom.png';

    const latParsed = formData.latitude.trim() === '' ? null : Number(formData.latitude);
    const lngParsed = formData.longitude.trim() === '' ? null : Number(formData.longitude);

    const institutionData = {
      name: formData.name,
      region: formData.region,
      address: formData.address,
      sido: formData.sido.trim() || null,
      sigungu: formData.sigungu.trim() || null,
      eupmyeondong: formData.eupmyeondong.trim() || null,
      latitude: latParsed !== null && Number.isFinite(latParsed) ? latParsed : null,
      longitude: lngParsed !== null && Number.isFinite(lngParsed) ? lngParsed : null,
      is_recruiting: formData.is_recruiting,
      business_no: formData.business_no,
      inst_no: formData.inst_no,
      manager_name: formData.manager_name,
      description: formData.description,
      director_message: formData.director_message,
      education_philosophy: formData.education_philosophy,
      kindergarten_strengths: formData.kindergarten_strengths,
      recruitment_info: formData.recruitment_info,
      image: mainImage,
      tags: formData.selectedTags,
      type: formData.type,
      has_vehicle: formData.has_vehicle,
      rating: 4.5,
      review_count: 0,
    };

    if (editingId) {
      const { error } = await supabase
        .from(TABLES.institutions)
        .update(institutionData)
        .eq('id', editingId);
      if (error) {
        toast({ description: '수정에 실패했습니다', variant: 'destructive' });
        return;
      }
      if (user?.email) logAdminAction(user.email, '기관 수정', formData.name);
      toast({ description: '기관 정보가 수정되었습니다 ✏️' });
    } else {
      const newStatus = isSuperAdmin ? 'approved' : 'pending';
      const { error } = await supabase
        .from(TABLES.institutions)
        .insert({
          ...institutionData,
          status: newStatus,
          created_by: profile?.id,
        });
      if (error) {
        toast({ description: '등록에 실패했습니다', variant: 'destructive' });
        return;
      }
      if (user?.email) logAdminAction(user.email, '기관 등록', formData.name);
      if (isSuperAdmin) {
        toast({ description: '새 기관이 등록되었습니다 🎉' });
      } else {
        toast({
          description: '승인 대기 상태로 등록되었습니다. 대표 관리자 승인 후 공개됩니다.',
          className: 'text-[12px] py-2 px-3',
        });
      }
    }

    resetForm();
    loadData();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      region: '',
      address: '',
      sido: '',
      sigungu: '',
      eupmyeondong: '',
      latitude: '',
      longitude: '',
      is_recruiting: false,
      business_no: '',
      inst_no: '',
      manager_name: '',
      description: '',
      director_message: '',
      education_philosophy: '',
      kindergarten_strengths: '',
      recruitment_info: '',
      type: '놀이형',
      has_vehicle: false,
      selectedTags: [],
      imageUrls: [''],
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (inst: Institution) => {
    setFormData({
      name: inst.name,
      region: inst.region,
      address: inst.address,
      sido: inst.sido ?? '',
      sigungu: inst.sigungu ?? '',
      eupmyeondong: inst.eupmyeondong ?? '',
      latitude: inst.latitude != null && Number.isFinite(inst.latitude) ? String(inst.latitude) : '',
      longitude: inst.longitude != null && Number.isFinite(inst.longitude) ? String(inst.longitude) : '',
      is_recruiting: inst.is_recruiting ?? false,
      business_no: inst.business_no || '',
      inst_no: inst.inst_no || '',
      manager_name: inst.manager_name || '',
      description: inst.description || '',
      director_message: inst.director_message || '',
      education_philosophy: inst.education_philosophy || '',
      kindergarten_strengths: inst.kindergarten_strengths || '',
      recruitment_info: inst.recruitment_info || '',
      type: inst.type,
      has_vehicle: inst.has_vehicle,
      selectedTags: inst.tags || [],
      imageUrls: inst.image ? [inst.image] : [''],
    });
    setEditingId(inst.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const inst = institutionsList.find(i => i.id === id);
    const { error } = await supabase
      .from(TABLES.institutions)
      .delete()
      .eq('id', id);
    if (error) {
      toast({ description: '삭제에 실패했습니다', variant: 'destructive' });
      return;
    }
    if (user?.email) logAdminAction(user.email, '기관 삭제', inst?.name || '');
    setInstitutionsList(prev => prev.filter(i => i.id !== id));
    toast({ description: '기관이 삭제되었습니다' });
  };

  const handleDeleteAllMockData = async () => {
    if (!isSuperAdmin && !profile?.id) {
      toast({ description: '관리자 프로필 정보를 확인할 수 없습니다', variant: 'destructive' });
      return;
    }

    let deleteQuery = supabase
      .from(TABLES.institutions)
      .delete();

    deleteQuery = isSuperAdmin
      ? deleteQuery.neq('id', '00000000-0000-0000-0000-000000000000') // delete all rows
      : deleteQuery.eq('created_by', profile!.id);

    const { error } = await deleteQuery;
    if (error) {
      toast({ description: '삭제에 실패했습니다: ' + error.message, variant: 'destructive' });
      return;
    }
    if (user?.email) logAdminAction(user.email, isSuperAdmin ? '전체 기관 삭제' : '내 기관 전체 삭제', `${institutionsList.length}개 기관 일괄 삭제`);
    setInstitutionsList([]);
    setShowDeleteAllConfirm(false);
    toast({ description: isSuperAdmin ? '모든 기관 데이터가 삭제되었습니다 🗑️' : '내가 등록한 기관 데이터가 삭제되었습니다 🗑️' });
  };

  const handleTagToggle = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter(t => t !== tag)
        : [...prev.selectedTags, tag],
    }));
  };

  const handleAddImageUrl = () => {
    if (formData.imageUrls.length < 5) {
      setFormData(prev => ({ ...prev, imageUrls: [...prev.imageUrls, ''] }));
    }
  };

  const handleRemoveImageUrl = (index: number) => {
    setFormData(prev => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index),
    }));
  };

  const handleImageUrlChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      imageUrls: prev.imageUrls.map((url, i) => i === index ? value : url),
    }));
  };

  const handleReply = async (inqId: string) => {
    const inq = inquiries.find(i => i.id === inqId);
    const { error } = await supabase
      .from(TABLES.inquiries)
      .update({ status: 'replied' })
      .eq('id', inqId);
    if (error) {
      toast({ description: '상태 변경에 실패했습니다', variant: 'destructive' });
      return;
    }
    if (user?.email) logAdminAction(user.email, '문의 답변', inq?.institution_name || '');
    setInquiries(prev => prev.map(i => i.id === inqId ? { ...i, status: 'replied' as const } : i));
    toast({ description: '답변 완료 처리되었습니다 ✅' });
  };

  const handleReservationStatus = async (resId: string, newStatus: 'confirmed' | 'cancelled') => {
    const res = reservations.find(r => r.id === resId);
    const { error } = await supabase
      .from(TABLES.reservations)
      .update({ status: newStatus })
      .eq('id', resId);
    if (error) {
      toast({ description: '상태 변경에 실패했습니다', variant: 'destructive' });
      return;
    }
    const actionLabel = newStatus === 'confirmed' ? '예약 확정' : '예약 취소';
    if (user?.email) logAdminAction(user.email, actionLabel, res?.institution_name || '');
    setReservations(prev => prev.map(r => r.id === resId ? { ...r, status: newStatus } : r));
    toast({ description: newStatus === 'confirmed' ? '예약이 확정되었습니다 ✅' : '예약이 취소되었습니다' });
  };

  const handleInstitutionStatus = async (instId: string, newStatus: 'approved' | 'rejected') => {
    if (!isSuperAdmin) {
      toast({ description: '대표 관리자만 기관 승인 상태를 변경할 수 있습니다', variant: 'destructive' });
      return;
    }

    const inst = institutionsList.find(i => i.id === instId);
    const { error } = await supabase
      .from(TABLES.institutions)
      .update({ status: newStatus })
      .eq('id', instId);

    if (error) {
      toast({ description: '기관 승인 상태 변경에 실패했습니다', variant: 'destructive' });
      return;
    }

    const actionLabel = newStatus === 'approved' ? '기관 승인' : '기관 거절';
    if (user?.email) logAdminAction(user.email, actionLabel, inst?.name || '');
    setInstitutionsList(prev => prev.map(i => i.id === instId ? { ...i, status: newStatus } : i));
    toast({ description: newStatus === 'approved' ? '기관이 승인되었습니다 ✅' : '기관 등록이 거절되었습니다' });
  };

  const handleApproveAdmin = async (adminId: string) => {
    const admin = adminsList.find(a => a.id === adminId);
    const { error } = await supabase
      .from(TABLES.profiles)
      .update({ is_approved: true })
      .eq('id', adminId);
    if (error) {
      toast({ description: '승인에 실패했습니다', variant: 'destructive' });
      return;
    }
    if (user?.email) logAdminAction(user.email, '관리자 승인', admin?.email || '');
    setAdminsList(prev => prev.map(a => a.id === adminId ? { ...a, is_approved: true } : a));
    toast({ description: '관리자가 승인되었습니다 ✅' });
  };

  const handleToggleActive = async (adminId: string, currentActive: boolean) => {
    const admin = adminsList.find(a => a.id === adminId);
    const { error } = await supabase
      .from(TABLES.profiles)
      .update({ is_active: !currentActive })
      .eq('id', adminId);
    if (error) {
      toast({ description: '상태 변경에 실패했습니다', variant: 'destructive' });
      return;
    }
    if (user?.email) logAdminAction(user.email, currentActive ? '관리자 비활성화' : '관리자 활성화', admin?.email || '');
    setAdminsList(prev => prev.map(a => a.id === adminId ? { ...a, is_active: !currentActive } : a));
    toast({ description: !currentActive ? '관리자가 활성화되었습니다' : '관리자가 비활성화되었습니다' });
  };

  const handleDeleteAdmin = async (adminId: string, adminRole: string) => {
    if (adminRole === 'super_admin') {
      toast({ description: '대표 관리자는 삭제할 수 없습니다', variant: 'destructive' });
      return;
    }
    const admin = adminsList.find(a => a.id === adminId);
    const { error } = await supabase
      .from(TABLES.profiles)
      .update({ role: 'user', is_approved: false })
      .eq('id', adminId);
    if (error) {
      toast({ description: '삭제에 실패했습니다', variant: 'destructive' });
      return;
    }
    if (user?.email) logAdminAction(user.email, '관리자 권한 제거', admin?.email || '');
    setAdminsList(prev => prev.filter(a => a.id !== adminId));
    toast({ description: '관리자 권한이 제거되었습니다' });
  };

  const getActionIcon = (action: string) => {
    if (action.includes('기관')) return <Building2 className="w-3 h-3" />;
    if (action.includes('문의')) return <MessageCircle className="w-3 h-3" />;
    if (action.includes('관리자')) return <Shield className="w-3 h-3" />;
    if (action.includes('예약')) return <CalendarCheck className="w-3 h-3" />;
    return <Clock className="w-3 h-3" />;
  };

  const getActionColor = (action: string) => {
    if (action.includes('등록') || action.includes('확정')) return 'text-emerald-600 bg-emerald-50';
    if (action.includes('수정')) return 'text-blue-600 bg-blue-50';
    if (action.includes('삭제') || action.includes('제거') || action.includes('취소')) return 'text-red-600 bg-red-50';
    if (action.includes('답변')) return 'text-purple-600 bg-purple-50';
    if (action.includes('승인')) return 'text-emerald-600 bg-emerald-50';
    return 'text-slate-600 bg-slate-50';
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const getResStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return { label: '대기중', cls: 'bg-amber-100 text-amber-600' };
      case 'confirmed': return { label: '확정', cls: 'bg-emerald-100 text-emerald-600' };
      case 'cancelled': return { label: '취소', cls: 'bg-red-100 text-red-500' };
      default: return { label: status, cls: 'bg-slate-100 text-slate-500' };
    }
  };

  const getInstitutionStatusLabel = (status?: string) => {
    switch (status) {
      case 'approved': return { label: '승인', cls: 'bg-emerald-100 text-emerald-600' };
      case 'rejected': return { label: '거절', cls: 'bg-red-100 text-red-500' };
      case 'pending':
      default: return { label: '승인대기', cls: 'bg-amber-100 text-amber-600' };
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="flex-shrink-0 bg-white px-5 pt-3 pb-3 safe-top flex items-center gap-3 border-b border-slate-50">
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-50 touch-active"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <h1 className="text-[18px] font-bold text-slate-800">관리자</h1>
        {profile && (
          <span className={`ml-auto text-[10px] px-2 py-[3px] rounded-full font-semibold ${
            isSuperAdmin ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
          }`}>
            {isSuperAdmin ? '대표관리자' : '관리자'}
          </span>
        )}
      </header>

      {/* Content */}
      <div className="page-content">
        <div className="px-5 pt-4 pb-8 animate-slide-up">
          {/* Tabs */}
          <div className="flex gap-[4px] mb-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-shrink-0 px-3 py-[10px] rounded-[12px] text-[10px] font-semibold transition-all touch-active ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-300'
                  : 'bg-white text-slate-500 border border-slate-200'
              }`}
            >
              <BarChart3 className="w-3 h-3 inline mr-[2px]" />
              대시보드
            </button>
            <button
              onClick={() => setActiveTab('institutions')}
              className={`flex-shrink-0 px-3 py-[10px] rounded-[12px] text-[10px] font-semibold transition-all touch-active ${
                activeTab === 'institutions'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-300'
                  : 'bg-white text-slate-500 border border-slate-200'
              }`}
            >
              <Building2 className="w-3 h-3 inline mr-[2px]" />
              기관
            </button>
            <button
              onClick={() => setActiveTab('inquiries')}
              className={`flex-shrink-0 px-3 py-[10px] rounded-[12px] text-[10px] font-semibold transition-all relative touch-active ${
                activeTab === 'inquiries'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-300'
                  : 'bg-white text-slate-500 border border-slate-200'
              }`}
            >
              <MessageCircle className="w-3 h-3 inline mr-[2px]" />
              문의
              {inquiries.filter(i => i.status === 'pending').length > 0 && (
                <span className="absolute -top-1 -right-1 w-[16px] h-[16px] bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center font-bold">
                  {inquiries.filter(i => i.status === 'pending').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('reservations')}
              className={`flex-shrink-0 px-3 py-[10px] rounded-[12px] text-[10px] font-semibold transition-all relative touch-active ${
                activeTab === 'reservations'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-300'
                  : 'bg-white text-slate-500 border border-slate-200'
              }`}
            >
              <CalendarCheck className="w-3 h-3 inline mr-[2px]" />
              예약
              {reservations.filter(r => r.status === 'pending').length > 0 && (
                <span className="absolute -top-1 -right-1 w-[16px] h-[16px] bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center font-bold">
                  {reservations.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
            {isSuperAdmin && (
              <button
                onClick={() => setActiveTab('admins')}
                className={`flex-shrink-0 px-3 py-[10px] rounded-[12px] text-[10px] font-semibold transition-all touch-active ${
                  activeTab === 'admins'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-300'
                    : 'bg-white text-slate-500 border border-slate-200'
                }`}
              >
                <Users className="w-3 h-3 inline mr-[2px]" />
                관리자
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full" />
            </div>
          ) : (
            <>
              {/* Dashboard Tab */}
              {activeTab === 'dashboard' && (
                <div className="space-y-4">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-[14px] p-4 card-shadow">
                      <div className="w-8 h-8 bg-indigo-100 rounded-[10px] flex items-center justify-center mb-2">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                      </div>
                      <p className="text-[20px] font-bold text-slate-800">{institutionsList.length}</p>
                      <p className="text-[11px] text-slate-400 font-medium">총 기관 수</p>
                    </div>
                    <div className="bg-white rounded-[14px] p-4 card-shadow">
                      <div className="w-8 h-8 bg-emerald-100 rounded-[10px] flex items-center justify-center mb-2">
                        <Users className="w-4 h-4 text-emerald-600" />
                      </div>
                      <p className="text-[20px] font-bold text-slate-800">{totalUsers}</p>
                      <p className="text-[11px] text-slate-400 font-medium">총 회원 수</p>
                    </div>
                    <div className="bg-white rounded-[14px] p-4 card-shadow">
                      <div className="w-8 h-8 bg-amber-100 rounded-[10px] flex items-center justify-center mb-2">
                        <MessageCircle className="w-4 h-4 text-amber-600" />
                      </div>
                      <p className="text-[20px] font-bold text-slate-800">{inquiries.length}</p>
                      <p className="text-[11px] text-slate-400 font-medium">총 문의 수</p>
                    </div>
                    <div className="bg-white rounded-[14px] p-4 card-shadow">
                      <div className="w-8 h-8 bg-violet-100 rounded-[10px] flex items-center justify-center mb-2">
                        <CalendarCheck className="w-4 h-4 text-violet-600" />
                      </div>
                      <p className="text-[20px] font-bold text-slate-800">{reservations.length}</p>
                      <p className="text-[11px] text-slate-400 font-medium">총 예약 수</p>
                    </div>
                  </div>

                  {/* Pending counts */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-[14px] p-3 card-shadow flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-100 rounded-[10px] flex items-center justify-center">
                        <Clock className="w-4 h-4 text-red-500" />
                      </div>
                      <div>
                        <p className="text-[16px] font-bold text-slate-800">
                          {inquiries.filter(i => i.status === 'pending').length}
                        </p>
                        <p className="text-[10px] text-slate-400">대기 중 문의</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-[14px] p-3 card-shadow flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-[10px] flex items-center justify-center">
                        <CalendarCheck className="w-4 h-4 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-[16px] font-bold text-slate-800">
                          {reservations.filter(r => r.status === 'pending').length}
                        </p>
                        <p className="text-[10px] text-slate-400">대기 중 예약</p>
                      </div>
                    </div>
                  </div>

                  {/* Notification Info */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-[14px] p-4">
                    <h3 className="text-[12px] font-bold text-indigo-800 mb-1 flex items-center gap-1">
                      📬 이메일 알림 활성화됨
                    </h3>
                    <p className="text-[11px] text-indigo-600 leading-relaxed">
                      학부모가 문의를 남기면 승인된 관리자 이메일로 알림이 자동 발송됩니다. SMTP 설정이 필요합니다 (Supabase Edge Function 환경변수: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM).
                    </p>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white rounded-[16px] p-4 card-shadow">
                    <h3 className="text-[13px] font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-500" />
                      최근 활동 내역
                    </h3>
                    {logs.length === 0 ? (
                      <p className="text-[12px] text-slate-400 text-center py-6">활동 내역이 없습니다</p>
                    ) : (
                      <div className="space-y-[6px] max-h-[300px] overflow-y-auto">
                        {logs.map(log => (
                          <div key={log.id} className="flex items-center gap-2 py-[6px] border-b border-slate-50 last:border-0">
                            <div className={`w-6 h-6 rounded-[6px] flex items-center justify-center flex-shrink-0 ${getActionColor(log.action)}`}>
                              {getActionIcon(log.action)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium text-slate-700 truncate">
                                {log.action}{log.detail ? ` - ${log.detail}` : ''}
                              </p>
                              <p className="text-[9px] text-slate-400">{log.admin_email}</p>
                            </div>
                            <span className="text-[9px] text-slate-400 flex-shrink-0">
                              {formatTime(log.created_at)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Institutions Tab */}
              {activeTab === 'institutions' && (
                <>
                  {!showForm && (
                    <div className="space-y-2 mb-4">
                      <button
                        onClick={() => setShowForm(true)}
                        className="w-full h-[44px] rounded-[12px] bg-indigo-600 text-white text-[13px] font-semibold flex items-center justify-center gap-1 shadow-sm shadow-indigo-200 touch-active"
                      >
                        <Plus className="w-4 h-4" />
                        새 기관 등록
                      </button>

                      {institutionsList.length > 0 && (
                        <button
                          onClick={() => setShowDeleteAllConfirm(true)}
                          className="w-full h-[40px] rounded-[12px] bg-red-50 text-red-500 text-[12px] font-semibold flex items-center justify-center gap-1 border border-red-200 touch-active"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          전체 데이터 삭제 ({institutionsList.length}개)
                        </button>
                      )}
                    </div>
                  )}

                  {/* Delete All Confirmation Modal */}
                  {showDeleteAllConfirm && (
                    <div className="bg-red-50 border border-red-200 rounded-[14px] p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <h3 className="text-[13px] font-bold text-red-700">전체 삭제 확인</h3>
                      </div>
                      <p className="text-[12px] text-red-600 mb-3">
                        등록된 모든 기관 데이터({institutionsList.length}개)가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleDeleteAllMockData}
                          className="flex-1 h-[38px] rounded-[10px] bg-red-500 text-white text-[12px] font-semibold touch-active"
                        >
                          삭제 확인
                        </button>
                        <button
                          onClick={() => setShowDeleteAllConfirm(false)}
                          className="h-[38px] px-4 rounded-[10px] border border-slate-200 text-[12px] text-slate-600 font-medium touch-active"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}

                  {showForm && (
                    <form onSubmit={handleSubmit} className="bg-white rounded-[16px] p-4 card-shadow mb-4 space-y-3">
                      <h3 className="font-bold text-[14px] text-slate-800">
                        {editingId ? '✏️ 기관 수정' : '🏫 새 기관 등록'}
                      </h3>

                      {/* Basic Info Section */}
                      <div className="bg-slate-50 rounded-[12px] p-3 space-y-2">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">기본 정보</p>
                        <Input
                          placeholder="기관명 *"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="rounded-[10px] h-[42px] text-[13px] bg-white"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="지역 (예: 서울 강남구) *"
                            value={formData.region}
                            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                            className="rounded-[10px] h-[42px] text-[13px] bg-white"
                          />
                          <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full rounded-[10px] border border-slate-200 px-3 py-[10px] text-[13px] h-[42px] bg-white"
                          >
                            <option value="놀이형">놀이형</option>
                            <option value="학습형">학습형</option>
                            <option value="영어유치원">영어유치원</option>
                          </select>
                        </div>
                        <Input
                          placeholder="상세 주소"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="rounded-[10px] h-[42px] text-[13px] bg-white"
                        />
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide pt-1">
                          행정구역 / 좌표 (검색용)
                        </p>
                        <p className="text-[10px] text-slate-400 -mt-1">
                          위도·경도는 추후 지도 SDK 연동 시 사용 예정입니다.
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            placeholder="시/도"
                            value={formData.sido}
                            onChange={(e) => setFormData({ ...formData, sido: e.target.value })}
                            className="rounded-[10px] h-[42px] text-[13px] bg-white"
                          />
                          <Input
                            placeholder="시/군/구"
                            value={formData.sigungu}
                            onChange={(e) => setFormData({ ...formData, sigungu: e.target.value })}
                            className="rounded-[10px] h-[42px] text-[13px] bg-white col-span-2"
                          />
                        </div>
                        <Input
                          placeholder="읍/면/동"
                          value={formData.eupmyeondong}
                          onChange={(e) => setFormData({ ...formData, eupmyeondong: e.target.value })}
                          className="rounded-[10px] h-[42px] text-[13px] bg-white"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            step="any"
                            placeholder="위도"
                            value={formData.latitude}
                            onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                            className="rounded-[10px] h-[42px] text-[13px] bg-white"
                          />
                          <Input
                            type="number"
                            step="any"
                            placeholder="경도"
                            value={formData.longitude}
                            onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                            className="rounded-[10px] h-[42px] text-[13px] bg-white"
                          />
                        </div>
                        <label className="flex items-center gap-2 text-[13px] text-slate-600 py-1">
                          <input
                            type="checkbox"
                            checked={formData.is_recruiting}
                            onChange={(e) => setFormData({ ...formData, is_recruiting: e.target.checked })}
                            className="rounded w-4 h-4 accent-indigo-600"
                          />
                          모집 중
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="사업자 등록 번호 *"
                            value={formData.business_no}
                            onChange={(e) => setFormData({ ...formData, business_no: e.target.value })}
                            className="rounded-[10px] h-[42px] text-[13px] bg-white"
                          />
                          <Input
                            placeholder="기관 고유 번호 *"
                            value={formData.inst_no}
                            onChange={(e) => setFormData({ ...formData, inst_no: e.target.value })}
                            className="rounded-[10px] h-[42px] text-[13px] bg-white"
                          />
                        </div>
                        <Input
                          placeholder="담당자 이름 및 연락처 *"
                          value={formData.manager_name}
                          onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                          className="rounded-[10px] h-[42px] text-[13px] bg-white"
                        />
                        <Textarea
                          placeholder="기관 소개글을 작성해주세요..."
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="rounded-[10px] text-[13px] min-h-[80px] bg-white"
                          rows={3}
                        />
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide pt-1">기관 상세 소개</p>
                        <Textarea
                          placeholder="원장님 인사말"
                          value={formData.director_message}
                          onChange={(e) => setFormData({ ...formData, director_message: e.target.value })}
                          className="rounded-[10px] text-[13px] min-h-[72px] bg-white"
                          rows={3}
                        />
                        <Textarea
                          placeholder="교육철학"
                          value={formData.education_philosophy}
                          onChange={(e) => setFormData({ ...formData, education_philosophy: e.target.value })}
                          className="rounded-[10px] text-[13px] min-h-[72px] bg-white"
                          rows={3}
                        />
                        <Textarea
                          placeholder="우리 유치원의 장점"
                          value={formData.kindergarten_strengths}
                          onChange={(e) => setFormData({ ...formData, kindergarten_strengths: e.target.value })}
                          className="rounded-[10px] text-[13px] min-h-[72px] bg-white"
                          rows={3}
                        />
                        <Textarea
                          placeholder="모집 안내"
                          value={formData.recruitment_info}
                          onChange={(e) => setFormData({ ...formData, recruitment_info: e.target.value })}
                          className="rounded-[10px] text-[13px] min-h-[72px] bg-white"
                          rows={3}
                        />
                        <label className="flex items-center gap-2 text-[13px] text-slate-600 py-1">
                          <input
                            type="checkbox"
                            checked={formData.has_vehicle}
                            onChange={(e) => setFormData({ ...formData, has_vehicle: e.target.checked })}
                            className="rounded w-4 h-4 accent-indigo-600"
                          />
                          🚌 차량 운행
                        </label>
                      </div>

                      {/* Images Section */}
                      <div className="bg-slate-50 rounded-[12px] p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                            <Image className="w-3 h-3" /> 이미지 (최대 5장)
                          </p>
                          {formData.imageUrls.length < 5 && (
                            <button
                              type="button"
                              onClick={handleAddImageUrl}
                              className="text-[10px] px-2 py-1 bg-indigo-100 text-indigo-600 rounded-[6px] font-semibold touch-active"
                            >
                              + 추가
                            </button>
                          )}
                        </div>
                        {formData.imageUrls.map((url, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              placeholder={`이미지 URL ${index + 1}${index === 0 ? ' (대표 이미지)' : ''}`}
                              value={url}
                              onChange={(e) => handleImageUrlChange(index, e.target.value)}
                              className="rounded-[10px] h-[38px] text-[12px] bg-white flex-1"
                            />
                            {url && (
                              <img src={url} alt="" className="w-[38px] h-[38px] rounded-[8px] object-cover border border-slate-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            )}
                            {formData.imageUrls.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveImageUrl(index)}
                                className="w-[28px] h-[28px] flex items-center justify-center rounded-full hover:bg-red-50 touch-active"
                              >
                                <X className="w-3.5 h-3.5 text-red-400" />
                              </button>
                            )}
                          </div>
                        ))}
                        <p className="text-[10px] text-slate-400">이미지 URL을 입력하세요. 첫 번째 이미지가 대표 이미지로 사용됩니다.</p>
                      </div>

                      {/* Tags Section */}
                      <div className="bg-slate-50 rounded-[12px] p-3 space-y-2">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">특징 태그 선택</p>
                        <div className="flex flex-wrap gap-[6px]">
                          {AVAILABLE_TAGS.map(tag => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => handleTagToggle(tag)}
                              className={`px-[10px] py-[6px] rounded-[8px] text-[11px] font-medium transition-all touch-active ${
                                formData.selectedTags.includes(tag)
                                  ? 'bg-indigo-600 text-white shadow-sm'
                                  : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300'
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                        {formData.selectedTags.length > 0 && (
                          <p className="text-[10px] text-indigo-500 font-medium">
                            선택됨: {formData.selectedTags.join(', ')}
                          </p>
                        )}
                      </div>

                      {/* Submit Buttons */}
                      <div className="flex gap-2 pt-1">
                        <button type="submit" className="flex-1 h-[44px] rounded-[12px] bg-indigo-600 text-white text-[13px] font-semibold touch-active shadow-sm shadow-indigo-200">
                          {editingId ? '수정 완료' : '기관 등록'}
                        </button>
                        <button type="button" onClick={resetForm} className="h-[44px] px-5 rounded-[12px] border border-slate-200 text-[13px] text-slate-600 font-medium touch-active">
                          취소
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-[6px]">
                    {institutionsList.map(inst => {
                      const st = getInstitutionStatusLabel(inst.status);
                      return (
                      <div key={inst.id} className="bg-white rounded-[12px] p-3 card-shadow">
                        <div className="flex items-center gap-3">
                          <img src={inst.image} alt={inst.name} className="w-[44px] h-[44px] rounded-[10px] object-cover" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-[12px] font-semibold text-slate-800 truncate">{inst.name}</h3>
                              <span className={`text-[9px] px-[6px] py-[2px] rounded-[4px] font-semibold ${st.cls}`}>
                                {st.label}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400">{inst.region}</p>
                            {inst.business_no && (
                              <p className="text-[9px] text-slate-400">사업자: {inst.business_no}</p>
                            )}
                            {inst.tags && inst.tags.length > 0 && (
                              <div className="flex gap-1 mt-[2px] flex-wrap">
                                {inst.tags.slice(0, 3).map(tag => (
                                  <span key={tag} className="text-[8px] px-[4px] py-[1px] bg-indigo-50 text-indigo-500 rounded-[3px]">{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-[4px]">
                            <button
                              onClick={() => handleEdit(inst)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 touch-active"
                            >
                              <Edit className="w-[14px] h-[14px] text-slate-500" />
                            </button>
                            <button
                              onClick={() => handleDelete(inst.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 touch-active"
                            >
                              <Trash2 className="w-[14px] h-[14px] text-red-400" />
                            </button>
                          </div>
                        </div>
                        {isSuperAdmin && (
                          <div className="flex gap-2 mt-2 pt-2 border-t border-slate-50">
                            {inst.status !== 'approved' && (
                              <button
                                onClick={() => handleInstitutionStatus(inst.id, 'approved')}
                                className="flex items-center gap-1 text-[10px] px-2 py-[4px] bg-emerald-50 text-emerald-600 rounded-[6px] font-semibold touch-active"
                              >
                                <CheckCircle className="w-3 h-3" />
                                승인
                              </button>
                            )}
                            {inst.status !== 'rejected' && (
                              <button
                                onClick={() => handleInstitutionStatus(inst.id, 'rejected')}
                                className="flex items-center gap-1 text-[10px] px-2 py-[4px] bg-red-50 text-red-500 rounded-[6px] font-semibold touch-active"
                              >
                                <XCircle className="w-3 h-3" />
                                거절
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      );
                    })}
                    {institutionsList.length === 0 && (
                      <div className="text-center py-16 bg-white rounded-[16px] card-shadow">
                        <Building2 className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                        <p className="text-[13px] text-slate-400">등록된 기관이 없습니다</p>
                        <p className="text-[11px] text-slate-300 mt-1">위의 '새 기관 등록' 버튼을 눌러 시작하세요</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Inquiries Tab */}
              {activeTab === 'inquiries' && (
                <div className="space-y-[8px]">
                  {inquiries.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-[16px] card-shadow">
                      <MessageCircle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-[13px] text-slate-400">문의 내역이 없습니다</p>
                    </div>
                  ) : (
                    inquiries.map(inq => (
                      <div key={inq.id} className="bg-white rounded-[12px] p-4 card-shadow">
                        <div className="flex items-center justify-between mb-[6px]">
                          <h3 className="text-[13px] font-semibold text-slate-800">{inq.institution_name}</h3>
                          <span
                            className={`text-[9px] px-[6px] py-[2px] rounded-[4px] font-semibold ${
                              inq.status === 'replied'
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'bg-amber-100 text-amber-600'
                            }`}
                          >
                            {inq.status === 'replied' ? '답변완료' : '대기중'}
                          </span>
                        </div>
                        <p className="text-[12px] text-slate-500">{inq.message}</p>
                        <div className="flex items-center justify-between mt-[8px]">
                          <p className="text-[10px] text-slate-400">
                            {new Date(inq.created_at).toLocaleDateString('ko-KR')}
                          </p>
                          {inq.status === 'pending' && (
                            <button
                              onClick={() => handleReply(inq.id)}
                              className="text-[11px] px-3 py-[5px] bg-emerald-500 text-white rounded-[8px] font-semibold touch-active"
                            >
                              답변완료
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Reservations Tab */}
              {activeTab === 'reservations' && (
                <div className="space-y-[8px]">
                  {reservations.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-[16px] card-shadow">
                      <CalendarCheck className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-[13px] text-slate-400">예약 내역이 없습니다</p>
                    </div>
                  ) : (
                    reservations.map(res => {
                      const st = getResStatusLabel(res.status);
                      return (
                        <div key={res.id} className="bg-white rounded-[12px] p-4 card-shadow">
                          <div className="flex items-center justify-between mb-[6px]">
                            <h3 className="text-[13px] font-semibold text-slate-800">{res.institution_name}</h3>
                            <span className={`text-[9px] px-[6px] py-[2px] rounded-[4px] font-semibold ${st.cls}`}>
                              {st.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                            <span>📅 {res.reservation_date}</span>
                            <span>🕐 {res.time_slot}</span>
                            <span>👶 {res.child_age}</span>
                          </div>
                          {res.memo && (
                            <p className="text-[11px] text-slate-400 mt-1">💬 {res.memo}</p>
                          )}
                          <div className="flex items-center justify-between mt-[8px]">
                            <p className="text-[10px] text-slate-400">
                              {new Date(res.created_at).toLocaleDateString('ko-KR')} 신청
                            </p>
                            {res.status === 'pending' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleReservationStatus(res.id, 'confirmed')}
                                  className="text-[10px] px-2 py-[4px] bg-emerald-500 text-white rounded-[6px] font-semibold touch-active"
                                >
                                  확정
                                </button>
                                <button
                                  onClick={() => handleReservationStatus(res.id, 'cancelled')}
                                  className="text-[10px] px-2 py-[4px] bg-red-100 text-red-500 rounded-[6px] font-semibold touch-active"
                                >
                                  취소
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Admins Tab - Only for Super Admin */}
              {activeTab === 'admins' && isSuperAdmin && (
                <>
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-[14px] p-3 mb-4">
                    <p className="text-[11px] text-amber-700 font-medium">
                      🔑 대표 관리자만 관리자를 승인/관리할 수 있습니다. 관리자 회원가입 후 여기서 승인해주세요.
                    </p>
                  </div>

                  <div className="space-y-[6px]">
                    {adminsList.map(admin => (
                      <div key={admin.id} className="bg-white rounded-[12px] p-3 card-shadow">
                        <div className="flex items-center gap-3">
                          <div className={`w-[40px] h-[40px] rounded-full flex items-center justify-center flex-shrink-0 ${
                            admin.role === 'super_admin' ? 'bg-amber-100' : 'bg-indigo-100'
                          }`}>
                            <Shield className={`w-[18px] h-[18px] ${
                              admin.role === 'super_admin' ? 'text-amber-600' : 'text-indigo-600'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-[12px] font-semibold text-slate-800">{admin.name || '이름 없음'}</h3>
                              <span className={`text-[9px] px-[5px] py-[1px] rounded-[4px] font-semibold ${
                                admin.role === 'super_admin'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-indigo-100 text-indigo-600'
                              }`}>
                                {admin.role === 'super_admin' ? '대표' : '관리자'}
                              </span>
                              {!admin.is_approved && (
                                <span className="text-[9px] px-[5px] py-[1px] rounded-[4px] font-semibold bg-red-100 text-red-600">
                                  미승인
                                </span>
                              )}
                              {!admin.is_active && (
                                <span className="text-[9px] px-[5px] py-[1px] rounded-[4px] font-semibold bg-slate-100 text-slate-500">
                                  비활성
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400">{admin.email}</p>
                          </div>
                        </div>

                        {admin.role !== 'super_admin' && (
                          <div className="flex gap-2 mt-2 pt-2 border-t border-slate-50 flex-wrap">
                            {!admin.is_approved && (
                              <button
                                onClick={() => handleApproveAdmin(admin.id)}
                                className="flex items-center gap-1 text-[10px] px-2 py-[4px] bg-emerald-50 text-emerald-600 rounded-[6px] font-semibold touch-active"
                              >
                                <CheckCircle className="w-3 h-3" />
                                승인
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleActive(admin.id, admin.is_active)}
                              className={`flex items-center gap-1 text-[10px] px-2 py-[4px] rounded-[6px] font-semibold touch-active ${
                                admin.is_active
                                  ? 'bg-slate-50 text-slate-600'
                                  : 'bg-blue-50 text-blue-600'
                              }`}
                            >
                              {admin.is_active ? (
                                <><XCircle className="w-3 h-3" />비활성화</>
                              ) : (
                                <><CheckCircle className="w-3 h-3" />활성화</>
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteAdmin(admin.id, admin.role)}
                              className="flex items-center gap-1 text-[10px] px-2 py-[4px] bg-red-50 text-red-500 rounded-[6px] font-semibold touch-active ml-auto"
                            >
                              <Trash2 className="w-3 h-3" />
                              권한제거
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {adminsList.length === 0 && (
                      <div className="text-center py-16 bg-white rounded-[16px] card-shadow">
                        <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                        <p className="text-[13px] text-slate-400">등록된 관리자가 없습니다</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MapPin, Star, MessageCircle, Bell, Share2, GitCompareArrows, CalendarCheck, Newspaper } from 'lucide-react';
import { supabase, Institution, InstitutionNotice, TABLES } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCompare } from '@/contexts/CompareContext';
import ReservationModal from '@/components/ReservationModal';

export default function DetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { addToCompare, isInCompare, removeFromCompare } = useCompare();

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showReservation, setShowReservation] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'notices'>('info');
  const [notices, setNotices] = useState<InstitutionNotice[]>([]);

  useEffect(() => {
    if (!id) return;
    loadInstitution();
    loadNotices();
    if (user) {
      checkFavorite();
      recordRecentView();
    }
  }, [id, user]);

  const loadInstitution = async () => {
    const { data, error } = await supabase
      .from(TABLES.institutions)
      .select('*')
      .eq('id', id)
      .single();
    if (!error && data) {
      setInstitution(data as Institution);
    }
    setLoading(false);
  };

  const loadNotices = async () => {
    if (!id) return;
    const { data } = await supabase
      .from(TABLES.notices)
      .select('*')
      .eq('institution_id', id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setNotices(data as InstitutionNotice[]);
  };

  const checkFavorite = async () => {
    if (!user || !id) return;
    const { data } = await supabase
      .from(TABLES.favorites)
      .select('id')
      .eq('user_id', user.id)
      .eq('institution_id', id)
      .maybeSingle();
    setIsFavorite(!!data);
  };

  const recordRecentView = async () => {
    if (!user || !id) return;
    await supabase
      .from(TABLES.recent_views)
      .delete()
      .eq('user_id', user.id)
      .eq('institution_id', id);
    await supabase
      .from(TABLES.recent_views)
      .insert({ user_id: user.id, institution_id: id });
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast({ description: '로그인이 필요합니다', variant: 'destructive' });
      navigate('/login');
      return;
    }
    if (!institution) return;

    if (isFavorite) {
      await supabase
        .from(TABLES.favorites)
        .delete()
        .eq('user_id', user.id)
        .eq('institution_id', institution.id);
      setIsFavorite(false);
      toast({ description: '찜 목록에서 제거했습니다' });
    } else {
      await supabase
        .from(TABLES.favorites)
        .insert({ user_id: user.id, institution_id: institution.id });
      setIsFavorite(true);
      toast({ description: '찜 목록에 추가했습니다 ❤️' });
    }
  };

  const handleInquiry = async () => {
    if (!user) {
      toast({ description: '로그인이 필요합니다', variant: 'destructive' });
      navigate('/login');
      return;
    }
    if (!institution) return;

    const inquiryMessage = '입학 상담을 요청합니다.';

    const { error } = await supabase
      .from(TABLES.inquiries)
      .insert({
        user_id: user.id,
        institution_id: institution.id,
        institution_name: institution.name,
        message: inquiryMessage,
        status: 'pending',
      });

    if (error) {
      toast({ description: '문의 접수에 실패했습니다', variant: 'destructive' });
    } else {
      toast({ description: '문의가 접수되었습니다! 📩' });

      // Send email notification to admin (fire and forget)
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        await fetch(`${supabaseUrl}/functions/v1/app_ffc7da1b64_notify_inquiry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            institution_id: institution.id,
            institution_name: institution.name,
            message: inquiryMessage,
            parent_email: user.email || '',
          }),
        });
      } catch (e) {
        // Notification failure should not affect user experience
        console.log('Admin notification failed:', e);
      }
    }
  };

  const handleCompare = () => {
    if (!institution) return;
    if (isInCompare(institution.id)) {
      removeFromCompare(institution.id);
      toast({ description: '비교함에서 제거했습니다' });
    } else {
      const success = addToCompare(institution);
      if (success) {
        toast({ description: '비교함에 추가했습니다! 📊' });
      } else {
        toast({ description: '비교함은 최대 3개까지 가능합니다', variant: 'destructive' });
      }
    }
  };

  if (loading) {
    return (
      <div className="app-container items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full" />
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="app-container items-center justify-center">
        <p className="text-slate-500 text-[14px]">기관 정보를 찾을 수 없습니다</p>
      </div>
    );
  }

  const inCompare = isInCompare(institution.id);

  return (
    <div className="app-container">
      {/* Scrollable Content */}
      <div className="page-content">
        {/* Header Image */}
        <div className="relative">
          <img
            src={institution.image}
            alt={institution.name}
            className="w-full h-[240px] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
          
          {/* Top Actions */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-4 safe-top">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center card-shadow touch-active"
            >
              <ArrowLeft className="w-[18px] h-[18px] text-slate-700" />
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleCompare}
                className={`w-9 h-9 backdrop-blur-sm rounded-full flex items-center justify-center card-shadow touch-active ${
                  inCompare ? 'bg-indigo-500' : 'bg-white/90'
                }`}
              >
                <GitCompareArrows className={`w-[18px] h-[18px] ${inCompare ? 'text-white' : 'text-slate-700'}`} />
              </button>
              <button
                onClick={toggleFavorite}
                className="w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center card-shadow touch-active"
              >
                <Heart className={`w-[18px] h-[18px] ${isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-700'}`} />
              </button>
              <button className="w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center card-shadow touch-active">
                <Share2 className="w-[18px] h-[18px] text-slate-700" />
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 -mt-6 relative z-10 pb-6 animate-slide-up">
          {/* Info Card */}
          <div className="bg-white rounded-[20px] p-5 card-shadow-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-3">
                <h1 className="text-[18px] font-bold text-slate-800 leading-tight">{institution.name}</h1>
                <p className="text-[12px] text-slate-400 flex items-center mt-[6px]">
                  <MapPin className="w-[13px] h-[13px] mr-[3px]" />{institution.address}
                </p>
              </div>
              <div className="flex items-center gap-[4px] bg-amber-50 px-[10px] py-[6px] rounded-[10px]">
                <Star className="w-[15px] h-[15px] fill-amber-400 text-amber-400" />
                <span className="text-[14px] font-bold text-amber-700">{institution.rating}</span>
              </div>
            </div>

            {/* Tags */}
            <div className="flex gap-[6px] mt-4 flex-wrap">
              {institution.tags.map(tag => (
                <span key={tag} className="text-[11px] px-[10px] py-[5px] bg-indigo-50 text-indigo-600 rounded-[8px] font-semibold">
                  {tag}
                </span>
              ))}
              {institution.has_vehicle && (
                <span className="text-[11px] px-[10px] py-[5px] bg-emerald-50 text-emerald-600 rounded-[8px] font-semibold">
                  🚌 차량 운행
                </span>
              )}
            </div>

            {/* Tabs */}
            <div className="flex mt-5 border-b border-slate-100">
              <button
                onClick={() => setActiveTab('info')}
                className={`flex-1 py-2 text-[12px] font-semibold border-b-2 transition-all ${
                  activeTab === 'info' ? 'text-indigo-600 border-indigo-600' : 'text-slate-400 border-transparent'
                }`}
              >
                기관 정보
              </button>
              <button
                onClick={() => setActiveTab('notices')}
                className={`flex-1 py-2 text-[12px] font-semibold border-b-2 transition-all ${
                  activeTab === 'notices' ? 'text-indigo-600 border-indigo-600' : 'text-slate-400 border-transparent'
                }`}
              >
                기관 소식
              </button>
            </div>

            {activeTab === 'info' ? (
              <>
                {/* Description */}
                <div className="mt-4">
                  <h2 className="text-[13px] font-bold text-slate-700 mb-[8px]">소개</h2>
                  <p className="text-[13px] text-slate-500 leading-[1.7]">{institution.description}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-[10px] mt-5 pt-5 border-t border-slate-100">
                  <div className="text-center p-3 bg-indigo-50/60 rounded-[12px]">
                    <p className="text-[18px] font-bold text-indigo-600">{institution.review_count}</p>
                    <p className="text-[10px] text-slate-400 mt-[2px] font-medium">리뷰</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50/60 rounded-[12px]">
                    <p className="text-[18px] font-bold text-amber-600">{institution.rating}</p>
                    <p className="text-[10px] text-slate-400 mt-[2px] font-medium">평점</p>
                  </div>
                  <div className="text-center p-3 bg-emerald-50/60 rounded-[12px]">
                    <p className="text-[13px] font-bold text-emerald-600 mt-[3px]">{institution.type}</p>
                    <p className="text-[10px] text-slate-400 mt-[2px] font-medium">유형</p>
                  </div>
                </div>
              </>
            ) : (
              /* Notices Tab */
              <div className="mt-4">
                {notices.length === 0 ? (
                  <div className="text-center py-10">
                    <Newspaper className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-[12px] text-slate-400">아직 등록된 소식이 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notices.map(notice => (
                      <div key={notice.id} className="p-3 bg-slate-50 rounded-[12px]">
                        {notice.image_url && (
                          <img src={notice.image_url} alt={notice.title} className="w-full h-[120px] object-cover rounded-[8px] mb-2" />
                        )}
                        <h3 className="text-[13px] font-bold text-slate-700">{notice.title}</h3>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{notice.content}</p>
                        <p className="text-[10px] text-slate-300 mt-2">
                          {new Date(notice.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-5 space-y-[10px]">
            <button
              onClick={() => {
                if (!user) {
                  toast({ description: '로그인이 필요합니다', variant: 'destructive' });
                  navigate('/login');
                  return;
                }
                setShowReservation(true);
              }}
              className="w-full h-[50px] rounded-[14px] bg-indigo-600 text-white text-[14px] font-semibold flex items-center justify-center gap-2 shadow-md shadow-indigo-200 touch-active"
            >
              <CalendarCheck className="w-[18px] h-[18px]" />
              상담 예약하기
            </button>
            <button
              onClick={handleInquiry}
              className="w-full h-[46px] rounded-[14px] border border-indigo-200 text-indigo-600 bg-indigo-50/50 text-[13px] font-semibold flex items-center justify-center gap-2 touch-active"
            >
              <MessageCircle className="w-[16px] h-[16px]" />
              문의하기
            </button>
            <div className="grid grid-cols-2 gap-[10px]">
              <button
                onClick={toggleFavorite}
                className={`h-[46px] rounded-[14px] text-[13px] font-semibold flex items-center justify-center gap-[6px] border touch-active ${
                  isFavorite ? 'border-red-200 text-red-500 bg-red-50/50' : 'border-slate-200 text-slate-600 bg-white'
                }`}
              >
                <Heart className={`w-[16px] h-[16px] ${isFavorite ? 'fill-red-500' : ''}`} />
                {isFavorite ? '찜 완료' : '찜하기'}
              </button>
              <button
                onClick={handleCompare}
                className={`h-[46px] rounded-[14px] text-[13px] font-semibold flex items-center justify-center gap-[6px] border touch-active ${
                  inCompare ? 'border-indigo-200 text-indigo-600 bg-indigo-50/50' : 'border-slate-200 text-slate-600 bg-white'
                }`}
              >
                <GitCompareArrows className={`w-[16px] h-[16px]`} />
                {inCompare ? '비교 중' : '비교 담기'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reservation Modal */}
      <ReservationModal
        isOpen={showReservation}
        onClose={() => setShowReservation(false)}
        institutionId={institution.id}
        institutionName={institution.name}
      />
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Clock, MessageCircle, LogOut, User, ChevronRight, CalendarCheck, Shield } from 'lucide-react';
import { supabase, Institution, Inquiry, Reservation, TABLES } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import { useToast } from '@/hooks/use-toast';

type Tab = 'favorites' | 'recent' | 'inquiries' | 'reservations';

export default function MyPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut, isAdmin, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('favorites');
  const [favoriteInstitutions, setFavoriteInstitutions] = useState<Institution[]>([]);
  const [recentInstitutions, setRecentInstitutions] = useState<Institution[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    // Load favorites with institution data
    const { data: favData } = await supabase
      .from(TABLES.favorites)
      .select(`institution_id`)
      .eq('user_id', user.id);

    if (favData && favData.length > 0) {
      const instIds = favData.map(f => f.institution_id);
      const { data: instData } = await supabase
        .from(TABLES.institutions)
        .select('*')
        .in('id', instIds)
        .eq('status', 'approved');
      setFavoriteInstitutions((instData as Institution[]) || []);
    } else {
      setFavoriteInstitutions([]);
    }

    // Load recent views
    const { data: recentData } = await supabase
      .from(TABLES.recent_views)
      .select('institution_id')
      .eq('user_id', user.id)
      .order('viewed_at', { ascending: false })
      .limit(10);

    if (recentData && recentData.length > 0) {
      const instIds = recentData.map(r => r.institution_id);
      const { data: instData } = await supabase
        .from(TABLES.institutions)
        .select('*')
        .in('id', instIds)
        .eq('status', 'approved');
      const ordered = instIds
        .map(id => (instData as Institution[])?.find(i => i.id === id))
        .filter(Boolean) as Institution[];
      setRecentInstitutions(ordered);
    } else {
      setRecentInstitutions([]);
    }

    // Load inquiries
    const { data: inqData } = await supabase
      .from(TABLES.inquiries)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setInquiries((inqData as Inquiry[]) || []);

    // Load reservations
    const { data: resData } = await supabase
      .from(TABLES.reservations)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setReservations((resData as Reservation[]) || []);

    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut();
    toast({ description: '로그아웃 되었습니다' });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return { label: '대기중', cls: 'bg-amber-100 text-amber-600' };
      case 'confirmed': return { label: '확정', cls: 'bg-emerald-100 text-emerald-600' };
      case 'cancelled': return { label: '취소', cls: 'bg-red-100 text-red-500' };
      default: return { label: status, cls: 'bg-slate-100 text-slate-500' };
    }
  };

  const userName = user?.user_metadata?.name || '학부모';
  const userEmail = user?.email || '';

  const tabs = [
    { key: 'favorites' as Tab, label: '찜', icon: Heart, count: favoriteInstitutions.length },
    { key: 'recent' as Tab, label: '최근', icon: Clock, count: recentInstitutions.length },
    { key: 'inquiries' as Tab, label: '문의', icon: MessageCircle, count: inquiries.length },
    { key: 'reservations' as Tab, label: '예약', icon: CalendarCheck, count: reservations.length },
  ];

  return (
    <div className="app-container">
      {/* Header */}
      <header className="flex-shrink-0 bg-white px-5 pt-3 pb-3 safe-top">
        <h1 className="text-[18px] font-bold text-slate-800">마이페이지</h1>
      </header>

      {/* Content */}
      <div className="page-content">
        <div className="px-5 pt-3 pb-4 animate-slide-up">
          {/* User Info */}
          <div className="bg-white rounded-[20px] p-5 card-shadow-md mb-4">
            {user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-[48px] h-[48px] bg-gradient-to-br from-indigo-400 to-violet-500 rounded-full flex items-center justify-center shadow-md shadow-indigo-200">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-[15px] text-slate-800">{userName}</p>
                    <p className="text-[11px] text-slate-400">{userEmail}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center touch-active"
                >
                  <LogOut className="w-[14px] h-[14px] text-slate-400" />
                </button>
              </div>
            ) : (
              <div className="text-center py-3">
                <div className="w-[52px] h-[52px] bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-[13px] text-slate-400 mb-4">로그인하고 더 많은 기능을 이용하세요</p>
                <button
                  onClick={() => navigate('/login')}
                  className="px-8 h-[42px] rounded-[12px] bg-indigo-600 text-white text-[13px] font-semibold shadow-sm shadow-indigo-200 touch-active"
                >
                  로그인 / 회원가입
                </button>
              </div>
            )}
          </div>

          {user && isAdmin && (
            <Link
              to="/admin/dashboard"
              className="bg-white rounded-[20px] p-4 card-shadow-md mb-4 flex items-center gap-3 touch-active"
            >
              <div className="w-[40px] h-[40px] bg-indigo-50 rounded-[12px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-slate-800">관리자 대시보드</p>
                <p className="text-[11px] text-slate-400">
                  {isSuperAdmin ? '대표 관리자 메뉴' : '기관·문의·예약 관리'}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </Link>
          )}

          {/* Tabs */}
          {user && (
            <div className="bg-white rounded-[20px] card-shadow overflow-hidden">
              <div className="flex">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-[14px] text-center text-[10px] font-semibold transition-all relative ${
                      activeTab === tab.key
                        ? 'text-indigo-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {activeTab === tab.key && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-indigo-600 rounded-full" />
                    )}
                    <tab.icon className={`w-[16px] h-[16px] mx-auto mb-[3px] ${activeTab === tab.key ? 'text-indigo-600' : 'text-slate-400'}`} />
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              <div className="p-4 min-h-[200px]">
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="animate-spin w-6 h-6 border-3 border-indigo-200 border-t-indigo-600 rounded-full" />
                  </div>
                ) : (
                  <>
                    {/* Favorites Tab */}
                    {activeTab === 'favorites' && (
                      <div className="space-y-[6px]">
                        {favoriteInstitutions.length === 0 ? (
                          <div className="text-center py-10">
                            <Heart className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-[13px] text-slate-400">찜한 기관이 없습니다</p>
                            <p className="text-[11px] text-slate-300 mt-1">마음에 드는 기관을 찜해보세요</p>
                          </div>
                        ) : (
                          favoriteInstitutions.map(inst => (
                            <Link
                              key={inst.id}
                              to={`/detail/${inst.id}`}
                              className="flex items-center gap-3 p-[10px] rounded-[12px] hover:bg-slate-50 touch-active"
                            >
                              <img src={inst.image} alt={inst.name} className="w-[48px] h-[48px] rounded-[10px] object-cover" />
                              <div className="flex-1 min-w-0">
                                <h3 className="text-[13px] font-semibold text-slate-800 truncate">{inst.name}</h3>
                                <p className="text-[11px] text-slate-400">{inst.region}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-300" />
                            </Link>
                          ))
                        )}
                      </div>
                    )}

                    {/* Recent Tab */}
                    {activeTab === 'recent' && (
                      <div className="space-y-[6px]">
                        {recentInstitutions.length === 0 ? (
                          <div className="text-center py-10">
                            <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-[13px] text-slate-400">최근 본 기관이 없습니다</p>
                          </div>
                        ) : (
                          recentInstitutions.map(inst => (
                            <Link
                              key={inst.id}
                              to={`/detail/${inst.id}`}
                              className="flex items-center gap-3 p-[10px] rounded-[12px] hover:bg-slate-50 touch-active"
                            >
                              <img src={inst.image} alt={inst.name} className="w-[48px] h-[48px] rounded-[10px] object-cover" />
                              <div className="flex-1 min-w-0">
                                <h3 className="text-[13px] font-semibold text-slate-800 truncate">{inst.name}</h3>
                                <p className="text-[11px] text-slate-400">{inst.region}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-300" />
                            </Link>
                          ))
                        )}
                      </div>
                    )}

                    {/* Inquiries Tab */}
                    {activeTab === 'inquiries' && (
                      <div className="space-y-[8px]">
                        {inquiries.length === 0 ? (
                          <div className="text-center py-10">
                            <MessageCircle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-[13px] text-slate-400">문의 내역이 없습니다</p>
                          </div>
                        ) : (
                          inquiries.map(inq => (
                            <div key={inq.id} className="p-[12px] bg-slate-50 rounded-[12px]">
                              <div className="flex items-center justify-between mb-[4px]">
                                <h3 className="text-[12px] font-semibold text-slate-700">{inq.institution_name}</h3>
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
                              <p className="text-[11px] text-slate-500">{inq.message}</p>
                              <p className="text-[10px] text-slate-400 mt-[4px]">
                                {new Date(inq.created_at).toLocaleDateString('ko-KR')}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Reservations Tab */}
                    {activeTab === 'reservations' && (
                      <div className="space-y-[8px]">
                        {reservations.length === 0 ? (
                          <div className="text-center py-10">
                            <CalendarCheck className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-[13px] text-slate-400">예약 내역이 없습니다</p>
                            <p className="text-[11px] text-slate-300 mt-1">기관 상세 페이지에서 상담을 예약해보세요</p>
                          </div>
                        ) : (
                          reservations.map(res => {
                            const st = getStatusLabel(res.status);
                            return (
                              <div key={res.id} className="p-[12px] bg-slate-50 rounded-[12px]">
                                <div className="flex items-center justify-between mb-[4px]">
                                  <h3 className="text-[12px] font-semibold text-slate-700">{res.institution_name}</h3>
                                  <span className={`text-[9px] px-[6px] py-[2px] rounded-[4px] font-semibold ${st.cls}`}>
                                    {st.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                  <span>📅 {res.reservation_date}</span>
                                  <span>🕐 {res.time_slot}</span>
                                  <span>👶 {res.child_age}</span>
                                </div>
                                {res.memo && (
                                  <p className="text-[10px] text-slate-400 mt-[4px]">메모: {res.memo}</p>
                                )}
                                <p className="text-[10px] text-slate-300 mt-[4px]">
                                  {new Date(res.created_at).toLocaleDateString('ko-KR')} 신청
                                </p>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
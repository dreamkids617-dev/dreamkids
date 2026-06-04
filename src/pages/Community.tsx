import { MessageCircle, GraduationCap, Baby, ShoppingBag, Users, MapPin } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const upcomingTopics = [
  { icon: MessageCircle, title: '학부모 질문', desc: '입학·적응·생활 루틴 등 궁금한 점을 나눠요' },
  { icon: GraduationCap, title: '입학 준비', desc: '서류, 상담, 일정 체크리스트를 함께 정리해요' },
  { icon: Baby, title: '유아용품 추천', desc: '실사용 후기와 연령별 추천을 모아둘 예정이에요' },
  { icon: ShoppingBag, title: '공동구매 모집', desc: '공구 모집 글만 — 결제·주문 기능은 추후 검토' },
  { icon: MapPin, title: '지역 육아 정보', desc: '동네 기준 육아 팁·정보를 공유하는 공간' },
  { icon: Users, title: '나눔·중고', desc: '물품 나눔·중고 정보 (거래 기능 없음)' },
];

export default function CommunityPage() {
  return (
    <div className="app-container">
      <header className="flex-shrink-0 bg-white px-5 pt-3 pb-3 safe-top border-b border-slate-50">
        <h1 className="text-[18px] font-bold text-slate-800">커뮤니티</h1>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          학부모가 함께 정보를 나누는 공간을 준비하고 있어요
        </p>
      </header>

      <div className="page-content">
        <div className="px-5 pt-4 pb-4 animate-slide-up">
          <div className="bg-indigo-50 border border-indigo-100 rounded-[16px] px-4 py-3 mb-4">
            <p className="text-[12px] font-semibold text-indigo-700">준비 중</p>
            <p className="text-[11px] text-indigo-600/90 mt-1 leading-relaxed">
              글 작성·댓글·공동구매 결제·주문 기능은 아직 제공하지 않습니다. 먼저 앱 골격을
              맞춘 뒤, 단계적으로 열 예정이에요.
            </p>
          </div>

          <p className="text-[12px] text-slate-500 mb-3 font-medium">이런 주제를 준비 중이에요</p>
          <div className="space-y-[10px]">
            {upcomingTopics.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-white rounded-[16px] p-4 card-shadow flex gap-3 items-start"
              >
                <div className="w-10 h-10 rounded-[12px] bg-slate-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[13px] font-semibold text-slate-800">{title}</h2>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

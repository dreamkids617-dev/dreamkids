import { Bell, Newspaper, Calendar, Megaphone, Heart, Info } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const feedTopics = [
  { icon: Heart, title: '관심 기관 새 글', desc: '찜한 기관의 최신 소식을 한곳에서 볼 수 있게 할 예정' },
  { icon: Megaphone, title: '모집 안내', desc: '신입·편입·상담 모집 소식을 모아 전달' },
  { icon: Calendar, title: '교육활동·행사', desc: '체험학습, 행사, 학부모 참여 일정 안내' },
  { icon: Bell, title: '소식받기', desc: '구독·알림 설정은 추후 제공 (현재 미지원)' },
];

export default function NewsPage() {
  return (
    <div className="app-container">
      <header className="flex-shrink-0 bg-white px-5 pt-3 pb-3 safe-top border-b border-slate-50">
        <h1 className="text-[18px] font-bold text-slate-800">소식</h1>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          관심 기관의 소식이 모이는 피드 공간을 준비하고 있어요
        </p>
      </header>

      <div className="page-content">
        <div className="px-5 pt-4 pb-4 animate-slide-up">
          <div className="bg-amber-50 border border-amber-100 rounded-[16px] px-4 py-3 mb-4 flex gap-2">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-semibold text-amber-800">기관 상세의 「소식」과 달라요</p>
              <p className="text-[11px] text-amber-700/90 mt-1 leading-relaxed">
                기관 상세 페이지에서는 해당 기관이 올린 글만 볼 수 있어요. 이 탭은 여러 기관 소식을
                한곳에서 보는 전역 피드입니다.
              </p>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-[16px] px-4 py-3 mb-4">
            <p className="text-[12px] font-semibold text-indigo-700">준비 중</p>
            <p className="text-[11px] text-indigo-600/90 mt-1 leading-relaxed">
              팔로우·소식받기·푸시 알림은 아직 연결되지 않았습니다.
            </p>
          </div>

          <p className="text-[12px] text-slate-500 mb-3 font-medium">앞으로 모일 소식 유형</p>
          <div className="space-y-[10px]">
            {feedTopics.map(({ icon: Icon, title, desc }) => (
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

          <div className="mt-4 bg-white rounded-[16px] p-4 card-shadow flex gap-3 items-center opacity-80">
            <Newspaper className="w-8 h-8 text-slate-300" />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              지금은 기관 상세 → 「기관 소식」 탭에서 등록된 공개 소식을 확인할 수 있어요.
            </p>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

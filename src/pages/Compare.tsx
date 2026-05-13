import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X, GitCompareArrows } from 'lucide-react';
import { useCompare } from '@/contexts/CompareContext';

export default function ComparePage() {
  const navigate = useNavigate();
  const { compareList, removeFromCompare, clearCompare } = useCompare();

  return (
    <div className="app-container">
      <header className="flex-shrink-0 bg-white px-5 pt-3 pb-3 safe-top flex items-center gap-3 border-b border-slate-50">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-50 touch-active">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <h1 className="text-[18px] font-bold text-slate-800">기관 비교</h1>
        {compareList.length > 0 && (
          <button onClick={clearCompare} className="ml-auto text-[11px] text-red-500 font-semibold">
            전체 삭제
          </button>
        )}
      </header>

      <div className="page-content">
        <div className="px-5 pt-4 pb-8 animate-slide-up">
          {compareList.length === 0 ? (
            <div className="text-center py-20">
              <GitCompareArrows className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-[14px] text-slate-500 font-medium">비교함이 비어있습니다</p>
              <p className="text-[12px] text-slate-400 mt-1">기관 목록에서 비교할 기관을 담아보세요</p>
              <button
                onClick={() => navigate('/search')}
                className="mt-4 px-5 py-2 bg-indigo-600 text-white text-[13px] font-semibold rounded-[10px] touch-active"
              >
                기관 검색하기
              </button>
            </div>
          ) : (
            <>
              <p className="text-[12px] text-slate-400 mb-3">최대 3개까지 비교할 수 있습니다 ({compareList.length}/3)</p>
              
              {/* Comparison Table */}
              <div className="overflow-x-auto -mx-5 px-5">
                <div className="flex gap-3" style={{ minWidth: `${compareList.length * 160}px` }}>
                  {compareList.map(inst => (
                    <div key={inst.id} className="flex-1 min-w-[140px] bg-white rounded-[14px] card-shadow overflow-hidden">
                      {/* Image & Remove */}
                      <div className="relative">
                        <img src={inst.image} alt={inst.name} className="w-full h-[100px] object-cover" />
                        <button
                          onClick={() => removeFromCompare(inst.id)}
                          className="absolute top-2 right-2 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center shadow-sm"
                        >
                          <X className="w-3 h-3 text-slate-600" />
                        </button>
                      </div>

                      {/* Info */}
                      <div className="p-3 space-y-2">
                        <h3 className="text-[12px] font-bold text-slate-800 truncate">{inst.name}</h3>
                        
                        <div className="space-y-[6px]">
                          <div>
                            <p className="text-[9px] text-slate-400 font-medium">지역</p>
                            <p className="text-[11px] text-slate-700">{inst.region}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400 font-medium">유형</p>
                            <p className="text-[11px] text-slate-700">{inst.type}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400 font-medium">평점</p>
                            <p className="text-[11px] text-slate-700">⭐ {inst.rating} ({inst.review_count})</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400 font-medium">차량운행</p>
                            <p className="text-[11px] text-slate-700">{inst.has_vehicle ? '🚌 있음' : '없음'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400 font-medium">태그</p>
                            <div className="flex flex-wrap gap-[3px] mt-[2px]">
                              {inst.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="text-[9px] px-[5px] py-[1px] bg-indigo-50 text-indigo-600 rounded-[4px]">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => navigate(`/detail/${inst.id}`)}
                          className="w-full mt-2 py-[6px] bg-indigo-50 text-indigo-600 text-[10px] font-semibold rounded-[8px] touch-active"
                        >
                          상세보기
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
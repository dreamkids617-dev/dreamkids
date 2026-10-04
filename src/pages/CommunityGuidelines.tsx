import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { COMMUNITY_GUIDELINES } from '@/lib/legalDocs';

export default function CommunityGuidelinesPage() {
  const navigate = useNavigate();
  const doc = COMMUNITY_GUIDELINES;

  return (
    <div className="app-container bg-white">
      <header className="flex-shrink-0 px-5 pt-4 pb-3 safe-top border-b border-slate-50">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-[12px] text-slate-500"
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로
        </button>
        <h1 className="text-[18px] font-bold text-slate-800 mt-2">{doc.title}</h1>
        <p className="text-[11px] text-slate-400 mt-1">
          시행·개정일 {doc.updatedAt} · 문서 버전 {doc.version}
        </p>
      </header>
      <div className="page-content">
        <div className="px-5 py-5 space-y-5 pb-10">
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-[12px] px-3 py-2 leading-relaxed">
            본 문서는 서비스 운영용 템플릿입니다. 정식 오픈 전 법률·운영 검토 후 최종본으로 교체하세요.
          </p>

          <p className="text-[12px] text-slate-600 leading-relaxed">{doc.intro}</p>

          {doc.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-[13px] font-bold text-slate-800 mb-1.5">{s.heading}</h2>
              <p className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-wrap">{s.body}</p>
            </section>
          ))}

          <p className="text-[11px] text-slate-400 pt-2 leading-relaxed">
            관련 문서:{' '}
            <Link to="/terms" className="text-indigo-600 font-semibold">
              이용약관
            </Link>
            {' · '}
            <Link to="/privacy" className="text-indigo-600 font-semibold">
              개인정보처리방침
            </Link>
            {' · '}
            <Link to="/community" className="text-indigo-600 font-semibold">
              커뮤니티
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

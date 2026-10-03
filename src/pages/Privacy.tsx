import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  COMMUNITY_GUIDELINES,
  MARKETING_CONSENT_COPY,
  PRIVACY_COLLECT_NOTICE,
  PRIVACY_POLICY,
  SERVICE_PUSH_NOTICE,
} from '@/lib/legalDocs';

export default function PrivacyPage() {
  const navigate = useNavigate();
  const doc = PRIVACY_POLICY;
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
            본 문서는 서비스 운영용 템플릿입니다. 정식 오픈 전 법률 검토 후 최종본으로 교체하세요.
            개인정보 보호 책임자 연락처·위탁사 목록을 실제 운영 정보에 맞게 수정하세요.
          </p>

          <p className="text-[12px] text-slate-600 leading-relaxed">{doc.intro}</p>

          <section className="rounded-[12px] border border-indigo-100 bg-indigo-50/50 overflow-hidden">
            <div className="px-3 py-2 border-b border-indigo-100">
              <h2 className="text-[12px] font-bold text-indigo-800">
                회원가입 시 개인정보 수집·이용 안내 (요약)
              </h2>
              <p className="text-[10px] text-indigo-600 mt-0.5">버전 {PRIVACY_COLLECT_NOTICE.version}</p>
            </div>
            <dl className="divide-y divide-indigo-100/80 bg-white">
              {PRIVACY_COLLECT_NOTICE.items.map((row) => (
                <div key={row.label} className="px-3 py-2.5 grid grid-cols-[88px_1fr] gap-2">
                  <dt className="text-[10px] font-bold text-slate-500">{row.label}</dt>
                  <dd className="text-[11px] text-slate-700 leading-relaxed">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-[12px] border border-slate-200 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
              <h2 className="text-[12px] font-bold text-slate-800">알림 안내 구분</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">
                서비스 알림과 마케팅 수신은 목적이 다릅니다
              </p>
            </div>
            <div className="px-3 py-3 space-y-3 bg-white">
              <div>
                <p className="text-[11px] font-bold text-slate-700">{SERVICE_PUSH_NOTICE.title}</p>
                <p className="text-[11px] text-slate-600 leading-relaxed mt-1">
                  {SERVICE_PUSH_NOTICE.body}
                </p>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[11px] font-bold text-slate-700">{MARKETING_CONSENT_COPY.title}</p>
                <p className="text-[11px] text-slate-600 leading-relaxed mt-1">
                  {MARKETING_CONSENT_COPY.body}
                </p>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  버전 {MARKETING_CONSENT_COPY.version}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[12px] border border-slate-200 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
              <h2 className="text-[12px] font-bold text-slate-800">학부모 커뮤니티</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">
                버전 {COMMUNITY_GUIDELINES.version} · 게시·프로필·신고 처리 요약
              </p>
            </div>
            <div className="px-3 py-3 bg-white space-y-2">
              <p className="text-[11px] text-slate-600 leading-relaxed">
                커뮤니티 이용 시 닉네임·지역·게시글(제목·본문·카테고리)·신고 정보가 처리되며,
                게시 내용은 다른 학부모 회원에게 공개될 수 있습니다. 민감정보 게시를 금지하며,
                운영자가 신고를 검토해 조치할 수 있습니다.
              </p>
              <Link
                to="/community/guidelines"
                className="inline-block text-[11px] text-indigo-600 font-semibold"
              >
                커뮤니티 이용 안내 보기
              </Link>
            </div>
          </section>

          {doc.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-[13px] font-bold text-slate-800 mb-1.5">{s.heading}</h2>
              <p className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-wrap">{s.body}</p>
            </section>
          ))}

          <p className="text-[11px] text-slate-400 pt-2">
            서비스 이용 조건은{' '}
            <Link to="/terms" className="text-indigo-600 font-semibold">
              이용약관
            </Link>
            을 확인해 주세요.
          </p>
        </div>
      </div>
    </div>
  );
}

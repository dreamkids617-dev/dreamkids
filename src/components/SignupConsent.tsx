import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronRight, X } from 'lucide-react';
import {
  MARKETING_CONSENT_COPY,
  PRIVACY_COLLECT_NOTICE,
} from '@/lib/legalDocs';
import {
  SignupConsentState,
  requiredConsentsAccepted,
} from '@/lib/consent';

type Props = {
  value: SignupConsentState;
  onChange: (next: SignupConsentState) => void;
  variant?: 'parent' | 'admin';
};

type DetailKey = 'privacyCollect' | 'marketing' | null;

function RoundCheck({
  checked,
  accent,
  onToggle,
}: {
  checked: boolean;
  accent: 'indigo' | 'slate';
  onToggle: () => void;
}) {
  const active =
    accent === 'slate' ? 'bg-slate-800 border-slate-800' : 'bg-indigo-600 border-indigo-600';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-checked={checked}
      role="checkbox"
      className={`flex-shrink-0 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-colors ${
        checked ? active : 'bg-white border-slate-300'
      }`}
    >
      {checked ? <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} /> : null}
    </button>
  );
}

function ConsentRow({
  checked,
  onToggle,
  required,
  label,
  onOpenDetail,
  accent,
}: {
  checked: boolean;
  onToggle: () => void;
  required: boolean;
  label: string;
  onOpenDetail?: () => void;
  accent: 'indigo' | 'slate';
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <RoundCheck checked={checked} accent={accent} onToggle={onToggle} />
      <button
        type="button"
        onClick={onToggle}
        className="flex-1 min-w-0 text-left"
      >
        <span
          className={`text-[11px] font-bold mr-1 ${
            required ? 'text-orange-500' : 'text-slate-400'
          }`}
        >
          {required ? '필수' : '선택'}
        </span>
        <span className="text-[13px] text-slate-800 font-medium">{label}</span>
      </button>
      {onOpenDetail ? (
        <button
          type="button"
          onClick={onOpenDetail}
          className="flex-shrink-0 p-1 text-slate-400"
          aria-label={`${label} 자세히 보기`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      ) : (
        <span className="w-7" />
      )}
    </div>
  );
}

function DetailSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 px-0 sm:px-4">
      <button type="button" className="absolute inset-0" aria-label="닫기" onClick={onClose} />
      <div className="relative w-full max-w-[430px] max-h-[78vh] bg-white rounded-t-[20px] shadow-xl flex flex-col animate-slide-up">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
          <h3 className="text-[15px] font-bold text-slate-800">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-500" aria-label="닫기">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 pb-8">{children}</div>
      </div>
    </div>
  );
}

export default function SignupConsent({ value, onChange, variant = 'parent' }: Props) {
  const [detail, setDetail] = useState<DetailKey>(null);
  const accent: 'indigo' | 'slate' = variant === 'admin' ? 'slate' : 'indigo';
  const allRequired = requiredConsentsAccepted(value);
  const allChecked = allRequired && value.marketing;

  const setAll = (checked: boolean) => {
    onChange({
      terms: checked,
      privacyCollect: checked,
      ageOver14: checked,
      marketing: checked,
    });
  };

  return (
    <>
      <div className="rounded-[16px] border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-[14px] font-bold text-slate-900">약관 동의</p>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            서비스 이용을 위해 아래 약관에 동의해 주세요. 선택 항목은 동의하지 않아도 가입할 수 있어요.
          </p>
        </div>

        {/* 전체 동의 — 당근형 상단 */}
        <div className="px-4">
          <div className="flex items-center gap-3 py-3.5">
            <RoundCheck
              checked={allChecked}
              accent={accent}
              onToggle={() => setAll(!allChecked)}
            />
            <button
              type="button"
              onClick={() => setAll(!allChecked)}
              className="flex-1 text-left"
            >
              <span className="text-[15px] font-bold text-slate-900">전체 동의합니다</span>
              <span className="block text-[11px] text-slate-400 mt-0.5">
                선택 항목 포함 · 동의 항목을 한 번에 확인할 수 있어요
              </span>
            </button>
          </div>
        </div>

        <div className="mx-4 border-t border-slate-100" />

        <div className="px-4 divide-y divide-slate-50">
          <ConsentRow
            checked={value.terms}
            onToggle={() => onChange({ ...value, terms: !value.terms })}
            required
            label="이용약관 동의"
            accent={accent}
            onOpenDetail={() => {
              window.open('/terms', '_blank', 'noopener,noreferrer');
            }}
          />
          <ConsentRow
            checked={value.privacyCollect}
            onToggle={() => onChange({ ...value, privacyCollect: !value.privacyCollect })}
            required
            label="개인정보 수집 및 이용 동의"
            accent={accent}
            onOpenDetail={() => setDetail('privacyCollect')}
          />
          <ConsentRow
            checked={value.ageOver14}
            onToggle={() => onChange({ ...value, ageOver14: !value.ageOver14 })}
            required
            label="만 14세 이상입니다"
            accent={accent}
          />
          <ConsentRow
            checked={value.marketing}
            onToggle={() => onChange({ ...value, marketing: !value.marketing })}
            required={false}
            label="마케팅 정보 수신 동의"
            accent={accent}
            onOpenDetail={() => setDetail('marketing')}
          />
        </div>

        {!allRequired && (
          <div className="px-4 pb-3">
            <p className="text-[11px] text-orange-600 bg-orange-50 rounded-[10px] px-3 py-2 leading-relaxed">
              필수 항목에 모두 동의해야 가입할 수 있어요.
            </p>
          </div>
        )}

        <div className="px-4 pb-3 flex gap-3 text-[10px] text-slate-400">
          <Link to="/terms" className="underline underline-offset-2">
            이용약관
          </Link>
          <Link to="/privacy" className="underline underline-offset-2">
            개인정보처리방침
          </Link>
        </div>
      </div>

      {detail === 'privacyCollect' && (
        <DetailSheet title="개인정보 수집 및 이용 동의" onClose={() => setDetail(null)}>
          <p className="text-[11px] text-slate-500 mb-3">
            버전 {PRIVACY_COLLECT_NOTICE.version} · 최종 조항 문구는 운영 확정본으로 교체됩니다.
          </p>
          <div className="rounded-[12px] border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[11px] text-slate-500">
                  <th className="px-3 py-2 font-semibold w-[96px]">구분</th>
                  <th className="px-3 py-2 font-semibold">내용</th>
                </tr>
              </thead>
              <tbody>
                {PRIVACY_COLLECT_NOTICE.items.map((row) => (
                  <tr key={row.label} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2.5 text-[11px] font-bold text-slate-600">{row.label}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-700 leading-relaxed">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link
            to="/privacy"
            className={`mt-4 inline-flex text-[12px] font-semibold ${
              accent === 'slate' ? 'text-slate-800' : 'text-indigo-600'
            }`}
            onClick={() => setDetail(null)}
          >
            개인정보처리방침 전체 보기
            <ChevronRight className="w-4 h-4 ml-0.5" />
          </Link>
          <button
            type="button"
            onClick={() => {
              onChange({ ...value, privacyCollect: true });
              setDetail(null);
            }}
            className={`mt-5 w-full h-12 rounded-[12px] text-white text-[14px] font-semibold ${
              accent === 'slate' ? 'bg-slate-800' : 'bg-indigo-600'
            }`}
          >
            동의하고 닫기
          </button>
        </DetailSheet>
      )}

      {detail === 'marketing' && (
        <DetailSheet title="마케팅 정보 수신 동의" onClose={() => setDetail(null)}>
          <p className="text-[12px] text-slate-700 leading-relaxed">{MARKETING_CONSENT_COPY.body}</p>
          <p className="text-[11px] text-slate-400 mt-3">버전 {MARKETING_CONSENT_COPY.version}</p>
          <button
            type="button"
            onClick={() => {
              onChange({ ...value, marketing: true });
              setDetail(null);
            }}
            className={`mt-5 w-full h-12 rounded-[12px] text-white text-[14px] font-semibold ${
              accent === 'slate' ? 'bg-slate-800' : 'bg-indigo-600'
            }`}
          >
            동의하고 닫기
          </button>
          <button
            type="button"
            onClick={() => setDetail(null)}
            className="mt-2 w-full h-11 rounded-[12px] text-slate-600 text-[13px] font-semibold border border-slate-200"
          >
            닫기
          </button>
        </DetailSheet>
      )}
    </>
  );
}

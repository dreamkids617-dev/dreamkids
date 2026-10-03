import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
  /** Visual tone for admin signup */
  variant?: 'parent' | 'admin';
};

function ConsentCheck({
  checked,
  onChange,
  children,
  id,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-2.5 cursor-pointer select-none">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
      <span className="text-[12px] text-slate-700 leading-relaxed">{children}</span>
    </label>
  );
}

export default function SignupConsent({ value, onChange, variant = 'parent' }: Props) {
  const [showPrivacyDetail, setShowPrivacyDetail] = useState(true);
  const allRequired = requiredConsentsAccepted(value);
  const allChecked = allRequired && value.marketing;

  const badgeRequired = useMemo(
    () => (
      <span className="text-[10px] font-bold text-red-500 mr-1">[필수]</span>
    ),
    []
  );
  const badgeOptional = (
    <span className="text-[10px] font-bold text-slate-400 mr-1">[선택]</span>
  );

  const linkClass =
    variant === 'admin'
      ? 'text-slate-800 font-semibold underline underline-offset-2'
      : 'text-indigo-600 font-semibold underline underline-offset-2';

  const setAll = (checked: boolean) => {
    onChange({
      terms: checked,
      privacyCollect: checked,
      ageOver14: checked,
      marketing: checked,
    });
  };

  return (
    <div className="rounded-[14px] border border-slate-200 bg-slate-50/80 p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-bold text-slate-800">약관 및 개인정보 동의</p>
        <p className="text-[10px] text-slate-400">버전 {PRIVACY_COLLECT_NOTICE.version}</p>
      </div>

      <ConsentCheck
        id="consent-all"
        checked={allChecked}
        onChange={setAll}
      >
        <span className="font-semibold">전체 동의</span>
        <span className="text-slate-500"> (선택 항목 포함)</span>
      </ConsentCheck>

      <div className="h-px bg-slate-200" />

      <ConsentCheck
        id="consent-terms"
        checked={value.terms}
        onChange={(v) => onChange({ ...value, terms: v })}
      >
        {badgeRequired}
        <Link to="/terms" target="_blank" rel="noopener noreferrer" className={linkClass}>
          이용약관
        </Link>
        에 동의합니다
      </ConsentCheck>

      <div className="space-y-2">
        <ConsentCheck
          id="consent-privacy"
          checked={value.privacyCollect}
          onChange={(v) => onChange({ ...value, privacyCollect: v })}
        >
          {badgeRequired}
          <button
            type="button"
            className={linkClass}
            onClick={(e) => {
              e.preventDefault();
              setShowPrivacyDetail((s) => !s);
            }}
          >
            개인정보 수집·이용
          </button>
          에 동의합니다{' '}
          <Link to="/privacy" target="_blank" rel="noopener noreferrer" className={linkClass}>
            (처리방침)
          </Link>
        </ConsentCheck>

        <button
          type="button"
          onClick={() => setShowPrivacyDetail((s) => !s)}
          className="flex items-center gap-1 text-[11px] text-slate-500 font-medium pl-6"
        >
          수집·이용 내용 자세히 보기
          {showPrivacyDetail ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showPrivacyDetail && (
          <div className="ml-6 rounded-[12px] border border-slate-200 bg-white overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
              <p className="text-[11px] font-semibold text-slate-700">{PRIVACY_COLLECT_NOTICE.title}</p>
            </div>
            <dl className="divide-y divide-slate-100">
              {PRIVACY_COLLECT_NOTICE.items.map((row) => (
                <div key={row.label} className="px-3 py-2.5 grid grid-cols-[88px_1fr] gap-2">
                  <dt className="text-[10px] font-bold text-slate-500">{row.label}</dt>
                  <dd className="text-[11px] text-slate-700 leading-relaxed">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>

      <ConsentCheck
        id="consent-age"
        checked={value.ageOver14}
        onChange={(v) => onChange({ ...value, ageOver14: v })}
      >
        {badgeRequired}
        만 14세 이상입니다
      </ConsentCheck>

      <ConsentCheck
        id="consent-marketing"
        checked={value.marketing}
        onChange={(v) => onChange({ ...value, marketing: v })}
      >
        {badgeOptional}
        {MARKETING_CONSENT_COPY.title.replace(' (선택)', '')}에 동의합니다
        <span className="block text-[11px] text-slate-500 mt-0.5 font-normal">
          {MARKETING_CONSENT_COPY.body}
        </span>
      </ConsentCheck>

      {!allRequired && (
        <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-[10px] px-2.5 py-2">
          필수 동의(이용약관·개인정보 수집·이용·만 14세 이상)를 모두 체크해야 가입할 수 있습니다.
        </p>
      )}
    </div>
  );
}

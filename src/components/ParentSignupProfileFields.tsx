import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CHILD_AGE_BANDS, type ChildAgeBand } from '@/lib/supabase';
import { KOREA_SIDO_LIST, getSigunguOptions } from '@/lib/koreaRegions';
import type { ParentSignupProfile } from '@/lib/parentProfile';

const NONE_AGE_BAND_VALUE = '__none_age_band__';

type Props = {
  value: ParentSignupProfile;
  onChange: (next: ParentSignupProfile) => void;
};

/**
 * Parent community identity at signup.
 * Nickname + neighborhood (sido/sigungu) required for accountability.
 * Automated region verification comes later at scale (not manual admin).
 */
export default function ParentSignupProfileFields({ value, onChange }: Props) {
  const sido = value.region_sido || '';
  const sigungu = value.region_sigungu || '';
  const sigunguOptions = sido ? getSigunguOptions(sido) : [];

  return (
    <div className="rounded-[14px] border border-indigo-100 bg-indigo-50/40 px-3.5 py-3.5 space-y-3">
      <div>
        <p className="text-[12px] font-bold text-slate-800">커뮤니티 프로필</p>
        <p className="text-[10px] text-slate-600 mt-0.5 leading-relaxed">
          커뮤니티는 익명이 아닙니다. 닉네임과 동네(시/군/구)는 필수예요. 지금은 본인이 선택한
          동네로 이용하고, 이용자가 늘어나면 휴대폰·주소 확인 같은 자동 동네 인증으로 강화할
          예정이에요(관리자가 한 명씩 검수하지 않음).
        </p>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">
          닉네임 <span className="text-indigo-600 font-semibold">(필수)</span>
        </label>
        <Input
          value={value.display_name || ''}
          onChange={(e) => onChange({ ...value, display_name: e.target.value })}
          placeholder="예: 해님맘"
          className="h-11 rounded-[12px] text-[13px] bg-white"
          maxLength={30}
          required
        />
        <p className="text-[10px] text-slate-500 mt-1">글에 이 이름이 표시됩니다.</p>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">
          우리 동네 <span className="text-indigo-600 font-semibold">(필수)</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={sido || undefined}
            onValueChange={(next) => {
              onChange({ ...value, region_sido: next, region_sigungu: '' });
            }}
          >
            <SelectTrigger className="h-11 rounded-[12px] text-[12px] bg-white">
              <SelectValue placeholder="시/도" />
            </SelectTrigger>
            <SelectContent>
              {KOREA_SIDO_LIST.map(({ value: v, label }) => (
                <SelectItem key={v} value={v}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sigungu || undefined}
            onValueChange={(next) => {
              onChange({ ...value, region_sigungu: next });
            }}
            disabled={!sido}
          >
            <SelectTrigger className="h-11 rounded-[12px] text-[12px] bg-white">
              <SelectValue placeholder="시/군/구" />
            </SelectTrigger>
            <SelectContent>
              {sigunguOptions.map(({ value: v, label }) => (
                <SelectItem key={v} value={v}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-[10px] text-slate-500 mt-1">
          같은 동네 학부모와 연결되고, 지역 글 필터에 쓰입니다.
        </p>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">
          아이 연령대 <span className="text-slate-400 font-normal">(선택)</span>
        </label>
        <Select
          value={value.child_age_band || NONE_AGE_BAND_VALUE}
          onValueChange={(next) => {
            onChange({
              ...value,
              child_age_band: next === NONE_AGE_BAND_VALUE ? '' : (next as ChildAgeBand),
            });
          }}
        >
          <SelectTrigger className="h-11 rounded-[12px] text-[12px] bg-white">
            <SelectValue placeholder="연령대 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_AGE_BAND_VALUE}>미설정</SelectItem>
            {CHILD_AGE_BANDS.map(({ value: v, label }) => (
              <SelectItem key={v} value={v}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

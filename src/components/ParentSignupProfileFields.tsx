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

const ALL_SIDO_VALUE = '__none_sido__';
const ALL_SIGUNGU_VALUE = '__none_sigungu__';
const NONE_AGE_BAND_VALUE = '__none_age_band__';

type Props = {
  value: ParentSignupProfile;
  onChange: (next: ParentSignupProfile) => void;
};

/**
 * Parent community identity at signup.
 * Nickname is required (accountability). Region/age are recommended, not forced.
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
          커뮤니티는 익명이 아닙니다. 다른 학부모에게 보일 닉네임을 정해 주세요. 동네·연령대는
          선택이며, 나중에 마이페이지에서 바꿀 수 있어요.
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
        <p className="text-[10px] text-slate-500 mt-1">글·댓글에 이 이름이 표시됩니다.</p>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">
          우리 동네 <span className="text-slate-400 font-normal">(권장)</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={sido || ALL_SIDO_VALUE}
            onValueChange={(next) => {
              if (next === ALL_SIDO_VALUE) {
                onChange({ ...value, region_sido: '', region_sigungu: '' });
              } else {
                onChange({ ...value, region_sido: next, region_sigungu: '' });
              }
            }}
          >
            <SelectTrigger className="h-11 rounded-[12px] text-[12px] bg-white">
              <SelectValue placeholder="시/도" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SIDO_VALUE}>선택 안 함</SelectItem>
              {KOREA_SIDO_LIST.map(({ value: v, label }) => (
                <SelectItem key={v} value={v}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sigungu || ALL_SIGUNGU_VALUE}
            onValueChange={(next) => {
              onChange({
                ...value,
                region_sigungu: next === ALL_SIGUNGU_VALUE ? '' : next,
              });
            }}
            disabled={!sido}
          >
            <SelectTrigger className="h-11 rounded-[12px] text-[12px] bg-white">
              <SelectValue placeholder="시/군/구" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SIGUNGU_VALUE}>선택 안 함</SelectItem>
              {sigunguOptions.map(({ value: v, label }) => (
                <SelectItem key={v} value={v}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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

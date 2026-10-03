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

/** Optional community-facing profile fields for parent signup. */
export default function ParentSignupProfileFields({ value, onChange }: Props) {
  const sido = value.region_sido || '';
  const sigungu = value.region_sigungu || '';
  const sigunguOptions = sido ? getSigunguOptions(sido) : [];

  return (
    <div className="rounded-[14px] border border-slate-100 bg-slate-50/80 px-3.5 py-3.5 space-y-3">
      <div>
        <p className="text-[12px] font-bold text-slate-800">커뮤니티 프로필 (선택)</p>
        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
          닉네임·지역은 커뮤니티에 공개될 수 있습니다. 나중에 마이페이지에서도 설정할 수 있어요.
          아이 이름·연락처는 받지 않습니다.
        </p>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">
          닉네임 <span className="text-slate-400 font-normal">(커뮤니티 표시명)</span>
        </label>
        <Input
          value={value.display_name || ''}
          onChange={(e) => onChange({ ...value, display_name: e.target.value })}
          placeholder="예: 해님맘"
          className="h-11 rounded-[12px] text-[13px] bg-white"
          maxLength={30}
        />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">
          지역 <span className="text-slate-400 font-normal">(시/도·시/군/구)</span>
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

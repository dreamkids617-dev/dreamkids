export type RegionOption = {
  value: string;
  label: string;
};

/** 시/도 목록 (표준 행정구역 명칭) */
export const KOREA_SIDO_LIST: RegionOption[] = [
  { value: '서울특별시', label: '서울특별시' },
  { value: '부산광역시', label: '부산광역시' },
  { value: '대구광역시', label: '대구광역시' },
  { value: '인천광역시', label: '인천광역시' },
  { value: '광주광역시', label: '광주광역시' },
  { value: '대전광역시', label: '대전광역시' },
  { value: '울산광역시', label: '울산광역시' },
  { value: '세종특별자치시', label: '세종특별자치시' },
  { value: '경기도', label: '경기도' },
  { value: '강원특별자치도', label: '강원특별자치도' },
  { value: '충청북도', label: '충청북도' },
  { value: '충청남도', label: '충청남도' },
  { value: '전북특별자치도', label: '전북특별자치도' },
  { value: '전라남도', label: '전라남도' },
  { value: '경상북도', label: '경상북도' },
  { value: '경상남도', label: '경상남도' },
  { value: '제주특별자치도', label: '제주특별자치도' },
];

/** 시/도 value → 시/군/구 목록 */
export const KOREA_SIGUNGU_BY_SIDO: Record<string, RegionOption[]> = {
  서울특별시: [
    '강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구',
    '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구',
    '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구',
  ].map((name) => ({ value: name, label: name })),
  부산광역시: [
    '강서구', '금정구', '기장군', '남구', '동구', '동래구', '부산진구', '북구',
    '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구',
  ].map((name) => ({ value: name, label: name })),
  대구광역시: [
    '남구', '달서구', '달성군', '동구', '북구', '서구', '수성구', '중구',
  ].map((name) => ({ value: name, label: name })),
  인천광역시: [
    '강화군', '계양구', '남동구', '동구', '미추홀구', '부평구', '서구', '연수구', '옹진군', '중구',
  ].map((name) => ({ value: name, label: name })),
  광주광역시: [
    '광산구', '남구', '동구', '북구', '서구',
  ].map((name) => ({ value: name, label: name })),
  대전광역시: [
    '대덕구', '동구', '서구', '유성구', '중구',
  ].map((name) => ({ value: name, label: name })),
  울산광역시: [
    '남구', '동구', '북구', '울주군', '중구',
  ].map((name) => ({ value: name, label: name })),
  세종특별자치시: [
    { value: '세종시', label: '세종시' },
  ],
  경기도: [
    '가평군', '고양시', '과천시', '광명시', '광주시', '구리시', '군포시', '김포시',
    '남양주시', '동두천시', '부천시', '성남시', '수원시', '시흥시', '안산시', '안성시',
    '안양시', '양주시', '양평군', '여주시', '연천군', '오산시', '용인시', '의왕시',
    '의정부시', '이천시', '파주시', '평택시', '포천시', '하남시', '화성시',
  ].map((name) => ({ value: name, label: name })),
  강원특별자치도: [
    '강릉시', '고성군', '동해시', '삼척시', '속초시', '양구군', '양양군', '영월군',
    '원주시', '인제군', '정선군', '철원군', '춘천시', '태백시', '평창군', '홍천군', '화천군', '횡성군',
  ].map((name) => ({ value: name, label: name })),
  충청북도: [
    '괴산군', '단양군', '보은군', '영동군', '옥천군', '음성군', '제천시', '증평군', '진천군', '청주시', '충주시',
  ].map((name) => ({ value: name, label: name })),
  충청남도: [
    '계룡시', '공주시', '금산군', '논산시', '당진시', '보령시', '부여군', '서산시', '서천군',
    '아산시', '예산군', '천안시', '청양군', '태안군', '홍성군',
  ].map((name) => ({ value: name, label: name })),
  전북특별자치도: [
    '고창군', '군산시', '김제시', '남원시', '무주군', '부안군', '순창군', '완주군', '익산시', '임실군', '장수군', '전주시', '정읍시', '진안군',
  ].map((name) => ({ value: name, label: name })),
  전라남도: [
    '강진군', '고흥군', '곡성군', '광양시', '구례군', '나주시', '담양군', '목포시', '무안군', '보성군',
    '순천시', '신안군', '여수시', '영광군', '영암군', '완도군', '장성군', '장흥군', '진도군', '함평군', '해남군', '화순군',
  ].map((name) => ({ value: name, label: name })),
  경상북도: [
    '경산시', '경주시', '고령군', '구미시', '군위군', '김천시', '문경시', '봉화군', '상주시', '성주군',
    '안동시', '영덕군', '영양군', '영주시', '영천시', '예천군', '울릉군', '울진군', '의성군', '청도군', '청송군', '칠곡군', '포항시',
  ].map((name) => ({ value: name, label: name })),
  경상남도: [
    '거제시', '거창군', '고성군', '김해시', '남해군', '밀양시', '사천시', '산청군', '양산시', '의령군',
    '진주시', '창녕군', '창원시', '통영시', '하동군', '함안군', '함양군', '합천군',
  ].map((name) => ({ value: name, label: name })),
  제주특별자치도: [
    '서귀포시', '제주시',
  ].map((name) => ({ value: name, label: name })),
};

const SIDO_VALUE_SET = new Set(KOREA_SIDO_LIST.map((s) => s.value));

export function isValidSido(value: string): boolean {
  return SIDO_VALUE_SET.has(value);
}

export function isValidSigungu(sido: string, sigungu: string): boolean {
  const list = KOREA_SIGUNGU_BY_SIDO[sido];
  if (!list) return false;
  return list.some((item) => item.value === sigungu);
}

export function getSigunguOptions(sido: string): RegionOption[] {
  return KOREA_SIGUNGU_BY_SIDO[sido] ?? [];
}

/** URL/자유입력 값을 알려진 시/도 value로 정규화 (없으면 null) */
export function normalizeSidoInput(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  const exact = KOREA_SIDO_LIST.find((s) => s.value === trimmed || s.label === trimmed);
  if (exact) return exact.value;
  const aliases: Record<string, string> = {
    서울: '서울특별시',
    부산: '부산광역시',
    대구: '대구광역시',
    인천: '인천광역시',
    광주: '광주광역시',
    대전: '대전광역시',
    울산: '울산광역시',
    세종: '세종특별자치시',
    경기: '경기도',
    강원: '강원특별자치도',
    충북: '충청북도',
    충남: '충청남도',
    전북: '전북특별자치도',
    전남: '전라남도',
    경북: '경상북도',
    경남: '경상남도',
    제주: '제주특별자치도',
  };
  return aliases[trimmed] ?? null;
}

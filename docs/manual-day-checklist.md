# Dream Kids — Manual Ops Day Checklist

수작업 전용. 에이전트/코드로 대체할 수 없는 Dashboard·콘솔 작업만 모았습니다.  
관련 문서: `custom-smtp-setup.md`, `deploy-checklist.md`, `storage-rls-plan.md`, `auth-email-smtp-policy.md`

**목표:** 하루 안에 SMTP 안정화 + 전체 승인 플로우 E2E까지.

---

## 0. 시작 전 (10분)

- [ ] Supabase Dashboard 로그인 (프로젝트 `akkihczynjmhwvomiukv`)
- [ ] Vercel 프로젝트 `dreamkids` 접속
- [ ] 네이버 클라우드 콘솔 접속
- [ ] SMTP 제공자 결정 (Resend / SendGrid / SES / 테스트용 Gmail 등)
- [ ] 테스트 메일 2개 준비 (Admin용, 학부모용) — 개인 메일과 분리 권장
- [ ] `main`에 PR #36 이후 커밋 반영·Vercel 배포 여부 확인
- [ ] **SQL 적용:** `supabase/migrations/20261003160000_consent_records.sql`  
  (회원가입 약관·개인정보 동의 기록 테이블) — PR #39 머지 후
- [ ] `/login` 회원가입·`/admin/signup`에서 필수 동의 없이 가입 불가한지 확인
- [ ] `/privacy`·`/terms` 문구를 법률 검토 후 최종본으로 교체했는지 확인 (템플릿 상태)

---

## 1. GitHub / 배포 확인 (15분)

- [ ] `main` 최신 + Vercel 배포 성공
- [ ] https://dreamkids.vercel.app/
- [ ] https://dreamkids.vercel.app/search
- [ ] https://dreamkids.vercel.app/admin/login

---

## 2. Vercel 환경변수 (20분)

`VITE_*`는 **저장 후 Redeploy** 해야 반영됩니다.

- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY` (publishable/anon — service_role 금지)
- [ ] `VITE_NAVER_MAP_CLIENT_ID` (Client ID only — Secret 금지)
- [ ] (권장) `VITE_SITE_URL` = `https://dreamkids.vercel.app`
- [ ] (선택) `VITE_SUPER_ADMIN_EMAIL` = `dreamkids617@gmail.com`
- [ ] Redeploy 실행
- [ ] 번들/로그에 service_role·SMTP password 없는지 확인

---

## 3. 네이버 지도 (20분)

- [ ] Dynamic Map / JavaScript 지도 API 활성화
- [ ] Web service URL 등록
  - `http://localhost:3000`
  - `http://127.0.0.1:3000`
  - `https://dreamkids.vercel.app`
  - (www 사용 시 www도)
- [ ] 프로덕션 `/search` → 지도 보기
  - `maps.js` 200
  - `/v3/auth` 200
  - 마커 → `/detail/:id`

---

## 4. Custom SMTP — Auth (40~60분)

상세: `docs/custom-smtp-setup.md` §A

- [ ] SMTP 제공자 계정/API 키 발급
- [ ] (권장) 발신 도메인 SPF / DKIM / DMARC
- [ ] Supabase → Authentication → Email → SMTP Settings → Custom SMTP ON
- [ ] host / port / user / password / sender 입력·저장
- [ ] 검증: 학부모 테스트 가입 → 인증 메일 수신
- [ ] 검증: 비밀번호 재설정 메일 수신
- [ ] 스팸함 확인

---

## 5. Custom SMTP — 문의 Edge Function (20분)

상세: `docs/custom-smtp-setup.md` §B  
Function: `app_ffc7da1b64_notify_inquiry`

- [ ] Secrets 설정: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_SECURE`(선택)
- [ ] 학부모로 문의 1건 전송
- [ ] Admin 알림 메일 수신 확인 (실패 시 Function 로그)

---

## 6. Confirm email 정책 (10분)

현재 관측값: **Confirm email ON** (`mailer_autoconfirm: false`)

- [ ] 베타 권장: SMTP 안정화 후 **ON 유지**
- [ ] 변경 필요 시에만 Authentication → Providers → Email 에서 토글·Save

---

## 7. 전체 승인 플로우 E2E (60~90분)

SMTP 정리 후 진행.

### A. 관리자

- [ ] `/admin/signup` 테스트 Admin 가입
- [ ] 메일 인증 완료
- [ ] Super 로그인 → Admin 승인
- [ ] 승인 Admin 로그인 → 기관 등록 (`pending`)
- [ ] Super 기관 승인
- [ ] 비로그인 `/search` 노출 확인
- [ ] `/detail/:id` 확인

### B. 학부모

- [ ] `/login` 가입 + 메일 인증
- [ ] 문의 등록
- [ ] (가능하면) 예약 등록
- [ ] Admin/Super 대시보드에 문의·예약 표시 확인
- [ ] 문의 알림 메일 수신 확인

### C. 회귀

- [ ] `/community` 목록·필터
- [ ] `/mypage` guest CTA / 학부모 프로필 저장
- [ ] Guest `/admin/dashboard` → 로그인 이동

---

## 8. 데이터·운영 검수 (20분)

- [ ] Admin 기관 탭 소유자 배정 UI 확인
- [ ] 공개 기관 실데이터 검수 (그린포레스트, 브라이트, 정현준)
  - 이름/주소/이미지/사업자·기관번호·담당자 (`보류 중`이면 수정)
- [ ] `deleted` 테스트 기관 유지 또는 정리 결정
- [ ] 테스트 Admin 계정 비활성/삭제 여부 결정

---

## 9. 보안 마무리 (15분)

- [ ] 채팅 등에 노출된 Super 비밀번호 변경
- [ ] service_role / SMTP password 는 `VITE_*`·git·프론트에 없음
- [ ] (여유 시) staging / production 프로젝트·키 분리

---

## 10. 미구현 기능 중 → 내일 수작업으로 할 항목

앱에 **아직 UI/코드가 없는 것** 중에서, Dashboard·콘솔·데이터 입력으로 내일 할 수 있는 것만 모았습니다.  
(코드 개발이 필요한 항목은 아래 「내일 수작업 아님」에 따로 적음.)

### 10-A. 이미지 — URL로 임시 채우기 (업로드 UI 없음)

앱은 아직 Supabase Storage 업로드가 없고, **이미지 URL 문자열**만 저장합니다.

- [ ] 공개 기관 3곳: Admin 기관 편집에서 대표/갤러리 이미지 URL이 비어 있거나 `보류`면 **외부 이미지 URL** 직접 입력·저장
- [ ] (선택) 기관 상세 「기관 소식」용 이미지 URL도 동일하게 URL만 준비

### 10-B. 기관 소식 — Table Editor로 임시 등록 (Admin 작성 UI 없음)

상세 페이지는 소식 **읽기만** 되고, Admin에 소식 작성 화면이 없습니다.

- [ ] Supabase → Table Editor → `institution_notices_*` (프로젝트 테이블명 확인)
- [ ] 승인된 기관 `institution_id`로 테스트 소식 1~2건 INSERT (제목/본문/`image_url`/게시 상태 등 기존 컬럼에 맞춤)
- [ ] 프로덕션 `/detail/:id` → 「기관 소식」 탭에 노출되는지 확인

### 10-C. Storage 버킷·정책 (Dashboard) — 업로드 코드 전에 기반만

업로드 UI는 코드 작업이지만, **버킷 생성·정책**은 Supabase Dashboard 수작업입니다.  
상세: `docs/storage-rls-plan.md` (여유 있을 때. SMTP·E2E 후순위 권장)

- [ ] Storage → New bucket: `notice_images_ffc7da1b64` (계획: public)
- [ ] path 규칙 숙지: `{institution_id}/...`
- [ ] `storage.objects` RLS/정책을 계획서대로 넣을지 **결정** (넣으면 SQL Editor 실행, 안 넣으면 버킷만 만들고 UI PR 때 같이)
- [ ] 업로드 UI 나오기 전에는 앱에서 이 버킷을 쓰지 않음 → **10-A URL 방식 유지**

### 10-D. 문의 알림·답변 운영 (답변 본문 UI 없음)

문의 「답변 글 작성」UI는 없음. 상태 변경 + 메일만 수작업/기존 기능으로 확인.

- [ ] §5 Edge Function SMTP 완료 후, 문의 1건 → Admin 알림 메일 수신
- [ ] Admin 문의 탭에서 「답변완료」상태 변경 확인 (답변 텍스트 필드는 없음 — 필요하면 당분간 메일/외부로 회신)

---

## 내일 수작업 아님 (코드로 나중에)

아래는 앱 기능 미구현이라 **Dashboard만으로 완성 불가**. 내일 일정에 넣지 않음.

- `/news` 전역 소식 피드·팔로우·푸시
- 커뮤니티 댓글
- 커뮤니티/기관 **파일 업로드 UI** (Storage UI)
- 리뷰 작성 CRUD
- 문의 답변 본문 입력 UI
- 학부모 예약 직접 취소
- 상세 페이지 공유 버튼 실제 동작
- Google 로그인 재활성화
- 결제 / 채팅 등 신규 도메인

---

## 하루 타임박스

| 구간 | 할 일 |
|------|--------|
| 오전 | §1~3 배포·Vercel·지도 |
| 오후 초 | §4~5 SMTP |
| 오후 | §6~7 정책·E2E |
| 마감 | §8~9 데이터·보안 → 여유 시 §10 (URL·소식·Storage 기반) |

---

## 에이전트가 수작업 전에 끝낸 것 (참고)

- PR #34 머지: soft-delete + 소유자 배정 + SMTP 설정 문서
- Live DB: soft-delete 동작 확인, `created_by` null 정리, E2E/TEST 기관 soft-delete
- 공개 `approved` 기관 3개만 유지
- 배포 체크리스트 스냅샷 / Storage RLS 계획 / `.env.example` 보강 (PR #36)

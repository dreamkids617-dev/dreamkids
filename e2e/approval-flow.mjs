/**
 * Full approval flow E2E (manual credentials via env).
 *
 * Required env:
 *   E2E_BASE_URL              default http://127.0.0.1:3000
 *   E2E_SUPER_ADMIN_EMAIL
 *   E2E_SUPER_ADMIN_PASSWORD
 *
 * Optional:
 *   E2E_ADMIN_PASSWORD        default DreamKidsAdmin!234
 *   E2E_PARENT_PASSWORD       default DreamKidsParent!234
 *   E2E_SKIP_SIGNUP=1         use existing E2E_ADMIN_EMAIL / E2E_PARENT_EMAIL instead of signup
 *   E2E_ADMIN_EMAIL
 *   E2E_PARENT_EMAIL
 *
 * App .env must have real VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (restart Vite after change).
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
const SUPER_EMAIL = process.env.E2E_SUPER_ADMIN_EMAIL || '';
const SUPER_PASS = process.env.E2E_SUPER_ADMIN_PASSWORD || '';
const SKIP_SIGNUP = process.env.E2E_SKIP_SIGNUP === '1';
const stamp = Date.now();
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || `e2e.admin.${stamp}@example.com`;
const ADMIN_PASS = process.env.E2E_ADMIN_PASSWORD || 'DreamKidsAdmin!234';
const PARENT_EMAIL = process.env.E2E_PARENT_EMAIL || `e2e.parent.${stamp}@example.com`;
const PARENT_PASS = process.env.E2E_PARENT_PASSWORD || 'DreamKidsParent!234';
const OUT = '/opt/cursor/artifacts/e2e-approval';
const INST_NAME = `E2E기관-${stamp}`;

fs.mkdirSync(OUT, { recursive: true });

const steps = [];
const log = (name, status, detail = '') => {
  steps.push({ name, status, detail, at: new Date().toISOString() });
  console.log(`[${status}] ${name}${detail ? ` — ${detail}` : ''}`);
};

async function shot(page, name) {
  const file = path.join(OUT, `${String(steps.length).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function fillByPlaceholder(page, placeholder, value) {
  await page.getByPlaceholder(placeholder).fill(value);
}

async function adminLogin(page, email, password) {
  await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });
  await fillByPlaceholder(page, '관리자 이메일을 입력하세요', email);
  await fillByPlaceholder(page, '비밀번호를 입력하세요', password);
  await page.getByRole('button', { name: '관리자 로그인' }).click();
  await page.waitForTimeout(2500);
}

async function parentLogin(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  // ensure login mode
  const switchToLogin = page.getByText('로그인', { exact: true });
  if (await page.getByPlaceholder('이름을 입력하세요').count()) {
    // currently signup mode — toggle
    await page.getByText('로그인', { exact: true }).last().click();
    await page.waitForTimeout(300);
  }
  await fillByPlaceholder(page, '이메일을 입력하세요', email);
  await fillByPlaceholder(page, '비밀번호를 입력하세요', password);
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await page.waitForTimeout(2500);
}

if (!SUPER_EMAIL || !SUPER_PASS) {
  console.error('Missing E2E_SUPER_ADMIN_EMAIL / E2E_SUPER_ADMIN_PASSWORD');
  process.exit(2);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const consoleErrors = [];
page.on('pageerror', (e) => consoleErrors.push(e.message));

try {
  // 0) Boot check
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const bootErr = consoleErrors.find((e) => /supabaseUrl is required/i.test(e));
  if (bootErr) throw new Error('App missing real VITE_SUPABASE_* — update .env and restart Vite');
  await shot(page, 'home');
  log('boot', 'PASS', BASE);

  // 1) Admin signup (optional)
  if (!SKIP_SIGNUP) {
    await page.goto(`${BASE}/admin/signup`, { waitUntil: 'networkidle' });
    await fillByPlaceholder(page, '이름을 입력하세요', `E2E관리자${stamp}`);
    await fillByPlaceholder(page, '이메일을 입력하세요', ADMIN_EMAIL);
    await fillByPlaceholder(page, '비밀번호 (6자 이상)', ADMIN_PASS);
    await fillByPlaceholder(page, '비밀번호를 다시 입력하세요', ADMIN_PASS);
    await page.getByRole('button', { name: '관리자 회원가입' }).click();
    await page.waitForTimeout(3000);
    await shot(page, 'admin-signup');
    const body = await page.locator('body').innerText();
    if (/이메일 인증|인증 메일|verify/i.test(body) && !/승인을 기다려/i.test(body)) {
      log('admin_signup', 'BLOCKED', 'Confirm email ON — complete verification manually then set E2E_SKIP_SIGNUP=1');
      throw new Error('Email verification required for admin signup');
    }
    if (!/완료|승인|로그인/i.test(body) && await page.getByPlaceholder('이름을 입력하세요').count()) {
      log('admin_signup', 'FAIL', body.replace(/\s+/g, ' ').slice(0, 180));
      throw new Error('Admin signup did not complete');
    }
    log('admin_signup', 'PASS', ADMIN_EMAIL);
  } else {
    log('admin_signup', 'SKIP', ADMIN_EMAIL);
  }

  // 2) Super admin login + approve admin
  await adminLogin(page, SUPER_EMAIL, SUPER_PASS);
  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await shot(page, 'super-dashboard');
  const dashText = await page.locator('body').innerText();
  if (/관리자 로그인|권한이 없습니다/i.test(dashText) && !/기관 관리|대시보드|문의/i.test(dashText)) {
    log('super_login', 'FAIL', dashText.replace(/\s+/g, ' ').slice(0, 160));
    throw new Error('Super admin login/dashboard failed');
  }
  log('super_login', 'PASS', SUPER_EMAIL);

  // open admins tab if present
  const adminsTab = page.getByText('관리자', { exact: false }).first();
  if (await adminsTab.count()) {
    await adminsTab.click();
    await page.waitForTimeout(800);
  }
  await shot(page, 'admins-tab');

  // approve matching admin row if Approve button near email
  const adminRow = page.locator('div', { hasText: ADMIN_EMAIL }).first();
  if (await adminRow.count()) {
    const approveBtn = adminRow.getByRole('button', { name: /승인/ }).first();
    if (await approveBtn.count()) {
      await approveBtn.click();
      await page.waitForTimeout(1500);
      log('approve_admin', 'PASS', ADMIN_EMAIL);
    } else {
      log('approve_admin', 'SKIP', 'already approved or button not found');
    }
  } else {
    log('approve_admin', 'FAIL', `admin row not found for ${ADMIN_EMAIL}`);
    throw new Error('Pending admin not visible to super admin');
  }
  await shot(page, 'admin-approved');

  // logout via navigating to login (no reliable logout control in all builds)
  await context.clearCookies();
  await page.evaluate(() => localStorage.clear());

  // 3) Approved admin login + register institution
  await adminLogin(page, ADMIN_EMAIL, ADMIN_PASS);
  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await shot(page, 'admin-dashboard');
  const adminDash = await page.locator('body').innerText();
  if (/승인이 필요|권한이 없습니다|관리자 로그인/i.test(adminDash) && !/기관/i.test(adminDash)) {
    log('admin_login', 'FAIL', adminDash.replace(/\s+/g, ' ').slice(0, 160));
    throw new Error('Approved admin cannot access dashboard');
  }
  log('admin_login', 'PASS', ADMIN_EMAIL);

  // institutions tab + new form
  const instTab = page.getByText('기관', { exact: false }).first();
  if (await instTab.count()) await instTab.click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /새 기관 등록/ }).click();
  await page.waitForTimeout(400);
  await page.getByPlaceholder('기관명 *').fill(INST_NAME);
  await page.getByPlaceholder('지역 (예: 서울 강남구) *').fill('서울 강남구');
  const submit = page.getByRole('button', { name: /기관 등록/ });
  await submit.click();
  await page.waitForTimeout(2500);
  await shot(page, 'institution-created');
  const instListText = await page.locator('body').innerText();
  if (!instListText.includes(INST_NAME)) {
    log('institution_create', 'FAIL', 'created institution not listed');
    throw new Error('Institution create failed');
  }
  log('institution_create', 'PASS', INST_NAME);

  await context.clearCookies();
  await page.evaluate(() => localStorage.clear());

  // 4) Super approves institution
  await adminLogin(page, SUPER_EMAIL, SUPER_PASS);
  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  if (await page.getByText('기관', { exact: false }).first().count()) {
    await page.getByText('기관', { exact: false }).first().click();
  }
  await page.waitForTimeout(800);
  const instCard = page.locator('div', { hasText: INST_NAME }).first();
  await instCard.getByRole('button', { name: '승인' }).click();
  await page.waitForTimeout(1500);
  await shot(page, 'institution-approved');
  log('approve_institution', 'PASS', INST_NAME);

  // 5) Public search shows institution
  await context.clearCookies();
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/search`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await shot(page, 'search-public');
  const searchText = await page.locator('body').innerText();
  if (!searchText.includes(INST_NAME)) {
    log('public_list', 'FAIL', 'approved institution not visible on /search');
    throw new Error('Public listing missing approved institution');
  }
  log('public_list', 'PASS', INST_NAME);

  // open detail
  await page.getByText(INST_NAME, { exact: false }).first().click();
  await page.waitForTimeout(1500);
  await shot(page, 'detail');
  log('detail', 'PASS', page.url());

  // 6) Parent signup/login + inquiry (best effort)
  if (!SKIP_SIGNUP) {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    // switch to signup if needed
    if (!(await page.getByPlaceholder('이름을 입력하세요').count())) {
      await page.getByText('회원가입', { exact: true }).last().click();
      await page.waitForTimeout(300);
    }
    await fillByPlaceholder(page, '이름을 입력하세요', `E2E학부모${stamp}`);
    await fillByPlaceholder(page, '이메일을 입력하세요', PARENT_EMAIL);
    await fillByPlaceholder(page, '비밀번호를 입력하세요', PARENT_PASS);
    await page.getByRole('button', { name: '회원가입' }).click();
    await page.waitForTimeout(3000);
    await shot(page, 'parent-signup');
    const pbody = await page.locator('body').innerText();
    if (/이메일 인증|verify-email|인증 메일/i.test(pbody) || page.url().includes('verify-email')) {
      log('parent_signup', 'BLOCKED', 'Confirm email ON — inquiry/reservation skipped');
    } else {
      log('parent_signup', 'PASS', PARENT_EMAIL);
      await page.goto(`${BASE}/search`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await page.getByText(INST_NAME, { exact: false }).first().click();
      await page.waitForTimeout(1000);
      // inquiry UI varies — click common labels
      const inquiryBtn = page.getByRole('button', { name: /문의/ }).first();
      if (await inquiryBtn.count()) {
        await inquiryBtn.click();
        await page.waitForTimeout(500);
        // fill any visible textboxes
        const boxes = page.locator('textarea, input[type="text"]');
        const n = await boxes.count();
        for (let i = 0; i < Math.min(n, 3); i++) {
          const ph = await boxes.nth(i).getAttribute('placeholder');
          if (ph && /이름|연락|내용|문의/.test(ph)) {
            await boxes.nth(i).fill(ph.includes('연락') ? '01012345678' : `E2E ${ph}`);
          }
        }
        const send = page.getByRole('button', { name: /보내기|등록|문의하기|제출/ }).first();
        if (await send.count()) {
          await send.click();
          await page.waitForTimeout(2000);
          log('inquiry', 'PASS');
        } else {
          log('inquiry', 'SKIP', 'submit button not found');
        }
      } else {
        log('inquiry', 'SKIP', 'inquiry button not found');
      }
      await shot(page, 'inquiry');
    }
  } else {
    log('parent_signup', 'SKIP');
  }

  log('flow', 'PASS', 'core approval path completed');
} catch (e) {
  log('flow', 'FAIL', String(e).slice(0, 300));
  try { await shot(page, 'failure'); } catch {}
} finally {
  const summary = {
    base: BASE,
    adminEmail: ADMIN_EMAIL,
    parentEmail: PARENT_EMAIL,
    institution: INST_NAME,
    steps,
    consoleErrors: consoleErrors.slice(0, 20),
  };
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));
  await browser.close();
  const failed = steps.some((s) => s.status === 'FAIL');
  const blocked = steps.some((s) => s.status === 'BLOCKED');
  process.exit(failed ? 1 : blocked ? 3 : 0);
}

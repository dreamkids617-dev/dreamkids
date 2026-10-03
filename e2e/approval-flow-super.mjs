import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
const SUPER_EMAIL = process.env.E2E_SUPER_ADMIN_EMAIL;
const SUPER_PASS = process.env.E2E_SUPER_ADMIN_PASSWORD;
const OUT = '/opt/cursor/artifacts/e2e-approval';
const stamp = Date.now();
const INST_NAME = `E2E승인기관-${stamp}`;
fs.mkdirSync(OUT, { recursive: true });
const steps = [];
const log = (name, status, detail = '') => {
  steps.push({ name, status, detail, at: new Date().toISOString() });
  console.log(`[${status}] ${name}${detail ? ` — ${detail}` : ''}`);
};
async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${String(steps.length).padStart(2, '0')}-${name}.png`), fullPage: true });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await shot(page, 'home');
  log('boot', 'PASS', BASE);

  await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('관리자 이메일을 입력하세요').fill(SUPER_EMAIL);
  await page.getByPlaceholder('비밀번호를 입력하세요').fill(SUPER_PASS);
  await page.getByRole('button', { name: '관리자 로그인' }).click();
  await page.waitForTimeout(3000);
  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await shot(page, 'super-dashboard');
  if (!(await page.locator('body').innerText()).includes('기관')) throw new Error('dashboard fail');
  log('super_login', 'PASS', SUPER_EMAIL);

  // institutions tab
  await page.getByText('기관', { exact: false }).first().click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: /새 기관 등록/ }).click();
  await page.waitForTimeout(400);
  await page.getByPlaceholder('기관명 *').fill(INST_NAME);
  await page.getByPlaceholder('지역 (예: 서울 강남구) *').fill('서울 강남구');
  await page.getByPlaceholder('사업자 등록 번호 *').fill('123-45-67890');
  await page.getByPlaceholder('기관 고유 번호 *').fill(`INST-${stamp}`);
  await page.getByPlaceholder('담당자 이름 및 연락처 *').fill('E2E담당자 010-0000-0000');
  await page.getByRole('button', { name: /^기관 등록$/ }).click();
  await page.waitForTimeout(2500);
  await shot(page, 'after-create-click');

  // reload institutions list
  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.getByText('기관', { exact: false }).first().click();
  await page.waitForTimeout(1000);
  await shot(page, 'institution-list');
  let body = await page.locator('body').innerText();
  if (!body.includes(INST_NAME)) {
    // also check via API-less: maybe truncated; search page text includes partial
    log('institution_create', 'FAIL', body.replace(/\s+/g,' ').slice(0, 300));
    throw new Error('created institution not in admin list');
  }
  log('institution_create', 'PASS', INST_NAME);

  const card = page.locator('div', { hasText: INST_NAME }).first();
  if (await card.getByRole('button', { name: '승인' }).count()) {
    await card.getByRole('button', { name: '승인' }).click();
    await page.waitForTimeout(1500);
    log('approve_institution', 'PASS');
  } else {
    log('approve_institution', 'SKIP', 'already approved as super create');
  }
  await shot(page, 'institution-status');

  await page.goto(`${BASE}/search`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await shot(page, 'search-public');
  body = await page.locator('body').innerText();
  if (!body.includes(INST_NAME)) throw new Error('not visible on search');
  log('public_list', 'PASS', INST_NAME);

  await page.getByText(INST_NAME, { exact: false }).first().click();
  await page.waitForTimeout(1500);
  await shot(page, 'detail');
  log('detail', 'PASS', page.url());

  log('admin_signup_path', 'BLOCKED', 'Confirm email ON — new admin/parent needs email verify');
  log('inquiry_reservation', 'BLOCKED', 'needs verified parent account');
  log('flow', 'PASS');
} catch (e) {
  log('flow', 'FAIL', String(e).slice(0, 300));
  try { await shot(page, 'failure'); } catch {}
} finally {
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ institution: INST_NAME, steps }, null, 2));
  console.log(JSON.stringify({ institution: INST_NAME, steps }, null, 2));
  await browser.close();
  process.exit(steps.some((s) => s.status === 'FAIL') ? 1 : 0);
}

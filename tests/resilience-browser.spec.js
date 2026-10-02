const { test, expect } = require('@playwright/test');

async function stubSupabase(page) {
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: 'window.supabase={createClient:function(){return null}};'
  }));
}

async function exposeShell(page) {
  await page.evaluate(() => {
    document.body.classList.remove('authPending');
    const launch = document.getElementById('launchScreen');
    const auth = document.getElementById('authGate');
    const header = document.getElementById('appHeader');
    const main = document.querySelector('main');
    const bottom = document.querySelector('.bottom');
    if (launch) launch.style.display = 'none';
    if (auth) auth.style.display = 'none';
    if (header) header.style.display = 'block';
    if (main) main.style.display = 'block';
    if (bottom) bottom.style.display = 'grid';
  });
}

async function openShell(page) {
  await stubSupabase(page);
  await page.goto('/index.html');
  await exposeShell(page);
}

test('iPhone WebKit can open and navigate the clinical shell', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-iphone');
  await openShell(page);
  await expect(page.locator('#today')).toBeVisible();
  await page.evaluate(() => window.show('changes'));
  await expect(page.locator('#changes')).toBeVisible();
  await page.evaluate(() => window.show('breaks'));
  await expect(page.locator('#breaks')).toBeVisible();
  await expect(page.locator('#breakDatePick')).toHaveCount(1);
});

test('low-end mobile startup remains usable under CPU and network pressure', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'low-end-chromium');
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await stubSupabase(page);
  await page.route('http://127.0.0.1:4173/**', async route => {
    const type = route.request().resourceType();
    if (type === 'script' || type === 'stylesheet') await new Promise(resolve => setTimeout(resolve, 90));
    await route.continue();
  });
  const started = Date.now();
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await exposeShell(page);
  await expect(page.locator('#today')).toBeVisible();
  expect(Date.now() - started).toBeLessThan(8000);
  await session.detach();
});

test('two open pages elect exactly one realtime leader', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'low-end-chromium');
  const context = await browser.newContext();
  const pageA = await context.newPage();
  const pageB = await context.newPage();
  await Promise.all([stubSupabase(pageA), stubSupabase(pageB)]);
  await Promise.all([pageA.goto('/index.html'), pageB.goto('/index.html')]);
  await pageA.waitForTimeout(1200);
  const states = await Promise.all([
    pageA.evaluate(() => Boolean(window.AnaestheticRuntime && window.AnaestheticRuntime.coordinator.isLeader())),
    pageB.evaluate(() => Boolean(window.AnaestheticRuntime && window.AnaestheticRuntime.coordinator.isLeader()))
  ]);
  expect(states.filter(Boolean)).toHaveLength(1);
  await context.close();
});

test('ambiguous network retries reuse the same roster operation id', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'low-end-chromium');
  await openShell(page);
  const result = await page.evaluate(async () => {
    const ids = [];
    window.ensureFreshBeforeMutation = async () => ({ ok: true, revision: 17 });
    window.loadSharedData = async () => true;
    let first = true;
    try {
      await window.runRosterMutation('absence:add:2026-10-04', async id => {
        ids.push(id);
        if (first) {
          first = false;
          const error = new Error('timeout');
          error.code = 'TIMEOUT';
          throw error;
        }
        return { data: { ok: true }, error: null };
      }, () => false);
    } catch (error) {}
    const second = await window.runRosterMutation('absence:add:2026-10-04', async id => {
      ids.push(id);
      return { data: { ok: true }, error: null };
    }, () => false);
    return { ids, secondError: Boolean(second && second.error) };
  });
  expect(result.ids).toHaveLength(2);
  expect(result.ids[0]).toBe(result.ids[1]);
  expect(result.secondError).toBe(false);
});

test('active-session revocation clears private roster state immediately', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'low-end-chromium');
  await openShell(page);
  const result = await page.evaluate(async () => {
    localStorage.setItem('anaes_offline_snapshot', '{"private":true}');
    localStorage.setItem('anaes_cached_profile', '{"active":true}');
    window.currentUser = { id: 'user-1', email: 'nurse@example.test' };
    window.currentUserProfile = { active: true, user_role: 'member', email: 'nurse@example.test' };
    window.supa = {
      rpc: async name => name === 'my_access_status_v49'
        ? { data: { active: false, access_epoch: 22 }, error: null }
        : { data: null, error: null },
      auth: { signOut: async () => ({ error: null }) },
      removeChannel: async () => {}
    };
    window.setAuthMode = () => {};
    window.showAuth = () => {};
    window.changesChannel = null;
    window.accessLossInFlight = false;
    const status = await window.checkCurrentAccessStatus(22);
    return {
      active: status.active,
      currentUser: window.currentUser,
      snapshot: localStorage.getItem('anaes_offline_snapshot'),
      cachedProfile: localStorage.getItem('anaes_cached_profile')
    };
  });
  expect(result.active).toBe(false);
  expect(result.currentUser).toBeNull();
  expect(result.snapshot).toBeNull();
  expect(result.cachedProfile).toBeNull();
});

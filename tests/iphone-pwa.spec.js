const { test, expect } = require('@playwright/test');

async function openShell(page) {
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: 'window.supabase={createClient:function(){return null}};'
  }));
  await page.goto('/index.html');
  await page.evaluate(() => {
    document.body.classList.remove('authPending');
    const launch = document.getElementById('launchScreen');
    const auth = document.getElementById('authGate');
    const header = document.getElementById('appHeader');
    const main = document.querySelector('main');
    const bottom = document.querySelector('.bottom');
    if (launch) launch.style.display = 'none';
    if (auth) auth.classList.add('hidden');
    if (header) header.style.display = 'block';
    if (main) main.style.display = 'block';
    if (bottom) bottom.style.display = 'grid';
  });
  await expect(page.locator('link[data-pwa-safe-area]')).toHaveCount(1);
  await page.waitForFunction(() => Boolean(document.querySelector('link[data-pwa-safe-area]')?.sheet));
}

function setSafeArea(page, values) {
  return page.evaluate(({ top, right, bottom, left }) => {
    const root = document.documentElement.style;
    root.setProperty('--app-safe-top', `${top}px`);
    root.setProperty('--app-safe-right', `${right}px`);
    root.setProperty('--app-safe-bottom', `${bottom}px`);
    root.setProperty('--app-safe-left', `${left}px`);
  }, values);
}

test('iPhone standalone overlays stay below the status bar and Dynamic Island', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openShell(page);
  await setSafeArea(page, { top: 59, right: 0, bottom: 34, left: 0 });

  await page.evaluate(() => document.getElementById('accountSheet').showModal());
  const accountGeometry = await page.locator('#accountSheet').evaluate(el => {
    const rect = el.getBoundingClientRect();
    const done = el.querySelector('#closeAccountSheet').getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, doneTop: done.top };
  });
  expect(accountGeometry.top).toBeGreaterThanOrEqual(59);
  expect(accountGeometry.doneTop).toBeGreaterThanOrEqual(59);
  expect(accountGeometry.bottom).toBeLessThanOrEqual(844);
  await page.evaluate(() => document.getElementById('accountSheet').close());

  await page.evaluate(() => document.getElementById('onboardingDialog').showModal());
  const onboardingGeometry = await page.locator('#onboardingDialog').evaluate(el => {
    const rect = el.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom };
  });
  expect(onboardingGeometry.top).toBeGreaterThanOrEqual(59);
  expect(onboardingGeometry.bottom).toBeLessThanOrEqual(844 - 34);
  await page.evaluate(() => document.getElementById('onboardingDialog').close());
});

test('iPhone landscape keeps content and bottom navigation outside notch gutters', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await openShell(page);
  await setSafeArea(page, { top: 0, right: 44, bottom: 21, left: 44 });

  const geometry = await page.evaluate(() => {
    const view = document.querySelector('main>.view:not(.hidden)') || document.querySelector('main>.view');
    const dock = document.querySelector('.bottom');
    const buttons = Array.from(dock.querySelectorAll('button')).filter(button => getComputedStyle(button).display !== 'none');
    const viewRect = view.getBoundingClientRect();
    const first = buttons[0].getBoundingClientRect();
    const last = buttons[buttons.length - 1].getBoundingClientRect();
    const dockStyle = getComputedStyle(dock);
    return {
      viewLeft: viewRect.left,
      viewRight: viewRect.right,
      firstLeft: first.left,
      lastRight: last.right,
      dockLeft: dock.getBoundingClientRect().left,
      dockRight: dock.getBoundingClientRect().right
    };
  });

  expect(geometry.viewLeft).toBeGreaterThanOrEqual(44);
  expect(geometry.viewRight).toBeLessThanOrEqual(844 - 44);
  expect(geometry.firstLeft).toBeGreaterThanOrEqual(44);
  expect(geometry.lastRight).toBeLessThanOrEqual(844 - 44);
  expect(geometry.dockLeft).toBeGreaterThanOrEqual(44);
  expect(geometry.dockRight).toBeLessThanOrEqual(844 - 44);
});

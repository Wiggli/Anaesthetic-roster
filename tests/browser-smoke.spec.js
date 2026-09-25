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
    if (auth) auth.style.display = 'none';
    if (header) header.style.display = 'block';
    if (main) main.style.display = 'block';
    if (bottom) bottom.style.display = 'grid';
  });
}

test('mobile shell keeps core views navigable', async ({ page }) => {
  await openShell(page);
  await expect(page.locator('#today')).toBeVisible();
  await page.evaluate(() => window.show && window.show('breaks'));
  await expect(page.locator('#breaks')).toBeVisible();
  await expect(page.locator('#today')).toHaveClass(/hidden/);
  await page.evaluate(() => window.show && window.show('chat'));
  await expect(page.locator('#chat')).toBeVisible();
  await expect(page.locator('#chatMessageReplyBtn')).toHaveCount(1);
  await expect(page.locator('#chatMentionMenu')).toHaveCount(1);
});

test('signed-in React tabs retain badges and navigate with touch and keyboard', async ({ page }) => {
  await openShell(page);
  await expect(page.locator('[data-react-navigation="ready"]')).toHaveCount(1);
  const changes = page.locator('.bottom button[data-v="changes"]');
  await page.evaluate(() => {
    const badge = document.getElementById('changesTaskBadge');
    badge.textContent = '3';
    badge.classList.remove('hidden');
  });
  await changes.focus();
  await page.keyboard.press('Enter');
  await expect(changes).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('#changesTaskBadge')).toHaveText('3');
  await expect(page.locator('#changesTaskBadge')).toBeVisible();
  await page.locator('.bottom button[data-v="breaks"]').click();
  await expect(page.locator('#breaks')).toBeVisible();
  await expect(page.locator('#changesTaskBadge')).toHaveText('3');
  await page.locator('.bottom button[data-v="breaks"]').evaluate(button => {
    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', pointerId: 4, clientX: 110, clientY: 30 }));
    button.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', pointerId: 4, clientX: 190, clientY: 32 }));
  });
  await expect(changes).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('#changes')).toBeVisible();
});

test('navigation stays usable if the lazy React chunk fails', async ({ page }) => {
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({
    status: 200, contentType: 'application/javascript', body: 'window.supabase={createClient:function(){return null}};'
  }));
  await page.route('**/assets/navigation-*.js', route => route.abort());
  await page.goto('/index.html');
  await page.evaluate(() => {
    document.body.classList.remove('authPending');
    document.getElementById('launchScreen').style.display = 'none';
    document.getElementById('authGate').style.display = 'none';
    document.querySelector('.bottom').style.display = 'grid';
  });
  await page.locator('.bottom button[data-v="breaks"]').click();
  await expect(page.locator('#breaks')).toBeVisible();
  await expect(page.locator('[data-react-navigation="ready"]')).toHaveCount(0);
});

test('mobile header controls stay circular and dark mode stays readable', async ({ page }) => {
  await openShell(page);
  const account = page.locator('#accountBtn');
  const box = await account.boundingBox();
  expect(box).not.toBeNull();
  expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(2);
  expect(box.width).toBeGreaterThanOrEqual(40);

  await page.evaluate(() => {
    document.body.classList.add('dark');
    document.documentElement.classList.add('dark');
  });
  const background = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
  expect(background).not.toBe('rgba(0, 0, 0, 0)');
  await expect(page.locator('.bottom')).toBeVisible();
});


test('cold launch and onboarding keep the cinematic hierarchy without hiding Chat guidance', async ({ page }) => {
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: 'window.supabase={createClient:function(){return null}};'
  }));
  await page.goto('/index.html');
  await expect(page.locator('#launchScreen')).toBeVisible();
  await expect(page.locator('.launchMark')).toHaveCount(1);
  await expect(page.locator('.launchAtmosphere i')).toHaveCount(3);

  await page.evaluate(() => {
    document.body.classList.remove('authPending');
    const launch = document.getElementById('launchScreen');
    const auth = document.getElementById('authGate');
    if (launch) launch.style.display = 'none';
    if (auth) auth.style.display = 'none';
    window.onboardingChatIntro = true;
    window.onboardingStep = 0;
    window.onboardingDirection = 1;
    window.renderOnboarding();
    const dialog = document.getElementById('onboardingDialog');
    if (dialog && !dialog.open) dialog.showModal();
  });

  await expect(page.locator('#onboardingDialog')).toBeVisible();
  await expect(page.locator('#onboardingTitle')).toContainText('Coordinate without leaving the roster');
  await expect(page.locator('#onboardingContent')).toContainText('@mentions');
  await expect(page.locator('#onboardingContent')).toContainText('14 days');
  await expect(page.locator('#onboardingStepLabel')).toContainText('Chat');
});

test('cinematic surfaces respect reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: 'window.supabase={createClient:function(){return null}};'
  }));
  await page.goto('/index.html');
  const launchAnimation = await page.locator('.launchMark').evaluate(el => getComputedStyle(el).animationName);
  expect(launchAnimation).toBe('none');
});


test('premium PWA launch uses the installed app icon and install guidance stays self-contained', async ({ page }) => {
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: 'window.supabase={createClient:function(){return null}};'
  }));
  await page.goto('/index.html');
  const launchIcon = page.locator('.launchMark img');
  await expect(launchIcon).toHaveCount(1);
  await expect(launchIcon).toHaveAttribute('src', /icon-192\.png\?v=37\.36/);
  const htmlBackground = await page.locator('html').evaluate(el => getComputedStyle(el).backgroundColor);
  expect(htmlBackground).not.toBe('rgba(0, 0, 0, 0)');
  const installCopy = await page.evaluate(() => window.installGuideSteps ? window.installGuideSteps() : '');
  expect(installCopy).toContain('No App Store or Play Store account is required');
});

test('installed-app badge helper is best-effort and safe on unsupported browsers', async ({ page }) => {
  await openShell(page);
  const result = await page.evaluate(() => {
    if (!window.syncAppBadge) return 'missing';
    window.syncAppBadge();
    return 'ok';
  });
  expect(result).toBe('ok');
});

test('built React launch region preserves the first-paint text and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: 'window.supabase={createClient:function(){return null}};'
  }));
  await page.goto('/index.html');
  const motto = page.locator('#reactLaunchMotto .launchMotto');
  await expect(motto).toHaveCount(1);
  await expect(motto).toContainText('Fair by design. Flexible under pressure. Safe in practice.');
  await expect(motto).toHaveCSS('opacity', '1');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', 'manifest.webmanifest?v=37.36');
});

test('launch message remains readable when the optional React module cannot load', async ({ page }) => {
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: 'window.supabase={createClient:function(){return null}};'
  }));
  await page.route('**/assets/index-*.js', route => route.abort());
  await page.goto('/index.html');
  const motto = page.locator('#reactLaunchMotto .launchMotto');
  await expect(motto).toBeVisible();
  await expect(motto).toHaveCSS('opacity', '1');
});

test('frontend changelog describes shipped navigation and scoped Tailwind', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    window.renderReleaseNotes();
    document.getElementById('releaseNotes').showModal();
  });
  const dialog = page.locator('#releaseNotes');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.releaseEntry')).toHaveCount(1);
  await expect(dialog.locator('.releaseHistory')).toContainText('Tailwind CSS v4');
  await expect(dialog.locator('.releaseHistory')).toContainText('A short horizontal touch swipe across the tab bar');
  const sizes = await dialog.locator('.releaseHistory').evaluate(el => ({ width: el.clientWidth, scrollWidth: el.scrollWidth }));
  expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.width + 1);
});

test('worker keeps private backend traffic out of caches and navigates offline', async ({ page, context }) => {
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: 'window.supabase={createClient:function(){return null}};'
  }));
  await page.route('https://voaygfleqceqacvqixxp.supabase.co/**', route => route.fulfill({
    status: 200,
    headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
    body: '{"private":"browser-smoke"}'
  }));
  await page.goto('/index.html');
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('./service-worker.js', { updateViaCache: 'none' });
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.evaluate(() => fetch('https://voaygfleqceqacvqixxp.supabase.co/auth/v1/user?smoke=1'));
  const cachedUrls = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async name =>
    (await caches.open(name)).keys()))).flat().map(request => request.url));
  expect(cachedUrls.some(url => url.includes('supabase.co'))).toBe(false);
  expect(cachedUrls.some(url => url.includes('/assets/index-') && url.endsWith('.js'))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#launchScreen')).toBeVisible();
  await context.setOffline(false);
});

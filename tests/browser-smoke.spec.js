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

async function realTouchSwipe(page, from, to, midpoint) {
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y, id: 1 }] });
  for (let step = 1; step <= 5; step++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
      x: from.x + (to.x - from.x) * step / 5, y: from.y + (to.y - from.y) * step / 5, id: 1
    }] });
    if (step === 3 && midpoint) { await page.waitForTimeout(30); await midpoint(); }
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
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

test('signed-in React tabs retain badges and keyboard navigation', async ({ page }) => {
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
});

test('a new swipe interrupts an unfinished settle instead of being ignored', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'real phone gesture regression');
  await openShell(page);
  await expect(page.locator('[data-react-navigation="ready"]')).toHaveCount(1);
  await page.evaluate(() => window.show('changes'));
  const safe = await page.evaluate(() => {
    const blocked = 'button,a,input,select,textarea,[role="button"],[contenteditable="true"],[tabindex],.nightStatusRow,.changesWorkflowTabs,.dateNav';
    for (let y = 220; y < Math.min(window.innerHeight - 120, 680); y += 14) {
      for (const x of [105, 200, 290]) {
        const target = document.elementFromPoint(x, y);
        if (target?.closest('#changes') && !target.closest(blocked)) return { x, y };
      }
    }
    return null;
  });
  expect(safe).not.toBeNull();

  await realTouchSwipe(page, safe, { x: safe.x + 20, y: safe.y + 3 });
  await expect(page.locator('main')).toHaveClass(/viewSwipeSettling/);

  await realTouchSwipe(page, safe, { x: Math.min(340, safe.x + 185), y: safe.y + 10 });
  await expect(page.locator('#today')).toBeVisible();
  await expect(page.locator('main')).not.toHaveClass(/viewSwipeSettling/);

  await page.evaluate(() => window.show('changes'));
  await realTouchSwipe(page, safe, { x: Math.min(340, safe.x + 185), y: safe.y + 10 });
  await expect(page.locator('main')).toHaveClass(/viewSwipeSettling/);
  await page.evaluate(() => window.show('chat'));
  await expect(page.locator('#chat')).toBeVisible();
  await expect(page.locator('main')).not.toHaveClass(/viewSwipeStage/);
  await page.waitForTimeout(220);
  await expect(page.locator('#chat')).toBeVisible();
});

test('continuous tab drag and direction-locked page swipes work across Night and Chat', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'real phone gesture regression');
  await openShell(page);
  await expect(page.locator('[data-react-navigation="ready"]')).toHaveCount(1);
  await page.evaluate(() => window.show('today'));

  const safeStart = { x: 290, y: 400 };
  const initialIndicator = await page.locator('.tabSlidingIndicator').boundingBox();
  const initialPage = await page.locator('#today').boundingBox();
  let draggedIndicator;
  let draggedCurrent;
  let draggedPreview;
  await realTouchSwipe(page, safeStart, { x: 105, y: 448 }, async () => {
    draggedIndicator = await page.locator('.tabSlidingIndicator').boundingBox();
    draggedCurrent = await page.locator('#today').boundingBox();
    draggedPreview = await page.locator('#changes').boundingBox();
    await expect(page.locator('main')).toHaveClass(/viewSwipeStage/);
  });
  expect(draggedCurrent.x).toBeLessThan(initialPage.x - 45);
  expect(draggedPreview.x).toBeGreaterThan(initialPage.x + 70);
  expect(draggedIndicator.x).toBeGreaterThan(initialIndicator.x + 10);
  await expect(page.locator('#changes')).toBeVisible();
  await expect(page.locator('main')).not.toHaveClass(/viewSwipeStage/);

  const settledChanges = await page.locator('.tabSlidingIndicator').boundingBox();
  await realTouchSwipe(page, { x: 270, y: 400 }, { x: 242, y: 407 });
  await expect(page.locator('#changes')).toBeVisible();
  await expect.poll(async () => Math.abs((await page.locator('.tabSlidingIndicator').boundingBox()).x - settledChanges.x))
    .toBeLessThan(3);

  await realTouchSwipe(page, { x: 290, y: 400 }, { x: 274, y: 220 });
  await expect(page.locator('#changes')).toBeVisible();

  const workflowButton = page.locator('#changes [data-changes-step]').first();
  await workflowButton.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -180));
  const workflow = await workflowButton.boundingBox();
  const workflowPoint = { x: workflow.x + workflow.width / 2, y: workflow.y + workflow.height / 2 };
  expect(await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('[data-changes-step]'), workflowPoint)).toBe(true);
  await realTouchSwipe(page, workflowPoint, { x: workflowPoint.x + 150, y: workflowPoint.y });
  await expect(page.locator('#changes')).toBeVisible();

  await page.evaluate(() => {
    window.scrollTo(0, 0);
    window.show('chat');
  });
  await expect(page.locator('#chat')).toBeVisible();
  const chatSwipeStart = await page.evaluate(() => {
    const blocked = 'button,a,input,select,textarea,[role="button"],[contenteditable="true"],[tabindex],.chatComposer,.chatConversationList';
    for (let y = 80; y < Math.min(window.innerHeight - 120, 520); y += 14) {
      for (const x of [80, 105, 135, 165]) {
        const target = document.elementFromPoint(x, y);
        if (target?.closest('#chat') && !target.closest(blocked)) return { x, y };
      }
    }
    return null;
  });
  expect(chatSwipeStart).not.toBeNull();
  const viewportWidth = page.viewportSize()?.width || 390;
  const chatSwipeEndX = Math.min(viewportWidth - 32, chatSwipeStart.x + 190);
  expect(chatSwipeEndX - chatSwipeStart.x).toBeGreaterThan(52);
  await realTouchSwipe(page, chatSwipeStart, { x: chatSwipeEndX, y: chatSwipeStart.y + 18 }, async () => {
    await expect(page.locator('main')).toHaveClass(/viewSwipeStage/);
    await expect(page.locator('#breaks')).toHaveClass(/swipePreview/);
  });
  await expect(page.locator('#breaks')).toBeVisible();

  await page.evaluate(() => window.show('today'));
  await expect(page.locator('main')).not.toHaveClass(/viewSwipeStage/);
  const bar = await page.locator('.bottom').boundingBox();
  const nightTab = await page.locator('.bottom button[data-v="today"]').boundingBox();
  const chatTab = await page.locator('.bottom button[data-v="chat"]').boundingBox();
  await expect.poll(async () => Math.abs((await page.locator('.tabSlidingIndicator').boundingBox()).x - nightTab.x))
    .toBeLessThan(4);
  const barStart = { x: nightTab.x + nightTab.width / 2, y: bar.y + bar.height / 2 };
  const barEnd = { x: chatTab.x + chatTab.width / 2, y: bar.y + bar.height / 2 };
  let longDragIndicator;
  await realTouchSwipe(page, barStart, barEnd, async () => {
    longDragIndicator = await page.locator('.tabSlidingIndicator').boundingBox();
  });
  expect(longDragIndicator.x).toBeGreaterThan(nightTab.x + nightTab.width);
  await expect(page.locator('#chat')).toBeVisible();
  await expect.poll(async () => Math.abs((await page.locator('.tabSlidingIndicator').boundingBox()).x - chatTab.x))
    .toBeLessThan(4);

  const stableBackground = await page.locator('.bottom').evaluate(el => getComputedStyle(el).backgroundColor);
  expect(stableBackground).toMatch(/rgba?\(/);
  const alpha = Number((stableBackground.match(/,\s*([0-9.]+)\)$/) || [])[1] || 1);
  expect(alpha).toBeGreaterThanOrEqual(0.9);

  const barAfterChat = await page.locator('.bottom').boundingBox();
  await realTouchSwipe(page,
    { x: chatTab.x + chatTab.width / 2, y: barAfterChat.y + barAfterChat.height / 2 },
    { x: nightTab.x + nightTab.width / 2, y: barAfterChat.y + barAfterChat.height / 2 });
  await expect(page.locator('#today')).toBeVisible();

  await page.evaluate(() => window.show('changes'));
  await page.evaluate(() => window.openScreenInfo('changes'));
  await expect(page.locator('#screenInfoSheet')).toBeVisible();
  await realTouchSwipe(page, { x: 290, y: 350 }, { x: 100, y: 350 });
  await expect(page.locator('#changes')).toBeVisible();
});

test('reduced motion keeps the selected lens aligned without a spring', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openShell(page);
  await expect(page.locator('.tabSlidingIndicator')).toBeVisible();
  await page.locator('.bottom button[data-v="breaks"]').click();
  const distance = () => page.evaluate(() => {
    const indicator = document.querySelector('.tabSlidingIndicator').getBoundingClientRect();
    const tab = document.querySelector('.bottom button[data-v="breaks"]').getBoundingClientRect();
    return Math.abs(indicator.left - tab.left);
  });
  await page.waitForTimeout(80);
  expect(await distance()).toBeLessThan(3);
  await expect(page.locator('#breaks')).toBeVisible();
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

test('screen help opens as lazy React content and remains readable in dark and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openShell(page);
  await page.evaluate(() => window.openScreenInfo('breaks'));
  const dialog = page.locator('#screenInfoSheet');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.infoSheetItem')).toHaveCount(3);
  await expect(dialog.locator('.tw\\:min-w-0')).toHaveCount(3);
  await expect(dialog).toContainText('Breaks cannot be finalised until every required staffing decision is complete.');
  await expect(dialog.locator('.infoSheetItem').first()).toHaveCSS('opacity', '1');
  await page.locator('#closeScreenInfoSheet').click();
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'dark';
    document.body.classList.add('dark');
    window.openScreenInfo('changes');
  });
  await expect(dialog).toContainText('Allocation is usually automatic');
  await expect(dialog.locator('.infoSheetItem')).toHaveCount(3);
  const sizes = await dialog.evaluate(el => ({ width: el.clientWidth, scrollWidth: el.scrollWidth }));
  expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.width + 1);
});

test('screen help keeps escaped content when its optional React chunk fails', async ({ page }) => {
  await page.route('**/assets/screen-info-*.js', route => route.abort());
  await openShell(page);
  await page.evaluate(() => window.openScreenInfo('changes'));
  await expect(page.locator('#screenInfoSheet .infoSheetItem')).toHaveCount(3);
  await expect(page.locator('#screenInfoSheet')).toContainText('Record only confirmed absences');
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
  await expect(launchIcon).toHaveAttribute('src', /icon-192\.png\?v=37\.41/);
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
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', 'manifest.webmanifest?v=37.41');
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

test('frontend changelog explains continuous swiping', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    window.renderReleaseNotes();
    document.getElementById('releaseNotes').showModal();
  });
  const dialog = page.locator('#releaseNotes');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.releaseEntry')).toHaveCount(1);
  await expect(dialog.locator('.releaseHistory')).toContainText('bottom tab selector now follows one continuous drag');
  await expect(dialog.locator('.releaseHistory')).toContainText('Horizontal navigation is now available from Chat');
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

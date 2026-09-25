const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const release = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'release.json'), 'utf8'));
const releaseVersionPattern = release.version.replace(/\./g, '\\.');

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

async function realTouchPath(page, points) {
  const session = await page.context().newCDPSession(page);
  const [from, ...moves] = points;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y, id: 1 }] });
  for (const point of moves) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point.x, y: point.y, id: 1 }] });
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

test('bottom-tab taps move solid pages edge-to-edge without visual overlap', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile transition regression');
  await openShell(page);
  await expect(page.locator('[data-react-navigation="ready"]')).toHaveCount(1);
  await page.evaluate(() => window.show('today'));
  const nightBefore = await page.locator('#today').boundingBox();

  await page.locator('.bottom button[data-v="changes"]').click();
  await expect(page.locator('main')).toHaveClass(/viewSwipeStage/);
  await expect(page.locator('main')).not.toHaveClass(/viewMorphing/);
  await expect(page.locator('#today')).toHaveClass(/swipeCurrent/);
  await expect(page.locator('#changes')).toHaveClass(/swipePreview/);

  await page.waitForTimeout(120);
  const trackState = await page.evaluate(() => {
    const current = document.getElementById('today');
    const incoming = document.getElementById('changes');
    const currentRect = current.getBoundingClientRect();
    const incomingRect = incoming.getBoundingClientRect();
    return {
      currentX: currentRect.x,
      currentWidth: currentRect.width,
      incomingX: incomingRect.x,
      currentOpacity: Number(getComputedStyle(current).opacity),
      incomingOpacity: Number(getComputedStyle(incoming).opacity),
      currentBackground: getComputedStyle(current).backgroundColor,
      incomingBackground: getComputedStyle(incoming).backgroundColor,
      currentTransform: getComputedStyle(current).transform,
      incomingTransform: getComputedStyle(incoming).transform
    };
  });
  expect(trackState.currentX).toBeLessThan(nightBefore.x - 20);
  expect(Math.abs((trackState.currentX + trackState.currentWidth) - trackState.incomingX)).toBeLessThanOrEqual(2);
  expect(trackState.currentOpacity).toBe(1);
  expect(trackState.incomingOpacity).toBe(1);
  expect(trackState.currentBackground).not.toBe('rgba(0, 0, 0, 0)');
  expect(trackState.incomingBackground).not.toBe('rgba(0, 0, 0, 0)');
  expect(trackState.currentTransform).not.toBe('none');
  expect(trackState.incomingTransform).not.toBe('none');

  await expect(page.locator('#changes')).toBeVisible();
  await expect(page.locator('main')).not.toHaveClass(/viewSwipeStage/);
  await expect(page.locator('#today')).toHaveClass(/hidden/);
  const activeIndicator = await page.locator('.tabSlidingIndicator').boundingBox();
  const changesTab = await page.locator('.bottom button[data-v="changes"]').boundingBox();
  expect(Math.abs(activeIndicator.x - changesTab.x)).toBeLessThan(4);
});

test('page swipes start reliably from container padding and survive an initial diagonal wobble', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'real phone gesture regression');
  await openShell(page);
  await expect(page.locator('[data-react-navigation="ready"]')).toHaveCount(1);
  await page.evaluate(() => window.show('chat'));
  await expect(page.locator('#chat')).toBeVisible();

  await page.evaluate(() => {
    const list = document.getElementById('chatConversationList');
    list.innerHTML = '';
    list.style.minHeight = '120px';
  });
  await page.locator('#chatConversationList').scrollIntoViewIfNeeded();
  const listBox = await page.locator('#chatConversationList').boundingBox();
  const from = { x: listBox.x + listBox.width / 2, y: listBox.y + Math.min(60, listBox.height / 2) };
  await realTouchPath(page, [
    from,
    { x: from.x + 10, y: from.y + 11 },
    { x: from.x + 55, y: from.y + 14 },
    { x: from.x + 115, y: from.y + 16 },
    { x: Math.min(360, from.x + 175), y: from.y + 18 }
  ]);
  await expect(page.locator('#breaks')).toBeVisible();

  await page.evaluate(() => window.show('changes'));
  await expect(page.locator('#changes')).toBeVisible();
  const verticalStart = { x: 190, y: 360 };
  await realTouchPath(page, [
    verticalStart,
    { x: verticalStart.x + 4, y: verticalStart.y + 9 },
    { x: verticalStart.x + 7, y: verticalStart.y + 32 },
    { x: verticalStart.x + 8, y: verticalStart.y + 90 }
  ]);
  await expect(page.locator('#changes')).toBeVisible();
});

test('horizontal navigation starts directly on a focusable Chat message row', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'real phone gesture regression');
  await openShell(page);
  await expect(page.locator('[data-react-navigation="ready"]')).toHaveCount(1);
  await page.evaluate(() => window.show('chat'));
  await expect(page.locator('#chat')).toBeVisible();

  await page.evaluate(() => {
    const host = document.getElementById('chatTeamMessages');
    host.innerHTML = '';
    const line = document.createElement('div');
    line.id = 'swipeFocusableChatMessage';
    line.className = 'chatTeamLine';
    line.tabIndex = 0;
    line.setAttribute('aria-label', 'Message from a roster member. Long press for actions.');
    line.style.minHeight = '58px';
    line.style.padding = '16px 12px';
    line.textContent = '[20:14] Michael: Can anyone swap first part?';
    host.appendChild(line);
  });

  const message = page.locator('#swipeFocusableChatMessage');
  await message.scrollIntoViewIfNeeded();
  const box = await message.boundingBox();
  const from = { x: box.x + Math.min(box.width * 0.42, 155), y: box.y + box.height / 2 };
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('#swipeFocusableChatMessage')?.id, from))
    .toBe('swipeFocusableChatMessage');

  await realTouchPath(page, [
    from,
    { x: from.x + 12, y: from.y + 8 },
    { x: from.x + 58, y: from.y + 10 },
    { x: from.x + 118, y: from.y + 11 },
    { x: Math.min((page.viewportSize()?.width || 390) - 32, from.x + 178), y: from.y + 12 }
  ]);
  await expect(page.locator('#breaks')).toBeVisible();
});

test('a new swipe interrupts an unfinished settle instead of being ignored', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'real phone gesture regression');
  await openShell(page);
  await expect(page.locator('[data-react-navigation="ready"]')).toHaveCount(1);
  await page.evaluate(() => window.show('changes'));
  const safe = await page.evaluate(() => {
    const blocked = 'button,a,input,select,textarea,[role="button"],[contenteditable="true"]';
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

test('page track stays covered across saved scroll positions and Night carries its own header', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile transition regression');
  await openShell(page);
  await expect(page.locator('#today > #appHeader')).toHaveCount(1);

  await page.locator('.bottom button[data-v="breaks"]').click();
  await expect(page.locator('#breaks')).toBeVisible();
  await expect(page.locator('main')).not.toHaveClass(/viewSwipeStage/);
  await page.evaluate(() => {
    const spacer = document.createElement('div');
    spacer.id = 'swipeScrollRegressionSpacer';
    spacer.style.height = '900px';
    document.getElementById('breaks').appendChild(spacer);
    window.scrollTo(0, 520);
    window.viewScrollPositions.changes = 0;
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(250);

  await page.locator('.bottom button[data-v="changes"]').click();
  await expect(page.locator('main')).toHaveClass(/viewSwipeStage/);
  await page.waitForTimeout(120);
  const coverageDiagnostic = await page.evaluate(() => {
    const y = Math.min(220, window.innerHeight - 140);
    const main = document.querySelector('main');
    const current = main?.querySelector(':scope > .view.swipeCurrent');
    const preview = main?.querySelector(':scope > .view.swipePreview');
    const compactRect = element => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom };
    };
    const currentRect = compactRect(current);
    const previewRect = compactRect(preview);
    const visualRects = [currentRect, previewRect].filter(Boolean);
    const points = [2, window.innerWidth / 2, window.innerWidth - 2].map(x => ({
      x,
      covered: visualRects.some(rect =>
        x >= rect.x - 1 &&
        x <= rect.right + 1 &&
        y >= rect.y - 1 &&
        y <= rect.bottom + 1
      )
    }));
    return {
      scrollY: window.scrollY,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      bodyView: document.body.getAttribute('data-view'),
      main: compactRect(main),
      current: currentRect,
      preview: previewRect,
      mainOverflow: main ? getComputedStyle(main).overflow : null,
      points
    };
  });
  expect(
    coverageDiagnostic.points.map(point => point.covered),
    JSON.stringify(coverageDiagnostic)
  ).toEqual([true, true, true]);
  await expect(page.locator('#changes')).toBeVisible();
  await expect(page.locator('main')).not.toHaveClass(/viewSwipeStage/);

  await page.locator('.bottom button[data-v="today"]').click();
  await expect(page.locator('#today')).toHaveClass(/swipePreview/);
  await page.waitForTimeout(120);
  const headerTrack = await page.evaluate(() => {
    const today = document.getElementById('today').getBoundingClientRect();
    const header = document.getElementById('appHeader').getBoundingClientRect();
    return { todayX: today.x, todayWidth: today.width, headerX: header.x, headerWidth: header.width };
  });
  expect(Math.abs(headerTrack.headerX - headerTrack.todayX)).toBeLessThanOrEqual(1);
  expect(Math.abs(headerTrack.headerWidth - headerTrack.todayWidth)).toBeLessThanOrEqual(1);
  await expect(page.locator('#today')).toBeVisible();
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
  expect(Math.abs((draggedCurrent.x + draggedCurrent.width) - draggedPreview.x)).toBeLessThanOrEqual(2);
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
  await workflowButton.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'center' }));
  await expect(workflowButton).toBeVisible();
  await expect.poll(async () => workflowButton.evaluate(el => {
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    return Boolean(document.elementFromPoint(x, y)?.closest('[data-changes-step]'));
  })).toBe(true);
  const workflow = await workflowButton.boundingBox();
  const workflowPoint = { x: workflow.x + workflow.width / 2, y: workflow.y + workflow.height / 2 };
  await realTouchSwipe(page, workflowPoint, { x: workflowPoint.x + 150, y: workflowPoint.y });
  await expect(page.locator('#changes')).toBeVisible();

  await page.evaluate(() => {
    window.scrollTo(0, 0);
    window.show('chat');
  });
  await expect(page.locator('#chat')).toBeVisible();
  const chatSwipeStart = await page.evaluate(() => {
    const blocked = 'button,a,input,select,textarea,[role="button"],[contenteditable="true"]';
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
    const chatDuring = await page.locator('#chat').boundingBox();
    const breaksDuring = await page.locator('#breaks').boundingBox();
    expect(Math.abs((breaksDuring.x + breaksDuring.width) - chatDuring.x)).toBeLessThanOrEqual(2);
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
  await expect(launchIcon).toHaveAttribute('src', new RegExp(`icon-192\\.png\\?v=${releaseVersionPattern}`));
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
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', `manifest.webmanifest?v=${release.version}`);
});

test('typed clinical cards render Night and Breaks without legacy HTML strings', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('roster:personal-night', { detail: {
      displayName: 'André Bartolo', jobTitle: 'Anaesthetic Nurse', avatarUrl: '', initial: 'A',
      assignmentLabel: 'Tonight’s assignment', title: 'Pager', detail: 'Labour Ward first part',
      period: '00:00–03:30', breakLabel: 'Second break', contextLabel: 'Working with',
      context: 'Michael Debono', changedLabel: '', action: 'role', pending: false, pendingOther: ''
    }}));
    window.dispatchEvent(new CustomEvent('roster:night', { detail: {
      nurseCount: 6, absenceCount: 0, overtimeCount: 0, taskCount: 0, decisionTasks: 0,
      confirmNeeded: false, alert: '', firstTask: '', labourPending: false,
      roles: [
        { key: 'first', label: 'First Part', names: 'James Galea + Michael Galea', detail: 'Works 00:00–03:30 · Second break', tone: 'first', mine: false },
        { key: 'pager', label: 'Pager', names: 'André Bartolo', detail: 'Labour Ward first part · Second break', tone: 'pager', mine: true }
      ], extras: []
    }}));
    window.dispatchEvent(new CustomEvent('roster:breaks', { detail: {
      date: '2026-09-26', formattedDate: '26 Sep 2026', nurseCount: 6, absenceCount: 0,
      pending: false, pendingReason: '', labourPending: false,
      first: ['Michael Debono', 'Yentl Cutajar'], second: ['James Galea', 'Michael Galea', 'André Bartolo'],
      notes: ['André Bartolo works Labour Ward first part and takes second break.'], highlightedName: 'André Bartolo'
    }}));
  });

  await expect(page.locator('#personalNightCard')).toContainText('Tonight’s assignment');
  await expect(page.locator('#roles')).toContainText('André Bartolo');
  await expect(page.locator('#nightStatusRow')).toContainText('Ready');
  await page.evaluate(() => window.show('breaks'));
  await expect(page.locator('#breakList')).toContainText('First break');
  await expect(page.locator('#breakList')).toContainText('You');
  await expect(page.locator('#breakDate')).toBeEmpty();
});

test('typed Changes records render live staffing and expose stable actions', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    window.__changesActions = [];
    window.addEventListener('roster:changes-action', event => window.__changesActions.push(event.detail));
    window.dispatchEvent(new CustomEvent('roster:changes', { detail: {
      absences: [{ id: 'absence-1', kind: 'absence', name: 'André Bartolo', status: 'Absent', meta: 'Leave · Updated by Roster admin at 18:30' }],
      overtime: [{ id: 'overtime-1', kind: 'overtime', name: 'Maria Borg', status: 'Awaiting allocation', needsAllocation: true, meta: 'Added by Roster admin at 18:31' }],
      history: [{ label: 'Absence', type: 'absence', title: 'André Bartolo marked absent', detail: 'Leave', meta: 'Roster admin · 18:30' }],
      historyTotal: 16,
      historyExpanded: false
    }}));
    window.show('changes');
  });

  await expect(page.locator('#changeList')).toContainText('André Bartolo');
  await expect(page.locator('#overtimeList')).toContainText('Awaiting allocation');
  await expect(page.locator('#changeHistory')).toContainText('Show full history (16)');
  await page.locator('#changeList button[aria-label="More actions for André Bartolo"]').click();
  await page.locator('#recordCancelAction').click();
  await page.locator('#overtimeList button', { hasText: 'Awaiting allocation' }).click();
  const actions = await page.evaluate(() => window.__changesActions);
  expect(actions).toEqual(expect.arrayContaining([
    expect.objectContaining({ action: 'allocation' }),
    expect.objectContaining({ action: 'record', kind: 'absence', id: 'absence-1' })
  ]));
});

test('typed full-roster cards render searchable clinical summaries and open a night', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    window.__openedNights = [];
    window.addEventListener('roster:open-night', event => window.__openedNights.push(event.detail.index));
    window.dispatchEvent(new CustomEvent('roster:full-roster', { detail: { cards: [{
      index: 4,
      date: 'Saturday, 26 September 2026',
      status: 'One live staffing update',
      count: 6,
      details: [
        { label: 'First part', values: ['James Galea', 'Michael Galea'], tone: 'first' },
        { label: 'Absences', values: ['André Bartolo · Leave'], tone: 'warning' }
      ]
    }] } }));
    window.show('roster');
  });

  const card = page.locator('#cards button[aria-label^="Open roster for"]');
  await expect(card).toContainText('Saturday, 26 September 2026');
  await expect(card).toContainText('André Bartolo · Leave');
  await card.click();
  expect(await page.evaluate(() => window.__openedNights)).toContain(4);
});

test('typed account controls preserve appearance and app actions', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    window.__accountActions = [];
    window.addEventListener('roster:account-action', event => window.__accountActions.push(event.detail));
    window.dispatchEvent(new CustomEvent('roster:account', { detail: { theme: 'system', installed: false } }));
    document.getElementById('accountSheet').showModal();
  });

  await expect(page.locator('#appearanceExperience')).toContainText('Automatic');
  await expect(page.locator('#accountActionsExperience')).toContainText('Install Night Roster');
  await page.locator('#appearanceExperience button', { hasText: 'Dark' }).click();
  await expect(page.locator('#appearanceExperience button', { hasText: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
  const actions = await page.evaluate(() => window.__accountActions);
  expect(actions).toContainEqual(expect.objectContaining({ action: 'theme', value: 'dark' }));
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

test('frontend changelog explains reliable swiping over Chat messages', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    window.renderReleaseNotes();
    document.getElementById('releaseNotes').showModal();
  });
  const dialog = page.locator('#releaseNotes');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.releaseEntry')).toHaveCount(1);
  await expect(dialog.locator('.releaseHistory')).toContainText('directly on a Chat message');
  await expect(dialog.locator('.releaseHistory')).toContainText('focusability no longer makes the whole message');
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

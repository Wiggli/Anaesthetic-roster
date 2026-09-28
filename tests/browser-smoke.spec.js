const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const release = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'release.json'), 'utf8'));
const releaseVersionPattern = release.version.replace(/\./g, '\\.');

async function captureReview(page, name) {
  if (!process.env.CI) return;
  const directory = path.join(__dirname, '..', 'visual-review');
  fs.mkdirSync(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `${test.info().project.name}-${name}.png`) });
}

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

test('Changes save feedback presents a conflict and recovery without changing the message', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => window.formMessage('allocationFormMessage',
    'This night\'s plan changed on another device. The latest version has been loaded, so please review it and confirm again.', 'error'));
  const feedback = page.locator('#allocationFormMessage');
  await expect(feedback).toHaveAttribute('data-react-ready', 'true');
  await expect(feedback.locator('[role="alert"]')).toContainText('Needs attention');
  await expect(feedback).toContainText('review it and confirm again');
  await page.evaluate(() => window.formMessage('allocationFormMessage', 'This night\'s plan confirmed for everyone', 'success'));
  await expect(feedback.locator('[role="status"]')).toContainText('Shared plan');
  await expect(feedback).toContainText('confirmed for everyone');
});

test('Changes feedback retains its plain live message if the optional chunk fails', async ({ page }) => {
  await page.route('**/assets/changes-feedback-*.js', route => route.abort());
  await openShell(page);
  await page.evaluate(() => window.formMessage('allocationFormMessage',
    'Reconnect to the internet, then press Confirm and share again.', 'error'));
  await expect(page.locator('#allocationFormMessage')).toHaveText('Reconnect to the internet, then press Confirm and share again.');
  await expect(page.locator('#allocationFormMessage')).not.toHaveAttribute('data-react-ready', 'true');
});

test('Chat reports connection errors and recovery beside the conversation', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    const host = document.getElementById('chatStatus');
    host.classList.remove('hidden');
    window.dispatchEvent(new CustomEvent('roster:chat-status', { detail: { message: 'Chat is reconnecting. Messages will send when the connection returns.', error: true } }));
  });
  const status = page.locator('#chatStatus');
  await expect(status).toHaveAttribute('data-react-ready', 'true');
  await expect(status.locator('[role="alert"]')).toContainText('Chat needs attention');
  await expect(status).toContainText('Messages will send when the connection returns.');
  await page.evaluate(() => window.show('chat'));
  await captureReview(page, 'chat-error');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('roster:chat-status', { detail: { message: 'Chat is ready.', error: false } })));
  await expect(status.locator('[role="status"]')).toContainText('Chat is ready.');
  await page.evaluate(() => {
    document.getElementById('chatStatus').classList.add('hidden');
    window.dispatchEvent(new CustomEvent('roster:chat-status', { detail: { message: '', error: false } }));
  });
  await expect(status).toHaveClass(/hidden/);
});

test('Chat keeps the plain status when its optional presentation fails', async ({ page }) => {
  await page.route('**/assets/chat-experience-*.js', route => route.abort());
  await openShell(page);
  await page.evaluate(() => {
    const host = document.getElementById('chatStatus');
    host.textContent = 'Chat is temporarily unavailable.';
    host.classList.remove('hidden');
    window.dispatchEvent(new CustomEvent('roster:chat-status', { detail: { message: host.textContent, error: true } }));
  });
  await expect(page.locator('#chatStatus')).toHaveText('Chat is temporarily unavailable.');
  await expect(page.locator('#chatStatus')).not.toHaveAttribute('data-react-ready', 'true');
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
  await page.locator('#chatConversationList').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
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

  const stableGlass = await page.locator('.bottom').evaluate(el => {
    const style = getComputedStyle(el);
    return {
      background: style.backgroundColor,
      backdrop: style.backdropFilter || style.webkitBackdropFilter || 'none'
    };
  });
  expect(stableGlass.background).not.toBe('transparent');
  expect(stableGlass.background).not.toBe('rgba(0, 0, 0, 0)');
  expect(stableGlass.backdrop).not.toBe('none');

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
  await captureReview(page, 'loading');
  await page.evaluate(() => {
    document.getElementById('launchTitle').textContent = 'Connection taking longer';
    document.getElementById('launchStatus').textContent = 'The shared roster did not respond. You can retry or open a saved copy.';
    document.getElementById('launchRecovery').classList.remove('hidden');
    document.getElementById('launchOfflineBtn').classList.remove('hidden');
  });
  await expect(page.locator('#launchRecovery')).toContainText('read-only');
  await captureReview(page, 'offline-recovery');
  await page.evaluate(() => {
    document.getElementById('launchScreen').style.display = 'none';
    document.getElementById('authGate').style.display = 'block';
  });
  await captureReview(page, 'auth');

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
  if (process.env.CI) await page.waitForTimeout(900);
  await captureReview(page, 'onboarding');
  await expect(page.locator('#onboardingProgress')).toHaveAttribute('aria-valuemax', '1');
  await page.evaluate(() => {
    window.onboardingChatIntro = false;
    window.onboardingStep = 1;
    window.renderOnboarding();
  });
  await expect(page.locator('#onboardingProgress')).toHaveAttribute('aria-valuenow', '2');
  await expect(page.locator('#onboardingTitle')).toBeFocused();
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
  const nightOrder = await page.evaluate(() => {
    const hero = document.getElementById('personalNight');
    const date = document.querySelector('#today .nightDateShell');
    return Boolean(hero && date && (hero.compareDocumentPosition(date) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(nightOrder).toBe(true);
  await expect(page.locator('#personalNightCard > article.personalHeroSurface')).toHaveCount(1);
  await expect(page.locator('#personalNightCard > article.personalHeroSurface')).toHaveClass(/personalRole-pager/);
  await expect(page.locator('#personalNightCard .personalRoleIcon')).toHaveText('P');
  await expect(page.locator('#personalNightCard > .personalHeroSurface > .personalIdentity')).toHaveCount(1);
  const assignmentContrast = await page.locator('#personalNightCard .personalAssignmentHero').evaluate(el => ({
    background: getComputedStyle(el).backgroundColor,
    title: getComputedStyle(el.querySelector('.personalRoleCopy b')).color,
    facts: getComputedStyle(el.nextElementSibling).backgroundColor
  }));
  expect(assignmentContrast.background).toBe('rgb(23, 56, 60)');
  expect(assignmentContrast.facts).toBe('rgb(23, 56, 60)');
  expect(assignmentContrast.title).toBe('rgb(255, 255, 255)');
  await expect(page.locator('#roles')).toContainText('André Bartolo');
  await expect(page.locator('#roles > .nightSituationTimeline')).toHaveCount(1);
  await expect(page.locator('#roles .nightSituationTimeline > .rosterRow')).toHaveCount(2);
  await expect(page.locator('#nightStatusRow')).toContainText('Plan ready');
  await expect(page.locator('#nightStatusRow > .nightBrief')).toHaveCount(1);
  await expect(page.locator('#nightStatusRow .nightBriefLead')).toContainText('6 nurses');
  await expect(page.locator('#nightStatusRow .nightBriefReady')).toHaveText('Plan ready');
  await captureReview(page, 'night');
  const summaryGeometry = await page.locator('#nightStatusRow > .nightBrief').evaluate(el => {
    const style = getComputedStyle(el);
    return { topRule: style.borderTopWidth, bottomRule: style.borderBottomWidth, layout: style.display };
  });
  expect(summaryGeometry.layout).toBe('flex');
  expect(summaryGeometry.topRule).not.toBe('0px');
  expect(summaryGeometry.bottomRule).not.toBe('0px');
  const dock = await page.locator('.bottom').boundingBox();
  expect(dock).not.toBeNull();
  expect(dock.height).toBeLessThanOrEqual(66);
  await page.evaluate(() => window.show('breaks'));
  await expect(page.locator('#breakList')).toContainText('First break');
  await expect(page.locator('#breakList > .breakGrid')).toHaveCount(1);
  await expect(page.locator('#breakList .breakGroupOrdinal')).toHaveText(['01', '02']);
  await expect(page.locator('#breakList .breakNotesHeading')).toContainText('Labour Ward & Pager');
  const breakLayout = await page.locator('#breakList .breakGrid').evaluate(el => ({
    columns: getComputedStyle(el).gridTemplateColumns.split(' ').length,
    firstBorder: getComputedStyle(el.querySelector('.breakGroup')).borderTopWidth
  }));
  expect(breakLayout.columns).toBe(1);
  expect(breakLayout.firstBorder).not.toBe('0px');
  await expect(page.locator('#breakList')).toContainText('You');
  await expect(page.locator('#breakPersonalSummary')).toContainText('Second break');
  await expect(page.locator('#breakPersonalSummary')).toContainText('André Bartolo');
  if (test.info().project.name === 'mobile-chromium') {
    const labelHeight = await page.locator('#breakSummaryRow .breakSummaryItem.labour b').evaluate(el => el.getBoundingClientRect().height);
    expect(labelHeight).toBeLessThan(30);
  }
  await captureReview(page, 'breaks');
  await expect(page.locator('#breakDate')).toBeEmpty();
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.classList.add('dark');
    window.show('today');
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await captureReview(page, 'night-dark-reduced');
  await page.setViewportSize({ width: 820, height: 1180 });
  await captureReview(page, 'night-tablet-dark');
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
      historyExpanded: false,
      allocations: [{ key: 'first1', label: 'First Part 1', breakLabel: 'Second break', selectedId: '', options: [{ id: 'overtime-1', name: 'Maria Borg' }] }],
      allocationMessage: '',
      forms: { names: [{ value: 'Nurse One', label: 'Nurse One' }], editing: false, overtimeSuggestions: ['Maria Borg'] },
      roleOverride: {
        guidance: 'Arrange the five nurses working this night across four theatre roles and one full-night Labour Ward / Pager role. Each nurse is used once.',
        summary: 'Optional custom five-nurse arrangement', open: false, stored: false, dirty: false, reason: '', canSave: false,
        keys: [{ key: 'first1', label: 'First part · position 1', fullWidth: false }],
        names: [{ value: 'Nurse One', label: 'Nurse One' }], assignments: { first1: 'Nurse One' }
      }
    }}));
    window.show('changes');
  });

  await expect(page.locator('#changeList')).toContainText('André Bartolo');
  await expect(page.locator('#changeList > .changesRecordGroup > .changeItem')).toHaveCount(1);
  await expect(page.locator('#absenceFormExperience #absentName')).toContainText('Nurse One');
  await expect(page.locator('#overtimeFormExperience #overtimeName')).toHaveAttribute('placeholder', "Type the nurse's name");
  await expect(page.locator('#nightRoleOverrideStep')).toContainText('Change this night’s roles');
  await expect(page.locator('#overtimeList')).toContainText('Awaiting allocation');
  await expect(page.locator('#overtimeList > .changesRecordGroup > .overtimeItem')).toHaveCount(1);
  await expect(page.locator('#allocationList > .changesAllocationGroup > .allocationRow')).toHaveCount(1);
  await expect(page.locator('#changeHistory')).toContainText('Show full history (16)');
  await page.locator('#changeList button[aria-label="More actions for André Bartolo"]').click();
  await page.locator('#recordCancelAction').click();
  await page.locator('#overtimeList button', { hasText: 'Awaiting allocation' }).click();
  await page.locator('#allocationList select').selectOption('overtime-1');
  const actions = await page.evaluate(() => window.__changesActions);
  expect(actions).toEqual(expect.arrayContaining([
    expect.objectContaining({ action: 'allocation' }),
    expect.objectContaining({ action: 'record', kind: 'absence', id: 'absence-1' }),
    expect.objectContaining({ action: 'allocation-select', key: 'first1', value: 'overtime-1' })
  ]));
});

test('React Changes journey shows decisions and supports keyboard step selection', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    window.show('changes');
    window.__workflowRequests = [];
    window.addEventListener('roster:changes-step-request', event => window.__workflowRequests.push(event.detail.step));
    window.dispatchEvent(new CustomEvent('roster:changes-workflow', { detail: {
      active: 'staffing',
      steps: [
        { id: 'staffing', label: 'Staffing', detail: '1 absent · 1 overtime', complete: true, attention: false, quiet: false },
        { id: 'allocation', label: 'Allocation', detail: '1 decision', complete: false, attention: true, quiet: false },
        { id: 'confirm', label: 'Confirm', detail: 'After allocation', complete: false, attention: false, quiet: false }
      ],
      headline: 'Choose a nurse for First Part 1',
      guidance: 'Choose a nurse, then review the changes.',
      tone: 'attention'
    }}));
  });
  const journey = page.locator('#changesWorkflowExperience');
  await expect(journey).toHaveAttribute('data-react-ready', 'true');
  await expect(journey.locator('[role="status"]')).toContainText('Choose a nurse for First Part 1');
  await captureReview(page, 'changes');
  await expect(page.locator('#changes .changesWorkflowTabs')).toBeHidden();
  const staffing = journey.locator('[data-changes-step="staffing"]');
  await expect(staffing).toHaveAttribute('aria-selected', 'true');
  await staffing.focus();
  await page.keyboard.press('ArrowRight');
  await expect(journey.locator('[data-changes-step="allocation"]')).toBeFocused();
  await journey.locator('[data-changes-step="confirm"]').click();
  expect(await page.evaluate(() => window.__workflowRequests)).toEqual(['allocation', 'confirm']);
});

test.describe('Changes journey load failure', () => {
test.use({ serviceWorkers: 'block' });
test('retains the original controls when its optional chunk fails', async ({ page }) => {
  await page.route('**/assets/changes-workflow-*.js', route => route.abort());
  await openShell(page);
  await page.evaluate(() => { window.show('changes'); window.dispatchEvent(new CustomEvent('roster:changes-workflow', { detail: {
    active: 'staffing', steps: [], headline: '', guidance: '', tone: 'automatic'
  } })); });
  await expect(page.locator('#changesWorkflowExperience')).not.toHaveAttribute('data-react-ready', 'true');
  await expect(page.locator('#changes .changesWorkflowTabs')).toBeVisible();
  await expect(page.locator('#changes .changesWorkflowTabs [data-changes-step]')).toHaveCount(3);
});
});

test('Changes confirmation uses a typed preview from the existing plan', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    window.show('changes');
    window.setChangesStep('confirm', false);
    const base = window.cur();
    window.renderConfirmationPreview(base, window.staffingPlan(base), 1, true, 'Choose a nurse');
  });
  const preview = page.locator('#confirmationPreview');
  await expect(preview).toHaveAttribute('data-react-ready', 'true');
  await expect(preview.getByRole('alert')).toContainText('Choose a nurse before continuing.');
  await expect(preview.locator('.confirmationRow')).toHaveCount(4);
  await preview.locator('summary').click();
  await expect(preview.locator('.confirmationFullPlan')).toHaveAttribute('open', '');
});

test.describe('Changes confirmation load failure', () => {
  test.use({ serviceWorkers: 'block' });
  test('keeps the escaped preview if the optional chunk fails', async ({ page }) => {
    await page.route('**/assets/changes-confirmation-*.js', route => route.abort());
    await openShell(page);
    await page.evaluate(() => {
      window.show('changes');
      const base = window.cur();
      window.renderConfirmationPreview(base, window.staffingPlan(base), 1, true, 'Choose a nurse');
    });
    const preview = page.locator('#confirmationPreview');
    await expect(preview).not.toHaveAttribute('data-react-ready', 'true');
    await expect(preview.locator('.confirmationWarning')).toContainText('Choose a nurse before continuing.');
    await expect(preview.locator('.confirmationRow')).toHaveCount(4);
  });
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
  await expect(card).toHaveClass(/rosterLedgerEntry/);
  await expect(page.locator('#cards .rosterLedgerLine')).toHaveCount(2);
  await expect(card).toContainText('Saturday, 26 September 2026');
  await expect(card).toContainText('André Bartolo · Leave');
  if (test.info().project.name === 'desktop-chromium') {
    const width = await card.evaluate(el => el.getBoundingClientRect().width);
    expect(width).toBeGreaterThan(300);
  }
  await captureReview(page, 'full-roster');
  await card.click();
  expect(await page.evaluate(() => window.__openedNights)).toContain(4);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('roster:full-roster', { detail: { cards: [] } }));
    window.show('roster');
  });
  await expect(page.locator('#cards .rosterLedgerEmpty')).toBeVisible();
  await captureReview(page, 'roster-empty');
});

test('typed account controls preserve appearance and app actions', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    window.__accountActions = [];
    window.addEventListener('roster:account-action', event => window.__accountActions.push(event.detail));
    window.dispatchEvent(new CustomEvent('roster:account', { detail: { theme: 'system', installed: false, profile: {
      name: 'Andre', jobTitle: 'Anaesthetic Nurse', rosterName: 'Nurse One', approvedName: 'Andre Bartolo', email: 'andre@example.test',
      options: [{ value: 'Nurse One', label: 'Nurse One' }], initial: 'A', photoUrl: '', featureAvailable: true, pendingPhoto: false, changed: false
    } } }));
    window.dispatchEvent(new CustomEvent('roster:passkeys', { detail: { message: '', items: [{ id: 'passkey-1', label: 'Night Roster on iPhone' }] } }));
    document.getElementById('accountSheet').showModal();
  });

  await expect(page.locator('#appearanceExperience')).toContainText('Automatic');
  await expect(page.locator('#accountSheetTitle')).toHaveText('Account & settings');
  await expect(page.locator('#accountSheet')).toContainText('Shared roster actions use this approved identity.');
  await expect(page.locator('#profileExperience')).toContainText('Personal details');
  await expect(page.locator('#profileName')).toHaveValue('Andre');
  await expect(page.locator('#profilePhotoPreview')).toBeHidden();
  await expect(page.locator('#profilePhotoInitial')).toBeVisible();
  await expect(page.locator('#profileRosterName')).toContainText('Nurse One');
  await expect(page.locator('#accountActionsExperience')).toContainText('Install Night Roster');
  await expect(page.locator('#accountActionsExperience button', { hasText: 'View app guide' })).toBeVisible();
  await expect(page.locator('#accountActionsExperience button', { hasText: 'Version history' })).toBeVisible();
  const helpLayout = await page.locator('.accountActions').evaluate(el => ({ section: el.getBoundingClientRect().height, rows: el.querySelector('#accountActionsExperience').getBoundingClientRect().height }));
  expect(helpLayout.section).toBeGreaterThan(helpLayout.rows);
  await expect(page.locator('#passkeyList')).toContainText('Night Roster on iPhone');
  await captureReview(page, 'account');
  await expect(page.locator('#securityHeading')).toHaveText('Sign-in security');
  await page.locator('#profileName').fill('André');
  await expect(page.locator('#saveProfileBtn')).toBeVisible();
  const bounds = await page.locator('#accountSheet').boundingBox();
  expect(bounds.width).toBeLessThanOrEqual(page.viewportSize().width);
  if (page.viewportSize().width >= 760) expect(bounds.y).toBeGreaterThan(30);
  const appearanceSurface = page.locator('#appearanceExperience > div');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  const lightAppearanceBackground = await appearanceSurface.evaluate(el => getComputedStyle(el).backgroundColor);
  await page.locator('#appearanceExperience button', { hasText: 'Dark' }).click();
  await expect(page.locator('#appearanceExperience button', { hasText: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const darkAppearanceBackground = await appearanceSurface.evaluate(el => getComputedStyle(el).backgroundColor);
  expect(darkAppearanceBackground).not.toBe(lightAppearanceBackground);
  const actions = await page.evaluate(() => window.__accountActions);
  expect(actions).toContainEqual(expect.objectContaining({ action: 'theme', value: 'dark' }));
  await page.locator('#accountActionsExperience button', { hasText: 'Version history' }).click();
  expect(await page.evaluate(() => window.__accountActions)).toContainEqual(expect.objectContaining({ action: 'versions' }));
});

test('typed administrator accounts separate pending access and support fast filtering', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('roster:admin-accounts', { detail: {
      activeCount: 2, inactiveCount: 1, online: true,
      pending: [{ userId: 'request-1', name: 'Maria Borg', email: 'maria@example.test', requested: '18:42' }],
      accounts: [
        { email: 'andre@example.test', name: 'Andre Bartolo', role: 'admin', active: true, current: true },
        { email: 'maria@example.test', name: 'Maria Borg', role: 'member', active: true, current: false },
        { email: 'inactive@example.test', name: 'Inactive Member', role: 'member', active: false, current: false }
      ]
    } }));
    document.getElementById('today').classList.add('hidden');
    document.getElementById('admin').classList.remove('hidden');
    window.switchAdminTab('access', false);
  });

  await expect(page.locator('#adminAccountsExperience')).toContainText('Pending access');
  await captureReview(page, 'administrator');
  await expect(page.locator('#adminAccountsExperience')).toContainText('Current account');
  await expect(page.locator('#accountName')).toHaveAttribute('placeholder', 'Nurse name');
  await expect(page.locator('#adminAccountsExperience button', { hasText: 'Deactivate' }).first()).toBeDisabled();
  await page.locator('[data-admin-tab="access"]').click();
  await expect(page.locator('[data-admin-tab="access"]')).toHaveAttribute('aria-selected', 'true');
  if (test.info().project.name === 'mobile-chromium') {
    const row = page.locator('#adminAccountsExperience .adminAccountRow').first();
    const bounds = await row.evaluate(element => {
      const card = element.getBoundingClientRect();
      const action = element.querySelector('button').getBoundingClientRect();
      return { cardRight: card.right, actionRight: action.right, actionBottom: action.bottom, cardBottom: card.bottom };
    });
    expect(bounds.actionRight).toBeLessThanOrEqual(bounds.cardRight);
    expect(bounds.actionBottom).toBeLessThanOrEqual(bounds.cardBottom);
  }
  await page.locator('#adminAccountsExperience input[type="search"]').fill('Inactive');
  await expect(page.locator('#adminAccountsExperience')).toContainText('Inactive Member');
  await expect(page.locator('#adminAccountsExperience')).not.toContainText('Andre Bartolo');
});

test('typed Chat overview renders private conversations and registered members', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    window.__chatActions = [];
    window.addEventListener('roster:chat-action', event => window.__chatActions.push(event.detail));
    window.dispatchEvent(new CustomEvent('roster:chat-overview', { detail: {
      conversations: [{ id: 'conversation-1', title: 'Maria Borg', initial: 'M', time: '18:42', preview: 'Maria Borg: I can cover', unread: 2, active: false }],
      members: [
        { personKey: 'Maria Borg', displayName: 'Maria Borg', initial: 'M', available: true },
        { personKey: 'James Galea', displayName: 'James Galea', initial: 'J', available: false }
      ]
    } }));
    window.dispatchEvent(new CustomEvent('roster:chat-messages', { detail: {
      kind: 'team', bottomOffset: 0, items: [{
        id: 'message-1', sender: 'Maria Borg', time: '18:42', body: '@André I can cover the first part.',
        own: false, failed: false, deleted: false, mentioned: true, dateLabel: 'Today', unreadBefore: true,
        replySender: 'James Galea', replyBody: 'Can anyone cover this night?'
      }]
    } }));
    window.show('chat');
  });

  await expect(page.locator('#chatConversationList')).toContainText('I can cover');
  await captureReview(page, 'chat');
  if (page.viewportSize().width < 760) {
    const composer = await page.locator('#chatTeamComposer').boundingBox();
    const dock = await page.locator('.bottom').boundingBox();
    expect(composer).not.toBeNull();
    expect(dock).not.toBeNull();
    expect(composer.y + composer.height).toBeLessThanOrEqual(dock.y);
  }
  await expect(page.locator('#chatConversationList')).toContainText('2');
  await expect(page.locator('#chatConversationList button[aria-label]')).toHaveAttribute('aria-label', 'Open conversation with Maria Borg, 2 unread');
  if (page.viewportSize().width >= 760) {
    const team = await page.locator('#chat .chatTeamConsole').boundingBox();
    const privateHeading = await page.locator('#chat .chatPrivateHeader').boundingBox();
    expect(team).not.toBeNull();
    expect(privateHeading).not.toBeNull();
    expect(privateHeading.y).toBeGreaterThanOrEqual(team.y + team.height - 1);
    await expect(page.locator('#chatDesktopEmpty')).toBeVisible();
    await expect(page.locator('#chatThread')).toBeHidden();
    await page.locator('#chat').evaluate(el => el.classList.add('chat-thread-open'));
    await expect(page.locator('#chatDesktopEmpty')).toBeHidden();
    await expect(page.locator('#chatThread')).toBeVisible();
    await page.locator('#chat').evaluate(el => el.classList.remove('chat-thread-open'));
    await expect(page.locator('#chatThread')).toBeHidden();
  }
  await expect(page.locator('#chatTeamInput')).toHaveAttribute('data-chat-composer', 'react');
  await expect(page.locator('#chatTeamComposer .chatComposerGlass')).toHaveCount(1);
  const composerMaterial = await page.locator('#chatTeamComposer .chatComposerGlass').evaluate(el => {
    const style = getComputedStyle(el);
    return {
      backdrop: style.backdropFilter || style.webkitBackdropFilter || 'none',
      radius: parseFloat(style.borderRadius)
    };
  });
  expect(composerMaterial.backdrop).toBe('none');
  expect(composerMaterial.radius).toBeGreaterThanOrEqual(8);
  await expect(page.locator('#chatTeamSendBtn')).toBeDisabled();
  await page.locator('#chatTeamInput').fill('x'.repeat(1600));
  await expect(page.locator('#chatTeamCharacterCount')).toBeVisible();
  await expect(page.locator('#chatTeamCharacterCount')).toHaveText('400 characters remaining');
  await page.locator('#chatTeamInput').fill('Cover confirmed');
  await expect(page.locator('#chatTeamSendBtn')).toBeEnabled();
  await page.evaluate(() => {
    window.__chatComposerSubmitted = false;
    document.getElementById('chatTeamComposer').addEventListener('submit', () => { window.__chatComposerSubmitted = true; }, { once: true });
  });
  await page.locator('#chatTeamInput').press('Control+Enter');
  await expect.poll(() => page.evaluate(() => window.__chatComposerSubmitted)).toBe(true);
  await page.evaluate(() => document.getElementById('chatNewConversationSheet').showModal());
  await expect(page.locator('#chatMemberPicker')).toContainText('Not registered');
  await page.locator('#chatMemberPicker input[type="search"]').fill('Maria');
  await expect(page.locator('#chatMemberPicker .chatPickerRow')).toHaveCount(1);
  await page.locator('#chatMemberPicker input[type="search"]').fill('Nobody');
  await expect(page.locator('#chatMemberPicker')).toContainText('No matching roster members');
  await page.locator('#chatMemberPicker input[type="search"]').fill('');
  await expect(page.locator('#chatTeamMessages')).toContainText('New messages');
  await expect(page.locator('#chatTeamMessages')).toContainText('Can anyone cover this night?');
  await page.locator('#chatMemberPicker button', { hasText: 'Maria Borg' }).click();
  await page.locator('#chatNewConversationSheet').evaluate(dialog => dialog.close());
  await page.locator('#chatTeamMessages button[aria-label="Actions for message from Maria Borg"]').click();
  await page.locator('#chatTeamMessages .chatTeamMessage[tabindex="0"]').click({ button: 'right' });
  expect(await page.evaluate(() => window.__chatActions)).toEqual(expect.arrayContaining([
    expect.objectContaining({ action: 'message', value: 'message-1', kind: 'team' }),
    expect.objectContaining({ action: 'member', value: 'Maria Borg' })
  ]));
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

test('What’s new describes the current release', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    window.renderReleaseNotes();
    document.getElementById('releaseNotes').showModal();
  });
  const dialog = page.locator('#releaseNotes');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.releaseEntry')).toHaveCount(1);
  await expect(dialog.locator('#releaseNotesTitle')).toHaveText('What’s new');
  await expect(dialog.locator('.releaseHistory')).toContainText(release.title);
  await expect(dialog.locator('.releaseHistory')).toContainText(release.changes[0]);
  const sizes = await dialog.locator('.releaseHistory').evaluate(el => ({ width: el.clientWidth, scrollWidth: el.scrollWidth }));
  expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.width + 1);
});

test('version history upgrades its escaped fallback to an on-demand React region', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    window.renderReleaseNotes(true);
    const dialog = document.getElementById('releaseNotes');
    if (dialog && !dialog.open) dialog.showModal();
  });
  const dialog = page.locator('#releaseNotes');
  await expect(dialog.locator('[data-react-release-notes="ready"]')).toHaveCount(1);
  await expect(dialog.locator('.releaseEntry')).toHaveCount(await page.evaluate(() => window.RELEASE_HISTORY.length));
  await expect(dialog.locator('.releaseNav')).toBeVisible();
  await expect(dialog.locator('.releaseArchiveHeading')).toContainText('Previous updates');
  await expect(dialog.locator('.releaseHistory')).toHaveAttribute('aria-label', 'Complete Night Roster version history');
  await expect(dialog.locator('.releaseEntry.latest')).toBeInViewport();
  await expect(dialog.locator('.releaseEntry.latest h3')).toBeInViewport();
  await captureReview(page, 'release-notes');
});

test.describe('version history load failure', () => {
test.use({ serviceWorkers: 'block' });
test('complete version history remains usable if its optional React chunk fails', async ({ page }) => {
  await page.route('**/assets/release-notes-*.js', route => route.abort());
  await openShell(page);
  await page.evaluate(() => {
    window.__forceReleaseNotesFallback = true;
    window.renderReleaseNotes(true);
    const dialog = document.getElementById('releaseNotes');
    if (dialog && !dialog.open) dialog.showModal();
  });
  const dialog = page.locator('#releaseNotes');
  await expect(dialog.locator('[data-react-release-notes="ready"]')).toHaveCount(0);
  await expect(dialog.locator('.releaseEntry')).toHaveCount(await page.evaluate(() => window.RELEASE_HISTORY.length));
  await expect(dialog.locator('.releaseNav')).toBeVisible();
  await expect(dialog.locator('.releaseHistory')).toContainText('React-powered version history');
});
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

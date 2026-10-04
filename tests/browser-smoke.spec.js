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
    if (auth) auth.classList.add('hidden');
    if (header) header.style.display = 'block';
    if (main) main.style.display = 'block';
    if (bottom) bottom.style.display = 'grid';
  });
}

function clockBackPersonalModel() {
  const transitionUtc = Date.parse('2026-10-25T01:00:00Z');
  return {
    date: '2026-10-24',
    displayName: 'André Bartolo',
    jobTitle: 'Senior Staff Nurse',
    avatarUrl: '',
    initial: 'A',
    assignmentLabel: 'Selected night’s assignment',
    title: 'First Part theatre',
    detail: 'Position 1',
    period: '00:00–03:00 after clock change',
    breakLabel: 'Second break',
    contextLabel: 'Working with',
    context: 'With James Galea',
    changedLabel: '',
    changed: false,
    action: 'role',
    pending: false,
    pendingOther: '',
    liveStatus: 'Night selected',
    dutyPart: 'first',
    dutyStartUtc: Date.parse('2026-10-24T22:00:00Z'),
    handoverUtc: Date.parse('2026-10-25T02:00:00Z'),
    dutyEndUtc: Date.parse('2026-10-25T06:00:00Z'),
    handoverLabel: '03:00 after clock change',
    transitionUtc,
    clockChange: {
      direction: 'back',
      title: 'Clock change night',
      transitionLabel: 'Clocks move back one hour',
      handover: '03:00',
      handoverDisplay: '03:00 after clock change',
      firstPeriod: '00:00–03:00 after clock change',
      secondPeriod: '03:00–07:00',
      partHours: 4,
      partHoursLabel: '4h',
      totalHours: 8,
      totalHoursLabel: '8h',
      summary: 'Equal duty',
      date: '2026-10-24',
      transitionUtc
    }
  };
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

test('clock-change nights show equal-duty guidance on Night, Breaks and onboarding', async ({ page }) => {
  await openShell(page);
  const clockChange = {
    direction: 'back',
    title: 'Clock change night',
    transitionLabel: 'Clocks move back one hour',
    handover: '03:00',
    handoverDisplay: '03:00 after clock change',
    firstPeriod: '00:00–03:00 after clock change',
    secondPeriod: '03:00–07:00',
    partHours: 4,
    partHoursLabel: '4h',
    totalHours: 8,
    totalHoursLabel: '8h',
    summary: 'The repeated hour makes the 00:00–07:00 duty window 8h. Handover moves to 03:00 after clock change so First Part and Second Part each work 4h of actual duty.',
    date: '2026-10-24'
  };
  await page.evaluate(model => {
    window.dispatchEvent(new CustomEvent('roster:night', { detail: {
      nurseCount: 6, absenceCount: 0, overtimeCount: 0, taskCount: 0, decisionTasks: 0,
      confirmNeeded: false, alert: '', firstTask: '', labourPending: false, breakLabel: 'Second break',
      chatUnread: 0, liveState: 'Night selected', roles: [], extras: [], clockChange: model
    }}));
    window.dispatchEvent(new CustomEvent('roster:breaks', { detail: {
      date: '2026-10-24', formattedDate: '24 Oct 2026', nurseCount: 6, absenceCount: 0,
      pending: false, pendingReason: '', labourPending: false, first: ['Second One'], second: ['First One'],
      notes: [], highlightedName: 'First One', firstDutyPeriod: model.firstPeriod,
      secondDutyPeriod: model.secondPeriod, clockChange: model
    }}));
  }, clockChange);

  await expect(page.locator('#nightClockChange .clockChangeNotice')).toContainText('Equal handover · 03:00 after clock change');
  await expect(page.locator('#nightClockChange .clockChangeNotice')).toContainText('4h actual');
  await captureReview(page, 'clock-change-night');
  await page.evaluate(() => window.show('breaks'));
  await expect(page.locator('#breakClockChange .clockChangeNotice')).toContainText('Clocks move back one hour');
  await expect(page.locator('#breakClockChange .clockChangeNotice')).toContainText('03:00–07:00');
  await captureReview(page, 'clock-change-breaks');

  await page.evaluate(() => {
    window.currentUserProfile = { display_name: 'Test Nurse', user_role: 'member' };
    localStorage.setItem('anaes_education_state_v1', JSON.stringify({ main: 2, changes: 1, breaks: 1, chat: 1 }));
    window.showClockChangeEducation('2026-10-24', true);
  });
  await expect(page.locator('#onboardingDialog')).toHaveAttribute('open', '');
  await expect(page.locator('#onboardingDialog')).toContainText('The app keeps both parts equal');
  await expect(page.locator('#onboardingDialog')).toContainText('03:00 after clock change');
  await expect(page.locator('#onboardingDialog')).toContainText('4h');
  await page.waitForTimeout(450);
  await captureReview(page, 'clock-change-onboarding');
});

test('clock-back wake-up cue marks the first repeated 02:xx as OLD clock time', async ({ page }) => {
  await openShell(page);
  const model = clockBackPersonalModel();
  const fixedNow = Date.parse('2026-10-25T00:15:00Z');
  await page.evaluate(({ model, fixedNow }) => {
    Date.now = () => fixedNow;
    window.dispatchEvent(new CustomEvent('roster:personal-night', { detail: model }));
  }, { model, fixedNow });

  const cue = page.locator('#personalNightCard .personalClockNow');
  await expect(cue).toHaveClass(/personalClockNow-old/);
  await expect(cue.locator('.personalClockNowFlag')).toHaveText('OLD');
  await expect(cue.locator('.personalClockNowCopy')).toContainText('CURRENT TIME · FIRST 02:xx');
  await expect(cue.locator('.personalClockNowCopy strong')).toHaveText('02:15');
  await expect(cue).toContainText('Clocks have not gone back yet');
  await expect(page.locator('#personalNightCard .nightTimelineHead em')).toContainText('FIRST 02:15 · OLD clock');
});

test('clock-back wake-up cue marks the second repeated 02:xx as NEW clock time', async ({ page }) => {
  await openShell(page);
  const model = clockBackPersonalModel();
  const fixedNow = Date.parse('2026-10-25T01:15:00Z');
  await page.evaluate(({ model, fixedNow }) => {
    Date.now = () => fixedNow;
    window.dispatchEvent(new CustomEvent('roster:personal-night', { detail: model }));
  }, { model, fixedNow });

  const cue = page.locator('#personalNightCard .personalClockNow');
  await expect(cue).toHaveClass(/personalClockNow-new/);
  await expect(cue.locator('.personalClockNowFlag')).toHaveText('NEW');
  await expect(cue.locator('.personalClockNowCopy')).toContainText('CURRENT TIME · SECOND 02:xx');
  await expect(cue.locator('.personalClockNowCopy strong')).toHaveText('02:15');
  await expect(cue).toContainText('Clocks have already gone back');
  await expect(cue).toContainText('new 02:xx hour now');
  await expect(page.locator('#personalNightCard .nightTimelineHead em')).toContainText('SECOND 02:15 · NEW clock');
});

test('Night hero exposes the richer rail and Share Night Roster stays scan-first', async ({ page }) => {
  await openShell(page);
  const transitionUtc = Date.parse('2026-10-25T01:00:00Z');
  await page.evaluate(({ transitionUtc }) => {
    window.dispatchEvent(new CustomEvent('roster:personal-night', { detail: {
      date: '2026-10-24',
      displayName: 'André Bartolo',
      jobTitle: 'Senior Staff Nurse',
      avatarUrl: '',
      initial: 'A',
      assignmentLabel: 'Selected night’s assignment',
      title: 'First Part theatre',
      detail: 'Position 1',
      period: '00:00–03:00 after clock change',
      breakLabel: 'Second break',
      contextLabel: 'Working with',
      context: 'With James Galea',
      changedLabel: 'Changed this night',
      changed: true,
      action: 'role',
      pending: false,
      pendingOther: '',
      liveStatus: 'Night selected',
      dutyPart: 'first',
      dutyStartUtc: Date.parse('2026-10-24T22:00:00Z'),
      handoverUtc: Date.parse('2026-10-25T02:00:00Z'),
      dutyEndUtc: Date.parse('2026-10-25T06:00:00Z'),
      handoverLabel: '03:00 after clock change',
      transitionUtc,
      clockChange: {
        direction: 'back',
        title: 'Clock change night',
        transitionLabel: 'Clocks move back one hour',
        handover: '03:00',
        handoverDisplay: '03:00 after clock change',
        firstPeriod: '00:00–03:00 after clock change',
        secondPeriod: '03:00–07:00',
        partHours: 4,
        partHoursLabel: '4h',
        totalHours: 8,
        totalHoursLabel: '8h',
        summary: 'Equal duty',
        date: '2026-10-24',
        transitionUtc
      }
    }}));
  }, { transitionUtc });

  const clockException = page.locator('#personalNightCard .personalClockException');
  await expect(clockException).toContainText('Clock-change night · equal duty');
  await expect(clockException).toContainText('Handover 03:00 after clock change');
  await expect(clockException).toContainText('Equal duty');
  await expect(page.locator('#personalNightCard .nightTimeline')).toContainText('02:00¹');
  await expect(page.locator('#personalNightCard .nightTimeline')).toContainText('02:00²');
  await expect(page.locator('#personalNightCard .personalHeroFactGrid')).toContainText('Open Breaks');
  await expect(page.locator('#personalNightCard')).toContainText('Changed this night');
  await expect(page.locator('#personalNightCard .nightTimelineSlimRail')).toHaveCount(1);
  await expect(page.locator('#personalNightCard .nightTimelineOwnBand.mine')).toHaveCount(1);
  const railVisual = await page.locator('#personalNightCard .nightTimelineSlimRail').evaluate(el => {
    const style = getComputedStyle(el);
    return { height: el.getBoundingClientRect().height, background: style.backgroundColor };
  });
  expect(railVisual.height).toBeLessThanOrEqual(34);
  expect(railVisual.background).toBe('rgba(0, 0, 0, 0)');
  const exceptionBackground = await clockException.evaluate(el => getComputedStyle(el).backgroundColor);
  expect(exceptionBackground).not.toBe('rgb(255, 255, 255)');
  await captureReview(page, 'night-cockpit-blue-rail');

  await page.evaluate(() => {
    window.__sharePayload = null;
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async payload => { window.__sharePayload = payload; }
    });
    window.showShareApp();
  });
  await expect(page.locator('#shareAppDialog')).toHaveAttribute('open', '');
  await expect(page.locator('#shareAppDialog')).toContainText('Scan to get Night Roster');
  await expect(page.locator('#shareAppDialog .shareQrSvg')).toHaveCount(1);
  await expect(page.locator('#shareAppDialog')).toContainText('Open camera');
  await expect(page.locator('#shareAppDialog')).toContainText('This only shares the public app');
  await expect(page.locator('#shareAppDialog')).toContainText('wiggli.github.io/Anaesthetic-roster/?welcome=1');
  await page.getByRole('button', { name: 'Send Night Roster' }).click();
  await expect.poll(() => page.evaluate(() => window.__sharePayload && window.__sharePayload.url)).toBe('https://wiggli.github.io/Anaesthetic-roster/?welcome=1');
  await captureReview(page, 'share-night-roster');
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

test.describe('Changes feedback load failure', () => {
  test.use({ serviceWorkers: 'block' });
  test('retains its plain live message if the optional chunk fails', async ({ page }) => {
    await page.route('**/assets/changes-feedback-*.js', route => route.abort());
    await openShell(page);
    await page.evaluate(() => window.formMessage('allocationFormMessage',
      'Reconnect to the internet, then press Confirm and share again.', 'error'));
    await expect(page.locator('#allocationFormMessage')).toHaveText('Reconnect to the internet, then press Confirm and share again.');
    await expect(page.locator('#allocationFormMessage')).not.toHaveAttribute('data-react-ready', 'true');
  });
});

test('completed Changes plan keeps confirmation controls hidden after allocation remount', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    const button = document.getElementById('saveAllocationsBtn');
    const hint = document.getElementById('confirmHint');
    button.classList.remove('hidden');
    hint.classList.remove('hidden');
    window.updateConfirmationControls(false, 0);
  });
  await expect(page.locator('#saveAllocationsBtn')).toHaveClass(/hidden/);
  await expect(page.locator('#confirmHint')).toHaveClass(/hidden/);
});

test('Chat opens as an inbox and promotes conversations into a dedicated thread surface', async ({ page, isMobile }) => {
  await openShell(page);
  await page.evaluate(() => window.show && window.show('chat'));
  await expect(page.locator('#chat')).toBeVisible();
  await expect(page.locator('#chatTeamEntry')).toBeVisible();
  await expect(page.locator('#chatInboxHeading')).toHaveText('Team and direct messages');
  await expect(page.locator('#chatTeamEntry')).toContainText('Anaesthetic Team');
  await expect(page.locator('#chatRosterContextDate')).toBeVisible();
  await expect(page.locator('#chatShiftNameBtn')).toBeVisible();
  await expect(page.locator('#chatNewPrivateBtn')).toHaveAttribute('aria-label', 'Start a new private chat');
  const newPrivateChatSizing = await page.locator('#chatNewPrivateBtn').evaluate(el => ({
    clientWidth: el.clientWidth,
    scrollWidth: el.scrollWidth
  }));
  expect(newPrivateChatSizing.scrollWidth).toBeLessThanOrEqual(newPrivateChatSizing.clientWidth + 1);
  await expect(page.locator('#chatTeamThread')).toHaveClass(/hidden/);
  await expect(page.locator('#chatSafetyInfo')).toContainText('Staff coordination only');
  await expect(page.locator('.chatUtilityHeading')).toContainText('Chat essentials');
  await expect(page.locator('#chatTeamUnread')).toHaveClass(/hidden/);
  await expect(page.locator('#chatTeamUnread')).toHaveText('');
  const chatPolishMetrics = await page.evaluate(() => {
    const utility = document.querySelector('.chatUtilityGroup');
    const safetyTitle = document.querySelector('.chatSafetyNotice b');
    const identity = document.querySelector('.nightTeamIdentityContext');
    if (identity) { identity.textContent = 'Night Owls'; identity.classList.remove('hidden'); }
    return {
      utilityRadius: utility ? parseFloat(getComputedStyle(utility).borderRadius) : 0,
      safetyTitleSize: safetyTitle ? parseFloat(getComputedStyle(safetyTitle).fontSize) : 0,
      identitySize: identity ? parseFloat(getComputedStyle(identity).fontSize) : 0
    };
  });
  expect(chatPolishMetrics.utilityRadius).toBeGreaterThanOrEqual(20);
  expect(chatPolishMetrics.safetyTitleSize).toBeGreaterThanOrEqual(15);
  expect(chatPolishMetrics.identitySize).toBeGreaterThanOrEqual(14);

  await page.evaluate(() => {
    const chat = document.getElementById('chat');
    const home = document.getElementById('chatHome');
    const teamThread = document.getElementById('chatTeamThread');
    chat.classList.add('chat-thread-open', 'chat-team-open');
    document.body.classList.add('chatThreadMode');
    teamThread.classList.remove('hidden');
    if (home) home.setAttribute('data-test-inbox-before-thread', 'true');
  });
  await expect(page.locator('#chatTeamThread')).toBeVisible();
  await expect(page.locator('#chatTeamThread .chatThreadHeading')).toContainText('Anaesthetic Team');
  await expect(page.locator('#chatTeamComposer')).toBeVisible();
  await expect(page.locator('#chatTeamInput')).toHaveAttribute('placeholder', 'Message the team…');
  if (isMobile) {
    await expect(page.locator('#chatHome')).not.toBeVisible();
    const pane = await page.locator('#chat .chatConversationPane').boundingBox();
    expect(pane).not.toBeNull();
    expect(pane.height).toBeGreaterThan(400);
  }
});

test('shared shift nickname editor is concise and patient-safe', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    window.show && window.show('chat');
    const input = document.getElementById('nightTeamNameInput');
    if (input) input.dataset.rosterDate = '2026-10-04';
    const dialog = document.getElementById('nightTeamNameDialog');
    if (dialog && !dialog.open) dialog.showModal();
  });
  await expect(page.locator('#nightTeamNameDialog')).toBeVisible();
  await expect(page.locator('#nightTeamNameInput')).toHaveAttribute('maxlength', '28');
  await expect(page.locator('#nightTeamNameDialog')).toContainText('across every roster night');
  await expect(page.locator('#nightTeamNameDialog')).toContainText('No patient information');
  await page.locator('#nightTeamNameInput').fill('The Night Owls');
  await expect(page.locator('#nightTeamNameInput')).toHaveValue('The Night Owls');
  await page.locator('#cancelNightTeamNameBtn').click();
  await expect(page.locator('#nightTeamNameDialog')).not.toBeVisible();
});

test('notification settings use readable rows and explicit switch states', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    window.show && window.show('chat');
    const disclosure = document.querySelector('.chatNotificationDisclosure');
    if (disclosure) disclosure.open = true;
    const settings = document.getElementById('pushPreferenceRows');
    if (settings) settings.classList.remove('hidden');
    const badge = document.getElementById('pushStateBadge');
    if (badge) { badge.textContent = 'On'; badge.className = 'pushStateBadge active'; }
    const team = document.getElementById('pushTeamToggle');
    if (team) team.checked = true;
    const state = document.querySelector('[data-switch-state-for="pushTeamToggle"]');
    if (state) { state.textContent = 'On'; state.classList.add('on'); }
  });

  await expect(page.locator('.chatNotificationDisclosure')).toHaveAttribute('open', '');
  await expect(page.locator('[data-switch-state-for="pushTeamToggle"]')).toHaveText('On');
  await expect(page.locator('#pushTeamToggle')).toBeChecked();

  const metrics = await page.evaluate(() => {
    const rowTitle = document.querySelector('#pushTeamToggle')?.closest('label')?.querySelector('b');
    const rowDetail = document.querySelector('#pushTeamToggle')?.closest('label')?.querySelector('small');
    const toggle = document.getElementById('pushTeamToggle');
    const state = document.querySelector('[data-switch-state-for="pushTeamToggle"]');
    const onStyle = toggle ? getComputedStyle(toggle) : null;
    const onBackground = onStyle?.backgroundColor || '';
    if (toggle) toggle.checked = false;
    const offBackground = toggle ? getComputedStyle(toggle).backgroundColor : '';
    if (toggle) toggle.checked = true;
    return {
      titleSize: rowTitle ? parseFloat(getComputedStyle(rowTitle).fontSize) : 0,
      detailSize: rowDetail ? parseFloat(getComputedStyle(rowDetail).fontSize) : 0,
      toggleWidth: toggle ? toggle.getBoundingClientRect().width : 0,
      toggleHeight: toggle ? toggle.getBoundingClientRect().height : 0,
      stateVisible: state ? state.getBoundingClientRect().width > 0 : false,
      onBackground,
      offBackground
    };
  });
  expect(metrics.titleSize).toBeGreaterThanOrEqual(15);
  expect(metrics.detailSize).toBeGreaterThanOrEqual(12);
  expect(metrics.toggleWidth).toBeGreaterThanOrEqual(52);
  expect(metrics.toggleHeight).toBeGreaterThanOrEqual(30);
  expect(metrics.stateVisible).toBe(true);
  expect(metrics.onBackground).not.toBe(metrics.offBackground);
  await captureReview(page, 'chat-notification-settings');
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

test('central Quick Actions rudder opens actions without becoming a fifth destination', async ({ page }) => {
  await openShell(page);
  await expect(page.locator('[data-react-navigation="ready"]')).toHaveCount(1);
  const rudder = page.locator('.bottom [data-quick-rudder]');
  await expect(rudder).toBeVisible();
  await expect(rudder).toHaveAttribute('aria-label', 'Quick actions');
  const before = await page.locator('body').getAttribute('data-view');

  await rudder.click();
  await expect(page.locator('#quickActionsSheet')).toHaveAttribute('open', '');
  await expect(page.locator('#quickActionsSheet')).toContainText('What do you need to do?');
  await expect(page.locator('#quickActionsSheet')).toContainText('Report an absence');
  await expect(page.locator('#quickActionsSheet')).toContainText('Add overtime cover');
  await expect(page.locator('#quickActionsSheet')).toContainText('Review this night');
  await expect(page.locator('#quickActionsSheet')).toContainText('New private message');
  await expect(page.locator('#quickActionsSheet')).toContainText('Share Night Roster');
  expect(await page.locator('body').getAttribute('data-view')).toBe(before);

  const rudderBox = await rudder.boundingBox();
  expect(rudderBox).not.toBeNull();
  expect(rudderBox.height).toBeGreaterThanOrEqual(54);

  await page.getByRole('button', { name: /Review this night|Review changes needing attention/ }).click();
  await expect(page.locator('#quickActionsSheet')).not.toHaveAttribute('open', '');
  await expect(page.locator('#changes')).toBeVisible();

  await page.locator('.bottom [data-quick-rudder]').click();
  await page.getByRole('button', { name: 'Share Night Roster' }).click();
  await expect(page.locator('#shareAppDialog')).toHaveAttribute('open', '');
  await expect(page.locator('#shareAppDialog')).toContainText('Scan to get Night Roster');
});

test('bottom-tab taps change views without staging full application pages', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile transition regression');
  await openShell(page);
  await expect(page.locator('[data-react-navigation="ready"]')).toHaveCount(1);
  await page.evaluate(() => window.show('today'));

  await page.locator('.bottom button[data-v="changes"]').click();
  await expect(page.locator('#changes')).toBeVisible();
  await expect(page.locator('#today')).toHaveClass(/hidden/);
  await expect(page.locator('main')).not.toHaveClass(/viewSwipeStage|viewSwipeSettling/);
  await expect(page.locator('body')).not.toHaveClass(/viewTransitioning/);
  await expect.poll(async () => {
    const activeIndicator = await page.locator('.tabSlidingIndicator').boundingBox();
    const changesTab = await page.locator('.bottom button[data-v="changes"]').boundingBox();
    if (!activeIndicator || !changesTab) return Number.POSITIVE_INFINITY;
    return Math.abs(activeIndicator.x - changesTab.x);
  }, { timeout: 1200, intervals: [40, 80, 120, 180] }).toBeLessThan(4);
  await expect(page.locator('#changes')).toBeVisible();
});

test('page swipes decide the destination without dragging heavy screens behind the finger', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'real phone gesture regression');
  await openShell(page);
  await expect(page.locator('[data-react-navigation="ready"]')).toHaveCount(1);
  await page.evaluate(() => window.show('today'));

  const safe = await page.evaluate(() => {
    const blocked = 'button,a,input,select,textarea,summary,[role="button"],[contenteditable="true"]';
    for (let y = 220; y < Math.min(window.innerHeight - 120, 620); y += 14) {
      for (const x of [300, 235, 160, 90]) {
        const target = document.elementFromPoint(x, y);
        if (target?.closest('#today') && !target.closest(blocked)) return { x, y };
      }
    }
    return null;
  });
  expect(safe).not.toBeNull();

  const before = await page.locator('#today').boundingBox();
  let during;
  await realTouchSwipe(page, safe, { x: Math.max(24, safe.x - 190), y: safe.y + 10 }, async () => {
    during = await page.locator('#today').boundingBox();
    await expect(page.locator('main')).not.toHaveClass(/viewSwipeStage|viewSwipeSettling/);
  });
  expect(Math.abs(during.x - before.x)).toBeLessThanOrEqual(1);
  await expect(page.locator('#changes')).toBeVisible();

  const verticalStart = { x: 190, y: 360 };
  await realTouchPath(page, [
    verticalStart,
    { x: verticalStart.x + 4, y: verticalStart.y + 12 },
    { x: verticalStart.x + 7, y: verticalStart.y + 48 },
    { x: verticalStart.x + 8, y: verticalStart.y + 104 }
  ]);
  await expect(page.locator('#changes')).toBeVisible();
});

test('interactive controls keep horizontal gestures for themselves', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'real phone gesture regression');
  await openShell(page);
  await page.evaluate(() => window.show('changes'));
  const workflowButton = page.locator('#changes [data-changes-step]').first();
  await workflowButton.scrollIntoViewIfNeeded();
  const box = await workflowButton.boundingBox();
  expect(box).not.toBeNull();
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await realTouchSwipe(page, point, { x: Math.min((page.viewportSize()?.width || 390) - 20, point.x + 150), y: point.y + 4 });
  await expect(page.locator('#changes')).toBeVisible();
});

test('saved vertical positions survive lightweight tab changes', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile scroll-position regression');
  await openShell(page);
  await page.evaluate(() => window.show('breaks'));
  await page.evaluate(() => {
    const spacer = document.createElement('div');
    spacer.id = 'lightweightScrollRegressionSpacer';
    spacer.style.height = '1100px';
    document.getElementById('breaks').appendChild(spacer);
    window.scrollTo(0, 520);
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(250);

  await page.locator('.bottom button[data-v="changes"]').click();
  await expect(page.locator('#changes')).toBeVisible();
  await expect(page.locator('main')).not.toHaveClass(/viewSwipeStage|viewSwipeSettling/);

  await page.locator('.bottom button[data-v="breaks"]').click();
  await expect(page.locator('#breaks')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(250);
});

test('dragging across the dock chooses a destination only when the gesture ends', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'real phone gesture regression');
  await openShell(page);
  await page.evaluate(() => window.show('today'));
  const bar = await page.locator('.bottom').boundingBox();
  const nightTab = await page.locator('.bottom button[data-v="today"]').boundingBox();
  const chatTab = await page.locator('.bottom button[data-v="chat"]').boundingBox();
  const indicatorBefore = await page.locator('.tabSlidingIndicator').boundingBox();

  await realTouchSwipe(page,
    { x: nightTab.x + nightTab.width / 2, y: bar.y + bar.height / 2 },
    { x: chatTab.x + chatTab.width / 2, y: bar.y + bar.height / 2 },
    async () => {
      const indicatorDuring = await page.locator('.tabSlidingIndicator').boundingBox();
      expect(Math.abs(indicatorDuring.x - indicatorBefore.x)).toBeLessThan(4);
      await expect(page.locator('#today')).toBeVisible();
    });

  await expect(page.locator('#chat')).toBeVisible();
  await expect.poll(async () => Math.abs((await page.locator('.tabSlidingIndicator').boundingBox()).x - chatTab.x)).toBeLessThan(4);
  await expect(page.locator('.bottom')).not.toHaveAttribute('data-glass-touching');
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
    document.getElementById('authGate').classList.add('hidden');
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
    if (auth) auth.classList.add('hidden');
    window.onboardingChatIntro = true;
    window.onboardingStep = 0;
    window.onboardingDirection = 1;
    window.renderOnboarding();
    const dialog = document.getElementById('onboardingDialog');
    if (dialog && !dialog.open) dialog.showModal();
  });

  await expect(page.locator('#onboardingDialog')).toBeVisible();
  await expect(page.locator('#onboardingTitle')).toContainText('Team chat, when you need it');
  await expect(page.locator('#onboardingContent')).toContainText('tonight’s roster');
  await expect(page.locator('#onboardingContent')).toContainText('never patient-identifiable');
  await expect(page.locator('#onboardingStepLabel')).toContainText('Chat');
  if (process.env.CI) await page.waitForTimeout(900);
  await captureReview(page, 'onboarding');
  await expect(page.locator('#onboardingProgress')).toHaveAttribute('aria-valuemax', '1');
  await page.evaluate(() => {
    window.onboardingChatIntro = false;
    window.onboardingFeatureKey = '';
    window.onboardingGuideMenu = false;
    window.onboardingStep = 1;
    window.renderOnboarding();
  });
  await expect(page.locator('#onboardingProgress')).toHaveAttribute('aria-valuemax', '3');
  await expect(page.locator('#onboardingProgress')).toHaveAttribute('aria-valuenow', '2');
  await expect(page.locator('#onboardingTitle')).toContainText('What matters to you stays first');
  await expect(page.locator('#onboardingTitle')).toBeFocused();
});

test('App Guide opens reusable contextual help without resetting first-use setup', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    localStorage.setItem('anaes_onboarding_complete_v34', '1');
    localStorage.setItem('anaes_education_state_v1', JSON.stringify({ main: 2, chat: 1, changes: 1, breaks: 1 }));
    window.currentUserProfile = { display_name: 'Andre Bartolo', email: 'andre@example.test', user_role: 'member' };
    window.openOnboardingReplay();
  });
  const dialog = page.locator('#onboardingDialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#onboardingTitle')).toContainText('Help that takes you to the right place');
  await expect(dialog.locator('.appGuideList button')).toHaveCount(6);
  await expect(dialog.locator('.appGuideList')).toContainText('Team Chat');
  await expect(dialog.locator('#onboardingStepLabel')).toHaveText('App guide');
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
    document.getElementById('datePick').value = '2026-09-26';
    document.getElementById('headerLiveText').textContent = 'Live';
    window.dispatchEvent(new CustomEvent('roster:personal-night', { detail: {
      date: '2026-09-26', displayName: 'André Bartolo', jobTitle: 'Anaesthetic Nurse', avatarUrl: '', initial: 'A',
      assignmentLabel: 'Tonight’s assignment', title: 'Pager', detail: 'Labour Ward first part',
      period: '00:00–03:30', breakLabel: 'Second break', contextLabel: 'Working with',
      context: 'Michael Debono', changedLabel: '', action: 'role', pending: false, pendingOther: '', liveStatus: 'On duty now'
    }}));
    window.dispatchEvent(new CustomEvent('roster:night', { detail: {
      nurseCount: 6, absenceCount: 0, overtimeCount: 0, taskCount: 0, decisionTasks: 0,
      confirmNeeded: false, alert: '', firstTask: '', labourPending: false,
      breakLabel: 'Second break', chatUnread: 4, liveState: 'On duty now',
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

  await expect(page.locator('#personalNightCard')).not.toContainText('Tonight’s assignment');
  await expect(page.locator('#personalNightHeading')).toHaveText('Your night');
  await expect(page.locator('#personalNightCard .personalHeroEyebrow')).toHaveCount(0);
  await expect(page.locator('#personalNightCard .personalHeroMoreQuiet')).toHaveCount(0);
  await expect(page.locator('#personalNightCard')).not.toContainText('Personalise this view');
  const nightOrder = await page.evaluate(() => {
    const hero = document.getElementById('personalNight');
    const date = document.querySelector('#today .nightDateShell');
    return Boolean(hero && date && date.getBoundingClientRect().top < hero.getBoundingClientRect().top);
  });
  expect(nightOrder).toBe(true);
  await expect(page.locator('#personalNightCard > article.personalHeroSurface')).toHaveCount(1);
  await expect(page.locator('#personalNightCard > .personalHeroSurface > .personalIdentity')).toHaveCount(1);
  await expect(page.locator('#roles')).toContainText('André Bartolo');
  await expect(page.locator('#roles > .nightSituationTimeline')).toHaveCount(1);
  await expect(page.locator('#roles .nightSituationTimeline > .rosterRow')).toHaveCount(2);
  await expect(page.locator('#nightStatusRow')).toContainText('Plan ready');
  await expect(page.locator('#nightStatusRow > .nightSignal')).toContainText('6 nurses');
  await expect(page.locator('#nightStatusRow .nightQuickStrip')).toHaveCount(0);
  await expect(page.locator('#personalNightCard .personalHeroFactGrid')).toContainText('Break');
  await expect(page.locator('#personalNightCard .personalHeroFactGrid')).toContainText('Second break');
  await expect(page.locator('#today .nightOverviewBoard')).toContainText('Team allocation');
  await expect(page.locator('#today .nightOverviewBoard')).toContainText('Changes tonight');
  const nightSurfaces = await page.evaluate(() => {
    const hero = document.querySelector('#personalNightCard > article');
    const board = document.querySelector('#today .nightOverviewBoard');
    if (!hero || !board) return null;
    const h = hero.getBoundingClientRect();
    const b = board.getBoundingClientRect();
    return { leftDelta: Math.abs(h.left - b.left), widthDelta: Math.abs(h.width - b.width) };
  });
  expect(nightSurfaces).not.toBeNull();
  expect(nightSurfaces.leftDelta).toBeLessThanOrEqual(2);
  expect(nightSurfaces.widthDelta).toBeLessThanOrEqual(2);
  await expect(page.locator('#roles .jumpToMeButton')).toHaveText(/Jump to me/);
  await page.evaluate(() => { const button = document.querySelector('#today .prettyDateButton'); if (button) button.textContent = 'Saturday 26 Sep'; });
  await captureReview(page, 'night');
  await page.evaluate(() => { document.documentElement.setAttribute('data-theme', 'dark'); document.body.classList.add('dark'); });
  await captureReview(page, 'night-dark');
  await page.evaluate(() => { document.documentElement.setAttribute('data-theme', 'light'); document.body.classList.remove('dark'); });
  await expect(page.locator('#today .nightTeamDetails')).not.toHaveAttribute('open');
  await page.locator('#today .nightTeamDetails summary').click();
  await expect(page.locator('#today .nightTeamDetails')).toHaveAttribute('open');
  const dock = await page.locator('.bottom').boundingBox();
  const actionDisc = await page.locator('.bottom .quickRudderDisc').boundingBox();
  expect(dock).not.toBeNull();
  expect(dock.height).toBeLessThanOrEqual(66);
  expect(actionDisc).not.toBeNull();
  expect(actionDisc.width).toBeLessThanOrEqual(38);
  expect(actionDisc.height).toBeLessThanOrEqual(38);
  await expect(page.locator('.bottom button[data-v]')).toHaveCount(4);
  await expect(page.locator('.bottom .quickRudder')).toHaveCount(1);
  await expect(page.locator('.bottom .quickRudderLabel')).toHaveText('Actions');
  const mainPaddingBottom = await page.locator('main').evaluate(el => parseFloat(getComputedStyle(el).paddingBottom));
  expect(mainPaddingBottom).toBeGreaterThanOrEqual(90);
  await page.evaluate(() => window.show('breaks'));
  await expect(page.locator('#breakList')).toContainText('First break');
  await expect(page.locator('#breakList')).toContainText('Second break');
  await expect(page.locator('#breakList > .breakGrid')).toHaveCount(1);
  await expect(page.locator('#breakList .breakScheduleSection')).toHaveCount(2);
  await expect(page.locator('#breakList .breakScheduleOrdinal')).toHaveText(['1', '2']);
  await expect(page.locator('#breakList .breakScheduleHeader').first().locator('small')).toHaveText(/\d+ nurses|Awaiting allocation/);
  await expect(page.locator('#breakList .breakPersonYou')).toContainText('You');
  await expect(page.locator('#breakPersonalSummary')).toContainText('Second break');
  await expect(page.locator('#breakPersonalSummary')).toContainText('André Bartolo');
  const breakDateButtons = await page.locator('#breaks .rosterDateControl > button').evaluateAll(buttons => buttons.map(button => {
    const rect = button.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }));
  expect(breakDateButtons.every(item => item.width >= 43 && item.height >= 43)).toBe(true);
  const breakSummaryTargets = await page.locator('#breakSummaryRow .breakSummaryItem').evaluateAll(items => items.map(item => item.getBoundingClientRect().height));
  expect(breakSummaryTargets.every(height => height >= 60)).toBe(true);
  await expect(page.locator('#breakNotesTitle')).toContainText('Labour Ward / Pager');
  await expect(page.locator('#breaks .breakNotesHeading')).toContainText('Additional coverage');
  const breakBoardStyle = await page.locator('#breakList .breakScheduleBoard').evaluate(el => {
    const style = getComputedStyle(el);
    return { background: style.backgroundColor, borderWidth: parseFloat(style.borderTopWidth), gap: parseFloat(style.gap) };
  });
  expect(breakBoardStyle.borderWidth).toBeGreaterThanOrEqual(1);
  expect(breakBoardStyle.gap).toBe(0);
  await expect(page.locator('#breakList .jumpToMeButton')).toHaveText(/Jump to me/);
  await expect(page.locator('#breakList .coverageRow')).toHaveCount(1);
  const mineStyle = await page.locator('#breakList .breakPerson.mine').evaluate(el => {
    const style = getComputedStyle(el);
    return { radius: parseFloat(style.borderRadius), paddingLeft: parseFloat(style.paddingLeft) };
  });
  expect(mineStyle.radius).toBe(0);
  expect(mineStyle.paddingLeft).toBeGreaterThanOrEqual(15);
  if (test.info().project.name === 'mobile-chromium') {
    const labelHeight = await page.locator('#breakSummaryRow .breakSummaryItem.labour b').evaluate(el => el.getBoundingClientRect().height);
    expect(labelHeight).toBeLessThan(30);
  }
  await captureReview(page, 'breaks');
  await expect(page.locator('#breakDate')).toBeEmpty();
});

test('Night hero keeps assignment facts readable across Android phone widths', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('roster:personal-night', { detail: {
      date: '2026-09-26',
      displayName: 'André Bartolo',
      jobTitle: 'Senior Staff Nurse',
      avatarUrl: '',
      initial: 'A',
      assignmentLabel: 'Tonight’s assignment',
      title: 'Second Part theatre',
      detail: 'Position 2 · emergency operating theatre',
      period: '03:30–07:00',
      breakLabel: 'First break after midnight',
      contextLabel: 'Working with',
      context: 'Michael Debono and overtime colleague',
      changedLabel: '',
      action: 'role',
      pending: false,
      pendingOther: '',
      liveStatus: 'Night selected',
      dutyPart: 'second',
      dutyStartUtc: Date.parse('2026-09-26T22:00:00Z'),
      handoverUtc: Date.parse('2026-09-27T01:30:00Z'),
      dutyEndUtc: Date.parse('2026-09-27T05:00:00Z'),
      handoverLabel: '03:30',
      transitionUtc: 0,
      changed: false,
      clockChange: null
    }}));
  });

  for (const width of [412, 390, 384, 360]) {
    await page.setViewportSize({ width, height: 860 });
    await page.waitForTimeout(30);
    const geometry = await page.locator('#personalNightCard > article').evaluate(hero => {
      const facts = Array.from(hero.querySelectorAll('.personalHeroFact'));
      const title = hero.querySelector('.personalRoleCopy b');
      const detail = hero.querySelector('.personalRoleCopy > span');
      const box = hero.getBoundingClientRect();
      const inside = element => {
        const r = element.getBoundingClientRect();
        return r.left >= box.left - 1 && r.right <= box.right + 1 && r.top >= box.top - 1 && r.bottom <= box.bottom + 1;
      };
      return {
        clientWidth: hero.clientWidth,
        scrollWidth: hero.scrollWidth,
        titleInside: title ? inside(title) : false,
        detailInside: detail ? inside(detail) : false,
        factsInside: facts.every(inside),
        factTops: facts.map(item => Math.round(item.getBoundingClientRect().top)),
        factWhiteSpace: facts.map(item => getComputedStyle(item.querySelector('b')).whiteSpace)
      };
    });
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
    expect(geometry.titleInside).toBe(true);
    expect(geometry.detailInside).toBe(true);
    expect(geometry.factsInside).toBe(true);
    expect(geometry.factWhiteSpace.every(value => value === 'normal')).toBe(true);
    if (width > 360) {
      expect(geometry.factTops[0]).toBe(geometry.factTops[1]);
      expect(geometry.factTops[1]).toBe(geometry.factTops[2]);
    }
    if (width === 360) {
      expect(geometry.factTops[0]).toBe(geometry.factTops[1]);
      expect(geometry.factTops[2]).toBeGreaterThan(geometry.factTops[0]);
    }
  }
});

test('shared Changes workflow becomes a calm completed state', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    window.show('changes');
    window.dispatchEvent(new CustomEvent('roster:changes-workflow', { detail: {
      active: 'staffing',
      steps: [
        { id: 'staffing', label: 'Staffing', detail: '1 overtime', complete: true, attention: false, quiet: false },
        { id: 'allocation', label: 'Allocation', detail: 'Review roles', complete: true, attention: false, quiet: true },
        { id: 'confirm', label: 'Shared', detail: 'Published', complete: true, attention: false, quiet: false }
      ],
      headline: 'Plan shared',
      guidance: 'Staffing and roles are up to date for everyone.',
      tone: 'complete',
      progressValue: 3,
      progressMax: 3,
      progressLabel: '3 of 3 shared',
      draftLabel: ''
    }}));
  });
  const journey = page.locator('#changesWorkflowExperience');
  await expect(journey.locator('.workflowExperience')).toHaveClass(/workflow-complete/);
  await expect(journey).toContainText('Plan shared');
  await expect(journey).toContainText('Shared');
  await expect(journey.locator('.workflowProgress')).toContainText('3 of 3 shared');
  const completedStepDetails = journey.locator('.workflowStepCopy small');
  await expect(completedStepDetails).toHaveCount(3);
  for (let index = 0; index < 3; index += 1) await expect(completedStepDetails.nth(index)).toBeHidden();
  await captureReview(page, 'changes-shared');
});

test('unresolved seventh-nurse decision still names recorded overtime without clipping it', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('roster:night', { detail: {
      nurseCount: 8, absenceCount: 0, overtimeCount: 2, overtimeNames: ['Dani Ilieva', 'Alexandra Constantinou'],
      taskCount: 1, decisionTasks: 1, confirmNeeded: true,
      alert: 'Seven-nurse arrangement: decide whether Yentl moves from Labour Ward / Pager into the seventh position.',
      firstTask: 'Choose whether Yentl moves to the seventh position', labourPending: false,
      roles: [], extras: [], contextLabel: 'Provisional'
    }}));
  });
  await expect(page.locator('#nightStatusRow')).toContainText('Review needed');
  await expect(page.locator('#nightStatusRow')).toContainText('2 overtime');
  const names = page.locator('#nightStatusRow .nightSignalStaffingNames');
  await expect(names).toContainText('Overtime: Dani Ilieva, Alexandra Constantinou');
  const geometry = await names.evaluate(element => {
    const style = getComputedStyle(element);
    return { whiteSpace: style.whiteSpace, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
  });
  expect(geometry.whiteSpace).toBe('normal');
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
});

test('administrator attention badge stays fully visible inside the settings control', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    const button = document.getElementById('adminSettingsBtn');
    button.classList.remove('hidden');
    let badge = document.getElementById('adminAttentionBadge');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'adminAttentionBadge';
      badge.className = 'adminAttentionBadge';
      badge.textContent = '1';
      button.appendChild(badge);
    } else {
      badge.classList.remove('hidden');
      badge.textContent = '1';
    }
  });
  const geometry = await page.evaluate(() => {
    const button = document.getElementById('adminSettingsBtn').getBoundingClientRect();
    const badge = document.getElementById('adminAttentionBadge').getBoundingClientRect();
    return { button: { left: button.left, top: button.top, right: button.right, bottom: button.bottom }, badge: { left: badge.left, top: badge.top, right: badge.right, bottom: badge.bottom } };
  });
  expect(geometry.badge.top).toBeGreaterThanOrEqual(geometry.button.top);
  expect(geometry.badge.right).toBeLessThanOrEqual(geometry.button.right);
  await expect(page.locator('#adminAttentionBadge')).toBeVisible();
});

test('administrator badge ignores selected-night work but still reports admin work', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    const button = document.getElementById('adminSettingsBtn');
    button.classList.remove('hidden');
    window.currentUserProfile = { ...(window.currentUserProfile || {}), user_role: 'admin' };
    window.accessRequests = [];
    window.rosterSettings = { ...(window.rosterSettings || {}), published_until: '2099-12-30' };
    window.R = [{ date: '2099-01-01' }];
    window.idx = 0;
    window.cur = () => ({ date: '2099-01-01' });
    window.staffingPlan = () => ({});
    window.workflowTaskDetails = () => ['Resolve selected-night allocation'];
    window.updateAdminAttentionBadge();
  });
  await expect(page.locator('#adminAttentionBadge')).toBeHidden();
  await expect(page.locator('#adminSettingsBtn')).toHaveAttribute('aria-label', 'Administrator tools');

  await page.evaluate(() => {
    window.accessRequests = [{ user_id: 'pending-user' }];
    window.updateAdminAttentionBadge();
  });
  await expect(page.locator('#adminAttentionBadge')).toHaveText('1');
  await expect(page.locator('#adminAttentionBadge')).toBeVisible();
  await expect(page.locator('#adminSettingsBtn')).toHaveAttribute('aria-label', /1 access request/);
});

test('confirmed seven-nurse context stays Plan ready instead of forcing review', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('roster:night', { detail: {
      nurseCount: 7, absenceCount: 0, overtimeCount: 1, taskCount: 0, decisionTasks: 0,
      confirmNeeded: false,
      alert: 'Seven-nurse arrangement: Shaun moves from Labour Ward / Pager into the seventh position. Overtime fills the vacated role.',
      firstTask: '', labourPending: false,
      roles: [], extras: []
    }}));
  });
  await expect(page.locator('#nightStatusRow')).toContainText('Plan ready');
  await expect(page.locator('#nightStatusRow')).not.toContainText('Review needed');
  await expect(page.locator('#alerts .compactNotice')).toHaveClass(/informational/);
  await expect(page.locator('#alerts .compactNotice')).not.toHaveClass(/warn/);
});

test('update banner obeys hidden and Night-only visibility states', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    window.show && window.show('today');
    const source = document.getElementById('updateBanner');
    const probe = source.cloneNode(true);
    probe.id = 'updateBannerCssProbe';
    probe.classList.remove('hidden');
    source.parentNode.appendChild(probe);
  });
  const probe = page.locator('#updateBannerCssProbe');
  await expect(page.locator('#today')).toBeVisible();
  await expect(probe).toBeVisible();

  await page.evaluate(() => document.getElementById('updateBannerCssProbe').classList.add('hidden'));
  await expect(probe).toBeHidden();

  await page.evaluate(() => {
    document.getElementById('updateBannerCssProbe').classList.remove('hidden');
    window.show && window.show('changes');
  });
  await expect(page.locator('#changes')).toBeVisible();
  await expect(probe).toBeHidden();
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
  await page.locator('#absenceFormExperience .staffingAddButton').click();
  await expect(page.locator('#absenceFormExperience #absentName')).toContainText('Nurse One');
  await page.locator('#absenceFormExperience .staffingSheetClose').evaluate(button => button.click());
  await expect(page.locator('#absenceFormExperience .staffingSheet')).toHaveCount(0);
  await page.locator('#overtimeFormExperience .staffingAddButton').click();
  await expect(page.locator('#overtimeFormExperience #overtimeName')).toHaveAttribute('placeholder', "Type the nurse's name");
  await page.locator('#overtimeFormExperience .staffingSheetClose').evaluate(button => button.click());
  await expect(page.locator('#overtimeFormExperience .staffingSheet')).toHaveCount(0);
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
      tone: 'attention',
      progressValue: 1,
      progressMax: 3,
      progressLabel: '1 of 3 resolved',
      draftLabel: 'Unsaved allocation selections'
    }}));
  });
  const journey = page.locator('#changesWorkflowExperience');
  await expect(journey).toHaveAttribute('data-react-ready', 'true');
  await expect(journey.locator('[role="status"]')).toContainText('Choose a nurse for First Part 1');
  await expect(journey.locator('.workflowProgress')).toContainText('1 of 3 resolved');
  await expect(journey.locator('.workflowProgress')).toContainText('Unsaved allocation selections');
  await expect(journey.locator('.workflowProgressTrack')).toHaveAttribute('aria-valuenow', '1');
  const activeWorkflow = journey.locator('[data-changes-step="staffing"]');
  const workflowMetrics = await activeWorkflow.evaluate(el => {
    const selection = el.querySelector('.workflowSelection');
    const style = getComputedStyle(el);
    const selectionStyle = selection ? getComputedStyle(selection) : null;
    return {
      height: el.getBoundingClientRect().height,
      color: style.color,
      selectionBorder: selectionStyle ? parseFloat(selectionStyle.borderTopWidth) : -1
    };
  });
  expect(workflowMetrics.height).toBeLessThanOrEqual(54);
  expect(workflowMetrics.selectionBorder).toBe(0);
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
    active: 'staffing', steps: [], headline: '', guidance: '', tone: 'automatic', progressValue: 3, progressMax: 3, progressLabel: 'Automatic plan ready'
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

test('accepted PWA updates wait for unfinished local Changes work', async ({ page }) => {
  await page.route('**/service-worker.js', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: 'self.addEventListener("install",function(){});'
  }));
  await openShell(page);
  const state = await page.evaluate(() => {
    const date = '2026-09-26';
    window.R = [{ date }];
    window.idx = 0;
    window.allocationDrafts[date] = { __smokeDraft: 'unsaved-selection' };
    window.__updateActivated = false;
    window.updateRegistration = { waiting: { postMessage: () => { window.__updateActivated = true; } } };
    const draftCount = window.allLocalChangesDraftParts().length;
    window.applyWaitingUpdate();
    return { draftCount, activated: window.__updateActivated };
  });
  expect(state.draftCount).toBeGreaterThan(0);
  expect(state.activated).toBe(false);
  await expect(page.locator('#toast')).toContainText('Finish your unsaved Changes before updating');
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
  if (test.info().project.name === 'desktop-chromium') {
    const width = await card.evaluate(el => el.getBoundingClientRect().width);
    expect(width).toBeGreaterThan(300);
  }
  await captureReview(page, 'full-roster');
  await card.click();
  expect(await page.evaluate(() => window.__openedNights)).toContain(4);
});

test('typed account controls preserve appearance and app actions', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    window.__accountActions = [];
    window.addEventListener('roster:account-action', event => window.__accountActions.push(event.detail));
    window.dispatchEvent(new CustomEvent('roster:account', { detail: { theme: 'system', installed: false, profile: {
      name: 'Andre', jobTitle: 'Anaesthetic Nurse', rosterName: 'Nurse One', approvedName: 'Andre Bartolo', email: 'andre@example.test',
      options: [{ value: 'Nurse One', label: 'Nurse One' }], initial: 'A', photoUrl: '', featureAvailable: true, pendingPhoto: false, changed: false,
      accentKey: 'teal', textScale: 'standard', motionPref: 'system', avatarStyle: 'monogram', greetingEnabled: true
    }, shift: {
      name: 'Night Owls', tagline: 'Anaesthetic Night Team', accentKey: 'violet', symbol: 'moon', initials: 'NO', photoUrl: '',
      pendingPhoto: false, featureAvailable: true, updatedBy: 'Test Nurse'
    } } }));
    window.dispatchEvent(new CustomEvent('roster:passkeys', { detail: { message: '', items: [{ id: 'passkey-1', label: 'Night Roster on iPhone' }] } }));
    window.prepareAccountInformationArchitecture();
    window.showAccountSection('home');
    document.getElementById('accountSheet').showModal();
  });

  await expect(page.locator('#accountSheetTitle')).toHaveText('Account');
  await expect(page.locator('#accountHomeHub')).toContainText('Personalise');
  await expect(page.locator('#accountHomeHub')).toContainText('Preferences');
  await expect(page.locator('#accountHomeHub')).toContainText('Security');
  await expect(page.locator('#accountHomeHub')).toContainText('App & Help');
  await expect(page.locator('#profileExperience')).toBeHidden();
  await page.locator('#accountHomeHub [data-account-section="profile"]').click();
  await expect(page.locator('#accountSheetTitle')).toHaveText('Personalise');
  await expect(page.locator('#accountSheet')).toContainText('Shared roster actions use this approved identity.');
  await expect(page.locator('#profileExperience')).toContainText('Personalisation Studio');
  await expect(page.locator('#profileName')).toHaveValue('Andre');
  await expect(page.locator('#profilePhotoPreview')).toBeHidden();
  await expect(page.locator('#profilePhotoInitial')).toBeVisible();
  await expect(page.locator('#profileRosterName')).toContainText('Nurse One');
  await expect(page.locator('.personalisationTabs')).toContainText('Our Shift');
  await expect(page.locator('#profileAccentKey')).toHaveValue('teal');
  await page.locator('.personalisationTabs button', { hasText: 'Our Shift' }).click();
  await expect(page.locator('#shiftStudioName')).toHaveValue('Night Owls');
  await expect(page.locator('#shiftStudioTagline')).toHaveValue('Anaesthetic Night Team');
  await expect(page.locator('#saveShiftPersonalisationBtn')).toBeHidden();
  await page.locator('#shiftStudioTagline').fill('Keeping the night moving');
  await expect(page.locator('#saveShiftPersonalisationBtn')).toBeVisible();
  await page.locator('.personalisationTabs button', { hasText: 'Me' }).click();
  await captureReview(page, 'account');
  await page.locator('#profileName').fill('André');
  await expect(page.locator('#saveProfileBtn')).toBeVisible();
  const bounds = await page.locator('#accountSheet').boundingBox();
  expect(bounds.width).toBeLessThanOrEqual(page.viewportSize().width);
  if (page.viewportSize().width >= 760) expect(bounds.y).toBeGreaterThan(30);
  await page.locator('#accountBackBtn').click();
  await page.locator('#accountHomeHub [data-account-section="preferences"]').click();
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
  await page.locator('#accountBackBtn').click();
  await page.locator('#accountHomeHub [data-account-section="security"]').click();
  await expect(page.locator('#passkeyList')).toContainText('Night Roster on iPhone');
  await expect(page.locator('#securityHeading')).toHaveText('Sign-in security');
  await page.locator('#accountBackBtn').click();
  await page.locator('#accountHomeHub [data-account-section="help"]').click();
  await expect(page.locator('#accountActionsExperience')).toContainText('Install Night Roster');
  await expect(page.locator('#accountActionsExperience button', { hasText: 'App guide' })).toBeVisible();
  await expect(page.locator('#accountActionsExperience button', { hasText: 'What’s new' })).toBeVisible();
  await expect(page.locator('#accountActionsExperience button', { hasText: 'Version history' })).toBeVisible();
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
    window.switchAdminTab('home', false);
  });

  await expect(page.locator('#adminHome')).toContainText('Tonight');
  await expect(page.locator('#adminHome')).toContainText('People & Access');
  await expect(page.locator('#adminHome')).toContainText('Roster Management');
  await expect(page.locator('#adminHome')).toContainText('System');
  await page.locator('#adminHome [data-admin-tab="access"]').click();
  await expect(page.locator('#adminAccountsExperience')).toContainText('Pending access');
  await captureReview(page, 'administrator');
  await expect(page.locator('#adminAccountsExperience')).toContainText('Current account');
  await expect(page.locator('#accountName')).toHaveAttribute('placeholder', 'Nurse name');
  await expect(page.locator('#adminAccountsExperience button', { hasText: 'Deactivate' }).first()).toBeDisabled();
  await expect(page.locator('#adminAccess')).toBeVisible();
  await expect(page.locator('#adminAccess .adminDetailNav')).toContainText('People & Access');
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

test('one quiet glossy scroll bar appears consistently after page headers leave the viewport', async ({ page }) => {
  await openShell(page);
  const chrome = page.locator('#reactScrollChrome .scrollGlassHeader');
  await expect(chrome).toHaveCount(1);

  await page.evaluate(() => {
    const spacer = document.createElement('div');
    spacer.id = 'scrollGlassSmokeSpacer';
    spacer.style.height = '900px';
    document.getElementById('today')?.appendChild(spacer);
    window.scrollTo(0, 180);
  });
  await expect(chrome).toHaveAttribute('data-mode', 'compact');
  await expect.poll(() => chrome.evaluate(el => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0.75);
  await expect(page.locator('#reactScrollChrome .scrollGlassCompactTitle')).toHaveText('Night');
  await expect(page.locator('#reactScrollChrome .scrollGlassMaterial')).toHaveCount(1);
  await expect(page.locator('#nightCompactContext')).toBeHidden();

  await page.evaluate(() => {
    document.getElementById('scrollGlassSmokeSpacer')?.remove();
    window.scrollTo(0, 0);
    window.show('changes');
    const spacer = document.createElement('div');
    spacer.id = 'scrollGlassChangesSpacer';
    spacer.style.height = '900px';
    document.getElementById('changes')?.appendChild(spacer);
    window.scrollTo(0, 180);
  });
  await expect(chrome).toHaveAttribute('data-mode', 'compact');
  await expect(page.locator('#reactScrollChrome .scrollGlassCompactTitle')).toHaveText('Changes');

  const compactChromeMetrics = await chrome.evaluate(el => ({
    height: el.getBoundingClientRect().height,
    titleSize: parseFloat(getComputedStyle(el.querySelector('.scrollGlassCompactTitle')).fontSize)
  }));
  expect(compactChromeMetrics.height).toBeGreaterThanOrEqual(50);
  expect(compactChromeMetrics.height).toBeLessThanOrEqual(58);
  expect(compactChromeMetrics.titleSize).toBeGreaterThanOrEqual(15);

  const compactMaterial = await page.locator('#reactScrollChrome .scrollGlassMaterial').evaluate(el => {
    const style = getComputedStyle(el);
    const rgba = style.backgroundColor.match(/[\d.]+/g)?.map(Number) || [];
    return {
      backdrop: style.backdropFilter || style.webkitBackdropFilter || 'none',
      alpha: rgba.length >= 4 ? rgba[3] : 1,
      radius: parseFloat(style.borderRadius)
    };
  });
  expect(compactMaterial.backdrop).not.toBe('none');
  expect(compactMaterial.alpha).toBeLessThanOrEqual(0.5);
  expect(compactMaterial.radius).toBeLessThanOrEqual(1);

  await page.evaluate(() => {
    window.show('chat');
    window.scrollTo(0, 180);
  });
  await expect.poll(() => chrome.getAttribute('class')).toContain('scrollGlass-chat');
  await expect(page.locator('#reactScrollChrome .scrollGlassCompactTitle')).toHaveText('Chat');
  await expect(page.locator('main')).not.toHaveClass(/viewSwipeStage|viewSwipeSettling/);
  await expect(page.locator('body')).not.toHaveClass(/viewTransitioning/);

  await page.evaluate(() => {
    document.getElementById('scrollGlassChangesSpacer')?.remove();
    window.scrollTo(0, 0);
  });

  const bottomMaterial = await page.evaluate(() => {
    const element = document.querySelector('.bottom.reactTabs');
    if (!element) return null;
    const style = getComputedStyle(element);
    const rgba = style.backgroundColor.match(/[\d.]+/g)?.map(Number) || [];
    return {
      backdrop: style.backdropFilter || style.webkitBackdropFilter || 'none',
      alpha: rgba.length >= 4 ? rgba[3] : 1
    };
  });
  expect(bottomMaterial).toBeTruthy();
  expect(bottomMaterial.backdrop).not.toBe('none');
  expect(bottomMaterial.alpha).toBeLessThanOrEqual(0.4);
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
  await expect(page.locator('#chatInboxHeading')).toHaveText('Team and direct messages');
  await expect(page.locator('#chatTeamEntry')).toContainText('Anaesthetic Team');
  await expect(page.locator('#chatShiftNameBtn')).toBeVisible();
  await captureReview(page, 'chat');
  await expect(page.locator('#chatConversationList')).toContainText('2');
  await expect(page.locator('#chatConversationList button[aria-label]')).toHaveAttribute('aria-label', 'Open conversation with Maria Borg, 2 unread');

  if (page.viewportSize().width >= 760) await expect(page.locator('#chatDesktopEmpty')).toBeVisible();

  await page.evaluate(() => {
    const chat = document.getElementById('chat');
    const thread = document.getElementById('chatTeamThread');
    chat.classList.add('chat-thread-open', 'chat-team-open');
    document.body.classList.add('chatThreadMode');
    thread.classList.remove('hidden');
  });

  await expect(page.locator('#chatTeamThread')).toBeVisible();
  if (page.viewportSize().width >= 760) await expect(page.locator('#chatDesktopEmpty')).toBeHidden();
  await captureReview(page, 'chat-team-thread');

  await expect(page.locator('#chatTeamInput')).toHaveAttribute('data-chat-composer', 'react');
  await expect(page.locator('#chatTeamComposer .chatComposerGlass')).toHaveCount(1);
  await expect(page.locator('#chatTeamMessages .chatTeamBubble')).toHaveCount(1);

  if (page.viewportSize().width < 760) {
    const composer = await page.locator('#chatTeamComposer').boundingBox();
    const dock = await page.locator('.bottom').boundingBox();
    expect(composer).not.toBeNull();
    expect(dock).not.toBeNull();
    expect(composer.y + composer.height).toBeLessThanOrEqual(dock.y);
  }
  const composerMaterial = await page.locator('#chatTeamComposer .chatComposerGlass').evaluate(el => {
    const style = getComputedStyle(el);
    return {
      backdrop: style.backdropFilter || style.webkitBackdropFilter || 'none',
      radius: parseFloat(style.borderRadius)
    };
  });
  expect(composerMaterial.backdrop).not.toBe('none');
  expect(composerMaterial.radius).toBeGreaterThanOrEqual(24);
  await expect(page.locator('#chatTeamComposer .liquidControlOverlay')).toHaveCount(0);
  await expect(page.locator('#chatTeamInput')).toHaveCSS('border-top-width', '0px');
  await expect(page.locator('#chatTeamInput')).toHaveAttribute('placeholder', 'Message the team…');
  await expect(page.locator('#chatSafetyInfo .chatRetentionNote')).toHaveCount(0);
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
  await expect(page.locator('#chatTeamMessages')).toContainText('Unread messages');
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
  const editorial = dialog.locator('.releaseEditorial');
  await expect(editorial).toContainText(release.title);
  await expect(editorial).toContainText(release.changes[0]);
  await expect(editorial.locator('.releaseHighlights .releaseHighlight')).toHaveCount(release.changes.length);
  const sizes = await editorial.evaluate(el => ({ width: el.clientWidth, scrollWidth: el.scrollWidth }));
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
  await expect(dialog.locator('.releaseMonthHeading').first()).toBeVisible();
  await expect(dialog.locator('.releaseHistoryItem').first()).toHaveAttribute('open', '');
  await expect(dialog.locator('.releaseHistory')).toHaveAttribute('aria-label', 'Complete Night Roster version history');
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

test('scroll chrome uses the same quiet glossy title bar in Changes and Admin', async ({ page }) => {
  await openShell(page);

  await page.evaluate(() => {
    window.show('changes');
    const spacer = document.createElement('div');
    spacer.id = 'contextualChromeSmokeSpacer';
    spacer.style.height = '1100px';
    document.getElementById('changes')?.appendChild(spacer);
    window.scrollTo(0, 170);
  });

  const chrome = page.locator('#reactScrollChrome .scrollGlassHeader');
  await expect(chrome).toHaveAttribute('data-mode', 'compact');
  await expect(page.locator('#reactScrollChrome .scrollGlassCompactTitle')).toHaveText('Changes');
  await expect(page.locator('#reactScrollChrome .scrollGlassRail')).toHaveCount(0);

  await page.evaluate(() => {
    document.getElementById('contextualChromeSmokeSpacer')?.remove();
    window.scrollTo(0, 0);
    document.getElementById('changes')?.classList.add('hidden');
    document.getElementById('admin')?.classList.remove('hidden');
    document.body.setAttribute('data-view', 'admin');
    window.dispatchEvent(new CustomEvent('roster:viewchange'));
    const spacer = document.createElement('div');
    spacer.id = 'contextualAdminChromeSmokeSpacer';
    spacer.style.height = '1100px';
    document.getElementById('admin')?.appendChild(spacer);
    window.scrollTo(0, 170);
  });

  await expect(chrome).toHaveAttribute('data-mode', 'compact');
  await expect(page.locator('#reactScrollChrome .scrollGlassCompactTitle')).toHaveText('Roster management');
  await expect(page.locator('#reactScrollChrome .scrollGlassRail-admin')).toHaveCount(0);
  await expect(page.locator('#admin .adminTabs')).toBeHidden();
});
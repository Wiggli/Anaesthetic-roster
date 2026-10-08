const { test, expect } = require('@playwright/test');

async function openShell(page) {
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: 'window.supabase={createClient:function(){return null}};'
  }));
  await page.addInitScript(() => {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async function(input, init) {
      const url = typeof input === 'string' ? input : input && input.url || '';
      if (url.includes('/functions/v1/night-roster-ai')) {
        const payload = JSON.parse(init && init.body || '{}');
        const answers = {
          brief: 'You are allocated to Second Part Theatre. Six nurses are confirmed and no roster decisions need attention.',
          changes: 'Since you last checked, Yentl was added as overtime cover. Your allocation is unchanged.',
          explain: 'The deterministic roster engine places you in Second Part Theatre from the effective rotation for this night; AI is only explaining that result.',
          ask: 'You are working with Michael Galea tonight.'
        };
        return new Response(JSON.stringify({ answer: answers[payload.mode] || answers.ask, ai: true, model: 'test-model' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return nativeFetch(input, init);
    };
  });
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
    window.currentAccessToken = 'test-token';
  });
  await page.waitForFunction(() => window.NightRosterAI);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('roster:personal-night', { detail: {
      date: '2026-10-08', displayName: 'Andre', title: 'Second Part Theatre', detail: 'Position 2', period: '03:30–07:00',
      breakLabel: 'First break', contextLabel: 'Working with', context: 'Michael Galea', dutyPart: 'second', liveStatus: 'Next', changed: false
    }}));
    window.dispatchEvent(new CustomEvent('roster:night', { detail: {
      nurseCount: 6, absenceCount: 0, overtimeCount: 1, overtimeNames: ['Yentl Cutajar'], taskCount: 0, decisionTasks: 0,
      confirmNeeded: false, contextLabel: 'Updated night', currentPart: '', dataFreshness: 'Live · just refreshed',
      roles: [{ label: 'Second Part Theatre', names: 'Andre Bartolo + Michael Galea', detail: '03:30–07:00', mine: true }]
    }}));
    window.dispatchEvent(new CustomEvent('roster:recent-activity', { detail: {
      updated: true, updatedCount: 1, sinceLabel: '00:20', items: [{ label: 'Overtime', type: 'overtime', title: 'Added Yentl Cutajar for overtime', detail: 'Overtime staffing', meta: 'Andre · 00:39' }]
    }}));
  });
}

test('@iphone Night AI opens from team information and keeps changes collapsed', async ({ page }, testInfo) => {
  await openShell(page);
  const brief = page.locator('#nightAiBrief');
  await expect(brief).toBeHidden();
  await expect(brief).toContainText('Night brief');
  await expect(page.locator('#nightAiBriefText')).toBeHidden();
  await page.locator('#nightTeamInfoBtn').click();
  await expect(brief).toBeVisible();
  await expect(page.locator('#nightAiBriefText')).toBeVisible();
  await expect(brief).toContainText('Second Part Theatre');
  await expect(brief).toContainText('AI');
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme; document.body.classList.toggle('dark', theme === 'dark'); }, theme);
    await page.screenshot({ path: testInfo.outputPath(`night-information-${theme}.png`) });
  }

  await page.getByRole('button', { name: 'Close night brief' }).click();
  await page.locator('.recentActivityPanel > summary').click();
  const changes = page.locator('#nightAiChangesSummary');
  await expect(changes).toBeVisible();
  await expect(changes).toContainText('AI change summary');
  await expect(changes).toContainText('Yentl');
});

test('Ask Night Roster answers from the supplied roster context', async ({ page }) => {
  await openShell(page);
  await page.locator('#nightTeamInfoBtn').click();
  await page.locator('#nightAiBrief .nightAiAskButton').click();
  const dialog = page.locator('#nightAiDialog');
  await expect(dialog).toHaveAttribute('open', '');
  await expect(dialog).toContainText('Roster and staffing only');
  await page.locator('#nightAiInput').fill('Who am I working with tonight?');
  await page.locator('.nightAiSend').click();
  await expect(page.locator('#nightAiMessages')).toContainText('Michael Galea');
});

test('Explain allocation keeps the deterministic roster engine authoritative', async ({ page }) => {
  await openShell(page);
  await page.locator('#nightTeamInfoBtn').click();
  await page.locator('#nightAiBrief .nightAiWhyButton').click();
  await expect(page.locator('#nightAiDialog')).toHaveAttribute('open', '');
  await expect(page.locator('#nightAiMessages')).toContainText('deterministic roster engine');
  await expect(page.locator('#nightAiMessages')).toContainText('AI is only explaining');
});

test('@iphone Night keeps the header below the safe area and omits empty activity', async ({ page }, testInfo) => {
  await openShell(page);
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--app-safe-top', '59px');
    window.dispatchEvent(new CustomEvent('roster:recent-activity', { detail: { updated: false, updatedCount: 0, items: [] } }));
  });
  await expect(page.locator('#today .recentActivityPanel')).toBeHidden();
  await page.evaluate(() => {
    const spacer = document.createElement('div');
    spacer.style.height = '900px';
    document.getElementById('today').appendChild(spacer);
    window.scrollTo(0, 300);
  });
  const chrome = page.locator('.scrollGlassHeader');
  await expect.poll(() => chrome.evaluate(el => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0.98);
  const metrics = await chrome.evaluate(el => ({
    titleTop: el.querySelector('.scrollGlassCompactTitle').getBoundingClientRect().top,
    transform: getComputedStyle(el).transform,
    backdrop: getComputedStyle(el).backdropFilter,
    stackOpacity: getComputedStyle(el.querySelector('.scrollGlassStack')).opacity
  }));
  expect(metrics.titleTop).toBeGreaterThanOrEqual(59);
  expect(metrics.transform).toBe('none');
  expect(metrics.backdrop).toBe('none');
  expect(metrics.stackOpacity).toBe('1');
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => {
      document.documentElement.dataset.theme = theme;
      document.body.classList.toggle('dark', theme === 'dark');
    }, theme);
    await page.screenshot({ path: testInfo.outputPath(`night-header-${theme}.png`) });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`night-summary-${theme}.png`), fullPage: true });
    await page.evaluate(() => window.scrollBy(0, document.querySelector('.teamOverviewGroup').getBoundingClientRect().top - 130));
    await page.locator('.teamOverviewGroup').screenshot({ path: testInfo.outputPath(`night-team-${theme}.png`) });
    await page.evaluate(() => window.scrollTo(0, 300));
  }
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('roster:recent-activity', { detail: {
    updated: true, updatedCount: 1, items: [{ type: 'absence', label: 'Absence', title: 'Shaun Galea absent', detail: 'Recorded absence', meta: 'André · 20:00' }]
  } })));
  await expect(page.locator('#today .recentActivityPanel')).toBeVisible();
  await expect(page.locator('#nightActivityCount')).toHaveText(' · 1');
  await expect(page.locator('#recentActivityList')).toBeHidden();
  await page.locator('.recentActivityPanel > summary').click();
  await expect(page.locator('#recentActivityList')).toBeVisible();
  await expect(page.locator('#recentActivityList')).toContainText('Shaun Galea absent');
});


test('@iphone Chat thread owns its header without a glass overlay', async ({ page }, testInfo) => {
  await openShell(page);
  await page.evaluate(() => {
    window.show('chat');
    document.documentElement.style.setProperty('--app-safe-top', '59px');
    document.body.classList.add('chatThreadMode');
    document.getElementById('chat').classList.add('chat-thread-open', 'chat-team-open');
    document.getElementById('chatTeamThread').classList.remove('hidden');
    const messages = document.getElementById('chatTeamMessages');
    for (let i = 0; i < 80; i++) {
      const row = document.createElement('p'); row.textContent = 'Long transcript message ' + i; messages.appendChild(row);
    }
  });
  const chrome = page.locator('.scrollGlassHeader');
  await expect(chrome).toHaveAttribute('data-mode', 'off');
  await expect(page.locator('.scrollGlassMaterial')).toHaveCount(0);
  await expect.poll(() => chrome.evaluate(el => Number(getComputedStyle(el).opacity))).toBe(0);
  if (page.viewportSize().width < 760) {
    const back = page.locator('#chatTeamBackBtn');
    await expect(back).toBeVisible();
    expect((await back.boundingBox()).y).toBeGreaterThanOrEqual(59);
    expect(await back.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('chat-safe-header.png') });
  }
  await page.evaluate(() => document.body.classList.remove('chatThreadMode'));
  await expect(chrome).toHaveAttribute('data-mode', 'compact');
});

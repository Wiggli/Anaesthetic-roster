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

test('@iphone Night AI shows a compact AI brief and change summary', async ({ page }) => {
  await openShell(page);
  const brief = page.locator('#nightAiBrief');
  await expect(brief).toBeVisible();
  await expect(brief).toContainText('Night brief');
  await expect(brief).toContainText('Second Part Theatre');
  await expect(brief).toContainText('AI');

  const changes = page.locator('#nightAiChangesSummary');
  await expect(changes).toBeVisible();
  await expect(changes).toContainText('AI change summary');
  await expect(changes).toContainText('Yentl');
});

test('Ask Night Roster answers from the supplied roster context', async ({ page }) => {
  await openShell(page);
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
  await page.locator('#nightAiBrief .nightAiWhyButton').click();
  await expect(page.locator('#nightAiDialog')).toHaveAttribute('open', '');
  await expect(page.locator('#nightAiMessages')).toContainText('deterministic roster engine');
  await expect(page.locator('#nightAiMessages')).toContainText('AI is only explaining');
});

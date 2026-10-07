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
  await page.waitForFunction(() => window.NightIntelligence && document.getElementById('nightIntelligenceCentre'));
}

test('@iphone Night Intelligence stays compact and avoids duplicating the personal Night hero', async ({ page }) => {
  await openShell(page);
  const centre = page.locator('#nightIntelligenceCentre');
  await expect(centre).toBeVisible();
  await expect(page.locator('#nightPhaseSignal')).toHaveCount(0);
  await expect(page.locator('#nightFreshnessSignal')).not.toBeEmpty();
  await expect(page.locator('#nightPresenceSignal')).toBeHidden();
  await expect(page.locator('#nightMyNightAction')).toBeHidden();
  await expect(page.locator('#nightAttentionAction')).toBeHidden();
  await expect(page.locator('#nightCalmToggle')).toBeVisible();
  await expect(page.locator('#nightCalmToggle')).toHaveAccessibleName('Toggle Calm Mode');

  await page.evaluate(() => window.NightIntelligence.openPalette());
  const palette = page.locator('#nightCommandPalette');
  await expect(palette).toHaveAttribute('open', '');
  await expect(palette).toContainText('Search & commands');
  await expect(palette).toContainText('App health');

  const box = await palette.boundingBox();
  const viewport = page.viewportSize();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
});

test('Night Intelligence health, true Focus mode and offline intent stay progressive', async ({ page }) => {
  await openShell(page);

  // The Health Check must be able to reconstruct its dialog body if startup ordering removes it.
  await page.evaluate(() => window.NightIntelligence.openHealth());
  await expect(page.locator('#nightHealthDialog')).toHaveAttribute('open', '');
  await expect(page.locator('#nightHealthDialog')).toContainText('Connection');
  await expect(page.locator('#nightHealthDialog')).toContainText('Roster freshness');
  await page.locator('#nightHealthDialog button[aria-label="Close"]').click();

  // In the compact Night shell the semantic personal section stays mounted, but without
  // a duplicate visible heading it has no visible box until personal roster data renders.
  await expect(page.locator('#personalNight')).toBeHidden();
  await expect(page.locator('#personalNightHeading')).toHaveText('Your night');
  await expect(page.locator('#today .teamOverviewGroup')).toBeVisible();
  await page.evaluate(() => window.NightIntelligence.setCalmMode(true));
  await expect(page.locator('html')).toHaveClass(/nightCalmMode/);
  await expect(page.locator('#nightIntelligenceCentre')).toBeVisible();
  await expect(page.locator('#personalNight')).toBeHidden();
  await expect(page.locator('#today .teamOverviewGroup')).toBeHidden();
  await page.evaluate(() => window.NightIntelligence.setCalmMode(false));
  await expect(page.locator('html')).not.toHaveClass(/nightCalmMode/);
  await expect(page.locator('#today .teamOverviewGroup')).toBeVisible();

  await page.evaluate(() => {
    localStorage.removeItem('anaes_safe_intent_v1');
    window.NightIntelligence.queueSafeIntent('absence', 'Report an absence');
  });
  const intent = await page.evaluate(() => JSON.parse(localStorage.getItem('anaes_safe_intent_v1')));
  expect(intent.action).toBe('absence');
  expect(intent.label).toBe('Report an absence');
  expect(intent.createdAt).toBeTruthy();
});
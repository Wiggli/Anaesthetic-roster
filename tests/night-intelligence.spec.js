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
  await expect(page.locator('#nightIntelligenceExtensions')).toHaveCount(1);
}

test('Night Intelligence surfaces the night and turns Actions into Review when work needs attention', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('roster:personal-night', { detail: {
      date: '2026-10-05',
      displayName: 'Andre',
      title: 'First Part theatre',
      detail: 'Position 1',
      breakLabel: 'Second break',
      pending: false
    } }));
    window.dispatchEvent(new CustomEvent('roster:recent-activity', { detail: {
      updated: true,
      updatedCount: 2,
      sinceLabel: 'you last looked',
      items: []
    } }));
  });

  await expect(page.locator('.niCommandCentre')).toBeVisible();
  await expect(page.locator('#niCommandTitle')).toContainText('Andre');
  await expect(page.locator('.niAttentionButton')).toContainText('2');

  await page.evaluate(() => {
    const badge = document.getElementById('changesTaskBadge');
    if (badge) { badge.textContent = '2'; badge.classList.remove('hidden'); }
    window.dispatchEvent(new CustomEvent('roster:viewchange', { detail: { view: 'today' } }));
  });
  const rudder = page.locator('[data-quick-rudder]');
  await expect(rudder.locator('.quickRudderLabel')).toHaveText('Review');
  await rudder.click();
  await expect(page.locator('#changes')).toBeVisible();
});

test('person actions use a dedicated accessible sheet and preserve guarded workflows', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    const staff = document.createElement('button');
    staff.id = 'niTestStaff';
    staff.dataset.personName = 'Shaun Galea';
    staff.textContent = 'Shaun Galea · First Part';
    document.getElementById('today')?.appendChild(staff);
    window.dispatchEvent(new CustomEvent('roster:person-actions', { detail: { label: 'Shaun Galea', source: staff } }));
  });

  const dialog = page.getByRole('dialog', { name: /Shaun Galea/ });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('existing guarded Changes workflow');
  await expect(dialog.getByRole('button', { name: /Review staffing changes/ })).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Start a private chat/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('revision conflicts explain the protected outcome and do not immediately reopen after review', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    const message = document.createElement('div');
    message.id = 'allocationFormMessage';
    message.textContent = 'This night changed on another device. The latest version has been loaded, so review it before saving again.';
    document.body.appendChild(message);
  });

  const conflict = page.getByRole('alertdialog', { name: 'A newer roster won' });
  await expect(conflict).toBeVisible();
  await expect(conflict).toContainText('No stale roster was forced over the shared version.');
  await conflict.getByRole('button', { name: /Review latest Changes/ }).click();
  await expect(conflict).toHaveCount(0);

  await page.evaluate(() => {
    const message = document.getElementById('allocationFormMessage');
    if (message) message.classList.toggle('niRetest');
  });
  await page.waitForTimeout(150);
  await expect(page.getByRole('alertdialog', { name: 'A newer roster won' })).toHaveCount(0);
});

test('notification focus presets map onto existing push controls', async ({ page }) => {
  await openShell(page);
  await page.evaluate(() => {
    const host = document.createElement('div');
    ['pushTeamToggle', 'pushPrivateToggle', 'pushMentionToggle', 'pushRosterToggle'].forEach(id => {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = id;
      input.checked = true;
      host.appendChild(input);
    });
    document.body.appendChild(host);
    window.dispatchEvent(new CustomEvent('roster:notification-mode', { detail: { mode: 'quiet' } }));
  });

  await expect(page.locator('#pushTeamToggle')).not.toBeChecked();
  await expect(page.locator('#pushPrivateToggle')).not.toBeChecked();
  await expect(page.locator('#pushMentionToggle')).toBeChecked();
  await expect(page.locator('#pushRosterToggle')).not.toBeChecked();
});

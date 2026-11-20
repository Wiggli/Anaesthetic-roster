const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
test.use({ serviceWorkers: 'block' });

const {openReview}=require('./helpers/product-review');

async function assertNoOverflow(page, selector) {
  await expect.poll(() => page.locator(selector).evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  const result = await page.locator(selector).evaluate(el => {
    const rect = el.getBoundingClientRect();
    return { width: rect.width, scroll: el.scrollWidth, client: el.clientWidth, left: rect.left, right: rect.right, viewport: innerWidth };
  });
  expect(result.scroll).toBeLessThanOrEqual(result.client + 1);
  expect(result.left).toBeGreaterThanOrEqual(-1);
  expect(result.right).toBeLessThanOrEqual(result.viewport + 1);
}

for (const width of [320, 360, 390, 412, 430]) {
  test(`coherent operational pages and Account at ${width}px @iphone`, async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width, height: 900 });
    await openReview(page);
    let dock;
    for (const view of ['today', 'changes', 'breaks', 'chat']) {
      await page.evaluate(v => show(v), view);
      await expect(page.locator('#' + view)).toBeVisible();
      if (view === 'chat') {
        await expect(page.locator('.chatNotificationShortcut')).toBeVisible();
        await expect(page.locator('.chatNotificationDisclosure')).toHaveCount(0);
        await page.evaluate(()=>window.dispatchEvent(new CustomEvent('roster:chat-overview',{detail:{conversations:[{id:'review-dm',title:'Sample colleague',initial:'SC',time:'18:42',preview:'Can you cover the first part?',unread:1,active:false}],members:[]}})));
        await expect(page.locator('#chatConversationList')).toContainText('Sample colleague');
      }
      await assertNoOverflow(page, '#' + view);
      if (view === 'breaks') {
        await expect(page.locator('#breakList .breakScheduleSection')).toHaveCount(2);
        await expect(page.locator('#breakList .breakPerson')).toHaveCount(6);
      }
      if (view !== 'chat') await assertNoOverflow(page, '#' + view + ' .rosterDateControl');
      const rect = await page.locator('.bottom').boundingBox();
      if (dock) expect(rect).toEqual(dock); else dock = rect;
      const buttons = await page.locator('.bottom button').evaluateAll(nodes => nodes.map(n => ({w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height})));
      expect(buttons).toHaveLength(5);
      expect(Math.max(...buttons.map(b=>b.w)) - Math.min(...buttons.map(b=>b.w))).toBeLessThan(1);
      expect(buttons.every(b=>b.h>=44)).toBeTruthy();
      if (width === 390) {
        fs.mkdirSync(path.join(__dirname, '../visual-review'), { recursive: true });
        await page.screenshot({ path: path.join(__dirname, `../visual-review/coherence-${view}.png`) });
      }
    }
    await page.evaluate(() => show('changes'));
    await expect(page.locator('#changes [role="tablist"]')).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Add absence',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Add overtime',exact:true})).toBeVisible();
    await page.evaluate(() => show('today'));
    const labels = page.locator('.nightTimelinePhaseLabels');
    const scale = page.locator('.nightTimelineScale');
    expect((await labels.boundingBox()).y + (await labels.boundingBox()).height).toBeLessThanOrEqual((await scale.boundingBox()).y);
    const end = await page.locator('.timelineEnd').boundingBox();
    const middle = await page.locator('.handoverScale').boundingBox();
    expect(end.x).toBeGreaterThan(middle.x + middle.width);
    await page.evaluate(() => showAccountSheet());
    await expect(page.locator('#accountHomeHub')).toBeVisible();
    if(width===390) await page.screenshot({path:path.join(__dirname,'../visual-review/coherence-account.png')});
    for (const section of ['profile','preferences','security','help','notifications']) {
      await page.evaluate(s => showAccountSection(s), section);
      await expect(page.locator('#accountHomeHub')).toHaveCount(0);
      await expect(page.locator('#accountPageOutlet > *')).toHaveCount(1);
      await expect(page.locator('#closeAccountSheet')).toBeHidden();
      await expect(page.locator('#accountBackBtn')).toBeVisible();
      await assertNoOverflow(page, '#accountPageOutlet');
      if(width===390 && ['profile','preferences'].includes(section)) await page.screenshot({path:path.join(__dirname,`../visual-review/coherence-${section}.png`)});
      await page.locator('#accountBackBtn').click();
      await expect(page.locator('#accountHomeHub')).toBeVisible();
    }
    await page.locator('#closeAccountSheet').click();
    for(const v of ['changes','breaks','chat','today','changes','breaks','chat','today']) await page.locator(`.bottom [data-v="${v}"]`).click();
    await expect(page.locator('#today')).toBeVisible();
    await page.evaluate(() => {document.body.classList.add('dark');document.documentElement.dataset.theme='dark'});
    for(const v of ['today','changes','breaks','chat']) {await page.evaluate(v=>show(v),v);await assertNoOverflow(page,'#'+v);}
    if(width===390) await page.screenshot({path:path.join(__dirname,'../visual-review/coherence-chat-dark.png')});
  });
}

test('Account child navigation preserves unsaved profile input and restores Notifications controls @iphone', async ({page}) => {
  await openReview(page); await page.evaluate(()=>{showAccountSheet();showAccountSection('profile')});
  await page.locator('#profileName').fill('Andrea');
  await page.locator('#accountBackBtn').click();
  await page.evaluate(()=>showAccountSection('profile'));
  await expect(page.locator('#profileName')).toHaveValue('Andrea');
  await page.evaluate(()=>showAccountSection('notifications'));
  await expect(page.locator('#pushEnableBtn')).toHaveCount(1);
  expect(await page.locator('#pushEnableBtn').evaluate(el=>typeof el.onclick)).toBe('function');
  expect(await page.locator('[data-push-mute]').first().evaluate(el=>typeof el.onclick)).toBe('function');
  await page.evaluate(()=>showAccountSection('home'));
  await expect(page.locator('#pushEnableBtn')).toHaveCount(0);
});

module.exports = {openReview};

test('Account menu and headers stay below the installed iPhone status-bar edge @iphone', async ({page}, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', {get:()=>true});
    Object.defineProperty(navigator, 'userAgent', {get:()=> 'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15'});
  });
  await openReview(page);
  await page.evaluate(() => document.documentElement.style.setProperty('--app-safe-top','62px'));
  expect((await page.locator('#appHeader').boundingBox()).y).toBeGreaterThanOrEqual(86);
  await page.evaluate(() => showAccountSheet());
  await expect(page.locator('#accountHomeHub')).toContainText('Profile & shift');
  await expect(page.locator('#accountHomeHub')).toContainText('Appearance');
  await expect(page.locator('#accountHomeHub')).toContainText('Help & sharing');
  await expect(page.locator('.accountHubIcon svg')).toHaveCount(6);
  await expect(page.locator('.accountSheetHeader > div > span')).toBeHidden();
  await expect(page.locator('#accountVersion')).not.toContainText('Database');
  const title = await page.locator('#accountSheetTitle').boundingBox();
  expect(title.y).toBeGreaterThanOrEqual(86);
  const close=page.locator('#closeAccountSheet');
  expect(await close.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
  for(const theme of ['light','dark']) {
    await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;document.body.classList.toggle('dark',theme==='dark');},theme);
    await page.screenshot({path:testInfo.outputPath(`account-menu-${theme}.png`)});
  }
  await page.locator('[data-account-section="profile"]').click();
  await expect(page.locator('#accountSheetTitle')).toHaveText('Profile & shift');
  await page.locator('#accountBackBtn').click();
  await close.click();
});

for (const width of [320, 430, 1280]) for (const theme of ['light', 'dark']) {
  test(`compact operational layout ${width} ${theme} @iphone`, async ({page}, info) => {
    await page.setViewportSize({width, height: 932});
    await openReview(page);
    await page.evaluate(({periods, theme}) => {
      rotationVersions = periods;
      schemaVersion = 57;
      rebuildCalculatedRoster();
      idx = R.findIndex(night => night.date === '2026-11-21');
      nightOvertime[cur().date] = [
        {id: 'cover-a', nurse_name: 'Alexandra Long Professional Surname', allocation_key: 'reliever'},
        {id: 'cover-b', nurse_name: 'Christopher Another Professional Surname', allocation_key: 'seventh'}
      ];
      setThemePreference(theme);
      render();
      show('today');
    }, {periods: require('./fixtures/establishment-periods.json'), theme});
    await expect(page.locator('#roles .rosterRow-first .nightNurseLine')).toHaveCount(2);
    await expect(page.locator('#roles .rosterRow-second .nightNurseLine')).toHaveCount(2);
    await expect(page.locator('#roles .rosterRow-pager .nightNurseLine small')).toHaveText(['23:30–02:00', '02:00–04:30', '04:30–07:00']);
    await expect(page.locator('#nightPagerAction').getByRole('button', {name: /Draw Pager times/})).toBeVisible();
    for (const view of ['today', 'changes', 'breaks', 'chat']) {
      await page.evaluate(view => show(view), view);
      await assertNoOverflow(page, '#' + view);
      await page.screenshot({path: info.outputPath(`${view}-${theme}.png`), fullPage: true});
    }
    await page.evaluate(() => { show('roster'); renderRoster(); });
    await page.locator('input[aria-label="Roster month"]').fill('2026-11');
    const night = page.locator('[data-roster-date="2026-11-21"]');
    await expect(night).not.toHaveAttribute('open', '');
    await night.locator('summary').click();
    await expect(night).toHaveAttribute('open', '');
    await expect(night.locator('.rosterNightDetails')).toContainText('Alexandra Long Professional Surname');
    await assertNoOverflow(page, '#roster');
    await page.screenshot({path: info.outputPath(`roster-${theme}.png`)});
    await night.locator('.rosterOpenNight').click();
    await expect(page.locator('#today')).toBeVisible();
    expect(await page.evaluate(() => cur().date)).toBe('2026-11-21');
  });
}

for (const width of [320, 430]) for (const enlarged of [false, true]) {
  test(`Pager typography and alignment ${width} ${enlarged ? 'large dark' : 'standard light'} @iphone`, async ({page}, info) => {
    await page.setViewportSize({width, height: 932});
    await page.emulateMedia({reducedMotion: 'reduce'});
    await openReview(page);
    await page.evaluate(({periods, enlarged}) => {
      rotationVersions = periods;
      schemaVersion = 57;
      rebuildCalculatedRoster();
      idx = R.findIndex(night => night.date === '2026-11-21');
      const date = cur().date;
      nightOvertime[date] = [
        {id: 'pager-2', nurse_name: 'Alexandra Maria Example With A Long Surname', allocation_key: 'reliever'},
        {id: 'pager-3', nurse_name: 'Christopher Example With Another Long Surname', allocation_key: 'seventh'}
      ];
      runRosterMutation = (_key, commit) => commit('typography-fixture', 0);
      supa.rpc = async (name, args) => {
        if (name === 'apply_night_role_override_v57') nightRoleOverrides[date] = {assignments: args.p_assignments, reason: args.p_override_reason};
        return {data: null, error: null};
      };
      loadSharedData = async () => { render(); return true; };
      notifyRosterUpdate = () => {};
      applyTheme(enlarged);
      document.documentElement.style.fontSize = enlarged ? '20px' : '16px';
      render();
      show('today');
    }, {periods: require('./fixtures/establishment-periods.json'), enlarged});
    await page.locator('#nightPagerAction .pagerDrawLauncher').click();
    const sheet = page.getByRole('dialog', {name: 'Pager draw'});
    const close = sheet.getByRole('button', {name: 'Close Pager draw'});
    const bounds = await close.boundingBox();
    expect(bounds.width).toBeCloseTo(44, 0);
    expect(bounds.height).toBeCloseTo(44, 0);
    await assertNoOverflow(page, '.pagerDrawSheet');
    for (const token of await sheet.locator('.pagerDrawToken').all()) {
      const tokenBounds = await token.boundingBox();
      const arenaBounds = await sheet.locator('.pagerDrawArena').boundingBox();
      expect(tokenBounds.x).toBeGreaterThanOrEqual(arenaBounds.x);
      expect(tokenBounds.x + tokenBounds.width).toBeLessThanOrEqual(arenaBounds.x + arenaBounds.width);
    }
    await sheet.getByRole('button', {name: 'Sound on', exact: true}).click();
    await sheet.getByRole('button', {name: 'Draw Pager times', exact: true}).click();
    await expect(sheet.getByRole('status')).toHaveText('Saved');
    for (const row of await sheet.locator('.pagerDrawTurn').all()) {
      const name = row.locator('.pagerDrawTurnName');
      const time = row.locator('.pagerDrawTurnTime');
      expect(await name.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
      expect(await name.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      expect((await name.boundingBox()).y).toBeGreaterThanOrEqual((await time.boundingBox()).y + (await time.boundingBox()).height);
    }
    await sheet.screenshot({path: info.outputPath('pager-readable-result.png')});
    await sheet.getByRole('button', {name: 'Done', exact: true}).click();
    await page.evaluate(() => { show('roster'); renderRoster(); });
    const badge = page.locator('.rosterStaffingBadge').first();
    expect(await badge.evaluate(el => getComputedStyle(el).maxWidth)).toBe('none');
    await assertNoOverflow(page, '#roster');
  });
}

async function requestIntroForReview(page) {
  await page.evaluate(() => {
    cinematicMotionAllowed = () => false;
    releaseNotesQueued = false;
    onboardingDeferredSession = false;
    showOnboardingIfNeeded();
  });
}

for (const dismissal of ['skip', 'escape', 'complete']) {
  test(`intro stays dismissed after ${dismissal} and reload @iphone`, async ({page}) => {
    await openReview(page);
    await requestIntroForReview(page);
    const dialog = page.locator('#onboardingDialog');
    await expect(dialog).toBeVisible();
    if (dismissal === 'skip') await dialog.getByRole('button', {name: 'Skip tutorial', exact: true}).click();
    if (dismissal === 'escape') await page.keyboard.press('Escape');
    if (dismissal === 'complete') {
      const pages = await page.evaluate(() => onboardingPages().length);
      for (let step = 0; step < pages - 1; step++) await dialog.getByRole('button', {name: 'Continue', exact: true}).click();
      await dialog.getByRole('button', {name: 'Open my night', exact: true}).click();
    }
    await expect(dialog).toBeHidden();
    expect(await page.evaluate(() => educationSeen('main', 1))).toBe(true);
    await openReview(page);
    await page.evaluate(() => {
      const previous = educationVersions();
      educationVersions = () => ({...previous, main: previous.main + 1});
    });
    await requestIntroForReview(page);
    await page.waitForTimeout(100);
    await expect(dialog).toBeHidden();
  });
}

test('legacy completion and ordinary tab changes keep tutorials quiet @iphone', async ({page}) => {
  await page.addInitScript(() => localStorage.setItem('anaes_onboarding_complete_v34', '1'));
  await openReview(page);
  await requestIntroForReview(page);
  for (const view of ['changes', 'breaks', 'chat', 'today']) await page.evaluate(view => show(view), view);
  await page.waitForTimeout(100);
  await expect(page.locator('#onboardingDialog')).toBeHidden();
  await expect(page.locator('.bottom .educationNew')).toHaveCount(0);
});

test('Account keeps an updated guide available on request @iphone', async ({page}) => {
  await openReview(page);
  await page.evaluate(() => { markEducationSeen('main', educationVersion('main')); showAccountSheet(); showAccountSection('help'); });
  await page.getByRole('button', {name: /^Tutorial & app guide/}).click();
  const dialog = page.locator('#onboardingDialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', {name: /Account & Personalise/}).click();
  await expect(dialog).toContainText('Settings live under your avatar');
  await expect(dialog).not.toContainText('opening tune');
  await expect(dialog).not.toContainText('Play on launch');
  await dialog.getByRole('button', {name: 'Got it', exact: true}).click();
  await expect(dialog).toBeHidden();
});

test('saved startup audio preferences cannot start music @iphone', async ({page}) => {
  const requests = [];
  page.on('request', request => { if (/\.mp3(?:\?|$)/.test(request.url())) requests.push(request.url()); });
  await page.addInitScript(() => {
    localStorage.setItem('anaes_opening_tune', JSON.stringify({enabled: true, track: 'mundian'}));
    window.reviewStartupPlays = 0;
    HTMLMediaElement.prototype.play = function () { window.reviewStartupPlays++; return Promise.resolve(); };
  });
  await openReview(page);
  await page.locator('.bottom [data-v="changes"]').click();
  await page.locator('.bottom [data-v="today"]').click();
  await page.evaluate(() => { showAccountSheet(); showAccountSection('preferences'); });
  await expect(page.locator('#accountPageOutlet')).toContainText('Appearance');
  await expect(page.locator('#accountPageOutlet')).not.toContainText('Opening tune');
  await expect(page.locator('.openingTune')).toHaveCount(0);
  expect(await page.evaluate(() => window.reviewStartupPlays)).toBe(0);
  expect(requests).toEqual([]);
});

test('clock-change help remains available and remembers acknowledgement @iphone', async ({page}) => {
  await openReview(page);
  await page.evaluate(() => {
    markEducationSeen('main', educationVersion('main'));
    cinematicMotionAllowed = () => false;
    showClockChangeEducation('2026-10-24', true);
  });
  const dialog = page.locator('#onboardingDialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('03:00 after clock change');
  await dialog.getByRole('button', {name: 'Got it', exact: true}).click();
  await expect(dialog).toBeHidden();
  await page.evaluate(() => showClockChangeEducation('2026-10-24', false));
  await page.waitForTimeout(80);
  await expect(dialog).toBeHidden();
});

test('returning devices with an earlier skipped tour do not get another intro @iphone', async ({page}) => {
  await page.addInitScript(() => localStorage.setItem('anaes_selected_date', '2026-10-08'));
  await openReview(page);
  await requestIntroForReview(page);
  await page.waitForTimeout(100);
  await expect(page.locator('#onboardingDialog')).toBeHidden();
  expect(await page.evaluate(() => educationSeen('main', 1))).toBe(true);
});

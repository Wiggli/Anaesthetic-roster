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
    await expect(page.locator('#changes [role="tablist"]')).toHaveCount(1);
    await expect(page.locator('#changes .changesWorkflowTabs')).toHaveCount(0);
    await page.getByRole('tab', { name: /Allocation/ }).click();
    await expect(page.locator('#changesAllocationPane')).toBeVisible();
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

test('Changes keeps one functional fallback rail when its optional React module fails @iphone', async ({page}) => {
  await page.route('**/assets/changes-workflow-*.js', route=>route.abort());
  await openReview(page, true);
  await page.evaluate(()=>show('changes'));
  await expect(page.locator('#changes [role="tablist"]')).toHaveCount(1);
  await expect(page.locator('#changes .changesWorkflowTabs')).toBeVisible();
  await page.locator('#changes [data-changes-step="allocation"]').click();
  await expect(page.locator('#changesAllocationPane')).toBeVisible();
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

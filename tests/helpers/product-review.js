const {expect}=require('@playwright/test');
async function openReview(page, workflowFallback = false) {
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ contentType: 'application/javascript', body: 'window.supabase={createClient(){return null}}' }));
  await page.goto('/index.html');
  await page.evaluate(() => {
    document.body.classList.remove('authPending');
    document.getElementById('launchScreen').style.display = 'none';
    document.getElementById('authGate').classList.add('hidden');
    document.querySelector('main').style.display = 'block';
    document.querySelector('.bottom').style.display = 'grid';
    currentUserProfile = { display_name: 'Andre Bartolo', email: 'review@example.test', user_role: 'member' };
    currentPrivateProfile = { profile_name: 'Andre Bartolo', job_title: 'Senior Staff Nurse' };
    localStorage.setItem('anaes_my_name', 'Andre');
    schemaVersion = 53;
    supa = { rpc: async () => ({ data: [], error: null }) };
    appCompatibility = {write_allowed:true,write_status:'allowed'};
    lastSuccessfulSyncAt = new Date().toISOString();
    setSharedSyncState('live','Plan up to date');
    nightTeamIdentities = { '2026-10-08': { roster_date: '2026-10-08', nickname: 'L-Aghar Shift', tagline: 'First to work, last to leave, ready for anything', accent_key: 'rose', symbol: 'cross', updated_at: '2026-10-07T11:00:00Z' } };
    rebuildCalculatedRoster(); idx = R.findIndex(r => r.date === '2026-10-08');
    render(); renderNightTeamIdentityContext(cur().date);
  });
  if (!workflowFallback) await expect(page.locator('#changesWorkflowExperience')).toHaveAttribute('data-react-ready', 'true');
  await expect(page.locator('#personalNightCard .personalHeroSurface')).toBeVisible();
  await expect(page.locator('#nightSectionTitle')).toContainText('Andre', {timeout:10000});
}


module.exports={openReview};

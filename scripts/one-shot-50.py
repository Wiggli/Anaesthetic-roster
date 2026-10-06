from pathlib import Path
import json

css_path = Path('src/product-unified.css')
css = css_path.read_text()
marker = '/* 50.0 ruthless simplification: fewer layers, faster scan */'
if marker not in css:
    css += r'''

/* 50.0 ruthless simplification: fewer layers, faster scan */

/* The institution row is chrome, not a hero. */
#today #appHeader,
#changes .appScreenHeader,
#breaks .appScreenHeader,
#chat .appScreenHeader {
  padding-top: calc(var(--app-safe-top, 0px) + 6px) !important;
}
#today .hospitalStrip,
#changes .primaryInstitution,
#breaks .primaryInstitution,
#chat .primaryInstitution {
  min-height: 34px !important;
  padding: 0 2px 5px !important;
}
#today .hospitalStrip img,
#changes .primaryInstitutionBrand img,
#breaks .primaryInstitutionBrand img,
#chat .primaryInstitutionBrand img {
  max-height: 19px !important;
}
#today .hospitalStrip span,
#changes .primaryInstitutionBrand > span,
#breaks .primaryInstitutionBrand > span,
#chat .primaryInstitutionBrand > span {
  font-size: 9.5px !important;
}
#today .headActions {
  top: calc(var(--app-safe-top, 0px) + 5px) !important;
  right: 2px !important;
}
#today .accountBtn,
#changes .primaryHeaderAction,
#breaks .primaryHeaderAction,
#chat .primaryHeaderAction,
#changes .screenInfoButton,
#breaks .screenInfoButton,
#chat .chatHeaderCompose {
  width: 36px !important;
  min-width: 36px !important;
  height: 36px !important;
  min-height: 36px !important;
  border-radius: 12px !important;
}

/* Greeting is orientation, not another oversized block. */
#today .nightSectionIdentity {
  padding: 11px 2px 8px !important;
}
#today .nightWelcomeEyebrow {
  margin-bottom: 3px !important;
  font-size: 9.5px !important;
}
#today .nightUnifiedHero .nightSectionIdentity h1 {
  font-size: clamp(27px, 7vw, 31px) !important;
  line-height: 1.02 !important;
}
#changes .primaryScreenTitleRow,
#breaks .primaryScreenTitleRow,
#chat .primaryScreenTitleRow {
  padding: 12px 2px 8px !important;
}
#changes .primaryScreenTitleRow h1,
#breaks .primaryScreenTitleRow h1,
#chat .primaryScreenTitleRow h1 {
  font-size: clamp(26px, 6.8vw, 30px) !important;
}

/* One compact night selector. Shift identity and date are rows inside one surface. */
#today .nightDateShell,
#changes .changesDatePanel,
#breaks .breaksContextPanel {
  margin-bottom: 8px !important;
  padding: 7px !important;
  border-radius: 16px !important;
}
#today .nightDateContext {
  display: none !important;
}
#changes .nightContextMetaRow,
#breaks .nightContextMetaRow {
  min-height: 24px !important;
  margin: 0 2px 2px !important;
}
#changes .nightContextMetaRow h2,
#breaks .nightContextMetaRow h2 {
  font-size: 9.5px !important;
}
#changes .nightContextStaffing,
#breaks .nightContextStaffing {
  min-height: 24px !important;
  padding: 3px 8px !important;
}

.nightTeamIdentityContext,
#today .nightTeamIdentityContext,
#changes .nightTeamIdentityContext,
#breaks .nightTeamIdentityContext {
  min-height: 40px !important;
  grid-template-columns: 32px minmax(0, 1fr) !important;
  gap: 8px !important;
  margin: 0 0 4px !important;
  padding: 4px !important;
  border: 0 !important;
  border-radius: 11px !important;
  background: transparent !important;
}
.nightTeamIdentityContext .shiftIdentityMark,
#today .nightTeamIdentityContext .shiftIdentityMark,
#changes .nightTeamIdentityContext .shiftIdentityMark,
#breaks .nightTeamIdentityContext .shiftIdentityMark {
  width: 32px !important;
  min-width: 32px !important;
  height: 32px !important;
  min-height: 32px !important;
  border-radius: 10px !important;
}
.nightTeamIdentityContext .shiftIdentityCopy strong,
#today .nightTeamIdentityContext .shiftIdentityCopy strong {
  font-size: 14px !important;
  line-height: 1.08 !important;
}
.nightTeamIdentityContext .shiftIdentityCopy small {
  margin-top: 1px !important;
  font-size: 9.5px !important;
  line-height: 1.15 !important;
}

/* Never render native segmented mobile date text. Keep the native input as the tap target and display our own one-line label. */
#today .dateNav.rosterDateControl,
#changes .nightContextPanel .dateNav.rosterDateControl,
#breaks .nightContextPanel .dateNav.rosterDateControl {
  position: relative !important;
  grid-template-columns: 36px minmax(0, 1fr) 36px !important;
  gap: 3px !important;
  min-height: 40px !important;
  padding: 2px !important;
  border-radius: 12px !important;
}
#today .dateNav.rosterDateControl::before,
#changes .nightContextPanel .dateNav.rosterDateControl::before,
#breaks .nightContextPanel .dateNav.rosterDateControl::before {
  content: attr(data-date-label);
  grid-column: 2;
  grid-row: 1;
  align-self: center;
  justify-self: stretch;
  overflow: hidden;
  color: var(--liquid-text);
  font-size: 12.5px;
  font-weight: 730;
  line-height: 1.1;
  letter-spacing: -.015em;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
}
#today .dateNav.rosterDateControl button,
#changes .nightContextPanel .dateNav.rosterDateControl button,
#breaks .nightContextPanel .dateNav.rosterDateControl button {
  width: 36px !important;
  min-width: 36px !important;
  height: 36px !important;
  min-height: 36px !important;
  font-size: 20px !important;
}
#today .dateNav.rosterDateControl button:first-child,
#changes .nightContextPanel .dateNav.rosterDateControl button:first-child,
#breaks .nightContextPanel .dateNav.rosterDateControl button:first-child {
  grid-column: 1 !important;
  grid-row: 1 !important;
}
#today .dateNav.rosterDateControl button:last-child,
#changes .nightContextPanel .dateNav.rosterDateControl button:last-child,
#breaks .nightContextPanel .dateNav.rosterDateControl button:last-child {
  grid-column: 3 !important;
  grid-row: 1 !important;
}
#today .dateNav.rosterDateControl input[type="date"],
#changes .nightContextPanel .dateNav.rosterDateControl input[type="date"],
#breaks .nightContextPanel .dateNav.rosterDateControl input[type="date"] {
  position: absolute !important;
  z-index: 2 !important;
  top: 2px !important;
  bottom: 2px !important;
  left: 41px !important;
  right: 41px !important;
  width: auto !important;
  min-width: 0 !important;
  height: auto !important;
  min-height: 0 !important;
  padding: 0 !important;
  opacity: 0 !important;
  cursor: pointer;
}
#today .dateNav.rosterDateControl:focus-within,
#changes .nightContextPanel .dateNav.rosterDateControl:focus-within,
#breaks .nightContextPanel .dateNav.rosterDateControl:focus-within {
  outline: 3px solid color-mix(in srgb, var(--liquid-accent) 30%, transparent) !important;
  outline-offset: 2px !important;
}
.dateResetBtn {
  min-height: 28px !important;
  margin-top: 3px !important;
  padding: 3px 8px !important;
  font-size: 10px !important;
}

/* Remove the duplicate selected/live copy. Keep Focus available. */
#today .nightContextCapsule,
#today .nightSignalState {
  display: none !important;
}
#today .nightContextLine {
  min-height: 30px !important;
  justify-content: flex-end !important;
  margin: 0 0 6px !important;
  padding: 0 1px !important;
}
#today .nightContextLine button {
  min-height: 30px !important;
  padding: 4px 10px !important;
  border-radius: 999px !important;
  font-size: 10.5px !important;
}

/* Personal allocation stays the anchor but fits in one glance. */
#today #personalNightHeading {
  margin-bottom: 5px !important;
  font-size: 10px !important;
}
#today #personalNightCard > .personalHeroSurface {
  padding: 13px !important;
  border-radius: 18px !important;
  box-shadow: 0 7px 20px rgba(0,0,0,.12) !important;
}
#today .personalAssignmentStage {
  gap: 8px !important;
}
#today .personalAssignmentHeroCompact {
  min-height: 58px !important;
  gap: 10px !important;
  margin-bottom: 7px !important;
}
#today .personalRoleIcon {
  width: 46px !important;
  min-width: 46px !important;
  height: 46px !important;
  min-height: 46px !important;
  border-radius: 14px !important;
  font-size: 18px !important;
}
#today .personalRoleCopy b {
  font-size: clamp(23px, 6vw, 27px) !important;
  line-height: 1.02 !important;
}
#today .personalRoleCopy > span {
  margin-top: 3px !important;
  font-size: 12px !important;
  line-height: 1.25 !important;
}
#today .nightTimeline {
  margin-top: 6px !important;
  padding-top: 9px !important;
}
#today .nightTimelineHead {
  margin-bottom: 6px !important;
}
#today .nightTimelineHead small {
  font-size: 9px !important;
}
#today .nightTimelineHead b {
  font-size: 12px !important;
}
#today .nightTimelineTrackShell {
  min-height: 28px !important;
  height: 28px !important;
}
#today .nightTimelinePhaseLabels,
#today .nightTimelineScale {
  font-size: 9px !important;
}
#today .personalHeroFactGrid {
  gap: 4px !important;
  margin-top: 9px !important;
}
#today .personalHeroFactGrid > .personalHeroFact {
  min-height: 58px !important;
  padding: 7px !important;
  border-radius: 11px !important;
}
#today .personalHeroFact small,
#today .personalHeroFact span {
  font-size: 9px !important;
}
#today .personalHeroFact b {
  font-size: 12px !important;
  line-height: 1.15 !important;
}

/* Supporting surfaces recede beneath the personal allocation. */
#today .nightAiBriefCard,
#today .nightSignalPrimary,
#today .nightTeamDetails,
#today .recentActivityPanel {
  margin-top: 10px !important;
  border-radius: 16px !important;
  box-shadow: none !important;
}

/* Quieter dock with less screen obstruction. */
.bottom.reactTabs {
  min-height: 60px !important;
  border-radius: 19px !important;
  padding: 3px !important;
}
.bottom.reactTabs button:not(.quickRudder) {
  min-height: 50px !important;
  border-radius: 14px !important;
}
.bottom.reactTabs .quickRudderDisc {
  width: 34px !important;
  height: 34px !important;
  border-radius: 11px !important;
}
.bottom.reactTabs .quickRudderLabel,
.bottom.reactTabs button:not(.quickRudder) span {
  font-size: 9.5px !important;
}

@media (max-width: 390px) {
  #today .nightUnifiedHero .nightSectionIdentity h1 {
    font-size: 27px !important;
  }
  .nightTeamIdentityContext .shiftIdentityCopy small {
    max-width: 220px !important;
  }
  #today .dateNav.rosterDateControl::before,
  #changes .nightContextPanel .dateNav.rosterDateControl::before,
  #breaks .nightContextPanel .dateNav.rosterDateControl::before {
    font-size: 12px !important;
  }
}
'''
    css_path.write_text(css)

clinical_path = Path('src/legacy-ui/clinical.js')
clinical = clinical_path.read_text()
needle = "['datePick','changesDatePick','breakDatePick'].forEach(function(id){var el=byId(id);if(!el)return;el.min=R[0].date;el.max=R[R.length-1].date;el.value=date;updatePrettyDate(el)});"
replacement = needle + "\n  var compactDateLabel=new Date(date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});Array.prototype.forEach.call(document.querySelectorAll('.rosterDateControl'),function(control){control.setAttribute('data-date-label',compactDateLabel)});"
if 'compactDateLabel=' not in clinical:
    if needle not in clinical:
        raise SystemExit('Could not locate syncDateInputs date assignment')
    clinical = clinical.replace(needle, replacement, 1)
    clinical_path.write_text(clinical)

release_path = Path('release.json')
release = json.loads(release_path.read_text())
release.update({
    'version': '50.0',
    'date': '6 October 2026',
    'title': 'Simplify the Night Roster interface around the nurse',
    'summary': 'Removes repeated context and oversized presentation from the 49.0 phone layout so the app reads as a compact institution bar, one night selector and the nurse’s allocation, with the same simpler rhythm across operational screens.',
    'changes': [
        'Compresses the Night opening into a slim institution row, greeting, one compact night selector and the personal allocation without the repeated selected-night and live-status layer.',
        'Makes shift identity a lightweight row inside the selected-night surface instead of another prominent card.',
        'Replaces unreliable native segmented date text with a controlled one-line date label while retaining the native date input as the accessible tap target.',
        'Reduces the personal allocation card height while keeping assignment, live timeline, duty, break and colleague information immediately available.',
        'Applies the same compact selected-night date treatment to Changes and Breaks and reduces top-header volume across Night, Changes, Breaks and Chat.',
        'Reduces bottom-dock height and supporting-card emphasis so the allocation remains the strongest visual element.',
        'Preserves roster calculations, staffing rules, First and Second Part semantics, Malta and DST timing, authentication, database writes and clinical state colours.'
    ],
    'update_policy': 'normal'
})
release_path.write_text(json.dumps(release, indent=2) + '\n')

test_path = Path('tests/product-layout-contract.test.js')
test = test_path.read_text()
if 'controlled one-line date label must remain visible' not in test:
    test += "\nassert.ok(css.includes('content: attr(data-date-label)'), 'controlled one-line date label must remain visible');\nassert.ok(css.includes('opacity: 0 !important'), 'native date text must stay visually suppressed while input remains interactive');\nassert.ok(css.includes('#today .nightContextCapsule'), 'duplicate Night context copy must remain suppressible');\nconsole.log('50.0 compact Night regression checks passed');\n"
    test_path.write_text(test)

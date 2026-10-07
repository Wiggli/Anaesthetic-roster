from pathlib import Path
import json


def read(path):
    return Path(path).read_text()


def write(path, value):
    Path(path).write_text(value)


def replace_once(source, old, new, label):
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return source.replace(old, new, 1)


css_path = 'src/product-unified.css'
css = read(css_path)
css = replace_once(
    css,
    '/* 50.7 coherent product system.\n   This file is the single final product-wide presentation authority. It deliberately\n   replaces the accumulated 50.1/50.4/50.5/50.6 override generations with one shared\n   shell, one spacing rhythm, one selected-night language and one navigation system. */',
    '/* 50.8 consolidated operational layout.\n   This remains the single final product-wide presentation authority. The 50.8 pass\n   removes duplicate workflow chrome, consolidates task-screen context and reduces\n   vertical repetition instead of adding another competing polish generation. */',
    'CSS ownership header'
)
css = replace_once(css, '  --unified-space-3: 14px;', '  --unified-space-3: 12px;', 'shared vertical rhythm')
css = replace_once(
    css,
    '  padding: calc(var(--app-safe-top, 0px) + 2px) 11px 13px !important;',
    '  padding: calc(var(--app-safe-top, 0px) + 2px) 11px 9px !important;',
    'Night hero padding'
)
css = replace_once(
    css,
    '#today #appHeader { order: 1; }\n#today .nightDateShell { order: 2; }',
    '#today #appHeader { order: 1; }\n#today .hospitalStrip { min-height: 48px !important; }\n#today .nightDateShell { order: 2; }',
    'Night institution height'
)
css = replace_once(
    css,
    '#today .nightTeamIdentityContext {\n  position: relative !important;\n  min-height: 94px !important;\n  grid-template-columns: 70px minmax(0, 1fr) !important;\n  gap: 12px !important;\n  margin: 0 1px 9px !important;\n  padding: 10px 40px 10px 10px !important;',
    '#today .nightTeamIdentityContext {\n  position: relative !important;\n  min-height: 86px !important;\n  grid-template-columns: 64px minmax(0, 1fr) !important;\n  gap: 10px !important;\n  margin: 0 1px 7px !important;\n  padding: 8px 38px 8px 8px !important;',
    'Night shift identity geometry'
)
css = replace_once(
    css,
    '#today .nightTeamIdentityContext .shiftIdentityMark {\n  width: 70px !important;\n  min-width: 70px !important;\n  height: 70px !important;\n  min-height: 70px !important;\n  border-radius: 19px !important;',
    '#today .nightTeamIdentityContext .shiftIdentityMark {\n  width: 64px !important;\n  min-width: 64px !important;\n  height: 64px !important;\n  min-height: 64px !important;\n  border-radius: 17px !important;',
    'Night shift mark geometry'
)
css = replace_once(
    css,
    '#today .dateNav.rosterDateControl { margin-inline: 3px !important; width: calc(100% - 6px) !important; }',
    '#today .dateNav.rosterDateControl { min-height: 40px !important; margin-inline: 3px !important; width: calc(100% - 6px) !important; }',
    'Night date rail height'
)
css = replace_once(
    css,
    '#today .nightSectionIdentity {\n  margin: 0 !important;\n  padding: 15px 6px 3px !important;\n}',
    '#today .nightSectionIdentity {\n  margin: 0 !important;\n  padding: 10px 6px 1px !important;\n}',
    'Night greeting spacing'
)
css = replace_once(
    css,
    '  font-size: clamp(30px, 8.5vw, 38px) !important;',
    '  font-size: clamp(28px, 7.8vw, 34px) !important;',
    'Night greeting scale'
)

anchor = '#changes .nightContextMetaRow,\n#breaks .nightContextMetaRow {'
inserted = '''#changes .changesDatePanel,
#breaks .breaksContextPanel {
  margin-bottom: 10px !important;
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}
#changes .appShiftContextRow,
#breaks .appShiftContextRow {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  gap: 8px !important;
  align-items: center !important;
  margin: 0 0 8px !important;
}
#changes .appShiftContextRow .nightTeamIdentityContext,
#breaks .appShiftContextRow .nightTeamIdentityContext {
  width: 100% !important;
  margin: 0 !important;
}
#changes .appShiftContextRow .nightContextStaffing,
#breaks .appShiftContextRow .nightContextStaffing {
  min-height: 30px !important;
  padding: 4px 9px !important;
  background: var(--unified-accent-soft) !important;
}
'''
css = replace_once(css, anchor, inserted + anchor, 'task context row rules')

css = replace_once(css, '  margin: 2px 0 12px !important;', '  margin: 0 0 8px !important;', 'Changes heading spacing')
css = replace_once(
    css,
    '#changes .workflowSteps,\n#changes .changesWorkflowTabs {\n  display: grid !important;\n  grid-template-columns: repeat(3, minmax(0,1fr)) !important;\n  gap: 3px !important;\n  margin: 0 0 12px !important;',
    '#changes .workflowSteps,\n#changes .changesWorkflowTabs {\n  display: grid !important;\n  grid-template-columns: repeat(3, minmax(0,1fr)) !important;\n  gap: 3px !important;\n  margin: 0 0 8px !important;',
    'Changes workflow spacing'
)
css = replace_once(
    css,
    '#changes .workflowSteps button,\n#changes .changesWorkflowTabs button {\n  min-width: 0 !important;\n  min-height: 52px !important;\n  padding: 6px 4px !important;',
    '#changes .workflowSteps button,\n#changes .changesWorkflowTabs button {\n  min-width: 0 !important;\n  min-height: 46px !important;\n  padding: 5px 4px !important;',
    'Changes workflow height'
)
css = replace_once(
    css,
    '#changes .changesWorkflowState,\n#changes .workflowGuidance {\n  margin: 0 0 12px !important;\n  padding: 10px 12px !important;',
    '#changes .changesWorkflowState,\n#changes .workflowGuidance {\n  margin: 0 0 8px !important;\n  padding: 7px 9px !important;',
    'Changes guidance density'
)
css = replace_once(
    css,
    '#changes .staffingSection {\n  margin: 0 !important;\n  padding: 15px !important;',
    '#changes .staffingSection {\n  margin: 0 !important;\n  padding: 13px !important;',
    'Changes staffing density'
)

css = replace_once(
    css,
    '#breaks .personalBreakSummary {\n  margin: 0 0 12px !important;\n  padding: 15px !important;',
    '#breaks .personalBreakSummary {\n  margin: 0 0 10px !important;\n  padding: 14px !important;',
    'Break summary density'
)
css = replace_once(
    css,
    '#breaks .breakSummaryRow {\n  display: grid !important;\n  grid-template-columns: repeat(3, minmax(0,1fr)) !important;\n  gap: 0 !important;\n  margin: 0 0 13px !important;',
    '#breaks .breakSummaryRow {\n  display: grid !important;\n  grid-template-columns: repeat(3, minmax(0,1fr)) !important;\n  gap: 0 !important;\n  margin: 0 0 10px !important;',
    'Break statistics spacing'
)
css = replace_once(
    css,
    '#breaks .breakPlanTitle {\n  margin: 0 2px 8px !important;\n  align-items: center !important;\n}',
    '#breaks .breakPlanTitle {\n  margin: 0 2px 6px !important;\n  align-items: center !important;\n}\n#breaks .breakPlanTools {\n  display: flex !important;\n  justify-content: flex-end !important;\n  margin: 0 2px 7px !important;\n}\n#breaks .jumpToMeButton,\n#today .nightContextLine button {\n  min-height: 32px !important;\n  padding: 4px 10px !important;\n  border: 1px solid var(--unified-border) !important;\n  border-radius: 999px !important;\n  background: var(--unified-soft) !important;\n  color: var(--liquid-accent-strong) !important;\n  box-shadow: none !important;\n  font-size: 10.5px !important;\n  font-weight: 700 !important;\n}',
    'secondary action language'
)

css = replace_once(
    css,
    '  #today .nightTeamIdentityContext {\n    min-height: 84px !important;\n    grid-template-columns: 62px minmax(0,1fr) !important;\n    gap: 10px !important;\n    padding: 9px 36px 9px 9px !important;\n  }',
    '  #today .nightTeamIdentityContext {\n    min-height: 76px !important;\n    grid-template-columns: 56px minmax(0,1fr) !important;\n    gap: 9px !important;\n    padding: 7px 34px 7px 7px !important;\n  }',
    'small-phone Night identity'
)
css = replace_once(
    css,
    '  #today .nightTeamIdentityContext .shiftIdentityMark {\n    width: 62px !important;\n    min-width: 62px !important;\n    height: 62px !important;\n    min-height: 62px !important;\n    border-radius: 17px !important;\n  }',
    '  #today .nightTeamIdentityContext .shiftIdentityMark {\n    width: 56px !important;\n    min-width: 56px !important;\n    height: 56px !important;\n    min-height: 56px !important;\n    border-radius: 16px !important;\n  }',
    'small-phone Night mark'
)
css = replace_once(
    css,
    '  #today .nightUnifiedHero .nightSectionIdentity h1 { font-size: clamp(28px, 8.3vw, 34px) !important; }',
    '  #today .nightUnifiedHero .nightSectionIdentity h1 { font-size: clamp(27px, 7.8vw, 31px) !important; }',
    'small-phone Night greeting'
)
write(css_path, css)

test_path = 'tests/product-layout-contract.test.js'
test = read(test_path)
test = replace_once(
    test,
    "const coherentShell = fs.readFileSync('src/coherent-shell.ts', 'utf8');",
    "const coherentShell = fs.readFileSync('src/coherent-shell.ts', 'utf8');\nconst changesWorkflow = fs.readFileSync('src/changes-workflow.tsx', 'utf8');",
    'layout test workflow source'
)
test = replace_once(
    test,
    "document.documentElement.dataset.productShell = '50.7'",
    "document.documentElement.dataset.productShell = '50.8'",
    'layout test shell version'
)
test = replace_once(
    test,
    "'50.7 product shell marker must identify the coherent-shell refactor'",
    "'50.8 product shell marker must identify the layout-consolidation pass'",
    'layout test shell message'
)
marker = "assert.ok(coherentShell.includes(\"'appShiftIdentity'\"), 'operational screens must share one shift-identity contract');"
additions = "\nassert.ok(coherentShell.includes('appShiftContextRow'), 'Changes and Breaks must consolidate staffing beside shift identity instead of leaving a floating badge');\nassert.ok(changesWorkflow.includes(\"fallback?.classList.add('hidden')\"), 'React Changes workflow must hide the duplicate legacy stepper only after it mounts');\nassert.ok(changesWorkflow.includes(\"legacyState?.classList.add('hidden')\"), 'React Changes guidance must suppress the duplicate legacy workflow state');\nassert.ok(css.includes('#changes .appShiftContextRow'), 'task screens must share the compact shift-context row');"
test = replace_once(test, marker, marker + additions, 'layout consolidation assertions')
test = replace_once(
    test,
    "console.log('50.7 date, update and unified-shell regression checks passed');",
    "console.log('50.8 layout-consolidation, date and update regression checks passed');",
    'layout test completion label'
)
write(test_path, test)

release = {
    'version': '50.8',
    'date': '7 October 2026',
    'title': 'Consolidate the operational layout',
    'summary': 'Removes the duplicate Changes workflow rail, attaches staffing to the shared shift context, reduces top-screen vertical repetition and tightens Night while preserving its branded identity.',
    'changes': [
        'Removes the duplicate Staffing, Allocation and Confirm rail once the React workflow has mounted, while retaining the legacy rail as a true fallback if the optional workflow chunk ever fails.',
        'Consolidates the Changes and Breaks staffing count beside the shared shift identity instead of leaving a floating badge, so both task screens use the same compact shift and date composition.',
        'Flattens the Changes selected-night container, reduces workflow and guidance height, and brings Absences and Overtime materially higher on the screen without changing staffing behaviour.',
        'Tightens the Night institution row, shift card, date rail and personalised greeting so the hero keeps its premium identity with less vertical volume before the allocation card.',
        'Tightens Breaks summary spacing and standardises Jump to me and other secondary controls on the same compact pill language.',
        'Preserves roster calculations, staffing rules, allocation semantics, First and Second Part timing, Malta and DST handling, authentication, database writes, offline safety and clinical state colours.'
    ],
    'update_policy': 'normal'
}
write('release.json', json.dumps(release, indent=2) + '\n')

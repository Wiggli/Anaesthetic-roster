from pathlib import Path

path = Path('src/product-unified.css')
css = path.read_text()
marker = '/* 50.6 premium mock-up hero refinement. */'
if marker in css:
    raise SystemExit(0)

css += r'''

/* 50.6 premium mock-up hero refinement. */
:root {
  --hero-edge: color-mix(in srgb, var(--liquid-accent) 44%, var(--unified-border));
  --hero-edge-soft: color-mix(in srgb, var(--liquid-accent) 24%, var(--unified-border));
  --hero-glow: color-mix(in srgb, var(--liquid-accent) 14%, transparent);
}

/* Night is the full brand expression. */
#today .nightUnifiedHero {
  overflow: hidden !important;
  margin-bottom: 14px !important;
  padding: 0 12px 14px !important;
  border: 1px solid var(--hero-edge) !important;
  border-radius: 28px !important;
  background:
    radial-gradient(circle at 88% 8%, color-mix(in srgb, var(--liquid-accent) 24%, transparent), transparent 31%),
    radial-gradient(circle at 12% 38%, color-mix(in srgb, var(--liquid-accent) 9%, transparent), transparent 38%),
    linear-gradient(145deg,
      color-mix(in srgb, var(--liquid-accent) 12%, var(--unified-surface)) 0%,
      color-mix(in srgb, var(--liquid-secondary) 2%, var(--unified-surface)) 48%,
      color-mix(in srgb, var(--liquid-accent) 7%, var(--unified-surface)) 100%) !important;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--liquid-accent) 10%, transparent),
    0 18px 46px rgba(0,0,0,.22),
    0 0 34px var(--hero-glow) !important;
}
#today .nightUnifiedHero::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0;
  background:
    linear-gradient(115deg, transparent 0 58%, color-mix(in srgb, var(--liquid-accent) 5%, transparent) 58% 59%, transparent 59% 100%);
  pointer-events: none;
}
#today .nightUnifiedHero::after {
  content: '✚';
  right: -34px;
  top: 86px;
  color: color-mix(in srgb, var(--liquid-accent) 9%, transparent);
  font-size: 238px;
  font-weight: 700;
  line-height: .72;
  text-shadow: 0 0 28px color-mix(in srgb, var(--liquid-accent) 8%, transparent);
  transform: rotate(-1deg);
}

/* One premium top row: hospital identity, department pill and account. */
#today .hospitalStrip {
  display: grid !important;
  grid-template-columns: minmax(118px, 1fr) auto !important;
  gap: 8px !important;
  min-height: 66px !important;
  align-items: center !important;
  padding: 10px 54px 7px 6px !important;
}
#today .hospitalStrip img {
  justify-self: start;
  max-width: 146px !important;
  max-height: 42px !important;
  filter: drop-shadow(0 0 10px color-mix(in srgb, var(--liquid-accent) 12%, transparent));
}
#today .hospitalStrip > span {
  position: relative;
  gap: 6px;
  max-width: 176px !important;
  min-height: 32px !important;
  margin: 0 !important;
  padding: 5px 10px 5px 29px !important;
  border-color: color-mix(in srgb, var(--liquid-accent) 34%, var(--unified-border)) !important;
  background: color-mix(in srgb, var(--liquid-accent) 8%, var(--unified-surface)) !important;
  box-shadow: inset 0 1px 0 color-mix(in srgb, white 12%, transparent);
  font-size: 8.9px !important;
  letter-spacing: .02em !important;
}
#today .hospitalStrip > span::before {
  content: '';
  position: absolute;
  left: 10px;
  width: 13px;
  height: 13px;
  background: currentColor;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M4 21V8h5V3h6v5h5v13h-7v-5h-2v5H4Zm2-2h3v-5h6v5h3V10h-5V5h-2v5H6v9Zm6-7a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0-4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z'/%3E%3C/svg%3E") center/contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M4 21V8h5V3h6v5h5v13h-7v-5h-2v5H4Zm2-2h3v-5h6v5h3V10h-5V5h-2v5H6v9Zm6-7a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0-4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z'/%3E%3C/svg%3E") center/contain no-repeat;
}
#today .headActions {
  top: calc(var(--app-safe-top, 0px) + 13px) !important;
  right: 7px !important;
}
#today .accountBtn {
  width: 46px !important;
  min-width: 46px !important;
  height: 46px !important;
  min-height: 46px !important;
  border: 1px solid color-mix(in srgb, var(--liquid-accent) 25%, var(--unified-border)) !important;
  box-shadow:
    0 0 0 7px color-mix(in srgb, var(--liquid-accent) 7%, transparent),
    inset 0 1px 0 color-mix(in srgb, white 10%, transparent) !important;
}

/* The shift identity is the focal point, as in the approved mock-up. */
#today .nightDateShell {
  margin-top: 2px !important;
}
#today .nightTeamIdentityContext {
  min-height: 104px !important;
  grid-template-columns: 78px minmax(0, 1fr) !important;
  gap: 0 !important;
  margin: 0 2px 9px !important;
  padding: 11px 42px 11px 11px !important;
  border: 1px solid color-mix(in srgb, var(--shift-identity-accent, var(--liquid-accent)) 48%, var(--unified-border)) !important;
  border-radius: 24px !important;
  background:
    radial-gradient(circle at 12% 48%, color-mix(in srgb, var(--shift-identity-accent, var(--liquid-accent)) 13%, transparent), transparent 35%),
    linear-gradient(135deg,
      color-mix(in srgb, var(--shift-identity-accent, var(--liquid-accent)) 12%, var(--unified-surface)),
      color-mix(in srgb, var(--liquid-accent) 5%, var(--unified-surface))) !important;
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, white 10%, transparent),
    0 0 0 1px color-mix(in srgb, var(--shift-identity-accent, var(--liquid-accent)) 8%, transparent),
    0 0 24px color-mix(in srgb, var(--shift-identity-accent, var(--liquid-accent)) 11%, transparent) !important;
}
#today .nightTeamIdentityContext .shiftIdentityMark {
  width: 78px !important;
  min-width: 78px !important;
  height: 78px !important;
  min-height: 78px !important;
  border-radius: 20px !important;
  box-shadow: 0 8px 22px rgba(0,0,0,.22);
}
#today .nightTeamIdentityContext .shiftIdentityCopy {
  min-width: 0 !important;
  margin-left: 13px !important;
  padding-left: 14px !important;
  border-left: 1px solid color-mix(in srgb, var(--shift-identity-accent, var(--liquid-accent)) 26%, var(--unified-border));
}
#today .nightTeamIdentityContext .shiftIdentityCopy strong {
  font-size: clamp(24px, 7vw, 31px) !important;
  font-weight: 840 !important;
  line-height: 1 !important;
  letter-spacing: -.04em !important;
  text-shadow: 0 0 18px color-mix(in srgb, var(--liquid-accent) 8%, transparent);
}
#today .nightTeamIdentityContext .shiftIdentityCopy small {
  margin-top: 7px !important;
  color: color-mix(in srgb, var(--liquid-text) 68%, var(--liquid-secondary)) !important;
  font-size: 11.5px !important;
  font-weight: 570 !important;
  line-height: 1.3 !important;
}
#today .nightTeamIdentityContext::after {
  right: 15px !important;
  color: color-mix(in srgb, var(--liquid-accent) 45%, var(--liquid-secondary)) !important;
  font-size: 31px !important;
}

/* Keep date functionality visible, but make it a quiet rail rather than a third hero card. */
#today .dateNav.rosterDateControl {
  min-height: 43px !important;
  margin: 0 6px !important;
  border-color: color-mix(in srgb, var(--liquid-accent) 18%, var(--unified-border)) !important;
  border-radius: 15px !important;
  background: color-mix(in srgb, var(--liquid-secondary) 5%, transparent) !important;
  box-shadow: inset 0 1px 0 color-mix(in srgb, white 6%, transparent) !important;
}
#today .rosterDateText,
#today .dateNav.rosterDateControl::before {
  font-size: 13.5px !important;
  font-weight: 760 !important;
}

/* Greeting belongs to the hero, but should breathe below the team identity. */
#today .nightSectionIdentity {
  padding: 18px 7px 6px !important;
}
#today .nightUnifiedHero .nightSectionIdentity h1 {
  max-width: 100% !important;
  font-size: clamp(31px, 8.8vw, 39px) !important;
  font-weight: 850 !important;
  line-height: .99 !important;
  letter-spacing: -.05em !important;
  text-shadow: 0 3px 18px rgba(0,0,0,.16);
}

/* Other primary screens inherit the same DNA at lower intensity. */
#changes .appScreenHeader,
#breaks .appScreenHeader,
#chat .appScreenHeader {
  border-color: var(--hero-edge-soft) !important;
  background:
    radial-gradient(circle at 90% 5%, color-mix(in srgb, var(--liquid-accent) 12%, transparent), transparent 34%),
    linear-gradient(145deg,
      color-mix(in srgb, var(--liquid-accent) 7%, var(--unified-surface)),
      var(--unified-surface)) !important;
  box-shadow: 0 10px 30px rgba(0,0,0,.10) !important;
}
#changes .primaryInstitutionBrand img,
#breaks .primaryInstitutionBrand img,
#chat .primaryInstitutionBrand img {
  max-width: 116px !important;
  max-height: 28px !important;
}
#changes .primaryInstitutionBrand > span,
#breaks .primaryInstitutionBrand > span,
#chat .primaryInstitutionBrand > span {
  border-color: color-mix(in srgb, var(--liquid-accent) 24%, var(--unified-border)) !important;
  background: color-mix(in srgb, var(--liquid-accent) 5%, var(--unified-surface)) !important;
}
#changes .nightTeamIdentityContext,
#breaks .nightTeamIdentityContext,
#chat .chatShiftIdentity {
  border-color: color-mix(in srgb, var(--shift-identity-accent, var(--liquid-accent)) 24%, var(--unified-border)) !important;
  box-shadow: 0 8px 20px rgba(0,0,0,.055) !important;
}

/* Restraint outside the hero keeps operational content dominant. */
.quickPrimaryAction,
.quickReviewAction,
.quickCompactAction,
.personalisationGroup,
.accountGroup,
#admin .panel,
#admin .adminPanel,
#admin .adminGroup,
#admin .historyItem,
#admin .contentSurface {
  box-shadow: 0 7px 20px rgba(0,0,0,.045) !important;
}
.bottom.reactTabs {
  border-color: color-mix(in srgb, var(--liquid-accent) 20%, var(--unified-border)) !important;
  box-shadow: 0 14px 34px rgba(0,0,0,.16) !important;
}

@media (max-width: 430px) {
  #today .nightUnifiedHero {
    padding-inline: 9px !important;
    border-radius: 25px !important;
  }
  #today .hospitalStrip {
    grid-template-columns: minmax(102px, 1fr) auto !important;
    min-height: 60px !important;
    padding: 8px 51px 5px 5px !important;
  }
  #today .hospitalStrip img {
    max-width: 126px !important;
    max-height: 36px !important;
  }
  #today .hospitalStrip > span {
    max-width: 158px !important;
    min-height: 30px !important;
    padding: 4px 8px 4px 26px !important;
    font-size: 8.1px !important;
  }
  #today .hospitalStrip > span::before { left: 9px; width: 12px; height: 12px; }
  #today .accountBtn {
    width: 42px !important;
    min-width: 42px !important;
    height: 42px !important;
    min-height: 42px !important;
    box-shadow: 0 0 0 5px color-mix(in srgb, var(--liquid-accent) 7%, transparent) !important;
  }
  #today .nightTeamIdentityContext {
    min-height: 92px !important;
    grid-template-columns: 68px minmax(0,1fr) !important;
    padding: 10px 38px 10px 10px !important;
    border-radius: 21px !important;
  }
  #today .nightTeamIdentityContext .shiftIdentityMark {
    width: 68px !important;
    min-width: 68px !important;
    height: 68px !important;
    min-height: 68px !important;
    border-radius: 18px !important;
  }
  #today .nightTeamIdentityContext .shiftIdentityCopy {
    margin-left: 11px !important;
    padding-left: 11px !important;
  }
  #today .nightTeamIdentityContext .shiftIdentityCopy strong {
    font-size: clamp(22px, 6.8vw, 27px) !important;
  }
  #today .nightTeamIdentityContext .shiftIdentityCopy small {
    margin-top: 5px !important;
    font-size: 10.7px !important;
  }
  #today .nightSectionIdentity { padding: 16px 6px 5px !important; }
  #today .nightUnifiedHero .nightSectionIdentity h1 {
    font-size: clamp(29px, 8.6vw, 35px) !important;
  }
}

@media (max-width: 370px) {
  #today .hospitalStrip {
    grid-template-columns: 94px minmax(0,1fr) !important;
    gap: 5px !important;
    padding-right: 46px !important;
  }
  #today .hospitalStrip img { max-width: 98px !important; max-height: 31px !important; }
  #today .hospitalStrip > span {
    max-width: 142px !important;
    padding-left: 23px !important;
    font-size: 7.5px !important;
  }
  #today .hospitalStrip > span::before { left: 7px; width: 11px; height: 11px; }
  #today .nightTeamIdentityContext {
    grid-template-columns: 61px minmax(0,1fr) !important;
    padding-right: 34px !important;
  }
  #today .nightTeamIdentityContext .shiftIdentityMark {
    width: 61px !important;
    min-width: 61px !important;
    height: 61px !important;
    min-height: 61px !important;
  }
  #today .nightTeamIdentityContext .shiftIdentityCopy strong { font-size: 21px !important; }
  #today .nightTeamIdentityContext .shiftIdentityCopy small { font-size: 9.8px !important; }
}

@media (prefers-reduced-transparency: reduce) {
  #today .nightUnifiedHero,
  #changes .appScreenHeader,
  #breaks .appScreenHeader,
  #chat .appScreenHeader {
    background: var(--unified-surface) !important;
    box-shadow: none !important;
  }
}
'''

path.write_text(css)

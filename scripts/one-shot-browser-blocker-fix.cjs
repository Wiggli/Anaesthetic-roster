const fs = require('fs');

const file = 'night-intelligence.js';
let source = fs.readFileSync(file, 'utf8');

function replaceExact(before, after, label) {
  if (!source.includes(before)) {
    throw new Error(`Unable to apply ${label}: expected source was not found`);
  }
  source = source.replace(before, after);
}

replaceExact(
  '<button type="button" id="nightRecommendedAction" class="nightIntelligenceRecommended"><span><b id="nightRecommendedTitle">Review this night</b><small id="nightRecommendedDetail"></small></span><span aria-hidden="true">›</span></button>',
  '<button type="button" id="nightRecommendedAction" class="nightIntelligenceRecommended" aria-label="Open Night Intelligence recommendation" aria-describedby="nightRecommendedTitle nightRecommendedDetail"><span><b id="nightRecommendedTitle">Review this night</b><small id="nightRecommendedDetail"></small></span><span aria-hidden="true">›</span></button>',
  'unique recommendation accessibility identity'
);

replaceExact(
  "function niScheduleRender(delay){clearTimeout(state.refreshTimer);state.refreshTimer=setTimeout(function(){niRenderCentre();niRenderAttention();niApplyDensity();niAccessibilityPass()},delay==null?80:delay)}",
  "function niScheduleRender(delay){\n  var wait=delay==null?80:Math.max(0,Number(delay)||0);\n  if(state.refreshTimer)return;\n  state.refreshTimer=setTimeout(function(){state.refreshTimer=null;niRenderCentre();niRenderAttention();niApplyDensity();niAccessibilityPass()},wait)\n}",
  'non-starving render scheduler'
);

fs.writeFileSync(file, source);

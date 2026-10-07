(function(){
  var preference='system';
  try{preference=localStorage.getItem('anaes_theme')||'system'}catch(error){}
  if(['light','system','dark'].indexOf(preference)<0)preference='system';
  var dark=preference==='dark'||(preference==='system'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  var background=dark?'#000000':'#f2f2f7';
  document.documentElement.setAttribute('data-theme',dark?'dark':'light');
  document.documentElement.style.colorScheme=dark?'dark':'light';
  document.documentElement.style.backgroundColor=background;
  var colour=document.querySelector('meta[name="theme-color"]');
  if(colour)colour.setAttribute('content',background);

  function ensurePwaSafeAreaStyles(){
    if(document.querySelector('link[data-pwa-safe-area]'))return;
    var link=document.createElement('link');
    link.rel='stylesheet';
    link.href='pwa-safe-area.css?v=50.7';
    link.setAttribute('data-pwa-safe-area','');
    document.head.appendChild(link);
  }

  function ensureNightIntelligence(){
    if(!document.querySelector('link[data-night-intelligence-style]')){
      var style=document.createElement('link');
      style.rel='stylesheet';
      style.href='night-intelligence.css?v=50.7';
      style.setAttribute('data-night-intelligence-style','');
      document.head.appendChild(style);
    }
    if(!document.querySelector('script[data-night-intelligence]')){
      var script=document.createElement('script');
      script.src='night-intelligence.js?v=50.7';
      script.setAttribute('data-night-intelligence','');
      document.head.appendChild(script);
    }
  }

  function ensureNightAI(){
    if(!document.querySelector('link[data-night-ai-style]')){
      var style=document.createElement('link');
      style.rel='stylesheet';
      style.href='night-ai.css?v=50.7';
      style.setAttribute('data-night-ai-style','');
      document.head.appendChild(style);
    }
    if(!document.querySelector('script[data-night-ai]')){
      var script=document.createElement('script');
      script.src='night-ai.js?v=50.7';
      script.setAttribute('data-night-ai','');
      document.head.appendChild(script);
    }
  }

  ensureNightIntelligence();
  ensureNightAI();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensurePwaSafeAreaStyles,{once:true});
  else ensurePwaSafeAreaStyles();
})();

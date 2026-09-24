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
})();

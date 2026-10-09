const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const storage = new Map();
const noopElement = () => ({
  classList: { add(){}, remove(){}, toggle(){} },
  style: {}, dataset: {}, value: '', textContent: '', innerHTML: '', disabled: false,
  querySelectorAll(){ return []; }, querySelector(){ return null; },
  setAttribute(){}, removeAttribute(){}, addEventListener(){}, focus(){}
});
const context = {
  console, Date, Intl, Math, JSON, Set, Map, Array, Object, String, Number, Promise, Blob, URL,
  setTimeout, clearTimeout, setInterval(){ return 0; }, clearInterval(){},
  navigator: { onLine: true, userAgent: 'property-test', serviceWorker: {} },
  localStorage: {
    getItem(key){ return storage.has(key) ? storage.get(key) : null; },
    setItem(key,value){ storage.set(key,String(value)); },
    removeItem(key){ storage.delete(key); }
  },
  document: {
    visibilityState: 'visible', body: noopElement(),
    getElementById(){ return noopElement(); },
    querySelector(){ return null; }, querySelectorAll(){ return []; },
    createElement(){ return noopElement(); }
  },
  window: {
    supabase: null, addEventListener(){}, dispatchEvent(){},
    matchMedia(){ return { matches:false }; }, scrollTo(){}, navigator: {}
  },
  confirm(){ return true; }, alert(){}
};
context.window.window=context.window;
vm.createContext(context);
for(const file of ['app-core.js','app-ui.js']){
  const source=fs.readFileSync(path.join(__dirname,'../..',file),'utf8').replace(/\nbind\(\);\s*\ninitApplication\(\);\s*$/,'');
  vm.runInContext(source,context,{filename:file});
}

module.exports=context;

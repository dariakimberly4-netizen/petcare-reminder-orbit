(()=>{
  'use strict';
  const api=window.PetCareSupabase;
  const exposeAndRun=(src)=>{
    let fixed=src.replace("},0)}\nif(m==='documents')","},0);\nif(m==='documents')");
    fixed=fixed.replace("const KEY='petcare-reminder-orbit-v1';","const KEY=(window.PetCareSupabase?.active?'petcare-reminder-orbit-secure':'petcare-reminder-orbit-v1');");
    fixed=fixed.replace("let data;try{data=JSON.parse(localStorage.getItem(KEY))||seed()}catch(e){data=seed()}let selected='p1'","let data;try{data=(window.PetCareSupabase?.active&&window.PetCareSupabase.initialData)||JSON.parse(localStorage.getItem(KEY))||seed()}catch(e){data=seed()}let selected=(data.pets&&data.pets[0]?data.pets[0].id:'p1')");
    fixed=fixed.replace("save=()=>localStorage.setItem(KEY,JSON.stringify(data))","save=()=>{localStorage.setItem(KEY,JSON.stringify(data));if(window.PetCareSupabase?.active)window.PetCareSupabase.syncLegacy(data)}");
    ["'p'+Date.now()","'v'+Date.now()","'m'+Date.now()","'g'+Date.now()","'a'+Date.now()","'d'+Date.now()"].forEach(x=>{fixed=fixed.split(x).join("(window.PetCareSupabase?.newId?.()||crypto.randomUUID())")});
    fixed=fixed.replace("text:location.href+'#pet='+p.id","text:(window.PetCareSupabase?.cardUrl?.(p)||location.href+'#pet='+p.id)");
    const wrapped=fixed+"\n;try{window.enter=enter;window.renderOrbit=renderOrbit;window.renderOwner=renderOwner;window.renderClinic=renderClinic;window.center=center;window.petcareGetData=()=>data;window.petcareGetSelected=()=>pet();window.petcareRenderOwner=renderOwner;window.petcareRenderClinic=renderClinic;}catch(e){}";
    new Function(wrapped)();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    setTimeout(()=>{
      try{
        if(typeof window.renderOrbit==='function'){
          window.renderOrbit('owner');
          window.renderOrbit('clinic');
        }
        if(window.PetCareSupabase?.active){
          window.PetCareSupabase.installSecureChrome?.();
          if(typeof window.enter==='function') window.enter(window.PetCareSupabase.openMode||'owner');
        }else{
          const p=new URLSearchParams(location.search);
          if(p.get('mode')==='demo'&&p.get('enter')&&typeof window.enter==='function') window.enter(p.get('enter'));
        }
      }catch(e){console.error('PetCare post-load error',e)}
    },100);
  };
  const fallback=()=>{
    const s=document.createElement('script');
    s.src='main.js?v=10';
    s.onload=()=>document.dispatchEvent(new Event('DOMContentLoaded'));
    document.head.appendChild(s);
  };
  Promise.resolve(api?.ready).catch(()=>true).then(()=>fetch('app.js?v=10',{cache:'no-store'}))
    .then(r=>{if(!r.ok)throw new Error('app.js '+r.status);return r.text()})
    .then(exposeAndRun)
    .catch(err=>{console.error('PetCare full app load failed',err);fallback()});
})();
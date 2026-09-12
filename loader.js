(()=>{
  'use strict';
  const exposeAndRun=(src)=>{
    const fixed=src.replace("},0)}\nif(m==='documents')","},0);\nif(m==='documents')");
    const wrapped=fixed+"\n;try{window.enter=enter;window.renderOrbit=renderOrbit;window.renderOwner=renderOwner;window.renderClinic=renderClinic;window.center=center;}catch(e){}";
    new Function(wrapped)();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    setTimeout(()=>{
      try{
        if(typeof window.renderOrbit==='function'){
          window.renderOrbit('owner');
          window.renderOrbit('clinic');
        }
        if(document.getElementById('clinicApp')?.classList.contains('active') && typeof window.renderClinic==='function') window.renderClinic('dashboard');
        if(document.getElementById('ownerApp')?.classList.contains('active') && typeof window.renderOwner==='function') window.renderOwner('home');
      }catch(e){console.error('PetCare post-load error',e)}
    },60);
  };
  const fallback=()=>{
    const s=document.createElement('script');
    s.src='main.js?v=6';
    s.onload=()=>document.dispatchEvent(new Event('DOMContentLoaded'));
    document.head.appendChild(s);
  };
  fetch('app.js?v=6',{cache:'no-store'})
    .then(r=>{if(!r.ok)throw new Error('app.js '+r.status);return r.text()})
    .then(exposeAndRun)
    .catch(err=>{console.error('PetCare full app load failed',err);fallback()});
})();
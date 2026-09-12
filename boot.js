(()=>{
  'use strict';
  function callEnter(mode){
    try{
      if(window.PetCareSupabase?.active){
        const base=location.origin+location.pathname;
        location.assign(base+'?mode=demo&enter='+encodeURIComponent(mode));
        return;
      }
      if(typeof window.enter==='function') return window.enter(mode);
      const target=document.getElementById(mode==='owner'?'ownerApp':'clinicApp');
      document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
      if(target) target.classList.add('active');
      if(mode==='owner'){
        if(typeof window.renderOrbit==='function') window.renderOrbit('owner');
        if(typeof window.renderOwner==='function') window.renderOwner('home');
      }else{
        if(typeof window.renderOrbit==='function') window.renderOrbit('clinic');
        if(typeof window.renderClinic==='function') window.renderClinic('dashboard');
      }
      window.scrollTo(0,0);
    }catch(err){
      console.error('PetCare boot error',err);
      alert('The demo could not open. Please refresh the page once and try again.');
    }
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-enter]');
    if(!b) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    callEnter(b.dataset.enter);
  },true);
  function boot(){
    try{
      if(typeof window.renderOrbit==='function'){
        window.renderOrbit('owner');
        window.renderOrbit('clinic');
      }
      if(typeof window.center==='function') window.center();
    }catch(err){ console.error('PetCare initialization error',err); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
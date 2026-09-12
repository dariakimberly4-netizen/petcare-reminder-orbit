(()=>{
  'use strict';
  const navState={owner:{open:false,module:null,scrollY:0},clinic:{open:false,module:null,scrollY:0}};
  let wrapped=false;

  const shell=mode=>document.getElementById(mode==='owner'?'ownerApp':'clinicApp');
  const panel=mode=>document.getElementById(mode==='owner'?'ownerPanel':'clinicPanel');
  const orbit=mode=>document.getElementById(mode==='owner'?'ownerOrbit':'clinicOrbit');

  function decorate(mode){
    const p=panel(mode);if(!p||!navState[mode].open)return;
    let bar=p.querySelector(':scope > .workspace-toolbar');
    if(!bar){
      bar=document.createElement('div');
      bar.className='workspace-toolbar';
      bar.innerHTML='<button type="button" class="workspace-back" data-workspace-back>← BACK TO ORBIT</button><button type="button" class="workspace-close" data-workspace-close>✕ CLOSE</button>';
      p.prepend(bar);
    }
    p.setAttribute('aria-hidden','false');
  }

  function closeWorkspace(mode,{restoreScroll=true}={}){
    const s=shell(mode),p=panel(mode);if(!s)return;
    s.classList.remove('workspace-open');
    navState[mode].open=false;
    navState[mode].module=null;
    if(p){p.setAttribute('aria-hidden','true');p.querySelector(':scope > .workspace-toolbar')?.remove()}
    requestAnimationFrame(()=>{
      if(restoreScroll) window.scrollTo({top:navState[mode].scrollY||0,behavior:'auto'});
      try{orbit(mode)?.focus({preventScroll:true})}catch{}
      try{window.PetCareSmartHub?.updateCenters?.()}catch{}
    });
  }

  function beginWorkspace(mode,module){
    if(!navState[mode].open)navState[mode].scrollY=window.scrollY;
    navState[mode].open=true;
    navState[mode].module=module;
    const s=shell(mode);if(!s)return null;
    s.classList.add('workspace-open');
    return s;
  }

  function openWorkspace(mode,module){
    const render=mode==='owner'?(window.petcareRenderOwner||window.renderOwner):(window.petcareRenderClinic||window.renderClinic);
    if(typeof render!=='function')return;
    const s=beginWorkspace(mode,module);if(!s)return;
    render(module);
    decorate(mode);
    requestAnimationFrame(()=>window.scrollTo({top:s.offsetTop||0,behavior:'auto'}));
  }

  function showCustom(mode,html,module='custom'){
    const p=panel(mode),s=beginWorkspace(mode,module);if(!p||!s)return;
    p.innerHTML=html;
    decorate(mode);
    requestAnimationFrame(()=>window.scrollTo({top:s.offsetTop||0,behavior:'auto'}));
  }

  function refreshCustom(mode,html){
    const p=panel(mode);if(!p||!navState[mode].open)return;
    p.innerHTML=html;
    decorate(mode);
  }

  function installEnterWrapper(){
    if(wrapped||typeof window.enter!=='function')return false;
    const original=window.enter;
    window.enter=function(mode){
      const out=original(mode);
      closeWorkspace(mode,{restoreScroll:false});
      try{window.renderOrbit?.(mode)}catch{}
      try{window.PetCareSmartHub?.updateCenters?.()}catch{}
      return out;
    };
    wrapped=true;
    return true;
  }

  document.addEventListener('click',e=>{
    const close=e.target.closest('[data-workspace-close],[data-workspace-back]');
    if(close){
      e.preventDefault();e.stopImmediatePropagation();
      const mode=close.closest('#clinicApp')?'clinic':'owner';
      closeWorkspace(mode);
      return;
    }

    const ownerNode=e.target.closest('[data-owner-module]');
    if(ownerNode){
      e.preventDefault();e.stopImmediatePropagation();
      openWorkspace('owner',ownerNode.dataset.ownerModule);
      return;
    }

    const clinicNode=e.target.closest('[data-clinic-module]');
    if(clinicNode){
      e.preventDefault();e.stopImmediatePropagation();
      openWorkspace('clinic',clinicNode.dataset.clinicModule);
      return;
    }

    const bottom=e.target.closest('#ownerApp .bottom-nav [data-module]');
    if(bottom){
      e.preventDefault();e.stopImmediatePropagation();
      openWorkspace('owner',bottom.dataset.module);
      return;
    }

    const action=e.target.closest('[data-action]');
    if(action?.dataset.action==='home-summary'){
      e.preventDefault();e.stopImmediatePropagation();
      openWorkspace('owner','home');
      return;
    }
    if(action?.dataset.action==='center-status'){
      e.preventDefault();e.stopImmediatePropagation();
      if(window.PetCareSmartHub?.open)window.PetCareSmartHub.open('owner');else openWorkspace('owner','home');
      return;
    }
    if(action?.dataset.action==='clinic-dashboard'){
      e.preventDefault();e.stopImmediatePropagation();
      if(action.classList.contains('clinic-center')&&window.PetCareSmartHub?.open)window.PetCareSmartHub.open('clinic');
      else openWorkspace('clinic','dashboard');
    }
  },true);

  const mo=new MutationObserver(()=>{
    if(navState.owner.open)decorate('owner');
    if(navState.clinic.open)decorate('clinic');
    installEnterWrapper();
  });
  mo.observe(document.documentElement,{childList:true,subtree:true});

  const timer=setInterval(()=>{
    if(installEnterWrapper())clearInterval(timer);
  },25);
  setTimeout(()=>clearInterval(timer),10000);

  window.PetCareWorkspace={
    open:openWorkspace,
    showCustom,
    refreshCustom,
    close:closeWorkspace,
    isOpen:mode=>!!navState[mode]?.open,
    current:mode=>navState[mode]?.module||null
  };
})();

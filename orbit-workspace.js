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
    if(mode==='clinic'&&module==='triage'){
      const p=panel(mode),s=beginWorkspace(mode,module);if(!p||!s)return;
      p.innerHTML='<div class="card"><div class="card-head"><div><span class="smart-eyebrow">EMERGENCY CARE</span><h2>Emergency & Triage</h2><p>Assess urgency, record vital signs and prioritize emergency patients.</p></div><button class="btn btn-primary" data-new-triage>+ NEW TRIAGE</button></div><div class="grid two"><div class="stat-card"><strong>1</strong><small>Critical</small></div><div class="stat-card"><strong>2</strong><small>Urgent</small></div><div class="stat-card"><strong>3</strong><small>Waiting</small></div><div class="stat-card"><strong>1</strong><small>Vet Assigned</small></div></div><div class="smart-grid"><button class="smart-action">TRIAGE QUEUE</button><button class="smart-action">VITAL SIGNS</button><button class="smart-action">PRIORITY LEVEL</button><button class="smart-action">ASSIGN VET</button><button class="smart-action">EMERGENCY NOTES</button><button class="smart-action">TRANSFER TO CONSULTATION</button></div></div>';
      decorate(mode);requestAnimationFrame(()=>window.scrollTo({top:s.offsetTop||0,behavior:'auto'}));return;
    }
    if(mode==='clinic'&&module==='confinement'){
      const p=panel(mode),s=beginWorkspace(mode,module);if(!p||!s)return;
      p.innerHTML='<div class="card"><div class="card-head"><div><span class="smart-eyebrow">INPATIENT CARE</span><h2>Admission & Confinement</h2><p>Manage admitted pets from check-in through discharge.</p></div><button class="btn btn-primary" data-new-admission>+ NEW ADMISSION</button></div><div class="grid two"><div class="stat-card"><strong>3</strong><small>Currently Admitted</small></div><div class="stat-card"><strong>7</strong><small>Kennels Available</small></div><div class="stat-card"><strong>1</strong><small>For Discharge</small></div><div class="stat-card"><strong>1</strong><small>Critical</small></div></div><div class="smart-grid"><button class="smart-action">ADMISSION RECORD</button><button class="smart-action">KENNEL / ROOM</button><button class="smart-action">DAILY TREATMENT</button><button class="smart-action">MEDICATION SCHEDULE</button><button class="smart-action">FEEDING & FLUIDS</button><button class="smart-action">VITALS MONITORING</button><button class="smart-action">VET NOTES</button><button class="smart-action">DISCHARGE & FOLLOW-UP</button></div></div>';
      decorate(mode);requestAnimationFrame(()=>window.scrollTo({top:s.offsetTop||0,behavior:'auto'}));return;
    }
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

    const triage=e.target.closest('[data-new-triage]');
    if(triage){
      e.preventDefault();e.stopImmediatePropagation();
      const p=panel('clinic');if(!p)return;
      const old=p.querySelector('.triage-form');if(old){old.scrollIntoView({behavior:'smooth'});return}
      const form=document.createElement('div');form.className='card triage-form';
      form.innerHTML='<h2>New Emergency Triage</h2><form data-triage-form><div class="form-grid"><div class="field"><label>Pet Name</label><input name="pet" required></div><div class="field"><label>Owner Name</label><input name="owner" required></div><div class="field"><label>Chief Complaint</label><input name="complaint" required></div><div class="field"><label>Priority</label><select name="priority" required><option>CRITICAL</option><option>URGENT</option><option>STABLE</option></select></div><div class="field"><label>Temperature</label><input name="temp"></div><div class="field"><label>Heart Rate</label><input name="hr"></div><div class="field"><label>Respiratory Rate</label><input name="rr"></div><div class="field"><label>Assigned Vet</label><input name="vet"></div><div class="field full"><label>Emergency Notes</label><textarea name="notes" rows="3"></textarea></div><div class="field full"><button class="btn btn-primary" type="submit">SAVE & ADD TO TRIAGE QUEUE</button></div></div></form>';
      p.appendChild(form);form.scrollIntoView({behavior:'smooth'});
      form.querySelector('form').addEventListener('submit',ev=>{ev.preventDefault();form.innerHTML='<h2>Triage Saved</h2><p class="smart-note">Patient added to the emergency triage queue.</p>';});
      return;
    }

    const admission=e.target.closest('[data-new-admission]');
    if(admission){
      e.preventDefault();e.stopImmediatePropagation();
      const p=panel('clinic');if(!p)return;
      const existing=p.querySelector('.admission-form');if(existing){existing.scrollIntoView({behavior:'smooth'});return}
      const form=document.createElement('div');form.className='card admission-form';
      form.innerHTML='<h2>New Admission</h2><form data-admission-form><div class="form-grid"><div class="field"><label>Pet Name</label><input name="pet" required></div><div class="field"><label>Owner Name</label><input name="owner" required></div><div class="field"><label>Reason for Admission</label><input name="reason" required></div><div class="field"><label>Veterinarian</label><input name="vet" required></div><div class="field"><label>Kennel / Room</label><input name="kennel" required></div><div class="field"><label>Admission Date</label><input name="date" type="date" required></div><div class="field full"><label>Initial Notes</label><textarea name="notes" rows="3"></textarea></div><div class="field full"><button class="btn btn-primary" type="submit">SAVE ADMISSION</button></div></div></form>';
      p.appendChild(form);form.scrollIntoView({behavior:'smooth'});
      form.querySelector('form').addEventListener('submit',ev=>{ev.preventDefault();form.innerHTML='<h2>Admission Saved</h2><p class="smart-note">The patient has been added to Admission & Confinement.</p>';});
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

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
    const ownerHubs={
      'pets-hub':['My Pets','PET PROFILE',['Pet Profile','Owner Details','Medical History','Allergies & Conditions','Microchip','Add / Switch Pet']],
      'health-hub':['Health','PET HEALTH',['Vaccinations','Deworming','Medications','Prescriptions','Lab Results','Diagnostic Results','Admission Status','Discharge Instructions']],
      'appointments-hub':['Appointments','VET VISITS',['Book Appointment','Upcoming Visits','Reschedule / Cancel','Visit History','Follow-Ups']],
      'care-hub':['Care & Reminders','PET CARE',['Vaccine Reminders','Medication Reminders','Deworming Reminders','Grooming Reminders','Follow-Up Reminders']],
      'grooming-hub':['Grooming & Services','PET SERVICES',['Book Grooming','Upcoming Grooming','Service Status','Grooming History']],
      'records-hub':['Records & Documents','PET RECORDS',['Digital Vaccine Card','Medical Records','Certificates','Prescriptions','Lab Reports','Emergency Pet Card','Share Pet Record']],
      'payments-hub':['Bills & Payments','PAYMENTS',['Current Balance','Bills','Payment History','Receipts']],
      'account-hub':['My Account','OWNER ACCOUNT',['Owner Profile','Contact Details','Emergency Contact','Notification Preferences','Security']]
    };
    if(mode==='owner'&&ownerHubs[module]){
      const p=panel(mode),s=beginWorkspace(mode,module);if(!p||!s)return;
      const x=ownerHubs[module];
      p.innerHTML='<div class="card owner-hub-workspace"><div class="card-head"><div><span class="smart-eyebrow">'+x[1]+'</span><h2>'+x[0]+'</h2><p>Select a pet-owner function.</p></div></div><div class="smart-grid">'+x[2].map(v=>'<button class="smart-action" data-owner-hub-action="'+v+'">'+v+'</button>').join('')+'</div><div class="smart-grid owner-quick-tools">'+(module==='account-hub'?'<button class="smart-action" data-owner-feature="owner-profile">EDIT OWNER PROFILE</button><button class="smart-action" data-owner-feature="security">SETTINGS & SECURITY</button>':module==='pets-hub'?'<button class="smart-action" data-owner-feature="pet-profile">EDIT PET PROFILE</button>':module==='appointments-hub'?'<button class="smart-action" data-owner-feature="appointment">BOOK APPOINTMENT</button>':module==='care-hub'?'<button class="smart-action" data-owner-feature="reminder">CREATE REMINDER</button>':module==='records-hub'?'<button class="smart-action" data-owner-feature="emergency">EMERGENCY PET CARD</button>':'')+'</div></div>';
      decorate(mode);requestAnimationFrame(()=>window.scrollTo({top:s.offsetTop||0,behavior:'auto'}));return;
    }
    const hubs={
      'patients-hub':['Patients','PATIENT CARE',['Pet Registration','Owner Profile','Pet Profile','Medical History','Allergies & Alerts','Search Patient']],
      'queue-hub':['Appointments & Queue','FRONT DESK',['Appointments','Walk-In Registration','Check-In','Waiting Queue',"Today's Schedule",'Completed Visits']],
      'clinical-hub':['Clinical Care','MEDICAL CARE',['Consultation','Emergency & Triage','Admission & Confinement','Vital Signs','Diagnosis & Treatment','Vet Notes','Discharge & Follow-Up']],
      'preventive-hub':['Preventive Care','WELLNESS',['Vaccines','Deworming','Due & Overdue','Vaccine Schedule','Reminder Center','Follow-Up']],
      'diagnostics-hub':['Diagnostics','LAB & IMAGING',['Laboratory','Lab Requests','Lab Results','X-Ray / Ultrasound','Upload Results']],
      'pharmacy-hub':['Pharmacy & Inventory','MEDICINES & STOCK',['Prescriptions','Dispensing','Medicine Stock','Low Stock','Expiry Monitoring','Suppliers','Purchasing']],
      'billing-hub':['Billing & Cashier','PAYMENTS',['Current Charges','Payments','Receipts','Balances','Discounts','Cash Reconciliation','End-of-Day Closing']],
      'management-hub':['Clinic Management','ADMINISTRATION',['Reports','Documents & Certificates','Staff & Vets','Roles & Permissions','Audit Trail']]
    };
    if(mode==='clinic'&&hubs[module]){
      const p=panel(mode),s=beginWorkspace(mode,module);if(!p||!s)return;
      const x=hubs[module];
      p.innerHTML='<div class="card clinic-hub-workspace"><div class="card-head"><div><span class="smart-eyebrow">'+x[1]+'</span><h2>'+x[0]+'</h2><p>Select a clinic function.</p></div></div><div class="smart-grid">'+x[2].map(v=>'<button class="smart-action" data-hub-action="'+v+'">'+v+'</button>').join('')+'</div></div>';
      decorate(mode);requestAnimationFrame(()=>window.scrollTo({top:s.offsetTop||0,behavior:'auto'}));return;
    }
    if(mode==='clinic'&&['discharge','documents-clinic','staff','audit'].includes(module)){
      const p=panel(mode),s=beginWorkspace(mode,module);if(!p||!s)return;
      const cfg={
        discharge:['Discharge & Follow-Up','POST-VISIT CARE','Prepare discharge instructions and manage recovery follow-ups.',['READY FOR DISCHARGE','DISCHARGE INSTRUCTIONS','TAKE-HOME MEDICINES','FOLLOW-UP SCHEDULE','RECOVERY STATUS','NEXT APPOINTMENT']],
        'documents-clinic':['Documents & Certificates','CLINIC DOCUMENTS','Create, manage and print official patient documents.',['MEDICAL CERTIFICATE','VACCINATION CERTIFICATE','PRESCRIPTION','CONSENT FORM','LAB REPORT','PATIENT RECORD']],
        staff:['Staff & Vet Management','TEAM MANAGEMENT','Manage clinic staff, schedules, assignments and access.',['VETERINARIANS','ASSISTANTS','CASHIERS','STAFF SCHEDULE','ROLE & PERMISSIONS','DUTY ASSIGNMENTS']],
        audit:['Audit Trail & End-of-Day Closing','CONTROL & RECONCILIATION','Review activity history and close the clinic day securely.',['ACTIVITY LOG','PAYMENT CHANGES','VOIDED TRANSACTIONS','INVENTORY ADJUSTMENTS','EXPECTED VS ACTUAL CASH','PAYMENT BREAKDOWN','CASHIER CLOSING','END-OF-DAY REPORT']]
      }[module];
      p.innerHTML='<div class="card"><div class="card-head"><div><span class="smart-eyebrow">'+cfg[1]+'</span><h2>'+cfg[0]+'</h2><p>'+cfg[2]+'</p></div><button class="btn btn-primary" data-final-new="'+module+'">+ NEW</button></div><div class="smart-grid">'+cfg[3].map(x=>'<button class="smart-action">'+x+'</button>').join('')+'</div></div>';
      decorate(mode);requestAnimationFrame(()=>window.scrollTo({top:s.offsetTop||0,behavior:'auto'}));return;
    }
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

    const ownerFeature=e.target.closest('[data-owner-feature]');
    if(ownerFeature){
      e.preventDefault();e.stopImmediatePropagation();
      const feature=ownerFeature.dataset.ownerFeature,p=panel('owner');if(!p)return;
      const pet=window.petcareGetSelected?.()||{},data=window.petcareGetData?.()||{},owner=data.owner||{};
      const forms={
        'owner-profile':['Owner Profile',[['Full Name',owner.name||''],['Mobile',owner.mobile||''],['Email',owner.email||''],['Address',owner.address||''],['Emergency Contact',owner.emergency||'']]],
        'pet-profile':['Pet Profile',[['Pet Name',pet.name||''],['Breed',pet.breed||''],['Sex',pet.sex||''],['Birthday',pet.birthday||''],['Weight',pet.weight||''],['Microchip',pet.microchip||''],['Allergies',pet.allergies||''],['Conditions',pet.conditions||'']]],
        'appointment':['Book Appointment',[['Pet',pet.name||''],['Service','Routine Checkup'],['Veterinarian',pet.vet||''],['Date',''],['Time','']]],
        'reminder':['Create Reminder',[['Pet',pet.name||''],['Reminder Type','Vaccination'],['Title',''],['Date',''],['Repeat','None']]],
        'emergency':['Emergency Pet Card',[['Pet',pet.name||''],['Owner',owner.name||''],['Mobile',owner.mobile||''],['Allergies',pet.allergies||'None recorded'],['Conditions',pet.conditions||'None recorded'],['Veterinarian',pet.vet||'']]],
        'security':['Settings & Security',[['Notification Preference','All reminders'],['Email Notifications','Enabled'],['SMS Notifications','Enabled']]]
      };
      const f=forms[feature];if(!f)return;
      p.innerHTML='<div class="card owner-feature-workspace"><div class="card-head"><div><span class="smart-eyebrow">PET OWNER</span><h2>'+f[0]+'</h2></div></div><form data-owner-feature-form="'+feature+'"><div class="form-grid">'+f[1].map(x=>'<div class="field"><label>'+x[0]+'</label><input name="'+x[0].toLowerCase().replace(/ /g,'_')+'" value="'+String(x[1]).replace(/"/g,'&quot;')+'"></div>').join('')+'<div class="field full"><button class="btn btn-primary" type="submit">SAVE</button></div></div></form></div>';return;
    }
    const featureForm=e.target.closest('[data-owner-feature-form]');
    if(featureForm&&e.type==='submit'){
      e.preventDefault();e.stopImmediatePropagation();
      featureForm.insertAdjacentHTML('afterend','<div class="smart-note save-confirmation">✓ Saved successfully.</div>');
      return;
    }
    const ownerSub=e.target.closest('[data-owner-hub-action]');
    if(ownerSub){
      e.preventDefault();e.stopImmediatePropagation();
      const name=ownerSub.dataset.ownerHubAction,p=panel('owner');if(!p)return;
      const box=document.createElement('div');box.className='card owner-sub-workspace';
      box.innerHTML='<div class="card-head"><div><span class="smart-eyebrow">PET OWNER WORKSPACE</span><h2>'+name+'</h2><p>View and manage '+name.toLowerCase()+'.</p></div><button class="btn btn-primary" data-owner-add="'+name+'">+ ADD / UPDATE</button></div><div class="list"><div class="list-item"><div><strong>'+name+'</strong><small>Current pet record</small></div><button class="btn btn-outline" data-owner-view>VIEW DETAILS</button></div></div>';
      p.querySelector('.owner-hub-workspace')?.replaceWith(box);return;
    }
    const ownerAdd=e.target.closest('[data-owner-add]');
    if(ownerAdd){e.preventDefault();e.stopImmediatePropagation();const p=panel('owner'),f=document.createElement('div');f.className='card owner-record-form';f.innerHTML='<h2>'+ownerAdd.dataset.ownerAdd+'</h2><form><div class="form-grid"><div class="field"><label>Title / Record</label><input required></div><div class="field"><label>Date</label><input type="date"></div><div class="field full"><label>Details</label><textarea rows="4"></textarea></div><div class="field full"><button class="btn btn-primary" type="submit">SAVE</button></div></div></form>';p.appendChild(f);f.scrollIntoView({behavior:'smooth'});f.querySelector('form').addEventListener('submit',ev=>{ev.preventDefault();f.innerHTML='<h2>Saved</h2><p class="smart-note">Pet record updated successfully.</p>';});return}
    const ownerView=e.target.closest('[data-owner-view]');
    if(ownerView){
      e.preventDefault();e.stopImmediatePropagation();
      const p=panel('owner');if(!p)return;
      const card=ownerView.closest('.owner-sub-workspace');
      const title=card?.querySelector('h2')?.textContent?.trim()||'Owner Profile';
      const data=window.petcareGetData?.()||{};
      const pet=window.petcareGetSelected?.()||{};
      const owner=data.owner||{};
      const details=document.createElement('div');details.className='card owner-detail-view';
      details.innerHTML='<div class="card-head"><div><span class="smart-eyebrow">DETAILS</span><h2>'+title+'</h2></div><button class="btn btn-outline" data-owner-detail-close>CLOSE DETAILS</button></div>'+
        '<div class="smart-grid">'+
        '<div class="list-item"><div><strong>Owner</strong><small>'+(owner.name||'Not set')+'</small></div></div>'+
        '<div class="list-item"><div><strong>Mobile</strong><small>'+(owner.mobile||'Not set')+'</small></div></div>'+
        '<div class="list-item"><div><strong>Emergency Contact</strong><small>'+(owner.emergency||'Not set')+'</small></div></div>'+
        '<div class="list-item"><div><strong>Selected Pet</strong><small>'+(pet.name||'Not set')+(pet.breed?' · '+pet.breed:'')+'</small></div></div>'+
        '</div><div class="actions" style="margin-top:14px"><button class="btn btn-primary" data-owner-add="'+title+'">EDIT / UPDATE</button></div>';
      card?.insertAdjacentElement('afterend',details);details.scrollIntoView({behavior:'smooth'});return;
    }
    if(e.target.closest('[data-owner-detail-close]')){e.preventDefault();e.stopImmediatePropagation();e.target.closest('.owner-detail-view')?.remove();return}

    const sub=e.target.closest('[data-hub-action]');
    if(sub){
      e.preventDefault();e.stopImmediatePropagation();
      const name=sub.dataset.hubAction,p=panel('clinic');if(!p)return;
      const back=document.createElement('div');back.className='card clinic-sub-workspace';
      back.innerHTML='<div class="card-head"><div><span class="smart-eyebrow">CLINIC WORKSPACE</span><h2>'+name+'</h2><p>Manage '+name.toLowerCase()+' records and actions.</p></div><button class="btn btn-primary" data-sub-add="'+name+'">+ ADD RECORD</button></div><div class="search-box"><input data-sub-search placeholder="Search records"><button class="btn btn-primary" data-sub-search-btn>SEARCH</button></div><div class="list" data-sub-list><div class="list-item"><div><strong>'+name+' Sample Record</strong><small>Active · Updated today</small></div><div><button class="btn btn-outline" data-sub-view>VIEW</button> <button class="btn btn-outline" data-sub-edit>EDIT</button></div></div></div>';
      p.querySelector('.clinic-hub-workspace')?.replaceWith(back);
      return;
    }
    const addSub=e.target.closest('[data-sub-add]');
    if(addSub){
      e.preventDefault();e.stopImmediatePropagation();
      const p=panel('clinic'),box=document.createElement('div');box.className='card sub-record-form';
      box.innerHTML='<h2>Add '+addSub.dataset.subAdd+'</h2><form><div class="form-grid"><div class="field"><label>Patient / Record Name</label><input name="name" required></div><div class="field"><label>Date</label><input name="date" type="date" required></div><div class="field"><label>Status</label><select name="status"><option>ACTIVE</option><option>PENDING</option><option>COMPLETED</option></select></div><div class="field full"><label>Details / Notes</label><textarea name="notes" rows="4"></textarea></div><div class="field full"><button class="btn btn-primary" type="submit">SAVE</button> <button class="btn btn-outline" type="button" data-sub-cancel>CANCEL</button></div></div></form>';
      p.appendChild(box);box.scrollIntoView({behavior:'smooth'});
      box.querySelector('form').addEventListener('submit',ev=>{ev.preventDefault();const d=new FormData(ev.target),list=p.querySelector('[data-sub-list]');if(list)list.insertAdjacentHTML('afterbegin','<div class="list-item"><div><strong>'+String(d.get('name')).replace(/[<>]/g,'')+'</strong><small>'+String(d.get('status'))+' · Saved today</small></div><div><button class="btn btn-outline" data-sub-view>VIEW</button> <button class="btn btn-outline" data-sub-edit>EDIT</button></div></div>');box.remove();});
      return;
    }
    if(e.target.closest('[data-sub-cancel]')){e.preventDefault();e.target.closest('.sub-record-form')?.remove();return}
    if(e.target.closest('[data-sub-view]')){e.preventDefault();alert('Record details opened.');return}
    if(e.target.closest('[data-sub-edit]')){e.preventDefault();alert('Edit mode enabled for this record.');return}
    if(e.target.closest('[data-sub-search-btn]')){e.preventDefault();const p=panel('clinic'),q=(p.querySelector('[data-sub-search]')?.value||'').toLowerCase();p.querySelectorAll('[data-sub-list] .list-item').forEach(x=>x.style.display=x.textContent.toLowerCase().includes(q)?'':'none');return}

    const finalNew=e.target.closest('[data-final-new]');
    if(finalNew){
      e.preventDefault();e.stopImmediatePropagation();
      const p=panel('clinic');if(!p)return;
      const names={discharge:'New Discharge / Follow-Up','documents-clinic':'New Document / Certificate',staff:'New Staff / Vet Record',audit:'New Closing Record'};
      const form=document.createElement('div');form.className='card final-module-form';
      form.innerHTML='<h2>'+names[finalNew.dataset.finalNew]+'</h2><form><div class="form-grid"><div class="field"><label>Record / Patient Name</label><input required></div><div class="field"><label>Date</label><input type="date" required></div><div class="field full"><label>Details / Notes</label><textarea rows="4" required></textarea></div><div class="field full"><button class="btn btn-primary" type="submit">SAVE RECORD</button></div></div></form>';
      p.appendChild(form);form.scrollIntoView({behavior:'smooth'});
      form.querySelector('form').addEventListener('submit',ev=>{ev.preventDefault();form.innerHTML='<h2>Record Saved</h2><p class="smart-note">The clinic record has been saved successfully.</p>';});
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

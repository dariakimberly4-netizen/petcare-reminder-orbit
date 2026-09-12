(()=>{
  'use strict';

  const api=()=>window.PetCareSupabase;
  const data=()=>window.petcareGetData?.()||null;
  const pet=()=>window.petcareGetSelected?.()||null;
  const ws=()=>window.PetCareWorkspace;
  const today=()=>{
    const d=new Date();
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  };
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmt=d=>d?new Date(`${d}T00:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'—';
  const delta=d=>d?Math.ceil((new Date(`${d}T00:00:00`)-new Date(`${today()}T00:00:00`))/86400000):99999;
  const activeStatus=s=>!['COMPLETED','CANCELLED','CANCELED'].includes(String(s||'').toUpperCase());
  const byDate=(a,b)=>(a.date||'9999-12-31').localeCompare(b.date||'9999-12-31');
  const toast=msg=>{const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)};

  function ownerSnapshot(){
    const d=data(),p=pet();
    if(!d||!p)return null;
    const reminders=(d.reminders||[]).filter(x=>x.petId===p.id&&!x.done&&activeStatus(x.status));
    const vaccines=(d.vaccinations||[]).filter(x=>x.petId===p.id&&x.due);
    const meds=(d.medications||[]).filter(x=>x.petId===p.id&&String(x.status||'ACTIVE').toUpperCase()!=='COMPLETED'&&(!x.start||x.start<=today())&&(!x.end||x.end>=today()));
    const grooming=(d.grooming||[]).filter(x=>x.petId===p.id&&activeStatus(x.status)&&x.next).sort((a,b)=>a.next.localeCompare(b.next));
    const visits=(d.appointments||[]).filter(x=>x.petId===p.id&&activeStatus(x.status)&&x.date).sort((a,b)=>a.date.localeCompare(b.date));
    const overdueRem=reminders.filter(x=>delta(x.date)<0);
    const overdueVax=vaccines.filter(x=>delta(x.due)<0);
    const overdue=[...overdueRem.map(x=>({label:x.title||x.type,date:x.date,type:'Reminder'})),...overdueVax.map(x=>({label:x.name,date:x.due,type:'Vaccine'}))].sort(byDate);
    const dueSoonVax=vaccines.filter(x=>delta(x.due)>=0&&delta(x.due)<=30).sort((a,b)=>a.due.localeCompare(b.due));
    const nextVax=vaccines.filter(x=>delta(x.due)>=0).sort((a,b)=>a.due.localeCompare(b.due))[0]||overdueVax.sort((a,b)=>a.due.localeCompare(b.due))[0]||null;
    const nextGroom=grooming.find(x=>delta(x.next)>=0)||grooming[0]||null;
    const nextVisit=visits.find(x=>delta(x.date)>=0)||visits[0]||null;
    const activeReminders=reminders.sort((a,b)=>(a.date||'').localeCompare(b.date||''));
    const apptToday=visits.filter(x=>x.date===today());
    const groomingToday=grooming.filter(x=>x.next===today());

    let center={kicker:'ALL CAUGHT UP',title:'All caught up',meta:`${p.name} · No urgent care items`,tone:'good'};
    if(overdue.length){center={kicker:'NEEDS ATTENTION',title:`${overdue.length} overdue ${overdue.length===1?'item':'items'}`,meta:`${p.name} · Review care due`,tone:'attention'}}
    else if(meds.length){center={kicker:"TODAY'S MEDICATIONS",title:meds[0].name||`${meds.length} medication${meds.length===1?'':'s'}`,meta:`${p.name} · ${meds.length} active today`,tone:'due'}}
    else if(dueSoonVax.length){center={kicker:'VACCINE DUE SOON',title:dueSoonVax[0].name,meta:`${p.name} · ${fmt(dueSoonVax[0].due)}`,tone:'due'}}
    else if(apptToday.length){center={kicker:'VET VISIT TODAY',title:apptToday[0].type||'Appointment',meta:`${p.name} · ${apptToday[0].time||'Today'}`,tone:'due'}}
    else if(groomingToday.length){center={kicker:'GROOMING TODAY',title:groomingToday[0].service||'Grooming',meta:`${p.name} · ${groomingToday[0].time||'Today'}`,tone:'due'}}
    else {
      const upcoming=[];
      activeReminders.filter(x=>delta(x.date)>=0).forEach(x=>upcoming.push({label:x.title||x.type,date:x.date}));
      vaccines.filter(x=>delta(x.due)>=0).forEach(x=>upcoming.push({label:`${x.name} Vaccine`,date:x.due}));
      grooming.filter(x=>delta(x.next)>=0).forEach(x=>upcoming.push({label:x.service||'Grooming',date:x.next}));
      visits.filter(x=>delta(x.date)>=0).forEach(x=>upcoming.push({label:x.type||'Vet Visit',date:x.date}));
      upcoming.sort(byDate);
      if(upcoming[0]) center={kicker:'NEXT CARE DUE',title:upcoming[0].label,meta:`${p.name} · ${fmt(upcoming[0].date)}`,tone:'good'};
    }
    const overall=overdue.length?'NEEDS ATTENTION':(dueSoonVax.length||activeReminders.some(x=>delta(x.date)>=0&&delta(x.date)<=7))?'CARE DUE SOON':'ALL GOOD';
    return {p,reminders:activeReminders,vaccines,meds,grooming,visits,overdue,dueSoonVax,nextVax,nextGroom,nextVisit,overall,center};
  }

  function clinicSnapshot(){
    const d=data();if(!d)return null;
    const appointments=(d.appointments||[]).filter(x=>activeStatus(x.status));
    const todayAppts=appointments.filter(x=>x.date===today()).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
    const waiting=todayAppts.filter(x=>['CHECKED IN','WAITING','IN SERVICE'].includes(String(x.status||'').toUpperCase()));
    const vaccines=d.vaccinations||[];
    const dueToday=vaccines.filter(x=>x.due===today());
    const overdue=vaccines.filter(x=>x.due&&delta(x.due)<0);
    const grooming=d.grooming||[];
    const inService=grooming.filter(x=>['IN GROOMING','IN SERVICE'].includes(String(x.status||'').toUpperCase()));
    const ready=grooming.filter(x=>String(x.status||'').toUpperCase()==='READY FOR PICKUP');
    const urgent=(d.reminders||[]).filter(x=>!x.done&&x.date&&delta(x.date)<0);
    const returnVisits=appointments.filter(x=>x.date&&delta(x.date)>=0&&delta(x.date)<=30&&/follow|return/i.test(`${x.type||''} ${x.reason||''}`));
    const now=new Date();
    const nowMin=now.getHours()*60+now.getMinutes();
    const happening=todayAppts.filter(a=>{if(!a.time)return false;const [h,m]=a.time.split(':').map(Number);const mins=h*60+m;return Math.abs(mins-nowMin)<=45});

    let center={kicker:"TODAY'S CLINIC",title:'All clear',meta:'No urgent clinic items',tone:'good'};
    const attentionCount=overdue.length+urgent.length;
    if(attentionCount){center={kicker:'NEEDS ATTENTION',title:`${attentionCount} overdue ${attentionCount===1?'item':'items'}`,meta:`${overdue.length} vaccines · ${urgent.length} reminders`,tone:'attention'}}
    else if(waiting.length){center={kicker:'PETS WAITING',title:`${waiting.length} ${waiting.length===1?'pet':'pets'} checked in`,meta:'Open Today\'s Clinic to manage',tone:'due'}}
    else if(happening.length){center={kicker:'HAPPENING NOW',title:`${happening.length} appointment${happening.length===1?'':'s'}`,meta:'Current clinic schedule',tone:'due'}}
    else if(dueToday.length){center={kicker:'VACCINES DUE TODAY',title:`${dueToday.length} vaccine${dueToday.length===1?'':'s'}`,meta:'Review today’s vaccine list',tone:'due'}}
    else if(ready.length){center={kicker:'GROOMING READY',title:`${ready.length} ready for pickup`,meta:'Customer pickup pending',tone:'due'}}
    else if(todayAppts.length){center={kicker:"TODAY'S CLINIC",title:`${todayAppts.length} appointment${todayAppts.length===1?'':'s'}`,meta:`${dueToday.length} vaccines due · ${ready.length} pickup${ready.length===1?'':'s'}`,tone:'good'}};
    return {appointments,todayAppts,waiting,vaccines,dueToday,overdue,grooming,inService,ready,urgent,returnVisits,happening,center};
  }

  const card=(label,value,meta='')=>`<div class="smart-stat"><small>${esc(label)}</small><strong>${esc(value)}</strong>${meta?`<span>${esc(meta)}</span>`:''}</div>`;

  function ownerActionsHtml(){
    const readOnly=api()?.active&&String(api()?.state?.profile?.role||'').toUpperCase()==='VIEW ONLY';
    const actions=[
      ['mark-care','MARK CARE DONE',true],['book-vet','BOOK VET',true],['add-reminder','ADD REMINDER',true],['add-vaccine','ADD VACCINE RECORD',true],['book-groom','BOOK GROOMING',true],
      ['vaccine-card','OPEN VACCINE CARD',false],['emergency','OPEN EMERGENCY CARD',false],['timeline','VIEW HEALTH TIMELINE',false]
    ].filter(x=>!readOnly||!x[2]);
    return actions.map(([id,label])=>`<button class="smart-action" data-smart-action="${id}">${label}</button>`).join('');
  }

  function clinicActionsHtml(){
    const secure=!!api()?.active;
    const role=secure?String(api()?.state?.staffRole||'').toUpperCase():'DEMO';
    const allowed={
      'CLINIC ADMIN':['new-appt','find-pet','check-in','add-vaccine-clinic','add-visit','book-groom-clinic','reminder-center','today-report'],
      'VETERINARIAN':['new-appt','find-pet','add-vaccine-clinic','add-visit','reminder-center'],
      'RECEPTIONIST':['new-appt','find-pet','check-in','book-groom-clinic','reminder-center'],
      'GROOMER':['find-pet','book-groom-clinic'],
      'DEMO':['new-appt','find-pet','check-in','add-vaccine-clinic','add-visit','book-groom-clinic','reminder-center','today-report']
    }[role]||['find-pet'];
    const labels={
      'new-appt':'NEW APPOINTMENT','find-pet':'FIND PET','check-in':'CHECK IN PET','add-vaccine-clinic':'ADD VACCINE','add-visit':'ADD VISIT','book-groom-clinic':'BOOK GROOMING','reminder-center':'OPEN REMINDER CENTER','today-report':"VIEW TODAY'S REPORT"
    };
    return allowed.map(id=>`<button class="smart-action" data-smart-action="${id}">${labels[id]}</button>`).join('');
  }

  function ownerHtml(){
    const s=ownerSnapshot();if(!s)return '<div class="smart-hub"><h2>Pet Today</h2><p>No pet data available.</p></div>';
    const nextReminder=s.reminders[0];
    return `<div class="smart-hub smart-owner-hub">
      <div class="smart-hero"><div><span class="smart-eyebrow">SMART PET SUMMARY</span><h2>${esc(s.p.name)} Today</h2><p>${esc(s.p.species||'Pet')} · ${esc(s.p.breed||'')}</p></div><span class="smart-status ${s.overall==='NEEDS ATTENTION'?'attention':s.overall==='CARE DUE SOON'?'due':'good'}">${esc(s.overall)}</span></div>
      <div class="smart-grid">
        ${card('NEXT CARE DUE',nextReminder?nextReminder.title:(s.nextVax?`${s.nextVax.name} Vaccine`:'No urgent care'),nextReminder?fmt(nextReminder.date):(s.nextVax?fmt(s.nextVax.due):''))}
        ${card('OVERDUE CARE',String(s.overdue.length),s.overdue[0]?`${s.overdue[0].label} · ${fmt(s.overdue[0].date)}`:'None overdue')}
        ${card("TODAY'S MEDICATIONS",String(s.meds.length),s.meds[0]?s.meds.map(x=>x.name).slice(0,2).join(', '):'None active today')}
        ${card('NEXT VACCINE',s.nextVax?s.nextVax.name:'—',s.nextVax?fmt(s.nextVax.due):'No date recorded')}
        ${card('NEXT GROOMING',s.nextGroom?s.nextGroom.service:'—',s.nextGroom?fmt(s.nextGroom.next):'No booking')}
        ${card('NEXT VET VISIT',s.nextVisit?s.nextVisit.type:'—',s.nextVisit?`${fmt(s.nextVisit.date)}${s.nextVisit.time?' · '+s.nextVisit.time:''}`:'No appointment')}
        ${card('ACTIVE REMINDERS',String(s.reminders.length),s.reminders[0]?`${s.reminders[0].title} · ${fmt(s.reminders[0].date)}`:'No active reminders')}
        ${card('VACCINE STATUS',s.overdue.some(x=>x.type==='Vaccine')?'OVERDUE':s.dueSoonVax.length?'DUE SOON':'UP TO DATE',s.dueSoonVax[0]?`${s.dueSoonVax[0].name} · ${fmt(s.dueSoonVax[0].due)}`:'Based on entered due dates')}
      </div>
      <h3>Quick Actions</h3><div class="smart-actions">${ownerActionsHtml()}</div>
      <div class="smart-note">PetCare Reminder organizes records only. Vaccination schedules and treatment decisions remain with a licensed veterinarian.</div>
    </div>`;
  }

  function clinicHtml(){
    const s=clinicSnapshot();if(!s)return '<div class="smart-hub"><h2>Today\'s Clinic</h2><p>No clinic data available.</p></div>';
    const role=api()?.active?(api()?.state?.staffRole||'STAFF'):'DEMO';
    return `<div class="smart-hub smart-clinic-hub">
      <div class="smart-hero"><div><span class="smart-eyebrow">SMART CLINIC SUMMARY</span><h2>Today's Clinic</h2><p>${esc(role)} · Live operational view</p></div><span class="smart-status ${s.overdue.length||s.urgent.length?'attention':s.todayAppts.length||s.ready.length?'due':'good'}">${s.overdue.length||s.urgent.length?'NEEDS ATTENTION':s.todayAppts.length?'ACTIVE TODAY':'ALL CLEAR'}</span></div>
      <div class="smart-grid">
        ${card("TODAY'S APPOINTMENTS",String(s.todayAppts.length),s.todayAppts[0]?`${s.todayAppts[0].time||''} · ${s.todayAppts[0].type||'Appointment'}`:'No appointments today')}
        ${card('PETS WAITING / CHECKED IN',String(s.waiting.length),s.waiting.length?'Needs staff attention':'None waiting')}
        ${card('VACCINES DUE TODAY',String(s.dueToday.length),s.dueToday[0]?s.dueToday[0].name:'None due today')}
        ${card('OVERDUE VACCINES',String(s.overdue.length),s.overdue[0]?`${s.overdue[0].name} · ${fmt(s.overdue[0].due)}`:'None overdue')}
        ${card('GROOMING IN SERVICE',String(s.inService.length),s.inService[0]?s.inService[0].service:'None in service')}
        ${card('READY FOR PICKUP',String(s.ready.length),s.ready[0]?s.ready[0].service:'None ready')}
        ${card('RETURN VISITS DUE',String(s.returnVisits.length),s.returnVisits[0]?`${s.returnVisits[0].type} · ${fmt(s.returnVisits[0].date)}`:'No return visits due')}
        ${card('URGENT REMINDERS',String(s.urgent.length),s.urgent[0]?`${s.urgent[0].title} · ${fmt(s.urgent[0].date)}`:'No overdue reminders')}
      </div>
      <h3>Quick Actions</h3><div class="smart-actions">${clinicActionsHtml()}</div>
      <div class="smart-note">Clinic actions follow the signed-in staff role. Groomer views remain limited to grooming-related information.</div>
    </div>`;
  }

  function updateOwnerCenter(){
    const s=ownerSnapshot();if(!s)return;
    const center=document.querySelector('#ownerOrbit .center-orb');if(!center)return;
    const kicker=center.querySelector('#centerKicker')||center.querySelector('small');
    const title=center.querySelector('#centerTitle')||center.querySelector('strong');
    const meta=center.querySelector('#centerMeta')||center.querySelector('span');
    const em=center.querySelector('em');
    if(kicker)kicker.textContent=s.center.kicker;
    if(title)title.textContent=s.center.title;
    if(meta)meta.textContent=s.center.meta;
    if(em)em.textContent='OPEN SMART HUB';
    center.dataset.smartTone=s.center.tone;
  }

  function updateClinicCenter(){
    const s=clinicSnapshot();if(!s)return;
    const center=document.querySelector('#clinicOrbit .clinic-center');if(!center)return;
    const kicker=center.querySelector('small'),title=center.querySelector('strong'),meta=center.querySelector('span'),em=center.querySelector('em');
    if(kicker)kicker.textContent=s.center.kicker;
    if(title)title.textContent=s.center.title;
    if(meta)meta.textContent=s.center.meta;
    if(em)em.textContent='OPEN SMART HUB';
    center.dataset.smartTone=s.center.tone;
  }

  function updateCenters(){updateOwnerCenter();updateClinicCenter()}

  function open(mode){
    const html=mode==='clinic'?clinicHtml():ownerHtml();
    ws()?.showCustom?.(mode,html,'smart-hub');
  }
  function refresh(mode){
    const html=mode==='clinic'?clinicHtml():ownerHtml();
    if(ws()?.current?.(mode)==='smart-hub') ws()?.refreshCustom?.(mode,html);
    updateCenters();
  }

  function openModule(mode,module,selector){
    ws()?.open?.(mode,module);
    if(selector){
      let tries=0;const timer=setInterval(()=>{const el=document.querySelector(selector);if(el){clearInterval(timer);el.click()}else if(++tries>12)clearInterval(timer)},40);
    }
  }

  function demoAddReminder(){
    const p=pet(),d=data();if(!p||!d)return;
    const modal=document.getElementById('modal'),body=document.getElementById('modalBody');if(!modal||!body)return;
    body.innerHTML=`<h2>Add Reminder</h2><form id="smartDemoReminder" class="form-grid"><div class="field"><label>Reminder type</label><input name="type" value="Custom"></div><div class="field"><label>Title</label><input name="title" required></div><div class="field full"><label>Due date</label><input name="date" type="date" required></div><div class="field full"><button class="btn btn-primary">SAVE REMINDER</button></div></form>`;
    modal.classList.add('open');modal.setAttribute('aria-hidden','false');
    document.getElementById('smartDemoReminder').onsubmit=e=>{e.preventDefault();const x=Object.fromEntries(new FormData(e.target));d.reminders=d.reminders||[];d.reminders.push({id:'r'+Date.now(),petId:p.id,type:x.type||'Custom',title:x.title,date:x.date,done:false});localStorage.setItem('petcare-reminder-orbit-v1',JSON.stringify(d));modal.classList.remove('open');updateCenters();toast('Reminder saved');};
  }

  function demoTimeline(){
    const p=pet(),d=data();if(!p||!d)return;
    const rows=[];
    (d.vaccinations||[]).filter(x=>x.petId===p.id).forEach(x=>rows.push({date:x.given,title:`VACCINE · ${x.name}`,detail:`Next due ${fmt(x.due)}`}));
    (d.grooming||[]).filter(x=>x.petId===p.id).forEach(x=>rows.push({date:x.next,title:`GROOMING · ${x.service}`,detail:x.status||''}));
    (d.appointments||[]).filter(x=>x.petId===p.id).forEach(x=>rows.push({date:x.date,title:`VET VISIT · ${x.type}`,detail:`${x.time||''} ${x.vet||''}`.trim()}));
    (d.medications||[]).filter(x=>x.petId===p.id).forEach(x=>rows.push({date:x.start,title:`MEDICATION · ${x.name}`,detail:x.frequency||''}));
    (d.documents||[]).filter(x=>x.petId===p.id).forEach(x=>rows.push({date:x.date,title:`DOCUMENT · ${x.name}`,detail:x.type||''}));
    rows.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    const modal=document.getElementById('modal'),body=document.getElementById('modalBody');if(!modal||!body)return;
    body.innerHTML=`<h2>${esc(p.name)} — Health Timeline</h2>${rows.length?rows.map(x=>`<div class="timeline-row"><strong>${esc(x.title)}</strong><small>${fmt(x.date)}</small><div>${esc(x.detail)}</div></div>`).join(''):'<p class="muted">No timeline entries yet.</p>'}`;
    modal.classList.add('open');modal.setAttribute('aria-hidden','false');
  }

  function handleAction(id){
    switch(id){
      case 'mark-care': return openModule('owner','reminders');
      case 'book-vet': return openModule('owner','visits','[data-owner-action="add-visit"]');
      case 'add-reminder': return api()?.active?openModule('owner','reminders','[data-secure-add-reminder]'):demoAddReminder();
      case 'add-vaccine': return openModule('owner','vaccines','[data-owner-action="add-vaccine"]');
      case 'book-groom': return openModule('owner','grooming','[data-owner-action="add-groom"]');
      case 'vaccine-card': return openModule('owner','vaccine');
      case 'emergency': return openModule('owner','emergency');
      case 'timeline': return api()?.active?api().showTimeline?.():demoTimeline();
      case 'new-appt': return openModule('clinic','appointments');
      case 'find-pet': return openModule('clinic','pets');
      case 'check-in': return openModule('clinic','appointments');
      case 'add-vaccine-clinic': return openModule('clinic','vaccinations');
      case 'add-visit': return openModule('clinic','pets');
      case 'book-groom-clinic': return openModule('clinic','grooming');
      case 'reminder-center': return openModule('clinic','reminders');
      case 'today-report': return openModule('clinic','reports');
    }
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-smart-action]');if(!b)return;
    e.preventDefault();e.stopPropagation();handleAction(b.dataset.smartAction);
  });

  function wrapRefresh(){
    if(typeof window.petcareRefreshActive!=='function'||window.petcareRefreshActive._smartHubWrapped)return false;
    const original=window.petcareRefreshActive;
    const wrapped=function(){
      const ownerSmart=ws()?.current?.('owner')==='smart-hub'&&document.getElementById('ownerApp')?.classList.contains('active');
      const clinicSmart=ws()?.current?.('clinic')==='smart-hub'&&document.getElementById('clinicApp')?.classList.contains('active');
      let out;
      if(ownerSmart)refresh('owner');else if(clinicSmart)refresh('clinic');else out=original.apply(this,arguments);
      updateCenters();return out;
    };
    wrapped._smartHubWrapped=true;window.petcareRefreshActive=wrapped;return true;
  }

  window.PetCareSmartHub={open,refresh,updateCenters,ownerSnapshot,clinicSnapshot};
  window.addEventListener('DOMContentLoaded',()=>{updateCenters();wrapRefresh()});
  document.addEventListener('click',()=>setTimeout(updateCenters,120));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateCenters()});
  const timer=setInterval(()=>{updateCenters();wrapRefresh()},1500);
  setTimeout(()=>clearInterval(timer),30000);
})();

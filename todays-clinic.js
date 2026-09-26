(()=>{
'use strict';
const ws=()=>window.PetCareWorkspace;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='petcare-todays-clinic-v45';
const stages=['WAITING','CONSULTATION','LAB','PHARMACY','CASHIER','COMPLETED'];
let rows;
try{rows=JSON.parse(localStorage.getItem(KEY))}catch(e){}
if(!Array.isArray(rows)) rows=[
{id:'tc1',pet:'Peanut',owner:'Kim',reason:'Routine checkup',stage:'WAITING',priority:'NORMAL'},
{id:'tc2',pet:'Luna',owner:'Ana',reason:'Vaccination',stage:'CONSULTATION',priority:'NORMAL'},
{id:'tc3',pet:'Milo',owner:'Carlo',reason:'Blood test',stage:'LAB',priority:'NORMAL'}
];
const save=()=>localStorage.setItem(KEY,JSON.stringify(rows));
const next=s=>stages[Math.min(stages.length-1,stages.indexOf(s)+1)];
function html(){
 const counts=Object.fromEntries(stages.map(s=>[s,rows.filter(r=>r.stage===s).length]));
 return `<div class="today-clinic">
 <div class="tc-head"><div><span class="smart-eyebrow">LIVE PATIENT FLOW</span><h2>Today's Clinic</h2><p>WAITING → CONSULTATION → LAB → PHARMACY → CASHIER → COMPLETED</p></div><button class="btn btn-primary" data-tc-add>+ WALK-IN</button></div>
 <div class="tc-counts">${stages.map(s=>`<button data-tc-filter="${s}"><small>${s}</small><strong>${counts[s]}</strong></button>`).join('')}</div>
 <div class="tc-board">${stages.map(s=>`<section><h3>${s}<span>${counts[s]}</span></h3><div class="tc-list">${rows.filter(r=>r.stage===s).map(r=>`<article class="tc-card" data-stage="${s}"><b>${esc(r.pet)}</b><small>${esc(r.owner)} · ${esc(r.reason)}</small>${r.priority==='EMERGENCY'?'<em>EMERGENCY</em>':''}<div>${s!=='COMPLETED'?'<button class="btn btn-primary" data-tc-next="'+r.id+'">MOVE TO '+next(s)+'</button>':''}<button class="text-btn" data-tc-open="${r.id}">OPEN RECORD</button></div></article>`).join('')||'<p class="tc-empty">No patients</p>'}</div></section>`).join('')}</div>
 <div class="tc-footer"><button class="smart-action" data-tc-module="appointments">APPOINTMENTS</button><button class="smart-action" data-tc-module="pets">PATIENT RECORDS</button><button class="smart-action" data-tc-module="vaccinations">VACCINES</button><button class="smart-action" data-tc-module="laboratory">LAB & DIAGNOSTICS</button><button class="smart-action" data-tc-module="prescriptions">PRESCRIPTIONS</button><button class="smart-action" data-tc-module="inventory">PHARMACY</button><button class="smart-action" data-tc-module="billing">BILLING</button><button class="smart-action" data-tc-module="reports">REPORTS</button></div>
 </div>`;
}
function markActive(){document.querySelectorAll('#clinicOrbit .orbit-node').forEach(n=>{n.classList.remove('is-selected','is-active','active');n.removeAttribute('aria-current')})}
function applyNew(){['confinement','laboratory','inventory','billing'].forEach(m=>document.querySelector('#clinicOrbit [data-clinic-module="'+m+'"]')?.classList.add('is-new-feature'))}
function open(){markActive('dashboard');ws()?.showCustom?.('clinic',html(),'todays-clinic')}
function refresh(){if(ws()?.current?.('clinic')==='todays-clinic')ws()?.refreshCustom?.('clinic',html())}
function add(){const pet=prompt('Pet name');if(!pet)return;const owner=prompt('Owner name','Walk-in')||'Walk-in';const reason=prompt('Reason / service','Consultation')||'Consultation';rows.push({id:'tc'+Date.now(),pet,owner,reason,stage:'WAITING',priority:/emergency|critical/i.test(reason)?'EMERGENCY':'NORMAL'});save();refresh()}
document.addEventListener('click',e=>{
 const center=e.target.closest('#clinicOrbit .clinic-center');if(center){e.preventDefault();e.stopImmediatePropagation();return open()}
 const n=e.target.closest('[data-tc-next]');if(n){e.preventDefault();const r=rows.find(x=>x.id===n.dataset.tcNext);if(r){r.stage=next(r.stage);save();refresh()}return}
 if(e.target.closest('[data-tc-add]')){e.preventDefault();return add()}
 const m=e.target.closest('[data-tc-module]');if(m){e.preventDefault();markActive(m.dataset.tcModule);ws()?.open?.('clinic',m.dataset.tcModule);return}
 const o=e.target.closest('[data-tc-open]');if(o){e.preventDefault();const r=rows.find(x=>x.id===o.dataset.tcOpen);if(!r)return;const body=document.getElementById('modalBody'),modal=document.getElementById('modal');body.innerHTML=`<h2>${esc(r.pet)} — Patient Record</h2><p><b>Owner:</b> ${esc(r.owner)}</p><p><b>Visit reason:</b> ${esc(r.reason)}</p><p><b>Current stage:</b> ${esc(r.stage)}</p><p><b>Priority:</b> ${esc(r.priority)}</p><div class="smart-note">Open Patient Records for complete medical history, diagnosis, treatment and attachments.</div>`;modal.classList.add('open');modal.setAttribute('aria-hidden','false')}
},true);
window.PetCareTodayClinic={open};
const obs=new MutationObserver(()=>applyNew());const root=document.getElementById('clinicNodes');if(root)obs.observe(root,{childList:true,subtree:true});setTimeout(applyNew,100);setTimeout(applyNew,500);
})();
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
function applyNew(){
  document.querySelectorAll('#clinicOrbit .orbit-node.is-new-feature,#ownerOrbit .orbit-node.is-new-feature').forEach(n=>n.classList.remove('is-new-feature'));
  const seen=localStorage.getItem('petOwnerV76Seen')==='1';
  if(!seen) document.querySelectorAll('#ownerOrbit .orbit-node').forEach(n=>n.classList.add('is-new-feature'));
},true);
window.PetCareTodayClinic={open};
const obs=new MutationObserver(()=>applyNew());const root=document.getElementById('clinicNodes');if(root)obs.observe(root,{childList:true,subtree:true});setTimeout(applyNew,100);setTimeout(applyNew,500);
})();
/* v70: preserve logo-first clinic center after all runtime updates */
function preserveClinicLogoCenter(){
 const b=document.querySelector('#clinicOrbit .clinic-center'); if(!b)return;
 const correct=b.classList.contains('clinic-logo-first')&&b.querySelector('img')&&b.querySelector('.center-open-label')&&b.children.length===2;
 if(correct)return;
 b.classList.add('clinic-logo-first');
 b.innerHTML='<img src="Pet-Family-Animal-Clinic-and-Grooming-Center.png?v=72" alt="Pet Family Animal Clinic and Grooming Center logo"><span class="center-open-label">OPEN TODAY\'S CLINIC</span>';
}
const logoCenterObserver=new MutationObserver(()=>{const b=document.querySelector('#clinicOrbit .clinic-center');if(b&&!b.querySelector('.center-open-label'))preserveClinicLogoCenter()});
logoCenterObserver.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
setTimeout(preserveClinicLogoCenter,50);setTimeout(preserveClinicLogoCenter,300);setTimeout(preserveClinicLogoCenter,1000);

/* v83 safe Pet Owner NEW highlight without wrapping renderOrbit */
function petOwnerNewBadge(){
 const acct=document.querySelector('#ownerNodes [data-owner-module="account-hub"]');
 if(!acct)return;
 acct.classList.add('is-new-feature');
 if(!acct.querySelector('.pet-new-badge')){
   const b=document.createElement('b');b.className='pet-new-badge';b.textContent='NEW';acct.appendChild(b);
 }
}
setTimeout(petOwnerNewBadge,250);setTimeout(petOwnerNewBadge,800);setTimeout(petOwnerNewBadge,1600);

/* v88 one-time Pet Owner highlight */
(function(){
 const KEY='pet-owner-account-highlight-seen-v88';
 function apply(){
  const acct=document.querySelector('#ownerNodes [data-owner-module="account-hub"]');
  if(!acct)return;
  if(localStorage.getItem(KEY)==='1'){
   acct.classList.remove('is-new-feature');
   acct.querySelector('.pet-new-badge,.inline-new-badge')?.remove();
   acct.style.border='';acct.style.boxShadow='';
  }else{
   acct.classList.add('is-new-feature');
   if(!acct.querySelector('.pet-new-badge')){
    const b=document.createElement('b');b.className='pet-new-badge';b.textContent='NEW';acct.appendChild(b);
   }
  }
 }
 document.addEventListener('click',e=>{
  const acct=e.target.closest('#ownerNodes [data-owner-module="account-hub"]');
  if(!acct)return;
  localStorage.setItem(KEY,'1');
  acct.classList.remove('is-new-feature');
  acct.querySelector('.pet-new-badge,.inline-new-badge')?.remove();
  acct.style.border='';acct.style.boxShadow='';
 },true);
 setTimeout(apply,250);setTimeout(apply,900);
})();

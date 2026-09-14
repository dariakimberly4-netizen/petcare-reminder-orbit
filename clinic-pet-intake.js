(()=>{
'use strict';
const KEY='petcare-reminder-orbit-v1';
const api=()=>window.PetCareSupabase;
const getData=()=>window.petcareGetData?.();
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const toast=msg=>{const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)};
const close=()=>{const m=document.getElementById('modal');m?.classList.remove('open');m?.setAttribute('aria-hidden','true')};
const modal=html=>{const m=document.getElementById('modal'),b=document.getElementById('modalBody');if(!m||!b)return;b.innerHTML=html;m.classList.add('open');m.setAttribute('aria-hidden','false');m.scrollTop=0};
const currentRole=()=>api()?.active?String(api()?.state?.staffRole||'').toUpperCase():'DEMO';
const canRegister=()=>['DEMO','CLINIC ADMIN','VETERINARIAN','RECEPTIONIST'].includes(currentRole());
const clinicalAllowed=()=>!api()?.active||currentRole()!=='GROOMER';
const now=()=>new Date().toISOString();
const uuid=()=>api()?.newId?.()||('p'+Date.now()+Math.random().toString(36).slice(2,7));
function save(){
 const d=getData();if(!d)return;
 localStorage.setItem(api()?.active?'petcare-reminder-orbit-secure':KEY,JSON.stringify(d));
 if(api()?.active)api().syncLegacy?.(d);
 window.petcareRefreshActive?.();
}
function patientNo(){
 const d=getData(),year=new Date().getFullYear();
 const nums=(d?.pets||[]).map(p=>String(p.patientNumber||p.specialNotes||'').match(/PFAC-(\d{4})-(\d{4,})/)?.[2]).filter(Boolean).map(Number);
 return `PFAC-${year}-${String((Math.max(0,...nums)+1)).padStart(4,'0')}`;
}
function ownerFor(p){const d=getData();return (d?.customers||[]).find(c=>c.id===p.ownerRecordId||(c.petIds||[]).includes(p.id))||{}}
function age(p){if(p.estimatedAge)return p.estimatedAge;if(!p.birthday)return '—';const b=new Date(p.birthday+'T00:00:00'),n=new Date();let y=n.getFullYear()-b.getFullYear();if(n<new Date(n.getFullYear(),b.getMonth(),b.getDate()))y--;return y+' year'+(y===1?'':'s')}
function photoData(file){return new Promise((resolve,reject)=>{if(!file)return resolve('');if(file.size>3*1024*1024)return reject(new Error('Pet photo must be 3 MB or smaller.'));const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Photo could not be read.'));r.readAsDataURL(file)})}
function field(label,name,type='text',value='',required=false,extra=''){
 return `<div class="field"><label for="reg-${name}">${label}${required?' *':''}</label><input id="reg-${name}" name="${name}" type="${type}" value="${esc(value)}" ${required?'required':''} ${extra}><small class="field-error" data-error="${name}"></small></div>`;
}
function area(label,name,value='',sensitive=false){
 if(sensitive&&!clinicalAllowed())return '';
 return `<div class="field full"><label for="reg-${name}">${label}</label><textarea id="reg-${name}" name="${name}">${esc(value)}</textarea><small class="field-error" data-error="${name}"></small></div>`;
}
function registerForm(existing=null){
 const o=existing?ownerFor(existing):{};
 if(!canRegister())return toast('Your staff role cannot register pets.');
 modal(`<div class="registration-shell">
 <span class="smart-eyebrow">PET FAMILY ANIMAL CLINIC</span><h2>${existing?'Edit Pet Profile':'Register New Pet'}</h2>
 <p class="muted">Fields marked * are required. Information is saved to the clinic patient record.</p>
 <form id="clinicPetRegistration" class="form-grid" novalidate>
 <h3 class="form-section-title">Owner Information</h3>
 ${field("Owner's full name",'ownerName','text',o.name||'',true,'autocomplete="name"')}
 ${field('Mobile number','mobile','tel',o.mobile||'',true,'inputmode="tel"')}
 ${field('Email address','email','email',o.email||'')}
 ${field('Complete address','address','text',o.address||'')}
 ${field('Emergency contact name','emergencyName','text',o.emergencyName||'')}
 ${field('Emergency contact number','emergencyMobile','tel',o.emergencyMobile||'',false,'inputmode="tel"')}
 <h3 class="form-section-title">Pet Information</h3>
 ${field('Pet name','petName','text',existing?.name||'',true)}
 <div class="field"><label for="reg-species">Species *</label><select id="reg-species" name="species" required><option value="">Select species</option>${['Dog','Cat','Bird','Rabbit','Other'].map(x=>`<option ${existing?.species===x?'selected':''}>${x}</option>`).join('')}</select><small class="field-error" data-error="species"></small></div>
 ${field('Breed','breed','text',existing?.breed||'')}
 <div class="field"><label for="reg-sex">Sex *</label><select id="reg-sex" name="sex" required><option value="">Select sex</option>${['Male','Female','Unknown'].map(x=>`<option ${existing?.sex===x?'selected':''}>${x}</option>`).join('')}</select><small class="field-error" data-error="sex"></small></div>
 ${field('Birthday','birthday','date',existing?.birthday||'')}
 ${field('Estimated age','estimatedAge','text',existing?.estimatedAge||'',false,'placeholder="Use only if birthday is unknown"')}
 ${field('Color and identifying markings','color','text',existing?.color||'')}
 ${field('Current weight','weight','text',existing?.weight||'',false,'placeholder="Example: 6.4 kg"')}
 ${field('Microchip number','microchip','text',existing?.microchip||'')}
 <div class="field"><label for="reg-neutered">Spayed or neutered</label><select id="reg-neutered" name="neutered"><option value="">Not recorded</option><option ${existing?.neutered==='Yes'?'selected':''}>Yes</option><option ${existing?.neutered==='No'?'selected':''}>No</option></select></div>
 ${area('Allergies','allergies',existing?.allergies||'',true)}
 ${area('Existing medical conditions','conditions',existing?.conditions||'',true)}
 ${area('Current medications','currentMedications',existing?.currentMedications||'',true)}
 <div class="field full"><label for="reg-photo">Pet photo</label><input id="reg-photo" name="photo" type="file" accept="image/*"><small class="muted">JPG, PNG or WebP · maximum 3 MB</small></div>
 <div id="duplicateWarning" class="duplicate-warning" hidden></div>
 <div class="field full registration-actions"><button class="btn btn-outline" type="button" data-cancel-register>CANCEL</button><button class="btn btn-primary" type="submit">${existing?'SAVE CHANGES':'REGISTER PET'}</button></div>
 </form></div>`);
 const form=document.getElementById('clinicPetRegistration');form.dataset.force='0';
 form.querySelector('[data-cancel-register]').onclick=close;
 form.onsubmit=e=>submitForm(e,existing);
}
function validate(form){
 let ok=true;form.querySelectorAll('.field-error').forEach(x=>x.textContent='');
 const required={ownerName:"Owner's full name is required.",mobile:'Mobile number is required.',petName:'Pet name is required.',species:'Species is required.',sex:'Sex is required.'};
 for(const [name,msg] of Object.entries(required)){const el=form.elements[name];if(!String(el?.value||'').trim()){form.querySelector(`[data-error="${name}"]`).textContent=msg;ok=false}}
 const email=form.elements.email;if(email.value&&!email.checkValidity()){form.querySelector('[data-error="email"]').textContent='Enter a valid email address.';ok=false}
 if(!ok)form.querySelector('.field-error:not(:empty)')?.parentElement?.querySelector('input,select')?.focus();
 return ok;
}
function duplicate(x,existing){
 const d=getData();return (d?.pets||[]).find(p=>p.id!==existing?.id&&(
  (String(p.name).toLowerCase()===x.petName.toLowerCase()&&String(p.species).toLowerCase()===x.species.toLowerCase()&&String(ownerFor(p).mobile||'').replace(/\D/g,'')===x.mobile.replace(/\D/g,''))||
  (x.microchip&&String(p.microchip||'').toLowerCase()===x.microchip.toLowerCase())
 ));
}
async function submitForm(e,existing){
 e.preventDefault();const form=e.currentTarget;if(!validate(form))return;
 const x=Object.fromEntries(new FormData(form));const dup=duplicate(x,existing);
 if(dup&&form.dataset.force!=='1'){
  const w=document.getElementById('duplicateWarning');w.hidden=false;w.innerHTML=`<strong>A similar pet record may already exist. Review the existing record before continuing.</strong><div class="actions"><button class="btn btn-outline" type="button" data-view-duplicate>VIEW EXISTING RECORD</button><button class="btn btn-primary" type="button" data-force-register>CONTINUE REGISTRATION</button></div>`;
  w.querySelector('[data-view-duplicate]').onclick=()=>profile(dup.id);
  w.querySelector('[data-force-register]').onclick=()=>{form.dataset.force='1';w.hidden=true;form.requestSubmit()};
  w.scrollIntoView({behavior:'smooth',block:'center'});return;
 }
 let photo=existing?.photoUrl||'';try{const f=form.elements.photo.files?.[0];if(f)photo=await photoData(f)}catch(err){return toast(err.message)}
 const d=getData();d.customers=d.customers||[];d.pets=d.pets||[];
 let owner=d.customers.find(c=>String(c.mobile||'').replace(/\D/g,'')===x.mobile.replace(/\D/g,''));
 if(!owner){owner={id:uuid(),name:x.ownerName,mobile:x.mobile,email:x.email||'',address:x.address||'',emergencyName:x.emergencyName||'',emergencyMobile:x.emergencyMobile||'',petIds:[]};d.customers.push(owner)}
 else Object.assign(owner,{name:x.ownerName,mobile:x.mobile,email:x.email||'',address:x.address||'',emergencyName:x.emergencyName||'',emergencyMobile:x.emergencyMobile||''});
 const stamp=now(),staff=api()?.state?.profile?.display_name||api()?.state?.session?.user?.email||currentRole();
 let p=existing;
 if(!p){const pn=patientNo();p={id:uuid(),patientNumber:pn,specialNotes:`Patient number: ${pn}`,createdAt:stamp,createdBy:staff};d.pets.push(p)}
 Object.assign(p,{name:x.petName,species:x.species,breed:x.breed||'',sex:x.sex,birthday:x.birthday||'',estimatedAge:x.estimatedAge||'',color:x.color||'',weight:x.weight||'',microchip:x.microchip||'',neutered:x.neutered||'',allergies:x.allergies||'',conditions:x.conditions||'',currentMedications:x.currentMedications||'',photoUrl:photo,ownerRecordId:owner.id,ownerId:p.ownerId||api()?.state?.session?.user?.id||owner.id,clinicId:p.clinicId||api()?.state?.clinic?.id||null,emoji:x.species==='Cat'?'🐱':x.species==='Dog'?'🐶':'🐾',updatedAt:stamp,updatedBy:staff});
 if(!owner.petIds.includes(p.id))owner.petIds.push(p.id);
 save();toast(existing?'Pet profile updated':'Pet registered successfully');setTimeout(()=>profile(p.id,true),250);
}
function events(p,type){
 const d=getData();let rows=[];
 if(type==='appointments')rows=(d.appointments||[]).filter(x=>x.petId===p.id).map(x=>[x.date,x.type||'Appointment',x.status||'']);
 if(type==='vaccines')rows=(d.vaccinations||[]).filter(x=>x.petId===p.id).map(x=>[x.given,x.name||'Vaccine',x.due?'Next due '+x.due:'']);
 if(type==='grooming')rows=(d.grooming||[]).filter(x=>x.petId===p.id).map(x=>[x.next,x.service||'Grooming',x.status||'']);
 if(type==='visits')rows=(d.appointments||[]).filter(x=>x.petId===p.id).map(x=>[x.date,x.type||'Vet visit',x.vet||'']);
 return rows.length?rows.map(r=>`<div class="profile-history-row"><strong>${esc(r[1])}</strong><small>${esc(r[0]||'—')} · ${esc(r[2])}</small></div>`).join(''):'<p class="muted">No records yet.</p>';
}
function profile(id,created=false){
 const d=getData(),p=(d?.pets||[]).find(x=>x.id===id);if(!p)return toast('Pet record not found');
 const o=ownerFor(p),docs=(d.documents||[]).filter(x=>x.petId===id);
 modal(`<div class="pet-profile-print">
 <div class="profile-title"><div>${p.photoUrl?`<img src="${esc(p.photoUrl)}" alt="${esc(p.name)}">`:`<div class="profile-photo-placeholder">${p.emoji||'🐾'}</div>`}</div><div><span class="smart-eyebrow">${created?'REGISTRATION COMPLETE':'CLINIC PATIENT PROFILE'}</span><h2>${esc(p.name)}</h2><strong class="patient-number">${esc(p.patientNumber||String(p.specialNotes||'').match(/PFAC-\d{4}-\d{4,}/)?.[0]||'Patient number pending')}</strong><p>${esc(p.species||'Pet')} · ${esc(p.breed||'Breed not recorded')} · ${esc(p.sex||'Sex not recorded')}</p></div></div>
 <div class="profile-grid">
  <div><small>OWNER</small><strong>${esc(o.name||'Not recorded')}</strong><span>${esc(o.mobile||'')} ${o.email?'· '+esc(o.email):''}</span></div>
  <div><small>AGE / BIRTHDAY</small><strong>${esc(age(p))}</strong><span>${esc(p.birthday||'Birthday not recorded')}</span></div>
  <div><small>WEIGHT</small><strong>${esc(p.weight||'—')}</strong></div>
  <div><small>MICROCHIP</small><strong>${esc(p.microchip||'—')}</strong></div>
  <div><small>VACCINATION STATUS</small><strong>${(d.vaccinations||[]).some(v=>v.petId===id&&v.due&&new Date(v.due)<new Date())?'OVERDUE':'REVIEW RECORDS'}</strong></div>
  <div><small>SPAYED / NEUTERED</small><strong>${esc(p.neutered||'Not recorded')}</strong></div>
 </div>
 ${clinicalAllowed()?`<div class="medical-alerts"><div><small>ALLERGIES</small><strong>${esc(p.allergies||'None recorded')}</strong></div><div><small>MEDICAL CONDITIONS</small><strong>${esc(p.conditions||'None recorded')}</strong></div><div><small>CURRENT MEDICATIONS</small><strong>${esc(p.currentMedications||'None recorded')}</strong></div></div>`:''}
 <div class="profile-actions">
  ${canRegister()?`<button class="btn btn-primary" data-edit-profile="${p.id}">EDIT PET</button>`:''}
  <button class="btn btn-outline" data-profile-module="appointments">CREATE APPOINTMENT</button>
  <button class="btn btn-outline" data-profile-module="dashboard">CHECK IN</button>
  <button class="btn btn-outline" data-profile-module="vaccinations">ADD VACCINE</button>
  ${clinicalAllowed()?'<button class="btn btn-outline" data-profile-module="appointments">ADD VET VISIT</button>':''}
  ${clinicalAllowed()?'<button class="btn btn-outline" data-upload-profile>UPLOAD DOCUMENT</button>':''}
  <button class="btn btn-outline" data-print-profile>PRINT PROFILE</button>
 </div>
 <div class="profile-history"><section><h3>Appointments</h3>${events(p,'appointments')}</section><section><h3>Veterinary Visits</h3>${events(p,'visits')}</section><section><h3>Vaccinations</h3>${events(p,'vaccines')}</section><section><h3>Grooming</h3>${events(p,'grooming')}</section><section><h3>Documents</h3>${docs.length?docs.map(x=>`<div class="profile-history-row"><strong>${esc(x.name)}</strong><small>${esc(x.type||'Document')} · ${esc(x.date||'')}</small></div>`).join(''):'<p class="muted">No documents yet.</p>'}</section></div>
 <div class="audit-note">Created by ${esc(p.createdBy||'Clinic staff')} · ${p.createdAt?new Date(p.createdAt).toLocaleString():'Date not recorded'}<br>Last edited by ${esc(p.updatedBy||p.createdBy||'Clinic staff')} · ${p.updatedAt?new Date(p.updatedAt).toLocaleString():'Date not recorded'}</div>
 </div>`);
 document.querySelector('[data-edit-profile]')?.addEventListener('click',()=>registerForm(p));
 document.querySelectorAll('[data-profile-module]').forEach(b=>b.onclick=()=>{close();window.renderClinic?.(b.dataset.profileModule)});
 document.querySelector('[data-print-profile]')?.addEventListener('click',()=>window.print());
 document.querySelector('[data-upload-profile]')?.addEventListener('click',()=>{window.petcareSelectPet?.(p.id);api()?.uploadDocument?.()});
}
let enhancing=false;
function enhance(){
 if(enhancing)return;const panel=document.getElementById('clinicPanel');if(!panel||panel.querySelector('h2')?.textContent?.trim()!=='Clinic Pet Lookup')return;
 enhancing=true;
 const card=panel.querySelector('.panel-card');if(card&&!card.querySelector('[data-register-clinic-pet]')){
  const top=document.createElement('div');top.className='clinic-register-toolbar';
  top.innerHTML=`${canRegister()?'<button class="btn btn-primary btn-xl" data-register-clinic-pet>+ REGISTER NEW PET</button>':'<span class="muted">Your role has view-only access to pet registration.</span>'}`;
  card.querySelector('.search-box')?.before(top);
  top.querySelector('[data-register-clinic-pet]')?.addEventListener('click',()=>registerForm());
 }
 const list=panel.querySelector('#clinicResults');
 if(list&&!list.dataset.profiles){
  list.dataset.profiles='1';const d=getData();list.innerHTML=(d?.pets||[]).map(p=>`<div class="list-item clinic-pet-row"><div class="meta"><strong>${p.emoji||'🐾'} ${esc(p.name)}</strong><small>${esc(p.patientNumber||String(p.specialNotes||'').match(/PFAC-\d{4}-\d{4,}/)?.[0]||'No patient number')} · ${esc(p.microchip||'No microchip')}</small></div><button class="btn btn-outline" data-open-clinic-pet="${p.id}">OPEN PROFILE</button></div>`).join('');
 }
 enhancing=false;
}
window.addEventListener('click',e=>{const n=e.target.closest?.('[data-clinic-module="pets"]');if(!n)return;e.preventDefault();e.stopImmediatePropagation();window.PetCareWorkspace?.open?.('clinic','pets')||window.renderClinic?.('pets')},true);
document.addEventListener('click',e=>{const b=e.target.closest('[data-open-clinic-pet]');if(b){e.preventDefault();profile(b.dataset.openClinicPet)}},true);
const observer=new MutationObserver(()=>queueMicrotask(enhance));
window.addEventListener('DOMContentLoaded',()=>{const p=document.getElementById('clinicPanel');if(p)observer.observe(p,{childList:true,subtree:true});enhance()});
window.PetCareRegistration={open:registerForm,profile};
})();
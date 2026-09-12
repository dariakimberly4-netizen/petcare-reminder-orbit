(()=>{
'use strict';
const cfg=window.PETCARE_ENV||{};
const params=new URLSearchParams(location.search);
const secureRequested=params.get('mode')==='secure';
const PLACEHOLDER='00000000-0000-4000-8000-000000000001';
const LOCAL_KEY='petcare-reminder-orbit-secure';
const state={client:null,session:null,profile:null,staff:null,staffRole:null,clinic:null,active:false,initialData:null,lastWriteAt:0,petOwners:new Map(),realtime:null};
const api={state,active:false,initialData:null,openMode:'owner',ready:null,newId:()=>crypto.randomUUID(),syncLegacy,cardUrl,showLogin,showTimeline,showFamilySharing,showStaffAdmin,uploadDocument,uploadCertificate,signOut};
window.PetCareSupabase=api;

function baseUrl(){return location.origin+location.pathname}
function flash(msg){const t=document.getElementById('toast');if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}else alert(msg)}
function openModal(html){const m=document.getElementById('modal'),b=document.getElementById('modalBody');if(!m||!b)return;b.innerHTML=html;m.classList.add('open');m.setAttribute('aria-hidden','false')}
function closeModal(){const m=document.getElementById('modal');if(m){m.classList.remove('open');m.setAttribute('aria-hidden','true')}}
function currentPet(){try{return window.petcareGetSelected?.()||null}catch{return null}}
function localData(){try{return window.petcareGetData?.()||state.initialData||null}catch{return state.initialData||null}}
function isPlaceholderPet(p){return !p||p.id===PLACEHOLDER||p.placeholder===true}
function esc(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function mapSpeciesEmoji(species){return species==='Cat'?'🐱':species==='Dog'?'🐶':'🐾'}
function dueStatus(d){if(!d)return'UPCOMING';const n=Math.ceil((new Date(d+'T00:00:00')-new Date())/86400000);return n<0?'OVERDUE':n<=30?'DUE SOON':'UPCOMING'}

async function init(){
  if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY||!window.supabase){console.warn('Supabase config unavailable');installAuthUI(null);return true}
  state.client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data:{session}}=await state.client.auth.getSession();state.session=session||null;
  installAuthUI(state.session);
  state.client.auth.onAuthStateChange((event,s)=>{state.session=s||null;if(event==='PASSWORD_RECOVERY')setTimeout(showRecovery,0);installAuthUI(state.session)});
  if(state.session&&secureRequested){
    try{await prepareSecure(state.session);state.active=true;api.active=true;api.initialData=state.initialData;api.openMode=state.staff?'clinic':'owner';subscribeRealtime()}catch(e){console.error(e);flash('Secure data could not be loaded. Demo mode is still available.')}
  }
  if(params.get('recovery')==='1'&&state.session)setTimeout(showRecovery,0);
  installGlobalHandlers();
  return true;
}
api.ready=init();

function installAuthUI(session){
  const actions=document.querySelector('.welcome-actions');if(!actions)return;
  let btn=actions.querySelector('[data-secure-login]');
  if(!btn){btn=document.createElement('button');btn.className='btn btn-outline btn-xl';btn.dataset.secureLogin='1';actions.appendChild(btn)}
  btn.textContent=session?'OPEN SECURE ACCOUNT':'SECURE ACCOUNT LOGIN';
  btn.onclick=()=>session?location.assign(baseUrl()+'?mode=secure'):showLogin();
  let st=document.querySelector('.secure-status');
  if(!st){st=document.createElement('div');st.className='secure-status';document.querySelector('.welcome-card')?.appendChild(st)}
  st.innerHTML=session?'<span class="secure-dot"></span> Secure account session ready':'Supabase secure account available';
}

function showLogin(tab='login'){
  const signup=tab==='signup';
  openModal(`<h2>${signup?'Create PetCare Account':'Secure Account Login'}</h2>
  <div class="auth-tabs"><button class="${!signup?'active':''}" data-auth-tab="login">LOGIN</button><button class="${signup?'active':''}" data-auth-tab="signup">CREATE ACCOUNT</button></div>
  <form id="secureAuthForm" class="form-grid">
    ${signup?'<div class="field full"><label>Name</label><input name="name" autocomplete="name" required></div>':''}
    <div class="field full"><label>Email</label><input name="email" type="email" autocomplete="email" required></div>
    <div class="field full"><label>Password</label><input name="password" type="password" minlength="8" autocomplete="${signup?'new-password':'current-password'}" required></div>
    <div class="field full"><button class="btn btn-primary" type="submit">${signup?'CREATE ACCOUNT':'LOGIN'}</button></div>
  </form>
  ${!signup?'<button class="btn btn-outline" id="forgotPassword" style="width:100%;margin-top:8px">FORGOT PASSWORD</button>':''}
  <div class="auth-note">Your secure account uses Supabase Auth. Demo buttons remain available without login.</div>`);
  document.querySelectorAll('[data-auth-tab]').forEach(b=>b.onclick=()=>showLogin(b.dataset.authTab));
  const f=document.getElementById('secureAuthForm');if(f)f.onsubmit=async e=>{e.preventDefault();const x=Object.fromEntries(new FormData(f));try{
    if(signup){const {data,error}=await state.client.auth.signUp({email:x.email,password:x.password,options:{data:{display_name:x.name}}});if(error)throw error;if(data.session){location.assign(baseUrl()+'?mode=secure')}else{openModal('<h2>Check your email</h2><p>Your account was created. Open the confirmation email, then return and log in.</p>')}}
    else{const {error}=await state.client.auth.signInWithPassword({email:x.email,password:x.password});if(error)throw error;location.assign(baseUrl()+'?mode=secure')}
  }catch(err){openModal(`<h2>Login problem</h2><p>${esc(err.message||'Unable to continue.')}</p><button class="btn btn-primary" id="tryAgain">TRY AGAIN</button>`);document.getElementById('tryAgain').onclick=()=>showLogin(signup?'signup':'login')}};
  const fp=document.getElementById('forgotPassword');if(fp)fp.onclick=async()=>{const email=prompt('Enter your PetCare email');if(!email)return;const {error}=await state.client.auth.resetPasswordForEmail(email,{redirectTo:baseUrl()+'?mode=secure&recovery=1'});if(error)flash(error.message);else flash('Password reset email sent')};
}

function showRecovery(){openModal(`<h2>Set New Password</h2><form id="recoveryForm" class="form-grid"><div class="field full"><label>New password</label><input name="password" type="password" minlength="8" required></div><div class="field full"><button class="btn btn-primary">SAVE NEW PASSWORD</button></div></form>`);document.getElementById('recoveryForm').onsubmit=async e=>{e.preventDefault();const p=new FormData(e.target).get('password');const {error}=await state.client.auth.updateUser({password:p});if(error)flash(error.message);else{flash('Password updated');closeModal();location.assign(baseUrl()+'?mode=secure')}}}
async function signOut(){if(state.client)await state.client.auth.signOut();localStorage.removeItem(LOCAL_KEY);location.assign(baseUrl())}

async function prepareSecure(session){
  const uid=session.user.id;
  const [{data:profile},{data:staffRows},{data:clinic}]=await Promise.all([
    state.client.from('profiles').select('*').eq('id',uid).maybeSingle(),
    state.client.from('clinic_staff').select('clinic_id,active,staff_roles(code,label)').eq('user_id',uid).eq('active',true),
    state.client.from('clinics').select('*').eq('slug','pet-family-animal-clinic').maybeSingle()
  ]);
  state.profile=profile||{id:uid,email:session.user.email,display_name:session.user.email?.split('@')[0],role:'PET OWNER'};
  state.staff=(staffRows||[])[0]||null;state.staffRole=state.staff?.staff_roles?.code||null;state.clinic=clinic||null;
  state.initialData=await loadRemoteData();
  localStorage.setItem(LOCAL_KEY,JSON.stringify(state.initialData));
}

async function getGroomerPets(){
  try{const r=await fetch(cfg.SUPABASE_URL+'/functions/v1/groomer-pets',{headers:{Authorization:'Bearer '+state.session.access_token,apikey:cfg.SUPABASE_ANON_KEY}});if(!r.ok)return[];return (await r.json()).pets||[]}catch{return[]}
}

async function loadRemoteData(){
  const c=state.client;
  let pets=[];
  if(state.staffRole==='GROOMER')pets=await getGroomerPets();else{const {data}=await c.from('pets').select('*').order('created_at');pets=data||[]}
  state.petOwners=new Map(pets.map(p=>[p.id,p.owner_id]).filter(x=>x[1]));
  const tables=['vaccinations','reminders','medications','grooming_records','appointments','documents','customers','notifications'];
  const result={};
  await Promise.all(tables.map(async t=>{const q=c.from(t).select('*');const {data,error}=await q;if(error){console.warn(t,error.message);result[t]=[]}else result[t]=data||[]}));
  const petRows=pets.length?pets:[{id:PLACEHOLDER,name:'Add Your Pet',species:'Dog',breed:'',sex:'',birthday:null,weight:'',microchip_number:'',allergies:'',medical_conditions:'',primary_veterinarian:'',placeholder:true}];
  const owner={name:state.profile?.display_name||'Pet Parent',mobile:state.profile?.mobile||'',emergency:''};
  return {
    owner,
    pets:petRows.map(p=>({id:p.id,name:p.name,species:p.species||'Dog',breed:p.breed||'',sex:p.sex||'',birthday:p.birthday||'',weight:p.weight||'',microchip:p.microchip_number||'',allergies:p.allergies||'',conditions:p.medical_conditions||'',vet:p.primary_veterinarian||'',emoji:mapSpeciesEmoji(p.species),photoUrl:p.photo_url||'',clinicId:p.clinic_id||state.clinic?.id||null,ownerId:p.owner_id||state.session.user.id,vaccineCardToken:p.vaccine_card_token||null,placeholder:!!p.placeholder})),
    vaccinations:(result.vaccinations||[]).map(v=>({id:v.id,petId:v.pet_id,name:v.vaccine_name,given:v.date_administered||'',due:v.next_due_date||'',vet:v.veterinarian||'',lot:v.batch_lot_number||'',notes:v.notes||'',certificatePath:v.certificate_url||'',clinicId:v.clinic_id})),
    reminders:(result.reminders||[]).map(r=>({id:r.id,petId:r.pet_id,type:r.reminder_type,title:r.title,date:r.due_date,done:r.status==='COMPLETED',clinicId:r.clinic_id})),
    medications:(result.medications||[]).map(m=>({id:m.id,petId:m.pet_id,name:m.medication_name,dose:m.dose||'',frequency:m.frequency||'',start:m.start_date||'',end:m.end_date||'',vet:m.prescribing_vet||'',status:m.status,clinicId:m.clinic_id})),
    grooming:(result.grooming_records||[]).map(g=>({id:g.id,petId:g.pet_id,service:g.service,next:g.appointment_date||'',time:g.appointment_time||'',groomer:g.groomer||'',price:Number(g.price||0),status:g.status,clinicId:g.clinic_id})),
    appointments:(result.appointments||[]).map(a=>({id:a.id,petId:a.pet_id,vet:a.veterinarian||'',type:a.appointment_type,date:a.appointment_date,time:(a.appointment_time||'').slice(0,5),status:a.status,reason:a.reason||'',notes:a.notes||'',clinicId:a.clinic_id})),
    documents:(result.documents||[]).map(d=>({id:d.id,petId:d.pet_id,name:d.document_name,type:d.document_type,date:d.document_date||'',storageBucket:d.storage_bucket,storagePath:d.storage_path,clinicId:d.clinic_id})),
    customers:(result.customers||[]).map(x=>({id:x.id,name:x.owner_name,mobile:x.mobile||'',email:x.email||'',petIds:pets.filter(p=>p.owner_id&&p.owner_id===x.user_id).map(p=>p.id)})),
    notifications:(result.notifications||[]).map(n=>n.title+(n.body?' — '+n.body:''))
  };
}

let syncTimer=null;
async function syncLegacy(data){
  if(!state.active||!state.session)return;
  clearTimeout(syncTimer);syncTimer=setTimeout(()=>syncNow(data).catch(e=>{console.error(e);flash('Cloud sync needs attention')}),350);
}
async function syncNow(data){
  const c=state.client,uid=state.session.user.id,clinicId=state.clinic?.id||null;
  const pets=(data.pets||[]).filter(p=>!isPlaceholderPet(p));
  const petRows=pets.map(p=>({id:p.id,owner_id:p.ownerId||state.petOwners.get(p.id)||uid,clinic_id:p.clinicId||clinicId,name:p.name,species:p.species||'Dog',breed:p.breed||null,sex:p.sex||null,birthday:p.birthday||null,weight:p.weight||null,microchip_number:p.microchip||null,allergies:p.allergies||null,medical_conditions:p.conditions||null,primary_veterinarian:p.vet||null,photo_url:p.photoUrl||null}));
  const jobs=[];
  if(petRows.length)jobs.push(c.from('pets').upsert(petRows,{onConflict:'id'}));
  const valid=new Set(pets.map(p=>p.id));
  const vacc=(data.vaccinations||[]).filter(v=>valid.has(v.petId)).map(v=>({id:v.id,pet_id:v.petId,clinic_id:v.clinicId||clinicId,vaccine_name:v.name,date_administered:v.given||null,next_due_date:v.due||null,veterinarian:v.vet||null,batch_lot_number:v.lot||null,notes:v.notes||null,certificate_url:v.certificatePath||null}));if(vacc.length)jobs.push(c.from('vaccinations').upsert(vacc,{onConflict:'id'}));
  const rem=(data.reminders||[]).filter(r=>valid.has(r.petId)).map(r=>({id:r.id,pet_id:r.petId,clinic_id:r.clinicId||clinicId,reminder_type:r.type,title:r.title,due_date:r.date,status:r.done?'COMPLETED':dueStatus(r.date),completed_at:r.done?new Date().toISOString():null}));if(rem.length)jobs.push(c.from('reminders').upsert(rem,{onConflict:'id'}));
  const meds=(data.medications||[]).filter(m=>valid.has(m.petId)).map(m=>({id:m.id,pet_id:m.petId,clinic_id:m.clinicId||clinicId,medication_name:m.name,dose:m.dose||null,frequency:m.frequency||null,start_date:m.start||null,end_date:m.end||null,prescribing_vet:m.vet||null,status:m.status||'ACTIVE'}));if(meds.length)jobs.push(c.from('medications').upsert(meds,{onConflict:'id'}));
  const groom=(data.grooming||[]).filter(g=>valid.has(g.petId)).map(g=>({id:g.id,pet_id:g.petId,owner_id:state.petOwners.get(g.petId)||uid,clinic_id:g.clinicId||clinicId,service:g.service,appointment_date:g.next||null,appointment_time:g.time||null,groomer:g.groomer||null,price:g.price||null,status:g.status||'BOOKED'}));if(groom.length)jobs.push(c.from('grooming_records').upsert(groom,{onConflict:'id'}));
  const appts=(data.appointments||[]).filter(a=>valid.has(a.petId)).map(a=>({id:a.id,pet_id:a.petId,owner_id:state.petOwners.get(a.petId)||uid,clinic_id:a.clinicId||clinicId,veterinarian:a.vet||null,appointment_type:a.type,appointment_date:a.date,appointment_time:a.time||null,reason:a.reason||null,notes:a.notes||null,status:a.status||'REQUESTED'}));if(appts.length)jobs.push(c.from('appointments').upsert(appts,{onConflict:'id'}));
  const out=await Promise.all(jobs);const err=out.find(x=>x.error)?.error;if(err)throw err;state.lastWriteAt=Date.now();flash('Saved securely')
}

function cardUrl(p){if(!state.active||!p?.vaccineCardToken)return baseUrl()+'#pet='+encodeURIComponent(p?.id||'');return cfg.SUPABASE_URL+'/functions/v1/public-vaccine-card?token='+encodeURIComponent(p.vaccineCardToken)}

function installGlobalHandlers(){
  document.addEventListener('click',async e=>{
    const close=e.target.closest('[data-close-modal]');if(close){closeModal();return}
    if(!state.active)return;
    const demo=e.target.closest('[data-enter]');if(demo&&secureRequested){e.preventDefault();e.stopImmediatePropagation();location.assign(baseUrl()+'?mode=demo&enter='+encodeURIComponent(demo.dataset.enter));return}
    const add=e.target.closest('[data-owner-action]');if(add&&add.dataset.ownerAction!=='add-pet'&&isPlaceholderPet(currentPet())){e.preventDefault();e.stopImmediatePropagation();flash('Add your pet first');return}
    if(add?.dataset.ownerAction==='add-doc'){e.preventDefault();e.stopImmediatePropagation();uploadDocument();return}
    const del=e.target.closest('[data-delete-doc]');if(del)setTimeout(()=>deleteRemoteDocument(del.dataset.deleteDoc),0);
  },true);
  document.getElementById('modal')?.addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});
  const obs=new MutationObserver(()=>enhancePanels());const op=document.getElementById('ownerPanel'),cp=document.getElementById('clinicPanel');if(op)obs.observe(op,{childList:true,subtree:true});if(cp)obs.observe(cp,{childList:true,subtree:true});
}

function installSecureChrome(){
  if(!state.active)return;
  document.querySelectorAll('.top-actions').forEach(x=>{if(!x.querySelector('[data-secure-signout]')){const b=document.createElement('button');b.className='secure-toolbar-btn';b.dataset.secureSignout='1';b.textContent='SIGN OUT';b.onclick=signOut;x.appendChild(b)}});
  if(!document.querySelector('.production-ribbon')){const r=document.createElement('div');r.className='production-ribbon';r.textContent='SECURE CLOUD';document.body.appendChild(r)}
}
api.installSecureChrome=installSecureChrome;

function enhancePanels(){
  if(!state.active)return;installSecureChrome();
  const op=document.getElementById('ownerPanel');if(op){const title=op.querySelector('h2')?.textContent?.trim();
    if(title==='More'&&!op.querySelector('.secure-extra')){const x=document.createElement('div');x.className='secure-extra';x.innerHTML='<button class="btn btn-outline" data-health-timeline>HEALTH TIMELINE</button><button class="btn btn-outline" data-family-sharing>FAMILY SHARING</button><button class="btn btn-danger" data-secure-signout-owner>SIGN OUT</button>';op.querySelector('.panel-card')?.appendChild(x);x.querySelector('[data-health-timeline]').onclick=showTimeline;x.querySelector('[data-family-sharing]').onclick=showFamilySharing;x.querySelector('[data-secure-signout-owner]').onclick=signOut}
    if(title==='Vet Visits')enhanceAppointments(op);
    if(title==='Vaccinations')enhanceVaccines(op);
    if(title==='Document Vault')enhanceDocuments(op);
  }
  const cp=document.getElementById('clinicPanel');if(cp&&state.staffRole==='CLINIC ADMIN'&&cp.querySelector('h2')?.textContent?.includes('Clinic Dashboard')&&!cp.querySelector('[data-staff-admin]')){const b=document.createElement('button');b.className='btn btn-outline';b.dataset.staffAdmin='1';b.textContent='STAFF ACCESS';cp.querySelector('.panel-card')?.appendChild(b);b.onclick=showStaffAdmin}
}

function enhanceAppointments(panel){
  if(panel.querySelector('.secure-appointment-actions'))return;const p=currentPet();if(!p)return;const data=localData();const list=(data?.appointments||[]).filter(a=>a.petId===p.id);const rows=[...panel.querySelectorAll('.list-item')];rows.forEach((row,i)=>{const a=list[i];if(!a)return;const box=document.createElement('div');box.className='actions secure-appointment-actions';box.innerHTML='<button class="btn btn-outline">RESCHEDULE</button><button class="btn btn-danger">CANCEL</button><button class="btn btn-outline">ADD TO CALENDAR</button>';const [r,c,cal]=box.children;r.onclick=()=>rescheduleAppointment(a);c.onclick=()=>cancelAppointment(a);cal.onclick=()=>addCalendar(a,p);row.appendChild(box)})
}
async function rescheduleAppointment(a){openModal(`<h2>Reschedule Appointment</h2><form id="rescheduleForm" class="form-grid"><div class="field"><label>Date</label><input name="date" type="date" value="${esc(a.date)}" required></div><div class="field"><label>Time</label><input name="time" type="time" value="${esc(a.time)}" required></div><div class="field full"><button class="btn btn-primary">SAVE</button></div></form>`);document.getElementById('rescheduleForm').onsubmit=async e=>{e.preventDefault();const x=Object.fromEntries(new FormData(e.target));const {error}=await state.client.from('appointments').update({appointment_date:x.date,appointment_time:x.time}).eq('id',a.id);if(error)return flash(error.message);a.date=x.date;a.time=x.time;closeModal();window.petcareRenderOwner?.('visits');flash('Appointment rescheduled')}}
async function cancelAppointment(a){if(!confirm('Cancel this appointment?'))return;const {error}=await state.client.from('appointments').update({status:'CANCELLED'}).eq('id',a.id);if(error)return flash(error.message);a.status='CANCELLED';window.petcareRenderOwner?.('visits');flash('Appointment cancelled')}
function addCalendar(a,p){const d=(a.date||'').replaceAll('-','');const tm=(a.time||'09:00').replace(':','')+'00';const text=`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nDTSTART:${d}T${tm}\r\nSUMMARY:${a.type} - ${p.name}\r\nDESCRIPTION:PetCare Reminder appointment\r\nEND:VEVENT\r\nEND:VCALENDAR`;const u=URL.createObjectURL(new Blob([text],{type:'text/calendar'}));const l=document.createElement('a');l.href=u;l.download='petcare-appointment.ics';l.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}

function enhanceVaccines(panel){
  if(panel.querySelector('.secure-vaccine-upload'))return;const p=currentPet();if(!p)return;const data=localData();const list=(data?.vaccinations||[]).filter(v=>v.petId===p.id);const rows=[...panel.querySelectorAll('.list-item')];rows.forEach((row,i)=>{const v=list[i];if(!v)return;const b=document.createElement('button');b.className='btn btn-outline secure-vaccine-upload';b.textContent=v.certificatePath?'VIEW CERTIFICATE':'UPLOAD CERTIFICATE';b.onclick=()=>v.certificatePath?openStoredFile('vaccination-certificates',v.certificatePath):uploadCertificate(v);row.appendChild(b)})
}
async function uploadCertificate(v){openModal(`<h2>Vaccination Certificate</h2><form id="certForm" class="form-grid"><div class="field full"><label>Certificate file</label><input name="file" type="file" accept="image/*,.pdf" required></div><div class="field full"><button class="btn btn-primary">UPLOAD</button></div></form>`);document.getElementById('certForm').onsubmit=async e=>{e.preventDefault();const file=e.target.file.files[0];if(!file)return;const path=`${v.petId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const {error:upErr}=await state.client.storage.from('vaccination-certificates').upload(path,file);if(upErr)return flash(upErr.message);const {error}=await state.client.from('vaccinations').update({certificate_url:path}).eq('id',v.id);if(error)return flash(error.message);v.certificatePath=path;closeModal();window.petcareRenderOwner?.('vaccines');flash('Certificate uploaded')}}

function enhanceDocuments(panel){
  if(panel.querySelector('.secure-doc-tools'))return;const p=currentPet();const data=localData();const list=(data?.documents||[]).filter(d=>d.petId===p?.id);const rows=[...panel.querySelectorAll('.list-item')];rows.forEach((row,i)=>{const d=list[i];if(!d?.storagePath)return;const b=document.createElement('button');b.className='btn btn-outline secure-doc-tools';b.textContent='VIEW';b.onclick=()=>openStoredFile(d.storageBucket||'pet-documents',d.storagePath);row.querySelector('.actions')?.prepend(b)||row.appendChild(b)})
}
async function openStoredFile(bucket,path){const {data,error}=await state.client.storage.from(bucket).createSignedUrl(path,300);if(error)return flash(error.message);window.open(data.signedUrl,'_blank','noopener')}
async function deleteRemoteDocument(id){const {data:d}=await state.client.from('documents').select('storage_bucket,storage_path').eq('id',id).maybeSingle();if(d?.storage_path)await state.client.storage.from(d.storage_bucket||'pet-documents').remove([d.storage_path]);await state.client.from('documents').delete().eq('id',id)}

async function uploadDocument(){const p=currentPet();if(isPlaceholderPet(p))return flash('Add your pet first');openModal(`<h2>Upload Pet Document</h2><form id="docUploadForm" class="form-grid"><div class="field full"><label>File</label><input name="file" type="file" accept="image/*,.pdf" required></div><div class="field"><label>Document type</label><select name="type"><option>Vaccination certificate</option><option>Lab result</option><option>Prescription</option><option>Vet document</option><option>Microchip document</option><option>Other</option></select></div><div class="field"><label>Date</label><input name="date" type="date" required></div><div class="field full"><button class="btn btn-primary">UPLOAD SECURELY</button></div></form>`);document.getElementById('docUploadForm').onsubmit=async e=>{e.preventDefault();const f=e.target,file=f.file.files[0];if(!file)return;const path=`${p.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const {error:upErr}=await state.client.storage.from('pet-documents').upload(path,file);if(upErr)return flash(upErr.message);const {data:row,error}=await state.client.from('documents').insert({pet_id:p.id,clinic_id:p.clinicId||state.clinic?.id||null,document_name:file.name,document_type:f.type.value,document_date:f.date.value,storage_bucket:'pet-documents',storage_path:path}).select().single();if(error)return flash(error.message);const d={id:row.id,petId:row.pet_id,name:row.document_name,type:row.document_type,date:row.document_date,storageBucket:row.storage_bucket,storagePath:row.storage_path,clinicId:row.clinic_id};localData()?.documents?.push(d);closeModal();window.petcareRenderOwner?.('documents');flash('Document uploaded securely')}}

async function showTimeline(){const p=currentPet();if(isPlaceholderPet(p))return flash('Add your pet first');const {data,error}=await state.client.from('health_timeline').select('*').eq('pet_id',p.id).order('event_at',{ascending:false}).limit(100);if(error)return flash(error.message);openModal(`<h2>${esc(p.name)} — Health Timeline</h2>${(data||[]).length?(data||[]).map(x=>`<div class="timeline-row"><strong>${esc(x.category)} · ${esc(x.title)}</strong><small>${new Date(x.event_at).toLocaleString()}</small><div>${esc(x.detail||'')}</div></div>`).join(''):'<p class="muted">No timeline entries yet.</p>'}`)}

async function showFamilySharing(){const p=currentPet();if(isPlaceholderPet(p))return flash('Add your pet first');const load=async()=>{const {data,error}=await state.client.functions.invoke('family-sharing',{body:{action:'list',pet_id:p.id}});if(error)return openModal(`<h2>Family Sharing</h2><p>${esc(error.message)}</p>`);const members=data?.members||[];openModal(`<h2>Family Sharing — ${esc(p.name)}</h2><form id="shareForm" class="form-grid"><div class="field"><label>Email</label><input name="email" type="email" required></div><div class="field"><label>Access</label><select name="level"><option>FAMILY MEMBER</option><option>VIEW ONLY</option></select></div><div class="field full"><button class="btn btn-primary">SHARE PET</button></div></form><div class="auth-note">The person must create a PetCare account before you can share.</div>${members.map(m=>`<div class="share-row"><div><strong>${esc(m.profiles?.display_name||m.profiles?.email||'Member')}</strong><small>${esc(m.profiles?.email||'')} · ${esc(m.access_level)}</small></div><button class="btn btn-danger" data-revoke-email="${esc(m.profiles?.email||'')}">REVOKE</button></div>`).join('')}`);document.getElementById('shareForm').onsubmit=async e=>{e.preventDefault();const x=Object.fromEntries(new FormData(e.target));const r=await state.client.functions.invoke('family-sharing',{body:{action:'invite',pet_id:p.id,email:x.email,access_level:x.level}});if(r.error)return flash(r.error.message);flash('Pet shared');load()};document.querySelectorAll('[data-revoke-email]').forEach(b=>b.onclick=async()=>{await state.client.functions.invoke('family-sharing',{body:{action:'revoke',pet_id:p.id,email:b.dataset.revokeEmail}});flash('Access revoked');load()})};load()}

async function showStaffAdmin(){const load=async()=>{const {data,error}=await state.client.functions.invoke('clinic-staff-admin',{body:{action:'list'}});if(error)return openModal(`<h2>Staff Access</h2><p>${esc(error.message)}</p>`);const rows=data?.staff||[];openModal(`<h2>Clinic Staff Access</h2><form id="staffForm" class="form-grid"><div class="field"><label>Email</label><input name="email" type="email" required></div><div class="field"><label>Role</label><select name="role"><option>RECEPTIONIST</option><option>VETERINARIAN</option><option>GROOMER</option><option>CLINIC ADMIN</option></select></div><div class="field full"><button class="btn btn-primary">ADD / UPDATE STAFF</button></div></form><div class="auth-note">Staff must have a PetCare account first.</div>${rows.map(s=>`<div class="share-row"><div><strong>${esc(s.profile?.display_name||s.profile?.email||'Staff')}</strong><small>${esc(s.profile?.email||'')} · ${esc(s.role?.code||'')} · ${s.active?'ACTIVE':'INACTIVE'}</small></div>${s.user_id!==state.session.user.id?`<button class="btn btn-danger" data-deactivate-email="${esc(s.profile?.email||'')}">DEACTIVATE</button>`:''}</div>`).join('')}`);document.getElementById('staffForm').onsubmit=async e=>{e.preventDefault();const x=Object.fromEntries(new FormData(e.target));const r=await state.client.functions.invoke('clinic-staff-admin',{body:{action:'invite',email:x.email,role:x.role}});if(r.error)return flash(r.error.message);flash('Staff access updated');load()};document.querySelectorAll('[data-deactivate-email]').forEach(b=>b.onclick=async()=>{await state.client.functions.invoke('clinic-staff-admin',{body:{action:'deactivate',email:b.dataset.deactivateEmail}});flash('Staff deactivated');load()})};load()}

function subscribeRealtime(){
  if(!state.active||state.realtime)return;state.realtime=state.client.channel('petcare-live');
  ['vaccinations','reminders','grooming_records','appointments','health_timeline','notifications'].forEach(table=>state.realtime.on('postgres_changes',{event:'*',schema:'public',table},()=>{if(Date.now()-state.lastWriteAt<2200)return;clearTimeout(state._rt);state._rt=setTimeout(async()=>{try{const fresh=await loadRemoteData();state.initialData=fresh;localStorage.setItem(LOCAL_KEY,JSON.stringify(fresh));flash('Clinic records updated — refresh to view') }catch(e){console.warn(e)}},500)}));state.realtime.subscribe()
}

api.claimAdmin=async code=>state.client.functions.invoke('claim-clinic-admin',{body:{code}});
})();

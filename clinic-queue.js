(()=>{
'use strict';

const api=()=>window.PetCareSupabase;
const ws=()=>window.PetCareWorkspace;
const appData=()=>window.petcareGetData?.()||null;
const DEMO_KEY='petcare-clinic-queue-demo-v1';
const THRESHOLD_KEY='petcare-clinic-queue-threshold-minutes';
const ACTIVE_STATUSES=new Set(['EXPECTED','CHECKED IN','WAITING','WITH VET','WITH GROOMER','READY FOR PICKUP']);
const state={items:[],ready:false,secure:false,channel:null,threshold:Math.max(5,Number(localStorage.getItem(THRESHOLD_KEY)||30)||30),renderTimer:null};
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const today=()=>{const d=new Date(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${d.getFullYear()}-${m}-${day}`};
const nowIso=()=>new Date().toISOString();
const fmtTime=v=>{if(!v)return'—';const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v).slice(0,5)||'—';return d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})};
const statusClass=s=>String(s||'').toLowerCase().replaceAll(' ','-');
const role=()=>state.secure?String(api()?.state?.staffRole||'').toUpperCase():'CLINIC ADMIN';
const toast=msg=>{const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1900)};
const petById=id=>appData()?.pets?.find(p=>p.id===id)||null;
const customerForPet=id=>appData()?.customers?.find(c=>(c.petIds||[]).includes(id))||null;

function minuteDiff(value){if(!value)return 0;const n=new Date(value).getTime();return Number.isFinite(n)?Math.max(0,Math.floor((Date.now()-n)/60000)):0}
function waitingMinutes(q){if(['WAITING','CHECKED IN'].includes(q.status))return minuteDiff(q.arrival_time);if(['WITH VET','WITH GROOMER'].includes(q.status))return minuteDiff(q.service_started_at);return 0}
function isAttention(q){return ['WAITING','CHECKED IN'].includes(q.status)&&waitingMinutes(q)>=state.threshold}
function ownerName(q){return q.owner_display_name||q.temp_owner_name||customerForPet(q.pet_id)?.name||'Owner on file'}
function petName(q){return petById(q.pet_id)?.name||q.temp_pet_name||'Pet'}
function species(q){return petById(q.pet_id)?.species||q.temp_species||'Pet'}
function assigned(q){return q.assigned_staff_name||'Unassigned'}
function scheduled(q){return q.scheduled_time?fmtTime(q.scheduled_time):'Walk-in'}

function demoSeed(){
  const d=appData();
  const isoAgo=m=>new Date(Date.now()-m*60000).toISOString();
  const customer=id=>d?.customers?.find(c=>(c.petIds||[]).includes(id))?.name||'Owner on file';
  return [
    {id:'dq1',clinic_id:'demo',pet_id:'p1',owner_id:null,appointment_id:'a1',queue_date:today(),queue_number:'VET-001',queue_type:'VET',assigned_staff_name:'Dr. Sofia Reyes',service_label:'Routine checkup',status:'WAITING',scheduled_time:null,arrival_time:isoAgo(34),service_started_at:null,ready_at:null,completed_at:null,cancelled_at:null,notes:'',is_walk_in:false,owner_display_name:customer('p1'),created_at:nowIso(),updated_at:nowIso()},
    {id:'dq2',clinic_id:'demo',pet_id:'p2',owner_id:null,appointment_id:'a2',queue_date:today(),queue_number:'VET-002',queue_type:'VET',assigned_staff_name:'Dr. Miguel Santos',service_label:'Vaccination',status:'WITH VET',scheduled_time:null,arrival_time:isoAgo(22),service_started_at:isoAgo(8),ready_at:null,completed_at:null,cancelled_at:null,notes:'',is_walk_in:false,owner_display_name:customer('p2'),created_at:nowIso(),updated_at:nowIso()},
    {id:'dq3',clinic_id:'demo',pet_id:'p3',owner_id:null,appointment_id:null,queue_date:today(),queue_number:'GRM-001',queue_type:'GROOMING',assigned_staff_name:'Mae',service_label:'Full Groom',status:'READY FOR PICKUP',scheduled_time:null,arrival_time:isoAgo(95),service_started_at:isoAgo(82),ready_at:isoAgo(7),completed_at:null,cancelled_at:null,notes:'',is_walk_in:true,owner_display_name:customer('p3'),created_at:nowIso(),updated_at:nowIso()}
  ];
}
function loadDemo(){
  try{const x=JSON.parse(localStorage.getItem(DEMO_KEY));state.items=Array.isArray(x)&&x.length?x:demoSeed()}catch{state.items=demoSeed()}
  localStorage.setItem(DEMO_KEY,JSON.stringify(state.items));state.ready=true;notify();
}
function saveDemo(){localStorage.setItem(DEMO_KEY,JSON.stringify(state.items))}

async function loadSecure(){
  const a=api();if(!a?.active||!a.state?.staff||!a.state?.clinic?.id)return;
  state.secure=true;
  const c=a.state.client,clinicId=a.state.clinic.id;
  const {data,error}=await c.from('clinic_queue').select('*').eq('clinic_id',clinicId).eq('queue_date',today()).order('created_at',{ascending:true});
  if(error){console.warn('Queue load',error.message);return}
  state.items=data||[];state.ready=true;
  await syncExpectedAppointments();
  if(state.channel){try{await c.removeChannel(state.channel)}catch{}}
  const ch=c.channel('petcare-clinic-queue-live');state.channel=ch;
  ch.on('postgres_changes',{event:'*',schema:'public',table:'clinic_queue',filter:`clinic_id=eq.${clinicId}`},payload=>{
    const row=payload.new&&Object.keys(payload.new).length?payload.new:payload.old;if(!row||row.queue_date!==today())return;
    if(payload.eventType==='DELETE')state.items=state.items.filter(x=>x.id!==row.id);
    else upsertItem(row);
    notify();
  }).subscribe();
  notify();
}
function upsertItem(row){const i=state.items.findIndex(x=>x.id===row.id);if(i>=0)state.items[i]=row;else state.items.push(row)}

function queueTypeForAppointment(a){return /groom|bath|nail|spa/i.test(`${a.type||''} ${a.reason||''}`)?'GROOMING':'VET'}
function canSeedType(type){const r=role();return ['CLINIC ADMIN','RECEPTIONIST'].includes(r)||(r==='VETERINARIAN'&&type==='VET')||(r==='GROOMER'&&type==='GROOMING')}
async function syncExpectedAppointments(){
  if(!state.secure)return;
  const a=api(),d=appData(),c=a?.state?.client;if(!a?.state?.clinic?.id||!d||!c)return;
  const existing=new Set(state.items.map(x=>x.appointment_id).filter(Boolean));
  const appts=(d.appointments||[]).filter(x=>x.date===today()&&!['COMPLETED','CANCELLED','CANCELED','NO SHOW'].includes(String(x.status||'').toUpperCase()));
  for(const appt of appts){
    if(existing.has(appt.id))continue;
    const qt=queueTypeForAppointment(appt);if(!canSeedType(qt))continue;
    const p=petById(appt.petId);if(!p)continue;
    let scheduledTime=null;
    if(appt.time){const dt=new Date(`${appt.date}T${appt.time}:00`);if(!Number.isNaN(dt.getTime()))scheduledTime=dt.toISOString()}
    const payload={clinic_id:a.state.clinic.id,pet_id:p.id,owner_id:p.ownerId||a.state.petOwners?.get?.(p.id)||null,appointment_id:appt.id,queue_type:qt,assigned_staff_name:appt.vet||null,service_label:appt.type||'Appointment',status:'EXPECTED',scheduled_time:scheduledTime,is_walk_in:false,created_by:a.state.session?.user?.id||null};
    const {data:row,error}=await c.from('clinic_queue').insert(payload).select().single();
    if(error){if(error.code!=='23505')console.warn('Expected queue sync',error.message)}else if(row){upsertItem(row);existing.add(appt.id)}
  }
}

function counts(){
  const active=state.items.filter(x=>x.queue_date===today());
  return {
    expected:active.filter(x=>x.status==='EXPECTED').length,
    waiting:active.filter(x=>['CHECKED IN','WAITING'].includes(x.status)).length,
    attention:active.filter(isAttention).length,
    vet:active.filter(x=>x.status==='WITH VET').length,
    groom:active.filter(x=>x.status==='WITH GROOMER').length,
    ready:active.filter(x=>x.status==='READY FOR PICKUP').length,
    completed:active.filter(x=>x.status==='COMPLETED').length
  };
}
function centerPriority(){
  const c=counts();
  if(c.attention)return {kicker:'NEEDS ATTENTION',title:`${c.attention} waiting over ${state.threshold} min`,meta:'Review the live clinic queue'};
  if(c.waiting)return {kicker:'PETS WAITING',title:`${c.waiting} ${c.waiting===1?'pet':'pets'} waiting`,meta:'Tap to open Today\'s Clinic'};
  if(c.vet)return {kicker:'WITH VET',title:`${c.vet} ${c.vet===1?'pet':'pets'} in consult`,meta:'Live clinic queue'};
  if(c.ready)return {kicker:'READY FOR PICKUP',title:`${c.ready} grooming ${c.ready===1?'pet':'pets'}`,meta:'Pickup pending'};
  if(c.groom)return {kicker:'WITH GROOMER',title:`${c.groom} ${c.groom===1?'pet':'pets'} in grooming`,meta:'Live grooming queue'};
  if(c.expected)return {kicker:"TODAY'S CLINIC",title:`${c.expected} expected ${c.expected===1?'visit':'visits'}`,meta:'Tap center for Smart Hub'};
  return {kicker:"TODAY'S CLINIC",title:'All clear',meta:'No active queue items'};
}
function updateCenter(){
  if(!state.ready)return;
  const center=document.querySelector('#clinicOrbit .clinic-center');if(!center)return;
  const p=centerPriority(),k=center.querySelector('small'),t=center.querySelector('strong'),m=center.querySelector('span'),e=center.querySelector('em');
  if(k&&k.textContent!==p.kicker)k.textContent=p.kicker;
  if(t&&t.textContent!==p.title)t.textContent=p.title;
  if(m&&m.textContent!==p.meta)m.textContent=p.meta;
  if(e&&e.textContent!=='OPEN SMART HUB')e.textContent='OPEN SMART HUB';
}

function enhanceSmartHub(){
  const hub=document.querySelector('#clinicPanel .smart-clinic-hub');if(!hub||!state.ready)return;
  const c=counts();
  [...hub.querySelectorAll('.smart-stat')].forEach(card=>{
    const label=card.querySelector('small')?.textContent?.trim();
    const value=card.querySelector('strong'),meta=card.querySelector('span');
    if(label==='PETS WAITING / CHECKED IN'){if(value)value.textContent=String(c.waiting);if(meta)meta.textContent=c.attention?`${c.attention} waiting over ${state.threshold} min`:c.waiting?'Open live queue to manage':'None waiting';card.classList.add('queue-highlight');card.onclick=()=>openQueue();card.style.cursor='pointer'}
    if(label==='GROOMING IN SERVICE'){if(value)value.textContent=String(c.groom);if(meta)meta.textContent=c.groom?'Live grooming queue':'None in service'}
    if(label==='READY FOR PICKUP'){if(value)value.textContent=String(c.ready);if(meta)meta.textContent=c.ready?'Pickup pending':'None ready'}
  });
  if(!hub.querySelector('[data-open-live-queue]')){
    const box=document.createElement('div');box.className='queue-smart-entry';box.innerHTML=`<button class="btn btn-primary" data-open-live-queue>OPEN LIVE CLINIC QUEUE</button><div class="queue-threshold-note">Waiting attention threshold: ${state.threshold} minutes</div>`;hub.querySelector('.smart-actions')?.before(box);box.querySelector('button').onclick=openQueue;
  }
}

function actionButtons(q){
  const r=role(),admin=r==='CLINIC ADMIN',reception=r==='RECEPTIONIST',vet=r==='VETERINARIAN',groomer=r==='GROOMER',demo=!state.secure;
  const canCheck=demo||admin||reception||(vet&&q.queue_type==='VET')||(groomer&&q.queue_type==='GROOMING');
  const a=[];
  if(q.status==='EXPECTED'&&canCheck)a.push(['WAITING','CHECK IN PET','primary']);
  if(q.status==='CHECKED IN'&&canCheck)a.push(['WAITING','MOVE TO WAITING','primary']);
  if(q.status==='WAITING'&&(demo||admin||(vet&&q.queue_type==='VET')))a.push(['WITH VET','START CONSULT','primary']);
  if(q.status==='WAITING'&&q.queue_type==='GROOMING'&&(demo||admin||groomer))a.push(['WITH GROOMER','START GROOMING','primary']);
  if(q.status==='WAITING'&&q.queue_type==='VET'&&(demo||admin||reception))a.push(['SEND_GROOMING','SEND TO GROOMING','outline']);
  if(q.status==='WITH VET'&&(demo||admin||vet))a.push(['COMPLETED','COMPLETE','primary']);
  if(q.status==='WITH GROOMER'&&(demo||admin||groomer))a.push(['READY FOR PICKUP','READY FOR PICKUP','primary']);
  if(q.status==='READY FOR PICKUP'&&(demo||admin||reception||groomer))a.push(['COMPLETED','COMPLETE','primary']);
  if(q.status==='EXPECTED'&&(demo||admin||reception))a.push(['NO SHOW','MARK NO SHOW','danger']);
  if(ACTIVE_STATUSES.has(q.status)&&(demo||admin||reception))a.push(['CANCELLED','CANCEL','danger']);
  return a.map(([next,label,kind])=>`<button class="btn ${kind==='primary'?'btn-primary':kind==='danger'?'btn-danger':'btn-outline'}" data-queue-status="${esc(next)}" data-queue-id="${esc(q.id)}">${esc(label)}</button>`).join('');
}
function queueCard(q){
  const p=petName(q),sp=species(q),mins=waitingMinutes(q),attention=isAttention(q);
  let timing='—';if(['WAITING','CHECKED IN'].includes(q.status))timing=`Waiting ${mins} min${attention?' · NEEDS ATTENTION':''}`;else if(q.status==='WITH VET')timing=`With Vet · ${mins} min`;else if(q.status==='WITH GROOMER')timing=`With Groomer · ${mins} min`;else if(q.status==='READY FOR PICKUP')timing=`Ready · ${minuteDiff(q.ready_at)} min`;else if(q.status==='COMPLETED')timing=`Completed ${fmtTime(q.completed_at)}`;
  return `<article class="queue-card ${attention?'needs-attention':''}" data-queue-card="${esc(q.id)}">
    <div class="queue-card-head"><div><div class="queue-id"><span class="queue-number">${esc(q.queue_number||'QUEUE')}</span><span class="queue-status ${statusClass(q.status)}">${esc(q.status)}</span></div><h4 class="queue-pet">${esc(p)} · ${esc(sp)}</h4></div><strong class="queue-wait">${esc(timing)}</strong></div>
    <div class="queue-meta">
      <div><small>Owner</small><span>${esc(ownerName(q))}</span></div>
      <div><small>Service</small><span>${esc(q.service_label||q.queue_type)}</span></div>
      <div><small>Appointment</small><span>${esc(scheduled(q))}</span></div>
      <div><small>Assigned</small><span>${esc(assigned(q))}</span></div>
      <div><small>Arrival</small><span>${esc(fmtTime(q.arrival_time))}</span></div>
      <div><small>Queue Type</small><span>${esc(q.queue_type)}</span></div>
    </div>
    ${q.notes?`<div class="queue-threshold-note">Note: ${esc(q.notes)}</div>`:''}
    <div class="queue-actions">${actionButtons(q)}</div>
  </article>`;
}
function section(title,filter){const rows=state.items.filter(x=>x.queue_date===today()&&filter(x));return `<section class="queue-section"><h3>${esc(title)} <span class="queue-count">${rows.length}</span></h3><div class="queue-list">${rows.length?rows.map(queueCard).join(''):'<div class="queue-empty">No pets in this section.</div>'}</div></section>`}
function queueHtml(){
  const c=counts();
  return `<div class="smart-hub clinic-queue-workspace">
    <div class="smart-hero"><div><span class="smart-eyebrow">LIVE OPERATIONS</span><h2>Live Clinic Queue</h2><p>${esc(state.secure?(role()+' · Supabase Realtime'):'DEMO · Local queue')}</p></div><span class="smart-status ${c.attention?'attention':c.waiting||c.vet||c.groom?'due':'good'}">${c.attention?'NEEDS ATTENTION':c.waiting||c.vet||c.groom?'ACTIVE':'ALL CLEAR'}</span></div>
    <div class="queue-toolbar"><div><strong>Today · ${esc(new Date().toLocaleDateString())}</strong><div class="queue-threshold-note">Waiting alert after ${state.threshold} minutes. Operational timing only.</div></div><div class="actions"><button class="btn btn-primary" data-queue-walkin>+ ADD WALK-IN</button><button class="btn btn-outline" data-queue-threshold>WAIT ALERT: ${state.threshold} MIN</button></div></div>
    <div class="queue-summary"><div class="smart-stat"><small>EXPECTED</small><strong>${c.expected}</strong></div><div class="smart-stat"><small>WAITING</small><strong>${c.waiting}</strong></div><div class="smart-stat"><small>IN SERVICE</small><strong>${c.vet+c.groom}</strong></div><div class="smart-stat"><small>READY</small><strong>${c.ready}</strong></div></div>
    ${section('EXPECTED / CHECK-IN',x=>x.status==='EXPECTED')}
    ${section('WAITING',x=>['CHECKED IN','WAITING'].includes(x.status))}
    ${section('WITH VET',x=>x.status==='WITH VET')}
    ${section('WITH GROOMER',x=>x.status==='WITH GROOMER')}
    ${section('READY FOR PICKUP',x=>x.status==='READY FOR PICKUP')}
    ${section('COMPLETED TODAY',x=>x.status==='COMPLETED')}
    <div class="smart-note">Queue times are operational only and are not medical urgency estimates.</div>
  </div>`;
}
function openQueue(){if(!state.ready){toast('Queue is loading');return}ws()?.showCustom?.('clinic',queueHtml(),'clinic-queue')}
function refreshQueue(){if(ws()?.current?.('clinic')==='clinic-queue')ws()?.refreshCustom?.('clinic',queueHtml())}

async function setStatus(id,next){
  const q=state.items.find(x=>x.id===id);if(!q)return;
  if(['CANCELLED','NO SHOW','COMPLETED'].includes(next)&&!confirm(`${next==='COMPLETED'?'Complete':next==='CANCELLED'?'Cancel':'Mark no show for'} ${petName(q)}?`))return;
  let patch={status:next};
  if(next==='SEND_GROOMING')patch={queue_type:'GROOMING',queue_number:null,status:'WAITING',assigned_staff_name:null};
  if(state.secure){
    const {data:row,error}=await api().state.client.from('clinic_queue').update(patch).eq('id',id).select().single();
    if(error){toast(error.message);return}if(row)upsertItem(row);
  }else{
    Object.assign(q,patch,{updated_at:nowIso()});
    if(next==='WAITING'&&!q.arrival_time)q.arrival_time=nowIso();
    if(['WITH VET','WITH GROOMER'].includes(next)&&!q.service_started_at)q.service_started_at=nowIso();
    if(next==='READY FOR PICKUP'&&!q.ready_at)q.ready_at=nowIso();
    if(next==='COMPLETED'&&!q.completed_at)q.completed_at=nowIso();
    if(['CANCELLED','NO SHOW'].includes(next)&&!q.cancelled_at)q.cancelled_at=nowIso();
    if(next==='SEND_GROOMING'){q.queue_number=nextDemoNumber('GROOMING');q.queue_type='GROOMING';q.status='WAITING'}
    const d=appData(),a=q.appointment_id&&d?.appointments?.find(x=>x.id===q.appointment_id);if(a){a.status=q.status==='WAITING'?'CHECKED IN':q.status==='WITH VET'||q.status==='WITH GROOMER'?'IN SERVICE':q.status}
    saveDemo();
  }
  notify();toast(next==='SEND_GROOMING'?'Sent to grooming queue':`Status: ${patch.status}`);
}
function nextDemoNumber(type){const prefix=type==='GROOMING'?'GRM':'VET',nums=state.items.filter(x=>x.queue_date===today()&&String(x.queue_number||'').startsWith(prefix+'-')).map(x=>Number(String(x.queue_number).split('-')[1])||0);return `${prefix}-${String(Math.max(0,...nums)+1).padStart(3,'0')}`}

function modal(html){const m=document.getElementById('modal'),b=document.getElementById('modalBody');if(!m||!b)return null;b.innerHTML=html;m.classList.add('open');m.setAttribute('aria-hidden','false');return b}
function closeModal(){const m=document.getElementById('modal');if(m){m.classList.remove('open');m.setAttribute('aria-hidden','true')}}
function showWalkIn(){
  const pets=(appData()?.pets||[]).filter(p=>!p.placeholder);
  const options=pets.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} · ${esc(p.species||'Pet')}</option>`).join('');
  const body=modal(`<h2>Add Walk-In</h2><form id="queueWalkinForm" class="queue-walkin-grid">
    <div class="full"><label>Existing pet (optional)</label><input id="queuePetFilter" placeholder="Search pet name"><select name="petId" id="queuePetSelect"><option value="">NEW / TEMPORARY PET</option>${options}</select></div>
    <div><label>Pet name</label><input name="petName" placeholder="Required for temporary pet"></div><div><label>Species</label><select name="species"><option>Dog</option><option>Cat</option><option>Other</option></select></div>
    <div><label>Owner name</label><input name="ownerName" placeholder="Owner"></div><div><label>Mobile</label><input name="mobile" inputmode="tel" placeholder="Optional"></div>
    <div><label>Queue type</label><select name="queueType"><option value="VET">Vet</option><option value="GROOMING">Grooming</option></select></div><div><label>Assigned staff</label><input name="assigned" placeholder="Vet / groomer"></div>
    <div class="full"><label>Reason / Service</label><input name="service" required placeholder="Consultation, grooming, vaccination..."></div>
    <div class="full"><label>Notes</label><textarea name="notes"></textarea></div>
    <div class="full"><button class="btn btn-primary" type="submit">ADD TO QUEUE</button></div>
  </form>`);if(!body)return;
  const filter=body.querySelector('#queuePetFilter'),select=body.querySelector('#queuePetSelect');
  filter.oninput=()=>{const q=filter.value.toLowerCase();[...select.options].forEach((o,i)=>{if(i)o.hidden=!o.textContent.toLowerCase().includes(q)})};
  body.querySelector('#queueWalkinForm').onsubmit=async e=>{e.preventDefault();const x=Object.fromEntries(new FormData(e.target)),p=x.petId?petById(x.petId):null;if(!p&&!String(x.petName||'').trim()){toast('Enter the temporary pet name');return}
    if(state.secure){const a=api();const payload={clinic_id:a.state.clinic.id,pet_id:p?.id||null,owner_id:p?.ownerId||a.state.petOwners?.get?.(p?.id)||null,queue_type:x.queueType,assigned_staff_name:x.assigned||null,service_label:x.service,status:'WAITING',arrival_time:nowIso(),notes:x.notes||null,is_walk_in:true,temp_pet_name:p?null:x.petName,temp_species:p?null:x.species,temp_owner_name:p?null:x.ownerName,temp_mobile:p?null:x.mobile,created_by:a.state.session.user.id};const {data:row,error}=await a.state.client.from('clinic_queue').insert(payload).select().single();if(error){toast(error.message);return}if(row)upsertItem(row)}
    else{const q={id:'dq'+Date.now(),clinic_id:'demo',pet_id:p?.id||null,owner_id:null,appointment_id:null,queue_date:today(),queue_number:nextDemoNumber(x.queueType),queue_type:x.queueType,assigned_staff_name:x.assigned||null,service_label:x.service,status:'WAITING',scheduled_time:null,arrival_time:nowIso(),service_started_at:null,ready_at:null,completed_at:null,cancelled_at:null,notes:x.notes||'',is_walk_in:true,temp_pet_name:p?null:x.petName,temp_species:p?null:x.species,temp_owner_name:p?null:x.ownerName,temp_mobile:p?null:x.mobile,owner_display_name:p?customerForPet(p.id)?.name:null,created_at:nowIso(),updated_at:nowIso()};state.items.push(q);saveDemo()}
    closeModal();notify();toast('Walk-in added');
  };
}
function setThreshold(){const n=Number(prompt('Waiting attention threshold in minutes',String(state.threshold)));if(!Number.isFinite(n)||n<5||n>240){toast('Choose 5 to 240 minutes');return}state.threshold=Math.round(n);localStorage.setItem(THRESHOLD_KEY,String(state.threshold));notify()}

function notify(){updateCenter();enhanceSmartHub();refreshQueue()}
function installDomObserver(){
  const root=document.getElementById('app')||document.body;const mo=new MutationObserver(()=>{updateCenter();enhanceSmartHub()});mo.observe(root,{childList:true,subtree:true,characterData:true});
}
function bindClicks(){document.addEventListener('click',e=>{
  const smart=e.target.closest('[data-smart-action="check-in"]');if(smart){e.preventDefault();e.stopImmediatePropagation();openQueue();return}
  const open=e.target.closest('[data-open-live-queue]');if(open){e.preventDefault();openQueue();return}
  const status=e.target.closest('[data-queue-status]');if(status){e.preventDefault();setStatus(status.dataset.queueId,status.dataset.queueStatus);return}
  if(e.target.closest('[data-queue-walkin]')){e.preventDefault();showWalkIn();return}
  if(e.target.closest('[data-queue-threshold]')){e.preventDefault();setThreshold();return}
},true)}

async function init(){
  bindClicks();installDomObserver();
  await Promise.resolve(api()?.ready).catch(()=>true);
  if(api()?.active&&api()?.state?.staff)await loadSecure();else loadDemo();
  setInterval(()=>{updateCenter();enhanceSmartHub();refreshQueue()},30000);
}
window.PetCareClinicQueue={state,open:openQueue,refresh:refreshQueue,counts,centerPriority,syncExpectedAppointments};
window.addEventListener('DOMContentLoaded',init);
})();

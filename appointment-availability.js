(()=>{
'use strict';
const api=()=>window.PetCareSupabase;
const ws=()=>window.PetCareWorkspace;
const data=()=>window.petcareGetData?.()||null;
const selectedPet=()=>window.petcareGetSelected?.()||null;
const DEMO_KEY='petcare-availability-demo-v1';
const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const esc=s=>String(s??'').replace(/[&<>\'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const toast=msg=>{const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1900)};
const clinicId=()=>api()?.state?.clinic?.id||selectedPet()?.clinicId||data()?.pets?.find(p=>p.clinicId)?.clinicId||null;
const isSecure=()=>!!api()?.active;
const staffRole=()=>String(api()?.state?.staffRole||'').toUpperCase();
const isAdmin=()=>!isSecure()||staffRole()==='CLINIC ADMIN';
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const localPHIso=v=>v?new Date(v.length===16?v+':00+08:00':v).toISOString():null;
const fmtDate=d=>d?new Date(d+'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'—';
const fmtTime=t=>{if(!t)return'—';const [h,m]=String(t).slice(0,5).split(':').map(Number);const d=new Date();d.setHours(h,m,0,0);return d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})};
const uid=()=>crypto.randomUUID?crypto.randomUUID():'id-'+Date.now()+'-'+Math.random().toString(36).slice(2);
let draft={mode:'owner',type:'VET',staffId:'',date:today(),duration:30,petId:null,slots:[],selected:null};

function demoSeed(){
  const cid='demo';
  const staff=[
    {id:'ds-v1',clinic_id:cid,display_name:'Dr. Sofia Reyes',booking_type:'VET',active:true},
    {id:'ds-v2',clinic_id:cid,display_name:'Dr. Miguel Santos',booking_type:'VET',active:true},
    {id:'ds-g1',clinic_id:cid,display_name:'Alex',booking_type:'GROOMING',active:true},
    {id:'ds-g2',clinic_id:cid,display_name:'Mae',booking_type:'GROOMING',active:true}
  ];
  const hours=DAYS.map((_,weekday)=>({id:'dh'+weekday,clinic_id:cid,weekday,open_time:weekday===0?null:'09:00',close_time:weekday===0?null:'18:00',closed:weekday===0}));
  const schedules=[];staff.forEach(s=>{for(let weekday=1;weekday<=6;weekday++)schedules.push({id:`sch-${s.id}-${weekday}`,clinic_id:cid,booking_staff_id:s.id,weekday,start_time:'09:00',end_time:'18:00',slot_minutes:30,active:true})});
  return {staff,hours,schedules,blocks:[]};
}
function demoState(){try{const x=JSON.parse(localStorage.getItem(DEMO_KEY));if(x?.staff&&x?.hours&&x?.schedules)return x}catch{}const x=demoSeed();localStorage.setItem(DEMO_KEY,JSON.stringify(x));return x}
function saveDemo(x){localStorage.setItem(DEMO_KEY,JSON.stringify(x))}
function petName(id){return data()?.pets?.find(p=>p.id===id)?.name||'Pet'}
function staffName(id,source){return source?.find(x=>x.id===id)?.display_name||'Staff'}

async function getStaff(type){
  if(!isSecure())return demoState().staff.filter(x=>x.active&&x.booking_type===type);
  const cid=clinicId();if(!cid)return[];
  const {data:rows,error}=await api().state.client.rpc('get_booking_staff',{p_clinic_id:cid,p_booking_type:type});
  if(error){toast(error.message);return[]}return rows||[];
}
async function getSlots(type,date,staffId,duration){
  if(!isSecure())return demoSlots(type,date,staffId,duration);
  const cid=clinicId();if(!cid)return[];
  const {data:rows,error}=await api().state.client.rpc('get_available_slots',{p_clinic_id:cid,p_booking_type:type,p_date:date,p_booking_staff_id:staffId||null,p_duration_minutes:Number(duration)||30});
  if(error){toast(error.message);return[]}return (rows||[]).map(r=>({...r,slot_time:String(r.slot_time||'').slice(0,5)}));
}
function mins(t){const [h,m]=String(t||'00:00').slice(0,5).split(':').map(Number);return h*60+m}
function tstr(n){return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`}
function demoSlots(type,date,staffId,duration){
  const s=demoState(),day=new Date(date+'T00:00:00').getDay(),h=s.hours.find(x=>x.weekday===day);if(!h||h.closed)return[];
  const dur=Number(duration)||30,appointments=data()?.appointments||[],out=[];
  for(const st of s.staff.filter(x=>x.active&&x.booking_type===type&&(!staffId||x.id===staffId))){
    for(const sch of s.schedules.filter(x=>x.active&&x.booking_staff_id===st.id&&x.weekday===day)){
      for(let n=mins(sch.start_time);n+dur<=mins(sch.end_time);n+=Number(sch.slot_minutes)||30){
        const slot=tstr(n),end=n+dur;if(n<mins(h.open_time)||end>mins(h.close_time))continue;
        const blocked=s.blocks.some(b=>(!b.booking_staff_id||b.booking_staff_id===st.id)&&new Date(b.starts_at)<new Date(`${date}T${tstr(end)}:00+08:00`)&&new Date(b.ends_at)>new Date(`${date}T${slot}:00+08:00`));if(blocked)continue;
        const conflict=appointments.some(a=>a.date===date&&String(a.status||'').toUpperCase()!=='CANCELLED'&&((a.bookingStaffId&&a.bookingStaffId===st.id)||(!a.bookingStaffId&&a.vet===st.display_name))&&mins(a.time)<end&&(mins(a.time)+(Number(a.durationMinutes)||30))>n);if(conflict)continue;
        out.push({booking_staff_id:st.id,staff_name:st.display_name,slot_time:slot,slot_minutes:sch.slot_minutes});
      }
    }
  }
  return out.sort((a,b)=>a.slot_time.localeCompare(b.slot_time)||a.staff_name.localeCompare(b.staff_name));
}

function bookingHtml(mode,type){
  const pets=(data()?.pets||[]).filter(p=>!p.placeholder),ownerPet=selectedPet(),clinicMode=mode==='clinic';
  const chosen=clinicMode?(draft.petId||pets[0]?.id):(ownerPet?.id||pets[0]?.id);draft.petId=chosen;draft.mode=mode;draft.type=type||draft.type||'VET';
  return `<div class="smart-hub availability-workspace">
    <div class="smart-hero"><div><span class="smart-eyebrow">VERSION 20 · SCHEDULING</span><h2>Appointment Availability</h2><p>Clinic hours · Staff schedules · No double booking</p></div><span class="smart-status good">LIVE SLOTS</span></div>
    <div class="availability-form">
      ${clinicMode?`<label>Pet<select id="avPet">${pets.map(p=>`<option value="${esc(p.id)}" ${p.id===chosen?'selected':''}>${esc(p.name)} · ${esc(p.species||'Pet')}</option>`).join('')}</select></label>`:`<div class="availability-pet"><small>PET</small><strong>${esc(ownerPet?.name||'Pet')}</strong></div>`}
      <label>Service<select id="avType"><option value="VET" ${draft.type==='VET'?'selected':''}>Vet Appointment</option><option value="GROOMING" ${draft.type==='GROOMING'?'selected':''}>Grooming</option></select></label>
      <label>Date<input id="avDate" type="date" min="${today()}" value="${esc(draft.date||today())}"></label>
      <label>Duration<select id="avDuration"><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option></select></label>
      <label>Preferred staff<select id="avStaff"><option value="">ANY AVAILABLE</option></select></label>
      <button class="btn btn-primary availability-check" id="avCheck">CHECK AVAILABLE TIMES</button>
    </div>
    <div id="avSlots" class="availability-slots"><div class="availability-empty">Choose a date, then check available times.</div></div>
    <div id="avBookingDetails" class="availability-booking-details" hidden>
      <h3>Booking Details</h3>
      <div class="availability-selected" id="avSelectedSummary"></div>
      <div class="availability-form two-col">
        <label>Appointment / Service<input id="avService" value="${draft.type==='GROOMING'?'Full Groom':'Consultation'}"></label>
        <label>Reason<input id="avReason" placeholder="Optional"></label>
        <label class="full">Notes<textarea id="avNotes" placeholder="Optional notes"></textarea></label>
      </div>
      <button class="btn btn-primary availability-confirm" id="avConfirm">CONFIRM BOOKING</button>
    </div>
    ${isAdmin()&&clinicMode?'<div class="availability-admin-link"><button class="btn btn-outline" id="avSetup">MANAGE CLINIC HOURS & STAFF SCHEDULES</button></div>':''}
    <div class="smart-note">Available times use the clinic's recorded hours, staff schedules, blocked times, and existing active appointments. If another booking takes the slot first, the system will stop the duplicate booking.</div>
  </div>`;
}

async function openBooking(mode='owner',type='VET'){
  draft={mode,type,staffId:'',date:today(),duration:30,petId:mode==='clinic'?(data()?.pets||[]).find(p=>!p.placeholder)?.id:selectedPet()?.id,slots:[],selected:null};
  ws()?.showCustom?.(mode,bookingHtml(mode,type),'availability');
  await wireBooking();
}
async function wireBooking(){
  const root=document.querySelector('.availability-workspace');if(!root)return;
  const type=root.querySelector('#avType'),date=root.querySelector('#avDate'),duration=root.querySelector('#avDuration'),staff=root.querySelector('#avStaff'),pet=root.querySelector('#avPet');
  duration.value=String(draft.duration);
  async function staffRefresh(){const rows=await getStaff(type.value);staff.innerHTML='<option value="">ANY AVAILABLE</option>'+rows.map(x=>`<option value="${esc(x.id)}">${esc(x.display_name)}</option>`).join('');if(draft.staffId&&rows.some(x=>x.id===draft.staffId))staff.value=draft.staffId;if(!rows.length)root.querySelector('#avSlots').innerHTML='<div class="availability-empty">No booking staff are configured for this service yet.'+(isAdmin()&&draft.mode==='clinic'?' Use schedule setup below.':' Please contact the clinic.')+'</div>'}
  await staffRefresh();
  type.onchange=async()=>{draft.type=type.value;draft.selected=null;root.querySelector('#avBookingDetails').hidden=true;root.querySelector('#avService').value=type.value==='GROOMING'?'Full Groom':'Consultation';await staffRefresh()};
  if(pet)pet.onchange=()=>draft.petId=pet.value;
  date.onchange=()=>draft.date=date.value;duration.onchange=()=>draft.duration=Number(duration.value);staff.onchange=()=>draft.staffId=staff.value;
  root.querySelector('#avCheck').onclick=async()=>{
    draft.date=date.value;draft.duration=Number(duration.value);draft.staffId=staff.value;draft.petId=pet?.value||selectedPet()?.id;draft.selected=null;root.querySelector('#avBookingDetails').hidden=true;
    const box=root.querySelector('#avSlots');box.innerHTML='<div class="availability-empty">Checking available times…</div>';
    const rows=await getSlots(type.value,draft.date,draft.staffId,draft.duration);draft.slots=rows;
    if(!rows.length){box.innerHTML='<div class="availability-empty"><strong>No open slots found.</strong><span>Try another date, staff member, or duration.</span></div>';return}
    box.innerHTML=rows.map((r,i)=>`<button class="availability-slot" data-slot-index="${i}"><strong>${esc(fmtTime(r.slot_time))}</strong><span>${esc(r.staff_name)}</span></button>`).join('');
    box.querySelectorAll('[data-slot-index]').forEach(b=>b.onclick=()=>{box.querySelectorAll('.availability-slot').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');draft.selected=rows[Number(b.dataset.slotIndex)];root.querySelector('#avBookingDetails').hidden=false;root.querySelector('#avSelectedSummary').innerHTML=`<strong>${esc(fmtDate(draft.date))} · ${esc(fmtTime(draft.selected.slot_time))}</strong><span>${esc(draft.selected.staff_name)} · ${draft.duration} min</span>`;});
  };
  root.querySelector('#avConfirm').onclick=bookSelected;
  root.querySelector('#avSetup')?.addEventListener('click',()=>openSetup());
}

async function bookSelected(){
  if(!draft.selected){toast('Choose an available time');return}
  const service=document.getElementById('avService')?.value?.trim()||'Appointment',reason=document.getElementById('avReason')?.value?.trim()||null,notes=document.getElementById('avNotes')?.value?.trim()||null;
  const petId=draft.petId||selectedPet()?.id;if(!petId){toast('Choose a pet');return}
  if(isSecure()){
    const {data:aid,error}=await api().state.client.rpc('book_petcare_slot',{p_pet_id:petId,p_booking_staff_id:draft.selected.booking_staff_id,p_booking_type:draft.type,p_date:draft.date,p_time:draft.selected.slot_time,p_duration_minutes:draft.duration,p_appointment_type:service,p_reason:reason,p_notes:notes});
    if(error){toast(error.message.includes('no longer available')?'That slot was just taken. Please choose another time.':error.message);await wireBooking();return}
    toast('Appointment booked');
  }else{
    const nowSlots=demoSlots(draft.type,draft.date,draft.selected.booking_staff_id,draft.duration);if(!nowSlots.some(x=>x.booking_staff_id===draft.selected.booking_staff_id&&x.slot_time===draft.selected.slot_time)){toast('That slot is no longer available');return}
    const d=data(),appt={id:'a'+Date.now(),petId,vet:draft.selected.staff_name,type:draft.type==='GROOMING'&&!/groom/i.test(service)?'Grooming - '+service:service,date:draft.date,time:draft.selected.slot_time,status:draft.mode==='clinic'?'CONFIRMED':'REQUESTED',reason:reason||'',notes:notes||'',clinicId:'demo',bookingStaffId:draft.selected.booking_staff_id,bookingType:draft.type,durationMinutes:draft.duration};d.appointments=d.appointments||[];d.appointments.push(appt);
    if(draft.type==='GROOMING'){d.grooming=d.grooming||[];d.grooming.push({id:'g'+Date.now(),petId,service,next:draft.date,time:draft.selected.slot_time,groomer:draft.selected.staff_name,price:0,status:'BOOKED',appointmentId:appt.id})}
    localStorage.setItem('petcare-reminder-orbit-v1',JSON.stringify(d));toast('Demo appointment booked');
  }
  try{window.petcareRefreshActive?.()}catch{}
  setTimeout(()=>ws()?.open?.(draft.mode,draft.mode==='owner'?'visits':'appointments'),350);
}

async function loadSetup(){
  if(!isSecure())return demoState();const cid=clinicId(),c=api().state.client;
  const [staff,hours,schedules,blocks]=await Promise.all([
    c.from('booking_staff').select('*').eq('clinic_id',cid).order('display_name'),
    c.from('clinic_hours').select('*').eq('clinic_id',cid).order('weekday'),
    c.from('staff_schedules').select('*').eq('clinic_id',cid).order('weekday'),
    c.from('blocked_times').select('*').eq('clinic_id',cid).order('starts_at',{ascending:true})
  ]);
  for(const r of [staff,hours,schedules,blocks])if(r.error)toast(r.error.message);
  return {staff:staff.data||[],hours:hours.data||[],schedules:schedules.data||[],blocks:blocks.data||[]};
}
function setupHtml(s){
  const hourRows=DAYS.map((name,weekday)=>{const h=s.hours.find(x=>Number(x.weekday)===weekday)||{weekday,closed:false,open_time:'09:00',close_time:'18:00'};return `<div class="hours-row" data-day="${weekday}"><strong>${name}</strong><label><input type="checkbox" class="hours-closed" ${h.closed?'checked':''}> Closed</label><input class="hours-open" type="time" value="${esc(String(h.open_time||'09:00').slice(0,5))}" ${h.closed?'disabled':''}><span>to</span><input class="hours-close" type="time" value="${esc(String(h.close_time||'18:00').slice(0,5))}" ${h.closed?'disabled':''}></div>`}).join('');
  const staffRows=s.staff.map(st=>{const shifts=s.schedules.filter(x=>x.booking_staff_id===st.id);return `<article class="setup-card"><div><strong>${esc(st.display_name)}</strong><span class="tag">${esc(st.booking_type)}</span></div><div class="shift-list">${shifts.length?shifts.map(x=>`<span>${DAYS[x.weekday]} ${String(x.start_time).slice(0,5)}–${String(x.end_time).slice(0,5)} · ${x.slot_minutes}m <button data-del-shift="${esc(x.id)}">×</button></span>`).join(''):'<small>No schedule yet</small>'}</div><button class="btn btn-outline" data-add-shift="${esc(st.id)}">ADD SHIFT</button></article>`}).join('');
  const blockRows=s.blocks.map(b=>`<div class="block-row"><div><strong>${esc(b.booking_staff_id?staffName(b.booking_staff_id,s.staff):'ALL CLINIC')}</strong><small>${esc(new Date(b.starts_at).toLocaleString())} → ${esc(new Date(b.ends_at).toLocaleString())}${b.reason?' · '+esc(b.reason):''}</small></div><button class="btn btn-danger" data-del-block="${esc(b.id)}">REMOVE</button></div>`).join('');
  return `<div class="smart-hub availability-setup"><div class="smart-hero"><div><span class="smart-eyebrow">CLINIC ADMIN</span><h2>Availability Setup</h2><p>Clinic hours · Staff resources · Shifts · Blocked time</p></div><span class="smart-status good">NO DOUBLE BOOKING</span></div>
  <section class="setup-section"><h3>Clinic Hours</h3>${hourRows}<button class="btn btn-primary" id="saveHours">SAVE CLINIC HOURS</button></section>
  <section class="setup-section"><div class="setup-heading"><h3>Vet & Groomer Schedules</h3><button class="btn btn-primary" id="addBookingStaff">+ ADD STAFF</button></div><div class="setup-grid">${staffRows||'<div class="availability-empty">Add a veterinarian or groomer to start scheduling.</div>'}</div></section>
  <section class="setup-section"><div class="setup-heading"><h3>Blocked Times</h3><button class="btn btn-outline" id="addBlock">+ BLOCK TIME</button></div>${blockRows||'<div class="availability-empty">No blocked times.</div>'}</section>
  <div class="smart-note">Blocked times can be clinic-wide or staff-specific. They remove those periods from available slots automatically.</div></div>`;
}
async function openSetup(){if(!isAdmin()){toast('Clinic Admin access required');return}const s=await loadSetup();ws()?.showCustom?.('clinic',setupHtml(s),'availability-setup');wireSetup(s)}
function modal(html){const m=document.getElementById('modal'),b=document.getElementById('modalBody');if(!m||!b)return null;b.innerHTML=html;m.classList.add('open');m.setAttribute('aria-hidden','false');return b}
function closeModal(){const m=document.getElementById('modal');if(m){m.classList.remove('open');m.setAttribute('aria-hidden','true')}}
async function wireSetup(s){
  const root=document.querySelector('.availability-setup');if(!root)return;
  root.querySelectorAll('.hours-closed').forEach(ch=>ch.onchange=()=>{const row=ch.closest('.hours-row');row.querySelectorAll('input[type=time]').forEach(x=>x.disabled=ch.checked)});
  root.querySelector('#saveHours').onclick=async()=>{const rows=[...root.querySelectorAll('.hours-row')].map(r=>({clinic_id:isSecure()?clinicId():'demo',weekday:Number(r.dataset.day),closed:r.querySelector('.hours-closed').checked,open_time:r.querySelector('.hours-closed').checked?null:r.querySelector('.hours-open').value,close_time:r.querySelector('.hours-closed').checked?null:r.querySelector('.hours-close').value}));if(isSecure()){const {error}=await api().state.client.from('clinic_hours').upsert(rows,{onConflict:'clinic_id,weekday'});if(error)return toast(error.message)}else{const x=demoState();x.hours=rows.map((r,i)=>({...r,id:x.hours.find(h=>h.weekday===r.weekday)?.id||'dh'+i}));saveDemo(x)}toast('Clinic hours saved');openSetup()};
  root.querySelector('#addBookingStaff').onclick=()=>{const b=modal(`<h2>Add Booking Staff</h2><form id="staffForm" class="form-grid"><div class="field full"><label>Name</label><input name="name" required></div><div class="field full"><label>Role</label><select name="type"><option value="VET">Veterinarian</option><option value="GROOMING">Groomer</option></select></div><div class="field full"><button class="btn btn-primary">ADD STAFF</button></div></form>`);b.querySelector('#staffForm').onsubmit=async e=>{e.preventDefault();const x=Object.fromEntries(new FormData(e.target));if(isSecure()){const {error}=await api().state.client.from('booking_staff').insert({clinic_id:clinicId(),display_name:x.name,booking_type:x.type,created_by:api().state.session.user.id});if(error)return toast(error.message)}else{const d=demoState();d.staff.push({id:uid(),clinic_id:'demo',display_name:x.name,booking_type:x.type,active:true});saveDemo(d)}closeModal();toast('Staff added');openSetup()}};
  root.querySelectorAll('[data-add-shift]').forEach(btn=>btn.onclick=()=>{const st=s.staff.find(x=>x.id===btn.dataset.addShift);const b=modal(`<h2>Add Shift — ${esc(st?.display_name||'Staff')}</h2><form id="shiftForm" class="form-grid"><div class="field"><label>Day</label><select name="weekday">${DAYS.map((x,i)=>`<option value="${i}">${x}</option>`).join('')}</select></div><div class="field"><label>Slot size</label><select name="slot"><option>30</option><option>15</option><option>45</option><option>60</option></select></div><div class="field"><label>Start</label><input type="time" name="start" value="09:00" required></div><div class="field"><label>End</label><input type="time" name="end" value="18:00" required></div><div class="field full"><button class="btn btn-primary">SAVE SHIFT</button></div></form>`);b.querySelector('#shiftForm').onsubmit=async e=>{e.preventDefault();const x=Object.fromEntries(new FormData(e.target)),row={clinic_id:isSecure()?clinicId():'demo',booking_staff_id:btn.dataset.addShift,weekday:Number(x.weekday),start_time:x.start,end_time:x.end,slot_minutes:Number(x.slot),active:true};if(isSecure()){row.created_by=api().state.session.user.id;const {error}=await api().state.client.from('staff_schedules').insert(row);if(error)return toast(error.message)}else{const d=demoState();d.schedules.push({...row,id:uid()});saveDemo(d)}closeModal();toast('Shift saved');openSetup()}});
  root.querySelectorAll('[data-del-shift]').forEach(btn=>btn.onclick=async()=>{if(!confirm('Remove this shift?'))return;if(isSecure()){const {error}=await api().state.client.from('staff_schedules').delete().eq('id',btn.dataset.delShift);if(error)return toast(error.message)}else{const d=demoState();d.schedules=d.schedules.filter(x=>x.id!==btn.dataset.delShift);saveDemo(d)}openSetup()});
  root.querySelector('#addBlock').onclick=()=>{const b=modal(`<h2>Block Time</h2><form id="blockForm" class="form-grid"><div class="field full"><label>Staff</label><select name="staff"><option value="">ALL CLINIC</option>${s.staff.map(x=>`<option value="${esc(x.id)}">${esc(x.display_name)}</option>`).join('')}</select></div><div class="field"><label>Start</label><input type="datetime-local" name="start" required></div><div class="field"><label>End</label><input type="datetime-local" name="end" required></div><div class="field full"><label>Reason</label><input name="reason" placeholder="Lunch, leave, meeting, maintenance..."></div><div class="field full"><button class="btn btn-primary">BLOCK TIME</button></div></form>`);b.querySelector('#blockForm').onsubmit=async e=>{e.preventDefault();const x=Object.fromEntries(new FormData(e.target));if(new Date(x.end)<=new Date(x.start))return toast('End time must be after start time');const row={clinic_id:isSecure()?clinicId():'demo',booking_staff_id:x.staff||null,starts_at:localPHIso(x.start),ends_at:localPHIso(x.end),reason:x.reason||null};if(isSecure()){row.created_by=api().state.session.user.id;const {error}=await api().state.client.from('blocked_times').insert(row);if(error)return toast(error.message)}else{const d=demoState();d.blocks.push({...row,id:uid()});saveDemo(d)}closeModal();toast('Blocked time saved');openSetup()}};
  root.querySelectorAll('[data-del-block]').forEach(btn=>btn.onclick=async()=>{if(!confirm('Remove this blocked time?'))return;if(isSecure()){const {error}=await api().state.client.from('blocked_times').delete().eq('id',btn.dataset.delBlock);if(error)return toast(error.message)}else{const d=demoState();d.blocks=d.blocks.filter(x=>x.id!==btn.dataset.delBlock);saveDemo(d)}openSetup()});
}

function enhanceAppointmentsPanel(){const panel=document.getElementById('clinicPanel');if(!panel||!panel.offsetParent)return;const title=panel.querySelector('h2')?.textContent?.trim();if(title!=='Appointments'||panel.querySelector('[data-availability-tools]'))return;const card=panel.querySelector('.panel-card')||panel;const wrap=document.createElement('div');wrap.dataset.availabilityTools='1';wrap.className='availability-panel-tools';wrap.innerHTML=`<button class="btn btn-primary" data-open-availability>FIND AVAILABLE SLOT</button>${isAdmin()?'<button class="btn btn-outline" data-open-availability-setup>AVAILABILITY SETUP</button>':''}`;card.querySelector('.panel-header')?.after(wrap)||card.prepend(wrap)}
function bind(){document.addEventListener('click',e=>{
  const a=e.target.closest('[data-owner-action="add-visit"]');if(a){e.preventDefault();e.stopImmediatePropagation();openBooking('owner','VET');return}
  const g=e.target.closest('[data-owner-action="add-groom"]');if(g){e.preventDefault();e.stopImmediatePropagation();openBooking('owner','GROOMING');return}
  const smart=e.target.closest('[data-smart-action]');if(smart&&['new-appt','book-vet'].includes(smart.dataset.smartAction)){e.preventDefault();e.stopImmediatePropagation();openBooking('clinic','VET');return}
  if(smart&&['book-groom-clinic','book-groom'].includes(smart.dataset.smartAction)){e.preventDefault();e.stopImmediatePropagation();openBooking(smart.closest('#clinicApp')?'clinic':'owner','GROOMING');return}
  if(e.target.closest('[data-open-availability]')){e.preventDefault();e.stopImmediatePropagation();openBooking('clinic','VET');return}
  if(e.target.closest('[data-open-availability-setup]')){e.preventDefault();e.stopImmediatePropagation();openSetup();return}
},true);
  const mo=new MutationObserver(()=>enhanceAppointmentsPanel());mo.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});setInterval(enhanceAppointmentsPanel,1200);
}

window.PetCareAvailability={open:openBooking,openSetup,getSlots,getStaff};
window.addEventListener('DOMContentLoaded',bind);
})();

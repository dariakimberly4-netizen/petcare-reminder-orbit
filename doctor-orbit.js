(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s);
const STORE='petcare-doctor-orbit-v109';
const modules=[['👥','TODAY’S PATIENTS','Queue · triage','dashboard'],['🩺','CONSULTATION','Vitals · SOAP · diagnosis','consult'],['📌','DOCTOR ORDERS','Lab · treatment · admission','orders'],['🔬','LAB & DIAGNOSTICS','Requests · results','lab'],['💉','PREVENTIVE CARE','Vaccines · due dates','preventive'],['🏥','ADMISSION & ROUNDS','Progress · MAR','rounds'],['📋','PRESCRIPTIONS','Dose · duration · sign','rx'],['🏠','FOLLOW-UP & SIGN-OFF','Recheck · discharge','followup']];
const stages=['WAITING','TRIAGE','WITH DOCTOR','ORDERS','LAB / TREATMENT','PHARMACY','CASHIER','COMPLETED'];
const defaults={
 stage:'WAITING',patient:'Buddy',owner:'Maria Santos',
 alerts:{allergies:'None recorded',conditions:'None recorded',behavior:'Friendly',critical:'No critical alerts'},
 vitals:{temp:'38.6',weight:'12.4',hr:'104',rr:'24',pain:'2',hydration:'Normal',appetite:'Normal',complaint:'Vomiting since last night'},
 orders:[
  {id:1,type:'Laboratory',detail:'CBC + Blood Chemistry',status:'Pending'},
  {id:2,type:'Treatment',detail:'IV fluids as ordered',status:'In Progress'}
 ],
 results:[
  {id:1,test:'CBC',when:'Today 10:18 AM',status:'READY',summary:'Mild leukocytosis',reviewed:false},
  {id:2,test:'Blood Chemistry',when:'Today 10:26 AM',status:'READY',summary:'ALT mildly elevated',reviewed:false}
 ],
 timeline:[
  {when:'Today 09:40 AM',title:'Checked in',detail:'General consultation'},
  {when:'Today 09:52 AM',title:'Triage completed',detail:'Vitals recorded'},
  {when:'Today 10:05 AM',title:'Doctor consultation started',detail:'SOAP note opened'}
 ],
 mar:[
  {time:'10:15 AM',med:'Ondansetron',dose:'2 mg IV',staff:'Nurse Ana',status:'Given'}
 ]
};
function load(){try{return Object.assign({},defaults,JSON.parse(localStorage.getItem(STORE)||'{}'))}catch(e){return {...defaults}}}
let state=load();
function persist(){localStorage.setItem(STORE,JSON.stringify(state))}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function panel(title,body){let p=$('#doctorOrbitPanel');if(!p){p=document.createElement('section');p.id='doctorOrbitPanel';p.className='doctor-card doctor-orbit-panel';$('#doctorOrbitZone')?.after(p)}p.innerHTML='<div class="doc-panel-head"><button data-doc-back>← BACK TO ORBIT</button><h2>'+title+'</h2></div>'+body;p.scrollIntoView({behavior:'smooth',block:'start'})}
const field=(l,n,type='text',v='')=>'<label>'+l+'<input name="'+n+'" type="'+type+'" value="'+esc(v)+'"></label>';
const alerts=()=>'<div class="doc-alert-grid"><div class="doc-alert warning"><strong>ALLERGIES</strong><span>'+esc(state.alerts.allergies)+'</span></div><div class="doc-alert"><strong>CONDITIONS</strong><span>'+esc(state.alerts.conditions)+'</span></div><div class="doc-alert"><strong>BEHAVIOR</strong><span>'+esc(state.alerts.behavior)+'</span></div><div class="doc-alert danger"><strong>CRITICAL</strong><span>'+esc(state.alerts.critical)+'</span></div></div>';
function open(m){
 if(m==='dashboard')return panel("Today's Doctor Dashboard",
  '<div class="doc-kpi-grid"><button data-doc-module="dashboard"><b>3</b><small>WAITING</small></button><button data-doc-module="consult"><b>1</b><small>URGENT</small></button><button data-doc-module="followup"><b>2</b><small>FOLLOW-UPS</small></button><button data-doc-module="results"><b>'+state.results.filter(x=>!x.reviewed).length+'</b><small>PENDING RESULTS</small></button></div>'+
  alerts()+
  '<div class="doc-patient-card"><b>🐶 '+esc(state.patient)+'</b><span>'+esc(state.owner)+' · General Consultation</span><strong>Current: '+esc(state.stage)+'</strong><button data-next-stage>MOVE TO NEXT STAGE</button><button data-doc-module="consult">OPEN CONSULTATION</button></div>'+
  '<div class="doc-quick-tools"><button data-doc-module="timeline">🕘 CASE TIMELINE</button><button data-doc-module="results">📥 PENDING RESULTS</button><button data-doc-module="orders">📌 ACTIVE ORDERS</button></div>');
 if(m==='consult')return panel('Vitals, Intake & Consultation',
  alerts()+
  '<form data-doc-form="consult" class="doc-form">'+
  field('Temperature °C','temp','number',state.vitals.temp)+field('Weight (kg)','weight','number',state.vitals.weight)+field('Heart Rate bpm','hr','number',state.vitals.hr)+field('Respiratory Rate /min','rr','number',state.vitals.rr)+
  '<label>Pain Score<select name="pain">'+[0,1,2,3,4,5,6,7,8,9,10].map(x=>'<option '+(String(x)===String(state.vitals.pain)?'selected':'')+'>'+x+'</option>').join('')+'</select></label>'+
  '<label>Hydration<select name="hydration"><option>Normal</option><option>Mild dehydration</option><option>Moderate dehydration</option><option>Severe dehydration</option></select></label>'+
  '<label>Appetite<select name="appetite"><option>Normal</option><option>Reduced</option><option>Not eating</option></select></label>'+
  field('Chief complaint','complaint','text',state.vitals.complaint)+
  '<label class="doc-span-2">SOAP / Examination<textarea name="soap" placeholder="Subjective · Objective · Assessment · Plan"></textarea></label>'+
  field('Diagnosis','diagnosis')+
  '<label>Treatment Plan<textarea name="plan"></textarea></label><button>SAVE VITALS & CONSULTATION</button></form>');
 if(m==='orders')return panel('Doctor Orders',
  '<div class="doc-list">'+state.orders.map(o=>'<div class="doc-list-row"><div><b>'+esc(o.type)+'</b><span>'+esc(o.detail)+'</span></div><button data-order-toggle="'+o.id+'">'+esc(o.status)+'</button></div>').join('')+'</div>'+
  '<form data-doc-form="orders" class="doc-form"><label>Order Type<select name="type"><option>Laboratory</option><option>Imaging</option><option>Treatment</option><option>Admission</option><option>Nursing Care</option></select></label>'+field('Order / Instructions','order')+'<button>SEND ORDER</button></form>');
 if(m==='lab'||m==='results')return panel(m==='results'?'Pending Results Inbox':'Lab & Diagnostics',
  '<div class="doc-list">'+state.results.map(r=>'<div class="doc-list-row '+(r.reviewed?'is-done':'')+'"><div><b>'+esc(r.test)+'</b><span>'+esc(r.when)+' · '+esc(r.summary)+'</span></div><button data-result-review="'+r.id+'" '+(r.reviewed?'disabled':'')+'>'+(r.reviewed?'REVIEWED ✓':'REVIEW RESULT')+'</button></div>').join('')+'</div>'+
  '<form data-doc-form="lab" class="doc-form">'+field('New Test / Imaging Request','test')+field('Clinical indication','indication')+'<button>REQUEST DIAGNOSTIC</button></form>');
 if(m==='preventive')return panel('Preventive Care',
  '<form data-doc-form="preventive" class="doc-form">'+field('Vaccine / Preventive Treatment','vaccine')+field('Date Given','given','date')+field('Next Due','due','date')+
  '<label>Status<select name="status"><option>Completed</option><option>Due Soon</option><option>Overdue</option></select></label><button>SAVE & SCHEDULE REMINDER</button></form>');
 if(m==='rounds')return panel('Admission, Rounds & Medication Administration',
  '<div class="doc-section-title">Medication Administration Record</div><div class="doc-list">'+state.mar.map((x,i)=>'<div class="doc-list-row"><div><b>'+esc(x.med)+' · '+esc(x.dose)+'</b><span>'+esc(x.time)+' · '+esc(x.staff)+'</span></div><span class="doc-status">'+esc(x.status)+'</span></div>').join('')+'</div>'+
  '<form data-doc-form="mar" class="doc-form">'+field('Medication','med')+field('Dose','dose')+field('Time','time','time')+field('Administered by','staff')+'<button>ADD MAR ENTRY</button></form>'+
  '<form data-doc-form="rounds" class="doc-form doc-form-separated">'+field('Admission reason','reason')+field('Current vitals','vitals')+'<label>Progress Notes<textarea name="notes"></textarea></label>'+field('Treatment Orders','treatment')+'<button>SAVE ROUND NOTE</button></form>');
 if(m==='rx')return panel('Prescription Builder',
  '<form data-doc-form="rx" class="doc-form">'+field('Medicine','medicine')+field('Dose','dose')+field('Frequency','frequency')+field('Duration','duration')+field('Instructions','instructions')+
  '<label>Doctor Approval<select name="approval"><option>Signed / Approved</option><option>Draft</option></select></label><button>SAVE & SIGN PRESCRIPTION</button></form>');
 if(m==='followup')return panel('Follow-Up, Discharge & Doctor Sign-Off',
  '<form data-doc-form="followup" class="doc-form">'+field('Follow-up Date','date','date')+field('Discharge diagnosis','diagnosis')+
  '<label>Home Medications<textarea name="meds"></textarea></label><label>Home Care / Feeding<textarea name="care"></textarea></label>'+
  '<label>Warning Signs<textarea name="warnings" placeholder="When owner should return or seek emergency care"></textarea></label>'+
  '<label>Activity / Wound Care<textarea name="activity"></textarea></label>'+
  '<label class="doctor-check doc-span-2"><input type="checkbox" name="sign"> Doctor sign-off: I reviewed diagnosis, treatment, medications, discharge instructions and follow-up plan.</label>'+
  '<button>COMPLETE VISIT & SEND REMINDER</button></form><div class="doc-audit">Audit trail records doctor, date/time, result reviews, orders, medication administration and future amendments.</div>');
 if(m==='timeline')return panel('Case History & Timeline',
  '<div class="doc-timeline">'+state.timeline.slice().reverse().map(x=>'<div class="doc-timeline-item"><time>'+esc(x.when)+'</time><div><b>'+esc(x.title)+'</b><span>'+esc(x.detail)+'</span></div></div>').join('')+'</div>'+
  '<form data-doc-form="timeline" class="doc-form">'+field('Timeline event','title')+field('Details','detail')+'<button>ADD TO TIMELINE</button></form>');
}
function build(){const dash=$('#doctorWorkspace .doctor-dashboard');if(!dash||$('#doctorOrbitZone'))return;const zone=document.createElement('section');zone.id='doctorOrbitZone';zone.className='doctor-card doctor-orbit-zone';zone.innerHTML='<h2 class="doctor-orbit-title">Doctor Clinical Orbit</h2><div class="doctor-orbit-wrap"><div class="doctor-orbit-ring"></div><button class="doctor-orbit-center" data-doc-module="dashboard"><strong>DOCTOR CLINICAL<br>COMMAND CENTER</strong><small>Tap for today’s flow</small></button>'+modules.map((m,i)=>'<button class="doctor-orbit-node" data-i="'+i+'" data-doc-module="'+m[3]+'"><span>'+m[0]+'</span>'+m[1]+'<small>'+m[2]+'</small></button>').join('')+'</div><div class="doctor-orbit-flow">'+stages.map(x=>'<span>'+x+'</span>').join('<span>→</span>')+'</div>';const first=dash.querySelector('.doctor-kpis');if(first)first.after(zone);else dash.prepend(zone)}
function stamp(title,detail){const now=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});state.timeline.push({when:'Today '+now,title,detail});persist()}
document.addEventListener('click',e=>{
 const m=e.target.closest('[data-doc-module]');if(m){e.preventDefault();open(m.dataset.docModule);return}
 if(e.target.closest('[data-doc-back]')){$('#doctorOrbitPanel')?.remove();$('#doctorOrbitZone')?.scrollIntoView({behavior:'smooth'});return}
 if(e.target.closest('[data-next-stage]')){let i=stages.indexOf(state.stage);state.stage=stages[Math.min(i+1,stages.length-1)];stamp('Stage changed','Patient moved to '+state.stage);open('dashboard');return}
 const rr=e.target.closest('[data-result-review]');if(rr){const r=state.results.find(x=>String(x.id)===rr.dataset.resultReview);if(r){r.reviewed=true;stamp('Diagnostic result reviewed',r.test+' · '+r.summary);persist();open('results')}return}
 const ot=e.target.closest('[data-order-toggle]');if(ot){const o=state.orders.find(x=>String(x.id)===ot.dataset.orderToggle);if(o){o.status=o.status==='Pending'?'In Progress':o.status==='In Progress'?'Completed':'Pending';stamp('Order updated',o.type+' · '+o.status);persist();open('orders')}return}
},true);
document.addEventListener('submit',e=>{
 const f=e.target.closest('[data-doc-form]');if(!f)return;e.preventDefault();const d=Object.fromEntries(new FormData(f));const type=f.dataset.docForm;
 if(type==='consult'){state.vitals={...state.vitals,...d};stamp('Vitals & consultation saved',(d.diagnosis||'Clinical note')+' · '+(d.complaint||state.vitals.complaint))}
 else if(type==='orders'){state.orders.push({id:Date.now(),type:d.type,detail:d.order,status:'Pending'});stamp('Doctor order created',d.type+' · '+d.order)}
 else if(type==='lab'){state.results.push({id:Date.now(),test:d.test||'Diagnostic request',when:'Requested today',status:'REQUESTED',summary:d.indication||'Awaiting result',reviewed:false});stamp('Diagnostic requested',d.test||'New request')}
 else if(type==='mar'){state.mar.push({time:d.time||'Now',med:d.med||'Medication',dose:d.dose||'—',staff:d.staff||'Clinic staff',status:'Given'});stamp('Medication administered',(d.med||'Medication')+' '+(d.dose||''))}
 else if(type==='timeline'){stamp(d.title||'Clinical update',d.detail||'')}
 else {localStorage.setItem('petcare-doctor-'+type,JSON.stringify(d));stamp(type==='followup'?'Visit completed':'Clinical record saved',type)}
 persist();
 const b=f.querySelector('button');if(b){const original=b.textContent;b.textContent='SAVED ✓';setTimeout(()=>{b.textContent=original;if(type==='orders')open('orders');if(type==='lab')open('lab');if(type==='mar')open('rounds');if(type==='timeline')open('timeline')},700)}
},true);
function init(){build()}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,500));else setTimeout(init,500);new MutationObserver(()=>build()).observe(document.body,{childList:true,subtree:true});
})();
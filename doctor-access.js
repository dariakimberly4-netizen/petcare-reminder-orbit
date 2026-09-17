(()=>{
'use strict';
const LOGIN={email:'doctor@petfamily.demo',password:'doctor123'};
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
function injectButton(){
 const welcome=$('#welcome .welcome-actions');
 if(welcome&&!welcome.querySelector('[data-enter-doctor]')){
  const b=document.createElement('button');b.className='btn btn-secondary btn-xl';b.dataset.enterDoctor='1';b.textContent='DOCTOR LOGIN';welcome.appendChild(b);
 }
 const top=$('#clinicApp .top-actions');
 if(top&&!top.querySelector('[data-enter-doctor]')){
  const b=document.createElement('button');b.className='btn btn-secondary';b.dataset.enterDoctor='1';b.textContent='DOCTOR PORTAL';top.prepend(b);
 }
}
function mount(){
 if($('#doctorLoginScreen'))return;
 document.body.insertAdjacentHTML('beforeend',`
 <section id="doctorLoginScreen" class="doctor-hidden" aria-label="Doctor login">
  <div class="doctor-shell"><div class="doctor-login-card">
   <div class="doctor-brand"><img src="Pet-Family-Animal-Clinic-and-Grooming-Center.png" alt="Clinic logo"><div><span class="doctor-role-badge">DOCTOR ACCESS ONLY</span><h1>Pet Family Doctor Portal</h1><p>Separate secure workspace for veterinarians.</p></div></div>
   <label class="doctor-field"><span>Doctor Email</span><input id="doctorEmail" type="email" autocomplete="username" placeholder="doctor@petfamily.demo"></label>
   <label class="doctor-field"><span>Password</span><input id="doctorPassword" type="password" autocomplete="current-password" placeholder="Enter password"></label>
   <div class="doctor-actions"><button class="doctor-btn primary" data-doctor-login>LOGIN AS DOCTOR</button><button class="doctor-btn secondary" data-doctor-fill>ONE-TAP DEMO LOGIN</button><button class="doctor-btn secondary" data-doctor-back>BACK</button></div>
   <div class="doctor-demo-box"><strong>Demo doctor access</strong><br>Email: doctor@petfamily.demo<br>Password: doctor123</div>
  </div></div>
 </section>
 <section id="doctorWorkspace" class="doctor-hidden" aria-label="Doctor workspace">
  <header class="doctor-topbar"><div><strong>🩺 Doctor Workspace</strong><small id="doctorIdentity">Veterinarian · Pet Family Animal Clinic</small></div><div class="doctor-top-actions"><button class="doctor-btn secondary" data-doctor-clinic>CLINIC PORTAL</button><button class="doctor-btn danger" data-doctor-logout>LOG OUT</button></div></header>
  <main class="doctor-dashboard">
   <div class="doctor-kpis"><div class="doctor-kpi"><strong id="docPatients">3</strong><small>Patients today</small></div><div class="doctor-kpi"><strong>2</strong><small>Lab results</small></div><div class="doctor-kpi"><strong>1</strong><small>For admission</small></div><div class="doctor-kpi"><strong>2</strong><small>Follow-ups</small></div></div>
   <div class="doctor-layout"><section class="doctor-card"><h2>Today's Patients</h2><div id="doctorPatientList"></div></section><section class="doctor-card"><h3>Doctor Modules</h3><div class="doctor-workflow"><button class="doctor-module" data-doc-module="consult"><span>🩺</span>Consultation</button><button class="doctor-module" data-doc-module="pet"><span>🐾</span>One-Pet Workspace</button><button class="doctor-module" data-doc-module="lab"><span>🔬</span>Laboratory</button><button class="doctor-module" data-doc-module="treatment"><span>💉</span>Treatment Board</button><button class="doctor-module" data-doc-module="admission"><span>🏥</span>Admission</button><button class="doctor-module" data-doc-module="rx"><span>📋</span>Prescriptions</button><button class="doctor-module" data-doc-module="records"><span>📚</span>Medical Records</button><button class="doctor-module" data-doc-module="followup"><span>🔔</span>Follow-Up</button></div><div class="doctor-lock">Medical modules are separated from receptionist/cashier workflows in this demo.</div></section></div>
   <section id="doctorDetail" class="doctor-card doctor-detail"></section>
  </main>
 </section>`);
 renderPatients();renderModule('consult');
}
function data(){return window.petcareGetData?.()||{pets:[],appointments:[],vaccinations:[],medications:[]}}
function patients(){const d=data();return (d.pets||[]).slice(0,5)}
function renderPatients(){const d=data(),pets=patients();const box=$('#doctorPatientList');if(!box)return;$('#docPatients').textContent=pets.length||0;box.innerHTML=pets.length?pets.map((p,i)=>{const a=(d.appointments||[]).find(x=>x.petId===p.id);return `<div class="doctor-patient"><div><strong>${esc(p.emoji||'🐾')} ${esc(p.name)}</strong><small>${esc(p.breed||p.species||'Pet')} · ${esc(a?.type||'Consultation')} · ${esc(a?.time||['09:00','10:30','14:00'][i%3])}</small></div><button class="doctor-btn secondary" data-open-patient="${esc(p.id)}">OPEN</button></div>`}).join(''):'<p>No patients loaded.</p>'}
function renderModule(m,petId){const d=data(),p=(d.pets||[]).find(x=>x.id===petId)||(d.pets||[])[0]||{name:'Patient',species:'Pet',breed:'—',weight:'—',allergies:'—',conditions:'—'};const box=$('#doctorDetail');if(!box)return;
 const head=`<h2>${esc(p.emoji||'🐾')} ${esc(p.name)} <small style="font-size:.55em;color:#68788e">${esc(p.species||'Pet')} · ${esc(p.breed||'—')} · ${esc(p.weight||'—')}</small></h2>`;
 const forms={
 consult:`${head}<h3>Consultation / SOAP Notes</h3><div class="doctor-form-grid"><textarea placeholder="S — Subjective / owner concerns"></textarea><textarea placeholder="O — Objective findings / vitals / examination"></textarea><textarea placeholder="A — Assessment / diagnosis"></textarea><textarea placeholder="P — Plan / treatment / follow-up"></textarea><button class="doctor-btn primary" data-demo-save>Save Doctor Note</button></div>`,
 pet:`${head}<div class="doctor-note"><strong>Allergies:</strong> ${esc(p.allergies||'None recorded')}</div><div class="doctor-note"><strong>Conditions:</strong> ${esc(p.conditions||'None recorded')}</div><h3>Medical Timeline</h3><p>Vaccines, visits, medications, laboratory results, procedures and admissions appear in one chronological workspace.</p>`,
 lab:`${head}<h3>Laboratory Orders & Results</h3><div class="doctor-form-grid"><select><option>CBC</option><option>Blood Chemistry</option><option>Urinalysis</option><option>Fecalysis</option></select><input placeholder="Clinical indication"><textarea placeholder="Result / interpretation"></textarea><button class="doctor-btn primary" data-demo-save>Save Lab Order / Result</button></div>`,
 treatment:`${head}<h3>Treatment / Procedure Board</h3><div class="doctor-form-grid"><select><option>Injection</option><option>IV Fluids</option><option>Wound Care</option><option>Nebulization</option><option>Minor Procedure</option></select><input placeholder="Medication / procedure"><input placeholder="Dose / amount"><input placeholder="Schedule / frequency"><textarea placeholder="Procedure notes"></textarea><button class="doctor-btn primary" data-demo-save>Add Treatment</button></div>`,
 admission:`${head}<h3>Admission & Confinement</h3><div class="doctor-form-grid"><input placeholder="Cage / room"><select><option>Stable</option><option>For monitoring</option><option>Critical</option></select><input placeholder="Feeding plan"><input placeholder="Medication schedule"><textarea placeholder="Doctor / nursing instructions"></textarea><button class="doctor-btn primary" data-demo-save>Admit Patient</button></div>`,
 rx:`${head}<h3>Prescription</h3><div class="doctor-form-grid"><input placeholder="Medicine"><input placeholder="Dose"><input placeholder="Frequency"><input placeholder="Duration"><textarea placeholder="Special instructions"></textarea><button class="doctor-btn primary" data-demo-save>Create Prescription</button></div>`,
 records:`${head}<h3>Medical Records</h3><p>Doctor-only view of diagnoses, consultation notes, laboratory results, procedures, prescriptions, admissions and discharge summaries.</p>`,
 followup:`${head}<h3>Follow-Up Plan</h3><div class="doctor-form-grid"><input type="date"><select><option>Recheck</option><option>Repeat laboratory</option><option>Wound check</option><option>Medication review</option><option>Vaccine booster</option></select><textarea placeholder="Follow-up instructions"></textarea><button class="doctor-btn primary" data-demo-save>Schedule Follow-Up</button></div>`};
 box.innerHTML=forms[m]||forms.consult;
}
function showLogin(){mount();document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));$('#doctorWorkspace').classList.add('doctor-hidden');$('#doctorLoginScreen').classList.remove('doctor-hidden');window.scrollTo(0,0)}
function login(){const e=$('#doctorEmail')?.value.trim(),p=$('#doctorPassword')?.value;if(e===LOGIN.email&&p===LOGIN.password){sessionStorage.setItem('petcareDoctorDemo','1');$('#doctorLoginScreen').classList.add('doctor-hidden');$('#doctorWorkspace').classList.remove('doctor-hidden');renderPatients();renderModule('consult');}else{alert('Doctor login not recognized. Use the one-tap demo login.')}}
function leave(){sessionStorage.removeItem('petcareDoctorDemo');$('#doctorWorkspace')?.classList.add('doctor-hidden');$('#doctorLoginScreen')?.classList.add('doctor-hidden');if(typeof window.enter==='function')window.enter('clinic');else location.reload()}
document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;if(t.matches('[data-enter-doctor]'))showLogin();if(t.matches('[data-doctor-fill]')){$('#doctorEmail').value=LOGIN.email;$('#doctorPassword').value=LOGIN.password}if(t.matches('[data-doctor-login]'))login();if(t.matches('[data-doctor-back]')){ $('#doctorLoginScreen').classList.add('doctor-hidden');if(typeof window.enter==='function')window.enter('clinic') }if(t.matches('[data-doctor-logout]'))leave();if(t.matches('[data-doctor-clinic]'))leave();if(t.dataset.docModule)renderModule(t.dataset.docModule);if(t.dataset.openPatient)renderModule('pet',t.dataset.openPatient);if(t.matches('[data-demo-save]')){t.textContent='SAVED ✓';setTimeout(()=>t.textContent='SAVE',1200)}});
function init(){mount();injectButton();if(sessionStorage.getItem('petcareDoctorDemo')==='1'){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));$('#doctorWorkspace').classList.remove('doctor-hidden')}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
setTimeout(init,700);
})();
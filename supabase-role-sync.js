(()=>{
'use strict';
const api=window.PetCareSupabase;if(!api)return;
const toast=msg=>{const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)};
const status=d=>{if(!d)return'UPCOMING';const n=Math.ceil((new Date(d+'T00:00:00')-new Date())/86400000);return n<0?'OVERDUE':n<=30?'DUE SOON':'UPCOMING'};
let timer;
Promise.resolve(api.ready).then(()=>{
 if(!api.active)return;
 api.syncLegacy=data=>{clearTimeout(timer);timer=setTimeout(()=>sync(data).catch(e=>{console.error('Role sync',e);toast('Cloud sync needs attention')}),320)};
});
async function sync(data){
 const s=api.state,c=s.client,uid=s.session.user.id,role=s.staffRole||'PET OWNER',clinic=s.clinic?.id||null;
 const allPets=(data.pets||[]).filter(p=>!p.placeholder&&p.id!=='00000000-0000-4000-8000-000000000001');
 const owned=new Set(allPets.filter(p=>(p.ownerId||s.petOwners.get(p.id)||uid)===uid).map(p=>p.id));
 const visible=new Set(allPets.map(p=>p.id));
 const allowedPet=pid=>s.staff?visible.has(pid):owned.has(pid);
 const jobs=[];
 s.lastWriteAt=Date.now();
 const canPets=!s.staff||['CLINIC ADMIN','VETERINARIAN','RECEPTIONIST'].includes(role);
 if(canPets){const rows=allPets.filter(p=>s.staff||owned.has(p.id)).map(p=>({id:p.id,owner_id:p.ownerId||s.petOwners.get(p.id)||uid,clinic_id:p.clinicId||clinic,name:p.name,species:p.species||'Dog',breed:p.breed||null,sex:p.sex||null,birthday:p.birthday||null,weight:p.weight||null,microchip_number:p.microchip||null,allergies:p.allergies||null,medical_conditions:p.conditions||null,primary_veterinarian:p.vet||null,photo_url:p.photoUrl||null}));if(rows.length)jobs.push(c.from('pets').upsert(rows,{onConflict:'id'}))}
 if(!s.staff||['CLINIC ADMIN','VETERINARIAN'].includes(role)){const rows=(data.vaccinations||[]).filter(v=>allowedPet(v.petId)).map(v=>({id:v.id,pet_id:v.petId,clinic_id:v.clinicId||clinic,vaccine_name:v.name,date_administered:v.given||null,next_due_date:v.due||null,veterinarian:v.vet||null,batch_lot_number:v.lot||null,notes:v.notes||null,certificate_url:v.certificatePath||null}));if(rows.length)jobs.push(c.from('vaccinations').upsert(rows,{onConflict:'id'}))}
 if(!s.staff||['CLINIC ADMIN','RECEPTIONIST'].includes(role)){const rows=(data.reminders||[]).filter(r=>allowedPet(r.petId)).map(r=>({id:r.id,pet_id:r.petId,clinic_id:r.clinicId||clinic,reminder_type:r.type,title:r.title,due_date:r.date,status:r.done?'COMPLETED':status(r.date),completed_at:r.done?new Date().toISOString():null}));if(rows.length)jobs.push(c.from('reminders').upsert(rows,{onConflict:'id'}))}
 if(!s.staff||['CLINIC ADMIN','VETERINARIAN'].includes(role)){const rows=(data.medications||[]).filter(m=>allowedPet(m.petId)).map(m=>({id:m.id,pet_id:m.petId,clinic_id:m.clinicId||clinic,medication_name:m.name,dose:m.dose||null,frequency:m.frequency||null,start_date:m.start||null,end_date:m.end||null,prescribing_vet:m.vet||null,status:m.status||'ACTIVE'}));if(rows.length)jobs.push(c.from('medications').upsert(rows,{onConflict:'id'}))}
 if(!s.staff||['CLINIC ADMIN','RECEPTIONIST','GROOMER'].includes(role)){const rows=(data.grooming||[]).filter(g=>allowedPet(g.petId)).map(g=>({id:g.id,pet_id:g.petId,owner_id:uid,clinic_id:g.clinicId||clinic,service:g.service,appointment_date:g.next||null,appointment_time:g.time||null,groomer:g.groomer||null,price:g.price||null,status:g.status||'BOOKED'}));if(rows.length)jobs.push(c.from('grooming_records').upsert(rows,{onConflict:'id'}))}
 if(!s.staff||['CLINIC ADMIN','VETERINARIAN','RECEPTIONIST'].includes(role)){const rows=(data.appointments||[]).filter(a=>allowedPet(a.petId)).map(a=>({id:a.id,pet_id:a.petId,owner_id:uid,clinic_id:a.clinicId||clinic,veterinarian:a.vet||null,appointment_type:a.type,appointment_date:a.date,appointment_time:a.time||null,reason:a.reason||null,notes:a.notes||null,status:a.status||'REQUESTED'}));if(rows.length)jobs.push(c.from('appointments').upsert(rows,{onConflict:'id'}))}
 const out=await Promise.all(jobs);const err=out.find(x=>x.error)?.error;if(err)throw err;toast('Saved securely');
}
})();
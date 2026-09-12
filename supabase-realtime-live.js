(()=>{
'use strict';
const api=window.PetCareSupabase;if(!api)return;
const emoji=s=>s==='Cat'?'🐱':s==='Dog'?'🐶':'🐾';
const upsert=(arr,item)=>{const i=arr.findIndex(x=>x.id===item.id);if(i>=0)arr[i]=Object.assign(arr[i],item);else arr.push(item)};
const remove=(arr,id)=>{const i=arr.findIndex(x=>x.id===id);if(i>=0)arr.splice(i,1)};
Promise.resolve(api.ready).then(async()=>{
 if(!api.active)return;
 const c=api.state.client;if(api.state.realtime){try{await c.removeChannel(api.state.realtime)}catch{}api.state.realtime=null}
 const ch=c.channel('petcare-live-ui');api.state.realtime=ch;
 const tables=['pets','vaccinations','reminders','medications','grooming_records','appointments','documents','notifications'];
 tables.forEach(table=>ch.on('postgres_changes',{event:'*',schema:'public',table},payload=>apply(table,payload)));
 ch.subscribe();
});
function apply(table,payload){const d=window.petcareGetData?.();if(!d)return;const row=payload.new&&Object.keys(payload.new).length?payload.new:payload.old,id=row?.id;if(!id)return;const del=payload.eventType==='DELETE';
 if(table==='pets'){
   if(del)remove(d.pets,id);else upsert(d.pets,{id:row.id,name:row.name,species:row.species||'Dog',breed:row.breed||'',sex:row.sex||'',birthday:row.birthday||'',weight:row.weight||'',microchip:row.microchip_number||'',allergies:row.allergies||'',conditions:row.medical_conditions||'',vet:row.primary_veterinarian||'',emoji:emoji(row.species),photoUrl:row.photo_url||'',clinicId:row.clinic_id,ownerId:row.owner_id,vaccineCardToken:row.vaccine_card_token,color:row.color||'',specialNotes:row.special_notes||''});
 }
 if(table==='vaccinations'){if(del)remove(d.vaccinations,id);else upsert(d.vaccinations,{id:row.id,petId:row.pet_id,name:row.vaccine_name,given:row.date_administered||'',due:row.next_due_date||'',vet:row.veterinarian||'',lot:row.batch_lot_number||'',notes:row.notes||'',certificatePath:row.certificate_url||'',clinicId:row.clinic_id})}
 if(table==='reminders'){if(del)remove(d.reminders,id);else upsert(d.reminders,{id:row.id,petId:row.pet_id,type:row.reminder_type,title:row.title,date:row.due_date,done:row.status==='COMPLETED',clinicId:row.clinic_id})}
 if(table==='medications'){if(del)remove(d.medications,id);else upsert(d.medications,{id:row.id,petId:row.pet_id,name:row.medication_name,dose:row.dose||'',frequency:row.frequency||'',start:row.start_date||'',end:row.end_date||'',vet:row.prescribing_vet||'',refill:row.refill_date||'',instructions:row.instructions||'',notes:row.notes||'',status:row.status,clinicId:row.clinic_id})}
 if(table==='grooming_records'){if(del)remove(d.grooming,id);else upsert(d.grooming,{id:row.id,petId:row.pet_id,service:row.service,next:row.appointment_date||'',time:(row.appointment_time||'').slice(0,5),groomer:row.groomer||'',price:Number(row.price||0),status:row.status,instructions:row.special_instructions||'',clinicId:row.clinic_id})}
 if(table==='appointments'){if(del)remove(d.appointments,id);else upsert(d.appointments,{id:row.id,petId:row.pet_id,vet:row.veterinarian||'',type:row.appointment_type,date:row.appointment_date,time:(row.appointment_time||'').slice(0,5),status:row.status,reason:row.reason||'',notes:row.notes||'',clinicId:row.clinic_id})}
 if(table==='documents'){if(del)remove(d.documents,id);else upsert(d.documents,{id:row.id,petId:row.pet_id,name:row.document_name,type:row.document_type,date:row.document_date||'',storageBucket:row.storage_bucket,storagePath:row.storage_path,clinicId:row.clinic_id})}
 if(table==='notifications'){const text=(row.title||'Notification')+(row.body?' — '+row.body:'');if(del){const i=d.notifications.indexOf(text);if(i>=0)d.notifications.splice(i,1)}else if(!d.notifications.includes(text))d.notifications.unshift(text)}
 localStorage.setItem('petcare-reminder-orbit-secure',JSON.stringify(d));window.petcareRefreshActive?.();
}
})();
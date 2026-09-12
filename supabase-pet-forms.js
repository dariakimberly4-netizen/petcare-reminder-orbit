(()=>{
'use strict';
const api=window.PetCareSupabase;if(!api)return;
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const toast=msg=>{const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1900)};
const modal=html=>{document.getElementById('modalBody').innerHTML=html;document.getElementById('modal').classList.add('open')};
const close=()=>document.getElementById('modal')?.classList.remove('open');
const data=()=>window.petcareGetData?.();
const placeholderId='00000000-0000-4000-8000-000000000001';
function ownerCanEdit(p){const s=api.state;if(s.staff)return['CLINIC ADMIN','VETERINARIAN','RECEPTIONIST'].includes(s.staffRole);return (p.ownerId||s.petOwners.get(p.id)||s.session.user.id)===s.session.user.id}
function formHtml(p={}){return `<h2>${p.id?'Edit Pet':'Add Pet'}</h2><form id="securePetForm" class="form-grid">
<div class="field"><label>Name</label><input name="name" value="${esc(p.name||'')}" required></div>
<div class="field"><label>Species</label><select name="species"><option ${p.species==='Dog'?'selected':''}>Dog</option><option ${p.species==='Cat'?'selected':''}>Cat</option><option ${p.species==='Other'?'selected':''}>Other</option></select></div>
<div class="field"><label>Breed</label><input name="breed" value="${esc(p.breed||'')}"></div>
<div class="field"><label>Sex</label><input name="sex" value="${esc(p.sex||'')}"></div>
<div class="field"><label>Birthday</label><input name="birthday" type="date" value="${esc(p.birthday||'')}"></div>
<div class="field"><label>Weight</label><input name="weight" value="${esc(p.weight||'')}"></div>
<div class="field"><label>Color</label><input name="color" value="${esc(p.color||'')}"></div>
<div class="field"><label>Microchip</label><input name="microchip" value="${esc(p.microchip_number||p.microchip||'')}"></div>
<div class="field full"><label>Allergies</label><textarea name="allergies">${esc(p.allergies||'')}</textarea></div>
<div class="field full"><label>Medical conditions</label><textarea name="conditions">${esc(p.medical_conditions||p.conditions||'')}</textarea></div>
<div class="field full"><label>Special notes</label><textarea name="notes">${esc(p.special_notes||'')}</textarea></div>
<div class="field full"><label>Primary veterinarian</label><input name="vet" value="${esc(p.primary_veterinarian||p.vet||'')}"></div>
<div class="field full"><button class="btn btn-primary" type="submit">SAVE PET</button></div></form>`}
async function openPetForm(id){
 let existing=null;
 if(id){const {data:row,error}=await api.state.client.from('pets').select('*').eq('id',id).maybeSingle();if(error)return toast(error.message);existing=row||null;if(!existing)return toast('Pet record unavailable')}
 if(existing&&!ownerCanEdit({id:existing.id,ownerId:existing.owner_id}))return toast('View-only access');
 modal(formHtml(existing||{}));
 document.getElementById('securePetForm').onsubmit=async e=>{e.preventDefault();const x=Object.fromEntries(new FormData(e.target));const row={owner_id:existing?.owner_id||api.state.session.user.id,clinic_id:existing?.clinic_id||api.state.clinic?.id||null,name:x.name,species:x.species,breed:x.breed||null,sex:x.sex||null,birthday:x.birthday||null,weight:x.weight||null,color:x.color||null,microchip_number:x.microchip||null,allergies:x.allergies||null,medical_conditions:x.conditions||null,special_notes:x.notes||null,primary_veterinarian:x.vet||null};
 let saved,err;if(existing){const r=await api.state.client.from('pets').update(row).eq('id',existing.id).select().single();saved=r.data;err=r.error}else{const r=await api.state.client.from('pets').insert(row).select().single();saved=r.data;err=r.error}if(err)return toast(err.message);
 const d=data();if(d){d.pets=d.pets.filter(p=>p.id!==placeholderId&&p.id!==saved.id);d.pets.push({id:saved.id,name:saved.name,species:saved.species,breed:saved.breed||'',sex:saved.sex||'',birthday:saved.birthday||'',weight:saved.weight||'',microchip:saved.microchip_number||'',allergies:saved.allergies||'',conditions:saved.medical_conditions||'',vet:saved.primary_veterinarian||'',emoji:saved.species==='Cat'?'🐱':saved.species==='Dog'?'🐶':'🐾',clinicId:saved.clinic_id,ownerId:saved.owner_id,vaccineCardToken:saved.vaccine_card_token,color:saved.color||'',specialNotes:saved.special_notes||''})}
 close();window.petcareSelectPet?.(saved.id);toast(existing?'Pet updated':'Pet added securely')}
}
async function deletePet(id){const d=data(),p=d?.pets?.find(x=>x.id===id);if(!p||!ownerCanEdit(p))return toast('You cannot delete this pet');if(!confirm(`Delete ${p.name} and all linked records?`))return;const {error}=await api.state.client.from('pets').delete().eq('id',id);if(error)return toast(error.message);d.pets=d.pets.filter(x=>x.id!==id);const next=d.pets[0];if(next)window.petcareSelectPet?.(next.id);else location.reload();toast('Pet deleted')}
function enhance(){if(!api.active)return;const panel=document.getElementById('ownerPanel');if(!panel||panel.querySelector('h2')?.textContent?.trim()!=='My Pets')return;const d=data();const pets=d?.pets||[];const rows=[...panel.querySelectorAll('.list-item')];rows.forEach((row,i)=>{const p=pets[i];if(!p||p.id===placeholderId)return;const actions=row.querySelector('.actions')||row;const edit=row.querySelector(`[data-edit-pet="${p.id}"]`);if(edit&&!ownerCanEdit(p)){edit.disabled=true;edit.textContent='VIEW ONLY'}if(ownerCanEdit(p)&&!row.querySelector('[data-secure-delete-pet]')){const b=document.createElement('button');b.className='btn btn-danger';b.dataset.secureDeletePet=p.id;b.textContent='DELETE';b.onclick=()=>deletePet(p.id);actions.appendChild(b)}})}
document.addEventListener('click',e=>{if(!api.active)return;const add=e.target.closest('[data-owner-action="add-pet"]');if(add){e.preventDefault();e.stopImmediatePropagation();openPetForm();return}const edit=e.target.closest('[data-edit-pet]');if(edit){e.preventDefault();e.stopImmediatePropagation();openPetForm(edit.dataset.editPet)}},true);
const obs=new MutationObserver(enhance);window.addEventListener('DOMContentLoaded',()=>{const p=document.getElementById('ownerPanel');if(p)obs.observe(p,{childList:true,subtree:true});enhance()});
})();
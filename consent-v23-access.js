(()=>{
'use strict';
function inject(){
 const C=window.PetCareConsentV23;if(!C)return;
 const clinic=document.querySelector('.smart-clinic-hub .smart-actions');
 if(clinic&&!clinic.querySelector('[data-c23-clinic]')){const b=document.createElement('button');b.className='smart-action';b.dataset.c23Clinic='1';b.textContent='OPEN DIGITAL FORMS';clinic.appendChild(b)}
 const owner=document.querySelector('.smart-owner-hub .smart-actions');
 if(owner&&!owner.querySelector('[data-c23-owner]')){const b=document.createElement('button');b.className='smart-action';b.dataset.c23Owner='1';b.textContent='MY FORMS & CONSENTS';owner.appendChild(b)}
 const cp=document.getElementById('clinicPanel');
 if(cp&&!cp.querySelector('[data-c23-context]')&&/APPOINT|QUEUE|VISIT|GROOM|PET|BILL/i.test(cp.textContent)){const w=document.createElement('div');w.dataset.c23Context='1';w.className='consent-toolbar';w.style.margin='12px 0';w.innerHTML='<button class="consent-btn outline" data-c23-clinic>REQUEST / OPEN CONSENT</button>';cp.prepend(w)}
 const op=document.getElementById('ownerPanel');
 if(op&&!op.querySelector('[data-c23-owner-context]')&&/MY PETS|PET PROFILE|MORE/i.test(op.textContent)){const w=document.createElement('div');w.dataset.c23OwnerContext='1';w.className='consent-toolbar';w.style.margin='12px 0';w.innerHTML='<button class="consent-btn outline" data-c23-owner>MY FORMS & CONSENTS</button>';op.prepend(w)}
}
document.addEventListener('click',e=>{const c=e.target.closest('[data-c23-clinic]');if(c){e.preventDefault();e.stopPropagation();window.PetCareConsentV23?.openClinic();return}const o=e.target.closest('[data-c23-owner]');if(o){e.preventDefault();e.stopPropagation();window.PetCareConsentV23?.openOwner();return}});
const mo=new MutationObserver(inject);mo.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('DOMContentLoaded',inject);
})();
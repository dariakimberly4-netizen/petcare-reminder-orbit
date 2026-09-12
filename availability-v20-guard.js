(()=>{
'use strict';
function nextDayString(){const d=new Date();d.setDate(d.getDate()+1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function todayString(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
document.addEventListener('click',e=>{
  const b=e.target.closest('#ownerApp [data-smart-action="book-vet"]');
  if(!b)return;
  e.preventDefault();e.stopImmediatePropagation();
  window.PetCareAvailability?.open?.('owner','VET');
},true);
const mo=new MutationObserver(()=>{
  const input=document.querySelector('.availability-workspace #avDate');
  if(!input||input.dataset.v20Guard)return;
  input.dataset.v20Guard='1';
  const secure=!!window.PetCareSupabase?.active;
  const now=new Date();
  if(!secure&&input.value===todayString()&&(now.getDay()===0||now.getHours()>=18))input.value=nextDayString();
});
window.addEventListener('DOMContentLoaded',()=>mo.observe(document.getElementById('app')||document.body,{childList:true,subtree:true}));
})();

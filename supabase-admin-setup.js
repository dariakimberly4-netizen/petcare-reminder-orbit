(()=>{
'use strict';
function install(){
  const api=window.PetCareSupabase;
  if(!api?.active||api.state?.staff)return;
  const panel=document.getElementById('ownerPanel');
  if(!panel||panel.querySelector('[data-claim-clinic-admin]'))return;
  const title=panel.querySelector('h2')?.textContent?.trim();
  if(title!=='More')return;
  const wrap=panel.querySelector('.secure-extra')||panel.querySelector('.panel-card');
  if(!wrap)return;
  const b=document.createElement('button');
  b.className='btn btn-outline';
  b.dataset.claimClinicAdmin='1';
  b.textContent='CLINIC ADMIN SETUP';
  b.onclick=async()=>{
    const code=prompt('Enter the one-time clinic setup code');
    if(!code)return;
    const {data,error}=await api.claimAdmin(code);
    if(error||data?.error){alert(data?.error||error?.message||'Unable to claim clinic admin');return}
    alert('Clinic Admin access activated.');
    location.reload();
  };
  wrap.appendChild(b);
}
const o=new MutationObserver(install);
window.addEventListener('DOMContentLoaded',()=>{const p=document.getElementById('ownerPanel');if(p)o.observe(p,{childList:true,subtree:true});install()});
setInterval(install,1500);
})();
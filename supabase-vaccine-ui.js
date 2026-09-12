(()=>{
'use strict';
const api=window.PetCareSupabase;if(!api)return;
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const getData=()=>window.petcareGetData?.();
const getPet=()=>window.petcareGetSelected?.();
api.cardUrl=p=>{
  if(!api.active||!p?.vaccineCardToken)return location.origin+location.pathname+'#pet='+encodeURIComponent(p?.id||'');
  return location.origin+location.pathname.replace(/[^/]*$/,'')+'vaccine-card.html?token='+encodeURIComponent(p.vaccineCardToken);
};
function enhance(){
  if(!api.active)return;const panel=document.getElementById('ownerPanel');if(!panel||panel.querySelector('h2')?.textContent?.trim()!=='Digital Vaccine Card'||panel.querySelector('[data-secure-card-actions]'))return;
  const p=getPet(),d=getData();if(!p||!d)return;const wrap=document.createElement('div');wrap.className='actions';wrap.dataset.secureCardActions='1';
  wrap.innerHTML='<button class="btn btn-outline" data-card-fullscreen>FULL SCREEN</button><button class="btn btn-outline" data-card-download>DOWNLOAD CARD</button><button class="btn btn-outline" data-card-public>OPEN QR PAGE</button>';
  panel.querySelector('.panel-card')?.appendChild(wrap);
  wrap.querySelector('[data-card-fullscreen]').onclick=()=>panel.querySelector('.vaccine-card')?.requestFullscreen?.();
  wrap.querySelector('[data-card-public]').onclick=()=>window.open(api.cardUrl(p),'_blank','noopener');
  wrap.querySelector('[data-card-download]').onclick=()=>downloadCard(p,d.vaccinations.filter(v=>v.petId===p.id));
}
function downloadCard(p,vaccines){
  const rows=vaccines.map(v=>`<tr><td>${esc(v.name)}</td><td>${esc(v.given||'')}</td><td>${esc(v.due||'')}</td></tr>`).join('');
  const html=`<!doctype html><meta charset="utf-8"><title>${esc(p.name)} Vaccine Card</title><style>body{font-family:Arial,sans-serif;max-width:760px;margin:30px auto;padding:20px;color:#172033}h1{color:#123a91}table{width:100%;border-collapse:collapse}th,td{border:1px solid #dfe7ef;padding:10px;text-align:left}.note{margin-top:20px;color:#667085;font-size:12px}</style><h1>PetCare Reminder — Digital Vaccine Card</h1><h2>${esc(p.name)}</h2><p>${esc(p.species)} · ${esc(p.breed)} · Microchip ${esc(p.microchip||'—')}</p><table><thead><tr><th>Vaccine</th><th>Date Given</th><th>Next Due</th></tr></thead><tbody>${rows}</tbody></table><p class="note">PetCare Reminder helps organize your pet's records and reminders. For medical advice, diagnosis, vaccination schedules, and treatment decisions, consult a licensed veterinarian.</p>`;
  const u=URL.createObjectURL(new Blob([html],{type:'text/html'})),a=document.createElement('a');a.href=u;a.download=`${(p.name||'pet').replace(/[^a-z0-9_-]/gi,'_')}-vaccine-card.html`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
}
const obs=new MutationObserver(enhance);window.addEventListener('DOMContentLoaded',()=>{const p=document.getElementById('ownerPanel');if(p)obs.observe(p,{childList:true,subtree:true});enhance()});
})();
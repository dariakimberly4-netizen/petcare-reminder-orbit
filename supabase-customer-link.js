(()=>{
'use strict';
const api=window.PetCareSupabase;if(!api)return;
Promise.resolve(api.ready).then(async()=>{if(!api.active||api.state.staff)return;try{const {data,error}=await api.state.client.functions.invoke('ensure-customer',{body:{}});if(error)console.warn('Customer link',error);else if(data?.customer){const d=window.petcareGetData?.();if(d&&!d.customers.some(x=>x.id===data.customer.id))d.customers.push({id:data.customer.id,name:data.customer.owner_name,mobile:data.customer.mobile||'',email:data.customer.email||'',petIds:(d.pets||[]).filter(p=>!p.placeholder).map(p=>p.id)})}}catch(e){console.warn('Customer link',e)}});
})();
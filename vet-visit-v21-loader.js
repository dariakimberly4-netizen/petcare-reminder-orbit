(()=>{
'use strict';
try{
 const b64=window.__PETCARE_V21_B64||'';
 const raw=atob(b64);
 const bytes=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 const source=new TextDecoder('utf-8').decode(bytes);
 window.__PETCARE_V21_B64='';
 (0,eval)(source);
}catch(e){console.error('Vet Visit V21 failed to load',e);}
})();

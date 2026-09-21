document.getElementById('year').textContent=new Date().getFullYear();
const menu=document.querySelector('.menubtn'),nav=document.querySelector('.navlinks');
function closeMenu(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation')}
menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation')});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){closeMenu();menu.focus()}});
const form=document.querySelector('form[data-inquiry]');
if(form){
 const status=document.getElementById('form-status'),button=form.querySelector('[type="submit"]');
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(!form.reportValidity())return;button.disabled=true;status.textContent='Sending…';
  const fields=new FormData(form),data={};for(const [k,v] of fields)if(!['consent','website'].includes(k))data[k]=v;
  try{const r=await fetch('/api/backend?action=inquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source:form.dataset.inquiry,data,website:fields.get('website'),consent:fields.has('consent')})});const result=await r.json();if(!r.ok)throw new Error(result.error);status.textContent='Thank you. Your inquiry has been received. Reference: '+result.id;form.reset();}
  catch(error){status.textContent=(error.message||'Unable to send.')+' Your details have not been cleared. You can also email info@mffind.com.';}
  finally{button.disabled=false;}
 });
}

document.getElementById('year').textContent=new Date().getFullYear();
const menu=document.querySelector('.menubtn'),nav=document.querySelector('.navlinks');
function closeMenu(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation')}
menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation')});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){closeMenu();menu.focus()}});
const form=document.querySelector('form');
if(form){const draft=document.getElementById('draft'),out=document.getElementById('email-draft'),status=document.getElementById('form-status');
function prepare(){if(!form.reportValidity())return null;const lines=['Hello Manfan,',''];for(const [key,value] of new FormData(form))if(value.trim())lines.push(key+': '+value.trim());lines.push('','Thank you.');const text=lines.join('\n');out.value=text;draft.hidden=false;status.textContent='Your draft is ready. Review it below before sending.';return text}
form.addEventListener('submit',e=>{e.preventDefault();if(prepare())out.focus()});
document.getElementById('open-email').addEventListener('click',()=>{const text=out.value;window.location.href='mailto:info@mffind.com?subject='+encodeURIComponent(form.dataset.subject)+'&body='+encodeURIComponent(text);status.textContent='Email draft opened in your mail app. Nothing has been sent by this website. If no app opens, copy the draft and email info@mffind.com.'});
document.getElementById('copy-draft').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(out.value);status.textContent='Draft copied. Paste it into an email to info@mffind.com.'}catch(e){out.focus();out.select();status.textContent='Draft selected. Press Ctrl+C (Windows) or Command+C (Mac) to copy.'}});
form.addEventListener('input',()=>{if(!draft.hidden){draft.hidden=true;status.textContent='Details changed. Prepare the draft again to include your updates.'}});
}

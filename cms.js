(async()=>{
 const base=new URL('.',document.currentScript.src);
 try{
 const r=await fetch(new URL('api/backend?action=public',base));if(!r.ok)return;const rows=await r.json();
 const page=rows.find(x=>x.kind==='page'&&x.id===document.body.dataset.page&&x.published);
 if(page)for(const el of document.querySelectorAll('[data-cms]'))if(typeof page.data[el.dataset.cms]==='string')el.textContent=page.data[el.dataset.cms];
 const settings=rows.find(x=>x.id==='settings'&&x.published);if(settings?.data.email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.data.email))for(const el of document.querySelectorAll('[data-email-link]')){el.href='mailto:'+settings.data.email;if(el.textContent.includes('@')&&el.textContent.length>3)el.textContent=settings.data.email;}
 if(settings?.data.location)for(const el of document.querySelectorAll("[data-location]"))el.textContent=settings.data.location;
 function fill(el,row){const originalImage=el.querySelector(".product-image");el.style.display="block";el.replaceChildren();if(originalImage&&!row.data.image)el.append(originalImage);if(row.data.image){const img=document.createElement('img');img.src=row.data.image;img.alt=row.data.title;img.loading='lazy';img.style='width:100%;max-height:340px;object-fit:cover';el.append(img);}const h=document.createElement('h2');h.textContent=row.data.title;el.append(h);if(row.data.summary){const summary=document.createElement('p');summary.textContent=row.data.summary;el.append(summary);}for(const text of (row.data.body||'').split('\n\n')){const p=document.createElement('p');p.textContent=text;p.style.whiteSpace='pre-wrap';el.append(p);}if(row.kind==='product'){const a=document.createElement('a');a.href=new URL('start-project/index.html',base);a.className='btn btn-fill';a.textContent='Discuss this collection →';el.append(a);}}
 for(const row of rows.filter(x=>x.kind!=='page')){
  const existing=[...document.querySelectorAll('[data-record]')].find(x=>x.dataset.record===row.id);
  const matchingLinks=[...document.querySelectorAll('a[href]')].filter(x=>{const u=new URL(x.href);return u.hash===`#${row.id}`&&u.pathname.includes(row.kind==='product'?'collections':'insights');});
  if(!row.published){if(existing)existing.hidden=true;matchingLinks.forEach(a=>{const card=a.closest('.product-card,.insight');(card||a).hidden=true;});continue;}
  matchingLinks.forEach(a=>{const h=a.querySelector('h3');if(h)h.textContent=row.data.title;});
  if(existing){fill(existing,row);continue;}
  if((row.kind==='product'&&document.body.dataset.page==='collections')||(row.kind==='article'&&document.body.dataset.page==='insights')){const holder=document.querySelector('#cms-extra');const el=document.createElement('article');el.id=row.id;el.className='article';el.style='padding:32px 0;border-bottom:1px solid #dde4e5';fill(el,row);holder?.append(el);}
 }
 }catch{ /* Static content remains available if the service is unavailable. */ }
})();

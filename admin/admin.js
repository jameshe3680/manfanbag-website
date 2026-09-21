const $=s=>document.querySelector(s),status=$('#status');let tab='inquiries',records=[],defaults=[],inquiries=[],offset=0,dirty=false;
const names={inquiries:'客户询盘',page:'网站文案',product:'产品系列',article:'Insights 文章'},pages={home:'首页',about:'About Us',collections:'Collections',service:'Service',insights:'Insights',contact:'Contact Us','start-project':'Start a Project',settings:'联系邮箱与地址'},states={new:'待处理',following:'跟进中',quoted:'已报价',completed:'已完成'};
function el(tag,text,attrs={}){const e=document.createElement(tag);if(text)e.textContent=text;Object.assign(e,attrs);return e;}
async function api(action,body){const r=await fetch('/api/backend?action='+action,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok){if(r.status===401){$('#login').hidden=false;$('#workspace').hidden=true;$('#logout').hidden=true;$('#account').textContent='';$('#list').replaceChildren();}throw new Error(data.error||'请求失败');}return data;}
function error(e){status.textContent=e.message||'请求失败，请稍后重试。';}
function mayLeave(){return !dirty||confirm('尚有未保存的修改，确定离开？');}
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
async function enter(){const user=await api('session');$('#login').hidden=true;$('#workspace').hidden=false;$('#logout').hidden=false;$('#account').textContent=user.email;if(!defaults.length){const r=await fetch('/cms-defaults.json');defaults=await r.json();}await load();}
$('#login-form').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{status.textContent='登录中…';await api('login',Object.fromEntries(new FormData(e.target)));e.target.reset();await enter();status.textContent='';}catch(e){error(e);}finally{button.disabled=false;}};
$('#logout').onclick=async()=>{if(!mayLeave())return;try{await api('logout',{});location.reload();}catch(e){error(e);}};
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=async()=>{if(!mayLeave())return;dirty=false;tab=b.dataset.tab;offset=0;try{await load();}catch(e){error(e);}});
async function load(){
 $('#title').textContent=names[tab];$('#editor').replaceChildren(el('p','选择条目查看或编辑。'));$('#toolbar').replaceChildren();document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 if(tab==='inquiries'){
  inquiries=await api('inquiries&offset='+offset);const search=el('input','',{placeholder:'搜索本页姓名、邮箱、公司'});search.oninput=()=>renderInquiries(search.value);$('#toolbar').append(search);
  const prev=el('button','上一页',{disabled:offset===0}),next=el('button','下一页',{disabled:inquiries.length<50});prev.onclick=()=>changePage(-50);next.onclick=()=>changePage(50);$('#toolbar').append(prev,next,el('span',`第 ${offset/50+1} 页 · 每页最多 50 条`));renderInquiries();
 }else{
  const saved=await api('content');const map=new Map(defaults.map(x=>[x.id,x]));saved.forEach(x=>map.set(x.id,x));records=[...map.values()].filter(x=>x.kind===tab);
  if(tab!=='page'){const b=el('button',tab==='product'?'新增产品系列':'新增文章');b.onclick=()=>{if(!mayLeave())return;editContent({id:tab+'-'+crypto.randomUUID(),kind:tab,published:false,data:{title:'',summary:'',body:'',image:''}});};$('#toolbar').append(b);}
  $('#toolbar').append(el('span',tab==='page'?'编辑后点击保存，官网将读取已发布内容。':'可上传图片、保存草稿或发布；取消发布即可下架。'));renderContent();
 }
}
async function changePage(delta){if(!mayLeave())return;dirty=false;offset+=delta;try{await load();}catch(e){error(e);}}
function renderInquiries(query=''){const list=$('#list');list.replaceChildren();const rows=inquiries.filter(x=>JSON.stringify(x.data).toLowerCase().includes(query.toLowerCase()));if(!rows.length)list.append(el('p','暂无询盘。'));rows.forEach(row=>{const b=el('button',row.data['Your name']+' · '+(row.data['Company / brand']||row.data['Work email']));b.append(el('small',states[row.status]+' · '+new Date(row.created_at).toLocaleString()));b.onclick=()=>{if(mayLeave())editInquiry(row);};list.append(b);});}
function field(form,label,value,type='text'){const l=el('label',label),input=el(type==='textarea'?'textarea':'input','',{value:value||''});if(type!=='textarea')input.type=type;l.append(input);form.append(l);input.oninput=()=>dirty=true;return input;}
function editInquiry(row){dirty=false;const box=$('#editor');box.replaceChildren(el('h2',row.data['Your name']),el('p',`来源：${row.source} · ${new Date(row.created_at).toLocaleString()} · ${row.id}`));const dl=el('dl');Object.entries(row.data).forEach(([k,v])=>dl.append(el('dt',k),el('dd',v)));box.append(dl);const form=el('form'),l=el('label','跟进状态'),select=el('select');Object.entries(states).forEach(([v,t])=>select.append(el('option',t,{value:v,selected:v===row.status})));select.onchange=()=>dirty=true;l.append(select);form.append(l);const notes=field(form,'内部跟进备注',row.notes,'textarea');notes.maxLength=10000;const save=el('button','保存跟进');form.append(save);form.onsubmit=async e=>{e.preventDefault();save.disabled=true;try{await api('followup',{id:row.id,status:select.value,notes:notes.value});row.status=select.value;row.notes=notes.value;dirty=false;status.textContent='跟进记录已保存。';renderInquiries();}catch(e){error(e);}finally{save.disabled=false;}};box.append(form);}
function renderContent(){const list=$('#list');list.replaceChildren();records.forEach(row=>{const b=el('button',row.kind==='page'?(pages[row.id]||row.id):row.data.title);b.append(el('small',row.published?'已发布':'草稿 / 已下架'));b.onclick=()=>{if(mayLeave())editContent(row);};list.append(b);});}
function editContent(row){dirty=false;const box=$('#editor');box.replaceChildren(el('h2',row.kind==='page'?(pages[row.id]||row.id):row.data.title||'新内容'));const form=el('form'),inputs={};
 if(row.kind==='page'){for(const [k,v] of Object.entries(row.data)){inputs[k]=field(form,k==='email'?'联系邮箱':k==='location'?'公司所在地':v.slice(0,65),v,k==='email'?'email':'textarea');}}
 else{
  inputs.title=field(form,'英文标题',row.data.title);inputs.title.required=true;
  inputs.summary=field(form,'摘要（可选）',row.data.summary,'textarea');
  if(row.kind==='product'){
   const parts=(row.data.body||'').split(/\n\s*\n/).filter(Boolean),structured=Object.hasOwn(row.data,'lead');
   inputs.lead=field(form,'引导语（加粗显示）',structured?row.data.lead:parts.shift());
   inputs.body=field(form,'产品正文（空行分段）',structured?row.data.body:(parts.shift()||''),'textarea');
   inputs.features=field(form,'产品特点（每行一项，自动显示项目符号）',structured?row.data.features:parts.join('\n'),'textarea');
   form.append(el('p','系列编号、卡片边距和按钮样式由网站自动保留，无需在正文中填写。'));
  }else inputs.body=field(form,'英文正文（空行分段）',row.data.body,'textarea');
  inputs.body.style.minHeight='200px';inputs.image=field(form,'图片地址（留空保留原有产品图）',row.data.image);
  const label=el('label','上传图片（JPG / PNG / WebP，最大 2 MB）'),file=el('input','',{type:'file',accept:'image/jpeg,image/png,image/webp'});label.append(file);form.append(label);
  file.onchange=async()=>{const f=file.files[0];if(!f)return;if(f.size>2097152){status.textContent='图片不能超过 2 MB。';return;}file.disabled=true;try{status.textContent='正在上传图片…';const base64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(f);});const result=await api('upload',{type:f.type,base64});inputs.image.value=result.url;dirty=true;status.textContent='图片已上传，请保存内容。';}catch(e){error(e);}finally{file.disabled=false;}};
 }
 const l=el('label',''),published=el('input','',{type:'checkbox',checked:row.published});published.onchange=()=>dirty=true;l.append(published,document.createTextNode(' 发布到官网'));form.append(l);if(row.kind==='page'){published.checked=true;l.hidden=true;}
 const save=el('button','保存内容');form.append(save);form.onsubmit=async e=>{e.preventDefault();save.disabled=true;try{const updated={id:row.id,kind:row.kind,published:published.checked,data:Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,v.value]))};await api('content',updated);Object.assign(row,updated);if(!records.some(x=>x.id===row.id))records.push(row);dirty=false;status.textContent=updated.published?'已发布，刷新官网即可查看。':'草稿已保存，官网不显示此条目。';renderContent();}catch(e){error(e);}finally{save.disabled=false;}};box.append(form);
}
enter().catch(e=>{if(!e.message.includes('请登录'))error(e);});

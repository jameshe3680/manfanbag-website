import {createHmac,randomUUID} from 'node:crypto';
const failure=(code,message)=>Object.assign(new Error(message),{code});
export function validateInquiry(b){
 if(!['contact','start-project'].includes(b.source)||!b.data||typeof b.data!=='object'||Array.isArray(b.data))throw failure(400,'Invalid inquiry.');
 const allowed=['Your name','Work email','Company / brand','Destination market','Bag category','Estimated quantity','Target delivery window','Target unit cost & currency','Materials, dimensions & branding','Project brief','Your message'];
 const data={}; for(const [k,v] of Object.entries(b.data)){if(!allowed.includes(k)||typeof v!=='string'||v.length>1800)throw failure(400,'Invalid field.');data[k]=v.trim();}
 if(!data['Your name']||!data['Work email']||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data['Work email'])||!(b.source==='contact'?data['Your message']:data['Project brief']&&data['Bag category'])||b.consent!==true)throw failure(400,'Please complete all required fields and consent.');
 return data;
}
export function validateContent(b){
 if(!/^[a-z0-9_-]{1,90}$/.test(b.id)||!['page','product','article'].includes(b.kind)||typeof b.published!=='boolean'||!b.data||Array.isArray(b.data)||typeof b.data!=='object')throw failure(400,'Invalid content.');
 if(JSON.stringify(b.data).length>100000)throw failure(400,'Content is too long.');
 if(b.kind==='page'){for(const [k,v] of Object.entries(b.data))if(!/^[a-z0-9_-]+$/.test(k)||typeof v!=='string'||v.length>10000)throw failure(400,'Invalid page field.');}
 else{if(typeof b.data.title!=='string'||!b.data.title.trim())throw failure(400,'Title is required.');for(const k of Object.keys(b.data))if(!['title','body','image','summary'].includes(k)||typeof b.data[k]!=='string')throw failure(400,'Invalid content field.');if(b.data.image&&!/^https:\/\/[^\s]+$/.test(b.data.image)&&!/^\/(?!\/)[a-zA-Z0-9/_.-]+$/.test(b.data.image))throw failure(400,'Use an HTTPS image URL.');}
 return {id:b.id,kind:b.kind,published:b.published,data:b.data,updated_at:new Date().toISOString()};
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const send=(code,data)=>res.status(code).json(data);
 try{
 const action=req.query.action||'public',method=req.method;
 if(!['GET','POST'].includes(method))throw failure(405,'Method not allowed.');
 if(method==='POST'){
  if(req.headers.origin!==process.env.SITE_ORIGIN)throw failure(403,'Invalid request origin.');
  if(!String(req.headers['content-type']).startsWith('application/json'))throw failure(415,'JSON required.');
 }
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key||!process.env.ADMIN_EMAILS||!process.env.RATE_LIMIT_SECRET)throw failure(503,'Service is not configured yet. Please email info@mffind.com.');
 async function sb(path,{method='GET',body,headers={}}={}){
  const r=await fetch(`${url}${path}`,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw failure(502,'Service unavailable. Please try again.');return r.status===204?null:r.json();
 }
 const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
 if(JSON.stringify(b).length>(action==='upload'?2900000:120000))throw failure(413,'Request too large.');
 async function rate(bucket,max){const ip=String(req.headers['x-vercel-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];const hash=createHmac('sha256',process.env.RATE_LIMIT_SECRET).update(ip).digest('hex');if(!await sb('/rest/v1/rpc/manfan_rate_limit',{method:'POST',body:{bucket:`${bucket}:${hash}`,max_hits:max,window_seconds:900}}))throw failure(429,'Too many attempts. Please try again in 15 minutes.');}
 if(action==='public'&&method==='GET'){const rows=await sb('/rest/v1/manfan_content?select=id,kind,published,data&order=id&limit=1000');return send(200,rows.map(x=>x.published?x:{id:x.id,kind:x.kind,published:false}));}
 const cookieName=process.env.NODE_ENV==='development'?'manfan_session':'__Host-manfan_session';
 const cookie=(token,seconds)=>res.setHeader('Set-Cookie',`${cookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${process.env.NODE_ENV==='development'?'':'; Secure'}`);
 if(action==='login'&&method==='POST'){
  await rate('login',10);if(typeof b.email!=='string'||typeof b.password!=='string'||b.password.length>500)throw failure(400,'Enter email and password.');
  const r=await fetch(`${url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email:b.email,password:b.password}),signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw failure(401,'登录失败，请检查邮箱和密码。');const session=await r.json();
  if(!process.env.ADMIN_EMAILS.toLowerCase().split(',').map(x=>x.trim()).includes(session.user?.email?.toLowerCase())||!session.user?.email_confirmed_at)throw failure(403,'此账号没有管理权限。');
  cookie(session.access_token,Math.min(session.expires_in||3600,3600));return send(200,{ok:true});
 }
 if(action==='logout'&&method==='POST'){cookie('',0);return send(200,{ok:true});}
 if(action==='inquiry'&&method==='POST'){
  await rate('inquiry',5);if(b.website)throw failure(400,'Unable to submit.');const data=validateInquiry(b);
  const rows=await sb('/rest/v1/manfan_inquiries',{method:'POST',headers:{Prefer:'return=representation'},body:{source:b.source,data}});return send(201,{id:rows[0].id});
 }
 const token=decodeURIComponent(String(req.headers.cookie||'').split('; ').find(x=>x.startsWith(`${cookieName}=`))?.split('=')[1]||'');
 if(!token)throw failure(401,'请登录管理员账号。');
 const auth=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(12000)});
 if(!auth.ok)throw failure(401,'登录已过期，请重新登录。');const user=await auth.json();
 if(!user.email_confirmed_at||!process.env.ADMIN_EMAILS.toLowerCase().split(',').map(x=>x.trim()).includes(user.email?.toLowerCase()))throw failure(403,'没有管理权限。');
 if(action==='session'&&method==='GET')return send(200,{email:user.email});
 if(action==='content'&&method==='GET')return send(200,await sb('/rest/v1/manfan_content?select=*&order=id&limit=1000'));
 if(action==='content'&&method==='POST')return send(200,await sb('/rest/v1/manfan_content?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:validateContent(b)}));
 if(action==='inquiries'&&method==='GET'){const offset=Math.max(0,Math.min(1000000,Number(req.query.offset)||0));return send(200,await sb(`/rest/v1/manfan_inquiries?select=*&order=created_at.desc&limit=50&offset=${offset}`));}
 if(action==='followup'&&method==='POST'){
  if(!/^[0-9a-f-]{36}$/.test(b.id)||!['new','following','quoted','completed'].includes(b.status)||typeof b.notes!=='string'||b.notes.length>10000)throw failure(400,'Invalid update.');
  return send(200,await sb(`/rest/v1/manfan_inquiries?id=eq.${b.id}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:{status:b.status,notes:b.notes}}));
 }
 if(action==='upload'&&method==='POST'){
  const types={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};if(!types[b.type]||typeof b.base64!=='string')throw failure(400,'Use JPG, PNG or WebP.');
  const bytes=Buffer.from(b.base64,'base64');if(bytes.length>2097152||bytes.length<12)throw failure(400,'Maximum image size is 2 MB.');
  const valid=b.type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):b.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';if(!valid)throw failure(400,'Invalid image.');
  const path=`${randomUUID()}.${types[b.type]}`;const r=await fetch(`${url}/storage/v1/object/manfan-images/${path}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':b.type},body:bytes,signal:AbortSignal.timeout(15000)});if(!r.ok)throw failure(502,'Image upload failed.');return send(201,{url:`${url}/storage/v1/object/public/manfan-images/${path}`});
 }
 throw failure(404,'Not found.');
 }catch(e){return send(e.code||500,{error:e.code?e.message:'Service unavailable. Please try again.'});}
}

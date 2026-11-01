// TORA 0.9 — Auth y REST de Supabase desde el servidor.
// Sin service_role/secret: todas las consultas de datos llevan el JWT del usuario
// y, por tanto, están sujetas a Row Level Security (RLS) de Supabase.
import {randomBytes} from 'node:crypto';
import {scanSensitive} from './engine.js';
import {validateClinicalFormat} from './clinical-formats.js';

const SESSION_MS=12*60*60*1000;
const RATE_MS=15*60*1000;
const err=(message,status=400)=>Object.assign(new Error(message),{status});
const isText=(v,min,max)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max;
function cookie(req,key){return String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(key+'='))?.slice(key.length+1)||'';}
// Normaliza la API URL copiada desde Supabase, sin permitir servidores arbitrarios.
// Ejemplos aceptados: https://PROYECTO.supabase.co, con barra final,
// entre comillas, o con la ruta /rest/v1 agregada por error.
export function normalizeSupabaseUrl(input){
 let value=String(input??'').trim();
 if(!value)return '';
 const quote=value[0];
 if((quote==='"'||quote==="'"||quote==='`')&&value.at(-1)===quote){
  value=value.slice(1,-1).trim();
 }
 let parsed;
 try{parsed=new URL(value)}catch{
  throw Error('SUPABASE_URL inválida: pega la API URL completa de Supabase (https://TU-PROYECTO.supabase.co).');
 }
 const validHost=/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.supabase\.co$/.test(parsed.hostname);
 if(parsed.protocol!=='https:'||!validHost||parsed.username||parsed.password||parsed.port||parsed.search||parsed.hash){
  throw Error('SUPABASE_URL inválida: usa la API URL HTTPS del proyecto (https://TU-PROYECTO.supabase.co), sin claves, parámetros ni otros dominios.');
 }
 if(!['/','/rest/v1','/auth/v1'].includes(parsed.pathname.replace(/\/$/,'' )||'/')){
  throw Error('SUPABASE_URL tiene una ruta inesperada: copia solamente la API URL del proyecto en Supabase → Configuración → Data API.');
 }
 return parsed.origin;
}
function config(){
 const rawUrl=String(process.env.SUPABASE_URL||'').trim();
 const key=String(process.env.SUPABASE_PUBLISHABLE_KEY||'').trim();
 const enabled=Boolean(rawUrl&&key&&process.env.TORA_AUTH_PROVIDER==='supabase');
 const url=enabled?normalizeSupabaseUrl(rawUrl):'';
 return {url,key,enabled};
}
export function createSupabaseGateway(){
 const cfg=config(), sessions=new Map(), attempts=new Map(),quota=new Map();
 const cookieName='tora09_session';
 const flags=`Path=/; HttpOnly; SameSite=Strict${process.env.NODE_ENV==='production'?'; Secure':''}`;
 const cookieValue=s=>`${cookieName}=${s}; ${flags}; Max-Age=${Math.floor(SESSION_MS/1000)}`;
 const expireCookie=()=>`${cookieName}=; ${flags}; Max-Age=0`;
 function throttle(ip){const now=Date.now(),old=attempts.get(ip);const a=!old||now>old.until?{n:0,until:now+RATE_MS}:old;if(a.n>=10)throw err('Demasiados intentos. Intenta nuevamente más tarde.',429);a.n++;attempts.set(ip,a);}
 async function request(path,{method='GET',token,body,extraHeaders={}}={}){
  const headers={'apikey':cfg.key,'Content-Type':'application/json',...extraHeaders};
  // Las claves sb_publishable_ NO son JWT. Para registro/recuperación basta apikey.
  // Solo las consultas de usuarios autenticados envían su JWT real en Authorization.
  if(token)headers.Authorization=`Bearer ${token}`;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
   const r=await fetch(cfg.url+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal});
   const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=null}
   if(!r.ok){
    // No exponer respuestas arbitrarias ni credenciales del proveedor.
    if(r.status===401||r.status===403)throw err('Supabase rechazó la autenticación. Comprueba las claves y permisos.',r.status);
    if(r.status===429)throw err('Demasiadas solicitudes. Intenta nuevamente más tarde.',429);
    if(r.status===409)throw err('Registro duplicado. Revisa los datos.',409);
    const message=String(data?.msg||data?.message||data?.error_description||'');
    const code=String(data?.code||data?.error_code||'');
    // Mostrar únicamente errores conocidos, con mensajes breves que permitan corregir el registro.
    if(/invalid login credentials/i.test(message))throw err('Correo o contraseña incorrectos.',400);
    if(/signup[_ ]disabled|signups? (are )?disabled/i.test(code+' '+message))throw err('El registro está desactivado en Supabase → Authentication.',403);
    if(/email[_ ]rate[_ ]limit|over_email_send_rate_limit|rate limit.*email/i.test(code+' '+message))throw err('Supabase alcanzó el límite de correos. Reintenta más tarde o configura SMTP.',429);
    if(/database error saving new user|database error creating new user/i.test(message))throw err('Supabase no pudo crear el perfil. Revisa Authentication → Logs y el trigger de profiles.',502);
    if(/password.*(weak|short)|weak_password/i.test(code+' '+message))throw err('Supabase rechazó la contraseña: usa una más segura.',400);
    if(r.status===422)throw err('Supabase rechazó los datos de registro. Comprueba el correo y la contraseña.',422);
    if(r.status===400)throw err('Supabase rechazó la solicitud. Revisa los datos ingresados.',400);
    throw err(`Supabase rechazó la operación (${r.status}).`,502);
   }
   return data;
  }catch(e){if(e.name==='AbortError')throw err('Supabase no respondió a tiempo.',504);throw e}finally{clearTimeout(timer)}
 }
 async function auth(path,options){return request('/auth/v1'+path,options)}
 async function rest(path,token,options){return request('/rest/v1'+path,{...options,token})}
 async function profile(token){const out=await rest('/profiles?select=id,display_name,status,role&limit=1',token);return Array.isArray(out)?out[0]||null:null}
 async function storeSession(tokenData){
  // Supabase puede emitir refresh tokens heredados válidos de 12 caracteres.
  // La autenticidad de la identidad se comprueba justo después contra /auth/v1/user.
  if(!isText(tokenData?.access_token,30,5000)||!isText(tokenData?.refresh_token,12,5000))throw err('Sesión inválida.');
  const identity=await auth('/user',{token:tokenData.access_token});
  if(!identity?.id)throw err('No se pudo verificar la identidad.',401);
  const sid=randomBytes(32).toString('base64url');
  sessions.set(sid,{userId:identity.id,access:tokenData.access_token,refresh:tokenData.refresh_token,expiresAt:Date.now()+(Number(tokenData.expires_in)||3600)*1000,deadAt:Date.now()+SESSION_MS});
  if(sessions.size>1500)for(const [id,s] of sessions)if(s.deadAt<Date.now())sessions.delete(id);
  return {sid,principal:{id:identity.id,email:identity.email||''}};
 }
 async function principal(req){
  const sid=cookie(req,cookieName),s=sessions.get(sid);
  if(!s||s.deadAt<=Date.now()){if(s)sessions.delete(sid);return null}
  if(s.expiresAt-Date.now()<90000){
   try{const refreshed=await auth('/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:s.refresh}});s.access=refreshed.access_token;s.refresh=refreshed.refresh_token;s.expiresAt=Date.now()+(Number(refreshed.expires_in)||3600)*1000}catch{sessions.delete(sid);return null}
  }
  try{const p=await profile(s.access);if(!p||p.id!==s.userId){sessions.delete(sid);return null}
   return {id:s.userId,username:p.display_name,role:p.role,status:p.status,token:s.access,sessionId:sid};
  }catch{return null}
 }
 function consumeAI(person){const now=Date.now(),k=person.id;let b=quota.get(k);if(!b||b.until<=now)b={n:0,until:now+3600000};if(b.n>=20)return false;b.n++;quota.set(k,b);return true}
 return {
  enabled:cfg.enabled,cookieValue,expireCookie,principal,consumeAI,
  async register(input,ip){throttle(ip);if(!isText(input?.display_name,2,100)||!isText(input?.email,5,254)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)||!isText(input?.password,12,128))throw err('Indica nombre, correo válido y contraseña de al menos 12 caracteres.');
   await auth('/signup',{method:'POST',body:{email:input.email.trim().toLowerCase(),password:input.password,data:{display_name:input.display_name.trim()}}});return {message:'Solicitud registrada. Revisa tu correo para confirmar la cuenta. Después de confirmar, el administrador debe aprobar el acceso.'}},
  async login(input,ip){throttle(ip);if(!isText(input?.email,5,254)||!isText(input?.password,1,128))throw err('Credenciales inválidas.');const result=await auth('/token?grant_type=password',{method:'POST',body:{email:input.email.trim().toLowerCase(),password:input.password}});return storeSession(result)},
  async adopt(input){return storeSession({access_token:input?.access_token,refresh_token:input?.refresh_token,expires_in:input?.expires_in})},
  async recover(input,ip){throttle(ip);if(!isText(input?.email,5,254))throw err('Correo inválido.');await auth('/recover',{method:'POST',body:{email:input.email.trim().toLowerCase()}});return {message:'Si existe una cuenta, recibirás las instrucciones por correo.'}},
  async changePassword(person,input){if(!isText(input?.password,12,128))throw err('La contraseña debe tener al menos 12 caracteres.');await auth('/user',{method:'PUT',token:person.token,body:{password:input.password}});return {ok:true}},
  async logout(req){const sid=cookie(req,cookieName),s=sessions.get(sid);sessions.delete(sid);if(s)try{await auth('/logout',{method:'POST',token:s.access})}catch{}},
  async getPreferences(person){const out=await rest('/user_preferences?select=settings&limit=1',person.token);return Array.isArray(out)?out[0]?.settings||{}:{}},
  async savePreferences(person,prefs){if(!prefs||!['light','dark'].includes(prefs.theme))throw err('Preferencias inválidas.');return rest('/user_preferences?on_conflict=user_id',person.token,{method:'POST',body:{user_id:person.id,settings:{theme:prefs.theme}},extraHeaders:{Prefer:'resolution=merge-duplicates,return=representation'}})},
  async listFormats(person){return rest('/clinical_formats?select=id,specialty,name,sections,instructions,updated_at&order=updated_at.desc',person.token)},
  async upsertFormat(person,f){if(!f||!isText(f.specialty,2,80)||!isText(f.name,1,120)||!Array.isArray(f.sections)||f.sections.length<2||f.sections.length>18||!f.sections.every(x=>isText(x,2,75))||typeof f.instructions!=='string'||f.instructions.length>700)throw err('Formato clínico inválido.');
   validateClinicalFormat({specialty:f.specialty,name:f.name,headings:f.sections,instruction:f.instructions},f.specialty);
   const row={user_id:person.id,specialty:f.specialty,name:f.name,sections:f.sections,instructions:f.instructions};
   return rest('/clinical_formats?on_conflict=user_id,specialty',person.token,{method:'POST',body:row,extraHeaders:{Prefer:'resolution=merge-duplicates,return=representation'}})},
  async listEvolutions(person){return rest('/evolutions?select=id,specialty,title,content,previous_note,today_changes,status,updated_at&order=updated_at.desc&limit=100',person.token)},
  async saveEvolution(person,v){if(!v||!isText(v.specialty,2,80)||!isText(v.title,2,180)||!isText(v.content,1,16000)||String(v.previous_note||'').length>12000||String(v.today_changes||'').length>7000||!['draft','final'].includes(v.status))throw err('Evolución inválida.');
   const hazards=scanSensitive([v.title,v.content,v.previous_note||'',v.today_changes||''].join('\n'));if(hazards.length)throw err('Posibles datos identificables detectados ('+hazards.join(', ')+'). Usa casos ficticios.',422);
   const row={user_id:person.id,specialty:v.specialty,title:v.title.trim(),content:v.content,previous_note:String(v.previous_note||''),today_changes:String(v.today_changes||''),status:v.status};
   if(v.id){if(!/^[0-9a-f-]{36}$/i.test(v.id))throw err('ID inválido.');return rest(`/evolutions?id=eq.${encodeURIComponent(v.id)}`,person.token,{method:'PATCH',body:row,extraHeaders:{Prefer:'return=representation'}})}
   return rest('/evolutions',person.token,{method:'POST',body:row,extraHeaders:{Prefer:'return=representation'}})},
  async deleteEvolution(person,id){if(!/^[0-9a-f-]{36}$/i.test(id))throw err('ID inválido.');return rest(`/evolutions?id=eq.${encodeURIComponent(id)}`,person.token,{method:'DELETE',extraHeaders:{Prefer:'return=representation'}})},
  async listFeedback(person){return rest('/user_feedback?select=id,category,description,status,created_at&order=created_at.desc&limit=50',person.token)},
  async sendFeedback(person,input){
   if(!input||!['error','sugerencia','calidad'].includes(input.category)||!isText(input.description,15,1500))throw err('Selecciona la categoría y escribe entre 15 y 1500 caracteres.');
   const hazards=scanSensitive(input.description);if(hazards.length)throw err('Detectamos posibles datos identificables. Describe el problema sin información de pacientes.',422);
   return rest('/user_feedback',person.token,{method:'POST',body:{user_id:person.id,category:input.category,description:input.description.trim(),status:'nuevo'},extraHeaders:{Prefer:'return=representation'}})
  },
  async adminFeedback(person){if(person.role!=='admin'||person.status!=='approved')throw err('Acceso restringido a administrador.',403);return rest('/rpc/tora_admin_list_feedback',person.token,{method:'POST',body:{}})},
  async adminFeedbackStatus(person,input){if(person.role!=='admin'||person.status!=='approved')throw err('Acceso restringido a administrador.',403);if(!/^[0-9a-f-]{36}$/i.test(input?.id)||!['nuevo','revisando','resuelto'].includes(input?.status))throw err('Solicitud inválida.');return rest('/rpc/tora_admin_update_feedback',person.token,{method:'POST',body:{p_id:input.id,p_status:input.status}})},
  async adminList(person){if(person.role!=='admin'||person.status!=='approved')throw err('Acceso restringido a administrador.',403);return rest('/rpc/tora_admin_list_profiles',person.token,{method:'POST',body:{}})},
  async adminSet(person,input){if(person.role!=='admin'||person.status!=='approved')throw err('Acceso restringido a administrador.',403);if(!/^[0-9a-f-]{36}$/i.test(input?.user_id)||!['approved','pending','suspended'].includes(input?.new_status))throw err('Solicitud inválida.');return rest('/rpc/tora_admin_set_status',person.token,{method:'POST',body:{p_user_id:input.user_id,p_status:input.new_status}})}
 };
}

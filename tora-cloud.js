// Todas las peticiones se envían al propio servidor TORA con cookie HttpOnly;
// no se exponen JWT ni claves de Supabase en el navegador.
export async function cloudRequest(path,options={}){
 const r=await fetch(path,{credentials:'same-origin',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});
 const data=await r.json().catch(()=>null);
 if(!r.ok)throw new Error(data?.error||`Error HTTP ${r.status}`);
 return data;
}
export async function cloudMode(){return cloudRequest('/api/auth/mode').then(r=>r.provider==='supabase').catch(()=>false)}
export async function cloudMe(){return cloudRequest('/api/me')}
export async function remoteFormats(){return cloudRequest('/api/data/formats')}
export async function remoteSaveFormat(format){return cloudRequest('/api/data/formats',{method:'PUT',body:JSON.stringify({specialty:format.specialty,name:format.name,sections:format.headings,instructions:format.instruction})})}
export async function remoteEvolutions(){return cloudRequest('/api/data/evolutions')}
export async function remoteSaveEvolution(note){return cloudRequest('/api/data/evolutions',{method:'POST',body:JSON.stringify(note)})}
export async function remoteDeleteEvolution(id){return cloudRequest(`/api/data/evolutions/${encodeURIComponent(id)}`,{method:'DELETE'})}
export function installAdminNav(me){
 if(me?.role!=='admin'||me.status!=='approved')return;
 const nav=document.querySelector('.side-nav');if(!nav||nav.querySelector('a[href="/administracion"]'))return;
 const a=document.createElement('a');a.className='nav-link';a.href='/administracion';a.textContent='♧ Administración';nav.append(a);
}

export async function remoteSendFeedback(feedback){return cloudRequest('/api/data/feedback',{method:'POST',body:JSON.stringify(feedback)})}

import {cloudRequest,cloudMe,installAdminNav} from './tora-cloud.js';
const $=id=>document.getElementById(id);
function show(msg){$('feedback-message').textContent=msg}
async function refresh(){
 const box=$('feedback-list');box.replaceChildren();
 try{const data=await cloudRequest('/api/data/feedback');if(!data.length){box.textContent='Aún no has enviado comentarios.';return}
  for(const x of data){const card=document.createElement('div');card.className='card';card.style.marginTop='12px';const top=document.createElement('strong');top.textContent=`${x.category} · ${x.status} · ${new Date(x.created_at).toLocaleDateString('es-CL')}`;const p=document.createElement('p');p.textContent=x.description;card.append(top,p);box.append(card)}
 }catch(e){box.textContent='No se pudo abrir el centro de feedback: '+e.message}
}
cloudMe().then(me=>installAdminNav(me)).catch(()=>{});
$('feedback-form').onsubmit=async e=>{
 e.preventDefault();const btn=$('feedback-submit');btn.disabled=true;show('Enviando…');
 try{await cloudRequest('/api/data/feedback',{method:'POST',body:JSON.stringify({category:$('feedback-category').value,description:$('feedback-description').value.trim()})});$('feedback-description').value='';show('¡Gracias! Tu comentario fue registrado.');await refresh()}
 catch(ex){show(ex.message)}finally{btn.disabled=false}
};refresh();

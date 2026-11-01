import {cloudMe,installAdminNav} from './tora-cloud.js';
const $=id=>document.getElementById(id);
const view=location.pathname==='/configuracion'?'settings':'home';
for(const key of ['home','settings'])$(key+'-view').classList.toggle('hidden',view!==key);
$('crumb').textContent=view==='home'?'Inicio':'Configuración';
document.querySelectorAll('[data-nav]').forEach(a=>{a.classList.toggle('active',a.dataset.nav===view);if(a.dataset.nav===view)a.setAttribute('aria-current','page')});
$('username').textContent=window.TORA_DISPLAY_NAME||window.EVO_USER||'Usuario';
$('settings-theme').onclick=()=>window.ToraTheme?.toggle();
$('logout').onclick=()=>fetch('/api/logout',{method:'POST'}).finally(()=>location.href='/login');
fetch('/api/status').then(r=>r.json()).then(v=>{const msg=v.aiConfigured?'● '+(v.provider||'IA')+' conectado':'○ IA no configurada';$('home-ai').textContent=msg;$('settings-ai').textContent=v.aiConfigured?('Proveedor por defecto: '+v.provider+'. Modelos disponibles: '+(v.providers||[]).map(x=>x.label).join(', ')+'.'):'No hay proveedor configurado; usa el esquema local.'}).catch(()=>{$('home-ai').textContent='○ Servidor no disponible';$('settings-ai').textContent='No se pudo conectar con el servidor.'});

cloudMe().then(installAdminNav).catch(()=>{});

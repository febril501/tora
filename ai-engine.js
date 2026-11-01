// TORA 1.2 — Proveedores intercambiables de IA. Solo casos ficticios o desidentificados.
// Las claves permanecen exclusivamente en el servidor (Render); nunca en el cliente.
const GROQ_ENDPOINT='https://api.groq.com/openai/v1/chat/completions';
const GOOGLE_ENDPOINT='https://generativelanguage.googleapis.com/v1beta/models/';
const STRUCTURED_SCHEMA={type:'object',properties:{note:{type:'string'},missing_information:{type:'array',items:{type:'string'}},review_warnings:{type:'array',items:{type:'string'}}},required:['note','missing_information','review_warnings'],additionalProperties:false};
const error=(message,status=502)=>Object.assign(new Error(message),{status});
const cleanModel=(value,fallback)=>/^[a-zA-Z0-9_./-]{3,100}$/.test(String(value||''))?String(value):fallback;
export const AI_PROVIDERS=Object.freeze({groq:'Groq · GPT-OSS',gemini:'Google · Gemini'});
export function normalizeAIResult(raw,provider){
 const data=typeof raw==='string'?JSON.parse(raw):raw;
 if(!data||typeof data.note!=='string'||!data.note.trim()||data.note.length>24000)throw error(`${AI_PROVIDERS[provider]||'IA'} devolvió un borrador vacío o inválido.`);
 const arr=v=>Array.isArray(v)?v.filter(x=>typeof x==='string').slice(0,15).map(s=>s.slice(0,400)):[];
 return {note:data.note.trim(),missing:arr(data.missing_information),warnings:arr(data.review_warnings)};
}
export function createAIEngine(config={}){
 const groqKey=String(config.groqKey??process.env.GROQ_API_KEY??'').trim();
 const geminiKey=String(config.geminiKey??process.env.GEMINI_API_KEY??'').trim();
 const groqModel=cleanModel(config.groqModel??process.env.GROQ_MODEL,'openai/gpt-oss-120b');
 const geminiModel=cleanModel(config.geminiModel??process.env.GEMINI_MODEL,'gemini-3.5-flash-lite');
 const available=[...(groqKey?[{id:'groq',label:'Groq · GPT-OSS 120B',model:groqModel}]:[]),...(geminiKey?[{id:'gemini',label:'Gemini · Google',model:geminiModel}]:[])];
 const configuredDefault=config.defaultProvider??process.env.TORA_AI_DEFAULT;
 const defaultProvider=available.some(p=>p.id===configuredDefault)?configuredDefault:available[0]?.id||null;
 const configured=(id)=>available.find(p=>p.id===id);
 const status=()=>({aiConfigured:Boolean(available.length),providers:available,defaultProvider,model:configured(defaultProvider)?.model||null,provider:defaultProvider?(defaultProvider==='gemini'?'Gemini':'Groq'):null});
 async function generate(system,payload,{provider,maxTokens=3500}={}){
  const selected=provider||defaultProvider;
  const found=configured(selected);
  if(!found)throw error(selected?`El proveedor «${selected}» no está configurado en Render.`:'No hay IA configurada. Agrega GROQ_API_KEY o GEMINI_API_KEY en Render.',503);
  const fetcher=config.fetchImpl||globalThis.fetch;
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),65000);
  let response;
  try{
   if(selected==='groq'){
    response=await fetcher(GROQ_ENDPOINT,{method:'POST',signal:controller.signal,headers:{Authorization:`Bearer ${groqKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:groqModel,messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(payload)}],temperature:0.2,max_completion_tokens:maxTokens,reasoning_effort:'low',stream:false,response_format:{type:'json_schema',json_schema:{name:'tora_clinical_draft',strict:true,schema:STRUCTURED_SCHEMA}}})});
   }else{
    response=await fetcher(`${GOOGLE_ENDPOINT}${encodeURIComponent(geminiModel)}:generateContent`,{method:'POST',signal:controller.signal,headers:{'x-goog-api-key':geminiKey,'Content-Type':'application/json'},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:JSON.stringify(payload)}]}],generationConfig:{maxOutputTokens:maxTokens,temperature:0.2,responseMimeType:'application/json',responseSchema:{type:'OBJECT',properties:{note:{type:'STRING'},missing_information:{type:'ARRAY',items:{type:'STRING'}},review_warnings:{type:'ARRAY',items:{type:'STRING'}}},required:['note','missing_information','review_warnings'],propertyOrdering:['note','missing_information','review_warnings']}}})});
   }
   if(!response.ok){
    const name=selected==='groq'?'Groq':'Gemini';
    if(response.status===429)throw error(`${name} alcanzó el límite gratuito de solicitudes. Cambia de proveedor o inténtalo más tarde.`,429);
    if([401,403].includes(response.status))throw error(`${name} rechazó la clave API o el acceso. Revisa la configuración en Render.`,502);
    if(response.status===404)throw error(`El modelo configurado en ${name} no está disponible. Revisa su identificador en Render.`,502);
    if(response.status===400)throw error(`${name} rechazó la solicitud. Comprueba el modelo y el formato estructurado.`,502);
    throw error(`Error de ${name} (HTTP ${response.status}).`);
   }
   const raw=await response.json();
   let content;
   if(selected==='groq')content=raw?.choices?.[0]?.message?.content;
   else content=(raw?.candidates||[]).flatMap(c=>(c.content?.parts||[]).map(x=>typeof x.text==='string'?x.text:'')).join('\n').trim();
   if(!content)throw error(`${AI_PROVIDERS[selected]} no devolvió texto. Revisa el modelo o la cuota.`);
   let parsed;try{parsed=normalizeAIResult(content,selected)}catch(e){if(e instanceof SyntaxError)throw error(`${AI_PROVIDERS[selected]} devolvió una respuesta no estructurada.`);throw e}
   return {...parsed,aiProvider:selected,aiModel:found.model};
  }catch(e){if(e.name==='AbortError')throw error(`${AI_PROVIDERS[selected]} excedió el tiempo de respuesta.`,504);throw e}
  finally{clearTimeout(timer)}
 }
 return {generate,status,defaultProvider};
}

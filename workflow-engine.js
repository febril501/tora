import {FLOW_SPECIALTIES,DOC_TYPES} from './workflow-config.js';
import {scanSensitive,validateProfile} from './engine.js';
import {validateClinicalFormat} from './clinical-formats.js';
import {validateMentalExam,mentalExamFacts} from './mental-exam.js';

const strip=s=>typeof s==='string'?s.trim():'';
const MAX_NOTE=2200;
export const PEDIATRIC_EXTRA_VITAL_FIELDS=[['fio2','FiO₂','%']];
export const VITAL_FIELDS=[['pa','PA','mmHg'],['fc','FC','lpm'],['fr','FR','rpm'],['temp','T°','°C'],['sat','SatO₂','%']];
export function vitalSignsText(vitals={}){return VITAL_FIELDS.filter(([key])=>String(vitals?.[key]||'').trim()).map(([key,label,unit])=>`${label} ${String(vitals[key]).trim()} ${unit}`).concat(String(vitals?.fio2||'').trim()?[`FiO₂ ${String(vitals.fio2).trim()} %`]:[]).join(', ')}
export function presentSection(section,original){
  // Coincidencias SOLO orientativas. No transformarlas automáticamente en hallazgos de hoy.
  if(!strip(original))return [];
  const fragment=original.split(/(?<=[.;\n])\s+/).map(v=>v.trim()).filter(v=>v.length>8);
  const words=section.keywords||[];
  return fragment.filter(p=>words.some(w=>p.toLocaleLowerCase('es').includes(w.toLocaleLowerCase('es')))).slice(0,3).map(s=>s.slice(0,350));
}
export function emptyWorkflow(specialty='interna',docType='diaria'){
  if(!FLOW_SPECIALTIES[specialty])specialty='interna';
  if(!DOC_TYPES[docType])docType='diaria';
  return {specialty,docType,previous:'',general:'',sections:FLOW_SPECIALTIES[specialty].sections.map(s=>({id:s.id,status:'pendiente',notes:'',selected:[],source:'no_precisada'})),obstetrics:{pregnancy:'no_informado',gestas:'',partos:'',perdidas:'',cesareas:'',vivos:'',fur:'',eg:'',fpp:''},trauma:{region:'rodilla',side:'no_informado',maneuver:'',result:''},custom:[],mentalExam:[],vitals:{pa:'',fc:'',fr:'',temp:'',sat:'',fio2:''},pediatrics:{age:'',weightKg:'',feedingRoute:'no_informado'},clinicalFormat:null,format:'adaptable',profile:null};
}
export function validateWorkflow(input){
  if(!input||typeof input!=='object'||!FLOW_SPECIALTIES[input.specialty]||!DOC_TYPES[input.docType])throw Error('Especialidad o modalidad inválida.');
  const spec=FLOW_SPECIALTIES[input.specialty];
  const previous=strip(input.previous),general=strip(input.general);
  if(previous.length>12000||general.length>7000)throw Error('Texto demasiado extenso.');
  const allowed=new Map(spec.sections.map(s=>[s.id,s]));
  if(!Array.isArray(input.sections)||input.sections.length>spec.sections.length+4)throw Error('Apartados inválidos.');
  const statuses=['pendiente','cambio','igual','nuevo'];
  const sourceChoices=['no_precisada','observado','referido','documentado'];
  const seen=new Set();const sections=[];
  for(const item of input.sections){
    if(!item||!allowed.has(item.id)||seen.has(item.id))throw Error('Apartado desconocido o duplicado.');
    seen.add(item.id);const definition=allowed.get(item.id);
    if(!statuses.includes(item.status))throw Error('Estado de apartado inválido.');
    const notes=strip(item.notes);if(notes.length>MAX_NOTE)throw Error('Observación demasiado extensa.');
    const selected=Array.isArray(item.selected)?item.selected.filter(v=>typeof v==='string'&&definition.quick.includes(v)).slice(0,8):[];
    const source=sourceChoices.includes(item.source)?item.source:'no_precisada';
    if(item.status==='pendiente'&&(notes||selected.length))throw Error('Un apartado no evaluado no puede registrar hallazgos actuales.');
    // Sin cambios no autoriza copiar datos previos por omisión. Se requiere especificar hallazgo.
    if(item.status==='igual'&&!notes&&!selected.length)throw Error(`En «${definition.label}», especifica el hallazgo confirmado hoy o marca No evaluado.`);
    if(item.status!=='pendiente'&&!notes&&!selected.length)throw Error(`Describe el hallazgo actual en «${definition.label}».`);
    sections.push({id:item.id,label:definition.label,status:item.status,notes,selected,source,priorClues:input.docType==='diaria'?presentSection(definition,previous):[]});
  }
  let obs=null;
  if(input.specialty==='ginecologia'){
    const src=input.obstetrics||{};
    const pregnancy=['si','no','no_informado'].includes(src.pregnancy)?src.pregnancy:'no_informado';
    obs={pregnancy};
    for(const k of ['gestas','partos','perdidas','cesareas','vivos']){
      const value=strip(src[k]);if(value&&!/^(?:0|[1-9]\d{0,2})$/.test(value))throw Error('Los antecedentes ginecoobstétricos deben ser números enteros no negativos.');
      obs[k]=value;
    }
    for(const k of ['fur','eg','fpp'])obs[k]=strip(src[k]).slice(0,80);
    if(pregnancy!=='si'){obs.eg='';obs.fpp='';}
  }
  let trauma=null;
  if(input.specialty==='traumatologia'){
    const src=input.trauma||{};
    trauma={region:['rodilla','hombro','tobillo','cadera','columna','otra'].includes(src.region)?src.region:'otra',side:['derecha','izquierda','bilateral','no_informado'].includes(src.side)?src.side:'no_informado',maneuver:strip(src.maneuver).slice(0,70),result:strip(src.result).slice(0,200)};
    if(trauma.maneuver&&!trauma.result)throw Error('Para registrar una maniobra, especifica el resultado confirmado.');
  }
  if(!Array.isArray(input.custom)||input.custom.length>4)throw Error('Máximo cuatro apartados personalizados.');
  const custom=input.custom.map((s,i)=>({id:'personal_'+i,label:strip(s.label).slice(0,65),status:statuses.includes(s.status)?s.status:'pendiente',notes:strip(s.notes).slice(0,MAX_NOTE),source:sourceChoices.includes(s.source)?s.source:'no_precisada'}));
  if(custom.some(s=>!s.label||s.status==='pendiente'&&s.notes||s.status!=='pendiente'&&!s.notes))throw Error('Revisa los apartados personalizados y sus observaciones.');
  const mentalExam=input.specialty==='psiquiatria'?validateMentalExam(input.mentalExam):[];
  const vitals={pa:'',fc:'',fr:'',temp:'',sat:''};
  if(input.specialty==='pediatria')vitals.fio2='';
  if(input.specialty!=='psiquiatria'){
   const raw=input.vitals||{};
   if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Signos vitales inválidos.');
   for(const key of Object.keys(vitals)){
    const value=strip(raw[key]);
    if(value.length>18||value&&!((key==='pa'&&/^\d{1,3}\/\d{1,3}$/.test(value))||(key==='temp'&&/^\d{1,2}(?:[.,]\d)?$/.test(value))||((key==='sat'||key==='fio2')&&/^\d{1,3}(?:[.,]\d)?$/.test(value)&&Number(value.replace(',','.'))<=100)||(key==='fc'||key==='fr')&&/^\d{1,3}$/.test(value)))throw Error(`Valor inválido de signo vital: ${key}.`);
    vitals[key]=value;
   }
  }
  let pediatrics=null;
  if(input.specialty==='pediatria'){
   const raw=input.pediatrics||{};
   const age=strip(raw.age),weightKg=strip(raw.weightKg),feedingRoute=strip(raw.feedingRoute)||'no_informado';
   if(age.length>60||weightKg.length>12)throw Error('Datos pediátricos demasiado extensos.');
   if(weightKg&&(!/^(?:\d{1,3})(?:[.,]\d{1,3})?$/.test(weightKg)||Number(weightKg.replace(',','.'))<=0))throw Error('Peso pediátrico inválido. Ingresa kg con decimales si corresponde.');
   if(!['no_informado','oral','sng','gtt','oral_gtt','oral_sng'].includes(feedingRoute))throw Error('Vía de alimentación inválida.');
   pediatrics={age,weightKg,feedingRoute};
  }
  const pedData=pediatricFactsText(pediatrics);
  const obsData=obs?Object.entries(obs).filter(([k,v])=>Boolean(v)&&v!=='no_informado').map(([k,v])=>`${k}: ${v}`).join(' '):'';
  const traumaData=trauma&&(trauma.result||trauma.side!=='no_informado')?[trauma.region,trauma.side!=='no_informado'?trauma.side:'',trauma.maneuver,trauma.result].join(' '):'';
  const info=[general,...sections.flatMap(s=>[s.notes,...s.selected]),...custom.map(s=>s.notes),mentalExamFacts(mentalExam),vitalSignsText(vitals),obsData,traumaData,pedData].join(' ').trim();
  if(info.length<12)throw Error('Escribe al menos un hallazgo actual o información del ingreso/control.');
  if(input.docType==='diaria'&&!previous)throw Error('Pega la evolución anterior para actualizarla; si no tienes una evolución previa, selecciona Nueva evolución.');
  if(input.docType==='diaria'&&!general&&!mentalExam.length&&!sections.some(s=>s.status!=='pendiente')&&!custom.some(s=>s.status!=='pendiente')&&!obsData&&!traumaData&&!vitalSignsText(vitals)&&!pedData)throw Error('Registra al menos un cambio o hallazgo del día.');
  const allText=[previous,info,typeof input.profile?.instruction==='string'?input.profile.instruction:''].join('\n');
  const hazards=scanSensitive(allText);if(hazards.length)throw Error('Posibles identificadores detectados: '+hazards.join(', ')+'. Usa solo casos ficticios.');
  const format=['adaptable','narrativo','sistemas','problemas'].includes(input.format)?input.format:'adaptable';
  const clinicalFormat=input.clinicalFormat?validateClinicalFormat(input.clinicalFormat,input.specialty):null;
  const profile=validateProfile(input.profile,input.specialty);
  return {specialty:input.specialty,specialtyName:spec.name,docType:input.docType,docTypeName:DOC_TYPES[input.docType].label,previous:input.docType==='diaria'?previous:'',general,sections,obstetrics:obs,trauma,custom,mentalExam,vitals,pediatrics,clinicalFormat,format,profile};
}
const FEEDING_ROUTES={oral:'Oral',sng:'SNG',gtt:'GTT',oral_gtt:'Oral y GTT',oral_sng:'Oral y SNG'};
export function pediatricFactsText(p){
 if(!p)return '';
 return [['Edad',p.age],['Peso',p.weightKg?`${p.weightKg} kg`:null],['Vía de alimentación',FEEDING_ROUTES[p.feedingRoute]]].filter(([,v])=>v).map(([label,value])=>`${label}: ${value}`).join(' · ');
}
export function workflowFindings(data){
 const warnings=[],missing=[];
 if(data.docType==='diaria'&&data.previous){
   for(const part of data.sections.filter(s=>s.status==='pendiente'&&s.priorClues.length))missing.push(`${part.label}: hay datos en la evolución anterior sin reevaluación documentada.`);
 }
 for(const part of [...data.sections,...data.custom]){
   if(part.status==='pendiente')continue;
   if(part.status==='igual'&&!part.notes&&!part.selected?.length)warnings.push(`${part.label}: no se detalló lo confirmado.`);
   if(part.source==='no_precisada')warnings.push(`${part.label}: no se precisó si es referido, observado o documentado.`);
 }
 if(data.specialty==='psiquiatria'&&!data.mentalExam?.some(s=>s.id==='riesgo')&&!data.sections.some(s=>s.id==='riesgo'&&s.status!=='pendiente'))missing.push('Suicidalidad: exploración actual no registrada; nunca interpretar como negativa por omisión.');
 if(data.specialty==='ginecologia'&&data.obstetrics?.pregnancy==='si'&&!data.obstetrics.eg)missing.push('Gestación actual: edad gestacional no informada.');
 if(data.specialty==='traumatologia'&&data.trauma?.maneuver&&!data.trauma.result)warnings.push('Maniobra consignada sin resultado.');
 return {warnings,missing};
}
export function workflowLocalDraft(data){
 if(data.clinicalFormat?.headings?.length){
  const headings=data.clinicalFormat.headings;
  const bucket=new Map(headings.map(h=>[h,[]]));
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const choose=(words)=>headings.find(h=>words.some(word=>norm(h).includes(word)))||null;
  const add=(head,text)=>{if(!text)return;const h=head||choose(['evolucion','hallazg','evaluacion','motivo'])||headings[0];bucket.get(h).push(text)};
  add(choose(data.specialty==='pediatria'?['subjetivo']:['evolucion del dia','evolucion y hallazg','motivo de evaluacion']),data.general);
  if(data.specialty==='pediatria')add(choose(['subjetivo']),pediatricFactsText(data.pediatrics));
  add(choose(['signos vital','vitales','csv']),vitalSignsText(data.vitals));
  if(data.obstetrics){const values=Object.entries(data.obstetrics).filter(([k,v])=>v&&v!=='no_informado'&&k!=='pregnancy').map(([k,v])=>k+': '+v);add(choose(['gineco','obstetric','antecedent']),values.join(' · '))}
  if(data.trauma&&(data.trauma.result||data.trauma.side!=='no_informado'))add(choose(['examen','musculo','traumato']),[data.trauma.region,data.trauma.side!=='no_informado'?data.trauma.side:'',data.trauma.maneuver,data.trauma.result].filter(Boolean).join(' · '));
  for(const m of data.mentalExam||[]){let preferred;
   if(['consciencia','apariencia'].includes(m.id))preferred=choose(['presentacion','conciencia']);
   else if(['actitud','psicomotricidad'].includes(m.id))preferred=choose(['actitud','psicomotricidad']);
   else if(['animo','afectividad'].includes(m.id))preferred=choose(['animo','afectividad']);
   else if(m.id.startsWith('pensamiento')||m.id==='lenguaje')preferred=choose(['pensamiento','lenguaje']);
   else if(m.id==='sensopercepcion')preferred=choose(['sensopercep']);
   else if(['insight','juicio'].includes(m.id))preferred=choose(['insight','juicio']);
   else if(m.id==='riesgo')preferred=choose(['riesgo']);
   add(preferred,mentalExamFacts([m]));
  }
  for(const section of [...data.sections,...data.custom])if(section.status!=='pendiente'){
   const match=data.specialty==='pediatria'?({'Tórax / cardiopulmonar':['torax'],'Neurológico y desarrollo':['neurologico'] ,'Dispositivos y accesos':['general']})[section.label]:null;
   add(choose(match||[norm(section.label)]),[...(section.selected||[]),section.notes].filter(Boolean).join(' · '));
  }
  const text=headings.map(h=>{const content=bucket.get(h).join('\n');return content?`${h.toUpperCase()}\n${content}`:h.toUpperCase()}).join('\n\n').trim();
  return {note:text,...workflowFindings(data)};
 }
 const title=`${data.docTypeName.toUpperCase()} · ${data.specialtyName.toUpperCase()}`;
 const lines=[title];
 if(data.clinicalFormat?.headings?.length)lines.push('\nESTRUCTURA PREFERIDA (REVISAR Y ORGANIZAR MANUALMENTE)\n'+data.clinicalFormat.headings.join(' · '));
 // El borrador local nunca copia los datos anteriores; solo los cambios actuales confirmados.
 if(data.docType==='diaria')lines.push('\n[La evolución anterior se utilizó únicamente para la revisión comparativa; no se incorpora aquí como exploración actual.]');
 if(data.general)lines.push('\nNOVEDADES REGISTRADAS HOY\n'+data.general);
 if(data.obstetrics&&Object.values(data.obstetrics).some(v=>v&&v!=='no_informado')){
   const p=data.obstetrics;const values=[['Gestas',p.gestas],['Partos',p.partos],['Pérdidas',p.perdidas],['Cesáreas',p.cesareas],['Hijos vivos',p.vivos],['FUR',p.fur],['EG',p.eg],['FPP',p.fpp]].filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`);
   if(p.pregnancy!=='no_informado')values.unshift(`Gestación actual declarada: ${p.pregnancy==='si'?'sí':'no'}`);
   if(values.length)lines.push('\nANTECEDENTES DECLARADOS\n'+values.join(' · '));
 }
 if(data.trauma&&(data.trauma.result||data.trauma.side!=='no_informado')){
   lines.push('\nLOCALIZACIÓN / MANIOBRA\n'+`Región: ${data.trauma.region}`+(data.trauma.side!=='no_informado'?` · Lado: ${data.trauma.side}`:'')+(data.trauma.result?` · ${data.trauma.maneuver}: ${data.trauma.result}`:''));
 }
 if(vitalSignsText(data.vitals))lines.push('\nSIGNOS VITALES ACTUALES\n'+vitalSignsText(data.vitals));
 if(data.specialty==='pediatria'&&pediatricFactsText(data.pediatrics))lines.push('\nDATOS PEDIÁTRICOS\n'+pediatricFactsText(data.pediatrics));
 if(data.mentalExam?.length)lines.push('\nEXAMEN MENTAL · HALLAZGOS CONSIGNADOS\n'+mentalExamFacts(data.mentalExam));
 for(const s of [...data.sections,...data.custom]){
   if(s.status==='pendiente')continue;
   const pieces=[...(s.selected||[]),s.notes].filter(Boolean);
   lines.push(`\n${s.label.toUpperCase()} [${s.status==='igual'?'REEVALUADO SIN CAMBIOS':s.status==='cambio'?'CAMBIÓ':'NUEVO'}]`+'\n'+pieces.join('. ')+(s.source==='no_precisada'?'':'\nFuente: '+s.source));
 }
 const {warnings,missing}=workflowFindings(data);
 if(missing.length)lines.push('\nPOR REEVALUAR (NO INCORPORADO COMO HALLAZGO ACTUAL)\n'+missing.join('\n'));
 return {note:lines.join('\n').trim(),warnings,missing};
}

// TORA · Formatos personales, exclusivamente instrucciones de ESTRUCTURA.
// Nunca almacenar evoluciones de pacientes, solo títulos y convenciones de redacción.
import {FLOW_SPECIALTIES} from './workflow-config.js';
import {scanSensitive} from './engine.js';
export const FORMAT_VERSION=1;
export const FORMAT_KEY_PREFIX='tora:v08:formatos:';
const DEFAULT_HEADINGS=['Identificación','Antecedentes mórbidos','Evolución del día','Signos vitales','Examen físico','Problemas y planes'];
const GENERAL_HEADINGS=['Identificación','Motivo de evaluación','Antecedentes relevantes','Evolución y hallazgos','Examen clínico','Problemas y planes'];
const PED_CONIN_HEADINGS=['SUBJETIVO','OBJETIVO','CSV','GENERAL','PIEL','CABEZA Y CUELLO','TÓRAX','ABDOMEN','GENITOURINARIO','EXTREMIDADES','NEUROLÓGICO','APRECIACIÓN DIAGNÓSTICA','PLANES'];
const PSY_HEADINGS=['Presentación y conciencia','Actitud y psicomotricidad','Ánimo y afectividad','Lenguaje y pensamiento','Sensopercepción','Insight y juicio de realidad','Riesgo y plan'];
export function defaultFormat(specialty='interna') {
 const headings=specialty==='pediatria'?PED_CONIN_HEADINGS:specialty==='psiquiatria'?PSY_HEADINGS:specialty==='interna'?DEFAULT_HEADINGS:GENERAL_HEADINGS;
 const instruction=specialty==='pediatria'?'Formato SOAP CONIN: S fuente y evolución referida; O solo examen actual y CSV; A apreciación documentada; P planes confirmados. No completar normalidades ni repetir hallazgos anteriores como actuales.':'Redacción médica formal, con frases completas y sin agregar hallazgos no evaluados.';
 return {version:FORMAT_VERSION,specialty,name:specialty==='pediatria'?'Pediatría · SOAP CONIN':'Mi formato de '+(FLOW_SPECIALTIES[specialty]?.name||'evolución'),headings:[...headings],instruction,updatedAt:null};
}
export function validateClinicalFormat(format,specialty){
 if(!FLOW_SPECIALTIES[specialty])throw Error('Especialidad de formato inválida.');
 if(!format||typeof format!=='object'||Array.isArray(format)||format.specialty!==specialty)throw Error('Formato incompatible con la especialidad.');
 if(!Array.isArray(format.headings)||format.headings.length<2||format.headings.length>18)throw Error('Incluye entre 2 y 18 apartados.');
 const headings=format.headings.map(s=>String(s||'').trim());
 if(headings.some(s=>s.length<2||s.length>75)||new Set(headings.map(s=>s.toLocaleLowerCase('es'))).size!==headings.length)throw Error('Los títulos deben ser únicos (2 a 75 caracteres).');
 const instruction=String(format.instruction||'').trim();
 const name=String(format.name||'').trim();
 if(instruction.length>700||name.length>90)throw Error('Instrucción o nombre demasiado largo.');
 const hazards=scanSensitive([headings.join('\n'),instruction,name].join('\n'));
 if(hazards.length)throw Error('El formato parece contener datos identificables. Guarda solo títulos y reglas, nunca información clínica de pacientes.');
 return {version:FORMAT_VERSION,specialty,name:name||'Mi formato',headings,instruction,updatedAt:typeof format.updatedAt==='string'?format.updatedAt:null};
}
export function parseFormatHeadings(example){
 const lines=String(example||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 const out=[];
 for(const line of lines){
   if(line.length>200)continue;
   // Conservar únicamente la ETIQUETA (antes de los dos puntos); jamás guardar los valores.
   // Soporta «Signos vitales: PA, FC...» y «IDENTIFICACIÓN» sin contenido.
   const cleaned=line.replace(/^(?:[-*•]\s*|\d{1,2}[.)]\s*)/u,'');
   const match=cleaned.match(/^([\p{L}][\p{L}\p{N} ,.()/-]{1,72}?)\s*:\s*(?:.*)$/u);
   const heading=match?.[1]||(/^[\p{L}\p{N} ,./()-]{2,72}$/u.test(cleaned)&&cleaned===cleaned.toLocaleUpperCase('es')?cleaned:null);
   if(heading){const title=heading.trim();if(title.length>1&&!out.some(x=>x.toLocaleLowerCase('es')===title.toLocaleLowerCase('es')))out.push(title)}
 }
 return out.slice(0,18);
}
export function userFormatsKey(user='local') {return FORMAT_KEY_PREFIX+String(user).replace(/[^a-zA-Z0-9_.-]/g,'').slice(0,30)}
export function loadFormat(specialty,user='local',storage=typeof localStorage==='undefined'?null:localStorage){
 try{const raw=JSON.parse(storage?.getItem(userFormatsKey(user))||'{}');return raw[specialty]?validateClinicalFormat(raw[specialty],specialty):defaultFormat(specialty)}catch{return defaultFormat(specialty)}
}
export function saveFormat(format,user='local',storage=typeof localStorage==='undefined'?null:localStorage){
 const valid=validateClinicalFormat(format,format?.specialty);if(!storage)throw Error('Almacenamiento local no disponible.');
 let all={};try{all=JSON.parse(storage.getItem(userFormatsKey(user))||'{}')}catch{}
 all[valid.specialty]={...valid,updatedAt:new Date().toISOString()};storage.setItem(userFormatsKey(user),JSON.stringify(all));return all[valid.specialty];
}

// Garantiza la presencia y el orden de los títulos del formato personal.
// No agrega hechos clínicos: las secciones no encontradas quedan vacías.
export function ensureFormatHeadings(note,format){
 const raw=String(note||'').trim();
 const headings=format?.headings;
 if(!Array.isArray(headings)||!headings.length)return raw;
 // Sección si Gemini usó encabezados exactos; no reutilizar texto de un apartado
 // no identificable en otro. Si no se hallan encabezados, dejar el texto original
 // como nota adicional explícita, sin atribuirlo a un campo incorrecto.
 const normalized=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[*_#:\s]+/g,' ').trim();
 const lines=raw.split(/\r?\n/);const found=new Map();let active=null,unclassified=[];
 for(const line of lines){
  const cleaned=line.trim().replace(/^#{1,4}\s*/,'').replace(/\*\*/g,'');
  const colon=cleaned.indexOf(':');
  const candidate=(colon>=0?cleaned.slice(0,colon):cleaned).trim();
  const match=headings.find(h=>normalized(h)===normalized(candidate));
  if(match){
   active=match;if(!found.has(match))found.set(match,[]);
   if(colon>=0&&cleaned.slice(colon+1).trim())found.get(match).push(cleaned.slice(colon+1).trim());
   continue;
  }
  if(active)found.get(active).push(line);
  else if(line.trim())unclassified.push(line);
 }
 const parts=headings.map(h=>{const value=(found.get(h)||[]).join('\n').trim();return value?`${h.toUpperCase()}\n${value}`:h.toUpperCase()});
 if(unclassified.length)parts.push('TEXTO SIN APARTADO IDENTIFICADO\n'+unclassified.join('\n').trim());
 return parts.join('\n\n').trim();
}

// TORA 1.2 — Los datos medidos o declarados en el formulario NO dependen de la IA.
// Se insertan en los apartados propios del usuario, conservando el orden de encabezados.
import {vitalSignsText} from './workflow-engine.js';
const normalizeTitle=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const isIdentical=(actual,expected)=>normalizeTitle(actual)===normalizeTitle(expected);
const escapeRegExp=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const OB_FIELDS=[['gestas','Gestas'],['partos','Partos'],['perdidas','Pérdidas'],['cesareas','Cesáreas'],['vivos','Hijos vivos'],['fur','FUR'],['eg','Edad gestacional'],['fpp','FPP']];
export function obstetricFactsText(obstetrics){
 if(!obstetrics)return '';
 const fields=OB_FIELDS.filter(([key])=>String(obstetrics[key]??'').trim()).map(([key,label])=>`${label}: ${String(obstetrics[key]).trim()}`);
 if(obstetrics.pregnancy==='si')fields.unshift('Gestación actual: sí (confirmada)');
 if(obstetrics.pregnancy==='no')fields.unshift('Gestación actual: no (confirmada)');
 return fields.join(' · ');
}
function addToKnownHeading(note,format,searchWords,facts,fallbackTitle){
 if(!facts.length)return note;
 const headings=format?.headings;
 if(!Array.isArray(headings)||!headings.length){return [note,`${fallbackTitle}\n${facts.join(' · ')}`].filter(Boolean).join('\n\n')}
 const target=headings.find(h=>searchWords.some(w=>normalizeTitle(h).includes(w))) || headings.find(h=>normalizeTitle(h).includes('evolucion')) || headings[0];
 const lines=note.split('\n');
 const start=lines.findIndex(line=>isIdentical(line,target));
 if(start===-1) return [note,`${target.toUpperCase()}\n${facts.join(' · ')}`].filter(Boolean).join('\n\n');
 let end=start+1;
 while(end<lines.length&&!headings.some(h=>isIdentical(lines[end],h)))end++;
 const existing=lines.slice(start+1,end).join('\n');
 const newFacts=facts.filter(f=>!existing.includes(f));
 if(!newFacts.length)return note;
 if(end>start+1&&lines[end-1]==='')end--;
 lines.splice(end,0,newFacts.join(' · '));
 return lines.join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
export function ensureClinicalFacts(note,workflow){
 if(!workflow||typeof workflow!=='object')return String(note||'').trim();
 let text=String(note||'').trim();
 const fields=workflow.vitals||{};
 const measures=[['pa','PA','\\d{1,3}\\s*\\/\\s*\\d{1,3}','mmHg'],['fc','FC','\\d{1,3}','lpm'],['fr','FR','\\d{1,3}','rpm'],['temp','T(?:°|emperatura)?','\\d{1,2}(?:[.,]\\d)?','°C'],['sat','SatO[₂2]','\\d{1,3}(?:[.,]\\d)?','%']];
 const lines=[];
 for(const [key,label,numberPattern,unit] of measures){
  const v=String(fields[key]||'').trim();if(!v)continue;
  const pretty=key==='temp'?'T°':key==='sat'?'SatO₂':label;
  const canonical=`${pretty} ${v} ${unit}`;
  // Si la IA puso otro valor para esta MISMA medición estructurada, sustituirlo por el registrado.
  const existing=new RegExp(`\\b${label}\\s*[:=]?\\s*${numberPattern}\\s*(?:${escapeRegExp(unit)})?`,'gi');
  text=text.replace(existing,canonical);
  if(!text.includes(canonical))lines.push(canonical);
 }
 const fullVitals=vitalSignsText(fields);
 if(fullVitals&&lines.length)text=addToKnownHeading(text,workflow.clinicalFormat,['signos vital','vitales','constantes'],lines,'SIGNOS VITALES ACTUALES');
 if(workflow.specialty==='ginecologia'){
  const obs=workflow.obstetrics||{};
  const missing=[];
  for(const [key,label] of OB_FIELDS){
   const value=String(obs[key]??'').trim();if(!value)continue;
   const fact=`${label}: ${value}`;
   const valuePattern=['gestas','partos','perdidas','cesareas','vivos'].includes(key)?'\\d{1,3}':'[^\\s·;,\\n]{1,30}';
   const matcher=new RegExp(`${escapeRegExp(label)}\\s*:\\s*${valuePattern}`,'gi');
   text=text.replace(matcher,m=>m===fact?m:fact);
   if(!text.includes(fact))missing.push(fact);
  }
  if(obs.pregnancy==='si'&&!/Gestación actual:\s*sí\s*\(confirmada\)/i.test(text))missing.unshift('Gestación actual: sí (confirmada)');
  if(obs.pregnancy==='no'&&!/Gestación actual:\s*no\s*\(confirmada\)/i.test(text))missing.unshift('Gestación actual: no (confirmada)');
  if(missing.length)text=addToKnownHeading(text,workflow.clinicalFormat,['gineco','obstetric','antecedent'],missing,'ANTECEDENTES GINECOOBSTÉTRICOS');
 }
 return text.trim();
}

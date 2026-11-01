import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIEngine,normalizeAIResult} from '../ai-engine.js';
import {ensureClinicalFacts,ensureFormatHeadings} from '../format-output.js';
import {emptyWorkflow,validateWorkflow} from '../workflow-engine.js';
import {defaultFormat} from '../clinical-formats.js';

const payload={specialty:'interna',general:'Paciente ficticio con disnea referida hoy, PA 120/80 mmHg.',previous:''};
const response={note:'Paciente ficticio refiere disnea.',missing_information:[],review_warnings:[]};
const fakeGroq=(url,options)=>{
 assert.equal(String(url),'https://api.groq.com/openai/v1/chat/completions');
 assert.match(options.headers.Authorization,/^Bearer test-only-groq-key$/);
 const d=JSON.parse(options.body);
 assert.equal(d.model,'openai/gpt-oss-120b');
 assert.equal(d.response_format.type,'json_schema');
 assert.equal(d.response_format.json_schema.strict,true);
 assert.equal(d.response_format.json_schema.schema.required.length,3);
 return Promise.resolve(new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(response)}}]}),{status:200}));
};
test('IA configurable: Groq por defecto y Gemini como alternativa',async()=>{
 const sent=[];const engine=createAIEngine({groqKey:'test-only-groq-key',geminiKey:'test-only-gemini-key',fetchImpl:async(u,o)=>{
   if(String(u).includes('api.groq.com'))return fakeGroq(u,o);
   sent.push({u:String(u),o});return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(response)}]}}]}),{status:200});
 }});
 assert.equal(engine.status().defaultProvider,'groq');
 assert.equal(engine.status().providers.length,2);
 const a=await engine.generate('Eres redactor clínico. Devuelve JSON',payload,{maxTokens:3200});
 assert.equal(a.aiProvider,'groq');assert.equal(a.aiModel,'openai/gpt-oss-120b');
 const b=await engine.generate('Eres redactor clínico. Devuelve JSON',payload,{provider:'gemini'});
 assert.equal(b.aiProvider,'gemini');assert.equal(sent.length,1);
 assert.equal(JSON.parse(sent[0].o.body).generationConfig.responseMimeType,'application/json');
 assert.ok(!JSON.stringify(a).includes('test-only-groq-key'));
});
test('sin Groq, Gemini sigue funcionando y no se revela su clave',()=>{
 const e=createAIEngine({groqKey:'',geminiKey:'test-only-gemini-key'});
 assert.equal(e.status().defaultProvider,'gemini');assert.equal(e.status().provider,'Gemini');
 assert.equal(e.status().providers.length,1);
 assert.ok(!JSON.stringify(e.status()).includes('test-only-gemini-key'));
});
test('proveedor no configurado: falla sin cambiar silenciosamente a otro',async()=>{
 const e=createAIEngine({groqKey:'',geminiKey:'test-only-gemini-key'});
 await assert.rejects(()=>e.generate('test',payload,{provider:'groq'}),/no está configurado/);
});
test('429 Groq indica cuota sin filtrar mensajes del proveedor',async()=>{
 const e=createAIEngine({groqKey:'test-only-groq-key',geminiKey:'',fetchImpl:async()=>new Response('{"error":"test-only-groq-key"}',{status:429})});
 await assert.rejects(()=>e.generate('test',payload),e=>e.status===429&&/límite gratuito/i.test(e.message)&&!e.message.includes('test-only'));
});
test('respuestas estructuradas: no se aceptan notas vacías',()=>{
 assert.throws(()=>normalizeAIResult({note:'',missing_information:[],review_warnings:[]},'groq'),/vacío/);
 assert.deepEqual(normalizeAIResult(response,'groq').warnings,[]);
});

test('valores de signos vitales ingresados aparecen obligatoriamente en apartado adecuado',()=>{
 const data=emptyWorkflow('interna','ingreso');data.general='Paciente ficticio refiere mejoría del dolor de rodilla hoy.';
 data.vitals={pa:'120/80',fc:'84',fr:'18',temp:'36,6',sat:'98'};
 data.clinicalFormat=defaultFormat('interna');
 const valid=validateWorkflow(data);
 const doc=ensureClinicalFacts(ensureFormatHeadings('EVOLUCIÓN DEL DÍA\nRefiere menor dolor de rodilla.',valid.clinicalFormat),valid);
 for(const s of ['PA 120/80 mmHg','FC 84 lpm','FR 18 rpm','T° 36,6 °C','SatO₂ 98 %'])assert.ok(doc.includes(s),s);
 assert.ok(doc.indexOf('SIGNOS VITALES')<doc.indexOf('EXAMEN FÍSICO'));
});
test('datos obstétricos G-P-cesáreas se insertan sin inferir sumas',()=>{
 const data=emptyWorkflow('ginecologia','ingreso');data.general='Paciente ficticia en seguimiento por embarazo actualmente confirmado.';
 data.obstetrics={pregnancy:'si',gestas:'3',partos:'1',perdidas:'1',cesareas:'1',vivos:'2',fur:'',eg:'27+4',fpp:''};
 data.clinicalFormat=defaultFormat('ginecologia');const valid=validateWorkflow(data);
 const doc=ensureClinicalFacts(ensureFormatHeadings('EVOLUCIÓN Y HALLAZGOS\nRefiere náuseas desde ayer.',valid.clinicalFormat),valid);
 for(const s of ['Gestas: 3','Partos: 1','Pérdidas: 1','Cesáreas: 1','Hijos vivos: 2','Edad gestacional: 27+4'])assert.ok(doc.includes(s),s);
 assert.ok(!doc.includes('Gestas: 4'));assert.ok(doc.indexOf('ANTECEDENTES RELEVANTES')<doc.indexOf('EVOLUCIÓN Y HALLAZGOS'));
});
test('una medición incorrecta escrita por el modelo se sustituye por valor del formulario',()=>{
 const data=emptyWorkflow('interna','ingreso');data.general='Paciente ficticio consulta por fatiga durante ejercicio.';data.vitals={pa:'120/80',fc:'84'};
 const doc=ensureClinicalFacts('SIGNOS VITALES\nPA 140/90 mmHg, FC 60 lpm.',validateWorkflow(data));
 assert.ok(doc.includes('PA 120/80 mmHg'));assert.ok(doc.includes('FC 84 lpm'));assert.ok(!doc.includes('PA 140/90'));assert.ok(!doc.includes('FC 60'));
});
test('sin datos estructurados no inventa constantes ni gestación',()=>{
 const data=emptyWorkflow('interna','ingreso');data.general='Paciente ficticio refiere mejoría de dolor abdominal.';const valid=validateWorkflow(data);
 assert.equal(ensureClinicalFacts('Evolución: refiere mejoría.',valid),'Evolución: refiere mejoría.');
});
test('Psiquiatría no inserta mediciones de vitals ignoradas por validación',()=>{
 const data=emptyWorkflow('psiquiatria','ingreso');data.general='Paciente ficticio refiere mejoría del sueño durante la última semana.';data.vitals={pa:'120/80',fc:'84'};
 const valid=validateWorkflow(data);const out=ensureClinicalFacts('Ánimo bajo referido.',valid);
 assert.doesNotMatch(out,/120\/80|FC 84|SIGNOS VITALES/);
});
test('encabezados vacíos permanecen en su orden después de insertar medidas',()=>{
 const data=emptyWorkflow('interna','ingreso');data.general='Paciente ficticio en control por disnea de esfuerzo.';data.vitals={pa:'115/70'};
 data.clinicalFormat={...defaultFormat('interna'),headings:['Identificación','Signos vitales','Examen físico','Plan']};
 const valid=validateWorkflow(data);
 const raw=ensureFormatHeadings('IDENTIFICACIÓN\nPersona adulta.',valid.clinicalFormat);const doc=ensureClinicalFacts(raw,valid);
 assert.match(doc,/SIGNOS VITALES\nPA 115\/70 mmHg\n\nEXAMEN FÍSICO\n\nPLAN/);
});

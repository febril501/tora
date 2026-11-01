import test from 'node:test';import assert from 'node:assert/strict';
import {emptyWorkflow} from '../workflow-engine.js';
import {defaultFormat} from '../clinical-formats.js';

test('API integrada Groq y Gemini conserva datos maternos y no expone API keys',async()=>{
 const old={groq:process.env.GROQ_API_KEY,gemini:process.env.GEMINI_API_KEY,default:process.env.TORA_AI_DEFAULT};
 process.env.GROQ_API_KEY='test-only-groq-key';process.env.GEMINI_API_KEY='test-only-gemini-key';process.env.TORA_AI_DEFAULT='groq';
 const {createServer}=await import('../server.js?test=v12-engine');
 for(const [k,v] of Object.entries({GROQ_API_KEY:old.groq,GEMINI_API_KEY:old.gemini,TORA_AI_DEFAULT:old.default}))v===undefined?delete process.env[k]:process.env[k]=v;
 const real=globalThis.fetch;const requested=[];
 const simulated={note:'EVOLUCIÓN Y HALLAZGOS\nPaciente ficticia refiere náuseas de reciente inicio.',missing_information:[],review_warnings:[]};
 globalThis.fetch=async (u,o)=>{
  if(String(u).startsWith('https://api.groq.com/')){requested.push('groq');return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(simulated)}}]}),{status:200})}
  if(String(u).startsWith('https://generativelanguage.googleapis.com/')){requested.push('gemini');return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(simulated)}]}}]}),{status:200})}
  return real(u,o);
 };
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const url=`http://127.0.0.1:${server.address().port}`;
  const status=await (await real(url+'/api/status')).json();assert.equal(status.defaultProvider,'groq');assert.equal(status.providers.length,2);
  const obj=emptyWorkflow('ginecologia','ingreso');obj.general='Caso ficticio: paciente embarazada refiere náuseas matutinas sin otros síntomas relatados.';obj.vitals={pa:'115/70',fc:'79',fr:'17',sat:'97',temp:'36,4'};obj.obstetrics={pregnancy:'si',gestas:'2',partos:'1',perdidas:'0',cesareas:'0',vivos:'1',fur:'',eg:'21+5',fpp:''};obj.clinicalFormat=defaultFormat('ginecologia');
  for(const provider of ['groq','gemini']){
   const r=await real(url+'/api/workflow',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...obj,aiProvider:provider})});
   assert.equal(r.status,200);const data=await r.json();assert.equal(data.aiProvider,provider);
   for(const exact of ['PA 115/70 mmHg','FC 79 lpm','FR 17 rpm','T° 36,4 °C','SatO₂ 97 %','Gestas: 2','Partos: 1','Cesáreas: 0','Edad gestacional: 21+5'])assert.ok(data.note.includes(exact),`${provider} must retain ${exact}`);
   assert.ok(!JSON.stringify(data).includes('test-only-'));
   assert.match(data.note,/IDENTIFICACIÓN/);
  }
  assert.deepEqual(requested,['groq','gemini']);
 }finally{globalThis.fetch=real;await new Promise(r=>server.close(r))}
});

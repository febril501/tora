// Benchmark opt-in de 10 casos ficticios. Ejecutar: TORA_RUN_BENCHMARK=1 node scripts/compare-ai.mjs
// Utiliza cuotas reales de Groq y Gemini. No imprime credenciales, identificadores ni datos reales.
import {createAIEngine} from '../ai-engine.js';
import {FLOW_SYSTEM} from '../server.js';
import {defaultFormat} from '../clinical-formats.js';
import {emptyWorkflow,validateWorkflow} from '../workflow-engine.js';
import {ensureClinicalFacts,ensureFormatHeadings} from '../format-output.js';
if(process.env.TORA_RUN_BENCHMARK!=='1'){console.error('Solo casos ficticios. Para ejecutar conscientemente define TORA_RUN_BENCHMARK=1.');process.exitCode=1}
else {
 const engine=createAIEngine();
 const providers=engine.status().providers.map(x=>x.id);
 if(providers.length<2){console.error('Configura GROQ_API_KEY y GEMINI_API_KEY como variables de entorno del proceso. No compartas esas claves.');process.exitCode=1}
 else{
  const sample=[
   ['interna','Paciente ficticio hospitalizado refiere mejoría de la disnea al caminar hoy.',{pa:'120/80',fc:'82'},['PA 120/80 mmHg','FC 82 lpm']],
   ['ginecologia','Paciente ficticia en control obstétrico refiere náuseas matutinas desde hace dos días.',{pa:'110/70',sat:'98'},['PA 110/70 mmHg','SatO₂ 98 %']],
   ['psiquiatria','Paciente ficticio refiere insomnio de conciliación y menor apetito durante esta semana.',{},[]],
   ['traumatologia','Paciente ficticio refiere dolor en rodilla derecha después de un partido de fútbol.',{fc:'78'},['FC 78 lpm']],
   ['urgencias','Paciente ficticio consulta por dolor abdominal de reciente inicio y náuseas.',{pa:'118/78'},['PA 118/78 mmHg']],
   ['uci','Paciente ficticio permanece en evaluación, con cambios documentados en el soporte respiratorio.',{sat:'94'},['SatO₂ 94 %']],
   ['cirugia','Paciente ficticio en postoperatorio refiere menos dolor a la movilización durante el día.',{temp:'36,7'},['T° 36,7 °C']],
   ['pediatria','Paciente pediátrico ficticio traído por fiebre referida de un día de evolución.',{fr:'24'},['FR 24 rpm']],
   ['aps','Paciente ficticio consulta en seguimiento de cefalea y refiere mejoría parcial.',{pa:'130/85'},['PA 130/85 mmHg']],
   ['interna','Paciente ficticio consulta por edema maleolar y disnea de esfuerzo de dos días.',{fc:'91',sat:'96'},['FC 91 lpm','SatO₂ 96 %']]
  ];
  const rows=[];
  for(let i=0;i<sample.length;i++){
   const [specialty,general,vitals,need]=sample[i];const base=emptyWorkflow(specialty,'ingreso');base.general=general;base.vitals=vitals;base.clinicalFormat=defaultFormat(specialty);
   if(specialty==='ginecologia'){base.obstetrics={pregnancy:'si',gestas:'3',partos:'1',perdidas:'1',cesareas:'1',vivos:'1',fur:'',eg:'25+4',fpp:''};need.push('Gestas: 3','Partos: 1','Cesáreas: 1','Edad gestacional: 25+4')}
   const clean=validateWorkflow(base);
   for(const provider of providers){
    const start=performance.now();
    try{const out=await engine.generate(FLOW_SYSTEM,clean,{provider,maxTokens:3000});const text=ensureClinicalFacts(ensureFormatHeadings(out.note,clean.clinicalFormat),clean);const found=need.filter(s=>text.includes(s));const headingsOk=clean.clinicalFormat.headings.every(h=>text.includes(h.toUpperCase()));rows.push({caso:i+1,especialidad:specialty,proveedor:provider,segundos:Number(((performance.now()-start)/1000).toFixed(2)),datos:need.length?`${found.length}/${need.length}`:'sin campos estructurados',titulos:headingsOk?'Sí':'No',advertencias:out.warnings.length});}
    catch(e){rows.push({caso:i+1,especialidad:specialty,proveedor:provider,error:String(e.message).slice(0,100)});if(e.status===429){console.error('Cuota gratuita agotada; se detiene el benchmark.');console.table(rows);process.exit(2)}}
   }
  }
  console.log('Prueba descriptiva de fidelidad estructural; NO mide precisión médica ni alucinaciones. Todas las evoluciones requieren revisión humana.');console.table(rows);
 }
}

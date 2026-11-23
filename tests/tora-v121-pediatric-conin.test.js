import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultFormat} from '../clinical-formats.js';
import {emptyWorkflow,validateWorkflow,workflowLocalDraft,pediatricFactsText,vitalSignsText} from '../workflow-engine.js';
import {ensureClinicalFacts,ensureFormatHeadings} from '../format-output.js';

const sample=()=>{
 const x=emptyWorkflow('pediatria','ingreso');
 x.general='TENS refiere alimentación tolerada por SNG, sin vómitos, diuresis referida como conservada.';
 x.pediatrics={age:'2 años',weightKg:'11,3',feedingRoute:'sng'};
 x.vitals={pa:'99/71',fc:'111',fr:'25',temp:'36,0',sat:'99',fio2:'21'};
 const general=x.sections.find(s=>s.id==='general');general.status='nuevo';general.notes='Paciente vigil y reactivo observado durante la evaluación.';general.source='observado';
 const neurologico=x.sections.find(s=>s.id==='neurologico');neurologico.status='nuevo';neurologico.notes='No logra sedestación independiente durante evaluación de hoy.';neurologico.source='observado';
 x.clinicalFormat=defaultFormat('pediatria');
 return x;
};

test('CONIN: encabezados SOAP y examen físico en el orden del esquema aportado',()=>{
 const f=defaultFormat('pediatria');
 assert.deepEqual(f.headings.slice(0,3),['SUBJETIVO','OBJETIVO','CSV']);
 assert.deepEqual(f.headings.slice(-2),['APRECIACIÓN DIAGNÓSTICA','PLANES']);
 assert.ok(f.headings.includes('PIEL')&&f.headings.includes('NEUROLÓGICO'));
});

test('CONIN: incluye datos objetivos medidos, sin inventar áreas pendientes',()=>{
 const x=validateWorkflow(sample());
 const output=workflowLocalDraft(x).note;
 assert.match(output,/SUBJETIVO[\s\S]*TENS refiere alimentación/);
 assert.match(output,/Edad: 2 años/);
 assert.match(output,/Peso: 11,3 kg/);
 assert.match(output,/Vía de alimentación: SNG/);
 assert.match(output,/CSV\nPA 99\/71 mmHg, FC 111 lpm, FR 25 rpm, T° 36,0 °C, SatO₂ 99 %, FiO₂ 21 %/);
 assert.match(output,/NEUROLÓGICO\nNo logra sedestación independiente/);
 assert.match(output,/APRECIACIÓN DIAGNÓSTICA\n\nPLANES$/);
 assert.ok(!output.includes('Mantener indicaciones'));
 assert.ok(!output.includes('Pupilas isocóricas'));
});

test('CONIN: valida FiO2 y peso, sin estimar por edad',()=>{
 let x=sample();x.vitals.fio2='120';assert.throws(()=>validateWorkflow(x),/fio2/);
 x=sample();x.pediatrics.weightKg='12abc';assert.throws(()=>validateWorkflow(x),/Peso pediátrico inválido/);
 assert.equal(pediatricFactsText({age:'4 años',weightKg:'',feedingRoute:'no_informado'}),'Edad: 4 años');
 assert.equal(vitalSignsText({fio2:'21'}),'FiO₂ 21 %');
});

test('CONIN: el servidor añade FiO2 y corrige peso etiquetado inexacto en salida IA',()=>{
 const data=validateWorkflow(sample());
 const output=ensureClinicalFacts(ensureFormatHeadings('SUBJETIVO\nPeso: 13 kg\n\nCSV\nSatO₂ 90 %',data.clinicalFormat),data);
 assert.match(output,/Peso: 11,3 kg/);
 assert.doesNotMatch(output,/Peso: 13 kg/);
 assert.match(output,/SatO₂ 99 %/);
 assert.match(output,/FiO₂ 21 %/);
});

test('CONIN: no traslada examen previo como actual',()=>{
 const x=sample();x.docType='diaria';x.previous='Paciente ficticio con clonus y roncus en examen anterior, sin reevaluación de estos hallazgos.';
 const tx=validateWorkflow(x);const out=workflowLocalDraft(tx).note;
 assert.doesNotMatch(out,/roncus/i);
 assert.doesNotMatch(out,/clonus/i);
});

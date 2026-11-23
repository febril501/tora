// Formularios académicos; los textos son opciones de registro, nunca diagnósticos automáticos.
export const DOC_TYPES = {
  ingreso:{label:'Evaluación de ingreso',subtitle:'Antecedentes, evaluación inicial y plan de ingreso'},
  diaria:{label:'Evolución del día',subtitle:'Evolución previa, novedades y hallazgos actuales confirmados'}
};
const section=(id,label,quick=[],hint='',keywords=[])=>({id,label,quick,hint,keywords});
export const FLOW_SPECIALTIES = {
  interna:{name:'Medicina Interna',icon:'🫀',sections:[
    section('contexto','Contexto y problemas activos',[], 'Diagnósticos previos solo como contexto; problemas activos confirmados',['diagnóstic','insuficiencia','antecedente','hospitalizado']),
    section('eventos','Eventos y síntomas',['Disnea referida','Ortopnea referida','Dolor torácico referido','Fiebre referida','Mejoría sintomática referida'],'Eventos últimas 24 h o motivos del control',['disnea','ortopnea','dolor','fiebre']),
    section('vitales','Signos vitales',[],'Transcribe valores y unidades medidos hoy',['pa ','fc ','fr ','sato','temperatura','signos vitales']),
    section('cardio','Cardiovascular',['Edema de extremidades presente al examen','Edema no pesquisado al examen','Ingurgitación yugular observada'],'Describe solo maniobras realizadas',['edema','cardíaco','cardiovascular','ingurgitación']),
    section('resp','Respiratorio',['Crepitaciones auscultadas','Murmullo pulmonar disminuido','Sibilancias auscultadas','Auscultación sin hallazgos patológicos'],'Solo si hubo auscultación hoy',['crepitaciones','auscultaci','pulmonar','respiratorio']),
    section('renal','Renal y balance',['Diuresis cuantificada','Balance hídrico disponible'],'Registrar volumen, balance y unidades',['diuresis','balance','renal','creatinina']),
    section('examen','Otros sistemas y examen dirigido',[],'Neurológico, abdominal y extremidades según exploración',['abdomen','neurol','extremidades']),
    section('estudios','Laboratorio e imágenes',[],'Resultados con fecha y unidades, sin interpretaciones no informadas',['laboratorio','exámenes','radiografía','sodio','hemoglobina']),
    section('tratamiento','Tratamiento y medicamentos',[],'Precisar si se indicó, administró o suspendió',['furosemida','antibiótico','tratamiento','dosis']),
    section('plan','Análisis y plan documentado',[],'Solo evaluación y conductas ya definidas por equipo tratante',['plan','conducta','reevaluar'])
  ]},
  ginecologia:{name:'Ginecología y Obstetricia',icon:'🤰',sections:[
    section('antecedentes','Antecedentes ginecoobstétricos',[],'Gestas, partos, pérdidas, cesáreas, hijos vivos y antecedentes reproductivos',['gestas','gestaciones','partos','cesárea','fur']),
    section('motivo','Motivo y síntomas',['Dolor pélvico referido','Sangrado genital referido','Pérdida de líquido referida','Contracciones referidas'],'Precisar inicio y evolución',['sangrado','dolor','pérdida','contracciones']),
    section('obstetricia','Evaluación obstétrica',['Movimientos fetales referidos','Movimientos fetales no percibidos (referidos)','Dinámica uterina evaluada'],'Solo si gestación actual y evaluación confirmadas',['gestacional','fetal','movimientos','dinámica uterina']),
    section('vitales','Signos vitales maternos',[],'Valores actuales con unidades',['presión','temperatura','signos vitales']),
    section('examen','Examen ginecológico / obstétrico',[],'Solo maniobras realizadas, sin asumir tacto vaginal',['especuloscop','tacto','examen ginecol','altura uterina']),
    section('estudios','Ecografías y exámenes',[],'Resultados, fecha y procedencia',['ecografía','doppler','laboratorio']),
    section('tratamiento','Tratamiento e intervenciones',[],'Confirmar indicación o administración',['progesterona','tratamiento','medicamento']),
    section('plan','Evaluación y plan',[],'Conducta ya documentada',['plan','conducta','control'])
  ]},
  psiquiatria:{name:'Psiquiatría',icon:'🧠',sections:[
    section('presentacion','Presentación, edad aparente y complexión',[], 'Describir edad aparente vs cronológica, biotipo y presentación; solo observados',['higiene','vestimenta','edad aparente','ectomórf']),
    section('eventos','Eventos, sueño y funcionamiento',['Sueño referido reparador','Insomnio referido','Adherencia referida','Efectos adversos referidos'],'Cambios desde la visita previa',['sueño','adherencia','funcionamiento']),
    section('animo','Ánimo y afectividad',['Ánimo depresivo referido','Ánimo ansioso referido','Afecto restringido observado','Afecto embotado observado'],'Diferenciar ánimo subjetivo y afecto observado',['ánimo','afecto','reactividad']),
    section('conducta','Conducta, actitud y psicomotricidad',['Contacto visual escaso observado','Inquietud psicomotora observada','Retardo psicomotor observado'],'Registrar observación actual',['contacto visual','actitud','psicomotor']),
    section('pensamiento','Lenguaje y pensamiento',['Discurso comprensible','Tangencialidad observada','Ideas delirantes referidas'],'Separar curso, contenido y velocidad',['pensamiento','delirio','lenguaje','discurso']),
    section('sensopercepcion','Sensopercepción',[],'Niega alucinaciones no implica evaluación completa',['alucinaciones','sensopercepci']),
    section('insight','Insight y juicio de realidad',[],'Solo si explorados',['insight','juicio de realidad']),
    section('riesgo','Riesgo suicida y autolesividad',[],'Nunca considerar negativo solo por omisión',['suicid','autolesiv']),
    section('farmacos','Tratamiento y efectos adversos',[],'Diferenciar lo prescrito de adherencia real',['risperidona','antipsicótico','tratamiento']),
    section('plan','Impresión documentada y plan',[],'Solo decisiones ya registradas',['plan','control','conducta'])
  ]},
  traumatologia:{name:'Traumatología',icon:'🦴',sections:[
    section('contexto','Lesión, región y mecanismo',[],'Registrar lateralidad y mecanismo',['trauma','lesión','fractura','rodilla']),
    section('dolor','Dolor y función',['Dolor a la movilización referido','Dolor en reposo referido','Dificultad de marcha referida'],'Intensidad/localización si constan',['dolor','marcha','función']),
    section('inspeccion','Inspección, heridas y edema',['Edema observado','Equimosis observada','Herida sin secreción al examen'],'Solo constataciones de hoy',['edema','herida','equimosis']),
    section('movilidad','Movilidad, estabilidad y maniobras',[],'Indicar región, lado y maniobra realizada',['lachman','mcmurray','movilidad','rango']),
    section('neurovascular','Evaluación neurovascular',[],'Pulsos, llenado capilar, sensibilidad y motor evaluados',['pulso','sensibilidad','neurovascular']),
    section('estudios','Imágenes y resultados',[],'Describir solo resultados disponibles',['radiografía','tomografía','resonancia']),
    section('tratamiento','Inmovilización y tratamiento',[],'Estado del yeso/órtesis y tratamiento confirmado',['férula','yeso','analgesia']),
    section('plan','Rehabilitación y plan',[],'Indicación o pauta previamente definida',['rehabilitación','carga','plan'])
  ]},
  urgencias:{name:'Urgencias',icon:'🚑',sections:[
    section('motivo','Motivo de consulta y cronología',[],'Hora de inicio y evolución si conocidas',['motivo','inicio','dolor']),
    section('abcde','Evaluación ABCDE',[],'Indicar sólo apartados evaluados',['vía aérea','ventilación','circulación','abcde']),
    section('vitales','Signos vitales',[],'Valores observados con unidades',['pa','fc','fr','sato']),
    section('examen','Examen físico dirigido',[],'Datos realmente examinados',['examen','abdomen','tórax']),
    section('estudios','Exámenes solicitados y resultados',[],'Distinguir solicitado de disponible',['laboratorio','ecg','radiografía']),
    section('tratamiento','Tratamientos administrados',[],'Separar indicación, administración y respuesta',['suero','analgesia','tratamiento']),
    section('reevaluacion','Reevaluación y respuesta',[],'Hallazgos actuales con tiempo de evaluación',['reevaluación','respuesta']),
    section('plan','Destino y plan',[],'Destino y decisiones documentadas',['alta','hospitalización','derivación'])
  ]},
  uci:{name:'UCI',icon:'🩺',sections:[
    section('eventos','Eventos últimas 24 horas',[],'Procedimientos, eventos y cambios',['evento','procedimiento']),
    section('neurologico','Neurológico y sedación',[],'Escala e infusiones si están documentadas',['glasgow','rass','sedación']),
    section('hemodinamia','Hemodinamia',[],'Vasopresores, PAM y parámetros disponibles',['pam','noradrenalina','hemodinamia']),
    section('respiratorio','Ventilación y oxigenación',[],'Parámetros de soporte con valores actuales',['ventilación','fio2','peep']),
    section('renal','Renal, diuresis y balances',[],'Diuresis/24 horas, balance y creatinina',['balance','diuresis','creatinina']),
    section('infeccioso','Infeccioso y antibióticos',[],'Foco, cultivos y antibióticos documentados',['cultivos','antibiótico','infección']),
    section('nutricion','Nutrición y otros soportes',[],'Vía y tolerancia documentadas',['nutrición','enteral']),
    section('estudios','Exámenes y tendencias',[],'No interpretar tendencias sin serie real',['laboratorio','gasometría']),
    section('plan','Problemas y objetivos del día',[],'Solo metas propuestas por equipo tratante',['objetivo','plan'])
  ]},
  cirugia:{name:'Cirugía',icon:'🩹',sections:[
    section('contexto','Cirugía y día postoperatorio',[],'Procedimiento y día operatorio confirmados',['postoperatorio','cirugía','procedimiento']),
    section('eventos','Eventos y síntomas',[],'Dolor, náuseas, vómitos y eventos',['dolor','náuseas','eventos']),
    section('transito','Tránsito y tolerancia oral',['Tolerancia oral referida','Eliminación de gases referida','Deposiciones referidas'],'Solo si se preguntó o confirmó',['tránsito','tolerancia','flatos']),
    section('examen','Herida, abdomen y drenajes',[],'Débitos con cantidades, sitio y características',['herida','drenaje','abdomen']),
    section('vitales','Signos vitales',[],'Valores con unidades',['signos vitales','temperatura']),
    section('estudios','Laboratorio y anatomía patológica',[],'Resultandos recibidos',['laboratorio','biopsia']),
    section('tratamiento','Tratamiento y cuidados',[],'Prescrito versus administrado',['analgesia','antibiótico']),
    section('plan','Conducta y seguimiento',[],'Plan ya acordado',['plan','alta'])
  ]},
  pediatria:{name:'Pediatría',icon:'🧒',sections:[
    // Basado en el esquema SOAP CONIN aportado por el usuario; hallazgos opcionales.
    section('subjetivo','Subjetivo',[],'Fuente (TENS, cuidador, paciente), noche, fiebre, tos, coriza, tolerancia alimentaria, vómitos, diuresis y deposiciones. Consigna solo lo preguntado',['tens','noche','tos','coriza','alimentacion','diuresis','deposiciones']),
    section('general','General',[],'Vigilia, reactividad, esfuerzo respiratorio, hidratación y perfusión observados hoy',['activo','reactivo','afebril','general']),
    section('piel','Piel',[],'Hidratación, lesiones y llenado capilar solamente si se exploraron',['piel','turgor','llenado capilar']),
    section('cabeza_cuello','Cabeza y cuello',[],'Fontanelas, pupilas, cavidad oral, cuello, válvula derivativa y accesos solo cuando se examinen',['cabeza','craneo','fontanela','pupilas','cuello']),
    section('torax','Tórax / cardiopulmonar',[],'Auscultación y mecánica respiratoria del examen actual; no inferir normalidad',['torax','pulmonar','roncus','soplos']),
    section('abdomen','Abdomen',[],'RHA, palpación y gastrostomía; describir estado del estoma si fue evaluado',['abdomen','gtt','gastrostomia']),
    section('genitourinario','Genitourinario',[],'Genitales y región perianal solo si fueron explorados',['genital','perianal','testiculos']),
    section('extremidades','Extremidades',[],'Tono, fuerza, movilidad, pulsos, ortesis, contracturas y postura',['extremidades','ortesis','tono','fuerza']),
    section('neurologico','Neurológico y desarrollo',[],'Interacción, contacto visual, sostén cefálico, sedestación, marcha, lenguaje, clonus o movimientos constatados',['neurologico','desarrollo','clonus','sedestacion','lenguaje']),
    section('dispositivos','Dispositivos y accesos',[],'SNG, GTT, derivación ventriculoperitoneal: ubicación, funcionamiento y piel circundante solo si se verificó',['sonda','gtt','válvula','derivacion']),
    section('apreciacion','Apreciación diagnóstica',[],'Diagnóstico o apreciación expresamente documentada; no deducir por signos vitales',['apreciacion','diagnostico','problema']),
    section('plan','Planes',[],'Solo decisiones confirmadas por el equipo; no añadir «mantener indicaciones» automáticamente',['planes','plan','indicaciones'])
  ]},
  aps:{name:'APS / CESFAM',icon:'🌿',sections:[
    section('motivo','Motivo y problemas de seguimiento',[],'Control crónico u otra consulta',['control','motivo']),
    section('sintomas','Síntomas y funcionalidad',[],'Datos desde último control',['disnea','dolor','síntomas']),
    section('adherencia','Adherencia y tolerancia',[],'Referida por usuario o cuidador',['adherencia','efectos adversos']),
    section('vitales','Signos vitales y antropometría',[],'Mediciones actuales con unidades',['presión','peso','imc']),
    section('examen','Examen físico dirigido',[],'Solo aspectos evaluados',['examen','auscultación']),
    section('estudios','Exámenes y metas',[],'Resultados disponibles; metas documentadas',['hba1c','ldl','creatinina']),
    section('tratamiento','Tratamiento actual y cambios',[],'Distinguir uso real de prescripción',['medicación','tratamiento']),
    section('plan','Educación, acuerdos y seguimiento',[],'Indicaciones acordadas con equipo',['educación','seguimiento','plan'])
  ]}
};
export const TRAUMA_REGIONS = {
  rodilla:['Lachman','McMurray','Estrés en varo','Estrés en valgo','Rango flexoextensión'],
  hombro:['Jobe','Neer','Hawkins-Kennedy','Aprehensión anterior','Arco de movilidad'],
  tobillo:['Cajón anterior','Inclinación astragalina','Ottawa tobillo','Rango de movilidad'],
  cadera:['Rotación interna','Rotación externa','Log-roll','Apoyo y marcha'],
  columna:['Fuerza segmentaria','Sensibilidad','Lasègue','Marcha'],
  otra:['Inspección','Palpación','Rango articular','Evaluación neurovascular']
};

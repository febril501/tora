# TORA 1.2.1 — Piloto Pediatría CONIN (SOAP)

## Documentos de referencia

Se revisó el esquema **ESQUEMA EVOLUCIONES CONIN.docx** y el conjunto de evoluciones **EVOLUCIONES MARTES 15_09.docx** entregados por el usuario. Los nombres y datos clínicos identificables contenidos en los originales **no están incorporados en el código, en las pruebas ni en este documento**.

## Cambios

- Pediatría usa un formato por defecto **S → O → A → P**, con encabezados: SUBJETIVO, OBJETIVO, CSV, GENERAL, PIEL, CABEZA Y CUELLO, TÓRAX, ABDOMEN, GENITOURINARIO, EXTREMIDADES, NEUROLÓGICO, APRECIACIÓN DIAGNÓSTICA, PLANES.
- Subjetivo: permite registrar fuente de información (TENS/cuidador/paciente), evolución nocturna, síntomas, tolerancia alimentaria, eliminación.
- Objetivo: apartados opcionales para examen por sistemas; nuevo bloque específico de dispositivos/accesos (SNG, GTT, válvulas derivativas, etc.).
- Campos opcionales edad **sin fecha de nacimiento**, peso en kg, vía de alimentación y **FiO₂**; conservan valores y unidades escritos por el usuario.
- El apartado de neurología y desarrollo permite consignar hitos, interacción, tono y movimientos documentados.
- Apreciación y plan **nunca** se completan automáticamente si no fueron documentados.
- Botón **«Aplicar formato SOAP CONIN»** en la sección de Pediatría por si el usuario ya tenía un formato pediátrico guardado; pide confirmación antes de sustituir solo esa preferencia.
- Validación de peso, FiO₂ y los datos opcionales desde el servidor. Se añade la FiO₂ a la salida de forma determinista, separada de SatO₂.
- No se usan datos de los pacientes originales como ejemplos ni se transfieren a servicios externos.

## Instalación (Render + GitHub)

**Antes de reemplazar archivos**: guarda una copia del repositorio, confirma si tu Render corresponde a TORA **1.2** y pruébalo en una rama/servicio separado.

### Si ya tienes TORA 1.2

1. Descomprime **TORA_1_2_1_PEDIATRIA_CONIN_PARCHE.zip**.
2. Copia los archivos modificados sobre los mismos paths del repositorio (sin borrar los demás archivos).
3. Sube cambios a una rama de prueba de GitHub; ejecuta `npm test` en Node >= 20.
4. Prueba `/flujo?especialidad=pediatria&tipo=ingreso` y `/flujo?especialidad=pediatria&tipo=diaria` con casos **ficticios**.
5. Solo después despliega esa rama en un entorno de prueba de Render, verifica generación IA, guardado e inicio de sesión antes de actualizar el servicio usado por estudiantes.

### Si tu Render todavía utiliza TORA 0.9

**No apliques el parche solo**. Usa el proyecto completo como referencia para una actualización planificada, que también incluye los requisitos y migración SQL de TORA 1.2. La versión 1.2.1 no realiza una migración automática de Supabase.

## Uso del nuevo formato

1. En TORA abre «Evoluciones» → «Pediatría».
2. Selecciona **Nueva evolución** si no existe evolución previa; **Actualizar evolución** solo si tienes una evolución anterior ficticia.
3. Abre «Apartados clínicos complementarios» (en Pediatría se despliegan automáticamente).
4. Si tu formato de pediatría previo no coincide con CONIN, pulsa «Aplicar formato SOAP CONIN»; es voluntario.
5. Agrega únicamente información corroborada. En campos opcionales, deja vacío lo no evaluado.
6. Genera el esquema local o el borrador de IA; comprueba todos los datos antes de copiar o guardar.

## Ejemplo ficticio y desidentificado

**S:** TENS refiere noche sin eventos. Alimentación por SNG referida como bien tolerada. Vómitos negados por TENS. Diuresis referida como conservada. Deposiciones referidas durante la mañana.

**O / CSV:** T° 36,5 °C, FC 110 lpm, PA 98/60 mmHg, FR 24 rpm, SatO₂ 98 %, FiO₂ 21 %.

**General:** Vigil y reactivo durante el examen actual.

**Neurológico:** Durante el examen fija la mirada y moviliza las cuatro extremidades espontáneamente.

**A:** [Sin apreciación diagnóstica nueva documentada; apartado vacío en el borrador].

**P:** [Sin plan nuevo documentado; apartado vacío en el borrador].

> No son prescripciones ni signos vitales de referencia para una edad. Son datos **inventados exclusivamente para probar el formato**.

## Pruebas y limitaciones

- `npm test`: **76 pruebas aprobadas, 0 fallidas** en el entorno local, incluidas cinco nuevas para CONIN.
- No se ejecutaron pruebas contra las claves ni datos reales de Groq, Gemini, Supabase o Render.
- El nuevo formato no calcula dosis pediátricas ni interpreta signos vitales. Estas funciones necesitarán referencias validadas y controles clínicos adicionales.
- Un modelo de IA podría redactar un dato erróneo en otra parte de la nota. La inserción determinista **no sustituye** revisión humana, privacidad ni validación clínica.
- Este prototipo **no está habilitado** para introducir información identificable de pacientes reales.

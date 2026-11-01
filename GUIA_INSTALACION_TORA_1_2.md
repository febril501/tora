# TORA 1.2 — Instalación segura de IA Groq/Gemini y feedback

**Versión desarrollada como actualización de TORA 0.9.3.** No está desplegada en Render hasta que se suba a GitHub y se configuren las variables. Se probó con 71 pruebas automatizadas locales usando proveedores simulados; **no se comprobó con las claves reales de Render**. No procesar pacientes identificables.

## Qué trae esta versión

1. **Groq GPT-OSS 120B** mediante API REST segura desde `ai-engine.js` (modelo predeterminado cuando la clave está configurada).
2. **Gemini conserva compatibilidad**: sigue funcionando si no hay clave Groq; se puede elegir manualmente en TORA si están ambos.
3. **Selector y comparación de IA** en Nueva evolución / Actualizar evolución. El botón comparativo hace **dos solicitudes separadas** a ambos proveedores. Pide confirmación de que se trata de un caso ficticio/desidentificado. No se envía a un proveedor alternativo automáticamente cuando el seleccionado falla.
4. **Inserción verificable de signos vitales y antecedentes obstétricos**: los campos explícitos del formulario se insertan mediante código (no se confía en que la IA los recuerde). Respeta los títulos existentes; las secciones vacías permanecen vacías.
5. **Centro de feedback**: estudiantes proponen ideas y reportan errores; el administrador consulta y cambia estados tras ejecutar el SQL incremental.
6. **Concurrencia por usuario**: un usuario generando IA no bloquea a todos los demás.
7. **Banco comparativo de 10 casos ficticios** opcional para revisar fidelidad estructural con ambos modelos.

## Actualizar GitHub

**Recomendación**: probar primero en una rama nueva o servicio Render de prueba, y respaldar el repositorio.

- Si tu aplicación ya tiene TORA 0.9.3, usa **`TORA_1_2_ACTUALIZACION.zip`**. Descomprímelo y sube su contenido a la **raíz** del repositorio `febril501/evoclinica`, respetando carpetas como `tests`, `scripts` y `sql`. **No subas el ZIP sin extraer**.
- Alternativamente, el archivo **`TORA_1_2_COMPLETA.zip`** contiene el proyecto completo. Para una instalación nueva necesitarás configurar Render y Supabase aparte.
- Conserva las variables existentes `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `TORA_AUTH_PROVIDER=supabase`, `GEMINI_API_KEY` y `GEMINI_MODEL` en Render. **No borres cuentas ni tablas**.

## Configurar IA gratis en Render

1. Abre `https://console.groq.com/keys` y crea una API key para GroqCloud. Guarda la clave de forma privada. El acceso gratuito tiene cuotas y no garantiza servicio continuo.
2. Abre Render → tu servicio TORA → **Environment**.
3. Añade las siguientes variables:

| KEY | VALUE |
|---|---|
| `GROQ_API_KEY` | Tu API key de Groq, nunca compartirla ni subirla a GitHub |
| `GROQ_MODEL` | `openai/gpt-oss-120b` |
| `TORA_AI_DEFAULT` | `groq` |

4. Mantén `GEMINI_API_KEY` y `GEMINI_MODEL` existentes para seguir disponiendo de Gemini.
5. Guarda/despliega y comprueba que Render muestre **Live**.
6. Entra a `/api/status` con la sesión iniciada. Debes ver `aiConfigured: true` y `providers` con Groq (y Gemini si está configurado). No aparecen claves privadas en esta respuesta.
7. Entra a **Nueva evolución** o **Actualizar evolución** → **Proveedor de IA**. Elige Groq. Prueba con datos completamente ficticios. Con ambas IA configuradas aparecerá el botón de comparación.

**Si Groq da un error de cuota (429):** elige Gemini manualmente, en el selector. Si Groq no funciona por clave o modelo, revisa variables en Render; no modifiques Supabase.

## Activar el centro de feedback (SQL incremental)

En Supabase → SQL Editor, abre el archivo `sql/TORA_1_2_FEEDBACK.sql`, revisa su contenido y ejecútalo una sola vez. Crea `public.user_feedback` con RLS y dos RPC administradas, sin borrar ni modificar el esquema de evoluciones existente. Después:

- Cada usuario aprobado puede abrir `/feedback` desde el menú y enviar un comentario sin datos personales de pacientes.
- En `/administracion`, el administrador ve los feedbacks y marca `nuevo`, `revisando` o `resuelto`.
- Si **no** has ejecutado SQL, el resto de la app y la IA sigue funcionando, pero el centro de feedback mostrará un error de tabla/RPC ausente.

## Comprobar 10 casos con ambos modelos (optativo)

Para personas con entorno local Node >=20 y ambas API keys configuradas en su propio entorno, ejecutar conscientemente:

```sh
TORA_RUN_BENCHMARK=1 npm run benchmark:ai
```

En Windows PowerShell: `$env:TORA_RUN_BENCHMARK="1"; npm run benchmark:ai`. El script `scripts/compare-ai.mjs` realiza **20 solicitudes externas** (10 casos ficticios x 2 IA), sujeta a las cuotas gratis. Presenta por caso el tiempo aproximado, el número de campos estructurados conservados y el respeto de los encabezados. **No mide por sí solo calidad clínica real ni ausencia de alucinaciones**: sigue siendo necesaria una revisión humana de los resultados.

## Seguridad y límites

- Solo datos ficticios o completamente desidentificados. Las evaluaciones reales de pacientes no están autorizadas en este prototipo. Antes de usar datos identificables es necesaria evaluación institucional/legal y auditoría de protección de datos.
- No se almacena en Supabase el texto de la comparación de modelos automáticamente. Los borradores solo se guardan cuando el usuario lo decide, como antes.
- Groq y Gemini son servicios externos; enviarles información implica transferencia de datos a sus servidores y sujeta a sus términos y privacidad. No hay fallback silencioso entre proveedores.
- La inserción de campos de formularios es determinista; **aun así, un modelo puede generar errores en otras partes de la evolución**. Siempre revisar antes de utilizar.
- El centro de feedback no solicita identificadores clínicos; los filtros automáticos no garantizan desidentificación.
- Es necesario verificar login, registro, aprobación, lectura de notas propias y **aislamiento entre usuarios** tras el despliegue. Las pruebas automatizadas son locales con simulaciones.

## Pruebas ejecutadas

- `npm test`: **71 aprobadas, 0 fallidas**.
- Arranque local Node y respuestas HTTP: `/healthz`, `/api/auth/mode`, `/api/status`, `/flujo`, `/feedback`.
- Prueba de compatibilidad de respuesta REST Groq y Gemini con respuestas simuladas.
- Pruebas de protección de API key, cuota 429, selección explícita y valores clínicos obligatorios.

**Estado:** candidato de lanzamiento TORA 1.2; **no ha sido desplegado ni probado contra proveedores reales**.

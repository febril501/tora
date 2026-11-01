# TORA 1.2 — IA Groq/Gemini, evoluciones clínicas, feedback y cuentas individuales

**TORA 1.2:** se añadió Groq GPT-OSS 120B, selector manual Groq/Gemini, comparación en un mismo caso ficticio, inserción determinista de datos clínicos y un centro de feedback (tras migración SQL incremental). Consulta [GUIA_INSTALACION_TORA_1_2.md](GUIA_INSTALACION_TORA_1_2.md) para instalación y límites.

**TORA** es un prototipo académico de apoyo a la redacción clínica para casos **ficticios o completamente desidentificados**. No es una ficha clínica certificada, no sustituye la evaluación de un profesional y no está habilitado para el procesamiento de información identificable de pacientes reales.

## Funciones principales

- **Nueva evolución:** redacta con texto libre y apartados clínicos opcionales.
- **Actualizar evolución:** recibe la evolución anterior como contexto histórico y redacta solo a partir de los cambios documentados hoy.
- **Formatos clínicos personales:** estructura y encabezados propios de cada especialidad; TORA conserva los títulos sin datos **en blanco**, sin inventar normalidades ni trasladar evaluaciones previas como actuales.
- **Signos vitales opcionales en todas las especialidades excepto Psiquiatría:** PA (mmHg), FC (lpm), FR (rpm), T° (°C) y SatO₂ (%). No incluye EVA.
- **Examen mental psiquiátrico avanzado:** 14 dominios; todas las selecciones tienen «Otro (especificar)» y campo de texto; se eliminó «Fuente principal del hallazgo».
- **Supabase Auth y base de datos:** autorregistro por correo, confirmación, estado «pendiente» hasta aprobación del administrador, sesiones en cookie `HttpOnly`, formatos/evoluciones/preferencias por usuario con RLS.
- **Mis evoluciones:** consulta, edición, eliminación y utilización de una nota guardada como evolución previa.
- **Administración:** listado de perfiles, aprobación y suspensión; no muestra notas privadas de terceros.

## Arquitectura

- **Render:** Node.js 20+ y proxy de acceso a Gemini/Supabase.
- **GitHub:** código y pruebas.
- **Gemini:** generación de borradores, con API key solo en servidor.
- **Supabase:** autenticación, cuatro tablas (`profiles`, `clinical_formats`, `evolutions`, `user_preferences`) y RLS. Las operaciones de datos se realizan con **JWT de usuario**, no con `service_role`.

## Instalación en Render

Variables del servicio web (nunca colocar valores reales en el repositorio):

| Variable | Valor |
| --- | --- |
| `NODE_ENV` | `production` |
| `GEMINI_API_KEY` | Clave Gemini existente |
| `GEMINI_MODEL` | Modelo Gemini habilitado |
| `SUPABASE_URL` | API URL del proyecto Supabase |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` del proyecto |
| `TORA_AUTH_PROVIDER` | `supabase` **solo al activar las cuentas nuevas** |
| `APP_USERS_JSON` | Sistema anterior (respaldo mientras se prueba; ignorado en modo `supabase`) |

**Orden recomendado:**

1. Respaldar el repositorio de GitHub y exportar tus formatos desde TORA 0.8.
2. Ejecutar `sql/TORA_0_9_MIGRACION.sql` en el SQL Editor del proyecto que ya tiene las cuatro tablas creadas. Este archivo no borra tablas ni datos. Agrega unicidad de formato y dos RPC administrativas.
3. En **Supabase → Authentication → URL Configuration**, configurar la **Site URL** y Redirect URL de `https://TU-APP.onrender.com/login`. Verificar correo habilitado.
4. Subir el código 0.9 a una rama de prueba o a GitHub, manteniendo inicialmente el modo de acceso anterior.
5. Comprobar `GET /healthz` y ejecutar las pruebas `npm test`.
6. En Render → Environment, agregar `TORA_AUTH_PROVIDER=supabase` y guardar para desplegar.
7. Iniciar sesión con la cuenta de Supabase que ya está `admin` y `approved`. Probar «Administración», «Mis formatos clínicos» y «Mis evoluciones» con casos ficticios.
8. Crear una segunda cuenta de prueba: confirmar correo, comprobar estado pendiente y aprobar desde el panel; verificar que **no pueda ver notas del administrador**.
9. Solo después, decidir si retirar `APP_USERS_JSON`.

> No agregar `service_role`, `sb_secret_...` ni claves de base de datos en GitHub o en el navegador. La clave publishable **no sustituye RLS**.

## SQL y permisos

La migración incremental está en [`sql/TORA_0_9_MIGRACION.sql`](sql/TORA_0_9_MIGRACION.sql). Se ejecuta **después** del esquema base ya creado y probado. RLS debe permanecer activada para las cuatro tablas. Los RPC verifican que `auth.uid()` pertenezca a un perfil `admin` y `approved`.

Si existen dos formatos con el mismo par `user_id, specialty`, la migración de índice único se detiene; no eliminar datos sin revisarlos.

## Desarrollo local

```sh
node --version # Node.js >=20
npm test
npm start
```

Sin `TORA_AUTH_PROVIDER=supabase`, el proyecto utiliza el modo previo (`APP_USERS_JSON` en producción, modo local en desarrollo). El cambio de modo es explícito para evitar desconectar cuentas por accidente.

## Limitaciones y seguridad

- **No se realizaron pruebas reales con tu proyecto Supabase ni con Gemini**, porque las claves están únicamente en tu Render; las pruebas automatizadas usan proveedores simulados. Verificar las integraciones en una rama o entorno de prueba antes de publicar.
- Las sesiones se mantienen en memoria del servidor Node; tras reinicios o redeploy será necesario iniciar sesión nuevamente. En configuraciones con múltiples instancias se requiere un almacén compartido de sesiones.
- Las políticas RLS protegen las filas; deben comprobarse con al menos **dos cuentas diferentes**. La sola existencia de RLS no prueba que las políticas sean correctas.
- La cuota por usuario y los controles de intentos son inicialmente locales a cada proceso; para producción multiinstancia debe emplearse un almacenamiento distribuido.
- Los modelos generativos pueden cometer errores. **Cada borrador debe ser revisado**; TORA no garantiza automáticamente la exactitud clínica ni la ausencia de alucinaciones.
- No utilizar para fichas de pacientes reales hasta implementar y auditar controles de privacidad, seguridad, trazabilidad, retención de datos y autorizaciones institucionales conforme a las obligaciones aplicables.

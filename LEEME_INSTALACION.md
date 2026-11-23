# TORA 1.2.2 · Pediatría: escritura directa

## Cambio solicitado
En Pediatría, los campos de Subjetivo, examen físico, Apreciación diagnóstica y Planes están visibles desde el inicio. Se eliminan los selectores «No evaluado / Hallazgo actual / Cambió hoy» y los controles de fuente dentro de los apartados pediátricos. Solo se escribe; los campos vacíos se ignoran. El formato SOAP permanece.

El resto de las especialidades NO cambia.

## Instalación en Render / GitHub
1. Respaldar primero la versión actual. Tener como base **TORA 1.2.1 Pediatría CONIN**.
2. Reemplazar en la raíz del repositorio únicamente los cuatro archivos de este ZIP: `flow.js`, `workflow-engine.js`, `tora-v08.css` y `flujo.html`.
3. Confirmar commit en la rama de prueba y desplegar en Render. No cambiar ninguna variable de entorno, clave ni tabla Supabase.
4. Probar primero inicio de sesión, luego en `/flujo` seleccionar Pediatría y escribir directamente en «Subjetivo», sin seleccionar ningún estado. Probar generar con un caso **ficticio**.
5. Si el inicio de sesión aún falla por un proyecto pausado de Supabase, resolverlo antes de desplegar; este parche no modifica la autenticación.

## Google Apps Script
La versión de Apps Script ya tenía cuadros de texto directos para Pediatría, sin selectores de evaluación. Este parche corresponde a TORA web (Render). No pegar estos archivos en Apps Script.

## Seguridad
No usar datos clínicos identificables. Validar y revisar toda evolución producida.

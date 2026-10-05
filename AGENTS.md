# AGENTS.md — Notas de seguimiento del proyecto

App PWA para control de mantenciones de grúas horquillas y traspaletas.
Reemplaza el Excel `mantenciones gruas.xlsx`. Documentación técnica ampliada en `PROYECTO-ESTADO.md` y `docs/excel-formato.md`.

## Datos clave

| Item | Valor |
|------|-------|
| Proyecto Firebase | `gruas-mantencion-app` |
| Hosting | https://gruas-mantencion-app.web.app |
| Consola | https://console.firebase.google.com/project/gruas-mantencion-app/overview |
| Usuario admin app | edo.electric@gmail.com (creado vía REST, contraseña en poder del usuario) |
| Repo GitHub | https://github.com/lalolpp/gruas-mantencion-app (**público**, cuenta lalolpp) |
| Cuenta Google/Firebase CLI | edo.electric@gmail.com |
| Base Firestore | `(default)` en southamerica-east1 |

## Estado actual (agosto 2026)

- [x] PWA completa desplegada en Firebase Hosting
- [x] Login con Firebase Auth (Email/contraseña activado, usuario admin creado y verificado)
- [x] Reglas Firestore: **admin (`edo.electric@gmail.com`) lee/escribe/borrar** + **encargado (`eduardo.espinoza@garatehermanos.cl`) lee/crea/edita pero no borra**; cualquier otra colección queda denegada
- [x] **19 equipos cargados en Firestore** (G1–G14, T01–T03, BAOLI, ALZA) insertados vía REST API con token OAuth del CLI
- [x] Dashboard con semáforo (verde >100h / amarillo ≤100h / rojo vencida / gris sin datos)
- [x] Ficha por equipo con historial completo (trabajos/elementos/observaciones expandibles)
- [x] Filtros en historial: rango de fechas + búsqueda por repuesto/trabajo/empresa/responsable
- [x] Edición de equipos (código, marca, serie, depto, operador, estado, intervalo)
- [x] Nuevo registro manual mobile-friendly
- [x] Importador Excel con mapeo hoja→equipo editable, vista previa y carga por lotes de 400
- [x] Vista "Compartir": QR del enlace, copiar/compartir, botón instalar PWA
- [x] **801 registros históricos importados** (agosto 2026): script Node en `%TEMP%\opencode\importar-historial.mjs` parsea `Gamalier_Gruas_prompt_OpenCode.md` y sube vía REST API con token OAuth del CLI. Conteos verificados por equipo (G1:61 G2:47 G3:60 G4:64 G5:59 G6:68 G7:87 G8:83 G9:77 G10:33 G11:24 G12:63 G13:50 G14:9 T01:3 T02:10 T03:3). Fechas-typo corregidas (GRUA1 f43, GRUA5 f24/f60, GRUA9 f19/f158, grua13 f2/f122); filas sin fecha fusionadas como continuación; horómetros decimales como doubleValue
- [ ] Opcional: cambiar contraseña del usuario desde consola Firebase

## Sesión 2026-08-22 (tarde) — dónde quedamos

**Hecho hoy:**
- **Auditoría anti-mezcla completa**: repo, config (`firebase-config.js`, `.firebaserc`) y hosting verificados íntegros. Cero contaminación del proyecto mantencion-lineas (sin referencias cruzadas, sin archivos ajenos publicados). Los datos NO se pudieron verificar (ver pendiente 1).
- **Rediseño UI "GAMA FORK"** (commit `443727e`, ya en GitHub): fondo claro `#f6f8fe` con brillos pastel sutiles, header de vidrio con blur, nav en píldoras con gradiente neón, fila de KPIs de flota (Equipos/Grúas/Traspaletas/Al día/Por vencer/Vencidas), login retitulado, manifest renombrado, SW subido a `gruas-v3`. Nombre principal ahora es **GAMA FORK**, subtítulo "Mantención de Grúas".
- **Diagnóstico de login**: Firebase Auth funciona bien; la contraseña de `edo.electric@gmail.com` ya no coincide → se envió correo de reset (2026-08-22 ~21h). El usuario debe definir una nueva desde su Gmail.

**⚠️ Bloqueo del día:** Firestore devolvió `429 RESOURCE_EXHAUSTED` (cuota diaria gratuita agotada, presumiblemente por el trabajo intensivo de importación/verificación hecho en otra sesión). Se resetea a medianoche hora Pacific (~03:00–04:00 Chile).

## Sesión 2026-08-23 (mañana) — carga de datos OK

- [x] Cuota Firestore liberada tras reset (~04:00 Chile); lecturas funcionando
- [x] **Carga v2 ejecutada**: 804 existentes → dedupe por equipo|fecha|horómetro|hProx → **187 nuevos subidos** vía REST en 1 lote (`%TEMP%\opencode\cargar-v2.mjs`) → **total 991 registros**
- [x] **Equipos nuevos creados**: BAOLI y ALZA (19 equipos en total). Campos provisionales: BAOLI grua/Baoli/combustión/250h; ALZA grua/"Alza Hombre"/combustión/n°serie 5559/250h → **revisar y corregir datos reales desde la app (Editar equipo)**
- Conteo final por equipo: G1:77 G2:47 G3:70 G4:65 G5:73 G6:87 G7:106 G8:103 G9:99 G10:45 G11:24 G12:79 G13:70 G14:18 T01:4 T02:12 T03:9 BAOLI:2 ALZA:1
- Notas: T01 mantiene sus 4 registros (el Excel nuevo traía 2, ya existían; no se borra nada). Normalización de empresa/tipo idéntica al importador original. origen=`excel-v2`
- Pendiente de la sesión 08-23: desplegar rediseño GAMA FORK a producción (deploy por REST API listo en `%TEMP%\opencode\deploy-rest.mjs`, el CLI crashea este PC)

## Sesión 2026-08-29 — endurecimiento de seguridad + limpieza

**Hecho (sin tocar la data):**
- **`firestore.rules` reforzadas**: antes permitía leer/escribir a CUALQUIER usuario autenticado (riesgo de borrado total). Ahora solo `esAdmin()` (`edo.electric@gmail.com`) puede leer/escribir, con validación mínima de estructura (codigo / equipo+fecha) y `match /{document=**}` en deny para colecciones futuras.
- **Eliminado el doble `firebase.initializeApp`** en `index.html` y `login.html` (ya se inicializa en `firebase-config.js`).
- **Login**: mensaje genérico de credenciales (antes exponía el error de Firebase, revelando si un email existe).
- **`gruas.js`**: la "Próx. mantención" de la ficha ahora sale del semáforo (`calcularSemaforo`), sin divergencias con el badge.
- **`mantenciones.js`**: al guardar un registro ya no redirige solo a los 8s (perdía el contexto); muestra enlace a la ficha + PDF, y el foco vuelve a "Trabajos" para seguir cargando.
- **Versión v7**: footer, manifest (iconos `?v=7`) y SW `gruas-v4` (precache completo con `compartir.js` y `qrcode.min.js`).
- **`.gitignore`**: `scripts/importar-v2/datos.json`, `*.txt` de importación y `*.xlsx` ya no se suben (contiene historial real con nombres de personas; el repo es público).
- Docs sincronizadas (`PROYECTO-ESTADO.md` y este archivo).

**Pendiente de esta sesión (decisiones del usuario):**
- Desplegar reglas + hosting v7 a producción (las reglas NO protegen hasta desplegarlas).
- `datos.json` sigue en el historial git (público). Opciones: (a) dejar repo privado, (b) purgar historial con `git filter-repo`/BFG + force-push, o (c) asumirlo.

## Sesión 2026-08-30 — fix "Missing or insufficient permissions" (causa raíz en reglas)

**Síntoma:** el usuario veía "Missing or insufficient permissions" entrando como admin con las reglas endurecidas desplegadas.

**Causas raíz (verificadas con el API `firebaserules ...:test`):**
1. El `toLowerCase()` de la variante intermedia **no existe** en Security Rules → `Function not found error: Name: [toLowerCase]` → deniega todo. NO volver a usarlo.
2. El patrón `allow read, write: if esAdmin() && (request.method == 'delete' || equipoValido())` evaluaba `request.resource` en **lecturas** (donde no existe) → error de evaluación → denegado incluso con email exacto.

**Fix aplicado (commit `75efe7b`, ya pusheado y desplegado, ruleset `275dca75`):**
- `esAdmin()`: `request.auth.token.email.matches('(?i)^edo\\.electric@gmail\\.com$')` (case-insensitive).
- `read` separado de `create/update` (validadores `equipoValido`/`registroValido` SOLO en escrituras, donde existe `request.resource`); `delete` solo `esAdmin()`.
- Deny-all catch `match /{document=**}` se mantiene.

**Verificación (todo ✅ con identidad admin vía Firestore REST y API de test):**
- runQuery equipos y registros → 200; create+get+delete de doc temporal → 200.
- API test: caso mixto `Edo.Electric@Gmail.COM` → MATCH, otro email → denied, colecciones futuras → denied.
- SHA-256 local == HEAD == desplegado: `ECA97B531AA3D3E475356A954DA7714BC9B15E4C7F85CAE5F61C320DE6A9AFC0`.
- NOTA: en el API `:test` las queries `method:list` sin `structuredQuery` dan FALSE FAILURE aunque la regla permita (limitación del harness); validar listados vía REST `runQuery`.

**Usuario confirmó: ✅ FUNCIONA en el celular (2026-08-30).**

## Pendientes mañana (en orden)

0. ~~Cargar mantenciones actualizadas~~ ✅ HECHO (ver sesión 2026-08-23)
1. **Encargado debe definir su contraseña** desde el correo de reset recibido (ya enviado 2026-10-05). Verificar luego su login.
2. **Probar en el celular** pestañas de flota, alta de equipo de arriendo (debe quedar `AR-G5` si G5 ya existe) y módulo Baterías.
3. (Opcional) Ajustes finos de estilo que pida el usuario viendo el preview local (`python -m http.server 8123` dentro de `static/`).
4. (Opcional, pendiente desde 2026-08-29) Repo sigue **público** con `datos.json` en el historial: (a) hacerlo privado, (b) `git filter-repo`/BFG + force-push, o (c) asumir el riesgo.

## Comandos útiles

```powershell
# Desplegar cambios (hosting + reglas)
cd gruas-app
& "$env:APPDATA\npm\firebase.cmd" deploy --project gruas-mantencion-app

# Solo hosting / solo reglas
& "$env:APPDATA\npm\firebase.cmd" deploy --only hosting
& "$env:APPDATA\npm\firebase.cmd" deploy --only firestore:rules

# Servir localmente (localhost está autorizado en Auth por defecto)
cd static && python -m http.server 8080
```

### Quirks de Windows en este PC

- `npm.ps1` bloqueado por política de ejecución → usar `npm.cmd`
- Firebase CLI v15 crashea con assertion libuv (`win\async.c`) al salir en modo no interactivo; no afecta resultados ya impresos
- El login interactivo del CLI solo funciona en terminal propia del usuario (no desde shells automatizados). Token OAuth refrescable leyendo `%USERPROFILE%\.config\configstore\firebase-tools.json` e intercambiándolo en oauth2.googleapis.com con las credenciales públicas del CLI (lib/api.js)

## Arquitectura rápida

- Frontend vanilla en `static/`, sin build. CDN: Firebase compat 10.12.2, SheetJS 0.20.3, qrcodejs local
- Router hash simple en `app.js`; vistas registradas en objeto global `Vistas`
  - **IMPORTANTE:** `const Vistas` se declara UNA sola vez en `gruas.js`. Los demás módulos solo hacen `Vistas.x = ...` (bug histórico ya corregido: duplicarlo rompía todos los menús)
- Colecciones Firestore:
  - `equipos`: codigo, categoria(grua|traspaleta), marca, tipo(electrica|combustion), n_serie, intervaloHoras, dpto, operador, estado(operativa|detenido|vendida), detalle, **flota(propia|arriendo)**, **empresaArrendadora(solo arriendo)**
  - `registros`: equipo(código), fecha ISO, horometro, hProx, tipo(revision|preventiva|correctiva|recambio|accesorios|otra), empresa, responsable, supervisor, trabajos, elementos, observaciones, origen(excel|excel-v2|manual), creadoEn
  - `baterias`: numero(manual), nSerie, **flota**, **equipo**(código), **area**, estado(vigente|en recarga|dañada|dada de baja), notas, creadoEn, actualizadoEn
  - `baterias/{id}/eventos`: tipo(carga|cambio|reparacion|baja|alta), fecha, nota, creadoEn
- Roles (`firestore.rules`): `esAdmin()` = edo.electric@gmail.com (lee/escribe/borrar); `esEncargado()` = eduardo.espinoza@garatehermanos.cl (lee/crea/edita, **NO borra**). `puedeEditar()` / `puedeBorrar()` son las funciones que usan las reglas.
- Semáforo: `restantes = último hProx conocido − máximo horómetro`
- Service worker cachea el shell (`sw.js`); firebase.json envía sw.js con no-cache
- **Baterías es módulo nuevo** (`static/js/baterias.js`): historial en subcolección `eventos`, nunca en el doc padre

## Sesión 2026-10-05 — rol Encargado, flota propia/arriendo y módulo Baterías (v8)

**Decisiones del usuario:** prefijo automático en colisiones de código (AR- para arriendo, PR- para propia); pestañas Todas/Propias/Arriendo en Inicio; los 19 equipos actuales son `propia`; baterías con **estado actual + historial** y **número manual**; área `Vega` válida; Encargado crea/edita pero no borra.

**Reglas (desplegadas y compiladas):**
- `esAdmin()` (regex `(?i)^edo\\.electric@gmail\\.com$`), `esEncargado()` (regex `(?i)^eduardo\\.espinoza@garatehermanos.cl`), `puedeEditar()`, `puedeBorrar()`, `bateriaValida()`.
- `baterias/{doc}/eventos/{ev}` con `allow create, delete` para editor; delete de la batería solo admin.
- Deny-all `match /{document=**}` se mantiene.
- Test de reglas: 23/23 SUCCESS con el API `firebaserules ...:test`.

**Backfill:** los 19 equipos quedaron con `flota='propia'` (PATCH con `updateMask.fieldPaths=flota`, 19/19 OK, idempotente). **993 registros intactos** (801 excel + 187 excel-v2 + **5 manual**; los 2 últimos manuales son del usuario: G14 30-sep y G12 1-oct 2026).

**Usuario Encargado:** creado vía Identity Platform REST (localId `ngrzeBQ6GzQHVGgU93xR9jYx6L93`) + correo de reset enviado. Contraseña la define el usuario. NO volver a imprimir passwords temporales en el chat.

**Verificación con el idToken REAL del Encargado (`%TEMP%\opencode\test-encargado.mjs`):** lee equipos/registros/baterias 200, crea equipo 200, edita equipo 200, crea batería 200, **borra equipo 403**, **borra batería 403**. Docs de prueba ZZ_ENC_* limpiadas con token owner.

**Código:** `db.js` (flotaDe/crear/resolverCodigo + capa `Baterias`), `auth.js` (esAdmin/esEncargado/puedeBorrar), `gruas.js` (tabs de flota, chip arriendo, borrar oculto para no-admin), `mantenciones.js` (nuevoEquipo + flota/empresa en editar), `baterias.js` (nuevo), `app.js` (rutas), `importar.js` (dropdown de equipos ahora desde Firestore, no EQUIPOS_INICIALES), `manifest.json` (iconos ?v=8), `sw.js` (gruas-v5 + baterias.js en precache). Footer v8.

**Deploy:** `firebase deploy --only firestore:rules,hosting` → compile OK, hosting release complete. Checksums local==producción en los 11 archivos (`%TEMP%\opencode\verificar-deploy.mjs`).

**Smoke test:** `%TEMP%\opencode\smoke.mjs` carga los 10 scripts en el mismo orden que `index.html` con stubs de DOM/firebase y ejecuta 9 vistas → todas OK. `%TEMP%\opencode\check-dups.mjs` confirma que no hay declaraciones top-level duplicadas entre scripts.

## Datos históricos relevantes (del Excel original)

- G11 Yale vendida → estado `vendida`, se ve atenuada
- Hoja "grua 14" = G14 Linde (su cabecera dice G15 por error; G15 NO existe)
- Fechas seriales Excel (43643) → convertidas a ISO por el importador
- Filas sin fecha son continuación del registro anterior
- Empresas normalizadas: ACAM, Linde, Farias, Combustronica, Inter Whells, Luis Suarez, Batrol, SKC

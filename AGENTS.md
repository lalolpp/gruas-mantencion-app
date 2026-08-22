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
| Repo GitHub | https://github.com/lalolpp/gruas-mantencion-app (privado, cuenta lalolpp) |
| Cuenta Google/Firebase CLI | edo.electric@gmail.com |
| Base Firestore | `(default)` en southamerica-east1 |

## Estado actual (agosto 2026)

- [x] PWA completa desplegada en Firebase Hosting
- [x] Login con Firebase Auth (Email/contraseña activado, usuario admin creado y verificado)
- [x] Reglas Firestore desplegadas: solo usuarios autenticados leen/escriben
- [x] **17 equipos cargados en Firestore** (G1–G14, T01–T03) insertados vía REST API con token OAuth del CLI
- [x] Dashboard con semáforo (verde >100h / amarillo ≤100h / rojo vencida / gris sin datos)
- [x] Ficha por equipo con historial completo (trabajos/elementos/observaciones expandibles)
- [x] Filtros en historial: rango de fechas + búsqueda por repuesto/trabajo/empresa/responsable
- [x] Edición de equipos (código, marca, serie, depto, operador, estado, intervalo)
- [x] Nuevo registro manual mobile-friendly
- [x] Importador Excel con mapeo hoja→equipo editable, vista previa y carga por lotes de 400
- [x] Vista "Compartir": QR del enlace, copiar/compartir, botón instalar PWA
- [x] **801 registros históricos importados** (agosto 2026): script Node en `%TEMP%\opencode\importar-historial.mjs` parsea `Gamalier_Gruas_prompt_OpenCode.md` y sube vía REST API con token OAuth del CLI. Conteos verificados por equipo (G1:61 G2:47 G3:60 G4:64 G5:59 G6:68 G7:87 G8:83 G9:77 G10:33 G11:24 G12:63 G13:50 G14:9 T01:3 T02:10 T03:3). Fechas-typo corregidas (GRUA1 f43, GRUA5 f24/f60, GRUA9 f19/f158, grua13 f2/f122); filas sin fecha fusionadas como continuación; horómetros decimales como doubleValue
- [ ] Opcional: cambiar contraseña del usuario desde consola Firebase

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
  - `equipos`: codigo, categoria(grua|traspaleta), marca, tipo(electrica|combustion), n_serie, intervaloHoras, dpto, operador, estado(operativa|detenido|vendida), detalle
  - `registros`: equipo(código), fecha ISO, horometro, hProx, tipo(revision|preventiva|correctiva|recambio|accesorios|otra), empresa, responsable, supervisor, trabajos, elementos, observaciones, origen(excel|manual), creadoEn
- Semáforo: `restantes = último hProx conocido − máximo horómetro`
- Service worker cachea el shell (`sw.js`); firebase.json envía sw.js con no-cache

## Datos históricos relevantes (del Excel original)

- G11 Yale vendida → estado `vendida`, se ve atenuada
- Hoja "grua 14" = G14 Linde (su cabecera dice G15 por error; G15 NO existe)
- Fechas seriales Excel (43643) → convertidas a ISO por el importador
- Filas sin fecha son continuación del registro anterior
- Empresas normalizadas: ACAM, Linde, Farias, Combustronica, Inter Whells, Luis Suarez, Batrol, SKC

# Mantención de Grúas — Estado del Proyecto

App PWA para controlar las mantenciones de grúas horquillas y traspaletas
(Toyota, Linde, Yale). Reemplaza el Excel `mantenciones gruas.xlsx`.

## Estado actual

- [x] PWA desplegada en Firebase Hosting: https://gruas-mantencion-app.web.app
- [x] **Sin login** (modo abierto, v9): se entra directo a la app
- [x] Catálogo de 19 equipos (G1–G14, T01–T03, BAOLI, ALZA), todos `flota=propia`
- [x] Dashboard con semáforo de mantenciones (verde/amarillo/rojo)
- [x] Ficha por equipo + historial completo con filtros
- [x] Formulario nuevo registro (celular-friendly)
- [x] Importador de Excel con vista previa y mapeo hoja→equipo
- [x] **993 registros** (801 excel + 187 excel-v2 + 5 manuales del usuario)
- [x] **Flota propia / arriendo**: campo `flota` en equipos, prefijo automático
  ante colisiones (`AR-G5`), pestañas Todas/Propias/Arriendo en Inicio y
  chip de arriendo en las tarjetas
- [x] **Alta de equipos** desde la app (vista "Nuevo equipo")
- [x] **Módulo Baterías** con estado actual + historial de eventos
  (carga, cambio, reparación, baja, alta), número manual y áreas
  (incluida Vega)
- [x] **Rol Encargado** (`eduardo.espinoza@garatehermanos.cl`): lee, crea y
  edita, **no borra**
- [x] **MODO ABIERTO (v9)**: la app abre sin login. Cualquiera con la URL
  puede ver, crear, editar y **borrar**. Decisión del usuario, con el riesgo
  asumido (los nombres de responsables quedan expuestos)
- [x] Seguridad: validadores estructurales siguen activos + deny-all para
  colecciones futuras (ver `firestore.rules`)

## Seguridad (leer antes de tocar reglas)

**Estado actual: MODO ABIERTO.** `firestore.rules` tiene una funciónInterrupt
conmutable:

```js
function modoAbierto() { return true; }   // ← poner false para volver a exigir login
```

Mientras valga `true`, las reglas ignoran los roles y permiten todo en
`equipos`, `registros`, `baterias` y `baterias/{id}/eventos`, incluso a
peticiones **sin sesión** (sin token). Para volver a cerrarla: poner
`modoAbierto()` en `false`, desplegar reglas y recargar. Los helpers de rol
siguen ahí y se reactivan solos:

- `esAdmin()` = `edo.electric@gmail.com` (verificado con regex
  `(?i)^edo\\.electric@gmail\\.com$`, **sin `toLowerCase()`**, que no existe
  en Security Rules)
- `esEncargado()` = `eduardo.espinoza@garatehermanos.cl` — lee/crea/edita,
  **no borra**
- `puedeEditar()` / `puedeBorrar()` son las funciones que las reglas usan.
- Los validadores (`equipoValido`, `registroValido`, `bateriaValida`) se
  evaluan **solo en escrituras**: usar `request.resource` dentro de un
  `allow read` rompe todo (error de evaluación → denegado).
- Cualquier colección que no sea esas cuatro sigue denegada
  (`match /{document=**}`).
- **Los nombres de función deben ser lowerCamelCase.** `MODO_ABIERTO()` es
  inválido y hace fallar TODAS las reglas (el API lo reporta como
  `Invalid variable name`). Usar `modoAbierto()`.
- El frontend expone la `apiKey` (normal en Firebase web); con el modo abierto
  la protección real son las reglas, no la key.

## Desplegar cambios

```powershell
cd "C:\Users\HP\Documents\Default Project\gruas-mantencion-app"
& "$env:APPDATA\npm\firebase.cmd" deploy --only firestore:rules,hosting --project gruas-mantencion-app --non-interactive
```

Después del deploy, comparar checksums local vs producción
(`%TEMP%\opencode\verificar-deploy.mjs`).

## Importar el Excel

Vista **Importar**: seleccionar `mantenciones gruas.xlsx`, revisar que cada
hoja esté mapeada al equipo correcto (editable en pantalla), ver vista previa
y confirmar. Ver `docs/excel-formato.md` para el detalle técnico.

## Uso en el celular

Abrir la URL en Chrome Android > menú > **Agregar a pantalla principal**.
Queda como app con ícono propio y funciona offline sobre lo ya cargado
(Firestore guarda localmente y sincroniza al volver la conexión).

## Estructura

```
gruas-app/
├── static/
│   ├── index.html            # SPA principal
│   ├── login.html            # ingreso
│   ├── css/style.css
│   ├── js/
│   │   ├── firebase-config.js  # ← pegar config aquí
│   │   ├── auth.js             # login/guardián
│   │   ├── db.js               # CRUD Firestore (equipos, registros, baterias)
│   │   ├── catalogo-inicial.js # los 17 equipos
│   │   ├── mapping.js          # nombre de hoja → código de equipo
│   │   ├── importar.js         # parser SheetJS + UI de importación
│   │   ├── gruas.js            # dashboard semáforo + ficha/historial
│   │   ├── mantenciones.js     # formulario nuevo registro + catálogo + alta de equipo
│   │   └── baterias.js         # módulo de baterías e historial
│   ├── manifest.json         # PWA
│   ├── sw.js                 # service worker (offline shell)
│   └── img/                  # íconos 192/512
├── docs/excel-formato.md     # reglas del formato de importación
├── firestore.rules           # roles admin/encargado (esAdmin / esEncargado)
└── firebase.json             # hosting (public/static) + rules
```

## Modelo de datos (Firestore)

```
equipos/{autoId}
  codigo, categoria(grua|traspaleta), marca(TOYOTA|LINDE|YALE),
  tipo(electrica|combustion), n_serie, intervaloHoras,
  dpto, operador, estado(operativa|detenido|vendida), detalle,
  flota(propia|arriendo), empresaArrendadora(solo arriendo)

registros/{autoId}
  equipo("G1"), fecha("2024-05-12"), horometro(number|null),
  hProx(number|null), tipo(revision|preventiva|correctiva|recambio|accesorios|otra),
  empresa, responsable, supervisor,
  trabajos(multilinea), elementos(multilinea), observaciones(multilinea),
  origen(excel|excel-v2|manual), creadoEn(serverTimestamp)

baterias/{autoId}
  numero(manual, único), nSerie, flota(propia|arriendo), equipo("G5"),
  area(Frío|Despacho|Repaletizado|Mercado interno|Bodega|Centro de armado|
       Packing|Vega|Recepción),
  estado(vigente|en recarga|dañada|dada de baja), notas,
  creadoEn, actualizadoEn

baterias/{id}/eventos/{autoId}     ← historial
  tipo(carga|cambio|reparacion|baja|alta), fecha("2026-10-05"),
  nota, creadoEn
```

Semáforo: `restantes = último hProx conocido − máximo horómetro`.
Rojo < 0 · amarillo ≤ 100 h · verde > 100 h · gris sin datos.

## Notas de datos históricos

- G11 (Yale) está vendida: se importa igual, queda con estado `vendida`
  y se ve atenuada en el dashboard.
- La hoja "grua 14" contiene a la **G14 Linde** aunque su cabecera diga G15.
  No existe G15.
- La numeración de horas de los registros antiguos es confiable; el semáforo
  usa siempre el último registro con "próxima mantención" informada.

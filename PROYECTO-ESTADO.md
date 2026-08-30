# Mantención de Grúas — Estado del Proyecto

App PWA para controlar las mantenciones de grúas horquillas y traspaletas
(Toyota, Linde, Yale). Reemplaza el Excel `mantenciones gruas.xlsx`.

## Estado actual

- [x] PWA desplegada en Firebase Hosting: https://gruas-mantencion-app.web.app
- [x] Login con Firebase Auth (usuario admin: `edo.electric@gmail.com`)
- [x] Catálogo de 19 equipos (G1–G14, T01–T03, BAOLI, ALZA)
- [x] Dashboard con semáforo de mantenciones (verde/amarillo/rojo)
- [x] Ficha por equipo + historial completo con filtros
- [x] Formulario nuevo registro (celular-friendly)
- [x] Importador de Excel con vista previa y mapeo hoja→equipo
- [x] **991 registros importados** (agosto 2026)
- [x] Seguridad: Firestore solo lectura/escritura del admin
  (ver `firestore.rules`)

## Seguridad (leer antes de tocar reglas)

- `firestore.rules` permite leer/escribir **solo al email admin**
  (`edo.electric@gmail.com`, función `esAdmin()`). Si se crea otro usuario,
  agregarlo ahí y volver a desplegar las reglas.
- Cualquier otra colección queda denegada por defecto (`match /{document=**}`).
- El frontend expone la `apiKey` (normal en Firebase web); la protección real
  está en las reglas, no en la key.

## Desplegar cambios

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
│   │   ├── db.js               # CRUD Firestore (equipos, registros)
│   │   ├── catalogo-inicial.js # los 17 equipos
│   │   ├── mapping.js          # nombre de hoja → código de equipo
│   │   ├── importar.js         # parser SheetJS + UI de importación
│   │   ├── gruas.js            # dashboard semáforo + ficha/historial
│   │   └── mantenciones.js     # formulario nuevo registro + catálogo
│   ├── manifest.json         # PWA
│   ├── sw.js                 # service worker (offline shell)
│   └── img/                  # íconos 192/512
├── docs/excel-formato.md     # reglas del formato de importación
├── firestore.rules           # solo el admin lee/escribe (esAdmin)
└── firebase.json             # hosting (public/static) + rules
```

## Modelo de datos (Firestore)

```
equipos/{autoId}
  codigo, categoria(grua|traspaleta), marca(TOYOTA|LINDE|YALE),
  tipo(electrica|combustion), n_serie, intervaloHoras,
  dpto, operador, estado(operativa|detenido|vendida), detalle

registros/{autoId}
  equipo("G1"), fecha("2024-05-12"), horometro(number|null),
  hProx(number|null), tipo(revision|preventiva|correctiva|recambio|accesorios|otra),
  empresa, responsable, supervisor,
  trabajos(multilinea), elementos(multilinea), observaciones(multilinea),
  origen(excel|excel-v2|manual), creadoEn(serverTimestamp)
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

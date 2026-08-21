# Mantención de Grúas — Estado del Proyecto

App PWA para controlar las mantenciones de grúas horquillas y traspaletas
(Toyota, Linde, Yale). Reemplaza el Excel `mantenciones gruas.xlsx`.

## Estado actual

- [x] Estructura base creada (PWA estática + Firebase)
- [x] Login con Firebase Auth
- [x] Catálogo inicial de 17 equipos (G1–G14, T01–T03)
- [x] Dashboard con semáforo de mantenciones (verde/amarillo/rojo)
- [x] Ficha por equipo + historial completo
- [x] Formulario nuevo registro (celular-friendly)
- [x] Importador de Excel con vista previa y mapeo hoja→equipo
- [ ] **Configurar Firebase** (pendiente del usuario)
- [ ] Importar `mantenciones gruas.xlsx` real
- [ ] Instalar como PWA en el celular

## Pendiente del usuario: conectar Firebase (10 min)

1. Ir a https://console.firebase.google.com y crear proyecto
   (ej: `gruas-app`). Puede desactivar Analytics.
2. En el proyecto: **Compilación > Authentication > Comenzar >
   Correo/contraseña > Habilitar**, luego crear tu usuario en la pestaña Users.
3. **Compilación > Firestore Database > Crear base de datos**
   (modo producción, ubicación southamerica-east1 o us-central).
4. **Configuración del proyecto (engranaje) > Tus apps > Web (`</>`)**:
   registrar app web y copiar el objeto `firebaseConfig`.
5. Pegar esa config en `static/js/firebase-config.js` (reemplazar los placeholders).
6. Desplegar reglas y hosting:
   ```powershell
   npm install -g firebase-tools
   firebase login
   cd gruas-app
   firebase use --add    # elegir el proyecto creado
   firebase deploy       # sube rules + hosting
   ```
7. Abrir la URL que entrega Hosting (ej: `https://gruas-app.web.app`),
   iniciar sesión e ir a **Catálogo > Cargar catálogo inicial**.

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
├── firestore.rules           # solo usuarios autenticados leen/escriben
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
  origen(excel|manual), creadoEn(serverTimestamp)
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

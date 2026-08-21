# Formato del Excel para importar

El importador (`js/importar.js`) lee libros .xlsx/.xls con este formato,
idéntico al original `mantenciones gruas.xlsx`:

## Reglas

- **Una hoja por equipo.** El nombre de la hoja se mapea a un código:
  `GRUA1→G1 ... GRUA9→G9`, `GRUA10 volcadora→G10`, `grua 12→G12`,
  `grua 13→G13`, `grua 14→G14` (aunque diga G15 adentro), `T01/T02/T03`.
  Las hojas `GRUAS DESIGNADAS` y `cronograma` se ignoran.
  La hoja `no existe` corresponde a la G11 vendida.
- **Encabezado:** cualquier fila de las primeras 15 que contenga una columna
  con la palabra FECHA se toma como encabezado.
- **Columnas reconocidas** (por nombre aproximado):
  | Columna | Reconoce |
  |---|---|
  | Fecha | `FECHA`, `FECHA INSPECCION`, `FECHA` |
  | Horómetro | `HOROMETRO` |
  | Próxima | `H.PROX. MANTEN.`, cualquier texto con H.PROX o PROX MANTEN |
  | Empresa | `EMPRESA RESPONSABLE` |
  | Tipo | `TIPO DE MANTENCIÓN` |
  | Trabajos | `TRABAJOS REALIZADOS` |
  | Elementos | `ELEMENTOS CAMBIADOS` |
  | Responsable | `PERSONA RESPONZABLE`, `RESPONZABLE` |
  | Observaciones | `OBSERVACIONES` |
  | Supervisor | `SUPERVISOR` |

## Comportamientos especiales

- **Fechas como número serial** (43643) se convierten automáticamente a fecha.
- **Filas sin fecha** (continuación): su texto se agrega al registro anterior en
  las columnas correspondientes (trabajos, elementos, observaciones).
- Horómetro o próxima mantención en 0 se tratan como vacío.
- Tipos se normalizan a: revision / preventiva / correctiva / recambio /
  accesorios / otra.
- Empresas conocidas se normalizan: ACAM, Linde, Farias, Combustronica,
  Inter Whells, Luis Suarez, Batrol, SKC.

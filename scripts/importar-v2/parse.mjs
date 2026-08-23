// Parser v2 — transcripcion_mantenciones_gruas_para_opencode.txt -> datos.json
// Genera registros estructurados por equipo, fusionando filas de continuación,
// normalizando fechas y marcando anomalías. No toca Firestore.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FUENTE = process.argv[2] || "C:\\Users\\lalo_lpp\\Downloads\\transcripcion_mantenciones_gruas_para_opencode.txt";
const SALIDA = path.join(__dirname, "datos.json");

const MAPA_HOJAS = {
  "G1-34556": "G1", "G2": "G2", "G3-33670": "G3", "G4": "G4",
  "G5-2797": "G5", "G6-8022": "G6", "G7-64297": "G7", "G8-71895": "G8",
  "G9-71911": "G9", "10 volc-0504": "G10", "no existe": "G11",
  "12-7990": "G12", "G13-73894": "G13", "G14-1382": "G14",
  "T01": "T01", "T02-0445": "T02", "T03-8248": "T03",
  "baoli": "BAOLI", "alza hombre 5559": "ALZA",
};

const norm = s => s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const limpiar = s => String(s ?? "").replace(/\s+/g, " ").trim();
const esFormula = v => v.startsWith("=");

function clasificarHeader(texto) {
  const t = norm(texto);
  if (t.includes("FECHA")) return "fecha";
  if (t.startsWith("HOROMETRO")) return "horometro";
  if (t.startsWith("H.PROX") || t.includes("PROX. MANTEN") || t.includes("PROX MAN")) return "hprox";
  if (t.includes("RESTANTES")) return "_rest";
  if (t.includes("EMPRESA")) return "empresa";
  if (t.startsWith("TIPO")) return "tipo";
  if (t.includes("TRABAJO")) return "trabajos";
  if (t.includes("ELEMENTO")) return "elementos";
  if (t.includes("RESPONSABLE") || t.includes("RESPONZABLE")) return "responsable";
  if (t.includes("OBSERVACION")) return "observaciones";
  if (t.includes("SUPERVISOR")) return "supervisor";
  if (t.includes("N°") || t.includes("Nº") || t.includes("GRU A") || t === "N GRUA" || t.includes("TRASPALETA")) return "_marcaEq";
  return null;
}

function normalizarFecha(raw, equipo, vecinos, avisos) {
  let f = limpiar(raw);
  if (!f) return null;
  // correcciones manuales puntuales (mismo criterio que importador original)
  const MANUALES = { "G13|2007-11-20": "2020-11-20" };
  if (MANUALES[`${equipo}|${f}`]) {
    avisos.push(`${equipo}: ${f} -> ${MANUALES[`${equipo}|${f}`]} (corrección manual: entrega equipo nuevo)`);
    return MANUALES[`${equipo}|${f}`];
  }
  // rango dd-mm-aa/dd-mm-aa -> primera parte
  if (/^\d{1,2}-\d{1,2}-\d{2,4}\s*\/\s*\d{1,2}-\d{1,2}-\d{2,4}$/.test(f)) {
    avisos.push(`${equipo}: fecha en rango "${f}" -> se toma la primera`);
    f = f.split("/")[0].trim();
  }
  let m = f.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    let [_, y, mo, d] = m;
    if (+y < 2015 || +y > 2026) {
      const aniosVecinos = vecinos.filter(Boolean).map(v => +v.slice(0, 4)).filter(n => n >= 2015 && n <= 2026);
      const nuevo = aniosVecinos.length ? aniosVecinos[aniosVecinos.length - 1] : null;
      if (nuevo) {
        avisos.push(`${equipo}: año sospechoso ${y} en ${f} -> corregido a ${nuevo}-${mo.padStart(2, "0")}-${d.padStart(2, "0")} (vecino)`);
        return `${nuevo}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
      avisos.push(`${equipo}: año sospechoso ${y} en ${f} -> SIN corrección (sin vecino válido)`);
    }
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  m = f.match(/^(\d{1,2})-(\d{1,2})-(\d{2,3})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    else { avisos.push(`${equipo}: año malformado "${y}" (${f}) -> asumido 20${y.slice(-2)}`); y = "20" + y.slice(-2); }
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  avisos.push(`${equipo}: fecha no reconocida "${f}" -> se deja como texto`);
  return f;
}

// ---- leer y separar hojas
const texto = fs.readFileSync(FUENTE, "utf8");
const hojas = {};
let hojaActual = null;
for (const linea of texto.split(/\r?\n/)) {
  const mh = linea.match(/^HOJA:\s*(.+?)\s*$/);
  if (mh) { hojaActual = mh[1]; hojas[hojaActual] = []; continue; }
  const mf = linea.match(/^Fila\s+\d+:\s*(.+)$/);
  if (mf && hojaActual && MAPA_HOJAS[hojaActual]) hojas[hojaActual].push(mf[1]);
}

const registros = [];
const avisos = [];
const resumen = {};

for (const [hoja, lineas] of Object.entries(hojas)) {
  const equipo = MAPA_HOJAS[hoja];
  let mapa = null;            // colNum -> campo
  let actual = null;

  const cerrar = () => {
    if (!actual) return;
    actual.trabajos = actual._t.join("\n");
    actual.elementos = actual._e.join("\n");
    actual.observaciones = actual._o.join("\n");
    delete actual._t; delete actual._e; delete actual._o;
    registros.push(actual);
    resumen[equipo] = (resumen[equipo] || 0) + 1;
    actual = null;
  };

  for (const linea of lineas) {
    const celdas = {};
    for (const parte of linea.split(/\s+\|\s+/)) {
      const mc = parte.match(/^(\d+)=(.*)$/s);
      if (mc) celdas[+mc[1]] = mc[2];
    }

    // detectar fila cabecera
    const valores = Object.values(celdas).map(limpiar);
    if (valores.some(v => norm(v).includes("FECHA")) && valores.some(v => norm(v).startsWith("HOROMETRO"))) {
      cerrar(); mapa = {};
      for (const [col, val] of Object.entries(celdas)) {
        const campo = clasificarHeader(val);
        if (campo) mapa[+col] = campo;
      }
      continue;
    }
    if (!mapa) continue;

    const get = campo => {
      for (const [col, c] of Object.entries(mapa)) if (c === campo) return limpiar(celdas[col] ?? "");
      return "";
    };

    const fechaRaw = get("fecha");
    const marcadorEquipo = fechaRaw && fechaRaw.toLowerCase() === equipo.toLowerCase();

    if (fechaRaw && !marcadorEquipo && !esFormula(fechaRaw) && /\d/.test(fechaRaw)) {
      cerrar();
      const num = v => { const s = limpiar(v); return s && !esFormula(s) && /^\d+(\.\d+)?$/.test(s) ? parseFloat(s) : null; };
      actual = {
        equipo,
        fecha: null, // se completa tras conocer vecinos
        horometro: num(get("horometro")),
        hProx: num(get("hprox")),
        empresa: limpiar(get("empresa")).replace(/^-\s*/, "") || "",
        tipo: limpiar(get("tipo")).replace(/^-\s*/, "") || "",
        responsable: limpiar(get("responsable")).replace(/^-\s*/, "") || "",
        supervisor: limpiar(get("supervisor")).replace(/^-\s*/, "") || "",
        origen: "excel-v2",
        _t: [], _e: [], _o: [],
        _fechaRaw: fechaRaw,
      };
      const apx = (campo, valor) => { const v = limpiar(valor); if (v && !esFormula(v) && v !== "-") actual["_" + campo].push(v); };
      apx("t", get("trabajos"));
      apx("e", get("elementos"));
      apx("o", get("observaciones"));
      continue;
    }

    // continuación (sin fecha) -> agrega texto al registro vigente
    if (actual) {
      const apx = (campo, valor) => { const v = limpiar(valor); if (v && !esFormula(v) && v !== "-") actual["_" + campo].push(v); };
      apx("t", get("trabajos"));
      apx("e", get("elementos"));
      apx("o", get("observaciones"));
      // responsable/supervisor/empresa pueden completarse en continuación
      for (const c of ["empresa", "tipo", "responsable", "supervisor"]) {
        if (!actual[c]) { const v = limpiar(get(c)); if (v && !esFormula(v) && v !== "-") actual[c] = v; }
      }
    } else {
      // fila sin fecha antes del primer registro con fecha (ej: G5 servicio 5000h)
      const tieneTexto = ["trabajos", "elementos", "observaciones"].some(c => limpiar(get(c)));
      if (tieneTexto) {
        cerrar();
        actual = {
          equipo, fecha: null, horometro: null, hProx: null,
          empresa: limpiar(get("empresa")), tipo: limpiar(get("tipo")),
          responsable: limpiar(get("responsable")), supervisor: limpiar(get("supervisor")),
          origen: "excel-v2", _t: [], _e: [], _o: [], _fechaRaw: "",
        };
        const apx = (campo, valor) => { const v = limpiar(valor); if (v && !esFormula(v) && v !== "-") actual["_" + campo].push(v); };
        apx("t", get("trabajos")); apx("e", get("elementos")); apx("o", get("observaciones"));
        avisos.push(`${equipo}: registro inicial sin fecha creado`);
      }
    }
  }
  cerrar();
}

// normalizar fechas con vecinos del MISMO equipo (segunda pasada)
const porEquipo = {};
for (const r of registros) (porEquipo[r.equipo] ??= []).push(r);
for (const rs of Object.values(porEquipo)) {
  for (let i = 0; i < rs.length; i++) {
    const r = rs[i];
    if (!r._fechaRaw || !r._fechaRaw.trim()) { r.fecha = r.fecha ?? null; continue; }
    const vecinos = [rs[i - 1]?.fecha, rs[i + 1]?.fecha].filter(Boolean);
    r.fecha = normalizarFecha(r._fechaRaw, r.equipo, vecinos, avisos);
  }
}

// limpiar campos internos
for (const r of registros) delete r._fechaRaw;

// hoja GRUAS DESIGNADAS -> info opcional de flota
const designadas = [];
{
  const lineas = [];
  let cap = false;
  for (const linea of texto.split(/\r?\n/)) {
    if (/^HOJA:\s*GRUAS DESIGNADAS/.test(linea)) { cap = true; continue; }
    if (/^HOJA:/.test(linea) && cap) break;
    if (cap) { const mf = linea.match(/^Fila\s+\d+:\s*(.+)$/); if (mf) lineas.push(mf[1]); }
  }
  for (const l of lineas) {
    const c = {};
    for (const p of l.split(/\s+\|\s+/)) { const m = p.match(/^(\d+)=(.*)$/s); if (m) c[+m[1]] = limpiar(m[2]); }
    if (c[3] && /^(1[0-4]|[1-9])$/.test(c[3])) {
      designadas.push({
        codigo: "G" + c[3], marca: c[4] || "", tipo: c[5] || "",
        operadorA: c[6] || "", operadorB: c[7] || "", dpto: c[8] || "",
      });
    }
  }
}

const total = registros.length;
const salida = { generado: new Date().toISOString(), fuente: FUENTE, totalRegistros: total, resumenPorEquipo: resumen, avisos, nuevosEquiposPropuestos: ["BAOLI", "ALZA"], flotaDesignada: designadas, registros };
fs.writeFileSync(SALIDA, JSON.stringify(salida, null, 1), "utf8");

console.log(`Total registros parseados: ${total}`);
console.log("Por equipo:", JSON.stringify(resumen));
console.log(`Avisos: ${avisos.length}`); avisos.slice(0, 15).forEach(a => console.log("  -", a));
console.log(`OK -> ${SALIDA}`);

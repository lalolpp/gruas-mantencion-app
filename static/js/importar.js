const Importador = (() => {
  const PATRONES = [
    ['fecha', /fecha/i],
    ['horometro', /^hor[oó]metro$/i],
    ['hProx', /(h\.?\s*prox|prox\.?\s*manten)/i],
    ['empresa', /empresa/i],
    ['tipo', /tipo/i],
    ['trabajos', /trabajo/i],
    ['elementos', /elemento/i],
    ['persona', /resp[oá]nsable/i],
    ['obs', /observaci/i],
    ['supervisor', /supervis/i]
  ];

  function mapearColumnas(fila) {
    const map = {};
    const usados = new Set();
    (fila || []).forEach((celda, i) => {
      const txt = String(celda ?? '').trim();
      if (!txt) return;
      for (const [campo, re] of PATRONES) {
        if (map[campo] == null && !usados.has(i) && re.test(txt)) {
          map[campo] = i;
          usados.add(i);
          break;
        }
      }
    });
    return map.fecha != null ? map : null;
  }

  function serialAISO(n) {
    const d = new Date(Math.round((n - 25569) * 86400 * 1000));
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  function parseFecha(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number' && v > 20000 && v < 60000) return serialAISO(v);
    const s = String(v).trim();
    let m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if (m) {
      let [, d, mes, y] = m;
      if (y.length === 2) y = '20' + y;
      return `${y}-${mes.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    const t = Date.parse(s);
    return isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
  }

  function tipoNorm(t) {
    const n = MapaHojas.normalizar(t);
    if (!n) return '';
    if (n.includes('REVISION')) return 'revision';
    if (n.includes('CORRECTIVA')) return 'correctiva';
    if (n.includes('RECAMBIO')) return 'recambio';
    if (n.includes('ACCESOR')) return 'accesorios';
    if (n.includes('PREVENTIVA') || n.includes('MANTENC') || /\d+H(RS)?$/.test(n)) return 'preventiva';
    return 'otra';
  }

  const EMPRESAS = {
    ACAM: 'ACAM',
    LINDE: 'Linde',
    FARIAS: 'Farias',
    CRISTIANFARIAS: 'Farias',
    COMBUSTRONICA: 'Combustronica',
    INTERWHELLS: 'Inter Whells',
    LUISSUAREZ: 'Luis Suarez',
    BATROL: 'Batrol',
    SKC: 'SKC'
  };

  function empresaNorm(e) {
    if (!e) return '';
    const k = MapaHojas.normalizar(e);
    if (EMPRESAS[k]) return EMPRESAS[k];
    return e.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()).trim();
  }

  function parseHoja(ws) {
    const filas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
    let colmap = null;
    let headerIdx = -1;
    for (let r = 0; r < Math.min(filas.length, 15); r++) {
      const cm = mapearColumnas(filas[r]);
      if (cm) { colmap = cm; headerIdx = r; break; }
    }
    if (!colmap) return { error: 'Sin encabezado con columna FECHA' };

    const registros = [];
    const avisos = [];
    for (let r = headerIdx + 1; r < filas.length; r++) {
      const f = filas[r] || [];
      const val = i => (i == null ? '' : String(f[i] ?? '').trim());
      const numPos = i => {
        if (i == null) return null;
        const v = f[i];
        if (v === '' || v == null) return null;
        const n = parseFloat(v);
        return isNaN(n) || n <= 0 ? null : n;
      };
      const campos = {
        horometro: numPos(colmap.horometro),
        hProx: numPos(colmap.hProx),
        empresa: val(colmap.empresa),
        tipoRaw: val(colmap.tipo),
        trabajos: val(colmap.trabajos),
        elementos: val(colmap.elementos),
        responsable: val(colmap.persona),
        observaciones: val(colmap.obs),
        supervisor: val(colmap.supervisor)
      };
      const tieneAlgo = campos.horometro != null || campos.hProx != null ||
        campos.empresa || campos.tipoRaw || campos.trabajos || campos.elementos ||
        campos.responsable || campos.observaciones || campos.supervisor;
      if (!tieneAlgo) continue;

      const fechaISO = parseFecha(val(colmap.fecha));
      if (fechaISO) {
        registros.push({ fecha: fechaISO, ...campos });
      } else {
        const prev = registros[registros.length - 1];
        if (prev) {
          ['trabajos', 'elementos', 'observaciones'].forEach(k => {
            if (campos[k]) prev[k] = (prev[k] ? prev[k] + '\n' : '') + campos[k];
          });
          ['empresa', 'responsable', 'supervisor'].forEach(k => {
            if (campos[k] && !prev[k]) prev[k] = campos[k];
          });
          ['horometro', 'hProx'].forEach(k => {
            if (campos[k] != null && prev[k] == null) prev[k] = campos[k];
          });
        } else {
          avisos.push(`Fila ${r + 1} sin fecha ni registro previo: ignorada`);
        }
      }
    }
    return { registros, avisos };
  }

  function analizarLibro(wb) {
    const hojas = [];
    wb.SheetNames.forEach(nombre => {
      if (MapaHojas.esIgnorable(nombre)) return;
      const res = parseHoja(wb.Sheets[nombre]);
      hojas.push({
        nombre,
        codigoSugerido: MapaHojas.resolver(nombre),
        ...res,
        registros: res.registros || []
      });
    });
    return hojas;
  }

  Vistas.importar = async el => {
    el.innerHTML = `
      <h2>Importar Excel</h2>
      <p class="muted">Formato original de <b>mantenciones gruas.xlsx</b>: una hoja por equipo.</p>
      <input type="file" id="impFile" accept=".xlsx,.xls" />
      <div id="impResultado"></div>`;

    $('#impFile').addEventListener('change', async ev => {
      const file = ev.target.files[0];
      if (!file) return;
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      mostrarResultado($('#impResultado'), analizarLibro(wb));
    });
  };

  function opcionesEquipos(seleccionado, codigos) {
    let html = '<option value="">(ignorar)</option>';
    codigos.forEach(c => {
      html += `<option value="${c}" ${seleccionado === c ? 'selected' : ''}>${c}</option>`;
    });
    return html;
  }

  function mostrarResultado(contenedor, hojas) {
    const codigos = EQUIPOS_INICIALES.map(e => e.codigo);
    let totalRegs = 0;

    let html = '<table class="tabla"><thead><tr><th>Hoja</th><th>Equipo destino</th><th>Registros</th></tr></thead><tbody>';
    hojas.forEach((h, i) => {
      totalRegs += h.registros.length;
      const sel = h.error
        ? '-'
        : `<select data-hoja="${i}">${opcionesEquipos(h.codigoSugerido, codigos)}</select>`;
      html += `<tr><td>${h.nombre}</td><td>${sel}</td><td>${h.registros.length}</td></tr>`;
      if (h.avisos?.length) {
        html += `<tr class="fila-avisos"><td colspan="3"><span class="aviso">${h.nombre}: ${h.avisos.slice(0, 4).join(' · ')}</span></td></tr>`;
      }
    });
    html += '</tbody></table>';

    html += `<details class="preview"><summary>Vista previa de primeros registros por hoja</summary>`;
    hojas.forEach(h => {
      if (!h.registros.length) return;
      html += `<p><b>${h.nombre}</b></p>`;
      h.registros.slice(0, 3).forEach(r => {
        html += `<div class="mini-reg"><b>${r.fecha}</b> · ${r.horometro ?? '—'} h · ${r.tipoRaw || '(sin tipo)'} · ${r.empresa || '—'}<br>${(r.trabajos || r.observaciones || '').slice(0, 120)}</div>`;
      });
    });
    html += '</details>';

    html += `
      <label class="check"><input type="checkbox" id="impCrear" checked /> Crear equipos que falten en el catálogo</label>
      <button id="impBtn" class="btn primario">Importar ${totalRegs} registros</button>
      <div id="impProgreso"></div>`;
    contenedor.innerHTML = html;

    $('#impBtn').addEventListener('click', () => confirmarImportacion(hojas));
  }

  async function confirmarImportacion(hojas) {
    const seleccion = [];
    document.querySelectorAll('select[data-hoja]').forEach(sel => {
      const hoja = hojas[parseInt(sel.dataset.hoja, 10)];
      if (sel.value && hoja.registros.length) seleccion.push({ codigo: sel.value, hoja });
    });

    const crear = $('#impCrear').checked;
    const progreso = $('#impProgreso');
    $('#impBtn').disabled = true;

    try {
      let equiposNuevos = 0;
      if (crear) {
        const codigos = [...new Set(seleccion.map(s => s.codigo))];
        for (const c of codigos) {
          const existe = await Equipos.byCodigo(c);
          if (!existe) {
            const base = EQUIPOS_INICIALES.find(e => e.codigo === c);
            await Equipos.upsert(base || { codigo: c, categoria: 'grua', estado: 'operativa' });
            equiposNuevos++;
          }
        }
      }

      const regs = [];
      seleccion.forEach(({ codigo, hoja }) => {
        hoja.registros.forEach(r => {
          regs.push({
            equipo: codigo,
            fecha: r.fecha,
            horometro: r.horometro,
            hProx: r.hProx,
            tipo: tipoNorm(r.tipoRaw),
            empresa: empresaNorm(r.empresa),
            responsable: r.responsable,
            supervisor: r.supervisor,
            trabajos: r.trabajos,
            elementos: r.elementos,
            observaciones: r.observaciones,
            origen: 'excel'
          });
        });
      });

      progreso.textContent = `Subiendo 0/${regs.length}...`;
      const total = await Registros.bulkInsert(regs, n => {
        progreso.textContent = `Subiendo ${n}/${regs.length}...`;
      });

      Registros.invalidar();
      progreso.innerHTML = `<span class="ok">Listo: ${total} registros importados${equiposNuevos ? `, ${equiposNuevos} equipos creados` : ''}.</span> <a href="#/">Ir al inicio</a>`;
    } catch (err) {
      progreso.innerHTML = `<span class="aviso">Error: ${err.message}</span>`;
      $('#impBtn').disabled = false;
    }
  }

  return { analizarLibro, parseHoja, tipoNorm, empresaNorm };
})();

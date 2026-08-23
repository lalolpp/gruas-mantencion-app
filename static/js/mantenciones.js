const TIPOS = ['revision', 'inspeccion', 'preventiva', 'correctiva', 'recambio', 'accesorios', 'otra'];
const EMPRESAS_SUGERIDAS = ['ACAM', 'Linde', 'Farias', 'Combustronica', 'Inter Whells', 'Luis Suarez', 'Batrol', 'SKC'];

function csvCelda(v) {
  const s = v == null ? '' : String(v);
  return '"' + s.replace(/"/g, '""') + '"';
}
function descargarCSV(nombre, cabeceras, filas) {
  const lineas = [cabeceras.map(csvCelda).join(';')].concat(filas.map(f => f.map(csvCelda).join(';')));
  const blob = new Blob(['\uFEFF' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
}
const CABECERAS_AUDITORIA = ['Equipo', 'Categoria', 'Marca', 'Tipo equipo', 'N° serie', 'Depto', 'Operador', 'Estado', 'Fecha registro', 'Horometro (h)', 'Prox. mantencion (h)', 'Horas restantes', 'Tipo de mantencion', 'Empresa responsable', 'Responsable', 'Supervisor', 'Trabajos realizados', 'Elementos cambiados', 'Observaciones', 'Origen del dato'];
function filaAuditoria(e, r) {
  return [
    e ? e.codigo : r.equipo,
    e ? e.categoria || '' : '', e ? e.marca || '' : '', e ? e.tipo || '' : '', e ? e.n_serie || '' : '',
    e ? e.dpto || '' : '', e ? e.operador || '' : '', e ? e.estado || '' : '',
    r.fecha || '', r.horometro ?? '', r.hProx ?? '',
    typeof r.horometro === 'number' && typeof r.hProx === 'number' ? r.hProx - r.horometro : '',
    r.tipo || '', r.empresa || '', r.responsable || '', r.supervisor || '',
    r.trabajos || '', r.elementos || '', r.observaciones || '', r.origen || ''
  ];
}

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const PDF_AZUL = '#1e3a5f';

function pdfFechaHora() {
  const ahora = new Date();
  return [
    ahora.toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }),
    ahora.toLocaleTimeString('es-CL')
  ];
}

function pdfCabecera(fechaEmision, horaEmision) {
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid ${PDF_AZUL};padding-bottom:12px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:16px">
        <img src="img/logo.png" style="height:70px">
        <div>
          <div style="font-size:.85rem;color:#666;text-transform:uppercase;letter-spacing:1px">GAMALIER GRUAS</div>
          <div style="font-size:.8rem;color:#999">Control, Seguridad y Eficiencia</div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:.8rem;color:#999">Fecha de Emision</div>
        <div style="font-size:.95rem;font-weight:bold">${fechaEmision}</div>
        <div style="font-size:.8rem;color:#666">${horaEmision}</div>
      </div>
    </div>`;
}

function pdfTitulo(texto) {
  return `<div style="text-align:center;margin-bottom:20px">
    <h2 style="margin:0;color:${PDF_AZUL};text-transform:uppercase;letter-spacing:2px">${texto}</h2></div>`;
}

function pdfFilaDato(a, b, c, d) {
  return `<tr>
    <td style="padding:6px 10px;border:1px solid #ddd;width:25%"><strong>${a}</strong></td>
    <td style="padding:6px 10px;border:1px solid #ddd;width:25%">${esc(b)}</td>
    <td style="padding:6px 10px;border:1px solid #ddd;width:25%"><strong>${c}</strong></td>
    <td style="padding:6px 10px;border:1px solid #ddd;width:25%">${esc(d)}</td></tr>`;
}

function pdfSeccion(titulo, texto) {
  return `
    <div style="margin-top:14px;page-break-inside:avoid">
      <div style="background:${PDF_AZUL};color:#fff;padding:6px 10px;font-weight:bold;font-size:.9rem">${titulo}</div>
      <div style="border:1px solid #ddd;border-top:none;padding:10px;font-size:.9rem;white-space:pre-wrap;min-height:34px">${esc(texto || '—')}</div>
    </div>`;
}

function pdfBloqueRegistro(reg, eq) {
  let html = `<table style="width:100%;border-collapse:collapse;font-size:.88rem;margin-bottom:14px">
    <thead><tr style="background:${PDF_AZUL};color:#fff"><th colspan="4" style="padding:6px 10px;text-align:left">FICHA DEL EQUIPO</th></tr></thead><tbody>` +
    pdfFilaDato('Codigo', eq ? eq.codigo : reg.equipo, 'Marca', eq ? eq.marca : '') +
    pdfFilaDato('Tipo equipo', eq ? eq.tipo : '', 'N° de serie', eq ? eq.n_serie : '') +
    pdfFilaDato('Depto / sector', eq ? eq.dpto : '', 'Operador', eq ? eq.operador : '') +
    pdfFilaDato('Estado', eq ? eq.estado : '', 'Intervalo mantencion', eq && eq.intervaloHoras ? eq.intervaloHoras + ' h' : '') +
    `</tbody></table>`;

  const restantes = typeof reg.horometro === 'number' && typeof reg.hProx === 'number' ? String(reg.hProx - reg.horometro) + ' h' : '';
  html += `<table style="width:100%;border-collapse:collapse;font-size:.88rem;margin-bottom:6px">
    <thead><tr style="background:${PDF_AZUL};color:#fff"><th colspan="4" style="padding:6px 10px;text-align:left">DATOS DE LA MANTENCION</th></tr></thead><tbody>` +
    pdfFilaDato('Fecha registro', reg.fecha || '', 'Horometro', reg.horometro != null ? reg.horometro.toLocaleString('es-CL') + ' h' : '') +
    pdfFilaDato('Prox. mantencion', reg.hProx != null ? reg.hProx.toLocaleString('es-CL') + ' h' : '', 'Horas restantes', restantes) +
    pdfFilaDato('Tipo de mantencion', reg.tipo || '', 'Empresa responsable', reg.empresa || '') +
    pdfFilaDato('Responsable', reg.responsable || '', 'Supervisor', reg.supervisor || '') +
    `</tbody></table>`;

  html += pdfSeccion('TRABAJOS REALIZADOS', reg.trabajos);
  html += pdfSeccion('ELEMENTOS CAMBIADOS', reg.elementos);
  html += pdfSeccion('OBSERVACIONES', reg.observaciones);

  const [f] = pdfFechaHora();
  html += `
    <div style="margin-top:32px;page-break-inside:avoid">
      <div style="border-top:2px solid ${PDF_AZUL};padding-top:12px;display:flex;justify-content:space-between">
        <div style="width:45%">
          <div style="font-size:.85rem;font-weight:bold;color:${PDF_AZUL};margin-bottom:40px;border-bottom:1px solid #333;padding-bottom:4px">Responsable Ejecutor (Firma)</div>
          <div style="font-size:.75rem;color:#666">Nombre: ${esc(reg.responsable || '___________________________')}</div>
        </div>
        <div style="width:45%">
          <div style="font-size:.85rem;font-weight:bold;color:${PDF_AZUL};margin-bottom:40px;border-bottom:1px solid #333;padding-bottom:4px">Supervisor / Aprobador (Firma)</div>
          <div style="font-size:.75rem;color:#666">Nombre: ${esc(reg.supervisor || '___________________________')}</div>
        </div>
      </div>
      <div style="text-align:center;margin-top:24px;font-size:.7rem;color:#999;border-top:1px solid #eee;padding-top:6px">
        Documento generado por GAMALIER GRUAS | ${f}
      </div>
    </div>`;
  return html;
}

let _pdfDocumentoActual = null;
let _pdfNombreActual = 'reporte';

function pdfDocumentoCompleto(tituloIntro, bloques) {
  const [f, h] = pdfFechaHora();
  return '<div style="font-family:Arial,Helvetica,sans-serif;color:#333">' +
    pdfCabecera(f, h) + pdfTitulo(tituloIntro) + bloques + '</div>';
}

function registrarPDF(html, nombre) {
  _pdfDocumentoActual = html;
  _pdfNombreActual = nombre;
  mostrarModalPDF();
}

function mostrarModalPDF() {
  let modal = document.getElementById('pdf-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'pdf-modal';
    modal.innerHTML = `
      <div style="position:fixed;left:0;top:0;width:100%;height:100%;background:rgba(15,23,42,.65);overflow:auto;padding:16px;z-index:100000">
        <div style="max-width:820px;margin:0 auto">
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:8px;position:sticky;top:0;z-index:2">
            <button class="btn primario" id="btnPdfDescargar">Descargar PDF</button>
            <button class="btn" id="btnPdfCerrar">Cerrar</button>
          </div>
          <div id="pdf-modal-doc" style="background:#fff;border-radius:10px;padding:14px;box-shadow:0 10px 40px rgba(0,0,0,.45);margin-bottom:30px"></div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#btnPdfCerrar').addEventListener('click', () => { modal.style.display = 'none'; });
    modal.querySelector('#btnPdfDescargar').addEventListener('click', descargarPDFActual);
  }
  modal.style.display = 'block';
  modal.querySelector('#pdf-modal-doc').innerHTML = _pdfDocumentoActual;
}

function descargarPDFActual() {
  if (!_pdfDocumentoActual) return;
  const w = window.open('', '_blank');
  if (!w) {
    alert('Habilita las ventanas emergentes (popups) de este sitio para poder descargar el PDF.');
    return;
  }
  const logoAbs = _pdfDocumentoActual.split('src="img/logo.png"').join('src="' + location.origin + '/img/logo.png"');
  w.document.write('<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>' + esc(_pdfNombreActual) + '</title>' +
    '<style>@page{size:A4;margin:10mm}body{font-family:Arial,Helvetica,sans-serif;margin:0}</style></head><body>' +
    logoAbs +
    '<scr' + 'ipt>window.onload=function(){setTimeout(function(){window.print()},400)}<\/scr' + 'ipt>' +
    '</body></html>');
  w.document.close();
}

function generarPDFRegistro(reg, eq) {
  registrarPDF(
    pdfDocumentoCompleto('Registro de Mantencion', pdfBloqueRegistro(reg, eq)),
    `registro_${reg.equipo}_${reg.fecha}`
  );
}

function generarPDFHistorial(nombreArchivo, tituloIntro, pares) {
  const bloques = pares.map((p, i) =>
    '<div style="page-break-before:' + (i ? 'always' : 'auto') + '">' +
    pdfTitulo(`Registro ${i + 1} · ${esc(p.reg.equipo)}${p.reg.fecha ? ' — ' + esc(p.reg.fecha) : ''}`) +
    pdfBloqueRegistro(p.reg, p.eq) + '</div>').join('');
  registrarPDF(pdfDocumentoCompleto(tituloIntro, bloques), String(nombreArchivo).replace(/\.pdf$/i, ''));
}

Vistas.nuevo = async (el, equipoCodigo) => {
  el.innerHTML = '<p class="muted">Cargando...</p>';
  const equipos = await Equipos.list();

  el.innerHTML = `
    <a href="${equipoCodigo ? '#/equipo/' + equipoCodigo : '#/'}" class="volver">&larr; Volver</a>
    <h2>Nuevo registro</h2>
    <form id="frmReg" class="formulario">
      <label>Equipo
        <select id="rEquipo" required>
          ${equipos.map(e => `<option value="${e.codigo}" ${e.codigo === equipoCodigo ? 'selected' : ''}>${e.codigo} · ${e.marca} ${e.tipo}</option>`).join('')}
        </select>
      </label>
      <div class="fila">
        <label>Fecha
          <input type="date" id="rFecha" value="${hoyISO()}" required />
        </label>
        <label>Horómetro (h)
          <input type="number" id="rHorometro" min="0" step="0.1" inputmode="decimal" />
        </label>
      </div>
      <div class="fila">
        <label>Tipo
          <select id="rTipo">
            ${TIPOS.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </label>
        <label>Empresa responsable
          <input id="rEmpresa" list="listaEmpresas" placeholder="Interna si es revisión propia" />
          <datalist id="listaEmpresas">
            ${EMPRESAS_SUGERIDAS.map(e => `<option value="${e}"></option>`).join('')}
          </datalist>
        </label>
      </div>
      <div class="fila">
        <label>Responsable
          <input id="rResponsable" />
        </label>
        <label>Supervisor
          <input id="rSupervisor" />
        </label>
      </div>
      <label>Trabajos realizados
        <textarea id="rTrabajos" rows="3" placeholder="Una línea por trabajo..."></textarea>
      </label>
      <label>Elementos cambiados
        <textarea id="rElementos" rows="2"></textarea>
      </label>
      <label>Observaciones
        <textarea id="rObservaciones" rows="2"></textarea>
      </label>
      <label>Próxima mantención (horas)
        <input type="number" id="rHProx" min="0" step="0.1" inputmode="decimal" placeholder="Ej: horómetro + intervalo" />
      </label>
      <button class="btn primario" type="submit">Guardar</button>
      <div id="regEstado"></div>
    </form>`;

  $('#frmReg').addEventListener('submit', async ev => {
    ev.preventDefault();
    const estado = $('#regEstado');
    const num = v => { const n = parseFloat(v); return isNaN(n) ? null : n; };
    try {
      const guardado = {
        equipo: $('#rEquipo').value,
        fecha: $('#rFecha').value,
        horometro: num($('#rHorometro').value),
        hProx: num($('#rHProx').value),
        tipo: $('#rTipo').value,
        empresa: $('#rEmpresa').value.trim(),
        responsable: $('#rResponsable').value.trim(),
        supervisor: $('#rSupervisor').value.trim(),
        trabajos: $('#rTrabajos').value.trim(),
        elementos: $('#rElementos').value.trim(),
        observaciones: $('#rObservaciones').value.trim(),
        origen: 'manual'
      };
      await Registros.add(guardado);
      const eq = equipos.find(x => x.codigo === guardado.equipo);
      estado.innerHTML = '<span class="ok">Guardado.</span> <button class="btn mini" id="btnPdfReg" type="button">Descargar PDF</button>';
      $('#btnPdfReg').addEventListener('click', () => generarPDFRegistro(guardado, eq));
      setTimeout(() => {
        location.hash = '#/equipo/' + $('#rEquipo').value;
      }, 8000);
    } catch (err) {
      estado.innerHTML = `<span class="aviso">Error: ${esc(err.message)}</span>`;
    }
  });
};

Vistas.catalogo = async el => {
  el.innerHTML = '<p class="muted">Cargando...</p>';
  const equipos = await Equipos.list();
  const registros = await Registros.todos();

  const regsPorEquipo = {};
  registros.forEach(r => { (regsPorEquipo[r.equipo] = regsPorEquipo[r.equipo] || []).push(r); });

  const colorEstado = est => est === 'operativa' ? 'verde' : est === 'en mantencion' ? 'amarillo' : est === 'detenido' ? 'rojo' : 'gris';

  const activos = equipos.filter(x => x.estado !== 'vendida' && x.estado !== 'dada de baja');
  const conClase = c => activos.filter(x => calcularSemaforo(regsPorEquipo[x.codigo] || []).clase === c);
  const grupos = {
    todos: { etq: 'Equipos', tit: 'Todos los equipos', lista: equipos, extra: '' },
    operativa: { etq: 'Operativas', tit: 'Equipos operativos', lista: equipos.filter(x => x.estado === 'operativa'), extra: 'kpi-verde' },
    mantencion: { etq: 'En mantención', tit: 'Equipos en mantención', lista: equipos.filter(x => x.estado === 'en mantencion'), extra: 'kpi-amarillo' },
    detenido: { etq: 'Detenidas', tit: 'Equipos detenidos', lista: equipos.filter(x => x.estado === 'detenido'), extra: '' },
    baja: { etq: 'Dadas de baja', tit: 'Dadas de baja o vendidas', lista: equipos.filter(x => x.estado === 'dada de baja' || x.estado === 'vendida'), extra: 'kpi-rojo' },
    amarillo: { etq: 'Por vencer', tit: 'Por vencer (100 h o menos)', lista: conClase('amarillo'), extra: 'kpi-amarillo' },
    rojo: { etq: 'Vencidas', tit: 'Mantención vencida', lista: conClase('rojo'), extra: 'kpi-rojo' }
  };

  el.innerHTML = `
    <h2 id="catTitulo">Catálogo de equipos (${equipos.length})</h2>
    <div class="kpis">
      ${Object.entries(grupos).map(([k, g]) => `
        <button type="button" class="kpi ${g.extra}" data-filtro="${k}">
          <span class="kpi-num">${g.lista.length}</span><span class="kpi-etq">${g.etq}</span>
        </button>`).join('')}
    </div>
    <button class="btn" id="btnCargarCatalogo">Cargar catálogo inicial</button>
    <p class="muted">Agrega los 17 equipos base si aún no existen (no duplica los ya creados).</p>
    <div class="tabla-wrap">
      <table class="tabla">
        <thead><tr><th>Código</th><th>Categoría</th><th>Marca</th><th>Tipo</th><th>Serie</th><th>Intervalo</th><th>Depto</th><th>Operador</th><th>Estado</th></tr></thead>
        <tbody id="catBody"></tbody>
      </table>
    </div>
    <div id="catEstado"></div>`;

  let filtroActivo = null;
  function pintaTabla() {
    const filtrado = filtroActivo && filtroActivo !== 'todos';
    const lista = filtrado ? grupos[filtroActivo].lista : equipos;
    $('#catTitulo').textContent = filtrado
      ? `${grupos[filtroActivo].tit} (${lista.length} de ${equipos.length})`
      : `Catálogo de equipos (${equipos.length})`;
    $('#catBody').innerHTML = lista.map(e => `<tr>
            <td><a href="#/equipo/${e.codigo}">${esc(e.codigo)}</a></td>
            <td>${esc(e.categoria)}</td>
            <td>${esc(e.marca)}</td>
            <td>${esc(e.tipo)}</td>
            <td>${esc(e.n_serie)}</td>
            <td>${esc(e.intervaloHoras)} h</td>
            <td>${esc(e.dpto)}</td>
            <td>${esc(e.operador)}</td>
            <td><span class="badge ${colorEstado(e.estado)}">${esc(e.estado || '—')}</span></td>
          </tr>`).join('') || '<tr><td colspan="9" class="muted">Ninguno.</td></tr>';
  }

  el.querySelectorAll('button.kpi').forEach(b => b.addEventListener('click', () => {
    const f = b.dataset.filtro;
    const yaEsta = b.classList.contains('seleccionado');
    el.querySelectorAll('button.kpi.seleccionado').forEach(x => x.classList.remove('seleccionado'));
    if (yaEsta || f === 'todos') filtroActivo = null;
    else { filtroActivo = f; b.classList.add('seleccionado'); }
    pintaTabla();
  }));
  pintaTabla();

  $('#btnCargarCatalogo').addEventListener('click', async () => {
    const estado = $('#catEstado');
    estado.textContent = 'Cargando...';
    try {
      let nuevos = 0;
      for (const e of EQUIPOS_INICIALES) {
        if (!(await Equipos.byCodigo(e.codigo))) {
          await Equipos.upsert(e);
          nuevos++;
        }
      }
      estado.innerHTML = `<span class="ok">${nuevos} equipos agregados.</span>`;
      Vistas.catalogo(el);
    } catch (err) {
      estado.innerHTML = `<span class="aviso">Error: ${esc(err.message)}</span>`;
    }
  });
};

Vistas.editar = async (el, codigo) => {
  el.innerHTML = '<p class="muted">Cargando...</p>';
  const equipo = await Equipos.byCodigo(codigo);
  if (!equipo) {
    el.innerHTML = `<p>Equipo ${esc(codigo)} no encontrado. <a href="#/">Volver</a></p>`;
    return;
  }

  const sel = (v, actual) => v === actual ? 'selected' : '';

  el.innerHTML = `
    <a href="#/equipo/${encodeURIComponent(codigo)}" class="volver">&larr; Volver a ${esc(codigo)}</a>
    <h2>Editar ${esc(equipo.codigo)}</h2>
    <form id="frmEq" class="formulario" novalidate>
      <div class="fila">
        <label>Categoría
          <select id="eCategoria">
            <option value="grua" ${sel('grua', equipo.categoria)}>grúa</option>
            <option value="traspaleta" ${sel('traspaleta', equipo.categoria)}>traspaleta</option>
          </select>
        </label>
        <label>Marca
          <input id="eMarca" value="${esc(equipo.marca || '')}" />
        </label>
      </div>
      <div class="fila">
        <label>Tipo
          <select id="eTipo">
            <option value="electrica" ${sel('electrica', equipo.tipo)}>eléctrica</option>
            <option value="combustion" ${sel('combustion', equipo.tipo)}>combustión</option>
          </select>
        </label>
        <label>N° de serie
          <input id="eSerie" value="${esc(equipo.n_serie || '')}" />
        </label>
      </div>
      <div class="fila">
        <label>Intervalo mantención (horas)
          <input type="number" id="eIntervalo" step="any" inputmode="decimal" value="${esc(equipo.intervaloHoras ?? '')}" />
        </label>
        <label>Estado
          <select id="eEstado">
            <option value="operativa" ${sel('operativa', equipo.estado)}>operativa</option>
            <option value="en mantencion" ${sel('en mantencion', equipo.estado)}>en mantención</option>
            <option value="detenido" ${sel('detenido', equipo.estado)}>detenida</option>
            <option value="vendida" ${sel('vendida', equipo.estado)}>vendida</option>
            <option value="dada de baja" ${sel('dada de baja', equipo.estado)}>dada de baja</option>
          </select>
        </label>
      </div>
      <div class="fila">
        <label>Depto / sector
          <input id="eDpto" value="${esc(equipo.dpto || '')}" />
        </label>
        <label>Operador
          <input id="eOperador" value="${esc(equipo.operador || '')}" />
        </label>
      </div>
      <label>Detalle / nota interna
        <textarea id="eDetalle" rows="2">${esc(equipo.detalle || '')}</textarea>
      </label>
      <button class="btn primario" type="submit">Guardar cambios</button>
      <div id="edEstado"></div>
    </form>`;

  $('#frmEq').addEventListener('submit', async ev => {
    ev.preventDefault();
    const estado = $('#edEstado');
    try {
      await Equipos.upsert({
        codigo: equipo.codigo,
        categoria: $('#eCategoria').value,
        marca: $('#eMarca').value.trim(),
        tipo: $('#eTipo').value,
        n_serie: $('#eSerie').value.trim(),
        intervaloHoras: parseFloat($('#eIntervalo').value) || null,
        dpto: $('#eDpto').value.trim(),
        operador: $('#eOperador').value.trim(),
        estado: $('#eEstado').value,
        detalle: $('#eDetalle').value.trim()
      });
      estado.innerHTML = '<span class="ok">Guardado.</span>';
      setTimeout(() => { location.hash = '#/equipo/' + encodeURIComponent(codigo); }, 400);
    } catch (err) {
      estado.innerHTML = `<span class="aviso">Error: ${esc(err.message)}</span>`;
    }
  });
};

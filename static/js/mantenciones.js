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
      estado.innerHTML = `<span class="ok">Guardado.</span>
        <a class="btn mini" href="#/equipo/${encodeURIComponent(guardado.equipo)}">Ir a la ficha de ${esc(guardado.equipo)}</a>
        <button class="btn mini" id="btnPdfReg" type="button">Descargar PDF</button>`;
      $('#btnPdfReg').addEventListener('click', () => generarPDFRegistro(guardado, eq));
      $('#rTrabajos').focus();
    } catch (err) {
      estado.innerHTML = `<span class="aviso">Error: ${esc(err.message)}</span>`;
    }
  });
};

Vistas.editarRegistro = async (el, id) => {
  el.innerHTML = '<p class="muted">Cargando...</p>';
  const reg = await Registros.porId(id);
  if (!reg) {
    el.innerHTML = '<p>Registro no encontrado. <a href="#/">Volver al inicio</a></p>';
    return;
  }
  const equipos = await Equipos.list();
  if (!equipos.some(e => e.codigo === reg.equipo)) {
    equipos.unshift({ codigo: reg.equipo, marca: '', tipo: '' });
  }
  const sel = (v, actual) => v === actual ? 'selected' : '';

  el.innerHTML = `
    <a href="#/equipo/${encodeURIComponent(reg.equipo)}" class="volver">&larr; Volver a ${esc(reg.equipo)}</a>
    <h2>Editar registro</h2>
    <p class="muted">Registro del ${esc(reg.fecha || '(sin fecha)')} de ${esc(reg.equipo)}.</p>
    <form id="frmRegEdit" class="formulario">
      <label>Equipo
        <select id="rEquipo" required>
          ${equipos.map(e => `<option value="${esc(e.codigo)}" ${sel(e.codigo, reg.equipo)}>${esc(e.codigo)}${e.marca ? ' · ' + esc(e.marca) + ' ' + esc(e.tipo) : ''}</option>`).join('')}
        </select>
      </label>
      <div class="fila">
        <label>Fecha
          <input type="date" id="rFecha" value="${esc(reg.fecha || '')}" required />
        </label>
        <label>Horómetro (h)
          <input type="number" id="rHorometro" min="0" step="0.1" inputmode="decimal" value="${reg.horometro != null ? esc(reg.horometro) : ''}" />
        </label>
      </div>
      <div class="fila">
        <label>Tipo
          <select id="rTipo">
            ${TIPOS.map(t => `<option value="${t}" ${sel(t, reg.tipo)}>${t}</option>`).join('')}
          </select>
        </label>
        <label>Empresa responsable
          <input id="rEmpresa" list="listaEmpresas" value="${esc(reg.empresa || '')}" placeholder="Interna si es revisión propia" />
          <datalist id="listaEmpresas">
            ${EMPRESAS_SUGERIDAS.map(e => `<option value="${e}"></option>`).join('')}
          </datalist>
        </label>
      </div>
      <div class="fila">
        <label>Responsable
          <input id="rResponsable" value="${esc(reg.responsable || '')}" />
        </label>
        <label>Supervisor
          <input id="rSupervisor" value="${esc(reg.supervisor || '')}" />
        </label>
      </div>
      <label>Trabajos realizados
        <textarea id="rTrabajos" rows="3" placeholder="Una línea por trabajo...">${esc(reg.trabajos || '')}</textarea>
      </label>
      <label>Elementos cambiados
        <textarea id="rElementos" rows="2">${esc(reg.elementos || '')}</textarea>
      </label>
      <label>Observaciones
        <textarea id="rObservaciones" rows="2">${esc(reg.observaciones || '')}</textarea>
      </label>
      <label>Próxima mantención (horas)
        <input type="number" id="rHProx" min="0" step="0.1" inputmode="decimal" value="${reg.hProx != null ? esc(reg.hProx) : ''}" placeholder="Ej: horómetro + intervalo" />
      </label>
      <button class="btn primario" type="submit">Guardar cambios</button>
      <div id="regEstado"></div>
    </form>`;

  $('#frmRegEdit').addEventListener('submit', async ev => {
    ev.preventDefault();
    const estado = $('#regEstado');
    const num = v => { const n = parseFloat(v); return isNaN(n) ? null : n; };
    const btn = ev.target.querySelector('button[type=submit]');
    try {
      btn.disabled = true;
      const cambios = {
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
        observaciones: $('#rObservaciones').value.trim()
      };
      await Registros.actualizar(id, cambios);
      const eq = equipos.find(x => x.codigo === cambios.equipo);
      estado.innerHTML = `<span class="ok">Guardado.</span>
        <a class="btn mini" href="#/equipo/${encodeURIComponent(cambios.equipo)}">Ir a la ficha de ${esc(cambios.equipo)}</a>
        <button class="btn mini" id="btnPdfRegEdit" type="button">Descargar PDF</button>`;
      $('#btnPdfRegEdit').addEventListener('click', () => generarPDFRegistro({ ...reg, ...cambios }, eq));
    } catch (err) {
      estado.innerHTML = `<span class="aviso">Error: ${esc(err.message)}</span>`;
      btn.disabled = false;
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
  const conClase = c => activos.filter(x => calcularSemaforo(regsPorEquipo[x.codigo] || [], x).clase === c);
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
    <div class="acciones-catalogo">
      <a class="btn primario" href="#/nuevo-equipo">+ Nuevo equipo</a>
      <button class="btn" id="btnCargarCatalogo">Cargar catálogo inicial</button>
      ${Auth.puedeBorrar() ? '<button class="btn peligro" id="btnModoBorrar" type="button">Eliminar equipos</button>' : ''}
    </div>
    <p class="muted">Cargar catálogo inicial agrega los equipos base que aún no existen (no duplica los ya creados).</p>
    <div class="barra-borrar" id="barraBorrar" style="display:none">
      <b><span id="numSel">0</span> seleccionado(s)</b>
      <button class="btn mini" id="btnSelTodos" type="button">Seleccionar visibles</button>
      <button class="btn mini" id="btnSelNinguno" type="button">Quitar selección</button>
      <button class="btn mini peligro" id="btnEliminarSel" type="button">Eliminar seleccionados</button>
      <button class="btn mini" id="btnCancelarBorrar" type="button">Cancelar</button>
    </div>
    <div class="tabla-wrap">
      <table class="tabla" id="catTabla">
        <thead><tr><th class="col-sel">Sel</th><th>Código</th><th>Flota</th><th>Categoría</th><th>Marca</th><th>Tipo</th><th>Serie</th><th>Intervalo</th><th>Horóm.</th><th>H.próx</th><th>Depto</th><th>Operador</th><th>Estado</th></tr></thead>
        <tbody id="catBody"></tbody>
      </table>
    </div>
    <div id="catEstado"></div>`;

  let filtroActivo = null;
  let modoBorrar = false;
  const seleccion = new Set();
  const equipoPorId = new Map(equipos.map(e => [e.id, e]));

  function listaVisible() {
    const filtrado = filtroActivo && filtroActivo !== 'todos';
    return filtrado ? grupos[filtroActivo].lista : equipos;
  }

  function pintaBarra() {
    const barra = $('#barraBorrar');
    if (barra) barra.style.display = modoBorrar ? 'flex' : 'none';
    const num = $('#numSel');
    if (num) num.textContent = seleccion.size;
    const btnDel = $('#btnEliminarSel');
    if (btnDel) btnDel.disabled = seleccion.size === 0;
    const tabla = $('#catTabla');
    if (tabla) tabla.classList.toggle('tabla-seleccion', modoBorrar);
    const btnModo = $('#btnModoBorrar');
    if (btnModo) btnModo.textContent = modoBorrar ? 'Salir de selección' : 'Eliminar equipos';
  }

  function pintaTabla() {
    const filtrado = filtroActivo && filtroActivo !== 'todos';
    const lista = listaVisible();
    $('#catTitulo').textContent = filtrado
      ? `${grupos[filtroActivo].tit} (${lista.length} de ${equipos.length})`
      : `Catálogo de equipos (${equipos.length})`;
    $('#catBody').innerHTML = lista.map(e => {
      const s = calcularSemaforo(regsPorEquipo[e.codigo] || [], e);
      return `<tr class="${seleccion.has(e.id) ? 'fila-sel' : ''}">
            <td class="col-sel"><input type="checkbox" class="selEq" data-id="${esc(e.id)}" ${seleccion.has(e.id) ? 'checked' : ''} aria-label="Seleccionar ${esc(e.codigo)}" /></td>
            <td><a href="#/equipo/${e.codigo}">${esc(e.codigo)}</a></td>
            <td>${flotaDe(e) === FLOTA_ARRENDO ? 'Arriendo' : 'Propia'}</td>
            <td>${esc(e.categoria)}</td>
            <td>${esc(e.marca)}</td>
            <td>${esc(e.tipo)}</td>
            <td>${esc(e.n_serie)}</td>
            <td>${esc(e.intervaloHoras)} h</td>
            <td>${s.horometro != null ? s.horometro.toLocaleString('es-CL') : '—'}</td>
            <td>${s.hProx != null ? s.hProx.toLocaleString('es-CL') : '—'}</td>
            <td>${esc(e.dpto)}</td>
            <td>${esc(e.operador)}</td>
            <td><span class="badge ${colorEstado(e.estado)}">${esc(e.estado || '—')}</span></td>
          </tr>`;
    }).join('') || '<tr><td colspan="12" class="muted">Ninguno.</td></tr>';
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
  pintaBarra();

  // ----- Selección manual de equipos para eliminar -----
  $('#catBody').addEventListener('change', ev => {
    const ch = ev.target.closest ? ev.target.closest('.selEq') : null;
    if (!ch) return;
    if (ch.checked) seleccion.add(ch.dataset.id);
    else seleccion.delete(ch.dataset.id);
    const tr = ch.closest('tr');
    if (tr) tr.classList.toggle('fila-sel', ch.checked);
    pintaBarra();
  });

  const btnModoBorrar = $('#btnModoBorrar');
  if (btnModoBorrar) btnModoBorrar.addEventListener('click', () => {
    modoBorrar = !modoBorrar;
    if (!modoBorrar) seleccion.clear();
    pintaTabla();
    pintaBarra();
  });
  $('#btnCancelarBorrar').addEventListener('click', () => {
    modoBorrar = false;
    seleccion.clear();
    pintaTabla();
    pintaBarra();
  });
  $('#btnSelTodos').addEventListener('click', () => {
    listaVisible().forEach(e => seleccion.add(e.id));
    pintaTabla();
    pintaBarra();
  });
  $('#btnSelNinguno').addEventListener('click', () => {
    seleccion.clear();
    pintaTabla();
    pintaBarra();
  });
  $('#btnEliminarSel').addEventListener('click', abrirConfirmarBorrado);

  // Ventana de confirmación: lista los equipos, muestra cuánto historial se
  // perderá y deja elegir si se borra en cascada o se conserva.
  async function abrirConfirmarBorrado() {
    const lista = [...seleccion].map(id => equipoPorId.get(id)).filter(Boolean);
    if (!lista.length) return;
    const previo = document.getElementById('modalBorrarEq');
    if (previo) previo.remove();

    const estado = $('#catEstado');
    estado.textContent = 'Contando registros y baterías...';
    const impactos = await Promise.all(lista.map(async e => {
      try { return await Equipos.impacto(e.codigo); }
      catch (_) { return { registros: 0, baterias: 0 }; }
    }));
    estado.textContent = '';
    const totalRegs = impactos.reduce((s, x) => s + x.registros, 0);
    const totalBats = impactos.reduce((s, x) => s + x.baterias, 0);

    const modal = document.createElement('div');
    modal.id = 'modalBorrarEq';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-cuerpo" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h3 style="margin:0">Eliminar equipos</h3>
          <button class="btn mini" data-cerrar type="button" aria-label="Cerrar">&times;</button>
        </div>
        <p>Se eliminará${lista.length > 1 ? 'n' : ''} <b>${lista.length}</b> equipo${lista.length > 1 ? 's' : ''}:</p>
        <ul class="lista-borrar">
          ${lista.map((e, i) => `<li><b>${esc(e.codigo)}</b> · ${esc(e.marca || 'sin marca')} · ${impactos[i].registros} registro(s), ${impactos[i].baterias} batería(s)</li>`).join('')}
        </ul>
        <label class="check-linea">
          <input type="checkbox" id="chkCascada" />
          <span>Eliminar también su historial: <b>${totalRegs} registro(s)</b> y <b>${totalBats} batería(s)</b>.</span>
        </label>
        <p class="muted" style="font-size:.82rem;margin:0 0 10px">
          Si no marcas la casilla, esos registros y baterías quedan guardados en la base,
          pero ya no se verán en la app.
        </p>
        <div class="modal-pie">
          <button class="btn" data-cerrar type="button">Cancelar</button>
          <button class="btn peligro" id="btnConfirmarBorrar" type="button">Eliminar definitivamente</button>
        </div>
        <div id="borrarEstado"></div>
      </div>`;
    document.body.appendChild(modal);

    const alEsc = ev => { if (ev.key === 'Escape') cerrar(); };
    const cerrar = () => {
      document.removeEventListener('keydown', alEsc);
      modal.remove();
    };
    document.addEventListener('keydown', alEsc);
    modal.querySelectorAll('[data-cerrar]').forEach(b => b.addEventListener('click', cerrar));
    modal.addEventListener('click', ev => { if (ev.target === modal) cerrar(); });

    $('#btnConfirmarBorrar').addEventListener('click', async () => {
      const btn = $('#btnConfirmarBorrar');
      const est = $('#borrarEstado');
      const cascada = $('#chkCascada').checked;
      btn.disabled = true;
      btn.textContent = 'Eliminando...';
      let equiposBorrados = 0, regsBorrados = 0, batsBorradas = 0;
      try {
        for (const e of lista) {
          const r = await Equipos.eliminar(e.id, { cascada });
          equiposBorrados++;
          regsBorrados += r.registros;
          batsBorradas += r.baterias;
        }
        cerrar();
        toast(`${equiposBorrados} equipo(s) eliminado(s)`
          + (cascada ? ` · ${regsBorrados} registro(s) y ${batsBorradas} batería(s)` : ' · historial conservado'));
        Vistas.catalogo(el);
      } catch (err) {
        est.innerHTML = `<span class="aviso">Error: ${esc(err.message)}</span>`;
        btn.disabled = false;
        btn.textContent = 'Eliminar definitivamente';
      }
    });
  }

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

Vistas.nuevoEquipo = async el => {
  el.innerHTML = '<p class="muted">Cargando...</p>';

  el.innerHTML = `
    <a href="#/" class="volver">&larr; Volver al inicio</a>
    <h2>Nuevo equipo</h2>
    <p class="muted">Registra una grúa o traspaleta. Si el código ya existe en la otra flota, la app le agrega un prefijo para que no se mezclen.</p>
    <form id="frmNuevoEq" class="formulario" novalidate>
      <div class="fila">
        <label>Código
          <input id="nCodigo" placeholder="Ej: G5" required />
        </label>
        <label>Flota
          <select id="nFlota">
            <option value="propia">Propia (de la empresa)</option>
            <option value="arriendo">Arriendo</option>
          </select>
        </label>
      </div>
      <div class="fila">
        <label>Categoría
          <select id="nCategoria">
            <option value="grua">grúa</option>
            <option value="traspaleta">traspaleta</option>
          </select>
        </label>
        <label>Tipo
          <select id="nTipo">
            <option value="electrica">eléctrica</option>
            <option value="combustion">combustión</option>
          </select>
        </label>
      </div>
      <div class="fila">
        <label>Marca
          <input id="nMarca" />
        </label>
        <label>N° de serie
          <input id="nSerie" />
        </label>
      </div>
      <div class="fila" id="filaArrendadora" hidden>
        <label>Empresa arrendadora
          <input id="nArrendadora" placeholder="Ej: Linde" />
        </label>
        <label>Intervalo mantención (horas)
          <input type="number" id="nIntervalo" step="any" inputmode="decimal" />
        </label>
      </div>
      <div class="fila" id="filaIntervalo" hidden>
        <label>&nbsp;</label>
        <label>Depto / sector
          <input id="nDpto" />
        </label>
      </div>
      <div class="fila">
        <label>Operador
          <input id="nOperador" />
        </label>
        <label>Estado
          <select id="nEstado">
            <option value="operativa">operativa</option>
            <option value="en mantencion">en mantención</option>
            <option value="detenido">detenida</option>
            <option value="vendida">vendida</option>
            <option value="dada de baja">dada de baja</option>
          </select>
        </label>
      </div>
      <div class="fila">
        <label>Horómetro actual (horas)
          <input type="number" id="nHorometro" step="any" min="0" inputmode="decimal" placeholder="Opcional" />
        </label>
        <label>Horómetro próxima mantención (horas)
          <input type="number" id="nHProx" step="any" min="0" inputmode="decimal" placeholder="Opcional" />
        </label>
      </div>
      <label>Detalle / nota interna
        <textarea id="nDetalle" rows="2"></textarea>
      </label>
      <button class="btn primario" type="submit">Guardar equipo</button>
      <div id="nuevoEstado"></div>
    </form>`;

  const sel = $('#nFlota');
  function syncFlota() {
    const arriendo = sel.value === FLOTA_ARRENDO;
    $('#filaArrendadora').hidden = !arriendo;
    $('#filaIntervalo').hidden = !arriendo;
  }
  sel.addEventListener('change', syncFlota);
  syncFlota();

  $('#frmNuevoEq').addEventListener('submit', async ev => {
    ev.preventDefault();
    const estado = $('#nuevoEstado');
    const btn = ev.target.querySelector('button[type=submit]');
    try {
      btn.disabled = true;
      estado.innerHTML = '<span class="muted">Guardando...</span>';

      const flota = $('#nFlota').value;
      const codigoIngresado = $('#nCodigo').value.trim();
      if (!codigoIngresado) throw new Error('Escribe un código');

      const res = await Equipos.resolverCodigo(codigoIngresado, flota);
      if (res.error) throw new Error(res.error);

      const nuevo = {
        codigo: res.codigo,
        flota,
        empresaArrendadora: flota === FLOTA_ARRENDO ? $('#nArrendadora').value.trim() : '',
        categoria: $('#nCategoria').value,
        marca: $('#nMarca').value.trim(),
        tipo: $('#nTipo').value,
        n_serie: $('#nSerie').value.trim(),
        intervaloHoras: parseFloat($('#nIntervalo').value) || null,
        horometroActual: parseFloat($('#nHorometro').value) || null,
        horometroProx: parseFloat($('#nHProx').value) || null,
        dpto: $('#nDpto').value.trim(),
        operador: $('#nOperador').value.trim(),
        estado: $('#nEstado').value,
        detalle: $('#nDetalle').value.trim()
      };

      await Equipos.crear(nuevo);

      const aviso = res.prefijo
        ? ` Guardado como <b>${esc(res.codigo)}</b> (el código ${esc(res.original)} ya existe en la otra flota).`
        : '';
      estado.innerHTML = `<span class="ok">Equipo ${esc(res.codigo)} creado.${aviso}</span>`;
      setTimeout(() => { location.hash = '#/equipo/' + encodeURIComponent(res.codigo); }, 700);
    } catch (err) {
      estado.innerHTML = `<span class="aviso">Error: ${esc(err.message)}</span>`;
      btn.disabled = false;
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
        <label>Código del equipo
          <input id="eCodigo" value="${esc(equipo.codigo)}" />
        </label>
        <label>Flota
          <select id="eFlota">
            <option value="propia" ${sel('propia', flotaDe(equipo))}>Propia (de la empresa)</option>
            <option value="arriendo" ${sel('arriendo', flotaDe(equipo))}>Arriendo</option>
          </select>
        </label>
        <label>Categoría
          <select id="eCategoria">
            <option value="grua" ${sel('grua', equipo.categoria)}>grúa</option>
            <option value="traspaleta" ${sel('traspaleta', equipo.categoria)}>traspaleta</option>
          </select>
        </label>
      </div>
      <p class="muted" style="font-size:.78rem;margin:-4px 0 6px">
        Si corriges el código (p. ej. "A10" → "AR10") se renombra el equipo y sus
        registros y baterías asociados pasan al código nuevo.
      </p>
      <div class="fila">
        <label>Marca
          <input id="eMarca" value="${esc(equipo.marca || '')}" />
        </label>
        <label>Tipo
          <select id="eTipo">
            <option value="electrica" ${sel('electrica', equipo.tipo)}>eléctrica</option>
            <option value="combustion" ${sel('combustion', equipo.tipo)}>combustión</option>
          </select>
        </label>
      </div>
      <div class="fila">
        <label>N° de serie
          <input id="eSerie" value="${esc(equipo.n_serie || '')}" />
        </label>
        <label>Empresa arrendadora
          <input id="eArrendadora" value="${esc(equipo.empresaArrendadora || '')}" placeholder="Solo si es de arriendo" />
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
        <label>Horómetro actual (horas)
          <input type="number" id="eHorometro" step="any" min="0" inputmode="decimal" value="${esc(equipo.horometroActual ?? '')}" placeholder="Vacío = usar historial" />
        </label>
        <label>Horómetro próxima mantención (horas)
          <input type="number" id="eHProx" step="any" min="0" inputmode="decimal" value="${esc(equipo.horometroProx ?? '')}" placeholder="Vacío = usar historial" />
        </label>
      </div>
      <p class="muted" style="font-size:.78rem;margin:-4px 0 6px">
        Si los dejas vacíos, el horómetro y la próxima mantención se toman del historial, como antes.
        Al llenarlos pasan a mandar estos valores en el semáforo.
      </p>
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
    const btn = ev.target.querySelector('button[type=submit]');
    try {
      btn.disabled = true;
      const flota = $('#eFlota').value;
      let codigoNuevo = $('#eCodigo').value.trim();
      if (!codigoNuevo) throw new Error('El código no puede quedar vacío');
      // Solo se busca colisión con OTRO equipo: el propio equipo "existe" con
      // su código actual y no debe bloquear el guardado.
      const choque = await Equipos.byCodigo(codigoNuevo);
      if (choque && choque.id !== equipo.id) {
        // Igual que al crear: si choca con la otra flota se prefija (AR-G5);
        // si choca dentro de la misma flota es un error.
        const res = await Equipos.resolverCodigo(codigoNuevo, flota);
        if (res.error) throw new Error(res.error);
        codigoNuevo = res.codigo;
      }
      // PRIMERO el renombrado en cascada (registros y baterías) y después se
      // guardan los demás campos sobre el MISMO documento. Al revés, el
      // código nuevo no existiría todavía y se crearía un equipo duplicado.
      let avisoRenombre = '';
      if (codigoNuevo !== equipo.codigo) {
        const r = await Equipos.renombrar(equipo.id, codigoNuevo);
        avisoRenombre = ` Renombrado de ${esc(r.anterior)} a ${esc(r.nuevo)}`
          + (r.cambios ? ` (${r.cambios} registros/baterías actualizados)` : '');
      }
      await Equipos.actualizar(equipo.id, {
        codigo: codigoNuevo,
        flota,
        empresaArrendadora: flota === FLOTA_ARRENDO ? $('#eArrendadora').value.trim() : '',
        categoria: $('#eCategoria').value,
        marca: $('#eMarca').value.trim(),
        tipo: $('#eTipo').value,
        n_serie: $('#eSerie').value.trim(),
        intervaloHoras: parseFloat($('#eIntervalo').value) || null,
        horometroActual: parseFloat($('#eHorometro').value) || null,
        horometroProx: parseFloat($('#eHProx').value) || null,
        dpto: $('#eDpto').value.trim(),
        operador: $('#eOperador').value.trim(),
        estado: $('#eEstado').value,
        detalle: $('#eDetalle').value.trim()
      });
      estado.innerHTML = `<span class="ok">Guardado.${avisoRenombre}</span>`;
      setTimeout(() => { location.hash = '#/equipo/' + encodeURIComponent(codigoNuevo); }, 500);
    } catch (err) {
      estado.innerHTML = `<span class="aviso">Error: ${esc(err.message)}</span>`;
      if (btn) btn.disabled = false;
    }
  });
};

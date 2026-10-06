// Módulo de Baterías de grúas eléctricas.
// Vista principal: #/baterias   |   Ficha: #/bateria/<id>
//
// IMPORTANTE: `const Vistas` se declara UNA sola vez (en gruas.js). Este módulo
// solo hace `Vistas.x = ...`; declarar `const Vistas` aquí rompería todos los menús.
window.Vistas = window.Vistas || {};

const AREAS_BATERIA = [
  'Frío', 'Despacho', 'Repaletizado', 'Mercado interno', 'Bodega',
  'Centro de armado', 'Packing', 'Vega', 'Recepción'
];
const ESTADOS_BATERIA = ['vigente', 'en recarga', 'dañada', 'dada de baja'];
const TIPOS_EVENTO_BATERIA = ['carga', 'cambio', 'reparacion', 'baja', 'alta'];

function colorEstadoBateria(est) {
  est = String(est || '').toLowerCase();
  if (est === 'vigente') return 'verde';
  if (est === 'en recarga') return 'amarillo';
  if (est === 'dañada') return 'rojo';
  return 'gris';
}
function areaValida(a) { return AREAS_BATERIA.includes(a) ? a : ''; }

function etiquetaFlota(f) { return f === FLOTA_ARRENDO ? 'Arriendo' : 'Propia'; }

// ---------- Resumen / KPIs ----------
function pintarKPIsBaterias(baterias) {
  const total = baterias.length;
  const porArea = {};
  baterias.forEach(b => { if (b.area) porArea[b.area] = (porArea[b.area] || 0) + 1; });
  const masArea = Object.entries(porArea).sort((a, b) => b[1] - a[1])[0];
  return `<div class="kpis">
    <div class="kpi"><span class="kpi-num">${total}</span><span class="kpi-etq">Baterías</span></div>
    <div class="kpi kpi-verde"><span class="kpi-num">${baterias.filter(b => b.estado === 'vigente').length}</span><span class="kpi-etq">Vigentes</span></div>
    <div class="kpi kpi-amarillo"><span class="kpi-num">${baterias.filter(b => b.estado === 'en recarga').length}</span><span class="kpi-etq">En recarga</span></div>
    <div class="kpi kpi-rojo"><span class="kpi-num">${baterias.filter(b => b.estado === 'dañada').length}</span><span class="kpi-etq">Dañadas</span></div>
    <div class="kpi"><span class="kpi-num">${Object.keys(porArea).length}</span><span class="kpi-etq">Áreas con batería</span></div>
    <div class="kpi"><span class="kpi-num">${masArea ? esc(masArea[0]) : '—'}</span><span class="kpi-etq">Área con más</span></div>
  </div>`;
}

function cardBateria(b) {
  return `<a class="card" href="#/bateria/${b.id}">
    <div class="card-top">
      <span class="codigo">${esc(b.numero)}</span>
      <span class="badge ${colorEstadoBateria(b.estado)}">${esc(b.estado || '—')}</span>
    </div>
    <div class="card-sub chips">
      <span class="chip ${b.flota === FLOTA_ARRENDO ? 'chip-arriendo' : 'marca-otra'}">${etiquetaFlota(b.flota)}</span>
      ${b.area ? `<span class="chip tipo-electrica">${esc(b.area)}</span>` : ''}
    </div>
    <div class="card-meta">N° serie: <b>${esc(b.nSerie || '—')}</b></div>
    <div class="card-meta">Equipo: <b>${esc(b.equipo || '—')}</b></div>
  </a>`;
}

// ---------- Vista principal: lista + filtros ----------
Vistas.baterias = async el => {
  el.innerHTML = '<p class="muted">Cargando baterías...</p>';
  const baterias = await Baterias.todas();

  el.innerHTML = `
    <h2>Baterías de grúas eléctricas</h2>
    <p class="muted">Registro de baterías (propias y de arriendo) por número y n° de serie, con su área en planta e historial de cargas/cambios.</p>
    <div id="bateriasKPIs">${pintarKPIsBaterias(baterias)}</div>
    <button class="btn primario" id="btnNuevaBateria">+ Nueva batería</button>
    <div class="filtros">
      <input id="bBusca" placeholder="Buscar número, n° serie, equipo..." />
      <select id="bFlota">
        <option value="">Ambas flotas</option>
        <option value="propia">Solo propias</option>
        <option value="arriendo">Solo arriendo</option>
      </select>
      <select id="bArea">
        <option value="">Todas las áreas</option>
        ${AREAS_BATERIA.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join('')}
      </select>
      <select id="bEstado">
        <option value="">Todos los estados</option>
        ${ESTADOS_BATERIA.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}
      </select>
    </div>
    <div id="bateriasGrilla" class="grilla"></div>`;

  function pintar() {
    const busca = $('#bBusca').value.toLowerCase();
    const fFlota = $('#bFlota').value;
    const fArea = $('#bArea').value;
    const fEstado = $('#bEstado').value;
    const filtradas = baterias.filter(b => {
      if (fFlota && (b.flota || FLOTA_PROPIA) !== fFlota) return false;
      if (fArea && b.area !== fArea) return false;
      if (fEstado && b.estado !== fEstado) return false;
      if (!busca) return true;
      return [b.numero, b.nSerie, b.equipo, b.area, b.observaciones]
        .join(' ').toLowerCase().includes(busca);
    });
    $('#bateriasGrilla').innerHTML = filtradas.map(cardBateria).join('')
      || '<p class="muted">Sin baterías con estos filtros.</p>';
  }

  $('#btnNuevaBateria').addEventListener('click', () => {
    Vistas.bateriaForm(el, null);
  });
  ['#bBusca', '#bFlota', '#bArea', '#bEstado'].forEach(sel => {
    $(sel).addEventListener(sel === '#bBusca' ? 'input' : 'change', pintar);
  });
  pintar();
};

// ---------- Formulario de alta / edición ----------
Vistas.bateriaForm = async (el, id) => {
  const b = id ? await Baterias.porId(id) : null;
  if (id && !b) { el.innerHTML = '<p>Batería no encontrada. <a href="#/baterias">Volver</a></p>'; return; }

  // Lista real de equipos: el campo "equipo" se guarda con el codigo exacto
  // (G3, AR-G16...) porque el historial y los enlaces dependen de esa coincidencia.
  const todos = await Equipos.list();
  const valorEquipo = b ? b.equipo || '' : '';
  // Si el valor guardado no esta en la lista, se agrega para no borrarlo al guardar.
  const opcionesEquipo = [...todos.map(e => e.codigo)]
    .concat(valorEquipo && !todos.some(e => e.codigo === valorEquipo) ? [valorEquipo] : [])
    .sort(cmpCodigo);

  el.innerHTML = `
    <a href="#/baterias" class="volver">&larr; Volver a Baterías</a>
    <h2>${b ? 'Editar batería ' + esc(b.numero) : 'Nueva batería'}</h2>
    <form id="frmBat" class="formulario" novalidate>
      <div class="fila">
        <label>Número de batería
          <input id="bNumero" value="${esc(b ? b.numero : '')}" placeholder="Ej: BAT-001" required />
        </label>
        <label>N° de serie
          <input id="bNSerie" value="${esc(b ? b.nSerie : '')}" />
        </label>
      </div>
      <div class="fila">
        <label>Flota
          <select id="bFlotaSel">
            <option value="propia" ${!b || b.flota !== FLOTA_ARRENDO ? 'selected' : ''}>Propia (de la empresa)</option>
            <option value="arriendo" ${b && b.flota === FLOTA_ARRENDO ? 'selected' : ''}>Arriendo</option>
          </select>
        </label>
        <label>Área en planta
          <select id="bAreaSel">
            <option value="">— sin asignar —</option>
            ${AREAS_BATERIA.map(a => `<option value="${esc(a)}" ${b && b.area === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="fila">
        <label>Equipo asociado
          <select id="bEquipo">
            <option value="">— sin asociar —</option>
            ${opcionesEquipo.map(c => `<option value="${esc(c)}" ${valorEquipo === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
          </select>
        </label>
        <label>Estado
          <select id="bEstadoSel">
            ${ESTADOS_BATERIA.map(s => `<option value="${esc(s)}" ${b && b.estado === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
          </select>
        </label>
      </div>
      <label>Observaciones
        <textarea id="bObs" rows="2">${esc(b ? b.observaciones : '')}</textarea>
      </label>
      <button class="btn primario" type="submit">${b ? 'Guardar cambios' : 'Crear batería'}</button>
      <div id="bEstadoMsg"></div>
    </form>`;

  $('#frmBat').addEventListener('submit', async ev => {
    ev.preventDefault();
    const msg = $('#bEstadoMsg');
    const btn = ev.target.querySelector('button[type=submit]');
    try {
      btn.disabled = true;
      const numero = $('#bNumero').value.trim();
      if (!numero) throw new Error('Escribe el número de batería');
      const area = $('#bAreaSel').value;
      // no permitir números repetidos
      const existente = await Baterias.porNumero(numero);
      if (existente && existente.id !== id) throw new Error(`Ya existe la batería ${numero}`);
      await Baterias.guardar({
        id: id || undefined,
        numero,
        nSerie: $('#bNSerie').value.trim(),
        flota: $('#bFlotaSel').value,
        area,
        equipo: $('#bEquipo').value.trim(),
        estado: $('#bEstadoSel').value,
        observaciones: $('#bObs').value.trim()
      });
      msg.innerHTML = '<span class="ok">Guardado.</span>';
      setTimeout(() => { location.hash = id ? '#/bateria/' + id : '#/baterias'; }, 500);
    } catch (err) {
      msg.innerHTML = `<span class="aviso">Error: ${esc(err.message)}</span>`;
      btn.disabled = false;
    }
  });
};

// ---------- Ficha de una batería + historial ----------
Vistas.bateria = async (el, id) => {
  el.innerHTML = '<p class="muted">Cargando...</p>';
  const [b, eventos] = await Promise.all([Baterias.porId(id), Baterias.eventos(id)]);
  if (!b) { el.innerHTML = '<p>Batería no encontrada. <a href="#/baterias">Volver</a></p>'; return; }

  el.innerHTML = `
    <a href="#/baterias" class="volver">&larr; Volver a Baterías</a>
    <div class="card-top">
      <span class="codigo">${esc(b.numero)}</span>
      <span class="badge ${colorEstadoBateria(b.estado)}">${esc(b.estado || '—')}</span>
    </div>
    <div class="card-sub chips">
      <span class="chip ${b.flota === FLOTA_ARRENDO ? 'chip-arriendo' : 'marca-otra'}">${etiquetaFlota(b.flota)}</span>
      ${b.area ? `<span class="chip tipo-electrica">${esc(b.area)}</span>` : ''}
    </div>
    <div class="acciones-inicio">
      <button class="btn" id="btnEditarBat">Editar</button>
      ${Auth.puedeBorrar() ? '<button class="btn" id="btnBorrarBat">Eliminar</button>' : ''}
    </div>
    <div class="tabla-wrap">
      <table class="tabla">
        <tbody>
          <tr><th>N° de serie</th><td>${esc(b.nSerie || '—')}</td></tr>
          <tr><th>Equipo asociado</th><td>${b.equipo ? `<a href="#/equipo/${encodeURIComponent(b.equipo)}">${esc(b.equipo)}</a>` : '—'}</td></tr>
          <tr><th>Área</th><td>${esc(b.area || '— sin asignar —')}</td></tr>
          <tr><th>Flota</th><td>${etiquetaFlota(b.flota)}</td></tr>
          <tr><th>Observaciones</th><td>${esc(b.observaciones || '—')}</td></tr>
        </tbody>
      </table>
    </div>
    <h3>Historial</h3>
    <div class="formulario" style="border:none;padding:0">
      <div class="fila">
        <label>Tipo
          <select id="evTipo">${TIPOS_EVENTO_BATERIA.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}</select>
        </label>
        <label>Fecha
          <input type="date" id="evFecha" value="${hoyISO()}" />
        </label>
      </div>
      <label>Detalle
        <input id="evDetalle" placeholder="Ej: recargada, cambio por falla..." />
      </label>
      <button class="btn primario" id="btnAddEvento">Agregar al historial</button>
      <div id="evMsg"></div>
    </div>
    <div class="tabla-wrap">
      <table class="tabla">
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Detalle</th><th>Registrado por</th></tr></thead>
        <tbody id="evBody"></tbody>
      </table>
    </div>`;

  function pintarEventos() {
    Baterias.eventos(id).then(lista => {
      $('#evBody').innerHTML = lista.map(ev => `<tr>
        <td>${esc(ev.fecha || '—')}</td>
        <td>${esc(ev.tipo || '—')}</td>
        <td>${esc(ev.detalle || '')}</td>
        <td class="muted">${esc(ev.registradoPor || '')}</td>
      </tr>`).join('') || '<tr><td colspan="4" class="muted">Sin historial todavía.</td></tr>';
    });
  }
  pintarEventos();

  $('#btnEditarBat').addEventListener('click', () => Vistas.bateriaForm(el, id));
  const btnBorrar = $('#btnBorrarBat');
  if (btnBorrar) btnBorrar.addEventListener('click', async () => {
    if (!confirm(`¿Eliminar la batería ${b.numero}? Esto borra también su historial.`)) return;
    try {
      await Baterias.eliminar(id);
      location.hash = '#/baterias';
    } catch (err) {
      alert('Error: ' + err.message);
    }
  });

  $('#btnAddEvento').addEventListener('click', async () => {
    const msg = $('#evMsg');
    try {
      await Baterias.agregarEvento(id, {
        tipo: $('#evTipo').value,
        fecha: $('#evFecha').value,
        detalle: $('#evDetalle').value.trim(),
        registradoPor: Auth.emailActual()
      });
      $('#evDetalle').value = '';
      msg.innerHTML = '<span class="ok">Evento agregado.</span>';
      pintarEventos();
    } catch (err) {
      msg.innerHTML = `<span class="aviso">Error: ${esc(err.message)}</span>`;
    }
  });
};

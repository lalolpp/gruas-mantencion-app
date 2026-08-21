const TIPOS = ['revision', 'preventiva', 'correctiva', 'recambio', 'accesorios', 'otra'];
const EMPRESAS_SUGERIDAS = ['ACAM', 'Linde', 'Farias', 'Combustronica', 'Inter Whells', 'Luis Suarez', 'Batrol', 'SKC'];

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
      await Registros.add({
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
      });
      estado.innerHTML = '<span class="ok">Guardado.</span>';
      setTimeout(() => {
        location.hash = '#/equipo/' + $('#rEquipo').value;
      }, 500);
    } catch (err) {
      estado.innerHTML = `<span class="aviso">Error: ${esc(err.message)}</span>`;
    }
  });
};

Vistas.catalogo = async el => {
  el.innerHTML = '<p class="muted">Cargando...</p>';
  const equipos = await Equipos.list();

  el.innerHTML = `
    <h2>Catálogo de equipos (${equipos.length})</h2>
    <button class="btn" id="btnCargarCatalogo">Cargar catálogo inicial</button>
    <p class="muted">Agrega los 17 equipos base si aún no existen (no duplica los ya creados).</p>
    <div class="tabla-wrap">
      <table class="tabla">
        <thead><tr><th>Código</th><th>Categoría</th><th>Marca</th><th>Tipo</th><th>Serie</th><th>Intervalo</th><th>Depto</th><th>Operador</th><th>Estado</th></tr></thead>
        <tbody>
          ${equipos.map(e => `<tr>
            <td><a href="#/equipo/${e.codigo}">${esc(e.codigo)}</a></td>
            <td>${esc(e.categoria)}</td>
            <td>${esc(e.marca)}</td>
            <td>${esc(e.tipo)}</td>
            <td>${esc(e.n_serie)}</td>
            <td>${esc(e.intervaloHoras)} h</td>
            <td>${esc(e.dpto)}</td>
            <td>${esc(e.operador)}</td>
            <td>${esc(e.estado)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div id="catEstado"></div>`;

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
    <form id="frmEq" class="formulario">
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
          <input type="number" id="eIntervalo" min="1" step="10" value="${esc(equipo.intervaloHoras ?? '')}" />
        </label>
        <label>Estado
          <select id="eEstado">
            <option value="operativa" ${sel('operativa', equipo.estado)}>operativa</option>
            <option value="detenido" ${sel('detenido', equipo.estado)}>detenida</option>
            <option value="vendida" ${sel('vendida', equipo.estado)}>vendida</option>
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
        intervaloHoras: parseInt($('#eIntervalo').value, 10) || null,
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

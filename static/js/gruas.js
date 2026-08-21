window.Vistas = window.Vistas || {};
const Vistas = window.Vistas;

function calcularSemaforo(regsEquipo) {
  const conHorometro = regsEquipo.filter(r => typeof r.horometro === 'number' && r.horometro > 0)
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
  if (!conHorometro.length) return { clase: 'gris', texto: 'Sin datos', horometro: null, restantes: null };

  const horometro = Math.max(...conHorometro.map(r => r.horometro));
  const ultimoConProx = [...conHorometro].reverse().find(r => typeof r.hProx === 'number' && r.hProx > 0);

  if (!ultimoConProx) return { clase: 'gris', texto: 'Sin próx. mantención', horometro, restantes: null };

  const restantes = Math.round(ultimoConProx.hProx - horometro);
  if (restantes < 0) return { clase: 'rojo', texto: `Vencida ${Math.abs(restantes)} h`, horometro, restantes };
  if (restantes <= 100) return { clase: 'amarillo', texto: `${restantes} h`, horometro, restantes };
  return { clase: 'verde', texto: `${restantes} h`, horometro, restantes };
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

Vistas.inicio = async el => {
  el.innerHTML = '<p class="muted">Cargando...</p>';
  const [equipos, todosRegistros] = await Promise.all([Equipos.list(), Registros.todos()]);
  const regsPorEquipo = {};
  todosRegistros.forEach(r => {
    (regsPorEquipo[r.equipo] = regsPorEquipo[r.equipo] || []).push(r);
  });

  el.innerHTML = `
    <div class="filtros">
      <input id="fBusca" placeholder="Buscar código, marca, depto..." />
      <select id="fCategoria">
        <option value="">Todos</option>
        <option value="grua">Grúas</option>
        <option value="traspaleta">Traspaletas</option>
      </select>
    </div>
    <div id="grilla" class="grilla"></div>`;

  function pintar() {
    const busca = $('#fBusca').value.toLowerCase();
    const cat = $('#fCategoria').value;
    const tarjetas = equipos
      .filter(e => !cat || e.categoria === cat)
      .filter(e => {
        if (!busca) return true;
        return [e.codigo, e.marca, e.tipo, e.dpto, e.operador, e.n_serie]
          .join(' ').toLowerCase().includes(busca);
      })
      .map(e => {
        const s = calcularSemaforo(regsPorEquipo[e.codigo] || []);
        const vendida = e.estado === 'vendida';
        return `<a class="card ${vendida ? 'vendida' : ''}" href="#/equipo/${e.codigo}">
          <div class="card-top">
            <span class="codigo">${esc(e.codigo)}</span>
            <span class="badge ${s.clase}">${esc(s.texto)}</span>
          </div>
          <div class="card-sub">${esc(e.marca)} · ${esc(e.tipo)}${e.detalle ? ' · ' + esc(e.detalle) : ''}</div>
          <div class="card-meta">${esc(e.dpto || '')}${e.operador ? ' · ' + esc(e.operador) : ''}</div>
          <div class="card-meta">Horómetro: <b>${s.horometro != null ? s.horometro.toLocaleString('es-CL') : '—'}</b></div>
        </a>`;
      }).join('');
    $('#grilla').innerHTML = tarjetas || '<p class="muted">Sin resultados. Si es la primera vez, carga el catálogo en la vista Catálogo o importa tu Excel.</p>';
  }

  $('#fBusca').addEventListener('input', pintar);
  $('#fCategoria').addEventListener('change', pintar);
  pintar();
};

Vistas.equipo = async (el, codigo) => {
  el.innerHTML = '<p class="muted">Cargando...</p>';
  const equipo = await Equipos.byCodigo(codigo);
  if (!equipo) {
    el.innerHTML = `<p>Equipo ${esc(codigo)} no encontrado. <a href="#/">Volver</a></p>`;
    return;
  }
  const todos = await Registros.todos();
  const regs = todos.filter(r => r.equipo === codigo)
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const s = calcularSemaforo(regs);

  el.innerHTML = `
    <a href="#/" class="volver">&larr; Volver</a>
    <div class="ficha">
      <div>
        <h2>${esc(equipo.codigo)} <small>${esc(equipo.marca)} ${esc(equipo.tipo)}</small></h2>
        <p class="card-meta">
          Serie: ${esc(equipo.n_serie || '—')} · Depto: ${esc(equipo.dpto || '—')}<br>
          Operador: ${esc(equipo.operador || '—')} · Intervalo: cada ${esc(equipo.intervaloHoras || '—')} h
          ${equipo.detalle ? '<br>' + esc(equipo.detalle) : ''}
        </p>
      </div>
      <div class="ficha-derecha">
        <span class="badge grande ${s.clase}">${esc(s.texto)}</span>
        <div>Próx. mantención: <b>${regs.find(r => r.hProx)?.hProx ?? '—'} h</b></div>
      </div>
    </div>
    <div class="fila">
      <button class="btn primario" id="btnNuevoReg">+ Nuevo registro</button>
      <button class="btn" id="btnEditar">Editar equipo</button>
    </div>
    <h3 id="histTitulo">Historial (${regs.length})</h3>
    <div class="filtros">
      <input type="date" id="hDesde" title="Desde" />
      <input type="date" id="hHasta" title="Hasta" />
      <input id="hTexto" placeholder="Filtrar repuesto, trabajo, empresa..." />
    </div>
    <div class="tabla-wrap">
      <table class="tabla">
        <thead><tr><th>Fecha</th><th>Horóm.</th><th>H.próx</th><th>Tipo</th><th>Empresa</th><th>Responsable</th><th>Detalle</th></tr></thead>
        <tbody id="histBody"></tbody>
      </table>
    </div>`;

  const filaHTML = r => `<tr>
            <td>${esc(r.fecha)}</td>
            <td>${r.horometro != null ? r.horometro.toLocaleString('es-CL') : '—'}</td>
            <td>${r.hProx != null ? r.hProx.toLocaleString('es-CL') : '—'}</td>
            <td>${esc(r.tipo || '')}</td>
            <td>${esc(r.empresa || '')}</td>
            <td>${esc(r.responsable || '')}</td>
            <td class="detalle-celda">
              ${['trabajos', 'elementos', 'observaciones'].map(k => r[k] ? `<details><summary>${k === 'trabajos' ? 'Trabajos' : k === 'elementos' ? 'Elementos cambiados' : 'Observaciones'}</summary><pre>${esc(r[k])}</pre></details>` : '').join('')}
            </td>
          </tr>`;

  function pasa(r) {
    const d = $('#hDesde').value, h = $('#hHasta').value;
    if (d && (r.fecha || '') < d) return false;
    if (h && (r.fecha || '') > h) return false;
    const t = $('#hTexto').value.toLowerCase().trim();
    if (!t) return true;
    return [r.elementos, r.trabajos, r.observaciones, r.empresa, r.responsable, r.tipo]
      .join(' ').toLowerCase().includes(t);
  }

  function pintarHistorial() {
    const visibles = regs.filter(pasa);
    $('#histTitulo').textContent = `Historial (${visibles.length}/${regs.length})`;
    $('#histBody').innerHTML = visibles.map(filaHTML).join('')
      || '<tr><td colspan="7" class="muted">Sin resultados con esos filtros</td></tr>';
  }

  ['hDesde', 'hHasta', 'hTexto'].forEach(id => {
    $('#' + id).addEventListener('input', pintarHistorial);
  });
  pintarHistorial();

  $('#btnNuevoReg').addEventListener('click', () => {
    location.hash = `#/nuevo?equipo=${encodeURIComponent(codigo)}`;
  });

  $('#btnEditar').addEventListener('click', () => {
    location.hash = `#/editar/${encodeURIComponent(codigo)}`;
  });
};

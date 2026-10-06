window.Vistas = window.Vistas || {};
const Vistas = window.Vistas;

// Semaforo de la grua.
// Prioridad de los datos:
//   1) lo escrito en la propia grua (equipo.horometroActual / equipo.horometroProx)
//   2) si no hay nada escrito, se deriva del historial de registros
// Asi se puede corregir la lectura sin perder el historial, y las gruas sin
// registros siguen funcionando igual que antes.
function numValido(v) {
  return typeof v === 'number' && isFinite(v) && v > 0 ? v : null;
}

function calcularSemaforo(regsEquipo, equipo) {
  const conHorometro = regsEquipo.filter(r => typeof r.horometro === 'number' && r.horometro > 0)
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
  const ultimoConProx = [...conHorometro].reverse().find(r => typeof r.hProx === 'number' && r.hProx > 0);

  const hist = {
    horometro: conHorometro.length ? Math.max(...conHorometro.map(r => r.horometro)) : null,
    hProx: ultimoConProx ? ultimoConProx.hProx : null
  };
  const equipo_ = equipo || {};
  const horometro = numValido(equipo_.horometroActual) ?? hist.horometro;
  const hProx = numValido(equipo_.horometroProx) ?? hist.hProx;
  const manual = numValido(equipo_.horometroActual) != null || numValido(equipo_.horometroProx) != null;

  if (horometro == null && hProx == null) {
    return { clase: 'gris', texto: 'Sin datos', horometro: null, restantes: null, hProx: null, manual };
  }
  if (hProx == null) {
    return { clase: 'gris', texto: 'Sin próx. mantención', horometro, restantes: null, hProx: null, manual };
  }
  if (horometro == null) {
    return { clase: 'gris', texto: 'Sin horómetro', horometro: null, restantes: null, hProx, manual };
  }

  const restantes = Math.round(hProx - horometro);
  const base = { horometro, restantes, hProx, manual };
  if (restantes < 0) return { clase: 'rojo', texto: `Vencida ${Math.abs(restantes)} h`, ...base };
  if (restantes <= 100) return { clase: 'amarillo', texto: `${restantes} h`, ...base };
  return { clase: 'verde', texto: `${restantes} h`, ...base };
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function chipsEquipo(e) {
  const marca = (e.marca || '').toLowerCase();
  const marcaCls = marca.includes('toyota') ? 'marca-toyota' : marca.includes('linde') ? 'marca-linde' : 'marca-otra';
  const esElec = (e.tipo || '').toLowerCase().includes('electr');
  const tipoCls = esElec ? 'tipo-electrica' : 'tipo-combustion';
  const tipoTxt = esElec ? 'Eléctrica' : 'Combustión';
  return `<span class="chip ${marcaCls}">${esc(e.marca || '—')}</span>` +
         `<span class="chip ${tipoCls}">${tipoTxt}</span>` +
         (flotaDe(e) === FLOTA_ARRENDO ? '<span class="chip chip-arriendo">Arriendo</span>' : '') +
         (e.detalle ? `<span class="chip marca-otra">${esc(e.detalle)}</span>` : '');
}

Vistas.inicio = async el => {
  el.innerHTML = '<p class="muted">Cargando...</p>';
  const [todosEquipos, todosRegistros] = await Promise.all([Equipos.list(), Registros.todos()]);
  const regsPorEquipo = {};
  todosRegistros.forEach(r => {
    (regsPorEquipo[r.equipo] = regsPorEquipo[r.equipo] || []).push(r);
  });

  let flotaActiva = 'todas';

  el.innerHTML = `
    <div class="tabs" id="tabsFlota">
      <button type="button" class="tab activo" data-flota="todas">Todas</button>
      <button type="button" class="tab" data-flota="propia">Propias</button>
      <button type="button" class="tab" data-flota="arriendo">Arriendo</button>
    </div>
    <div class="kpis" id="kpisFlota"></div>
    <div id="kpiDetalle"></div>
    <div class="acciones-inicio">
      <a class="btn primario" href="#/nuevo-equipo">+ Nuevo equipo</a>
      <a class="btn" href="#/baterias">Baterías</a>
    </div>
    <div class="filtros">
      <input id="fBusca" placeholder="Buscar código, marca, depto, operador, serie..." />
      <select id="fFiltro">
        <option value="">Todo</option>
        <option value="cat:grua">Grúas</option>
        <option value="cat:traspaleta">Traspaletas</option>
        <option value="marca:Linde">Linde</option>
        <option value="marca:Toyota">Toyota</option>
      </select>
      <small class="muted">Filtrar por nombre/código/marca/depto</small>
    </div>
    <div id="grilla" class="grilla"></div>`;

  function pintarKPIs(equipos) {
    const activos = equipos.filter(e => e.estado !== 'vendida' && e.estado !== 'dada de baja');
    const conClase = c => activos.filter(e => calcularSemaforo(regsPorEquipo[e.codigo] || [], e).clase === c);
    const grupos = {
      equipos: { etq: 'Equipos', tit: 'Equipos activos', lista: activos, extra: '' },
      grua: { etq: 'Grúas', tit: 'Grúas activas', lista: activos.filter(e => e.categoria === 'grua'), extra: '' },
      traspaleta: { etq: 'Traspaletas', tit: 'Traspaletas activas', lista: activos.filter(e => e.categoria === 'traspaleta'), extra: '' },
      verde: { etq: 'Al día', tit: 'Al día (más de 100 h para la próxima mantención)', lista: conClase('verde'), extra: 'kpi-verde' },
      amarillo: { etq: 'Por vencer', tit: 'Por vencer (100 h o menos)', lista: conClase('amarillo'), extra: 'kpi-amarillo' },
      rojo: { etq: 'Vencidas', tit: 'Mantención vencida', lista: conClase('rojo'), extra: 'kpi-rojo' }
    };
    $('#kpisFlota').innerHTML = Object.entries(grupos).map(([k, g]) => `
      <button type="button" class="kpi ${g.extra}" data-kpi="${k}">
        <span class="kpi-num">${g.lista.length}</span><span class="kpi-etq">${g.etq}</span>
      </button>`).join('');

    el.querySelectorAll('button.kpi').forEach(b => b.addEventListener('click', () => {
      const g = grupos[b.dataset.kpi];
      const yaEsta = b.classList.contains('seleccionado');
      el.querySelectorAll('button.kpi.seleccionado').forEach(x => x.classList.remove('seleccionado'));
      const det = $('#kpiDetalle');
      if (yaEsta) { det.innerHTML = ''; return; }
      b.classList.add('seleccionado');
      det.innerHTML = `
        <div class="kpi-detalle">
          <h4>${g.tit} (${g.lista.length})</h4>
          ${g.lista.map(e => {
            const s = calcularSemaforo(regsPorEquipo[e.codigo] || [], e);
            return `<a class="fila-eq" href="#/equipo/${encodeURIComponent(e.codigo)}">
              <b>${esc(e.codigo)}</b>
              <span class="badge ${s.clase}">${esc(s.texto)}</span>
              <span class="feq-meta">${esc(e.marca || '')}${e.dpto ? ' · ' + esc(e.dpto) : ''}</span>
            </a>`;
          }).join('') || '<p class="muted">Ninguno.</p>'}
        </div>`;
    }));
  }

  function pintar() {
    const busca = $('#fBusca').value.toLowerCase();
    const f = $('#fFiltro').value;
    const [tipoF, valF] = f.split(':');
    const tarjetas = equiposVisibles()
      .filter(e => {
        if (!f) return true;
        if (tipoF === 'cat') return e.categoria === valF;
        return (e.marca || '').toLowerCase() === valF.toLowerCase();
      })
      .filter(e => {
        if (!busca) return true;
        return [e.codigo, e.marca, e.tipo, e.dpto, e.operador, e.n_serie, e.empresaArrendadora]
          .join(' ').toLowerCase().includes(busca);
      })
      .map(e => {
        const s = calcularSemaforo(regsPorEquipo[e.codigo] || [], e);
        const apagado = e.estado === 'vendida' || e.estado === 'dada de baja';
        return `<a class="card ${apagado ? 'vendida' : ''}" href="#/equipo/${e.codigo}">
          <div class="card-top">
            <span class="codigo">${esc(e.codigo)}</span>
            <span class="badge ${s.clase}">${esc(s.texto)}</span>
          </div>
          <div class="card-sub chips">${chipsEquipo(e)}</div>
          <div class="card-meta">${esc(e.dpto || '')}${e.operador ? ' · ' + esc(e.operador) : ''}</div>
          <div class="card-meta">Horómetro: <b>${s.horometro != null ? s.horometro.toLocaleString('es-CL') : '—'}</b>${s.hProx != null ? ` → próx. <b>${s.hProx.toLocaleString('es-CL')}</b> h` : ''}</div>
        </a>`;
      }).join('');
    $('#grilla').innerHTML = tarjetas || '<p class="muted">Sin resultados en esta flota.</p>';
  }

  function equiposVisibles() {
    if (flotaActiva === 'todas') return todosEquipos;
    return todosEquipos.filter(e => flotaDe(e) === flotaActiva);
  }

  function aplicarFlota() {
    pintarKPIs(equiposVisibles());
    $('#kpiDetalle').innerHTML = '';
    pintar();
  }

  el.querySelectorAll('#tabsFlota .tab').forEach(b => b.addEventListener('click', () => {
    el.querySelectorAll('#tabsFlota .tab').forEach(x => x.classList.remove('activo'));
    b.classList.add('activo');
    flotaActiva = b.dataset.flota;
    aplicarFlota();
  }));

  $('#fBusca').addEventListener('input', pintar);
  $('#fFiltro').addEventListener('change', pintar);
  aplicarFlota();
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
  const s = calcularSemaforo(regs, equipo);

  el.innerHTML = `
    <a href="#/" class="volver">&larr; Volver</a>
    <div class="ficha">
      <div>
        <h2>${esc(equipo.codigo)}</h2>
        <div class="chips" style="margin-top:2px">${chipsEquipo(equipo)}</div>
        <p class="card-meta">
          Serie: ${esc(equipo.n_serie || '—')} · Depto: ${esc(equipo.dpto || '—')}<br>
          Operador: ${esc(equipo.operador || '—')} · Intervalo: cada ${esc(equipo.intervaloHoras || '—')} h
          ${equipo.detalle ? '<br>' + esc(equipo.detalle) : ''}
        </p>
      </div>
      <div class="ficha-derecha">
        <span class="badge grande ${s.clase}">${esc(s.texto)}</span>
        <div>Horómetro actual: <b id="fHActual">${s.horometro != null ? s.horometro.toLocaleString('es-CL') : '—'} h</b></div>
        <div>Próx. mantención: <b id="fHProx">${s.hProx != null ? s.hProx.toLocaleString('es-CL') : '—'} h</b></div>
        ${s.manual ? '<div class="muted" style="font-size:.75rem">Valores escritos en la grúa</div>' : ''}
        <div class="fila dos" style="margin-top:8px">
          <button class="btn mini" id="btnHorometro">Actualizar horómetro</button>
          <button class="btn mini" id="btnQuitarManual" ${s.manual ? '' : 'hidden'}>Volver al historial</button>
        </div>
      </div>
    </div>
    <div class="fila tres">
      <button class="btn primario" id="btnNuevoReg">+ Nuevo registro</button>
      <button class="btn" id="btnExportHist">Exportar CSV</button>
      <button class="btn" id="btnEditar">Editar equipo</button>
    </div>
    <h3 id="histTitulo">Historial (${regs.length})</h3>
    <div class="filtros">
      <input type="date" id="hDesde" title="Desde" />
      <input type="date" id="hHasta" title="Hasta" />
      <input id="hTexto" placeholder="Filtrar repuesto, trabajo, empresa..." />
    </div>
    <div style="margin-bottom:10px">
      <button class="btn mini" id="btnExpSel" disabled>Exportar seleccionadas (PDF)</button>
      <label class="check" style="display:inline;margin-left:8px"><input type="checkbox" id="hTodos" /> Seleccionar todo</label>
    </div>
    <div class="tabla-wrap">
      <table class="tabla">
        <thead><tr><th></th><th>Fecha</th><th>Horóm.</th><th>H.próx</th><th>Tipo</th><th>Empresa</th><th>Responsable</th><th>Detalle</th><th></th></tr></thead>
        <tbody id="histBody"></tbody>
      </table>
    </div>`;

  const filaHTML = (r, i) => `<tr>
            <td><input type="checkbox" class="hSel" data-i="${i}" /></td>
            <td>${esc(r.fecha)}</td>
            <td>${r.horometro != null ? r.horometro.toLocaleString('es-CL') : '—'}</td>
            <td>${r.hProx != null ? r.hProx.toLocaleString('es-CL') : '—'}</td>
            <td>${esc(r.tipo || '')}</td>
            <td>${esc(r.empresa || '')}</td>
            <td>${esc(r.responsable || '')}</td>
            <td class="detalle-celda">
              ${['trabajos', 'elementos', 'observaciones'].map(k => r[k] ? `<details><summary>${k === 'trabajos' ? 'Trabajos' : k === 'elementos' ? 'Elementos cambiados' : 'Observaciones'}</summary><pre>${esc(r[k])}</pre></details>` : '').join('')}
            </td>
            <td>${Auth.puedeBorrar() ? `<button class="btn mini peligro hDel" data-i="${i}" title="Eliminar registro">✕</button>` : ''}</td>
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
    $('#histBody').innerHTML = visibles.map((r, i) => filaHTML(r, i)).join('')
      || '<tr><td colspan="9" class="muted">Sin resultados con esos filtros</td></tr>';
    document.querySelectorAll('.hSel').forEach(c => c.addEventListener('change', actualizarExpSel));
    document.querySelectorAll('.hDel').forEach(b => b.addEventListener('click', async () => {
      const r = visibles[+b.dataset.i];
      if (!r) return;
      if (!confirm(`¿Eliminar el registro del ${r.fecha || '(sin fecha)'}? Esta acción no se puede deshacer.`)) return;
      try {
        await Registros.eliminar(r.id);
        toast('Registro eliminado');
        Vistas.equipo(el, codigo);
      } catch (err) {
        toast('Error al eliminar: ' + err.message);
      }
    }));
    actualizarExpSel();
  }

  function seleccionadas() {
    return Array.from(document.querySelectorAll('.hSel:checked')).map(c => {
      const r = regs.filter(pasa)[+c.dataset.i];
      return { reg: r, eq: equipo };
    }).filter(p => p.reg);
  }

  function actualizarExpSel() {
    $('#btnExpSel').disabled = !document.querySelector('.hSel:checked');
  }

  $('#hTodos').addEventListener('change', ev => {
    document.querySelectorAll('.hSel').forEach(c => { c.checked = ev.target.checked; });
    actualizarExpSel();
  });

  $('#btnExpSel').addEventListener('click', () => {
    const pares = seleccionadas();
    if (pares.length) generarPDFHistorial(`historial_${codigo}_seleccion.pdf`, `Historial ${codigo}`, pares);
  });

  ['hDesde', 'hHasta', 'hTexto'].forEach(id => {
    $('#' + id).addEventListener('input', pintarHistorial);
  });
  pintarHistorial();

  $('#btnNuevoReg').addEventListener('click', () => {
    location.hash = `#/nuevo?equipo=${encodeURIComponent(codigo)}`;
  });

  $('#btnExportHist').addEventListener('click', () => {
    descargarCSV(`historial_${codigo}.csv`, CABECERAS_AUDITORIA, regs.map(r => filaAuditoria(equipo, r)));
  });

  $('#btnEditar').addEventListener('click', () => {
    location.hash = '#/editar/' + encodeURIComponent(codigo);
  });

  // Actualizacion rapida del horometro SIN salir de la ficha. Escribe en el
  // documento del equipo; el historial no se toca.
  $('#btnHorometro').addEventListener('click', async () => {
    const s0 = calcularSemaforo(regs, equipo);
    const bruto = prompt(
      `${codigo}\n\nHorómetro actual (horas):`,
      s0.horometro != null ? String(s0.horometro) : ''
    );
    if (bruto === null) return;
    const act = bruto.trim() === '' ? null : parseFloat(bruto.replace(/\./g, '').replace(',', '.'));
    if (bruto.trim() !== '' && (isNaN(act) || act < 0)) { toast('Horómetro inválido'); return; }

    let prox = s0.hProx;
    if (act != null) {
      const porDefecto = act + Number(equipo.intervaloHoras || 0);
      const bruto2 = prompt(
        `Horómetro de la próxima mantención (horas):\n\nSugerido: ${porDefecto} (actual + intervalo de ${equipo.intervaloHoras || '—'} h). Deja vacío para borrar.`,
        s0.hProx != null ? String(s0.hProx) : String(porDefecto)
      );
      if (bruto2 === null) return;
      prox = bruto2.trim() === '' ? null : parseFloat(bruto2.replace(/\./g, '').replace(',', '.'));
      if (bruto2.trim() !== '' && (isNaN(prox) || prox < 0)) { toast('Valor inválido'); return; }
    } else {
      prox = null;
    }

    try {
      await Equipos.upsert({ codigo, horometroActual: act, horometroProx: prox });
      toast('Horómetro actualizado');
      Vistas.equipo(el, codigo);
    } catch (err) {
      toast('Error al guardar: ' + err.message);
    }
  });

  $('#btnQuitarManual').addEventListener('click', async () => {
    if (!confirm(`¿Borrar el horómetro escrito en ${codigo} y volver a usar el historial?`)) return;
    try {
      await Equipos.upsert({ codigo, horometroActual: null, horometroProx: null });
      toast('Vuelve a tomar el horómetro del historial');
      Vistas.equipo(el, codigo);
    } catch (err) {
      toast('Error al guardar: ' + err.message);
    }
  });
};

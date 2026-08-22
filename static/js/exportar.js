window.Vistas = window.Vistas || {};
const Vistas = window.Vistas;

Vistas.exportar = async el => {
  el.innerHTML = '<p class="muted">Cargando...</p>';
  const equipos = await Equipos.list();
  const hoy = hoyISO();

  el.innerHTML = `
    <h2>Exportar historial a PDF</h2>
    <p class="muted">Elige el equipo y el rango de fechas, marca los registros que necesitas y descárgalos como PDF para auditorías.</p>
    <div class="filtros">
      <select id="xEquipo" style="max-width:180px">
        <option value="">Todos los equipos</option>
        ${equipos.map(e => `<option value="${e.codigo}">${e.codigo} · ${e.marca}</option>`).join('')}
      </select>
      <input type="date" id="xDesde" title="Desde" />
      <input type="date" id="xHasta" title="Hasta" />
      <button class="btn primario" id="xBuscar">Buscar</button>
    </div>
    <div id="xResultados"></div>`;

  async function buscar() {
    const equipo = $('#xEquipo').value;
    const desde = $('#xDesde').value;
    const hasta = $('#xHasta').value;
    const todos = await Registros.todos(true);
    const regs = todos
      .filter(r => !equipo || r.equipo === equipo)
      .filter(r => (!desde || (r.fecha || '') >= desde) && (!hasta || (r.fecha || '') <= hasta))
      .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

    if (!regs.length) {
      $('#xResultados').innerHTML = '<p class="muted">Sin registros con esos filtros.</p>';
      return;
    }

    $('#xResultados').innerHTML = `
      <div style="margin-bottom:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn primario" id="xDescargar" disabled>Descargar PDF seleccionados</button>
        <label class="check" style="margin:0"><input type="checkbox" id="xTodos" /> Seleccionar todo (${regs.length})</label>
      </div>
      <div class="tabla-wrap">
        <table class="tabla">
          <thead><tr><th></th><th>Equipo</th><th>Fecha</th><th>Horóm.</th><th>Tipo</th><th>Empresa</th><th>Responsable</th><th>Detalle</th></tr></thead>
          <tbody>
            ${regs.map((r, i) => `<tr>
              <td><input type="checkbox" class="xSel" data-i="${i}" /></td>
              <td><strong>${esc(r.equipo)}</strong></td>
              <td>${esc(r.fecha || '—')}</td>
              <td>${r.horometro != null ? r.horometro.toLocaleString('es-CL') : '—'}</td>
              <td>${esc(r.tipo || '')}</td>
              <td>${esc(r.empresa || '')}</td>
              <td>${esc(r.responsable || '')}</td>
              <td>${esc((r.trabajos || r.elementos || r.observaciones || '').split('\n')[0].slice(0, 60))}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    window._xRegs = regs;

    function actualizar() {
      const n = document.querySelectorAll('.xSel:checked').length;
      const b = $('#xDescargar');
      b.disabled = n === 0;
      b.textContent = n ? `Descargar PDF (${n})` : 'Descargar PDF seleccionados';
    }

    $('#xTodos').addEventListener('change', ev => {
      document.querySelectorAll('.xSel').forEach(c => { c.checked = ev.target.checked; });
      actualizar();
    });
    document.querySelectorAll('.xSel').forEach(c => c.addEventListener('change', actualizar));

    $('#xDescargar').addEventListener('click', () => {
      const selIdx = Array.from(document.querySelectorAll('.xSel:checked')).map(c => +c.dataset.i);
      const pares = selIdx.map(i => {
        const reg = window._xRegs[i];
        return { reg, eq: equipos.find(e => e.codigo === reg.equipo) };
      });
      const nombreEq = equipo || 'flota';
      generarPDFHistorial(
        `historial_${nombreEq}_${$('#xDesde').value || 'inicio'}_${$('#xHasta').value || hoy}.pdf`,
        `Historial de Mantenciones — ${nombreEq.toUpperCase()}`,
        pares
      );
    });
  }

  $('#xBuscar').addEventListener('click', buscar);
  buscar();
};

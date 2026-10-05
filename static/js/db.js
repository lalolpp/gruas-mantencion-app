const db = firebase.firestore();

// Flota: 'propia' (de la empresa) o 'arriendo'. Los equipos cargados antes de
// esta version no tienen el campo, por eso el default.
const FLOTA_PROPIA = 'propia';
const FLOTA_ARRENDO = 'arriendo';
const PREFIJO_FLOTA = { [FLOTA_PROPIA]: 'PR-', [FLOTA_ARRENDO]: 'AR-' };

function flotaDe(e) {
  return e && e.flota === FLOTA_ARRENDO ? FLOTA_ARRENDO : FLOTA_PROPIA;
}
function esPropio(e) { return flotaDe(e) === FLOTA_PROPIA; }

function cmpCodigo(a, b) {
  const m1 = String(a).match(/^([A-Za-z]+)(\d+)$/), m2 = String(b).match(/^([A-Za-z]+)(\d+)$/);
  if (m1 && m2) {
    const p = m1[1].localeCompare(m2[1]);
    return p || (+m1[2] - +m2[2]);
  }
  return String(a).localeCompare(String(b));
}

const Equipos = {
  async list() {
    const snap = await db.collection('equipos').orderBy('codigo').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => cmpCodigo(a.codigo, b.codigo));
  },
  async byCodigo(codigo) {
    const snap = await db.collection('equipos').where('codigo', '==', codigo).limit(1).get();
    return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
  },
  // Resuelve el codigo final al guardar un equipo NUEVO.
  // Si el codigo ya existe en la MISMA flota -> no se puede (devuelve null).
  // Si existe en la OTRA flota -> se prefija (AR-G5 / PR-G5) para no chocar.
  async resolverCodigo(codigo, flota) {
    const limpio = String(codigo || '').trim();
    if (!limpio) return { error: 'Falta el codigo' };
    const existente = await this.byCodigo(limpio);
    if (!existente) return { codigo: limpio, prefijo: false };
    if (flotaDe(existente) === flota) {
      return { error: `Ya existe el equipo ${limpio} en esta flota. Usa "Editar equipo" para modificarlo.` };
    }
    const prefijo = PREFIJO_FLOTA[flota];
    let cand = prefijo + limpio, n = 2;
    while (await this.byCodigo(cand)) { cand = prefijo + limpio + '-' + n; n++; }
    return { codigo: cand, prefijo: true, original: limpio };
  },
  // Alta de equipo. No reutiliza codigos: si el codigo existe, falla.
  async crear(equipo) {
    const existente = await this.byCodigo(equipo.codigo);
    if (existente) throw new Error(`Ya existe un equipo con el codigo ${equipo.codigo}`);
    const ref = await db.collection('equipos').add({
      ...equipo,
      creadoEn: firebase.firestore.FieldValue.serverTimestamp()
    });
    return ref.id;
  },
  async upsert(equipo) {
    const existente = await this.byCodigo(equipo.codigo);
    if (existente) {
      await db.collection('equipos').doc(existente.id).set(equipo, { merge: true });
      return existente.id;
    }
    return this.crear(equipo);
  }
};

const Registros = {
  _cache: null,
  async todos(forzar = false) {
    if (this._cache && !forzar) return this._cache;
    const snap = await db.collection('registros').get();
    this._cache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return this._cache;
  },
  invalidar() { this._cache = null; },
  async eliminar(id) {
    await db.collection('registros').doc(id).delete();
    this.invalidar();
  },
  async add(reg) {
    const ref = await db.collection('registros').add({
      ...reg,
      creadoEn: firebase.firestore.FieldValue.serverTimestamp()
    });
    this.invalidar();
    return ref.id;
  },
  async bulkInsert(regs, onProgreso) {
    let lote = db.batch(), n = 0, total = 0;
    for (const reg of regs) {
      lote.set(db.collection('registros').doc(), {
        ...reg,
        creadoEn: firebase.firestore.FieldValue.serverTimestamp()
      });
      if (++n === 400) {
        await lote.commit();
        total += n;
        n = 0;
        lote = db.batch();
        if (onProgreso) onProgreso(total);
      }
    }
    if (n > 0) {
      await lote.commit();
      total += n;
    }
    this.invalidar();
    if (onProgreso) onProgreso(total);
    return total;
  }
};

// Baterias de gruas electricas. El "historial" vive en la subcoleccion
// baterias/{id}/eventos (cargas, cambios, reparaciones).
const Baterias = {
  _cache: null,
  async todas(forzar = false) {
    if (this._cache && !forzar) return this._cache;
    const snap = await db.collection('baterias').get();
    this._cache = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => cmpCodigo(a.numero, b.numero));
    return this._cache;
  },
  invalidar() { this._cache = null; },
  async porId(id) {
    const d = await db.collection('baterias').doc(id).get();
    return d.exists ? { id: d.id, ...d.data() } : null;
  },
  async porNumero(numero) {
    const lista = await this.todas(true);
    return lista.find(b => String(b.numero).toLowerCase() === String(numero).toLowerCase()) || null;
  },
  async guardar(bateria) {
    if (bateria.id) {
      const { id, ...resto } = bateria;
      await db.collection('baterias').doc(id).set(resto, { merge: true });
      this.invalidar();
      return id;
    }
    const ref = await db.collection('baterias').add({
      ...bateria,
      creadoEn: firebase.firestore.FieldValue.serverTimestamp()
    });
    this.invalidar();
    return ref.id;
  },
  async eliminar(id) {
    await db.collection('baterias').doc(id).delete();
    this.invalidar();
  },
  async eventos(bateriaId) {
    const snap = await db.collection('baterias').doc(bateriaId).collection('eventos').orderBy('fecha', 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async agregarEvento(bateriaId, evento) {
    const ref = await db.collection('baterias').doc(bateriaId).collection('eventos').add({
      ...evento,
      creadoEn: firebase.firestore.FieldValue.serverTimestamp()
    });
    return ref.id;
  },
  async eliminarEvento(bateriaId, eventoId) {
    await db.collection('baterias').doc(bateriaId).collection('eventos').doc(eventoId).delete();
  }
};

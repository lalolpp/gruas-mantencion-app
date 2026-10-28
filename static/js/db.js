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

// El SDK de Firestore RECHAZA `undefined` en cualquier campo ("Unsupported field
// value: undefined"). Pasa mucho al construir el objeto desde un formulario:
// un campo vacio llega como `id: undefined` o `x: undefined` y revienta el
// guardado. Se limpian antes de escribir. Los null SI son validos.
function sinIndefinidos(objeto) {
  const limpio = {};
  Object.keys(objeto || {}).forEach(k => { if (objeto[k] !== undefined) limpio[k] = objeto[k]; });
  return limpio;
}

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
    const ref = await db.collection('equipos').add(sinIndefinidos({
      ...equipo,
      creadoEn: firebase.firestore.FieldValue.serverTimestamp()
    }));
    return ref.id;
  },
  async upsert(equipo) {
    const existente = await this.byCodigo(equipo.codigo);
    const datos = sinIndefinidos(equipo);
    if (existente) {
      await db.collection('equipos').doc(existente.id).set(datos, { merge: true });
      return existente.id;
    }
    return this.crear(datos);
  },
  // Renombrar el codigo de un equipo ya creado (p. ej. corregir "A10" -> "AR10").
  // El codigo es la identidad del equipo en toda la app: los registros y las
  // baterias lo guardan como texto ("equipo"), asi que hay que actualizarlos
  // en cascada o quedan huerfanos. Devuelve cuantas cosas se movieron.
  async renombrar(equipoId, codigoNuevo) {
    const nuevo = String(codigoNuevo || '').trim();
    if (!nuevo) throw new Error('El codigo no puede quedar vacio');
    const docEq = db.collection('equipos').doc(equipoId);
    const snapEq = await docEq.get();
    if (!snapEq.exists) throw new Error('Equipo no encontrado');
    const anterior = snapEq.data().codigo;
    if (nuevo === anterior) return { cambios: 0, anterior, nuevo };

    // No pisar otro equipo que ya use ese codigo.
    const choque = await this.byCodigo(nuevo);
    if (choque && choque.id !== equipoId) {
      throw new Error(`Ya existe un equipo con el codigo ${nuevo}`);
    }

    let cambios = 0;
    // Registros de mantencion del equipo (batch de a 400, max. Firestore).
    const snapRegs = await db.collection('registros')
      .where('equipo', '==', anterior).get();
    let lote = db.batch();
    let n = 0;
    for (const d of snapRegs.docs) {
      lote.update(d.ref, { equipo: nuevo });
      if (++n === 400) { await lote.commit(); cambios += n; lote = db.batch(); n = 0; }
    }
    if (n > 0) { await lote.commit(); cambios += n; }

    // Baterias asociadas al equipo.
    const snapBats = await db.collection('baterias')
      .where('equipo', '==', anterior).get();
    let lb = db.batch();
    let nb = 0;
    for (const d of snapBats.docs) {
      lb.update(d.ref, { equipo: nuevo });
      if (++nb === 400) { await lb.commit(); cambios += nb; lb = db.batch(); nb = 0; }
    }
    if (nb > 0) { await lb.commit(); cambios += nb; }

    // Por ultimo el equipo mismo: si algo fallo antes, el equipo conserva su
    // codigo viejo y nada queda apuntando a un codigo inexistente.
    await docEq.update({ codigo: nuevo });
    Registros.invalidar();
    Baterias.invalidar();
    return { cambios, anterior, nuevo };
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
  async porId(id) {
    const d = await db.collection('registros').doc(id).get();
    return d.exists ? { id: d.id, ...d.data() } : null;
  },
  async eliminar(id) {
    await db.collection('registros').doc(id).delete();
    this.invalidar();
  },
  async actualizar(id, cambios) {
    await db.collection('registros').doc(id).set(sinIndefinidos(cambios), { merge: true });
    this.invalidar();
  },
  async add(reg) {
    const ref = await db.collection('registros').add(sinIndefinidos({
      ...reg,
      creadoEn: firebase.firestore.FieldValue.serverTimestamp()
    }));
    this.invalidar();
    return ref.id;
  },
  async bulkInsert(regs, onProgreso) {
    let lote = db.batch(), n = 0, total = 0;
    for (const reg of regs) {
      lote.set(db.collection('registros').doc(), sinIndefinidos({
        ...reg,
        creadoEn: firebase.firestore.FieldValue.serverTimestamp()
      }));
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
      await db.collection('baterias').doc(id).set(sinIndefinidos(resto), { merge: true });
      this.invalidar();
      return id;
    }
    // Ojo: sin sinIndefinidos, un formulario que mande `id: undefined` (o
    // cualquier campo vacio) hace fallar addDoc con
    // "Unsupported field value: undefined".
    const ref = await db.collection('baterias').add(sinIndefinidos({
      ...bateria,
      creadoEn: firebase.firestore.FieldValue.serverTimestamp()
    }));
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
    const ref = await db.collection('baterias').doc(bateriaId).collection('eventos').add(sinIndefinidos({
      ...evento,
      creadoEn: firebase.firestore.FieldValue.serverTimestamp()
    }));
    return ref.id;
  },
  async eliminarEvento(bateriaId, eventoId) {
    await db.collection('baterias').doc(bateriaId).collection('eventos').doc(eventoId).delete();
  }
};

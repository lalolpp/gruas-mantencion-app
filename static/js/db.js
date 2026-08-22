const db = firebase.firestore();

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
  async upsert(equipo) {
    const existente = await this.byCodigo(equipo.codigo);
    if (existente) {
      await db.collection('equipos').doc(existente.id).set(equipo, { merge: true });
      return existente.id;
    }
    const ref = await db.collection('equipos').add({
      ...equipo,
      creadoEn: firebase.firestore.FieldValue.serverTimestamp()
    });
    return ref.id;
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

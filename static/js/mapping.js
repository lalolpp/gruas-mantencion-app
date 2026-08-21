const MapaHojas = (() => {
  const DEFECTO = {
    GRUA1: 'G1',
    GRUA2: 'G2',
    GRUA3: 'G3',
    GRUA4: 'G4',
    GRUA5: 'G5',
    GRUA6: 'G6',
    GRUA7: 'G7',
    GRUA8: 'G8',
    GRUA9: 'G9',
    GRUA10: 'G10',
    GRUA10VOLCADORA: 'G10',
    NOEXISTE: 'G11',
    GRUA11: 'G11',
    GRUA12: 'G12',
    GRUAG12: 'G12',
    GRUA13: 'G13',
    GRUA14: 'G14',
    GRUA15: 'G14',
    T01: 'T01',
    T02: 'T02',
    T03: 'T03'
  };

  const IGNORAR = new Set(['GRUASDESIGNADAS', 'CRONOGRAMA']);

  function normalizar(nombre) {
    return String(nombre || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase();
  }

  function resolver(nombreHoja, personalizado) {
    const clave = normalizar(nombreHoja);
    if (IGNORAR.has(clave)) return null;
    if (personalizado && Object.prototype.hasOwnProperty.call(personalizado, clave)) {
      return personalizado[clave] || null;
    }
    return DEFECTO[clave] ?? null;
  }

  function esIgnorable(nombreHoja) {
    return IGNORAR.has(normalizar(nombreHoja));
  }

  return { normalizar, resolver, esIgnorable };
})();

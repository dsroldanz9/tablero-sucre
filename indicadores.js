/* Utilidades de indicadores compartidas por Problemas y Caracterización */
(function () {
  'use strict';
  const T = window.T;
  const I = (T.I = {});
  const ok = v => v != null && typeof v === 'number' && isFinite(v);

  I.ultimo = ind => ind.anios.length - 1;
  I.pob = cod => { const i = T.idxMun.get(cod); return i == null ? null : T.D.ind.municipios.pob[i]; };
  I.grupo = cod => { const i = T.idxMun.get(cod); return i == null ? null : T.D.ind.municipios.rur[i]; };
  I.idxDep = cod2 => T.D.ind.departamentos.cod.indexOf(cod2);
  I.porTab = tab => T.D.ind.ind.filter(x => x.tab === tab);

  // agregado de varios municipios de Sucre en el año j
  I.agregar = function (ind, cods, j) {
    const vals = cods.map(c => (ind.suc[c] || [])[j]);
    if (ind.agg === 'suma') { const vs = vals.filter(ok); return vs.length ? vs.reduce((a, b) => a + b, 0) : null; }
    return T.wmean(vals, cods.map(I.pob));
  };
  // valor del territorio en el último año
  I.valor = function (ind, est = T.estado) {
    const j = I.ultimo(ind);
    if (est.mun) { const s = ind.suc[est.mun]; return s ? s[j] : null; }
    if (!est.sub) return ind.dep[I.idxDep('70')];
    return I.agregar(ind, T.munisAmbito(est).map(m => m.cod), j);
  };
  I.serie = function (ind, est = T.estado) {
    if (est.mun) return ind.suc[est.mun] || ind.anios.map(() => null);
    if (!est.sub) return ind.s70;
    const cods = T.munisAmbito(est).map(m => m.cod);
    return ind.anios.map((_, j) => I.agregar(ind, cods, j));
  };
  I.pais = ind => ind.col[I.ultimo(ind)];
  I.medianaCaribe = function (ind) {
    if (ind._medCar !== undefined) return ind._medCar;
    const M = T.D.ind.municipios, D = T.D.ind.departamentos;
    const car = new Set(D.cod.filter((c, i) => D.caribe[i]));
    return (ind._medCar = T.mediana(ind.nac.filter((v, i) => car.has(M.d[i]))));
  };
  I.medianaGrupo = function (ind, grupo) {
    if (!grupo) return null;
    ind._medG = ind._medG || {};
    if (ind._medG[grupo] === undefined) {
      const M = T.D.ind.municipios;
      ind._medG[grupo] = T.mediana(ind.nac.filter((v, i) => M.rur[i] === grupo));
    }
    return ind._medG[grupo];
  };
  // diferencia relativa con el país; positiva = situación más desfavorable
  I.brecha = function (ind, v) {
    const p = I.pais(ind);
    if (!ok(v) || !ok(p) || p === 0 || ind.dir === 0 || ind.agg === 'suma') return null;
    return ind.dir === -1 ? (100 * (v - p)) / Math.abs(p) : (100 * (p - v)) / Math.abs(p);
  };
  // porcentaje de municipios del país con mejor y con peor valor (sin contar empates)
  I.posicion = function (ind, v) {
    if (!ok(v) || ind.dir === 0) return null;
    const xs = ind._orden || (ind._orden = ind.nac.filter(ok).sort((a, b) => a - b));
    const n = xs.length;
    if (!n) return null;
    let lo = 0, hi = n;
    while (lo < hi) { const m = (lo + hi) >> 1; if (xs[m] < v) lo = m + 1; else hi = m; }
    const menores = lo;
    lo = menores; hi = n;
    while (lo < hi) { const m = (lo + hi) >> 1; if (xs[m] <= v) lo = m + 1; else hi = m; }
    const mayores = n - lo;
    const peorQue = (100 * (ind.dir === -1 ? menores : mayores)) / n;
    const mejorQue = (100 * (ind.dir === -1 ? mayores : menores)) / n;
    return { peorQue, mejorQue };
  };
  I.posicionTexto = function (ind, v, prefijo = '') {
    const p = I.posicion(ind, v);
    if (!p) return null;
    return p.peorQue >= p.mejorQue
      ? `${prefijo}peor que el ${Math.round(p.peorQue)}% de los municipios del país`
      : `${prefijo}mejor que el ${Math.round(p.mejorQue)}% de los municipios del país`;
  };
  // departamentos ordenados de peor a mejor situación
  I.rangoDep = function (ind) {
    const D = T.D.ind.departamentos;
    const lista = ind.dep.map((v, i) => ({ v, cod: D.cod[i], n: D.n[i] })).filter(x => ok(x.v));
    lista.sort((a, b) => (ind.dir === 1 ? a.v - b.v : b.v - a.v));
    const pos = lista.findIndex(x => x.cod === '70') + 1;
    return { pos, n: lista.length, pct: pos && lista.length > 1 ? 100 * (1 - (pos - 1) / (lista.length - 1)) : null, lista };
  };
  // severidad 0-100 (100 = peor): percentil entre municipios o puesto entre departamentos
  I.severidad = function (ind, est = T.estado) {
    if (ind.dir === 0) return null;
    if (!est.mun && !est.sub) return I.rangoDep(ind).pct;
    const v = I.valor(ind, est);
    return ok(v) ? T.pctPeor(ind, v) : null;
  };
  I.estado = function (ind, est = T.estado) {
    if (ind.dir === 0) return 'contexto';
    const s = I.severidad(ind, est);
    if (s == null) return null;
    return s >= 60 ? 'peor' : s <= 40 ? 'mejor' : 'similar';
  };
  I.clase5 = s => (s == null ? -1 : s < 20 ? 0 : s < 40 ? 1 : s <= 60 ? 2 : s <= 80 ? 3 : 4);
  I.etiquetaClase = ['Entre el 20% con mejor situación', 'Mejor que la mayoría', 'En la mitad del país', 'Peor que la mayoría', 'Entre el 20% con peor situación'];
  I.lista = xs => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' y ' + xs[xs.length - 1]);
  I.enAmbito = (est = T.estado) => (est.mun ? T.muni[est.mun].n : est.sub ? 'la subregión ' + est.sub : 'Sucre');
})();

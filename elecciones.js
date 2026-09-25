/* Sección 1 · Elecciones: resultados por puesto, municipio, subregión y departamento */
(function () {
  'use strict';
  const T = window.T;
  const S = (T.secciones.elecciones = {});
  const st = { eleccion: 'gob2023', vista: 'mun', color: 'ganador' };
  const N = {};
  let mapa, pintarAmbito;

  const GRUPO = id => (/^(sen|cam)/.test(id) ? 'Congreso' : id.startsWith('p') ? 'Presidenciales'
    : id.endsWith('2023') ? 'Territoriales 2023' : 'Territoriales 2019');
  const eleccion = () => T.D.el.elecciones.find(e => e.id === st.eleccion);
  const sumaPacto = r => r.filas.filter(f => f.b === 'pacto').reduce((a, f) => a + f.votos, 0);

  S.iniciar = function (cont) {
    pintarAmbito = T.cabecera(cont, 'Elecciones',
      'Resultados oficiales mesa a mesa, sumados por puesto de votación, municipio, subregión y departamento. Los porcentajes son sobre votos válidos (candidaturas más voto en blanco). Un clic en el mapa o en las tablas abre el municipio.');
    N.filtros = T.h('div', { class: 'filtros' });
    N.tiles = T.h('div');
    N.cMapa = T.h('div', { class: 'tarjeta' });
    N.cRes = T.h('div', { class: 'tarjeta' });
    N.cTabla = T.h('div', { class: 'tarjeta' });
    cont.append(N.filtros, N.tiles, T.h('div', { class: 'grilla g-mapa' }, N.cMapa, N.cRes), N.cTabla);
    N.mapaTit = T.h('h3'); N.mapaSub = T.h('p', { class: 'sub' });
    N.cMapa.append(N.mapaTit, N.mapaSub);
    mapa = T.mapaSucre(N.cMapa);
    N.mapaNota = T.h('p', { class: 'nota' });
    N.cMapa.append(N.mapaNota);
  };
  S.mostrar = () => mapa && mapa.refrescar();
  S.actualizar = function () { pintarAmbito(); filtros(); pintar(); mapa.enfocar(); };

  /* ---------------- cachés por elección ---------------- */
  function porMuni(e) {
    if (!e._pm) {
      e._pm = new Map();
      for (const m of T.D.el.munis) {
        const ps = T.D.el.puestos.filter(p => p.m === m.cod);
        const r = e.nivel === 'dep' ? T.sumar(e, ps) : T.sumarMun(e, m.cod, ps);
        if (r && r.puestos) e._pm.set(m.cod, r);
      }
    }
    return e._pm;
  }
  function porPuesto(e) {
    if (!e._pp) { e._pp = new Map(); for (const p of T.D.el.puestos) { const r = T.resumenPuesto(e, p); if (r) e._pp.set(p.id, r); } }
    return e._pp;
  }
  function partidos(e, puestos) {
    const acc = new Map(); let validos = 0;
    for (const p of puestos) {
      const x = e.v[p.id], cands = e.cands[p.m];
      if (!x || !cands) continue;
      cands.forEach((c, i) => {
        const o = acc.get(c.p) || { p: c.p, n: c.p, votos: 0, munis: new Set(), b: c.b };
        o.votos += x[i]; o.munis.add(p.m); acc.set(c.p, o);
      });
      for (let i = 0; i <= cands.length; i++) validos += x[i];
    }
    return [...acc.values()].map(o => ({ ...o, nMunis: o.munis.size, pct: validos ? (100 * o.votos) / validos : 0 })).sort((a, b) => b.votos - a.votos);
  }

  /* ---------------- filtros ---------------- */
  function opcionesColor(e) {
    const ops = [{ v: 'ganador', t: 'Quién ganó' }, { v: 'bloque', t: 'Pacto Histórico y aliados (% de votos)' }];
    if (e.nivel === 'dep') {
      T.sumar(e, T.D.el.puestos).filas.slice(0, 15).forEach(c => ops.push({ v: 'k:' + c.k, t: c.n, grupo: e.tipo === 'lista' ? 'Listas (% de votos)' : 'Candidaturas (% de votos)' }));
    } else if (T.estado.mun) {
      const r = T.sumarMun(e, T.estado.mun, T.D.el.puestos);
      if (r) r.filas.forEach(c => ops.push({ v: 'k:' + c.k, t: e.tipo === 'lista' ? c.n : `${c.n} · ${c.p}`, grupo: 'En ' + T.muni[T.estado.mun].n + ' (% de votos)' }));
    } else {
      partidos(e, T.D.el.puestos).slice(0, 15).forEach(p => ops.push({ v: 'p:' + p.p, t: p.p, grupo: 'Partidos (% de votos)' }));
    }
    return ops;
  }
  function filtros() {
    const e = eleccion();
    const opsColor = opcionesColor(e);
    if (!opsColor.some(o => o.v === st.color)) st.color = 'ganador';
    N.opsColor = opsColor;
    N.filtros.replaceChildren(
      T.selector(T.D.el.elecciones.map(x => ({ v: x.id, t: x.nombre, grupo: GRUPO(x.id) })), st.eleccion,
        v => { st.eleccion = v; st.color = 'ganador'; filtros(); pintar(); }, 'Elección'),
      T.segmentos([{ v: 'mun', t: 'Municipios' }, { v: 'puesto', t: 'Puestos de votación' }], st.vista,
        v => { st.vista = v; pintar(); }, 'Unidad del mapa y la tabla'),
      T.selector(opsColor, st.color, v => { st.color = v; pintar(); }, 'Colorear el mapa por'));
  }

  /* ---------------- medida para colorear ---------------- */
  function medida(e, r, cod) {
    if (!r || !r.validos) return null;
    if (st.color === 'ganador') return r.filas[0] ? { cat: r.filas[0] } : null;
    let votos = 0;
    if (st.color === 'bloque') votos = sumaPacto(r);
    else if (st.color.startsWith('k:')) {
      if (e.nivel === 'mun' && cod !== T.estado.mun) return null;
      const f = r.filas.find(x => x.k === st.color.slice(2)); votos = f ? f.votos : 0;
    } else if (st.color.startsWith('p:')) votos = r.filas.filter(x => x.p === st.color.slice(2)).reduce((a, x) => a + x.votos, 0);
    return { pct: (100 * votos) / r.validos, votos };
  }
  function escalaPct(valores) {
    const mx = Math.max(5, ...valores.filter(v => v != null && isFinite(v)));
    const tope = T.ticks(0, mx, 5).slice(-1)[0];
    const n = T.col.seq.length, cortes = Array.from({ length: n - 1 }, (_, i) => (tope * (i + 1)) / n);
    return {
      color: v => (v == null ? T.col.vacio : T.col.seq[T.clase(v, cortes)]),
      leyenda: T.leyendaRampa('% de votos válidos', T.col.seq, ['0%', T.fmt.p(tope / 2, 0), T.fmt.p(tope, 0)])
    };
  }
  const etiquetaColor = () => (N.opsColor.find(o => o.v === st.color) || {}).t || '';

  /* ---------------- pintar ---------------- */
  function pintar() {
    const e = eleccion(), est = T.estado;
    const puestos = T.puestosAmbito();
    let r = null;
    if (e.nivel === 'dep') r = T.sumar(e, puestos);
    else if (est.mun) r = T.sumarMun(e, est.mun, puestos);
    const tiles = [];
    if (r) {
      const g = r.filas[0], s2 = r.filas[1], pb = sumaPacto(r);
      tiles.push({ l: 'Votos válidos', v: T.fmt.n(r.validos), d: `${T.fmt.n(r.total)} votos en urna · ${r.puestos} puestos` });
      tiles.push({ l: e.tipo === 'lista' ? 'Lista más votada' : 'Ganó', v: g ? g.n : '—', clase: 'acento',
        d: g ? `${T.fmt.p(g.pct)} · ${e.tipo === 'lista' ? T.fmt.n(g.votos) + ' votos' : g.p}` : '' });
      if (s2) tiles.push({ l: 'Ventaja sobre el segundo lugar', v: T.fmt.pts(g.pct - s2.pct), d: `${T.fmt.n(g.votos - s2.votos)} votos sobre ${s2.n}` });
      tiles.push({ l: 'Voto en blanco', v: T.fmt.p(r.pctBlanco), d: `${T.fmt.n(r.blanco)} votos` });
      tiles.push({ l: 'Pacto Histórico y aliados', v: T.fmt.p(r.validos ? (100 * pb) / r.validos : 0), d: `${T.fmt.n(pb)} votos · clasificación por partido` });
    } else {
      const ms = T.munisAmbito(), pm = porMuni(e), ganes = new Map();
      let validos = 0, total = 0, pb = 0;
      for (const m of ms) {
        const rm = pm.get(m.cod); if (!rm) continue;
        validos += rm.validos; total += rm.total; pb += sumaPacto(rm);
        const p = rm.filas[0] && rm.filas[0].p; if (p) ganes.set(p, (ganes.get(p) || 0) + 1);
      }
      const top = [...ganes.entries()].sort((a, b) => b[1] - a[1]);
      tiles.push({ l: 'Votos válidos', v: T.fmt.n(validos), d: `${T.fmt.n(total)} votos en urna · ${ms.length} municipios` });
      tiles.push({ l: e.tipo === 'lista' ? 'Partido más votado en más municipios' : 'Partido con más alcaldías', v: top[0] ? top[0][0] : '—', clase: 'acento', d: top[0] ? `${top[0][1]} de ${ms.length} municipios` : '' });
      if (top[1]) tiles.push({ l: 'Le sigue', v: top[1][0], d: `${top[1][1]} de ${ms.length} municipios` });
      tiles.push({ l: 'Pacto Histórico y aliados', v: T.fmt.p(validos ? (100 * pb) / validos : 0), d: `${T.fmt.n(pb)} votos · clasificación por partido` });
    }
    T.tiles(N.tiles, tiles);
    pintarMapa(e);
    pintarResultados(e, r);
    pintarTabla(e, puestos);
  }

  function pintarMapa(e) {
    const col = T.coloresEleccion(e), pm = porMuni(e), pp = porPuesto(e);
    N.mapaTit.textContent = st.vista === 'mun' ? 'Mapa por municipio' : 'Mapa por puesto de votación';
    N.mapaSub.textContent = `${e.nombre} · ${st.color === 'ganador' ? 'quién ganó' : etiquetaColor()}`;
    const unidades = st.vista === 'mun' ? T.D.el.munis.map(m => [m.cod, pm.get(m.cod)]) : T.puestosAmbito().map(p => [p.id, pp.get(p.id), p.m]);
    let colorDe, leyenda;
    if (st.color === 'ganador') {
      colorDe = (r) => { const md = medida(e, r); return md ? col.de(md.cat) : T.col.vacio; };
      leyenda = T.leyendaCategorias(e.nivel === 'dep' ? 'Ganó' : 'Partido del ganador (municipios)', [...col.lista, { t: 'Otros', color: T.col.otro }]);
    } else {
      const vals = unidades.map(([k, r, m]) => { const md = medida(e, r, m || k); return md ? md.pct : null; });
      const esc = escalaPct(vals);
      colorDe = (r, k) => { const md = medida(e, r, k); return md ? esc.color(md.pct) : T.col.vacio; };
      leyenda = esc.leyenda;
    }
    const tipMun = cod => {
      const r = pm.get(cod), m = T.muni[cod];
      if (!r) return [m.n, [{ v: 'Sin dato', l: '' }]];
      const filas = r.filas.slice(0, 3).map(f => ({ color: col.de(f), v: T.fmt.p(f.pct), l: f.n }));
      if (st.color !== 'ganador') { const md = medida(e, r, cod); if (md) filas.unshift({ v: T.fmt.p(md.pct), l: etiquetaColor() }); }
      filas.push({ v: T.fmt.n(r.validos), l: 'votos válidos' });
      return [`${m.n} · ${m.sub}`, filas];
    };
    if (st.vista === 'mun') {
      mapa.limpiarPuntos();
      mapa.pintar(cod => colorDe(pm.get(cod), cod), tipMun, 0.86);
      N.mapaNota.textContent = 'Clic en un municipio para abrirlo; otro clic lo cierra.';
    } else {
      mapa.pintar(() => T.col.vacio, tipMun, 0.4);
      const lista = T.puestosAmbito().filter(p => pp.get(p.id));
      const vmax = Math.max(1, ...lista.map(p => pp.get(p.id).validos));
      mapa.puntos(lista, {
        color: p => colorDe(pp.get(p.id), p.m),
        radio: p => 4 + 11 * Math.sqrt(pp.get(p.id).validos / vmax),
        tip: p => {
          const r = pp.get(p.id);
          const filas = r.filas.slice(0, 3).map(f => ({ color: col.de(f), v: T.fmt.p(f.pct), l: f.n }));
          if (st.color !== 'ganador') { const md = medida(e, r, p.m); if (md) filas.unshift({ v: T.fmt.p(md.pct), l: etiquetaColor() }); }
          filas.push({ v: T.fmt.n(r.validos), l: 'votos válidos' });
          return [`${p.n} · ${T.muni[p.m].n}`, filas];
        },
        alClic: p => T.fijar({ mun: p.m })
      });
      N.mapaNota.textContent = `El tamaño del círculo sigue a los votos válidos del puesto. ${lista.filter(p => p.lat == null).length ? 'Algunos puestos no tienen coordenadas y solo aparecen en la tabla.' : ''}`;
    }
    mapa.leyenda(leyenda);
  }

  function pintarResultados(e, r) {
    const amb = T.ambito(), col = T.coloresEleccion(e);
    N.cRes.replaceChildren();
    const caja = T.h('div', { style: { maxHeight: '640px', overflow: 'auto', paddingRight: '4px' } });
    if (r) {
      N.cRes.append(T.h('h3', { text: 'Resultados · ' + amb.nombre }), T.h('p', { class: 'sub', text: `${e.nombre} · ${T.fmt.n(r.validos)} votos válidos` }), caja);
      const filas = r.filas.slice(0, 12).map(c => ({
        nombre: c.n, detalle: e.tipo === 'lista' ? null : c.p, valor: c.pct, etiqueta: T.fmt.p(c.pct), sub: T.fmt.n(c.votos), color: col.de(c),
        chip: c.b === 'pacto' ? T.h('span', { class: 'chip bloque', text: 'Pacto y aliados' }) : null
      }));
      const resto = r.filas.slice(12);
      if (resto.length) {
        const v = resto.reduce((a, c) => a + c.votos, 0), pct = r.validos ? (100 * v) / r.validos : 0;
        filas.push({ nombre: `Otras ${resto.length} ${e.tipo === 'lista' ? 'listas' : 'candidaturas'}`, valor: pct, etiqueta: T.fmt.p(pct), sub: T.fmt.n(v), color: T.col.otro });
      }
      filas.push({ nombre: 'Voto en blanco', valor: r.pctBlanco, etiqueta: T.fmt.p(r.pctBlanco), sub: T.fmt.n(r.blanco), color: T.col.otro });
      T.barras(caja, filas);
      N.cRes.append(T.h('p', { class: 'nota', text: `Nulos: ${T.fmt.n(r.nulos)} · no marcados: ${T.fmt.n(r.nomarc)}. Fuente: ${e.fuente}. "Pacto y aliados" marca automáticamente, por nombre de partido, a Colombia Humana, Polo, Unión Patriótica, Pacto Histórico, Partido Comunista, ADA, MAIS y afines. En la sección 4 se ajusta para calcular la transferencia.` }));
      return;
    }
    const pm = porMuni(e);
    N.cRes.append(T.h('h3', { text: (e.tipo === 'lista' ? 'Concejos · ' : 'Alcaldías · ') + amb.nombre }),
      T.h('p', { class: 'sub', text: e.tipo === 'lista' ? 'Lista más votada en cada municipio. Clic para abrirlo.' : 'Ganador en cada municipio. Clic para abrirlo.' }), caja);
    const filas = T.munisAmbito().map(m => {
      const rm = pm.get(m.cod), g = rm && rm.filas[0], s2 = rm && rm.filas[1];
      return { cod: m.cod, nombre: m.n, detalle: g ? (e.tipo === 'lista' ? g.n : `${g.n} · ${g.p}`) : 'sin dato', valor: g ? g.pct : 0,
        etiqueta: g ? T.fmt.p(g.pct) : '—', sub: g && s2 ? 'ventaja ' + T.fmt.pts(g.pct - s2.pct) : '', color: g ? col.de(g) : T.col.otro };
    }).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    T.barras(caja, filas, { max: 100, alClic: f => T.fijar({ mun: f.cod }) });
    const ps = partidos(e, T.puestosAmbito()).slice(0, 10);
    const caja2 = T.h('div');
    N.cRes.append(T.h('h3', { text: 'Votos por partido (suma de los municipios)', style: { marginTop: '18px' } }), caja2);
    T.barras(caja2, ps.map(p => ({ nombre: p.p, detalle: `compitió en ${p.nMunis} ${p.nMunis === 1 ? 'municipio' : 'municipios'}`, valor: p.pct, etiqueta: T.fmt.p(p.pct), sub: T.fmt.n(p.votos), color: col.de(p) })));
    N.cRes.append(T.h('p', { class: 'nota', text: `Fuente: ${e.fuente}.` }));
  }

  function pintarTabla(e, puestos) {
    const amb = T.ambito(), pm = porMuni(e), pp = porPuesto(e);
    const top3 = e.nivel === 'dep' ? T.sumar(e, T.D.el.puestos).filas.slice(0, 3) : [];
    const base = r => {
      const g = r.filas[0], s2 = r.filas[1];
      const o = { validos: r.validos, gano: g ? g.n : '—', partido: g ? g.p : '', pctG: g ? g.pct : null, segundo: s2 ? s2.n : '—', pctS: s2 ? s2.pct : null,
        ventaja: g && s2 ? g.pct - s2.pct : null, pacto: r.validos ? (100 * sumaPacto(r)) / r.validos : null, blanco: r.pctBlanco };
      top3.forEach((c, i) => { const f = r.filas.find(x => x.k === c.k); o['c' + i] = f ? f.pct : 0; });
      return o;
    };
    const colsFinales = [
      { k: 'validos', t: 'Votos válidos', tipo: 'n' },
      { k: 'gano', t: e.tipo === 'lista' ? 'Lista más votada' : 'Ganó', tipo: 't', clase: 'largo' },
      ...(e.tipo === 'lista' || e.nivel === 'dep' ? [] : [{ k: 'partido', t: 'Partido', tipo: 't', clase: 'largo' }]),
      { k: 'pctG', t: '%', tipo: 'p' },
      { k: 'segundo', t: 'Segundo lugar', tipo: 't', clase: 'largo' },
      { k: 'pctS', t: '% segundo', tipo: 'p' },
      { k: 'ventaja', t: 'Ventaja', tipo: 'n', fmt: v => T.fmt.pts(v) },
      ...top3.map((c, i) => ({ k: 'c' + i, t: '% ' + c.n, tipo: 'p' })),
      { k: 'pacto', t: '% Pacto y aliados', tipo: 'p' },
      { k: 'blanco', t: '% en blanco', tipo: 'p' }
    ];
    N.cTabla.replaceChildren();
    const caja = T.h('div');
    if (st.vista === 'mun') {
      N.cTabla.append(T.h('h3', { text: 'Detalle por municipio' }), T.h('p', { class: 'sub', text: `${e.nombre} · ${amb.nombre}` }), caja);
      const filas = T.munisAmbito().filter(m => pm.get(m.cod)).map(m => ({ cod: m.cod, municipio: m.n, subregion: m.sub, ...base(pm.get(m.cod)) }));
      T.tabla(caja, {
        columnas: [{ k: 'municipio', t: 'Municipio', tipo: 't', clase: 'nombre' }, { k: 'subregion', t: 'Subregión', tipo: 't' }, ...colsFinales],
        filas, orden: 'validos', csv: `${e.id}_municipios_${amb.nombre}`, alClic: f => T.fijar({ mun: f.cod }), marcar: f => f.cod === T.estado.mun
      });
    } else {
      N.cTabla.append(T.h('h3', { text: 'Detalle por puesto de votación' }), T.h('p', { class: 'sub', text: `${e.nombre} · ${amb.nombre}` }), caja);
      const filas = puestos.filter(p => pp.get(p.id)).map(p => ({
        cod: p.m, municipio: T.muni[p.m].n, puesto: p.n, zona: p.z + (p.nr ? ' · especial' : ''), comuna: p.com || '', ...base(pp.get(p.id))
      }));
      T.tabla(caja, {
        columnas: [{ k: 'municipio', t: 'Municipio', tipo: 't', clase: 'nombre' }, { k: 'puesto', t: 'Puesto', tipo: 't', clase: 'largo' },
          { k: 'zona', t: 'Zona', tipo: 't' }, { k: 'comuna', t: 'Comuna', tipo: 't' }, ...colsFinales],
        filas, orden: 'validos', csv: `${e.id}_puestos_${amb.nombre}`, alClic: f => T.fijar({ mun: f.cod })
      });
      N.cTabla.append(T.h('p', { class: 'nota', text: 'Zona 90 o superior: puestos especiales (censo, cárceles). Allí vota gente que no vive en ese barrio o vereda.' }));
    }
  }
})();

/* Sección 4 · Transferencia del voto: cuánto del voto presidencial de izquierda llega a la elección local */
(function () {
  'use strict';
  const T = window.T;
  const S = (T.secciones.transferencia = {});
  const N = {};
  const CLAVE = 'sucre_bloque_v1';
  const LOCALES = [['gob2023', 'Gobernación 2023'], ['alc2023', 'Alcaldías 2023 (por partido)'], ['gob2019', 'Gobernación 2019'], ['alc2019', 'Alcaldías 2019 (por partido)']];
  const st = { base: 'p22v2', medida: 'convAlc', vista: 'mun', quien: 'gob2023', cand: null };
  let mapa, pintarAmbito, bloque;

  const E = id => T.D.el.elecciones.find(e => e.id === id);
  const pct = (a, b) => (b ? (100 * a) / b : null);
  const ok = v => v != null && typeof v === 'number' && isFinite(v);
  const claveDe = (e, c) => e.id + (e.nivel === 'dep' ? '|k|' + c.k : '|p|' + c.p);
  const izq = c => c.b === 'pacto';
  const enBloque = e => c => bloque.has(claveDe(e, c));
  const base26 = () => st.base === 'p26v2';
  const marcado = id => [...bloque].some(k => k.startsWith(id + '|'));
  const nombreBase = () => (base26() ? 'Cepeda 2026' : 'Petro 2022');

  /* ---------------- bloque ---------------- */
  function candidatosDe(e) {
    if (e._candBloque) return e._candBloque;
    if (e.nivel === 'dep') {
      return (e._candBloque = T.sumar(e, T.D.el.puestos).filas.map(c => ({ ...c, clave: claveDe(e, c), etiqueta: c.n, detalle: `${c.p} · ${T.fmt.n(c.votos)} votos` })));
    }
    const acc = new Map();
    for (const p of T.D.el.puestos) {
      const x = e.v[p.id], cands = e.cands[p.m];
      if (!x || !cands) continue;
      cands.forEach((c, i) => { const o = acc.get(c.p) || { p: c.p, b: c.b, votos: 0, munis: new Set() }; o.votos += x[i]; o.munis.add(p.m); acc.set(c.p, o); });
    }
    return (e._candBloque = [...acc.values()].sort((a, b) => b.votos - a.votos).map(o => ({
      ...o, clave: e.id + '|p|' + o.p, etiqueta: o.p, detalle: `${o.munis.size} ${o.munis.size === 1 ? 'municipio' : 'municipios'} · ${T.fmt.n(o.votos)} votos` })));
  }
  function porDefecto(conAlt) {
    const s = new Set();
    for (const [id] of LOCALES) for (const c of candidatosDe(E(id))) if (c.b === 'pacto' || (conAlt && c.b === 'alt')) s.add(c.clave);
    return s;
  }
  function cargar() {
    try { const x = JSON.parse(localStorage.getItem(CLAVE) || 'null'); if (Array.isArray(x)) return new Set(x); } catch (e) { /* sin almacenamiento local */ }
    return porDefecto(false);
  }
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify([...bloque])); } catch (e) { /* sin almacenamiento local */ } }

  /* ---------------- métricas ---------------- */
  function metricas(puestos) {
    const p22 = E('p22v2'), p26 = E('p26v2'), g23 = E('gob2023'), a23 = E('alc2023'), g19 = E('gob2019'), a19 = E('alc2019');
    const o = {
      petro: T.votosDe(p22, puestos, izq), val22: T.validosDe(p22, puestos),
      cep: T.votosDe(p26, puestos, izq), val26: T.validosDe(p26, puestos),
      gob: T.votosDe(g23, puestos, enBloque(g23)), valGob: T.validosDe(g23, puestos),
      alc: T.votosDe(a23, puestos, enBloque(a23)), valAlc: T.validosDe(a23, puestos),
      gob19: T.votosDe(g19, puestos, enBloque(g19)), valGob19: T.validosDe(g19, puestos),
      alc19: T.votosDe(a19, puestos, enBloque(a19)), valAlc19: T.validosDe(a19, puestos)
    };
    o.pctPetro = pct(o.petro, o.val22); o.pctCep = pct(o.cep, o.val26);
    o.cambio = ok(o.pctPetro) && ok(o.pctCep) ? o.pctCep - o.pctPetro : null;
    o.ref = base26() ? o.cep : o.petro;
    o.convGob = pct(o.gob, o.ref); o.convAlc = pct(o.alc, o.ref);
    o.noRec = o.ref - o.alc;
    o.partic = pct(o.valAlc, o.val22);
    o.pctGob = pct(o.gob, o.valGob); o.pctAlc = pct(o.alc, o.valAlc);
    o.pctGob19 = pct(o.gob19, o.valGob19); o.pctAlc19 = pct(o.alc19, o.valAlc19);
    return o;
  }
  const puestosDe = cod => T.D.el.puestos.filter(p => p.m === cod);

  /* ---------------- estructura ---------------- */
  S.iniciar = function (cont) {
    bloque = cargar();
    pintarAmbito = T.cabecera(cont, 'Transferencia del voto',
      'Cuánto del voto presidencial de izquierda se vuelve voto local. La conversión es el voto del bloque en la elección local dividido por el voto de Petro en la segunda vuelta de 2022, o de Cepeda en la de 2026. Es el mismo cálculo de los informes de Bogotá, Cali, Popayán y Pereira. El bloque se ajusta al final de la página.');
    N.filtros = T.h('div', { class: 'filtros' });
    N.tiles = T.h('div');
    N.resumen = T.h('div', { class: 'aviso' });
    N.cMapa = T.h('div', { class: 'tarjeta' });
    N.cComp = T.h('div', { class: 'tarjeta' });
    N.cQuien = T.h('div', { class: 'tarjeta', style: { marginBottom: '14px' } });
    N.cTabla = T.h('div', { class: 'tarjeta', style: { marginBottom: '14px' } });
    N.cBloque = T.h('div', { class: 'tarjeta' });
    cont.append(N.filtros, N.tiles, N.resumen, T.h('div', { class: 'grilla g-mapa' }, N.cMapa, N.cComp), N.cQuien, N.cTabla, N.cBloque);
    N.mapaSub = T.h('p', { class: 'sub' });
    N.cMapa.append(T.h('h3', { text: 'Mapa de la transferencia' }), N.mapaSub);
    mapa = T.mapaSucre(N.cMapa);
    N.mapaNota = T.h('p', { class: 'nota' });
    N.cMapa.append(N.mapaNota);
  };
  S.mostrar = () => mapa && mapa.refrescar();
  S.actualizar = function () { pintarAmbito(); pintar(); mapa.enfocar(); };

  function pintar() { filtros(); pintarDatos(); pintarBloque(); }
  function pintarDatos() {
    const puestos = T.puestosAmbito(), o = metricas(puestos);
    T.tiles(N.tiles, [
      { l: 'Petro · 2ª vuelta 2022', v: T.fmt.n(o.petro), d: `${T.fmt.p(o.pctPetro)} de los votos válidos` },
      { l: 'Cepeda · 2ª vuelta 2026', v: T.fmt.n(o.cep), d: `${T.fmt.p(o.pctCep)} · ${T.fmt.pts(o.cambio)} frente a Petro` },
      { l: 'Bloque en la Gobernación 2023', v: T.fmt.n(o.gob), d: `conversión de ${T.fmt.p(o.convGob)} frente a ${nombreBase()}`, clase: 'acento' },
      { l: 'Bloque en las alcaldías 2023', v: T.fmt.n(o.alc), d: `conversión de ${T.fmt.p(o.convAlc)} frente a ${nombreBase()}`, clase: 'acento' },
      { l: 'Voto sin recoger en las alcaldías', v: T.fmt.n(o.noRec), d: `votos de ${nombreBase()} que el bloque no sumó` },
      { l: 'Votos locales por cada 100 presidenciales', v: T.fmt.n(o.partic), d: 'válidos en alcaldías 2023 frente a la 2ª vuelta de 2022' }
    ]);
    N.resumen.replaceChildren(T.h('span', { text: resumenTexto(o) }));
    pintarMapa(); pintarComparacion(o); pintarQuien(puestos); pintarTabla();
  }
  function resumenTexto(o) {
    const lugar = T.I.enAmbito();
    const refs = T.D.ref.map(r => `${r.ciudad} ${T.fmt.p(base26() ? r.conv_2026 : r.conv_2022)}`);
    const presi = base26() ? `Cepeda sacó ${T.fmt.n(o.cep)} votos en la segunda vuelta de 2026` : `Petro sacó ${T.fmt.n(o.petro)} votos en la segunda vuelta de 2022`;
    return `En ${lugar}, ${presi}. En las alcaldías de 2023 el bloque sumó ${T.fmt.n(o.alc)} votos: una conversión de ${T.fmt.p(o.convAlc)}. En la Gobernación sumó ${T.fmt.n(o.gob)}, una conversión de ${T.fmt.p(o.convGob)}. En los informes anteriores, la conversión en la alcaldía fue de ${T.I.lista(refs)}.`;
  }

  function filtros() {
    N.filtros.replaceChildren(
      T.segmentos([{ v: 'p22v2', t: 'Frente a Petro 2022' }, { v: 'p26v2', t: 'Frente a Cepeda 2026' }], st.base, v => { st.base = v; pintarDatos(); }, 'Base presidencial'),
      T.selector([
        { v: 'convAlc', t: 'Conversión en alcaldías 2023' }, { v: 'convGob', t: 'Conversión en la Gobernación 2023' },
        { v: 'noRec', t: 'Voto presidencial sin recoger (alcaldías)' }, { v: 'pctRef', t: '% del candidato presidencial' },
        { v: 'cambio', t: 'Cambio de Petro 2022 a Cepeda 2026' }], st.medida, v => { st.medida = v; pintarMapa(); }, 'Colorear el mapa por'),
      T.segmentos([{ v: 'mun', t: 'Municipios' }, { v: 'puesto', t: 'Puestos' }], st.vista, v => { st.vista = v; pintarMapa(); }, 'Unidad del mapa'));
  }

  /* ---------------- mapa ---------------- */
  function valorMedida(o) {
    switch (st.medida) {
      case 'convAlc': return o.convAlc;
      case 'convGob': return o.convGob;
      case 'noRec': return o.ref ? o.noRec : null;
      case 'pctRef': return base26() ? o.pctCep : o.pctPetro;
      case 'cambio': return o.cambio;
      default: return null;
    }
  }
  const NOMBRE_MEDIDA = { convAlc: 'Conversión en alcaldías 2023', convGob: 'Conversión en la Gobernación 2023', noRec: 'Voto sin recoger en alcaldías', pctRef: '% del candidato presidencial', cambio: 'Cambio de Petro 2022 a Cepeda 2026' };
  const fmtMedida = v => (st.medida === 'noRec' ? T.fmt.n(v) : st.medida === 'cambio' ? T.fmt.pts(v) : T.fmt.p(v));
  function pintarMapa() {
    const mun = new Map(T.D.el.munis.map(m => [m.cod, metricas(puestosDe(m.cod))]));
    const unidades = st.vista === 'mun'
      ? T.D.el.munis.map(m => ({ k: m.cod, o: mun.get(m.cod) }))
      : T.puestosAmbito().map(p => ({ k: p.id, p, o: metricas([p]) })).filter(u => u.o.val22 > 0 && u.o.valAlc > 0);
    const vals = unidades.map(u => valorMedida(u.o)).filter(ok);
    let color, leyenda;
    if (st.medida === 'cambio') {
      const cortes = [-5, -2, 2, 5], pal = [T.col.div[4], T.col.div[3], T.col.div[2], T.col.div[1], T.col.div[0]];
      color = v => (ok(v) ? pal[T.clase(v, cortes)] : T.col.vacio);
      leyenda = T.leyendaCategorias('Cambio en puntos', [
        { t: 'Subió 5 o más', color: pal[4] }, { t: 'Subió entre 2 y 5', color: pal[3] }, { t: 'Entre −2 y +2', color: pal[2] },
        { t: 'Bajó entre 2 y 5', color: pal[1] }, { t: 'Bajó 5 o más', color: pal[0] }]);
    } else if (st.medida === 'noRec') {
      const cortes = T.cuantiles(vals, 7);
      color = v => (ok(v) ? T.col.seq[T.clase(v, cortes)] : T.col.vacio);
      leyenda = T.leyendaRampa('Votos sin recoger (septiles)', T.col.seq, [T.fmt.compacto(Math.min(...vals)), T.fmt.compacto(Math.max(...vals))]);
    } else {
      const tope = T.ticks(0, Math.max(10, ...vals), 5).slice(-1)[0], n = T.col.seq.length;
      const cortes = Array.from({ length: n - 1 }, (_, i) => (tope * (i + 1)) / n);
      color = v => (ok(v) ? T.col.seq[T.clase(v, cortes)] : T.col.vacio);
      leyenda = T.leyendaRampa(NOMBRE_MEDIDA[st.medida], T.col.seq, ['0%', T.fmt.p(tope / 2, 0), T.fmt.p(tope, 0)]);
    }
    const filasTip = o => [
      { v: fmtMedida(valorMedida(o)), l: NOMBRE_MEDIDA[st.medida] },
      { v: T.fmt.n(o.ref), l: nombreBase() },
      { v: T.fmt.n(o.alc), l: 'bloque en alcaldías 2023' },
      { v: T.fmt.n(o.gob), l: 'bloque en la Gobernación 2023' }];
    N.mapaSub.textContent = `${NOMBRE_MEDIDA[st.medida]} · base ${nombreBase()}`;
    if (st.vista === 'mun') {
      mapa.limpiarPuntos();
      mapa.pintar(cod => color(valorMedida(mun.get(cod))), cod => [`${T.muni[cod].n} · ${T.muni[cod].sub}`, filasTip(mun.get(cod))], 0.88);
      N.mapaNota.textContent = 'Clic en un municipio para abrirlo.';
    } else {
      mapa.pintar(() => T.col.vacio, cod => [T.muni[cod].n, filasTip(mun.get(cod))], 0.4);
      const vmax = Math.max(1, ...unidades.map(u => u.o.val22));
      mapa.puntos(unidades.map(u => u.p), {
        color: p => color(valorMedida(unidades.find(u => u.k === p.id).o)),
        radio: p => 4 + 11 * Math.sqrt(unidades.find(u => u.k === p.id).o.val22 / vmax),
        tip: p => [`${p.n} · ${T.muni[p.m].n}`, filasTip(unidades.find(u => u.k === p.id).o)],
        alClic: p => T.fijar({ mun: p.m })
      });
      N.mapaNota.textContent = 'Cada círculo es un puesto; su tamaño sigue a los votos válidos de 2022. En un solo puesto la conversión es ruidosa: sirve para ubicar zonas, no para leer decimales.';
    }
    mapa.leyenda(leyenda);
  }

  /* ---------------- referentes ---------------- */
  function pintarComparacion(o) {
    const amb = T.ambito();
    const nombre = amb.tipo === 'dep' ? 'Sucre' : amb.tipo === 'sub' ? T.estado.sub : amb.nombre;
    N.cComp.replaceChildren(T.h('h3', { text: '¿Cuánto se transfiere en otras ciudades?' }),
      T.h('p', { class: 'sub', text: `Conversión frente a ${nombreBase()}` }));
    const filas = [
      { nombre: `${nombre} · ${amb.tipo === 'mun' ? 'alcaldía' : 'alcaldías'} 2023`, detalle: 'bloque marcado en esta página', valor: o.convAlc, color: T.col.bloque },
      { nombre: `${nombre} · Gobernación 2023`, detalle: 'bloque marcado en esta página', valor: o.convGob, color: T.col.bloque },
      ...T.D.ref.map(r => ({ nombre: `${r.ciudad} · alcaldía 2023`, detalle: r.candidatura, valor: base26() ? r.conv_2026 : r.conv_2022, color: '#C9D3DA' }))
    ].map(f => ({ ...f, etiqueta: T.fmt.p(f.valor) })).sort((a, b) => (b.valor ?? -1) - (a.valor ?? -1));
    const caja = T.h('div'); N.cComp.append(caja);
    T.barras(caja, filas, { max: Math.max(35, ...filas.map(f => f.valor || 0)) });
    N.cComp.append(T.h('p', { class: 'nota', text: 'Referentes: voto de la izquierda en la Alcaldía de 2023 sobre el voto presidencial de toda la ciudad, tomado de los informes de Bogotá, Cali, Popayán y Pereira. En Popayán el voto de Diago sale de los puestos cruzados con el mapa (34.921 votos). En azul, el territorio elegido.' }));
    if (o.valGob19 || o.valAlc19) {
      const t = T.h('div', { style: { marginTop: '6px' } });
      N.cComp.append(T.h('h3', { text: 'El bloque local de 2019 a 2023', style: { marginTop: '20px' } }), t);
      T.tabla(t, {
        columnas: [{ k: 'eleccion', t: 'Elección', tipo: 't' }, { k: 'v19', t: 'Votos 2019', tipo: 'n' }, { k: 'p19', t: '% 2019', tipo: 'p' }, { k: 'v23', t: 'Votos 2023', tipo: 'n' }, { k: 'p23', t: '% 2023', tipo: 'p' }],
        filas: [
          { eleccion: 'Gobernación', v19: marcado('gob2019') ? o.gob19 : null, p19: marcado('gob2019') ? o.pctGob19 : null, v23: marcado('gob2023') ? o.gob : null, p23: marcado('gob2023') ? o.pctGob : null },
          { eleccion: 'Alcaldías', v19: marcado('alc2019') ? o.alc19 : null, p19: marcado('alc2019') ? o.pctAlc19 : null, v23: marcado('alc2023') ? o.alc : null, p23: marcado('alc2023') ? o.pctAlc : null }],
        orden: 'eleccion', desc: false, buscar: false
      });
      N.cComp.append(T.h('p', { class: 'nota', text: 'Porcentaje sobre los votos válidos de cada elección local, con el bloque marcado abajo para cada año. Un guion indica que esa elección no tiene candidaturas marcadas.' }));
    }
  }

  /* ---------------- quién se quedó con el voto petrista ---------------- */
  function corr(pares) {
    if (pares.length < 5) return null;
    let sw = 0, mx = 0, my = 0;
    for (const [x, y, w] of pares) { sw += w; mx += w * x; my += w * y; }
    if (!sw) return null;
    mx /= sw; my /= sw;
    let sxy = 0, sxx = 0, syy = 0;
    for (const [x, y, w] of pares) { const dx = x - mx, dy = y - my; sxy += w * dx * dy; sxx += w * dx * dx; syy += w * dy * dy; }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
  }
  function pintarQuien(puestos) {
    const e = E(st.quien), pres = E(st.base);
    N.cQuien.replaceChildren(T.h('h3', { text: '¿Quién se quedó con el voto petrista?' }),
      T.h('p', { class: 'sub', text: `Cada punto es un puesto de votación de ${T.I.enAmbito()}: a la derecha, más voto por ${nombreBase()}; arriba, más voto por la candidatura local elegida.` }));
    const ctr = T.h('div', { class: 'filtros' });
    N.cQuien.append(ctr);
    const U = [];
    for (const p of puestos) {
      const rP = T.resumenPuesto(pres, p), rL = T.resumenPuesto(e, p);
      if (!rP || !rL || !rP.validos || !rL.validos) continue;
      U.push({ p, x: (100 * T.votosDe(pres, [p], izq)) / rP.validos, rL, w: rL.validos });
    }
    ctr.append(T.selector(LOCALES.filter(([id]) => id.endsWith('2023')).map(([id, t]) => ({ v: id, t: t.replace(' (por partido)', '') })), st.quien, v => { st.quien = v; st.cand = null; pintarQuien(T.puestosAmbito()); }, 'Elección local'));
    if (U.length < 6) { N.cQuien.append(T.h('p', { class: 'nota', text: 'Hay muy pocos puestos con dato en este territorio para esta lectura.' })); return; }
    const orden = U.map(u => u.x).sort((a, b) => b - a), corte = orden[Math.floor(orden.length / 3)];
    const porPartido = e.nivel === 'mun' && !T.estado.mun;
    const grupos = new Map();
    let valTop = 0, valTot = 0;
    for (const u of U) {
      const top = u.x >= corte;
      valTot += u.w; if (top) valTop += u.w;
      const agg = new Map();
      for (const c of u.rL.filas) {
        const k = porPartido ? c.p : c.k;
        const a = agg.get(k) || { etiqueta: porPartido ? c.p : c.n, partido: porPartido ? '' : c.p, c, votos: 0 };
        a.votos += c.votos; agg.set(k, a);
      }
      for (const [k, a] of agg) {
        const g = grupos.get(k) || { k, etiqueta: a.etiqueta, partido: a.partido, c: a.c, votos: 0, votosTop: 0, pares: [] };
        g.votos += a.votos; if (top) g.votosTop += a.votos;
        g.pares.push([u.x, (100 * a.votos) / u.w, u.w, u]);
        grupos.set(k, g);
      }
    }
    const filas = [...grupos.values()].filter(g => g.votos > 0).map(g => ({
      ...g, pct: (100 * g.votos) / valTot, pctTop: valTop ? (100 * g.votosTop) / valTop : null, r: corr(g.pares), bloque: bloque.has(claveDe(e, g.c)) ? 'Sí' : 'No'
    })).sort((a, b) => b.votosTop - a.votosTop);
    if (!filas.some(f => f.k === st.cand)) st.cand = filas[0].k;
    const sel = filas.find(f => f.k === st.cand);
    const pctBloqueTop = filas.filter(f => f.bloque === 'Sí').reduce((s, f) => s + f.votosTop, 0);
    ctr.append(T.selector(filas.slice(0, 25).map(f => ({ v: f.k, t: f.etiqueta })), st.cand, v => { st.cand = v; pintarQuien(T.puestosAmbito()); }, porPartido ? 'Partido en el gráfico' : 'Candidatura en el gráfico'));
    const nombreLocal = { gob2023: 'la Gobernación de 2023', alc2023: 'las alcaldías de 2023' }[e.id] || e.nombre;
    N.cQuien.append(T.h('p', { class: 'aviso', text:
      `En el tercio de puestos más petristas (${nombreBase()} con ${T.fmt.p(corte, 0)} o más), ${filas[0].etiqueta} sacó el ${T.fmt.p(filas[0].pctTop)} de los votos válidos de ${nombreLocal}. El bloque marcado sumó allí el ${T.fmt.p(valTop ? (100 * pctBloqueTop) / valTop : null)}.` }));
    // el mismo color que la candidatura tiene en la sección de elecciones; el bloque en azul
    const colElec = porPartido ? T.col.otro : T.coloresEleccion(e).de(sel.c);
    const colorSel = sel.bloque === 'Sí' ? T.col.bloque : colElec === T.col.otro ? '#4B5963' : colElec;
    const grid = T.h('div', { class: 'grilla g-2', style: { marginBottom: '0' } });
    const gSc = T.h('div'), gTb = T.h('div');
    grid.append(gSc, gTb);
    N.cQuien.append(grid);
    T.dispersion(gSc, {
      puntos: sel.pares.map(([x, y, w, u]) => ({
        x, y, r: 3 + 9 * Math.sqrt(w / Math.max(...sel.pares.map(q => q[2]))), color: colorSel,
        titulo: `${u.p.n} · ${T.muni[u.p.m].n}`, filas: [{ v: T.fmt.p(x), l: nombreBase() }, { v: T.fmt.p(y), l: sel.etiqueta }, { v: T.fmt.n(w), l: 'votos válidos locales' }]
      })),
      xlab: `% ${nombreBase()} en el puesto`, ylab: `% ${sel.etiqueta.length > 28 ? sel.etiqueta.slice(0, 26) + '…' : sel.etiqueta}`, xmax: 100, alto: 320,
      alClic: pt => { const u = sel.pares.find(q => `${q[3].p.n} · ${T.muni[q[3].p.m].n}` === pt.titulo); if (u) T.fijar({ mun: u[3].p.m }); },
      nota: `Correlación ponderada por votos: ${T.fmt.dec2(sel.r)} (de −1 a 1). Positiva: le va mejor donde el candidato presidencial es fuerte.`
    });
    T.tabla(gTb, {
      columnas: [
        { k: 'etiqueta', t: porPartido ? 'Partido' : 'Candidatura', tipo: 't', clase: 'largo' },
        ...(porPartido ? [] : [{ k: 'partido', t: 'Partido', tipo: 't' }]),
        { k: 'bloque', t: 'Bloque', tipo: 't' }, { k: 'votos', t: 'Votos', tipo: 'n' }, { k: 'pct', t: '% total', tipo: 'p' },
        { k: 'pctTop', t: '% tercio petrista', tipo: 'p' }, { k: 'r', t: 'Correlación', tipo: 'n', fmt: v => T.fmt.dec2(v) }
      ],
      filas, orden: 'pctTop', buscar: false, alto: '320px', csv: `quien_${e.id}`,
      alClic: f => { st.cand = f.k; pintarQuien(T.puestosAmbito()); }, marcar: f => f.k === st.cand
    });
  }

  /* ---------------- tabla por municipio ---------------- */
  function pintarTabla() {
    const a23 = E('alc2023');
    const filas = T.munisAmbito().map(m => {
      const ps = puestosDe(m.cod), o = metricas(ps), ra = T.sumarMun(a23, m.cod, ps), g = ra && ra.filas[0];
      return { cod: m.cod, municipio: m.n, subregion: m.sub, petro: o.petro, pctPetro: o.pctPetro, cep: o.cep, pctCep: o.pctCep, cambio: o.cambio,
        gob: o.gob, convGob: o.convGob, alc: o.alc, convAlc: o.convAlc, noRec: o.noRec, partic: o.partic, pctAlc19: o.pctAlc19, pctAlc: o.pctAlc,
        ganador: g ? `${g.n} (${g.p})` : '—' };
    });
    N.cTabla.replaceChildren(T.h('h3', { text: 'Transferencia por municipio' }),
      T.h('p', { class: 'sub', text: `Conversión frente a ${nombreBase()}. Clic en una fila para abrir el municipio.` }));
    const caja = T.h('div'); N.cTabla.append(caja);
    T.tabla(caja, {
      columnas: [
        { k: 'municipio', t: 'Municipio', tipo: 't', clase: 'nombre' }, { k: 'subregion', t: 'Subregión', tipo: 't' },
        { k: 'petro', t: 'Petro 2022', tipo: 'n' }, { k: 'pctPetro', t: '% Petro', tipo: 'p' },
        { k: 'cep', t: 'Cepeda 2026', tipo: 'n' }, { k: 'pctCep', t: '% Cepeda', tipo: 'p' },
        { k: 'cambio', t: 'Cambio', tipo: 'n', fmt: v => T.fmt.pts(v) },
        { k: 'gob', t: 'Bloque Gobernación', tipo: 'n' }, { k: 'convGob', t: 'Conversión Gobernación', tipo: 'p' },
        { k: 'alc', t: 'Bloque alcaldía', tipo: 'n' }, { k: 'convAlc', t: 'Conversión alcaldía', tipo: 'p' },
        { k: 'noRec', t: 'Sin recoger', tipo: 'n' }, { k: 'partic', t: 'Locales por 100 presidenciales', tipo: 'n' },
        { k: 'pctAlc19', t: '% bloque alcaldía 2019', tipo: 'p' }, { k: 'pctAlc', t: '% bloque alcaldía 2023', tipo: 'p' },
        { k: 'ganador', t: 'Ganó la alcaldía 2023', tipo: 't', clase: 'largo' }
      ],
      filas, orden: 'noRec', csv: 'transferencia_municipios', alClic: f => T.fijar({ mun: f.cod }), marcar: f => f.cod === T.estado.mun
    });
  }

  /* ---------------- editor del bloque ---------------- */
  function pintarBloque() {
    N.cBloque.replaceChildren(T.h('h3', { text: 'Qué cuenta como bloque' }),
      T.h('p', { class: 'sub', text: 'Marque las candidaturas y los partidos que suman al bloque. La selección queda guardada en este navegador y recalcula toda la página.' }));
    const acciones = T.h('div', { class: 'filtros' });
    const boton = (t, fn) => { const b = T.h('button', { type: 'button', class: 'btn-sec', text: t }); b.addEventListener('click', fn); return b; };
    acciones.append(
      boton('Clasificación automática', () => { bloque = porDefecto(false); guardar(); pintar(); }),
      boton('Sumar Alianza Verde, Verde Oxígeno y Dignidad', () => { for (const c of porDefecto(true)) bloque.add(c); guardar(); pintar(); }),
      boton('Desmarcar todo', () => { bloque = new Set(); guardar(); pintar(); }));
    N.cBloque.append(acciones, T.h('p', { class: 'aviso', text:
      'La clasificación automática marca Colombia Humana, Polo Democrático, Unión Patriótica, Pacto Histórico, Partido Comunista, ADA y MAIS. Las coaliciones con nombre propio, como "Mujer de Resultados" o "Convergencia Alternativa por Sucre", no dicen qué partidos las forman: márquelas a mano si corresponde.' }));
    const grid = T.h('div', { class: 'bloques' });
    for (const [id, nombre] of LOCALES) {
      const fs = T.h('fieldset', null, T.h('legend', { text: nombre }));
      for (const c of candidatosDe(E(id))) {
        const chk = T.h('input', { type: 'checkbox' });
        chk.checked = bloque.has(c.clave);
        chk.addEventListener('change', () => { if (chk.checked) bloque.add(c.clave); else bloque.delete(c.clave); guardar(); pintarDatos(); });
        fs.append(T.h('label', null, chk, T.h('span', null, c.etiqueta, T.h('small', { text: c.detalle }))));
      }
      grid.append(fs);
    }
    N.cBloque.append(grid);
  }
})();

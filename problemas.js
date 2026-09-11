/* Sección 2 · Problemas: salud, seguridad, economía y educación por municipio frente al país */
(function () {
  'use strict';
  const T = window.T;
  const S = (T.secciones.problemas = {});
  const st = { tab: 'salud', ind: { salud: 's_mi1', seguridad: 'g_hom', economia: 'e_ipm', educacion: 'd_media' }, buscar: '' };
  const N = {};
  let mapa, pintarAmbito;
  const COL_TERR = '#6A1B9A', COL_SUCRE = '#1baf7a', COL_PAIS = '#8A8492';
  const TABS = [{ v: 'salud', t: 'Salud' }, { v: 'seguridad', t: 'Seguridad' }, { v: 'economia', t: 'Economía' }, { v: 'educacion', t: 'Educación y servicios' }];
  const ok = v => v != null && typeof v === 'number' && isFinite(v);
  const indActual = () => T.D.ind.ind.find(x => x.id === st.ind[st.tab]) || T.D.ind.dep.find(x => x.id === st.ind[st.tab]);
  const direccion = ind => (ind.dir === 1 ? 'más alto es mejor' : ind.dir === -1 ? 'más alto es peor' : 'indicador de contexto');

  S.iniciar = function (cont) {
    pintarAmbito = T.cabecera(cont, 'Problemas',
      'Indicadores oficiales por municipio en cuatro temas. Para cada uno aparece el valor del territorio, el del país, la mediana de los municipios del Caribe y la posición frente a los 1.102 municipios de Colombia. El color del mapa resume esa posición.');
    N.tabs = T.h('div', { class: 'filtros' });
    N.rail = T.h('div', { class: 'rail' });
    N.vMun = T.h('div'); N.vDep = T.h('div');
    cont.append(N.tabs, T.h('div', { class: 'grilla g-rail' }, T.h('div', { class: 'tarjeta' }, N.rail), T.h('div', { style: { minWidth: 0 } }, N.vMun, N.vDep)));
    N.cab = T.h('div', { class: 'tarjeta ind-cab', style: { marginBottom: '14px' } });
    N.tiles = T.h('div');
    N.cMapa = T.h('div', { class: 'tarjeta' });
    N.cSerie = T.h('div', { class: 'tarjeta' });
    N.cDist = T.h('div', { class: 'tarjeta' });
    N.cTabla = T.h('div', { class: 'tarjeta' });
    N.vMun.append(N.cab, N.tiles,
      T.h('div', { class: 'grilla g-2' }, N.cMapa, T.h('div', { class: 'grilla', style: { marginBottom: '0', alignContent: 'start' } }, N.cSerie, N.cDist)),
      N.cTabla);
    N.mapaSub = T.h('p', { class: 'sub' });
    N.cMapa.append(T.h('h3', { text: 'Municipios de Sucre' }), N.mapaSub);
    mapa = T.mapaSucre(N.cMapa);
    N.mapaNota = T.h('p', { class: 'nota' });
    N.cMapa.append(N.mapaNota);
  };
  S.mostrar = () => { if (mapa && !N.vMun.hidden) mapa.refrescar(); };
  S.actualizar = function () {
    pintarAmbito();
    N.tabs.replaceChildren(T.segmentos(TABS, st.tab, v => { st.tab = v; st.buscar = ''; pintarRail(); pintar(); }, 'Tema'));
    pintarRail(); pintar();
    if (!N.vMun.hidden) mapa.enfocar();
  };
  // abrir un indicador desde otra sección
  S.irA = function (id) {
    const ind = T.D.ind.ind.find(x => x.id === id) || T.D.ind.dep.find(x => x.id === id);
    if (!ind) return;
    const tab = ind.tab === 'dep' ? 'economia' : ind.tab;
    st.tab = tab; st.ind[tab] = id; st.buscar = '';
    S._sucio = true;
    const q = T.estado.mun ? '?mun=' + T.estado.mun : T.estado.sub ? '?sub=' + encodeURIComponent(T.estado.sub) : '';
    location.hash = '#problemas' + q;
  };

  /* ---------------- lista de indicadores ---------------- */
  function chipDe(estado) {
    const m = { peor: ['chip peor', 'Peor'], mejor: ['chip mejor', 'Mejor'], similar: ['chip', 'Similar'], contexto: ['chip', 'Contexto'] }[estado] || ['chip', 'Sin dato'];
    return T.h('span', { class: m[0], text: m[1] });
  }
  function estadoDep(ind) {
    const r = T.I.rangoDep(ind);
    return r.pct == null ? null : r.pct >= 60 ? 'peor' : r.pct <= 40 ? 'mejor' : 'similar';
  }
  function pintarRail() {
    const I = T.I;
    const inp = T.h('input', { type: 'search', placeholder: 'Buscar indicador…', 'aria-label': 'Buscar indicador' });
    inp.value = st.buscar;
    const cont = T.h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } });
    const item = (ind, esDep) => {
      const b = T.h('button', { type: 'button', class: 'rail-i' + (st.ind[st.tab] === ind.id ? ' on' : '') },
        T.h('span', { class: 'n', text: ind.n }), T.h('span', { class: 'd', text: `${ind.y} · ${ind.u}` }),
        chipDe(esDep ? estadoDep(ind) : I.estado(ind)));
      b.addEventListener('click', () => { st.ind[st.tab] = ind.id; pintarRail(); pintar(); if (!N.vMun.hidden) mapa.refrescar(); });
      return b;
    };
    const filtrar = arr => (st.buscar ? arr.filter(x => T.norm(x.n).includes(T.norm(st.buscar))) : arr);
    const llenar = () => {
      cont.replaceChildren(...filtrar(I.porTab(st.tab)).map(x => item(x, false)));
      if (st.tab === 'economia') {
        const deps = filtrar(T.D.ind.dep);
        if (deps.length) cont.append(T.h('div', { class: 'rail-grupo', text: 'Solo departamento y capitales' }), ...deps.map(x => item(x, true)));
      }
    };
    inp.addEventListener('input', () => { st.buscar = inp.value; llenar(); });
    llenar();
    const ref = T.ambito().tipo === 'dep' ? 'frente a los demás departamentos' : 'frente a los municipios del país';
    N.rail.replaceChildren(inp, T.h('p', { class: 'nota', style: { margin: '0 4px 6px' }, text: `La etiqueta resume la situación de ${I.enAmbito()} ${ref}.` }), cont);
  }

  function pintar() {
    const ind = indActual();
    if (!ind) return;
    const esDep = ind.tab === 'dep';
    N.vMun.hidden = esDep; N.vDep.hidden = !esDep;
    if (esDep) pintarDep(ind); else pintarMun(ind);
  }

  /* ---------------- indicador municipal ---------------- */
  function pintarMun(ind) {
    const I = T.I, est = T.estado, amb = T.ambito(), j = I.ultimo(ind), y = ind.anios[j];
    const v = I.valor(ind), pais = I.pais(ind), car = I.medianaCaribe(ind);
    N.cab.replaceChildren(T.h('h3', { text: ind.n }),
      T.h('p', { class: 'meta', text: `${ind.u} · ${y} · ${direccion(ind)} · Fuente: ${ind.f || 'TerriData'}` }),
      ind.nota ? T.h('p', { class: 'nota', style: { margin: 0 }, text: ind.nota }) : null);

    const tiles = [{ l: amb.nombre, v: T.fmt.v(v), d: ind.u + (amb.tipo === 'sub' ? ' · ponderado por población' : amb.tipo === 'dep' && !ind.depOficial ? ' · estimado con sus municipios' : ''), clase: 'acento' }];
    tiles.push({ l: 'Colombia', v: T.fmt.v(pais), d: ind.agg === 'suma' ? 'total nacional' : ind.colOficial ? `dato nacional de ${y}` : 'estimado con los municipios' });
    const b = I.brecha(ind, v);
    if (b != null) tiles.push({ l: 'Frente al país', v: T.fmt.rel(b), d: b > 0.05 ? 'situación más desfavorable' : b < -0.05 ? 'situación más favorable' : 'igual al país' });
    if (ind.dir !== 0) {
      if (amb.tipo === 'dep') {
        const r = I.rangoDep(ind);
        if (r.pos) tiles.push({ l: 'Puesto entre departamentos', v: `${r.pos} de ${r.n}`, d: '1 = peor situación' + (ind.depOficial ? '' : ' · estimado') });
      } else {
        const p = I.posicion(ind, v);
        if (p) tiles.push({ l: amb.tipo === 'sub' ? 'Un municipio con ese valor estaría' : 'Frente a los municipios del país',
          v: p.peorQue >= p.mejorQue ? `Peor que el ${Math.round(p.peorQue)}%` : `Mejor que el ${Math.round(p.mejorQue)}%`, d: 'de los 1.102 municipios' });
      }
    }
    tiles.push({ l: 'Mediana municipal del Caribe', v: T.fmt.v(car), d: ind.u });
    if (amb.tipo === 'mun') {
      const g = I.grupo(est.mun);
      if (g) tiles.push({ l: `Mediana de su grupo del DNP (${g})`, v: T.fmt.v(I.medianaGrupo(ind, g)), d: 'municipios con capacidades parecidas' });
    }
    T.tiles(N.tiles, tiles);

    // mapa
    const valorMun = cod => (ind.suc[cod] || [])[j];
    let colorDe, leyenda;
    if (ind.dir !== 0) {
      colorDe = cod => { const c = I.clase5(T.pctPeor(ind, valorMun(cod))); return c < 0 ? T.col.vacio : T.col.div[c]; };
      leyenda = T.leyendaCategorias('Frente a los municipios del país', [4, 3, 2, 1, 0].map(c => ({ t: I.etiquetaClase[c], color: T.col.div[c] })).concat([{ t: 'Sin dato', color: T.col.vacio }]));
    } else {
      const cortes = T.cuantiles(ind.nac, 5), pal = [1, 2, 4, 5, 6].map(i => T.col.seq[i]);
      colorDe = cod => { const c = T.clase(valorMun(cod), cortes); return c < 0 ? T.col.vacio : pal[c]; };
      leyenda = T.leyendaCategorias('Quintil entre los municipios del país', ['Quinto más alto', 'Cuarto', 'Tercero', 'Segundo', 'Quinto más bajo'].map((t, i) => ({ t, color: pal[4 - i] })));
    }
    mapa.pintar(colorDe, cod => {
      const x = valorMun(cod), filas = [{ v: T.fmt.v(x), l: ind.u }];
      const pt = I.posicionTexto(ind, x); if (pt) filas.push({ v: pt.charAt(0).toUpperCase() + pt.slice(1), l: '' });
      filas.push({ v: T.fmt.v(pais), l: 'Colombia' });
      return [`${T.muni[cod].n} · ${y}`, filas];
    }, 0.88);
    mapa.leyenda(leyenda);
    N.mapaSub.textContent = `${ind.n} · ${y}`;
    N.mapaNota.textContent = 'Clic en un municipio para abrirlo.';

    // evolución
    const series = [];
    if (amb.tipo !== 'dep') series.push({ nombre: amb.nombre, valores: I.serie(ind), color: COL_TERR, grosor: 2.5 });
    series.push({ nombre: 'Sucre (departamento)', valores: ind.s70, color: amb.tipo === 'dep' ? COL_TERR : COL_SUCRE, grosor: amb.tipo === 'dep' ? 2.5 : 2 });
    if (ind.agg !== 'suma') series.push({ nombre: 'Colombia', valores: ind.col, color: COL_PAIS });
    N.cSerie.replaceChildren(T.h('h3', { text: 'Evolución' }), T.h('p', { class: 'sub', text: ind.u }));
    const gs = T.h('div'); N.cSerie.append(gs);
    T.lineas(gs, { anios: ind.anios, series, alto: 210, titulo: 'Evolución de ' + ind.n });

    // distribución nacional
    N.cDist.replaceChildren(T.h('h3', { text: 'Frente a los municipios del país' }), T.h('p', { class: 'sub', text: `Cómo se reparten los municipios en ${y}` }));
    const gd = T.h('div'); N.cDist.append(gd);
    T.distribucion(gd, {
      valores: ind.nac,
      marcas: [{ nombre: amb.tipo === 'dep' ? 'Sucre' : amb.nombre, v, color: COL_TERR }, { nombre: 'Colombia', v: ind.agg === 'suma' ? null : pais, color: '#57515F' }, { nombre: 'Caribe', v: car, color: COL_SUCRE }],
      nota: ind.dir === -1 ? 'Hacia la derecha, valores más altos: situación más desfavorable.' : ind.dir === 1 ? 'Hacia la derecha, valores más altos: situación más favorable.' : 'Indicador de contexto.'
    });

    // tabla de municipios de Sucre
    const todas = T.D.el.munis.map(m => {
      const s = ind.suc[m.cod] || [], val = s[j], i0 = s.findIndex(ok);
      const hayInicio = i0 >= 0 && i0 < j;
      const p = I.posicion(ind, val);
      return { cod: m.cod, municipio: m.n, subregion: m.sub, valor: val, brecha: I.brecha(ind, val), sev: ind.dir === 0 || !ok(val) ? null : T.pctPeor(ind, val),
        situacion: p ? (p.peorQue >= p.mejorQue ? `Peor que el ${Math.round(p.peorQue)}%` : `Mejor que el ${Math.round(p.mejorQue)}%`) : '—',
        a0: hayInicio ? ind.anios[i0] : null, v0: hayInicio ? s[i0] : null, cambio: hayInicio && ok(val) ? val - s[i0] : null };
    });
    todas.filter(f => ok(f.valor) && ind.dir !== 0).sort((a, b) => (ind.dir === 1 ? a.valor - b.valor : b.valor - a.valor)).forEach((f, i) => { f.rank = i + 1; });
    const filas = todas.filter(f => !est.sub || f.subregion === est.sub);
    const a0 = Math.min(...filas.map(f => f.a0).filter(ok));
    N.cTabla.replaceChildren(T.h('h3', { text: 'Municipios de Sucre' }), T.h('p', { class: 'sub', text: `${ind.n} · ${ind.u}` }));
    const caja = T.h('div'); N.cTabla.append(caja);
    T.tabla(caja, {
      columnas: [
        { k: 'municipio', t: 'Municipio', tipo: 't', clase: 'nombre' }, { k: 'subregion', t: 'Subregión', tipo: 't' },
        { k: 'valor', t: `Valor ${y}`, tipo: 'v' },
        { k: 'brecha', t: 'Frente al país', tipo: 'n', fmt: x => T.fmt.rel(x), ayuda: 'Diferencia relativa con el valor nacional; positivo = situación más desfavorable' },
        { k: 'situacion', t: 'Entre los municipios del país', tipo: 'n', orden: f => f.sev, csv: f => f.situacion },
        { k: 'rank', t: 'Puesto en Sucre (1 = peor)', tipo: 'n' },
        { k: 'v0', t: isFinite(a0) ? `Primer dato (${a0})` : 'Primer dato', tipo: 'v', fmt: (x, f) => (ok(x) ? `${T.fmt.v(x)} (${f.a0})` : '—'), csv: f => f.v0 },
        { k: 'cambio', t: 'Cambio desde el primer dato', tipo: 'n', fmt: x => (ok(x) ? T.fmt.signo(x, Math.abs(x) < 10 ? 2 : 0) : '—') }
      ],
      filas, orden: ind.dir === 0 ? 'valor' : 'sev', csv: `${ind.id}_${ind.n}_sucre`, alClic: f => T.fijar({ mun: f.cod }), marcar: f => f.cod === est.mun
    });
  }

  /* ---------------- indicador solo departamental ---------------- */
  function pintarDep(ind) {
    const I = T.I, D = T.D.ind.departamentos, j = ind.anios.length - 1, y = ind.y;
    const r = I.rangoDep(ind), sucre = ind.dep[D.cod.indexOf('70')], pais = ind.col[j];
    N.vDep.replaceChildren();
    const cab = T.h('div', { class: 'tarjeta ind-cab', style: { marginBottom: '14px' } },
      T.h('h3', { text: ind.n }),
      T.h('p', { class: 'meta', text: `${ind.u} · ${y} · ${direccion(ind)} · Fuente: ${ind.f}` }),
      T.h('p', { class: 'aviso', style: { margin: '8px 0 0' }, text: 'Este indicador sale de la encuesta de hogares y no existe por municipio. Aquí se compara Sucre con los demás departamentos y Sincelejo con las demás capitales.' }));
    const tiles = T.h('div');
    T.tiles(tiles, [
      { l: 'Sucre', v: T.fmt.v(sucre), d: ind.u, clase: 'acento' },
      { l: 'Colombia', v: T.fmt.v(pais), d: ok(pais) ? `dato nacional de ${y}` : 'TerriData no trae el total nacional' },
      { l: 'Puesto entre departamentos', v: r.pos ? `${r.pos} de ${r.n}` : '—', d: '1 = peor situación' },
      { l: 'Sincelejo', v: T.fmt.v(ind.sincelejo[j]), d: `${ind.u} · capital del departamento` }
    ]);
    const cBar = T.h('div', { class: 'tarjeta' }), cSer = T.h('div', { class: 'tarjeta' }), cCap = T.h('div', { class: 'tarjeta' });
    N.vDep.append(cab, tiles, T.h('div', { class: 'grilla g-2' }, cBar, T.h('div', { class: 'grilla', style: { marginBottom: '0', alignContent: 'start' } }, cSer, cCap)));
    cBar.append(T.h('h3', { text: 'Departamentos, de peor a mejor situación' }), T.h('p', { class: 'sub', text: `${y} · Sucre en morado` }));
    const b = T.h('div'); cBar.append(b);
    T.barras(b, r.lista.map((x, i) => ({ nombre: `${i + 1}. ${x.n}`, valor: x.v, etiqueta: T.fmt.v(x.v), color: x.cod === '70' ? T.col.bloque : '#CFCAD5' })),
      { max: Math.max(...r.lista.map(x => x.v)) });
    cSer.append(T.h('h3', { text: 'Evolución' }), T.h('p', { class: 'sub', text: ind.u }));
    const g = T.h('div'); cSer.append(g);
    T.lineas(g, { anios: ind.anios, alto: 200, series: [
      { nombre: 'Sucre', valores: ind.s70, color: COL_TERR, grosor: 2.5 },
      { nombre: 'Sincelejo', valores: ind.sincelejo, color: COL_SUCRE },
      { nombre: 'Colombia', valores: ind.col, color: COL_PAIS }] });
    if (ind.capitales && ind.capitales.cod) {
      const C = ind.capitales;
      const filas = T.arr(C.cod).map((cod, i) => ({ cod, ciudad: T.arr(C.n)[i], valor: T.arr(C.v)[i] }));
      cCap.append(T.h('h3', { text: 'Ciudades capitales' }), T.h('p', { class: 'sub', text: `${y} · Sincelejo resaltada` }));
      const cj = T.h('div'); cCap.append(cj);
      T.tabla(cj, { columnas: [{ k: 'ciudad', t: 'Ciudad', tipo: 't', clase: 'nombre' }, { k: 'valor', t: ind.u, tipo: 'v' }],
        filas, orden: 'valor', desc: ind.dir !== 1, buscar: false, csv: `${ind.id}_capitales`, marcar: f => f.cod === '70001', alto: '360px' });
    } else cCap.remove();
  }
})();

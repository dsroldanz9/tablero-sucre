/* Sección 3 · Caracterización: lectura escrita del territorio frente al país, el Caribe y sus pares */
(function () {
  'use strict';
  const T = window.T;
  const S = (T.secciones.caracterizacion = {});
  const N = {};
  let pintarAmbito, textoPlano = '';
  const TEMAS = [['salud', 'Salud'], ['seguridad', 'Seguridad'], ['economia', 'Economía'], ['educacion', 'Educación y servicios']];
  const ok = v => v != null && typeof v === 'number' && isFinite(v);

  S.iniciar = function (cont) {
    pintarAmbito = T.cabecera(cont, 'Caracterización',
      'Lectura escrita de los problemas del territorio elegido frente al país, la región Caribe y los municipios parecidos. Sale de los indicadores de la sección 2 y se rehace al cambiar de territorio.');
    N.acciones = T.h('div', { class: 'filtros' });
    N.tiles = T.h('div');
    N.texto = T.h('div', { class: 'tarjeta' });
    N.perfil = T.h('div', { class: 'tarjeta' });
    N.dep = T.h('div', { class: 'tarjeta' });
    cont.append(N.acciones, N.tiles, T.h('div', { class: 'grilla g-mapa' }, N.texto, N.perfil), N.dep);
    const copiar = T.h('button', { type: 'button', class: 'btn-sec', text: 'Copiar el texto' });
    copiar.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(textoPlano); copiar.textContent = 'Texto copiado'; }
      catch (e) { copiar.textContent = 'El navegador no dejó copiar'; }
      setTimeout(() => { copiar.textContent = 'Copiar el texto'; }, 1800);
    });
    N.acciones.append(copiar);
  };
  S.actualizar = function () { pintarAmbito(); pintar(); };

  /* ---------------- frases ---------------- */
  // frase de posición: municipio frente a los municipios, subregión como municipio equivalente, departamento entre departamentos
  function posicion(ind, est, v) {
    const I = T.I;
    if (ind.dir === 0) return null;
    if (!est.mun && !est.sub) {
      const r = I.rangoDep(ind);
      return r.pos ? `Ocupa el puesto ${r.pos} entre ${r.n} departamentos, donde 1 es la peor situación` : null;
    }
    const p = I.posicion(ind, v);
    if (!p) return null;
    const nucleo = p.peorQue >= p.mejorQue ? `peor que el ${Math.round(p.peorQue)}%` : `mejor que el ${Math.round(p.mejorQue)}%`;
    return est.mun ? `Está ${nucleo} de los municipios del país` : `Con ese valor, un municipio estaría ${nucleo} de los municipios del país`;
  }
  function descripcion(ind, est) {
    const I = T.I, v = I.valor(ind, est), p = I.pais(ind), y = ind.anios[ind.anios.length - 1];
    if (!ok(v)) return null;
    let s = `${ind.n}: ${T.fmt.v(v)} ${ind.u} en ${y}`;
    if (ok(p) && p !== 0 && ind.agg !== 'suma') {
      const ref = ind.colOficial ? 'en el país' : 'como promedio nacional ponderado por población';
      s += `, frente a ${T.fmt.v(p)} ${ref} (${T.fmt.rel((100 * (v - p)) / Math.abs(p))})`;
    }
    const pos = posicion(ind, est, v);
    return s + '.' + (pos ? ` ${pos}.` : '');
  }
  function tendencia(ind, est) {
    const s = T.I.serie(ind, est);
    const idx = s.map((v, i) => (ok(v) ? i : -1)).filter(i => i >= 0);
    if (idx.length < 2) return null;
    const a = idx[0], b = idx[idx.length - 1];
    if (s[a] === s[b]) return `Entre ${ind.anios[a]} y ${ind.anios[b]} se mantuvo en ${T.fmt.v(s[b])}.`;
    return `Entre ${ind.anios[a]} y ${ind.anios[b]} pasó de ${T.fmt.v(s[a])} a ${T.fmt.v(s[b])}.`;
  }
  const verbo = (n, sing, plur) => (n === 1 ? sing : plur);

  function panorama(est, pobT, pobDep, n, a, b) {
    const I = T.I;
    if (est.mun) {
      const m = T.muni[est.mun], g = I.grupo(est.mun);
      const grupo = !g ? '' : /^\d+$/.test(g) ? ` Está en el grupo ${g} de la tipología de capacidades del DNP.` : ` Está en el grupo "${g}" de la tipología de capacidades del DNP.`;
      return `${m.n} hace parte de la subregión ${m.sub}. Tiene ${T.fmt.n(pobT)} habitantes proyectados para 2025, el ${T.fmt.p((100 * pobT) / pobDep)} de la población del departamento.${grupo} De ${n} indicadores comparables, ${a} ${verbo(a, 'lo ubica', 'lo ubican')} peor que la mayoría de los municipios del país y ${b} mejor que la mayoría.`;
    }
    if (est.sub) {
      const ms = T.munisAmbito(est).map(m => m.n);
      return `La subregión ${est.sub} reúne ${ms.length} municipios: ${I.lista(ms)}. Suma ${T.fmt.n(pobT)} habitantes proyectados para 2025, el ${T.fmt.p((100 * pobT) / pobDep)} del departamento. Sus valores se calculan ponderando cada municipio por su población. De ${n} indicadores comparables, ${a} la ${verbo(a, 'ubica', 'ubican')} peor que la mayoría de los municipios del país y ${b} mejor que la mayoría.`;
    }
    const sinc = I.pob('70001');
    return `Sucre tiene 26 municipios en cinco subregiones y ${T.fmt.n(pobT)} habitantes proyectados para 2025. Sincelejo concentra el ${T.fmt.p((100 * sinc) / pobDep)}. De ${n} indicadores comparables con los demás departamentos, en ${a} Sucre queda entre el 40% con peor situación y en ${b} entre el 40% con mejor situación.`;
  }

  /* ---------------- pintar ---------------- */
  function pintar() {
    const I = T.I, est = T.estado, amb = T.ambito();
    const todos = T.D.ind.ind.filter(ind => ok(I.valor(ind, est)));
    const comparables = todos.filter(ind => ind.dir !== 0).map(ind => ({ ind, sev: I.severidad(ind, est) })).filter(x => x.sev != null);
    const peores = comparables.filter(x => x.sev >= 60).sort((a, b) => b.sev - a.sev);
    const mejores = comparables.filter(x => x.sev <= 40).sort((a, b) => a.sev - b.sev);
    const pobDep = T.D.el.munis.reduce((s, m) => s + (I.pob(m.cod) || 0), 0);
    const pobT = est.mun ? I.pob(est.mun) : T.munisAmbito(est).reduce((s, m) => s + (I.pob(m.cod) || 0), 0);
    const refTxt = amb.tipo === 'dep' ? 'frente a los demás departamentos' : 'frente a los municipios del país';

    T.tiles(N.tiles, [
      { l: 'Población proyectada 2025', v: T.fmt.n(pobT), d: amb.tipo === 'dep' ? '26 municipios' : `${T.fmt.p((100 * pobT) / pobDep)} del departamento`, clase: 'acento' },
      { l: 'Indicadores comparables', v: String(comparables.length), d: refTxt },
      { l: 'En situación desfavorable', v: String(peores.length), d: amb.tipo === 'dep' ? 'entre el 40% de departamentos más afectados' : 'peor que la mayoría del país' },
      { l: 'En situación favorable', v: String(mejores.length), d: amb.tipo === 'dep' ? 'entre el 40% de departamentos menos afectados' : 'mejor que la mayoría del país' }
    ]);

    const B = [{ h: 'Panorama' }, { p: panorama(est, pobT, pobDep, comparables.length, peores.length, mejores.length) }];
    if (peores.length) B.push({ h: 'Lo más crítico' }, { ul: peores.slice(0, 6).map(x => [descripcion(x.ind, est), tendencia(x.ind, est)].filter(Boolean).join(' ')), ids: peores.slice(0, 6).map(x => x.ind.id) });
    if (mejores.length) B.push({ h: 'Donde la situación es mejor' }, { ul: mejores.slice(0, 4).map(x => descripcion(x.ind, est)), ids: mejores.slice(0, 4).map(x => x.ind.id) });
    for (const [tab, nombre] of TEMAS) {
      const inds = todos.filter(ind => ind.tab === tab);
      if (!inds.length) continue;
      const comp = inds.filter(ind => ind.dir !== 0).map(ind => ({ ind, sev: I.severidad(ind, est) })).filter(x => x.sev != null).sort((a, b) => b.sev - a.sev);
      const nP = comp.filter(x => x.sev >= 60).length;
      B.push({ h: nombre });
      if (comp.length) B.push({ p: `${nP} de ${comp.length} indicadores de ${nombre.toLowerCase()} ${verbo(nP, 'está', 'están')} en situación desfavorable ${refTxt}.` });
      B.push({ ul: comp.map(x => descripcion(x.ind, est)), ids: comp.map(x => x.ind.id) });
      const ctx = inds.filter(ind => ind.dir === 0).map(ind => descripcion(ind, est)).filter(Boolean);
      if (ctx.length) B.push({ p: 'Contexto. ' + ctx.join(' ') });
    }
    B.push({ nota: amb.tipo === 'dep'
      ? 'Cómo se lee: el puesto compara a Sucre con los departamentos que tienen dato (1 = peor situación). Cuando TerriData no trae el valor departamental se estima con los municipios ponderados por población.'
      : 'Cómo se lee: "peor que el X%" cuenta los municipios del país con un valor más favorable. Los municipios sin casos registrados cuentan como cero en las tasas de salud y seguridad. Fuentes: TerriData (DNP), DANE y panel CEDE (Uniandes).' });

    // texto en pantalla y copia plana
    const cont = T.h('div', { class: 'texto' });
    const plano = [`${amb.nombre} · caracterización`];
    for (const bl of B) {
      if (bl.h) { cont.append(T.h('h4', { text: bl.h })); plano.push('', bl.h.toUpperCase()); }
      else if (bl.p) { cont.append(T.h('p', { text: bl.p })); plano.push(bl.p); }
      else if (bl.ul) {
        const ul = T.h('ul');
        bl.ul.forEach((t, i) => {
          if (!t) return;
          const li = T.h('li', null, t);
          if (bl.ids && bl.ids[i]) {
            const a = T.h('a', { href: '#problemas', text: ' Ver indicador', style: { fontSize: '12px' } });
            a.addEventListener('click', ev => { ev.preventDefault(); T.secciones.problemas.irA(bl.ids[i]); });
            li.append(a);
          }
          ul.append(li); plano.push('- ' + t);
        });
        cont.append(ul);
      } else if (bl.nota) { cont.append(T.h('p', { class: 'nota', text: bl.nota })); plano.push('', bl.nota); }
    }
    textoPlano = plano.join('\n');
    N.texto.replaceChildren(T.h('h3', { text: 'Lectura de ' + I.enAmbito(est) }), cont);

    pintarPerfil(est);
    pintarDep();
  }

  function pintarPerfil(est) {
    const I = T.I;
    N.perfil.replaceChildren(T.h('h3', { text: 'Perfil frente al país' }),
      T.h('p', { class: 'sub', text: est.mun || est.sub ? 'Posición entre los municipios del país. A la derecha, peor situación.' : 'Posición entre los departamentos. A la derecha, peor situación.' }));
    for (const [tab, nombre] of TEMAS) {
      const filas = T.D.ind.ind.filter(ind => ind.tab === tab && ind.dir !== 0)
        .map(ind => ({ ind, sev: I.severidad(ind, est), v: I.valor(ind, est) })).filter(x => x.sev != null).sort((a, b) => b.sev - a.sev);
      if (!filas.length) continue;
      N.perfil.append(T.h('div', { class: 'rail-grupo', text: nombre }));
      for (const x of filas) {
        const c = I.clase5(x.sev);
        const pista = T.h('div', { style: { position: 'relative', height: '16px' } },
          T.h('div', { style: { position: 'absolute', left: '0', right: '0', top: '7px', height: '2px', background: '#EEEBF1', borderRadius: '2px' } }),
          T.h('div', { style: { position: 'absolute', left: '50%', top: '2px', width: '1px', height: '12px', background: '#CFCAD5' } }),
          T.h('div', { style: { position: 'absolute', left: `calc(${Math.max(0, Math.min(100, x.sev))}% - 6px)`, top: '2px', width: '12px', height: '12px', borderRadius: '50%', background: T.col.div[c], boxShadow: '0 0 0 2px #fff' } }));
        const fila = T.h('div', { class: 'perfil-fila', tabindex: 0, style: { cursor: 'pointer' } }, T.h('span', { text: x.ind.n }), pista, T.h('span', { class: 'v', text: T.fmt.v(x.v) }));
        const detalle = posicion(x.ind, est, x.v) || '';
        fila.addEventListener('pointermove', ev => T.tip.mostrar(ev, x.ind.n, [{ v: T.fmt.v(x.v), l: x.ind.u }, { v: detalle, l: '' }]));
        fila.addEventListener('pointerleave', () => T.tip.ocultar());
        fila.addEventListener('click', () => { T.tip.ocultar(); T.secciones.problemas.irA(x.ind.id); });
        fila.addEventListener('keydown', ev => { if (ev.key === 'Enter') T.secciones.problemas.irA(x.ind.id); });
        N.perfil.append(fila);
      }
    }
    N.perfil.append(T.h('div', { class: 'leyenda-g', style: { marginTop: '12px' } },
      T.col.div.map((c, i) => T.h('span', null, T.h('i', { class: 'pt', style: { background: c } }), T.I.etiquetaClase[i]))));
  }

  function pintarDep() {
    const I = T.I, D = T.D.ind.departamentos, k70 = D.cod.indexOf('70');
    const filas = [...T.D.ind.ind.filter(ind => ind.dir !== 0 && ind.agg !== 'suma'), ...T.D.ind.dep].map(ind => {
      const r = I.rangoDep(ind), j = ind.anios.length - 1;
      return { indicador: ind.n, tema: ind.tab === 'dep' ? 'Departamental' : T.D.ind.tabs[ind.tab], anio: ind.y, sucre: ind.dep[k70], pais: ind.col[j],
        pos: r.pos || null, n: r.n, unidad: ind.u, dato: ind.tab === 'dep' || ind.depOficial ? 'oficial' : 'estimado' };
    }).filter(f => ok(f.sucre));
    N.dep.replaceChildren(T.h('h3', { text: 'Sucre frente a los demás departamentos' }),
      T.h('p', { class: 'sub', text: 'Puesto 1 = peor situación. "Estimado" = promedio de los municipios ponderado por población, cuando TerriData no publica el dato departamental.' }));
    const caja = T.h('div'); N.dep.append(caja);
    T.tabla(caja, {
      columnas: [
        { k: 'indicador', t: 'Indicador', tipo: 't', clase: 'largo' }, { k: 'tema', t: 'Tema', tipo: 't' },
        { k: 'anio', t: 'Año', tipo: 'n', fmt: v => String(v) }, { k: 'sucre', t: 'Sucre', tipo: 'v' }, { k: 'pais', t: 'Colombia', tipo: 'v' },
        { k: 'pos', t: 'Puesto', tipo: 'n', fmt: (v, f) => (v ? `${v} de ${f.n}` : '—'), csv: f => f.pos },
        { k: 'unidad', t: 'Unidad', tipo: 't' }, { k: 'dato', t: 'Dato', tipo: 't' }
      ],
      filas, orden: 'pos', desc: false, csv: 'sucre_frente_a_departamentos'
    });
  }
})();

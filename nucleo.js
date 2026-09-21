/* Núcleo del tablero de Sucre: estado compartido, formato, componentes, colores y mapa base.
   Todo texto que viene de los datos entra con textContent: nunca con innerHTML. */
(function () {
  'use strict';
  const T = (window.T = window.T || {});
  const SECCIONES = ['elecciones', 'problemas', 'caracterizacion', 'transferencia'];
  T.secciones = {};

  /* ---------------- colores (validados con el script de dataviz) ---------------- */
  T.col = {
    // candidatos: tres primeros por votos departamentales; el resto en gris
    cand: ['#eda100', '#6C4AB6', '#1baf7a'],
    otro: '#B4BEC6',
    // magnitud: un solo tono, claro a oscuro
    seq: ['#E3F2F6', '#BEE0EA', '#8CC7D8', '#57A9C2', '#2E88A8', '#16678A', '#0B4A6B'],
    // brecha frente al país: coral = peor, verde azulado = mejor, gris = parecido
    div: ['#00897B', '#7FCBC1', '#E4E8EB', '#F2AC98', '#C84E36'],
    bloque: '#0B6FB8',
    vacio: '#E9EEF1',
    tinta: '#13222C', tinta2: '#4B5963', tenue: '#83909A'
  };

  /* ---------------- formato ---------------- */
  const nf = d => new Intl.NumberFormat('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });
  const NF = [nf(0), nf(1), nf(2)];
  const vacio = v => v == null || typeof v !== 'number' || !isFinite(v);
  T.fmt = {
    n: v => (vacio(v) ? '—' : NF[0].format(Math.round(v))),
    p: (v, d = 1) => (vacio(v) ? '—' : NF[d].format(v) + '%'),
    pts: (v, d = 1) => (vacio(v) ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + NF[d].format(Math.abs(v)) + ' pts'),
    signo: (v, d = 0) => (vacio(v) ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + NF[d].format(Math.abs(v))),
    // marcas de eje: enteros sin decimales
    eje: v => (vacio(v) ? '' : Math.abs(v - Math.round(v)) < 1e-9 ? NF[0].format(Math.round(v)) : Math.abs(v) >= 10 ? NF[1].format(v) : NF[2].format(v)),
    dec2: v => (vacio(v) ? '—' : (v < 0 ? '−' : '') + NF[2].format(Math.abs(v))),
    // diferencia relativa en porcentaje: un decimal, sin decimales desde 100
    rel: v => (vacio(v) ? '—' : (v > 0.05 ? '+' : v < -0.05 ? '−' : '') + (Math.abs(v) >= 100 ? NF[0] : NF[1]).format(Math.abs(v)) + '%'),
    // valor de indicador: decimales según magnitud
    v: v => {
      if (vacio(v)) return '—';
      const a = Math.abs(v);
      return a >= 1000 ? NF[0].format(Math.round(v)) : a >= 100 ? NF[0].format(v) : a >= 10 ? NF[1].format(v) : NF[2].format(v);
    },
    compacto: v => {
      if (vacio(v)) return '—';
      const a = Math.abs(v);
      if (a >= 1e9) return NF[1].format(v / 1e9) + ' mil M';
      if (a >= 1e6) return NF[1].format(v / 1e6) + ' M';
      if (a >= 1e4) return NF[0].format(v / 1e3) + ' mil';
      return NF[0].format(v);
    }
  };
  T.norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  /* ---------------- DOM ---------------- */
  T.h = function (tag, props, ...hijos) {
    const e = document.createElement(tag);
    if (props) for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const x of hijos.flat(Infinity)) if (x != null && x !== false) e.append(x.nodeType ? x : document.createTextNode(String(x)));
    return e;
  };
  const SVGNS = 'http://www.w3.org/2000/svg';
  T.s = function (tag, attrs, ...hijos) {
    const e = document.createElementNS(SVGNS, tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null) continue;
      if (k === 'text') e.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    for (const x of hijos.flat(Infinity)) if (x != null && x !== false) e.append(x);
    return e;
  };

  /* ---------------- tooltip único ---------------- */
  const tip = T.h('div', { class: 'tip', role: 'tooltip' });
  tip.hidden = true;
  document.addEventListener('DOMContentLoaded', () => document.body.append(tip));
  T.tip = {
    mostrar(ev, titulo, filas) {
      tip.replaceChildren();
      if (titulo) tip.append(T.h('div', { class: 'tip-t', text: titulo }));
      for (const f of filas || []) {
        tip.append(T.h('div', { class: 'tip-f' },
          f.color ? T.h('span', { class: 'tip-k', style: { background: f.color } }) : null,
          T.h('b', { text: f.v }), T.h('span', { text: f.l || '' })));
      }
      tip.hidden = false;
      T.tip.mover(ev);
    },
    mover(ev) {
      if (tip.hidden || !ev) return;
      const pad = 14, r = tip.getBoundingClientRect();
      let x = ev.clientX + pad, y = ev.clientY + pad;
      if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - pad;
      if (y + r.height > innerHeight - 8) y = ev.clientY - r.height - pad;
      tip.style.transform = `translate(${Math.max(4, x)}px,${Math.max(4, y)}px)`;
    },
    ocultar() { tip.hidden = true; }
  };

  /* ---------------- controles ---------------- */
  T.selector = function (opciones, valor, alCambiar, etiqueta) {
    const s = T.h('select', { 'aria-label': etiqueta || '' });
    let grupo = null, gname = null;
    for (const o of opciones) {
      if (o.grupo && o.grupo !== gname) { grupo = T.h('optgroup', { label: o.grupo }); s.append(grupo); gname = o.grupo; }
      const op = T.h('option', { value: o.v, text: o.t });
      if (String(o.v) === String(valor)) op.selected = true;
      (o.grupo ? grupo : s).append(op);
    }
    s.addEventListener('change', () => alCambiar(s.value));
    return etiqueta ? T.h('label', { class: 'campo' }, T.h('span', { text: etiqueta }), s) : s;
  };
  T.segmentos = function (opciones, valor, alCambiar, etiqueta) {
    const g = T.h('div', { class: 'seg', role: 'group', 'aria-label': etiqueta || '' });
    for (const o of opciones) {
      const b = T.h('button', { type: 'button', class: o.v === valor ? 'on' : '', 'aria-pressed': String(o.v === valor), text: o.t });
      b.addEventListener('click', () => {
        g.querySelectorAll('button').forEach(x => { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); });
        b.classList.add('on'); b.setAttribute('aria-pressed', 'true');
        alCambiar(o.v);
      });
      g.append(b);
    }
    return etiqueta ? T.h('div', { class: 'campo' }, T.h('span', { text: etiqueta }), g) : g;
  };
  T.tiles = function (cont, items) {
    const g = T.h('div', { class: 'tiles' });
    for (const it of items) g.append(T.h('div', { class: 'tile' + (it.clase ? ' ' + it.clase : '') },
      T.h('div', { class: 'tile-l', text: it.l }), T.h('div', { class: 'tile-v', text: it.v }),
      it.d ? T.h('div', { class: 'tile-d', text: it.d }) : null));
    cont.replaceChildren(g);
  };
  // lista de barras horizontales (una sola serie: un solo color salvo resaltado)
  T.barras = function (cont, filas, { max, alClic, color } = {}) {
    const m = max || Math.max(1e-9, ...filas.map(f => f.valor || 0));
    const caja = T.h('div', { class: 'barras' });
    for (const f of filas) {
      const fila = T.h('div', { class: 'barra-f' + (alClic ? ' clic' : '') },
        T.h('div', { style: { minWidth: 0 } },
          T.h('div', { class: 'barra-n' }, f.sw ? T.h('span', { class: 'sw', style: { background: f.sw } }) : null, T.h('span', { text: f.nombre }), f.chip || null),
          f.detalle ? T.h('div', { class: 'barra-p', text: f.detalle }) : null),
        T.h('div', { class: 'barra-v' }, f.etiqueta, f.sub ? T.h('small', { text: f.sub }) : null),
        T.h('div', { class: 'barra-t' }, T.h('i', { style: { width: Math.max(0, Math.min(100, 100 * (f.valor || 0) / m)) + '%', background: f.color || color || T.col.bloque } })));
      if (alClic) { fila.tabIndex = 0; fila.addEventListener('click', () => alClic(f)); fila.addEventListener('keydown', e => { if (e.key === 'Enter') alClic(f); }); }
      caja.append(fila);
    }
    cont.replaceChildren(caja);
  };

  /* ---------------- tabla ordenable con búsqueda y CSV ---------------- */
  T.tabla = function (cont, cfg) {
    let { columnas, filas } = cfg;
    let clave = cfg.orden || columnas[0].k, desc = cfg.desc !== false, filtro = '';
    const caja = T.h('div', { class: 'tabla-caja' });
    const inp = cfg.buscar === false ? null : T.h('input', { type: 'search', placeholder: 'Buscar…', 'aria-label': 'Buscar en la tabla' });
    const cuenta = T.h('span', { class: 'tabla-cuenta' });
    const btn = cfg.csv ? T.h('button', { class: 'btn-sec', type: 'button', text: 'Descargar CSV' }) : null;
    const barra = T.h('div', { class: 'tabla-barra' }, inp, cuenta, T.h('span', { class: 'flex1' }), btn);
    const tabla = T.h('table', { class: 'tabla' });
    const scroll = T.h('div', { class: 'tabla-scroll', style: cfg.alto ? { maxHeight: cfg.alto } : null }, tabla);
    caja.append(barra, scroll);
    cont.replaceChildren(caja);
    let visibles = filas;
    const valor = (f, c) => (c.orden ? c.orden(f) : f[c.k]);
    function pintar() {
      const tr = T.h('tr');
      for (const c of columnas) {
        const activa = c.k === clave;
        const th = T.h('th', { class: (c.tipo === 't' ? '' : 'num') + (activa ? ' activo' : ''), scope: 'col', tabindex: 0,
          'aria-sort': activa ? (desc ? 'descending' : 'ascending') : 'none', title: c.ayuda || null }, c.t, activa ? (desc ? ' ↓' : ' ↑') : '');
        th.addEventListener('click', () => { if (clave === c.k) desc = !desc; else { clave = c.k; desc = c.tipo !== 't'; } pintar(); });
        th.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); th.click(); } });
        tr.append(th);
      }
      const col = columnas.find(c => c.k === clave) || columnas[0];
      let fs = filas;
      if (filtro) {
        const q = T.norm(filtro);
        fs = fs.filter(f => columnas.some(c => c.tipo === 't' && T.norm(c.fmt ? c.fmt(f[c.k], f) : f[c.k]).includes(q)));
      }
      fs = fs.slice().sort((a, b) => {
        const va = valor(a, col), vb = valor(b, col);
        const na = va == null || (typeof va === 'number' && !isFinite(va)), nb = vb == null || (typeof vb === 'number' && !isFinite(vb));
        if (na && nb) return 0; if (na) return 1; if (nb) return -1;
        const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es');
        return desc ? -r : r;
      });
      const tbody = T.h('tbody');
      for (const f of fs) {
        const fila = T.h('tr', { class: [cfg.alClic ? 'clic' : '', cfg.marcar && cfg.marcar(f) ? 'marcada' : ''].join(' ').trim() || null });
        for (const c of columnas) {
          const td = T.h('td', { class: (c.tipo === 't' ? '' : 'num ') + (c.clase || '') });
          if (c.celda) td.append(c.celda(f));
          else td.textContent = c.fmt ? c.fmt(f[c.k], f) : c.tipo === 'n' ? T.fmt.n(f[c.k]) : c.tipo === 'p' ? T.fmt.p(f[c.k]) : c.tipo === 'v' ? T.fmt.v(f[c.k]) : (f[c.k] ?? '—');
          fila.append(td);
        }
        if (cfg.alClic) {
          fila.tabIndex = 0;
          fila.addEventListener('click', () => cfg.alClic(f));
          fila.addEventListener('keydown', e => { if (e.key === 'Enter') cfg.alClic(f); });
        }
        tbody.append(fila);
      }
      tabla.replaceChildren(T.h('thead', null, tr), tbody);
      cuenta.textContent = fs.length === filas.length ? `${fs.length} filas` : `${fs.length} de ${filas.length} filas`;
      visibles = fs;
    }
    if (inp) inp.addEventListener('input', () => { filtro = inp.value; pintar(); });
    if (btn) btn.addEventListener('click', () => T.descargarCSV(cfg.csv, columnas, visibles));
    pintar();
    return { actualizar(nuevas, nuevasCols) { filas = nuevas; if (nuevasCols) columnas = nuevasCols; pintar(); } };
  };
  T.descargarCSV = function (nombre, columnas, filas) {
    const esc = s => { s = String(s ?? ''); return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const num = v => (v == null || !isFinite(v) ? '' : String(Math.round(v * 1000) / 1000).replace('.', ','));
    const lineas = [columnas.map(c => esc(c.t)).join(';')];
    for (const f of filas) lineas.push(columnas.map(c => {
      const v = c.csv ? c.csv(f) : f[c.k];
      return typeof v === 'number' ? num(v) : esc(v);
    }).join(';'));
    const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = T.h('a', { href: URL.createObjectURL(blob), download: nombre.replace(/[^\w\-áéíóúñ]+/gi, '_') + '.csv' });
    document.body.append(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  };

  /* ---------------- territorio ---------------- */
  T.ambito = (est = T.estado) => est.mun ? { tipo: 'mun', nombre: T.muni[est.mun].n } : est.sub ? { tipo: 'sub', nombre: 'Subregión ' + est.sub } : { tipo: 'dep', nombre: 'Departamento de Sucre' };
  T.munisAmbito = (est = T.estado) => T.D.el.munis.filter(m => (est.mun ? m.cod === est.mun : est.sub ? m.sub === est.sub : true));
  T.puestosAmbito = (est = T.estado) => T.D.el.puestos.filter(p => (est.mun ? p.m === est.mun : est.sub ? T.muni[p.m].sub === est.sub : true));

  T.estado = { sec: 'elecciones', sub: '', mun: '' };
  const oyentes = [];
  T.alCambiar = fn => oyentes.push(fn);
  T.fijar = function (cambios) {
    Object.assign(T.estado, cambios);
    if (T.estado.mun && T.muni[T.estado.mun]) T.estado.sub = T.muni[T.estado.mun].sub;
    escribirHash();
    pintarSelector();
    for (const s of SECCIONES) {
      const mod = T.secciones[s];
      if (mod && mod._listo) { if (s === T.estado.sec) mod.actualizar(T.estado); else mod._sucio = true; }
    }
    oyentes.forEach(f => f(T.estado));
  };
  function escribirHash() {
    const q = new URLSearchParams();
    if (T.estado.mun) q.set('mun', T.estado.mun); else if (T.estado.sub) q.set('sub', T.estado.sub);
    const h = '#' + T.estado.sec + (q.toString() ? '?' + q.toString() : '');
    if (location.hash !== h) history.replaceState(null, '', h);
  }
  function leerHash() {
    const [sec, qs] = location.hash.replace(/^#/, '').split('?');
    const q = new URLSearchParams(qs || '');
    const mun = q.get('mun'), sub = q.get('sub');
    return { sec: SECCIONES.includes(sec) ? sec : 'elecciones', mun: mun && T.muni[mun] ? mun : '', sub: sub && T.D.el.subregiones.includes(sub) ? sub : '' };
  }
  let selSub, selMun;
  function construirSelector() {
    const cont = document.getElementById('territorio');
    selSub = T.h('select', { 'aria-label': 'Subregión' });
    selMun = T.h('select', { 'aria-label': 'Municipio' });
    selSub.addEventListener('change', () => T.fijar({ sub: selSub.value, mun: '' }));
    selMun.addEventListener('change', () => T.fijar({ mun: selMun.value, sub: selMun.value ? T.muni[selMun.value].sub : selSub.value }));
    const limpiar = T.h('button', { type: 'button', class: 'btn-limpiar', text: 'Todo Sucre' });
    limpiar.addEventListener('click', () => T.fijar({ sub: '', mun: '' }));
    cont.replaceChildren(T.h('span', { text: 'Territorio' }), selSub, selMun, limpiar);
  }
  function pintarSelector() {
    if (!selSub) return;
    selSub.replaceChildren(T.h('option', { value: '', text: 'Todas las subregiones' }),
      ...T.D.el.subregiones.map(s => T.h('option', { value: s, text: s, selected: s === T.estado.sub ? true : null })));
    const ms = T.D.el.munis.filter(m => !T.estado.sub || m.sub === T.estado.sub);
    selMun.replaceChildren(T.h('option', { value: '', text: T.estado.sub ? 'Todos los de la subregión' : 'Todos los municipios' }),
      ...ms.map(m => T.h('option', { value: m.cod, text: m.n, selected: m.cod === T.estado.mun ? true : null })));
  }

  function mostrarSeccion(sec) {
    T.estado.sec = sec;
    document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.s === sec));
    for (const s of SECCIONES) {
      const nodo = document.getElementById('s-' + s);
      nodo.classList.toggle('on', s === sec);
    }
    const mod = T.secciones[sec];
    if (mod) {
      const nodo = document.getElementById('s-' + sec);
      if (!mod._listo) { mod.iniciar(nodo); mod._listo = true; mod.actualizar(T.estado); }
      else if (mod._sucio) { mod._sucio = false; mod.actualizar(T.estado); }
      if (mod.mostrar) requestAnimationFrame(() => mod.mostrar());
    }
    escribirHash();
    window.scrollTo({ top: 0 });
  }

  T.cabecera = function (cont, titulo, intro) {
    const amb = T.h('span', { class: 'ambito' });
    cont.append(T.h('div', { class: 'sec-cab' }, T.h('h2', { text: titulo }), amb));
    if (intro) cont.append(T.h('p', { class: 'intro', text: intro }));
    return () => { amb.textContent = T.ambito().nombre; };
  };

  /* ---------------- mapa base de Sucre (Leaflet) ---------------- */
  T.mapaSucre = function (cont, cfg = {}) {
    const div = T.h('div', { class: 'mapa' });
    cont.append(div);
    const m = L.map(div, { scrollWheelZoom: false, zoomSnap: 0.25, attributionControl: true });
    // CARTO ya exige llave (pinta "API KEY REQUIRED" sobre el mapa): base de OpenStreetMap en gris por CSS
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, className: 'mapa-base', referrerPolicy: 'strict-origin-when-cross-origin',
      attribution: '© <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a>'
    }).addTo(m);
    m.createPane('puntos'); m.getPane('puntos').style.zIndex = 470;

    let colorDe = () => T.col.vacio, tipDe = null, opacidad = 0.82;
    const estilo = f => {
      const cod = f.properties.cod, est = T.estado;
      const fuera = (est.sub && T.muni[cod].sub !== est.sub) || (est.mun && est.mun !== cod && cfg.atenuar !== false);
      const sel = est.mun === cod;
      return { fillColor: colorDe(cod), fillOpacity: fuera ? 0.18 : opacidad, color: sel ? '#13222C' : '#FFFFFF', weight: sel ? 2.6 : 1.1, opacity: 1 };
    };
    const capa = L.geoJSON(T.D.geo.sucre, {
      style: estilo,
      onEachFeature: (f, lyr) => {
        lyr.on('mouseover', e => {
          lyr.setStyle({ weight: 2.6, color: '#13222C' }); lyr.bringToFront();
          if (tipDe) { const t = tipDe(f.properties.cod); T.tip.mostrar(e.originalEvent, t[0], t[1]); }
        });
        lyr.on('mousemove', e => T.tip.mover(e.originalEvent));
        lyr.on('mouseout', () => { capa.resetStyle(lyr); T.tip.ocultar(); });
        lyr.on('click', () => { T.tip.ocultar(); T.fijar({ mun: T.estado.mun === f.properties.cod ? '' : f.properties.cod }); });
      }
    }).addTo(m);
    const puntos = L.layerGroup().addTo(m);
    let leyenda = null;

    const api = {
      mapa: m,
      pintar(fnColor, fnTip, op) { colorDe = fnColor; tipDe = fnTip; opacidad = op ?? 0.82; capa.setStyle(estilo); },
      puntos(lista, { color, radio, tip, alClic }) {
        puntos.clearLayers();
        for (const p of lista) {
          if (p.lat == null || p.lon == null) continue;
          const c = L.circleMarker([p.lat, p.lon], { pane: 'puntos', radius: radio(p), color: '#FFFFFF', weight: 2, fillColor: color(p), fillOpacity: 0.92 });
          c.on('mouseover', e => { c.setStyle({ color: '#13222C' }); const t = tip(p); T.tip.mostrar(e.originalEvent, t[0], t[1]); });
          c.on('mousemove', e => T.tip.mover(e.originalEvent));
          c.on('mouseout', () => { c.setStyle({ color: '#FFFFFF' }); T.tip.ocultar(); });
          if (alClic) c.on('click', () => { T.tip.ocultar(); alClic(p); });
          c.addTo(puntos);
        }
      },
      limpiarPuntos() { puntos.clearLayers(); },
      leyenda(nodo) {
        if (leyenda) leyenda.remove();
        if (!nodo) return;
        leyenda = L.control({ position: 'bottomright' });
        leyenda.onAdd = () => { L.DomEvent.disableClickPropagation(nodo); return nodo; };
        leyenda.addTo(m);
      },
      enfocar() {
        const est = T.estado;
        let b = null;
        capa.eachLayer(l => {
          const cod = l.feature.properties.cod;
          if ((est.mun && cod === est.mun) || (!est.mun && est.sub && T.muni[cod].sub === est.sub) || (!est.mun && !est.sub)) b = b ? b.extend(l.getBounds()) : L.latLngBounds(l.getBounds().getSouthWest(), l.getBounds().getNorthEast());
        });
        if (b) m.fitBounds(b, { padding: [18, 18], maxZoom: est.mun ? 12 : 10 });
      },
      refrescar() { m.invalidateSize(); api.enfocar(); }
    };
    return api;
  };
  // leyendas del mapa
  T.leyendaCategorias = (titulo, items) => T.h('div', { class: 'leyenda' }, T.h('b', { text: titulo }),
    items.map(it => T.h('div', { class: 'it' }, T.h('span', { class: 'sw', style: { background: it.color } }), T.h('span', { text: it.t }))));
  T.leyendaRampa = (titulo, colores, ticks) => T.h('div', { class: 'leyenda' }, T.h('b', { text: titulo }),
    T.h('div', { class: 'rampa' }, colores.map(c => T.h('i', { style: { background: c } }))),
    T.h('div', { class: 'ticks' }, ticks.map(t => T.h('span', { text: t }))));
  // corta un valor en clases con cortes dados; devuelve el índice
  T.clase = (v, cortes) => { if (v == null || !isFinite(v)) return -1; let i = 0; while (i < cortes.length && v >= cortes[i]) i++; return i; };
  T.cuantiles = (vals, n) => {
    const xs = vals.filter(v => v != null && isFinite(v)).sort((a, b) => a - b);
    if (!xs.length) return [];
    return Array.from({ length: n - 1 }, (_, i) => xs[Math.floor(((i + 1) / n) * (xs.length - 1))]);
  };

  /* ---------------- electoral: agregación ---------------- */
  // resumen de un vector de votos alineado a una lista de candidatos (+ blanco, nulos, no marcados)
  T.resumen = function (cands, acc, np) {
    const nc = cands.length, blanco = acc[nc], nulos = acc[nc + 1], nomarc = acc[nc + 2];
    let suma = 0; for (let i = 0; i < nc; i++) suma += acc[i];
    const validos = suma + blanco;
    const filas = cands.map((c, i) => ({ ...c, votos: acc[i], pct: validos ? (100 * acc[i]) / validos : 0 })).sort((a, b) => b.votos - a.votos);
    return { filas, blanco, nulos, nomarc, validos, total: validos + nulos + nomarc, puestos: np, pctBlanco: validos ? (100 * blanco) / validos : 0 };
  };
  // suma por puestos para una elección de nivel departamental
  T.sumar = function (e, puestos) {
    const n = e.cands.length + 3, acc = new Array(n).fill(0);
    let np = 0;
    for (const p of puestos) { const x = e.v[p.id]; if (!x) continue; np++; for (let i = 0; i < n; i++) acc[i] += x[i]; }
    return T.resumen(e.cands, acc, np);
  };
  // suma por puestos de un municipio para una elección de nivel municipal
  T.sumarMun = function (e, cod, puestos) {
    const cands = e.cands[cod];
    if (!cands) return null;
    const n = cands.length + 3, acc = new Array(n).fill(0);
    let np = 0;
    for (const p of puestos) { if (p.m !== cod) continue; const x = e.v[p.id]; if (!x) continue; np++; for (let i = 0; i < n; i++) acc[i] += x[i]; }
    return T.resumen(cands, acc, np);
  };
  // resumen de un puesto
  T.resumenPuesto = function (e, p) {
    const x = e.v[p.id];
    if (!x) return null;
    const cands = e.nivel === 'dep' ? e.cands : e.cands[p.m];
    return cands ? T.resumen(cands, x, 1) : null;
  };
  // votos de un conjunto de candidatos (predicado) en unos puestos
  T.votosDe = function (e, puestos, pred) {
    let v = 0;
    for (const p of puestos) {
      const x = e.v[p.id]; if (!x) continue;
      const cands = e.nivel === 'dep' ? e.cands : e.cands[p.m];
      if (!cands) continue;
      for (let i = 0; i < cands.length; i++) if (pred(cands[i], p.m)) v += x[i];
    }
    return v;
  };
  T.validosDe = function (e, puestos) {
    let v = 0;
    for (const p of puestos) {
      const x = e.v[p.id]; if (!x) continue;
      const nc = e.nivel === 'dep' ? e.cands.length : (e.cands[p.m] || []).length;
      for (let i = 0; i <= nc; i++) v += x[i];   // candidatos + blanco
    }
    return v;
  };
  // colores estables por elección: tres primeros del departamento; en elecciones municipales, por partido del ganador
  T.coloresEleccion = function (e) {
    if (e._colores) return e._colores;
    const mapa = new Map();
    if (e.nivel === 'dep') {
      const r = T.sumar(e, T.D.el.puestos);
      r.filas.slice(0, 3).forEach((c, i) => mapa.set(c.k, T.col.cand[i]));
      e._colores = { de: c => mapa.get(c.k) || T.col.otro, lista: r.filas.slice(0, 3).map((c, i) => ({ t: c.n, color: T.col.cand[i] })) };
    } else {
      const ganes = new Map();
      for (const mu of T.D.el.munis) {
        const r = T.sumarMun(e, mu.cod, T.D.el.puestos);
        if (!r || !r.filas.length) continue;
        const p = r.filas[0].p;
        ganes.set(p, (ganes.get(p) || 0) + 1);
      }
      const top = [...ganes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
      top.forEach(([p], i) => mapa.set(p, T.col.cand[i]));
      e._colores = { de: c => mapa.get(c.p) || T.col.otro, lista: top.map(([p, n], i) => ({ t: `${p} (${n})`, color: T.col.cand[i] })) };
    }
    return e._colores;
  };

  /* ---------------- indicadores: utilidades ---------------- */
  T.arr = x => (Array.isArray(x) ? x : x == null ? [] : [x]);
  T.wmean = (vals, pesos) => { let s = 0, w = 0; for (let i = 0; i < vals.length; i++) { const v = vals[i], p = pesos[i]; if (v == null || !isFinite(v) || !p) continue; s += v * p; w += p; } return w ? s / w : null; };
  T.mediana = vals => { const xs = vals.filter(v => v != null && isFinite(v)).sort((a, b) => a - b); if (!xs.length) return null; const k = (xs.length - 1) / 2; return (xs[Math.floor(k)] + xs[Math.ceil(k)]) / 2; };
  // percentil de "situación desfavorable" frente a los municipios del país: 100 = el peor
  T.pctPeor = function (ind, v) {
    if (v == null || !isFinite(v)) return null;
    const xs = ind._orden || (ind._orden = ind.nac.filter(x => x != null && isFinite(x)).sort((a, b) => a - b));
    if (!xs.length) return null;
    let lo = 0, hi = xs.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (xs[mid] < v) lo = mid + 1; else hi = mid; }
    let lo2 = lo, hi2 = xs.length;
    while (lo2 < hi2) { const mid = (lo2 + hi2) >> 1; if (xs[mid] <= v) lo2 = mid + 1; else hi2 = mid; }
    const rango = (lo + lo2) / 2 / xs.length * 100;   // percentil de valor (empates al medio)
    return ind.dir === 1 ? 100 - rango : rango;
  };

  /* ---------------- arranque ---------------- */
  T.iniciar = function (D) {
    T.D = D;
    T.muni = Object.fromEntries(D.el.munis.map(m => [m.cod, m]));
    T.puesto = Object.fromEntries(D.el.puestos.map(p => [p.id, p]));
    const MI = D.ind.municipios;
    T.idxMun = new Map(MI.cod.map((c, i) => [c, i]));
    for (const ind of D.ind.ind) {
      ind.anios = T.arr(ind.anios); ind.col = T.arr(ind.col); ind.s70 = T.arr(ind.s70); ind.nac = T.arr(ind.nac); ind.dep = T.arr(ind.dep);
      for (const k of Object.keys(ind.suc)) ind.suc[k] = T.arr(ind.suc[k]);
    }
    for (const ind of D.ind.dep) { ind.anios = T.arr(ind.anios); ind.col = T.arr(ind.col); ind.s70 = T.arr(ind.s70); ind.sincelejo = T.arr(ind.sincelejo); ind.dep = T.arr(ind.dep); }
    construirSelector();
    Object.assign(T.estado, leerHash());
    document.querySelectorAll('#nav a').forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); mostrarSeccion(a.dataset.s); }));
    // primero el territorio y después la sección: si no, la sección nueva se pinta con el territorio anterior
    window.addEventListener('hashchange', () => {
      const h = leerHash();
      T.estado.mun = h.mun; T.estado.sub = h.mun && T.muni[h.mun] ? T.muni[h.mun].sub : h.sub;
      if (h.sec !== T.estado.sec) mostrarSeccion(h.sec);
      T.fijar({});
    });
    document.getElementById('app').classList.remove('cargando');
    const carga = document.getElementById('carga'); if (carga) carga.remove();
    pintarSelector();
    mostrarSeccion(T.estado.sec);
    document.getElementById('generado').textContent = D.el.generado;
  };
})();

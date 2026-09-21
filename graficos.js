/* Gráficos SVG del tablero: líneas con cruz de lectura, distribución nacional y dispersión.
   Marcas finas, rejilla tenue, lectura al pasar el puntero y leyenda cuando hay más de una serie. */
(function () {
  'use strict';
  const T = window.T;
  const ok = v => v != null && typeof v === 'number' && isFinite(v);

  T.ticks = function (min, max, n = 4) {
    if (!ok(min) || !ok(max)) return [0, 1];
    if (max === min) max = min + (Math.abs(min) || 1);
    const paso0 = (max - min) / n, mag = Math.pow(10, Math.floor(Math.log10(paso0))), r = paso0 / mag;
    const paso = (r >= 7.5 ? 10 : r >= 3.5 ? 5 : r >= 1.5 ? 2 : 1) * mag;
    const t0 = Math.floor(min / paso) * paso, t1 = Math.ceil(max / paso) * paso, out = [];
    for (let v = t0; v <= t1 + paso / 2; v += paso) out.push(Math.round(v / paso) * paso);
    return out;
  };
  const ancho = cont => Math.max(280, Math.floor(cont.getBoundingClientRect().width) || 560);

  /* ---------------- líneas ---------------- */
  T.lineas = function (cont, cfg) {
    const anios = cfg.anios, alto = cfg.alto || 230;
    cont.replaceChildren();
    const series = cfg.series.filter(s => s.valores.some(ok));
    if (!series.length) { cont.append(T.h('p', { class: 'nota', text: 'Sin datos para graficar.' })); return; }
    if (series.length > 1) cont.append(T.h('div', { class: 'leyenda-g' },
      series.map(s => T.h('span', null, T.h('i', { style: { background: s.color } }), s.nombre))));
    const W = ancho(cont), H = alto, m = { t: 12, r: 18, b: 26, l: 56 };
    const vals = series.flatMap(s => s.valores).filter(ok);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (lo >= 0 && cfg.desdeCero !== false) lo = 0;
    const tk = T.ticks(lo, hi, 4); lo = tk[0]; hi = tk[tk.length - 1];
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const x = i => m.l + (anios.length === 1 ? iw / 2 : (i * iw) / (anios.length - 1));
    const y = v => m.t + ih * (1 - (v - lo) / (hi - lo || 1));
    const svg = T.s('svg', { class: 'grafico', viewBox: `0 0 ${W} ${H}`, width: '100%', height: H, role: 'img', 'aria-label': cfg.titulo || 'Serie de tiempo' });
    for (const t of tk) svg.append(T.s('line', { class: 'grid', x1: m.l, x2: W - m.r, y1: y(t), y2: y(t) }),
      T.s('text', { x: m.l - 8, y: y(t) + 4, 'text-anchor': 'end', text: T.fmt.eje(t) }));
    const paso = Math.max(1, Math.ceil(anios.length / Math.max(2, Math.floor(iw / 46))));
    anios.forEach((a, i) => { if (i % paso === 0 || i === anios.length - 1) svg.append(T.s('text', { x: x(i), y: H - 7, 'text-anchor': 'middle', text: String(a) })); });
    svg.append(T.s('line', { class: 'eje', x1: m.l, x2: W - m.r, y1: y(lo), y2: y(lo) }));
    for (const s of series) {
      let d = '';
      s.valores.forEach((v, i) => { if (!ok(v)) return; d += (i > 0 && ok(s.valores[i - 1]) ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); });
      svg.append(T.s('path', { d, fill: 'none', stroke: s.color, 'stroke-width': s.grosor || 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      let ultimo = -1; s.valores.forEach((v, i) => { if (ok(v)) ultimo = i; });
      s.valores.forEach((v, i) => {
        if (!ok(v)) return;
        const suelto = !ok(s.valores[i - 1]) && !ok(s.valores[i + 1]);
        if (i === ultimo || suelto) svg.append(T.s('circle', { cx: x(i), cy: y(v), r: 4, fill: s.color, stroke: '#fff', 'stroke-width': 2 }));
      });
    }
    const guia = T.s('line', { x1: 0, x2: 0, y1: m.t, y2: H - m.b, stroke: '#13222C', 'stroke-width': 1, opacity: 0 });
    const capa = T.s('rect', { x: m.l - 12, y: 0, width: iw + 24, height: H, fill: 'transparent', tabindex: 0 });
    svg.append(guia, capa);
    const leer = (ev, i) => {
      if (i == null) {
        const r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) * (W / r.width);
        i = anios.length === 1 ? 0 : Math.max(0, Math.min(anios.length - 1, Math.round(((px - m.l) / iw) * (anios.length - 1))));
      }
      guia.setAttribute('x1', x(i)); guia.setAttribute('x2', x(i)); guia.setAttribute('opacity', 0.3);
      T.tip.mostrar(ev, String(anios[i]), series.map(s => ({ color: s.color, v: T.fmt.v(s.valores[i]), l: s.nombre })));
    };
    capa.addEventListener('pointermove', ev => leer(ev));
    capa.addEventListener('pointerleave', () => { guia.setAttribute('opacity', 0); T.tip.ocultar(); });
    capa.addEventListener('focus', () => { const r = capa.getBoundingClientRect(); leer({ clientX: r.right - 30, clientY: r.top + 20 }, anios.length - 1); });
    capa.addEventListener('blur', () => { guia.setAttribute('opacity', 0); T.tip.ocultar(); });
    cont.append(svg);
    if (cfg.nota) cont.append(T.h('p', { class: 'nota', text: cfg.nota }));
  };

  /* ---------------- distribución de los municipios del país con marcas ---------------- */
  T.distribucion = function (cont, cfg) {
    cont.replaceChildren();
    const xs = cfg.valores.filter(ok).sort((a, b) => a - b);
    if (xs.length < 20) { cont.append(T.h('p', { class: 'nota', text: 'No hay suficientes municipios con dato para mostrar la distribución.' })); return; }
    const q = p => xs[Math.round(p * (xs.length - 1))];
    let lo = q(0.01), hi = q(0.99);
    const marcas = cfg.marcas.filter(mk => ok(mk.v));
    if (hi === lo) { lo = xs[0]; hi = xs[xs.length - 1]; }
    if (hi === lo) hi = lo + 1;
    const W = ancho(cont), H = 128, m = { t: 10, r: 16, b: 48, l: 16 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b, nb = 32, bw = (hi - lo) / nb;
    const cuenta = new Array(nb).fill(0);
    for (const v of xs) cuenta[Math.max(0, Math.min(nb - 1, Math.floor((v - lo) / bw)))]++;
    const cmax = Math.max(...cuenta);
    const x = v => m.l + ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * iw;
    const svg = T.s('svg', { class: 'grafico', viewBox: `0 0 ${W} ${H}`, width: '100%', height: H, role: 'img', 'aria-label': 'Distribución nacional' });
    const colW = iw / nb;
    cuenta.forEach((c, i) => {
      const hgt = cmax ? (c / cmax) * ih : 0;
      const r = T.s('rect', { x: m.l + i * colW + 1, y: m.t + ih - hgt, width: Math.max(1, colW - 2), height: hgt, fill: '#D3DCE2' });
      const hit = T.s('rect', { x: m.l + i * colW, y: m.t, width: colW, height: ih, fill: 'transparent' });
      hit.addEventListener('pointermove', ev => T.tip.mostrar(ev, `${T.fmt.v(lo + i * bw)} a ${T.fmt.v(lo + (i + 1) * bw)}`, [{ v: T.fmt.n(c), l: 'municipios' }]));
      hit.addEventListener('pointerleave', () => T.tip.ocultar());
      svg.append(r, hit);
    });
    svg.append(T.s('line', { class: 'eje', x1: m.l, x2: W - m.r, y1: m.t + ih, y2: m.t + ih }));
    svg.append(T.s('text', { x: m.l, y: m.t + ih + 14, text: T.fmt.eje(lo) }), T.s('text', { x: W - m.r, y: m.t + ih + 14, 'text-anchor': 'end', text: T.fmt.eje(hi) }));
    // marcas con etiquetas en dos renglones para que no se encimen
    const orden = marcas.map(mk => ({ ...mk, px: x(mk.v) })).sort((a, b) => a.px - b.px);
    let ultimoFin = [-1e9, -1e9];
    for (const mk of orden) {
      svg.append(T.s('line', { x1: mk.px, x2: mk.px, y1: m.t - 2, y2: m.t + ih + 3, stroke: mk.color, 'stroke-width': mk.grosor || 2.5 }));
      const txt = `${mk.nombre}: ${T.fmt.v(mk.v)}`, largo = txt.length * 6.2;
      let fila = mk.px - largo / 2 > ultimoFin[0] + 8 ? 0 : 1;
      let xt = Math.max(m.l + largo / 2, Math.min(W - m.r - largo / 2, mk.px));
      if (fila === 1 && xt - largo / 2 <= ultimoFin[1] + 8) xt = ultimoFin[1] + 8 + largo / 2;
      ultimoFin[fila] = xt + largo / 2;
      svg.append(T.s('circle', { cx: mk.px, cy: m.t + ih + 3, r: 3.5, fill: mk.color, stroke: '#fff', 'stroke-width': 1.5 }));
      svg.append(T.s('text', { x: xt, y: m.t + ih + 28 + fila * 14, 'text-anchor': 'middle', style: 'fill:#13222C', text: txt }));
    }
    cont.append(svg);
    if (cfg.nota) cont.append(T.h('p', { class: 'nota', text: cfg.nota }));
  };

  /* ---------------- dispersión con lectura del punto más cercano ---------------- */
  T.dispersion = function (cont, cfg) {
    cont.replaceChildren();
    const pts = cfg.puntos.filter(p => ok(p.x) && ok(p.y));
    if (!pts.length) { cont.append(T.h('p', { class: 'nota', text: 'Sin puestos con dato.' })); return; }
    const W = ancho(cont), H = cfg.alto || 330, m = { t: 12, r: 18, b: 42, l: 50 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const xt = T.ticks(cfg.xmin ?? 0, cfg.xmax ?? Math.max(...pts.map(p => p.x)), 5);
    const yt = T.ticks(0, cfg.ymax ?? Math.max(5, ...pts.map(p => p.y)), 4);
    const [x0, x1, y0, y1] = [xt[0], xt[xt.length - 1], yt[0], yt[yt.length - 1]];
    const X = v => m.l + ((v - x0) / (x1 - x0)) * iw, Y = v => m.t + ih * (1 - (v - y0) / (y1 - y0));
    const svg = T.s('svg', { class: 'grafico', viewBox: `0 0 ${W} ${H}`, width: '100%', height: H, role: 'img', 'aria-label': cfg.titulo || 'Dispersión' });
    for (const t of yt) svg.append(T.s('line', { class: 'grid', x1: m.l, x2: W - m.r, y1: Y(t), y2: Y(t) }), T.s('text', { x: m.l - 8, y: Y(t) + 4, 'text-anchor': 'end', text: T.fmt.eje(t) }));
    for (const t of xt) svg.append(T.s('text', { x: X(t), y: m.t + ih + 16, 'text-anchor': 'middle', text: T.fmt.eje(t) }));
    svg.append(T.s('line', { class: 'eje', x1: m.l, x2: W - m.r, y1: Y(y0), y2: Y(y0) }));
    svg.append(T.s('text', { x: m.l + iw / 2, y: H - 4, 'text-anchor': 'middle', style: 'fill:#4B5963;font-weight:600', text: cfg.xlab }));
    svg.append(T.s('text', { x: 12, y: m.t + ih / 2, transform: `rotate(-90 12 ${m.t + ih / 2})`, 'text-anchor': 'middle', style: 'fill:#4B5963;font-weight:600', text: cfg.ylab }));
    const orden = pts.slice().sort((a, b) => (b.r || 4) - (a.r || 4));
    for (const p of orden) {
      p._cx = X(p.x); p._cy = Y(p.y);
      svg.append(T.s('circle', { cx: p._cx, cy: p._cy, r: p.r || 4, fill: p.color || T.col.bloque, 'fill-opacity': p.opacidad ?? 0.72, stroke: '#fff', 'stroke-width': 1.5 }));
    }
    const aro = T.s('circle', { r: 0, fill: 'none', stroke: '#13222C', 'stroke-width': 2, opacity: 0 });
    const capa = T.s('rect', { x: 0, y: 0, width: W, height: H, fill: 'transparent' });
    svg.append(aro, capa);
    capa.addEventListener('pointermove', ev => {
      const r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) * (W / r.width), py = (ev.clientY - r.top) * (H / r.height);
      let mejor = null, dm = 30 * 30;
      for (const p of pts) { const d = (p._cx - px) ** 2 + (p._cy - py) ** 2; if (d < dm) { dm = d; mejor = p; } }
      if (!mejor) { aro.setAttribute('opacity', 0); T.tip.ocultar(); return; }
      aro.setAttribute('cx', mejor._cx); aro.setAttribute('cy', mejor._cy); aro.setAttribute('r', (mejor.r || 4) + 2); aro.setAttribute('opacity', 1);
      T.tip.mostrar(ev, mejor.titulo, mejor.filas);
    });
    capa.addEventListener('pointerleave', () => { aro.setAttribute('opacity', 0); T.tip.ocultar(); });
    if (cfg.alClic) capa.addEventListener('click', ev => {
      const r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) * (W / r.width), py = (ev.clientY - r.top) * (H / r.height);
      let mejor = null, dm = 30 * 30;
      for (const p of pts) { const d = (p._cx - px) ** 2 + (p._cy - py) ** 2; if (d < dm) { dm = d; mejor = p; } }
      if (mejor) cfg.alClic(mejor);
    });
    cont.append(svg);
    if (cfg.nota) cont.append(T.h('p', { class: 'nota', text: cfg.nota }));
  };
})();

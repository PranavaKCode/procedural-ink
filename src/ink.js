// core primitives: seeded rng, noise, polylines, tapered ink strokes, watercolour glazes, svg paths.
// classic script, attaches to globalThis.INK (node and browser)
(function (G) {
  'use strict';
  const INK = G.INK || (G.INK = {});
  const { PI, sin, cos, sqrt, abs, min, max, floor, atan2 } = Math;
  const TAU = PI * 2;

  // rng: cyrb128 string hash seeding sfc32
  function cyrb128(str) {
    let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
      k = str.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
  }
  function sfc32(a, b, c, d) {
    return function () {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
      let t = (a + b) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      d = (d + 1) | 0;
      t = (t + d) | 0;
      c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
  }
  function makeRng(seed) {
    const s = cyrb128(String(seed));
    const f = sfc32(s[0], s[1], s[2], s[3]);
    for (let i = 0; i < 12; i++) f();
    const R = {
      f,
      seed: String(seed),
      range: (a, b) => a + (b - a) * f(),
      int: (a, b) => a + floor(f() * (b - a + 1)), // inclusive
      pick: (arr) => arr[floor(f() * arr.length)],
      chance: (p) => f() < p,
      sign: () => (f() < 0.5 ? -1 : 1),
      gauss: () => { // box-muller
        let u = 0, v = 0;
        while (u === 0) u = f();
        while (v === 0) v = f();
        return sqrt(-2 * Math.log(u)) * cos(TAU * v);
      },
      // weighted pick from [value, weight] pairs
      wpick: (pairs) => {
        let tot = 0; for (const p of pairs) tot += p[1];
        let r = f() * tot;
        for (const p of pairs) { r -= p[1]; if (r <= 0) return p[0]; }
        return pairs[pairs.length - 1][0];
      },
      fork: (tag) => makeRng(String(seed) + '/' + tag),
    };
    return R;
  }

  // seeded improved perlin noise
  function makeNoise(seed) {
    const R = makeRng('noise:' + seed);
    const p = new Uint8Array(512);
    const perm = [];
    for (let i = 0; i < 256; i++) perm.push(i);
    for (let i = 255; i > 0; i--) { const j = floor(R.f() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (t, a, b) => a + t * (b - a);
    function grad(h, x, y, z) {
      const hh = h & 15;
      const u = hh < 8 ? x : y, v = hh < 4 ? y : (hh === 12 || hh === 14 ? x : z);
      return ((hh & 1) === 0 ? u : -u) + ((hh & 2) === 0 ? v : -v);
    }
    function n3(x, y, z) {
      z = z || 0;
      let X = floor(x) & 255, Y = floor(y) & 255, Z = floor(z) & 255;
      x -= floor(x); y -= floor(y); z -= floor(z);
      const u = fade(x), v = fade(y), w = fade(z);
      const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z, B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
      return lerp(w, lerp(v, lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)),
        lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))),
        lerp(v, lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
          lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))));
    }
    function fbm(x, y, z, oct) {
      oct = oct || 4; let a = 0.5, f = 1, s = 0, n = 0;
      for (let i = 0; i < oct; i++) { s += a * n3(x * f, y * f, (z || 0) * f + i * 17.3); n += a; a *= 0.5; f *= 2.03; }
      return s / n;
    }
    return { n3, n2: (x, y) => n3(x, y, 0.5), n1: (x) => n3(x, 0.37, 0.71), fbm };
  }

  // vectors
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const smoothstep = (a, b, x) => smooth((x - a) / (b - a));
  const mix2 = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
  const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
  const mul = (p, s) => [p[0] * s, p[1] * s];
  const len = (p) => sqrt(p[0] * p[0] + p[1] * p[1]);
  const dist = (p, q) => sqrt((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2);
  const norm = (p) => { const l = len(p) || 1; return [p[0] / l, p[1] / l]; };
  const perp = (p) => [-p[1], p[0]];
  const rot = (p, a) => { const c = cos(a), s = sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };

  // affine transform [a,b,c,d,e,f]: x' = a x + c y + e, y' = b x + d y + f
  function Tapply(t, p) { return [t[0] * p[0] + t[2] * p[1] + t[4], t[1] * p[0] + t[3] * p[1] + t[5]]; }
  function Tmul(t, u) { // t after u
    return [t[0] * u[0] + t[2] * u[1], t[1] * u[0] + t[3] * u[1], t[0] * u[2] + t[2] * u[3], t[1] * u[2] + t[3] * u[3],
      t[0] * u[4] + t[2] * u[5] + t[4], t[1] * u[4] + t[3] * u[5] + t[5]];
  }
  function Tsrt(s, r, tx, ty) { const c = cos(r) * s, si = sin(r) * s; return [c, si, -si, c, tx, ty]; }
  const Tscale = (t) => sqrt(abs(t[0] * t[3] - t[1] * t[2]));

  // polylines
  function plen(pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1], pts[i]); return s; }
  // uniform resample, with an optional per-point attribute
  function resample(pts, step, attr) {
    if (pts.length < 2) return attr ? { pts: pts.slice(), attr: attr.slice() } : pts.slice();
    const out = [pts[0]], oa = attr ? [attr[0]] : null;
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const d = dist(a, b);
      if (d === 0) continue;
      let t0 = 0;
      while (acc + d * (1 - t0) >= step) {
        const need = step - acc;
        t0 += need / d;
        out.push(mix2(a, b, t0));
        if (oa) oa.push(lerp(attr[i - 1], attr[i], t0));
        acc = 0;
      }
      acc += d * (1 - t0);
    }
    const last = pts[pts.length - 1];
    if (dist(out[out.length - 1], last) > step * 0.25) { out.push(last); if (oa) oa.push(attr[attr.length - 1]); }
    else { out[out.length - 1] = last; if (oa) oa[oa.length - 1] = attr[attr.length - 1]; }
    return attr ? { pts: out, attr: oa } : out;
  }
  // catmull-rom through control points
  function catmull(cp, n, closed) {
    const out = [];
    const N = cp.length;
    const get = (i) => closed ? cp[(i + N) % N] : cp[clamp(i, 0, N - 1)];
    const segs = closed ? N : N - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
        ]);
      }
    }
    if (!closed) out.push(cp[N - 1]);
    return out;
  }
  function bbox(pts) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[0] > x1) x1 = p[0]; if (p[1] > y1) y1 = p[1]; }
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }
  function pip(p, poly) { // point in polygon (even-odd)
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  function polyArea(poly) { let s = 0; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) s += (poly[j][0] - poly[i][0]) * (poly[j][1] + poly[i][1]); return s / 2; }
  function centroid(poly) { let x = 0, y = 0; for (const p of poly) { x += p[0]; y += p[1]; } return [x / poly.length, y / poly.length]; }
  // clip a polyline by a polygon into {in, out} pieces (sampled test)
  function clipPolyline(pl, poly, step) {
    const r = step ? resample(pl, step) : pl;
    const ins = [], outs = [];
    let cur = [], curIn = null;
    for (const p of r) {
      const inside = pip(p, poly);
      if (curIn === null) curIn = inside;
      if (inside !== curIn) {
        if (cur.length) { cur.push(p); (curIn ? ins : outs).push(cur); }
        cur = [cur.length ? cur[cur.length - 1] : p];
        curIn = inside;
      }
      cur.push(p);
    }
    if (cur.length > 1) (curIn ? ins : outs).push(cur);
    return { in: ins, out: outs };
  }
  // offset a closed polygon by d (positive = outward)
  function offsetPoly(poly, d) {
    const n = poly.length, out = [];
    const sgn = polyArea(poly) > 0 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const a = poly[(i - 1 + n) % n], b = poly[i], c = poly[(i + 1) % n];
      const t = norm(sub(c, a));
      const nn = [t[1] * sgn, -t[0] * sgn];
      out.push([b[0] + nn[0] * d, b[1] + nn[1] * d]);
    }
    return out;
  }
  // ink stroke -> filled polygon. pts: centreline in plate units. o: w width, wv per-point width
  // factors, tin/tout taper lengths, end width at the ends, wob/wobf wobble, wn/wnf width noise,
  // press(t) pressure, step resample step, cap round caps
  function strokePoly(pts, o, N) {
    o = o || {};
    const w0 = o.w != null ? o.w : 0.3;
    const step = o.step || clamp(w0 * 0.9, 0.09, 0.45);
    let P, WV;
    if (o.wv) { const r = resample(pts, step, o.wv); P = r.pts; WV = r.attr; }
    else { P = resample(pts, step); WV = null; }
    const n = P.length;
    if (n < 2) return null;
    const S = [0];
    for (let i = 1; i < n; i++) S.push(S[i - 1] + dist(P[i - 1], P[i]));
    const tot = S[n - 1];
    const tin = o.tin != null ? o.tin : min(tot * 0.25, w0 * 6 + 0.4);
    const tout = o.tout != null ? o.tout : min(tot * 0.35, w0 * 8 + 0.6);
    const endW = o.end != null ? o.end : 0.18;
    const wob = o.wob != null ? o.wob : 0.05;
    const wobf = o.wobf != null ? o.wobf : 0.35;
    const wn = o.wn != null ? o.wn : 0.18;
    const wnf = o.wnf != null ? o.wnf : 0.8;
    const off = o.off != null ? o.off : (N ? (P[0][0] * 7.13 + P[0][1] * 3.71) % 97 : 0);
    const L = [], Rr = [];
    const ws = new Array(n);
    for (let i = 0; i < n; i++) {
      const a = P[max(0, i - 1)], b = P[min(n - 1, i + 1)];
      const t = norm(sub(b, a));
      const nn = [-t[1], t[0]];
      const s = S[i];
      let prof = 1;
      if (tin > 0) prof *= lerp(endW, 1, smooth(s / tin));
      if (tout > 0) prof *= lerp(endW, 1, smooth((tot - s) / tout));
      let w = w0 * prof;
      if (WV) w *= WV[i];
      if (N && wn > 0) w *= 1 + wn * N.n2(s * wnf + off, 3.1);
      if (o.press) w *= o.press(s / tot);
      w = max(w, 0);
      ws[i] = w;
      let c = P[i];
      if (N && wob > 0) { const d = wob * N.n2(s * wobf + off * 1.3, 7.7); c = [c[0] + nn[0] * d, c[1] + nn[1] * d]; }
      L.push([c[0] + nn[0] * w * 0.5, c[1] + nn[1] * w * 0.5]);
      Rr.push([c[0] - nn[0] * w * 0.5, c[1] - nn[1] * w * 0.5]);
    }
    const poly = L.slice();
    const cap = o.cap !== false;
    if (cap) {
      const r = ws[n - 1] * 0.5;
      if (r > 0.01) {
        const t = norm(sub(P[n - 1], P[n - 2]));
        const a0 = atan2(t[1], t[0]) + PI / 2;
        const c = mix2(L[n - 1], Rr[n - 1], 0.5);
        for (let k = 1; k < 6; k++) { const a = a0 - (k / 6) * PI; poly.push([c[0] + cos(a) * r, c[1] + sin(a) * r]); }
      }
    }
    for (let i = n - 1; i >= 0; i--) poly.push(Rr[i]);
    if (cap) {
      const r = ws[0] * 0.5;
      if (r > 0.01) {
        const t = norm(sub(P[1], P[0]));
        const a0 = atan2(t[1], t[0]) - PI / 2;
        const c = mix2(L[0], Rr[0], 0.5);
        for (let k = 1; k < 6; k++) { const a = a0 - (k / 6) * PI; poly.push([c[0] + cos(a) * r, c[1] + sin(a) * r]); }
      }
    }
    return poly;
  }
  // split a polyline into the runs where wv > thr (engraved lines)
  function runsAbove(pts, wv, thr) {
    const runs = [];
    let cp = [], cw = [];
    for (let i = 0; i < pts.length; i++) {
      if (wv[i] > thr) { cp.push(pts[i]); cw.push(wv[i]); }
      else { if (cp.length > 1) runs.push([cp, cw]); cp = []; cw = []; }
    }
    if (cp.length > 1) runs.push([cp, cw]);
    return runs;
  }

  // watercolour glaze: layers of a polygon deformed by recursive midpoint displacement
  function deform(poly, depth, amp, R, vars) {
    let p = poly.map((q, i) => [q[0], q[1], vars ? vars[i] : 1]);
    for (let d = 0; d < depth; d++) {
      const o = [];
      for (let i = 0; i < p.length; i++) {
        const a = p[i], b = p[(i + 1) % p.length];
        o.push(a);
        const l = dist(a, b);
        const v = (a[2] + b[2]) * 0.5;
        const g = R.gauss() * amp * v * min(1, l / (amp * 4 + 1e-6));
        const t = norm(perp(sub(b, a)));
        const m = mix2(a, b, 0.5 + R.gauss() * 0.08);
        o.push([m[0] + t[0] * g, m[1] + t[1] * g, v * (0.7 + R.f() * 0.6)]);
      }
      p = o;
      amp *= 0.55;
    }
    return p.map((q) => [q[0], q[1]]);
  }
  function glaze(poly, R, o) {
    o = o || {};
    const layers = o.layers || 6;
    const amp = o.amp != null ? o.amp : 0.4;
    const a = o.alpha != null ? o.alpha : 0.5;
    const shrink = o.shrink || 0; // pull layers toward a focus point for a graded wash
    const focus = o.focus || centroid(poly);
    const base = deform(resample(poly.concat([poly[0]]), o.step || 1.2).slice(0, -1), 1, amp * 0.6, R);
    const out = [];
    for (let k = 0; k < layers; k++) {
      let q = base;
      if (shrink) { const s = 1 - shrink * (k / max(1, layers - 1)); q = q.map((p) => mix2(focus, p, s)); }
      q = deform(q, o.depth || 2, amp, R);
      out.push({ poly: q, a: a / layers * (o.boost || 1.6) });
    }
    return out;
  }

  // svg paths
  function fmt(x) { return (Math.round(x * 100) / 100).toString(); }
  function pathOf(poly, closed) {
    if (!poly || poly.length < 2) return '';
    let px = Math.round(poly[0][0] * 100), py = Math.round(poly[0][1] * 100);
    const parts = ['M' + (px / 100) + ' ' + (py / 100) + 'l'];
    const nums = [];
    for (let i = 1; i < poly.length; i++) {
      const x = Math.round(poly[i][0] * 100), y = Math.round(poly[i][1] * 100);
      const dx = x - px, dy = y - py;
      if (dx === 0 && dy === 0) continue;
      nums.push(dx / 100, dy / 100);
      px = x; py = y;
    }
    // all points round onto the first: "Mx yl z" is invalid and would break the rest of the path
    if (!nums.length) return '';
    let s = parts[0] + nums.join(' ').replace(/ -/g, '-').replace(/(^|[ -])0\./g, '$1.');
    if (closed !== false) s += 'z';
    return s;
  }
  function pathsOf(polys, closed) { let s = ''; for (const p of polys) if (p && p.length > 1) s += pathOf(p, closed); return s; }
  function circlePoly(c, r, n) { n = n || max(8, floor(r * 6)); const o = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; o.push([c[0] + cos(a) * r, c[1] + sin(a) * r]); } return o; }
  function ellipsePoly(c, rx, ry, ang, n) { n = n || max(10, floor((rx + ry) * 4)); const o = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; const p = rot([cos(a) * rx, sin(a) * ry], ang || 0); o.push([c[0] + p[0], c[1] + p[1]]); } return o; }

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const hex = (c) => '#' + c.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');

  // bowyer-watson delaunay, triangles as index triples
  function delaunay(pts) {
    const bb = bbox(pts);
    const d = max(bb.w, bb.h) * 20 + 10;
    const P = pts.concat([[bb.cx - d, bb.cy - d], [bb.cx + d, bb.cy - d], [bb.cx, bb.cy + d]]);
    const n = pts.length;
    let tris = [[n, n + 1, n + 2]];
    const circ = (t) => {
      const [a, b, c] = t.map((i) => P[i]);
      const D = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
      const ux = ((a[0] ** 2 + a[1] ** 2) * (b[1] - c[1]) + (b[0] ** 2 + b[1] ** 2) * (c[1] - a[1]) + (c[0] ** 2 + c[1] ** 2) * (a[1] - b[1])) / D;
      const uy = ((a[0] ** 2 + a[1] ** 2) * (c[0] - b[0]) + (b[0] ** 2 + b[1] ** 2) * (a[0] - c[0]) + (c[0] ** 2 + c[1] ** 2) * (b[0] - a[0])) / D;
      return [ux, uy, (a[0] - ux) ** 2 + (a[1] - uy) ** 2];
    };
    let cc = tris.map(circ);
    for (let i = 0; i < n; i++) {
      const p = P[i];
      const bad = [], keep = [], keepc = [];
      for (let k = 0; k < tris.length; k++) { const c = cc[k]; if ((p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 < c[2]) bad.push(tris[k]); else { keep.push(tris[k]); keepc.push(c); } }
      const edges = new Map();
      for (const t of bad) for (let e = 0; e < 3; e++) {
        const a = t[e], b = t[(e + 1) % 3]; const key = a < b ? a + ',' + b : b + ',' + a;
        edges.set(key, edges.has(key) ? null : [a, b]);
      }
      tris = keep; cc = keepc;
      for (const v of edges.values()) if (v) { const t = [v[0], v[1], i]; tris.push(t); cc.push(circ(t)); }
    }
    const out = [], outc = [];
    for (let k = 0; k < tris.length; k++) if (tris[k].every((j) => j < n)) { out.push(tris[k]); outc.push(cc[k]); }
    return { tris: out, cc: outc };
  }
  // voronoi edges: segments between circumcentres of adjacent triangles
  function voronoiEdges(pts) {
    const { tris, cc } = delaunay(pts);
    const m = new Map(), segs = [];
    tris.forEach((t, k) => {
      for (let e = 0; e < 3; e++) {
        const a = t[e], b = t[(e + 1) % 3]; const key = a < b ? a + ',' + b : b + ',' + a;
        if (m.has(key)) { const j = m.get(key); segs.push([[cc[j][0], cc[j][1]], [cc[k][0], cc[k][1]]]); } else m.set(key, k);
      }
    });
    return segs;
  }
  Object.assign(INK, {
    TAU, makeRng, makeNoise, clamp, lerp, smooth, smoothstep, mix2, add, sub, mul, dist, norm, perp, rot,
    Tapply, Tmul, Tsrt, Tscale,
    plen, resample, catmull, bbox, pip, polyArea, centroid, clipPolyline, offsetPoly,
    strokePoly, runsAbove, deform, glaze, fmt, pathOf, pathsOf, circlePoly, ellipsePoly, esc, hex, voronoiEdges,
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

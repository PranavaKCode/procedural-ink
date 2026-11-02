// the engraver: turns specimen-space geometry into plate-space ink and glazes.
// a drawer owns a transform (specimen -> plate), noise and a back-to-front list of parts;
// each part has silhouettes (occlusion masks), ink polygons and glazes
(function (G) {
  'use strict';
  const I = G.INK;
  const { PI, sin, cos, abs, min, max, floor, ceil, pow, atan2 } = Math;
  const { clamp, lerp, smoothstep, mix2, add, sub, mul, dist, norm } = I;

  // light from upper left front (plate space, y down, z toward the viewer)
  const LIGHT = (() => { const v = [-0.5, -0.62, 0.6]; const l = Math.hypot(...v); return v.map((x) => x / l); })();
  const HALF = (() => { const v = [LIGHT[0], LIGHT[1], LIGHT[2] + 1]; const l = Math.hypot(...v); return v.map((x) => x / l); })();
  const L2 = I.norm([LIGHT[0], LIGHT[1]]);

  const PAL = {
    ink: [34, 26, 21],
    paper: [242, 234, 216],
    ochre: [196, 140, 62],
    sienna: [168, 92, 48],
    indigo: [58, 78, 108],
    slate: [92, 104, 112],
    madder: [176, 64, 52],
    olive: [118, 118, 62],
    umber: [104, 76, 52],
    rose: [196, 120, 104],
    straw: [214, 186, 120],
  };

  function Drawer(T, seed, opt) {
    opt = opt || {};
    this.T = T;
    this.s = I.Tscale(T);
    this.N = I.makeNoise(seed + ':ink');
    this.R = I.makeRng(seed + ':draw');
    this.parts = [];
    this.pitch = opt.pitch || 0.4; // engraving line pitch (plate units)
    this.pen = opt.pen || 1; // pen width multiplier
    this.fill = opt.fill != null ? opt.fill : 1;
    this.Rh = I.makeRng(seed + ':hand'); // the engraver's hand: starved and re-cut lines
  }
  Drawer.prototype.part = function (name) {
    const p = { name, sil: [], ink: [], wash: [], z: this.parts.length };
    this.parts.push(p);
    return p;
  };
  Drawer.prototype.P = function (p) { return I.Tapply(this.T, p); };
  Drawer.prototype.Ps = function (pts) { return pts.map((p) => I.Tapply(this.T, p)); };
  Drawer.prototype.sil = function (part, poly) { part.sil.push(this.Ps(poly)); };

  // free ink line in specimen space
  Drawer.prototype.line = function (part, pts, o) {
    o = Object.assign({}, o || {});
    o.w = (o.w != null ? o.w : 0.2) * this.pen;
    const pp = this.Ps(pts);
    const poly = I.strokePoly(pp, o, this.N);
    if (poly) part.ink.push(poly);
    return pp;
  };
  // line already in plate space
  Drawer.prototype.lineP = function (part, pp, o) {
    o = Object.assign({}, o || {});
    o.w = (o.w != null ? o.w : 0.2) * this.pen;
    const poly = I.strokePoly(pp, o, this.N);
    if (poly) part.ink.push(poly);
  };
  // closed contour, thicker where the outward normal faces away from the light
  Drawer.prototype.contour = function (part, poly, o) {
    o = o || {};
    const pp = this.Ps(poly);
    const closed = o.open ? pp : pp.concat([pp[0], pp[1] || pp[0]]);
    const r = I.resample(closed, 0.25);
    const n = r.length;
    const area = I.polyArea(pp);
    const sg = area > 0 ? 1 : -1;
    const wv = [];
    for (let i = 0; i < n; i++) {
      const a = r[max(0, i - 1)], b = r[min(n - 1, i + 1)];
      const t = norm(sub(b, a));
      const nn = [t[1] * sg, -t[0] * sg]; // outward normal
      const d = nn[0] * L2[0] + nn[1] * L2[1];
      const k = o.shade != null ? o.shade : 1;
      wv.push(lerp(1, lerp(1.55, 0.6, smoothstep(-0.9, 0.7, d)), k));
    }
    const w = (o.w != null ? o.w : 0.32) * this.pen;
    this.handFlaws(part, r, wv, sg, w);
    const st = I.strokePoly(r, { w, wv, tin: o.open ? undefined : 0, tout: o.open ? undefined : 0, end: 1, wob: o.wob != null ? o.wob : 0.04, wn: o.wn != null ? o.wn : 0.15, cap: true }, this.N);
    if (st) part.ink.push(st);
  };
  // hand flaws: about once per 120 units of contour the line starves to a hairline, about once
  // per 200 units it is re-cut as a fine second line. r: polyline at 0.25 steps, wv edited in place
  Drawer.prototype.handFlaws = function (part, r, wv, sg, w) {
    const n = r.length, step = 0.25, tot = n * step;
    if (tot < 6) return;
    const R = this.Rh;
    const events = (rate) => { const x = tot / rate; return floor(x) + (R.f() < x - floor(x) ? 1 : 0); };
    for (let e = events(120); e > 0; e--) {
      const c = floor(R.f() * n), half = (0.3 + R.f() * 0.45) / step, depth = 0.12 + R.f() * 0.2;
      for (let i = max(0, floor(c - half)); i < min(n, ceil(c + half)); i++) wv[i] *= lerp(depth, 1, smoothstep(0, half, abs(i - c)) ** 1.5);
    }
    for (let e = events(200); e > 0; e--) {
      const len = (2 + R.f() * 4) / step, i0 = floor(R.f() * max(1, n - len)), side = R.f() < 0.7 ? 1 : -1, d0 = 0.09 + R.f() * 0.1;
      const pts = [];
      for (let i = i0; i < min(n, i0 + len); i++) {
        const a = r[max(0, i - 1)], b = r[min(n - 1, i + 1)];
        const t = norm(sub(b, a)), nn = [t[1] * sg * side, -t[0] * sg * side];
        const f = (i - i0) / len, d = d0 * Math.sin(PI * f) + 0.02;
        pts.push([r[i][0] + nn[0] * d, r[i][1] + nn[1] * d]);
      }
      if (pts.length > 4) { const q = I.strokePoly(pts, { w: w * (0.3 + 0.15 * R.f()), tin: 0.6, tout: 0.6, end: 0.1, wob: 0.02, wn: 0.2 }, this.N); if (q) part.ink.push(q); }
    }
  };
  // solid ink fill (small dark shapes)
  Drawer.prototype.fillPoly = function (part, poly) { part.ink.push(this.Ps(poly)); };
  Drawer.prototype.dot = function (part, c, r) { const p = this.P(c); part.ink.push(I.circlePoly(p, r * this.pen, max(6, floor(r * this.pen * 20)))); };
  Drawer.prototype.dotP = function (part, p, r) { part.ink.push(I.circlePoly(p, r * this.pen, max(6, floor(r * this.pen * 20)))); };

  // watercolour glaze over a polygon (specimen space)
  Drawer.prototype.wash = function (part, poly, col, o) {
    o = o || {};
    const pp = this.Ps(poly);
    const lay = I.glaze(pp, this.R, { layers: o.layers || 5, amp: o.amp != null ? o.amp : 0.35, alpha: o.alpha != null ? o.alpha : 0.5, shrink: o.shrink || 0, focus: o.focus ? this.P(o.focus) : null, step: o.step || 0.9, depth: o.depth || 2 });
    for (const l of lay) part.wash.push({ poly: l.poly, col, a: l.a * this.fill });
  };
  // glaze with holes (rings, windows) fully inside poly
  Drawer.prototype.washHoles = function (part, poly, holes, col, o) {
    o = o || {};
    const pp = this.Ps(poly);
    const hp = holes.map((h) => this.Ps(h));
    const lay = I.glaze(pp, this.R, { layers: o.layers || 5, amp: o.amp != null ? o.amp : 0.35, alpha: o.alpha != null ? o.alpha : 0.5, shrink: o.shrink || 0, focus: o.focus ? this.P(o.focus) : null, step: o.step || 0.9, depth: o.depth || 2 });
    for (const l of lay) part.wash.push({ poly: l.poly, holes: hp.map((h) => I.deform(I.resample(h.concat([h[0]]), 0.6).slice(0, -1), 1, (o.amp != null ? o.amp : 0.35) * 0.4, this.R)), col, a: l.a * this.fill });
  };
  // flat translucent fill, no deformation (for tiny regions)
  Drawer.prototype.tint = function (part, poly, col, a) { part.wash.push({ poly: this.Ps(poly), col, a: a * this.fill }); };

  // shading: F(u,v) -> specimen point, H(u,v) -> height. returns tone(u,v) in 0..1 (1 = full ink)
  Drawer.prototype.shadeFn = function (F, H, o) {
    o = o || {};
    const e = 1e-3, self = this;
    const amb = o.amb != null ? o.amb : 0.1;
    const alb = o.alb != null ? o.alb : 0.4; // albedo
    const gloss = o.gloss != null ? o.gloss : 0.6;
    const k = o.k != null ? o.k : 1; // how much tone the hatch carries
    return function (u, v) {
      const p = self.P(F(u, v));
      const pu = self.P(F(u + e, v)), pv = self.P(F(u, v + e));
      const s = self.s;
      const h = H(u, v) * s, hu = H(u + e, v) * s, hv = H(u, v + e) * s;
      const A = [pu[0] - p[0], pu[1] - p[1], hu - h];
      const B = [pv[0] - p[0], pv[1] - p[1], hv - h];
      let n = [A[1] * B[2] - A[2] * B[1], A[2] * B[0] - A[0] * B[2], A[0] * B[1] - A[1] * B[0]];
      const l = Math.hypot(n[0], n[1], n[2]) || 1;
      n = [n[0] / l, n[1] / l, n[2] / l];
      if (n[2] < 0) n = [-n[0], -n[1], -n[2]];
      const dif = max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
      const nh = max(0, n[0] * HALF[0] + n[1] * HALF[1] + n[2] * HALF[2]);
      const lum = amb + (1 - amb) * dif;
      const broad = pow(nh, 6);
      const hw = o.hiw != null ? o.hiw : 0.1; // highlight width
      const sharp = smoothstep(1 - hw * 1.6, 1 - hw * 0.5, nh);
      let V = alb * lum + gloss * 0.3 * broad;
      let t = (1 - V) * k;
      const core = smoothstep(1 - hw * 0.6, 1 - hw * 0.15, nh);
      t *= 1 - gloss * (0.82 * sharp + 0.18 * core);
      return clamp(t, 0, 1);
    };
  };

  // engraving hatch: lines along u (or v with o.along) swell with tone(u,v); where lines
  // converge every other one is dropped, level by level
  Drawer.prototype.hatch = function (part, F, tone, o) {
    o = o || {};
    if (o.cross && !o._sub) {
      const cap = o.cap != null ? o.cap : 0.62;
      const c0 = o.crossFrom != null ? o.crossFrom : 0.55;
      this.hatch(part, F, (u, v) => min(cap, tone(u, v)) / cap * (o.cover1 || 0.66), Object.assign({}, o, { _sub: 1, cover: 1 }));
      const o2 = Object.assign({}, o, { _sub: 1, along: (o.along || 'u') === 'u' ? 'v' : 'u', ar: o.cr || [0, 1], cr: o.ar || [0, 1], pitch: (o.pitch || this.pitch) * (o.crossPitch || 1.15), cover: 1, jit: 0.3 });
      this.hatch(part, F, (u, v) => { const t = tone(u, v); return t > c0 ? pow((t - c0) / (1 - c0), 0.9) * 0.6 : 0; }, o2);
      return;
    }
    const along = o.along || 'u';
    const G2 = along === 'u' ? F : (a, b) => F(b, a);
    const TN = along === 'u' ? tone : (a, b) => tone(b, a);
    const [a0, a1] = o.ar || [0, 1]; // along range
    const [c0, c1] = o.cr || [0, 1]; // across range
    const pitch = (o.pitch || this.pitch);
    // measure the patch
    let maxAcross = 0, maxAlong = 0;
    for (let k = 0; k <= 10; k++) {
      const t = lerp(a0, a1, k / 10);
      let L = 0, prev = this.P(G2(t, c0));
      for (let j = 1; j <= 12; j++) { const q = this.P(G2(t, lerp(c0, c1, j / 12))); L += dist(prev, q); prev = q; }
      maxAcross = max(maxAcross, L);
      const c = lerp(c0, c1, k / 10);
      let M = 0; prev = this.P(G2(a0, c));
      for (let j = 1; j <= 16; j++) { const q = this.P(G2(lerp(a0, a1, j / 16), c)); M += dist(prev, q); prev = q; }
      maxAlong = max(maxAlong, M);
    }
    const nL = max(2, ceil(maxAcross / pitch));
    const nS = max(4, ceil(maxAlong / (o.sstep || 0.3)));
    const gamma = o.gamma || 1.0;
    const cover = o.cover || 0.85;
    const thr = o.thr != null ? o.thr : 0.035;
    const wmin = o.wmin != null ? o.wmin : 0.05;
    const jit = o.jit != null ? o.jit : 0.15;
    const level = (k) => { let l = 0, x = k + 1; while (x % 2 === 0 && l < 4) { x /= 2; l++; } return l; };
    for (let k = 0; k < nL; k++) {
      const c = lerp(c0, c1, (k + 0.5 + (this.R.f() - 0.5) * jit) / nL);
      const cn = lerp(c0, c1, (k + 1.5) / nL);
      const lv = level(k);
      const pts = [], wv = [];
      for (let j = 0; j <= nS; j++) {
        const t = lerp(a0, a1, j / nS);
        const p = this.P(G2(t, c));
        const q = this.P(G2(t, cn));
        let sp = dist(p, q);
        let eff = sp, drop = false;
        if (sp < pitch * 0.5) { if (lv < 1) drop = true; else eff = sp * 2; }
        if (sp < pitch * 0.25) { if (lv < 2) drop = true; else eff = sp * 4; }
        if (sp < pitch * 0.125) { if (lv < 3) drop = true; else eff = sp * 8; }
        let tv = TN(t, c);
        tv = pow(clamp(tv, 0, 1), gamma);
        let w = drop ? 0 : tv * cover * min(eff, pitch * 1.6);
        if (w > 0 && w < wmin && tv > thr) w = wmin * smoothstep(thr, thr * 3, tv) + 0.0001;
        pts.push(p); wv.push(w);
      }
      for (const [rp, rw] of I.runsAbove(pts, wv, wmin * 0.5)) {
        const poly = I.strokePoly(rp, { w: 1, wv: rw, tin: 0.25, tout: 0.25, end: 0.3, wob: o.wob != null ? o.wob : 0.03, wobf: 0.4, wn: 0.12, wnf: 1.2, step: o.step || 0.2 }, this.N);
        if (poly) part.ink.push(poly);
      }
    }
  };
  // stipple inside a polygon, density tone(p) in plate space
  Drawer.prototype.stipple = function (part, poly, tone, o) {
    o = o || {};
    const pp = this.Ps(poly);
    const bb = I.bbox(pp);
    const r0 = o.r || 0.09;
    const sp = o.sp || 0.33;
    const R = this.R;
    for (let y = bb.y0; y < bb.y1; y += sp * 0.866) {
      const row = Math.round((y - bb.y0) / (sp * 0.866));
      for (let x = bb.x0 + (row % 2) * sp * 0.5; x < bb.x1; x += sp) {
        const p = [x + (R.f() - 0.5) * sp * 0.7, y + (R.f() - 0.5) * sp * 0.7];
        if (!I.pip(p, pp)) continue;
        const t = tone(p);
        if (R.f() > t) continue;
        const r = r0 * (0.6 + 0.6 * R.f()) * (o.grow ? (0.7 + t * 0.6) : 1);
        part.ink.push(I.circlePoly(p, r, 7));
      }
    }
  };

  // tube polygon along a centreline with radius rf(t)
  function tube(cl, rf, capA, capB) {
    const n = cl.length;
    const L = [], Rr = [];
    for (let i = 0; i < n; i++) {
      const a = cl[max(0, i - 1)], b = cl[min(n - 1, i + 1)];
      const t = norm(sub(b, a));
      const nn = [-t[1], t[0]];
      const r = rf(i / (n - 1));
      L.push(add(cl[i], mul(nn, r)));
      Rr.push(sub(cl[i], mul(nn, r)));
    }
    const out = [];
    if (capA) {
      const t = norm(sub(cl[1], cl[0])); const r = rf(0); const a0 = atan2(t[1], t[0]);
      for (let k = 0; k <= 8; k++) { const a = a0 + PI / 2 + (k / 8) * PI; out.push(add(cl[0], [cos(a) * r, sin(a) * r])); }
      out.reverse();
    }
    const poly = [];
    for (let i = 0; i < n; i++) poly.push(L[i]);
    if (capB) {
      const t = norm(sub(cl[n - 1], cl[n - 2])); const r = rf(1); const a0 = atan2(t[1], t[0]);
      for (let k = 1; k < 8; k++) { const a = a0 + PI / 2 - (k / 8) * PI; poly.push(add(cl[n - 1], [cos(a) * r, sin(a) * r])); }
    }
    for (let i = n - 1; i >= 0; i--) poly.push(Rr[i]);
    if (capA) {
      const t = norm(sub(cl[1], cl[0])); const r = rf(0); const a0 = atan2(t[1], t[0]);
      for (let k = 1; k < 8; k++) { const a = a0 - PI / 2 - (k / 8) * PI; poly.push(add(cl[0], [cos(a) * r, sin(a) * r])); }
    }
    return { poly, L, R: Rr };
  }
  // tube as a patch: u along, v across
  function tubeMap(cl, rf) {
    const n = cl.length;
    const S = [0]; for (let i = 1; i < n; i++) S.push(S[i - 1] + dist(cl[i - 1], cl[i]));
    const tot = S[n - 1];
    return function (u, v) {
      u = clamp(u, 0, 1);
      const s = u * tot;
      let i = 1; while (i < n - 1 && S[i] < s) i++;
      const t = (s - S[i - 1]) / ((S[i] - S[i - 1]) || 1);
      const p = mix2(cl[i - 1], cl[i], t);
      const tg = norm(sub(cl[i], cl[i - 1]));
      const nn = [-tg[1], tg[0]];
      const r = rf(u);
      const off = (v * 2 - 1) * r;
      return [p[0] + nn[0] * off, p[1] + nn[1] * off];
    };
  }
  // outline of a patch F over [0,1]^2
  function patchOutline(F, n, ranges) {
    n = n || 40;
    const [u0, u1, v0, v1] = ranges || [0, 1, 0, 1];
    const o = [];
    for (let i = 0; i <= n; i++) o.push(F(lerp(u0, u1, i / n), v0));
    for (let i = 1; i <= n; i++) o.push(F(u1, lerp(v0, v1, i / n)));
    for (let i = n - 1; i >= 0; i--) o.push(F(lerp(u0, u1, i / n), v1));
    for (let i = n - 1; i >= 1; i--) o.push(F(u0, lerp(v0, v1, i / n)));
    return dedupe(o);
  }
  function dedupe(pts) { const o = []; for (const p of pts) if (!o.length || dist(o[o.length - 1], p) > 1e-4) o.push(p); return o; }
  function isoU(F, u, n, v0, v1) { const o = []; for (let i = 0; i <= n; i++) o.push(F(u, lerp(v0 == null ? 0 : v0, v1 == null ? 1 : v1, i / n))); return o; }
  function isoV(F, v, n, u0, u1) { const o = []; for (let i = 0; i <= n; i++) o.push(F(lerp(u0 == null ? 0 : u0, u1 == null ? 1 : u1, i / n), v)); return o; }

  // svg for a list of parts: {defs, wash, ink}. each part is masked by later parts' silhouettes
  let MASKID = 0;
  const orient = (q) => (I.polyArea(q) < 0 ? q.slice().reverse() : q);
  // mask occluders: opaque parts paint black, translucent ones (silA < 1) grey, darkest last
  function occPaths(occ) {
    const groups = new Map();
    for (const [q, a] of occ) { const k = a.toFixed(2); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(q); }
    const keys = Array.from(groups.keys()).sort((x, y) => +x - +y);
    let o = '';
    for (const k of keys) { const v = Math.round(255 * (1 - +k)); o += `<path fill="${v ? I.hex([v, v, v]) : '#000'}" d="${I.pathsOf(groups.get(k).map(orient))}"/>`; }
    return o;
  }
  function emitParts(parts, opt) {
    opt = opt || {};
    const inkCol = opt.ink || PAL.ink;
    const inkA = opt.inkA || 0.93;
    let defs = '', wash = '', ink = '';
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const all = [];
      for (const q of p.ink) for (const v of q) all.push(v);
      for (const w of p.wash) for (const v of w.poly) all.push(v);
      for (const q of p.sil) for (const v of q) all.push(v);
      if (p.clip) for (const q of p.clip) for (const v of q) all.push(v);
      if (!all.length) continue;
      const pb = I.bbox(all);
      const occ = [];
      for (let j = i + 1; j < parts.length; j++) {
        for (const s of parts[j].sil) {
          const sb = I.bbox(s);
          if (sb.x1 < pb.x0 || sb.x0 > pb.x1 || sb.y1 < pb.y0 || sb.y0 > pb.y1) continue;
          occ.push([s, parts[j].silA != null ? parts[j].silA : 1]);
        }
      }
      let mref = '';
      if (occ.length) {
        const id = 'm' + (opt.prefix || '') + (MASKID++);
        const m = 2;
        defs += `<mask id="${id}" maskUnits="userSpaceOnUse" x="${I.fmt(pb.x0 - m)}" y="${I.fmt(pb.y0 - m)}" width="${I.fmt(pb.w + 2 * m)}" height="${I.fmt(pb.h + 2 * m)}"><rect x="${I.fmt(pb.x0 - m)}" y="${I.fmt(pb.y0 - m)}" width="${I.fmt(pb.w + 2 * m)}" height="${I.fmt(pb.h + 2 * m)}" fill="#fff"/>${occPaths(occ)}</mask>`;
        mref = ` mask="url(#${id})"`;
      }
      if (p.wash.length) {
        let s = '';
        for (const w of p.wash) {
          let d = I.pathOf(w.holes ? orient(w.poly) : w.poly);
          if (w.holes) for (const h of w.holes) d += I.pathOf(orient(h).slice().reverse());
          s += `<path d="${d}" fill="${I.hex(w.col)}" fill-opacity="${+w.a.toFixed(3)}"/>`;
        }
        let cref = '';
        const clipS = p.clip || p.sil;
        if (clipS.length && !p.noClip) {
          const cid = 'c' + (opt.prefix || '') + (MASKID++);
          defs += `<clipPath id="${cid}"><path d="${I.pathsOf(clipS.map((q) => orient(I.offsetPoly(q, 0.06))))}"/></clipPath>`;
          cref = ` clip-path="url(#${cid})"`;
        }
        wash += `<g${mref}><g${cref}>${s}</g></g>`;
      }
      if (p.ink.length) {
        // same orientation so the nonzero fill never punches holes
        let d = '';
        for (const poly of p.ink) {
          if (!poly || poly.length < 3) continue;
          const q = I.polyArea(poly) < 0 ? poly.slice().reverse() : poly;
          d += I.pathOf(q);
        }
        const col = p.inkCol || inkCol;
        ink += `<path${mref} d="${d}" fill="${I.hex(col)}" fill-opacity="${p.inkA || inkA}"/>`;
      }
    }
    return { defs, wash, ink };
  }

  G.SPEC = { Drawer, PAL, LIGHT, tube, tubeMap, patchOutline, isoU, isoV, emitParts, dedupe };
})(typeof globalThis !== 'undefined' ? globalThis : this);

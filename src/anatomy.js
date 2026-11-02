// process figures: exploded beetle and the construction drawing of the generator
(function (G) {
  'use strict';
  const I = G.INK, S = G.SPEC, B = G.BEETLE;
  const { PI, sin, cos } = Math;
  const { add, mul } = I;
  const RED = '#b4372b';

  function shiftPart(p, d) {
    const mv = (poly) => poly.map((q) => [q[0] + d[0], q[1] + d[1]]);
    p.sil = p.sil.map(mv); p.ink = p.ink.map(mv);
    p.wash = p.wash.map((w) => Object.assign({}, w, { poly: mv(w.poly), holes: w.holes ? w.holes.map(mv) : undefined }));
    if (p.clip) p.clip = p.clip.map(mv);
  }

  // exploded beetle: {defs, wash, ink}
  function explodedBeetle(P, T, k) {
    const D = new S.Drawer(T, 'beetle' + P.seed, { pitch: 0.42 });
    B.drawBeetle(P, D);
    const c0 = I.Tapply(T, [0, 0]);
    const s = D.s;
    for (const p of D.parts) {
      const all = [].concat(...p.sil, ...p.ink);
      if (!all.length) continue;
      const bb = I.bbox(all);
      const side = bb.cx > c0[0] + 0.5 ? 1 : bb.cx < c0[0] - 0.5 ? -1 : 0;
      let d = [0, 0];
      const n = p.name;
      if (['antenna', 'mandible', 'head', 'eye', 'horn', 'rostrum'].includes(n)) d = [0, -k * 1.9];
      if (n === 'eye') d = [side * k * 0.25, -k * 1.9];
      if (n === 'mandible') d = [side * k * 0.2, -k * 2.5];
      if (n === 'antenna') d = [side * k * 0.6, -k * 2.1];
      if (n === 'pronotum') d = [0, -k * 0.95];
      if (n === 'scutellum') d = [0, -k * 0.35];
      if (['claw', 'tarsus', 'tibia', 'femur'].includes(n)) {
        const front = bb.cy < c0[1] - 2 * s;
        d = [side * k * (n === 'femur' ? 0.9 : n === 'tibia' ? 1.25 : 1.55), front ? -k * 1.0 : (bb.cy > c0[1] + 10 * s ? k * 0.35 : 0)];
      }
      shiftPart(p, d);
    }
    return S.emitParts(D.parts, { prefix: 'ex' });
  }

  // construction drawing of the beetle generator, specimen space mapped by T
  function constructionBeetle(P, T) {
    const g = B.shapes(P);
    const P2 = (p) => I.Tapply(T, p);
    const line = (pts, w, a, dash) => `<path d="${I.pathOf(pts.map(P2), false)}" fill="none" stroke="${RED}" stroke-width="${w}" stroke-opacity="${a}"${dash ? ` stroke-dasharray="${dash}"` : ''} stroke-linecap="round"/>`;
    const dot = (p, r, fill) => { const q = P2(p); return `<circle cx="${I.fmt(q[0])}" cy="${I.fmt(q[1])}" r="${r}" fill="${fill || RED}" fill-opacity="0.85"/>`; };
    let out = '';
    const sides = [1, -1];
    const mir = (F, s) => (u, v) => { const p = F(u, v); return [p[0] * s, p[1]]; };
    // patches as iso-parameter grids
    const grid = (F, nu, nv, w) => {
      for (let i = 0; i <= nu; i++) out += line(S.isoU(F, i / nu, 30), w, i % 4 === 0 ? 0.75 : 0.45);
      for (let j = 0; j <= nv; j++) out += line(S.isoV(F, j / nv, 40), w, j % 4 === 0 ? 0.75 : 0.45);
    };
    for (const s of sides) {
      grid(mir(g.ely, s), 16, 8, 0.09);
      grid(mir(g.pro, s), 8, 6, 0.09);
      grid(mir(g.head, s), 6, 5, 0.09);
    }
    // midline
    out += line([[0, g.hy0 - 6], [0, P.Le + 4]], 0.12, 0.8, '1.2 0.8');
    // legs: centrelines and joints
    const legs = B.legGeometry(P);
    for (const s of sides) for (const lg of legs) {
      let p = lg.att; const pts = [p];
      for (let k = 0; k < 3; k++) { p = add(p, mul([cos(lg.ang[k]), sin(lg.ang[k])], lg.len[k])); pts.push(p); }
      const sp = pts.map((q) => [q[0] * s, q[1]]);
      out += line(sp, 0.14, 0.9);
      sp.forEach((q, i) => { out += dot(q, i === 0 ? 0.45 : 0.32); });
    }
    // antenna chains as in drawAntenna (elbowed antennae: scape and funicle)
    for (const s of sides) {
      const base = [P.Wh * (P.rostrum ? 0.3 : 0.62), P.rostrum ? g.hy0 - P.rostrum * 0.55 : g.hy0 + P.Lh * 0.22];
      const chains = [];
      if (P.antType === 'geniculate') {
        const L = P.antL, weev = !!P.rostrum;
        const sc = weev ? B.chainPts(base, PI / 2 - 0.35, 0.15, L * 0.34, 10) : B.chainPts(base, -PI / 2 + 0.55, 0.25, L * 0.38, 10);
        const e = sc[sc.length - 1];
        chains.push([base, e]);
        chains.push(weev ? B.chainPts(e, -0.15, -0.5, L * 0.5, P.antSeg - 1) : B.chainPts(e, -0.25, 0.5, L * 0.5, P.antSeg - 1));
      } else {
        const a0 = -PI / 2 + P.antA0 * (P.antType === 'long' ? 1.3 : 1);
        chains.push(B.chainPts(base, a0, P.antType === 'long' ? 0.9 + P.antCurv : P.antCurv, P.antL, P.antSeg));
      }
      for (const cl of chains) {
        const sp = cl.map((q) => [q[0] * s, q[1]]);
        out += line(sp, 0.1, 0.8, '0.6 0.5');
        sp.forEach((q) => { out += dot(q, 0.2); });
      }
    }
    // eye ellipse centre
    for (const s of sides) out += dot([g.eyeC[0] * s, g.eyeC[1]], 0.35);
    return out;
  }

  G.ANATOMY = { explodedBeetle, constructionBeetle, RED };
})(typeof globalThis !== 'undefined' ? globalThis : this);

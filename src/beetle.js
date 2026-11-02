// beetles: anatomy as parametric rules.
// specimen space: y down, head toward -y, origin at the pronotum/elytra junction
(function (G) {
  'use strict';
  const I = G.INK, S = G.SPEC;
  const { PI, sin, cos, sqrt, abs, min, max, floor, pow, atan2 } = Math;
  const { clamp, lerp, smooth, smoothstep, mix2, add, sub, mul, dist, norm, perp, rot } = I;
  const PAL = S.PAL;

  function genBeetle(seed, force) {
    const R = I.makeRng('beetle:' + seed);
    const P = { family: 'beetle', seed: String(seed) };
    const arch = P.arch = force || R.wpick([['carabid', 3], ['scarab', 3], ['stag', 2], ['longhorn', 3], ['ladybird', 1.5], ['weevil', 2], ['jewel', 2], ['tiger', 1.5]]);
    const r = (a, b) => R.range(a, b);
    // elytra
    P.Le = r(44, 56);
    const wr = { carabid: [0.3, 0.38], scarab: [0.4, 0.5], stag: [0.33, 0.4], longhorn: [0.24, 0.3], ladybird: [0.52, 0.6], weevil: [0.34, 0.44], jewel: [0.3, 0.36], tiger: [0.3, 0.36] }[arch];
    P.We = P.Le * r(...wr);
    P.s0 = r(0.72, 0.95);
    P.ush = r(0.18, 0.55);
    P.pa = r(1.8, 3.2);
    P.pb = r(1.5, 2.4);
    P.taper = arch === 'jewel' ? r(0.25, 0.45) : arch === 'longhorn' ? r(0.0, 0.18) : r(0, 0.12);
    P.hb = r(0.5, 3);
    P.dome = arch === 'ladybird' ? r(1.0, 1.25) : arch === 'scarab' ? r(0.8, 1.05) : r(0.55, 0.85);
    if (arch === 'ladybird') { P.s0 = r(0.72, 0.82); P.ush = r(0.3, 0.5); P.pa = r(1.9, 2.2); P.pb = r(1.9, 2.2); P.Le = r(40, 46); P.hb = 4; }
    if (arch === 'longhorn') { P.pa = r(2.5, 4); P.pb = r(1.1, 1.6); P.ush = r(0.1, 0.25); }
    P.striae = R.int(4, 8);
    P.punct = R.chance(0.6);
    // pronotum
    const pl = { carabid: [0.3, 0.42], scarab: [0.36, 0.48], stag: [0.3, 0.4], longhorn: [0.3, 0.42], ladybird: [0.2, 0.25], weevil: [0.36, 0.5], jewel: [0.28, 0.36], tiger: [0.26, 0.34] }[arch];
    P.Lp = P.Le * r(...pl);
    const pw = { carabid: [0.68, 0.86], scarab: [0.9, 1.05], stag: [0.85, 1.0], longhorn: [0.6, 0.8], ladybird: [0.74, 0.86], weevil: [0.7, 0.86], jewel: [0.85, 0.98], tiger: [0.6, 0.72] }[arch];
    P.Wp = P.We * r(...pw);
    // the pronotum may not overhang the shoulders of the elytra
    {
      const hum = P.We * P.s0 + 0.15;
      const kmax = { scarab: 0.96, ladybird: 0.94, jewel: 0.98, weevil: 0.97, stag: 1.02 }[arch] || 1.05;
      P.Wp = min(P.Wp, hum * kmax);
    }
    P.wpf = r(0.5, 0.8);
    P.wpb = arch === 'carabid' ? r(0.55, 0.78) : arch === 'tiger' ? r(0.7, 0.85) : r(0.8, 1.0);
    P.pmax = arch === 'carabid' ? r(0.25, 0.45) : r(0.35, 0.8);
    if (arch === 'scarab') { P.wpf = lerp(0.5, 0.68, P.wpf / 0.8); P.pmax = lerp(0.55, 0.8, P.pmax / 0.8); P.wpb = min(P.wpb, 0.94); }
    if (arch === 'ladybird') { P.wpf = lerp(0.56, 0.66, P.wpf / 0.8); P.pmax = 0.8; P.wpb = 0.95; P.hb = 2.4; P.conc = P.Lp * lerp(0.28, 0.4, P.conc / 2); P.antProj = P.Lp * lerp(0.15, 0.3, P.antProj / 2.2); P.lobe = P.Lp * 0.15; }
    P.conc = r(0.5, 2.0);
    P.antProj = r(0, 2.2);
    P.lobe = r(0, 2.5);
    P.spine = arch === 'longhorn' && R.chance(0.7) ? r(1.5, 3.5) : 0;
    P.pDome = r(0.5, 0.8);
    // head
    const hl = { weevil: [0.42, 0.55], stag: [0.7, 0.95], tiger: [0.8, 1.0], ladybird: [0.4, 0.5], scarab: [0.45, 0.6] }[arch] || [0.55, 0.75];
    P.Lh = P.Lp * r(...hl);
    P.Wh = P.Wp * (arch === 'stag' ? r(0.8, 1.0) : arch === 'tiger' ? r(0.85, 1.05) : arch === 'ladybird' ? r(0.45, 0.55) : r(0.5, 0.68));
    P.hwf = arch === 'stag' ? r(0.8, 0.95) : r(0.5, 0.75);
    P.eye = arch === 'tiger' ? r(0.3, 0.38) : r(0.16, 0.26);
    P.tuck = r(0.25, 0.4);
    // mouthparts and horns
    P.mand = arch === 'stag' ? r(0.9, 1.5) : arch === 'tiger' ? r(0.45, 0.6) : arch === 'carabid' ? r(0.28, 0.42) : arch === 'weevil' ? 0 : r(0.15, 0.3);
    P.mandCurl = arch === 'stag' ? r(0.4, 0.9) : r(0.1, 0.45);
    P.mandTeeth = arch === 'stag' ? R.int(1, 3) : R.int(0, 2);
    P.mandFork = arch === 'stag' && R.chance(0.6);
    P.horn = arch === 'scarab' ? R.wpick([['none', 2], ['cephalic', 2.6], ['pronotal', 1.2]]) : 'none';
    P.hornL = P.Lp * r(1.3, 2.1);
    P.rostrum = arch === 'weevil' ? P.Lh * r(1.2, 2.2) : 0;
    P.rostW = r(0.18, 0.3);
    // antennae
    P.antType = { carabid: 'filiform', scarab: 'lamellate', stag: 'geniculate', longhorn: 'long', ladybird: 'clavate', weevil: 'geniculate', jewel: 'serrate', tiger: 'filiform' }[arch];
    if (arch === 'carabid' && R.chance(0.3)) P.antType = 'moniliform';
    if (arch === 'jewel' && R.chance(0.3)) P.antType = 'pectinate';
    P.antL = P.Le * ({ filiform: r(0.7, 0.95), moniliform: r(0.5, 0.7), lamellate: r(0.22, 0.3), geniculate: r(0.4, 0.55), long: r(1.4, 2.2), clavate: r(0.3, 0.4), serrate: r(0.45, 0.6), pectinate: r(0.4, 0.55) }[P.antType]);
    P.antSeg = P.antType === 'lamellate' ? R.int(8, 10) : P.antType === 'long' ? 11 : R.int(10, 11);
    P.antA0 = r(0.25, 0.75);
    P.antCurv = r(-0.3, 0.6);
    P.antW = r(0.5, 0.9);
    // legs
    const lg = arch === 'tiger' || arch === 'carabid' ? r(0.95, 1.2) : arch === 'longhorn' ? r(0.8, 1.05) : arch === 'ladybird' ? r(0.45, 0.6) : r(0.65, 0.9);
    P.legL = P.Le * lg * 0.55;
    P.legW = r(0.9, 1.3) * (arch === 'scarab' ? 1.3 : arch === 'ladybird' ? 0.85 : 1);
    P.fossorial = arch === 'scarab' || (arch === 'stag' && R.chance(0.4));
    P.tars = arch === 'weevil' || arch === 'longhorn' || arch === 'ladybird' ? 4 : 5;
    P.pose = [r(-0.15, 0.15), r(-0.15, 0.15), r(-0.15, 0.15)];
    // colour and pattern
    const colours = {
      carabid: [['black', 4], ['bronze', 2], ['indigo', 2], ['chestnut', 1]],
      scarab: [['black', 2], ['chestnut', 3], ['bronze', 2], ['ochre', 1]],
      stag: [['chestnut', 3], ['black', 3], ['umber', 2]],
      longhorn: [['umber', 2], ['black', 2], ['ochre', 2], ['indigo', 1], ['chestnut', 1]],
      ladybird: [['madder', 4], ['ochre', 2], ['black', 1]],
      weevil: [['umber', 2], ['black', 2], ['ochre', 1], ['indigo', 1], ['bronze', 1]],
      jewel: [['bronze', 3], ['indigo', 2], ['green', 3]],
      tiger: [['green', 2], ['bronze', 2], ['umber', 2], ['indigo', 1]],
    }[arch];
    P.colour = R.wpick(colours);
    const pats = {
      carabid: [['none', 5], ['stripes', 1]],
      scarab: [['none', 6], ['spots', 1]],
      stag: [['none', 1]],
      longhorn: [['bands', 3], ['spots', 2], ['none', 1], ['marble', 1]],
      ladybird: [['spots', 5], ['bands', 1]],
      weevil: [['spots', 2], ['marble', 2], ['none', 2], ['stripes', 1]],
      jewel: [['none', 2], ['spots', 2], ['stripes', 2]],
      tiger: [['lunules', 5], ['none', 1]],
    }[arch];
    P.pattern = R.wpick(pats);
    P.patSeed = R.int(0, 99999);
    P.nSpots = R.int(2, 5);
    P._spots = P.pattern === 'spots' ? P.nSpots : 0;
    P.gloss = arch === 'scarab' || arch === 'ladybird' || arch === 'stag' || arch === 'jewel' ? r(0.6, 1) : r(0.3, 0.75);
    P.markOnDark = P.colour === 'black' || P.colour === 'umber' || P.colour === 'indigo' || P.colour === 'green';
    // later parameters on their own stream, so existing seeds keep their look
    const X = I.makeRng('beetle-x:' + seed);
    P.antBand = arch === 'longhorn' && X.chance(0.65);
    P.hornCurl = X.range(-1, 1);
    return P;
  }

  const COL = {
    black: { wash: [[PAL.umber, 0.1]], alb: 0.06, k: 1, mark: [PAL.ochre, 0.6] },
    chestnut: { wash: [[PAL.sienna, 0.55], [PAL.umber, 0.2]], alb: 0.3, k: 0.95, mark: [PAL.straw, 0.5] },
    bronze: { wash: [[PAL.ochre, 0.55], [PAL.olive, 0.3]], alb: 0.36, k: 0.95, mark: [PAL.straw, 0.4] },
    indigo: { wash: [[PAL.indigo, 0.62]], alb: 0.3, k: 0.95, mark: [PAL.straw, 0.6] },
    green: { wash: [[PAL.ochre, 0.55], [PAL.indigo, 0.5]], alb: 0.42, k: 0.92, mark: [PAL.straw, 0.6] },
    umber: { wash: [[PAL.umber, 0.5], [PAL.sienna, 0.15]], alb: 0.22, k: 1, mark: [PAL.straw, 0.55] },
    ochre: { wash: [[PAL.ochre, 0.62]], alb: 0.55, k: 0.85, mark: [PAL.ink, 0.0] },
    madder: { wash: [[PAL.madder, 0.62], [PAL.sienna, 0.12]], alb: 0.55, k: 0.8, mark: [PAL.ink, 0.0] },
  };
  const shadeOpt = (C, P, extra) => Object.assign({ alb: C.alb, k: C.k, gloss: P.gloss, hiw: 0.04 + 0.055 * P.gloss }, extra || {});

  // geometry
  function shapes(P) {
    const g = {};
    // elytron (right). u: base->apex, v: suture->margin
    const ey0 = 0.6;
    const prof = (u) => lerp(P.s0, 1, pow(smoothstep(0, P.ush, u), 0.7)) * pow(max(0, 1 - pow(u, P.pa)), 1 / P.pb) * (1 - P.taper * u * u);
    g.ely = (u, v) => {
      const hw = P.We * prof(u);
      return [0.15 + v * hw, ey0 + u * P.Le + P.hb * pow(v, 3) * pow(1 - u, 6) - P.hb * 0.3 * v * v * (u < 0.02 ? 1 : 0)];
    };
    g.elyH = (u, v) => P.We * P.dome * sqrt(max(0, 1 - v * v * 0.93)) * pow(max(0, 1 - pow(u, 4)), 0.5) * (0.8 + 0.2 * smoothstep(0, 0.25, u));
    // pronotum (right half). u: front->back, v: centre->side
    const round = P.arch === 'scarab' || P.arch === 'ladybird' || P.arch === 'jewel' || P.arch === 'weevil';
    const pwf = (u) => {
      const a = P.wpf, b = P.wpb, m = P.pmax;
      // convex margins: a circular arc for the domed kinds, a sine otherwise
      let w = u < m ? lerp(a, 1, round ? sqrt(max(0, 1 - (1 - u / m) ** 2)) : sin(PI / 2 * u / m)) : lerp(1, b, 1 - cos(PI / 2 * (u - m) / (1 - m)));
      if (round) w *= 1 - 0.07 * smoothstep(0.82, 1, u) ** 2; // rounded hind angles
      return w;
    };
    g.pro = (u, v) => {
      const yf = -P.Lp + P.conc * (1 - v * v) - P.antProj * pow(v, 6);
      const yb = 0.9 + P.lobe * (1 - v * v) * 0.6 - 0.4 * pow(v, 4);
      let x = v * P.Wp * pwf(u);
      if (P.spine) x += P.spine * pow(v, 8) * pow(max(0, sin(PI * (u - 0.25) / 0.5)), 3) * (u > 0.25 && u < 0.75 ? 1 : 0);
      return [x, lerp(yf, yb, u)];
    };
    g.proH = (u, v) => P.Wp * P.pDome * sqrt(max(0, 1 - v * v * 0.9)) * (0.75 + 0.25 * sin(PI * clamp(u, 0, 1)));
    // head. u: front->back, v: centre->side
    const hy1 = -P.Lp + P.conc * 0.8 + P.Lh * P.tuck;
    const hy0 = hy1 - P.Lh;
    g.hy0 = hy0; g.hy1 = hy1;
    g.head = (u, v) => {
      const w = P.Wh * lerp(P.hwf, 1, smooth(u / 0.55)) * (1 - 0.06 * smoothstep(0.7, 1, u));
      const yf = hy0 + 0.25 * P.Lh * (1 - pow(1 - v, 2)) * 0.6;
      return [v * w, lerp(yf, hy1, u)];
    };
    g.headH = (u, v) => P.Wh * 0.55 * sqrt(max(0, 1 - v * v * 0.85)) * (0.7 + 0.3 * smooth(u * 1.5));
    g.eyeC = [P.Wh * 0.93, lerp(hy0, hy1, 0.4)];
    g.eyeR = [P.Wh * P.eye * 0.8, P.Lh * P.eye * 1.25];
    return g;
  }

  // draw
  function drawBeetle(P, D) {
    const g = shapes(P);
    const C = COL[P.colour];
    const R = I.makeRng('beetle-draw:' + P.seed);
    const sides = [1, -1];
    const mir = (F, s) => (u, v) => { const p = F(u, v); return [p[0] * s, p[1]]; };
    const wash = (part, poly, mult, o) => { for (const [c, a] of C.wash) D.wash(part, poly, c, Object.assign({ alpha: a * (mult || 1) }, o || {})); };

    // antennae
    const antBase = [P.Wh * (P.rostrum ? 0.3 : 0.62), g.hy0 + P.Lh * (P.rostrum ? -0.1 : 0.22)];
    if (P.rostrum) antBase[1] = g.hy0 - P.rostrum * 0.55;
    for (const s of sides) {
      const part = D.part('antenna');
      drawAntenna(P, D, part, antBase, s);
    }
    // legs, hind first
    const legs = legGeometry(P);
    for (let li = 2; li >= 0; li--) for (const s of sides) drawLeg(P, D, C, legs[li], s, R, li);
    // mandibles
    if (P.mand > 0) for (const s of sides) drawMandible(P, D, C, g, s);
    // rostrum (weevils)
    if (P.rostrum) drawRostrum(P, D, C, g);
    // head
    {
      const part = D.part('head');
      const outline = headOutline(g);
      D.sil(part, outline);
      wash(part, outline, 1, { focus: [-P.Wh * 0.4, g.hy0 + P.Lh * 0.3], shrink: 0.4 });
      for (const s of sides) {
        const F = mir(g.head, s);
        const H = g.headH;
        const tone = D.shadeFn(F, H, shadeOpt(C, P, { hiw: (0.04 + 0.055 * P.gloss) * 0.5 }));
        D.hatch(part, F, tone, { cr: [0.02, 0.99], ar: [0.0, 1] });
      }
      D.contour(part, outline, { w: 0.3 });
      // clypeus suture
      const cl = []; for (let i = 0; i <= 20; i++) { const v = -0.8 + 1.6 * i / 20; const p = g.head(0.22, abs(v)); cl.push([p[0] * Math.sign(v || 1), p[1] + 0.3 * (1 - v * v)]); }
      D.line(part, cl, { w: 0.12 });
      // eyes
      for (const s of sides) {
        const e = [g.eyeC[0] * s, g.eyeC[1]];
        const ep = I.ellipsePoly(e, g.eyeR[0], g.eyeR[1], 0, 40);
        const ex = D.part('eye');
        D.sil(ex, ep);
        // compound eye: an engraved sphere with a bare highlight and a facet stipple
        D.wash(ex, ep, PAL.ink, { alpha: 0.6, layers: 4, amp: 0.05, shrink: 0.55, focus: add(e, [g.eyeR[0] * 0.4, g.eyeR[1] * 0.4]) });
        const [erx, ery] = g.eyeR, tilt = s * 0.5;
        const Fe = (u, v) => { const lat = (u - 0.5) * PI * 0.98, lon = (v - 0.5) * PI * 0.98; const q = rot([sin(lon) * cos(lat), sin(lat)], tilt); return [e[0] + q[0] * erx, e[1] + q[1] * ery]; };
        const He = (u, v) => min(erx, ery) * cos((v - 0.5) * PI) * cos((u - 0.5) * PI);
        const te = D.shadeFn(Fe, He, { alb: 0.3, gloss: 1, hiw: 0.25, k: 1, amb: 0.1 });
        D.hatch(ex, Fe, te, { along: 'u', ar: [0.01, 0.99], cr: [0.01, 0.99], pitch: D.pitch * 0.8, cover: 0.9, wmin: 0.03 });
        const hp = D.P(add(e, [-erx * 0.35, -ery * 0.35])), rr = ery * D.s;
        D.stipple(ex, ep, (p) => { const d = dist(p, hp) / rr; return 0.35 * smoothstep(0.2, 0.55, d) * smoothstep(1.5, 0.8, d); }, { r: 0.05, sp: 0.18 });
        D.contour(ex, ep, { w: 0.22 });
      }
      if (P.horn === 'cephalic') drawHorn(P, D, C, [0, g.hy0 + P.Lh * 0.3], P.hornL * 0.8, P.Wh * P.hwf * 0.48);
    }
    // elytra
    {
      const part = D.part('elytra');
      const outs = [];
      for (const s of sides) {
        const F = mir(g.ely, s);
        const outline = S.patchOutline(F, 48);
        outs.push(outline);
        D.sil(part, outline);
      }
      for (let si = 0; si < 2; si++) {
        const s = sides[si];
        const F = mir(g.ely, s);
        const outline = outs[si];
        wash(part, outline, 1, { focus: F(0.3, 0.25), shrink: 0.55, layers: 6 });
        const mk = markings(P);
        for (const m of mk.polys) {
          const poly = m.map((q) => F(q[0], q[1]));
          const c0 = I.centroid(m), inner = m.map((q) => F(lerp(c0[0], q[0], 0.82), lerp(c0[1], q[1], 0.82)));
          const col = P.markOnDark ? C.mark[0] : PAL.ink;
          const a0 = P.markOnDark ? C.mark[1] : 0.38;
          if (a0 > 0) {
            D.wash(part, poly, col, { alpha: a0, layers: 3, amp: 0.05 });
            D.washHoles(part, poly, [inner], col, { alpha: a0 * 0.45, layers: 2, amp: 0.03 }); // pooled edge
          }
        }
        const base = D.shadeFn(F, g.elyH, shadeOpt(C, P));
        const tone = (u, v) => {
          let t = base(u, v);
          const m = mk.f(u, v);
          if (m > 0) t = P.markOnDark ? t * (1 - 0.85 * m) : lerp(t, 0.92, m);
          return t;
        };
        D.hatch(part, F, tone, { cr: [0.0, 1], ar: [0, 1], cover: C.alb < 0.25 ? 0.92 : 0.85 });
        // dark spots on a pale ground get their own cross-hatch
        if (!P.markOnDark && mk.polys.length) D.hatch(part, F, (u, v) => 0.7 * mk.f(u, v) * (0.75 + 0.25 * base(u, v)), { along: 'v', cr: [0.0, 1], ar: [0, 1], pitch: D.pitch * 1.15, cover: 0.8, wmin: 0.04 });
        // striae, punctured or cut
        for (let k = 1; k <= P.striae; k++) {
          const v = k / (P.striae + 1) * 0.95;
          const pts = S.isoV(F, v, 80, 0.03, 0.97 - 0.15 * v * v);
          if (P.punct) {
            const pp = I.resample(D.Ps(pts), 0.42);
            for (let i = 1; i < pp.length - 1; i++) D.dotP(part, pp[i], 0.075 + 0.02 * R.f());
          } else D.line(part, pts, { w: 0.1, tin: 2, tout: 4 });
        }
        // epipleural line
        D.line(part, S.isoV(F, 0.94, 60, 0.02, 0.9), { w: 0.1, tin: 3, tout: 6 });
        D.contour(part, outline, { w: 0.34 });
      }
    }
    // scutellum
    {
      const part = D.part('scutellum');
      const sw = P.We * 0.16, sl = P.Lp * 0.28;
      const tri = I.catmull([[-sw, 0.4], [0, 0.4 + sl], [sw, 0.4], [0, 0.0]], 8, true);
      D.sil(part, tri);
      wash(part, tri, 1);
      D.hatch(part, (u, v) => mix2(mix2([-sw, 0.4], [sw, 0.4], v), [0, 0.4 + sl], u * 0.95), (u, v) => (1 - C.alb) * (0.3 + 0.5 * v), { pitch: D.pitch });
      D.contour(part, tri, { w: 0.24 });
    }
    // pronotum
    {
      const part = D.part('pronotum');
      const outline = proOutline(g);
      D.sil(part, outline);
      wash(part, outline, 1, { focus: [-P.Wp * 0.35, -P.Lp * 0.6], shrink: 0.5 });
      for (const s of sides) {
        const F = mir(g.pro, s);
        const tone = D.shadeFn(F, g.proH, shadeOpt(C, P, { hiw: (0.04 + 0.055 * P.gloss) * 0.45 }));
        D.hatch(part, F, tone, { along: 'v', ar: [0.0, 1], cr: [0.0, 1], cover: C.alb < 0.25 ? 0.92 : 0.85 });
        // lateral bead
        D.line(part, S.isoV(F, 0.93, 40, 0.06, 0.94), { w: 0.1, tin: 2, tout: 2 });
        // basal impressions
        const imp = F(0.82, 0.55);
        D.dot(part, imp, 0.12);
      }
      // median line
      D.line(part, [g.pro(0.12, 0), g.pro(0.9, 0)], { w: 0.1, tin: 2, tout: 2 });
      if (P.punct) D.stipple(part, outline, () => 0.12, { r: 0.07, sp: 0.6 });
      D.contour(part, outline, { w: 0.34 });
      if (P.horn === 'pronotal') drawHorn(P, D, C, [0, -P.Lp * 0.75 + P.conc], P.hornL * 0.95, P.Wp * P.wpf * 0.32);
    }
    return g;
  }

  function headOutline(g) {
    const n = 30;
    const o = [];
    // right half: front centre, front corner, back; then mirrored
    for (let i = 0; i <= n; i++) o.push(g.head(0, i / n));
    for (let i = 1; i <= n; i++) o.push(g.head(i / n, 1));
    for (let i = n; i >= 0; i--) { const p = g.head(1, i / n); o.push(p); }
    const left = o.slice().reverse().map((p) => [-p[0], p[1]]);
    return S.dedupe(o.concat(left));
  }
  function proOutline(g) {
    const n = 40, o = [];
    for (let i = 0; i <= n; i++) o.push(g.pro(0, i / n));
    for (let i = 1; i <= n; i++) o.push(g.pro(i / n, 1));
    for (let i = n; i >= 0; i--) o.push(g.pro(1, i / n));
    const left = o.slice().reverse().map((p) => [-p[0], p[1]]);
    return S.dedupe(o.concat(left));
  }

  // elytral markings in (u,v): {f(u,v) in 0..1, polys}
  function markings(P) {
    const R = I.makeRng('mark:' + P.seed); // same on both sides
    const polys = [];
    const fns = [];
    // irregular spot; one outline drives both the glaze and the engraving tone
    const ell = (cu, cv, ru, rv) => {
      const p1 = R.range(0, 6.3), p2 = R.range(0, 6.3), p3 = R.range(0, 6.3);
      const rr = (a) => 1 + 0.09 * sin(2 * a + p1) + 0.06 * sin(3 * a + p2) + 0.035 * sin(5 * a + p3);
      const poly = []; for (let i = 0; i < 48; i++) { const a = i / 48 * I.TAU; const k = rr(a); poly.push([cu + cos(a) * ru * k, clamp(cv + sin(a) * rv * k, 0, 1)]); }
      polys.push(poly);
      fns.push((u, v) => { const x = (u - cu) / ru, y = (v - cv) / rv; return 1 - smoothstep(0.9, 1.0, sqrt(x * x + y * y) / rr(atan2(y, x))); });
    };
    const band = (u0, u1, amp, fr, ph) => {
      const w0 = (v) => u0 + amp * sin(v * fr + ph);
      const w1 = (v) => u1 + amp * sin(v * fr + ph + 1.3);
      const poly = [];
      for (let i = 0; i <= 24; i++) poly.push([w0(i / 24), i / 24]);
      for (let i = 24; i >= 0; i--) poly.push([w1(i / 24), i / 24]);
      polys.push(poly);
      fns.push((u, v) => smoothstep(-0.01, 0.01, u - w0(v)) * smoothstep(-0.01, 0.01, w1(v) - u));
    };
    if (P.pattern === 'spots') {
      const n = P.nSpots || 3;
      for (let i = 0; i < n; i++) {
        const cu = 0.12 + (i + R.range(-0.2, 0.2)) / n * 0.75, cv = R.range(0.25, 0.75);
        const r = R.range(0.07, 0.13);
        ell(cu, cv, r, r * R.range(1.4, 2.2));
      }
    } else if (P.pattern === 'bands') {
      const n = R.int(1, 3);
      for (let i = 0; i < n; i++) { const c = 0.2 + (i + 0.5) / n * 0.6; const w = R.range(0.04, 0.09); band(c - w, c + w, R.range(0.01, 0.05), R.range(4, 12), R.range(0, 6)); }
    } else if (P.pattern === 'stripes') {
      const n = R.int(1, 2);
      for (let i = 0; i < n; i++) { const c = 0.3 + i * 0.35 + R.range(-0.05, 0.05); const w = R.range(0.06, 0.1); const poly = []; for (let k = 0; k <= 24; k++) poly.push([0.04 + k / 24 * 0.85, c - w]); for (let k = 24; k >= 0; k--) poly.push([0.04 + k / 24 * 0.85, c + w]); polys.push(poly); fns.push((u, v) => smoothstep(-0.02, 0.01, w - abs(v - c)) * smoothstep(0.02, 0.06, u) * smoothstep(0.92, 0.86, u)); }
    } else if (P.pattern === 'lunules') {
      ell(0.1, 0.85, 0.07, 0.16); ell(0.48, 0.7, 0.05, 0.3); ell(0.82, 0.5, 0.06, 0.18);
    } else if (P.pattern === 'marble') {
      const n = R.int(6, 10);
      for (let i = 0; i < n; i++) { const r = R.range(0.04, 0.08); ell(R.range(0.08, 0.9), R.range(0.15, 0.85), r, r * 1.6); }
    }
    return { polys, f: (u, v) => { let m = 0; for (const f of fns) m = max(m, f(u, v)); return m; } };
  }

  // appendages
  function chainPts(base, a0, curv, L, n) {
    const pts = [base]; let a = a0; let p = base;
    for (let i = 1; i <= n; i++) { a += curv / n; p = add(p, mul([cos(a), sin(a)], L / n)); pts.push(p); }
    return pts;
  }

  function drawAntenna(P, D, part, base, s) {
    const a0 = -PI / 2 + P.antA0 * (P.antType === 'long' ? 1.3 : 1);
    const curv = P.antType === 'long' ? 0.9 + P.antCurv : P.antCurv;
    const L = P.antL;
    const U = P.Le * 0.014 * P.antW; // antenna radius unit (specimen units)
    const mp = (pts) => pts.map((q) => [q[0] * s, q[1]]);
    const solid = (cl, rf, n, bead) => {
      // one tapered stroke, beaded per segment
      const r = I.resample(cl, I.plen(cl) / 160);
      const wv = r.map((_, i) => { const t = i / (r.length - 1); const f = (t * n) % 1; return rf(t) * (1 - bead * pow(abs(cos(PI * f)), 6)); });
      const w0 = Math.max(...wv);
      D.line(part, mp(r), { w: 2 * w0 * D.s / D.pen, wv: wv.map((x) => x / w0), tin: 0.15, tout: 0.15, end: 0.6, wob: 0.02, wn: 0.05 });
    };
    const beadPoly = (c, l, w, ang) => { const pts = []; for (let k = 0; k < 22; k++) { const t = k / 22 * I.TAU; pts.push(add(c, rot([cos(t) * l, sin(t) * w * (1 + 0.15 * cos(t))], ang))); } return pts; };
    const drawBead = (poly) => {
      const q = mp(poly);
      D.sil(part, q);
      D.wash(part, q, PAL.umber, { alpha: 0.45, layers: 2, amp: 0.05 });
      D.stipple(part, q, (p) => 0.55, { r: 0.06, sp: 0.22 });
      D.contour(part, q, { w: 0.15, shade: 0.7 });
    };
    if (P.antType === 'geniculate') {
      const weev = !!P.rostrum;
      const sc = weev ? chainPts(base, PI / 2 - 0.35, 0.15, L * 0.34, 10) : chainPts(base, -PI / 2 + 0.55, 0.25, L * 0.38, 10);
      const fu = weev ? chainPts(sc[sc.length - 1], -0.15, -0.5, L * 0.5, 14) : chainPts(sc[sc.length - 1], -0.25, 0.5, L * 0.5, 14);
      solid(sc, (t) => U * (0.8 + 0.5 * t), 1, 0.0);
      solid(fu, () => U * 0.75, 6, 0.35);
      const tip = fu[fu.length - 1], tg = norm(sub(fu[fu.length - 1], fu[fu.length - 3]));
      const ang = atan2(tg[1], tg[0]);
      if (weev) { // weevil: a compact club of broad segments
        for (let k = 0; k < 3; k++) drawBead(beadPoly(add(tip, mul(tg, U * (1.6 + 2.3 * k))), U * 1.25, U * (2.0 - 0.25 * k), ang));
        return;
      }
      // stag beetle: a comb of 3-4 flat lamellae on the inner side
      const nl = 3 + (P.antSeg > 10 ? 1 : 0);
      let nn = perp(tg); if (nn[1] > 0) nn = mul(nn, -1); // teeth point forward
      for (let k = 0; k < nl; k++) {
        const b0 = add(tip, mul(tg, U * (0.9 + 1.75 * k)));
        const Lt = U * (4.4 - 0.45 * k), wt = U * 0.72;
        const lean = add(nn, mul(tg, 0.28));
        const ax = norm(lean), side = perp(ax);
        const q = [];
        for (let i = 0; i <= 10; i++) { const t = i / 10; const w = wt * (1 - 0.35 * t) * (0.85 + 0.15 * Math.sin(PI * t)); q.push(add(add(b0, mul(ax, Lt * t - U * 0.4)), mul(side, w))); }
        for (let i = 10; i >= 0; i--) { const t = i / 10; const w = wt * (1 - 0.35 * t) * (0.85 + 0.15 * Math.sin(PI * t)); q.push(add(add(b0, mul(ax, Lt * t - U * 0.4)), mul(side, -w))); }
        const qm = mp(q);
        D.sil(part, qm);
        D.wash(part, qm, PAL.umber, { alpha: 0.5, layers: 2, amp: 0.03 });
        D.line(part, mp([add(b0, mul(ax, U * 0.2)), add(b0, mul(ax, Lt * 0.85))]), { w: 0.05, tin: 0.1, tout: 0.3, end: 0.4 });
        D.contour(part, qm, { w: 0.13, shade: 0.7 });
      }
      // shaft joining the lamellae
      solid([tip, add(tip, mul(tg, U * (1.0 + 1.75 * (nl - 1))))], () => U * 0.85, 1, 0);
      return;
    }
    const cl = chainPts(base, a0, curv, L, 30);
    const n = P.antSeg;
    switch (P.antType) {
      case 'filiform': solid(cl, (t) => U * (0.9 - 0.4 * t), n, 0.3); break;
      case 'long': {
        // one capsule per segment, optionally banded
        const tot = I.plen(cl);
        const rs = I.resample(cl, tot / 220);
        const seg = (k) => { const a = k === 0 ? 0 : 0.07 + (k - 1) / (n - 1) * 0.93; const b = 0.07 + k / (n - 1) * 0.93; return [a, min(1, b)]; };
        for (let k = 0; k < n; k++) {
          const [a, b] = seg(k);
          const i0 = floor(a * (rs.length - 1)), i1 = max(i0 + 2, floor(b * (rs.length - 1)));
          const pts = rs.slice(i0, min(rs.length, i1 + 1));
          if (pts.length < 2) continue;
          const r0 = U * (k === 0 ? 1.5 : 1.25 - 0.75 * a);
          const tb = S.tube(pts, (t) => r0 * (0.72 + 0.28 * smoothstep(0, 0.25, t)) * (1 - 0.12 * t), true, true);
          const q = mp(tb.poly);
          D.sil(part, q);
          const dark = !P.antBand || k % 2 === 0 || k === 0;
          if (dark) D.tint(part, q, PAL.ink, 0.82);
          else { D.tint(part, q, PAL.straw, 0.7); D.tint(part, q, PAL.ink, 0.12); }
          D.contour(part, q, { w: 0.1, shade: 0.5 });
        }
        break;
      }
      case 'moniliform': solid(cl, () => U * 1.0, n, 0.7); break;
      case 'clavate': {
        const stalk = cl.slice(0, Math.floor(cl.length * 0.72));
        solid(stalk, () => U * 0.7, n - 3, 0.35);
        const tip = stalk[stalk.length - 1], tg = norm(sub(cl[cl.length - 1], stalk[stalk.length - 1]));
        const ang = atan2(tg[1], tg[0]);
        for (let k = 0; k < 3; k++) drawBead(beadPoly(add(tip, mul(tg, U * (1.4 + 2.2 * k))), U * 1.2, U * (1.7 + 0.35 * k), ang));
        break;
      }
      case 'lamellate': {
        const stalk = cl.slice(0, Math.floor(cl.length * 0.72));
        solid(stalk, () => U * 0.8, n - 3, 0.35);
        const tip = stalk[stalk.length - 1], tg = norm(sub(stalk[stalk.length - 1], stalk[stalk.length - 4]));
        const a = atan2(tg[1], tg[0]);
        const nn = perp(tg);
        for (let k = 0; k < 3; k++) {
          const off = (k - 1) * U * 1.35;
          const c = add(add(tip, mul(tg, L * 0.12 + U * 0.6)), mul(nn, off));
          drawBead(beadPoly(c, L * 0.12, U * 0.72, a + (k - 1) * 0.08));
        }
        break;
      }
      case 'serrate':
      case 'pectinate': {
        solid(cl, (t) => U * (0.9 - 0.3 * t), n, 0.3);
        const k = P.antType === 'pectinate' ? 3.2 : 1.6;
        for (let i = 2; i < n; i++) {
          const t = (i + 0.6) / n;
          const idx = floor(t * (cl.length - 1));
          const p = cl[idx], q = cl[min(cl.length - 1, idx + 1)];
          const tg = norm(sub(q, p)); const nn = [tg[1], -tg[0]];
          const len = U * k * (1 - 0.3 * t) * 1.5;
          D.line(part, mp([add(p, mul(tg, -U)), add(p, add(mul(nn, len), mul(tg, len * 0.35)))]), { w: max(0.08, U * D.s * (P.antType === 'pectinate' ? 0.55 : 1.1)) / D.pen, tin: 0.05, tout: 0.3, end: 0.3 });
        }
        break;
      }
    }
  }
  function legGeometry(P) {
    // attachment points (right side) and segment angles (from +x, y down, -PI/2 = forward)
    const L = P.legL;
    const att = [[P.Wp * 0.32, -P.Lp * 0.3], [P.We * 0.4, P.Le * 0.07], [P.We * 0.45, P.Le * 0.26]];
    const ang = [
      [-0.42, -0.95, -1.15],
      [0.12, 0.42, 0.62],
      [0.5, 0.92, 1.12],
    ];
    const lens = [[0.5, 0.52, 0.45], [0.55, 0.6, 0.5], [0.62, 0.72, 0.58]];
    return att.map((a, i) => ({ att: a, ang: ang[i].map((x) => x + P.pose[i]), len: lens[i].map((x) => x * L * (1 + 0.06 * i)) }));
  }

  function drawLeg(P, D, C, lg, s, R, li) {
    const mp = (pts) => pts.map((q) => [q[0] * s, q[1]]);
    const W = P.legW * P.Le * 0.022;
    const fe0 = lg.att;
    const feL = lg.len[0];
    const fe1 = add(fe0, mul([cos(lg.ang[0]), sin(lg.ang[0])], feL));
    const ti1 = add(fe1, mul([cos(lg.ang[1]), sin(lg.ang[1])], lg.len[1]));
    // tarsus
    const tarsN = P.tars;
    const taL = lg.len[2];
    const ta = [];
    let q = ti1, a = lg.ang[2];
    for (let i = 0; i < tarsN; i++) {
      const l = taL / tarsN * (i === tarsN - 1 ? 1.6 : 0.85);
      const q2 = add(q, mul([cos(a), sin(a)], l));
      ta.push([q, q2]);
      q = q2; a += 0.05 * (R.f() - 0.5);
    }
    // back to front: claws, tarsus, tibia, femur
    // claws
    {
      const part = D.part('claw');
      const [q0, q1] = ta[ta.length - 1];
      const t = norm(sub(q1, q0));
      for (const k of [-1, 1]) {
        const c = [q1, add(q1, add(mul(t, 0.9 * W), mul(perp(t), 0.35 * k * W))), add(q1, add(mul(t, 1.3 * W), mul(perp(t), 0.75 * k * W)))];
        D.line(part, mp(I.catmull(c, 6)), { w: 0.14, tin: 0.05, tout: 0.6, end: 0.2 });
      }
    }
    for (let i = ta.length - 1; i >= 0; i--) {
      const part = D.part('tarsus');
      const [q0, q1] = ta[i];
      const r = (i === ta.length - 1 ? 0.28 : 0.42) * W;
      const c = mix2(q0, q1, 0.5);
      const l = dist(q0, q1) * 0.55;
      const ang = atan2(q1[1] - q0[1], q1[0] - q0[0]);
      const pts = []; for (let k = 0; k < 22; k++) { const t = k / 22 * I.TAU; pts.push(add(c, rot([cos(t) * l, sin(t) * r * (1 + 0.25 * cos(t))], ang))); }
      const poly = mp(pts);
      D.sil(part, poly);
      for (const [cc, aa] of C.wash) D.tint(part, poly, cc, aa * 0.6);
      D.tint(part, poly, PAL.ink, (1 - C.alb) * 0.3);
      D.contour(part, poly, { w: 0.16, shade: 0.6 });
    }
    // tibia
    {
      const part = D.part('tibia');
      const cl = I.catmull([fe1, add(mix2(fe1, ti1, 0.5), mul(perp(norm(sub(ti1, fe1))), 0.15 * (li === 0 ? -1 : 1))), ti1], 10);
      const r0 = 0.45 * W, r1 = (P.fossorial && li === 0 ? 1.25 : 0.7) * W;
      const rf = (t) => lerp(r0, r1, pow(t, 1.3));
      const tb = S.tube(cl, rf, true, true);
      const poly = mp(tb.poly);
      D.sil(part, poly);
      for (const [cc, aa] of C.wash) D.wash(part, poly, cc, { alpha: aa, layers: 3, amp: 0.15 });
      const F = (u, v) => { const p = S.tubeMap(cl, rf)(u, v); return [p[0] * s, p[1]]; };
      const tone = D.shadeFn(F, (u, v) => rf(u) * sqrt(max(0, 1 - (2 * v - 1) ** 2)), shadeOpt(C, P, { gloss: P.gloss * 0.7 }));
      D.hatch(part, F, tone, { cr: [0.02, 0.98], ar: [0.03, 0.97] });
      D.contour(part, poly, { w: 0.2, shade: 0.8 });
      // spines along the outer edge, apical spurs
      const nsp = P.fossorial && li === 0 ? 3 : R.int(3, 7);
      for (let k = 0; k < nsp; k++) {
        const t = P.fossorial && li === 0 ? 0.55 + k * 0.2 : 0.25 + 0.7 * k / nsp;
        const base = S.tubeMap(cl, rf)(t, li === 0 ? 0 : 1);
        const tg = norm(sub(ti1, fe1));
        const out = mul(perp(tg), li === 0 ? 1 : -1);
        const L = P.fossorial && li === 0 ? 1.4 * W : 0.7 * W;
        const tip = add(base, add(mul(out, L), mul(tg, L * 0.6)));
        if (P.fossorial && li === 0) {
          const tri = [add(base, mul(tg, -0.5 * W)), tip, add(base, mul(tg, 0.5 * W))];
          D.fillPoly(part, mp(tri));
        } else D.line(part, mp([base, tip]), { w: 0.11, tin: 0.05, tout: 0.4, end: 0.15 });
      }
      for (const k of [-1, 1]) {
        const tg = norm(sub(ti1, fe1));
        const b = add(ti1, mul(perp(tg), k * r1 * 0.6));
        D.line(part, mp([b, add(b, add(mul(tg, 1.1 * W), mul(perp(tg), k * 0.3 * W)))]), { w: 0.12, tin: 0.05, tout: 0.5, end: 0.15 });
      }
    }
    // femur
    {
      const part = D.part('femur');
      const cl = I.catmull([fe0, add(mix2(fe0, fe1, 0.5), mul(perp(norm(sub(fe1, fe0))), 0.25)), fe1], 10);
      const rf = (t) => W * (0.55 + 0.45 * sin(PI * pow(clamp(t, 0, 1), 0.8))) * (li === 2 ? 1.15 : 1);
      const tb = S.tube(cl, rf, true, true);
      const poly = mp(tb.poly);
      D.sil(part, poly);
      for (const [cc, aa] of C.wash) D.wash(part, poly, cc, { alpha: aa, layers: 3, amp: 0.15 });
      const F = (u, v) => { const p = S.tubeMap(cl, rf)(u, v); return [p[0] * s, p[1]]; };
      const tone = D.shadeFn(F, (u, v) => rf(u) * sqrt(max(0, 1 - (2 * v - 1) ** 2)), shadeOpt(C, P, { gloss: P.gloss * 0.8 }));
      D.hatch(part, F, tone, { cr: [0.02, 0.98], ar: [0.03, 0.97] });
      D.contour(part, poly, { w: 0.22, shade: 0.8 });
    }
  }

  function drawMandible(P, D, C, g, s) {
    const part = D.part('mandible');
    const L = P.Lp * P.mand;
    const b = [P.Wh * P.hwf * 0.55, g.hy0 + 0.8];
    const curl = P.mandCurl;
    const cp = [b, add(b, [L * 0.22, -L * 0.4]), add(b, [L * 0.05, -L * 0.82]), add(b, [-L * 0.32 * curl - 0.4, -L])];
    const cl = I.resample(I.catmull(cp, 16), L / 120);
    const n = cl.length;
    const rb = max(0.8, L * 0.16);
    const rf = (t) => lerp(rb, 0.1, pow(t, 0.75));
    // inner side: the one whose normal points toward the body axis
    const tg0 = norm(sub(cl[min(n - 1, floor(n * 0.5) + 1)], cl[floor(n * 0.5)]));
    const nrm0 = [-tg0[1], tg0[0]];
    const innerSign = (cl[floor(n * 0.5)][0] + nrm0[0]) < cl[floor(n * 0.5)][0] ? 1 : -1;
    // saw-teeth on the inner edge, angled toward the tip
    const nT = P.mandTeeth;
    const th = L * (P.arch === 'stag' ? 0.12 : 0.06);
    const tooth = (t) => {
      let z = 0;
      for (let k = 0; k < nT; k++) {
        const c = 0.3 + 0.42 * (k + 0.5) / nT;
        const w = 0.07;
        const d = (t - c) / w;
        if (d > -1 && d < 0.6) z = max(z, th * (d < 0 ? (1 + d) : 1 - d / 0.6) * (1 - 0.2 * k));
      }
      if (P.mandFork) { const d = (t - 0.9) / 0.07; if (d > -1 && d < 0.5) z = max(z, th * 0.9 * (d < 0 ? (1 + d) : 1 - d / 0.5)); }
      return z;
    };
    const rL = (t) => rf(t) + (innerSign > 0 ? tooth(t) : 0);
    const rR = (t) => rf(t) + (innerSign < 0 ? tooth(t) : 0);
    const Lp = [], Rp = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const tg = norm(sub(cl[min(n - 1, i + 1)], cl[max(0, i - 1)]));
      const nn = [-tg[1], tg[0]];
      Lp.push(add(cl[i], mul(nn, rL(t))));
      Rp.push(sub(cl[i], mul(nn, rR(t))));
    }
    // base cap
    const cap = [];
    { const tg = norm(sub(cl[1], cl[0])); const a0 = atan2(tg[1], tg[0]); const r0 = rf(0); for (let k = 1; k < 8; k++) { const a = a0 - PI / 2 - (k / 8) * PI; cap.push(add(cl[0], [cos(a) * r0, sin(a) * r0])); } }
    let poly = Lp.concat(Rp.slice().reverse(), cap);
    poly = poly.map((q) => [q[0] * s, q[1]]);
    D.sil(part, poly);
    for (const [cc, aa] of C.wash) D.wash(part, poly, cc, { alpha: aa, layers: 3, amp: 0.12 });
    // asymmetric radii so the hatching reaches into the teeth
    const F = (u, v) => {
      const i = min(n - 2, floor(u * (n - 1))), f = u * (n - 1) - i;
      const p = mix2(cl[i], cl[i + 1], f);
      const tg = norm(sub(cl[i + 1], cl[i]));
      const nn = [-tg[1], tg[0]];
      const off = v < 0.5 ? -(1 - 2 * v) * rR(u) : (2 * v - 1) * rL(u);
      return [(p[0] + nn[0] * off) * s, p[1] + nn[1] * off];
    };
    const tone = D.shadeFn(F, (u, v) => rf(u) * 0.8 * sqrt(max(0, 1 - (2 * v - 1) ** 2)), shadeOpt(C, P, { alb: min(0.4, C.alb) }));
    D.hatch(part, F, tone, { cr: [0.02, 0.98], ar: [0.02, 0.985] });
    // ridge line
    D.line(part, cl.slice(floor(n * 0.08), floor(n * 0.8)).map((q) => [q[0] * s, q[1]]), { w: 0.08, tin: 1, tout: 2 });
    D.contour(part, poly, { w: 0.24 });
  }

  function drawRostrum(P, D, C, g) {
    const part = D.part('rostrum');
    const L = P.rostrum;
    const w = P.Wh * (0.2 + P.rostW * 0.6);
    const cl = I.catmull([[0, g.hy0 + P.Lh * 0.3], [0, g.hy0 - L * 0.5], [0, g.hy0 - L]], 8);
    const rf = (t) => w * (1.25 - 0.4 * smoothstep(0, 0.35, t) + 0.25 * smoothstep(0.82, 1, t));
    const tb = S.tube(cl, rf, false, true);
    D.sil(part, tb.poly);
    for (const [cc, aa] of C.wash) D.wash(part, tb.poly, cc, { alpha: aa, layers: 3, amp: 0.12 });
    const F = S.tubeMap(cl, rf);
    const tone = D.shadeFn(F, (u, v) => rf(u) * sqrt(max(0, 1 - (2 * v - 1) ** 2)), shadeOpt(C, P, { gloss: P.gloss * 0.8 }));
    // the tip carries the mouthparts, engraved dark
    const toneT = (u, v) => max(tone(u, v), 0.78 * smoothstep(0.84, 0.95, u));
    D.hatch(part, F, toneT, { cr: [0.02, 0.98], ar: [0.0, 0.995] });
    const tipC = [0, g.hy0 - L], rt = rf(1);
    const cap = []; for (let i = 0; i <= 16; i++) { const a = PI + PI * i / 16; cap.push([tipC[0] + cos(a) * rt * 1.02, tipC[1] + sin(a) * rt * 1.02]); }
    cap.push([rt * 1.02, tipC[1] + rt * 0.5], [-rt * 1.02, tipC[1] + rt * 0.5]);
    D.wash(part, cap, PAL.ink, { alpha: 0.55, layers: 2, amp: 0.02 });
    D.hatch(part, (u, v) => [lerp(-rt, rt, v) * sqrt(max(0, 1 - (1 - u) ** 2)) , tipC[1] - rt * (1 - u) * 0.98], (u, v) => 0.85, { along: 'v', ar: [0.05, 1], cr: [0.05, 0.95], pitch: D.pitch * 0.7, cover: 0.95 });
    D.contour(part, tb.poly, { w: 0.24 });
    // mandibles: two small dark hooks over the tip
    for (const s of [1, -1]) {
      const m = [[s * rt * 0.95, tipC[1] - rt * 0.1], [s * rt * 0.75, tipC[1] - rt * 0.85], [s * rt * 0.2, tipC[1] - rt * 1.25], [s * rt * 0.05, tipC[1] - rt * 1.05], [s * rt * 0.35, tipC[1] - rt * 0.65], [s * rt * 0.45, tipC[1] - rt * 0.05]];
      const mm = I.catmull(m, 4, true);
      D.sil(part, mm);
      D.fillPoly(part, mm);
    }
  }

  function drawHorn(P, D, C, base, L, rb) {
    const part = D.part('horn');
    const curve = (P.hornCurl || 0) * 0.25;
    const cl = I.catmull([base, add(base, [curve * L * 0.1, -L * 0.45]), add(base, [curve * L * 0.25, -L * 0.85]), add(base, [curve * L * 0.12, -L])], 12);
    const rf = (t) => rb * pow(1 - t, 0.9) * (1 + 0.15 * sin(PI * t)) + rb * 0.04;
    const tb = S.tube(cl, rf, false, true);
    D.sil(part, tb.poly);
    for (const [cc, aa] of C.wash) D.wash(part, tb.poly, cc, { alpha: aa, layers: 3, amp: 0.1 });
    const F = S.tubeMap(cl, rf);
    const tone = D.shadeFn(F, (u, v) => rf(u) * sqrt(max(0, 1 - (2 * v - 1) ** 2)), shadeOpt(C, P));
    D.hatch(part, F, tone, { cr: [0.02, 0.98], ar: [0.0, 0.97] });
    D.line(part, S.isoV(F, 0.45, 30, 0.08, 0.85), { w: 0.1, tin: 1, tout: 2 });
    D.contour(part, tb.poly, { w: 0.28 });
  }

  // extents in specimen space
  function boundsBeetle(P) {
    const g = shapes(P);
    const pts = [];
    for (let i = 0; i <= 20; i++) pts.push(g.ely(i / 20, 1), g.pro(i / 20, 1));
    pts.push([0, g.hy0 - P.Lp * P.mand - P.rostrum - (P.horn !== 'none' ? P.hornL : 0)]);
    const legs = legGeometry(P);
    for (const lg of legs) {
      let p = lg.att;
      for (let k = 0; k < 3; k++) { p = add(p, mul([cos(lg.ang[k]), sin(lg.ang[k])], lg.len[k] * (k === 2 ? 1.25 : 1))); pts.push(p); }
    }
    // approximate antenna tips
    const a0 = -PI / 2 + P.antA0 * (P.antType === 'long' ? 1.3 : 1);
    const cl = chainPts([P.Wh * 0.62, g.hy0], a0, P.antType === 'long' ? 0.9 + P.antCurv : P.antCurv, P.antL, 12);
    for (const p of cl) pts.push(p);
    const all = pts.concat(pts.map((p) => [-p[0], p[1]]));
    return I.bbox(all);
  }

  // dimorphism: female stags have short jaws and a narrow head, female scarabs no horn,
  // female longhorns shorter antennae
  function sexify(P, sex) {
    P.sex = sex;
    if (sex !== 'f') return P;
    if (P.arch === 'stag') { P.mand *= 0.3; P.mandTeeth = 1; P.mandFork = false; P.mandCurl *= 0.6; P.Wh *= 0.8; P.hwf = min(P.hwf, 0.72); P.Lh *= 0.85; }
    if (P.arch === 'scarab') P.horn = 'none';
    if (P.arch === 'longhorn') P.antL *= 0.62;
    return P;
  }

  G.BEETLE = { genBeetle, drawBeetle, boundsBeetle, shapes, legGeometry, chainPts, sexify };
})(typeof globalThis !== 'undefined' ? globalThis : this);

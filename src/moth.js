// moths and butterflies: set specimens, dorsal view, wings spread.
// wings are fans in polar (u, pn) coordinates from the wing base; veins, cross-lines, bands,
// ocelli and the engraved scale texture all live in that space
(function (G) {
  'use strict';
  const I = G.INK, S = G.SPEC;
  const { PI, sin, cos, sqrt, abs, min, max, floor, pow, atan2 } = Math;
  const { clamp, lerp, smooth, smoothstep, add, sub, mul, dist, norm, perp } = I;
  const PAL = S.PAL;

  // smooth 1-d interpolation through (x, y) pairs, x ascending
  function interp1(cp) {
    return function (x) {
      if (x <= cp[0][0]) return cp[0][1];
      if (x >= cp[cp.length - 1][0]) return cp[cp.length - 1][1];
      let i = 1; while (cp[i][0] < x) i++;
      const p0 = cp[max(0, i - 2)], p1 = cp[i - 1], p2 = cp[i], p3 = cp[min(cp.length - 1, i + 1)];
      const t = (x - p1[0]) / (p2[0] - p1[0]);
      const m1 = (p2[1] - p0[1]) / ((p2[0] - p0[0]) || 1) * (p2[0] - p1[0]);
      const m2 = (p3[1] - p1[1]) / ((p3[0] - p1[0]) || 1) * (p2[0] - p1[0]);
      const t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2;
    };
  }

  function genMoth(seed, force) {
    const R = I.makeRng('moth:' + seed);
    const r = (a, b) => R.range(a, b);
    const P = { family: 'moth', seed: String(seed) };
    const kind = P.kind = force || R.wpick([['noctuid', 2], ['geometrid', 2], ['emperor', 2.5], ['hawk', 1.5], ['tiger', 1.5], ['butterfly', 2], ['swallowtail', 1.2]]);
    P.arch = kind;
    // forewing
    P.fL = 46 * r(0.92, 1.08);
    const shapeF = {
      noctuid: [[0, 1], [0.08, r(1.0, 1.04)], [0.3, r(0.84, 0.9)], [0.6, r(0.72, 0.78)], [0.88, r(0.62, 0.68)], [1, r(0.52, 0.58)]],
      geometrid: [[0, 1], [0.08, r(1.0, 1.06)], [0.3, r(0.9, 0.96)], [0.6, r(0.82, 0.88)], [0.88, r(0.7, 0.76)], [1, r(0.56, 0.62)]],
      emperor: [[0, 1], [0.07, r(1.02, 1.1)], [0.25, r(0.9, 0.95)], [0.6, r(0.84, 0.9)], [0.88, r(0.76, 0.82)], [1, r(0.64, 0.7)]],
      hawk: [[0, 1], [0.06, r(1.04, 1.1)], [0.3, r(0.78, 0.84)], [0.6, r(0.6, 0.66)], [0.88, r(0.48, 0.54)], [1, r(0.42, 0.46)]],
      tiger: [[0, 1], [0.08, r(1.0, 1.03)], [0.3, r(0.86, 0.9)], [0.6, r(0.74, 0.8)], [0.88, r(0.64, 0.7)], [1, r(0.55, 0.6)]],
      butterfly: [[0, 1], [0.08, r(1.0, 1.05)], [0.3, r(0.88, 0.94)], [0.6, r(0.78, 0.84)], [0.88, r(0.68, 0.74)], [1, r(0.6, 0.66)]],
      swallowtail: [[0, 1], [0.08, r(1.02, 1.06)], [0.3, r(0.86, 0.9)], [0.6, r(0.74, 0.78)], [0.88, r(0.66, 0.7)], [1, r(0.6, 0.64)]],
    }[kind];
    P.falcate = kind === 'emperor' && R.chance(0.5) ? r(0.04, 0.1) : kind === 'geometrid' && R.chance(0.3) ? r(0.03, 0.07) : 0;
    P.fShape = shapeF;
    P.fPhiC = kind === 'hawk' ? r(-0.48, -0.38) : r(-0.6, -0.45);
    P.fPhiI = kind === 'hawk' ? r(0.1, 0.22) : r(0.12, 0.3);
    P.fBend = r(-0.05, 0.02);
    P.nVf = R.int(10, 12);
    P.fScal = kind === 'geometrid' || kind === 'emperor' ? r(0, 0.025) : r(0, 0.01);
    // hindwing
    P.hL = P.fL * (kind === 'hawk' ? r(0.55, 0.62) : kind === 'emperor' ? r(0.78, 0.88) : r(0.7, 0.8));
    P.hPhiC = r(-0.2, -0.05);
    P.hPhiI = r(1.15, 1.4);
    P.hShape = kind === 'hawk'
      ? [[0, 0.95], [0.2, 1], [0.5, r(0.86, 0.92)], [0.8, r(0.7, 0.76)], [1, r(0.52, 0.6)]]
      : [[0, r(0.85, 0.92)], [0.2, 1], [0.5, r(0.95, 1.02)], [0.75, r(0.88, 0.95)], [1, r(0.56, 0.66)]];
    P.nVh = R.int(8, 9);
    P.hScal = kind === 'geometrid' || kind === 'swallowtail' || kind === 'emperor' ? r(0.01, 0.045) : r(0, 0.012);
    P.tail = kind === 'swallowtail' ? { at: r(0.74, 0.8), len: r(0.42, 0.58), w: r(0.02, 0.026) } : (kind === 'emperor' && R.chance(0.25) ? { at: r(0.66, 0.72), len: r(0.5, 0.9), w: r(0.05, 0.07) } : null);
    // body
    const bs = kind === 'hawk' ? 1.25 : kind === 'butterfly' || kind === 'swallowtail' || kind === 'geometrid' ? 0.75 : kind === 'emperor' ? 1.1 : 1;
    P.thRx = 3.4 * bs; P.thRy = 4.8 * bs;
    P.abL = (kind === 'hawk' ? 30 : 22) * r(0.9, 1.1) * (kind === 'geometrid' ? 0.85 : 1);
    P.abW = 3.0 * bs * r(0.9, 1.1);
    P.headR = 2.1 * (0.7 + 0.3 * bs);
    P.ant = kind === 'butterfly' || kind === 'swallowtail' ? 'clubbed' : kind === 'emperor' ? 'bipectinate' : kind === 'hawk' ? 'hooked' : R.wpick([['bipectinate', 1], ['filiform', 1.4]]);
    P.antL = P.fL * (P.ant === 'clubbed' ? r(0.5, 0.6) : P.ant === 'bipectinate' ? r(0.32, 0.42) : r(0.45, 0.6));
    P.antPect = P.ant === 'bipectinate' ? r(1.6, 2.8) : 0.4;
    P.antA = r(-0.35, -0.15);
    P.furry = kind === 'butterfly' || kind === 'swallowtail' ? 0.5 : 1;
    // pattern and colour
    P.patSeed = R.int(0, 1e6);
    const schemes = {
      noctuid: [['straw', 2], ['umber', 2], ['slate', 1]],
      geometrid: [['pale', 3], ['slate', 1], ['straw', 1]],
      emperor: [['ochre', 2], ['rose', 1.5], ['sienna', 1.5], ['straw', 1]],
      hawk: [['slate', 2], ['umber', 2]],
      tiger: [['ink', 3], ['umber', 1]],
      butterfly: [['sienna', 2], ['ochre', 2], ['indigo', 1.5], ['pale', 1]],
      swallowtail: [['straw', 2], ['pale', 1]],
    }[kind];
    P.scheme = R.wpick(schemes);
    P.colour = P.scheme;
    P.eyeF = kind === 'emperor' ? R.chance(0.75) : kind === 'butterfly' ? R.chance(0.35) : false;
    P.eyeH = kind === 'emperor' ? true : kind === 'butterfly' ? R.chance(0.5) : kind === 'swallowtail' ? true : kind === 'geometrid' ? R.chance(0.15) : false;
    P.eyeSize = r(0.8, 1.2);
    P.hindColour = kind === 'hawk' ? R.pick(['madder', 'rose', 'ochre']) : kind === 'tiger' ? R.pick(['madder', 'ochre']) : null;
    P.lineStyle = R.wpick([['single', 2], ['double', 1.5], ['dotted', 0.6]]);
    P.am = r(0.26, 0.36); P.pm = r(0.6, 0.7); P.st = r(0.82, 0.88);
    P.reniform = kind !== 'butterfly' && kind !== 'swallowtail' && R.chance(0.8);
    P.lineCount = kind === 'geometrid' ? R.int(4, 7) : 3;
    return P;
  }

  const SCHEME = {
    straw: { g: [[PAL.straw, 0.55]], g2: [PAL.umber, 0.35], alb: 0.7, ink: 0.5 },
    umber: { g: [[PAL.umber, 0.45], [PAL.straw, 0.25]], g2: [PAL.umber, 0.45], alb: 0.5, ink: 0.65 },
    slate: { g: [[PAL.slate, 0.4], [PAL.straw, 0.2]], g2: [PAL.indigo, 0.35], alb: 0.6, ink: 0.55 },
    pale: { g: [[PAL.straw, 0.22]], g2: [PAL.slate, 0.25], alb: 0.85, ink: 0.4 },
    ochre: { g: [[PAL.ochre, 0.6]], g2: [PAL.sienna, 0.45], alb: 0.65, ink: 0.45 },
    rose: { g: [[PAL.rose, 0.5], [PAL.straw, 0.2]], g2: [PAL.madder, 0.4], alb: 0.65, ink: 0.45 },
    sienna: { g: [[PAL.sienna, 0.55], [PAL.ochre, 0.25]], g2: [PAL.umber, 0.45], alb: 0.55, ink: 0.5 },
    indigo: { g: [[PAL.indigo, 0.55]], g2: [PAL.ink, 0.25], alb: 0.5, ink: 0.55 },
    ink: { g: [[PAL.umber, 0.35]], g2: [PAL.ink, 0.3], alb: 0.25, ink: 0.85 },
  };

  // wing model
  function makeWing(P, which) {
    const fw = which === 'f';
    const L = fw ? P.fL : P.hL;
    const phiC = fw ? P.fPhiC : P.hPhiC - 0.14, phiI = fw ? P.fPhiI : P.hPhiI;
    const base = fw ? [P.thRx * 0.55, -P.thRy * 0.35] : [P.thRx * 0.5, -P.thRy * 0.08];
    const nV = fw ? P.nVf : P.nVh;
    const shape = interp1(fw ? P.fShape : P.hShape);
    const scal = fw ? P.fScal : P.hScal;
    // vein ends, denser toward the apex on the forewing
    const vends = [];
    for (let k = 0; k < nV; k++) { let t = (k + 0.5) / nV; if (fw) t = pow(t, 1.25); vends.push(lerp(0.02, 0.97, t)); }
    const Rn = (pn) => {
      let r = shape(pn);
      if (fw && P.falcate) r *= 1 + P.falcate * (smoothstep(0.0, 0.06, pn) - 1.6 * smoothstep(0.06, 0.2, pn) * (1 - smoothstep(0.2, 0.35, pn)));
      if (scal > 0) {
        let k = 0; while (k < vends.length - 1 && vends[k + 1] < pn) k++;
        const a = pn < vends[0] ? 0 : vends[k], b = pn < vends[0] ? vends[0] : (k + 1 < vends.length ? vends[k + 1] : 1);
        const t = clamp((pn - a) / ((b - a) || 1), 0, 1);
        r *= 1 - scal * pow(sin(PI * t), 1.2) * smoothstep(0.02, 0.1, pn) * smoothstep(1.0, 0.92, pn);
      }
      if (!fw && P.tail) {
        const d = (pn - P.tail.at) / P.tail.w;
        // strap-like tail: flat top, soft shoulders, slightly spatulate
        if (P.kind === 'swallowtail') {
          const strap = 1 / (1 + pow(abs(d) / 1.0, 4)) * (1 + 0.25 * Math.exp(-pow((d) / 0.8, 2)));
          r += P.tail.len * strap;
        } else r += P.tail.len * Math.exp(-d * d * (d > 0 ? 2.4 : 1.6));
      }
      return r;
    };
    const bend = fw ? P.fBend : 0.02;
    const F = (u, pn) => {
      const ph = lerp(phiC, phiI, pn);
      const d = [cos(ph), sin(ph)];
      const rr = u * L * Rn(pn);
      const b = bend * L * u * (1 - u) * (1 - pn);
      return [base[0] + d[0] * rr - d[1] * b, base[1] + d[1] * rr + d[0] * b];
    };
    const cell = fw ? { a: 0.17, b: 0.56, u0: 0.5, u1: 0.44 } : { a: 0.24, b: 0.62, u0: 0.42, u1: 0.38 };
    return { fw, L, F, Rn, vends, cell, base, phiC, phiI };
  }

  function wingOutline(W, n) {
    n = n || 120;
    const o = [W.F(0, 0)];
    for (let i = 1; i <= 30; i++) o.push(W.F(i / 30, 0));
    for (let i = 1; i <= n; i++) o.push(W.F(1, i / n));
    for (let i = 29; i >= 1; i--) o.push(W.F(i / 30, 1));
    return S.dedupe(o);
  }

  // veins as (u,pn) polylines
  function wingVeins(W) {
    const V = [];
    const { a, b, u0, u1 } = W.cell;
    const uc = (pn) => lerp(u0, u1, (pn - a) / (b - a));
    const path = (s0, p0, p1) => { const o = []; for (let i = 0; i <= 24; i++) { const t = i / 24; o.push([lerp(s0, 1, t), lerp(p0, p1, smooth(pow(t, 0.8)))]); } return o; };
    // cell boundaries
    const cellA = [], cellB = [], cellEnd = [];
    for (let i = 0; i <= 12; i++) { cellA.push([lerp(0.02, uc(a), i / 12), a * (0.6 + 0.4 * i / 12)]); cellB.push([lerp(0.02, uc(b), i / 12), b * (0.9 + 0.1 * i / 12)]); }
    for (let i = 0; i <= 10; i++) { const pn = lerp(a, b, i / 10); cellEnd.push([uc(pn), pn]); }
    V.push(cellA, cellB, cellEnd);
    // subcosta
    V.push(path(0.02, 0.05, 0.0).filter((q) => q[0] < 0.75));
    const ends = W.vends;
    const front = ends.filter((x) => x < a), mid = ends.filter((x) => x >= a && x <= b), back = ends.filter((x) => x > b);
    front.forEach((pe, i) => { const s = lerp(0.18, uc(a), (i + 1) / (front.length + 0.5)); V.push(path(s, a * (0.6 + 0.4 * s / uc(a)), pe)); });
    mid.forEach((pe) => { const pn = clamp(pe, a + 0.02, b - 0.02); V.push(path(uc(pn), pn, pe)); });
    back.forEach((pe, i) => {
      if (i === back.length - 1) { V.push(path(0.02, lerp(b, 1, 0.55), pe)); return; }
      const s = lerp(uc(b), 0.22, (i + 1) / (back.length + 0.2));
      V.push(path(s, b * (0.9 + 0.1 * s / uc(b)), pe));
    });
    return V;
  }

  // wing pattern in (u, pn)
  function wingPattern(P, W, R) {
    const fw = W.fw;
    const N = I.makeNoise('mp:' + P.seed + (fw ? 'f' : 'h'));
    const sch = SCHEME[P.scheme];
    const kind = P.kind;
    const lines = [];
    const vends = W.vends;
    const tooth = (pn, amp) => { // teeth pointing outward at the veins
      let d = 1; for (const v of vends) d = min(d, abs(pn - v));
      const sp = 1 / vends.length;
      return amp * (1 - smoothstep(0, sp * 0.5, d));
    };
    const mkLine = (u0, amp, ph, tAmp) => (pn) => u0 + amp * sin(pn * 3.2 + ph) + 0.03 * N.n1(pn * 4 + ph) + tooth(pn, tAmp);
    let AM = null, PM = null, ST = null;
    if (kind !== 'butterfly' && kind !== 'swallowtail') {
      if (fw) {
        const emp = kind === 'emperor';
        AM = mkLine(emp ? min(P.am, 0.28) : P.am, 0.04, R.range(0, 6), R.range(0.0, 0.04));
        PM = mkLine(emp ? max(P.pm + 0.06, 0.72) : P.pm, 0.04, R.range(0, 6), R.range(0.02, 0.07));
        ST = mkLine(P.st, 0.03, R.range(0, 6), R.range(0.0, 0.03));
        lines.push(AM, PM, ST);
        if (kind === 'geometrid') for (let k = 3; k < P.lineCount; k++) lines.push(mkLine(R.range(0.15, 0.9), 0.03, R.range(0, 6), 0.02));
      } else if (kind === 'geometrid' || kind === 'emperor' || kind === 'noctuid') {
        PM = mkLine(kind === 'emperor' ? 0.8 : P.pm * 0.95, 0.04, R.range(0, 6), R.range(0.0, 0.05));
        lines.push(PM);
        if (kind === 'geometrid') for (let k = 2; k < P.lineCount - 1; k++) lines.push(mkLine(R.range(0.25, 0.9), 0.03, R.range(0, 6), 0.02));
      }
    }
    // ocelli
    const eyes = [];
    if ((fw && P.eyeF) || (!fw && P.eyeH)) {
      const pn = fw ? lerp(W.cell.a, W.cell.b, 0.55) : (kind === 'swallowtail' ? clamp(P.tail ? P.tail.at + 0.12 : 0.88, 0.7, 0.94) : lerp(W.cell.a, W.cell.b, kind === 'emperor' ? 0.62 : 0.5));
      const u = fw ? W.cell.u0 * 1.02 : (kind === 'swallowtail' ? 0.86 : kind === 'emperor' ? 0.5 : 0.55);
      eyes.push({ u, pn, r: (fw ? 0.11 : 0.16) * P.eyeSize * (kind === 'swallowtail' ? 0.5 : 1) });
    }
    if (kind === 'butterfly' && !fw && P.eyeH) eyes.push({ u: 0.78, pn: 0.35, r: 0.07 * P.eyeSize });
    // ocelli are round in specimen space, not in (u, pn)
    for (const e of eyes) {
      e.c = W.F(e.u, e.pn);
      const a = W.F(e.u + 0.01, e.pn), b = W.F(e.u, e.pn + 0.01);
      const su = dist(a, e.c) / 0.01, sp = dist(b, e.c) / 0.01;
      e.rs = e.r * sqrt(su * sp * 1.25);
    }
    for (const e of eyes) e.a0 = atan2(W.base[1] - e.c[1], W.base[0] - e.c[0]) - 0.35;
    // each ring boundary has its own low-order radial noise and the inner rings drift toward
    // the body; emperor eyes are drawn out along the veins, the window off-centre
    for (const e of eyes) {
      const RO = I.makeRng('ocel:' + P.seed + (fw ? 'f' : 'h'));
      const ph = []; for (let k = 0; k < 16; k++) ph.push(RO.range(0, 2 * PI));
      const tb = e.a0 + 0.35;
      e.dirB = [cos(tb), sin(tb)];
      const ea = kind === 'emperor' ? 1.09 : 1, eb = kind === 'emperor' ? 0.93 : 1; // along, across the veins
      e.ell = [ea, eb];
      const offR = (r) => kind === 'emperor' ? 0.05 * smoothstep(1.12, 0.64, r) + 0.12 * smoothstep(0.64, 0.3, r) : 0.04 * smoothstep(1.12, 0.25, r);
      e.B = (r, th) => {
        const k = Math.round(r * 50);
        const n = 1 + 0.012 * sin(3 * th + ph[k % 16]) + 0.007 * sin(5 * th + ph[(k + 5) % 16]) + 0.004 * sin(9 * th + ph[(k + 11) % 16]);
        const off = offR(r) * e.rs;
        const x = cos(th) * r * e.rs * n, y = sin(th) * r * e.rs * n;
        const al = x * e.dirB[0] + y * e.dirB[1], ac = -x * e.dirB[1] + y * e.dirB[0];
        // the window is an oval drawn out along the veins
        const wk = kind === 'emperor' ? smoothstep(0.5, 0.3, r) : 0;
        const ea2 = ea * (1 + 0.2 * wk), eb2 = eb * (1 - 0.12 * wk);
        const X = al * ea2 * e.dirB[0] - ac * eb2 * e.dirB[1], Y = al * ea2 * e.dirB[1] + ac * eb2 * e.dirB[0];
        return [e.c[0] + e.dirB[0] * off + X, e.c[1] + e.dirB[1] * off + Y];
      };
    }
    // outer rim: hairline toward the body, full width distally (outer radius 1.02..1.12)
    for (const e of eyes) {
      const tb = atan2(e.dirB[1], e.dirB[0]);
      e.rimF = (th) => kind === 'emperor' ? 0.25 + 0.75 * pow(0.5 - 0.5 * cos(th - tb), 1.3) : 1;
      e.rimR = (th) => 1.02 + 0.1 * e.rimF(th);
      e.rimP = (th) => { const a = e.B(1.02, th), b = e.B(1.12, th), f = e.rimF(th); return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)]; };
    }
    // normalised elliptical distance from the ocellus centre
    const eyeDp = (e, p) => {
      const d = sub(p, e.c);
      const al = d[0] * e.dirB[0] + d[1] * e.dirB[1], ac = -d[0] * e.dirB[1] + d[1] * e.dirB[0];
      return Math.hypot(al / e.ell[0], ac / e.ell[1]) / e.rs;
    };
    const eyeD = (e, u, pn) => eyeDp(e, W.F(u, pn));
    // pale crescent inside the iris ring, facing the wing base
    const cresIn = (e, p) => {
      const d = eyeDp(e, p);
      let da = atan2(p[1] - e.c[1], p[0] - e.c[0]) - e.a0;
      while (da > PI) da -= 2 * PI; while (da < -PI) da += 2 * PI;
      const span = 0.95;
      if (abs(da) > span) return 0;
      const th = 0.075 * cos(da / span * PI / 2);
      return smoothstep(th + 0.012, th - 0.012, abs(d - 0.72));
    };
    const spots = [];
    if (kind === 'tiger') {
      if (fw) {
        // cream blotches in a loose network between the veins
        for (const u of [0.3, 0.56, 0.8]) for (let i = 0; i < vends.length - 1; i += 2) {
          if (R.f() < 0.25) continue;
          const pn = (vends[i] + vends[i + 1]) / 2 + R.range(-0.02, 0.02);
          spots.push({ u: u + R.range(-0.04, 0.04), pn, r: R.range(0.055, 0.085), e: R.range(1.1, 1.6) });
        }
      } else {
        spots.push({ u: 0.42, pn: lerp(W.cell.a, W.cell.b, 0.5), r: 0.07, e: 1.3 });
        for (let i = 0; i < vends.length - 1; i += 2) spots.push({ u: 0.78 + R.range(-0.03, 0.03), pn: (vends[i] + vends[i + 1]) / 2, r: R.range(0.05, 0.07), e: 1.2 });
      }
    }
    if (kind === 'butterfly') { // submarginal white spots in a dark border
      for (let i = 0; i < vends.length - 1; i++) spots.push({ u: 0.92, pn: (vends[i] + vends[i + 1]) / 2, r: 0.025, e: 1.3, white: true });
      if (fw) for (let i = 0; i < 3; i++) spots.push({ u: 0.72 + i * 0.03, pn: 0.12 + i * 0.07, r: 0.04, e: 1.4, white: true });
    }
    if (kind === 'swallowtail' && !fw && P.sex === 'f') for (let i = 1; i < vends.length - 2; i++) spots.push({ u: 0.885, pn: (vends[i] + vends[i + 1]) / 2, r: 0.032, e: 1.25, white: true, col: PAL.indigo });
    const border = (kind === 'butterfly' ? 0.86 : kind === 'swallowtail' ? 0.8 : (!fw && (kind === 'noctuid' || kind === 'hawk' || kind === 'tiger')) ? 0.72 : 2) - (P.sex === 'f' && (kind === 'swallowtail' || kind === 'butterfly') ? 0.06 : 0);
    // hindwing stripes start clear of the forewing's inner margin
    const stripes = kind === 'swallowtail' && fw ? [0.12, 0.3, 0.48, 0.66] : kind === 'swallowtail' ? [0.3, 0.5] : null;
    const hawkStreak = kind === 'hawk' && fw;

    // emperor: pale postmedian band, apical zig-zag, windows in the ocelli
    const emperor = kind === 'emperor';
    const bandW = emperor ? 0.045 : 0;
    const pale = (u, pn) => {
      let p = 0;
      if (emperor && PM) { const b = PM(pn); p = max(p, smoothstep(b - 0.004, b + 0.006, u) * smoothstep(b + bandW + 0.006, b + bandW - 0.004, u)); }
      if (emperor && fw) { const z = 0.86 + 0.05 * abs(((pn * 22) % 2) - 1) - 0.02; if (pn < 0.22) p = max(p, smoothstep(0.012, 0.0, abs(u - z)) * smoothstep(0.24, 0.16, pn)); }
      for (const e of eyes) { const d = eyeD(e, u, pn); if (emperor) { p = max(p, smoothstep(0.34, 0.26, d)); if (d < 0.85) p = max(p, cresIn(e, W.F(u, pn))); } }
      return p;
    };
    // engraving tone in (u, pn)
    const tone0 = (u, pn) => {
      let t = (1 - sch.alb) * 0.35;
      t += 0.18 * smoothstep(0.3, 0.0, u); // hairy base
      if (AM && PM) { const a = AM(pn), b = PM(pn); if (u > a && u < b) t += (kind === 'geometrid' ? 0.05 : 0.18) * (0.6 + 0.4 * N.n2(u * 6, pn * 6)); }
      if (fw && ST) t += 0.12 * smoothstep(0.03, 0, abs(u - ST(pn) + 0.04));
      for (const L of lines) { const d = abs(u - L(pn)); t += 0.35 * smoothstep(0.04, 0.0, d) * (kind === 'geometrid' ? 0.6 : 1); }
      if (u > border) t = max(t, 0.8 * smoothstep(border, border + 0.03, u));
      if (stripes) for (const s of stripes) { if (abs(pn - s - 0.04 * u) < 0.045) t = max(t, 0.85); }
      if (hawkStreak) { const c = 0.4 + 0.25 * u; t += 0.35 * smoothstep(0.08, 0.0, abs(pn - c)) * smoothstep(0.2, 0.5, u); }
      if (kind === 'tiger') t = max(t, (1 - sch.alb) * (fw ? 0.85 : 0.2));
      for (const s of spots) { const d = sqrt(((u - s.u) / s.r) ** 2 + ((pn - s.pn) / (s.r * s.e)) ** 2); if (d < 1.05) t = s.white || kind === 'tiger' && fw ? t * smoothstep(0.85, 1.05, d) : max(t, 0.8 * smoothstep(1.05, 0.85, d)); }
      for (const e of eyes) {
        const d = eyeD(e, u, pn);
        if (kind === 'emperor' && d < e.rimR(atan2(W.F(u, pn)[1] - e.c[1], W.F(u, pn)[0] - e.c[0])) - 0.01) return 0;
        if (d < 1.15) {
          let v = 0;
          if (d > (kind === 'emperor' ? 1.02 : 0.82)) v = 0.85 * smoothstep(1.15, 1.0, d); // outer dark ring
          else if (d > 0.5) v = kind === 'emperor' ? (d < 0.66 ? 0.45 : d < 0.8 ? 0.2 : 0.04) : 0.12; // coloured rings
          else if (d > 0.2) v = 0.9; // iris
          else v = 0.0; // pupil
          t = d > 0.82 ? max(t * smoothstep(0.9, 1.1, d), v) : v;
        }
      }
      if (P.reniform && fw) {
        const d = sqrt(((u - W.cell.u0 * 0.98) / 0.05) ** 2 + ((pn - lerp(W.cell.a, W.cell.b, 0.55)) / 0.1) ** 2);
        if (d < 1) t = max(t, 0.25 + 0.5 * smoothstep(0.6, 1, d));
      }
      if (emperor && PM) { const b = PM(pn) + bandW; t += 0.25 * smoothstep(0.0, 0.01, u - b) * smoothstep(0.08, 0.02, u - b); }
      if (emperor && fw && pn < 0.2 && u > 0.82) t += 0.3 * smoothstep(0.82, 0.9, u) * smoothstep(0.2, 0.08, pn);
      return clamp(t * sch.ink / 0.5 * (P.sex === 'f' ? 0.9 : 1), 0, 1);
    };
    // a thin bare rim along the forewing's inner margin, so the overlap reads as two wings
    const rimK = fw ? (kind === 'butterfly' || kind === 'swallowtail' ? 1 : 0.7) : 0;
    const tone = (u, pn) => tone0(u, pn) * (1 - pale(u, pn)) * (rimK ? 1 - rimK * smoothstep(0.982, 0.997, pn) * smoothstep(0.15, 0.45, u) : 1);
    return { tone, lines, eyes, spots, border, stripes, AM, PM, bandW, eyeD };
  }

  // saturniid ocellus engraved ring by ring: black rim, ochre, indigo with a pale crescent,
  // black iris, window. lit from the upper left so it reads as a cushion, not a flat target
  function drawOcellus(D, part, e, s) {
    const L2 = [-0.63, -0.78];
    const cM = [(e.c[0]) * s, e.c[1]];
    const th0 = e.a0 + 2.1; // seam angle, hidden on the dark lower side
    const ringF = (r0, r1) => (u, v) => { const th = th0 + u * 2 * PI; const a = e.B(r0, th), b = e.B(r1, th); return [lerp(a[0], b[0], v) * s, lerp(a[1], b[1], v)]; };
    const lit = (p) => { const q = norm(sub(p, cM)); return q[0] * L2[0] + q[1] * L2[1]; };
    const poly = (r) => { const o = []; for (let i = 0; i < 120; i++) { const p = e.B(r, i / 120 * 2 * PI); o.push([p[0] * s, p[1]]); } return o; };
    // pale crescent between the indigo boundaries, facing the wing base
    const span = 0.95, cres = [];
    const cr = (da, sg) => { const th = e.a0 + da; const t = 0.075 * cos(da / span * PI / 2); const f = (0.8 - (0.72 + sg * t)) / 0.16; const a = e.B(0.8, th), b = e.B(0.64, th); return [lerp(a[0], b[0], f) * s, lerp(a[1], b[1], f)]; };
    for (let i = 0; i <= 30; i++) cres.push(cr(-span + 2 * span * i / 30, 1));
    for (let i = 30; i >= 0; i--) cres.push(cr(-span + 2 * span * i / 30, -1));
    const inCres = (p) => I.pip(p, cres);
    // glazes, barely deformed
    const rimPoly = () => { const o = []; for (let i = 0; i < 120; i++) { const p = e.rimP(i / 120 * 2 * PI); o.push([p[0] * s, p[1]]); } return o; };
    // the rim gets only a light glaze, the engraving carries it
    D.washHoles(part, rimPoly(), [poly(1.02)], PAL.ink, { alpha: 0.16, layers: 3, amp: 0.04 });
    const rings = [[1.02, 0.8, PAL.ochre, 0.6, []], [0.8, 0.64, PAL.indigo, 0.5, [cres]], [0.64, 0.3, PAL.ink, 0.55, []]];
    for (const [r0, r1, c, a, extra] of rings) D.washHoles(part, poly(r0), [poly(r1)].concat(extra), c, { alpha: a, layers: 3, amp: 0.04 });
    D.wash(part, poly(0.81), PAL.sienna, { alpha: 0.12, layers: 2, amp: 0.03 }); // warm the ochre's inner edge
    D.wash(part, cres, PAL.straw, { alpha: 0.25, layers: 2, amp: 0.02 });
    D.wash(part, poly(0.3), PAL.straw, { alpha: 0.13, layers: 2, amp: 0.02 }); // paper-tone glaze in the window
    // engraving
    const pitch = D.pitch * 0.9;
    { const F = (u, v) => { const th = th0 + u * 2 * PI; const a = e.rimP(th), b = e.B(1.02, th); return [lerp(a[0], b[0], v) * s, lerp(a[1], b[1], v)]; };
      D.hatch(part, F, (u, v) => clamp(0.42 + 0.16 * -lit(F(u, v)) + 0.22 * e.rimF(th0 + u * 2 * PI), 0, 1), { along: 'u', ar: [-0.012, 1.012], cr: [0.04, 0.96], pitch: pitch * 0.8, cover: 0.9, wmin: 0.03 }); }
    { const F = ringF(1.02, 0.8); D.hatch(part, F, (u, v) => { const p = F(u, v); return clamp(0.2 + 0.16 * -lit(p) + 0.18 * smoothstep(0.55, 1, v), 0, 1); }, { along: 'v', ar: [0.03, 0.97], cr: [0, 1], pitch: pitch * 1.05, cover: 0.8, wmin: 0.035 }); }
    { const F = ringF(0.8, 0.64); D.hatch(part, F, (u, v) => { const p = F(u, v); return inCres(p) ? 0 : clamp(0.4 + 0.2 * -lit(p), 0, 1); }, { along: 'u', ar: [-0.012, 1.012], cr: [0.05, 0.95], pitch, cover: 0.85 }); }
    { const F = ringF(0.64, 0.3); const tn = (u, v) => clamp(0.8 + 0.15 * -lit(F(u, v)) - 0.12 * smoothstep(0.75, 1, v), 0, 1);
      D.hatch(part, F, tn, { along: 'u', ar: [-0.012, 1.012], cr: [0.02, 0.98], pitch, cover: 0.9, cross: true, crossFrom: 0.62, cap: 0.7, crossPitch: 1.2 }); }
    { const F = ringF(0.3, 0.0); D.hatch(part, F, (u, v) => { const l = lit(F(u, v)); return clamp(0.32 * smoothstep(0.1, -0.7, l) * smoothstep(0.55, 0.05, v), 0, 1); }, { along: 'u', ar: [0, 1], cr: [0, 0.6], pitch: pitch * 0.8, cover: 0.7, wmin: 0.03 }); }
    // cut lines: outer edge and window rim
    const ring = (r, w) => { const o = poly(r); D.lineP(part, D.Ps(o.concat([o[0], o[1]])), { w, tin: 0, tout: 0, end: 1, wn: 0.2 }); };
    { const o = rimPoly(); D.lineP(part, D.Ps(o.concat([o[0], o[1]])), { w: 0.08, tin: 0, tout: 0, end: 1, wn: 0.25 }); }
    ring(1.02, 0.05); ring(0.3, 0.1); ring(0.8, 0.05);
  }

  // draw
  function drawMoth(P, D) {
    const sch = SCHEME[P.scheme];
    const R = I.makeRng('moth-draw:' + P.seed);
    const Wf = makeWing(P, 'f'), Wh = makeWing(P, 'h');
    for (const W of [Wh, Wf]) {
      for (const s of [1, -1]) drawWing(P, D, W, s, sch, R);
    }
    drawBody(P, D, sch, R);
  }

  function drawWing(P, D, W, s, sch, R) {
    const part = D.part(W.fw ? 'forewing' : 'hindwing');
    const Fm = (u, pn) => { const p = W.F(u, pn); return [p[0] * s, p[1]]; };
    const outline = wingOutline({ F: Fm }, 140);
    D.sil(part, outline);
    const pat = wingPattern(P, W, I.makeRng('pat:' + P.seed + W.fw));
    const kind = P.kind;
    // ground glazes
    const groundCols = ((!W.fw && P.hindColour) ? [[PAL[P.hindColour], 0.55]] : sch.g).map(([c, a]) => [c, a * (P.sex === 'f' ? 0.8 : 1)]);
    const regionPoly = (f0, f1, n, pmax) => { pmax = pmax || 1; const o = []; for (let i = 0; i <= n; i++) { const pn = i / n * pmax; o.push(Fm(clamp(f0(pn), 0, 1.03), pn)); } for (let i = n; i >= 0; i--) { const pn = i / n * pmax; o.push(Fm(clamp(f1(pn), 0, 1.03), pn)); } return o; };
    const eyePoly = (e, r0) => { const o = []; for (let i = 0; i < 120; i++) { const p = e.B(r0, i / 120 * I.TAU); o.push([p[0] * s, p[1]]); } return o; };
    if (kind === 'emperor' && pat.PM) {
      const inner = regionPoly(() => 0, (pn) => pat.PM(pn) + 0.004, 80);
      const outer = regionPoly((pn) => pat.PM(pn) + pat.bandW - 0.004, () => 1.03, 80);
      const wins = pat.eyes.map((e) => { const o = []; for (let i = 0; i < 120; i++) { const th = i / 120 * I.TAU; const p = e.rimP(th), q = e.B(1.02, th); o.push([lerp(q[0], p[0], 0.5) * s, lerp(q[1], p[1], 0.5)]); } return o; });
      for (const [c, a] of groundCols) {
        D.washHoles(part, inner, wins, c, { alpha: a, layers: 5, amp: 0.35, shrink: 0.3, focus: Fm(0.2, 0.5) });
        D.wash(part, outer, c, { alpha: a * 0.9, layers: 5, amp: 0.35 });
      }
      D.wash(part, regionPoly((pn) => pat.PM(pn), (pn) => pat.PM(pn) + pat.bandW, 80), PAL.straw, { alpha: 0.18, layers: 3, amp: 0.15 });
      D.wash(part, regionPoly((pn) => pat.PM(pn) + pat.bandW, (pn) => pat.PM(pn) + pat.bandW + 0.07, 80), PAL.madder, { alpha: 0.28, layers: 4, amp: 0.2 });
      for (const e of pat.eyes) drawOcellus(D, part, e, s);
    } else for (const [c, a] of groundCols) D.wash(part, outline, c, { alpha: a, layers: 5, amp: 0.4, shrink: 0.35, focus: Fm(0.25, 0.5) });
    // median band and border in the second colour
    if (pat.AM && pat.PM && kind !== 'geometrid') D.wash(part, regionPoly(pat.AM, pat.PM, 60), sch.g2[0], { alpha: sch.g2[1], layers: 4, amp: 0.3 });
    if (pat.border < 1) D.wash(part, regionPoly(() => pat.border, () => 1.02, 60, W.fw ? 0.984 : 1), kind === 'butterfly' || kind === 'swallowtail' ? PAL.ink : sch.g2[0], { alpha: kind === 'butterfly' ? 0.45 : sch.g2[1] * 1.2, layers: 4, amp: W.fw ? 0.12 : 0.25 });
    if (pat.stripes) for (const st of pat.stripes) {
      const o = []; for (let i = 0; i <= 20; i++) { const u = 0.02 + i / 20 * 1.0; o.push(Fm(u, clamp(st - 0.045 + 0.04 * u, 0, 1))); }
      for (let i = 20; i >= 0; i--) { const u = 0.02 + i / 20 * 1.0; o.push(Fm(u, clamp(st + 0.045 + 0.04 * u, 0, 1))); }
      D.wash(part, o, PAL.ink, { alpha: 0.4, layers: 3, amp: 0.2 });
    }
    // ocelli
    if (kind !== 'emperor') for (const e of pat.eyes) {
      const ring = (r0, col, a) => { D.wash(part, eyePoly(e, r0), col, { alpha: a, layers: 4, amp: 0.12 }); };
      ring(1.1, PAL.ink, 0.35);
      ring(0.82, kind === 'swallowtail' ? PAL.madder : PAL.ochre, 0.65);
      ring(0.66, PAL.madder, 0.35);
      ring(0.5, PAL.ink, 0.55);
    }
    for (const sp of pat.spots) {
      if (sp.col) { const o = []; for (let i = 0; i < 30; i++) { const t = i / 30 * I.TAU; o.push(Fm(sp.u + cos(t) * sp.r, sp.pn + sin(t) * sp.r * sp.e)); } D.wash(part, o, sp.col, { alpha: 0.55, layers: 3, amp: 0.05 }); continue; }
      if (sp.white) continue;
      const o = []; for (let i = 0; i < 30; i++) { const t = i / 30 * I.TAU; o.push(Fm(sp.u + cos(t) * sp.r, sp.pn + sin(t) * sp.r * sp.e)); }
      D.wash(part, o, kind === 'tiger' && !W.fw ? PAL.ink : PAL.straw, { alpha: kind === 'tiger' && !W.fw ? 0.5 : 0.35, layers: 3, amp: 0.15 });
    }
    // engraved scale texture: radial lines carrying the pattern tone
    D.hatch(part, Fm, pat.tone, { ar: [0.0, 1], cr: [0.0, 1], pitch: D.pitch * 0.92, cover: 0.85, sstep: 0.25, wmin: 0.045, wob: 0.02 });
    // veins
    const veins = wingVeins(W);
    const vw = P.kind === 'butterfly' ? 0.2 : 0.12;
    const inOcellus = (q) => pat.eyes.some((e) => { const p = W.F(q[0], q[1]); return pat.eyeD(e, q[0], q[1]) < e.rimR(atan2(p[1] - e.c[1], p[0] - e.c[0])) + 0.02; });
    for (const v of veins) {
      if (!pat.eyes.length || P.kind !== 'emperor') { D.line(part, v.map((q) => Fm(q[0], q[1])), { w: vw, tin: 0.5, tout: 1.5, end: 0.5, wn: 0.1 }); continue; }
      // saturniid ocelli lie over the veins: break the veins inside them
      const dense = []; for (let i = 0; i < v.length - 1; i++) for (let k = 0; k < 4; k++) dense.push(I.mix2(v[i], v[i + 1], k / 4));
      dense.push(v[v.length - 1]);
      let cur = [];
      for (const q of dense) { if (inOcellus(q)) { if (cur.length > 2) D.line(part, cur.map((r) => Fm(r[0], r[1])), { w: vw, tin: 0.5, tout: 0.4, end: 0.5, wn: 0.1 }); cur = []; } else cur.push(q); }
      if (cur.length > 2) D.line(part, cur.map((r) => Fm(r[0], r[1])), { w: vw, tin: 0.4, tout: 1.5, end: 0.5, wn: 0.1 });
    }
    // cross lines
    const inEye = (u, pn) => pat.eyes.some((e) => pat.eyeD(e, u, pn) < 1.14);
    for (const L of pat.lines) {
      const pts = []; for (let i = 0; i <= 90; i++) { const pn = 0.01 + 0.98 * i / 90; pts.push(Fm(clamp(L(pn), 0.02, 0.98), pn)); }
      if (pat.eyes.length && pts.some((_, i) => inEye(L(0.01 + 0.98 * i / 90), 0.01 + 0.98 * i / 90))) {
        // split the line around ocelli
        let cur = [];
        for (let i = 0; i <= 90; i++) { const pn = 0.01 + 0.98 * i / 90; if (inEye(L(pn), pn)) { if (cur.length > 2) D.line(part, cur, { w: 0.16, tin: 0.6, tout: 0.6 }); cur = []; } else cur.push(pts[i]); }
        if (cur.length > 2) D.line(part, cur, { w: 0.16, tin: 0.6, tout: 0.6 });
        continue;
      }
      if (P.lineStyle === 'double') {
        D.line(part, pts, { w: 0.13, tin: 1, tout: 1 });
        const pts2 = []; for (let i = 0; i <= 90; i++) { const pn = 0.01 + 0.98 * i / 90; pts2.push(Fm(clamp(L(pn) + 0.025, 0.02, 0.98), pn)); }
        D.line(part, pts2, { w: 0.11, tin: 1, tout: 1 });
      } else if (P.lineStyle === 'dotted') {
        for (const q of I.resample(D.Ps(pts), 0.7)) D.dotP(part, q, 0.12);
      } else D.line(part, pts, { w: 0.16, tin: 1, tout: 1 });
    }
    // reniform and orbicular stigmata
    if (P.reniform && W.fw) {
      const c = [W.cell.u0 * 0.98, lerp(W.cell.a, W.cell.b, 0.55)];
      const o = []; for (let i = 0; i < 40; i++) { const t = i / 40 * I.TAU; const k = 1 - 0.35 * pow(max(0, cos(t)), 3); o.push(Fm(c[0] + cos(t) * 0.05 * k, c[1] + sin(t) * 0.1)); }
      D.line(part, o.concat([o[0], o[1]]), { w: 0.12, tin: 0, tout: 0, end: 1 });
      const c2 = [P.am + 0.08, lerp(W.cell.a, W.cell.b, 0.45)];
      const o2 = []; for (let i = 0; i < 30; i++) { const t = i / 30 * I.TAU; o2.push(Fm(c2[0] + cos(t) * 0.03, c2[1] + sin(t) * 0.05)); }
      D.line(part, o2.concat([o2[0], o2[1]]), { w: 0.11, tin: 0, tout: 0, end: 1 });
    }
    // ocellus rings
    if (kind !== 'emperor') for (const e of pat.eyes) {
      const olP = I.offsetPoly(D.Ps(outline), -0.15);
      for (const [r0, w] of [[1.1, 0.14], [0.5, 0.1]]) {
        const o = D.Ps(eyePoly(e, r0)); o.push(o[0], o[1]);
        // keep rings inside the wing edge
        const cut = I.clipPolyline(o, olP, 0.15);
        if (!cut.out.length) D.lineP(part, o, { w, tin: 0, tout: 0, end: 1 });
        else for (const q of cut.in) if (I.plen(q) > 0.3) D.lineP(part, q, { w, tin: 0.15, tout: 0.15, end: 0.4 });
      }
    }
    // fringe on the termen (none on the costa or the tails), long hairs on the hindwing's inner margin
    {
      const olP = D.Ps(outline);
      const butter = P.kind === 'butterfly' || P.kind === 'swallowtail';
      const cilia = (ptOf, n, lenF, pnOf, base) => {
        const mpts = []; for (let i = 0; i <= n; i++) mpts.push(D.P(ptOf(i / n)));
        const rs = I.resample(mpts, 0.22);
        for (let i = 1; i < rs.length - 1; i++) {
          const a = rs[i - 1], b = rs[i + 1];
          const t = norm(sub(b, a)); let nn = [-t[1], t[0]];
          if (I.pip(add(rs[i], mul(nn, 0.3)), olP)) nn = [-nn[0], -nn[1]];
          const q = i / (rs.length - 1);
          const k = lenF(q); if (k <= 0.03) continue;
          let checker = 0.7;
          if (pnOf && (P.kind === 'geometrid' || P.kind === 'noctuid')) { const pn = pnOf(q); let dk = 1; for (const v of W.vends) dk = min(dk, abs(pn - v)); checker = dk < 0.02 ? 1 : 0.45; }
          const L = (base + 0.3 * R.f()) * (butter ? 0.45 : 1) * k;
          const p0 = add(rs[i], mul(nn, 0.05));
          const p1 = add(p0, add(mul(nn, L), mul(t, (R.f() - 0.5) * 0.25 * k)));
          D.lineP(part, [p0, p1], { w: 0.07 * checker + 0.028, tin: 0.05, tout: 0.4 * k, end: 0.15, wob: 0 });
        }
      };
      const pnOf = (q) => 0.015 + 0.97 * q;
      const tailK = (pn) => (P.tail && !W.fw) ? 1 - 0.85 * Math.exp(-(((pn - P.tail.at) / (P.tail.w * 2.2)) ** 2)) : 1;
      const termK = (q) => { const pn = pnOf(q); return (W.fw ? smoothstep(0.0, 0.09, pn) : 1) * tailK(pn); };
      cilia((q) => Fm(1, pnOf(q)), 220, termK, pnOf, 0.42);
      if (!W.fw) cilia((q) => Fm(lerp(0.98, 0.3, q), 1), 120, (q) => 1.15 * smoothstep(1.0, 0.75, q) * smoothstep(0.0, 0.08, q), null, 0.5);
    }
    // overlap: the hindwing gets a few graver lines of shadow just outside the forewing's inner
    // margin, the forewing a crisp margin line
    if (!W.fw) {
      const Wf = makeWing(P, 'f');
      const im = []; for (let i = 0; i <= 80; i++) { const p = Wf.F(lerp(0.12, 1, i / 80), 1); im.push(D.P([p[0] * s, p[1]])); }
      const fo = D.Ps(wingOutline({ F: (u, pn) => { const p = Wf.F(u, pn); return [p[0] * s, p[1]]; } }, 80));
      const hol = D.Ps(outline);
      const kk = P.kind === 'butterfly' || P.kind === 'swallowtail' ? 1 : 0.75;
      [[0.2, 0.19], [0.42, 0.14], [0.64, 0.1], [0.86, 0.06]].forEach(([d, w]) => {
        const off = im.map((q, i) => {
          const a = im[max(0, i - 1)], b = im[min(im.length - 1, i + 1)];
          let nn = perp(norm(sub(b, a)));
          if (I.pip(add(q, mul(nn, 0.3)), fo)) nn = mul(nn, -1);
          return add(q, mul(nn, d * kk));
        });
        const cut = I.clipPolyline(off, I.offsetPoly(hol, -0.12), 0.15);
        for (const q of cut.in) if (I.plen(q) > 1) D.lineP(part, q, { w: w * kk, tin: 1.2, tout: 2.5, end: 0.2, wob: 0.02, wn: 0.15 });
      });
    } else {
      const im = []; for (let i = 0; i <= 60; i++) im.push(Fm(lerp(0.1, 1, i / 60), 1));
      D.line(part, im, { w: 0.2, tin: 1.5, tout: 0.6, end: 0.4, wn: 0.1 });
    }
    D.contour(part, outline, { w: 0.24, shade: 0.5 });
  }

  // woolly edge: hairs that start inside an outline and overhang it along flow, longer and
  // denser on the shadow side
  const L2s = I.norm([S.LIGHT[0], S.LIGHT[1]]);
  function furEdge(D, part, poly, R, o) {
    o = o || {};
    const sg = I.polyArea(poly) > 0 ? 1 : -1;
    const pts = I.resample(poly.concat([poly[0]]), o.sp || 0.2);
    const n = pts.length;
    const len0 = o.len || 1, flow = o.flow || [0, 1], fk = o.fk != null ? o.fk : 0.45;
    for (let i = 0; i < n - 1; i++) {
      const a = pts[max(0, i - 1)], b = pts[min(n - 1, i + 1)];
      const t = norm(sub(b, a));
      const nn = [t[1] * sg, -t[0] * sg];
      if (o.skip && o.skip(pts[i], nn)) continue;
      const lit = nn[0] * L2s[0] + nn[1] * L2s[1];
      const k = 1 - 0.45 * smoothstep(-0.3, 0.9, lit);
      if (R.f() > (o.dens || 0.85) * (0.55 + 0.45 * k)) continue;
      const L = len0 * k * (0.55 + 0.7 * R.f());
      const d = norm(add(mul(nn, 1 - fk), add(mul(flow, fk), [(R.f() - 0.5) * 0.5, (R.f() - 0.5) * 0.5])));
      const p0 = sub(pts[i], mul(nn, L * 0.4));
      D.line(part, [p0, add(pts[i], mul(d, L * 0.6))], { w: (o.w || 0.085) * (0.8 + 0.4 * k), tin: 0.05, tout: L * 0.55, end: 0.1, wob: 0.015, wn: 0.1 });
    }
  }

  function drawBody(P, D, sch, R) {
    const bodyCol = SCHEME[P.scheme].g[0][0];
    const fur = P.furry; // 1 moths, 0.5 butterflies
    const fem = P.sex === 'f', male = P.sex === 'm';
    const woolly = P.kind === 'emperor' || P.kind === 'hawk' || P.kind === 'tiger' || P.kind === 'noctuid';
    // abdomen: telescoped segments, lateral and terminal tufts
    {
      const part = D.part('abdomen');
      const y0 = P.thRy * 0.7, L = P.abL * (fem ? 0.94 : 1), W = P.abW * (fem ? 1.14 : male ? 0.92 : 1);
      const nseg = 7;
      const seg = (t) => { const f = (t * nseg) % 1; return 0.9 + 0.1 * pow(sin(PI * clamp(f * 1.08, 0, 1)), 0.6); };
      const prof = (t) => (W * (0.75 + 0.35 * sin(PI * pow(t, 0.7))) * pow(1 - pow(t, 3), 0.6) + 0.15) * (t < 0.04 ? 1 : seg(t));
      const cl = []; for (let i = 0; i <= 140; i++) cl.push([0, y0 + L * i / 140]);
      const tb = S.tube(cl, prof, false, true);
      D.sil(part, tb.poly);
      D.wash(part, tb.poly, bodyCol, { alpha: 0.5, layers: 3, amp: 0.12 });
      const F = S.tubeMap(cl, prof);
      const tone = D.shadeFn(F, (u, v) => prof(u) * sqrt(max(0, 1 - (2 * v - 1) ** 2)), { alb: sch.alb * 0.6, gloss: 0.1, k: 0.95 });
      // shadow under each overlapping segment
      const tone2 = (u, v) => { const f = (u * nseg) % 1; return clamp(tone(u, v) * 0.75 + 0.3 * smoothstep(0.75, 1, f) * (u > 0.05 ? 1 : 0), 0, 1); };
      D.hatch(part, F, tone2, { along: 'v', ar: [0.02, 0.98], cr: [0.02, 0.97], pitch: D.pitch * 1.05, cover: 0.6, wmin: 0.035 });
      for (let k = 1; k < nseg; k++) {
        const u = k / nseg;
        const o = []; for (let j = 0; j <= 16; j++) { const v = 0.04 + 0.92 * j / 16; const p = F(u, v); o.push([p[0], p[1] + 0.5 * sin(PI * v)]); }
        D.line(part, o, { w: 0.13, tin: 0.6, tout: 0.6 });
        // hair along each segment's hind edge
        for (let j = 0; j < 14 * fur; j++) {
          const v = 0.1 + 0.8 * R.f(); const p = F(u - 0.01, v);
          if (R.f() > tone(u, v) * 1.4 + 0.15) continue;
          const side = v - 0.5;
          D.line(part, [add(p, [0, -0.5]), add(p, [side * 0.9, 0.55 + R.f() * 0.5])], { w: 0.075, tin: 0.05, tout: 0.5, end: 0.1, wob: 0.01 });
        }
      }
      // pile over the dorsum
      for (let i = 0; i < 300 * fur; i++) {
        const u = R.f(), v = R.f();
        const p = F(u, v);
        const t = tone(u, v);
        if (R.f() > t * 1.2 + 0.08) continue;
        const L2 = 0.7 + R.f() * 1.0;
        const d = [(v - 0.5) * 1.1, 0.8];
        D.line(part, [p, add(p, mul(norm(d), L2))], { w: 0.08, tin: 0.05, tout: 0.6, end: 0.1, wob: 0.02 });
      }
      if (woolly || fur >= 1) furEdge(D, part, tb.poly, R, { len: (woolly ? 1.25 : 0.8) * fur, dens: 0.8, flow: [0, 1], fk: 0.55, skip: (p) => p[1] < y0 + 1 });
      // anal tuft, large in males and hawk moths
      const tip = [0, y0 + L];
      const big = male || P.kind === 'hawk';
      const nt = (big ? 26 : 12) * fur;
      for (let i = 0; i < nt; i++) {
        const a = PI / 2 + (R.f() - 0.5) * 1.3, l = (big ? 1.6 : 1.0) * (0.5 + R.f());
        const b0 = add(tip, [(R.f() - 0.5) * W * 0.5, -0.8 - R.f() * 0.8]);
        D.line(part, [b0, add(b0, mul([cos(a), sin(a)], l + 0.8))], { w: 0.085, tin: 0.05, tout: 0.7, end: 0.1, wob: 0.02 });
      }
      D.contour(part, tb.poly, { w: woolly ? 0.12 : 0.2, shade: 1 });
    }
    // head, before the thorax so the collar overhangs it. woolly moths draw the eyes first, so
    // the head's pile and the scapes half bury them
    const hc = [0, -P.thRy * 0.92 - P.headR * (woolly ? 0.36 : 0.42)];
    const hrx = P.headR * (woolly ? 1.08 : 1.18), hry = P.headR * (woolly ? 0.78 : 0.82);
    const ek = P.kind === 'emperor' ? 0.7 : woolly ? 0.86 : 1;
    const eyeC = (s) => (woolly ? add(hc, [s * hrx * 0.97, hry * 0.24]) : add(hc, [s * hrx * 0.82, hry * 0.12]));
    const eyeR = [P.headR * 0.36 * ek, P.headR * 0.42 * ek];
    const drawEyes = () => {
      // compound eyes: small engraved spheres with a bare highlight
      for (const s of [1, -1]) {
        const ec = eyeC(s);
        const ex = D.part('eye');
        const ep = I.ellipsePoly(ec, eyeR[0], eyeR[1], 0, 30);
        D.sil(ex, ep);
        D.wash(ex, ep, PAL.ink, { alpha: 0.55, layers: 2, amp: 0.03 });
        const F = (u, v) => { const lat = (u - 0.5) * PI * 0.98, lon = (v - 0.5) * PI * 0.98; return [ec[0] + eyeR[0] * sin(lon) * cos(lat), ec[1] + eyeR[1] * sin(lat)]; };
        const H = (u, v) => { const lat = (u - 0.5) * PI, lon = (v - 0.5) * PI; return eyeR[0] * cos(lon) * cos(lat); };
        const tone = D.shadeFn(F, H, { alb: 0.12, gloss: 1, hiw: 0.22, k: 1 });
        D.hatch(ex, F, tone, { along: 'u', ar: [0.02, 0.98], cr: [0.02, 0.98], pitch: D.pitch * 0.75, cover: 0.95, wmin: 0.03 });
        D.contour(ex, ep, { w: 0.14 });
      }
    };
    const drawHead = () => {
      const part = D.part('head');
      const NH = I.makeNoise('hd:' + P.seed);
      const el = [];
      for (let i = 0; i < 48; i++) {
        const t = i / 48 * I.TAU;
        const k = woolly ? 1 + 0.07 * NH.n2(cos(t) * 1.8 + 2, sin(t) * 1.8) + 0.05 * pow(max(0, sin(t * 6 + 0.7)), 6) : 1;
        el.push([hc[0] + cos(t) * hrx * k, hc[1] + sin(t) * hry * k]);
      }
      D.sil(part, el);
      D.wash(part, el, bodyCol, { alpha: 0.55, layers: 2, amp: 0.08 });
      D.wash(part, el, PAL.umber, { alpha: woolly ? 0.26 : 0.18, layers: 2, amp: 0.08 });
      // frontal tuft combed forward
      for (let i = 0; i < 70 * fur; i++) {
        const a = R.f() * I.TAU, rr = sqrt(R.f()) * 0.85;
        const p = add(hc, [cos(a) * rr * hrx * 0.8, sin(a) * rr * hry]);
        const d = norm([(p[0] - hc[0]) * 0.5, -1]);
        D.line(part, [p, add(p, mul(d, 0.6 + R.f() * 0.6))], { w: 0.075, tin: 0.05, tout: 0.4, end: 0.1 });
      }
      if (!woolly) {
        furEdge(D, part, el, R, { len: 0.8 * fur, dens: 0.75, flow: [0, -1], fk: 0.5, skip: (p) => p[1] > hc[1] + hry * 0.2 });
        D.contour(part, el, { w: 0.1, shade: 1 });
        return;
      }
      // woolly: pile round the front and sides, contour broken
      furEdge(D, part, el, R, { len: 0.95 * fur, dens: 0.95, flow: [0, -1], fk: 0.35, skip: (p) => p[1] > hc[1] + hry * 0.55 });
      let run = [];
      const flush = () => { if (run.length > 3) D.contour(part, run, { w: 0.09, shade: 1, open: true, wob: 0.05 }); run = []; };
      for (let i = 0; i <= el.length; i++) { const q = el[i % el.length]; const lit = -0.6 * (q[0] - hc[0]) / hrx - 0.8 * (q[1] - hc[1]) / hry; if (lit < -0.2 && NH.n2(i * 0.5, 4.4) > -0.1) run.push(q); else flush(); }
      flush();
    };
    if (woolly) { drawEyes(); drawHead(); } else { drawHead(); drawEyes(); }
    // thorax with a dark collar and tegulae
    {
      const part = D.part('thorax');
      const rx = P.thRx, ry = P.thRy;
      // woolly kinds have a shaggy silhouette, so the fur breaks the outline
      const NT = I.makeNoise('thx:' + P.seed);
      const el = []; for (let i = 0; i < 96; i++) { const t = i / 96 * I.TAU; const c = cos(t), sn = sin(t); let w = 1 + 0.08 * max(0, -sn); if (woolly) w *= 1 + 0.05 * NT.n2(cos(t) * 1.6 + 3, sin(t) * 1.6) + 0.035 * NT.n2(cos(t) * 4 + 9, sin(t) * 4) + 0.03 * pow(max(0, sin(t * 7 + 1.3)), 6); el.push([c * rx * w, sn * ry * (sn < 0 ? 0.96 : 1) * (woolly ? w / (1 + 0.08 * max(0, -sn)) : 1)]); }
      D.sil(part, el);
      D.wash(part, el, bodyCol, { alpha: 0.55, layers: 3, amp: 0.12 });
      // collar across the front
      const collar = [];
      for (let i = 0; i <= 24; i++) { const t = PI + PI * i / 24; collar.push([cos(t) * rx * 1.03, sin(t) * ry * 0.98]); }
      for (let i = 24; i >= 0; i--) { const t = PI + PI * i / 24; collar.push([cos(t) * rx * 0.86, sin(t) * ry * 0.98 * 0.64 - ry * 0.06]); }
      if (woolly) D.wash(part, collar, P.kind === 'emperor' ? PAL.umber : PAL.ink, { alpha: 0.5, layers: 3, amp: 0.08 });
      const inCollar = (p) => woolly && I.pip(p, collar);
      const n = floor(620 * fur);
      for (let i = 0; i < n; i++) {
        const a = R.f() * I.TAU, rr = sqrt(R.f()) * 0.97;
        const p = [cos(a) * rr * rx, sin(a) * rr * ry];
        const lit = -0.6 * (p[0] / rx) - 0.6 * (p[1] / ry);
        let t = (1 - sch.alb * 0.7) * (0.72 - 0.35 * lit) + 0.28 * rr;
        if (inCollar(p)) t = 0.95;
        if (R.f() > t) continue;
        const d = norm([p[0] * 0.6 / rx, 0.8 + p[1] * 0.2 / ry]);
        const L2 = 0.7 + R.f() * 1.1;
        D.line(part, [p, add(p, mul(d, L2))], { w: inCollar(p) ? 0.1 : 0.085, tin: 0.05, tout: 0.6, end: 0.1, wob: 0.02 });
      }
      // tegulae
      for (const s of [1, -1]) {
        const o = []; for (let i = 0; i <= 16; i++) { const t = i / 16; o.push([s * rx * (0.25 + 0.65 * sin(PI * t * 0.9)), -ry * 0.62 + ry * 1.3 * t]); }
        D.line(part, o, { w: 0.12, tin: 0.8, tout: 1.2 });
      }
      furEdge(D, part, el, R, { len: (woolly ? 1.6 : 0.8) * fur, dens: woolly ? 1 : 0.9, flow: [0, 1], fk: 0.35 });
      if (!woolly) D.contour(part, el, { w: 0.2, shade: 1 });
      else {
        // broken contour: short stretches on the shadow side only
        const n = el.length; let run = [];
        const flush = () => { if (run.length > 3) D.contour(part, run, { w: 0.11, shade: 1, open: true, wob: 0.06 }); run = []; };
        for (let i = 0; i <= n; i++) {
          const q = el[i % n], lit = -0.6 * q[0] / rx - 0.8 * q[1] / ry;
          if (lit < -0.15 && NT.n2(i * 0.35, 5.5) > -0.15) run.push(q); else flush();
        }
        flush();
      }
    }
    // antennae, based on the inner upper edge of the eyes
    for (const s of [1, -1]) {
      const part = D.part('antenna');
      const base = add(eyeC(s), [-s * eyeR[0] * 0.55, -eyeR[1] * 0.75]);
      // scape, small and dark on woolly moths
      const sc = I.ellipsePoly(base, P.headR * (woolly ? 0.24 : 0.28), P.headR * (woolly ? 0.17 : 0.22), -s * 0.5, 16);
      D.sil(part, sc);
      D.tint(part, sc, bodyCol, 0.6); D.tint(part, sc, PAL.ink, woolly ? 0.5 : 0.25);
      D.contour(part, sc, { w: woolly ? 0.08 : 0.1 });
      const n = 40;
      const pts = [];
      const antL = P.antL * (fem && P.ant === 'bipectinate' ? 0.9 : 1);
      let a = -PI / 2 + s * (0.55 + P.antA * -1), p = base;
      const curl = P.ant === 'hooked' ? 1.2 : 0.35;
      for (let i = 0; i <= n; i++) { pts.push(p); a += s * curl * (i / n) * 0.06; p = add(p, mul([cos(a), sin(a)], antL / n)); }
      if (P.ant === 'bipectinate' || P.ant === 'filiform' || P.ant === 'hooked') {
        D.line(part, pts, { w: male && P.ant !== 'filiform' ? 0.24 : 0.2, tin: 0.2, tout: 3, end: 0.3 });
        if (P.ant === 'bipectinate') {
          const pect = P.antPect * (fem ? 0.4 : male ? 1.15 : 1);
          const rs = I.resample(pts, fem ? 0.45 : 0.55);
          for (let i = 1; i < rs.length - 1; i++) {
            const t = i / rs.length;
            const tg = norm(sub(rs[i + 1], rs[i - 1]));
            const L2 = pect * sin(PI * pow(t, 0.7)) * (1 - 0.2 * t) + 0.3;
            for (const k of [1, -1]) {
              const d = add(mul(perp(tg), k), mul(tg, 0.55));
              D.line(part, [rs[i], add(rs[i], mul(norm(d), L2))], { w: 0.075, tin: 0.05, tout: 0.5, end: 0.2, wob: 0.01 });
            }
          }
        } else {
          const rs = I.resample(D.Ps(pts), 0.5);
          const k = male && P.ant === 'hooked' ? 0.26 : 0.18;
          for (let i = 2; i < rs.length - 1; i += 1) { const tg = norm(sub(rs[i + 1], rs[i - 1])); D.lineP(part, [add(rs[i], mul(perp(tg), k)), add(rs[i], mul(perp(tg), -k))], { w: 0.05, tin: 0, tout: 0, end: 1 }); }
        }
      } else { // clubbed
        D.line(part, pts, { w: 0.16, tin: 0.2, tout: 0.2, end: 0.8 });
        const tip = pts[pts.length - 1], tg = norm(sub(pts[pts.length - 1], pts[pts.length - 5]));
        const club = I.ellipsePoly(add(tip, mul(tg, 0.6)), 1.4, 0.65, atan2(tg[1], tg[0]), 24);
        D.sil(part, club);
        D.tint(part, club, PAL.ink, 0.6);
        D.contour(part, club, { w: 0.16 });
      }
    }
  }

  function boundsMoth(P) {
    const pts = [];
    for (const w of ['f', 'h']) { const W = makeWing(P, w); for (let i = 0; i <= 40; i++) { const p = W.F(1, i / 40); pts.push(p, [-p[0], p[1]]); } }
    pts.push([0, P.thRy * 0.7 + P.abL], [0, -P.thRy - P.headR * 1.2 - P.antL * 0.95]);
    return I.bbox(pts);
  }

  // dimorphism: females are larger, with broader wings, a paler ground and another hindwing
  // colour; the body differences are in drawBody
  function sexify(P, sex) {
    P.sex = sex;
    if (sex !== 'f') return P;
    P.fL *= 1.07; P.hL *= 1.09;
    P.fShape = P.fShape.map(([x, y], i) => [x, i ? y * (1 + 0.07 * sin(PI * x)) : y]);
    P.hShape = P.hShape.map(([x, y]) => [x, y * (1 + 0.05 * sin(PI * x))]);
    if (P.hindColour) P.hindColour = { madder: 'rose', rose: 'ochre', ochre: 'rose' }[P.hindColour];
    if (P.tail && P.kind === 'swallowtail') P.tail = Object.assign({}, P.tail, { len: P.tail.len * 1.12 });
    if (P.kind === 'emperor' || P.kind === 'butterfly') P.eyeSize *= 1.1;
    return P;
  }

  G.MOTH = { genMoth, drawMoth, boundsMoth, makeWing, wingVeins, wingOutline, sexify };
})(typeof globalThis !== 'undefined' ? globalThis : this);

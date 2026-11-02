// dragonflies and damselflies. wings are patches (u span, v chord) whose longitudinal veins
// drift to the trailing edge; the strips between them are filled with voronoi cells of sites
// laid in rows (narrow strips -> ladders, wide strips -> polygons)
(function (G) {
  'use strict';
  const I = G.INK, S = G.SPEC;
  const { PI, sin, cos, sqrt, abs, min, max, pow, exp } = Math;
  const { clamp, lerp, smooth, smoothstep, add, sub, mul, dist } = I;
  const PAL = S.PAL;

  function genDragonfly(seed, force) {
    const R = I.makeRng('odo:' + seed);
    const r = (a, b) => R.range(a, b);
    const P = { family: 'dragonfly', seed: String(seed) };
    const kind = P.kind = force || R.wpick([['hawker', 3], ['skimmer', 3], ['damsel', 2], ['clubtail', 1.5]]);
    P.arch = kind;
    const damsel = kind === 'damsel';
    P.bodyL = damsel ? r(88, 100) : r(80, 92);
    P.abL = P.bodyL * (damsel ? r(0.76, 0.8) : r(0.66, 0.72));
    P.abW = damsel ? r(2.2, 2.7) : kind === 'skimmer' ? r(4.6, 6) : r(4.0, 5.0);
    P.club = kind === 'clubtail' ? r(0.5, 0.9) : r(0, 0.25);
    P.thL = P.bodyL * (damsel ? 0.11 : 0.15);
    P.eyeR = damsel ? r(2.4, 2.8) : kind === 'clubtail' ? r(3.6, 4.2) : r(4.6, 5.4);
    P.eyesApart = damsel || kind === 'clubtail';
    P.thW = damsel ? r(5, 6) : P.eyeR * 2 * r(0.95, 1.08);
    P.headW = damsel ? r(9, 11) : P.eyeR * 2;
    P.wL = P.bodyL * (damsel ? r(0.48, 0.55) : r(0.68, 0.78));
    P.fC = P.wL * (damsel ? r(0.13, 0.16) : r(0.17, 0.21));
    P.hC = P.fC * (damsel ? r(1.0, 1.08) : r(1.18, 1.35));
    P.lobe = damsel ? 0 : r(0.35, 0.8);
    P.petiole = damsel ? r(0.12, 0.18) : 0;
    P.fAng = damsel ? r(-0.32, -0.18) : r(-0.2, -0.06);
    P.hAng = damsel ? r(0.12, 0.3) : r(0.04, 0.16);
    P.cell = r(1.05, 1.35); // plate units
    P.tint = R.wpick([['clear', 3], ['amber', 2], ['band', damsel ? 1.5 : 0.8], ['tips', 1], ['basal', kind === 'skimmer' ? 2 : 0.5]]);
    P.colour = R.wpick(damsel ? [['indigo', 2], ['madder', 1], ['green', 1.5], ['umber', 1]] : kind === 'skimmer' ? [['madder', 2], ['slate', 2], ['ochre', 2]] : [['green', 2], ['indigo', 2], ['ochre', 1.5], ['umber', 1]]);
    P.abPattern = R.wpick([['rings', 2], ['spots', 2], ['stripe', 1]]);
    P.stig = r(0.035, 0.06);
    return P;
  }

  const COLS = {
    indigo: { body: [[PAL.indigo, 0.55]], eye: [PAL.indigo, 0.6], alb: 0.45 },
    madder: { body: [[PAL.madder, 0.6], [PAL.sienna, 0.2]], eye: [PAL.madder, 0.5], alb: 0.5 },
    green: { body: [[PAL.ochre, 0.45], [PAL.indigo, 0.4]], eye: [PAL.olive, 0.6], alb: 0.45 },
    umber: { body: [[PAL.umber, 0.55]], eye: [PAL.umber, 0.6], alb: 0.4 },
    slate: { body: [[PAL.slate, 0.55], [PAL.indigo, 0.15]], eye: [PAL.slate, 0.6], alb: 0.5 },
    ochre: { body: [[PAL.ochre, 0.6]], eye: [PAL.sienna, 0.5], alb: 0.55 },
  };

  function makeWing(P, which) {
    const fw = which === 'f';
    const damsel = P.kind === 'damsel';
    const L = P.wL * (fw ? 1 : 0.96);
    const C = fw ? P.fC : P.hC;
    const base = fw ? [P.thW * 0.42, -P.thL * 0.32] : [P.thW * 0.42, P.thL * 0.12];
    const ang = fw ? P.fAng : P.hAng;
    const chord = (u) => {
      let c = C * pow(max(0, 1 - pow(u, 7)), 0.42);
      if (damsel) c *= lerp(0.12, 1, smoothstep(0, P.petiole * 1.6, u));
      else {
        c *= lerp(0.3, 1, smooth(u / 0.16));
        if (!fw) c *= 1 + P.lobe * exp(-(((u - 0.13) / 0.14) ** 2));
        else c *= 1 + 0.15 * pow(1 - smoothstep(0.03, 0.25, u), 1.5);
      }
      return c;
    };
    const le = (u) => -L * 0.012 * sin(PI * u) + L * 0.035 * pow(u, 5);
    const ca = cos(ang), sa = sin(ang);
    const F = (u, v) => {
      const x = u * L, y = le(u) + v * chord(u);
      return [base[0] + x * ca - y * sa, base[1] + x * sa + y * ca];
    };
    // longitudinal veins v(u) = v0 + d u^2 from u = us; v = 1 is the trailing margin
    const V = damsel
      ? [{ v0: 0.08, d: -0.02, us: 0 }, { v0: 0.22, d: 0.05, us: 0.06 }, { v0: 0.38, d: 0.18, us: 0.12 }, { v0: 0.55, d: 0.4, us: 0.1 }, { v0: 0.75, d: 1.1, us: 0.05 }]
      : fw
        ? [{ v0: 0.045, d: -0.02, us: 0, end: 0.45 }, { v0: 0.09, d: -0.04, us: 0 }, { v0: 0.2, d: 0.08, us: 0.05 }, { v0: 0.29, d: 0.18, us: 0.3 }, { v0: 0.36, d: 0.3, us: 0.1 }, { v0: 0.47, d: 0.55, us: 0.1 }, { v0: 0.62, d: 1.2, us: 0.05 }, { v0: 0.8, d: 2.8, us: 0.02 }]
        : [{ v0: 0.04, d: -0.02, us: 0, end: 0.45 }, { v0: 0.08, d: -0.04, us: 0 }, { v0: 0.17, d: 0.08, us: 0.05 }, { v0: 0.25, d: 0.2, us: 0.3 }, { v0: 0.32, d: 0.32, us: 0.1 }, { v0: 0.42, d: 0.62, us: 0.12 }, { v0: 0.55, d: 1.4, us: 0.08 }, { v0: 0.7, d: 3.2, us: 0.04 }];
    for (const v of V) v.f = (u) => min(1, v.v0 + v.d * u * u);
    // pterostigma: the radius dips away from the costa for 3-4 cells near the apex
    const stigIdx = damsel ? 0 : 1;
    const stig = { ua: 0.835, ub: 0.835 + P.stig * 1.5 + 0.03 };
    const f1 = V[stigIdx].f, dip = damsel ? 0.1 : 0.075;
    V[stigIdx].f = (u) => f1(u) + dip * smoothstep(stig.ua - 0.035, stig.ua, u) * smoothstep(stig.ub + 0.035, stig.ub, u);
    return { fw, L, C, F, chord, V, base, ang, stig, stigIdx };
  }

  function wingOutline(W, s) {
    const o = [];
    const n = 120;
    for (let i = 0; i <= n; i++) o.push(W.F(i / n, 0));
    for (let i = n; i >= 0; i--) o.push(W.F(i / n, 1));
    return S.dedupe(o).map((p) => [p[0] * s, p[1]]);
  }

  function drawWing(P, D, W, s, R) {
    const part = D.part(W.fw ? 'forewing' : 'hindwing');
    const damsel = P.kind === 'damsel';
    const Fm = (u, v) => { const p = W.F(u, v); return [p[0] * s, p[1]]; };
    const outline = wingOutline(W, s);
    part.clip = [D.Ps(outline)];
    part.shadowW = 0.3; // glassy wings cast a faint shadow
    // the forewing only partly masks the hindwing, whose veins show through faintly
    if (W.fw) { D.sil(part, outline); part.silA = 0.72; }
    // membrane tint
    D.wash(part, outline, PAL.straw, { alpha: 0.07, layers: 3, amp: 0.3 });
    const region = (u0, u1, v0, v1) => { const o = []; for (let i = 0; i <= 24; i++) o.push(Fm(lerp(u0, u1, i / 24), v0)); for (let i = 24; i >= 0; i--) o.push(Fm(lerp(u0, u1, i / 24), v1)); return o; };
    if (P.tint === 'amber') D.wash(part, region(0.0, 0.42, 0, 1), PAL.ochre, { alpha: 0.26, layers: 5, amp: 0.6, shrink: 0.6, focus: Fm(0.02, 0.5) });
    if (P.tint === 'band') D.wash(part, region(0.36, 0.62, 0, 1), PAL.umber, { alpha: 0.42, layers: 5, amp: 0.5 });
    if (P.tint === 'tips') D.wash(part, region(0.86, 1.0, 0, 1), PAL.umber, { alpha: 0.42, layers: 5, amp: 0.4 });
    if (P.tint === 'basal' && !W.fw) D.wash(part, region(0.0, 0.2, 0.05, 1), PAL.umber, { alpha: 0.5, layers: 5, amp: 0.5, shrink: 0.5, focus: Fm(0.02, 0.5) });
    if (P.tint === 'basal' && W.fw) D.wash(part, region(0.0, 0.1, 0.05, 0.6), PAL.umber, { alpha: 0.35, layers: 4, amp: 0.4 });
    // veins
    const veinPts = (v, u0, u1) => { const o = []; for (let i = 0; i <= 80; i++) { const u = lerp(u0, u1, i / 80); o.push(Fm(u, v.f(u))); } return o; };
    const uEnd = (v) => { if (v.end) return v.end; if (v.d <= 0) return 1; const u = sqrt(max(0, (1 - v.v0) / v.d)); return min(1, u); };
    // costa (thick)
    D.line(part, (() => { const o = []; for (let i = 0; i <= 120; i++) o.push(Fm(i / 120, 0)); return o; })(), { w: 0.36, tin: 0.5, tout: 3, end: 0.3, wn: 0.06, press: (t) => lerp(1, 0.6, smoothstep(0.25, 1, t)) });
    // no cells inside the pterostigma and the discoidal triangle
    const Rs = W.V[W.stigIdx];
    const stigUV = []; for (let i = 0; i <= 14; i++) stigUV.push([lerp(W.stig.ua, W.stig.ub, i / 14), 0]); for (let i = 14; i >= 0; i--) { const u = lerp(W.stig.ua, W.stig.ub, i / 14); stigUV.push([u, Rs.f(u)]); }
    const stigP = D.Ps(stigUV.map((q) => Fm(q[0], q[1])));
    let triUV = null;
    if (!damsel) {
      const V4 = W.V[4], V5 = W.V[5];
      triUV = W.fw ? [[0.12, V4.f(0.12)], [0.245, (V4.f(0.245) + V5.f(0.245)) / 2], [0.12, V5.f(0.12) + 0.01]]
        : [[0.125, V4.f(0.125)], [0.205, V5.f(0.205) + 0.015], [0.12, V5.f(0.12) + 0.06]];
    }
    const triP = triUV ? D.Ps(triUV.map((q) => Fm(q[0], q[1]))) : null;
    const skip = (a, b) => { const m = I.mix2(a, b, 0.5); return I.pip(m, stigP) || (triP && I.pip(m, triP)); };
    // graded cell size: small along the costa and at the apex, large in the anal field
    const base0 = D.P(Fm(0, 0)), tip0 = D.P(Fm(1, 0));
    const ax = sub(tip0, base0), ax2 = ax[0] * ax[0] + ax[1] * ax[1];
    const uOf = (p) => clamp(((p[0] - base0[0]) * ax[0] + (p[1] - base0[1]) * ax[1]) / ax2, 0, 1);
    // strips between successive veins
    const bounds = [{ f: () => 0, us: 0, ue: 1 }].concat(W.V.map((v) => ({ f: v.f, us: v.us, ue: uEnd(v), v }))).concat([{ f: () => 1, us: 0, ue: 1 }]);
    const nStr = bounds.length - 1;
    // the costal strips carry one row of cross-veins instead of cells (antenodal and postnodal
    // ladders); antenodals line up across the subcosta, two are thickened primaries
    const uNod = damsel ? 0.3 : 0.45;
    const ladderStrip = (k) => k === 0 || (!damsel && k === 1);
    const lenAlong = (fv, ua, ub) => { let L = 0, prev = D.P(Fm(ua, fv(ua))); for (let i = 1; i <= 8; i++) { const u = lerp(ua, ub, i / 8); const q = D.P(Fm(u, fv(u))); L += dist(prev, q); prev = q; } return L; };
    const ladderU = (fv, ua, ub, sp) => {
      const out = []; let u = ua;
      const du0 = (ub - ua) / max(1, lenAlong(fv, ua, ub)); // param per plate unit
      u += sp * du0 * (0.4 + 0.3 * R.f());
      while (u < ub - sp * du0 * 0.35) { out.push(u); u += sp * du0 * (0.82 + 0.36 * R.f()); }
      return out;
    };
    const antU = ladderU((u) => 0, 0.035, uNod - 0.012, P.cell * (damsel ? 4 : 1.2));
    const primIdx = damsel ? new Set([0, 1]) : new Set([1, min(antU.length - 1, 5)]);
    const crossVein = (fa, fb, u, slant, w) => {
      const p0 = Fm(u, fa(u)), p2 = Fm(u + slant, fb(u + slant));
      const p1 = I.mix2(p0, p2, 0.5);
      if (skip(D.P(p0), D.P(p2))) return;
      D.line(part, [p0, p1, p2], { w, tin: 0.02, tout: 0.02, end: 0.85, wob: 0.008, wn: 0.1, cap: true });
    };
    for (let k = 0; k < nStr; k++) {
      const a = bounds[k];
      const below = (u) => { let best = 1; for (let j = k + 1; j < bounds.length; j++) { const b = bounds[j]; if (u >= b.us && u <= (b.ue || 1)) { best = min(best, b.f(u)); } } return best; };
      const u0 = a.us + 0.004, u1 = min(1, a.ue || 1) - 0.004;
      if (u1 <= u0) continue;
      if (ladderStrip(k)) {
        antU.forEach((u, i) => { if (u > u0 && u < min(u1, uNod - 0.01)) crossVein(a.f, below, u + (k === 1 && i % 3 === 2 ? 0.006 : 0), 0, primIdx.has(i) ? 0.12 : 0.06); });
        if (k === 0) for (const u of ladderU((uu) => 0, uNod + 0.012, 0.985, P.cell * 0.95)) crossVein(a.f, below, u, 0.004, 0.058);
        continue;
      }
      const top = [], bot = [];
      const n = 90;
      for (let i = 0; i <= n; i++) { const u = lerp(u0, u1, i / n); top.push([u, a.f(u)]); bot.push([u, below(u)]); }
      const polyUV = top.concat(bot.reverse());
      const poly = polyUV.map((q) => Fm(q[0], q[1]));
      const pp = D.Ps(poly);
      if (abs(I.polyArea(pp)) < 0.5) continue;
      const fk = lerp(0.8, 1.55, pow(k / max(1, nStr - 1), 1.15));
      const rfn = (p) => { const u = uOf(p); return P.cell * fk * (1 - 0.24 * smoothstep(0.7, 1, u)) * (1 + 0.12 * smoothstep(0.3, 0.0, u)); };
      // mirror sites across both strip boundaries so the edges between neighbours are finite
      const topP = D.Ps(top.map((q) => Fm(q[0], q[1]))), botP = D.Ps(bot.slice().reverse().map((q) => Fm(q[0], q[1])));
      // sites in rows between the veins (one row in narrow strips, staggered rows where the
      // strip widens), the order relaxing toward the anal field
      const sites = [];
      {
        const mid = topP.map((q, i) => I.mix2(q, botP[i], 0.5));
        const S0 = [0]; for (let i = 1; i < mid.length; i++) S0.push(S0[i - 1] + dist(mid[i - 1], mid[i]));
        const at = (sArc) => { let i = 1; while (i < mid.length - 1 && S0[i] < sArc) i++; const t = clamp((sArc - S0[i - 1]) / ((S0[i] - S0[i - 1]) || 1), 0, 1); return [i - 1, t]; };
        const lerpP = (A, i, t) => I.mix2(A[i], A[min(A.length - 1, i + 1)], t);
        const order = 1 - 0.75 * pow(k / max(1, nStr - 1), 1.3);
        const jit = 0.1 + 0.75 * (1 - order);
        let sArc = 0, col = 0;
        const tot = S0[S0.length - 1];
        while (sArc < tot) {
          const [i, t] = at(sArc);
          const pt = lerpP(topP, i, t), pb = lerpP(botP, i, t);
          const cs = rfn(I.mix2(pt, pb, 0.5)) * 1.0;
          const wd = dist(pt, pb);
          const nr = max(1, Math.round(wd / (cs * 0.95)));
          for (let j = 0; j < nr; j++) {
            const s2 = clamp(sArc + ((nr > 1 && col % 2 ? 0.5 : 0) + (R.f() - 0.5) * jit) * cs, 0, tot);
            const [i2, t2] = at(s2);
            const vv = clamp((j + 0.5 + (R.f() - 0.5) * jit * 0.7) / nr, 0.08, 0.92);
            sites.push(I.mix2(lerpP(topP, i2, t2), lerpP(botP, i2, t2), vv));
          }
          sArc += cs * (0.9 + 0.2 * R.f());
          col++;
        }
      }
      if (sites.length < 1) continue;
      const nearest = (p, pl) => { let best = null, bd = 1e9; for (let i = 1; i < pl.length; i++) { const a = pl[i - 1], b = pl[i]; const ab = sub(b, a); const t = clamp(((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / ((ab[0] ** 2 + ab[1] ** 2) || 1), 0, 1); const q = add(a, mul(ab, t)); const d2 = dist(p, q); if (d2 < bd) { bd = d2; best = q; } } return best; };
      const all = sites.slice();
      for (const p of sites) { for (const pl of [topP, botP]) { const q = nearest(p, pl); all.push([2 * q[0] - p[0], 2 * q[1] - p[1]]); } }
      const e0 = D.P(Fm(u0 - 0.03, (a.f(u0) + below(u0)) / 2)), e1 = D.P(Fm(u1 + 0.03, (a.f(u1) + below(u1)) / 2));
      all.push(e0, e1);
      const segs = I.voronoiEdges(all);
      const clipPoly = I.offsetPoly(pp, -0.05);
      for (const sg of segs) {
        if (dist(sg[0], sg[1]) > P.cell * 7) continue;
        const c = I.clipPolyline(sg, clipPoly, 0.1);
        for (const piece of c.in) if (I.plen(piece) > 0.12 && !skip(piece[0], piece[piece.length - 1])) D.lineP(part, piece, { w: 0.055, tin: 0.02, tout: 0.02, end: 0.9, wob: 0.01, wn: 0.1, cap: true });
      }
    }
    // longitudinal veins by rank, each thinning toward the margin
    const VW = damsel ? [0.24, 0.21, 0.2, 0.19, 0.17] : [0.25, 0.27, 0.23, 0.16, 0.22, 0.21, 0.19, 0.17];
    W.V.forEach((v, i) => {
      const ue = uEnd(v);
      if (ue <= v.us + 0.02) return;
      const thin = v.us > 0.2 ? 0.7 : 0.55; // intercalary veins start thin and stay thin
      D.line(part, veinPts(v, v.us, ue), { w: VW[i] || 0.17, tin: v.us > 0.2 ? 1.2 : 0.3, tout: 0.8, end: 0.6, wn: 0.06, press: (t) => lerp(1, thin, smoothstep(0.1, 1, t)) });
    });
    // arculus and discoidal triangle
    if (triUV) {
      const V2 = W.V[2], V5 = W.V[5];
      const ua = W.fw ? 0.1 : 0.105;
      D.line(part, [Fm(ua, V2.f(ua)), Fm(ua + 0.004, (V2.f(ua) + V5.f(ua)) / 2), Fm(ua + 0.006, V5.f(ua) + 0.01)], { w: 0.2, tin: 0.1, tout: 0.1, end: 0.7 });
      const tri = triUV.map((q) => Fm(q[0], q[1]));
      D.line(part, tri.concat([tri[0], tri[1]]), { w: 0.18, tin: 0, tout: 0, end: 1 });
      D.line(part, [I.mix2(tri[0], tri[1], 0.5), I.mix2(tri[1], tri[2], 0.45)], { w: 0.07, tin: 0.05, tout: 0.05, end: 0.8 });
    }
    // pterostigma: a dark engraved cell braced at its proximal end
    {
      const o = stigUV.map((q) => Fm(q[0], q[1]));
      D.wash(part, o, PAL.ink, { alpha: 0.32, layers: 3, amp: 0.03 });
      D.wash(part, o, PAL.umber, { alpha: 0.45, layers: 2, amp: 0.03 });
      const F = (u, v) => Fm(lerp(W.stig.ua, W.stig.ub, u), v * Rs.f(lerp(W.stig.ua, W.stig.ub, u)));
      D.hatch(part, F, (u, v) => clamp(0.88 - 0.55 * smoothstep(0.45, 0.0, v) * smoothstep(0.7, 0.25, u), 0, 1), { along: 'u', ar: [0.03, 0.97], cr: [0.06, 0.94], pitch: D.pitch * 0.7, cover: 0.9, wmin: 0.03 });
      D.contour(part, o, { w: 0.15 });
      const u0 = W.stig.ua;
      D.line(part, [Fm(u0 - 0.006, 0), Fm(u0 + 0.004, Rs.f(u0 + 0.004))], { w: 0.17, tin: 0.05, tout: 0.05, end: 0.8 });
    }
    // nodus: the notch where the subcosta meets the costa, braced to the radius
    {
      const un = damsel ? 0.3 : 0.45;
      const vN = W.V[min(2, W.V.length - 1)].f(un);
      D.line(part, [Fm(un - 0.006, -0.015), Fm(un + 0.004, vN * 0.55), Fm(un + 0.006, vN)], { w: 0.2, tin: 0.05, tout: 0.3, end: 0.5 });
      D.fillPoly(part, [Fm(un - 0.012, -0.01), Fm(un, 0.035), Fm(un + 0.012, -0.01)]);
    }
    D.contour(part, outline, { w: 0.15, shade: 0.3 });
  }

  function drawDragonfly(P, D) {
    const C = COLS[P.colour];
    const R = I.makeRng('odo-draw:' + P.seed);
    const Wf = makeWing(P, 'f'), Wh = makeWing(P, 'h');
    for (const W of [Wh, Wf]) for (const s of [1, -1]) drawWing(P, D, W, s, R);
    const bodyWash = (part, poly, o) => { for (const [c, a] of C.body) D.wash(part, poly, c, Object.assign({ alpha: a, layers: 3, amp: 0.15 }, o || {})); };
    const damsel = P.kind === 'damsel';
    // abdomen, back to front so each segment overlaps the next
    const y0 = P.thL * (damsel ? 0.45 : 0.5);
    const L = P.abL;
    const segB = [0, 0.045, 0.1, 0.2, 0.31, 0.42, 0.53, 0.64, 0.75, 0.86, 0.95, 1];
    const segOf = (t) => { let k = 0; while (k < segB.length - 2 && segB[k + 1] <= t) k++; return k; };
    // swollen s1-2, a waist at s3, slender s4-6, a club at s7-9, a narrow s10; each segment
    // telescopes, narrow at its front joint
    const prof = (t) => {
      let w = damsel ? P.abW * (0.74 + 0.6 * exp(-(((t - 0.035) / 0.065) ** 2)) - 0.05 * exp(-(((t - 0.16) / 0.05) ** 2)))
        : P.abW * 0.74 * (1 + 0.85 * exp(-(((t - 0.045) / 0.06) ** 2)) - 0.37 * exp(-(((t - 0.15) / 0.045) ** 2)) - 0.12 * exp(-(((t - 0.33) / 0.12) ** 2)));
      w *= 1 + (P.club + (damsel ? 0.1 : 0.12)) * exp(-(((t - 0.79) / (damsel ? 0.11 : 0.1)) ** 2));
      w *= 1 - 0.35 * smoothstep(0.93, 1, t);
      const k = segOf(t), f = (t - segB[k]) / (segB[k + 1] - segB[k]);
      if (t > 0.1) w *= 0.92 + 0.08 * smoothstep(0, 0.4, f);
      return w * 0.5;
    };
    const cl = []; for (let i = 0; i <= 160; i++) cl.push([0, y0 + L * i / 160]);
    const tm = S.tubeMap(cl, prof);
    // appendages
    {
      const part = D.part('appendages');
      for (const s of [1, -1]) {
        const b = tm(0.995, s > 0 ? 0.8 : 0.2);
        const c = I.catmull([b, add(b, [s * 0.4, 1.5]), add(b, [s * 0.1, 3.0])], 6);
        D.line(part, c, { w: 0.22, tin: 0.1, tout: 0.8, end: 0.3 });
      }
    }
    for (let k = segB.length - 2; k >= 0; k--) {
      const part = D.part('seg');
      const ua = segB[k], ub = segB[k + 1] + 0.012;
      const o = []; for (let i = 0; i <= 14; i++) o.push(tm(lerp(ua, ub, i / 14), 1)); for (let i = 14; i >= 0; i--) o.push(tm(lerp(ua, ub, i / 14), 0));
      const sub0 = []; for (let i = 0; i <= 8; i++) { const v = i / 8; const p = tm(ub, v); sub0.push([p[0], p[1] + 0.35 * sin(PI * v)]); }
      const poly = o.slice(0, 15).concat(sub0.reverse().slice(1), o.slice(16));
      D.sil(part, poly);
      // paired dorsal spots stay pale: holes in the body glaze, a straw glaze, no engraving, a rim
      const spots = [];
      if (P.abPattern === 'spots' && k > 1 && k < 10) for (const v of [0.31, 0.69]) {
        const g = lerp(0.75, 1.15, smoothstep(2, 8, k)); // spots grow toward the club
        const c = tm(lerp(ua, ub, 0.68), v), rx = prof(lerp(ua, ub, 0.68)) * 0.22 * g, ry = (ub - ua) * L * 0.17 * g;
        const tilt = (v < 0.5 ? -1 : 1) * 0.28; // wedges converging forward, toward the carina
        const sp = []; for (let i = 0; i < 22; i++) { const a = i / 22 * 2 * PI; const egg = 1 + 0.3 * sin(a); sp.push(add(c, I.rot([cos(a) * rx * egg, sin(a) * ry], tilt))); }
        spots.push(sp);
      }
      if (spots.length) for (const [c, a] of C.body) D.washHoles(part, poly, spots, c, { alpha: a, layers: 3, amp: 0.15 });
      else bodyWash(part, poly);
      for (const sp of spots) { D.wash(part, sp, PAL.straw, { alpha: 0.5, layers: 2, amp: 0.02 }); D.wash(part, sp, PAL.ochre, { alpha: 0.18, layers: 1, amp: 0.02, shrink: 0.4 }); }
      const inSpot = (p) => spots.some((sp) => I.pip(p, sp));
      if (P.abPattern === 'rings' && k > 1) { const q = []; for (let i = 0; i <= 8; i++) q.push(tm(lerp(ub - (ub - ua) * 0.28, ub, i / 8), 1)); for (let i = 8; i >= 0; i--) q.push(tm(lerp(ub - (ub - ua) * 0.28, ub, i / 8), 0)); D.wash(part, q, PAL.ink, { alpha: 0.6, layers: 3, amp: 0.06 }); }
      if (P.abPattern === 'stripe') { const q = []; for (let i = 0; i <= 8; i++) q.push(tm(lerp(ua, ub, i / 8), 0.58)); for (let i = 8; i >= 0; i--) q.push(tm(lerp(ua, ub, i / 8), 0.42)); D.wash(part, q, PAL.ink, { alpha: 0.55, layers: 2, amp: 0.04 }); }
      const F = (u, v) => tm(lerp(ua, ub, u), v);
      const tone = D.shadeFn(F, (u, v) => prof(lerp(ua, ub, u)) * sqrt(max(0, 1 - (2 * v - 1) ** 2)), { alb: C.alb, gloss: 0.5, hiw: 0.08, k: 0.95 });
      // darker at the front joint, under the previous segment
      const tone2 = (u, v) => clamp(tone(u, v) + 0.35 * smoothstep(0.16, 0.0, u), 0, 1) * (spots.length && inSpot(F(u, v)) ? 0.1 : 1);
      D.hatch(part, F, tone2, { along: 'v', ar: [0.0, 1], cr: [0.05, 0.95], pitch: D.pitch * 0.9 });
      for (const sp of spots) D.contour(part, sp, { w: 0.06, shade: 0.6, wob: 0.01 });
      // transverse carina at mid-segment, and the joint ring
      if (k > 1 && k < 10) {
        const cq = []; for (let i = 0; i <= 10; i++) { const v = 0.08 + 0.84 * i / 10; const p = F(0.45, v); cq.push([p[0], p[1] + 0.25 * sin(PI * v)]); }
        D.line(part, cq, { w: 0.07, tin: 0.4, tout: 0.4 });
      }
      if (k > 0) {
        const rq = []; for (let i = 0; i <= 12; i++) { const v = i / 12; const p = F(0.02, v); rq.push([p[0], p[1] + 0.3 * sin(PI * v)]); }
        D.line(part, rq, { w: 0.18, tin: 0.3, tout: 0.3, end: 0.4 });
      }
      D.contour(part, poly, { w: 0.2, shade: 0.7 });
    }
    // thorax
    {
      const part = D.part('thorax');
      const tw = P.thW / 2, tl = P.thL;
      const o = I.catmull([[0, -tl * 0.62], [tw * 0.75, -tl * 0.52], [tw, -tl * 0.05], [tw * 0.82, tl * 0.4], [tw * 0.3, tl * 0.58], [-tw * 0.3, tl * 0.58], [-tw * 0.82, tl * 0.4], [-tw, -tl * 0.05], [-tw * 0.75, -tl * 0.52]], 8, true);
      D.sil(part, o);
      const F = (u, v) => { const x = (v * 2 - 1) * tw * (0.75 + 0.25 * sin(PI * clamp(u, 0, 1))); return [x, lerp(-tl * 0.6, tl * 0.56, u)]; };
      const sv = 0.2, sw = 0.07;
      const stripeIn = (u, v) => { const a = abs(v - 0.5); return u > 0.12 && u < 0.85 && abs(a - sv) < sw * (1 - 0.4 * u) ? 1 : 0; };
      const stripes = [];
      for (const s of [1, -1]) {
        const st = [];
        for (let i = 0; i <= 12; i++) { const u = lerp(0.12, 0.85, i / 12); st.push(F(u, 0.5 + s * (sv - sw * (1 - 0.4 * u)))); }
        for (let i = 12; i >= 0; i--) { const u = lerp(0.12, 0.85, i / 12); st.push(F(u, 0.5 + s * (sv + sw * (1 - 0.4 * u)))); }
        stripes.push(st);
      }
      for (const [c, a] of C.body) D.washHoles(part, o, stripes, c, { alpha: a, layers: 3, amp: 0.12, shrink: 0.4, focus: [-tw * 0.4, -tl * 0.3] });
      for (const st of stripes) D.wash(part, st, PAL.straw, { alpha: 0.55, layers: 2, amp: 0.03 });
      const tone0 = D.shadeFn(F, (u, v) => tw * 0.9 * sqrt(max(0, 1 - (2 * v - 1) ** 2)) * (0.7 + 0.3 * sin(PI * clamp(u, 0, 1))), { alb: C.alb, gloss: 0.5, hiw: 0.1 });
      const tone = (u, v) => tone0(u, v) * (stripeIn(u, v) ? 0.25 : 1);
      D.hatch(part, F, tone, { along: 'u', ar: [0, 1], cr: [0.0, 1] });
      D.line(part, [[0, -tl * 0.55], [0, tl * 0.5]], { w: 0.1 });
      D.contour(part, o, { w: 0.26 });
    }
    // head and eyes
    {
      const hy = -P.thL * 0.62 - P.eyeR * 0.55;
      {
        const part = D.part('frons');
        const fy = P.eyesApart ? hy - P.eyeR * 0.1 : hy - P.eyeR * 0.78;
        const fw = P.eyesApart ? P.headW * 0.32 : P.eyeR * 0.95;
        const fr = I.ellipsePoly([0, fy], fw, P.eyeR * 0.5, 0, 40);
        D.sil(part, fr);
        bodyWash(part, fr);
        D.wash(part, fr, PAL.straw, { alpha: 0.35, layers: 2, amp: 0.05 });
        const F = (u, v) => [(v * 2 - 1) * fw * sqrt(max(0, 1 - (2 * u - 1) ** 2)), fy + (2 * u - 1) * P.eyeR * 0.5];
        const tone = D.shadeFn(F, (u, v) => P.eyeR * 0.4 * sqrt(max(0, 1 - (2 * v - 1) ** 2)) * sqrt(max(0, 1 - (2 * u - 1) ** 2)), { alb: 0.55, gloss: 0.4, hiw: 0.1 });
        D.hatch(part, F, tone, { along: 'v', ar: [0.02, 0.98], cr: [0.05, 0.95], pitch: D.pitch * 0.85, cover: 0.75 });
        D.contour(part, fr, { w: 0.2 });
      }
      // compound eyes: tilted engraved spheres, bare highlight, facet stipple in the half-tones
      for (const s of [1, -1]) {
        const ex = D.part('eye');
        const ec = P.eyesApart ? [s * (P.headW * 0.5 - P.eyeR * 0.75), hy + P.eyeR * 0.2] : [s * P.eyeR * 0.78, hy];
        const rx = P.eyeR * (P.eyesApart ? 0.9 : 1.0), ry = P.eyeR * 1.12, ang = s * 0.15;
        const ep = I.ellipsePoly(ec, rx, ry, ang, 72);
        D.sil(ex, ep);
        // glaze graded from the lit upper left to the shadowed lower side
        D.wash(ex, ep, C.eye[0], { alpha: C.eye[1] * 0.75, layers: 4, amp: 0.05, shrink: 0.45, focus: add(ec, [rx * 0.25, ry * 0.35]) });
        D.wash(ex, ep, PAL.ink, { alpha: 0.2, layers: 3, amp: 0.06, shrink: 0.7, focus: add(ec, [rx * 0.45, ry * 0.55]) });
        const tilt = ang + s * 0.55;
        const F = (u, v) => { const lat = (u - 0.5) * PI * 0.985, lon = (v - 0.5) * PI * 0.985; const q = I.rot([sin(lon) * cos(lat), sin(lat)], tilt); return [ec[0] + q[0] * rx, ec[1] + q[1] * ry]; };
        const H = (u, v) => { const lat = (u - 0.5) * PI * 0.985, lon = (v - 0.5) * PI * 0.985; return P.eyeR * cos(lon) * cos(lat); };
        const tone = D.shadeFn(F, H, { alb: 0.62, gloss: 1, hiw: 0.3, k: 1, amb: 0.12 });
        D.hatch(ex, F, tone, { along: 'u', ar: [0.01, 0.99], cr: [0.01, 0.99], pitch: D.pitch * 0.85, cover: 0.85, wmin: 0.035 });
        const hp = D.P(add(ec, [-rx * 0.4, -ry * 0.42]));
        D.stipple(ex, ep, (p) => { const d = dist(p, hp) / (P.eyeR * D.s); return 0.32 * smoothstep(0.25, 0.6, d) * smoothstep(1.6, 0.9, d); }, { r: 0.05, sp: 0.2 });
        D.contour(ex, ep, { w: 0.24 });
      }
      if (!P.eyesApart) {
        // dorsal eye seam and the occipital triangle behind it
        const part = D.part('occiput');
        const yS0 = hy - P.eyeR * 0.75, yS1 = hy + P.eyeR * 0.5;
        D.line(part, [[0, yS0], [0.03, (yS0 + yS1) / 2], [0, yS1]], { w: 0.16, tin: 0.3, tout: 0.1, end: 0.3 });
        const tri = [[0, yS1 + P.eyeR * 0.22], [P.eyeR * 0.24, hy + P.eyeR * 1.1], [-P.eyeR * 0.24, hy + P.eyeR * 1.1]];
        const tp = I.catmull(tri, 6, true);
        D.sil(part, tp);
        D.wash(part, tp, PAL.straw, { alpha: 0.4, layers: 2, amp: 0.03 });
        D.hatch(part, (u, v) => I.mix2(I.mix2(tri[1], tri[2], v), tri[0], u * 0.9), (u, v) => 0.25 + 0.3 * v, { along: 'u', pitch: D.pitch * 0.8, cover: 0.8 });
        D.contour(part, tp, { w: 0.13 });
      }
    }
  }

  function boundsDragonfly(P) {
    const pts = [];
    for (const w of ['f', 'h']) { const W = makeWing(P, w); for (let i = 0; i <= 30; i++) { for (const v of [0, 1]) { const p = W.F(i / 30, v); pts.push(p, [-p[0], p[1]]); } } }
    pts.push([0, P.thL * 0.45 + P.abL + 3], [0, -P.thL * 0.62 - P.eyeR * 2]);
    return I.bbox(pts);
  }

  G.DRAGONFLY = { genDragonfly, drawDragonfly, boundsDragonfly, makeWing };
})(typeof globalThis !== 'undefined' ? globalThis : this);

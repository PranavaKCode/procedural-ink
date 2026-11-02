// composes the plate: specimens in a symmetric cabinet layout, figure numbers, latin legend,
// title, paper, plate mark and seal
(function (G) {
  'use strict';
  const I = G.INK, S = G.SPEC;
  const { PI, sin, cos, min, max, floor } = Math;

  const W = 300, H = 400;

  const FAMS = () => ({
    beetle: { gen: G.BEETLE.genBeetle, draw: G.BEETLE.drawBeetle, bounds: G.BEETLE.boundsBeetle, sexify: G.BEETLE.sexify },
    moth: { gen: G.MOTH.genMoth, draw: G.MOTH.drawMoth, bounds: G.MOTH.boundsMoth, sexify: G.MOTH.sexify },
    dragonfly: { gen: G.DRAGONFLY.genDragonfly, draw: G.DRAGONFLY.drawDragonfly, bounds: G.DRAGONFLY.boundsDragonfly },
  });

  // slots: family, centre (x, y), box (w, h) in plate units, archetypes
  const LAYOUT = [
    { fam: 'dragonfly', x: 150, y: 84, w: 132, h: 82, kinds: ['hawker', 'skimmer'] },
    { fam: 'moth', x: 50, y: 74, w: 58, h: 48, kinds: ['hawk', 'noctuid', 'geometrid'] },
    { fam: 'moth', x: 250, y: 74, w: 58, h: 48, kinds: ['hawk', 'noctuid', 'geometrid'] },
    { fam: 'beetle', x: 75, y: 124.5, w: 32, h: 40, kinds: ['ladybird', 'jewel', 'carabid'] },
    { fam: 'beetle', x: 225, y: 124.5, w: 32, h: 40, kinds: ['ladybird', 'jewel', 'carabid'] },
    { fam: 'beetle', x: 42, y: 184, w: 48, h: 76, kinds: ['stag', 'longhorn', 'scarab'] },
    { fam: 'moth', x: 150, y: 188, w: 124, h: 94, kinds: ['emperor'], numY: 214 },
    { fam: 'beetle', x: 258, y: 184, w: 48, h: 76, kinds: ['stag', 'longhorn', 'scarab'] },
    { fam: 'moth', x: 54, y: 262, w: 66, h: 50, kinds: ['tiger', 'butterfly', 'swallowtail'] },
    { fam: 'beetle', x: 150, y: 262, w: 40, h: 50, kinds: ['ladybird', 'jewel', 'weevil'] },
    { fam: 'moth', x: 246, y: 262, w: 66, h: 50, kinds: ['tiger', 'butterfly', 'swallowtail'] },
    { fam: 'beetle', x: 40, y: 316, w: 35, h: 40, kinds: ['carabid', 'tiger', 'weevil'] },
    { fam: 'beetle', x: 95, y: 316, w: 35, h: 40, kinds: ['jewel', 'ladybird', 'scarab'] },
    { fam: 'beetle', x: 150, y: 314.5, w: 37, h: 46, kinds: ['weevil', 'carabid', 'longhorn'] },
    { fam: 'beetle', x: 205, y: 316, w: 35, h: 40, kinds: ['jewel', 'ladybird', 'scarab'] },
    { fam: 'beetle', x: 260, y: 316, w: 35, h: 40, kinds: ['carabid', 'tiger', 'weevil'] },
  ];

  const PAIRS = { 1: 2, 2: 1, 3: 4, 4: 3, 5: 7, 7: 5, 8: 10, 10: 8, 11: 15, 15: 11, 12: 14, 14: 12 };

  const ROMAN = (n) => { const r = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = ''; for (const [v, c] of r) while (n >= v) { s += c; n -= v; } return s; };

  function fontCSS() {
    const F = G.FONTS;
    if (!F) return '';
    return `@font-face{font-family:'FellR';src:url(data:font/woff;base64,${F.roman}) format('woff');}` +
      `@font-face{font-family:'FellI';src:url(data:font/woff;base64,${F.italic}) format('woff');}` +
      `@font-face{font-family:'FellSC';src:url(data:font/woff;base64,${F.sc}) format('woff');}`;
  }

  // seeded specimens for each slot, or curated [fam, seed, arch, sex?] overrides
  const DIMORPHIC = (fam, arch) => fam === 'moth' || (fam === 'beetle' && (arch === 'stag' || arch === 'scarab' || arch === 'longhorn'));
  function choose(seed, curated) {
    const R = I.makeRng('plate:' + seed);
    const out = [];
    LAYOUT.forEach((sl, i) => {
      let fam = sl.fam, s, arch, sex = null;
      if (curated && curated[i]) { [fam, s, arch, sex] = curated[i]; }
      else {
        s = String(seed) + '.' + i + '.' + R.int(0, 1e6);
        // mirrored partners share an archetype
        const partner = PAIRS[i] != null ? PAIRS[i] : i;
        const lo = min(i, partner);
        arch = I.makeRng('plate-arch:' + seed + ':' + lo).pick(LAYOUT[lo].kinds);
        if (!sl.kinds.includes(arch)) arch = R.pick(sl.kinds);
        // about half of the dimorphic pairs show one species as male and female
        if (partner !== i && DIMORPHIC(fam, arch) && I.makeRng('plate-sex:' + seed + ':' + lo).chance(0.5)) {
          if (i === lo) sex = 'm';
          else if (out[lo].P.arch === arch && out[lo].P.sex === 'm') { sex = 'f'; s = out[lo].P.seed; }
        }
      }
      const F = FAMS()[fam];
      const P = F.gen(s, arch || null);
      if (sex && F.sexify) F.sexify(P, sex);
      out.push({ slot: sl, fam, P });
    });
    linkPairs(out);
    return out;
  }
  // a male and female pair: the female's legend entry reads idem and both share one scale
  function fitScale(pk) { const b = FAMS()[pk.fam].bounds(pk.P); return min(pk.slot.w / b.w, pk.slot.h / b.h); }
  function linkPairs(out) {
    for (const pk of out) { delete pk.idem; delete pk.scFix; }
    for (const k of Object.keys(PAIRS)) {
      const i = +k, j = PAIRS[k];
      if (j < i || !out[i] || !out[j]) continue;
      const a = out[i], b = out[j];
      if (a.fam === b.fam && a.P.seed === b.P.seed && a.P.arch === b.P.arch && a.P.sex && b.P.sex && a.P.sex !== b.P.sex) {
        (a.P.sex === 'f' ? a : b).idem = a.P.sex === 'f' ? j : i;
        a.scFix = b.scFix = min(fitScale(a), fitScale(b));
      }
    }
    return out;
  }

  // engraved male and female signs (the font has none); (x, y) is the left end on the baseline
  function sexGlyph(x, y, size, sex, seed) {
    const N = I.makeNoise('sexg' + seed);
    const r = size * 0.22, w = size * 0.072;
    const st = (pts, ww) => { const q = I.strokePoly(pts, { w: ww || w, tin: 0.04, tout: 0.04, end: 0.7, wob: 0.006, wn: 0.1 }, N); return q ? I.pathOf(I.polyArea(q) < 0 ? q.slice().reverse() : q) : ''; };
    const circ = (c) => { const o = []; for (let k = 0; k <= 34; k++) { const a = -2.2 + k / 32 * 2 * PI; o.push([c[0] + cos(a) * r, c[1] + sin(a) * r]); } return o; };
    let d = '';
    if (sex === 'm') {
      const c = [x + r + w, y - r * 1.15];
      const a = [Math.SQRT1_2, -Math.SQRT1_2];
      const p0 = [c[0] + a[0] * r, c[1] + a[1] * r], p1 = [c[0] + a[0] * r * 2.25, c[1] + a[1] * r * 2.25];
      d += st(circ(c)) + st([p0, p1]) + st([[p1[0] - r * 0.85, p1[1] + 0.02], p1], w * 0.9) + st([[p1[0] + 0.02, p1[1] + r * 0.85], p1], w * 0.9);
      return { d, w: r * 2.6 + w * 2 };
    }
    const c = [x + r + w, y - r * 2.25];
    d += st(circ(c)) + st([[c[0], c[1] + r], [c[0], c[1] + r * 2.25]]) + st([[c[0] - r * 0.6, c[1] + r * 1.62], [c[0] + r * 0.6, c[1] + r * 1.62]]);
    return { d, w: r * 2 + w * 2 };
  }
  const adv = (s, face, size) => { const A = G.FONTS && G.FONTS.adv && G.FONTS.adv[face]; let t = 0; for (const ch of s) t += A ? (A[ch] != null ? A[ch] : 0.5) : 0.5; return t * size; };

  let NONCE = 0;
  function specimenAt(fam, P, sl, idx, opt, scFix) {
    const F = FAMS()[fam];
    const b = F.bounds(P);
    const sc = scFix || min(sl.w / b.w, sl.h / b.h);
    const T = I.Tmul(I.Tsrt(1, 0, sl.x, sl.y), I.Tsrt(sc, 0, -b.cx * sc, -b.cy * sc));
    const D = new S.Drawer(T, fam + P.seed, { pitch: opt.pitch || 0.42, fill: opt.fill });
    F.draw(P, D);
    const e = S.emitParts(D.parts, { prefix: 'p' + idx + '_' + (NONCE++).toString(36) + '_' });
    const bb = { x0: sl.x - b.w * sc / 2, x1: sl.x + b.w * sc / 2, y0: sl.y - b.h * sc / 2, y1: sl.y + b.h * sc / 2 };
    return { e, bb, sc, D };
  }

  const INK0 = () => I.hex(S.PAL.ink);

  // unique names across a plate: re-roll with a salt when a genus or epithet repeats
  function uniqueName(P, used) {
    for (let k = 0; k < 40; k++) {
      const nm = G.NAMES.binomial(P, k || null);
      const es = nm.epithet.replace(/(us|a|um|is|e)$/, '');
      const keys = ['g:' + nm.genus, 'e:' + es].concat(k < 25 ? ['s:' + nm.stem] : []);
      if (!used || keys.every((q) => !used.has(q))) { if (used) { used.add('g:' + nm.genus); used.add('e:' + es); used.add('s:' + nm.stem); } return nm; }
    }
    return G.NAMES.binomial(P);
  }

  // engraved cast shadow. sil: [[poly, weight]] in plate units. the silhouettes are rasterised,
  // blurred and shifted by the light offset, and the density is cut as 45-degree graver lines
  function castShadow(sil, off, seed) {
    if (!sil.length) return '';
    const g = 0.12; // grid cell
    const all = []; for (const [q] of sil) for (const v of q) all.push(v);
    const bb = I.bbox(all);
    const pad = off * 2.2 + 2;
    const x0 = bb.x0 - 1, y0 = bb.y0 - 1;
    const gw = Math.ceil((bb.w + pad + 2) / g), gh = Math.ceil((bb.h + pad + 2) / g);
    const M = new Float32Array(gw * gh); // caster, weighted (glassy wings cast little)
    const Cv = new Float32Array(gw * gh); // cover: no shadow under the specimen itself
    for (const [q, wt] of sil) { // scanline fill, even-odd per polygon, max across polygons
      const qb = I.bbox(q);
      const r0 = Math.max(0, floor((qb.y0 - y0) / g)), r1 = Math.min(gh - 1, Math.ceil((qb.y1 - y0) / g));
      const xs = [];
      for (let r = r0; r <= r1; r++) {
        const y = y0 + (r + 0.5) * g;
        xs.length = 0;
        for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
          const a = q[i], b = q[j];
          if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        }
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2) {
          const c0 = Math.max(0, Math.ceil((xs[k] - x0) / g - 0.5)), c1 = Math.min(gw - 1, floor((xs[k + 1] - x0) / g - 0.5));
          for (let c = c0; c <= c1; c++) { if (M[r * gw + c] < wt) M[r * gw + c] = wt; Cv[r * gw + c] = 1; }
        }
      }
    }
    // penumbra: three box blurs, radius growing with the lift of the specimen
    const rad = Math.max(1, Math.round(off * 0.42 / g));
    let A = Float32Array.from(M), B = new Float32Array(gw * gh);
    for (let pass = 0; pass < 3; pass++) {
      for (let r = 0; r < gh; r++) { let acc = 0; const o = r * gw; for (let c = -rad; c <= rad; c++) acc += A[o + Math.min(gw - 1, Math.max(0, c))]; for (let c = 0; c < gw; c++) { B[o + c] = acc / (2 * rad + 1); acc += A[o + Math.min(gw - 1, c + rad + 1)] - A[o + Math.max(0, c - rad)]; } }
      for (let c = 0; c < gw; c++) { let acc = 0; for (let r = -rad; r <= rad; r++) acc += B[Math.min(gh - 1, Math.max(0, r)) * gw + c]; for (let r = 0; r < gh; r++) { A[r * gw + c] = acc / (2 * rad + 1); acc += B[Math.min(gh - 1, r + rad + 1) * gw + c] - B[Math.max(0, r - rad) * gw + c]; } }
    }
    const at = (G, x, y) => { // bilinear
      const fx = (x - x0) / g - 0.5, fy = (y - y0) / g - 0.5;
      const c = floor(fx), r = floor(fy);
      if (c < 0 || r < 0 || c >= gw - 1 || r >= gh - 1) return 0;
      const tx = fx - c, ty = fy - r, o = r * gw + c;
      return (G[o] * (1 - tx) + G[o + 1] * tx) * (1 - ty) + (G[o + gw] * (1 - tx) + G[o + gw + 1] * tx) * ty;
    };
    const ox = off * 0.8, oy = off;
    const dens = (x, y) => at(A, x - ox, y - oy) * Math.max(0, 1 - 1.15 * at(Cv, x, y));
    // graver lines at 45 degrees
    const N = I.makeNoise(seed), R = I.makeRng(seed);
    const pitch = 0.5, step = 0.14;
    const dir = [Math.SQRT1_2, -Math.SQRT1_2], nrm = [Math.SQRT1_2, Math.SQRT1_2];
    const cx = bb.cx + ox, cy = bb.cy + oy;
    const half = (Math.hypot(bb.w, bb.h) + pad) / 2 + 2;
    let d = '';
    for (let k = -half; k <= half; k += pitch) {
      const kk = k + (R.f() - 0.5) * pitch * 0.12;
      const pts = [], wv = [];
      for (let t = -half; t <= half; t += step) {
        const x = cx + nrm[0] * kk + dir[0] * t, y = cy + nrm[1] * kk + dir[1] * t;
        const v = dens(x, y);
        pts.push([x, y]); wv.push(v > 0.07 ? Math.pow(Math.min(1, (v - 0.04) / 0.8), 0.9) : 0);
      }
      for (const [rp, rw] of I.runsAbove(pts, wv, 0.02)) {
        if (rp.length < 3) continue;
        const poly = I.strokePoly(rp, { w: 0.25, wv: rw, tin: 0.3, tout: 0.3, end: 0.25, wob: 0.025, wobf: 0.5, wn: 0.15, wnf: 1.1, step: 0.18 }, N);
        if (poly && poly.length > 2) d += I.pathOf(I.polyArea(poly) < 0 ? poly.slice().reverse() : poly);
      }
    }
    return d;
  }

  function fragment(pk, i, opt, used) {
    const r = specimenAt(pk.fam, pk.P, pk.slot, i, opt || {}, pk.scFix);
    const sex = pk.P.sex || null;
    const nm = pk.idem != null ? { genus: '', epithet: '', stem: '', idem: pk.idem, sex } : Object.assign({}, uniqueName(pk.P, used), { sex });
    const ny = pk.slot.numY || min(r.bb.y1 + 4.2, pk.slot.y + pk.slot.h / 2 + 4.5);
    let num = `<text x="${I.fmt(pk.slot.x)}" y="${I.fmt(ny)}" font-family="FellI" font-size="3.3" text-anchor="middle" fill="${INK0()}" fill-opacity="0.9">${i + 1}.</text>`;
    if (sex) num += `<path d="${sexGlyph(pk.slot.x + adv(i + 1 + '.', 'italic', 3.3) / 2 + 0.6, ny, 3.3, sex, 'n' + i).d}" fill="${INK0()}" fill-opacity="0.9"/>`;
    // engraved cast shadow of the pinned specimen
    let shadow = '';
    if (!(opt && opt.noShadow)) {
      const sil = [];
      for (const p of r.D.parts) {
        for (const q of p.sil) if (q.length > 2) sil.push([q, p.shadowW != null ? p.shadowW : 1]);
        if (p.clip && !p.sil.length) for (const q of p.clip) if (q.length > 2) sil.push([q, 0.3]); // glassy wings
      }
      const off = (pk.fam === 'beetle' ? 1.6 : 2.4) * min(1.3, max(0.75, r.sc * 0.5));
      shadow = castShadow(sil, off, 'sh:' + pk.fam + pk.P.seed);
    }
    return { defs: r.e.defs, wash: r.e.wash, ink: r.e.ink, num, name: nm, bb: r.bb, shadow };
  }

  function legendSVG(names, opt) {
    const ink0 = INK0();
    let text = '';
    const ly = (opt && opt.legendY) || 351.5;
    const cols = names.length > 12 ? 4 : 3, rows = Math.ceil(names.length / cols);
    const colW = (W - 56) / cols;
    const fs = 3.05;
    names.forEach((nm, i) => {
      const c = floor(i / rows), r = i % rows;
      const x = 28 + c * colW, y = ly + r * 4.5;
      const T = (xx, s, face, size, op) => `<text x="${I.fmt(xx)}" y="${I.fmt(y)}" font-family="${face === 'italic' ? 'FellI' : 'FellR'}" font-size="${size}" fill="${ink0}" fill-opacity="${op || 0.92}">${I.esc(s)}</text>`;
      const n0 = (i + 1) + '.';
      let xx = x;
      text += T(xx, n0, 'roman', fs); xx += adv(n0 + ' ', 'roman', fs);
      const label = nm.idem != null ? 'Idem' : nm.genus + ' ' + nm.epithet;
      text += T(xx, label, 'italic', fs); xx += adv(label, 'italic', fs);
      if (nm.sex) { const g = sexGlyph(xx + 0.6, y, fs, nm.sex, 'l' + i); text += `<path d="${g.d}" fill="${ink0}" fill-opacity="0.92"/>`; xx += 0.6 + g.w + 0.05; }
      if (nm.idem != null) text += T(xx, '.', 'roman', fs);
      else { text += T(xx, ',', 'italic', fs); xx += adv(', ', 'italic', fs); text += T(xx, 'Nob.', 'roman', 2.6); }
    });
    return text;
  }

  // paper, title, plate number and seal
  function shell(seed, opt) {
    opt = opt || {};
    const pm = { x: 13, y: 13, w: W - 26, h: H - 26 };
    const pap = G.PAPER.paper(W, H, seed, Object.assign({ platemark: pm }, opt.paper || {}));
    const ink0 = INK0();
    let text = '';
    const plateNo = opt.plateNo || ROMAN(1 + (I.makeRng('pn' + seed).int(1, 9)));
    text += `<text x="${W / 2}" y="31" font-family="FellSC" font-size="6.2" letter-spacing="1.1" text-anchor="middle" fill="${ink0}">Insecta Imaginaria</text>`;
    text += `<text x="${W - 22}" y="25.5" font-family="FellI" font-size="3.6" text-anchor="end" fill="${ink0}">Tab. ${plateNo}.</text>`;
    const sl = G.PAPER.seal(opt.sealX || 271.5, opt.sealY || 372, opt.sealSize || 9.5, seed, { id: 'a' });
    return { defs: pap.defs + sl.defs, under: pap.under, over: pap.over, tooth: pap.tooth, seal: sl.body, text };
  }

  function assemble(sh, frags, opt) {
    opt = opt || {};
    let defs = sh.defs, wash = '', ink = '', nums = '', shadow = '';
    const names = [];
    for (const f of frags) { if (!f) continue; defs += f.defs; wash += f.wash; ink += f.ink; nums += f.num; names.push(f.name); shadow += f.shadow || ''; }
    const text = sh.text + nums + legendSVG(names, opt);
    const px = opt.px || W * 4;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${px}" height="${px * H / W}">` +
      `<defs><style>${fontCSS()}</style>${defs}</defs>` +
      `<g id="paper">${sh.under}</g>` +
      (opt.noShadow || !shadow ? '' : `<g id="shadow" filter="url(#fInk)"><path d="${shadow}" fill="${INK0()}" fill-opacity="${opt.shadowA || 0.5}"/></g>`) +
      (opt.noWash ? '' : `<g id="wash" style="mix-blend-mode:multiply" filter="url(#fWash)">${wash}</g>`) +
      (opt.noInk ? '' : `<g id="ink" filter="url(#fInk)">${ink}</g>`) +
      (opt.noText ? '' : `<g id="type" filter="url(#fInk)">${text}</g>`) +
      (opt.noSeal ? '' : `<g id="seal">${sh.seal}</g>`) +
      `<g id="tooth" style="mix-blend-mode:multiply">${sh.tooth}</g>` +
      `<g id="platemark">${sh.over}</g>` +
      `</svg>`;
  }

  function plateSVG(seed, opt) {
    opt = opt || {};
    const picks = choose(seed, opt.curated);
    const used = new Set();
    const frags = picks.map((pk, i) => fragment(pk, i, opt, used));
    return assemble(shell(seed, opt), frags, opt);
  }

  G.PLATE = { uniqueName, plateSVG, LAYOUT, PAIRS, choose, linkPairs, sexGlyph, specimenAt, fragment, shell, assemble, W, H, FAMS, fontCSS };
})(typeof globalThis !== 'undefined' ? globalThis : this);

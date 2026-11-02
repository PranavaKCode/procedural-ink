// process figures as svg:
//   node src/process.js <anatomy|seeds|wings|layers|sexes|stages> out.svg
const fs = require('fs');
const path = require('path');
for (const f of ['ink.js', 'specimen.js', 'beetle.js', 'moth.js', 'dragonfly.js', 'names.js', 'paper.js', 'fonts.js', 'plate.js', 'curation.js', 'anatomy.js']) require(path.join(__dirname, f));
const I = globalThis.INK, S = globalThis.SPEC, A = globalThis.ANATOMY, PL = globalThis.PLATE;
const INK0 = I.hex(S.PAL.ink);

function sheet(W, H, seed, body, defs, opt) {
  opt = opt || {};
  const pap = PAPER.paper(W, H, seed, { platemark: opt.platemark || null, foxing: opt.foxing != null ? opt.foxing : 10, vig: 0.08 });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 6}" height="${H * 6}">` +
    `<defs><style>${PL.fontCSS()}</style>${pap.defs}${defs || ''}</defs>` +
    `<g id="paper">${pap.under}</g>${body}` +
    `<g style="mix-blend-mode:multiply">${pap.tooth}</g>${pap.over}</svg>`;
}
const txt = (x, y, s, size, o) => {
  o = o || {};
  return `<text x="${I.fmt(x)}" y="${I.fmt(y)}" font-family="${o.f || 'FellI'}" font-size="${size}" text-anchor="${o.a || 'start'}" fill="${o.c || INK0}" fill-opacity="${o.op || 0.9}"${o.ls ? ` letter-spacing="${o.ls}"` : ''}>${I.esc(s)}</text>`;
};
const layer = (e, opt) => {
  opt = opt || {};
  return `<g style="mix-blend-mode:multiply" filter="url(#fWash)" opacity="${opt.wa != null ? opt.wa : 1}">${e.wash}</g><g filter="url(#fInk)" opacity="${opt.ia != null ? opt.ia : 1}">${e.ink}</g>`;
};
function specimenT(fam, P, cx, cy, size) {
  const F = PL.FAMS()[fam];
  const b = F.bounds(P);
  const sc = size / Math.max(b.w, b.h);
  return { T: I.Tsrt(sc, 0, cx - b.cx * sc, cy - b.cy * sc), sc, b };
}
function drawSpec(fam, P, T, pref) {
  const D = new S.Drawer(T, fam + P.seed, { pitch: 0.42 });
  PL.FAMS()[fam].draw(P, D);
  return { e: S.emitParts(D.parts, { prefix: pref }), D };
}

const args = process.argv.slice(2);
const cmd = args[0];

if (cmd === 'anatomy') {
  const W = 300, H = 200;
  const P = BEETLE.genBeetle('5', 'stag');
  let defs = '', body = '';
  // panel A: exploded
  {
    const { T } = specimenT('beetle', P, 80, 104, 112);
    const k = 6.5;
    const e = A.explodedBeetle(P, T, k);
    defs += e.defs; body += layer(e);
    body += txt(80, 188, 'Fig. A.  Exemplar in partes resolutum.', 3.4, { a: 'middle' });
  }
  // panel B: construction over a faint underlay
  {
    const { T } = specimenT('beetle', P, 218, 104, 112);
    const r = drawSpec('beetle', P, T, 'cb');
    defs += r.e.defs; body += layer(r.e, { wa: 0.35, ia: 0.2 });
    body += `<g>${A.constructionBeetle(P, T)}</g>`;
    body += txt(218, 188, 'Fig. B.  Constructio: coordinatae (u, v), articuli, lumen.', 3.4, { a: 'middle' });
    // light arrow
    const L0 = [282, 22], L1 = [272, 34];
    body += `<path d="M${L0[0]} ${L0[1]}L${L1[0]} ${L1[1]}" stroke="${A.RED}" stroke-width="0.3"/><path d="M${L1[0]} ${L1[1]}l2.2 -0.6l-1.2 -1.9z" fill="${A.RED}"/>`;
    body += txt(283, 20.5, 'lumen', 2.6, { c: A.RED, a: 'middle' });
    // callouts
    const g = BEETLE.shapes(P);
    const call = (sp, tx, ty, label, anchor) => {
      const q = I.Tapply(T, sp);
      return `<path d="M${I.fmt(q[0])} ${I.fmt(q[1])}L${tx} ${ty}" stroke="${INK0}" stroke-width="0.12" stroke-opacity="0.7"/>` +
        `<circle cx="${I.fmt(q[0])}" cy="${I.fmt(q[1])}" r="0.35" fill="${INK0}"/>` + txt(tx + (anchor === 'end' ? -0.8 : 0.8), ty + 0.9, label, 2.5, { a: anchor || 'start', op: 0.85 });
    };
    body += call(g.ely(0.55, 0.7), 262, 130, 'elytron  E(u,v) — superellipse', 'start');
    body += call(g.pro(0.5, 0.75), 262, 92, 'pronotum  P(u,v)', 'start');
    body += call(g.head(0.5, 0.6), 262, 66, 'caput  H(u,v)', 'start');
    body += call([0, P.Le * 0.75], 174, 160, 'sutura (axis symmetriae)', 'end');
    const lg = BEETLE.legGeometry(P)[2];
    const knee = I.add(lg.att, I.mul([Math.cos(lg.ang[0]), Math.sin(lg.ang[0])], lg.len[0]));
    body += call([-knee[0], knee[1]], 174, 140, 'articulus: femur | tibia', 'end');
    body += call([-g.eyeC[0], g.eyeC[1]], 174, 52, 'oculus', 'end');
  }
  // parameter block
  const fmt = (x) => (+x).toFixed(2);
  const lines = [
    `${{ carabid: 'Carabidae', scarab: 'Scarabaeidae', stag: 'Lucanidae', longhorn: 'Cerambycidae', ladybird: 'Coccinellidae', weevil: 'Curculionidae', jewel: 'Buprestidae', tiger: 'Cicindelinae' }[P.arch]} imaginaria  ·  semen ${P.seed}`,
    `elytra L ${fmt(P.Le)}  W/L ${fmt(P.We / P.Le)}  s0 ${fmt(P.s0)}  pa ${fmt(P.pa)}  pb ${fmt(P.pb)}  dome ${fmt(P.dome)}  striae ${P.striae}`,
    `pronotum L ${fmt(P.Lp)}  W ${fmt(P.Wp)}  · mandibula ${fmt(P.mand)} dentes ${P.mandTeeth}  · antenna ${P.antType} ×${P.antSeg}  · gloss ${fmt(P.gloss)}`,
  ];
  lines.forEach((l, i) => { body += txt(150, 12 + i * 3.6, l, 2.55, { a: 'middle', f: 'FellR', op: 0.75 }); });
  fs.writeFileSync(args[1], sheet(W, H, 'anat', body, defs));
  console.log('wrote', args[1]);
} else if (cmd === 'seeds') {
  // a 6 x 6 grid of uncurated seeds across all families and archetypes
  const cols = 6, rows = 6, cell = 50, W = cols * cell + 20, H = rows * cell + 34;
  let defs = '', body = '';
  const fams = [];
  const BA = ['carabid', 'scarab', 'stag', 'longhorn', 'ladybird', 'weevil', 'jewel', 'tiger'];
  const MK = ['noctuid', 'geometrid', 'emperor', 'hawk', 'tiger', 'butterfly', 'swallowtail'];
  const DK = ['hawker', 'skimmer', 'damsel', 'clubtail'];
  for (let i = 0; i < cols * rows; i++) {
    const r = Math.floor(i / cols);
    let fam, arch;
    if (r < 3) { fam = 'beetle'; arch = BA[i % BA.length]; }
    else if (r < 5) { fam = 'moth'; arch = MK[i % MK.length]; }
    else { fam = 'dragonfly'; arch = DK[i % DK.length]; }
    fams.push([fam, String(1000 + i), arch]);
  }
  const used = new Set();
  fams.forEach(([fam, seed, arch], i) => {
    const P = PL.FAMS()[fam].gen(seed, arch);
    // the dragonfly row sits a little lower and smaller
    const cx = 10 + (i % cols + 0.5) * cell, cy = 22 + (Math.floor(i / cols) + 0.45) * cell + (fam === 'dragonfly' ? cell * 0.08 : 0);
    const { T } = specimenT(fam, P, cx, cy, cell * (fam === 'beetle' ? 0.7 : fam === 'dragonfly' ? 0.76 : 0.82));
    const d = drawSpec(fam, P, T, 'sg' + i + '_');
    defs += d.e.defs; body += layer(d.e);
    const nm = PL.uniqueName(P, used);
    body += txt(cx, cy + cell * 0.47, nm.genus + ' ' + nm.epithet, 2.3, { a: 'middle', op: 0.8 });
  });
  body += txt(W / 2, 13, 'Variatio seminum — 36 exemplaria non electa', 4.2, { a: 'middle', f: 'FellSC', ls: 0.5 });
  fs.writeFileSync(args[1], sheet(W, H, 'seeds', body, defs));
  console.log('wrote', args[1]);
} else if (cmd === 'wings') {
  const W = 300, H = 170;
  let defs = '', body = '';
  // left: moth wing construction (fan coordinates, veins from the discal cell)
  {
    const P = MOTH.genMoth('3', 'emperor');
    const { T } = specimenT('moth', P, 92, 92, 150);
    const d = drawSpec('moth', P, T, 'mw');
    defs += d.e.defs;
    // right half finished, left half construction
    const clipR = `<clipPath id="halfR"><rect x="${I.Tapply(T, [0, 0])[0]}" y="0" width="300" height="${H}"/></clipPath>`;
    const clipL = `<clipPath id="halfL"><rect x="0" y="0" width="${I.Tapply(T, [0, 0])[0]}" height="${H}"/></clipPath>`;
    defs += clipR + clipL;
    body += `<g clip-path="url(#halfR)">${layer(d.e)}</g>`;
    body += `<g clip-path="url(#halfL)">${layer(d.e, { wa: 0.25, ia: 0.12 })}</g>`;
    let con = '';
    const ln = (pts, w, a, dash) => `<path d="${I.pathOf(pts.map((p) => I.Tapply(T, [-p[0], p[1]])), false)}" fill="none" stroke="${A.RED}" stroke-width="${w}" stroke-opacity="${a}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
    for (const w of ['f', 'h']) {
      const Wg = MOTH.makeWing(P, w);
      for (let i = 1; i <= 10; i++) { const o = []; for (let j = 0; j <= 30; j++) o.push(Wg.F(i / 10, j / 30)); con += ln(o, 0.07, 0.45, '0.5 0.5'); }
      for (let j = 0; j <= 12; j++) { const o = []; for (let i = 0; i <= 20; i++) o.push(Wg.F(i / 20, j / 12)); con += ln(o, 0.07, 0.4); }
      for (const v of MOTH.wingVeins(Wg)) con += ln(v.map((q) => Wg.F(q[0], q[1])), 0.22, 0.95);
      const o = MOTH.wingOutline(Wg, 120); con += ln(o.concat([o[0]]), 0.2, 0.9);
    }
    body += con;
    body += txt(92, 160, 'Fig. C.  Ala: coordinatae radiales (u, φ), venae ex cellula discali.', 3.1, { a: 'middle' });
  }
  // right: dragonfly hindwing, voronoi venation between the longitudinal veins
  {
    const P = DRAGONFLY.genDragonfly('4', 'hawker');
    const Wg = DRAGONFLY.makeWing(P, 'h');
    // map the wing so it spans the right panel
    const L = Wg.L;
    const sc = 108 / L;
    const base = Wg.F(0, 0);
    const T2 = I.Tmul(I.Tsrt(sc, -Wg.ang, 180, 62), I.Tsrt(1, 0, -base[0], -base[1]));
    // draw the whole dragonfly, keep the right hindwing
    const D2 = new S.Drawer(T2, 'dragonfly' + P.seed, { pitch: 0.42 });
    DRAGONFLY.drawDragonfly(P, D2);
    const parts = D2.parts.filter((p) => p.name === 'hindwing').slice(0, 1);
    const e = S.emitParts(parts, { prefix: 'dw' });
    defs += e.defs; body += layer(e);
    // overlay: the longitudinal veins in red
    let con = '';
    for (const v of Wg.V) {
      const o = []; for (let i = 0; i <= 60; i++) { const u = v.us + (1 - v.us) * i / 60; o.push(I.Tapply(T2, Wg.F(u, Math.min(1, v.f(u))))); }
      con += `<path d="${I.pathOf(o, false)}" fill="none" stroke="${A.RED}" stroke-width="0.18" stroke-opacity="0.8"/>`;
    }
    body += con;
    body += txt(236, 160, 'Fig. D.  Venatio: diagramma Voronoi ex punctis in ordines dispositis', 3.1, { a: 'middle' });
    body += txt(236, 164.2, 'inter venas longitudinales (rubrae); in area costali scalae.', 3.1, { a: 'middle' });
  }
  fs.writeFileSync(args[1], sheet(W, H, 'wings', body, defs));
  console.log('wrote', args[1]);
} else if (cmd === 'layers') {
  // build-up of one specimen: outline, glazes, engraving, finished
  const W = 300, H = 120;
  const P = MOTH.genMoth('3', 'emperor');
  let defs = '', body = '';
  const labels = ['I. adumbratio', 'II. aquarellae', 'III. sculptura', 'IV. impressio'];
  for (let k = 0; k < 4; k++) {
    const cx = 37.5 + k * 75;
    const { T } = specimenT('moth', P, cx, 56, 62);
    const d = drawSpec('moth', P, T, 'ly' + k + '_');
    defs += d.e.defs;
    if (k === 1) body += `<g style="mix-blend-mode:multiply" filter="url(#fWash)">${d.e.wash}</g>`;
    if (k === 2) body += `<g filter="url(#fInk)">${d.e.ink}</g>`;
    if (k === 3) body += layer(d.e);
    if (k === 0) {
      // the silhouette as a faint pencil outline
      const sil = [].concat(...d.D.parts.map((p) => p.sil));
      body += `<path d="${I.pathsOf(sil)}" fill="none" stroke="#5a4a3a" stroke-width="0.24" stroke-opacity="0.6"/>`;
    }
    body += txt(cx, 108, labels[k], 3.4, { a: 'middle' });
  }
  fs.writeFileSync(args[1], sheet(W, H, 'layers', body, defs));
  console.log('wrote', args[1]);
}
if (cmd === 'sexes') {
  // dimorphism as rules: one seed drawn as male and as female, each pair at one scale
  const W = 300, H = 186;
  let defs = '', body = '';
  const pairs = [['moth', '0', 'hawk'], ['moth', '0', 'swallowtail'], ['beetle', '5', 'stag'], ['beetle', '5', 'longhorn']];
  const notes = ['alae latiores, color alarum posticarum mutatus', 'margo latior, lunulae caeruleae, caudae longiores', 'mandibulae breves, caput angustius', 'antennae breviores'];
  const used = new Set();
  pairs.forEach(([fam, seed, arch], k) => {
    const col = k % 2, row = Math.floor(k / 2);
    const cx0 = 12 + col * 144, cy = 30 + row * 80, cw = 66, ch = 58;
    const F = PL.FAMS()[fam];
    const Ps = ['m', 'f'].map((sx) => F.sexify(F.gen(seed, arch), sx));
    const bs = Ps.map((P) => F.bounds(P));
    const sc = Math.min(...bs.map((b) => Math.min(cw / b.w, ch / b.h)));
    Ps.forEach((P, j) => {
      const b = bs[j];
      const cx = cx0 + cw / 2 + j * (cw + 10), yy = cy + ch / 2;
      const T = I.Tsrt(sc, 0, cx - b.cx * sc, yy - b.cy * sc);
      const d = drawSpec(fam, P, T, 'sx' + k + j + '_');
      defs += d.e.defs; body += layer(d.e);
      const g = PL.sexGlyph(cx - 1.2, cy + ch + 4.5, 4.2, P.sex, 'sx' + k + j);
      body += `<path d="${g.d}" fill="${INK0}" fill-opacity="0.9"/>`;
    });
    const nm = PL.uniqueName(Ps[0], used);
    body += txt(cx0 + cw + 5, cy + ch + 10.5, nm.genus + ' ' + nm.epithet, 3.0, { a: 'middle' });
    body += txt(cx0 + cw + 5, cy + ch + 14.2, '♀: ' + notes[k] + '.', 2.4, { a: 'middle', f: 'FellR', op: 0.7 });
  });
  body += txt(W / 2, 15, 'Mas et femina — dimorphismus ex regulis', 4.4, { a: 'middle', f: 'FellSC', ls: 0.5 });
  fs.writeFileSync(args[1], sheet(W, H, 'sexes', body, defs));
  console.log('wrote', args[1]);
}

// stages: one figure of the hero plate in four states of the same run: construction
// (silhouettes and scaffolding), contour (ink lines without tone), engraving (hatching, stipple
// and cast shadow) and washes (the figure exactly as on the plate)
//   node src/process.js stages out.svg [slot=13] [gap] [pad] [cols]
if (cmd === 'stages') {
  const slot = +(args[2] || 13); // fig. 14, the weevil
  const C = globalThis.CURATED;
  // tag hatch and stipple polygons so the contour state can leave them out
  for (const fn of ['hatch', 'stipple']) {
    const orig = S.Drawer.prototype[fn];
    S.Drawer.prototype[fn] = function (part) {
      const n0 = part.ink.length;
      const r = orig.apply(this, arguments);
      part.tone = part.tone || new Set();
      for (let k = n0; k < part.ink.length; k++) part.tone.add(k);
      return r;
    };
  }
  const picks = PL.choose(C.plateSeed, C.picks);
  const pk = picks[slot];
  const r = PL.specimenAt(pk.fam, pk.P, pk.slot, slot, {}, pk.scFix);
  const fr = PL.fragment(pk, slot, {}, new Set());
  const bb = r.bb;
  // sheet geometry in plate units; cols = 2 gives a 2 x 2 sheet
  const pad = +(args[4] || 10), gap = +(args[3] || 10), top = 11, labH = 15;
  const cols = +(args[5] || 4), rows = Math.ceil(4 / cols);
  const pw = bb.x1 - bb.x0 + 2; // panel width with room for the cast shadow
  const ph = (bb.y1 - bb.y0) + 3 + labH, rs = ph + top; // row height, row step
  const W = Math.round(pad * 2 + pw * cols + gap * (cols - 1)), H = Math.round(top + ph + rs * (rows - 1));
  const dx = (k) => pad + (k % cols) * (pw + gap) + 0.5 - bb.x0, dy = (k) => top + Math.floor(k / cols) * rs - bb.y0;
  const g = (k, s) => `<g transform="translate(${I.fmt(dx(k))} ${I.fmt(dy(k))})">${s}</g>`;
  let defs = '', body = '';
  // 1 construction
  {
    const sil = [].concat(...r.D.parts.map((p) => p.sil));
    let s = `<path d="${I.pathsOf(sil)}" fill="none" stroke="#5a4a3a" stroke-width="0.11" stroke-opacity="0.55" stroke-linejoin="round"/>`;
    if (pk.fam === 'beetle') s += A.constructionBeetle(pk.P, r.D.T);
    body += g(0, s);
  }
  // 2 contour: ink without tone
  {
    const sub = r.D.parts.map((p) => Object.assign({}, p, { ink: p.ink.filter((_, k) => !(p.tone && p.tone.has(k))), wash: [] }));
    const e = S.emitParts(sub, { prefix: 'st2_' });
    defs += e.defs; body += g(1, `<g filter="url(#fInk)">${e.ink}</g>`);
  }
  // 3 engraving: all ink and the cast shadow
  const shadow = fr.shadow ? `<g filter="url(#fInk)"><path d="${fr.shadow}" fill="${INK0}" fill-opacity="0.5"/></g>` : '';
  { defs += r.e.defs; body += g(2, shadow + `<g filter="url(#fInk)">${r.e.ink}</g>`); }
  // 4 washes, as on the plate
  {
    defs += fr.defs;
    body += g(3, shadow + `<g style="mix-blend-mode:multiply" filter="url(#fWash)">${fr.wash}</g><g filter="url(#fInk)">${fr.ink}</g>`);
  }
  const labels = ['1  construction', '2  contour', '3  engraving', '4  washes'];
  labels.forEach((l, k) => { body += txt(pad + (k % cols) * (pw + gap) + pw / 2, H - labH * 0.5 - (rows - 1 - Math.floor(k / cols)) * rs, l, 2.8, { a: 'middle', op: 0.8 }); });
  let svg = sheet(W, H, 'stages', body, defs, { foxing: 0 });
  // the ink and wash filters must cover plate coordinates inside the translated groups
  svg = svg.replace(/(<filter id="(fInk|fWash)" filterUnits="userSpaceOnUse") x="0" y="0" width="[\d.]+" height="[\d.]+"/g, '$1 x="-50" y="-50" width="500" height="500"');
  fs.writeFileSync(args[1], svg);
  console.log('wrote', args[1], W, H);
}

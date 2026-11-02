// procedural paper, plate mark, ink and wash texture filters, and the red seal.
// svg primitives and feTurbulence only, no scanned textures
(function (G) {
  'use strict';
  const I = G.INK, S = G.SPEC;
  const { PI, sin, cos, floor, pow } = Math;

  // {defs, under, over, tooth} for a sheet of W x H units
  function paper(W, H, seed, o) {
    o = o || {};
    const R = I.makeRng('paper:' + seed);
    const sd = () => R.int(1, 9999);
    const pc = S.PAL.paper;
    let defs = '';
    // large soft mottling
    defs += `<filter id="pMottle" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB">` +
      `<feTurbulence type="fractalNoise" baseFrequency="0.009" numOctaves="5" seed="${sd()}"/>` +
      `<feColorMatrix type="matrix" values="0 0 0 0 0.52  0 0 0 0 0.40  0 0 0 0 0.24  2.6 0 0 0 -1.25"/></filter>`;
    // cloudy formation of the sheet
    defs += `<filter id="pCloud" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB">` +
      `<feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="4" seed="${sd()}"/>` +
      `<feColorMatrix type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.47  0 0 0 0 0.35  1.5 0 0 0 -0.62"/></filter>`;
    // fine tooth with relief lighting
    defs += `<filter id="pTooth" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB">` +
      `<feTurbulence type="fractalNoise" baseFrequency="${o.tooth || 4.2}" numOctaves="2" seed="${sd()}" result="n"/>` +
      `<feDiffuseLighting in="n" surfaceScale="${o.relief || 0.3}" diffuseConstant="1" lighting-color="#fff" result="l"><feDistantLight azimuth="225" elevation="58"/></feDiffuseLighting>` +
      `<feColorMatrix in="l" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.29  0 0 0 0 0.22  -0.7 0 0 0 0.62"/></filter>`;
    // ink density variation
    defs += `<filter id="fInk" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB">` +
      `<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${sd()}" result="n"/>` +
      `<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.45 0 0 0 0.8" result="m"/>` +
      `<feComposite in="SourceGraphic" in2="m" operator="in"/></filter>`;
    // watercolour granulation and pooled edges
    defs += `<filter id="fWash" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB">` +
      `<feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="3" seed="${sd()}" result="g"/>` +
      `<feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.55 0 0 0 0.72" result="gm"/>` +
      `<feComposite in="SourceGraphic" in2="gm" operator="in" result="gran"/>` +
      `<feGaussianBlur in="SourceAlpha" stdDeviation="0.55" result="b"/>` +
      `<feComposite in="SourceAlpha" in2="b" operator="arithmetic" k2="1.6" k3="-1.6" result="edge"/>` +
      `<feComposite in="SourceGraphic" in2="edge" operator="in" result="edgeCol"/>` +
      `<feMerge><feMergeNode in="gran"/><feMergeNode in="edgeCol"/></feMerge></filter>`;
    // ragged edges for the foxing
    defs += `<filter id="pFox" x="-50%" y="-50%" width="200%" height="200%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="${sd()}" result="t"/>` +
      `<feDisplacementMap in="SourceGraphic" in2="t" scale="1.6" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="0.25"/></filter>`;
    defs += `<filter id="pFib" filterUnits="userSpaceOnUse" x="${-W}" y="${-H}" width="${3 * W}" height="${3 * H}" color-interpolation-filters="sRGB">` +
      `<feTurbulence type="fractalNoise" baseFrequency="0.22 2.6" numOctaves="3" seed="${sd()}"/>` +
      `<feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.28  3 0 0 0 -1.62"/></filter>`;
    defs += `<filter id="pBlur"><feGaussianBlur stdDeviation="0.35"/></filter>`;
    defs += `<radialGradient id="pVig" cx="50%" cy="48%" r="75%"><stop offset="0.55" stop-color="#8a6a40" stop-opacity="0"/><stop offset="1" stop-color="#8a6a40" stop-opacity="${o.vig != null ? o.vig : 0.1}"/></radialGradient>`;

    let under = `<rect width="${W}" height="${H}" fill="${I.hex(pc)}"/>`;
    under += `<rect width="${W}" height="${H}" filter="url(#pCloud)" opacity="0.1"/>`;
    under += `<rect width="${W}" height="${H}" filter="url(#pMottle)" opacity="0.2"/>`;
    under += `<rect width="${W}" height="${H}" fill="url(#pVig)"/>`;
    for (const a of [27, -38, 81]) under += `<g transform="rotate(${a} ${W / 2} ${H / 2})"><rect x="${-W * 0.4}" y="${-H * 0.2}" width="${W * 1.8}" height="${H * 1.4}" filter="url(#pFib)" opacity="0.035"/></g>`;
    // fibres, some darker and some lighter than the sheet
    let fd = '', fl = '';
    const nF = o.fibres != null ? o.fibres : floor(W * H / 60);
    for (let i = 0; i < nF; i++) {
      let p = [R.f() * W, R.f() * H], a = R.f() * PI * 2;
      const L = 0.8 + R.f() * 2.5, n = 8;
      const pts = [p];
      for (let k = 0; k < n; k++) { a += (R.f() - 0.5) * 0.9; p = [p[0] + cos(a) * L / n, p[1] + sin(a) * L / n]; pts.push(p); }
      const poly = I.strokePoly(pts, { w: 0.045 + R.f() * 0.05, tin: 0.3, tout: 0.3, end: 0.2, wob: 0, wn: 0 }, null);
      if (!poly) continue;
      if (R.f() < 0.55) fd += I.pathOf(poly); else fl += I.pathOf(poly);
    }
    under += `<path d="${fd}" fill="#7a6040" fill-opacity="0.13"/><path d="${fl}" fill="#fffaf0" fill-opacity="0.45"/>`;
    // foxing, mostly toward the edges
    let fox = '';
    const nfox = o.foxing != null ? o.foxing : 26;
    for (let i = 0; i < nfox; i++) {
      let x = R.f() * W, y = R.f() * H;
      if (R.f() < 0.7) { const e = R.int(0, 3); if (e === 0) x = R.f() * 25; else if (e === 1) x = W - R.f() * 25; else if (e === 2) y = R.f() * 25; else y = H - R.f() * 25; }
      const r = 0.25 + pow(R.f(), 3) * 2.2;
      fox += `<circle cx="${I.fmt(x)}" cy="${I.fmt(y)}" r="${I.fmt(r)}" fill="#9a6a3a" fill-opacity="${(0.08 + R.f() * 0.14).toFixed(3)}"/>`;
      if (R.f() < 0.4) fox += `<circle cx="${I.fmt(x + r * 0.3)}" cy="${I.fmt(y - r * 0.2)}" r="${I.fmt(r * 0.45)}" fill="#7a4a24" fill-opacity="${(0.1 + R.f() * 0.12).toFixed(3)}"/>`;
    }
    under += `<g filter="url(#pFox)">${fox}</g>`;
    // plate mark: faint plate tone and an embossed bevel
    let over = '';
    if (o.platemark) {
      const m = o.platemark;
      const x0 = m.x, y0 = m.y, x1 = m.x + m.w, y1 = m.y + m.h;
      under += `<rect x="${x0}" y="${y0}" width="${m.w}" height="${m.h}" fill="#7d6a52" fill-opacity="0.028"/>`;
      // shadowed upper left bevel, lit lower right bevel
      over += `<g filter="url(#pBlur)">` +
        `<path d="M${x0 + 0.5} ${y1 - 0.5}V${y0 + 0.5}H${x1 - 0.5}" fill="none" stroke="#5a4630" stroke-opacity="0.28" stroke-width="0.55"/>` +
        `<path d="M${x0 + 0.6} ${y1 - 0.6}H${x1 - 0.6}V${y0 + 0.6}" fill="none" stroke="#fffaf0" stroke-opacity="0.75" stroke-width="0.6"/>` +
        `</g>` +
        `<rect x="${x0}" y="${y0}" width="${m.w}" height="${m.h}" fill="none" stroke="#5a4630" stroke-opacity="0.22" stroke-width="0.14"/>`;
    }
    const tooth = `<rect width="${W}" height="${H}" filter="url(#pTooth)" opacity="${o.toothA != null ? o.toothA : 0.11}"/>`;
    return { defs, under, over, tooth };
  }

  // square vermilion seal with a white-carved beetle, eroded edge and paste texture
  function seal(cx, cy, size, seed, opt) {
    opt = opt || {};
    const R = I.makeRng('seal:' + seed);
    const N = I.makeNoise('seal' + seed);
    const h = size / 2;
    const id = 'seal' + (opt.id || '');
    // eroded outline
    const outline = [];
    const n = 160;
    for (let i = 0; i < n; i++) {
      const t = i / n * 4;
      const side = floor(t), f = t - side;
      let p;
      const r = 0.6;
      if (side === 0) p = [-h + 2 * h * f, -h]; else if (side === 1) p = [h, -h + 2 * h * f]; else if (side === 2) p = [h - 2 * h * f, h]; else p = [-h, h - 2 * h * f];
      p = [I.clamp(p[0], -h + r * 0.3, h - r * 0.3), I.clamp(p[1], -h + r * 0.3, h - r * 0.3)];
      const d = 0.12 * size / 14 * N.n2(i * 0.35, 1.7) + (R.f() < 0.03 ? -0.35 * R.f() : 0);
      const c = [p[0] * (1 + d / h), p[1] * (1 + d / h)];
      outline.push([cx + c[0], cy + c[1]]);
    }
    // carved strokes: frame and beetle
    const U = size / 14;
    const strokes = [];
    const st = (pts, w) => strokes.push(I.strokePoly(pts.map((p) => [cx + p[0] * U, cy + p[1] * U]), { w: (w || 0.85) * U, tin: 0.05, tout: 0.05, end: 0.85, wob: 0.03 * U, wn: 0.08 }, N));
    const g = 5.6; // inner frame half-size
    st([[-g, -g], [g, -g], [g, g], [-g, g], [-g, -g], [g * 0.2, -g]], 0.55);
    // elytra, suture, pronotum, head, antennae and legs
    const e = [];
    for (let i = 0; i <= 12; i++) { const a = -PI / 2 + PI * i / 12; e.push([0.25 + cos(a) * 2.2, 1.2 + sin(a) * 3.2 * (a > 0 ? 1 : 0.55)]); }
    st(e, 0.75); st(e.map((p) => [-p[0], p[1]]), 0.75);
    st([[0.0, -1.2], [0, 4.3]], 0.55);
    st([[-1.7, -1.3], [-1.9, -2.6], [-1.1, -3.1], [1.1, -3.1], [1.9, -2.6], [1.7, -1.3], [-1.7, -1.3]], 0.7);
    st([[-0.8, -3.2], [-0.7, -3.9], [0.7, -3.9], [0.8, -3.2]], 0.7);
    for (const s of [1, -1]) {
      st([[s * 0.5, -4.0], [s * 1.6, -4.9], [s * 2.0, -5.0]], 0.5);
      st([[s * 1.9, -2.2], [s * 3.3, -3.0], [s * 3.6, -4.3]], 0.5);
      st([[s * 2.2, 0.0], [s * 3.7, 0.4], [s * 4.3, -0.9]], 0.5);
      st([[s * 2.1, 2.2], [s * 3.5, 3.3], [s * 3.9, 4.6]], 0.5);
    }
    const carve = strokes.filter(Boolean).map((p) => I.pathOf(I.polyArea(p) < 0 ? p.slice().reverse() : p)).join('');
    // paste texture
    const defs = `<filter id="${id}f" filterUnits="userSpaceOnUse" x="${cx - h * 1.5}" y="${cy - h * 1.5}" width="${h * 3}" height="${h * 3}" color-interpolation-filters="sRGB">` +
      `<feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="3" seed="${R.int(1, 999)}" result="n"/>` +
      `<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.2 0 0 0 -0.35" result="m"/>` +
      `<feComposite in="SourceGraphic" in2="m" operator="in"/></filter>` +
      `<mask id="${id}m" maskUnits="userSpaceOnUse" x="${cx - h * 1.5}" y="${cy - h * 1.5}" width="${h * 3}" height="${h * 3}"><rect x="${cx - h * 1.5}" y="${cy - h * 1.5}" width="${h * 3}" height="${h * 3}" fill="#fff"/><path d="${carve}" fill="#000"/></mask>`;
    const body = `<g style="mix-blend-mode:multiply" opacity="0.92"><path d="${I.pathOf(outline)}" fill="#b4372b" mask="url(#${id}m)" filter="url(#${id}f)"/></g>`;
    return { defs, body };
  }

  G.PAPER = { paper, seal };
})(typeof globalThis !== 'undefined' ? globalThis : this);

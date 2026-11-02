// command line, writes svgs:
//   node src/cli.js plate <seed|hero> out.svg ['{"px": 2400}']
//   node src/cli.js one <family> <seed> out.svg [size] [arch]
//   node src/cli.js sheet <family> <start> <n> out.svg [cols] [arch,arch,...]
const fs = require('fs');
const path = require('path');
for (const f of ['ink.js', 'specimen.js', 'beetle.js', 'moth.js', 'dragonfly.js', 'names.js', 'paper.js', 'plate.js', 'fonts.js', 'curation.js']) require(path.join(__dirname, f));
const I = globalThis.INK, S = globalThis.SPEC;
const FAM = PLATE.FAMS();

function specimenSVG(fam, P, cx, cy, size) {
  const F = FAM[fam];
  const b = F.bounds(P);
  const sc = size / Math.max(b.w, b.h);
  const T = I.Tsrt(sc, 0, cx - b.cx * sc, cy - b.cy * sc);
  const D = new S.Drawer(T, fam + P.seed, { pitch: 0.4 });
  F.draw(P, D);
  return S.emitParts(D.parts, { prefix: 's' + Math.random().toString(36).slice(2, 6) });
}

function wrap(W, H, defs, wash, ink, extra) {
  const paper = S.PAL.paper;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<defs>${defs}</defs><rect width="${W}" height="${H}" fill="${I.hex(paper)}"/>` +
    `<g id="wash" style="mix-blend-mode:multiply">${wash}</g><g id="ink">${ink}</g>${extra || ''}</svg>`;
}

const args = process.argv.slice(2);
const cmd = args[0];
if (cmd === 'sheet') {
  const fam = args[1], start = +args[2], n = +args[3], out = args[4];
  const cols = +(args[5] || 4);
  const arch = args[6] || null;
  const cell = 70, rows = Math.ceil(n / cols);
  let defs = '', wash = '', ink = '', labels = '';
  for (let i = 0; i < n; i++) {
    const archs = arch ? arch.split(',') : [null];
    const seed = String(start + i);
    const P = FAM[fam].gen(seed, archs[i % archs.length]);
    const cx = (i % cols + 0.5) * cell, cy = (Math.floor(i / cols) + 0.5) * cell;
    const e = specimenSVG(fam, P, cx, cy - 2, cell * 0.78);
    defs += e.defs; wash += e.wash; ink += e.ink;
    labels += `<text x="${cx}" y="${cy + cell * 0.46}" font-size="2.6" text-anchor="middle" fill="#555" font-family="Georgia">${seed} ${P.arch || ''} ${P.colour || ''}</text>`;
  }
  fs.writeFileSync(out, wrap(cols * cell, rows * cell, defs, wash, ink, labels));
  console.log('wrote', out, (fs.statSync(out).size / 1e6).toFixed(2) + ' MB');
} else if (cmd === 'one') {
  const fam = args[1], seed = args[2], out = args[3];
  const size = +(args[4] || 100);
  const arch = args[5] || null;
  const P = FAM[fam].gen(seed, arch);
  const W = size * 1.25, H = size * 1.25;
  const e = specimenSVG(fam, P, W / 2, H / 2, size);
  fs.writeFileSync(out, wrap(W, H, e.defs, e.wash, e.ink));
  console.log('wrote', out, (fs.statSync(out).size / 1e6).toFixed(2) + ' MB', JSON.stringify(P).slice(0, 300));
} else if (cmd === 'plate') {
  let seed = args[1], out = args[2];
  const opt = JSON.parse(args[3] || '{}');
  if (seed === 'hero') { seed = CURATED.plateSeed; opt.curated = CURATED.picks; opt.plateNo = CURATED.plateNo; }
  const svg = PLATE.plateSVG(seed, opt);
  fs.writeFileSync(out, svg);
  console.log('wrote', out, (fs.statSync(out).size / 1e6).toFixed(2) + ' MB');
}

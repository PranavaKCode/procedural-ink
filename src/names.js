// latin binomials from each specimen's parameters: genus = colour or shape prefix + archetype
// stem, epithet = the most salient feature, declined to agree with the genus
(function (G) {
  'use strict';
  const I = G.INK;

  const COLOUR_PREFIX = {
    black: ['Melano', 'Atro'], umber: ['Phaeo', 'Brunneo'], chestnut: ['Castaneo', 'Phaeo'], bronze: ['Chalco', 'Aeneo'],
    green: ['Chloro', 'Prasino'], indigo: ['Cyano', 'Glauco'], ochre: ['Xantho', 'Ochro'], madder: ['Erythro', 'Rhodo'],
    straw: ['Ochro', 'Xantho'], slate: ['Glauco', 'Poecilo'], pale: ['Leuco', 'Argyro'], rose: ['Rhodo', 'Erythro'],
    sienna: ['Pyrrho', 'Castaneo'], ink: ['Melano', 'Scoto'],
  };
  const STEMS = {
    carabid: ['carabus', 'dromus', 'podus', 'nebria', 'lestes'],
    scarab: ['scarabaeus', 'dynastes', 'cetonia', 'phanes', 'lontha'],
    stag: ['lucanus', 'dorcus', 'coilus', 'gnathus'],
    longhorn: ['cerambyx', 'prionus', 'lamia', 'cerus', 'clytus'],
    ladybird: ['coccinella', 'chilus', 'lachna', 'adalia'],
    weevil: ['curculio', 'rhynchus', 'odes', 'rhinus'],
    jewel: ['buprestis', 'agrilus', 'chrysis', 'dicerca'],
    tiger: ['cicindela', 'tichora', 'cephala'],
    noctuid: ['noctua', 'grotis', 'phora', 'mythimna'],
    geometrid: ['geometra', 'metra', 'chlora', 'phasia'],
    emperor: ['saturnia', 'theraea', 'attacus', 'pavonia'],
    hawk: ['sphinx', 'merinthus', 'hyles', 'phila'],
    tiger_moth: ['arctia', 'morpha', 'spilosoma'],
    butterfly: ['nymphalis', 'vanessa', 'argynnis', 'danais'],
    swallowtail: ['papilio', 'clides', 'graphium'],
    hawker: ['aeshna', 'anax', 'brachytron'],
    skimmer: ['libellula', 'petrum', 'thetrum'],
    damsel: ['agrion', 'lestes', 'calopteryx'],
    clubtail: ['gomphus', 'onychogomphus'],
  };
  const SHAPE_PREFIX = { wide: ['Platy', 'Eury'], long: ['Macro', 'Dolicho'], short: ['Brachy'], horn: ['Cerato'], jaw: ['Gnatho', 'Prosopo'], snout: ['Rhyncho'], eye: ['Ophthalmo'], tail: ['Cerco'], comb: ['Ctenucho'], club: ['Coryno'] };

  function gender(genus) {
    if (/(a|is)$/.test(genus)) return 'f';
    if (/(um|on)$/.test(genus) && !/agrion$/.test(genus)) return 'n';
    return 'm';
  }
  // adjective in -us/-a/-um or -is/-e, or explicit [m, f, n] forms
  function decline(adj, g) {
    if (Array.isArray(adj)) return adj[g === 'm' ? 0 : g === 'f' ? 1 : 2];
    if (/us$/.test(adj)) return adj.replace(/us$/, g === 'm' ? 'us' : g === 'f' ? 'a' : 'um');
    if (/is$/.test(adj)) return g === 'n' ? adj.replace(/is$/, 'e') : adj;
    return adj;
  }
  const NUM = { 2: 'bi', 4: 'quadri', 6: 'sex', 8: 'octo', 10: 'decem', 12: 'duodecim', 14: 'quattuordecim' };
  const COLOUR_ADJ = { black: ['ater', 'atra', 'atrum'], umber: 'fuscus', chestnut: 'castaneus', bronze: 'aeneus', green: 'viridis', indigo: 'cyaneus', ochre: 'ochraceus', madder: 'sanguineus', straw: 'stramineus', slate: 'plumbeus', pale: 'pallidus', rose: 'roseus', sienna: 'rufus', ink: 'nigrescens' };

  function join(a, b) {
    a = a.replace(/o$/, (b[0] && 'aeiouy'.includes(b[0])) ? '' : 'o');
    return a + b;
  }

  function binomial(P, salt) {
    const R = I.makeRng('name:' + P.family + P.seed + (salt ? '#' + salt : ''));
    const fam = P.family;
    let stemKey = P.arch;
    if (fam === 'moth' && P.kind === 'tiger') stemKey = 'tiger_moth';
    const stem = R.pick(STEMS[stemKey] || ['insectus']);
    // genus prefix from a colour or a shape trait
    const traits = [];
    if (fam === 'beetle') {
      if (P.We / P.Le > 0.45) traits.push('wide');
      if (P.We / P.Le < 0.3) traits.push('long');
      if (P.horn && P.horn !== 'none') traits.push('horn');
      if (P.mand > 0.8) traits.push('jaw');
      if (P.rostrum) traits.push('snout');
      if (P.eye > 0.28) traits.push('eye');
      if (P.antType === 'pectinate') traits.push('comb');
      if (P.antType === 'clavate') traits.push('club');
    } else if (fam === 'moth') {
      if (P.tail) traits.push('tail');
      if (P.kind === 'hawk') traits.push('long');
    } else {
      if (P.club > 0.45) traits.push('club');
      if (P.kind === 'damsel') traits.push('long');
    }
    let genus = '', genusStem = '';
    for (let tries = 0; tries < 12; tries++) {
      let prefix;
      if (traits.length && R.chance(0.55)) prefix = R.pick(SHAPE_PREFIX[R.pick(traits)]);
      else prefix = R.pick(COLOUR_PREFIX[P.colour] || ['Neo']);
      const st = tries === 0 ? stem : R.pick(STEMS[stemKey] || ['insectus']);
      genus = join(prefix, st.toLowerCase());
      genusStem = st.toLowerCase();
      if (genus.length <= 15) break;
    }
    genus = genus[0].toUpperCase() + genus.slice(1);
    const g = gender(genus);
    // epithet
    const cands = [];
    if (fam === 'beetle') {
      if (P.pattern === 'spots') { const n = (P._spots || 0) * 2; if (NUM[n]) cands.push([NUM[n] + 'punctatus', 4]); cands.push(['maculatus', 2], ['guttatus', 1]); }
      if (P.pattern === 'bands') cands.push(['fasciatus', 3], ['cinctus', 2]);
      if (P.pattern === 'stripes') cands.push(['vittatus', 3], ['lineatus', 2]);
      if (P.pattern === 'lunules') cands.push(['lunatus', 3], ['hieroglyphicus', 1]);
      if (P.pattern === 'marble') cands.push(['marmoratus', 3], ['nebulosus', 2]);
      if (P.horn && P.horn !== 'none') cands.push(['cornutus', 3], ['rhinoceros', 1.5]);
      if (P.mand > 0.8) cands.push(['forcipatus', 3], ['macrognathus', 2]);
      if (P.rostrum) cands.push(['rostratus', 3], ['nasutus', 2]);
      if (P.antType === 'long') cands.push(['longicornis', 4]);
      if (P.antType === 'pectinate') cands.push(['pectinicornis', 3]);
      if (P.legL / P.Le > 0.6) cands.push(['longipes', 2], ['velox', 1]);
      if (P.gloss > 0.85) cands.push(['nitidus', 1.5], ['politus', 1]);
      if (P.punct) cands.push(['punctulatus', 0.8]);
      cands.push([COLOUR_ADJ[P.colour], 1.6]);
    } else if (fam === 'moth') {
      if (P.eyeF || P.eyeH) cands.push(['ocellatus', 3], ['argus', 2], ['pavonius', 1]);
      if (P.tail) cands.push(['caudatus', 4], ['longicaudus', 2]);
      if (P.falcate) cands.push(['falcatus', 3]);
      if (P.kind === 'geometrid') cands.push(['undulatus', 3], ['lineolatus', 2]);
      if (P.kind === 'noctuid') cands.push(['marginatus', 2], ['signatus', 2]);
      if (P.kind === 'tiger') cands.push(['maculosus', 3], ['fulgens', 1]);
      if (P.hindColour === 'madder' || P.hindColour === 'rose') cands.push(['rubricosus', 3]);
      if (P.ant === 'bipectinate') cands.push(['pectinicornis', 1.5]);
      if (P.kind === 'swallowtail') cands.push(['podalirius', 0.5], ['tigrinus', 3]);
      cands.push([COLOUR_ADJ[P.colour], 2]);
    } else {
      const tint = { clear: ['vitripennis', 'hyalinus'], amber: ['fulvipennis', 'flavescens'], band: ['fasciipennis', 'zonatus'], tips: ['apicalis', 'apicalis'], basal: ['maculipennis', 'bimaculatus'] }[P.tint];
      cands.push([tint[0], 3], [tint[1], 2]);
      if (P.club > 0.45) cands.push(['clavatus', 3]);
      if (P.abPattern === 'spots') cands.push(['guttatus', 1.5]);
      if (P.abPattern === 'rings') cands.push(['annulatus', 1.5]);
      cands.push([COLOUR_ADJ[P.colour], 2]);
    }
    const pick = R.wpick(cands);
    let ep = decline(pick, g);
    if (['argus', 'rhinoceros', 'podalirius'].includes(pick)) ep = pick;
    return { genus, epithet: ep, full: genus + ' ' + ep, stem: genusStem };
  }

  G.NAMES = { binomial };
})(typeof globalThis !== 'undefined' ? globalThis : this);

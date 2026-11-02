// hand-picked specimens for the hero plate (tab. iii), picked from contact sheets of many seeds.
// each entry is [family, seed, archetype, sex?] for the slot with the same index in PLATE.LAYOUT;
// the hawk moths (figs. 2, 3) and swallowtails (9, 11) are one species as male and female
(function (G) {
  G.CURATED = {
    plateSeed: '1729',
    plateNo: 'III',
    picks: [
      ['dragonfly', '4', 'hawker'],
      ['moth', '0', 'hawk', 'm'],
      ['moth', '0', 'hawk', 'f'],
      ['beetle', '4', 'ladybird'],
      ['beetle', '16', 'ladybird'],
      ['beetle', '5', 'stag'],
      ['moth', '3', 'emperor'],
      ['beetle', '13', 'stag'],
      ['moth', '0', 'swallowtail', 'm'],
      ['beetle', '21', 'jewel'],
      ['moth', '0', 'swallowtail', 'f'],
      ['beetle', '13', 'tiger'],
      ['beetle', '0', 'scarab'],
      ['beetle', '8', 'weevil'],
      ['beetle', '5', 'scarab'],
      ['beetle', '5', 'tiger'],
    ],
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

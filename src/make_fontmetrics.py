# appends the advance widths of the embedded im fell faces to fonts.js (FONTS.adv), so the
# generator can measure legend text. replaces an earlier metrics block
import json, pathlib
from fontTools.ttLib import TTFont

SRC = pathlib.Path(__file__).resolve().parent
FACES = {'roman': 'IMFeENrm28P.ttf', 'italic': 'IMFeENit28P.ttf', 'sc': 'IMFeENsc28P.ttf'}
MARK = '// advance widths, written by make_fontmetrics.py'
adv = {}
for k, fn in FACES.items():
    f = TTFont(SRC / 'fonts' / fn)
    cmap, hmtx, upm = f.getBestCmap(), f['hmtx'].metrics, f['head'].unitsPerEm
    adv[k] = {chr(c): round(hmtx[cmap[c]][0] / upm, 4) for c in range(32, 256) if c in cmap}
js = (SRC / 'fonts.js').read_text(encoding='latin-1')
if MARK in js:
    js = js[:js.index(MARK)]
js = js.rstrip() + '\n' + MARK + '\n(function (G) { G.FONTS.adv = ' + json.dumps(adv, ensure_ascii=True, separators=(',', ':')) + '; })(typeof globalThis !== "undefined" ? globalThis : this);\n'
(SRC / 'fonts.js').write_text(js, encoding='latin-1', newline='\n')
print('metrics for', {k: len(v) for k, v in adv.items()})

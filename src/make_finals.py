# builds final/ from src/: the hero plate (svg and 4800 px master), hero and thumb jpgs, the
# four-stage process image, the supporting figures in final/extra and the interactive page
#   python src/make_finals.py [--skip-master]
# the loop video is separate: python src/make_loop.py 14 24 1080
import subprocess, sys, os, pathlib
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
ROOT = pathlib.Path(__file__).resolve().parent.parent
os.chdir(ROOT)
FULL = ROOT / 'final' / 'full'
FIN = ROOT / 'final'
EXTRA = FIN / 'extra'
WORK = ROOT / 'work' / 'final_tmp'
FULL.mkdir(parents=True, exist_ok=True)
EXTRA.mkdir(parents=True, exist_ok=True)
WORK.mkdir(parents=True, exist_ok=True)
MASTER_SVG = FULL / 'insecta-imaginaria-tab-III.svg'
MASTER_PNG = FULL / 'insecta-imaginaria-tab-III.png'


def run(cmd):
    print('>', ' '.join(map(str, cmd)), flush=True)
    subprocess.run(list(map(str, cmd)), check=True)


def save_jpg(im, path, q=88, max_bytes=None):
    # lower the quality until the file fits
    im = im.convert('RGB')
    while True:
        im.save(path, 'JPEG', quality=q, optimize=True, progressive=True, subsampling=0 if q >= 90 else 2)
        sz = os.path.getsize(path)
        if not max_bytes or sz <= max_bytes or q <= 70:
            print(f'  {path.name}: {im.size} q{q} {sz/1e6:.2f} MB')
            return
        q -= 3


def main():
    if '--skip-master' not in sys.argv:
        run(['node', 'src/cli.js', 'plate', 'hero', MASTER_SVG])
        run([sys.executable, 'src/raster.py', MASTER_SVG, MASTER_PNG, 4800])
    master = Image.open(MASTER_PNG).convert('RGB')
    W, H = master.size
    save_jpg(master.resize((2400, 3200), Image.LANCZOS), FIN / 'hero.jpg', 88, 2_500_000)
    save_jpg(master.resize((600, 800), Image.LANCZOS), FIN / 'thumb.jpg', 88)
    # proof shown by the interactive page while it engraves
    save_jpg(master.resize((1200, 1600), Image.LANCZOS), WORK / 'hero-preview.jpg', 80, 450_000)

    # process image: fig. 14 of the plate in four states
    svg, png = WORK / 'stages.svg', FULL / 'process.png'
    run(['node', 'src/process.js', 'stages', svg])
    run([sys.executable, 'src/raster.py', svg, png, 4800])
    pim = Image.open(png).convert('RGB')
    save_jpg(pim.resize((3000, round(3000 * pim.height / pim.width)), Image.LANCZOS), FIN / 'process.jpg', 88, 2_500_000)

    # supporting figures
    figs = [('anatomy', 1800), ('seeds', 1700), ('wings', 1800), ('layers', 1800)]
    for i, (name, px) in enumerate(figs, 1):
        svg = WORK / f'{name}.svg'
        png = WORK / f'{name}.png'
        run(['node', 'src/process.js', name, svg])
        run([sys.executable, 'src/raster.py', svg, png, px])
        save_jpg(Image.open(png), EXTRA / f'process-{i}-{name}.jpg', 88, 800_000)

    # 1:1 detail crops of the master, (x0, y0) as fractions
    crops = [
        ('oculi et venatio', (0.429, 0.1)),   # dragonfly eyes, thorax, wing bases
        ('ocellus', (0.355, 0.398)),          # saturniid ocellus
        ('mandibulae', (0.802, 0.375)),       # stag beetle jaws and cast shadow
    ]
    cw, ch = 576, 768
    tiles = []
    for _, (fx, fy) in crops:
        x0, y0 = int(fx * W), int(fy * H)
        tiles.append(master.crop((x0, y0, x0 + cw, y0 + ch)))
    gap = 16
    out = Image.new('RGB', (cw * 3 + gap * 4, ch + gap * 2), (35, 32, 29))
    for k, t in enumerate(tiles):
        out.paste(t, (gap + k * (cw + gap), gap))
    save_jpg(out, EXTRA / 'process-5-detail.jpg', 90, 800_000)

    # an uncurated plate straight from the generator
    svg = WORK / 'plate_424242.svg'
    png = WORK / 'plate_424242.png'
    run(['node', 'src/cli.js', 'plate', '424242', svg])
    run([sys.executable, 'src/raster.py', svg, png, 1350])
    save_jpg(Image.open(png), EXTRA / 'process-6-uncurated-plate.jpg', 86, 800_000)

    # one seed drawn as male and as female
    svg, png = WORK / 'sexes.svg', WORK / 'sexes.png'
    run(['node', 'src/process.js', 'sexes', svg])
    run([sys.executable, 'src/raster.py', svg, png, 1800])
    save_jpg(Image.open(png), EXTRA / 'process-7-sexes.jpg', 88, 800_000)

    run(['bash', 'src/build_interactive.sh'])
    print('done')


if __name__ == '__main__':
    main()

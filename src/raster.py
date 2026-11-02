# rasterise an svg with headless chromium: python src/raster.py in.svg out.png width
# the svg is loaded as an <img> in a page sized exactly to the output, then screenshotted
import sys, os, re, io, pathlib
from playwright.sync_api import sync_playwright
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
TIMEOUT = 600000


def svg_size(path):
    head = open(path, 'r', encoding='utf8').read(4000)
    m = re.search(r'viewBox="([\d.\-]+) ([\d.\-]+) ([\d.]+) ([\d.]+)"', head)
    return float(m.group(3)), float(m.group(4))


def main():
    svg, png, W = sys.argv[1], sys.argv[2], int(sys.argv[3])
    vw, vh = svg_size(svg)
    H = int(round(W * vh / vw))
    url = pathlib.Path(os.path.abspath(svg)).as_uri()
    hp = os.path.abspath(svg) + '.wrap.html'
    with open(hp, 'w', encoding='utf8') as f:
        f.write(f'<html><body style="margin:0;overflow:hidden;background:#fff">'
                f'<img id="im" src="{url}" style="position:absolute;left:0px;top:0px;width:{W}px;height:{H}px">'
                f'</body></html>')
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--disable-gpu', '--force-color-profile=srgb'])
        pg = b.new_page(viewport={'width': W, 'height': H}, device_scale_factor=1)
        pg.set_default_timeout(TIMEOUT)
        pg.goto(pathlib.Path(hp).as_uri())
        pg.wait_for_function('document.getElementById("im").complete && document.getElementById("im").naturalWidth>0', timeout=TIMEOUT)
        pg.wait_for_timeout(300)
        shot = pg.screenshot(timeout=TIMEOUT)
        b.close()
    os.remove(hp)
    out = Image.new('RGB', (W, H))
    out.paste(Image.open(io.BytesIO(shot)).convert('RGB'), (0, 0))
    out.save(png)
    print('wrote', png, out.size)


if __name__ == '__main__':
    main()

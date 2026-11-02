# renders final/bonus/loop.mp4: an emperor moth engraved, coloured and faded back to paper.
# frames come from one headless chromium page (src/loop.html) and are piped to ffmpeg
#   python src/make_loop.py [seconds=12] [fps=24] [px=1080]
import sys, subprocess, pathlib, time, os
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
args = sys.argv[1:]
SEC = float(args[0]) if len(args) > 0 else 12
FPS = int(args[1]) if len(args) > 1 else 24
PX = int(args[2]) if len(args) > 2 else 1080
N = int(SEC * FPS)
out = ROOT / 'final' / 'bonus' / 'loop.mp4'
out.parent.mkdir(parents=True, exist_ok=True)

url = (ROOT / 'src' / 'loop.html').as_uri() + f'?px={PX}'
FF = os.environ.get('FFMPEG') or 'ffmpeg'
ff = subprocess.Popen([FF, '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', str(FPS), '-i', '-',
                       '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p',
                       '-movflags', '+faststart', str(out)], stdin=subprocess.PIPE)
t0 = time.time()
with sync_playwright() as p:
    b = p.chromium.launch(args=['--force-color-profile=srgb'])
    pg = b.new_page(viewport={'width': PX, 'height': PX})
    pg.goto(url)
    pg.wait_for_function('window.ready === true', timeout=120000)
    for i in range(N):
        info = pg.evaluate(f'window.frame({i / N})')
        if i == 0:
            pg.wait_for_timeout(400)  # fonts
        ff.stdin.write(pg.screenshot(type='png'))
        if i % 24 == 0:
            print(i, info, f'{time.time() - t0:.0f}s', flush=True)
    b.close()
ff.stdin.close()
ff.wait()
print('wrote', out, f'{out.stat().st_size / 1e6:.2f} MB', f'{time.time() - t0:.0f}s')

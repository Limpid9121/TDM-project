# -*- coding: utf-8 -*-
# C2 截圖：先在 repo 根目錄開 python -m http.server 8765
import subprocess, os, time
from PIL import Image, ImageChops
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SH = os.path.join(ROOT, 'shots'); os.makedirs(SH, exist_ok=True)
BASE = 'http://127.0.0.1:8765/docs/direction/'

def edge(url, w, h, out):
    if os.path.exists(out): os.remove(out)
    subprocess.run([EDGE, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                    '--virtual-time-budget=3000', '--window-size=%d,%d' % (w, h), '--screenshot=' + out, url],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=90)
    for _ in range(80):
        if os.path.exists(out) and os.path.getsize(out) > 2000:
            time.sleep(0.4); return
        time.sleep(0.25)

def crop_bottom(path, bg=(243, 244, 246)):
    im = Image.open(path).convert('RGB'); W, H = im.size
    diff = ImageChops.difference(im, Image.new('RGB', im.size, bg)).convert('L').point(lambda p: 255 if p > 6 else 0)
    b = diff.getbbox()
    if b: im.crop((0, 0, W, min(H, b[3] + 24))).save(path)

def mobile(page, h, full, out):
    # 無頭 Edge 視窗最窄約 500 px，用 390 寬的 iframe 才是真正的手機版面
    frame = os.path.join(ROOT, '_frame.html')
    open(frame, 'w', encoding='utf-8').write('<!doctype html><meta charset=utf-8><body style="margin:0;background:#F3F4F6"><iframe src="%s%s" style="width:390px;height:%dpx;border:0;display:block"></iframe>' % (page, '?full' if full else '', h))
    big = out + '.big.png'
    edge(BASE + '_frame.html', 640, h, big)
    Image.open(big).convert('RGB').crop((0, 0, 390, h)).save(out); os.remove(big); os.remove(frame)
    if full: crop_bottom(out)

for k in 'abc':
    # 主要目標：24 吋 1920×1080，瀏覽器可用約 1920×940
    edge(BASE + 'C2%s.html' % k, 1920, 940, os.path.join(SH, 'C2%s_24in_fold.png' % k))
    edge(BASE + 'C2%s.html' % k, 1440, 900, os.path.join(SH, 'C2%s_desktop_fold.png' % k))
edge(BASE + 'C2a.html?rs=560', 1920, 940, os.path.join(SH, 'C2a_24in_rightscrolled.png'))
edge(BASE + 'C2a.html?rs=600', 1440, 900, os.path.join(SH, 'C2a_desktop_rightscrolled.png'))
# 「左邊捲下去、右邊仍固定」這個狀態無頭 Edge 畫不出來（sticky＋已捲動時合成錯誤），
# shots/C2a_desktop_leftscrolled.jpg 是在一般瀏覽器 1440×900 實際捲動後截的（縮成 800 寬）。
mobile('C2a.html', 844, False, os.path.join(SH, 'C2a_mobile_fold.png'))
mobile('C2a.html', 3200, True, os.path.join(SH, 'C2a_mobile_full.png'))
for f in sorted(os.listdir(SH)):
    if f.startswith('C2'): print(f, Image.open(os.path.join(SH, f)).size)

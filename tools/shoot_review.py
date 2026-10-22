# -*- coding: utf-8 -*-
# 驗收截圖：Edge headless 開 tools/review_frame.html（同源 iframe 操作 index.html），輸出到 tests/shots/review/。
# 先開靜態伺服器：python -m http.server 8765（或 .claude/launch.json 的 tdm-static）。
# 用法：python tools/shoot_review.py "名稱|寬|高|參數" ...，參數見 tools/review_frame.html 開頭註解。
import subprocess, os, sys, time
from PIL import Image
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = os.path.join(ROOT, 'tests', 'shots', 'review')
os.makedirs(OUT, exist_ok=True)
BASE = 'http://127.0.0.1:8765/tools/review_frame.html?'

def shoot(name, w, h, params):
    out = os.path.join(OUT, name + '.png')
    if os.path.exists(out): os.remove(out)
    win_w = max(w, 520)
    url = BASE + 'w=%d&h=%d&' % (w, h) + params
    subprocess.run([EDGE, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                    '--virtual-time-budget=9000', '--window-size=%d,%d' % (win_w, h), '--screenshot=' + out, url],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)
    for _ in range(40):
        if os.path.exists(out) and os.path.getsize(out) > 2000: break
        time.sleep(0.25)
    if w < win_w:
        Image.open(out).convert('RGB').crop((0, 0, w, h)).save(out)
    print(name, os.path.exists(out))

jobs = [a.split('|') for a in sys.argv[1:]]
for name, w, h, params in jobs:
    shoot(name, int(w), int(h), params)

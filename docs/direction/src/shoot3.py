# -*- coding: utf-8 -*-
# C3 截圖（先在 repo 根目錄開 python -m http.server 8765）
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shoot_lib import edge, mobile, SH, BASE
from PIL import Image
edge(BASE + 'C3.html', 1920, 940, os.path.join(SH, 'C3_24in_fold.png'))
edge(BASE + 'C3.html?accent=vermilion', 1920, 940, os.path.join(SH, 'C3_24in_vermilion.png'))
edge(BASE + 'C3.html?accent=none', 1920, 940, os.path.join(SH, 'C3_24in_none.png'))
edge(BASE + 'C3.html', 1440, 900, os.path.join(SH, 'C3_1440_fold.png'))
mobile('C3.html', 844, False, os.path.join(SH, 'C3_mobile_fold.png'))
mobile('C3.html', 3200, True, os.path.join(SH, 'C3_mobile_full.png'))
for f in sorted(os.listdir(SH)):
    if f.startswith('C3'): print(f, Image.open(os.path.join(SH, f)).size)

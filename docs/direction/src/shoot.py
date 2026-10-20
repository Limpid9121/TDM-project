import subprocess, os, sys, time
from PIL import Image, ImageChops
EDGE=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
ROOT=r"C:\Users\Brandon Chen\OneDrive - 臺大醫院\AI測試區\TDM\docs\direction"
SH=os.path.join(ROOT,'shots'); os.makedirs(SH,exist_ok=True)
def shoot(name,w,h,query,out):
    url='http://127.0.0.1:8765/docs/direction/%s.html%s'%(name,query)
    if os.path.exists(out): os.remove(out)
    subprocess.run([EDGE,'--headless=new','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=1','--virtual-time-budget=3000','--window-size=%d,%d'%(w,h),'--screenshot='+out,url],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=90)
    for _ in range(80):
        if os.path.exists(out) and os.path.getsize(out)>2000:
            time.sleep(0.4); break
        time.sleep(0.25)
FRAME=os.path.join(ROOT,'_frame.html')
def mshoot(name,h,full,out):
    # Edge 無頭模式視窗最窄約 500 px；用 390 寬的 iframe 才是真正的 390 px 版面，再裁出 iframe 區域
    open(FRAME,'w',encoding='utf-8').write('<!doctype html><meta charset=utf-8><body style="margin:0;background:#F4F5F1"><iframe src="%s.html%s" style="width:390px;height:%dpx;border:0;display:block"></iframe>'%(name,'?full' if full else '',h))
    big=out+'.big.png'
    url='http://127.0.0.1:8765/docs/direction/_frame.html'
    if os.path.exists(big): os.remove(big)
    subprocess.run([EDGE,'--headless=new','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=1','--virtual-time-budget=3000','--window-size=640,%d'%h,'--screenshot='+big,url],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=90)
    for _ in range(80):
        if os.path.exists(big) and os.path.getsize(big)>2000:
            time.sleep(0.4); break
        time.sleep(0.25)
    im=Image.open(big).convert('RGB'); im.crop((0,0,390,im.size[1])).save(out); os.remove(big)
def crop_bottom(path,bg=(244,245,241)):
    im=Image.open(path).convert('RGB'); W,H=im.size
    bgim=Image.new('RGB',im.size,bg); diff=ImageChops.difference(im,bgim).convert('L').point(lambda p:255 if p>6 else 0)
    bbox=diff.getbbox()
    if bbox: im.crop((0,0,W,min(H,bbox[3]+24))).save(path)
for n in sys.argv[1:] or ['A','B','C']:
    shoot(n,1440,900,'','%s/%s_desktop_fold.png'%(SH,n))
    shoot(n,1440,3000,'','%s/%s_desktop_full.png'%(SH,n)); crop_bottom('%s/%s_desktop_full.png'%(SH,n))
    mshoot(n,844,False,'%s/%s_mobile_fold.png'%(SH,n))
    mshoot(n,3400,True,'%s/%s_mobile_full.png'%(SH,n)); crop_bottom('%s/%s_mobile_full.png'%(SH,n))
    print('shot',n)
if os.path.exists(FRAME): os.remove(FRAME)
for f in sorted(os.listdir(SH)):
    im=Image.open(os.path.join(SH,f)); print(f,im.size)

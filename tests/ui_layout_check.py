# ui_layout_check.py
# ---------------------------------------------------------------------------------------
# UI/UX 翻修的「真實瀏覽器」版面檢查 + 截圖（jsdom 看不到版面，這支用 Chromium 補上）。
#
# 需求：Python 3 + playwright（pip install playwright；Cowork 雲端環境已內建 Chromium）
# 用法：
#   python3 tests/ui_layout_check.py                    # 檢查 ../index.html，截圖到 tests/shots/latest/
#   python3 tests/ui_layout_check.py --out tests/shots/phase2
#
# 自動斷言（任何一項 FAIL 都要修到過才能交給 Brandon 目視確認）：
#   L1 每個 viewport 都沒有水平捲軸（document.scrollWidth <= viewport 寬 + 1）
#   L2 桌機寬度（>=981px）時，右側結果面板的上緣與左側輸入欄上緣對齊（誤差 <= 60px）
#      ——防止重演「CSS Grid 改版把結果面板擠到頁面最底」的舊事故
#   L3 左側輸入欄內沒有任何 input/select/textarea/button 超出所屬卡片的右緣
#   L4 頁面載入與切換四個模組時沒有任何 JS 例外（pageerror）
# 截圖：4 模組 × 3 viewport（1440×900／1024×768／390×844），各一張首屏＋一張整頁。
# 注意：截圖只是給 Brandon 目視確認用，自動斷言通過不代表視覺可接受。
# ---------------------------------------------------------------------------------------
import asyncio, os, sys, pathlib
from playwright.async_api import async_playwright

HERE = pathlib.Path(__file__).resolve().parent
INDEX = (HERE / 'index.html') if (HERE / 'index.html').exists() else (HERE.parent / 'index.html')
OUT = HERE / 'shots' / 'latest'
if '--out' in sys.argv:
    OUT = pathlib.Path(sys.argv[sys.argv.index('--out') + 1]).resolve()
VIEWPORTS = [(1440, 900, 'desk'), (1024, 768, 'tablet'), (390, 844, 'phone')]
MODULES = ['vancomycin', 'aminoglycoside', 'azole', 'aed']

OVERFLOW_JS = """(mod)=>{
  const bad=[];
  document.querySelectorAll('#drug-'+mod+' .stack .card').forEach(card=>{
    const cr=card.getBoundingClientRect(); if(cr.width===0) return;
    card.querySelectorAll('input,select,textarea,button').forEach(el=>{
      const r=el.getBoundingClientRect();
      if(r.width===0||r.height===0) return;           // hidden / collapsed
      if(r.right>cr.right+1) bad.push((el.id||el.className||el.tagName)+' +'+Math.round(r.right-cr.right)+'px');
    });
  });
  return bad.slice(0,8);
}"""

async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    fails = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for w, h, tag in VIEWPORTS:
            pg = await b.new_page(viewport={'width': w, 'height': h})
            errs = []
            pg.on('pageerror', lambda e, errs=errs: errs.append(str(e)))
            pg.on('dialog', lambda d: asyncio.ensure_future(d.dismiss()))
            await pg.goto(INDEX.as_uri(), wait_until='domcontentloaded')
            await pg.wait_for_timeout(900)
            for mod in MODULES:
                await pg.click(f'.drug-switch-btn[data-drug="{mod}"]')
                await pg.wait_for_timeout(350)
                await pg.evaluate('window.scrollTo(0,0)')
                sw = await pg.evaluate('document.documentElement.scrollWidth')
                if sw > w + 1: fails.append(f'L1 {tag}/{mod}: horizontal overflow scrollWidth={sw} > {w}')
                if w >= 981:
                    tops = await pg.evaluate(f"""(()=>{{const a=document.querySelector('#drug-{mod} .stack'),b=document.querySelector('#drug-{mod} .panel');
                        return [a.getBoundingClientRect().top, b.getBoundingClientRect().top];}})()""")
                    if abs(tops[0] - tops[1]) > 60: fails.append(f'L2 {tag}/{mod}: results panel top {tops[1]:.0f} vs input top {tops[0]:.0f}')
                bad = await pg.evaluate(OVERFLOW_JS, mod)
                if bad: fails.append(f'L3 {tag}/{mod}: controls overflow card: {bad}')
                await pg.screenshot(path=str(OUT / f'{tag}_{mod}_fold.png'))
                await pg.screenshot(path=str(OUT / f'{tag}_{mod}_full.png'), full_page=True)
            for e in errs: fails.append(f'L4 {tag}: JS error: {e}')
            await pg.close()
        await b.close()
    print(f'screenshots -> {OUT}')
    if fails:
        print('\n'.join('FAIL ' + f for f in fails)); print(f'\n{len(fails)} layout failures'); sys.exit(1)
    print('all layout checks passed')

asyncio.run(main())

# -*- coding: utf-8 -*-
# D1 第三輪：C3（定案候選）。Brandon 2026-10-21：
#   1. 洋紅為預設撞色，但使用者可以自己換（頂列色塊；存在 localStorage 的 tdm_ui_accent）。
#   2. 「完整參數」一行一個太浪費：10 個參數全部併進最上方的數字區，排成兩列，拿掉重複的整段。
import os, sys, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import boards2 as B

OUT = B.OUT

# 撞色選項：值、撞色上的字色、深藍頂列上分頁底線的顏色（洋紅在深藍上對比不足，底線改白）
ACCENT_OPTS = [
    ('magenta', '洋紅', '#C2185B', '#FFFFFF', '#FFFFFF'),
    ('vermilion', '朱紅', '#E4572E', '#14171C', '#E4572E'),
    ('mustard', '芥末黃', '#F2B705', '#14171C', '#F2B705'),
    ('none', '不用撞色', '#C9D2E3', '#14171C', '#FFFFFF'),
]

def accent_css():
    css = []
    for key, name, acc, on, tab in ACCENT_OPTS:
        sel = ':root' if key == 'magenta' else ':root[data-accent="%s"]' % key
        css.append('%s{--accent:%s;--on-accent:%s;--tab-ind:%s}' % (sel, acc, on, tab))
    return '\n'.join(css)

PICKER_CSS = r"""
.acc-pick{display:flex;align-items:center;gap:6px;margin-right:4px}
.acc-pick span{font-size:12px;color:var(--navy-soft)}
.acc-pick button{width:18px;height:18px;border-radius:50%;border:2px solid rgba(255,255,255,.35);padding:0;cursor:pointer;background:var(--sw)}
.acc-pick button[aria-pressed="true"]{border-color:#fff;box-shadow:0 0 0 2px var(--navy),0 0 0 3.5px #fff}
.acc-pick button.none{background:linear-gradient(135deg,transparent 45%,#fff 45%,#fff 55%,transparent 55%),var(--navy-2)}

/* ---- 參數區：10 個參數兩列，AUC 大字跨兩列 ---- */
.pgrid{display:grid;grid-template-columns:1.3fr repeat(4,1fr);border-bottom:1px solid var(--line)}
.pgrid>div{padding:10px 12px 10px 0;margin-right:12px;border-right:1px solid var(--line)}
.pgrid>div:nth-child(5),.pgrid>div:nth-child(9){border-right:0;margin-right:0}
.pgrid>div:nth-child(n+6){border-top:1px solid var(--line)}
.pgrid .key{grid-row:span 2;display:flex;flex-direction:column;justify-content:center}
.pgrid .l{font-size:12px;color:var(--ink-soft);font-weight:700}
.pgrid .v{font-family:var(--font-num);font-variant-numeric:tabular-nums;font-size:22px;font-weight:700;line-height:1.2;margin-top:2px}
.pgrid .v small{font-size:12px;font-weight:400;color:var(--ink-soft);margin-left:3px}
.pgrid .t{font-size:12px;color:var(--ink-soft);margin-top:1px}
.pgrid .key .v{font-size:40px;letter-spacing:-.01em}
.pgrid .grp{font-size:12px;color:var(--ink-soft);font-weight:400}
@media (max-width:640px){
  .acc-pick span{display:none}
  .pgrid{grid-template-columns:1fr 1fr}
  .pgrid>div{border-right:0!important;margin-right:0;border-top:1px solid var(--line)}
  .pgrid .key{grid-row:auto;grid-column:1/-1;border-top:0}
  .pgrid .key .v{font-size:34px}
}
"""

def pgrid():
    c = lambda l, v, u, t: '<div><div class="l">%s</div><div class="v">%s<small>%s</small></div><div class="t">%s</div></div>' % (l, v, u, t)
    key = ('<div class="key"><div class="l">AUC₂₄,ss（現行處方推算）</div><div class="v">457<small>mg·h/L</small></div>'
           '<div class="t">目標 400–600　<span class="st ok">目標內</span></div></div>')
    row1 = c('Cmin,ss', '11.7', 'µg/mL', '關切 &gt;15') + c('Cmax,ss', '28.2', 'µg/mL', '現行處方推算') + c('AUC/MIC', '457', '', 'MIC 假設 1') + c('近 24h 實際 AUC', '455', 'mg·h/L', '依已發生給藥推算')
    row2 = c('t½', '7.9', 'h', 'ke 0.088 h⁻¹') + c('CL', '4.38', 'L/h', '') + c('Vd', '49.8', 'L', '0.77 L/kg') + c('CrCl（Cockcroft-Gault）', '80', 'mL/min', 'IBW（Devine）')
    return '<div class="pgrid" role="group" aria-label="參數">%s%s%s</div>' % (key, row1, row2)

def panel():
    html = B.panel()
    # 數字列 → 兩列參數區
    a = html.index('  <div class="nums">'); b = html.index('  <div class="flagline">')
    html = html[:a] + '  ' + pgrid() + '\n' + html[b:]
    # 拿掉重複的「完整參數」整段
    a = html.index('  <div class="sec"><h4>完整參數'); b = html.index('  <div class="acc">')
    html = html[:a] + html[b:]
    html = html.replace('▼ 以下捲動：完整參數・AI Prompt', '▼ 以下捲動：AI Prompt（其餘都在上方）')
    return html

PICKER_JS = """
<script>
(function(){
  var KEY='tdm_ui_accent', root=document.documentElement;
  function apply(v){ if(v==='magenta'){root.removeAttribute('data-accent');} else {root.setAttribute('data-accent',v);}
    document.querySelectorAll('.acc-pick button').forEach(function(b){b.setAttribute('aria-pressed', b.dataset.v===v?'true':'false');}); }
  var saved='magenta'; try{ saved=localStorage.getItem(KEY)||'magenta'; }catch(e){}
  var m=location.search.match(/accent=(\\w+)/); if(m) saved=m[1];
  apply(saved);
  document.querySelectorAll('.acc-pick button').forEach(function(b){ b.addEventListener('click',function(){ apply(b.dataset.v); try{localStorage.setItem(KEY,b.dataset.v);}catch(e){} }); });
})();
</script>"""

def page():
    html = B.page('c')
    picker = '<div class="acc-pick" role="group" aria-label="強調色"><span>強調色</span>' + ''.join(
        '<button type="button" class="%s" data-v="%s" style="--sw:%s" title="%s" aria-label="強調色：%s" aria-pressed="%s"></button>' % (
            'none' if k == 'none' else '', k, acc, name, name, 'true' if k == 'magenta' else 'false') for k, name, acc, on, tab in ACCENT_OPTS) + '</div>'
    html = html.replace('<button class="btn">存為新收案</button>', picker + '<button class="btn">存為新收案</button>', 1)
    # 撞色改由 data-accent 控制（預設洋紅）
    html = re.sub(r':root\{--accent:[^}]+\}', accent_css().replace('\\', r'\\'), html, count=1)
    html = html.replace('</style>', PICKER_CSS + '</style>', 1)
    # 換掉面板
    a = html.index('<div class="rp">'); b = html.index('</main>')
    old_right_end = html.rindex('</div>', a, b)  # .right 的結尾
    html = html[:a] + panel() + html[old_right_end:]
    html = html.replace('D1 第二輪・C2（洋紅 撞色）', 'D1 第三輪・C3（洋紅為預設，可自選強調色）')
    html = html.replace('數字優先、拿掉圖尺；右邊固定在畫面上，往下捲看細節', '參數併成兩列、不重複；右上可換強調色（存在這台電腦）')
    html = html.replace('<title>方向板 C2（洋紅）</title>', '<title>方向板 C3</title>')
    html = html.replace('</body>', PICKER_JS + '</body>', 1)
    # 左欄：可收合段落＋段落列＋較早給藥收起（Brandon 2026-10-21）
    import boards3_collapse as CO
    old_ws = B.worksheet()
    assert html.count(old_ws) == 1
    html = html.replace(old_ws, CO.worksheet(), 1)
    html = html.replace('</style>', CO.CSS + '</style>', 1)
    html = html.replace('</body>', CO.JS + '</body>', 1)
    return html

if __name__ == '__main__':
    with open(os.path.join(OUT, 'C3.html'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(page())
    print('wrote C3')

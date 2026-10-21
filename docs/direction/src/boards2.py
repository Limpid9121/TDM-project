# -*- coding: utf-8 -*-
# D1 第二輪：C 案修正版（C2）。Brandon 2026-10-21 回饋：
#   1. 不要只是重講數字的圖（目標帶尺、同尺長條、半衰期尺都拿掉）；數字＋目標範圍＋狀態字就夠。
#   2. 綠色配色 AI 味重 → 黑白灰＋深藍主色＋一個大膽撞色（做三種讓他比：芥末黃／朱紅／洋紅）。
#   3. 右邊固定在畫面上：不捲動就看到最重要的資訊，左邊輸入時右邊即時更新；細節與劑量規劃往下捲。
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from boards_common import DOSES, LEVELS, SCRS, X0, X1, NOW_H, conc, day_ticks, CAND, PARAMS

OUT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

ACCENTS = {
    # name: (accent, on-accent text, tab indicator on navy, 中文名)
    'a': ('#F2B705', '#14171C', '#F2B705', '芥末黃'),
    'b': ('#E4572E', '#14171C', '#E4572E', '朱紅'),
    'c': ('#C2185B', '#FFFFFF', '#FFFFFF', '洋紅'),
}

def chart2(w, h, lane_h=20, pad_l=40, pad_r=12, pad_t=26, pad_b=20):
    lanes_h = 3 * lane_h + 6
    plot_h = h - pad_t - pad_b - lanes_h
    plot_w = w - pad_l - pad_r
    xs = lambda t: pad_l + (t - X0) / (X1 - X0) * plot_w
    ys = lambda c: pad_t + plot_h - c / 32.0 * plot_h
    s = ['<svg class="chart" viewBox="0 0 %d %d" width="100%%" role="img" aria-label="濃度－時間曲線與給藥、抽血、SCr 時間軸">' % (w, h)]
    for hh, lab in day_ticks():
        x = xs(hh)
        s.append('<line class="grid" x1="%.1f" x2="%.1f" y1="%d" y2="%d"/>' % (x, x, pad_t, pad_t + plot_h + lanes_h))
        s.append('<text class="ax" x="%.1f" y="%d" dx="3">%s</text>' % (x, h - 5, lab))
    for v in (0, 10, 20, 30):
        y = ys(v)
        s.append('<line class="grid" x1="%d" x2="%d" y1="%.1f" y2="%.1f"/>' % (pad_l, w - pad_r, y, y))
        s.append('<text class="ax" x="%d" y="%.1f" text-anchor="end">%d</text>' % (pad_l - 6, y + 4, v))
    y20 = ys(20)
    s.append('<line class="ref" x1="%d" x2="%d" y1="%.1f" y2="%.1f"/>' % (pad_l, w - pad_r, y20, y20))
    for td, D, inf in DOSES:
        s.append('<rect class="inf" x="%.1f" y="%d" width="%.1f" height="%.1f"/>' % (xs(td), pad_t, xs(td + inf) - xs(td), plot_h))
    step, solid, dash, t = 0.5, [], [], 0.0
    while t <= X1 + 1e-9:
        (solid if t <= NOW_H else dash).append((xs(t), ys(conc(t))))
        t += step
    dash.insert(0, solid[-1])
    s.append('<polyline class="curve" points="%s"/>' % ' '.join('%.1f,%.1f' % p for p in solid))
    s.append('<polyline class="pred" points="%s"/>' % ' '.join('%.1f,%.1f' % p for p in dash))
    s.append('<text class="reft" x="%d" y="%.1f">Cmin 關切 20</text>' % (pad_l + 6, y20 - 7))
    xn = xs(NOW_H)
    s.append('<line class="now" x1="%.1f" x2="%.1f" y1="%d" y2="%d"/>' % (xn, xn, pad_t - 4, pad_t + plot_h + lanes_h))
    s.append('<rect class="nowchip" x="%.1f" y="%d" width="64" height="18" rx="3"/>' % (xn - 32, pad_t - 22))
    s.append('<text class="nowt" x="%.1f" y="%d" text-anchor="middle">現在 21:07</text>' % (xn, pad_t - 9))
    for tt, cc, lab, _ in LEVELS:
        s.append('<circle class="lvl" cx="%.1f" cy="%.1f" r="5"/>' % (xs(tt), ys(cc)))
        dy = -9 if tt < 70 else 18
        s.append('<text class="lvlt" x="%.1f" y="%.1f" text-anchor="end">%.1f</text>' % (xs(tt) - 9, ys(cc) + dy, cc))
    base = pad_t + plot_h + 6
    for i, nm in enumerate(['給藥', '抽血', 'SCr']):
        y = base + i * lane_h
        s.append('<line class="grid" x1="%d" x2="%d" y1="%d" y2="%d"/>' % (pad_l, w - pad_r, y, y))
        s.append('<text class="ax" x="%d" y="%d" text-anchor="end">%s</text>' % (pad_l - 6, y + lane_h / 2 + 4, nm))
    yc = lambda i: base + i * lane_h + lane_h / 2
    for td, D, inf in DOSES:
        s.append('<rect class="dose" x="%.1f" y="%.1f" width="%.1f" height="12" rx="2"/>' % (xs(td), yc(0) - 6, max(3, xs(td + inf) - xs(td))))
    for tt, cc, lab, _ in LEVELS:
        s.append('<circle class="lvl" cx="%.1f" cy="%.1f" r="5"/>' % (xs(tt), yc(1)))
    for tt, vv, lab in SCRS:
        off = tt < X0
        x = xs(X0) + 10 if off else xs(tt)
        s.append('<path class="scr" d="M%.1f %.1f l6 6 l-6 6 l-6 -6 z"/>' % (x, yc(2) - 6))
        s.append('<text class="ax" x="%.1f" y="%.1f" dx="10">%s</text>' % (x, yc(2) + 4, ('◀ %s　%.2f' if off else '%s　%.2f') % (lab, vv)))
    s.append('</svg>')
    return '\n'.join(s)

CSS = r"""
:root{
  --bg:#F3F4F6; --surface:#FFFFFF; --field:#FAFAFB; --ink:#14171C; --ink-soft:#4F5663;
  --line:#E1E4E8; --line-strong:#C9CED6; --border-input:#868D99;
  --navy:#1B2A4A; --navy-2:#2C3E66; --navy-soft:#C9D2E3; --navy-tint:#EEF1F6;
  --ok:#1C7A43; --caution:#9A5A00; --danger:#B42318;
  --font:"Microsoft JhengHei","PingFang TC","Noto Sans TC",system-ui,sans-serif;
  --font-num:"Segoe UI",system-ui,"Microsoft JhengHei","PingFang TC",sans-serif;
}
*{box-sizing:border-box}
html,body{margin:0}
body{font-family:var(--font);font-size:14px;line-height:1.5;color:var(--ink);background:var(--bg);-webkit-font-smoothing:antialiased}
h1,h2,h3,h4,p{margin:0}
.num{font-family:var(--font-num);font-variant-numeric:tabular-nums}
:focus-visible{outline:2px solid var(--navy);outline-offset:2px}
.cap{background:#fff;border-bottom:1px solid var(--line);font-size:12px;color:var(--ink-soft);padding:5px 24px;display:flex;gap:16px}
.cap b{color:var(--ink)}

/* 頂列：深藍＋底下一條撞色 */
.top-bar{position:sticky;top:0;z-index:20;background:var(--navy);color:#fff;display:flex;align-items:center;gap:24px;padding:0 24px;min-height:48px;box-shadow:inset 0 -3px 0 var(--accent)}
.top-bar h1{font-size:17px;font-weight:700;letter-spacing:.02em;white-space:nowrap}
.tabs{display:flex;align-self:stretch}
.tabs a{display:flex;align-items:center;padding:0 14px 3px;color:var(--navy-soft);text-decoration:none;font-size:13px;border-bottom:3px solid transparent;margin-bottom:3px}
.tabs a.on{color:#fff;font-weight:700;border-bottom-color:var(--tab-ind)}
.id{margin-left:auto;display:flex;gap:14px;align-items:center;font-size:13px;color:var(--navy-soft);white-space:nowrap}
.id b{color:#fff}
.id .sep{opacity:.45}
.btn{font:inherit;font-size:12px;font-weight:700;border-radius:4px;padding:6px 12px;min-height:32px;border:1px solid var(--border-input);background:#fff;color:var(--ink)}
.btn.primary{background:var(--navy);border-color:var(--navy);color:#fff}
.top-bar .btn{background:transparent;border-color:rgba(255,255,255,.5);color:#fff}

.app{max-width:1440px;margin:0 auto;padding:16px 24px 32px;display:grid;grid-template-columns:500px minmax(0,1fr);gap:24px;align-items:start}
.app>*{min-width:0}

/* ---- 左：工作底稿 ---- */
.ws-sec{padding:14px 0 12px;border-top:1px solid var(--line)}
.ws-sec:first-child{border-top:0;padding-top:0}
.ws-sec h2{font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px;margin-bottom:8px}
.idx{font-family:var(--font-num);font-size:12px;font-weight:700;color:var(--navy);border:1.5px solid var(--navy);border-radius:3px;padding:0 5px;line-height:18px}
.ws-sec .sum{margin-left:auto;font-size:12px;font-weight:400;color:var(--ink-soft)}
.ws-sec.collapsed h2{margin-bottom:0}
.grid{display:grid;gap:10px;margin-bottom:10px;align-items:start}
.g2{grid-template-columns:1fr 1fr}.g3{grid-template-columns:1fr 1fr 1fr}
.fld label{display:block;font-size:12px;font-weight:700;color:var(--ink-soft);margin-bottom:3px}
.inp{height:32px;display:flex;align-items:center;padding:6px 8px;background:var(--field);border:1px solid var(--border-input);border-radius:4px;font-family:var(--font-num);font-variant-numeric:tabular-nums;font-size:14px}
.inp.sel::after{content:"▾";margin-left:auto;color:var(--ink-soft);font-size:11px}
.inp .u{margin-left:auto;font-size:12px;color:var(--ink-soft);font-family:var(--font)}
.inp.live{border-color:var(--navy);box-shadow:0 0 0 2px var(--navy-tint)}
.thead,.row{display:grid;grid-template-columns:22px 1fr 84px 70px 18px;gap:6px;align-items:center}
.thead{font-size:12px;font-weight:700;color:var(--ink-soft);padding-bottom:2px}
.row{padding:3px 0}
.thead.s,.row.s{grid-template-columns:22px 1fr 100px 18px}
.row .n{font-family:var(--font-num);font-size:12px;color:var(--ink-soft);text-align:right}
.row .x{color:var(--ink-soft);text-align:center}
.note{font-size:12px;color:var(--ink-soft);padding-left:28px;margin:-1px 0 2px}
.radio-grp{border:1px solid var(--line);border-radius:4px;background:var(--surface);padding:8px 12px;margin:8px 0}
.radio-grp .t{font-size:13px;font-weight:700;color:var(--ink-soft);margin-bottom:4px}
.radio-grp .t span{font-weight:400;margin-left:6px}
.radio-grp label{display:flex;gap:8px;align-items:flex-start;font-size:13px;padding:2px 0}
.radio-grp i{width:14px;height:14px;border-radius:50%;border:1.5px solid var(--border-input);background:#fff;flex:none;margin-top:3px}
.radio-grp i.on{border-color:var(--navy);box-shadow:inset 0 0 0 3px #fff;background:var(--navy)}
.chk{display:flex;align-items:center;gap:8px;font-size:13px}
.chk i{width:14px;height:14px;border:1.5px solid var(--border-input);border-radius:3px;background:#fff;flex:none}
.chk i.on{background:var(--navy);border-color:var(--navy)}
.btn-row{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0}

/* ---- 右：固定在畫面上的判讀面板 ---- */
/* sticky 要放在欄位外層：.right 的父層是整個 .app（跟左欄一樣高），才有空間黏住 */
.right{position:sticky;top:63px}
.rp{height:calc(100vh - 79px);overflow-y:auto;background:var(--surface);border:1px solid var(--line);border-radius:6px;scrollbar-gutter:stable}
.rp-in{padding:0 20px 20px}
.rp-head{position:sticky;top:0;z-index:2;background:var(--surface);display:flex;align-items:center;gap:12px;padding:12px 0 10px;border-bottom:1px solid var(--line);flex-wrap:wrap}
.rp-head h3{font-size:15px;font-weight:700}
.rp-head .rx{font-size:13px}
.rp-head .fit{font-size:12px;color:var(--ink-soft)}
.live-dot{margin-left:auto;font-size:12px;color:var(--ink-soft);display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.live-dot i{width:8px;height:8px;border-radius:50%;background:var(--ok);display:inline-block}
.nums{display:grid;grid-template-columns:1.5fr repeat(5,1fr);border-bottom:1px solid var(--line)}
.nums>div{padding:12px 12px 12px 0;border-right:1px solid var(--line);margin-right:12px}
.nums>div:last-child{border-right:0;margin-right:0}
.nums .l{font-size:12px;color:var(--ink-soft);font-weight:700}
.nums .v{font-family:var(--font-num);font-variant-numeric:tabular-nums;font-size:22px;font-weight:700;line-height:1.2;margin-top:2px}
.nums .v small{font-size:12px;font-weight:400;color:var(--ink-soft);margin-left:3px}
.nums .t{font-size:12px;color:var(--ink-soft);margin-top:2px}
.nums .key .v{font-size:34px;letter-spacing:-.01em}
.st{font-weight:700;font-size:13px}
.st.ok{color:var(--ok)}.st.caution{color:var(--caution)}.st.danger{color:var(--danger)}
.st::before{content:"";display:inline-block;width:8px;height:8px;margin-right:5px;vertical-align:1px;background:currentColor}
.flagline{display:flex;gap:10px;align-items:baseline;font-size:13px;padding:8px 0;border-bottom:1px solid var(--line)}
.flagline b{font-size:12px;color:var(--ink-soft)}
.sec{padding:14px 0 6px}
.sec h4{font-size:13px;font-weight:700;margin-bottom:6px;display:flex;align-items:baseline;gap:10px}
.sec h4 span{font-size:12px;font-weight:400;color:var(--ink-soft);margin-left:auto}
.tbl{width:100%;border-collapse:collapse;font-size:13px}
.tbl th{font-size:12px;font-weight:700;color:var(--ink-soft);text-align:right;padding:5px 8px;border-bottom:1px solid var(--line-strong)}
.tbl th:nth-child(1),.tbl th:nth-child(2),.tbl th:last-child{text-align:left}
.tbl td{padding:7px 8px;border-bottom:1px solid var(--line);text-align:right;font-family:var(--font-num);font-variant-numeric:tabular-nums}
.tbl td.t{text-align:left;font-family:var(--font)}
.tbl tr.cur td{background:var(--navy-tint)}
.tag-cur{display:inline-block;font-size:12px;font-weight:700;padding:0 6px;border-radius:3px;background:var(--accent);color:var(--on-accent);margin-left:6px}
.tbl tr.custom td{border-bottom:0}
.tbl .ci{display:inline-flex;height:28px;align-items:center;padding:0 6px;border:1px solid var(--border-input);border-radius:4px;background:var(--field);min-width:56px;justify-content:flex-end;font-family:var(--font-num)}
.more{margin:14px 0 0;padding:8px 0;border-top:2px solid var(--ink);font-size:12px;color:var(--ink-soft);display:flex;justify-content:space-between}
.defl{display:grid;grid-template-columns:1fr auto 120px;gap:0 12px;font-size:13px;margin:0}
.defl>div{display:contents}
.defl dt,.defl dd{padding:6px 0;border-bottom:1px solid var(--line);margin:0}
.defl dt{color:var(--ink-soft)}
.defl dd.v{font-family:var(--font-num);font-weight:700;text-align:right}
.defl dd.u{font-size:12px;color:var(--ink-soft)}
.acc{border:1px solid var(--line);border-radius:4px;padding:9px 12px;font-size:13px;display:flex;justify-content:space-between;margin-top:12px}
.acc span{font-size:12px;color:var(--ink-soft)}
p.tx{font-size:13px;margin-bottom:6px}
.legend{display:flex;gap:16px;font-size:12px;color:var(--ink-soft);flex-wrap:wrap;margin:2px 0 0}
.legend span{display:inline-flex;align-items:center;gap:6px}
.lg-bar{width:12px;height:8px;background:var(--navy);border-radius:2px}
.lg-dot{width:10px;height:10px;background:var(--ink);border-radius:50%}
.lg-dia{width:9px;height:9px;border:1.5px solid var(--ink-soft);transform:rotate(45deg)}
.lg-dash{width:16px;border-top:2px dashed var(--navy-2)}

/* 圖表（用 CSS 上色，撞色只出現在「現在」） */
.chart{display:block}
.chart .grid{stroke:var(--line);stroke-width:1}
.chart .ax{font-size:12px;fill:var(--ink-soft);font-family:var(--font-num)}
.chart .ref{stroke:var(--danger);stroke-width:1.2;stroke-dasharray:5 4}
.chart .reft{font-size:12px;fill:var(--danger);paint-order:stroke;stroke:#fff;stroke-width:4px;stroke-linejoin:round}
.chart .inf{fill:var(--navy-tint)}
.chart .curve{fill:none;stroke:var(--navy);stroke-width:2.2;stroke-linejoin:round}
.chart .pred{fill:none;stroke:var(--navy-2);stroke-width:2;stroke-dasharray:6 4;opacity:.75}
.chart .now{stroke:var(--ink);stroke-width:1.5}
.chart .nowchip{fill:var(--accent)}
.chart .nowt{font-size:12px;font-weight:700;fill:var(--on-accent)}
.chart .lvl{fill:var(--ink);stroke:#fff;stroke-width:1.5}
.chart .lvlt{font-size:13px;font-weight:700;fill:var(--ink);font-family:var(--font-num);paint-order:stroke;stroke:#fff;stroke-width:4px;stroke-linejoin:round}
.chart .dose{fill:var(--navy)}
.chart .scr{fill:#fff;stroke:var(--ink-soft);stroke-width:1.5}

.seg,.m-bar{display:none}
@media (max-width:980px){
  .app{grid-template-columns:minmax(0,1fr);padding:16px}
  .right{position:static}
  .rp{height:auto;overflow:visible}
  .top-bar{flex-wrap:wrap;gap:8px 16px;padding:8px 16px}
  .id{margin-left:0;flex-wrap:wrap;gap:6px 12px;width:100%}
}
@media (max-width:640px){
  .cap{padding:5px 16px}.cap span{display:none}
  .top-bar h1{font-size:16px}
  .tabs{overflow-x:auto;width:100%;order:3;margin:0 -16px;padding:0 16px;scrollbar-width:none}
  .tabs a{white-space:nowrap;min-height:44px}
  .id{font-size:12px}.id .btn{display:none}
  .seg{display:flex;margin:12px 16px 0;border:1px solid var(--border-input);border-radius:4px;overflow:hidden;background:#fff}
  .seg button{flex:1;font:inherit;font-weight:700;font-size:14px;min-height:44px;border:0;background:#fff;color:var(--ink)}
  .seg button[aria-pressed="true"]{background:var(--navy);color:#fff}
  .app{padding:12px 16px 24px;gap:12px}
  .left{display:none}
  body.show-input .left{display:block}
  body.show-input .right{display:none}
  .rp-in{padding:0 14px 16px}
  .rp-head{position:static}
  .live-dot{margin-left:0}
  .nums{grid-template-columns:1fr 1fr 1fr}
  .nums>div{border-right:0;margin-right:0;padding:10px 0;border-bottom:1px solid var(--line)}
  .nums .key{grid-column:1/-1}
  .nums .key .v{font-size:32px}
  .tbl{font-size:12px}.tbl th,.tbl td{padding:6px 4px}
  .tbl .hm{display:none}
  .more span:last-child{display:none}
  .defl{grid-template-columns:1fr auto}.defl dd.u{display:none}
  .m-bar{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:10;background:var(--navy);color:#fff;padding:10px 16px;align-items:center;gap:12px;box-shadow:inset 0 3px 0 var(--accent)}
  .m-bar .v{font-family:var(--font-num);font-size:20px;font-weight:700}
  .m-bar small{display:block;font-size:12px;color:var(--navy-soft)}
  .m-bar .ok{font-weight:700;color:#7FD3A0}
  .m-bar .btn{margin-left:auto;min-height:44px;background:#fff;color:var(--navy);border-color:#fff}
  body{padding-bottom:76px}
  .full .m-bar{position:static;margin-top:12px}
  .full body{padding-bottom:0}
  .inp{height:44px;font-size:16px}
  .btn{min-height:44px}
}
"""

def worksheet():
    labels = ['10/17 21:06', '10/18 09:06', '10/18 21:06', '10/19 09:06', '10/19 21:06', '10/20 09:06', '10/20 21:06']
    doses = ''.join(('<div class="row"><span class="n">%d</span><div class="inp%s">2026/%s</div><div class="inp">1000<span class="u">mg</span></div>'
                     '<div class="inp">120<span class="u">min</span></div><span class="x">×</span></div>') % (i + 1, ' live' if i == 6 else '', l) for i, l in enumerate(labels))
    return f"""
<section class="ws-sec"><h2><span class="idx">01</span>病人與腎功能</h2>
  <div class="grid g3"><div class="fld"><label>年齡（歲）</label><div class="inp">55</div></div><div class="fld"><label>生理性別</label><div class="inp sel">男</div></div><div class="fld"><label>身高（cm）</label><div class="inp">168</div></div></div>
  <div class="grid g2"><div class="fld"><label>實際體重 TBW（kg）</label><div class="inp">65</div></div><div class="fld"><label>是否透析</label><div class="inp sel">否</div></div></div>
  <div class="thead s"><span></span><span>SCr 日期</span><span>SCr（mg/dL）</span><span></span></div>
  <div class="row s"><span class="n">1</span><div class="inp">2026/10/16</div><div class="inp">1.1</div><span class="x">×</span></div>
  <div class="row s"><span class="n">2</span><div class="inp">2026/10/20</div><div class="inp">0.95</div><span class="x">×</span></div>
  <div class="btn-row"><button class="btn">＋ 新增一筆 SCr</button></div>
</section>
<section class="ws-sec collapsed"><h2><span class="idx">02</span>感染／臨床脈絡<span class="sum">治療（經驗性）・穩定</span></h2></section>
<section class="ws-sec"><h2><span class="idx">03</span>給藥處方與紀錄</h2>
  <div class="grid g3"><div class="fld"><label>維持劑量（mg）</label><div class="inp">1000</div></div><div class="fld"><label>給藥間隔 τ（小時）</label><div class="inp">12</div></div><div class="fld"><label>輸注時間（分鐘）</label><div class="inp">120</div></div></div>
  <div class="radio-grp"><div class="t">第一筆給藥是不是本療程第一劑？<span>有給藥紀錄時必選</span></div>
    <label><i class="on"></i>第一筆紀錄就是本療程第一劑</label><label><i></i>之前已規則給藥（已達穩態），第一筆只是我登錄的起點</label></div>
  <div class="chk" style="margin:6px 0"><i></i>首劑為獨立 loading 劑量（劑量與維持劑量不同）</div>
  <div class="btn-row"><button class="btn primary">依上述處方自動展開給藥紀錄</button></div>
  <div class="thead"><span>#</span><span>給藥開始時間</span><span>劑量</span><span>輸注</span><span></span></div>
  {doses}
</section>
<section class="ws-sec"><h2><span class="idx">04</span>血中濃度量測（自由時點）</h2>
  <div class="thead s"><span>#</span><span>抽血時間</span><span>濃度</span><span></span></div>
  <div class="row s"><span class="n">1</span><div class="inp">2026/10/20 12:36</div><div class="inp">24.6<span class="u">µg/mL</span></div><span class="x">×</span></div>
  <div class="note">第 6 劑輸注結束後 1.5 小時（peak 附近）</div>
  <div class="row s"><span class="n">2</span><div class="inp">2026/10/20 21:01</div><div class="inp">11.8<span class="u">µg/mL</span></div><span class="x">×</span></div>
  <div class="note">第 7 劑給藥前 5 分鐘（trough）</div>
</section>
<section class="ws-sec"><h2><span class="idx">05</span>目標與情境設定</h2>
  <div class="grid g2"><div class="fld"><label>MIC 假設（µg/mL）</label><div class="inp">1</div></div><div class="fld"><label>目標 AUC₂₄（mg·h/L）</label><div class="inp">500</div></div></div>
  <div class="fld"><label>候選給藥間隔</label><div class="btn-row" style="margin:2px 0 0"><span class="chk"><i class="on"></i>q8h</span><span class="chk"><i class="on"></i>q12h</span><span class="chk"><i class="on"></i>q24h</span></div></div>
</section>
<section class="ws-sec collapsed"><h2><span class="idx">06</span>併用藥物與其他備註<span class="sum">未填</span></h2></section>
"""

def panel():
    cand_rows = ''
    for tau, dose, inf, cmax, cmin, auc, kind, chip, note, cur in CAND:
        st = '<span class="st %s">%s</span>' % (kind, '目標內' if kind == 'ok' else 'Cmin 15–20 留意')
        cand_rows += ('<tr class="%s"><td class="t"><b>%s</b>%s</td><td class="t">%s ／ %s</td><td>%d</td><td>%.1f</td><td class="hm">%.1f</td><td class="t">%s</td></tr>') % (
            'cur' if cur else '', tau, '<span class="tag-cur">現行</span>' if cur else '', dose, inf, auc, cmin, cmax, st)
    params = ''.join('<div><dt>%s</dt><dd class="v">%s</dd><dd class="u">%s</dd></div>' % p for p in PARAMS)
    return f"""
<div class="rp"><div class="rp-in">
  <div class="rp-head"><h3>判讀</h3><span class="rx">現行 <b>1000 mg q12h</b>・輸注 120 分</span><span class="fit">聯合擬合（2 點，相距 8.4 h）</span>
    <span class="live-dot"><i></i>已依左側輸入即時更新</span></div>
  <div class="nums">
    <div class="key"><div class="l">AUC₂₄,ss</div><div class="v">457<small>mg·h/L</small></div><div class="t">目標 400–600　<span class="st ok">目標內</span></div></div>
    <div><div class="l">Cmin,ss</div><div class="v">11.7<small>µg/mL</small></div><div class="t">關切 &gt;15</div></div>
    <div><div class="l">Cmax,ss</div><div class="v">28.2<small>µg/mL</small></div><div class="t">　</div></div>
    <div><div class="l">t½</div><div class="v">7.9<small>h</small></div><div class="t">ke 0.088</div></div>
    <div><div class="l">CL</div><div class="v">4.38<small>L/h</small></div><div class="t">CrCl 80</div></div>
    <div><div class="l">Vd</div><div class="v">49.8<small>L</small></div><div class="t">0.77 L/kg</div></div>
  </div>
  <div class="flagline"><b>注意事項</b><span>無明顯健全性疑慮：兩點相距 8.4 h（約 1.1 個半衰期）；SCr 穩定 1.1 → 0.95</span></div>
  <div class="sec"><h4>濃度曲線與時間軸<span>給藥・抽血・SCr 共用時間軸</span></h4>
    <div class="dsk">{chart2(820, 268)}</div><div class="mob" style="display:none">{chart2(340, 268)}</div>
    <div class="legend"><span><i class="lg-bar"></i>給藥（寬＝輸注時間）</span><span><i class="lg-dot"></i>抽血</span><span><i class="lg-dia"></i>SCr</span><span><i class="lg-dash"></i>預測</span></div></div>
  <div class="sec"><h4>候選方案<span>選一列＝在曲線上疊加預測</span></h4>
    <div style="overflow-x:auto"><table class="tbl"><tr><th>方案</th><th>劑量／輸注</th><th>AUC₂₄</th><th>Cmin</th><th class="hm">Cmax</th><th>判讀</th></tr>{cand_rows}
      <tr class="custom"><td class="t"><b>自訂</b></td><td class="t"><span class="ci">mg</span> ／ <span class="ci">min</span> q <span class="ci" style="min-width:36px">h</span></td><td>—</td><td>—</td><td class="hm">—</td><td class="t" style="color:var(--ink-soft);font-size:12px">輸入即算</td></tr></table></div></div>
  <div class="more"><span>▼ 以下捲動：監測與下次抽血・完整參數・AI Prompt</span><span>右邊面板可單獨捲動</span></div>
  <div class="sec"><h4>監測與下次抽血</h4>
    <p class="tx"><b>維持現行處方：</b>穩定者每週一次 trough。</p>
    <p class="tx"><b>若改處方：</b>新處方開始後約 <b class="num">32–40</b> 小時（4–5 × t½ 7.9 h）再抽 trough。</p>
    <p class="tx">SCr 每 2–3 天至每週；尿量；腎功能變化、透析啟動、感染惡化時重新評估。</p></div>
  <div class="sec"><h4>完整參數<span>聯合擬合（2 點）</span></h4><dl class="defl">{params}</dl></div>
  <div class="acc"><b>AI 諮詢 Prompt</b><span>整合 lab 趨勢與病程後的第二意見 ▸ 展開</span></div>
</div></div>"""

def page(key):
    accent, on_acc, tab_ind, cname = ACCENTS[key]
    css = CSS + ':root{--accent:%s;--on-accent:%s;--tab-ind:%s}\n@media (max-width:640px){.dsk{display:none}.mob{display:block!important}}' % (accent, on_acc, tab_ind)
    top = """<header class="top-bar"><h1>TDM 工作台</h1><nav class="tabs" aria-label="藥物模組"><a class="on" href="#">Vancomycin</a><a href="#">Aminoglycoside</a><a href="#">Azole</a><a href="#">抗癲癇藥物</a></nav>
<div class="id"><span>病歷號 <b class="num">示範-001</b></span><span class="sep">｜</span><span><b class="num">55</b> 歲・男・168 cm・65 kg</span><span class="sep">｜</span><span>CrCl <b class="num">80</b> mL/min</span><span class="sep">｜</span><span>非透析</span><button class="btn">存為新收案</button><button class="btn">清空此頁</button></div></header>"""
    seg = '<div class="seg" role="group" aria-label="輸入或結果"><button data-v="in" aria-pressed="false">輸入</button><button data-v="out" aria-pressed="true">結果</button></div>'
    mbar = '<div class="m-bar"><div><span class="v">AUC₂₄ 457</span> <span class="ok">目標內</span><small>目標 400–600・Cmin 11.7</small></div><button class="btn">看結果</button></div>'
    cap = '<div class="cap"><b>D1 第二輪・C2（%s 撞色）</b><span>數字優先、拿掉圖尺；右邊固定在畫面上，往下捲看細節</span><span>示範病例真實數字・靜態畫面</span></div>' % cname
    js = """<script>
document.querySelectorAll('.seg button').forEach(function(b){b.addEventListener('click',function(){document.body.classList.toggle('show-input',b.dataset.v==='in');document.querySelectorAll('.seg button').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});});});
var q=location.search; if(q.indexOf('full')>-1){document.documentElement.classList.add('full');}
var m=q.match(/ls=(\\d+)/); if(m){window.scrollTo(0,+m[1]);}
var r=q.match(/rs=(\\d+)/); if(r){document.querySelector('.rp').scrollTop=+r[1];}
</script>"""
    body = cap + top + seg + '<main class="app"><div class="left">%s</div><div class="right">%s</div></main>' % (worksheet(), panel()) + mbar
    return ('<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            '<title>方向板 C2（%s）</title><style>%s</style></head><body>%s%s</body></html>') % (cname, css, body, js)

if __name__ == '__main__':
    for k in ACCENTS:
        with open(os.path.join(OUT, 'C2%s.html' % k), 'w', encoding='utf-8', newline='\n') as f:
            f.write(page(k))
        print('wrote C2%s' % k)

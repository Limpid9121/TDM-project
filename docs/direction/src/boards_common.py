# -*- coding: utf-8 -*-
# 方向板共用資料與元件（D1）。數字全部來自示範病例（index.html?demo=1，2026-10-20 實際讀出）。
import math

# ---------------- 真實數字（示範病例） ----------------
CL, V = 4.38, 49.8
KE = CL / V
DOSES = [(12 * i, 1000, 2.0) for i in range(7)]      # 起點 = 10/17 21:06；第 7 劑 = 10/20 21:06（現在）
NOW_H = 72.0
LEVELS = [(62.5, 24.6, '10/20 12:36', '第 6 劑輸注結束後 1.5 小時（peak 附近）'),
          (71.92, 11.8, '10/20 21:01', '第 7 劑給藥前 5 分鐘（trough）')]
SCRS = [(-45.0, 1.1, '10/16'), (50.9, 0.95, '10/20')]
X0, X1 = -10.0, 96.0                                   # 時間軸範圍（小時）

def conc(t, doses=None):
    doses = doses or (DOSES + [(12 * i, 1000, 2.0) for i in range(7, 9)])
    tot = 0.0
    for td, D, inf in doses:
        if t < td:
            continue
        R = D / inf
        if t <= td + inf:
            tot += R / CL * (1 - math.exp(-KE * (t - td)))
        else:
            tot += R / CL * (1 - math.exp(-KE * inf)) * math.exp(-KE * (t - td - inf))
    return tot

DAY_TICKS = [(-45.0 + 24 * i, '10/%d' % (16 + i)) for i in range(0, 7)]  # 每天 00:00（10/16 00:00 = -45h）

def day_ticks():
    # 10/16 00:00 = -45 h；之後每 24 h 一天
    out = []
    for i in range(0, 7):
        h = -45.0 + 24 * i
        if X0 <= h <= X1:
            out.append((h, '10/%d' % (16 + i)))
    return out

# ---------------- 圖表 ----------------
def chart(w, h, lanes=True, lane_h=20, show_ref=True, pad_l=38, pad_r=10, pad_t=24, pad_b=20, big_labels=False):
    """曲線＋共用時間軸事件。回傳 <svg>。lanes=True 時，曲線下方加三條事件軌（給藥／抽血／SCr）。"""
    lanes_h = 3 * lane_h + 6 if lanes else 0
    plot_h = h - pad_t - pad_b - lanes_h
    plot_w = w - pad_l - pad_r
    xs = lambda t: pad_l + (t - X0) / (X1 - X0) * plot_w
    ymax = 32.0
    ys = lambda c: pad_t + plot_h - c / ymax * plot_h
    s = []
    s.append('<svg class="chart" viewBox="0 0 %d %d" width="100%%" role="img" aria-label="濃度－時間曲線與給藥、抽血、SCr 事件">' % (w, h))
    # 日格線與日期
    for hh, lab in day_ticks():
        x = xs(hh)
        s.append('<line x1="%.1f" x2="%.1f" y1="%d" y2="%d" stroke="#DADFD8" stroke-width="1"/>' % (x, x, pad_t, pad_t + plot_h + lanes_h))
        s.append('<text x="%.1f" y="%d" font-size="12" fill="#52605A" text-anchor="start" dx="3">%s</text>' % (x, h - 5, lab))
    # y 軸
    for v in (0, 10, 20, 30):
        y = ys(v)
        s.append('<line x1="%d" x2="%d" y1="%.1f" y2="%.1f" stroke="#DADFD8" stroke-width="1"/>' % (pad_l, w - pad_r, y, y))
        s.append('<text x="%d" y="%.1f" font-size="12" fill="#52605A" text-anchor="end">%d</text>' % (pad_l - 6, y + 4, v))
    # 20 µg/mL 參考線（Cmin 關切）
    if show_ref:
        y20 = ys(20)
        s.append('<line x1="%d" x2="%d" y1="%.1f" y2="%.1f" stroke="#A23B3B" stroke-width="1.2" stroke-dasharray="5 4"/>' % (pad_l, w - pad_r, y20, y20))
        s.append('<text x="%d" y="%.1f" font-size="12" fill="#8A2B2B" text-anchor="start">Cmin 關切 20</text>' % (pad_l + 6, y20 - 8))
    # 輸注時段淡底
    for td, D, inf in DOSES:
        s.append('<rect x="%.1f" y="%d" width="%.1f" height="%.1f" fill="#D3E9E5" opacity=".55"/>' % (xs(td), pad_t, xs(td + inf) - xs(td), plot_h))
    # 現在線
    xn = xs(NOW_H)
    s.append('<line x1="%.1f" x2="%.1f" y1="%d" y2="%d" stroke="#1B2422" stroke-width="1.2"/>' % (xn, xn, pad_t, pad_t + plot_h + lanes_h))
    s.append('<text x="%.1f" y="%d" font-size="12" fill="#1B2422" text-anchor="middle" font-weight="700">現在 21:07</text>' % (xn, pad_t - 8))
    # 曲線：實線（已發生）＋虛線（預測）
    step = 0.5
    solid, dash = [], []
    t = 0.0
    while t <= X1 + 1e-9:
        pt = (xs(t), ys(conc(t)))
        (solid if t <= NOW_H else dash).append(pt)
        t += step
    if dash:
        dash.insert(0, solid[-1])
    s.append('<polyline points="%s" fill="none" stroke="#154E4B" stroke-width="2.2" stroke-linejoin="round"/>' % ' '.join('%.1f,%.1f' % p for p in solid))
    s.append('<polyline points="%s" fill="none" stroke="#154E4B" stroke-width="2" stroke-dasharray="6 4" opacity=".8"/>' % ' '.join('%.1f,%.1f' % p for p in dash))
    # 實測濃度
    for tt, cc, lab, _ in LEVELS:
        s.append('<circle cx="%.1f" cy="%.1f" r="5" fill="#1B2422" stroke="#fff" stroke-width="1.5"/>' % (xs(tt), ys(cc)))
        dy = -9 if tt < 70 else 18
        s.append('<text x="%.1f" y="%.1f" font-size="13" font-weight="700" fill="#1B2422" text-anchor="end">%.1f</text>' % (
            xs(tt) - 9, ys(cc) + dy, cc))
    # 事件軌
    if lanes:
        base = pad_t + plot_h + 6
        names = ['給藥', '抽血', 'SCr']
        for i, nm in enumerate(names):
            y = base + i * lane_h
            s.append('<line x1="%d" x2="%d" y1="%d" y2="%d" stroke="#DADFD8"/>' % (pad_l, w - pad_r, y, y))
            s.append('<text x="%d" y="%d" font-size="12" fill="#52605A" text-anchor="end">%s</text>' % (pad_l - 6, y + lane_h / 2 + 4, nm))
        yc = lambda i: base + i * lane_h + lane_h / 2
        for td, D, inf in DOSES:
            s.append('<rect x="%.1f" y="%.1f" width="%.1f" height="12" rx="2" fill="#154E4B"/>' % (xs(td), yc(0) - 6, max(3, xs(td + inf) - xs(td))))
        for tt, cc, lab, _ in LEVELS:
            s.append('<circle cx="%.1f" cy="%.1f" r="5.5" fill="#1B2422"/>' % (xs(tt), yc(1)))
        for tt, vv, lab in SCRS:
            off = tt < X0
            x = xs(X0) + 10 if off else xs(tt)
            s.append('<path d="M%.1f %.1f l6 6 l-6 6 l-6 -6 z" fill="#A9701F"/>' % (x, yc(2) - 6))
            txt = ('◀ %s　%.2f' % (lab, vv)) if off else ('%s　%.2f' % (lab, vv))
            s.append('<text x="%.1f" y="%.1f" font-size="12" fill="#6F4609" dx="10">%s</text>' % (x, yc(2) + 4, txt))
    s.append('</svg>')
    return '\n'.join(s)

# ---------------- AUC 目標帶尺 ----------------
def gauge(width_pct_label=True, marks=None, h=44, compact=False):
    return gauge2(marks)

def gauge_old(width_pct_label=True, marks=None, h=44, compact=False):
    """0–800 mg·h/L 水平尺；400–600 綠色目標帶；marks: [(value,label,kind)]。純 CSS／HTML。"""
    lo, hi, mx = 400, 600, 800
    pos = lambda v: v / mx * 100
    html = ['<div class="gauge%s" role="img" aria-label="AUC₂₄ 與目標帶 400 到 600">' % (' compact' if compact else '')]
    html.append('<div class="g-track"></div>')
    html.append('<div class="g-band" style="left:%.2f%%;width:%.2f%%"><span>目標 400–600</span></div>' % (pos(lo), pos(hi) - pos(lo)))
    for v, lab, kind in (marks or []):
        html.append('<div class="g-mark %s" style="left:%.2f%%"><i></i><b>%s</b></div>' % (kind, pos(v), lab))
    for v in (0, 200, 400, 600, 800):
        html.append('<em class="g-tick" style="left:%.2f%%">%d</em>' % (pos(v), v))
    html.append('</div>')
    return ''.join(html)

CAND = [
    ('q8h', '750 mg', '90 分', 27.9, 15.8, 514, 'caution', '留意', 'Cmin 15–20，腎毒性風險略升', False),
    ('q12h', '1000 mg', '120 分', 28.2, 11.7, 457, 'ok', 'OK', '符合目標（AUC 400–600）', True),
    ('q24h', '2250 mg', '270 分', 42.4, 7.6, 514, 'ok', 'OK', '符合目標（AUC 400–600）', False),
]

PARAMS = [
    ('ke（消除速率常數）', '0.088', 'hr⁻¹'),
    ('t½（半衰期）', '7.9', 'hr'),
    ('Vd（分布體積）', '49.8', 'L　0.77 L/kg'),
    ('CL（清除率）', '4.38', 'L/hr'),
    ('CrCl（Cockcroft-Gault）', '80', 'mL/min　IBW（Devine）'),
    ('Cmax,ss（現行處方推算）', '28.2', 'µg/mL'),
    ('Cmin,ss（現行處方推算）', '11.7', 'µg/mL'),
    ('AUC₂₄,ss（現行處方推算）', '457', 'mg·hr/L'),
    ('AUC/MIC', '457', 'MIC 假設 1'),
    ('近 24h 實際 AUC（依已發生給藥推算）', '455', 'mg·hr/L'),
]

# ---------------- 共用 CSS（取自 DESIGN.md 的 token） ----------------
BASE_CSS = r"""
:root{
  --paper:#F4F5F1; --surface:#FFFFFF; --field:#FBFBF9; --ink:#1B2422; --ink-soft:#52605A;
  --line:#DADFD8; --line-strong:#C2C9C0; --border-input:#7F8B84;
  --bar:#12423F; --bar-text:#FFFFFF; --bar-soft:#CFE5E1;
  --trace:#1F6F6B; --trace-strong:#154E4B; --trace-soft:#D3E9E5;
  --ok-text:#17603A; --ok-soft:#DDEFE2; --ok-mark:#2E7D4F;
  --caution-text:#6F4609; --caution-soft:#F2E3C7; --caution-mark:#A9701F;
  --danger-text:#8A2B2B; --danger-soft:#F1D8D5; --danger-mark:#A23B3B;
  --font:"Microsoft JhengHei","PingFang TC","Noto Sans TC",system-ui,sans-serif;
  --font-num:"Segoe UI",system-ui,"Microsoft JhengHei","PingFang TC",sans-serif;
  --r-sm:4px; --r-md:6px; --r-lg:8px;
}
*{box-sizing:border-box}
html,body{margin:0}
.app>*,.dash>*,.panel,.tile{min-width:0}
.tblwrap{overflow-x:auto}
body{font-family:var(--font);font-size:14px;line-height:1.55;color:var(--ink);background:var(--paper);-webkit-font-smoothing:antialiased}
.num{font-family:var(--font-num);font-variant-numeric:tabular-nums}
h1,h2,h3,h4,p{margin:0}
:focus-visible{outline:2px solid var(--trace);outline-offset:2px}

/* ---- 頂列 ---- */
.top-bar{background:var(--bar);color:var(--bar-text);display:flex;align-items:center;gap:24px;padding:0 24px;min-height:48px}
.top-bar h1{font-size:18px;font-weight:700;white-space:nowrap}
.tabs{display:flex;gap:2px;align-self:stretch}
.tabs a{display:flex;align-items:center;padding:0 14px;color:var(--bar-soft);text-decoration:none;font-size:13px;border-bottom:3px solid transparent}
.tabs a.on{color:#fff;font-weight:700;border-bottom-color:#fff}
.id-strip{margin-left:auto;display:flex;align-items:center;gap:14px;font-size:13px;color:var(--bar-soft);white-space:nowrap}
.id-strip b{color:#fff;font-weight:700}
.id-strip .sep{opacity:.5}
.btn{font:inherit;font-size:12px;font-weight:700;border-radius:var(--r-md);padding:6px 12px;min-height:32px;border:1px solid var(--border-input);background:var(--surface);color:var(--ink);cursor:pointer}
.btn.primary{background:var(--trace);border-color:var(--trace);color:#fff}
.top-bar .btn{background:transparent;border-color:rgba(255,255,255,.55);color:#fff}

/* ---- 狀態標籤 ---- */
.chip{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:700;padding:2px 8px;border-radius:var(--r-sm);white-space:nowrap}
.chip.ok{background:var(--ok-soft);color:var(--ok-text)}
.chip.caution{background:var(--caution-soft);color:var(--caution-text)}
.chip.danger{background:var(--danger-soft);color:var(--danger-text)}
.chip.info{background:var(--trace-soft);color:var(--trace-strong)}

/* ---- 左：工作底稿 ---- */
.ws-sec{padding:14px 0 12px;border-top:1px solid var(--line)}
.ws-sec:first-child{border-top:0;padding-top:0}
.ws-sec h2{font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px;margin-bottom:8px}
.idx{font-family:var(--font-num);font-size:12px;font-weight:700;background:var(--trace-soft);color:var(--trace-strong);border-radius:var(--r-sm);padding:1px 6px}
.ws-sec .sum{margin-left:auto;font-size:12px;font-weight:400;color:var(--ink-soft)}
.ws-sec.collapsed h2{margin-bottom:0}
.hint{font-size:12px;color:var(--ink-soft);margin:2px 0 8px}
.grid{display:grid;gap:10px;margin-bottom:10px;align-items:start}
.g2{grid-template-columns:1fr 1fr}.g3{grid-template-columns:1fr 1fr 1fr}.g4{grid-template-columns:1fr 1fr 1fr 1fr}
.fld label{display:block;font-size:12px;font-weight:700;color:var(--ink-soft);margin-bottom:3px;min-height:1.3em}
.inp{height:32px;display:flex;align-items:center;padding:6px 8px;background:var(--field);border:1px solid var(--border-input);border-radius:var(--r-md);font-family:var(--font-num);font-variant-numeric:tabular-nums;font-size:14px}
.inp.sel::after{content:"▾";margin-left:auto;color:var(--ink-soft);font-size:11px}
.inp .u{margin-left:auto;font-size:12px;color:var(--ink-soft);font-family:var(--font)}
.row{display:grid;grid-template-columns:22px 1fr 84px 70px 18px;gap:6px;align-items:center;padding:3px 0}
.row.scr{grid-template-columns:22px 1fr 100px 18px}
.row.lvl{grid-template-columns:22px 1fr 100px 18px}
.row .n{font-family:var(--font-num);font-size:12px;color:var(--ink-soft);text-align:right}
.row .x{color:var(--ink-soft);text-align:center}
.row.hl .inp{border-color:var(--trace);box-shadow:0 0 0 2px var(--trace-soft)}
.row-note{grid-column:2/-1;font-size:12px;color:var(--ink-soft);margin:-1px 0 2px}
.thead{display:grid;grid-template-columns:22px 1fr 84px 70px 18px;gap:6px;font-size:12px;font-weight:700;color:var(--ink-soft);padding:0 0 2px}
.thead.scr,.thead.lvl{grid-template-columns:22px 1fr 100px 18px}
.radio-grp{border:1px solid var(--line);border-radius:var(--r-lg);background:var(--paper);padding:8px 12px;margin:8px 0}
.radio-grp .t{font-size:13px;font-weight:700;color:var(--ink-soft);margin-bottom:4px}
.radio-grp .t span{font-weight:400;margin-left:6px}
.radio-grp label{display:flex;gap:8px;align-items:flex-start;font-size:13px;padding:2px 0}
.radio-grp i{width:14px;height:14px;border-radius:50%;border:1.5px solid var(--border-input);background:#fff;flex:none;margin-top:3px}
.radio-grp i.on{border-color:var(--trace);box-shadow:inset 0 0 0 3px #fff;background:var(--trace)}
.btn-row{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0}
.chk{display:flex;align-items:center;gap:8px;font-size:13px}
.chk i{width:14px;height:14px;border:1.5px solid var(--border-input);border-radius:3px;background:#fff;flex:none}
.chk i.on{background:var(--trace);border-color:var(--trace)}

/* ---- 右：判讀 ---- */
.rp-head{display:flex;align-items:baseline;gap:10px;margin:0 0 8px}
.rp-head h3{font-size:16px;font-weight:700}
.rp-head .meta{font-size:12px;color:var(--ink-soft);margin-left:auto}
.tbl{width:100%;border-collapse:collapse;font-size:13px}
.tbl th{font-size:12px;font-weight:700;color:var(--ink-soft);text-align:right;padding:5px 8px;border-bottom:1px solid var(--line-strong)}
.tbl th:first-child,.tbl td:first-child,.tbl th:nth-child(2){text-align:left}
.tbl td{padding:7px 8px;border-bottom:1px solid var(--line);text-align:right;font-family:var(--font-num);font-variant-numeric:tabular-nums}
.tbl td.txt{text-align:left;font-family:var(--font)}
.tbl tr.cur td{background:var(--trace-soft)}
.tbl tr.cur td:first-child{box-shadow:inset 3px 0 0 var(--trace)}
.defl{display:grid;grid-template-columns:1fr auto auto;gap:0 12px;font-size:13px}
.defl>div{display:contents}
.defl dt,.defl dd{padding:6px 0;border-bottom:1px solid var(--line);margin:0}
.defl dt{color:var(--ink-soft)}
.defl dd.v{font-family:var(--font-num);font-variant-numeric:tabular-nums;font-weight:700;text-align:right}
.defl dd.u{font-size:12px;color:var(--ink-soft);min-width:110px}
.defl .hi dd.v{color:var(--ok-text)}
.flag{display:flex;gap:10px;align-items:flex-start;padding:7px 10px;border-left:3px solid var(--ok-mark);font-size:13px}
.flag.caution{border-left-color:var(--caution-mark);background:var(--caution-soft)}
.flag.danger{border-left-color:var(--danger-mark);background:var(--danger-soft)}
.flag b{font-weight:700}
.acc{border:1px solid var(--line);border-radius:var(--r-lg);background:var(--surface);padding:9px 12px;font-size:13px;display:flex;justify-content:space-between;align-items:center;color:var(--ink)}
.acc span{color:var(--ink-soft);font-size:12px}

/* ---- AUC 目標帶尺（v2） ---- */
.gauge2{position:relative;height:88px;margin:0 8px}
.gauge2 .g-track{position:absolute;left:0;right:0;top:34px;height:22px;background:#E9ECE6;border-radius:6px}
.gauge2 .g-band{position:absolute;top:34px;height:22px;background:var(--ok-soft);border:1.5px solid var(--ok-mark);border-radius:4px;box-sizing:border-box}
.gauge2 .g-band span{position:absolute;left:8px;top:1px;font-size:12px;font-weight:700;color:var(--ok-text);white-space:nowrap}
.gauge2 .g-mk{position:absolute;top:0;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center}
.gauge2 .g-mk b{font-family:var(--font-num);font-size:12px;font-weight:400;color:var(--ink-soft);line-height:16px;height:16px}
.gauge2 .g-mk i{width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:9px solid var(--ink-soft)}
.gauge2 .g-mk.cur b{font-size:15px;font-weight:700;color:var(--trace-strong)}
.gauge2 .g-mk.cur i{border-left-width:9px;border-right-width:9px;border-top:13px solid var(--trace-strong)}
.gauge2 .g-tgt{position:absolute;top:30px;width:2px;height:30px;background:var(--ink);transform:translateX(-1px)}
.gauge2 .g-tl{position:absolute;top:62px;transform:translateX(-50%);font-style:normal;font-size:12px;font-weight:700;color:var(--ink);white-space:nowrap}
.gauge2 .g-tk{position:absolute;top:62px;transform:translateX(-50%);font-style:normal;font-size:12px;color:var(--ink-soft);font-family:var(--font-num)}
.gauge2 .g-tk:first-of-type{transform:none}
/* ---- AUC 目標帶尺（舊） ---- */
.gauge{position:relative;height:58px;margin:4px 6px 0}
.gauge .g-track{position:absolute;left:0;right:0;top:20px;height:12px;background:#E9ECE6;border-radius:6px}
.gauge .g-band{position:absolute;top:20px;height:12px;background:var(--ok-soft);border:1.5px solid var(--ok-mark);border-radius:4px}
.gauge .g-band span{position:absolute;left:50%;top:-18px;transform:translateX(-50%);font-size:12px;font-weight:700;color:var(--ok-text);white-space:nowrap}
.gauge .g-tick{position:absolute;top:38px;transform:translateX(-50%);font-style:normal;font-size:12px;color:var(--ink-soft);font-family:var(--font-num)}
.gauge .g-mark{position:absolute;top:12px;transform:translateX(-50%);text-align:center}
.gauge .g-mark i{display:block;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid var(--ink);margin:0 auto}
.gauge .g-mark b{position:absolute;top:-17px;left:50%;transform:translateX(-50%);font-size:12px;font-weight:700;white-space:nowrap;font-family:var(--font-num)}
.gauge .g-mark.cur i{border-top-color:var(--trace-strong);border-left-width:9px;border-right-width:9px;border-top-width:12px}
.gauge .g-mark.cur b{font-size:14px;top:-22px;color:var(--trace-strong)}
.gauge .g-mark.alt i{border-top-color:var(--ink-soft);border-left-width:5px;border-right-width:5px;border-top-width:7px}
.gauge .g-mark.alt b{color:var(--ink-soft);font-weight:400}
.gauge .g-mark.tgt{top:15px}
.gauge .g-mark.tgt i{border-top:0;border-left:0;border-right:0;border-bottom:0;width:2px;height:18px;background:var(--ink);margin:0 auto}
.gauge .g-mark.tgt b{top:23px;font-weight:400;color:var(--ink-soft)}
.chart{display:block;background:var(--surface)}
.legend{display:flex;gap:16px;font-size:12px;color:var(--ink-soft);flex-wrap:wrap;margin:6px 0 0}
.legend span{display:inline-flex;align-items:center;gap:6px}
.lg-bar{width:12px;height:8px;background:var(--trace-strong);border-radius:2px;display:inline-block}
.lg-dot{width:10px;height:10px;background:var(--ink);border-radius:50%;display:inline-block}
.lg-dia{width:9px;height:9px;background:var(--caution-mark);transform:rotate(45deg);display:inline-block}
.lg-dash{width:16px;border-top:2px dashed var(--trace-strong);display:inline-block}
"""

# ---------------- 左：工作底稿（三張板共用，細節用 class 微調） ----------------
def worksheet(compact_dose=False, rail=False):
    doses = ''
    shown = DOSES if not compact_dose else DOSES
    hl = {6}   # 第 7 劑（現在）
    labels = ['10/17 21:06', '10/18 09:06', '10/18 21:06', '10/19 09:06', '10/19 21:06', '10/20 09:06', '10/20 21:06']
    for i, lab in enumerate(labels):
        doses += ('<div class="row%s"><span class="n">%d</span><div class="inp">2026/%s</div>'
                  '<div class="inp">1000<span class="u">mg</span></div><div class="inp">120<span class="u">min</span></div><span class="x">×</span></div>') % (
            ' hl' if i in hl else '', i + 1, lab)
    return f"""
<section class="ws-sec">
  <h2><span class="idx">01</span>病人與腎功能</h2>
  <div class="grid g3">
    <div class="fld"><label>年齡（歲）</label><div class="inp">55</div></div>
    <div class="fld"><label>生理性別</label><div class="inp sel">男</div></div>
    <div class="fld"><label>身高（cm）</label><div class="inp">168</div></div>
  </div>
  <div class="grid g2">
    <div class="fld"><label>實際體重 TBW（kg）</label><div class="inp">65</div></div>
    <div class="fld"><label>是否透析</label><div class="inp sel">否</div></div>
  </div>
  <div class="thead scr"><span></span><span>SCr 日期</span><span>SCr（mg/dL）</span><span></span></div>
  <div class="row scr"><span class="n">1</span><div class="inp">2026/10/16</div><div class="inp">1.1</div><span class="x">×</span></div>
  <div class="row scr"><span class="n">2</span><div class="inp">2026/10/20</div><div class="inp">0.95</div><span class="x">×</span></div>
  <div class="btn-row"><button class="btn">＋ 新增一筆 SCr</button></div>
</section>
<section class="ws-sec collapsed"><h2><span class="idx">02</span>感染／臨床脈絡<span class="sum">治療（經驗性）・穩定</span></h2></section>
<section class="ws-sec">
  <h2><span class="idx">03</span>給藥處方與紀錄</h2>
  <div class="grid g3">
    <div class="fld"><label>維持劑量（mg）</label><div class="inp">1000</div></div>
    <div class="fld"><label>給藥間隔 τ（小時）</label><div class="inp">12</div></div>
    <div class="fld"><label>輸注時間（分鐘）</label><div class="inp">120</div></div>
  </div>
  <div class="radio-grp"><div class="t">第一筆給藥是不是本療程第一劑？<span>有給藥紀錄時必選</span></div>
    <label><i class="on"></i>第一筆紀錄就是本療程第一劑</label>
    <label><i></i>之前已規則給藥（已達穩態），第一筆只是我登錄的起點</label></div>
  <div class="chk" style="margin:6px 0"><i></i>首劑為獨立 loading 劑量（劑量與維持劑量不同）</div>
  <div class="btn-row"><button class="btn primary">依上述處方自動展開給藥紀錄</button></div>
  <div class="thead"><span>#</span><span>給藥開始時間</span><span>劑量</span><span>輸注</span><span></span></div>
  {doses}
</section>
<section class="ws-sec">
  <h2><span class="idx">04</span>血中濃度量測（自由時點）</h2>
  <div class="thead lvl"><span>#</span><span>抽血時間</span><span>濃度</span><span></span></div>
  <div class="row lvl hl"><span class="n">1</span><div class="inp">2026/10/20 12:36</div><div class="inp">24.6<span class="u">µg/mL</span></div><span class="x">×</span></div>
  <div class="row-note" style="padding-left:28px">第 6 劑輸注結束後 1.5 小時（peak 附近）</div>
  <div class="row lvl"><span class="n">2</span><div class="inp">2026/10/20 21:01</div><div class="inp">11.8<span class="u">µg/mL</span></div><span class="x">×</span></div>
  <div class="row-note" style="padding-left:28px">第 7 劑給藥前 5 分鐘（trough）</div>
</section>
<section class="ws-sec">
  <h2><span class="idx">05</span>目標與情境設定</h2>
  <div class="grid g2">
    <div class="fld"><label>MIC 假設（µg/mL）</label><div class="inp">1</div></div>
    <div class="fld"><label>目標 AUC₂₄（mg·h/L）</label><div class="inp">500</div><div class="hint" style="margin:3px 0 0">對應 AUC/MIC ≈ 500</div></div>
  </div>
  <div class="fld"><label>候選給藥間隔</label>
    <div class="btn-row" style="margin:2px 0 0"><span class="chk"><i class="on"></i>q8h</span><span class="chk"><i class="on"></i>q12h</span><span class="chk"><i class="on"></i>q24h</span></div></div>
</section>
<section class="ws-sec collapsed"><h2><span class="idx">06</span>併用藥物與其他備註<span class="sum">未填</span></h2></section>
"""

def topbar(mobile_tabs=True):
    return """
<header class="top-bar">
  <h1>TDM 工作台</h1>
  <nav class="tabs" aria-label="藥物模組"><a class="on" href="#">Vancomycin</a><a href="#">Aminoglycoside</a><a href="#">Azole</a><a href="#">抗癲癇藥物</a></nav>
  <div class="id-strip"><span>病歷號 <b class="num">示範-001</b></span><span class="sep">｜</span><span class="num"><b>55</b> 歲・男・168 cm・65 kg</span><span class="sep">｜</span><span>CrCl <b class="num">80</b> mL/min</span><span class="sep">｜</span><span>非透析</span>
    <button class="btn">存為新收案</button><button class="btn">清空此頁</button></div>
</header>"""

def candidate_table(with_bars=False):
    rows = ''
    for tau, dose, inf, cmax, cmin, auc, kind, chip, note, cur in CAND:
        bar = ''
        if with_bars:
            pos = lambda v: v / 800 * 100
            bar = ('<td class="bar"><div class="mini"><i class="band" style="left:%.1f%%;width:%.1f%%"></i><i class="pt %s" style="left:%.1f%%"></i></div></td>' % (pos(400), pos(200), kind, pos(auc)))
        rows += ('<tr class="%s"><td class="txt"><b>%s</b>%s</td><td class="txt">%s ／ %s</td><td>%.1f</td><td>%.1f</td><td>%d</td>%s<td class="txt"><span class="chip %s">%s</span> <span style="color:var(--ink-soft);font-size:12px">%s</span></td></tr>' % (
            'cur' if cur else '', tau, ' <span class="chip info">現行</span>' if cur else '', dose, inf, cmax, cmin, auc, bar, kind, chip, note))
    head = '<tr><th>方案</th><th>劑量／輸注</th><th>Cmax,ss</th><th>Cmin,ss</th><th>AUC₂₄</th>%s<th style="text-align:left">評語</th></tr>' % ('<th>在目標帶的位置</th>' if with_bars else '')
    return '<div class="tblwrap"><table class="tbl">%s%s</table></div>' % (head, rows)

def params_list(cols=1):
    items = ''
    for lab, v, u in PARAMS:
        items += '<div><dt>%s</dt><dd class="v">%s</dd><dd class="u">%s</dd></div>' % (lab, v, u)
    return '<dl class="defl" style="margin:0">%s</dl>' % items

def flags_html():
    return ('<div class="flag"><span class="chip ok">OK</span><span><b>未偵測到明顯的健全性疑慮。</b> 兩點濃度相距 8.4 小時（約 1.1 個半衰期），足以分辨消除斜率；SCr 穩定（1.1 → 0.95）。</span></div>')

def monitor_html():
    return """
<div class="grid g2" style="margin:0;gap:16px">
  <div><h4 style="font-size:13px;margin-bottom:4px">下次 TDM 時機</h4>
    <p style="font-size:13px">維持現行處方：穩定病人每週追蹤一次。若調整劑量，待新處方達穩態（約 4–5 個半衰期，現估 7.9 小時）後再抽一個 trough。</p></div>
  <div><h4 style="font-size:13px;margin-bottom:4px">重點監測</h4>
    <p style="font-size:13px">SCr 每 2–3 天至每週；尿量；腎功能變化、透析啟動、感染惡化時重新評估。</p></div>
</div>"""

SENTENCE = '目前處方 <b>1000 mg q12h</b>（輸注 120 分鐘）預測 AUC₂₄ <b class="num">457</b> mg·h/L，落在目標 400–600 內；Cmin <b class="num">11.7</b> µg/mL，低於 15 的關切線。'
FIT = '聯合擬合（2 點，相距 8.4 小時）・CL 4.38 L/hr・Vd 49.8 L・t½ 7.9 hr'


def gauge2(marks=None):
    """0–800 mg·h/L 水平尺：目標帶 400–600 在尺裡面標字；現行／候選的三角在尺上方；目標 500 是穿過尺的細線，標在下方。"""
    mx = 800
    pos = lambda v: v / mx * 100
    html = ['<div class="gauge2" role="img" aria-label="AUC₂₄ 與目標帶 400 到 600">', '<div class="g-track"></div>']
    html.append('<div class="g-band" style="left:%.2f%%;width:%.2f%%"><span>目標 400–600</span></div>' % (pos(400), pos(200)))
    for v, lab, kind in (marks or []):
        if kind == 'tgt':
            html.append('<div class="g-tgt" style="left:%.2f%%"></div><em class="g-tl" style="left:%.2f%%">%s</em>' % (pos(v), pos(v), lab))
        else:
            html.append('<div class="g-mk %s" style="left:%.2f%%"><b>%s</b><i></i></div>' % (kind, pos(v), lab))
    for v in (0, 200, 400, 600, 800):
        html.append('<em class="g-tk" style="left:%.2f%%">%d</em>' % (pos(v), v))
    html.append('</div>')
    return ''.join(html)

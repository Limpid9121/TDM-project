# -*- coding: utf-8 -*-
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from boards_common import *

OUT = r'C:\Users\Brandon Chen\OneDrive - 臺大醫院\AI測試區\TDM\docs\direction'
os.makedirs(OUT, exist_ok=True)

MOBILE_JS = """
<script>
document.querySelectorAll('.seg button').forEach(function(b){b.addEventListener('click',function(){
  document.body.classList.toggle('show-input', b.dataset.v==='in');
  document.querySelectorAll('.seg button').forEach(function(x){x.setAttribute('aria-pressed', x===b ? 'true':'false')});
});});
if(location.search.indexOf('full')>-1){document.documentElement.classList.add('full');}
document.querySelectorAll('.scroll-x').forEach(function(s){s.scrollLeft=s.scrollWidth;});
</script>"""

COMMON_RESP = r"""
.cap{background:#fff;border-bottom:1px solid var(--line);font-size:12px;color:var(--ink-soft);padding:5px 24px;display:flex;gap:16px}
.cap b{color:var(--ink)}
.seg{display:none}
.m-bar{display:none}
.only-m{display:none}
@media (max-width:980px){
  .top-bar{flex-wrap:wrap;gap:8px 16px;padding:8px 16px}
  .id-strip{margin-left:0;flex-wrap:wrap;gap:6px 12px;width:100%}
  .app{grid-template-columns:minmax(0,1fr)!important}
}
@media (max-width:640px){
  .cap{padding:5px 16px;flex-wrap:wrap;gap:2px 12px}
  .cap span{display:none}
  .top-bar{padding:8px 16px}
  .top-bar h1{font-size:16px}
  .tabs{overflow-x:auto;width:100%;order:3;margin:0 -16px;padding:0 16px;scrollbar-width:none}
  .tabs a{white-space:nowrap;min-height:44px}
  .id-strip{font-size:12px}
  .id-strip .btn{display:none}
  .seg{display:flex;gap:0;margin:12px 16px 0;border:1px solid var(--border-input);border-radius:var(--r-md);overflow:hidden;background:#fff}
  .seg button{flex:1;font:inherit;font-weight:700;font-size:14px;min-height:44px;border:0;background:#fff;color:var(--ink)}
  .seg button[aria-pressed="true"]{background:var(--trace);color:#fff}
  .only-d{display:none!important}
  .only-m{display:block}
  .m-bar{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:10;background:var(--bar);color:#fff;padding:10px 16px;align-items:center;gap:10px;box-shadow:0 -4px 14px rgba(0,0,0,.12)}
  .m-bar .num{font-size:20px;font-weight:700}
  .m-bar small{font-size:12px;color:var(--bar-soft)}
  .m-bar .btn{margin-left:auto;background:#fff;color:var(--bar);border-color:#fff;min-height:44px}
  body{padding-bottom:72px}
  .full .m-bar{position:static;box-shadow:none;margin-top:12px}
  .full body{padding-bottom:0}
  .inp{height:44px;font-size:16px}
  .btn{min-height:44px}
  /* 窄螢幕的目標帶尺：只留 0／400／800 刻度，隱藏候選三角的數字，避免和現行數字擠在一起 */
  .gauge2 .g-tk:nth-of-type(3),.gauge2 .g-tk:nth-of-type(5){display:none}
  .gauge2 .g-mk:not(.cur) b{display:none}
  .gauge2 .g-tl{top:62px}
  .gauge2 .g-tk{top:62px}
  .gauge2 .g-tk:nth-of-type(3){transform:translateX(-120%)}
  .tile h3 .meta,.rp-head .meta{display:none}
}
"""

def mbar():
    return ('<div class="m-bar"><span class="chip ok" style="background:#fff">✓ 達標</span><div><div class="num">AUC₂₄ 457</div>'
            '<small>目標 400–600 ・ Cmin 11.7</small></div><button class="btn">看結果</button></div>')

def seg():
    return '<div class="seg" role="group" aria-label="輸入或結果"><button data-v="in" aria-pressed="false">輸入</button><button data-v="out" aria-pressed="true">結果</button></div>'

def page(title, css, body):
    return ('<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            '<title>%s</title><style>%s</style></head><body>%s%s</body></html>') % (title, BASE_CSS + COMMON_RESP + css, body, MOBILE_JS)

def caption(letter, name, note):
    return '<div class="cap"><b>D1 方向板 %s・%s</b><span>%s</span><span>示範病例真實數字・靜態畫面</span></div>' % (letter, name, note)

# =========================================================== A：報告式 + 目標帶尺
def build_A():
    css = r"""
.app{max-width:1440px;margin:0 auto;padding:20px 24px 40px;display:grid;grid-template-columns:480px 1fr;gap:24px;align-items:start}
.panel{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:0}
.rp-sec{padding:16px 20px;border-top:1px solid var(--line)}
.rp-sec:first-child{border-top:0}
.verdict{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;align-items:center;background:linear-gradient(0deg,var(--ok-soft) 0,var(--ok-soft) 100%);border-bottom:1px solid var(--ok-mark);border-radius:var(--r-lg) var(--r-lg) 0 0;padding:16px 20px}
.verdict .big{font-size:22px;font-weight:700;color:var(--ok-text);display:flex;align-items:center;gap:8px;white-space:nowrap}
.verdict .big .mk{display:inline-grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--ok-mark);color:#fff;font-size:18px}
.verdict p{font-size:14px}
.verdict .fit{grid-column:1/-1;font-size:12px;color:var(--ink-soft)}
.kpis{display:flex;flex-wrap:wrap;gap:8px 28px;margin:12px 0 0}
.kpi .l{font-size:12px;color:var(--ink-soft)}
.kpi .v{font-family:var(--font-num);font-variant-numeric:tabular-nums;font-size:28px;font-weight:700;line-height:1.1}
.kpi .v small{font-size:12px;font-weight:400;color:var(--ink-soft);margin-left:3px}
.kpi.ok .v{color:var(--ok-text)}
.scalebox{padding:14px 20px 4px;border-bottom:1px solid var(--line)}
.scalebox .cap2{font-size:12px;color:var(--ink-soft);margin-top:2px;padding-bottom:12px}
.mini{position:relative;height:12px;background:#E9ECE6;border-radius:6px;min-width:120px}
.mini .band{position:absolute;top:0;height:12px;background:var(--ok-soft);border:1.5px solid var(--ok-mark);border-radius:4px;box-sizing:border-box}
.mini .pt{position:absolute;top:-3px;width:4px;height:18px;border-radius:2px;background:var(--ink);transform:translateX(-50%)}
.tbl td.bar{width:150px}
.chart-wrap{padding:4px 0 0}
.d-chart{display:block}.m-chart{display:none}
@media (max-width:980px){.app{grid-template-columns:1fr;padding:16px}}
@media (max-width:640px){
  .app{padding:12px 16px 24px;gap:12px}
  .left{display:none}
  body.show-input .left{display:block}
  body.show-input .right{display:none}
  .verdict{grid-template-columns:1fr;padding:14px 16px}
  .verdict .big{font-size:20px}
  .kpis{display:grid;grid-template-columns:1fr 1fr;gap:10px 18px}.kpi .v{font-size:24px}
  .rp-sec{padding:14px 16px}
  .scalebox{padding:14px 16px 4px}
  .d-chart{display:none}.m-chart{display:block}
  .tbl{font-size:12px}.tbl th,.tbl td{padding:6px 4px}
  .tbl .hide-m{display:none}
  .defl{grid-template-columns:1fr auto}
  .defl dd.u{display:none}
}
"""
    verdict = f"""
<div class="verdict">
  <div class="big"><span class="mk" aria-hidden="true">✓</span>達標</div>
  <p>{SENTENCE}</p>
  <div class="kpis" style="grid-column:1/-1"><div class="kpi ok"><div class="l">預測 AUC₂₄,ss</div><div class="v">457<small>mg·h/L</small></div></div><div class="kpi"><div class="l">Cmin,ss</div><div class="v">11.7<small>µg/mL</small></div></div><div class="kpi"><div class="l">Cmax,ss</div><div class="v">28.2<small>µg/mL</small></div></div><div class="kpi"><div class="l">近 24h 實際 AUC</div><div class="v">455<small>mg·h/L</small></div></div></div>
  <div class="fit">{FIT}</div>
</div>
<div class="scalebox">
  {gauge(marks=[(457,'457','cur'),(500,'目標 500','tgt'),(514,'514','alt')])}
  <div class="cap2">▼ 現行處方 457　▼ 灰：q8h、q24h 候選（514）　｜ 細線＝目標 500</div>
</div>"""
    cand = '<div class="rp-sec"><div class="rp-head"><h3>候選方案</h3><span class="meta">勾選一列＝在曲線上疊加預測</span></div>%s</div>' % candidate_table(with_bars=True).replace('<th>在目標帶的位置</th>', '<th class="hide-m">在目標帶的位置</th>').replace('<td class="bar">', '<td class="bar hide-m">')
    cht = ('<div class="rp-sec"><div class="rp-head"><h3>濃度曲線與時間軸</h3><span class="meta">給藥、抽血、SCr 在同一條時間軸上</span></div>'
           '<div class="chart-wrap"><div class="d-chart">%s</div><div class="m-chart">%s</div></div>'
           '<div class="legend"><span><i class="lg-bar"></i>給藥（寬度＝輸注時間）</span><span><i class="lg-dot"></i>抽血濃度</span><span><i class="lg-dia"></i>SCr</span><span><i class="lg-dash"></i>預測</span></div></div>') % (
        chart(848, 330, big_labels=True), chart(358, 300, lane_h=20, big_labels=False))
    par = '<div class="rp-sec"><div class="rp-head"><h3>參數</h3><span class="meta">聯合擬合（2 點）</span></div>%s</div>' % params_list()
    notes = '<div class="rp-sec"><div class="rp-head"><h3>注意事項</h3></div>%s</div><div class="rp-sec"><div class="rp-head"><h3>監測建議</h3></div>%s</div>' % (flags_html(), monitor_html())
    ai = '<div class="rp-sec"><div class="acc"><b>AI 諮詢 Prompt</b><span>整合 lab 趨勢與病程後的第二意見 ▸ 展開</span></div></div>'
    body = (caption('A', '報告式＋目標帶尺', '右區像一份判讀報告：先結論與目標帶尺，再方案、曲線、參數') + topbar() + seg() +
            '<main class="app"><div class="left">%s</div><div class="right"><div class="panel">%s%s%s%s%s%s</div></div></main>' % (
                worksheet(), verdict, cand, cht, par, notes, ai) + mbar())
    return page('方向板 A', css, body)

# =========================================================== B：時間軸主導
def build_B():
    css = r"""
.band{max-width:1440px;margin:16px auto 0;padding:0 24px}
.band-in{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg)}
.band-top{display:flex;align-items:center;gap:16px;padding:12px 20px;border-bottom:1px solid var(--line);flex-wrap:wrap}
.band-top .big{font-size:18px;font-weight:700;color:var(--ok-text);display:flex;align-items:center;gap:8px;white-space:nowrap}
.band-top .big .mk{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--ok-mark);color:#fff;font-size:16px}
.band-top p{font-size:14px;flex:1;min-width:280px}
.band-top .kp{display:flex;gap:22px}
.band-top .kp div{font-size:12px;color:var(--ink-soft)}
.band-top .kp b{display:block;font-family:var(--font-num);font-size:22px;color:var(--ink);line-height:1.1}
.band-chart{padding:6px 20px 0}
.callout{display:flex;gap:10px;align-items:center;margin:6px 20px 12px;padding:8px 12px;background:var(--trace-soft);border-radius:var(--r-md);font-size:13px;color:var(--trace-strong)}
.callout b{font-weight:700}
.callout .btn{margin-left:auto;background:#fff}
.app{max-width:1440px;margin:0 auto;padding:16px 24px 40px;display:grid;grid-template-columns:480px 1fr;gap:24px;align-items:start}
.panel{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg)}
.rp-sec{padding:16px 20px;border-top:1px solid var(--line)}
.rp-sec:first-child{border-top:0}
.mini{position:relative;height:12px;background:#E9ECE6;border-radius:6px;min-width:120px}
.mini .band{position:absolute;top:0;height:12px;background:var(--ok-soft);border:1.5px solid var(--ok-mark);border-radius:4px;box-sizing:border-box}
.mini .pt{position:absolute;top:-3px;width:4px;height:18px;border-radius:2px;background:var(--ink);transform:translateX(-50%)}
.tbl td.bar{width:150px}
.scroll-x{overflow-x:auto}
.d-chart{display:block}.m-chart{display:none}
.gwrap{padding:14px 20px 0;border-bottom:1px solid var(--line)}
@media (max-width:980px){.app{grid-template-columns:1fr;padding:16px}.band{padding:0 16px}}
@media (max-width:640px){
  .band{padding:0 16px;margin-top:12px}
  .band-top{padding:12px 16px;gap:8px 14px}
  .band-top p{min-width:100%;font-size:13px}
  .band-top .kp b{font-size:20px}
  .band-chart{padding:6px 12px 0}
  .callout{margin:6px 12px 12px;flex-wrap:wrap}
  .callout .btn{margin-left:0}
  .d-chart{display:none}.m-chart{display:block}
  .app{padding:12px 16px 24px;gap:12px}
  .left{display:none}
  body.show-input .left{display:block}
  body.show-input .right{display:none}
  .rp-sec{padding:14px 16px}
  .tbl{font-size:12px}.tbl th,.tbl td{padding:6px 4px}
  .tbl .hide-m{display:none}
  .gwrap{padding:14px 16px 0}
  .defl{grid-template-columns:1fr auto}.defl dd.u{display:none}
}
"""
    top = f"""
<section class="band" aria-label="共用時間軸"><div class="band-in">
  <div class="band-top">
    <div class="big"><span class="mk" aria-hidden="true">✓</span>達標</div>
    <p>{SENTENCE}</p>
    <div class="kp"><div>AUC₂₄<b>457</b></div><div>Cmin<b>11.7</b></div><div>Cmax<b>28.2</b></div></div>
  </div>
  <div class="band-chart">
    <div class="d-chart">{chart(1380, 300, lane_h=22, big_labels=True, pad_l=46)}</div>
    <div class="m-chart scroll-x"><div style="width:720px">{chart(720, 300, lane_h=22, big_labels=True, pad_l=46)}</div></div>
  </div>
  <div class="callout"><span class="only-d">已選取：</span><b>第 7 劑 10/20 21:06　1000 mg ／ 120 分</b><span>→ 左側第 3 段第 7 列已標亮；點時間軸上任何一筆，左邊對應那一列就會捲到並標亮</span><button class="btn">跳到該列</button></div>
  <div class="legend" style="padding:0 20px 12px"><span><i class="lg-bar"></i>給藥（寬度＝輸注時間）</span><span><i class="lg-dot"></i>抽血濃度</span><span><i class="lg-dia"></i>SCr</span><span><i class="lg-dash"></i>預測</span><span style="margin-left:auto">← 左右滑動可看更早的紀錄</span></div>
</div></section>"""
    gz = '<div class="gwrap">%s</div>' % gauge(marks=[(457, '457', 'cur'), (500, '目標 500', 'tgt'), (514, '514', 'alt')])
    cand = '<div class="rp-sec"><div class="rp-head"><h3>候選方案</h3><span class="meta">選一列＝時間軸上疊加預測</span></div>%s</div>' % candidate_table(with_bars=False)
    par = '<div class="rp-sec"><div class="rp-head"><h3>參數</h3><span class="meta">%s</span></div>%s</div>' % ('聯合擬合（2 點）', params_list())
    notes = '<div class="rp-sec"><div class="rp-head"><h3>注意事項</h3></div>%s</div><div class="rp-sec"><div class="rp-head"><h3>監測建議</h3></div>%s</div>' % (flags_html(), monitor_html())
    ai = '<div class="rp-sec"><div class="acc"><b>AI 諮詢 Prompt</b><span>整合 lab 趨勢與病程後的第二意見 ▸ 展開</span></div></div>'
    ws = worksheet().replace('<div class="row hl"><span class="n">7</span>', '<div class="row hl"><span class="n">7</span>')
    body = (caption('B', '時間軸主導', '曲線與事件合成一條全寬時間軸，放在最上面；下面仍是左填右看') + topbar() + seg() + top +
            '<main class="app"><div class="left">%s</div><div class="right"><div class="panel">%s%s%s%s%s</div></div></main>' % (ws, gz, cand, par, notes, ai) + mbar())
    return page('方向板 B', css, body)

# =========================================================== C：儀表板
def build_C():
    css = r"""
.app{max-width:1440px;margin:0 auto;padding:16px 24px 40px;display:grid;grid-template-columns:480px 1fr;gap:24px;align-items:start}
.rail{display:flex;align-items:center;gap:6px;flex-wrap:wrap;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:8px 12px;margin-bottom:14px;font-size:12px}
.rail .st{display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border-radius:var(--r-sm);background:var(--ok-soft);color:var(--ok-text);font-weight:700}
.rail .st::before{content:"✓"}
.rail .done{margin-left:auto;font-weight:700;color:var(--ok-text)}
.dash{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.tile{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:14px 16px;min-width:0}
.tile.w2{grid-column:1/-1}
.tile h3{font-size:14px;font-weight:700;margin-bottom:8px;display:flex;gap:8px;align-items:baseline}
.tile h3 .meta{margin-left:auto;font-size:12px;font-weight:400;color:var(--ink-soft)}
.tile.verdict{background:var(--ok-soft);border-color:var(--ok-mark)}
.vtop{display:flex;gap:18px;align-items:center;flex-wrap:wrap}
.vtop .big{font-size:24px;font-weight:700;color:var(--ok-text);display:flex;align-items:center;gap:8px;white-space:nowrap}
.vtop .big .mk{display:inline-grid;place-items:center;width:32px;height:32px;border-radius:50%;background:var(--ok-mark);color:#fff;font-size:19px}
.vtop p{flex:1;min-width:260px;font-size:14px}
.kp3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px}
.kp3 div{background:rgba(255,255,255,.7);border-radius:var(--r-md);padding:8px 12px}
.kp3 span{font-size:12px;color:var(--ink-soft)}
.kp3 b{display:block;font-family:var(--font-num);font-size:26px;line-height:1.15}
.kp3 small{font-size:12px;color:var(--ink-soft);font-weight:400;margin-left:2px}
.vgauge{padding:10px 6px 0}
.cmp{display:grid;grid-template-columns:130px 1fr auto;gap:8px 14px;align-items:center}
.cmp .lab{font-size:13px}.cmp .lab b{display:block;font-size:14px}
.cmp .lab span{font-size:12px;color:var(--ink-soft)}
.cmp .track{position:relative;height:22px;background:#E9ECE6;border-radius:6px}
.cmp .track .band{position:absolute;top:0;height:22px;background:var(--ok-soft);border:1.5px solid var(--ok-mark);border-radius:4px;box-sizing:border-box}
.cmp .track .fill{position:absolute;left:0;top:5px;height:12px;border-radius:0 6px 6px 0;background:var(--trace)}
.cmp .track .fill.caution{background:var(--caution-mark)}
.cmp .track .val{position:absolute;top:2px;font-family:var(--font-num);font-size:13px;font-weight:700;color:var(--ink);transform:translateX(6px)}
.cmp .lab.cur-row b::after{content:"　現行";font-size:12px;color:var(--trace-strong);font-weight:700}
.cmp .ax{grid-column:2;display:flex;justify-content:space-between;font-size:12px;color:var(--ink-soft);font-family:var(--font-num);margin-top:-4px}
.cmp .right{text-align:right;white-space:nowrap}
.cmp .right small{display:block;font-size:12px;color:var(--ink-soft);font-family:var(--font-num)}
.ssbar{position:relative;height:16px;background:#E9ECE6;border-radius:8px;margin:30px 4px 22px}
.ssbar .fill{position:absolute;left:0;top:0;height:16px;width:80%;background:var(--trace-soft);border-radius:8px;border:1.5px solid var(--trace)}
.ssbar .tk{position:absolute;top:-4px;width:2px;height:24px;background:var(--trace-strong)}
.ssbar .tk span{position:absolute;top:-17px;left:50%;transform:translateX(-50%);font-size:12px;color:var(--ink-soft);white-space:nowrap;font-family:var(--font-num)}
.ssbar .tk em{position:absolute;top:26px;left:50%;transform:translateX(-50%);font-size:12px;font-style:normal;color:var(--trace-strong);font-weight:700;white-space:nowrap}
.d-chart{display:block}.m-chart{display:none}
@media (max-width:980px){.app{grid-template-columns:1fr;padding:16px}}
@media (max-width:640px){
  .app{padding:12px 16px 24px;gap:12px}
  .left{display:none}
  body.show-input .left{display:block}
  body.show-input .right{display:none}
  .dash{grid-template-columns:1fr}
  .tile{padding:14px}
  .vtop .big{font-size:20px}
  .vtop p{min-width:100%;font-size:13px}
  .kp3 b{font-size:22px}
  .cmp{grid-template-columns:96px 1fr}
  .cmp .right{grid-column:1/-1;text-align:left;margin:-4px 0 6px;display:flex;gap:10px;align-items:center}
  .cmp .right small{display:inline}
  .cmp .ax{grid-column:2}
  .d-chart{display:none}.m-chart{display:block}
  .defl{grid-template-columns:1fr auto}.defl dd.u{display:none}
  .rail{font-size:12px}
}
"""
    kp = lambda l, v, u: '<div><span>%s</span><b>%s<small>%s</small></b></div>' % (l, v, u)
    verdict = f"""
<div class="tile w2 verdict">
  <div class="vtop"><div class="big"><span class="mk" aria-hidden="true">✓</span>達標</div><p>{SENTENCE}</p></div>
  <div class="kp3">{kp('預測 AUC₂₄', '457', 'mg·h/L')}{kp('Cmin,ss', '11.7', 'µg/mL')}{kp('Cmax,ss', '28.2', 'µg/mL')}</div>
  <div class="vgauge">{gauge(marks=[(457, '457', 'cur'), (500, '目標 500', 'tgt')])}</div>
  <div style="font-size:12px;color:var(--ink-soft);margin-top:4px">{FIT}</div>
</div>"""
    def cmp_row(tau, dose, inf, cmax, cmin, auc, kind, chip, cur):
        pos = lambda v: v / 800 * 100
        return ('<div class="lab %s"><b>%s</b><span>%s ／ %s</span></div>'
                '<div class="track"><i class="band" style="left:%.1f%%;width:%.1f%%"></i><i class="fill %s" style="width:%.1f%%"></i><span class="val" style="left:%.1f%%">%d</span></div>'
                '<div class="right"><span class="chip %s">%s</span><small>Cmax %.1f ・ Cmin %.1f</small></div>') % (
            'cur-row' if cur else '', tau, dose, inf, pos(400), pos(200), kind, pos(auc), pos(auc), auc, kind, chip, cmax, cmin)
    rows = ''.join(cmp_row(t, d, i, cx, cn, a, k, c, cur) for t, d, i, cx, cn, a, k, c, n, cur in CAND)
    # 將「現行」標記放在列首：重寫外層
    rows = rows.replace('class="lab cur-row"', 'class="lab cur-row"')
    cmpt = f"""
<div class="tile w2"><h3>候選方案比較<span class="meta">同一把尺：AUC₂₄ 0–800，綠框＝目標 400–600</span></h3>
  <div class="cmp">{rows}<div class="ax"><span>0</span><span>200</span><span>400</span><span>600</span><span>800</span></div></div>
</div>"""
    cht = f"""
<div class="tile w2"><h3>濃度曲線與時間軸<span class="meta">給藥・抽血・SCr 共用同一條時間軸</span></h3>
  <div class="d-chart">{chart(824, 320, big_labels=True)}</div><div class="m-chart">{chart(330, 300, lane_h=20)}</div>
  <div class="legend"><span><i class="lg-bar"></i>給藥</span><span><i class="lg-dot"></i>抽血</span><span><i class="lg-dia"></i>SCr</span><span><i class="lg-dash"></i>預測</span></div>
</div>"""
    par = '<div class="tile"><h3>參數<span class="meta">聯合擬合</span></h3>%s</div>' % params_list()
    nxt = f"""
<div class="tile"><h3>下次抽血<span class="meta">維持現行處方</span></h3>
  <p style="font-size:13px">穩定病人每週追蹤一次。若調整劑量，待新處方達穩態再抽 trough：</p>
  <div class="ssbar"><div class="fill"></div>
    <div class="tk" style="left:19.8%"><span>1×t½</span></div><div class="tk" style="left:39.5%"><span>2×</span></div><div class="tk" style="left:59.3%"><span>3×</span></div><div class="tk" style="left:79%"><span>4×</span><em>≈ 32 小時</em></div><div class="tk" style="left:98.8%"><span>5×</span></div></div>
  <p style="font-size:12px;color:var(--ink-soft)">時間尺以 t½ 7.9 小時換算；穩態約 4–5 個半衰期。</p>
  <h4 style="font-size:13px;margin:10px 0 4px">重點監測</h4><p style="font-size:13px">SCr 每 2–3 天至每週；尿量；腎功能變化、透析啟動、感染惡化時重新評估。</p>
</div>"""
    notes = '<div class="tile w2"><h3>注意事項</h3>%s</div>' % flags_html()
    ai = '<div class="tile w2" style="padding:10px 12px"><div class="acc" style="border:0;padding:0"><b>AI 諮詢 Prompt</b><span>整合 lab 趨勢與病程後的第二意見 ▸ 展開</span></div></div>'
    rail = ('<div class="rail"><b>輸入完成度</b><span class="st">病人與 SCr</span><span class="st">處方與給藥</span><span class="st">第一劑選項</span><span class="st">濃度 2 筆</span><span class="st">目標</span><span class="done">可計算</span></div>')
    body = (caption('C', '儀表板', '右區是一塊塊儀表板：方案用同一把尺比較，下次抽血用半衰期尺；左邊多一條輸入完成度') + topbar() + seg() +
            '<main class="app"><div class="left">%s%s</div><div class="right"><div class="dash">%s%s%s%s%s%s%s</div></div></main>' % (rail, worksheet(), verdict, cmpt, cht, par, nxt, notes, ai) + mbar())
    return page('方向板 C', css, body)

for name, fn in (('A', build_A), ('B', build_B), ('C', build_C)):
    with open(os.path.join(OUT, name + '.html'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(fn())
    print('wrote', name)

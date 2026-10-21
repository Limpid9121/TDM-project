# -*- coding: utf-8 -*-
# C3 左欄收合（Brandon 2026-10-21：改某幾個數字時不用整頁捲動）
#   1. 每段可收合，收起來時標題列顯示摘要（不用打開就知道填了什麼）
#   2. 左欄頂端固定一條段落列：01–06 跳轉（只展開該段）＋全部收合／全部展開
#   3. 給藥紀錄只顯示最近 3 筆，較早的收成一行
import re, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import boards2 as B

SUMS = {
    '01': '55 歲・男・168 cm・65 kg・非透析・SCr 0.95（10/20）',
    '02': '治療（經驗性）・穩定',
    '03': '1000 mg q12h・輸注 120 分・給藥 7 筆（最後 10/20 21:06）',
    '04': '2 筆：24.6（10/20 12:36）、11.8（10/20 21:01）',
    '05': 'MIC 1・目標 AUC₂₄ 500・候選 q8h／q12h／q24h',
    '06': '未填',
}
BODY_02 = """<div class="grid g2"><div class="fld"><label>適應症</label><div class="inp sel">治療（經驗性）</div></div><div class="fld"><label>嚴重度</label><div class="inp sel">穩定</div></div></div>
<div class="grid g2"><div class="fld"><label>感染部位</label><div class="inp" style="color:var(--ink-soft)">如：菌血症、肺炎…</div></div><div class="fld"><label>菌種／MIC</label><div class="inp" style="color:var(--ink-soft)">如：MRSA</div></div></div>"""
BODY_06 = """<div class="fld"><label>腎毒性／交互作用相關併用藥物</label><div class="inp" style="height:44px;color:var(--ink-soft)">如：piperacillin-tazobactam、NSAID…</div></div>"""

CSS = r"""
.ws-bar{position:sticky;top:51px;z-index:5;background:var(--bg);display:flex;align-items:center;gap:6px;padding:8px 0 10px;margin-top:-4px;border-bottom:1px solid var(--line)}
.ws-bar .jump{font-family:var(--font-num);font-size:12px;font-weight:700;min-width:34px;height:28px;border:1.5px solid var(--navy);border-radius:3px;background:#fff;color:var(--navy);cursor:pointer}
.ws-bar .jump.open{background:var(--navy);color:#fff}
.ws-bar .sp{flex:1}
.ws-bar .btn{min-height:28px;padding:3px 10px}
.ws-sec h2{margin-bottom:0}
.ws-tg{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;cursor:pointer;font-size:15px;font-weight:700;padding:2px 0}
.ws-tg:focus-visible{outline:2px solid var(--navy);outline-offset:2px}
.ws-tg .sum{margin-left:12px;font-size:13px;font-weight:400;color:var(--ink-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0;display:none}
.ws-tg .chev{margin-left:auto;color:var(--ink-soft);font-size:12px;transition:transform 180ms ease}
.ws-sec.closed .ws-tg .sum{display:block}
.ws-sec.closed .ws-tg .chev{transform:rotate(-90deg)}
.ws-sec.closed .ws-body{display:none}
.ws-sec.closed{padding:9px 0}
.ws-body{padding-top:8px}
.ws-sec.flash{animation:flash 1.2s ease}
@keyframes flash{0%{background:var(--navy-tint)}100%{background:transparent}}
.older{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--navy);padding:6px 0 6px 28px;cursor:pointer;border-bottom:1px dashed var(--line)}
.older b{font-weight:700}
.dose-old{display:none}
.show-old .dose-old{display:grid}
.show-old .older{display:none}
@media (prefers-reduced-motion:reduce){.ws-tg .chev{transition:none}.ws-sec.flash{animation:none}}
@media (max-width:640px){.ws-bar{top:0}}
"""

JS = r"""
<script>
(function(){
  function setOpen(sec, open){ sec.classList.toggle('closed', !open); sec.querySelector('.ws-tg').setAttribute('aria-expanded', open?'true':'false');
    var j=document.querySelector('.ws-bar .jump[data-s="'+sec.dataset.s+'"]'); if(j) j.classList.toggle('open', open); }
  var secs=[].slice.call(document.querySelectorAll('.ws-sec[data-s]'));
  secs.forEach(function(s){ s.querySelector('.ws-tg').addEventListener('click', function(){ setOpen(s, s.classList.contains('closed')); }); });
  document.querySelectorAll('.ws-bar .jump').forEach(function(b){ b.addEventListener('click', function(){
    secs.forEach(function(s){ setOpen(s, s.dataset.s===b.dataset.s); });
    var t=document.querySelector('.ws-sec[data-s="'+b.dataset.s+'"]'); t.scrollIntoView({block:'start'}); window.scrollBy(0,-100);
    t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash'); }); });
  document.querySelector('.ws-bar [data-all="close"]').addEventListener('click', function(){ secs.forEach(function(s){ setOpen(s,false); }); });
  document.querySelector('.ws-bar [data-all="open"]').addEventListener('click', function(){ secs.forEach(function(s){ setOpen(s,true); }); });
  var o=document.querySelector('.older'); if(o) o.addEventListener('click', function(){ o.parentNode.classList.add('show-old'); });
  // 預覽用：?open=04 只展開 04；?open=none 全部收合
  var m=location.search.match(/open=([\w,]+)/);
  if(m){ var keep=m[1]==='none'?[]:m[1].split(','); secs.forEach(function(s){ setOpen(s, keep.indexOf(s.dataset.s)>-1); }); }
})();
</script>"""

def worksheet():
    html = B.worksheet()
    # 給藥紀錄：前 4 筆收起來
    rows = re.findall(r'<div class="row"><span class="n">\d</span>.*?</div>\n?', html)
    # B.worksheet 的給藥列是連在一起的字串；改成較早 4 筆加 class
    def older(mm):
        n = int(mm.group(1))
        return '<div class="row dose-old"><span class="n">%d</span>' % n if n <= 4 else mm.group(0)
    html = re.sub(r'<div class="row"><span class="n">(\d)</span>', older, html)
    first_new = html.index('<div class="row"><span class="n">5</span>')
    html = html[:first_new] + '<div class="older" role="button" tabindex="0">▸ <b>較早 4 筆</b>（10/17 21:06 – 10/19 09:06）已收起，點這裡展開</div>' + html[first_new:]
    # 每段改成可收合：標題變按鈕＋摘要＋箭頭，內容包進 ws-body
    out = []
    for m in re.finditer(r'<section class="ws-sec( collapsed)?"><h2><span class="idx">(\d\d)</span>([^<]+)(?:<span class="sum">[^<]*</span>)?</h2>(.*?)</section>', html, re.S):
        closed, num, title, body = m.group(1), m.group(2), m.group(3), m.group(4)
        if num == '02': body = BODY_02
        if num == '06': body = BODY_06
        cls = 'ws-sec' + (' closed' if closed else '')
        out.append('<section class="%s" data-s="%s"><h2><button type="button" class="ws-tg" aria-expanded="%s"><span class="idx">%s</span>%s'
                   '<span class="sum">%s</span><span class="chev" aria-hidden="true">▾</span></button></h2><div class="ws-body">%s</div></section>' % (
                       cls, num, 'false' if closed else 'true', num, title, SUMS[num], body))
    assert len(out) == 6, len(out)
    bar = ('<div class="ws-bar" role="toolbar" aria-label="段落">' + ''.join(
        '<button type="button" class="jump%s" data-s="%s" title="只展開 %s 並跳過去">%s</button>' % ('' if n in ('02', '06') else ' open', n, n, n)
        for n in ['01', '02', '03', '04', '05', '06']) +
        '<span class="sp"></span><button type="button" class="btn" data-all="close">全部收合</button><button type="button" class="btn" data-all="open">全部展開</button></div>')
    return bar + '\n'.join(out)

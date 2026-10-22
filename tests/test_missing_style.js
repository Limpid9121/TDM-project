// test_missing_style.js — 必填缺漏的標示：不用 outline（會被收合容器的 overflow:hidden 切掉左右邊，也會跟邊框疊成雙線）
//   · 欄位：紅邊框＋內縮 1 px 紅線（box-shadow inset）
//   · 空的必填表格（SCr／給藥／濃度）：一個紅色虛線框，裡面寫「請至少新增一筆」
// Run: node test_missing_style.js
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0;
const assert = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const css = html.slice(html.lastIndexOf('<style>'), html.lastIndexOf('</style>'));
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const lastRule = sel => {
  const re = new RegExp('(^|\\n)\\s*' + esc(sel) + '\\s*\\{([^}]*)\\}', 'g');
  let m, last = null;
  while ((m = re.exec(css))) last = m[2];
  return last;
};
const r1 = lastRule('.is-missing');
assert(r1 && /outline:\s*(0|none)/.test(r1), '最後生效的 .is-missing 不用 outline：' + r1);
assert(r1 && /inset 0 0 0 1px var\(--crimson\)/.test(r1), '.is-missing 用內縮紅線');
const r2 = lastRule('.entry-rows.is-missing');
assert(r2 && /dashed var\(--crimson\)/.test(r2) && /min-height/.test(r2), '空的必填表格是紅色虛線框：' + r2);
assert(/\.entry-rows\.is-missing:empty::before\s*\{[^}]*請至少新增一筆/.test(css), '空表格裡寫「請至少新增一筆」');
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);

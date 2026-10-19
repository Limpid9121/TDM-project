#!/usr/bin/env bash
# tools/run_checks.sh — 一次跑完所有檢查，最後印一張總表（2026-10-19 建立）
#
# 用法：bash tools/run_checks.sh            # 全部
#       bash tools/run_checks.sh --quick    # 只跑 jsdom 測試＋golden（本機 device_bash 有 120 秒限制時用）
#
# 檢查項目：
#   T  tests/test_*.js（含 golden 與獨立 PK 驗算 test_pk_reference.js）
#   E  換行字元：index.html 必須是 LF（CRLF 會讓 load_harness 的 ANCHOR 失配）
#   L  tests/ui_layout_check.py（需要 python playwright＋Chromium）
#   D  impeccable 偵測規則（設計品質；只記數量，施工驗收看「不增加」）
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export DO_NOT_TRACK=1 IMPECCABLE_NO_TELEMETRY=1
QUICK=0; [ "${1:-}" = "--quick" ] && QUICK=1
SUMMARY=()
FAILED=0

if grep -q $'\r' index.html; then
  SUMMARY+=("E  換行字元        FAIL（index.html 含 CRLF，先跑：sed -i 's/\r\$//' index.html）")
  FAILED=1
else
  SUMMARY+=("E  換行字元        OK（LF）")
fi

cd tests
for f in test_*.js; do
  out="$(timeout 300 node "$f" 2>&1 | grep -v 'Could not load link')"
  code=$?
  last="$(echo "$out" | grep -E 'passed|PASSED|FAIL' | tail -1)"
  if [ $code -ne 0 ] || echo "$out" | grep -q '^FAIL'; then FAILED=1; SUMMARY+=("T  $f  FAIL  $last"); else SUMMARY+=("T  $f  ${last:-OK}"); fi
  echo "$out" | grep '^INFO' || true
done
cd "$ROOT"

if [ $QUICK -eq 0 ]; then
  if python3 -c "import playwright" 2>/dev/null; then
    if timeout 300 python3 tests/ui_layout_check.py --out tests/shots/latest > /tmp/tdm_layout.txt 2>&1; then
      SUMMARY+=("L  版面檢查        OK（截圖 tests/shots/latest）")
    else
      FAILED=1; SUMMARY+=("L  版面檢查        FAIL（見 /tmp/tdm_layout.txt）")
    fi
  else
    SUMMARY+=("L  版面檢查        略過（沒有 playwright）")
  fi
  if command -v npx >/dev/null; then
    # detect 有發現項目時 exit 2，屬正常；只要 JSON 讀得到就算有跑
    timeout 240 npx -y impeccable@latest detect --json index.html > /tmp/tdm_detect.json 2>/dev/null
    n=$(python3 -c "import json,collections;d=json.load(open('/tmp/tdm_detect.json'));c=collections.Counter(x['antipattern'] for x in d);print(len(d),'項',dict(c))" 2>/dev/null || echo "無法執行")
    SUMMARY+=("D  設計偵測        $n")
  fi
fi

echo; echo "================ 總表 ================"
printf '%s\n' "${SUMMARY[@]}"
[ $FAILED -eq 0 ] && echo "結果：全部通過" || echo "結果：有項目失敗"
exit $FAILED

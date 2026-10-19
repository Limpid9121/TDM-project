#!/usr/bin/env bash
# tools/setup_env.sh — 重建 TDM 工具的開發環境（2026-10-19 建立）
#
# 用法（在 repo 根目錄）：  bash tools/setup_env.sh
# 雲端 session 每次都是新容器，開工先跑一次；本機跑過一次即可。
#
# 會做的事：
#   1. 安裝測試依賴（tests/ 的 jsdom）
#   2. 把下列第三方 skill 依固定版本裝進 .claude/skills/（已列入 .gitignore，不會推上 GitHub Pages）
#        impeccable（pbakaus/impeccable，Apache-2.0）——主力：既有介面審查、Operate 模式設計規則、61 條偵測規則
#        emil-design-eng / break-ui / mobile-native / review-animations（emilkowalski/skills，MIT）——動效、極端資料測版面、手機手感
#        ponytail（DietrichGebert/ponytail，MIT）——只取 skill 文字，不裝 hooks；管「改動要最小」
#   3. 關閉第三方工具的使用統計（DO_NOT_TRACK）
#   4. 檢查 Playwright（版面檢查用）是否可用，沒有就提示
#
# 刻意沒裝的（理由見 docs/REDESIGN_PLAN_v1.md「環境」一節）：taste-skill、oil-ui、ui-ux-pro-max、
# claude-mem、caveman、graphify 等。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export DO_NOT_TRACK=1 IMPECCABLE_NO_TELEMETRY=1

IMPECCABLE_SHA=0665bd812ae0908fcab17b96fd4f840defb882d9   # 2026-10-19
EMIL_SHA=2d228630ba1446365f614a108cb8252f1feda202         # 2026-10-11
PONYTAIL_SHA=09c434ab73ca43761c5d8b0c5d341926c2fba710     # 2026-10-18

echo "== 1/4 測試依賴 =="
if [ -d tests/node_modules/jsdom ]; then
  echo "jsdom 已安裝，略過"
else
  ( cd tests && npm ci --silent --no-audit --no-fund ) && echo "jsdom OK"
fi

echo "== 2/4 第三方 skill（固定版本）=="
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
fetch(){ # $1=owner/repo $2=sha $3=dir
  git init -q "$TMP/$3"
  git -C "$TMP/$3" fetch -q --depth 1 "https://github.com/$1" "$2"
  git -C "$TMP/$3" checkout -q FETCH_HEAD
}
fetch pbakaus/impeccable       "$IMPECCABLE_SHA" impeccable
fetch emilkowalski/skills      "$EMIL_SHA"       emil
fetch DietrichGebert/ponytail  "$PONYTAIL_SHA"   ponytail

DEST=".claude/skills"
mkdir -p "$DEST"
copy_skill(){ rm -rf "$DEST/$2"; cp -R "$1" "$DEST/$2"; echo "  + $2"; }
copy_skill "$TMP/impeccable/plugin/skills/impeccable"      impeccable
for s in emil-design-eng break-ui mobile-native review-animations; do
  copy_skill "$TMP/emil/skills/$s" "$s"
done
copy_skill "$TMP/ponytail/skills/ponytail"                 ponytail
cp "$TMP/impeccable/LICENSE" "$DEST/impeccable/LICENSE" 2>/dev/null || true
cat > "$DEST/SOURCES.txt" <<EOF
impeccable        https://github.com/pbakaus/impeccable @ $IMPECCABLE_SHA (Apache-2.0)
emilkowalski      https://github.com/emilkowalski/skills @ $EMIL_SHA (MIT)
ponytail          https://github.com/DietrichGebert/ponytail @ $PONYTAIL_SHA (MIT)
EOF
chmod +x "$DEST/impeccable/scripts/impeccable" 2>/dev/null || true

# 雲端容器裡的 Claude 也能直接讀到
if [ -d "$HOME/.claude" ] && [ -w "$HOME/.claude" ]; then
  mkdir -p "$HOME/.claude/skills"
  for s in impeccable emil-design-eng break-ui mobile-native review-animations ponytail; do
    rm -rf "$HOME/.claude/skills/$s"; cp -R "$DEST/$s" "$HOME/.claude/skills/$s"
  done
  echo "  （也複製到 $HOME/.claude/skills）"
fi

echo "== 3/4 impeccable 使用統計 =="
mkdir -p .impeccable
[ -f .impeccable/config.json ] || echo '{ "telemetry": false }' > .impeccable/config.json
echo "  .impeccable/config.json: telemetry=false"

echo "== 4/4 Playwright（真實瀏覽器版面檢查）=="
if python3 -c "import playwright" 2>/dev/null; then
  echo "  python playwright OK"
else
  echo "  沒有 python playwright：版面檢查（tests/ui_layout_check.py）請在雲端容器跑，或 pip install playwright && python3 -m playwright install chromium"
fi
echo "完成。下一步：bash tools/run_checks.sh"

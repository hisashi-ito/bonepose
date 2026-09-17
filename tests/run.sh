#!/usr/bin/env bash
# Runs the behaviour tests headlessly. Needs docker (uses the chromium inside minlag/mermaid-cli) or a local chromium.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 - <<'PY'
s = open("index.html").read(); t = open("tests/test.js").read()
open("tests/_page.html", "w").write(s.replace("</body>", "<script>\n" + t + "\n</script></body>"))
PY
if command -v chromium >/dev/null; then CHROME="chromium"; RUN="";
else RUN="docker run --rm -u $(id -u):$(id -g) -e HOME=/tmp -v $PWD:/data --entrypoint /usr/lib/chromium/chromium minlag/mermaid-cli"; fi
if [ -n "$RUN" ]; then URL=file:///data/tests/_page.html; else URL="file://$PWD/tests/_page.html"; fi
${RUN:-$CHROME} --headless --no-sandbox --disable-gpu --window-size=1400,900 --virtual-time-budget=8000 --dump-dom "$URL" 2>/dev/null \
  | python3 -c "import sys,re,html; d=sys.stdin.read(); m=re.search(r'<pre id=\"testout\">(.*?)</pre>', d, re.S); print(html.unescape(m.group(1)) if m else 'NO OUTPUT'); sys.exit(0 if m and 'fail=0' in m.group(1) else 1)"
rm -f tests/_page.html

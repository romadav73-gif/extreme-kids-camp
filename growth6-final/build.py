from __future__ import annotations

import base64
import gzip
import hashlib
import json
import pathlib
import re
import urllib.request

ROOT = pathlib.Path('.')
PINNED_COMMIT = 'c8f3e7a6a36a78fdf5599af81fae4bd2d3c16c81'
RAW = f'https://raw.githubusercontent.com/romadav73-gif/extreme-kids-camp/{PINNED_COMMIT}/growth5/'


def fetch_text(url: str) -> str:
    req = urllib.request.Request(url, headers={'User-Agent': 'EXTREME-KIDS-Growth-OS-Builder/6.0'})
    with urllib.request.urlopen(req, timeout=45) as response:
        if getattr(response, 'status', 200) != 200:
            raise RuntimeError(f'HTTP {response.status}: {url}')
        return response.read().decode('utf-8').strip()


def build() -> dict:
    encoded = ''.join(fetch_text(RAW + f'p{i}.b64') for i in range(7))
    html = gzip.decompress(base64.b64decode(encoded, validate=True)).decode('utf-8')
    source_sha = hashlib.sha256(html.encode()).hexdigest()

    required = [
        'function pageAnalytics', 'function pageArchive', 'function pageDashboard',
        'window.go=function', 'async function syncNow', 'mantledb.sh/v2/', 'const navOwner=',
    ]
    absent = [marker for marker in required if marker not in html]
    if absent:
        raise RuntimeError('The pinned application core is incomplete: ' + ', '.join(absent))

    html = re.sub(r'<title>.*?</title>', '<title>EXTREME KIDS · Growth OS 6.0</title>', html, count=1, flags=re.S)
    html = html.replace("const BUILD='2026.08.29-growth-os-5.3-black-gold-production';", "const BUILD='2026.08.30-growth-os-6.0-production';")
    html = html.replace("const BUILD='2026.08.29-growth-os-5.2-premium';", "const BUILD='2026.08.30-growth-os-6.0-production';")
    html = html.replace('<h1>Growth OS 5.2</h1>', '<h1>Growth OS <span>6.0</span></h1>')
    html = html.replace(
        '<div class="brand-copy"><b>Growth OS 5.2</b><span>Учебный год 2026/27</span></div>',
        '<div class="brand-copy"><b>Growth OS <span class="brand-version">6.0</span></b><span>Управление развитием клуба</span></div>',
    )
    html = html.replace(
        "$('#buildText').textContent='5.2 Premium · данные и архивы сохраняются автоматически';",
        "$('#buildText').textContent='Growth OS 6.0 · автосохранение и общая база';",
    )

    old_desktop = '`<button data-id="${n[0]}" onclick="go(\'${n[0]}\')"><span class="ico">${n[1]}</span>${n[2]}${n[0]===\'tasks\'?`<span class="badge">${roleTasks().filter(t=>t.status!==\'done\').length}</span>`:\'\'}</button>`'
    new_desktop = '`<button class="${UI.page===n[0]?\'active\':\'\'}" data-id="${n[0]}" onclick="go(\'${n[0]}\')"><span class="ico">${n[1]}</span>${n[2]}${n[0]===\'tasks\'?`<span class="badge">${roleTasks().filter(t=>t.status!==\'done\').length}</span>`:\'\'}</button>`'
    old_mobile = '`<button data-id="${x[0]}" onclick="go(\'${x[0]}\')">${x[1]}</button>`'
    new_mobile = '`<button class="${UI.page===x[0]?\'active\':\'\'}" data-id="${x[0]}" onclick="go(\'${x[0]}\')">${x[1]}</button>`'
    if old_desktop not in html or old_mobile not in html:
        raise RuntimeError('Navigation templates changed; refusing an unsafe patch')
    html = html.replace(old_desktop, new_desktop, 1).replace(old_mobile, new_mobile, 1)

    html = re.sub(r'\n?<script id="ek-no-green-runtime">.*?</script>\s*', '\n', html, flags=re.S)
    html = re.sub(r'\n?<script id="ek-growth-os-6-smoke-hook">.*?</script>\s*', '\n', html, flags=re.S)

    base_theme = (ROOT / 'growth5-v54/theme.css').read_text(encoding='utf-8')
    final_theme = (ROOT / 'growth6-final/theme-extra.css').read_text(encoding='utf-8')
    theme = '<style id="ek-growth-os-6-theme">\n' + base_theme + '\n' + final_theme + '\n</style>\n'
    if '</head>' not in html:
        raise RuntimeError('HTML head is malformed')
    html = html.replace('</head>', theme + '</head>', 1)

    expose = "window.EKGrowthOS={version:'6.0.0',navigate:id=>window.go(id),sync:()=>syncNow(),getState:()=>S,getPage:()=>UI.page,render:()=>renderPage(),diagnostics:()=>({role,page:UI.page,revision,updatedAt:S?.updatedAt||0,groups:S?.growth?.groups?.length||0,tasks:S?.tasks?.length||0,events:S?.events?.length||0})};\nboot();\n})();"
    if 'boot();\n})();' not in html:
        raise RuntimeError('Application bootstrap marker is missing')
    html = html.replace('boot();\n})();', expose, 1)

    smoke = (ROOT / 'growth6-final/smoke.js').read_text(encoding='utf-8')
    if '</body>' not in html:
        raise RuntimeError('HTML body is malformed')
    html = html.replace('</body>', '<script id="ek-growth-os-6-smoke-hook">\n' + smoke + '\n</script>\n</body>', 1)

    final_bytes = html.encode('utf-8')
    final_sha = hashlib.sha256(final_bytes).hexdigest()
    out = ROOT / 'growth6'
    out.mkdir(exist_ok=True)
    (out / 'index.html').write_bytes(final_bytes)

    report = {
        'version': '6.0.0', 'status': 'assembled', 'source_commit': PINNED_COMMIT,
        'source_sha256': source_sha, 'production_sha256': final_sha, 'bytes': len(final_bytes),
        'native_analytics': True, 'native_archive': True, 'navigation_patch': True,
        'theme': 'warm-black-yellow', 'minimum_font_px': 16,
    }
    (ROOT / 'growth6-test-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return report


if __name__ == '__main__':
    build()

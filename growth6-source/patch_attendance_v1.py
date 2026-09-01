#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS_PATH = ROOT / 'growth6-source' / 'attendance_v1.css'
JS_PATH = ROOT / 'growth6-source' / 'attendance_v1.js'
SOURCE_CANDIDATES = [
    ROOT / 'growth-os-6' / 'index.html',
    ROOT / 'growth-os' / 'index.html',
    ROOT / 'growth61-live' / 'index.html',
    ROOT / 'growth6-source' / 'v6.1.html',
]
OUTPUTS = [
    ROOT / 'growth6-source' / 'v6.2.html',
    ROOT / 'growth-os' / 'index.html',
    ROOT / 'growth-os-6' / 'index.html',
    ROOT / 'growth61-live' / 'index.html',
]
CSS_START = '/* ATTENDANCE_INTELLIGENCE_V1_START */'
CSS_END = '/* ATTENDANCE_INTELLIGENCE_V1_END */'
JS_START = '// ATTENDANCE_INTELLIGENCE_V1_START'
JS_END = '// ATTENDANCE_INTELLIGENCE_V1_END'
PAYROLL_MARKER = '// PAYROLL_TEAM_READABILITY_V1_END'
LISTENER_MARKER = "document.addEventListener('click',handleClick);"
FEATURE_BUILD = '2026.09.01-weekly-attendance-intelligence'


def choose_source() -> Path:
    for path in SOURCE_CANDIDATES:
        if not path.exists():
            continue
        text = path.read_text(encoding='utf-8')
        if "const VERSION='6.1.0'" in text and 'PAYROLL_TEAM_READABILITY_V1_END' in text:
            return path
    raise SystemExit('No Growth OS 6.1 payroll source found')


def strip_block(text: str, start: str, end: str) -> str:
    return re.sub(re.escape(start) + r'.*?' + re.escape(end) + r'\s*', '', text, flags=re.S)


def patch_html(html: str, css: str, js: str) -> str:
    html = strip_block(html, CSS_START, CSS_END)
    html = strip_block(html, JS_START, JS_END)

    if '</style>' not in html:
        raise SystemExit('Main style block not found')
    html = html.replace('</style>', '\n' + css.strip() + '\n</style>', 1)

    if PAYROLL_MARKER in html:
        html = html.replace(PAYROLL_MARKER, PAYROLL_MARKER + '\n\n' + js.strip(), 1)
    elif LISTENER_MARKER in html:
        html = html.replace(LISTENER_MARKER, js.strip() + '\n\n' + LISTENER_MARKER, 1)
    else:
        raise SystemExit('Application injection marker not found')

    # Visible version only. Keep VERSION and BUILD constants unchanged because the
    # production loader validates those compatibility markers before opening the app.
    html = html.replace('<title>EXTREME KIDS · Growth OS 6.1</title>', '<title>EXTREME KIDS · Growth OS 6.2 Attendance</title>')
    html = html.replace('Growth OS <span>6.1</span>', 'Growth OS <span>6.2</span>')
    html = html.replace('GROWTH OS <span>6.1</span>', 'GROWTH OS <span>6.2</span>')

    required = [
        "const VERSION='6.1.0'",
        "const BUILD='2026.08.31-payroll-team-readability'",
        'ATTENDANCE_INTELLIGENCE_V1_START',
        "function renderAttendance()",
        "label:'Посещаемость'",
        "function attendanceAggregate(",
        "function attendanceForecast(",
        "function attendanceReconcileTasks(",
        'МОЯ ЗАРПЛАТА ЗА МЕСЯЦ',
        'function renderPayroll()',
    ]
    missing = [marker for marker in required if marker not in html]
    if missing:
        raise SystemExit('Patched build is missing markers: ' + ', '.join(missing))
    return html


def main() -> None:
    source = choose_source()
    css = CSS_PATH.read_text(encoding='utf-8')
    js = JS_PATH.read_text(encoding='utf-8')
    html = patch_html(source.read_text(encoding='utf-8'), css, js)

    for path in OUTPUTS:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(html, encoding='utf-8')

    digest = hashlib.sha256(html.encode('utf-8')).hexdigest()
    metadata = {
        'compatibilityVersion': '6.1.0',
        'featureVersion': '6.2-attendance',
        'build': FEATURE_BUILD,
        'sha256': digest,
        'source': str(source.relative_to(ROOT)),
        'features': [
            'weekly-attendance', 'enrollment-vs-attendance-vs-density',
            'absence-reasons', 'mentor-weekly-metrics', 'attendance-forecast',
            'automatic-follow-up-tasks', 'weekly-archives', 'shared-sync'
        ],
    }
    for folder in ('growth-os', 'growth-os-6', 'growth61-live'):
        out = ROOT / folder
        (out / 'BUILD.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        (out / 'RELEASE.txt').write_text(
            'EXTREME KIDS Growth OS 6.2 Attendance Intelligence\n'
            f'Build: {FEATURE_BUILD}\nSHA256: {digest}\n',
            encoding='utf-8',
        )
    (ROOT / 'growth6-source' / 'SHA256.txt').write_text(digest + '  v6.2.html\n', encoding='utf-8')
    print(json.dumps(metadata, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()

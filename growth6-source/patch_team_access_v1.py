#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS_PATH = ROOT / 'growth6-source' / 'team_access_v1.css'
JS_PATH = ROOT / 'growth6-source' / 'team_access_v1.js'
GROUP_JS_PATH = ROOT / 'growth6-source' / 'group_access_v1.js'
SOURCE_CANDIDATES = [
    ROOT / 'growth-os-6' / 'index.html',
    ROOT / 'growth-os' / 'index.html',
    ROOT / 'growth61-live' / 'index.html',
    ROOT / 'growth6-source' / 'v6.3.html',
    ROOT / 'growth6-source' / 'v6.2.html',
]
OUTPUTS = [
    ROOT / 'growth6-source' / 'v6.3.1.html',
    ROOT / 'growth6-source' / 'v6.3.html',
    ROOT / 'growth-os' / 'index.html',
    ROOT / 'growth-os-6' / 'index.html',
    ROOT / 'growth61-live' / 'index.html',
]
CSS_START = '/* TEAM_CABINETS_ACCESS_V1_START */'
CSS_END = '/* TEAM_CABINETS_ACCESS_V1_END */'
JS_START = '// TEAM_CABINETS_ACCESS_V1_START'
JS_END = '// TEAM_CABINETS_ACCESS_V1_END'
GROUP_JS_START = '// MANAGEMENT_GROUP_ACCESS_V1_START'
GROUP_JS_END = '// MANAGEMENT_GROUP_ACCESS_V1_END'
ATTENDANCE_MARKER = '// ATTENDANCE_INTELLIGENCE_V1_END'
LISTENER_MARKER = "document.addEventListener('click',handleClick);"
FEATURE_BUILD = '2026.09.03-management-all-groups'
FEATURE_VERSION = '6.3.1-management-groups'


def choose_source() -> Path:
    for path in SOURCE_CANDIDATES:
        if not path.exists():
            continue
        text = path.read_text(encoding='utf-8')
        if "const VERSION='6.1.0'" in text and 'ATTENDANCE_INTELLIGENCE_V1_END' in text and 'PAYROLL_TEAM_READABILITY_V1_END' in text:
            return path
    raise SystemExit('No Growth OS attendance/payroll source found')


def strip_block(text: str, start: str, end: str) -> str:
    return re.sub(re.escape(start) + r'.*?' + re.escape(end) + r'\s*', '', text, flags=re.S)


def patch_html(html: str, css: str, js: str, group_js: str) -> str:
    html = strip_block(html, CSS_START, CSS_END)
    html = strip_block(html, JS_START, JS_END)
    html = strip_block(html, GROUP_JS_START, GROUP_JS_END)

    if '</style>' not in html:
        raise SystemExit('Main style block not found')
    html = html.replace('</style>', '\n' + css.strip() + '\n</style>', 1)

    injected_js = js.strip() + '\n\n' + group_js.strip()
    if ATTENDANCE_MARKER in html:
        html = html.replace(ATTENDANCE_MARKER, ATTENDANCE_MARKER + '\n\n' + injected_js, 1)
    elif LISTENER_MARKER in html:
        html = html.replace(LISTENER_MARKER, injected_js + '\n\n' + LISTENER_MARKER, 1)
    else:
        raise SystemExit('Application injection marker not found')

    html = html.replace('<title>EXTREME KIDS · Growth OS 6.2 Attendance</title>', '<title>EXTREME KIDS · Growth OS 6.3.1 Management Groups</title>')
    html = html.replace('<title>EXTREME KIDS · Growth OS 6.3 Team Cabinets</title>', '<title>EXTREME KIDS · Growth OS 6.3.1 Management Groups</title>')
    html = html.replace('Growth OS <span>6.2</span>', 'Growth OS <span>6.3.1</span>')
    html = html.replace('GROWTH OS <span>6.2</span>', 'GROWTH OS <span>6.3.1</span>')
    html = html.replace('Growth OS <span>6.3</span>', 'Growth OS <span>6.3.1</span>')
    html = html.replace('GROWTH OS <span>6.3</span>', 'GROWTH OS <span>6.3.1</span>')

    required = [
        "const VERSION='6.1.0'",
        "const BUILD='2026.08.31-payroll-team-readability'",
        'ATTENDANCE_INTELLIGENCE_V1_START',
        'TEAM_CABINETS_ACCESS_V1_START',
        'MANAGEMENT_GROUP_ACCESS_V1_START',
        "function canSeeAllTasks()",
        "function canSeeAllGroups()",
        "label:'Команда и кабинеты'",
        "function renderStaffManagement()",
        "function adminPersonModal(",
        "Ваня видит задачи всей команды",
        "Ваня видит все активные группы клуба",
        'МОЯ ЗАРПЛАТА ЗА МЕСЯЦ',
    ]
    missing = [marker for marker in required if marker not in html]
    if missing:
        raise SystemExit('Patched build is missing markers: ' + ', '.join(missing))
    return html


def main() -> None:
    source = choose_source()
    css = CSS_PATH.read_text(encoding='utf-8')
    js = JS_PATH.read_text(encoding='utf-8')
    group_js = GROUP_JS_PATH.read_text(encoding='utf-8')
    html = patch_html(source.read_text(encoding='utf-8'), css, js, group_js)

    for path in OUTPUTS:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(html, encoding='utf-8')

    digest = hashlib.sha256(html.encode('utf-8')).hexdigest()
    metadata = {
        'compatibilityVersion': '6.1.0',
        'featureVersion': FEATURE_VERSION,
        'build': FEATURE_BUILD,
        'sha256': digest,
        'source': str(source.relative_to(ROOT)),
        'features': [
            'task-scope-by-person',
            'all-task-access-owner-manager-stas-ivan',
            'management-all-groups-owner-manager-stas-ivan',
            'mentor-own-groups-only',
            'owner-managed-mentors',
            'owner-managed-admins',
            'dynamic-personal-cabinets',
            'personal-admin-task-focus',
            'staff-cabinet-management',
            'attendance-and-payroll-preserved',
        ],
    }
    for folder in ('growth-os', 'growth-os-6', 'growth61-live'):
        out = ROOT / folder
        (out / 'BUILD.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        (out / 'RELEASE.txt').write_text(
            'EXTREME KIDS Growth OS 6.3.1 Management Group Access\n'
            f'Build: {FEATURE_BUILD}\nSHA256: {digest}\n',
            encoding='utf-8',
        )
    (ROOT / 'growth6-source' / 'SHA256.txt').write_text(digest + '  v6.3.1.html\n', encoding='utf-8')
    print(json.dumps(metadata, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()

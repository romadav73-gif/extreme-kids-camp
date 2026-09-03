#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS_PATH = ROOT / 'growth6-source' / 'team_access_v1.css'
MANAGEMENT_CSS_PATH = ROOT / 'growth6-source' / 'management_up_v1.css'
SOFA3_CSS_PATH = ROOT / 'growth6-source' / 'sofa3_merge_v1.css'
JS_PATH = ROOT / 'growth6-source' / 'team_access_v1.js'
GROUP_JS_PATH = ROOT / 'growth6-source' / 'group_access_v1.js'
MANAGEMENT_JS_PATH = ROOT / 'growth6-source' / 'management_up_v1.js'
SOFA3_JS_PATH = ROOT / 'growth6-source' / 'sofa3_merge_v1.js'
SOFA3_DETAILS_JS_PATH = ROOT / 'growth6-source' / 'sofa3_merge_v1_details.js'
SOURCE_CANDIDATES = [
    ROOT / 'growth-os-6' / 'index.html',
    ROOT / 'growth-os' / 'index.html',
    ROOT / 'growth61-live' / 'index.html',
    ROOT / 'growth6-source' / 'v6.5.html',
    ROOT / 'growth6-source' / 'v6.4.html',
    ROOT / 'growth6-source' / 'v6.3.1.html',
    ROOT / 'growth6-source' / 'v6.3.html',
    ROOT / 'growth6-source' / 'v6.2.html',
]
OUTPUTS = [
    ROOT / 'growth6-source' / 'v6.5.html',
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
MANAGEMENT_CSS_START = '/* MANAGEMENT_UP_V1_START */'
MANAGEMENT_CSS_END = '/* MANAGEMENT_UP_V1_END */'
MANAGEMENT_JS_START = '// MANAGEMENT_UP_V1_START'
MANAGEMENT_JS_END = '// MANAGEMENT_UP_V1_END'
SOFA3_CSS_START = '/* SOFA3_UNIQUE_MERGE_V1_START */'
SOFA3_CSS_END = '/* SOFA3_UNIQUE_MERGE_V1_END */'
SOFA3_JS_START = '// SOFA3_UNIQUE_MERGE_V1_START'
SOFA3_JS_END = '// SOFA3_UNIQUE_MERGE_V1_END'
SOFA3_DETAILS_JS_START = '// SOFA3_UNIQUE_DETAILS_V1_START'
SOFA3_DETAILS_JS_END = '// SOFA3_UNIQUE_DETAILS_V1_END'
ATTENDANCE_MARKER = '// ATTENDANCE_INTELLIGENCE_V1_END'
LISTENER_MARKER = "document.addEventListener('click',handleClick);"
FEATURE_BUILD = '2026.09.03-sofa3-unique-merge'
FEATURE_VERSION = '6.5-sofa-operations'


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


def patch_html(html: str, css: str, management_css: str, sofa_css: str, js: str, group_js: str, management_js: str, sofa_js: str, sofa_details_js: str) -> str:
    for start, end in (
        (CSS_START, CSS_END), (JS_START, JS_END), (GROUP_JS_START, GROUP_JS_END),
        (MANAGEMENT_CSS_START, MANAGEMENT_CSS_END), (MANAGEMENT_JS_START, MANAGEMENT_JS_END),
        (SOFA3_CSS_START, SOFA3_CSS_END), (SOFA3_JS_START, SOFA3_JS_END),
        (SOFA3_DETAILS_JS_START, SOFA3_DETAILS_JS_END),
    ):
        html = strip_block(html, start, end)

    if '</style>' not in html:
        raise SystemExit('Main style block not found')
    injected_css = css.strip() + '\n\n' + management_css.strip() + '\n\n' + sofa_css.strip()
    html = html.replace('</style>', '\n' + injected_css + '\n</style>', 1)

    injected_js = js.strip() + '\n\n' + group_js.strip() + '\n\n' + management_js.strip() + '\n\n' + sofa_js.strip() + '\n\n' + sofa_details_js.strip()
    if ATTENDANCE_MARKER in html:
        html = html.replace(ATTENDANCE_MARKER, ATTENDANCE_MARKER + '\n\n' + injected_js, 1)
    elif LISTENER_MARKER in html:
        html = html.replace(LISTENER_MARKER, injected_js + '\n\n' + LISTENER_MARKER, 1)
    else:
        raise SystemExit('Application injection marker not found')

    for old in (
        '<title>EXTREME KIDS · Growth OS 6.2 Attendance</title>',
        '<title>EXTREME KIDS · Growth OS 6.3 Team Cabinets</title>',
        '<title>EXTREME KIDS · Growth OS 6.3.1 Management Groups</title>',
        '<title>EXTREME KIDS · Growth OS 6.4 Management Board</title>',
    ):
        html = html.replace(old, '<title>EXTREME KIDS · Growth OS 6.5 Sofa Operations</title>')
    for old in ('6.2', '6.3', '6.3.1', '6.4'):
        html = html.replace(f'Growth OS <span>{old}</span>', 'Growth OS <span>6.5</span>')
        html = html.replace(f'GROWTH OS <span>{old}</span>', 'GROWTH OS <span>6.5</span>')

    required = [
        "const VERSION='6.1.0'", "const BUILD='2026.08.31-payroll-team-readability'",
        'ATTENDANCE_INTELLIGENCE_V1_START', 'TEAM_CABINETS_ACCESS_V1_START',
        'MANAGEMENT_GROUP_ACCESS_V1_START', 'MANAGEMENT_UP_V1_START',
        'SOFA3_UNIQUE_MERGE_V1_START', 'SOFA3_UNIQUE_DETAILS_V1_START',
        "function canSeeAllTasks()", "function canSeeAllGroups()", "function isManagementBoard()",
        "label:'Команда и кабинеты'", "label:'Документы и обязанности'", "label:'Собрание УП'", "label:'Операционный день'",
        "function renderDocumentsAndDuties()", "function renderMeeting()", "function renderOperations()",
        "const SOFA3_BASE_SALARY=100000", "const SOFA3_MEETING_TEMPLATES=",
        "sofa3-service-standards", "function sofa3MeetingProtocolModal(",
        "Руководитель роллер-школы · теоретический", "Станислав видит все активные группы клуба",
        'МОЯ ЗАРПЛАТА ЗА МЕСЯЦ', 'СОФА · МОТИВАЦИЯ УПРАВЛЯЮЩЕЙ', 'Ежедневный отчёт Роману зафиксирован',
    ]
    missing = [marker for marker in required if marker not in html]
    if missing:
        raise SystemExit('Patched build is missing markers: ' + ', '.join(missing))
    return html


def main() -> None:
    source = choose_source()
    css = CSS_PATH.read_text(encoding='utf-8')
    management_css = MANAGEMENT_CSS_PATH.read_text(encoding='utf-8')
    sofa_css = SOFA3_CSS_PATH.read_text(encoding='utf-8')
    js = JS_PATH.read_text(encoding='utf-8')
    group_js = GROUP_JS_PATH.read_text(encoding='utf-8')
    management_js = MANAGEMENT_JS_PATH.read_text(encoding='utf-8')
    sofa_js = SOFA3_JS_PATH.read_text(encoding='utf-8')
    sofa_details_js = SOFA3_DETAILS_JS_PATH.read_text(encoding='utf-8')
    html = patch_html(source.read_text(encoding='utf-8'), css, management_css, sofa_css, js, group_js, management_js, sofa_js, sofa_details_js)

    for path in OUTPUTS:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(html, encoding='utf-8')

    digest = hashlib.sha256(html.encode('utf-8')).hexdigest()
    metadata = {
        'compatibilityVersion': '6.1.0', 'featureVersion': FEATURE_VERSION, 'build': FEATURE_BUILD,
        'sha256': digest, 'source': str(source.relative_to(ROOT)),
        'features': [
            'task-scope-by-person', 'management-all-task-access-roman-sofa-stanislav-ivan',
            'management-all-groups-roman-sofa-stanislav-ivan', 'mentor-own-groups-only', 'management-board-role-model',
            'employee-documents-and-duties-view-only', 'management-documents-and-duties-write-access',
            'management-meeting-agenda', 'management-meeting-stopwatch',
            'sofa-operational-day', 'sofa-daily-control-checklist', 'sofa-management-rhythm',
            'sofa-daily-funnel-and-payments', 'sofa-owner-daily-report', 'sofa-weekly-result-score',
            'sofa-meeting-templates-history-actions', 'sofa-meeting-protocols', 'sofa-manager-motivation',
            'sofa-service-standards', 'daily-operations-archive',
            'owner-managed-mentors', 'owner-managed-admins', 'dynamic-personal-cabinets',
            'attendance-and-payroll-preserved',
        ],
    }
    for folder in ('growth-os', 'growth-os-6', 'growth61-live'):
        out = ROOT / folder
        (out / 'BUILD.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        (out / 'RELEASE.txt').write_text('EXTREME KIDS Growth OS 6.5 Sofa Operations\n' + f'Build: {FEATURE_BUILD}\nSHA256: {digest}\n', encoding='utf-8')
    (ROOT / 'growth6-source' / 'SHA256.txt').write_text(digest + '  v6.5.html\n', encoding='utf-8')
    print(json.dumps(metadata, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()

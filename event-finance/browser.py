import json, re, shutil, urllib.request, urllib.error
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

BASE = 'https://extreme-kids-growth-os-6-5-mi5pb3.v2.appdeploy.ai/'
PATTERN = 'https://api-v2.appdeploy.ai/app/extreme-kids-growth-os-6-5-mi5pb3/**'
AUTH = json.loads(Path('event-finance/qa-files/auth.json').read_text())
HEADERS = {'access-control-allow-origin': BASE.rstrip('/'), 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type,x-appdeploy-keys-prefix', 'access-control-allow-methods': 'POST,GET,OPTIONS', 'content-type': 'application/json'}
checks, errors, calls = [], [], []
fault = {'after_commit': False}

def check(name, ok):
    checks.append({'name': name, 'ok': bool(ok)})
    print(name, bool(ok), flush=True)
    if not ok:
        raise AssertionError(name)

def local(q):
    req = urllib.request.Request('http://127.0.0.1:8898/qa/api', data=json.dumps(q).encode(), headers={'Content-Type': 'application/json'}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()

def intercept(route):
    request = route.request
    if request.method == 'OPTIONS':
        route.fulfill(status=204, headers=HEADERS, body='')
        return
    q = json.loads(request.post_data or '{}')
    q['action'] = urlsplit(request.url).path.split('/')[-1]
    calls.append({'action': q['action'], 'operation': q.get('body', {}).get('action', ''), 'method': request.method})
    status, body = local(q)
    if q['action'] == 'event-finance' and q.get('body', {}).get('action') == 'save' and fault['after_commit'] and status == 200:
        fault['after_commit'] = False
        status, body = 503, json.dumps({'error': 'SIMULATED_RESPONSE_LOSS', 'message': 'Сохранение не подтверждено. Повторите тот же запрос.'}).encode()
    route.fulfill(status=status, headers=HEADERS, body=body)

def new_context(browser, width=1280):
    c = browser.new_context(viewport={'width': width, 'height': 850}, accept_downloads=True)
    c.route(PATTERN, intercept)
    p = c.new_page()
    p.on('pageerror', lambda e: errors.append(str(e)))
    p.on('dialog', lambda d: d.accept('Исправление фактической стоимости') if d.type == 'prompt' else d.accept())
    return c, p

def login(p, username):
    p.goto(BASE + '#login', wait_until='networkidle', timeout=60000)
    expect(p.locator('#login')).to_be_visible(timeout=20000)
    p.locator('#login [name=username]').fill(username)
    p.locator('#login [name=password]').fill(AUTH['password'])
    p.locator('#login [name=rememberDevice]').uncheck()
    p.locator('#login button[type=submit]').click()
    p.wait_for_selector('#appShell:not(.hidden)', timeout=30000)
    check('published event release available to ' + username, p.evaluate('window.EK65EventFinance?.release') == '2026.10.08-events.1')

def events(p):
    target = p.locator('#mainNav [data-view=event_finance]')
    if not target.is_visible():
        p.locator('#mobileNav [data-action=toggleSidebar]').click()
    target.click()
    expect(p.locator('#efRoot')).to_be_visible()

def tab(p, key):
    p.locator('.ef-tabs [data-tab=' + key + ']').click()

def field(p, key, value, section='', index=0):
    selector = '[data-ef-field=' + key + ']'
    if section:
        selector += '[data-section=' + section + '][data-index="' + str(index) + '"]'
    p.locator(selector).fill(str(value))

def select(p, key, value, section='', index=0):
    selector = '[data-ef-field=' + key + ']'
    if section:
        selector += '[data-section=' + section + '][data-index="' + str(index) + '"]'
    p.locator(selector).select_option(value)

def add(p, section):
    tab(p, section)
    p.locator('[data-ef-action=add-row][data-section=' + section + ']').click()

def save(p):
    p.locator('.ef-editor-head [data-ef-action=save]').click()
    expect(p.locator('#efSaveState')).to_contain_text('Сохранено на сервере', timeout=20000)

def card_json(p):
    with p.expect_download() as d:
        p.locator('[data-ef-action=card-export]').click()
    return json.loads(Path(d.value.path()).read_text())

def reload_owner(p):
    p.reload(wait_until='networkidle')
    expect(p.locator('#access18Continue')).to_be_visible(timeout=20000)
    p.locator('#access18Continue').click()
    p.wait_for_selector('#appShell:not(.hidden)', timeout=30000)
    events(p)

def no_overflow(p, name):
    check(name, p.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=shutil.which('google-chrome') or shutil.which('chromium'), args=['--no-sandbox'])
    c = p = None
    try:
        c, p = new_context(browser)
        login(p, 'roman')
        events(p)
        expect(p.locator('[data-ef-action=competition]')).to_be_visible(timeout=20000)
        p.locator('[data-ef-action=competition]').click()
        expect(p.locator('[data-ef-field=date]')).to_have_value('2026-10-07')
        check('blank competition template has no invented actual profit', p.locator('#efLiveSummary').inner_text().find('Нет цифр') >= 0)
        field(p, 'title', 'QA соревнования 7 октября')
        select(p, 'hall', 'Весь зал')
        field(p, 'participantsFact', 20)
        add(p, 'income')
        field(p, 'label', 'Взносы', 'income'); field(p, 'plan', 100000, 'income'); field(p, 'fact', 120000, 'income')
        p.locator('[data-ef-action=add-row]').click()
        field(p, 'label', 'Возврат', 'income', 1); select(p, 'kind', 'refund', 'income', 1); field(p, 'plan', 0, 'income', 1); field(p, 'fact', 5000, 'income', 1)
        add(p, 'expenses')
        field(p, 'label', 'Оплата команды', 'expenses'); select(p, 'category', 'Персонал', 'expenses'); field(p, 'plan', 30000, 'expenses'); field(p, 'fact', 40000, 'expenses')
        add(p, 'gifts')
        field(p, 'label', 'Медали', 'gifts'); field(p, 'planQty', 10, 'gifts'); field(p, 'planPrice', 500, 'gifts'); field(p, 'factQty', 20, 'gifts'); field(p, 'factPrice', 400, 'gifts')
        expect(p.locator('#efLiveSummary .ef-big')).to_contain_text(re.compile(r'67\s*000'))
        check('live procurement and net profit visible', True)
        add(p, 'closure')
        field(p, 'label', 'Вечерние тренировки', 'closure')
        for key, v in [('planRevenue', 20000), ('planRetained', 10000), ('planSavedCosts', 2000), ('factRevenue', 24000), ('factRetained', 12000), ('factSavedCosts', 2000)]:
            field(p, key, v, 'closure')
        add(p, 'risks')
        field(p, 'label', 'Повреждение оборудования', 'risks'); field(p, 'probability', 25, 'risks'); field(p, 'impact', 12000, 'risks')
        tab(p, 'result')
        actual = card_json(p)
        check('all live formula totals match independent expected amounts', actual['totals']['fact']['revenue'] == 115000 and actual['totals']['fact']['costs'] == 48000 and actual['totals']['fact']['profit'] == 67000 and actual['totals']['fact']['economicResult'] == 57000 and actual['totals']['plan']['afterRisk'] == 54000)
        save(p)
        p.screenshot(path='evidence/event-desktop.png', full_page=True)
        event_id = card_json(p)['entry']['id']
        reload_owner(p)
        expect(p.locator('.ef-event')).to_have_count(1, timeout=20000)
        p.locator('.ef-event [data-ef-action=open]').click()
        expect(p.locator('[data-ef-field=title]')).to_have_value('QA соревнования 7 октября')
        check('server event survives browser reload', card_json(p)['totals']['fact']['profit'] == 67000)
        second, q = new_context(browser)
        login(q, 'roman'); events(q)
        expect(q.locator('.ef-event')).to_have_count(1, timeout=20000)
        q.locator('[data-ef-action=open]').click()
        expect(q.locator('#efForm')).to_be_visible()
        check('second owner browser sees same saved event', card_json(q)['entry']['id'] == event_id)
        second.close()
        p.locator('[data-ef-action=archive]').click()
        expect(p.locator('#efMessage')).to_contain_text('Для архива', timeout=20000)
        check('unreviewed archive blocked in UI', True)
        select(p, 'status', 'Проведено')
        tab(p, 'result'); p.locator('[data-ef-field=factsChecked]').check(); save(p)
        p.locator('[data-ef-action=archive]').click()
        expect(p.locator('#efSaveState')).to_contain_text('Архив', timeout=20000)
        check('archived totals frozen and review disabled', card_json(p)['entry']['snapshot']['totals']['fact']['profit'] == 67000 and p.locator('[data-ef-field=factsChecked]').is_disabled())
        p.locator('details').filter(has_text='Снимки закрытия').locator('summary').click()
        check('archive snapshot export remains enabled', p.locator('[data-ef-action=snapshot]').is_enabled())
        with p.expect_download() as d:
            p.locator('[data-ef-action=snapshot]').click()
        check('downloaded snapshot has exact fixed profit', json.loads(Path(d.value.path()).read_text())['totals']['fact']['profit'] == 67000)
        p.locator('.ef-editor-head [data-ef-action=back]').click()
        p.locator('[data-ef-action=filter][data-value=archive]').click()
        expect(p.locator('.ef-event')).to_have_count(1, timeout=20000)
        check('archived event listed separately', True)
        p.locator('[data-ef-action=open]').click()
        p.locator('[data-ef-action=reopen]').click()
        expect(p.locator('#efSaveState')).to_contain_text('Сохранено на сервере', timeout=20000)
        tab(p, 'expenses'); field(p, 'fact', 41000, 'expenses'); save(p)
        actual = card_json(p)
        check('reopen correction retains old snapshot and computes new profit', actual['totals']['fact']['profit'] == 66000 and actual['entry']['archives'][0]['totals']['fact']['profit'] == 67000)
        field(p, 'fact', 42000, 'expenses')
        fault['after_commit'] = True
        p.locator('.ef-editor-head [data-ef-action=save]').click()
        expect(p.locator('#efMessage')).to_contain_text('не подтверждено', timeout=20000)
        expect(p.locator('[data-ef-action=retry]')).to_be_visible()
        check('committed but lost response keeps explicit pending state', p.locator('#efForm fieldset').is_disabled())
        reload_owner(p)
        expect(p.locator('[data-ef-action=resume]')).to_be_visible(timeout=20000)
        p.locator('[data-ef-action=resume]').click()
        p.locator('[data-ef-action=retry]').click()
        expect(p.locator('#efSaveState')).to_contain_text('Сохранено на сервере', timeout=20000)
        actual = card_json(p)
        check('reloaded pending request safely replays without duplicates', actual['totals']['fact']['profit'] == 65000 and len(actual['entry']['content']['expenses']) == 1 and actual['entry']['id'] == event_id)
        p.locator('.ef-editor-head [data-ef-action=back]').click()
        p.locator('[data-ef-action=filter][data-value=all]').click()
        expect(p.locator('.ef-event')).to_have_count(1)
        with p.expect_download() as d:
            p.locator('[data-ef-action=export]').click()
        exported = json.loads(Path(d.value.path()).read_text())
        check('dedicated full archive export contains saved history', len(exported['entries']) == 1 and len(exported['entries'][event_id]['archives']) == 1 and 'sessions' not in exported)
        c.close()
        c, p = new_context(browser, 375)
        login(p, 'roman'); events(p)
        expect(p.locator('.ef-event')).to_have_count(1, timeout=20000)
        no_overflow(p, 'mobile event registry stays within viewport')
        p.screenshot(path='evidence/event-mobile-list.png', full_page=True)
        p.locator('[data-ef-action=open]').click()
        expect(p.locator('#efForm')).to_be_visible()
        for key in ['event', 'income', 'expenses', 'gifts', 'closure', 'risks', 'result']:
            tab(p, key)
            no_overflow(p, 'mobile ' + key + ' tab stays within viewport')
        p.screenshot(path='evidence/event-mobile-summary.png', full_page=True)
        tab(p, 'gifts'); field(p, 'factQty', 21, 'gifts'); save(p)
        check('mobile edit is durable and recalculates', card_json(p)['totals']['fact']['profit'] == 64600)
        p.screenshot(path='evidence/event-mobile-form.png', full_page=True)
        c.close()
        for username in ['tasya', 'sofa', 'stas', 'anya']:
            c, p = new_context(browser, 375)
            login(p, username)
            check(username + ' has no event finances navigation', p.locator('#mainNav [data-view=event_finance]').count() == 0)
            c.close()
        check('no uncaught frontend exceptions', not errors)
    finally:
        try:
            p.screenshot(path='evidence/event-last-screen.png', full_page=True)
            Path('evidence/event-last-dom.txt').write_text(p.locator('body').inner_text())
        except Exception:
            pass
        Path('evidence/event-browser.json').write_text(json.dumps({'checks': checks, 'errors': errors, 'calls': calls, 'scope': 'Exact published frontend; all club API calls routed to synthetic in-memory accounts. No customer events, data or credentials used.'}, ensure_ascii=False, indent=2))
        browser.close()

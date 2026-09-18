import json, shutil, urllib.request, urllib.error
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect
BASE = 'https://extreme-kids-growth-os-6-5-mi5pb3.v2.appdeploy.ai/'
PATTERN = 'https://api-v2.appdeploy.ai/app/extreme-kids-growth-os-6-5-mi5pb3/**'
PASSWORD = json.loads(Path('qa/auth.json').read_text())['password']
checks, errors, calls = [], [], []
HEADERS = {'access-control-allow-origin': BASE.rstrip('/'), 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type,x-appdeploy-keys-prefix', 'access-control-allow-methods': 'POST,GET,OPTIONS', 'content-type': 'application/json'}
def check(name, value):
    checks.append({'name': name, 'ok': bool(value)})
    print(name, bool(value), flush=True)
    if not value: raise AssertionError(name)
def local(action, q):
    r = urllib.request.Request('http://127.0.0.1:8898/' + action, data=json.dumps(q).encode(), headers={'Content-Type': 'application/json'}, method='POST')
    try:
        with urllib.request.urlopen(r, timeout=25) as v: return v.status, v.read()
    except urllib.error.HTTPError as e: return e.code, e.read()
def intercept(route):
    r = route.request
    if r.method == 'OPTIONS': route.fulfill(status=204, headers=HEADERS, body=''); return
    action = urlsplit(r.url).path.split('/')[-1]
    calls.append({'action': action, 'method': r.method, 'credentialInURL': PASSWORD in r.url})
    status, content = local(action, json.loads(r.post_data or '{}'))
    route.fulfill(status=status, headers=HEADERS, body=content)
def context(browser, width=375):
    c = browser.new_context(viewport={'width': width, 'height': 812}); c.route(PATTERN, intercept)
    p = c.new_page(); p.on('pageerror', lambda e: errors.append(str(e))); return c, p
def login(p, user, remember=False):
    p.goto(BASE + '#login', wait_until='networkidle', timeout=60000)
    p.locator('#login [name=username]').fill(user); p.locator('#login [name=password]').fill(PASSWORD)
    p.locator('#login [name=rememberDevice]').set_checked(remember)
    p.locator('#login button[type=submit]').click(); p.wait_for_selector('#appShell:not(.hidden)', timeout=30000)
    check('published account controls loaded: ' + user, p.evaluate('window.EK65AccountUI?.release') == '2026.09.18-access.1')
def geometry(p, label):
    value = p.evaluate('''() => {
      const e=document.querySelector('#ax18Account [data-action=ax18Logout]'),r=e.getBoundingClientRect();
      return {overflow:document.documentElement.scrollWidth>innerWidth+1,exit:r.width>=44&&r.height>=44&&r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight,nav:[...document.querySelectorAll('#mobileNav button')].length};
    }''')
    check(label + ': no page overflow', not value['overflow']); check(label + ': exit visible and tappable', value['exit']); check(label + ': bounded mobile navigation', value['nav'] <= 5)
def finish_form(p):
    expect(p.locator('#login')).to_be_visible(timeout=20000); check('private cabinet removed after exit', p.locator('#appShell:not(.hidden)').count() == 0)
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=shutil.which('google-chrome'), args=['--no-sandbox'])
    try:
        c, p = context(browser)
        p.goto(BASE, wait_until='networkidle', timeout=60000)
        check('fresh general link requires personal login', p.locator('#login').is_visible() and p.locator('#appShell').count() == 0)
        check('remembering is opt-in', not p.locator('#login [name=rememberDevice]').is_checked())
        login(p, 'stas', True); geometry(p, 'Stas 375')
        token = p.evaluate("JSON.parse(sessionStorage.getItem('EK65_SIGNIN:/'))")
        marker = len(calls); p.goto(BASE + '#login', wait_until='networkidle')
        check('shared login URL never opens Stas automatically', p.locator('#login').is_visible() and p.locator('#appShell').count() == 0)
        check('shared login does not read private state', not any(x['action'] == 'state' for x in calls[marker:]))
        p.goto(BASE, wait_until='networkidle'); expect(p.locator('#access18Continue')).to_contain_text('Стас')
        check('stored account is named before opening', p.locator('#appShell').count() == 0)
        p.locator('#access18Continue').click(); p.wait_for_selector('#appShell:not(.hidden)')
        q = c.new_page(); q.on('pageerror', lambda e: errors.append(str(e))); q.goto(BASE, wait_until='networkidle')
        expect(q.locator('#access18Recover')).to_be_visible(); q.locator('#access18Recover').click()
        expect(q.locator('#access18Continue')).to_contain_text('Стас'); q.locator('#access18Continue').click(); q.wait_for_selector('#appShell:not(.hidden)')
        check('remembered device requires explicit named continuation', q.locator('#ax18Account').inner_text().find('Стас') >= 0)
        p.locator('#ax18Account [data-action=ax18Logout]').click(); finish_form(p); finish_form(q)
        status, _ = local('state', {'session': token['session'], 'csrf': token['csrf'], 'body': {}})
        check('logged-out server session is revoked', status == 401)
        n = c.new_page(); n.goto(BASE, wait_until='networkidle'); check('new tab cannot silently restore logged-out device', n.locator('#login').is_visible() and n.locator('#access18Recover').count() == 0); n.close()
        login(p, 'tasya'); check('different employee opens her own account', 'Тася' in p.locator('#ax18Account').inner_text())
        check('mentor receives no owner settings or foreign group', p.locator('#mainNav [data-view=settings]').count() == 0 and all(g['mentorId'] == 'tasya' for g in p.evaluate('window.EKGrowthOS.getState().groups')))
        p.evaluate("window.EKGrowthOS.getState().tasks.find(t=>t.ownerId==='tasya').description='Saved before verified logout'")
        p.locator('#ax18Account [data-action=ax18Logout]').click(); finish_form(p)
        login(p, 'tasya'); check('logout saves pending permitted changes', p.evaluate("window.EKGrowthOS.getState().tasks.find(t=>t.ownerId==='tasya').description") == 'Saved before verified logout')
        p.goto(BASE + '#login', wait_until='networkidle'); login(p, 'stas')
        check('password account switch revokes prior local identity', 'Стас' in p.locator('#ax18Account').inner_text())
        c.close()
        for width, user in [(320,'tasya'),(375,'stas'),(390,'ivan'),(428,'sofa'),(768,'anya'),(1280,'roman'),(375,'karina')]:
            c, p = context(browser, width); login(p, user); geometry(p, user + ' ' + str(width))
            if width <= 820:
                p.locator('#mobileNav [data-action=toggleSidebar]').click(); expect(p.locator('#sidebar')).to_have_class('sidebar open')
                check(user + ': full menu opens', p.locator('#sidebar [data-action=ax18Logout]').is_visible())
                # Use a visible menu entry, not a hidden desktop locator.
                target=p.locator('#mainNav [data-view=tasks]')
                if target.count(): target.click()
                else: p.locator('#mainNav [data-view]').first.click()
                expect(p.locator('#sidebar')).not_to_have_class('sidebar open')
                check(user + ': menu navigation closes drawer', not p.locator('#sidebar').evaluate("e=>e.classList.contains('open')"))
                if user in ['tasya','stas','ivan']:
                    p.locator('#mobileNav [data-view=groups]').click()
                    p.locator('#mobileNav [data-view=attendance]').click()
                    p.locator('[data-action=attendanceRoster]').first.click()
                    expect(p.locator('#modal:not(.hidden)')).to_be_visible()
                    check(user + ': roster dialog fits phone', p.locator('.modal-card').evaluate('e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1}'))
                    p.locator('#modal').get_by_role('button', name='+ Добавить ученика', exact=True).click()
                    p.locator('#rg65Form [name=studentName]').fill('Александрова Александра Александровна')
                    p.locator('#rg65Form button[type=submit]').scroll_into_view_if_needed()
                    check(user + ': pupil save button reachable', p.locator('#rg65Form button[type=submit]').is_visible())
                    p.screenshot(path=f'evidence/form-{user}-{width}.png')
                    p.locator('#modal .close-btn').click()
            p.evaluate('window.scrollTo(0,0)'); p.screenshot(path=f'evidence/after-{user}-{width}.png', full_page=True)
            p.locator('#ax18Account [data-action=ax18Logout]').click(); finish_form(p); c.close()
        c,p = context(browser); login(p,'tasya')
        def unavailable(route): route.fulfill(status=503,headers=HEADERS,body='{"error":"GATEWAY","message":"Isolated outage"}')
        p.route('**/api/club/logout',unavailable)
        p.locator('#ax18Account [data-action=ax18Logout]').click()
        expect(p.locator('#modalTitle')).to_have_text('Выход не подтверждён', timeout=30000)
        check('server outage does not claim logout success', p.locator('#appShell:not(.hidden)').count() == 1)
        p.once('dialog',lambda d:d.accept()); p.locator('[data-action=ax18LocalExit]').click(); finish_form(p)
        expect(p.locator('#message')).to_contain_text('не был подтверждён')
        p.reload(wait_until='networkidle'); check('local-only exit stays on login after reload', p.locator('#appShell').count() == 0)
        c.close()
        check('no credentials in URLs', not any(x['credentialInURL'] for x in calls))
        check('login and logout use POST', all(x['method'] == 'POST' for x in calls if x['action'] in ['login','logout']))
        check('no uncaught application errors', not errors)
        # Actual production: read-only anonymous boundary only, never customer credentials.
        c=browser.new_context(); p=c.new_page(); p.goto(BASE+'#login',wait_until='networkidle',timeout=60000)
        check('real published server remains healthy', p.evaluate("async()=>(await window.EK65Transport.request('/api/health')).ok"))
        check('real anonymous state access denied', p.evaluate("async()=>{try{await window.EK65Transport.request('/api/state');return false}catch(e){return e.status===401}}"))
        c.close()
    finally:
        Path('evidence/access18-results.json').write_text(json.dumps({'checks':checks,'errors':errors,'scope':'Published frontend and real pinned auth/device controllers with synthetic in-memory accounts. Production used only for anonymous health and access denial. No real club records or accounts changed.'},ensure_ascii=False,indent=2))
        browser.close()

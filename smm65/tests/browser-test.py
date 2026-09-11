from playwright.sync_api import sync_playwright
from pathlib import Path
import json, os

ROOT = Path(__file__).resolve().parents[1]
password = json.loads((ROOT / '.qa-auth.json').read_text())['password']
results = []
errors = []

def check(name, condition):
    results.append({'name': name, 'ok': bool(condition)})
    print(name, bool(condition), flush=True)
    if not condition:
        raise AssertionError(name)

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROME_PATH', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    def login(name, width=1366):
        ctx = browser.new_context(viewport={'width': width, 'height': 950}, timezone_id='Europe/Moscow')
        ctx.route('https://**/*', lambda route: route.abort())
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.set_default_timeout(10000)
        page.goto('http://127.0.0.1:8894/login')
        page.locator('#login [name=username]').fill(name)
        page.locator('#login [name=password]').fill(password)
        page.locator('#login button').click()
        try:
            page.wait_for_selector('#appShell:not(.hidden)')
        except Exception:
            print('BOOT_ERRORS', errors, flush=True)
            print('VISIBLE', page.locator('body').inner_text()[:2500], flush=True)
            raise
        return ctx, page
    def nav(page, view):
        if page.viewport_size['width'] < 1000 and not page.locator('#sidebar').evaluate("e=>e.classList.contains('open')"):
            page.locator('[data-action=toggleSidebar]').first.click()
        page.locator('#mainNav [data-view="' + view + '"]').click()
    def tab(page, value):
        page.locator('[data-action=sm65Tab][data-tab="' + value + '"]').first.click()
    try:
        kc, k = login('karina')
        check('Karina starts in distinct SMM cabinet', k.locator('.sm65-hero').count() == 1)
        check('No mentor or owner pages for SMM', k.locator('#mainNav [data-view=mentor],#mainNav [data-view=payroll],#mainNav [data-view=settings]').count() == 0)
        check('All five platforms visible', all(name in k.locator('.sm65-channels').inner_text() for name in ['Instagram', 'ВКонтакте', 'Telegram', 'TikTok', 'Likee']))
        k.screenshot(path=str(ROOT / 'evidence/karina-desktop.png'), full_page=True)
        check('Shared calendar event preview', 'Тестовые соревнования' in k.locator('#pages').inner_text())
        k.locator('.sm65-hero-actions [data-action=sm65New]').click()
        form = k.locator('#sm65EntryForm')
        form.locator('[name=kind]').select_option('post')
        form.locator('[name=title]').fill('QA: Наши первые уверенные старты')
        for platform in ['instagram', 'vk', 'tiktok', 'likee']:
            form.locator('[name=use_' + platform + ']').uncheck()
        form.locator('[name=use_telegram]').check()
        form.locator('[name=url_telegram]').fill('https://t.me/qa_smm_club/781')
        form.locator('[name=rightsConfirmed]').check()
        k.locator('[data-action=sm65Draft]').click()
        k.wait_for_selector('#modal.hidden')
        tab(k, 'journal')
        check('Draft visibly distinct from submission', 'Черновик' in k.locator('.sm65-entry').inner_text())
        k.reload()
        k.wait_for_selector('.sm65')
        tab(k, 'journal')
        check('Draft survives reload', 'QA: Наши первые' in k.locator('#pages').inner_text())
        k.locator('[data-action=sm65Edit]').first.click()
        k.locator('[data-action=sm65Submit]').click()
        k.wait_for_selector('#modal.hidden')
        check('Author sees pending state', 'На проверке' in k.locator('.sm65-entry').inner_text())
        sc, s = login('sofa')
        nav(s, 'smm')
        tab(s, 'journal')
        check('Sofa gets same submitted post', 'QA: Наши первые' in s.locator('#pages').inner_text())
        s.locator('[data-action=sm65Review]').first.click()
        s.locator('#sm65ReviewForm [name=note]').fill('Принято: стиль и публикация проверены')
        s.locator('[data-action=sm65Approve]').click()
        s.wait_for_selector('#modal.hidden')
        k.evaluate('window.EKGrowthOS.sync()')
        check('Karina receives approval after sync', 'Принято: стиль и публикация проверены' in k.locator('#pages').inner_text())
        check('Author cannot accept own publication', k.locator('[data-action=sm65Approve],[data-action=sm65Review]').count() == 0)
        tab(k, 'pay')
        check('Motivation has no owner controls', k.locator('[data-action=sm65Rules],[data-action=sm65Close]').count() == 0 and 'Предварительный расчёт' in k.locator('#pages').inner_text())
        tab(s, 'pay')
        check('Manager cannot set salary rules', s.locator('[data-action=sm65Rules],[data-action=sm65Close]').count() == 0)
        rc, r = login('roman')
        nav(r, 'smm')
        tab(r, 'pay')
        r.locator('[data-action=sm65Rules]').click()
        check('Roman has all five platform targets', r.locator('#sm65RulesForm [name=videoPlatforms]').count() == 5)
        r.locator('#sm65RulesForm [name=note]').fill('QA: согласовали стартовый план')
        r.locator('#sm65RulesForm button[type=submit]').click()
        r.wait_for_selector('#modal.hidden')
        k.evaluate('window.EKGrowthOS.sync()')
        check('Owner rules synchronize to Karina', k.locator('.sm65').count() == 1)
        nav(k, 'tasks')
        check('General assigned SMM task visible', 'Снять знакомство с наставником' in k.locator('#pages').inner_text())
        k.locator('[data-action=editTask][data-id=smm-task]').click()
        k.locator('#taskForm [name=status]').select_option('done')
        k.locator('#taskForm button[type=submit]').click()
        k.evaluate('window.EKGrowthOS.sync()')
        r.evaluate('window.EKGrowthOS.sync()')
        check('SMM task completion reaches Roman', r.evaluate("window.EKGrowthOS.getState().tasks.find(t=>t.id==='smm-task').status==='done'"))
        nav(k, 'smm')
        tab(k, 'plan')
        check('Automatic month plan has daily cards', k.locator('.sm65-day').count() >= 15)
        k.locator('.sm65-day').nth(1).click()
        check('Plan changes selected date', k.locator('.sm65-day.selected').count() == 1)
        for width in [1366, 1024, 768, 390, 375]:
            k.set_viewport_size({'width': width, 'height': 900})
            tab(k, 'today')
            check('No horizontal overflow ' + str(width), k.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
            if width == 375:
                k.screenshot(path=str(ROOT / 'evidence/karina-mobile.png'), full_page=True)
        k.locator('.sm65-hero-actions [data-action=sm65New]').click()
        k.locator('#sm65EntryForm [name=title]').fill('QA offline proof')
        k.locator('#sm65EntryForm [name=archiveUrl]').fill('https://drive.google.com/file/d/qa-proof')
        k.locator('#sm65EntryForm [name=rightsConfirmed]').check()
        check('Mobile evidence form fits', k.locator('#modal').evaluate('(e)=>e.scrollWidth<=innerWidth+1'))
        k.screenshot(path=str(ROOT / 'evidence/evidence-form-mobile.png'), full_page=True)
        k.route('**/api/smm', lambda route: route.fulfill(status=503, content_type='application/json', body=json.dumps({'error': 'GATEWAY', 'message': 'QA simulated SMM outage'})))
        k.locator('[data-action=sm65Submit]').click()
        k.wait_for_function("document.querySelector('#sm65FormError').textContent.length>0")
        check('Failed report retains input and does not claim success', k.locator('#sm65EntryForm [name=title]').input_value() == 'QA offline proof' and k.locator('#modal:not(.hidden)').count() == 1)
        k.unroute('**/api/smm')
        k.locator('[data-action=sm65Submit]').click()
        k.wait_for_selector('#modal.hidden')
        tab(k, 'journal')
        check('Retry stores evidence once', k.locator('.sm65-entry').filter(has_text='QA offline proof').count() == 1)
        tc, t = login('tasya')
        check('Mentor has no SMM access', t.locator('#mainNav [data-view=smm]').count() == 0)
        check('No browser runtime errors', not errors)
    except Exception as exc:
        print('BROWSER_ERRORS', errors, flush=True)
        results.append({'name': 'browser-suite', 'ok': False, 'error': str(exc)})
        raise
    finally:
        (ROOT / 'evidence/browser-results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
        browser.close()

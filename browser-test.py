from playwright.sync_api import sync_playwright
from pathlib import Path
import json, traceback, shutil
root=Path(__file__).resolve().parent
password=json.loads((root/'.qa-login.json').read_text())['password']
results=[]; errors=[]
def check(name, value, detail=None):
    results.append({'name':name,'ok':bool(value),**({'detail':detail} if detail else {})})
    print(('PASS ' if value else 'FAIL ')+name, flush=True)
    if not value: raise AssertionError(name)
def sync(p): return p.evaluate('window.EKGrowthOS.sync()')
def nav(p, view): p.evaluate('(v)=>window.EKGrowthOS.setView(v)',view)
def state(p): return p.evaluate('window.EKGrowthOS.getState()')
def close(p): p.keyboard.press('Escape')
with sync_playwright() as engine:
    browser=engine.chromium.launch(executable_path=shutil.which('google-chrome') or '/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    contexts=[]
    def login(user, width=1366):
        ctx=browser.new_context(viewport={'width':width,'height':950},timezone_id='Europe/Moscow')
        contexts.append(ctx)
        ctx.route('https://**/*',lambda route:route.abort())
        page=ctx.new_page();page.set_default_timeout(7000)
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto('http://127.0.0.1:8886/login')
        page.locator('#login [name=username]').fill(user)
        page.locator('#login [name=password]').fill(password)
        page.locator('#login button').click();page.wait_for_selector('#appShell:not(.hidden)')
        return page
    try:
        a=login('qaowner');nav(a,'tasks');a.locator('[data-action=addTask]').first.click()
        check('owner has multi-recipient choices',a.locator('#taskForm [name=taskRecipients]').count()>=6)
        check('archived employees excluded',a.locator('#taskForm [value=archived-qa]').count()==0)
        a.locator('#taskForm [name=title]').fill('QA independent multi task')
        a.locator('#taskForm [name=description]').fill('Each employee must report individually')
        a.locator('[data-action=mt65Select][data-mode=none]').click()
        a.locator('#taskForm button[type=submit]').click()
        check('no selection blocks submission',a.locator('[data-mt65-error]').inner_text()=='Выбери хотя бы одного сотрудника.' and not any(t['title']=='QA independent multi task' for t in state(a)['tasks']))
        a.locator('#taskForm [name=taskRecipients][value=tasya]').check()
        a.locator('#taskForm [name=taskRecipients][value=anya]').check()
        a.screenshot(path=str(root/'multi-task-desktop.png'),full_page=True)
        for width in [375,390,768]:
            a.set_viewport_size({'width':width,'height':850})
            check('multi selector no horizontal overflow '+str(width),a.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
        a.set_viewport_size({'width':375,'height':850});a.screenshot(path=str(root/'multi-task-mobile.png'),full_page=True)
        a.set_viewport_size({'width':1366,'height':950})
        a.locator('#taskForm button[type=submit]').click()
        check('batch sync succeeds',sync(a))
        a.reload();a.wait_for_selector('#appShell:not(.hidden)')
        copies=[t for t in state(a)['tasks'] if t['title']=='QA independent multi task']
        check('two independent persisted tasks',len(copies)==2 and len({t['id'] for t in copies})==2 and {t['ownerId'] for t in copies}=={'tasya','anya'})
        t=login('qatasya');b=login('qaanya')
        check('recipient sees own task only',len([x for x in state(t)['tasks'] if x['title']=='QA independent multi task'])==1 and all(x['ownerId']=='tasya' for x in state(t)['tasks']))
        check('second recipient has independent copy',len([x for x in state(b)['tasks'] if x['title']=='QA independent multi task'])==1)
        nav(t,'tasks');t.locator('[data-action=addTask]').first.click()
        check('ordinary mentor cannot bulk-assign',t.locator('[name=taskRecipients]').count()==0)
        close(t)
        own_id=next(x['id'] for x in copies if x['ownerId']=='tasya')
        t.locator('[data-action=editTask][data-id="'+own_id+'"]').first.click()
        t.locator('#taskForm [name=status]').select_option('done');t.locator('#taskForm button[type=submit]').click()
        check('mentor completes own copy',sync(t));sync(a);sync(b)
        copies=[x for x in state(a)['tasks'] if x['title']=='QA independent multi task']
        check('one completion does not close others',next(x for x in copies if x['ownerId']=='tasya')['status']=='done' and next(x for x in copies if x['ownerId']=='anya')['status']=='todo')
        nav(a,'tasks');a.locator('[data-action=editTask][data-id="'+own_id+'"]').first.click()
        check('existing task edit unchanged',a.locator('#taskForm select[name=ownerId]').count()==1 and a.locator('[name=taskRecipients]').count()==0)
        a.locator('#taskForm [name=description]').fill('Updated single recipient copy');a.locator('#taskForm button[type=submit]').click();check('existing edit persists',sync(a))
        nav(t,'groups');check('mentor group table omits price column','Цена / мес.' not in t.locator('#pages').inner_text())
        check('mentor group summary omits revenue','Резерв выручки' not in t.locator('#pages').inner_text() and 'Текущая оценка' not in t.locator('#pages').inner_text())
        t.locator('[data-action=editGroup]').first.click()
        check('per-child revenue field absent','Выручка с ребёнка' not in t.locator('#modalBody').inner_text() and not t.locator('[name=monthlyPrice]').is_visible())
        group_id=t.locator('#groupForm').get_attribute('data-id');old_price=next(x for x in state(a)['groups'] if x['id']==group_id).get('monthlyPrice')
        t.locator('#groupForm [name=students]').fill('4');t.locator('#groupForm button[type=submit]').click()
        check('roster save does not send hidden zero price',sync(t));sync(a)
        g=next(x for x in state(a)['groups'] if x['id']==group_id)
        check('price preserved and students updated',g.get('monthlyPrice')==old_price and g['students']==4)
        nav(t,'mentor');t.screenshot(path=str(root/'mentor-salary-manual.png'),full_page=True)
        check('mentor cannot add or delete payroll',t.locator('#pages [data-action=addMentorPayment],#pages [data-action=deleteMentorPayment]').count()==0)
        nav(a,'mentor');a.locator('[data-action=addMentorPayment]').first.click()
        a.locator('#mentorPaymentForm [name=mentorId]').select_option('tasya')
        a.locator('#mentorPaymentForm [name=amount]').fill('555')
        a.locator('#mentorPaymentForm [name=reason]').fill('QA manual owner entry')
        a.locator('#mentorPaymentForm button[type=submit]').click();check('owner manual payroll save',sync(a));sync(t)
        check('mentor sees actual owner-entered payroll',any(x['amount']==555 and x['reason']=='QA manual owner entry' for x in state(t)['mentorPayroll']))
        denied=t.evaluate('''async () => {
          const sess=await fetch('/api/session').then(r=>r.json());
          const r=await fetch('/api/state',{method:'PATCH',headers:{'Content-Type':'application/json','X-CSRF-Token':sess.csrf},body:JSON.stringify({requestId:crypto.randomUUID(),changes:[{op:'set',path:['mentorPayroll','@qa-forbidden'],previous:{exists:false},value:{id:'qa-forbidden',mentorId:'tasya',date:'2026-09-10',category:'Премия',reason:'must fail',amount:900,status:'accrued'}}]})});return r.status;
        }''')
        check('server denies self-payroll',denied==403)
        m=login('qasofa',390);nav(m,'tasks');m.locator('[data-action=addTask]').first.click()
        check('manager can select multiple recipients',m.locator('[name=taskRecipients]').count()>=6)
        m.locator('[data-action=mt65Select][data-mode=mentors]').click()
        check('select-all-mentors excludes administrators',m.locator('[name=taskRecipients][value=tasya]').is_checked() and not m.locator('[name=taskRecipients][value=anya]').is_checked())
        close(m)
        nav(a,'tasks');a.locator('[data-action=addTask]').first.click()
        a.locator('#taskForm [name=title]').fill('QA retry batch')
        a.locator('[data-action=mt65Select][data-mode=none]').click()
        a.locator('[name=taskRecipients][value=tasya]').check();a.locator('[name=taskRecipients][value=anya]').check()
        dropped={'done':False}
        def lost_ack(route):
            if route.request.method=='PATCH' and not dropped['done']:
                dropped['done']=True
                route.fetch()
                route.fulfill(status=503,content_type='application/json',body=json.dumps({'error':'GATEWAY','message':'QA lost acknowledgment'}))
            else:route.continue_()
        a.route('**/api/state',lost_ack)
        a.locator('#taskForm button[type=submit]').click();sync(a);check('lost acknowledgment retried',sync(a))
        a.unroute('**/api/state',lost_ack);a.reload();a.wait_for_selector('#appShell:not(.hidden)')
        check('retry creates no duplicate tasks',len([x for x in state(a)['tasks'] if x['title']=='QA retry batch'])==2)
        check('no uncaught JavaScript exceptions',not errors,errors)
    except Exception as e:
        results.append({'name':'harness','ok':False,'detail':str(e)})
        traceback.print_exc()
    finally:
        browser.close()
        report={'scope':'Isolated local core service + exact pinned app bundle + new patch. No production users or records.','results':results,'pageErrors':errors,'summary':{'passed':sum(x['ok'] for x in results),'failed':sum(not x['ok'] for x in results)}}
        (root/'test-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
        print(json.dumps(report['summary']))
        if report['summary']['failed']: raise SystemExit(1)

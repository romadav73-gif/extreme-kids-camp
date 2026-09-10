from playwright.sync_api import sync_playwright
from pathlib import Path
import json, os
root=Path.cwd(); creds=json.loads((root/'.qa-auth.json').read_text()); results=[]
def check(name, value):
 results.append({'name':name,'ok':bool(value)}); print(name, bool(value), flush=True)
 if not value: raise AssertionError(name)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=os.environ.get('CHROME_PATH','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox'])
 a=browser.new_context(viewport={'width':1280,'height':900}); b=browser.new_context(viewport={'width':390,'height':844}); errors=[]
 for ctx in [a,b]: ctx.route('https://**/*',lambda r:r.abort())
 p=a.new_page();q=b.new_page()
 for page,username,password in [(p,'qa_owner',creds['owner']),(q,'qa_staff',creds['staff'])]:
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8879/login')
  page.locator('#login [name=username]').fill(username);page.locator('#login [name=password]').fill(password);page.locator('#login button').click();page.wait_for_selector('#appShell:not(.hidden)')
 check('staff has no owner settings/reset action',q.locator('#mainNav [data-view=settings]').count()==0 and q.locator('[data-action=p65Reset]').count()==0)
 p.locator('#mainNav [data-view=settings]').click();p.locator('[data-action=s65Users]').click();p.locator('[data-action=p65Reset]').wait_for()
 check('owner sees employee reset action',p.locator('[data-action=p65Reset]').count()==1)
 p.locator('[data-action=p65Reset]').click();check('old password is never displayed',p.locator('#p65New').input_value()=='' and 'хеш' in p.locator('#p65ResetForm').inner_text())
 p.locator('[data-action=p65Generate]').click();new=p.locator('#p65New').input_value();check('generator produces long unique new password',len(new)==24 and new!=creds['staff'])
 p.locator('[data-action=p65Reveal]').click();check('reveal only new password, not owners confirmation',p.locator('#p65New').get_attribute('type')=='text' and p.locator('#p65Owner').get_attribute('type')=='password')
 p.locator('[data-action=p65Reveal]').click()
 p.locator('#p65Confirm').fill(new+'X');p.locator('#p65Owner').fill(creds['owner']);p.locator('#p65ResetForm [name=confirmed]').check();p.locator('#p65ResetForm button[type=submit]').click()
 check('mismatched confirmation blocks save','не совпадают' in p.locator('.p65-feedback').inner_text())
 p.locator('#p65Confirm').fill(new);p.locator('#p65Owner').fill('not-the-owner-password')
 p.locator('#p65ResetForm button[type=submit]').click();p.locator('.p65-feedback').filter(has_text='Неверный пароль').wait_for()
 check('wrong owner password leaves employee session alive',q.evaluate("fetch('/api/session').then(r=>r.status)")==200)
 p.locator('#p65Owner').fill(creds['owner']);p.locator('#p65ResetForm button[type=submit]').click();p.wait_for_selector('#p65ResetForm',state='detached')
 check('successful reset removes secret fields',p.locator('#p65New').count()==0)
 check('owner remains signed in',p.evaluate("fetch('/api/session').then(r=>r.status)")==200)
 check('staff old browser session revoked',q.evaluate("fetch('/api/session').then(r=>r.status)")==401)
 q.goto('http://127.0.0.1:8879/login');q.locator('#login [name=username]').fill('qa_staff');q.locator('#login [name=password]').fill(new);q.locator('#login button').click();q.wait_for_selector('#appShell:not(.hidden)');check('staff signs in with new password and retains own role',q.locator('#mainNav [data-view=settings]').count()==0)
 check('passwords absent from local browser storage',p.evaluate('(secret)=>![localStorage,sessionStorage].some(s=>Object.values(s).some(v=>v.includes(secret)))',new))
 p.locator('[data-action=s65Users]').click();p.locator('[data-action=p65Reset]').click();check('password cannot be redisplayed after closing form',p.locator('#p65New').input_value()=='')
 p.set_viewport_size({'width':375,'height':812});check('mobile modal fits screen',p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
 p.screenshot(path=str(root/'password-reset-mobile.png'),full_page=True)
 p.set_viewport_size({'width':1280,'height':900});p.screenshot(path=str(root/'password-reset-desktop.png'),full_page=True)
 check('no runtime errors',not errors)
 browser.close()
(root/'browser-results.json').write_text(json.dumps({'passed':len(results),'failed':0,'tests':results},ensure_ascii=False,indent=2))

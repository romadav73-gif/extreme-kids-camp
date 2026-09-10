from playwright.sync_api import sync_playwright
from pathlib import Path
import json, shutil
root=Path.cwd(); profile=root/'browser-profile';shutil.rmtree(profile,ignore_errors=True);results=[];password=json.loads((root/'.qa-auth.json').read_text())['password']
def check(name,value):
 results.append({'name':name,'ok':bool(value)});print(name, bool(value), flush=True)
 if not value: raise AssertionError(name)
def nav(page):
 if page.viewport_size['width']<1000 and page.locator('.mobile-menu-btn').is_visible(): page.locator('.mobile-menu-btn').click()
 page.locator('#mainNav [data-view=calendar]').click()
with sync_playwright() as p:
 def launch(width=1280):
  ctx=p.chromium.launch_persistent_context(str(profile),executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'],viewport={'width':width,'height':900})
  ctx.route('https://**/*',lambda r:r.abort())
  return ctx
 ctx=launch();page=ctx.pages[0];errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8877/')
 page.locator('#login [name=username]').fill('qatest');page.locator('#login [name=password]').fill(password);page.locator('#login button[type=submit]').click();page.wait_for_selector('#appShell:not(.hidden)',timeout=15000);nav(page)
 check('mentor event cards visible despite no edit rights',page.locator('.mc65-event').count()==2)
 page.locator('.mc65-event').first.click();check('readonly event details opens','Арбузные зарубы' in page.locator('#modalTitle').inner_text())
 check('mentor cannot edit or see event finances',page.locator('[data-action=mc65Edit]').count()==0 and '9999999' not in page.locator('#modalBody').inner_text())
 page.keyboard.press('Escape');page.locator('[data-action=mc65Day][data-date="2026-09-12"]').click();check('select calendar day filters agenda',page.locator('.mc65-event').count()==1);page.locator('[data-action=mc65All]').click();check('all events restored',page.locator('.mc65-event').count()==2)
 page.screenshot(path=str(root/'calendar-desktop.png'),full_page=True)
 for width in [375,390,768]:
  page.set_viewport_size({'width':width,'height':800});check(f'no horizontal overflow at {width}',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
 page.set_viewport_size({'width':375,'height':812});page.screenshot(path=str(root/'calendar-mobile.png'),full_page=True);check('no runtime errors',not errors);ctx.close()
 ctx=launch(390);page=ctx.pages[0];page.goto('http://127.0.0.1:8877/');page.wait_for_selector('#appShell:not(.hidden)',timeout=15000);check('browser restart restores mentor without password',page.locator('#mainNav [data-view=settings]').count()==0);check('no long term token in localStorage',page.evaluate("Object.keys(localStorage).every(k=>!k.startsWith('EK65_SIGNIN'))"));nav(page);check('events visible after browser restart',page.locator('.mc65-event').count()==2)
 page.evaluate("const k='EK65_SIGNIN:'+location.pathname;const v=JSON.parse(sessionStorage.getItem(k));v.session='expired-fixture-session';sessionStorage.setItem(k,JSON.stringify(v));");page.reload();page.wait_for_selector('#appShell:not(.hidden)',timeout=15000);check('invalid expired access session auto resumes',page.locator('#mainNav [data-view=settings]').count()==0)
 page.locator('.role-button').click();page.locator('[data-action=s65Logout]').click();page.wait_for_selector('#login',timeout=15000);ctx.close()
 ctx=launch();page=ctx.pages[0];page.goto('http://127.0.0.1:8877/');page.wait_for_selector('#login');check('logout prevents remembered return',page.locator('#appShell').count()==0)
 page.locator('#login [name=username]').fill('qatest');page.locator('#login [name=password]').fill(password);page.locator('#login [name=rememberDevice]').uncheck();page.locator('#login button[type=submit]').click();page.wait_for_selector('#appShell:not(.hidden)',timeout=15000);ctx.close()
 ctx=launch();page=ctx.pages[0];page.goto('http://127.0.0.1:8877/');page.wait_for_selector('#login');check('shared-device unchecked does not persist',page.locator('#appShell').count()==0);ctx.close()
(root/'browser-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print('BROWSER_CHECKS',len(results))

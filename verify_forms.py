from playwright.sync_api import sync_playwright
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from threading import Thread
from pathlib import Path
import urllib.request, re, json
live='https://extreme-kids-growth-os-6-5-mi5pb3.v2.appdeploy.ai/'
Path('evidence').mkdir(exist_ok=True)
original=urllib.request.urlopen(live,timeout=30).read().decode()
Path('evidence/before.html').write_text(original)
assert '<form id="login"' in original and '<form id="activate"' in original
html=re.sub(r'<head[^>]*>',lambda m:m[0]+'<meta http-equiv="Content-Security-Policy" content="form-action \'none\'; base-uri \'self\'; object-src \'none\'">',original,count=1)
for f in ['login','activate']:
    html,n=re.subn(r'<form\b([^>]*\bid="'+f+r'"[^>]*)>',lambda m:'<form '+re.sub(r'\s(?:method|action)="[^"]*"','',m[1])+' method="post" action="#">',html)
    assert n==1
html=re.sub(r'<script\b[^>]*>[\s\S]*?</script>|<link\b[^>]*>','',html,flags=re.I)
class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def do_GET(self):
        self.send_response(200);self.send_header('Content-Type','text/html');self.end_headers();self.wfile.write(html.encode())
server=ThreadingHTTPServer(('127.0.0.1',8912),Handler)
Thread(target=server.serve_forever,daemon=True).start()
results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
    for js in [True,False]:
        for form in ['login','activate']:
            c=browser.new_context(java_script_enabled=js);p=c.new_page();logs=[];navigations=[]
            p.on('console',lambda e:logs.append(e.text));p.on('request',lambda r:navigations.append(r.url))
            p.goto('http://127.0.0.1:8912/',wait_until='domcontentloaded')
            if form=='activate':p.locator('#activate').evaluate('(e)=>e.hidden=false')
            if form=='login':p.locator('#login [name=username]').fill('synthetic-qa')
            p.locator('#'+form+' [name=password]').fill('SyntheticOnlyPassword12')
            if form=='activate':p.locator('#activate [name=repeat]').fill('SyntheticOnlyPassword12')
            p.locator('#'+form+' button').evaluate('(e)=>e.click()');p.wait_for_timeout(200)
            ok=any('form-action' in x for x in logs) and not any('password=' in x or 'SyntheticOnlyPassword' in x for x in navigations+[p.url])
            row={'form':form,'javascript':js,'native_form_blocked':ok,'method':p.locator('#'+form).get_attribute('method')}
            print(json.dumps(row),flush=True);results.append(row)
            assert ok and row['method']=='post'
            c.close()
    browser.close()
Path('evidence/form-results.json').write_text(json.dumps(results,indent=2))
server.shutdown()

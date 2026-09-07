'use strict';
(()=>{const params=new URLSearchParams(location.hash.slice(1));const invite=params.get('invite');const msg=document.getElementById('message');
 // Old workspace/key fragments are never sent to the backend or used as identity.
 if(location.hash)history.replaceState(null,'',location.pathname);
 if(invite){document.getElementById('login').hidden=true;document.getElementById('activate').hidden=false;document.getElementById('heading').textContent='Ваш кабинет готов.';document.getElementById('intro').textContent='Задайте пароль. Приглашение можно использовать только один раз.'}
 else fetch('/api/session',{credentials:'same-origin',cache:'no-store'}).then(r=>{if(r.ok)location.replace('/app')}).catch(()=>{});
 for(const id of ['login','activate'])document.getElementById(id).addEventListener('submit',async e=>{e.preventDefault();const f=e.target,b=f.querySelector('button'),v=Object.fromEntries(new FormData(f));if(id==='activate'&&v.password!==v.repeat){msg.textContent='Пароли не совпадают.';return}b.disabled=true;msg.textContent='Проверяем…';try{const body=id==='activate'?{token:invite,password:v.password}:v;const r=await fetch('/api/'+id,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(body)});const result=await r.json();if(!r.ok)throw Error(result.message||'Не удалось войти.');f.reset();location.replace('/app')}catch(e){msg.textContent=e.message}finally{b.disabled=false}});
})();

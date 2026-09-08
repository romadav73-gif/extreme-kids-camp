// R3: account lifecycle controls, local-cache quarantine and visible sync failures.
let h65Busy=false,h65LoggingOut=false,h65Users=[];
const h65Roles={mentor:'Наставник',admin:'Администратор',manager:'Управляющая',stas:'Руководитель направления',team:'Командный экран'};
function h65Invitation(r){const link=location.origin+'/login#invite='+r.token;openModal({title:'Личное приглашение',subtitle:'Одноразовое · 24 часа. Старые сеансы и приглашения отозваны.',body:`<input class="input" readonly value="${esc(link)}"><p>Передайте лично сотруднику. Не публикуйте в общем рабочем чате.</p>`})}
function h65PasswordModal(){openModal({title:'Смена пароля',subtitle:'После смены остальные сеансы будут закрыты. Несохранённые изменения сначала отправляются на сервер.',body:`<form id="h65PasswordForm" class="form-grid"><div class="field full"><label>Текущий пароль</label><input class="input" name="oldPassword" type="password" required maxlength="128" autocomplete="current-password"></div><div class="field full"><label>Новый пароль · минимум 12 символов</label><input class="input" name="password" type="password" required minlength="12" maxlength="128" autocomplete="new-password"></div><div class="field full"><label>Повторите новый пароль</label><input class="input" name="confirmPassword" type="password" required minlength="12" maxlength="128" autocomplete="new-password"></div><p class="full" id="h65PasswordError" role="alert"></p>${formActions('Сменить пароль')}</form>`})}
function h65AccessModal(id){const u=h65Users.find(x=>x.id===id);if(!u)return;openModal({title:'Права · '+u.displayName,subtitle:'Изменение действует на сервере. Все текущие сеансы сотрудника будут закрыты.',body:`<form id="h65AccessForm" class="form-grid"><input type="hidden" name="userId" value="${esc(u.id)}"><div class="field"><label>Роль</label><select class="select" name="role">${Object.entries(h65Roles).map(([v,t])=>`<option value="${v}" ${u.role===v?'selected':''}>${t}</option>`).join('')}</select></div><div class="field"><label><input type="checkbox" name="management" ${(u.scopes||[]).includes('management')?'checked':''}> Старший наставник: доступ к работе команды</label><small>Дополнительные полномочия применяются только к роли наставника.</small></div>${formActions('Изменить права')}</form>`})}
s65Users=async function(){h65Users=await s65Fetch('/api/users');const users=h65Users;
 const list=users.map(u=>`<div class="compact-item"><div class="item-main"><b>${esc(u.displayName)} · ${esc(h65Roles[u.role]||'Собственник')}</b><small>${esc(u.username)} · ${u.active?(u.activated?'активен':'ждёт активации'):'отключён'}</small></div>${u.id!==s65Actor.id&&u.role!=='owner'?`<div class="hero-actions" style="margin-top:0">${u.active?`<button class="btn btn-ghost" data-action="h65Access" data-id="${esc(u.id)}">Права</button><button class="btn btn-ghost" data-action="s65Revoke" data-id="${esc(u.id)}">Отключить</button>`:''}<button class="btn btn-ghost" data-action="h65Reissue" data-id="${esc(u.id)}">Новое приглашение</button></div>`:''}</div>`).join('');
 const people=state.people.filter(p=>p.id!==s65Actor.personId&&p.active!==false&&!p.deletedAt&&!p.archivedAt&&!users.some(u=>u.personId===p.id));
 openModal({title:'Доступы сотрудников',body:`<div class="compact-list">${list}</div><p>Архивация карточки сотрудника автоматически отключает его учётную запись. Зарплатная история сохраняется.</p>${people.length?`<h3>Новый доступ</h3><form id="s65InviteForm" class="form-grid"><div class="field"><label>Сотрудник</label><select class="select" name="personId">${people.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></div><div class="field"><label>Логин (латиницей)</label><input class="input" name="username" required pattern="[a-z0-9][a-z0-9_.-]{2,63}" maxlength="64"></div><div class="field"><label>Роль</label><select class="select" name="role">${Object.entries(h65Roles).map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></div><div class="field"><label><input type="checkbox" name="management"> Полномочия старшего наставника</label></div>${formActions('Создать приглашение')}</form>`:'<p>Для нового доступа сначала добавьте карточку сотрудника. Для существующей учётной записи используйте «Новое приглашение».</p>'}`});
};
const h65Click=handleClick;
handleClick=function(e){const el=e.target.closest('[data-action]'),a=el?.dataset.action;
 if(a==='h65Password'){e.preventDefault();return h65PasswordModal()}
 if(a==='h65Access'){e.preventDefault();return h65AccessModal(el.dataset.id)}
 if(a==='h65Reissue'){e.preventDefault();if(h65Busy||!confirm('Отозвать прежние сеансы и создать новое одноразовое приглашение?'))return;h65Busy=true;s65Fetch('/api/reissue',{method:'POST',body:JSON.stringify({userId:el.dataset.id})}).then(h65Invitation).catch(err=>toast('Приглашение не создано',err.message,'error')).finally(()=>{h65Busy=false});return}
 if(a==='s65Logout'){
  e.preventDefault();if(h65LoggingOut)return;
  if((s65Flight||s65Conflict||s65Changes().length)&&!confirm('Есть несохранённые изменения. Выйти и удалить локальный черновик?'))return;
  h65LoggingOut=true;clearInterval(s65Polling);clearTimeout(saveTimer);
  (async()=>{if(s65Promise)await s65Promise;const key=s65LocalKey();await s65Fetch('/api/logout',{method:'POST',body:'{}'});await s65CacheSave;localStorage.removeItem(key);state=null;location.replace('/login')})().catch(err=>{h65LoggingOut=false;setupAutoSync();toast('Выход не завершён',err.message,'error')});return;
 }
 return h65Click(e);
};
const h65Submit=handleSubmit;
handleSubmit=function(e){const f=e.target;
 if(f.id==='h65PasswordForm'||f.id==='h65AccessForm'){
  e.preventDefault();if(h65Busy)return;const v=formValues(f),button=f.querySelector('button[type=submit]');
  if(f.id==='h65PasswordForm'&&v.password!==v.confirmPassword){f.querySelector('#h65PasswordError').textContent='Пароли не совпадают.';return}
  h65Busy=true;if(button)button.disabled=true;
  (async()=>{
   if(f.id==='h65PasswordForm'){
    if(!(await syncNow({quiet:true}))||s65Flight||s65Conflict||s65Changes().length)throw Error('Не все изменения сохранены. Сначала восстановите связь или разберите конфликт.');
    const key=s65LocalKey();clearInterval(s65Polling);clearTimeout(saveTimer);
    try{await s65Fetch('/api/password',{method:'POST',body:JSON.stringify({oldPassword:v.oldPassword,password:v.password})});await s65CacheSave;localStorage.removeItem(key);location.replace('/app')}
    catch(err){setupAutoSync();throw err}
   }else{
    await s65Fetch('/api/access',{method:'POST',body:JSON.stringify({userId:v.userId,role:v.role,management:f.elements.management.checked})});await s65Users();toast('Права изменены','Старые сеансы отозваны. Сотруднику нужно войти заново.');
   }
  })().catch(err=>{const message=f.querySelector('#h65PasswordError');if(message)message.textContent=err.message;else toast('Изменение не выполнено',err.message,'error')}).finally(()=>{h65Busy=false;if(button)button.disabled=false});return;
 }
 return h65Submit(e);
};
const h65Boot=boot;
boot=async function(){await h65Boot();if(!state||!s65Actor)return;
 const oldPrefix=`EK65_SECURE:${s65Actor.workspaceId}:${s65Actor.id}`;
 let oldCache=false;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(oldPrefix)&&k!==s65LocalKey())oldCache=true}
 if(oldCache)toast('Обнаружен черновик прежнего доступа','Он не загружается после смены прав или пароля. Данные старого черновика не удалены.');
 const button=document.createElement('button');button.className='btn btn-ghost';button.dataset.action='h65Password';button.textContent='Пароль';document.querySelector('.top-actions')?.appendChild(button);
};
window.EK65SecureStatus.version='6.5-security.3';

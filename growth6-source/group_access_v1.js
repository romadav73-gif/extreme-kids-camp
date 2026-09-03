// MANAGEMENT_GROUP_ACCESS_V1_START
const MANAGEMENT_GROUP_ACCESS_BUILD='2026.09.03-management-all-groups';

function canSeeAllGroups(){
  return currentRole==='owner'||currentRole==='manager'||currentRole==='stas'||isIvanSeniorMentor();
}
function personalGroupMentorId(){
  return currentRole==='mentor'?mentorViewerId():'';
}
const __activeGroupsManagementBase=activeGroups;
function groupScopeList(){
  const list=__activeGroupsManagementBase();
  if(canSeeAllGroups())return list;
  const mentorId=personalGroupMentorId();
  return mentorId?list.filter(g=>g.mentorId===mentorId):[];
}
function groupVisibleToCurrentUser(group){
  return Boolean(group)&&(canSeeAllGroups()||group.mentorId===personalGroupMentorId());
}
function groupAccessDescription(){
  if(currentRole==='owner')return'Роман видит все активные группы клуба для контроля.';
  if(currentRole==='manager')return'Софа видит все активные группы клуба для операционного контроля.';
  if(currentRole==='stas')return'Стас видит все активные группы клуба как руководитель направления.';
  if(isIvanSeniorMentor())return'Ваня видит все активные группы клуба как старший наставник.';
  const mentorId=personalGroupMentorId();
  return mentorId?`В кабинете ${person(mentorId).name} отображаются только его группы.`:'Группы других наставников недоступны.';
}

const __renderGroupsManagementBase=renderGroups;
renderGroups=function(){
  const originalActiveGroups=activeGroups;
  const previousMentorFilter=state.ui.groupMentor;
  activeGroups=groupScopeList;
  if(!canSeeAllGroups())state.ui.groupMentor='all';
  try{
    let html=__renderGroupsManagementBase();
    const note=`<div class="task-access-note"><i></i><div><b>${esc(canSeeAllGroups()?'Контроль всех групп':'Личный доступ к группам')}</b><small>${esc(groupAccessDescription())}</small></div></div>`;
    html=html.replace('<div class="toolbar">',note+'<div class="toolbar">');
    return html;
  }finally{
    activeGroups=originalActiveGroups;
    state.ui.groupMentor=previousMentorFilter;
  }
};

const __navBadgeManagementGroupsBase=navBadge;
navBadge=function(view){
  if(view==='groups')return loadStats(groupScopeList()).free||'';
  return __navBadgeManagementGroupsBase(view);
};

const __groupModalManagementBase=groupModal;
groupModal=function(item=null){
  if(item&&!groupVisibleToCurrentUser(item)){
    toast('Эта группа недоступна','В личном кабинете наставника доступны только его группы.','error');
    return;
  }
  __groupModalManagementBase(item);
  if(canSeeAllGroups()||currentRole!=='mentor')return;
  const form=$('#groupForm');if(!form)return;
  const select=form.querySelector('[name="mentorId"]');if(!select)return;
  const field=select.closest('.field');if(!field)return;
  const mentorId=personalGroupMentorId(),p=person(mentorId);
  field.innerHTML=`<label>Наставник</label><div class="task-fixed-owner"><span class="avatar small">${esc(p.avatar||String(p.name||'?')[0])}</span><b>${esc(p.name)}</b></div><input type="hidden" name="mentorId" value="${esc(mentorId)}">`;
};

const __handleSubmitManagementGroupsBase=handleSubmit;
handleSubmit=function(e){
  const form=e.target;
  if(form instanceof HTMLFormElement&&form.id==='groupForm'&&!canSeeAllGroups()&&currentRole==='mentor'){
    const mentor=form.querySelector('[name="mentorId"]');
    if(mentor)mentor.value=personalGroupMentorId();
  }
  return __handleSubmitManagementGroupsBase(e);
};

const __handleClickManagementGroupsBase=handleClick;
handleClick=function(e){
  const el=e.target.closest('[data-action]');
  if(el){
    const action=el.dataset.action;
    if((action==='editGroup'||action==='deleteGroup')&&!canSeeAllGroups()&&currentRole==='mentor'){
      const group=state.groups.find(g=>g.id===el.dataset.id);
      if(!groupVisibleToCurrentUser(group)){
        toast('Эта группа недоступна','Наставник может работать только со своими группами.','error');
        return;
      }
    }
  }
  return __handleClickManagementGroupsBase(e);
};

const __bootManagementGroupsBase=boot;
boot=async function(){
  const result=await __bootManagementGroupsBase();
  if(window.EKGrowthOS)window.EKGrowthOS={...window.EKGrowthOS,managementGroupAccessBuild:MANAGEMENT_GROUP_ACCESS_BUILD,canSeeAllGroups:()=>canSeeAllGroups(),visibleGroups:()=>groupScopeList()};
  return result;
};
// MANAGEMENT_GROUP_ACCESS_V1_END

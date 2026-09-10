'use strict';

// Apply only to the hash-verified 6.5 base bundle. Never changes stored records.
module.exports = function applyMentorWorkUi(source) {
  function replaceOnce(before, after) {
    if (source.split(before).length !== 2) {
      throw new Error('Mentor work UI: source anchor changed; build stopped.');
    }
    source = source.replace(before, after);
  }

  replaceOnce(
    'function groupRevenueStats(list=activeGroups()){',
    "function mentorRevenueRestricted(){return ['mentor','stas'].includes(currentRole);}\nfunction groupRevenueStats(list=activeGroups()){"
  );

  replaceOnce(
    "pageHead('РАСПИСАНИЕ И ДЕНЬГИ','Группы и загрузка','Наставник → группа → вместимость → дети → свободные места → потенциальная выручка',",
    "pageHead(mentorRevenueRestricted()?'РАСПИСАНИЕ И ЗАГРУЗКА':'РАСПИСАНИЕ И ДЕНЬГИ','Группы и загрузка',mentorRevenueRestricted()?'Расписание, вместимость, дети и свободные места':'Наставник → группа → вместимость → дети → свободные места → потенциальная выручка',"
  );

  replaceOnce(
    "${metricCard('Текущая оценка',compactMoney(rev.current),'На основе цены в карточках групп','revenue',rev.potential?rev.current/rev.potential*100:null)}${metricCard('Резерв выручки',compactMoney(rev.lost),'Если заполнить свободные места','analytics',null)}",
    "${mentorRevenueRestricted()?metricCard('Групп в расписании',String(list.length),'С учётом выбранных фильтров','calendar'):metricCard('Текущая оценка',compactMoney(rev.current),'На основе цены в карточках групп','revenue',rev.potential?rev.current/rev.potential*100:null)}${mentorRevenueRestricted()?metricCard('Детей в группах',String(ls.students),'Сумма заполненных мест','users'):metricCard('Резерв выручки',compactMoney(rev.lost),'Если заполнить свободные места','analytics',null)}"
  );

  replaceOnce(
    '<th>Свободно</th><th>Цена / мес.</th><th></th>',
    "<th>Свободно</th>${mentorRevenueRestricted()?'':'<th>Цена / мес.</th>'}<th></th>"
  );
  replaceOnce(
    "<td>${g.monthlyPrice?money(g.monthlyPrice):'не указана'}</td>",
    "${mentorRevenueRestricted()?'':`<td>${g.monthlyPrice?money(g.monthlyPrice):'не указана'}</td>`}"
  );
  replaceOnce(
    '<div class="field"><label>Выручка с ребёнка / мес.</label><input class="input" type="number" min="0" name="monthlyPrice" value="${g.monthlyPrice||0}"></div>',
    '${mentorRevenueRestricted()?\'\':`<div class="field"><label>Выручка с ребёнка / мес.</label><input class="input" type="number" min="0" name="monthlyPrice" value="${g.monthlyPrice||0}"></div>`}'
  );

  // Non-financial actors must not create a zero-valued price on saving a group.
  // Keep the non-editable schedule flags when an ordinary mentor updates pupils.
  replaceOnce(
    "students:num(v.students),monthlyPrice:num(v.monthlyPrice),prime:/1[6-9]:|20:|Суббота|Воскресенье/.test(v.time+' '+v.day),status:'active',updatedAt:stamp",
    "students:num(v.students),...(mentorRevenueRestricted()?{}:{monthlyPrice:num(v.monthlyPrice)}),prime:mentorRevenueRestricted()&&!canSeeAllGroups()&&old?old.prime:/1[6-9]:|20:|Суббота|Воскресенье/.test(v.time+' '+v.day),status:old?.status||'active',updatedAt:stamp"
  );
  replaceOnce(
    'Каждая сумма и комментарий Романа отображаются отдельно',
    'Роман вручную указывает сумму и комментарий. Загрузка групп не пересчитывает зарплату автоматически.'
  );
  return source;
};

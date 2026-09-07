// SOFA65_CLEANUP_V4_1_START
// V3 stored the previous Sofia home function in renderManager by reference.
// Rebind after the V4 home implementation so the cleaned action-first dashboard is actually rendered.
renderManager=sofa65ManagerHome;

// A form can stay open while another device changes a different field.
// Stamp only values that this device actually changed; otherwise a later submit could
// make an untouched stale field look newer and overwrite the other device's edit.
handleSubmit=function(e){
  const f=e.target;
  if(f instanceof HTMLFormElement){
    const stamp=nowIso();
    if(f.id==='sofa65NumbersForm'){
      const d=sofa3EnsureDay();
      for(const k of ['unanswered','attended','sold','renewDue','renewDone','expected','unpaidClients','unpaidAmount']){
        const next=num(f.elements[k]?.value);
        if(Number(d.metrics?.[k]||0)!==Number(next||0))sofa65V4Stamp(d,`metrics.${k}`,stamp);
      }
    }
    if(f.id==='sofa3PrioritiesForm'){
      const d=sofa3EnsureDay();
      for(let i=0;i<3;i++){
        const next=f.elements[`p${i}`]?.value||'';
        if(String(d.priorities?.[i]||'')!==String(next))sofa65V4Stamp(d,`priorities.${i}`,stamp);
      }
    }
    if(f.id==='sofa3WeekForm'){
      const w=sofa3EnsureWeek();
      const target=num(f.elements.revenueTarget?.value);
      if(Number(w.revenueTarget||0)!==Number(target||0))sofa65V4Stamp(w,'revenueTarget',stamp);
      for(let i=0;i<3;i++){
        const next=f.elements[`result${i}`]?.value||'';
        if(String(w.results?.[i]||'')!==String(next))sofa65V4Stamp(w,`results.${i}`,stamp);
      }
      for(const k of ['risk','team','parents','improvement','decision']){
        const next=f.elements[k]?.value||'';
        if(String(w[k]||'')!==String(next))sofa65V4Stamp(w,k,stamp);
      }
    }
  }
  // Skip the first V4 submit wrapper (it stamped every visible field) and continue
  // with the real Sofia/base submit handler, which writes values and performs normal sync.
  return __handleSubmitSofa65V4(e);
};

// Stronger conflict test: different devices may legitimately win on different fields.
sofa65V4MergeSelfTest=function(){
  const a={
    updatedAt:'2026-09-04T10:03:00.000Z',
    checks:{open_clean:true},metrics:{unanswered:9,expected:1000},priorities:['A','',''],rhythm:{0:false},notes:{},
    _fieldUpdatedAt:{
      'checks.open_clean':'2026-09-04T10:04:00.000Z',
      'metrics.unanswered':'2026-09-04T10:05:00.000Z',
      'metrics.expected':'2026-09-04T10:01:00.000Z'
    }
  };
  const b={
    updatedAt:'2026-09-04T10:04:00.000Z',
    checks:{open_clean:false},metrics:{unanswered:1,expected:5000},priorities:['A','',''],rhythm:{0:false},notes:{},
    _fieldUpdatedAt:{
      'checks.open_clean':'2026-09-04T09:59:00.000Z',
      'metrics.unanswered':'2026-09-04T10:02:00.000Z',
      'metrics.expected':'2026-09-04T10:06:00.000Z'
    }
  };
  const m=sofa65V4MergeDay(a,b);
  return m.checks.open_clean===true&&Number(m.metrics.unanswered)===9&&Number(m.metrics.expected)===5000;
};
// SOFA65_CLEANUP_V4_1_END

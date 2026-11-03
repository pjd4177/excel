// Just Do it Statistics — 엑셀통계 · 고급통계 예시 데이터
// 엑셀통계: 사회복지사의 자기효능감과 소진 (60명)
// 고급통계: 사회복지사의 직무만족 영향요인 (200명)
(()=>{
const $=s=>document.querySelector(s);
function rng(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function tools(seed){const r=rng(seed);const n=()=>{let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
  return {r,n,s5:x=>Math.round(Math.min(5,Math.max(1,x))*100)/100,lik:x=>Math.min(5,Math.max(1,Math.round(x))),pick:a=>a[Math.floor(r()*a.length)]};}

function statSample(){const {r,n,s5,pick}=tools(51);
  const L=[['번호','성별','연령대','근무기관','이직의도','자격','경력','자기효능감','직무스트레스','소진_사전','소진_사후']];
  for(let i=1;i<=60;i++){const sex=r()<.7?'여':'남',age=pick(['20대','30대','30대','40대 이상']),org=pick(['이용시설','생활시설','공공기관']);
    const yrs=Math.max(1,Math.round((age==='20대'?3:age==='30대'?8:15)+n()*3)),lic=r()<.62?'1급':'2급';
    const eff=s5(3.3+.03*yrs+(lic==='1급'?.15:0)+n()*.45),str=s5(3.1+(org==='생활시설'?.45:org==='공공기관'?.1:0)+n()*.5);
    const pre=s5(1.3+.62*str-.38*(eff-3.5)+(org==='생활시설'?.25:0)+n()*.32),post=s5(pre-.32+n()*.26);
    const turn=r()<1/(1+Math.exp(-(-.6+2.0*(pre-3))))?'있음':'없음';
    L.push([i,sex,age,org,turn,lic,yrs,eff,str,pre,post]);}
  return L;}

function advSample(){const {r,n,s5,lik}=tools(61);
  const area=['보수','승진','동료관계','업무량','근무환경'],imp=[4.5,3.9,4.2,4.3,3.8],perf=[2.7,2.9,4.1,2.6,3.6];
  const H=['번호','성별','기관유형','이직의도','경력','근속기간','이직',
    ...[1,2,3].map(k=>'효능'+k),...[1,2,3].map(k=>'스트레스'+k),...[1,2,3].map(k=>'소진'+k),...[1,2,3].map(k=>'만족'+k),
    ...area.map(a=>'중요_'+a),...area.map(a=>'만족_'+a),'자기효능감','직무스트레스','슈퍼비전','조직지원','소진','직무만족'];
  const L=[H];
  for(let i=1;i<=200;i++){const sex=r()<.72?'여':'남',type=r()<.55?'이용시설':'생활시설',yrs=Math.max(1,Math.round(7+n()*4.5));
    const fe=n(),fs=n()+(type==='생활시설'?.35:0),sup=n(),org=n();
    const fb=.55*fs-.32*fe-.2*sup+.75*n(),fj=.3*fe-.22*fs+.22*sup+.25*org-.32*fb+.32*fs*sup+.65*n();
    const items=(f,m)=>[0,1,2].map(()=>lik(m+.8*f+.55*n()));
    const ie=items(fe,3.6),is=items(fs,3.2),ib=items(fb,2.8),ij=items(fj,3.3),avg=a=>Math.round(a.reduce((x,y)=>x+y,0)/a.length*100)/100;
    const jobsat=avg(ij),burn=avg(ib);
    const rate=.011*Math.exp(-.9*(jobsat-3.3)+.4*(burn-2.8)+(type==='생활시설'?.45:0)),T=-Math.log(r()||1e-9)/rate,C=6+r()*54,dur=Math.round(Math.min(T,C));
    const turn=r()<1/(1+Math.exp(-(-.7+1.3*(burn-2.8)-1.0*(jobsat-3.3))))?'있음':'없음';
    L.push([i,sex,type,turn,yrs,Math.max(1,dur),T<=C?1:0,...ie,...is,...ib,...ij,
      ...imp.map(m=>lik(m+.7*n())),...perf.map(m=>lik(m+.8*n()+.25*fj)),
      avg(ie),avg(is),s5(3.4+.75*sup),s5(3.1+.7*org),burn,jobsat]);}
  return L;}

// 상단 [예시 데이터]: 보고 있는 터미널에 맞는 예시
sample=function(){const rows=document.body.dataset.term==='adv'?advSample():statSample();return rows.map(r=>r.join('\t')).join('\n');};

// 예시 변수명이 있으면 분석별 기본 선택을 주제에 맞게
const _setData=setData;
setData=function(d){_setData(d);const has=n=>d.cols.some(c=>c.name===n),pick=(id,v)=>{if(v&&has(v)&&$(id))$(id).value=v;};
  const setC=(id,names)=>{const ok=names.filter(has);if(ok.length)setChecks(id,ok);};
  if(has('소진_사전')&&has('자기효능감')){
    pick('#tt-g','성별');pick('#tt-dv','자기효능감');pick('#an-g','근무기관');pick('#an-dv','소진_사전');pick('#os-v','자기효능감');
    pick('#cr-row','근무기관');pick('#cr-col','이직의도');setC('#freq-vars',['성별','연령대','근무기관','이직의도','자격']);
    setC('#desc-vars',['경력','자기효능감','직무스트레스','소진_사전','소진_사후']);setC('#corr-vars',['경력','자기효능감','직무스트레스','소진_사전']);
    fillLevels();}
  if(has('직무만족')&&has('슈퍼비전')){
    pick('#rg-dv','직무만족');setC('#rg-ivs',['자기효능감','직무스트레스','슈퍼비전','조직지원']);
    pick('#lg-dv','이직의도');setC('#lg-ivs',['소진','직무만족']);fillEvent();
    pick('#me-x','직무스트레스');pick('#me-m','소진');pick('#me-y','직무만족');
    pick('#md-x','직무스트레스');pick('#md-m','슈퍼비전');pick('#md-y','직무만족');
    pick('#da-g','이직의도');setC('#da-vars',['자기효능감','소진','직무만족']);setC('#cl-vars',['자기효능감','소진','직무만족']);
    pick('#sv-t','근속기간');pick('#sv-e','이직');fillSvEv();pick('#sv-g','기관유형');setC('#sv-cov',['직무만족']);}
};
})();

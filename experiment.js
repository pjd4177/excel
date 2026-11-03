// Just Do it Statistics — 실험조사 터미널 (전실험 · 준실험 · 진실험 설계)
// index.html의 통계 함수(mean, sd, pT, pF, tCrit, ols, levene, meanBars, yAxis, f, fp, pEq, sigP, table, note, err, esc, parseText, build)를 함께 씁니다.
(()=>{
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const store={get(k){try{return localStorage.getItem(k);}catch{return null;}},set(k,v){try{localStorage.setItem(k,v);}catch{}}};
const C=['var(--q1)','var(--q4)','var(--q3)','var(--q2)'];

// ================= 통계 도우미 =================
function indT(a,b){
  const n1=a.length,n2=b.length;if(n1<2||n2<2)throw new Error('각 집단에 2명 이상이 필요합니다.');
  const m1=mean(a),m2=mean(b),v1=variance(a),v2=variance(b),df=n1+n2-2,sp=Math.sqrt(((n1-1)*v1+(n2-1)*v2)/df);
  const t=(m1-m2)/(sp*Math.sqrt(1/n1+1/n2)),se2=v1/n1+v2/n2,tw=(m1-m2)/Math.sqrt(se2),dfw=se2**2/((v1/n1)**2/(n1-1)+(v2/n2)**2/(n2-1));
  const lv=levene([a,b]),eq=!(lv.p<0.05),T=eq?t:tw,D=eq?df:dfw,se=eq?sp*Math.sqrt(1/n1+1/n2):Math.sqrt(se2),c=tCrit(D)*se;
  return {n1,n2,m1,m2,s1:Math.sqrt(v1),s2:Math.sqrt(v2),diff:m1-m2,t:T,df:D,p:pT(T,D),lo:m1-m2-c,hi:m1-m2+c,d:(m1-m2)/sp,lev:lv,eq,tS:t,dfS:df};
}
function pairT(x,y){// y - x
  const d=y.map((v,i)=>v-x[i]),n=d.length;if(n<2)throw new Error('짝지어진 자료가 2쌍 이상 필요합니다.');
  const md=mean(d),sdd=sd(d),se=sdd/Math.sqrt(n),t=md/se,df=n-1,c=tCrit(df)*se;
  return {n,md,sdd,t,df,p:pT(t,df),lo:md-c,hi:md+c,dz:md/sdd,r:pearson(x,y)};
}
const effD=d=>{const a=Math.abs(d);return a>=.8?'큰':a>=.5?'중간':a>=.2?'작은':'매우 작은';};
const effE=e=>e>=.14?'큰':e>=.06?'중간':e>=.01?'작은':'매우 작은';
const tStr=(t,df,p)=>`<i>t</i>(${Number.isInteger(df)?df:f(df,2)}) = ${f(t,2)}, ${pEq(p)}`;
const fStr=(F,d1,d2,p)=>`<i>F</i>(${d1}, ${d2}) = ${f(F,2)}, ${pEq(p)}`;
const ms=a=>a.length?`${f(mean(a),2)} (${f(a.length>1?sd(a):NaN,2)})`:'-';
const sig=p=>p<0.05;
const jo=(w,a,b)=>{const c=String(w).charCodeAt(String(w).length-1);return w+(c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28?a:b);};
const W=(s)=>`<h3>논문 결과 서술 예시</h3><div class="e-write">${s}</div>`;
function sse(y,X){return X[0].length?ols(y,X).sse:sum(y.map(v=>(v-mean(y))**2));}

// ================= 그래프 =================
function linePlot(xl,series,yl='삶의 만족'){
  const Wd=520,H=290,L=52,R=120,T=22,B=42;
  const all=series.flatMap(s=>s.pts.flatMap(p=>[p.lo??p.m,p.hi??p.m])).filter(isFinite);
  let lo=Math.min(...all),hi=Math.max(...all);const pad=(hi-lo)*.25||.5;lo-=pad;hi+=pad;
  const ax=yAxis(Wd,H,L,R,T,B,lo,hi,yl),sx=i=>L+((i+.5)/xl.length)*(Wd-L-R);
  let s=`<svg class="plot" style="max-width:${Wd}px" viewBox="0 0 ${Wd} ${H}" role="img" aria-label="${esc(yl)} 평균 변화 그래프">`+ax.g;
  xl.forEach((l,i)=>s+=`<text x="${sx(i)}" y="${H-B+20}" text-anchor="middle">${esc(l)}</text>`);
  series.forEach((sr,k)=>{const c=sr.color||C[k%C.length],P=sr.pts.map((p,i)=>({...p,i})).filter(p=>isFinite(p.m));
    s+=`<polyline points="${P.map(p=>`${sx(p.i)},${ax.sy(p.m)}`).join(' ')}" style="fill:none;stroke:${c};stroke-width:3;${sr.dash?'stroke-dasharray:6 5':''}"/>`;
    P.forEach(p=>{if(isFinite(p.lo))s+=`<path d="M${sx(p.i)},${ax.sy(p.lo)}V${ax.sy(p.hi)}M${sx(p.i)-6},${ax.sy(p.lo)}H${sx(p.i)+6}M${sx(p.i)-6},${ax.sy(p.hi)}H${sx(p.i)+6}" style="stroke:${c};stroke-width:1.4;fill:none"/>`;
      s+=`<circle cx="${sx(p.i)}" cy="${ax.sy(p.m)}" r="5.5" style="fill:var(--card);stroke:${c};stroke-width:2.5"/>`+
        `<text class="lbl" x="${sx(p.i)+(k%2?-10:10)}" y="${ax.sy(p.m)+(k%2?16:-9)}" text-anchor="${k%2?'end':'start'}">${f(p.m,2)}${p.tag?' · '+esc(p.tag):''}</text>`;});
    const last=P[P.length-1];if(last)s+=`<text class="lbl" x="${Wd-R+14}" y="${ax.sy(last.m)+4}" style="fill:${c};font-weight:500">${esc(sr.name)}</text>`;});
  return s+'</svg>';
}
function spaghetti(pre,post,yl){
  const Wd=420,H=280,L=52,R=20,T=20,B=40,all=pre.concat(post);let lo=Math.min(...all),hi=Math.max(...all);const pad=(hi-lo)*.08||.5;lo-=pad;hi+=pad;
  const ax=yAxis(Wd,H,L,R,T,B,lo,hi,yl),x0=L+60,x1=Wd-R-60;let s=`<svg class="plot" style="max-width:${Wd}px" viewBox="0 0 ${Wd} ${H}" role="img" aria-label="개인별 사전 사후 변화">`+ax.g;
  pre.slice(0,80).forEach((v,i)=>s+=`<line x1="${x0}" y1="${ax.sy(v)}" x2="${x1}" y2="${ax.sy(post[i])}" style="stroke:${post[i]>=v?'var(--q1)':'var(--q4)'};stroke-opacity:.28;stroke-width:1.3"/>`);
  s+=`<line x1="${x0}" y1="${ax.sy(mean(pre))}" x2="${x1}" y2="${ax.sy(mean(post))}" style="stroke:var(--ink);stroke-width:4"/>`+
    `<circle cx="${x0}" cy="${ax.sy(mean(pre))}" r="6" style="fill:var(--ink)"/><circle cx="${x1}" cy="${ax.sy(mean(post))}" r="6" style="fill:var(--ink)"/>`+
    `<text class="lbl" x="${x0-10}" y="${ax.sy(mean(pre))+4}" text-anchor="end">${f(mean(pre),2)}</text><text class="lbl" x="${x1+10}" y="${ax.sy(mean(post))+4}">${f(mean(post),2)}</text>`+
    `<text x="${x0}" y="${H-B+20}" text-anchor="middle">사전</text><text x="${x1}" y="${H-B+20}" text-anchor="middle">사후</text>`;
  return s+'</svg><p class="legend"><span><i style="background:var(--q1)"></i>향상된 대상자</span><span><i style="background:var(--q4)"></i>낮아진 대상자</span><span><i style="background:var(--ink)"></i>평균</span></p>';
}

// ================= 예시 자료 (노인 삶의 만족) =================
function rng(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function gen(seed){const r=rng(seed);const nrm=()=>{let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
  return {r,n:(m,s)=>m+s*nrm(),ls:(m,s)=>Math.round(Math.min(5,Math.max(1,m+s*nrm()))*100)/100,age:()=>65+Math.floor(r()*21),sex:()=>r()<.62?'여':'남'};}
const tsv=rows=>rows.map(r=>r.join('\t')).join('\n');
const EX={
  oneshot(){const g=gen(11),R=[['번호','성별','연령','삶의만족_사후']];for(let i=1;i<=30;i++)R.push([i,g.sex(),g.age(),g.ls(3.42,.52)]);return R;},
  onegroup(){const g=gen(12),R=[['번호','성별','연령','삶의만족_사전','삶의만족_사후']];for(let i=1;i<=30;i++){const p=g.ls(2.88,.5);R.push([i,g.sex(),g.age(),p,Math.round(Math.min(5,Math.max(1,p+g.n(.42,.33)))*100)/100]);}return R;},
  static(){const g=gen(13),R=[['번호','집단','성별','연령','삶의만족_사후']];for(let i=1;i<=56;i++){const e=i<=28;R.push([i,e?'실험':'비교',g.sex(),g.age(),g.ls(e?3.48:3.08,.5)]);}return R;},
  noneq(){const g=gen(14),R=[['번호','집단','기관','성별','연령','삶의만족_사전','삶의만족_사후']];for(let i=1;i<=50;i++){const e=i<=25,p=g.ls(e?2.82:3.04,.48);
    R.push([i,e?'실험':'통제',e?'A복지관':'B복지관',g.sex(),g.age(),p,Math.round(Math.min(5,Math.max(1,.35+.88*p+(e?.52:.02)+g.n(0,.3)))*100)/100]);}return R;},
  its(){const g=gen(15),h=['번호','성별','연령'];for(let k=1;k<=5;k++)h.push('사전'+k+'회');for(let k=1;k<=5;k++)h.push('사후'+k+'회');const R=[h];
    for(let i=1;i<=40;i++){const base=g.n(2.85,.4),row=[i,g.sex(),g.age()];for(let t=1;t<=10;t++){const post=t>5?1:0;row.push(Math.round(Math.min(5,Math.max(1,base+.02*t+post*(.38+.04*(t-5))+g.n(0,.18)))*100)/100);}R.push(row);}return R;},
  rd(){const g=gen(16),R=[['번호','성별','연령','우울점수','프로그램참여','삶의만족_사후']];for(let i=1;i<=120;i++){const d=Math.max(0,Math.min(30,Math.round(g.n(14.5,5.5)))),T=d>=15?1:0;
    R.push([i,g.sex(),g.age(),d,T,Math.round(Math.min(5,Math.max(1,4.15-.062*d+.42*T+g.n(0,.28)))*100)/100]);}return R;},
  cross(){const g=gen(17),R=[['번호','순서','성별','연령','1기_삶의만족','2기_삶의만족']];for(let i=1;i<=24;i++){const ab=i<=12,b=g.n(3.0,.42),A=.38,per=.08;
    const p1=b+(ab?A:0)+g.n(0,.22),p2=b+per+(ab?0:A)+g.n(0,.22);R.push([i,ab?'AB':'BA',g.sex(),g.age(),Math.round(Math.min(5,Math.max(1,p1))*100)/100,Math.round(Math.min(5,Math.max(1,p2))*100)/100]);}return R;},
  prepost(){const g=gen(18),R=[['번호','집단','성별','연령','삶의만족_사전','삶의만족_사후']];for(let i=1;i<=60;i++){const e=i%2===1,p=g.ls(2.95,.5);
    R.push([i,e?'실험':'통제',g.sex(),g.age(),p,Math.round(Math.min(5,Math.max(1,.3+.9*p+(e?.48:.04)+g.n(0,.3)))*100)/100]);}return R;},
  postonly(){const g=gen(19),R=[['번호','집단','성별','연령','삶의만족_사후']];for(let i=1;i<=60;i++){const e=i%2===1;R.push([i,e?'실험':'통제',g.sex(),g.age(),g.ls(e?3.46:3.02,.52)]);}return R;},
  solomon(){const g=gen(20),R=[['번호','집단','처치','사전검사','성별','연령','삶의만족_사전','삶의만족_사후']];
    for(let i=1;i<=80;i++){const G=(i-1)%4+1,e=G===1||G===3,pt=G<=2,p=g.ls(2.95,.5);
      R.push([i,G+'집단',e?'실험':'통제',pt?'실시':'미실시',g.sex(),g.age(),pt?p:'',Math.round(Math.min(5,Math.max(1,.3+.9*p+(e?.46:.02)+(pt?.06:0)+(e&&pt?.05:0)+g.n(0,.3)))*100)/100]);}return R;},
};

// ================= 설계 정의 =================
// 기호: R 무작위 배정, X 처치, O 관찰(측정), C 기준점 배정
const TH=['역사','성숙','검사','도구','통계적 회귀','선발','상실','선발×성숙'];
const col=(id,label,guess,kind='num')=>({t:'col',id,label,guess,kind});
const lvl=(id,label,of,guess)=>({t:'lvl',id,label,of,guess});
const G2=[col('g','집단 변수',/집단|group|조건/i,'any'),lvl('le','실험집단 값','g',/실험|처치|프로그램|1/),lvl('lc','통제(비교)집단 값','g',/통제|비교|대조|0/)];
const DS=[
 {k:'oneshot',grp:'전실험설계',name:'일회 사례연구',en:'One-shot Case Study',sm:'X → O · 사후 측정 1회',
  rows:[['실험집단',['X','O1']]],thr:'− − · · · − − ·',
  desc:'한 집단에 처치(프로그램)를 한 뒤 한 번만 측정합니다. 비교 대상이 없어 기준값(척도 중간값, 선행연구 평균 등)과 비교하는 정도만 할 수 있습니다.',
  ctrl:[col('y','사후 점수',/사후|만족|post/i),{t:'num',id:'mu',label:'비교 기준값 (예: 척도 중간값 3)',val:3}],
  ex:'노인복지관 회상요법 프로그램을 마친 노인 30명의 삶의 만족(5점 척도)'},
 {k:'onegroup',grp:'전실험설계',name:'단일집단 사전-사후',en:'One-group Pretest-Posttest',sm:'O → X → O · 대응표본 t검정',
  rows:[['실험집단',['O1','X','O2']]],thr:'− − − − ? + + −',
  desc:'한 집단을 처치 전과 후에 측정해 변화를 봅니다. 변화가 처치 때문인지, 시간 흐름(역사·성숙)이나 반복 측정(검사) 때문인지 구분하기 어렵습니다.',
  ctrl:[col('pre','사전 점수',/사전|pre/i),col('post','사후 점수',/사후|post/i)],
  ex:'웃음치료 8주 프로그램에 참여한 노인 30명의 사전·사후 삶의 만족'},
 {k:'static',grp:'전실험설계',name:'정태적 집단비교',en:'Static-group Comparison',sm:'X → O / O · 독립표본 t검정',
  rows:[['실험집단',['X','O1']],['비교집단',['','O2']]],thr:'+ ? + + + − − −',
  desc:'처치를 받은 집단과 받지 않은 집단을 사후에만 비교합니다. 무작위 배정이 아니고 사전 측정이 없어, 두 집단이 처음부터 달랐을 가능성(선발)을 배제할 수 없습니다.',
  ctrl:[...G2,col('y','사후 점수',/사후|만족|post/i)],
  ex:'건강체조 교실 참여 노인 28명과 미참여 노인 28명의 삶의 만족'},
 {k:'noneq',grp:'준실험설계',name:'비동등 통제집단 설계',en:'Nonequivalent Control Group',sm:'O X O / O O · ANCOVA',
  rows:[['실험집단',['O1','X','O2']],['통제집단',['O3','','O4']]],thr:'+ + + + ? + + −',sep:true,
  desc:'무작위 배정 없이 이미 있는 두 집단(예: 두 복지관)을 사전·사후 측정합니다. 사전 점수 차이를 통제하는 공분산분석(ANCOVA)과 변화량 비교로 처치 효과를 추정합니다.',
  ctrl:[...G2,col('pre','사전 점수',/사전|pre/i),col('post','사후 점수',/사후|post/i)],
  ex:'A복지관(원예치료 실시) 25명과 B복지관(미실시) 25명의 사전·사후 삶의 만족'},
 {k:'its',grp:'준실험설계',name:'단속적 시계열설계',en:'Interrupted Time Series',sm:'O O O O O X O O O O O · 분절회귀',
  rows:[['실험집단',['O1','O2','O3','O4','O5','X','O6','O7','O8','O9','O10']]],thr:'− + + ? + + + +',
  desc:'처치 전후로 여러 번 측정해 처치 직후 수준이 뛰는지(수준 변화)와 추세가 달라지는지(기울기 변화)를 봅니다. 처치 전·후 시점을 각각 최대 5개까지 고르세요.',
  ctrl:[{t:'checks',id:'pre',label:'처치 전 시점 (최대 5개, 순서대로)',guess:/사전|pre/i,max:5},{t:'checks',id:'post',label:'처치 후 시점 (최대 5개, 순서대로)',guess:/사후|post/i,max:5}],
  ex:'노인 40명에게 매달 삶의 만족을 측정하고, 6개월째부터 디지털 교육 프로그램을 시작'},
 {k:'rd',grp:'준실험설계',name:'회귀불연속 설계',en:'Regression Discontinuity',sm:'C O X O / C O O · 기준점 불연속',
  rows:[['기준점 이상',['C','O1','X','O2']],['기준점 미만',['C','O3','','O4']]],thr:'+ + + + + + ? +',
  desc:'배정 점수(예: 우울 점수)가 기준점 이상인 사람에게만 처치를 줍니다. 기준점에서 결과 회귀선이 뚝 끊겨 올라가는 크기가 처치 효과입니다.',
  ctrl:[col('x','배정 점수',/우울|배정|점수|score/i),{t:'num',id:'c',label:'기준점 (cutoff)',val:15},{t:'sel',id:'rule',label:'처치를 받는 쪽',opts:[['ge','기준점 이상'],['lt','기준점 미만']]},
    col('y','결과 점수',/사후|만족|post/i),{t:'num',id:'bw',label:'분석 범위 ± (비우면 전체)',val:''},{t:'sel',id:'slope',label:'회귀선 기울기',opts:[['diff','양쪽 따로 추정'],['same','양쪽 같다고 가정']]}],
  ex:'우울점수(GDS) 15점 이상 노인에게 우울 예방 프로그램을 제공한 120명 자료'},
 {k:'cross',grp:'준실험설계',name:'반복측정 교차설계',en:'Crossover (AB/BA)',sm:'X₁ O X₂ O / X₂ O X₁ O · 교차 분석',
  rows:[['AB 순서',['XA','O1','XB','O2']],['BA 순서',['XB','O3','XA','O4']]],thr:'+ + + + + + + ?',
  desc:'두 처치(A, B)를 순서를 바꿔 모든 대상자가 다 받습니다. 처치 효과, 시기(1기·2기) 효과, 앞 처치가 뒤에 남는 이월효과를 함께 검정합니다.',
  ctrl:[col('seq','순서 변수',/순서|seq/i,'any'),lvl('ab','A를 먼저 받은 값','seq',/^AB$|A/),col('p1','1기 점수',/1기|period1|1차/i),col('p2','2기 점수',/2기|period2|2차/i),
    {t:'text',id:'na',label:'처치 A 이름',val:'회상요법'},{t:'text',id:'nb',label:'처치 B 이름',val:'일반 여가활동'}],
  ex:'노인 24명이 회상요법(A)과 일반 여가활동(B)을 4주씩 순서를 바꿔 받은 뒤 측정'},
 {k:'prepost',grp:'진실험설계',name:'사전-사후 통제집단설계',en:'Pretest-Posttest Control Group',sm:'R O X O / R O O · ANCOVA',
  rows:[['실험집단',['R','O1','X','O2']],['통제집단',['R','O3','','O4']]],thr:'+ + + + + + + +',sep:true,
  desc:'대상자를 무작위로 두 집단에 나눈 뒤 사전·사후 측정합니다. 내적 타당도 위협을 가장 잘 통제하는 대표적 실험설계이며 ANCOVA와 집단×시점 상호작용으로 분석합니다.',
  ctrl:[...G2,col('pre','사전 점수',/사전|pre/i),col('post','사후 점수',/사후|post/i)],
  ex:'노인 60명을 무작위로 실험(회상요법) 30명, 통제 30명으로 배정'},
 {k:'postonly',grp:'진실험설계',name:'사후 통제집단설계',en:'Posttest-only Control Group',sm:'R X O / R O · 독립표본 t검정',
  rows:[['실험집단',['R','X','O1']],['통제집단',['R','','O2']]],thr:'+ + + + + + + +',
  desc:'무작위 배정 후 사후에만 측정합니다. 무작위 배정이 사전 동질성을 보장한다고 보고, 사전검사의 영향(검사 효과)을 없앤 설계입니다.',
  ctrl:[...G2,col('y','사후 점수',/사후|만족|post/i)],
  ex:'노인 60명을 무작위 배정해 실험집단만 노인 대학 프로그램 참여'},
 {k:'solomon',grp:'진실험설계',name:'솔로몬 4집단 설계',en:'Solomon Four-group',sm:'사전검사 유무 × 처치 · 2원 분산분석',
  rows:[['1집단',['R','O1','X','O2']],['2집단',['R','O3','','O4']],['3집단',['R','','X','O5']],['4집단',['R','','','O6']]],thr:'+ + + + + + + +',
  desc:'사전-사후 통제집단설계에 사전검사를 하지 않은 두 집단을 더합니다. 처치 효과와 함께, 사전검사가 처치 효과를 바꾸는지(검사-처치 상호작용)를 검정할 수 있습니다.',
  ctrl:[col('g','집단 변수 (4집단)',/집단|group/i,'any'),lvl('g1','1집단 (사전O · 처치O)','g',/^1|1집단/),lvl('g2','2집단 (사전O · 처치X)','g',/^2|2집단/),lvl('g3','3집단 (사전X · 처치O)','g',/^3|3집단/),lvl('g4','4집단 (사전X · 처치X)','g',/^4|4집단/),
    col('pre','사전 점수 (1·2집단)',/사전|pre/i),col('post','사후 점수',/사후|post/i)],
  ex:'노인 80명을 4집단에 20명씩 무작위 배정해 회상요법 효과와 사전검사 영향 검정'},
];
const GROUPS=['전실험설계','준실험설계','진실험설계'];

// ================= 화면 구성 =================
function notation(d){
  const cell=t=>{if(!t)return '<span class="dz-c e"></span>';if(t==='R')return '<span class="dz-c r">R</span>';if(t==='C')return '<span class="dz-c r">C</span>';
    if(t[0]==='X')return `<span class="dz-c x">X${t.length>1?`<sub>${t.slice(1)}</sub>`:''}</span>`;return `<span class="dz-c">O<sub>${t.slice(1)}</sub></span>`;};
  return `<div class="dz">${d.rows.map((r,i)=>`${d.sep&&i?'<div style="border-top:1.5px dashed var(--muted);opacity:.5;margin:2px 0"></div>':''}<div class="dz-row"><span class="dz-lab">${r[0]}</span>${r[1].map(cell).join('')}</div>`).join('')}`+
    `<div class="dz-legend">${d.rows.some(r=>r[1].includes('R'))?'R 무작위 배정 · ':''}X 처치(프로그램) · O 측정${d.k==='rd'?' · C 기준점에 따른 배정':''}${d.sep?' · 점선: 비동등(무작위 아님)':''}</div></div>`;
}
function threats(d){const m=d.thr.split(' ');
  return `<p class="sublabel">내적 타당도 위협 통제 (Campbell & Stanley)</p><div class="thr">${TH.map((t,i)=>{const v=m[i];
    return `<span class="${v==='+'?'ok':v==='−'?'no':v==='?'?'mb':'na'}"><b>${v==='+'?'○':v==='−'?'×':v==='?'?'△':'·'}</b>${t}</span>`;}).join('')}</div><p class="desc" style="font-size:12px">○ 통제됨 · × 위협 · △ 불확실 · · 해당 없음</p>`;
}
const ico='<svg viewBox="0 0 24 24"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/></svg>';
const icons={전실험설계:'<svg viewBox="0 0 24 24"><circle cx="7" cy="12" r="3"/><path d="M10 12h10"/></svg>',준실험설계:'<svg viewBox="0 0 24 24"><circle cx="7" cy="8" r="3"/><circle cx="7" cy="16" r="3" stroke-dasharray="2 2"/><path d="M10 8h10M10 16h10"/></svg>',진실험설계:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="5" height="16" rx="2"/><circle cx="14" cy="8" r="2.5"/><circle cx="14" cy="16" r="2.5"/><path d="M8 12h2M16.5 8H21M16.5 16H21"/></svg>'};
function ctrlHTML(d){return d.ctrl.map(c=>{const id=`e-${d.k}-${c.id}`;
  if(c.t==='checks')return `<div class="f e-fw"><span class="desc" style="font-size:13px">${c.label}</span><div class="e-checks" id="${id}" data-max="${c.max}"></div></div>`;
  if(c.t==='num'||c.t==='text')return `<label class="f">${c.label}<input id="${id}" type="${c.t==='num'?'number':'text'}" step="any" value="${esc(c.val)}"></label>`;
  if(c.t==='sel')return `<label class="f">${c.label}<select id="${id}">${c.opts.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join('')}</select></label>`;
  return `<label class="f">${c.label}<select id="${id}"></select></label>`;}).join('');}
$('#exper').innerHTML=`
  <section class="card data">
    <div class="data-intro">
      <span class="eyebrow">Step 01 · Experiment data</span>
      <h2>실험 데이터 넣기</h2>
      <p class="desc">엑셀에서 첫 행(변수명)까지 복사해 붙여넣으세요. 설계마다 필요한 형식이 달라서, 각 설계의 [예시]로 형식을 먼저 확인하면 쉽습니다.</p>
      <div class="data-actions">
        <button class="pill primary" id="e-apply">데이터 적용</button>
        <button class="pill ghost" id="e-sample">예시: 노인 삶의 만족</button>
        <label class="pill ghost file">CSV · XLSX 파일 선택<input type="file" id="e-file" accept=".csv,.txt,.tsv,.xlsx,.xls"></label>
      </div>
    </div>
    <textarea id="e-raw" placeholder="번호&#9;집단&#9;삶의만족_사전&#9;삶의만족_사후&#10;1&#9;실험&#9;2.8&#9;3.6&#10;2&#9;통제&#9;3.0&#9;3.1"></textarea>
    <div class="sum" id="e-summary"><span class="eyebrow">불러온 데이터</span><div class="big">0<span>행</span></div><small class="desc">데이터를 넣고 [데이터 적용]을 누르세요.</small></div>
  </section>
  <section class="analysis">
    <aside class="card menu" id="e-menu">
      <div class="menu-head"><h3>실험 설계</h3><span class="eyebrow">Step 02</span></div>
      ${GROUPS.map(g=>`<p class="nav-group">${g}</p><div class="nav">${DS.filter(d=>d.grp===g).map(d=>`<button class="nav-item" data-e="${d.k}"><span class="idx"></span><span class="dot"></span><span class="ico">${icons[g]}</span><span class="nt"><b>${d.name}</b><small>${d.sm}</small></span><span class="chev">›</span></button>`).join('')}</div>`).join('')}
      <p class="quote">“비교가 있어야, 효과가 보입니다.”</p>
    </aside>
    <div class="card result" id="e-result">
      ${DS.map(d=>`<div class="panel" id="ep-${d.k}">
        <span class="eyebrow"><span class="e-no"></span> · ${d.grp} · ${d.en}</span>
        <h2>${d.name}</h2>
        <p class="desc">${d.desc}</p>
        ${notation(d)}
        ${threats(d)}
        <div class="q-tools"><button class="pill ghost sm" data-eex="${d.k}">이 설계의 예시 불러오기</button><span class="desc" style="font-size:12.5px">예시: ${d.ex}</span></div>
        <div class="controls">${ctrlHTML(d)}</div>
        <button class="pill primary run" data-erun="${d.k}">분석 실행</button>
        <div class="out" id="eo-${d.k}"></div>
      </div>`).join('')}
    </div>
  </section>`;
$$('#e-menu .nav-item').forEach((b,i)=>{const n=String(i+1).padStart(2,'0');b.querySelector('.idx').textContent=n;$(`#ep-${b.dataset.e} .e-no`).textContent=n;});

// ================= 데이터 =================
let ED=null,EXK=null,CUR=store.get('jd-exp-design')||'onegroup';if(!DS.some(d=>d.k===CUR))CUR='onegroup';
const ecol=n=>ED.cols.find(c=>c.name===n);
const levels=n=>{const c=ecol(n);return c?[...new Set(c.values.filter(v=>v!==''))].sort((a,b)=>isFinite(a)&&isFinite(b)?a-b:String(a).localeCompare(String(b),'ko')):[];};
function setED(d,exKey){
  ED=d;EXK=exKey||null;
  $('#e-summary').innerHTML=`<span class="eyebrow">${EXK?'예시 · '+esc(DS.find(x=>x.k===EXK).name):'불러온 데이터'}</span><div class="big">${d.n}<span>행</span></div><small class="desc">${d.cols.length}개 변수 · 노랑은 숫자, 보라는 문자</small>`+
    `<div class="chips">${d.cols.map(c=>`<span class="badge${c.num?' n':''}">${esc(c.name)}</span>`).join('')}</div>`;
  $$('#e-menu .nav-item').forEach(n=>n.classList.remove('done'));$$('#e-result .out').forEach(o=>o.innerHTML='');
  DS.forEach(fill);
}
function fill(d){if(!ED)return;const used=new Set();
  d.ctrl.forEach(c=>{const el=$(`#e-${d.k}-${c.id}`);
    if(c.t==='col'){const list=ED.cols.filter(x=>c.kind==='any'||x.num).map(x=>x.name),v=el.value;
      el.innerHTML=list.map(n=>`<option>${esc(n)}</option>`).join('');
      let pick=list.includes(v)&&el.dataset.user?v:(list.find(n=>c.guess.test(n)&&!used.has(n))||list.find(n=>!used.has(n))||list[0]);
      if(pick){el.value=pick;used.add(pick);}}
    else if(c.t==='checks'){const nums=ED.cols.filter(x=>x.num).map(x=>x.name);let g=nums.filter(n=>c.guess.test(n)).slice(0,c.max);
      el.innerHTML=nums.map(n=>`<label><input type="checkbox" value="${esc(n)}"${g.includes(n)?' checked':''}>${esc(n)}</label>`).join('');}});
  d.ctrl.filter(c=>c.t==='lvl').forEach((c,k)=>fillLvl(d,c,k));
}
function fillLvl(d,c,k){const el=$(`#e-${d.k}-${c.id}`),L=levels($(`#e-${d.k}-${c.of}`).value);
  el.innerHTML=L.map(v=>`<option>${esc(v)}</option>`).join('');
  const sib=d.ctrl.filter(x=>x.t==='lvl'&&x.of===c.of),idx=sib.indexOf(c);
  el.value=L.find(v=>c.guess.test(v))??L[idx]??L[0]??'';
  if(sib.length===2&&idx===1&&el.value===$(`#e-${d.k}-${sib[0].id}`).value)el.value=L.find(v=>v!==el.value)??el.value;}
$('#exper').addEventListener('change',e=>{const el=e.target;if(!el.id||!el.id.startsWith('e-'))return;
  const [,k,id]=el.id.split('-');const d=DS.find(x=>x.k===k);if(!d)return;el.dataset.user=1;
  d.ctrl.filter(c=>c.t==='lvl'&&c.of===id).forEach((c,i)=>fillLvl(d,c,i));});
$('#exper').addEventListener('change',e=>{const box=e.target.closest('.e-checks');if(!box)return;const on=box.querySelectorAll('input:checked');
  if(on.length>+box.dataset.max){e.target.checked=false;alert(`최대 ${box.dataset.max}개까지 고를 수 있습니다.`);}});
function loadEx(k){const rows=EX[k]();$('#e-raw').value=tsv(rows);setED(build(rows.map(r=>r.map(String))),k);}
$('#e-apply').addEventListener('click',()=>{try{setED(build(parseText($('#e-raw').value)));}catch(x){$('#e-summary').innerHTML=err(x.message);}});
$('#e-sample').addEventListener('click',()=>loadEx(CUR));
$('#e-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;e.target.value='';
  try{if(/\.xlsx?$/i.test(file.name)){if(!window.XLSX)throw new Error('엑셀 파일을 읽는 라이브러리를 불러오지 못했습니다. CSV로 저장해 올려 주세요.');
      const wb=XLSX.read(await file.arrayBuffer()),g=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:true,defval:''}).filter(r=>r.some(c=>String(c).trim()!==''));
      $('#e-raw').value=g.map(r=>r.join('\t')).join('\n');setED(build(g));}
    else{$('#e-raw').value=await file.text();setED(build(parseText($('#e-raw').value)));}}
  catch(x){$('#e-summary').innerHTML=err(x.message);}});
$('#exper').addEventListener('click',e=>{const b=e.target.closest('[data-eex]');if(b)loadEx(b.dataset.eex);});

function show(k){CUR=k;store.set('jd-exp-design',k);
  $$('#e-menu .nav-item').forEach(n=>n.classList.toggle('active',n.dataset.e===k));
  $$('#e-result .panel').forEach(p=>p.classList.toggle('active',p.id==='ep-'+k));
  $('#e-sample').textContent='예시: '+DS.find(d=>d.k===k).name;
  if(!ED||(EXK&&EXK!==k))loadEx(k);}
$('#e-menu').addEventListener('click',e=>{const b=e.target.closest('.nav-item');if(!b)return;show(b.dataset.e);
  if(window.innerWidth<=900)$('#e-result').scrollIntoView({behavior:'smooth',block:'start'});});
window.expRender=()=>{if(!$('#e-menu .nav-item.active'))show(CUR);};
window.expShow=k=>{if(DS.some(d=>d.k===k))show(k);};

// ================= 값 읽기 =================
const V=(k,id)=>$(`#e-${k}-${id}`).value;
const nv=v=>v===''||v==null?NaN:+v;
function rowsOf(names,filter){const cs=names.map(n=>{const c=ecol(n);if(!c)throw new Error(`'${n}' 변수를 찾을 수 없습니다.`);return c.values;});
  const out=[];for(let i=0;i<ED.n;i++){if(filter&&!filter(i))continue;const r=cs.map(c=>nv(c[i]));if(r.every(isFinite))out.push(r);}return out;}
function twoGroups(k,names){const g=ecol(V(k,'g')).values,le=V(k,'le'),lc=V(k,'lc');
  if(le===lc)throw new Error('실험집단 값과 통제집단 값이 같습니다. 서로 다른 값을 고르세요.');
  return {E:rowsOf(names,i=>g[i]===le),Cn:rowsOf(names,i=>g[i]===lc),le,lc};}
const gl=(v,role)=>/실험|통제|비교|대조/.test(v)?esc(v):`${esc(v)} (${role})`;
const descTbl=(head,rows)=>table(head,rows);

// ================= 분석 =================
const RUN={
 oneshot(){const y=V('oneshot','y'),mu=+V('oneshot','mu');if(!isFinite(mu))throw new Error('비교 기준값을 숫자로 넣어 주세요.');
  const a=rowsOf([y]).map(r=>r[0]),n=a.length;if(n<2)throw new Error('2명 이상의 자료가 필요합니다.');
  const m=mean(a),s=sd(a),se=s/Math.sqrt(n),t=(m-mu)/se,df=n-1,p=pT(t,df),c=tCrit(df)*se,d=(m-mu)/s,srt=[...a].sort((x,z)=>x-z);
  return `<h3>기술통계</h3>`+table(['변수','N','평균','표준편차','최솟값','최댓값','95% CI'],[[esc(y),n,f(m,2),f(s,2),f(srt[0],2),f(srt[n-1],2),`[${f(m-c,2)}, ${f(m+c,2)}]`]])+
   `<h3>기준값과의 비교 (일표본 t검정)</h3>`+table(['기준값','평균 차이','t','df','p','Cohen\'s d'],[[mu,f(m-mu,2),f(t,2),df,sigP(p),f(d,2)]])+sigNote+
   meanBars([{label:esc(y),...ci(a)}],{ref:mu,yl:'평균'})+
   note(`처치 후 ${esc(y)} 평균은 ${f(m,2)}점으로 기준값 ${mu}점보다 ${f(Math.abs(m-mu),2)}점 ${m>=mu?'높고':'낮고'}, 이 차이는 ${sigWord(p)} (${tStr(t,df,p)}, d = ${f(d,2)}, ${effD(d)} 효과).`)+
   note(`⚠ 일회 사례연구는 처치 전 상태도, 비교집단도 없어 이 점수가 <b>프로그램 때문</b>이라고 말할 수 없습니다. 탐색적 결과로만 보고하고, 가능하면 사전 측정이나 비교집단을 추가하세요.`)+
   W(`프로그램 참여 후 대상자 ${n}명의 ${esc(y)}는 평균 ${f(m,2)}점(SD = ${f(s,2)})으로, 기준값 ${mu}점과 ${sig(p)?'유의한 차이가 있었다':'유의한 차이가 없었다'}(${tStr(t,df,p)}).`);},
 onegroup(){const pre=V('onegroup','pre'),post=V('onegroup','post');if(pre===post)throw new Error('사전과 사후에 서로 다른 변수를 고르세요.');
  const R=rowsOf([pre,post]),x=R.map(r=>r[0]),y=R.map(r=>r[1]),P=pairT(x,y),up=R.filter(r=>r[1]>r[0]).length;
  return `<h3>사전·사후 기술통계</h3>`+table(['시점','N','평균','표준편차'],[[esc(pre)+' (사전)',P.n,f(mean(x),2),f(sd(x),2)],[esc(post)+' (사후)',P.n,f(mean(y),2),f(sd(y),2)]])+
   `<h3>대응표본 t검정</h3>`+table(['평균 변화 (사후−사전)','변화 SD','95% CI','t','df','p','효과크기 dz','사전-사후 r'],[[f(P.md,2),f(P.sdd,2),`[${f(P.lo,2)}, ${f(P.hi,2)}]`,f(P.t,2),P.df,sigP(P.p),f(P.dz,2),f(P.r,2)]])+sigNote+
   `<div class="freq-grid">${meanBars([{label:'사전',...ci(x)},{label:'사후',...ci(y)}],{yl:'평균'})}${spaghetti(x,y,'점수')}</div>`+
   note(`${P.n}명 중 ${up}명(${Math.round(up/P.n*100)}%)의 점수가 올랐습니다. 평균은 ${f(mean(x),2)}점에서 ${f(mean(y),2)}점으로 ${f(Math.abs(P.md),2)}점 ${P.md>=0?'높아졌고':'낮아졌고'}, 이 변화는 ${sigWord(P.p)} (${tStr(P.t,P.df,P.p)}, dz = ${f(P.dz,2)}, ${effD(P.dz)} 효과).`)+
   note(`⚠ 통제집단이 없어 같은 기간의 다른 사건(역사), 자연스러운 변화(성숙), 사전검사 경험(검사), 극단 점수의 평균 회귀가 함께 섞여 있을 수 있습니다.`)+
   W(`프로그램 참여 전 ${esc(pre)}는 평균 ${f(mean(x),2)}점(SD = ${f(sd(x),2)}), 참여 후 ${f(mean(y),2)}점(SD = ${f(sd(y),2)})으로, 사전·사후 차이는 ${sig(P.p)?'통계적으로 유의하였다':'통계적으로 유의하지 않았다'}(${tStr(P.t,P.df,P.p)}, d<sub>z</sub> = ${f(P.dz,2)}).`);},
};
function groupCompare(k,random){const y=V(k,'y'),{E,Cn,le,lc}=twoGroups(k,[y]),a=E.map(r=>r[0]),b=Cn.map(r=>r[0]),T=indT(a,b);
  return `<h3>집단별 기술통계</h3>`+table(['집단','N','평균','표준편차','95% CI'],[[gl(le,'실험'),T.n1,f(T.m1,2),f(T.s1,2),`[${f(ci(a).lo,2)}, ${f(ci(a).hi,2)}]`],[gl(lc,random?'통제':'비교'),T.n2,f(T.m2,2),f(T.s2,2),`[${f(ci(b).lo,2)}, ${f(ci(b).hi,2)}]`]])+
   `<h3>독립표본 t검정</h3>`+table(['평균 차이','95% CI','Levene F (p)','t','df','p','Cohen\'s d'],[[f(T.diff,2),`[${f(T.lo,2)}, ${f(T.hi,2)}]`,`${f(T.lev.F,2)} (${fp(T.lev.p)})`,f(T.t,2),Number.isInteger(T.df)?T.df:f(T.df,2),sigP(T.p),f(T.d,2)]])+
   `<p class="desc">${T.eq?'Levene 검정에서 등분산을 가정해 Student t를 보고합니다.':'Levene 검정에서 등분산이 아니어서 Welch t를 보고합니다.'}</p>`+sigNote+
   meanBars([{label:le,...ci(a)},{label:lc,...ci(b)}],{yl:esc(y)})+
   note(`실험집단${/실험/.test(le)?'':`(${esc(le)})`} 평균 ${f(T.m1,2)}점, ${random?'통제':'비교'}집단${/통제|비교/.test(lc)?'':`(${esc(lc)})`} 평균 ${f(T.m2,2)}점으로 차이는 ${f(T.diff,2)}점이며, 이 차이는 ${sigWord(T.p)} (${tStr(T.t,T.df,T.p)}, d = ${f(T.d,2)}, ${effD(T.d)} 효과).`)+
   (random?note(`무작위 배정으로 두 집단이 처음에 같다고 볼 수 있으므로, 사후 차이를 처치 효과로 해석할 수 있습니다. 다만 무작위 배정이 실제로 잘 되었는지 성별·연령 등 일반적 특성의 동질성을 함께 제시하세요.`)
     :note(`⚠ 무작위 배정이 아니고 사전 측정도 없어, 이 차이가 처치 때문인지 두 집단이 원래 달랐기 때문인지(선발) 구분할 수 없습니다.`))+
   W(`사후 ${esc(y)}는 실험집단 ${f(T.m1,2)}점(SD = ${f(T.s1,2)}), ${random?'통제':'비교'}집단 ${f(T.m2,2)}점(SD = ${f(T.s2,2)})으로, 두 집단 간 차이는 ${sig(T.p)?'통계적으로 유의하였다':'통계적으로 유의하지 않았다'}(${tStr(T.t,T.df,T.p)}, d = ${f(T.d,2)}).`);}
RUN.static=()=>groupCompare('static',false);
RUN.postonly=()=>groupCompare('postonly',true);

function prePost(k,random){
  const pre=V(k,'pre'),post=V(k,'post');if(pre===post)throw new Error('사전과 사후에 서로 다른 변수를 고르세요.');
  const {E,Cn,le,lc}=twoGroups(k,[pre,post]);
  const ex=E.map(r=>r[0]),ey=E.map(r=>r[1]),cx=Cn.map(r=>r[0]),cy=Cn.map(r=>r[1]);
  const T0=indT(ex,cx),gE=E.map(r=>r[1]-r[0]),gC=Cn.map(r=>r[1]-r[0]),TG=indT(gE,gC),PE=pairT(ex,ey),PC=pairT(cx,cy);
  // ANCOVA: post ~ pre + group
  const all=E.map(r=>[r[0],1,r[1]]).concat(Cn.map(r=>[r[0],0,r[1]])),Y=all.map(r=>r[2]),X=all.map(r=>[r[0],r[1]]);
  const full=ols(Y,X),red=sse(Y,all.map(r=>[r[0]])),ssg=red-full.sse,Fg=ssg/full.mse,pg=pF(Fg,1,full.dfe),eta=ssg/(ssg+full.sse);
  const sl=ols(Y,all.map(r=>[r[0],r[1],r[0]*r[1]])),pSl=sl.p[3],mp=mean(all.map(r=>r[0]));
  const adjE=full.b[0]+full.b[1]*mp+full.b[2],adjC=full.b[0]+full.b[1]*mp,seAdj=full.se[2];
  const Fi=TG.tS**2,pI=pF(Fi,1,TG.dfS);
  const pts=(x,y)=>[{...ci(x)},{...ci(y)}];
  const chart=linePlot(['사전','사후'],[{name:/실험/.test(le)?le:'실험 ('+le+')',pts:pts(ex,ey)},{name:/통제|비교/.test(lc)?lc:'통제 ('+lc+')',pts:pts(cx,cy)}],'삶의 만족');
  const okPre=!(T0.p<0.05);
  return `<h3>집단 × 시점 기술통계</h3>`+table(['집단','N','사전 M (SD)','사후 M (SD)','변화량 M (SD)','집단 내 변화 (대응 t)'],[
     [gl(le,'실험'),E.length,ms(ex),ms(ey),ms(gE),`${tStr(PE.t,PE.df,PE.p)}`],[gl(lc,'통제'),Cn.length,ms(cx),ms(cy),ms(gC),`${tStr(PC.t,PC.df,PC.p)}`]])+
   chart+
   `<h3>① 사전 동질성 검정</h3>`+table(['사전 차이','t','df','p'],[[f(T0.diff,2),f(T0.t,2),Number.isInteger(T0.df)?T0.df:f(T0.df,2),sigP(T0.p)]])+
   `<h3>② 집단 × 시점 상호작용</h3>`+table(['변화량 차이','F','df','p'],[[f(TG.diff,2),f(Fi,2),`1, ${TG.dfS}`,sigP(pI)]])+
   `<h3>③ 공분산분석 (ANCOVA): 사전 점수 통제</h3>`+table(['원천','SS','df','MS','F','p','부분 η²'],[
     ['사전 점수 (공변량)',f(sse(Y,all.map(r=>[r[1]]))-full.sse,3),1,f(sse(Y,all.map(r=>[r[1]]))-full.sse,3),f((sse(Y,all.map(r=>[r[1]]))-full.sse)/full.mse,2),sigP(full.p[1]),'-'],
     ['집단',f(ssg,3),1,f(ssg,3),f(Fg,2),sigP(pg),f(eta,3)],['오차',f(full.sse,3),full.dfe,f(full.mse,3),'','','']])+
   table(['집단','관찰 사후 평균','조정 사후 평균 (사전 '+f(mp,2)+' 기준)'],[[esc(le),f(mean(ey),2),f(adjE,2)],[esc(lc),f(mean(cy),2),f(adjC,2)]])+
   `<p class="desc">회귀 기울기 동질성(사전 × 집단): ${pEq(pSl)} — ${pSl<0.05?'<span class="err">기울기가 집단마다 달라 ANCOVA 가정이 깨졌습니다. 변화량 분석(②)을 함께 보고하세요.</span>':'가정을 만족합니다.'}</p>`+sigNote+
   note(`사전 점수는 ${okPre?'두 집단 간 유의한 차이가 없어 동질했습니다':`<span class="sig">두 집단 간 유의한 차이가 있었습니다</span>(${tStr(T0.t,T0.df,T0.p)})`}. `+
     `사전 점수를 통제한 조정 평균은 실험집단 ${f(adjE,2)}점, 통제집단 ${f(adjC,2)}점으로, 집단 효과는 ${sigWord(pg)} (${fStr(Fg,1,full.dfe,pg)}, 부분 η² = ${f(eta,3)}, ${effE(eta)} 효과). `+
     `집단 × 시점 상호작용도 ${sigWord(pI)} (${fStr(Fi,1,TG.dfS,pI)}).`)+
   (random?note(`무작위 배정 설계이므로 사전 점수를 공변량으로 넣은 ANCOVA가 가장 검정력이 높은 분석입니다. 집단 × 시점 상호작용(반복측정 분산분석)도 같은 결론을 보여 줍니다.`)
     :note(`⚠ 무작위 배정이 아닌 기존 집단이므로 ${okPre?'사전 점수가 비슷하더라도 ':'사전 점수가 달라 '}선발과 성숙의 상호작용(두 집단이 원래 다른 속도로 변화)을 배제할 수 없습니다. ANCOVA로 사전 차이를 통제하고, 성별·연령 등 다른 특성도 비교해 제시하세요.`))+
   W(`${random?'무작위 배정된 ':''}실험집단과 통제집단의 사전 ${esc(pre)}는 ${okPre?'유의한 차이가 없었다':'유의한 차이가 있었다'}(${tStr(T0.t,T0.df,T0.p)}). 사전 점수를 공변량으로 통제한 공분산분석 결과, 실험집단의 조정된 사후 점수(${f(adjE,2)}점)는 통제집단(${f(adjC,2)}점)보다 ${adjE>=adjC?'높았으며':'낮았으며'}, 이 차이는 ${sig(pg)?'통계적으로 유의하였다':'통계적으로 유의하지 않았다'}(${fStr(Fg,1,full.dfe,pg)}, 부분 η² = ${f(eta,3)}).`);
}
RUN.noneq=()=>prePost('noneq',false);
RUN.prepost=()=>prePost('prepost',true);

RUN.its=()=>{
  const pre=[...$$('#e-its-pre input:checked')].map(i=>i.value),post=[...$$('#e-its-post input:checked')].map(i=>i.value);
  if(pre.length<2||post.length<2)throw new Error('처치 전과 처치 후 시점을 각각 2개 이상(최대 5개) 골라 주세요.');
  if(pre.some(p=>post.includes(p)))throw new Error('같은 변수가 처치 전과 처치 후에 모두 들어 있습니다.');
  const names=[...pre,...post],R=rowsOf(names),N=names.length,n0=pre.length;if(R.length<2)throw new Error('모든 시점에 값이 있는 대상자가 2명 이상 필요합니다.');
  const M=names.map((_,j)=>ci(R.map(r=>r[j])));
  const t=names.map((_,j)=>j+1),D=t.map(v=>v>n0?1:0),P=t.map(v=>v>n0?v-n0:0);
  const y=M.map(o=>o.m),X=t.map((v,j)=>[v,D[j],P[j]]),dfe=N-4;
  let reg=null;if(dfe>=1)reg=ols(y,X);
  const bp=R.map(r=>mean(r.slice(0,n0))),ap=R.map(r=>mean(r.slice(n0))),PT=pairT(bp,ap);
  // 그래프
  const Wd=620,H=300,L=52,Rr=20,Tp=22,B=56,all=M.flatMap(o=>[o.lo,o.hi]);let lo=Math.min(...all),hi=Math.max(...all);const pad=(hi-lo)*.2||.3;lo-=pad;hi+=pad;
  const ax=yAxis(Wd,H,L,Rr,Tp,B,lo,hi,'평균'),sx=j=>L+((j+.5)/N)*(Wd-L-Rr),xi=v=>sx(v-1);
  let s=`<svg class="plot" style="max-width:${Wd}px" viewBox="0 0 ${Wd} ${H}" role="img" aria-label="단속적 시계열 그래프">`+ax.g;
  const xv=(sx(n0-1)+sx(n0))/2;s+=`<rect x="${xv}" y="${Tp}" width="${Wd-Rr-xv}" height="${H-Tp-B}" style="fill:var(--sun-soft);opacity:.6"/><line x1="${xv}" x2="${xv}" y1="${Tp}" y2="${H-B}" style="stroke:var(--sun);stroke-width:2.5;stroke-dasharray:6 4"/><text class="lbl" x="${xv+6}" y="${Tp+14}">처치(X) 시작</text>`;
  if(reg){const b=reg.b,fit=v=>b[0]+b[1]*v+b[2]*(v>n0?1:0)+b[3]*(v>n0?v-n0:0),cf=v=>b[0]+b[1]*v;
    s+=`<line x1="${xi(1)}" y1="${ax.sy(fit(1))}" x2="${xi(n0)}" y2="${ax.sy(fit(n0))}" style="stroke:var(--q1);stroke-width:3"/>`+
      `<line x1="${xi(n0+1)}" y1="${ax.sy(fit(n0+1))}" x2="${xi(N)}" y2="${ax.sy(fit(N))}" style="stroke:var(--q4);stroke-width:3"/>`+
      `<line x1="${xi(n0)}" y1="${ax.sy(cf(n0))}" x2="${xi(N)}" y2="${ax.sy(cf(N))}" style="stroke:var(--q1);stroke-width:2;stroke-dasharray:5 5;opacity:.8"/>`;}
  M.forEach((o,j)=>{s+=`<path d="M${sx(j)},${ax.sy(o.lo)}V${ax.sy(o.hi)}" style="stroke:var(--muted);stroke-width:1.2"/><circle cx="${sx(j)}" cy="${ax.sy(o.m)}" r="5" style="fill:var(--card);stroke:${j<n0?'var(--q1)':'var(--q4)'};stroke-width:2.5"/>`+
    `<text x="${sx(j)}" y="${H-B+18}" text-anchor="middle" style="font-size:11px">${esc(names[j].length>6?names[j].slice(0,6):names[j])}</text>`;});
  s+='</svg><p class="legend"><span><i style="background:var(--q1)"></i>처치 전 추세</span><span><i style="background:var(--q4)"></i>처치 후 추세</span><span><i style="background:var(--q1);opacity:.6"></i>점선: 처치가 없었다면 (반사실 추세)</span></p>';
  const nm=['절편','처치 전 기울기 (시점)','수준 변화 (처치 직후)','기울기 변화 (처치 후)'];
  return `<h3>시점별 평균 (N = ${R.length})</h3>`+table(['시점',...names.map(esc)],[['구간',...names.map((_,j)=>j<n0?'처치 전':'처치 후')],['평균',...M.map(o=>f(o.m,2))],['95% CI',...M.map(o=>`${f(o.lo,2)}–${f(o.hi,2)}`)]])+s+
   (reg?`<h3>분절회귀 (시점 평균 ${N}개)</h3>`+table(['항','B','SE','t','p'],reg.b.map((b,i)=>[nm[i],f(b,3),f(reg.se[i],3),f(reg.t[i],2),sigP(reg.p[i])]))+
     `<p class="desc">평균 = β₀ + β₁·시점 + β₂·처치후 + β₃·(처치 후 경과 시점). R² = ${f(reg.R2,3)}, 잔차 자유도 ${reg.dfe}. 시점이 적어 검정력이 낮으므로 효과크기(B)와 그래프를 함께 해석하세요.</p>`
     :`<p class="desc">시점이 5개 미만이라 분절회귀를 추정할 수 없습니다.</p>`)+
   `<h3>대상자별 처치 전·후 평균 비교 (대응 t검정)</h3>`+table(['처치 전 평균','처치 후 평균','차이','t','df','p','dz'],[[f(mean(bp),2),f(mean(ap),2),f(PT.md,2),f(PT.t,2),PT.df,sigP(PT.p),f(PT.dz,2)]])+sigNote+
   note((reg?`처치 직후 수준이 ${f(reg.b[2],2)}점 ${reg.b[2]>=0?'올랐고':'내려갔고'}(${pEq(reg.p[2])}), 처치 후 기울기는 처치 전보다 시점마다 ${f(reg.b[3],3)}점 ${reg.b[3]>=0?'더 가팔라졌습니다':'완만해졌습니다'}(${pEq(reg.p[3])}). `:'')+
     `대상자별로 보면 처치 전 평균 ${f(mean(bp),2)}점에서 처치 후 ${f(mean(ap),2)}점으로 변했고, 이 차이는 ${sigWord(PT.p)} (${tStr(PT.t,PT.df,PT.p)}).`)+
   note(`⚠ 단속적 시계열설계는 처치 시점에 함께 일어난 다른 사건(역사)을 통제하지 못합니다. 같은 시기 비교집단의 시계열을 함께 제시하면 설계가 훨씬 강해집니다.`)+
   W(`처치 전 ${n0}회, 처치 후 ${N-n0}회 측정한 평균으로 분절회귀를 실시한 결과, ${reg?`처치 직후 삶의 만족 수준은 ${f(reg.b[2],2)}점 ${reg.b[2]>=0?'증가하였고':'감소하였고'}(${pEq(reg.p[2])}), 처치 후 기울기 변화는 ${f(reg.b[3],3)}였다(${pEq(reg.p[3])}). 또한 `:''}대상자별 처치 전·후 평균 차이는 ${sig(PT.p)?'통계적으로 유의하였다':'통계적으로 유의하지 않았다'}(${tStr(PT.t,PT.df,PT.p)}).`);
};

RUN.rd=()=>{
  const xN=V('rd','x'),yN=V('rd','y'),c=+V('rd','c'),rule=V('rd','rule'),bwS=V('rd','bw'),same=V('rd','slope')==='same';
  if(!isFinite(c))throw new Error('기준점을 숫자로 넣어 주세요.');if(xN===yN)throw new Error('배정 점수와 결과 점수에 서로 다른 변수를 고르세요.');
  const bw=bwS===''?Infinity:+bwS;let R=rowsOf([xN,yN]).filter(r=>Math.abs(r[0]-c)<=bw);
  const Tr=x=>rule==='ge'?(x>=c?1:0):(x<c?1:0),n1=R.filter(r=>Tr(r[0])).length,n0=R.length-n1;
  if(n1<3||n0<3)throw new Error('기준점 양쪽에 각각 3명 이상이 필요합니다. 기준점이나 분석 범위를 확인하세요.');
  const y=R.map(r=>r[1]),X=R.map(r=>{const xc=r[0]-c,t=Tr(r[0]);return same?[xc,t]:[xc,t,t*xc];}),reg=ols(y,X);
  const eff=reg.b[2],se=reg.se[2],p=reg.p[2],cc=tCrit(reg.dfe)*se,sdy=sd(y);
  const nm=same?['절편 (통제쪽, 기준점)','배정 점수 (기준점 중심)','처치 효과 (불연속)']:['절편 (통제쪽, 기준점)','배정 점수 기울기 (통제쪽)','처치 효과 (불연속)','기울기 차이 (처치쪽 − 통제쪽)'];
  // 그래프
  const Wd=560,H=320,L=52,Rr=16,Tp=20,B=44,xs=R.map(r=>r[0]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...y),y1=Math.max(...y),py=(y1-y0)*.08||.3;
  const ax=yAxis(Wd,H,L,Rr,Tp,B,y0-py,y1+py,yN),sx=v=>L+(v-x0)/((x1-x0)||1)*(Wd-L-Rr);
  let s=`<svg class="plot" style="max-width:${Wd}px" viewBox="0 0 ${Wd} ${H}" role="img" aria-label="회귀불연속 산점도">`+ax.g;
  for(let i=0;i<=4;i++){const v=x0+(x1-x0)*i/4;s+=`<text x="${sx(v)}" y="${H-B+18}" text-anchor="middle">${f(v,1)}</text>`;}
  s+=`<text x="${(L+Wd-Rr)/2}" y="${H-6}" text-anchor="middle">${esc(xN)}</text>`;
  R.forEach(r=>s+=`<circle cx="${sx(r[0])}" cy="${ax.sy(r[1])}" r="3.4" style="fill:${Tr(r[0])?'var(--q4)':'var(--q1)'};opacity:.55"/>`);
  const b=reg.b,fy=(x,t)=>b[0]+b[1]*(x-c)+b[2]*t+(same?0:b[3]*t*(x-c));
  const segs=[[x0,c,rule==='ge'?0:1],[c,x1,rule==='ge'?1:0]];
  segs.forEach(([a,z,t])=>{if(z>a)s+=`<line x1="${sx(a)}" y1="${ax.sy(fy(a,t))}" x2="${sx(z)}" y2="${ax.sy(fy(z,t))}" style="stroke:${t?'var(--q4)':'var(--q1)'};stroke-width:3.5"/>`;});
  s+=`<line x1="${sx(c)}" x2="${sx(c)}" y1="${Tp}" y2="${H-B}" style="stroke:var(--sun);stroke-width:2.5;stroke-dasharray:6 4"/><text class="lbl" x="${sx(c)+6}" y="${Tp+12}">기준점 ${c}</text>`+
    `<path d="M${sx(c)+10},${ax.sy(fy(c,0))}V${ax.sy(fy(c,1))}" style="stroke:var(--ink);stroke-width:2;marker-end:none"/><text class="lbl" x="${sx(c)+16}" y="${(ax.sy(fy(c,0))+ax.sy(fy(c,1)))/2+4}">효과 ${f(eff,2)}</text>`;
  s+='</svg><p class="legend"><span><i style="background:var(--q4)"></i>처치 받음</span><span><i style="background:var(--q1)"></i>처치 받지 않음</span></p>';
  return `<h3>배정 현황</h3>`+table(['구분','N',`${esc(yN)} 평균 (SD)`],[['처치 받음 ('+(rule==='ge'?`${c} 이상`:`${c} 미만`)+')',n1,ms(R.filter(r=>Tr(r[0])).map(r=>r[1]))],['처치 받지 않음',n0,ms(R.filter(r=>!Tr(r[0])).map(r=>r[1]))]])+
   (isFinite(bw)?`<p class="desc">기준점 ±${bw} 범위의 ${R.length}명만 분석했습니다.</p>`:'')+s+
   `<h3>회귀불연속 추정</h3>`+table(['항','B','SE','t','p'],reg.b.map((v,i)=>[nm[i],f(v,3),f(reg.se[i],3),f(reg.t[i],2),sigP(reg.p[i])]))+
   `<p class="desc">${esc(yN)} = β₀ + β₁(배정 점수 − 기준점) + β₂·처치${same?'':' + β₃·처치·(배정 점수 − 기준점)'}. R² = ${f(reg.R2,3)}. 처치 효과 95% CI [${f(eff-cc,2)}, ${f(eff+cc,2)}]</p>`+sigNote+
   note(`기준점(${c})에서 결과 점수가 <span class="${sig(p)?'sig':''}">${f(eff,2)}점 ${eff>=0?'뛰어올랐습니다':'떨어졌습니다'}</span>. 이 불연속(처치 효과)은 ${sigWord(p)} (${tStr(reg.t[2],reg.dfe,p)}, 결과 SD 대비 ${f(eff/sdy,2)}).`)+
   note(`회귀불연속 설계의 효과는 <b>기준점 근처 대상자</b>에 대한 효과입니다. 분석 범위(±)를 바꿔도 결과가 비슷한지 확인하고, 배정 점수를 조작한 흔적(기준점 바로 위·아래 인원이 비정상적으로 몰림)이 없는지 살펴보세요.`)+
   W(`${esc(xN)} ${c}점을 기준으로 프로그램을 배정한 회귀불연속 분석 결과, 기준점에서 ${esc(yN)}의 불연속 크기는 ${f(eff,2)}점(SE = ${f(se,2)})이었으며 ${sig(p)?'통계적으로 유의하였다':'통계적으로 유의하지 않았다'}(${tStr(reg.t[2],reg.dfe,p)}).`);
};

RUN.cross=()=>{
  const seq=V('cross','seq'),ab=V('cross','ab'),p1=V('cross','p1'),p2=V('cross','p2'),A=V('cross','na')||'A',B=V('cross','nb')||'B';
  if(p1===p2)throw new Error('1기와 2기에 서로 다른 변수를 고르세요.');
  const sv=ecol(seq).values,L=levels(seq);if(L.length!==2)throw new Error(`순서 변수는 값이 정확히 2개(예: AB, BA)여야 합니다. 지금은 ${L.length}개입니다.`);
  const ba=L.find(v=>v!==ab),G1=rowsOf([p1,p2],i=>sv[i]===ab),G2=rowsOf([p1,p2],i=>sv[i]===ba);
  const s1=G1.map(r=>r[0]+r[1]),s2=G2.map(r=>r[0]+r[1]),d1=G1.map(r=>(r[0]-r[1])/2),d2=G2.map(r=>(r[0]-r[1])/2);
  const Tc=indT(s1,s2),Tt=indT(d1,d2),Tp=indT(d1,d2.map(v=>-v));
  const effA=mean(d1)-mean(d2),per=mean(d1)+mean(d2); // A−B, 1기−2기
  const aV=G1.map(r=>r[0]).concat(G2.map(r=>r[1])),bV=G1.map(r=>r[1]).concat(G2.map(r=>r[0])),dz=mean(aV.map((v,i)=>v-bV[i]))/sd(aV.map((v,i)=>v-bV[i]));
  const chart=linePlot(['1기','2기'],[{name:`${ab} 순서`,pts:[{...ci(G1.map(r=>r[0])),tag:A},{...ci(G1.map(r=>r[1])),tag:B}]},{name:`${ba} 순서`,pts:[{...ci(G2.map(r=>r[0])),tag:B},{...ci(G2.map(r=>r[1])),tag:A}]}],'점수');
  const carry=Tc.p<0.10;
  return `<h3>순서 × 시기 평균</h3>`+table(['순서','N','1기 M (SD)','2기 M (SD)'],[[`${esc(ab)} (${esc(A)}→${esc(B)})`,G1.length,ms(G1.map(r=>r[0])),ms(G1.map(r=>r[1]))],[`${esc(ba)} (${esc(B)}→${esc(A)})`,G2.length,ms(G2.map(r=>r[0])),ms(G2.map(r=>r[1]))]])+
   table(['처치','N','평균 (SD)'],[[esc(A),aV.length,ms(aV)],[esc(B),bV.length,ms(bV)]])+chart+
   `<h3>교차설계 검정</h3>`+table(['효과','추정치','t','df','p','검정 방법'],[
     [`처치 효과 (${esc(A)} − ${esc(B)})`,f(effA,2),f(Tt.tS,2),Tt.dfS,sigP(pT(Tt.tS,Tt.dfS)),'반기 차이 (1기−2기)/2의 순서 간 비교'],
     ['시기 효과 (1기 − 2기)',f(per,2),f(Tp.tS,2),Tp.dfS,sigP(pT(Tp.tS,Tp.dfS)),'반기 차이 부호를 맞춘 비교'],
     ['이월 효과 (순서 간 합계 차)',f(Tc.diff/2,2),f(Tc.tS,2),Tc.dfS,`${sigP(pT(Tc.tS,Tc.dfS))}`,'두 시기 합계의 순서 간 비교 (α = .10 권장)']])+sigNote+
   note(`${esc(jo(A,'을','를'))} 받았을 때가 ${esc(B)}보다 평균 ${f(Math.abs(effA),2)}점 ${effA>=0?'높았고':'낮았고'}, 이 처치 효과는 ${sigWord(pT(Tt.tS,Tt.dfS))} (${tStr(Tt.tS,Tt.dfS,pT(Tt.tS,Tt.dfS))}, dz = ${f(dz,2)}). `+
     `시기 효과는 ${sigWord(pT(Tp.tS,Tp.dfS))}.`)+
   (carry?note(`<span class="err">⚠ 이월효과 검정이 p &lt; .10으로 나타났습니다.</span> 앞 처치의 효과가 다음 시기까지 남았을 수 있으니, 1기 자료만으로 두 처치를 비교(독립표본)한 결과를 함께 보고하고 세척기간(washout)을 늘리는 것을 고려하세요.`)
     :note(`이월효과가 유의하지 않아(p ≥ .10) 두 시기 자료를 모두 쓰는 교차설계 분석이 타당합니다. 처치 사이에는 충분한 세척기간(washout)을 두었는지 함께 기술하세요.`))+
   W(`AB/BA 교차설계로 분석한 결과 이월효과는 ${carry?'유의하였다':'유의하지 않았다'}(${tStr(Tc.tS,Tc.dfS,pT(Tc.tS,Tc.dfS))}). ${esc(jo(A,'과','와'))} ${esc(B)}의 처치 효과 차이는 ${f(effA,2)}점으로 ${sig(pT(Tt.tS,Tt.dfS))?'통계적으로 유의하였으며':'통계적으로 유의하지 않았으며'}(${tStr(Tt.tS,Tt.dfS,pT(Tt.tS,Tt.dfS))}), 시기 효과는 ${sig(pT(Tp.tS,Tp.dfS))?'유의하였다':'유의하지 않았다'}(${tStr(Tp.tS,Tp.dfS,pT(Tp.tS,Tp.dfS))}).`);
};

RUN.solomon=()=>{
  const gN=V('solomon','g'),lv=['g1','g2','g3','g4'].map(id=>V('solomon',id)),pre=V('solomon','pre'),post=V('solomon','post');
  if(new Set(lv).size<4)throw new Error('1~4집단에 서로 다른 값을 하나씩 지정하세요.');
  const gv=ecol(gN).values,Y=lv.map(l=>rowsOf([post],i=>gv[i]===l).map(r=>r[0]));
  if(Y.some(a=>a.length<2))throw new Error('각 집단에 사후 점수가 있는 대상자가 2명 이상 필요합니다.');
  const P12=[0,1].map(k=>rowsOf([pre,post],i=>gv[i]===lv[k]));
  // 2×2 분산분석 (효과 코딩, Type III)
  const rows=[];Y.forEach((a,k)=>a.forEach(v=>rows.push({y:v,tr:k===0||k===2?1:-1,pt:k<=1?1:-1})));
  const y=rows.map(r=>r.y),Xf=rows.map(r=>[r.tr,r.pt,r.tr*r.pt]),full=ols(y,Xf),dfe=full.dfe;
  const term=(drop)=>{const ss=sse(y,rows.map(r=>[r.tr,r.pt,r.tr*r.pt].filter((_,j)=>j!==drop)))-full.sse,F=ss/full.mse,p=pF(F,1,dfe);return {ss,F,p,eta:ss/(ss+full.sse)};};
  const tTr=term(0),tPt=term(1),tIx=term(2);
  const lab=['1집단 R O X O','2집단 R O · O','3집단 R · X O','4집단 R · · O'];
  const anc=(()=>{const all=P12[0].map(r=>[r[0],1,r[1]]).concat(P12[1].map(r=>[r[0],0,r[1]]));if(all.length<5)return null;const Y2=all.map(r=>r[2]),f2=ols(Y2,all.map(r=>[r[0],r[1]])),ss=sse(Y2,all.map(r=>[r[0]]))-f2.sse,F=ss/f2.mse;return {F,p:pF(F,1,f2.dfe),df:f2.dfe,eta:ss/(ss+f2.sse)};})();
  const chart=linePlot(['사전검사 실시','사전검사 미실시'],[{name:'처치 (실험)',pts:[ci(Y[0]),ci(Y[2])]},{name:'무처치 (통제)',pts:[ci(Y[1]),ci(Y[3])]}],'사후 '+post);
  return `<h3>집단별 기술통계</h3>`+table(['집단','N','사전 M (SD)','사후 M (SD)'],lv.map((l,k)=>[`${lab[k]} <small>${esc(l)}</small>`,Y[k].length,k<2?ms(P12[k].map(r=>r[0])):'—',ms(Y[k])]))+
   `<h3>사후 점수 2원 분산분석 (처치 × 사전검사)</h3>`+table(['원천','SS','df','MS','F','p','부분 η²'],[
     ['처치 (1·3 vs 2·4)',f(tTr.ss,3),1,f(tTr.ss,3),f(tTr.F,2),sigP(tTr.p),f(tTr.eta,3)],
     ['사전검사 (1·2 vs 3·4)',f(tPt.ss,3),1,f(tPt.ss,3),f(tPt.F,2),sigP(tPt.p),f(tPt.eta,3)],
     ['처치 × 사전검사',f(tIx.ss,3),1,f(tIx.ss,3),f(tIx.F,2),sigP(tIx.p),f(tIx.eta,3)],
     ['오차',f(full.sse,3),dfe,f(full.mse,3),'','','']])+sigNote+chart+
   (anc?`<h3>보조 분석: 1집단 vs 2집단 ANCOVA (사전 점수 통제)</h3>`+table(['F','df','p','부분 η²'],[[f(anc.F,2),`1, ${anc.df}`,sigP(anc.p),f(anc.eta,3)]]):'')+
   note(`처치의 주효과는 ${sigWord(tTr.p)} (${fStr(tTr.F,1,dfe,tTr.p)}, 부분 η² = ${f(tTr.eta,3)}). 사전검사의 주효과는 ${sigWord(tPt.p)} (${fStr(tPt.F,1,dfe,tPt.p)}). `+
     `처치 × 사전검사 상호작용은 ${sigWord(tIx.p)} (${fStr(tIx.F,1,dfe,tIx.p)}).`)+
   note(tIx.p<0.05?`<span class="err">⚠ 사전검사를 받았는지에 따라 처치 효과가 달랐습니다(검사-처치 상호작용).</span> 사전검사가 대상자를 민감하게 만들었을 수 있으므로, 사전검사를 받지 않은 3·4집단 비교 결과를 일반화의 근거로 쓰세요.`
     :`사전검사가 처치 효과를 바꾸지 않았으므로(상호작용 비유의), 처치 효과를 사전검사 여부와 관계없이 일반화할 수 있습니다. 이것이 솔로몬 4집단 설계의 장점입니다.`)+
   W(`솔로몬 4집단 설계로 사후 ${esc(post)}에 대해 2원 분산분석을 실시한 결과, 처치의 주효과는 ${sig(tTr.p)?'유의하였고':'유의하지 않았고'}(${fStr(tTr.F,1,dfe,tTr.p)}, 부분 η² = ${f(tTr.eta,3)}), 사전검사의 주효과(${fStr(tPt.F,1,dfe,tPt.p)})와 처치 × 사전검사 상호작용(${fStr(tIx.F,1,dfe,tIx.p)})은 ${sig(tPt.p)||sig(tIx.p)?'일부 유의하였다':'유의하지 않았다'}.`);
};

$('#exper').addEventListener('click',e=>{const b=e.target.closest('[data-erun]');if(!b)return;const k=b.dataset.erun,o=$('#eo-'+k);
  if(!ED){o.innerHTML=err('먼저 데이터를 넣거나 예시를 불러오세요.');return;}
  try{o.innerHTML=RUN[k]();$(`#e-menu .nav-item[data-e="${k}"]`).classList.add('done');}catch(x){o.innerHTML=err('분석 중 오류: '+x.message);}});
})();

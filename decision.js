// Just Do it Statistics — 고급통계 20 델파이 분석 · 21 AHP 분석
// index.html의 RUN, DATA, col, num, levels, quantile, mean, sd, table, note, err, esc, f, setData, setChecks 등을 함께 씁니다.
(()=>{
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];

// ================= 예시 자료 =================
function rng(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function nrmF(r){return ()=>{let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};}
const DP_ITEMS=[['접근성',4.5,.6],['프로그램다양성',4.2,.7],['강사전문성',4.4,.6],['참여자만족',4.6,.5],['건강증진효과',4.3,.7],['사회관계증진',4.1,.8],
  ['정서지원',4.0,.8],['안전관리',4.5,.6],['비용적절성',3.5,1.0],['시설쾌적성',3.8,.9],['디지털교육',3.2,1.2],['가족연계',3.0,1.1]];
function delphiExample(){const r=rng(31),n=nrmF(r),L=[['전문가','차수','소속',...DP_ITEMS.map(x=>x[0])]];
  const org=['학계','현장','공무원'];
  for(const rd of [1,2])for(let e=1;e<=15;e++){const shrink=rd===2?.62:1;
    L.push([`E${String(e).padStart(2,'0')}`,rd+'차',org[(e-1)%3],...DP_ITEMS.map(([,m,s])=>Math.max(1,Math.min(5,Math.round(m+(rd===2?.05:0)+n()*s*shrink))))]);}
  return L;}
const AHP_TOP=[['건강',.38],['경제',.27],['사회참여',.20],['주거',.15]];
const AHP_SUB={건강:[['의료접근성',.45],['예방관리',.30],['정신건강',.25]],경제:[['기초연금',.60],['노인일자리',.40]],
  사회참여:[['여가문화',.40],['자원봉사',.25],['평생교육',.35]],주거:[['주거개선',.45],['안전돌봄',.55]]};
const saaty=x=>{const k=Math.max(1,Math.min(9,Math.round(x>=1?x:1/x)));return x>=1?String(k):(k===1?'1':'1/'+k);};
function ahpExample(){const r=rng(41),n=nrmF(r),groups=[['',AHP_TOP],...Object.entries(AHP_SUB)];
  const head=['전문가','분야'];groups.forEach(([g,el])=>{for(let i=0;i<el.length;i++)for(let j=i+1;j<el.length;j++)head.push(`${g?g+':':''}${el[i][0]}-${el[j][0]}`);});
  const L=[head],field=['노인복지','보건의료','사회정책','지방행정'];
  for(let e=1;e<=15;e++){const noisy=e===4||e===11||e===14,s=noisy?1.15:.32,row=[`E${String(e).padStart(2,'0')}`,field[(e-1)%4]];
    const own=groups.map(([,el])=>el.map(([,w])=>w*Math.exp(n()*.25)));
    groups.forEach(([,el],gi)=>{for(let i=0;i<el.length;i++)for(let j=i+1;j<el.length;j++)row.push(saaty(own[gi][i]/own[gi][j]*Math.exp(n()*s)));});
    L.push(row);}
  return L;}
document.addEventListener('click',e=>{const b=e.target.closest('[data-dexample]');if(!b)return;
  const k=b.dataset.dexample,rows=k==='delphi'?delphiExample():ahpExample();
  $('#raw').value=rows.map(r=>r.join('\t')).join('\n');$('#apply').click();
  const panel=$('#p-'+k);if(panel&&!panel.classList.contains('active'))$(`.nav-item[data-p="${k}"]`).click();});

// ================= 데이터가 바뀔 때 기본 선택 =================
const PAIR=/^(?:(.+?)\s*[:：]\s*)?(.+?)\s*(?:-|–|—|↔|\bvs\.?\b|\bVS\b)\s*(.+)$/;
function initDecision(){if(!DATA)return;
  const rs=$('#dp-round');rs.insertAdjacentHTML('afterbegin','<option value="">(없음 · 한 차수)</option>');
  const round=DATA.cols.find(c=>/차수|라운드|round|회차/i.test(c.name));rs.value=round?round.name:'';
  const items=DATA.cols.filter(c=>c.num&&!/^(번호|id|no|순번|전문가|연령|나이|경력)$/i.test(c.name)&&c.name!==rs.value).filter(c=>{const v=c.values.filter(x=>x!=='').map(Number);return v.length&&v.every(x=>Number.isInteger(x)&&x>=1&&x<=10);}).map(c=>c.name);
  setChecks('#dp-items',items);
  const mx=Math.max(5,...items.flatMap(n=>col(n).values.filter(v=>v!=='').map(Number)));$('#dp-max').value=mx<=5?5:mx<=7?7:mx<=9?9:10;$('#dp-cut').value=Math.ceil(+$('#dp-max').value*.8);
  setChecks('#ah-cols',DATA.cols.map(c=>c.name).filter(n=>PAIR.test(n)));
}
const _setData=setData;
setData=function(d){_setData(d);initDecision();};

// ================= 델파이 =================
const LAWSHE=[[5,.99],[6,.99],[7,.99],[8,.75],[9,.78],[10,.62],[11,.59],[12,.56],[13,.54],[14,.51],[15,.49],[20,.42],[25,.37],[30,.33],[35,.31],[40,.29]];
const minCVR=N=>{if(N<5)return 1;let v=.99;for(const [n,c] of LAWSHE)if(N>=n)v=c;return v;};
function dStats(a,cut){const s=[...a].sort((x,y)=>x-y),N=a.length,m=mean(a),q1=quantile(s,.25),md=quantile(s,.5),q3=quantile(s,.75),sdv=N>1?sd(a):0,ne=a.filter(v=>v>=cut).length;
  return {N,m,sd:sdv,q1,md,q3,ne,cvr:(ne-N/2)/(N/2),agree:md?1-(q3-q1)/md:NaN,conv:(q3-q1)/2,cv:m?sdv/m:NaN};}
RUN.delphi=()=>{
  const items=[...$$('#dp-items input:checked')].map(i=>i.value);if(!items.length)return err('평가 문항을 하나 이상 고르세요.');
  const rv=$('#dp-round').value,mx=+$('#dp-max').value,cut=+$('#dp-cut').value;
  if(!(cut>0&&cut<=mx))return err('‘타당’으로 볼 점수는 1 이상, 척도 최고점 이하로 넣어 주세요.');
  let rounds=[''],last='',prev=null;
  if(rv){rounds=levels(rv);if(rounds.length>8)return err('차수 변수의 값이 너무 많습니다. 차수(1차, 2차 …)를 담은 변수를 고르세요.');last=rounds.at(-1);prev=rounds.length>1?rounds.at(-2):null;}
  const rc=rv?col(rv).values:null;
  const vals=(name,r)=>col(name).values.map((v,i)=>({v:num(v),i})).filter(o=>isFinite(o.v)&&(!rv||rc[o.i]===r)).map(o=>o.v);
  const res=items.map(name=>{const a=vals(name,last),S=dStats(a,cut),P=prev!=null?dStats(vals(name,prev),cut):null;
    const mc=minCVR(S.N),ok={cvr:S.cvr>=mc,agree:S.agree>=.75,conv:S.conv<=.5,cv:S.cv<=.5};
    return {name,S,P,mc,ok,pass:ok.cvr&&ok.agree&&ok.conv};});
  const N=res[0].S.N;if(N<3)return err('전문가 응답이 3명 이상 필요합니다.');
  const mark=b=>b?'<span class="ok">✓</span>':'<span class="err">✗</span>';
  const rows=res.map(o=>[esc(o.name),o.S.N,f(o.S.m,2),f(o.S.sd,2),f(o.S.md,1),`${f(o.S.q1,1)}–${f(o.S.q3,1)}`,
    `<span class="${o.ok.cvr?'':'err'}">${f(o.S.cvr,2)}</span>`,`<span class="${o.ok.agree?'':'err'}">${f(o.S.agree,2)}</span>`,`<span class="${o.ok.conv?'':'err'}">${f(o.S.conv,2)}</span>`,
    `<span class="${o.ok.cv?'':'err'}">${f(o.S.cv,2)}</span>`,o.pass?'<span class="sig">채택</span>':'<span class="err">검토</span>']);
  // CVR 그래프
  const W=620,RH=26,T=26,H=T+res.length*RH+30,L=150,R=56,x0=-1,x1=1,sx=v=>L+(v-x0)/(x1-x0)*(W-L-R),mc=res[0].mc;
  let g=`<svg class="plot" style="max-width:${W}px" viewBox="0 0 ${W} ${H}" role="img" aria-label="문항별 CVR">`;
  [-1,-.5,0,.5,1].forEach(v=>g+=`<line x1="${sx(v)}" x2="${sx(v)}" y1="${T-6}" y2="${H-26}" style="stroke:var(--line)"/><text x="${sx(v)}" y="${H-10}" text-anchor="middle">${v}</text>`);
  res.forEach((o,i)=>{const y=T+i*RH,v=o.S.cvr;
    g+=`<text class="lbl" x="${L-10}" y="${y+RH/2+4}" text-anchor="end">${esc(o.name.length>11?o.name.slice(0,11)+'…':o.name)}</text>`+
      `<rect x="${Math.min(sx(0),sx(v))}" y="${y+5}" width="${Math.abs(sx(v)-sx(0))}" height="${RH-10}" rx="6" style="fill:${o.pass?'var(--lav-deep)':'#e0897f'};opacity:.85"/>`+
      `<text x="${sx(v)+(v>=0?6:-6)}" y="${y+RH/2+4}" text-anchor="${v>=0?'start':'end'}">${f(v,2)}</text>`;});
  g+=`<line x1="${sx(mc)}" x2="${sx(mc)}" y1="${T-10}" y2="${H-26}" style="stroke:var(--sun);stroke-width:2.5;stroke-dasharray:6 4"/><text class="lbl" x="${sx(mc)}" y="${T-12}" text-anchor="middle">최소 CVR ${mc}</text></svg>`;
  const pass=res.filter(o=>o.pass),fail=res.filter(o=>!o.pass);
  const why=o=>[!o.ok.cvr&&'CVR',!o.ok.agree&&'합의도',!o.ok.conv&&'수렴도'].filter(Boolean).join('·');
  let stab='';
  if(prev!=null){const sr=res.map(o=>{const d=o.S.m-o.P.m,dcv=o.S.cv-o.P.cv;return [esc(o.name),f(o.P.m,2),f(o.S.m,2),f(d,2),f(o.P.cv,2),f(o.S.cv,2),f(dcv,2),
      o.S.cv<=.5?(Math.abs(dcv)<=.1||dcv<0?'<span class="ok">안정</span>':'비교적 안정'):o.S.cv<=.8?'비교적 안정':'<span class="err">불안정</span>'];});
    const conv=res.filter(o=>o.S.cv<o.P.cv).length;
    stab=`<h3>차수 간 변화: ${esc(prev)} → ${esc(last)}</h3>`+table(['문항',`${esc(prev)} 평균`,`${esc(last)} 평균`,'평균 변화',`${esc(prev)} CV`,`${esc(last)} CV`,'CV 변화','안정도'],sr)+
      note(`${res.length}개 문항 중 ${conv}개 문항의 변이계수(CV)가 ${esc(last)}에서 줄어 전문가 의견이 모이고 있습니다. CV가 0.5 이하이면 안정, 0.5~0.8은 비교적 안정, 0.8을 넘으면 추가 차수가 필요합니다.`);}
  return `<p class="desc">${rv?`판정은 마지막 차수(<b>${esc(last)}</b>) 응답으로 합니다. `:''}전문가 ${N}명 · ${mx}점 척도 · ${cut}점 이상을 ‘타당’으로 계산 · 최소 CVR(Lawshe, N=${N}) = ${minCVR(N)}</p>`+
    `<h3>문항별 델파이 지표</h3>`+table(['문항','N','평균','SD','중앙값','Q1–Q3','CVR','합의도','수렴도','CV','판정'],rows)+
    `<p class="desc">기준: CVR ≥ ${minCVR(N)} · 합의도 ≥ .75 · 수렴도 ≤ .50 (세 기준 모두 만족 시 채택) · CV ≤ .50은 안정도 참고. 빨간 값은 기준 미달입니다.</p>`+
    `<h3>문항별 내용타당도 (CVR)</h3>`+g+stab+
    note(`${res.length}개 문항 중 <span class="sig">${pass.length}개가 채택</span>되었습니다${pass.length?`(${pass.map(o=>esc(o.name)).join(', ')})`:''}. `+
      (fail.length?`${fail.length}개 문항은 기준에 못 미쳐 다음 차수에서 다시 묻거나 수정·삭제를 검토하세요: ${fail.map(o=>`${esc(o.name)}(${why(o)})`).join(', ')}.`:'모든 문항이 기준을 만족했습니다.'))+
    `<h3>논문 결과 서술 예시</h3><div class="note" style="background:var(--card);border:1px solid var(--line)">${rv?`${esc(last)} `:''}델파이 조사에 참여한 전문가 ${N}명의 응답을 분석한 결과, ${res.length}개 문항 중 내용타당도 비율(CVR ≥ ${minCVR(N)}), 합의도(≥ .75), 수렴도(≤ .50) 기준을 모두 충족한 ${pass.length}개 문항을 최종 지표로 채택하였다.${fail.length?` ${fail.map(o=>esc(o.name)).join(', ')} 문항은 기준을 충족하지 못하였다.`:''}</div>`;
};

// ================= AHP =================
const RI=[0,0,0,.58,.90,1.12,1.24,1.32,1.41,1.45,1.49,1.51,1.48,1.56,1.57,1.59];
function judg(v){v=String(v??'').trim();if(!v)return NaN;let x;
  const m=v.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);x=m?+m[1]/+m[2]:+v;
  if(!isFinite(x)||x===0)return NaN;if(x<0)x=1/Math.abs(x);return Math.min(9,Math.max(1/9,x));}
function eig(A){const n=A.length;let w=Array(n).fill(1/n),lam=n;
  for(let it=0;it<200;it++){const v=A.map(r=>r.reduce((s,a,j)=>s+a*w[j],0)),t=v.reduce((a,b)=>a+b,0),nw=v.map(x=>x/t);
    const d=Math.max(...nw.map((x,i)=>Math.abs(x-w[i])));w=nw;if(d<1e-12)break;}
  const Aw=A.map(r=>r.reduce((s,a,j)=>s+a*w[j],0));lam=mean(Aw.map((x,i)=>x/w[i]));
  const CI=n>2?(lam-n)/(n-1):0,CR=n>2?CI/RI[Math.min(n,RI.length-1)]:0;return {w,lam,CI,CR};}
function matrix(n,pairs,get){const A=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?1:NaN));
  for(const p of pairs){const v=get(p);if(!isFinite(v))return null;A[p.i][p.j]=v;A[p.j][p.i]=1/v;}
  return A.flat().every(isFinite)?A:null;}
const fr=x=>x>=1?f(x,2):`1/${f(1/x,2)}`;
RUN.ahp=()=>{
  const names=[...$$('#ah-cols input:checked')].map(i=>i.value);if(!names.length)return err('쌍대비교 변수를 고르세요. 변수명은 “A-B” 형식이어야 합니다.');
  const crMax=+$('#ah-cr').value,agg=$('#ah-agg').value,bad=[];
  const G=new Map();
  for(const nm of names){const m=nm.match(PAIR);if(!m){bad.push(nm);continue;}const g=(m[1]||'').trim(),a=m[2].trim(),b=m[3].trim();
    if(!G.has(g))G.set(g,{el:[],pairs:[]});const o=G.get(g);for(const e of [a,b])if(!o.el.includes(e))o.el.push(e);o.pairs.push({name:nm,a,b});}
  if(!G.size)return err('“A-B” 형식의 변수가 없습니다.');
  const groups=[...G.entries()].sort((x,y)=>x[0]===''?-1:y[0]===''?1:0);
  const label=(i)=>{const c=DATA.cols.find(c=>/전문가|응답자|id|번호|이름/i.test(c.name)&&!PAIR.test(c.name));return c?c.values[i]:'#'+(i+1);};
  const R={};let html='';
  for(const [g,o] of groups){const n=o.el.length;if(n<2)continue;
    o.pairs.forEach(p=>{p.i=o.el.indexOf(p.a);p.j=o.el.indexOf(p.b);});
    const need=n*(n-1)/2,have=new Set(o.pairs.map(p=>[Math.min(p.i,p.j),Math.max(p.i,p.j)].join()));
    if(have.size<need){html+=err(`${g?esc(g)+' 하위':'상위'} 항목 비교가 ${have.size}/${need}개뿐입니다. ${n}개 항목이면 쌍대비교 ${need}개가 모두 필요합니다.`);continue;}
    const ex=[];
    for(let r=0;r<DATA.n;r++){const A=matrix(n,o.pairs,p=>judg(col(p.name).values[r]));if(A)ex.push({r,A,...eig(A)});}
    if(!ex.length){html+=err(`${g?esc(g)+' 하위':'상위'} 항목: 모든 비교에 응답한 전문가가 없습니다.`);continue;}
    let use=ex.filter(e=>e.CR<=crMax+1e-9),fallback=false;if(!use.length){use=ex;fallback=true;}
    let w,Am=null,ag;
    if(agg==='aij'){Am=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>Math.exp(mean(use.map(e=>Math.log(e.A[i][j]))))));ag=eig(Am);w=ag.w;}
    else{w=o.el.map((_,i)=>mean(use.map(e=>e.w[i])));const t=w.reduce((a,b)=>a+b,0);w=w.map(x=>x/t);ag=null;}
    R[g]={el:o.el,w,ex,use,ag};
    const rank=w.map((x,i)=>i).sort((a,b)=>w[b]-w[a]),rk=o.el.map((_,i)=>rank.indexOf(i)+1),mx=Math.max(...w);
    const title=g?`하위 항목: ${esc(g)}`:'상위 항목 (평가기준)';
    html+=`<h3>${title}</h3>`+
      `<p class="desc">응답 전문가 ${ex.length}명 중 CR ≤ ${crMax>=9?'제한 없음':crMax.toFixed(2)}인 <b>${use.length}명</b>${crMax<9?`을 분석에 썼습니다. 제외: ${ex.filter(e=>!use.includes(e)).map(e=>`${esc(label(e.r))}(CR ${f(e.CR,2)})`).join(', ')||'없음'}`:'을 모두 썼습니다'}.${fallback?' <span class="err">일관성 기준을 만족한 전문가가 없어 전원을 포함했습니다.</span>':''}</p>`+
      (Am?`<div class="tbl"><table><thead><tr><th>통합 쌍대비교 행렬</th>${o.el.map(e=>`<th>${esc(e)}</th>`).join('')}</tr></thead><tbody>${Am.map((r,i)=>`<tr><td>${esc(o.el[i])}</td>${r.map(v=>`<td>${fr(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'')+
      table(['항목','가중치','순위',''],o.el.map((e,i)=>[esc(e),f(w[i],3),rk[i],`<div class="barcell"><div class="bar" style="width:${w[i]/mx*100}%;${rk[i]===1?'background:var(--lav-deep)':''}"></div></div>`]))+
      (ag?`<p class="desc">통합 행렬 λmax = ${f(ag.lam,3)}, CI = ${f(ag.CI,3)}, CR = <span class="${ag.CR<=.1?'ok':'err'}">${f(ag.CR,3)}</span> ${n<=2?'(항목이 2개면 항상 일관적)':ag.CR<=.1?'— 일관성이 있습니다(CR ≤ .10).':'— 일관성이 부족합니다.'}</p>`:'');
  }
  if(bad.length)html+=`<p class="desc">“A-B” 형식이 아니어서 뺀 변수: ${bad.map(esc).join(', ')}</p>`;
  // 종합 가중치
  const top=R[''];let fin='';
  if(top){const rows=[];
    top.el.forEach((c,i)=>{const sub=R[c];if(sub)sub.el.forEach((s,k)=>rows.push({c,cw:top.w[i],s,lw:sub.w[k],gw:top.w[i]*sub.w[k]}));else rows.push({c,cw:top.w[i],s:'—',lw:1,gw:top.w[i]});});
    if(rows.some(r=>r.s!=='—')){const ord=[...rows].sort((a,b)=>b.gw-a.gw),mx=ord[0].gw;
      fin=`<h3>종합 가중치와 우선순위</h3>`+table(['상위 항목','상위 가중치','하위 항목','하위(국지) 가중치','종합 가중치','종합 순위',''],
        rows.map(r=>[esc(r.c),f(r.cw,3),esc(r.s),f(r.lw,3),`<b>${f(r.gw,3)}</b>`,ord.indexOf(r)+1,`<div class="barcell"><div class="bar" style="width:${r.gw/mx*100}%;${ord.indexOf(r)<3?'background:var(--lav-deep)':''}"></div></div>`]))+
        note(`상위 항목 중 가장 중요한 것은 <span class="sig">${esc(top.el[top.w.indexOf(Math.max(...top.w))])}</span>(${f(Math.max(...top.w),3)})입니다. `+
          `종합 우선순위 1~3위는 ${ord.slice(0,3).map((r,i)=>`${i+1}위 ${esc(r.s)}(${esc(r.c)}, ${f(r.gw,3)})`).join(', ')}입니다.`)+
        `<h3>논문 결과 서술 예시</h3><div class="note" style="background:var(--card);border:1px solid var(--line)">일관성 비율(CR) ${crMax<9?crMax.toFixed(2)+' 이하인':''} 전문가 응답을 ${agg==='aij'?'기하평균으로 통합':'통합'}하여 분석한 결과, 상위 평가기준의 중요도는 ${top.el.map((e,i)=>({e,w:top.w[i]})).sort((a,b)=>b.w-a.w).map(o=>`${esc(o.e)}(${f(o.w,3)})`).join(', ')} 순으로 나타났다. 하위 항목을 포함한 종합 중요도는 ${ord.slice(0,3).map(r=>`${esc(r.s)}(${f(r.gw,3)})`).join(', ')}가 가장 높았다.</div>`;}
    else{const o=top.el.map((e,i)=>({e,w:top.w[i]})).sort((a,b)=>b.w-a.w);
      fin=note(`가장 중요한 항목은 <span class="sig">${esc(o[0].e)}</span>(${f(o[0].w,3)})이며, 우선순위는 ${o.map((x,i)=>`${i+1}위 ${esc(x.e)}`).join(', ')}입니다.`);}}
  return html+fin+`<p class="desc">값 해석: 3 = 왼쪽이 3배 중요, 1/3 또는 -3 = 오른쪽이 3배 중요, 1 = 같음. 가중치는 고유벡터법, 일관성 비율 CR = CI / RI (Saaty).</p>`;
};
})();

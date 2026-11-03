// Just Do it Statistics — 모든 통계 결과에 [엑셀로 저장] + 논문용 결과 서술 문단
// 엑셀통계 · 고급통계 · 전문가 합의(#o-*), 실험조사(#eo-*) 결과 영역을 지켜보다가 결과가 그려지면 자동으로 붙입니다.
(()=>{
const $=s=>document.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const today=()=>new Date().toISOString().slice(0,10);
const clean=t=>String(t||'').replace(/ /g,' ').replace(/[ \t]+/g,' ').trim();

// ---------- 분석 이름 ----------
function panelOf(out){const p=out.closest('.panel');return {name:clean(p?.querySelector('h2')?.textContent)||'분석',eyebrow:clean(p?.querySelector('.eyebrow')?.textContent)};}

// ---------- 결과 서술 (안내 문장을 논문 문체로) ----------
const DROP=/결과를 봅니다|클수록|강조 표시|세요|보세요|참고용|권장|고려하|확인하|살펴보|제시하|함께 보고|보고하|쓰세요|일반적으로 .*봅니다|라고 봅니다|정도로 봅니다|기준입니다/;
function vowelPast(ch){const c=ch.charCodeAt(0)-0xAC00;if(c<0||c>11171)return '었다';const jung=Math.floor((c%588)/28);return (jung===0||jung===8)?'았다':'었다';}
function formal(s){
  s=s.replace(/⚠\s*/g,'').replace(/\s+/g,' ').trim();
  const R=[[/었습니다/g,'었다'],[/았습니다/g,'았다'],[/였습니다/g,'였다'],[/했습니다/g,'하였다'],[/됩니다/g,'되었다'],[/있습니다/g,'있었다'],[/없습니다/g,'없었다'],
    [/않습니다/g,'않았다'],[/보입니다/g,'보였다'],[/입니다/g,'이다'],[/합니다/g,'하였다'],[/줍니다/g,'주었다'],[/봅니다/g,'보았다'],[/집니다/g,'졌다'],
    [/나타납니다/g,'나타났다'],[/납니다/g,'났다'],[/갑니다/g,'갔다'],[/옵니다/g,'왔다'],[/뜁니다/g,'뛰었다'],[/깁니다/g,'겼다'],[/립니다/g,'렸다'],[/칩니다/g,'쳤다'],[/킵니다/g,'켰다'],[/냅니다/g,'냈다']];
  for(const [a,b] of R)s=s.replace(a,b);
  s=s.replace(/([가-힣])습니다/g,(m,ch)=>ch+vowelPast(ch));
  return s;}
function sentences(t){return String(t||'').split(/\n+/).flatMap(l=>clean(l).split(/(?<=\.)\s+(?=[^\s])/)).map(x=>x.trim()).filter(Boolean);}
// 받침에 맞는 조사 고르기: 은(는) 이(가) 을(를) 와(과)
const DIGIT_B={0:1,1:1,3:1,6:1,7:1,8:1};
function hasB(w){w=String(w).replace(/['’"”)\]\s]+$/,'');const ch=w.slice(-1),c=ch.charCodeAt(0);
  if(c>=0xAC00&&c<=0xD7A3)return (c-0xAC00)%28>0;if(/\d/.test(ch))return !!DIGIT_B[ch];return /[lmnr]$/i.test(ch);}
function fixJosa(s){return s.replace(/([^\s(]+?)(은\(는\)|는\(은\)|이\(가\)|가\(이\)|을\(를\)|를\(을\)|와\(과\)|과\(와\))/g,(m,w,j)=>{
  const b=hasB(w),k=j[0];const pick={은:['은','는'],는:['은','는'],이:['이','가'],가:['이','가'],을:['을','를'],를:['을','를'],와:['과','와'],과:['과','와']}[k];return w+(b?pick[0]:pick[1]);});}
const EFF={'매우 작음':'매우 작은','작음':'작은','중간':'중간','큼':'큰','약함':'약한','중간 정도':'중간 정도의','강함':'강한'};
function polish(s){
  s=fixJosa(s);
  s=s.replace(/효과크기\s*([^,.()]+?=\s*-?[\d.]+)\s*\((매우 작음|작음|중간|큼)\)\.?$/,(m,a,b)=>`효과크기는 ${a}로 ${EFF[b]} 수준이었다.`);
  s=s.replace(/Cramer's V = ([\d.]+) \((약함|중간|강함|매우 약함)\)\.?$/,(m,a,b)=>`Cramer's V는 ${a}로 연관성은 ${b==='매우 약함'?'매우 약한':EFF[b]||b} 수준이었다.`);
  s=s.replace(/^유의한 상관: (.+?)\.?$/,(m,l)=>l.split(/\),\s*/).map(x=>x.replace(/\)?$/,')')).map(x=>{const q=x.match(/^(.+?)–(.+?) \(r=(-?[\d.]+), (.+?)\)$/);return q?`${fixJosa(q[1]+'와(과)')} ${fixJosa(q[2]+'은(는)')} ${q[4]}(r = ${q[3]})`:x;}).join(', ')+'이 나타났다.');
  s=s.replace(/^유의한 변수: (.+?)\.?$/,'유의한 영향을 미친 변수는 $1으로 나타났다.');
  s=s.replace(/^가장 많은 응답: (.+?)\.?$/,(m,l)=>`응답자의 특성을 살펴보면 ${l.replace(/ \((\d+명), ([\d.]+%)\)/g,'($1, $2)')}이 가장 많았다.`);
  s=s.replace(/^결론: /,'').replace(/(\S+) — /g,(m,w)=>{const c=w.slice(-1).charCodeAt(0)-0xAC00,jong=c>=0&&c<11172?c%28:0;return w+(jong&&jong!==8?'으로':'로')+', ';});
  s=s.replace(/Cronbach α = ([\d.]+)로 신뢰도는 (\S+?)이다/,(m,a,b)=>`Cronbach α는 ${a}로 신뢰도가 ${({높음:'높은',양호:'양호한',보통:'보통',낮음:'낮은'})[b]||b} 수준이었다`);
  s=s.replace(/(\S)이다(\.?)$/,(m,c,d)=>c+(hasB(c)?'이었다':'였다')+d);

  s=s.replace(/^중앙생존기간: (.+?)\.?$/,'중앙생존기간은 $1이었다.');
  s=s.replace(/^군집 (\d+) \((\d+명)\): (.+?)\.?$/,(m,a,b,c)=>`군집 ${a}(${b})${hasB(a)?'은':'는'} ${c}의 특성을 보였다.`);
  s=s.replace(/(\S)\(M=([-\d.]+)\)와 /g,(m,w,v)=>`${w}(M = ${v})${hasB(w)?'과':'와'} `);
  s=s.replace(/(\d)로(?=[ ,])/g,(m,d)=>d+('036'.includes(d)?'으로':'로'));
  if(/\)\.?$/.test(s)&&!/다\.?$/.test(s)&&!/다\.? ?\([^()]*\)\.?$/.test(s))s=s.replace(/\.?$/,'로 나타났다.');
  s=s.replace(/^즉 /,'즉, ');
  return s;}
function narrativeFrom(out,name){
  // 이미 '논문 결과 서술' 문단이 있는 분석(실험조사·델파이·AHP)은 그대로 씀
  const h=$$('h3',out).find(x=>/논문 결과 서술/.test(x.textContent));if(h&&h.nextElementSibling)return clean(h.nextElementSibling.innerText);
  const SPECIAL_ONLY=new Set(['o-desc','o-ipa','o-val']);const special=SPECIAL[out.id.replace(/^e?o-/,'')];const body=[];
  if(special){const s=special(out);if(s)body.push(s);}
  for(const n of $$(':scope > .note, :scope .freq-block .note',out)){if(SPECIAL_ONLY.has(out.id))continue;for(const s of sentences(n.innerText)){if(DROP.test(s))continue;body.push(polish(formal(s)));}}
  const uniq=[...new Set(body)].filter(s=>s.length>4);
  if(!uniq.length)return '';
  const nm=/(분석|검정|검증|통계|설계|SEM|구조방정식|ANOVA)$/.test(name)?(/통계$/.test(name)?name+' 분석':name):name+' 분석';
  return `${josa(nm,'을','를')} 실시한 결과는 다음과 같다. `+uniq.map(s=>/[.다]$/.test(s)?s:s+'.').join(' ');
}
function josa(w,a,b){const c=String(w).charCodeAt(String(w).length-1);return w+(c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28?a:b);}
// 안내 문장만 있는 분석은 표에서 문장을 만듦
const SPECIAL={
  ipa(out){const n=[...out.querySelectorAll('.note')].map(x=>x.innerText).join('\n');const L={A:'집중개선',B:'유지관리',C:'저순위',D:'과잉투자'},desc={A:'중요도는 높지만 성과가 낮아 우선 개선이 필요한',B:'중요도와 성과가 모두 높아 현 수준을 유지할',C:'중요도와 성과가 모두 낮은',D:'중요도에 비해 성과가 높은'};
    const parts=[];for(const q of ['A','B','C','D']){const m=n.match(new RegExp(q+' '+L[q]+'[^:]*:\\s*([^\\n]+)'));if(m&&m[1].trim()&&!/없음/.test(m[1]))parts.push(`${desc[q]} ${L[q]} 영역(${q})에는 ${m[1].trim()}`);}
    return parts.length?`중요도-성과 분석(IPA) 결과, ${parts.join(', ')}이 위치하였다.`:'';},
  val(out){const n=[...out.querySelectorAll('.note')].map(x=>x.innerText).join(' ');const kmo=n.match(/KMO = ([\d.]+)/),bt=n.match(/Bartlett χ²\((\d+)\) = ([\d.]+), (p [<=] [.\d]+)/),fv=n.match(/(\d+)개 요인이 전체 분산의 ([\d.]+%)/);
    const fs=[...n.matchAll(/요인 (\d+): ([^요모]+?)(?=\s*(?:요인 \d+:|모든|$))/g)].map(m=>`요인 ${m[1]}(${m[2].trim().replace(/\s+/g,' ')})`);
    let s=`탐색적 요인분석 결과, ${kmo?`KMO 값은 ${kmo[1]}`:''}${bt?`, Bartlett 구형성 검정은 χ²(${bt[1]}) = ${bt[2]}, ${bt[3]}로 요인분석에 적합한 자료였다`:''}. `;
    if(fv)s+=`고유값 1 이상인 ${fv[1]}개 요인이 추출되어 전체 분산의 ${fv[2]}를 설명하였으며, ${fs.join(', ')}로 묶였다. `;
    if(/교차적재가 없어/.test(n))s+='모든 문항이 해당 요인에 .50 이상으로 적재되고 교차적재가 없어 구성타당도가 확보되었다.';
    return s.trim();},
  desc(out){const t=out.querySelector('table');if(!t)return '';const G=grid(t),h=G[0],iM=h.indexOf('평균'),iS=h.indexOf('표준편차'),iK=h.indexOf('왜도'),iU=h.indexOf('첨도');
    if(iM<0)return '';const rows=G.slice(1).filter(r=>r[iM]&&r[iM]!=='-');
    const parts=rows.map(r=>`${r[0]}의 평균은 ${(+r[iM]).toFixed(2)}점(SD = ${(+r[iS]).toFixed(2)})`);
    const okNorm=rows.every(r=>Math.abs(+r[iK])<2&&Math.abs(+r[iU])<7);
    return `주요 변수의 기술통계를 살펴보면, ${parts.join(', ')}으로 나타났다. 왜도와 첨도의 절대값은 ${okNorm?'각각 2와 7보다 작아 정규분포 가정을 충족하였다':'일부 변수에서 기준(왜도 2, 첨도 7)을 넘어 정규성에 주의가 필요하다'}.`;},
};

// ---------- 표 → 배열 (rowspan·colspan 반영) ----------
function grid(table){const rows=[...table.rows],G=[];
  rows.forEach((tr,ri)=>{G[ri]=G[ri]||[];let ci=0;
    for(const cell of tr.cells){while(G[ri][ci]!==undefined)ci++;const txt=clean(cell.innerText),rs=cell.rowSpan||1,cs=cell.colSpan||1;
      for(let r=0;r<rs;r++)for(let c=0;c<cs;c++){G[ri+r]=G[ri+r]||[];G[ri+r][ci+c]=r===0&&c===0?txt:'';}ci+=cs;}});
  return G.map(r=>Array.from(r,v=>v??''));}
function toCell(v){const s=String(v).replace(/\*+$/,'').trim();if(/^-?\d*\.?\d+(e-?\d+)?$/i.test(s)&&s!=='')return +s;return v;}

// ---------- 엑셀 ----------
function toExcel(out){
  if(!window.XLSX){alert('엑셀 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.');return;}
  const {name,eyebrow}=panelOf(out),A=[[name],[eyebrow],[`저장일 ${today()}`],[]];
  const walk=el=>{for(const c of el.children){
    if(c.classList.contains('res-tools')||c.classList.contains('res-write'))continue;
    if(/^H[1-4]$/.test(c.tagName)){A.push([]);A.push(['■ '+clean(c.textContent)]);continue;}
    if(c.tagName==='TABLE'){grid(c).forEach(r=>A.push(r.map(toCell)));A.push([]);continue;}
    if(c.querySelector&&c.querySelector('table')&&!c.matches('svg')){walk(c);continue;}
    if(c.tagName==='svg'||c.tagName==='SVG'||c.tagName==='svg'.toUpperCase())continue;
    if(c.matches&&c.matches('svg, .legend, .plot'))continue;
    const t=clean(c.innerText);if(t)A.push([t]);}};
  walk(out);
  const para=out.querySelector('.res-write p')?.innerText||'';
  const wb=XLSX.utils.book_new(),ws=XLSX.utils.aoa_to_sheet(A);
  const width=Math.max(...A.map(r=>r.length));ws['!cols']=Array.from({length:width},(_,i)=>({wch:i===0?28:14}));
  XLSX.utils.book_append_sheet(wb,ws,'분석결과');
  const ws2=XLSX.utils.aoa_to_sheet([[name+' 결과 서술'],[],...para.split(/(?<=다\.)\s+/).map(s=>[s])]);ws2['!cols']=[{wch:120}];
  XLSX.utils.book_append_sheet(wb,ws2,'결과서술');
  XLSX.writeFile(wb,`${name.replace(/[\\/:*?"<>|·]/g,'').replace(/\s+/g,'_')}_결과_${today()}.xlsx`);
}

// ---------- 결과 영역에 붙이기 ----------
function decorate(out){
  if(!out.children.length||out.querySelector('.res-tools'))return;
  if(out.querySelector(':scope > .err')&&out.children.length<=2)return;   // 오류만 있으면 붙이지 않음
  const {name}=panelOf(out),para=narrativeFrom(out,name);
  const hasOwn=$$('h3',out).some(x=>/논문 결과 서술/.test(x.textContent));
  let html='';
  if(para&&!hasOwn)html+=`<div class="res-write"><h3>결과 서술 (논문용 문단)</h3><p>${esc(para)}</p></div>`;
  html+=`<div class="res-tools"><button class="pill primary sm" data-xl>📥 결과를 엑셀로 저장</button>${para?'<button class="pill ghost sm" data-cp>📋 결과 서술 복사</button>':''}<span class="desc" style="font-size:12.5px">표와 해석, 결과 서술이 엑셀 파일 하나에 저장됩니다.</span></div>`;
  out.insertAdjacentHTML('beforeend',html);
  out.dataset.para=para;
}
document.addEventListener('click',async e=>{const b=e.target.closest('.res-tools [data-xl],.res-tools [data-cp]');if(!b)return;const out=b.closest('.out');
  if(b.hasAttribute('data-xl'))return toExcel(out);
  const t=out.dataset.para||'';try{await navigator.clipboard.writeText(t);b.textContent='복사됨 ✓';}catch{prompt('아래 문단을 복사하세요',t);}setTimeout(()=>b.textContent='📋 결과 서술 복사',1500);});
const mo=new MutationObserver(list=>{for(const m of list)decorate(m.target);});
$$('.out[id^="o-"], .out[id^="eo-"]').forEach(o=>mo.observe(o,{childList:true}));
const st=document.createElement('style');
st.textContent='.res-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:18px 0 4px;padding-top:14px;border-top:1px dashed var(--line)}.res-write p{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:14px 18px;margin:6px 0 0;font-size:14.5px;line-height:1.85}';
document.head.appendChild(st);
})();

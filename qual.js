// 박종두 엑셀통계 — 터미널 전환 + 질적조사 터미널
(()=>{
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const store={get(k){try{return localStorage.getItem(k);}catch{return null;}},set(k,v){try{localStorage.setItem(k,v);}catch{}}};

// ================= 터미널 전환 =================
const TERM={stat:['기본 분석','01 – 08'],adv:['고급 분석','09 – 19']};
function setTerm(t){
  if(!['stat','adv','qual'].includes(t))t='stat';
  document.body.dataset.term=t;
  $$('.term').forEach(b=>b.classList.toggle('active',b.dataset.term===t));
  if(TERM[t]){
    $('#menu-title').textContent=TERM[t][0];$('#menu-range').textContent=TERM[t][1];
    const act=$('.nav-item[data-p].active');
    if(!act||act.closest('.nav').dataset.term!==t){
      const first=$(`.nav[data-term="${t}"] .nav-item`);
      $$('.nav-item[data-p]').forEach(n=>n.classList.toggle('active',n===first));
      $$('#stat-analysis .panel').forEach(p=>p.classList.toggle('active',p.id==='p-'+first.dataset.p));
    }
  }else qRender();
  store.set('jd-term',t);
  if(location.hash!=='#'+t)history.replaceState(null,'','#'+t);
}
$('#terms').addEventListener('click',e=>{const b=e.target.closest('.term');if(b)setTerm(b.dataset.term);});
window.addEventListener('hashchange',()=>setTerm(location.hash.slice(1)));

// ================= 질적조사: 상태 =================
const IV=/^(연구자|면담자|질문자|인터뷰어|진행자|조사자|사회자|Q|I|R|Interviewer)$/i;
const TC=['var(--q1)','var(--q2)','var(--q3)','var(--q4)','var(--q5)','var(--q6)'];
const UNC='미분류 코드';
let S={title:'',raw:'',segs:[],meta:{},hier:[],memos:[]};
function save(){S.raw=$('#q-raw').value;store.set('jd-qual',JSON.stringify(S));}
function load(){try{const d=JSON.parse(store.get('jd-qual')||'null');if(d&&Array.isArray(d.segs))S=Object.assign(S,d);}catch{}}

const isIV=spk=>IV.test(spk);
const speakers=()=>[...new Set(S.segs.filter(s=>!isIV(s.spk)).map(s=>s.spk))];
const metaShort=spk=>(S.meta[spk]||'').split(/[,，]/).map(x=>x.trim()).filter(Boolean).slice(0,2).join(', ');
const who=spk=>`참여자 ${spk}${metaShort(spk)?', '+metaShort(spk):''}`;
const kwList=kw=>String(kw||'').split(/[,，;、\/]/).map(x=>x.trim()).filter(Boolean);

// ---------- 전사 텍스트 해석 ----------
function normSpk(s){s=String(s).trim().replace(/^\[|\]$/g,'').replace(/^(연구\s*참여자|참여자|대상자|참가자|화자|면담자\s*)\s*/,m=>/면담자/.test(m)?m:'').trim();return s||'?';}
function isLabel(s){s=s.trim();return s.length>0&&s.length<=14&&!/[.?!,"'“”‘’(){}]/.test(s)&&s.split(/\s+/).length<=3;}
function parseTranscript(txt){
  const segs=[],meta={};let cur=null,head='';
  for(let line of String(txt).replace(/\r/g,'').split('\n')){
    line=line.trim();if(!line)continue;
    if(/^\[[^\]]*\]$/.test(line)||/^#/.test(line)||/^[■□◆◇●○=─━-]{2,}/.test(line))continue;
    let m=line.match(/^@\s*([^\s,:：]+)\s*[:：]?\s*(.*)$/);
    if(m){meta[normSpk(m[1])]=m[2].trim();continue;}
    m=line.match(/^([^:：]{1,16}?)\s*[:：]\s*(.+)$/);
    if(m&&isLabel(m[1])){cur=normSpk(m[1]);segs.push({spk:cur,text:m[2].trim(),codes:[]});continue;}
    if(cur)segs.push({spk:cur,text:line,codes:[]});else if(!head)head=line;
  }
  return {segs,meta,head};
}
function toText(){
  const out=[];if(S.title)out.push(`[${S.title}]`);
  for(const k of Object.keys(S.meta))if(S.meta[k])out.push(`@${k} ${S.meta[k]}`);
  let prev=null;
  for(const s of S.segs){if(s.spk!==prev&&!isIV(s.spk)&&!S.segs.some((x,i)=>x.spk===s.spk&&S.segs.indexOf(s)>i)){out.push('',`[참여자 ${s.spk} 면담]`);}
    out.push(`${s.spk}: ${s.text}`);prev=s.spk;}
  return out.join('\n').replace(/^\n+/,'');
}
function applyText(txt,quiet){
  const old=new Map(S.segs.map(s=>[s.spk+'\u0001'+s.text,s.codes]));
  const p=parseTranscript(txt);
  if(!p.segs.length){if(!quiet)$('#q-summary').innerHTML=`<span class="eyebrow">불러온 전사 자료</span><p class="err">발화를 찾지 못했습니다. 한 줄에 “A: 발화 내용” 형식으로 넣어 주세요.</p>`;return false;}
  p.segs.forEach(s=>s.codes=[...(old.get(s.spk+'\u0001'+s.text)||[])]);
  S.segs=p.segs;S.meta=Object.assign({},p.meta);
  const t=String(txt).match(/^\s*\[([^\]]+)\]/);if(t&&!/면담\]?$/.test(t[1])&&!/^참여자/.test(t[1]))S.title=t[1].trim();
  save();qRender();return true;
}

// ---------- 범주 구조 ----------
function tree(spkF){
  const T=[];
  const segOk=i=>!isIV(S.segs[i].spk)&&(!spkF||S.segs[i].spk===spkF);
  const known=new Set();
  for(const r of S.hier){
    if(!r.sub&&!r.cat&&!r.theme)continue;
    const tn=r.theme||'(주제 미정)',cn=r.cat||'(범주 미정)';
    let t=T.find(x=>x.name===tn);if(!t){t={name:tn,cats:[],i:T.length};T.push(t);}
    let c=t.cats.find(x=>x.name===cn);if(!c){c={name:cn,subs:[]};t.cats.push(c);}
    if(r.sub&&!known.has(r.sub)){known.add(r.sub);c.subs.push({name:r.sub,kw:r.kw});}
  }
  const extra=[...new Set(S.segs.flatMap(s=>s.codes))].filter(c=>!known.has(c));
  if(extra.length)T.push({name:UNC,cats:[{name:'주제 도출 표에 없는 하위범주',subs:extra.map(name=>({name,kw:''}))}],i:T.length,unc:true});
  for(const t of T){const ts=new Set();
    for(const c of t.cats){const cs=new Set();
      for(const s of c.subs){s.segs=S.segs.map((x,i)=>i).filter(i=>segOk(i)&&S.segs[i].codes.includes(s.name));s.spk=[...new Set(s.segs.map(i=>S.segs[i].spk))];s.segs.forEach(i=>{cs.add(i);ts.add(i);});}
      c.segs=[...cs];c.spk=[...new Set(c.segs.map(i=>S.segs[i].spk))];}
    t.segs=[...ts];t.spk=[...new Set(t.segs.map(i=>S.segs[i].spk))];t.color=t.unc?'var(--muted)':TC[t.i%TC.length];}
  return T;
}
function subIndex(){const m={};for(const t of tree())for(const c of t.cats)for(const s of c.subs)m[s.name]={t,c,s};return m;}
const sortSpk=a=>a.sort((x,y)=>speakers().indexOf(x)-speakers().indexOf(y));

function autoCode(){
  let n=0;
  for(const s of S.segs){if(isIV(s.spk))continue;
    for(const r of S.hier){if(!r.sub)continue;
      if(kwList(r.kw).some(k=>s.text.includes(k))&&!s.codes.includes(r.sub)){s.codes.push(r.sub);n++;}}}
  return n;
}

// ---------- 단어 ----------
const STOP=new Set(('그냥 이제 그래서 그런데 그러니까 그리고 하지만 근데 저는 제가 나는 내가 우리 우리가 그게 그거 이거 저거 거기 여기 뭐 좀 많이 너무 정말 진짜 아주 제일 그때 이렇게 그렇게 저렇게 '+
 '있어요 있지 없어요 했어요 해요 하는 하고 하면 되고 되는 거지 거지요 거죠 것 수 때 게 거 걸 건 데 등 더 또 잘 다 안 못 한 두 세 요즘 지금 다시 어떤 어떻게 무슨 같아요 같은 같이 '+
 '싶어 싶어요 생각 그래도 다만 오히려 이제는 예전엔 언젠가는 수시로 매일 하나 그날 그럴 그런 이런 저런 어르신 선생님 회장님 정도 별거 그거지 뭐든 서로 둘이 혼자 사람 사람들 '+
 '때가 일이 거예요 거야 하나요 있나요 하세요 계세요 보면 보니까 나서 해서 하니까 이게 그건 이건 언제 모두 가지 동안 이상 하는데 그럴때 그러면 아마 아직 벌써 원래 항상 자주 '+
 '말씀 대해 대해서 관해 위해 통해 그래 챙겨 일주일 한번 시간씩 두세 봐야 보낼 언젠가 생기 다니 끝이 틈이 대충 하루 기분 미리 거부 서류 여기저기 들여다봐 수시 갈때 어려운').split(/\s+/));
const JOSA=['에게는','한테는','에서는','으로는','에게서','한테서','이라도','에서','에게','한테','으로','부터','까지','처럼','보다','이랑','이나','이고','이면','에는','에도','와','과','은','는','이','가','을','를','에','의','도','로','만','랑','께','엔','들'];
const ONE=new Set('것 수 거 게 때 데 나 내 제 저 뭐 좀 더 또 잘 다 안 못 한 두 세 날 곳 말 번 분 살 년 건 걸 그 이 저 우 일 앞 뒤 위 속 중 쪽'.split(' '));
const VERB=/(요|다|죠|지|고|서|면|니까|는데|려고|거든|잖아|어|아|게|던|겠|며|면서|도록|든지|ㄴ|해|돼|워|했|었|았|된|한|할|될|인|일|운|울|은|는|을)$/;
function tokens(text){
  const out=[];
  for(let w of String(text).match(/[가-힣A-Za-z0-9]+/g)||[]){
    if(/[가-힣]/.test(w)){
      let stripped=false;for(const j of JOSA)if(w.length>j.length&&w.endsWith(j)){w=w.slice(0,-j.length);stripped=true;break;}
      if(w.length>2&&w.endsWith('들'))w=w.slice(0,-1);
      if(!stripped&&VERB.test(w))continue;
      if(w.length===1&&(!stripped||ONE.has(w)))continue;
    }else if(w.length<2)continue;
    if(STOP.has(w)||/^\d/.test(w))continue;out.push(w);
  }
  return out;
}
function wordFreq(segIdx){
  const f=new Map(),who=new Map();
  for(const i of segIdx){const s=S.segs[i];for(const w of tokens(s.text)){f.set(w,(f.get(w)||0)+1);if(!who.has(w))who.set(w,new Set());who.get(w).add(s.spk);}}
  return [...f].map(([w,n])=>({w,n,p:who.get(w).size})).sort((a,b)=>b.n-a.n||b.p-a.p);
}

// ================= 렌더 =================
const QN=['stt','code','hier','quote','memo','viz','exp'];
$$('#q-menu .nav-item').forEach((b,i)=>b.querySelector('.idx').textContent=String(i+1).padStart(2,'0'));
let QP='code';
$('#q-menu').addEventListener('click',e=>{const b=e.target.closest('.nav-item');if(!b)return;QP=b.dataset.q;
  $$('#q-menu .nav-item').forEach(t=>t.classList.toggle('active',t===b));
  $$('#q-result .panel').forEach(p=>p.classList.toggle('active',p.id==='qp-'+QP));
  qRender();if(window.innerWidth<=900)$('#q-result').scrollIntoView({behavior:'smooth',block:'start'});});

const empty=()=>`<div class="note">전사 자료가 아직 없습니다. 위에서 전사 자료를 넣거나 <button class="pill primary sm" data-qsample style="margin-left:6px">예시 불러오기</button></div>`;
document.addEventListener('click',e=>{if(e.target.closest('[data-qsample]'))loadExample();});

function qRender(){
  if(document.body.dataset.term!=='qual')return;
  summary();
  ({stt:rStt,code:rCode,hier:rHier,quote:rQuote,memo:rMemo,viz:rViz,exp:()=>{}})[QP]();
}
function summary(){
  const sp=speakers(),seg=S.segs.filter(s=>!isIV(s.spk)),cd=seg.filter(s=>s.codes.length).length,T=tree().filter(t=>!t.unc);
  const nSub=T.reduce((a,t)=>a+t.cats.reduce((b,c)=>b+c.subs.length,0),0),nCat=T.reduce((a,t)=>a+t.cats.length,0);
  $('#q-summary').innerHTML=!S.segs.length?`<span class="eyebrow">불러온 전사 자료</span><div class="big">0<span>발화</span></div><small class="desc">자료를 넣고 [전사 자료 적용]을 누르세요.</small>`:
    `<span class="eyebrow">${esc(S.title||'불러온 전사 자료')}</span><div class="big">${seg.length}<span>발화</span></div>`+
    `<small class="desc">대상자 ${sp.length}명 · 코딩 ${seg.length?Math.round(cd/seg.length*100):0}%<br>주제 ${T.length} · 범주 ${nCat} · 하위범주 ${nSub}</small>`+
    `<div class="chips">${sp.map(k=>`<span class="badge n" title="${esc(S.meta[k]||'')}">${esc(k)} · ${seg.filter(s=>s.spk===k).length}</span>`).join('')}</div>`;
}
function fillSelect(sel,opts,keep=true){const el=$(sel),v=el.value;el.innerHTML=opts.map(([val,lab])=>`<option value="${esc(val)}">${esc(lab)}</option>`).join('');if(keep&&opts.some(o=>o[0]===v))el.value=v;}
const spkOpts=all=>[['',all],...speakers().map(k=>[k,`참여자 ${k}${metaShort(k)?' ('+metaShort(k)+')':''}`])];
const themeOpts=()=>[['','모든 주제'],...tree().map(t=>[t.name,t.name])];

// ---------- 01 음성 → 텍스트 ----------
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
let rec=null,recOn=false;
function rStt(){
  const sp=[...speakers(),...[...$('#stt-spk').options].map(o=>o.value).filter(v=>v&&v!=='연구자')];
  fillSelect('#stt-spk',[...new Set(['연구자',...sp])].map(k=>[k,k==='연구자'?'연구자 (면담자)':'참여자 '+k]));
  if(!$('#stt-spk').dataset.init&&speakers()[0]){$('#stt-spk').value=speakers()[0];$('#stt-spk').dataset.init=1;}
  if(!SR)$('#stt-msg').textContent='이 브라우저는 음성 인식을 지원하지 않습니다. Chrome이나 Edge에서 열어 주세요. 아래 녹음 파일 전사는 쓸 수 있습니다.';
}
function addLine(text){
  text=text.trim();if(!text)return;const spk=$('#stt-spk').value||'A',ta=$('#q-raw');
  ta.value=(ta.value&&!ta.value.endsWith('\n')?ta.value+'\n':ta.value)+`${spk}: ${text}`;
  ta.scrollTop=ta.scrollHeight;applyText(ta.value,true);
  const live=$('#stt-live');if(live.querySelector('i'))live.innerHTML='';
  live.insertAdjacentHTML('beforeend',`<div><b>${esc(spk)}</b>: ${esc(text)}</div>`);
}
$('#stt-new').addEventListener('change',e=>{const v=normSpk(e.target.value);if(!v||v==='?')return;const s=$('#stt-spk');
  if(![...s.options].some(o=>o.value===v))s.insertAdjacentHTML('beforeend',`<option value="${esc(v)}">참여자 ${esc(v)}</option>`);s.value=v;e.target.value='';});
$('#stt-start').addEventListener('click',()=>{
  if(!SR){$('#stt-msg').textContent='이 브라우저는 음성 인식을 지원하지 않습니다. Chrome이나 Edge를 사용해 주세요.';return;}
  if(recOn)return;rec=new SR();rec.lang=$('#stt-lang').value;rec.continuous=true;rec.interimResults=true;recOn=true;
  let interim=null;
  rec.onresult=e=>{let tmp='';for(let i=e.resultIndex;i<e.results.length;i++){const r=e.results[i];if(r.isFinal)addLine(r[0].transcript);else tmp+=r[0].transcript;}
    if(!interim){interim=document.createElement('div');interim.style.color='var(--muted)';}
    interim.textContent=tmp?'… '+tmp:'';$('#stt-live').appendChild(interim);};
  rec.onerror=e=>{$('#stt-msg').textContent=e.error==='not-allowed'?'마이크 권한이 거부되었습니다. 주소창의 자물쇠 아이콘에서 마이크를 허용해 주세요.':e.error==='no-speech'?'말소리가 들리지 않습니다. 계속 듣는 중…':'음성 인식 오류: '+e.error;if(e.error==='not-allowed')stop();};
  rec.onend=()=>{if(recOn)try{rec.start();}catch{}};
  try{rec.start();$('#stt-dot').classList.add('on');$('#stt-msg').textContent=`듣는 중 · 화자: ${$('#stt-spk').value} (화자를 바꾸면 다음 문장부터 적용)`;}catch(x){$('#stt-msg').textContent='시작하지 못했습니다: '+x.message;recOn=false;}
});
function stop(){recOn=false;if(rec)try{rec.stop();}catch{}$('#stt-dot').classList.remove('on');$('#stt-msg').textContent='멈춤 · 인식된 문장은 전사 자료에 추가되었습니다.';}
$('#stt-stop').addEventListener('click',stop);
$('#stt-spk').addEventListener('change',()=>{if(recOn)$('#stt-msg').textContent=`듣는 중 · 화자: ${$('#stt-spk').value}`;});
$('#stt-audio').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const p=$('#stt-player');p.src=URL.createObjectURL(f);p.style.display='block';p.playbackRate=+$('#stt-rate').value;$('#stt-type').focus();});
$('#stt-rate').addEventListener('change',()=>$('#stt-player').playbackRate=+$('#stt-rate').value);
$('#stt-type').addEventListener('keydown',e=>{const p=$('#stt-player');
  if(e.key==='Enter'&&!e.isComposing){e.preventDefault();addLine(e.target.value);e.target.value='';}
  else if(e.ctrlKey&&e.code==='Space'){e.preventDefault();if(p.src)p.paused?p.play():p.pause();}
  else if(e.ctrlKey&&e.key==='ArrowLeft'){e.preventDefault();p.currentTime=Math.max(0,p.currentTime-3);}});

// ---------- 02 코딩 ----------
function hl(text,codes,idx){
  const kws=codes.flatMap(c=>idx[c]?kwList(idx[c].s.kw):[]).filter(Boolean).sort((a,b)=>b.length-a.length);
  if(!kws.length)return esc(text);
  const re=new RegExp('('+kws.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','g');
  return text.split(re).map((p,i)=>i%2?`<mark>${esc(p)}</mark>`:esc(p)).join('');
}
function codeOptions(){
  return `<option value="">+ 하위범주</option>`+tree().filter(t=>!t.unc).map(t=>`<optgroup label="${esc(t.name)}">${t.cats.map(c=>c.subs.map(s=>`<option value="${esc(s.name)}">${esc(c.name)} › ${esc(s.name)}</option>`).join('')).join('')}</optgroup>`).join('')+`<option value="__new">+ 새 하위범주 만들기…</option>`;
}
function segHTML(i,idx,opts){
  const s=S.segs[i];
  if(isIV(s.spk))return `<div class="seg iv" data-i="${i}"><span class="spk">${esc(s.spk)}</span><div class="seg-t">${esc(s.text)}</div></div>`;
  return `<div class="seg" data-i="${i}"><span class="spk" title="${esc(S.meta[s.spk]||'')}">${esc(s.spk)}</span><div><div class="seg-t">${hl(s.text,s.codes,idx)}</div><div class="seg-codes">`+
    s.codes.map(c=>`<span class="code" style="--tc:${idx[c]?idx[c].t.color:'var(--muted)'}" title="${esc(idx[c]?idx[c].t.name+' › '+idx[c].c.name:'주제 도출 표에 없음')}">${esc(c)}<button data-rm="${esc(c)}" aria-label="삭제">×</button></span>`).join('')+
    `<select data-add>${opts}</select></div></div></div>`;
}
function rCode(){
  fillSelect('#q-fspk',spkOpts('모든 대상자'));
  const o=$('#qo-code');if(!S.segs.length){o.innerHTML=empty();return;}
  const idx=subIndex(),opts=codeOptions(),fs=$('#q-fspk').value,st=$('#q-fstat').value;
  const list=S.segs.map((s,i)=>i).filter(i=>{const s=S.segs[i];if(fs&&s.spk!==fs&&!isIV(s.spk))return false;if(fs&&isIV(s.spk))return false;
    if(st==='un')return !isIV(s.spk)&&!s.codes.length;if(st==='cd')return s.codes.length>0;return true;});
  const seg=S.segs.filter(s=>!isIV(s.spk)),cd=seg.filter(s=>s.codes.length).length,used=new Set(seg.flatMap(s=>s.codes)).size;
  const scroll=o.querySelector('.seg-list')?.scrollTop||0;
  o.innerHTML=`<div class="note">참여자 발화 ${seg.length}개 중 <span class="sig">${cd}개(${seg.length?Math.round(cd/seg.length*100):0}%)</span>가 코딩되었고, 하위범주 ${used}개가 쓰였습니다.${cd<seg.length?' 미코딩 발화는 [미코딩 발화만]으로 모아 볼 수 있습니다.':''}</div>`+
    `<div class="seg-list">${list.map(i=>segHTML(i,idx,opts)).join('')||'<p class="desc">조건에 맞는 발화가 없습니다.</p>'}</div>`;
  o.querySelector('.seg-list').scrollTop=scroll;
}
function newSub(seedTheme){
  const name=(prompt('새 하위범주 이름을 입력하세요')||'').trim();if(!name)return null;
  if(!S.hier.some(r=>r.sub===name)){const cat=(prompt('어느 범주에 넣을까요? (비워 두면 나중에 지정)')||'').trim();
    const ex=S.hier.find(r=>r.cat===cat&&cat);S.hier.push({theme:ex?ex.theme:(seedTheme||''),cat,sub:name,kw:''});}
  return name;
}
$('#qo-code').addEventListener('change',e=>{const sel=e.target.closest('select[data-add]');if(!sel)return;
  const i=+sel.closest('.seg').dataset.i;let v=sel.value;if(v==='__new')v=newSub();
  if(v&&!S.segs[i].codes.includes(v))S.segs[i].codes.push(v);save();rCode();summary();});
$('#qo-code').addEventListener('click',e=>{const b=e.target.closest('[data-rm]');if(!b)return;const i=+b.closest('.seg').dataset.i;
  S.segs[i].codes=S.segs[i].codes.filter(c=>c!==b.dataset.rm);save();rCode();summary();});
$('#q-fspk').addEventListener('change',rCode);$('#q-fstat').addEventListener('change',rCode);
$('#q-auto').addEventListener('click',()=>{if(!S.segs.length)return;
  if(!S.hier.some(r=>kwList(r.kw).length)){alert('주제 도출 표에 키워드가 없습니다. [주제 도출]에서 하위범주별 키워드를 먼저 적어 주세요.');return;}
  const n=autoCode();save();rCode();summary();
  $('#qo-code').insertAdjacentHTML('afterbegin',`<div class="note">키워드로 코드 ${n}개를 새로 붙였습니다. 문맥에 맞지 않는 코드는 ×로 지우세요.</div>`);});
$('#q-clear').addEventListener('click',()=>{if(!confirm('모든 발화의 코딩을 지울까요?'))return;S.segs.forEach(s=>s.codes=[]);save();rCode();summary();});

// ---------- 03 주제 도출 ----------
function rHier(){
  const T=tree(),cnt={};T.forEach(t=>t.cats.forEach(c=>c.subs.forEach(s=>cnt[s.name]=s)));
  $('#h-edit').innerHTML=`<div class="tbl"><table class="h-table"><thead><tr><th>주제</th><th>범주</th><th>하위범주</th><th>키워드 (쉼표로 구분)</th><th>발화</th><th>대상자</th><th></th></tr></thead><tbody>`+
    S.hier.map((r,i)=>`<tr data-i="${i}">${['theme','cat','sub','kw'].map(f=>`<td><input data-f="${f}" value="${esc(r[f]||'')}"></td>`).join('')}<td class="n">${cnt[r.sub]?cnt[r.sub].segs.length:0}</td><td class="n">${cnt[r.sub]?cnt[r.sub].spk.length:0}</td><td><button class="x" data-del="${i}" aria-label="행 삭제">×</button></td></tr>`).join('')+
    `</tbody></table></div>`+(S.hier.length?'':'<p class="desc">[행 추가]를 눌러 주제·범주·하위범주를 만드세요.</p>');
  rHierOut();
}
function rHierOut(){
  const T=tree(),cnt={};T.forEach(t=>t.cats.forEach(c=>c.subs.forEach(s=>cnt[s.name]=s)));
  const seg=S.segs.map((s,i)=>i).filter(i=>!isIV(S.segs[i].spk)),have=new Set(S.hier.flatMap(r=>kwList(r.kw)));
  $$('#h-edit tr[data-i]').forEach(tr=>{const r=S.hier[+tr.dataset.i],n=tr.querySelectorAll('td.n');if(r&&n.length===2){n[0].textContent=cnt[r.sub]?cnt[r.sub].segs.length:0;n[1].textContent=cnt[r.sub]?cnt[r.sub].spk.length:0;}});
  $('#h-kw').innerHTML=wordFreq(seg).filter(x=>!have.has(x.w)).slice(0,30).map(x=>`<button data-kw="${esc(x.w)}">${esc(x.w)}<small>${x.n}</small></button>`).join('')||'<span class="desc">전사 자료를 넣으면 자주 나온 단어가 여기 나타납니다.</span>';
  const o=$('#qo-hier'),R=T.filter(t=>!t.unc);
  if(!R.length){o.innerHTML='';return;}
  const nCat=R.reduce((a,t)=>a+t.cats.length,0),nSub=R.reduce((a,t)=>a+t.cats.reduce((b,c)=>b+c.subs.length,0),0);
  const segN=S.segs.filter(s=>!isIV(s.spk)&&s.codes.length).length;
  const rows=[];R.forEach((t,ti)=>t.cats.forEach((c,ci)=>(c.subs.length?c.subs:[{name:'-',segs:[],spk:[]}]).forEach((s,si)=>rows.push(
    `<tr>${ci===0&&si===0?`<td rowspan="${t.cats.reduce((a,x)=>a+Math.max(1,x.subs.length),0)}" style="border-left:5px solid ${t.color}">주제 ${ti+1}. ${esc(t.name)}</td>`:''}${si===0?`<td rowspan="${Math.max(1,c.subs.length)}">${esc(c.name)}</td>`:''}<td>${esc(s.name)}</td><td>${sortSpk([...s.spk]).join(', ')||'-'}</td><td class="n">${s.segs.length}</td></tr>`))));
  const top=[...R].sort((a,b)=>b.spk.length-a.spk.length||b.segs.length-a.segs.length)[0];
  o.innerHTML=`<h3>하위범주 → 범주 → 주제</h3>${flowSVG(R)}`+
    `<h3>주제 도출 결과</h3><div class="tbl"><table class="h-table"><thead><tr><th>주제</th><th>범주</th><th>하위범주</th><th>대상자</th><th>발화</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`+
    `<div class="note">참여자 ${speakers().length}명의 코딩된 발화 ${segN}개에서 하위범주 ${nSub}개, 범주 ${nCat}개, 주제 ${R.length}개가 도출되었습니다. `+
    `가장 많은 대상자가 언급한 주제는 <span class="sig">‘${esc(top.name)}’</span>(${top.spk.length}명, 발화 ${top.segs.length}개)입니다.</div>`;
}
// SVG 글자 줄바꿈
const cw=(ch,fs)=>/[가-힣ㄱ-ㅎ·“”‘’]/.test(ch)?fs*1.02:/[A-Z0-9]/.test(ch)?fs*.64:fs*.55;
function wrap(str,maxW,fs,maxLines=3){
  const words=String(str).split(' '),lines=[];let cur='';const w=s=>[...s].reduce((a,c)=>a+cw(c,fs),0);
  for(const wd of words){const t=cur?cur+' '+wd:wd;if(w(t)<=maxW||!cur)cur=t;else{lines.push(cur);cur=wd;}}
  if(cur)lines.push(cur);
  const out=[];for(let l of lines){while(w(l)>maxW){let k=l.length;while(k>1&&w(l.slice(0,k))>maxW)k--;out.push(l.slice(0,k));l=l.slice(k);}out.push(l);}
  if(out.length>maxLines){out.length=maxLines;out[maxLines-1]=out[maxLines-1].slice(0,-1)+'…';}
  return out;
}
const tw=(s,fs)=>[...String(s)].reduce((a,c)=>a+cw(c,fs),0);
function textBlock(lines,x,cy,fs,anchor='middle',extra=''){
  const lh=fs*1.3,y0=cy-(lines.length-1)*lh/2;
  return `<text x="${x}" y="${y0}" text-anchor="${anchor}" dominant-baseline="central" style="font-size:${fs}px;fill:var(--ink)" ${extra}>${lines.map((l,i)=>`<tspan x="${x}" dy="${i?lh:0}">${esc(l)}</tspan>`).join('')}</text>`;
}
function flowSVG(T){
  const W=900,RH=44,GAP=14,top=44,X={s:[0,262],c:[318,560],t:[616,900]};
  let y=top,svg='';const rows=[];
  T.forEach((t,ti)=>{if(ti)y+=GAP;const t0=y;
    t.cats.forEach(c=>{const c0=y;const subs=c.subs.length?c.subs:[null];
      subs.forEach(s=>{if(s){const h=RH-8;
        svg+=`<rect x="${X.s[0]+1}" y="${y}" width="${X.s[1]-X.s[0]-2}" height="${h}" rx="10" style="fill:${t.color};fill-opacity:.12;stroke:${t.color};stroke-opacity:.45"/>`+
          textBlock(wrap(s.name,200,13,2),X.s[0]+14,y+h/2,13,'start')+
          `<text x="${X.s[1]-12}" y="${y+h/2}" text-anchor="end" dominant-baseline="central" style="font-size:12px;fill:var(--muted)">${s.segs.length}</text>`;
        rows.push({y:y+h/2,c});}
        y+=RH;});
      c.y=[c0,y-8];});
    t.y=[t0,y-8];});
  const H=y+4;
  T.forEach(t=>{
    t.cats.forEach(c=>{const cy=(c.y[0]+c.y[1])/2;
      rows.filter(r=>r.c===c).forEach(r=>svg+=`<path d="M${X.s[1]} ${r.y} C${X.s[1]+30} ${r.y} ${X.c[0]-30} ${cy} ${X.c[0]} ${cy}" style="fill:none;stroke:${t.color};stroke-opacity:.55;stroke-width:1.4"/>`);
      svg+=`<rect x="${X.c[0]}" y="${c.y[0]}" width="${X.c[1]-X.c[0]}" height="${c.y[1]-c.y[0]}" rx="12" style="fill:${t.color};fill-opacity:.22;stroke:${t.color};stroke-width:1.2"/>`+
        textBlock(wrap(c.name,X.c[1]-X.c[0]-24,14,3),(X.c[0]+X.c[1])/2,cy,14,'middle','font-weight="500"');
      const ty=(t.y[0]+t.y[1])/2;
      svg+=`<path d="M${X.c[1]} ${cy} C${X.c[1]+30} ${cy} ${X.t[0]-30} ${ty} ${X.t[0]} ${ty}" style="fill:none;stroke:${t.color};stroke-width:1.8"/>`;});
    svg+=`<rect x="${X.t[0]}" y="${t.y[0]}" width="${X.t[1]-X.t[0]-1}" height="${t.y[1]-t.y[0]}" rx="14" style="fill:${t.color};fill-opacity:.38;stroke:${t.color};stroke-width:2"/>`+
      textBlock(wrap(t.name,X.t[1]-X.t[0]-30,15,4),(X.t[0]+X.t[1])/2,(t.y[0]+t.y[1])/2,15,'middle','font-weight="700"');});
  const n=k=>T.reduce((a,t)=>a+(k==='t'?1:k==='c'?t.cats.length:t.cats.reduce((b,c)=>b+c.subs.length,0)),0);
  const head=[['s','하위범주'],['c','범주'],['t','주제']].map(([k,l])=>`<text x="${(X[k][0]+X[k][1])/2}" y="18" text-anchor="middle" style="font-size:13px;fill:var(--muted);letter-spacing:.1em">${l} (${n(k)})</text>`).join('')+
    `<text x="${(X.s[1]+X.c[0])/2}" y="18" text-anchor="middle" style="font-size:14px;fill:var(--muted)">→</text><text x="${(X.c[1]+X.t[0])/2}" y="18" text-anchor="middle" style="font-size:14px;fill:var(--muted)">→</text>`;
  return `<svg class="fig" viewBox="0 0 ${W} ${H}" role="img" aria-label="하위범주에서 범주, 주제로 이어지는 구조도">${head}${svg}</svg><p class="desc">하위범주 오른쪽 숫자는 코딩된 발화 수입니다.</p>`;
}
$('#h-edit').addEventListener('change',e=>{const inp=e.target.closest('input[data-f]');if(!inp)return;
  const i=+inp.closest('tr').dataset.i,f=inp.dataset.f,v=inp.value.trim(),old=S.hier[i][f];
  if(f==='sub'&&old&&v&&old!==v){if(S.hier.some((r,j)=>j!==i&&r.sub===v)){alert('같은 이름의 하위범주가 이미 있습니다.');inp.value=old;return;}
    S.segs.forEach(s=>s.codes=s.codes.map(c=>c===old?v:c));S.memos.forEach(m=>{if(m.target==='s:'+old)m.target='s:'+v;});}
  if(f==='theme'||f==='cat'){const k=f==='theme'?'t:':'c:';S.memos.forEach(m=>{if(m.target===k+old&&!S.hier.some((r,j)=>j!==i&&r[f]===old))m.target=k+v;});}
  S.hier[i][f]=v;save();rHierOut();summary();});
$('#h-edit').addEventListener('click',e=>{const b=e.target.closest('[data-del]');if(!b)return;const r=S.hier[+b.dataset.del];
  const used=S.segs.filter(s=>s.codes.includes(r.sub)).length;
  if(used&&!confirm(`‘${r.sub}’ 하위범주가 발화 ${used}개에 붙어 있습니다. 행을 지우면 이 코드는 ‘미분류 코드’로 남습니다. 지울까요?`))return;
  S.hier.splice(+b.dataset.del,1);save();rHier();summary();});
$('#h-add').addEventListener('click',()=>{const last=S.hier[S.hier.length-1]||{};S.hier.push({theme:last.theme||'',cat:last.cat||'',sub:'',kw:''});save();rHier();
  const ins=$$('#h-edit tr[data-i] input[data-f="sub"]');ins[ins.length-1]?.focus();});
$('#h-kw').addEventListener('click',e=>{const b=e.target.closest('[data-kw]');if(!b)return;const w=b.dataset.kw;
  S.hier.push({theme:'',cat:'',sub:S.hier.some(r=>r.sub===w)?w+' 관련':w,kw:w});save();rHier();});
$('#h-paste').addEventListener('click',()=>{
  if($('#h-pastebox')){$('#h-pastebox').remove();return;}
  $('#h-edit').insertAdjacentHTML('beforebegin',`<div id="h-pastebox" style="margin:10px 0"><textarea id="h-pt" style="min-height:140px" placeholder="엑셀에서 주제·범주·하위범주·키워드 4개 열을 복사해 붙여넣으세요"></textarea><div class="q-tools"><button class="pill primary sm" id="h-pt-ok">표 바꾸기</button><button class="pill ghost sm" id="h-pt-add">아래에 추가</button></div></div>`);
  const go=replace=>{const rows=$('#h-pt').value.replace(/\r/g,'').split('\n').filter(l=>l.trim()).map(l=>l.split('\t'));
    if(rows[0]&&rows[0].join('').includes('하위범주'))rows.shift();
    const add=rows.map(r=>({theme:(r[0]||'').trim(),cat:(r[1]||'').trim(),sub:(r[2]||'').trim(),kw:(r[3]||'').trim()})).filter(r=>r.sub||r.cat||r.theme);
    if(!add.length)return;
    // 엑셀 병합 셀(빈 칸)은 위 행 값으로 채움
    add.forEach((r,i)=>{if(i){if(!r.theme)r.theme=add[i-1].theme;if(!r.cat)r.cat=add[i-1].cat;}});
    S.hier=replace?add:S.hier.concat(add);$('#h-pastebox').remove();save();rHier();summary();};
  $('#h-pt-ok').onclick=()=>go(true);$('#h-pt-add').onclick=()=>go(false);$('#h-pt').focus();});

// ---------- 04 인용문 ----------
function rQuote(){
  fillSelect('#qt-theme',themeOpts());fillSelect('#qt-spk',spkOpts('모든 대상자'));
  const o=$('#qo-quote');if(!S.segs.length){o.innerHTML=empty();return;}
  const T=tree(),tf=$('#qt-theme').value,sf=$('#qt-spk').value,view=$('#qt-view').value;
  const Ts=T.filter(t=>!tf||t.name===tf),q=i=>`<div class="qt-q">“${esc(S.segs[i].text)}” <b>(${esc(who(S.segs[i].spk))})</b></div>`;
  let h='';
  if(view==='theme'){
    Ts.forEach(t=>{const tn=T.indexOf(t)+1;let body='';
      t.cats.forEach((c,ci)=>{let cb='';c.subs.forEach(s=>{const segs=s.segs.filter(i=>!sf||S.segs[i].spk===sf);if(segs.length)cb+=`<div class="qt-sub">하위범주 · ${esc(s.name)} <span class="badge">${sortSpk([...new Set(segs.map(i=>S.segs[i].spk))]).join(', ')}</span></div>`+segs.map(q).join('');});
        if(cb)body+=`<div class="qt-cat">${t.unc?'':tn+'-'+(ci+1)+'. '}${esc(c.name)}</div>`+cb;});
      if(body)h+=`<div class="qt-theme" style="--tc:${t.color}">${t.unc?'':'주제 '+tn+'. '}${esc(t.name)} <small style="color:var(--muted);font-weight:400">· 대상자 ${t.spk.length}명 · 발화 ${t.segs.length}개</small></div>`+body;});
  }else{
    const idx=subIndex();
    speakers().filter(k=>!sf||k===sf).forEach(k=>{let body='';
      Ts.forEach(t=>{const segs=t.segs.filter(i=>S.segs[i].spk===k);if(!segs.length)return;
        body+=`<div class="qt-cat"><span class="sw" style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${t.color};margin-right:8px"></span>${esc(t.name)}</div>`+
          segs.map(i=>`<div class="qt-q">“${esc(S.segs[i].text)}” <b>(${S.segs[i].codes.filter(c=>idx[c]&&idx[c].t.name===t.name).map(esc).join(', ')})</b></div>`).join('');});
      if(body)h+=`<div class="qt-theme" style="--tc:var(--q2)">참여자 ${esc(k)}${S.meta[k]?` <small style="color:var(--muted);font-weight:400">· ${esc(S.meta[k])}</small>`:''}</div>`+body;});
  }
  // 대상자 × 주제 매트릭스
  const sp=speakers(),R=T,max=Math.max(1,...R.flatMap(t=>sp.map(k=>t.segs.filter(i=>S.segs[i].spk===k).length)));
  const mat=`<h3>대상자 × 주제 발화 수</h3><div class="tbl"><table class="heat"><thead><tr><th>주제</th>${sp.map(k=>`<th>${esc(k)}</th>`).join('')}<th>대상자 수</th></tr></thead><tbody>`+
    R.map(t=>`<tr><td><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${t.color};margin-right:8px"></span>${esc(t.name)}</td>${sp.map(k=>{const n=t.segs.filter(i=>S.segs[i].spk===k).length;
      return `<td><span style="background:color-mix(in srgb,${t.color} ${n?Math.round(18+62*n/max):0}%,transparent)">${n||'·'}</span></td>`;}).join('')}<td>${t.spk.length}/${sp.length}</td></tr>`).join('')+`</tbody></table></div>`;
  const shared=R.filter(t=>!t.unc&&t.spk.length===sp.length).map(t=>`‘${esc(t.name)}’`);
  o.innerHTML=(h||'<p class="desc">코딩된 발화가 없습니다. [코딩 · 범주화]에서 하위범주를 붙여 주세요.</p>')+mat+
    (shared.length?note(`모든 대상자(${sp.length}명)가 공통으로 언급한 주제는 ${shared.join(', ')}입니다.`):'');
}
const note=s=>`<div class="note">${s}</div>`;
function quoteText(){
  const T=tree(),tf=$('#qt-theme').value,sf=$('#qt-spk').value,L=[];
  T.filter(t=>!tf||t.name===tf).forEach((t,ti)=>{L.push(`${t.unc?'':'주제 '+(T.indexOf(t)+1)+'. '}${t.name}`);
    t.cats.forEach((c,ci)=>{L.push(`  ${c.name}`);c.subs.forEach(s=>{const segs=s.segs.filter(i=>!sf||S.segs[i].spk===sf);if(!segs.length)return;L.push(`    - ${s.name}`);segs.forEach(i=>L.push(`      “${S.segs[i].text}” (${who(S.segs[i].spk)})`));});});L.push('');});
  return L.join('\n');
}
['#qt-view','#qt-theme','#qt-spk'].forEach(s=>$(s).addEventListener('change',rQuote));
$('#qt-copy').addEventListener('click',async()=>{const t=quoteText();try{await navigator.clipboard.writeText(t);$('#qt-copy').textContent='복사됨 ✓';}catch{prompt('아래 내용을 복사하세요',t);}setTimeout(()=>$('#qt-copy').textContent='텍스트 복사',1500);});

// ---------- 05 메모 ----------
function targetOpts(){const T=tree().filter(t=>!t.unc),o=[['all','전체 분석']];
  T.forEach(t=>{o.push(['t:'+t.name,'주제 · '+t.name]);t.cats.forEach(c=>{o.push(['c:'+c.name,'　범주 · '+c.name]);c.subs.forEach(s=>o.push(['s:'+s.name,'　　하위범주 · '+s.name]));});});
  speakers().forEach(k=>o.push(['p:'+k,'참여자 · '+k]));return o;}
const targetLabel=t=>t==='all'?'전체 분석':t.replace(/^t:/,'주제 · ').replace(/^c:/,'범주 · ').replace(/^s:/,'하위범주 · ').replace(/^p:/,'참여자 · ');
function rMemo(){
  fillSelect('#m-target',targetOpts());fillSelect('#m-filter',[['','모든 메모'],...targetOpts()]);
  const f=$('#m-filter').value,list=S.memos.filter(m=>!f||m.target===f).slice().reverse();
  $('#m-list').innerHTML=list.length?list.map(m=>`<div class="memo"><div class="memo-h"><span><span class="badge">${esc(targetLabel(m.target))}</span> ${m.title?`<b style="color:var(--ink);font-weight:500;margin-left:6px">${esc(m.title)}</b>`:''}</span><span>${esc(m.date)} <button class="x" data-mdel="${m.id}" aria-label="메모 삭제">×</button></span></div><p>${esc(m.text)}</p></div>`).join('')
    :'<p class="desc" style="margin-top:14px">저장된 메모가 없습니다.</p>';
}
$('#m-add').addEventListener('click',()=>{const text=$('#m-text').value.trim();if(!text){$('#m-text').focus();return;}
  S.memos.push({id:Date.now().toString(36),target:$('#m-target').value,title:$('#m-title').value.trim(),text,date:new Date().toLocaleString('ko-KR',{dateStyle:'short',timeStyle:'short'})});
  $('#m-text').value='';$('#m-title').value='';save();rMemo();});
$('#m-list').addEventListener('click',e=>{const b=e.target.closest('[data-mdel]');if(!b||!confirm('이 메모를 지울까요?'))return;S.memos=S.memos.filter(m=>m.id!==b.dataset.mdel);save();rMemo();});
$('#m-filter').addEventListener('change',rMemo);

// ---------- 06 시각화 ----------
let VZ='tree';
$('#v-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-v]');if(!b)return;VZ=b.dataset.v;$$('#v-tabs button').forEach(x=>x.classList.toggle('on',x===b));rViz();});
['#v-spk','#v-theme'].forEach(s=>$(s).addEventListener('change',rViz));
function rViz(){
  fillSelect('#v-spk',spkOpts('모든 대상자'));fillSelect('#v-theme',themeOpts());
  $('#v-theme').style.display=VZ==='mind'?'none':'';
  const o=$('#qo-viz');if(!S.segs.length){o.innerHTML=empty();return;}
  const sf=$('#v-spk').value,tf=$('#v-theme').value,T=tree(sf);
  if(VZ==='tree')o.innerHTML=codeTree(T.filter(t=>!tf||t.name===tf),sf);
  else if(VZ==='mind')o.innerHTML=mindMap(T.filter(t=>!t.unc),sf);
  else o.innerHTML=cloud(T,sf,tf);
}
function codeTree(T,sf){
  if(!T.length)return '<p class="desc">주제 도출 표가 비어 있습니다.</p>';
  const mx=Math.max(1,...T.map(t=>t.segs.length)),sp=speakers();
  const bar=(n,c)=>`<div style="height:10px;border-radius:999px;background:${c};opacity:.75;width:${Math.max(2,n/mx*100)}%"></div>`;
  const rows=[];
  T.forEach((t,ti)=>{rows.push(`<tr class="t0"><td><span class="sw" style="background:${t.color}"></span>${t.unc?'':'주제 '+(ti+1)+'. '}${esc(t.name)}</td><td>${sortSpk([...t.spk]).join(' ')}</td><td class="n">${t.spk.length}</td><td class="n">${t.segs.length}</td><td class="barcell">${bar(t.segs.length,t.color)}</td></tr>`);
    t.cats.forEach(c=>{rows.push(`<tr class="t1"><td>└ ${esc(c.name)}</td><td>${sortSpk([...c.spk]).join(' ')}</td><td class="n">${c.spk.length}</td><td class="n">${c.segs.length}</td><td class="barcell">${bar(c.segs.length,t.color)}</td></tr>`);
      c.subs.forEach(s=>rows.push(`<tr class="t2"><td>· ${esc(s.name)}</td><td>${sortSpk([...s.spk]).join(' ')}</td><td class="n">${s.spk.length}</td><td class="n">${s.segs.length}</td><td class="barcell">${bar(s.segs.length,t.color)}</td></tr>`));});});
  return `<h3>코드트리${sf?' · 참여자 '+esc(sf):''}</h3><div class="tbl"><table class="ctree"><thead><tr><th>코드</th><th>대상자</th><th>대상자 수</th><th>발화 수</th><th></th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`+
    `<p class="desc">대상자 수는 그 코드를 한 번 이상 언급한 참여자 수(전체 ${sp.length}명), 발화 수는 코딩된 발화 개수입니다.</p>`;
}
function mindMap(T,sf){
  if(!T.length)return '<p class="desc">주제 도출 표가 비어 있습니다.</p>';
  const W=980,cx=W/2,CAT=22,SUB=21,TG=26;
  const blockH=t=>t.cats.reduce((a,c)=>a+CAT+Math.max(0,c.subs.length)*SUB+8,0);
  const half=Math.ceil(T.length/2),sides=[T.slice(0,half),T.slice(half)];
  const sideH=sides.map(s=>s.reduce((a,t)=>a+blockH(t),0)+TG*Math.max(0,s.length-1));
  const H=Math.max(...sideH,160)+60,cy=H/2;let svg='';
  sides.forEach((side,si)=>{const d=si?-1:1;let y=cy-sideH[si]/2;
    side.forEach(t=>{const h=blockH(t),ty=y+h/2,tx=cx+d*170,bw=150;
      const tl=wrap(t.name,bw-20,14,3),bh=Math.max(46,tl.length*19+16);
      svg+=`<path d="M${cx+d*70} ${cy} C${cx+d*110} ${cy} ${tx-d*bw/2-40} ${ty} ${tx-d*bw/2} ${ty}" style="fill:none;stroke:${t.color};stroke-width:3;stroke-linecap:round"/>`;
      svg+=`<rect x="${tx-bw/2}" y="${ty-bh/2}" width="${bw}" height="${bh}" rx="16" style="fill:${t.color};fill-opacity:.32;stroke:${t.color};stroke-width:2"/>`+textBlock(tl,tx,ty,14,'middle','font-weight="700"');
      let yy=y;
      t.cats.forEach(c=>{const ccy=yy+CAT/2,ex=cx+d*258;
        svg+=`<path d="M${tx+d*bw/2} ${ty} C${tx+d*bw/2+30} ${ty} ${ex-d*34} ${ccy} ${ex} ${ccy}" style="fill:none;stroke:${t.color};stroke-width:2;stroke-opacity:.8"/>`+
          `<circle cx="${ex}" cy="${ccy}" r="4" style="fill:${t.color}"/>`+
          `<text x="${ex+d*10}" y="${ccy}" text-anchor="${d>0?'start':'end'}" dominant-baseline="central" style="font-size:14px;font-weight:500;fill:var(--ink)">${esc(c.name)} <tspan style="fill:var(--muted);font-size:12px;font-weight:400">(${c.segs.length})</tspan></text>`;
        let sy=yy+CAT;
        c.subs.forEach((s,k)=>{const scy=sy+SUB/2,sx=ex+d*22;
          svg+=`<path d="M${ex} ${ccy+4} L${ex} ${scy} L${sx-d*4} ${scy}" style="fill:none;stroke:${t.color};stroke-opacity:.5;stroke-width:1.2"/>`+
            `<text x="${sx}" y="${scy}" text-anchor="${d>0?'start':'end'}" dominant-baseline="central" style="font-size:12.5px;fill:var(--text)">${esc(s.name)} <tspan style="fill:var(--muted);font-size:11px">${s.segs.length}</tspan></text>`;
          sy+=SUB;});
        yy+=CAT+c.subs.length*SUB+8;});
      y+=h+TG;});});
  const title=S.title||'연구 주제',tl=wrap(title,120,15,3);
  svg+=`<circle cx="${cx}" cy="${cy}" r="72" style="fill:var(--btn)"/>`+textBlock(tl,cx,cy,15,'middle','font-weight="700" style="font-size:15px;fill:var(--on-btn)"').replace('style="font-size:15px;fill:var(--ink)" ','');
  return `<h3>마인드맵${sf?' · 참여자 '+esc(sf):''}</h3><div style="overflow-x:auto"><svg class="fig" viewBox="0 0 ${W} ${H}" style="min-width:720px" role="img" aria-label="주제 마인드맵">${svg}</svg></div><p class="desc">괄호와 숫자는 코딩된 발화 수입니다.</p>`;
}
function cloud(T,sf,tf){
  let segIdx=S.segs.map((s,i)=>i).filter(i=>!isIV(S.segs[i].spk)&&(!sf||S.segs[i].spk===sf));
  if(tf){const t=T.find(x=>x.name===tf);segIdx=t?t.segs:[];}
  const words=wordFreq(segIdx).slice(0,70);if(!words.length)return '<p class="desc">단어가 없습니다.</p>';
  const kwTheme={};tree().forEach(t=>t.cats.forEach(c=>c.subs.forEach(s=>kwList(s.kw).forEach(k=>{if(!kwTheme[k])kwTheme[k]=t.color;}))));
  const colorOf=w=>{for(const k in kwTheme)if(w.includes(k)||k.includes(w))return kwTheme[k];return null;};
  const W=820,H=440,mx=words[0].n,mn=words[words.length-1].n,placed=[];let svg='';
  const hit=(a)=>placed.some(b=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y);
  words.forEach((wd,k)=>{const fs=Math.round(14+(mx===mn?.5:Math.sqrt((wd.n-mn)/(mx-mn)))*40),w=tw(wd.w,fs)+6,h=fs*1.15;
    for(let t=0;t<2400;t+=1){const r=2.2*t*.12,a=t*.12+k;const x=W/2+r*Math.cos(a)*1.55-w/2,y=H/2+r*Math.sin(a)-h/2;
      if(x<4||y<4||x+w>W-4||y+h>H-4)continue;const box={x,y,w,h};if(hit(box))continue;placed.push(box);
      const c=colorOf(wd.w)||(k%3===0?'var(--lav-deep)':'var(--ink)');
      svg+=`<text x="${x+w/2}" y="${y+h/2}" text-anchor="middle" dominant-baseline="central" style="font-size:${fs}px;font-weight:${fs>30?700:500};fill:${c};opacity:${colorOf(wd.w)?1:.78}"><title>${esc(wd.w)}: ${wd.n}회 · 대상자 ${wd.p}명</title>${esc(wd.w)}</text>`;break;}});
  const tbl=`<h3>자주 나온 단어</h3><div class="tbl"><table><thead><tr><th>순위</th><th>단어</th><th>빈도</th><th>대상자 수</th></tr></thead><tbody>${words.slice(0,15).map((w,i)=>`<tr><td>${i+1}</td><td style="text-align:left">${esc(w.w)}</td><td>${w.n}</td><td>${w.p}</td></tr>`).join('')}</tbody></table></div>`;
  return `<h3>워드클라우드${sf?' · 참여자 '+esc(sf):''}${tf?' · '+esc(tf):''}</h3><svg class="fig" viewBox="0 0 ${W} ${H}" role="img" aria-label="워드클라우드">${svg}</svg>`+
    `<p class="desc">글자 크기는 빈도, 색은 그 단어를 키워드로 가진 주제입니다. 회색·보라 단어는 키워드에 없는 단어입니다. 조사·어미를 떼고 두 글자 이상 단어만 셉니다.</p>`+tbl;
}

// ================= 파일: ZIP · DOCX · XLSX =================
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};
function zip(files){
  const enc=new TextEncoder(),parts=[],cen=[];let off=0;
  for(const f of files){const name=enc.encode(f.name),data=typeof f.data==='string'?enc.encode(f.data):f.data,crc=crc32(data);
    const lh=new DataView(new ArrayBuffer(30));lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(6,0x0800,true);lh.setUint16(8,0,true);lh.setUint16(12,0x21,true);
    lh.setUint32(14,crc,true);lh.setUint32(18,data.length,true);lh.setUint32(22,data.length,true);lh.setUint16(26,name.length,true);
    parts.push(new Uint8Array(lh.buffer),name,data);
    const ch=new DataView(new ArrayBuffer(46));ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint16(8,0x0800,true);ch.setUint16(14,0x21,true);
    ch.setUint32(16,crc,true);ch.setUint32(20,data.length,true);ch.setUint32(24,data.length,true);ch.setUint16(28,name.length,true);ch.setUint32(42,off,true);
    cen.push(new Uint8Array(ch.buffer),name);off+=30+name.length+data.length;}
  const cs=cen.reduce((a,b)=>a+b.length,0),e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cs,true);e.setUint32(16,off,true);
  return new Blob([...parts,...cen,new Uint8Array(e.buffer)],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
async function unzipEntry(buf,want){
  const dv=new DataView(buf);let e=buf.byteLength-22;while(e>=0&&dv.getUint32(e,true)!==0x06054b50)e--;
  if(e<0)throw new Error('워드(.docx) 파일 형식이 아닙니다.');
  const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const dec=new TextDecoder();
  for(let i=0;i<n;i++){const method=dv.getUint16(p+10,true),cs=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),xl=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),off=dv.getUint32(p+42,true);
    const name=dec.decode(new Uint8Array(buf,p+46,nl));
    if(name===want){const lnl=dv.getUint16(off+26,true),lxl=dv.getUint16(off+28,true),data=new Uint8Array(buf,off+30+lnl+lxl,cs);
      if(method===0)return dec.decode(data);
      if(!window.DecompressionStream)throw new Error('이 브라우저는 워드 파일 읽기를 지원하지 않습니다. 최신 Chrome·Edge·Safari를 사용해 주세요.');
      return dec.decode(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());}
    p+=46+nl+xl+cl;}
  throw new Error('워드 문서 본문을 찾지 못했습니다.');
}
async function docxToText(buf){
  const xml=new DOMParser().parseFromString(await unzipEntry(buf,'word/document.xml'),'application/xml');
  const body=[...xml.getElementsByTagName('*')].find(n=>n.localName==='body');const lines=[];
  const ptext=p=>{let s='';for(const n of p.getElementsByTagName('*')){if(n.localName==='t')s+=n.textContent;else if(n.localName==='tab')s+='\t';else if(n.localName==='br')s+='\n';}return s;};
  for(const el of body.children){
    if(el.localName==='p')lines.push(...ptext(el).split('\n'));
    else if(el.localName==='tbl'){for(const tr of [...el.getElementsByTagName('*')].filter(n=>n.localName==='tr')){
      const cells=[...tr.children].filter(n=>n.localName==='tc').map(tc=>[...tc.children].filter(n=>n.localName==='p').map(ptext).join(' ').trim());
      if(cells.length===2&&cells[0]&&cells[0].length<=14)lines.push(`${cells[0]}: ${cells[1]}`);else lines.push(cells.join('\t'));}}
  }
  return lines.join('\n');
}
// DOCX 작성
const X=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const FONT='<w:rFonts w:ascii="맑은 고딕" w:hAnsi="맑은 고딕" w:eastAsia="맑은 고딕" w:cs="맑은 고딕"/>';
function R(text,o={}){return `<w:r><w:rPr>${FONT}${o.b?'<w:b/>':''}${o.i?'<w:i/>':''}${o.color?`<w:color w:val="${o.color}"/>`:''}<w:sz w:val="${(o.sz||10.5)*2}"/></w:rPr><w:t xml:space="preserve">${X(text)}</w:t></w:r>`;}
function P(runs,o={}){if(!String(runs).startsWith('<w:'))runs=R(runs,o);
  return `<w:p><w:pPr>${o.align?`<w:jc w:val="${o.align}"/>`:''}<w:spacing w:before="${o.before||0}" w:after="${o.after??120}" w:line="${o.line||300}" w:lineRule="auto"/>${o.ind?`<w:ind w:left="${o.ind}"/>`:''}${o.border?'<w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="'+o.border+'"/></w:pBdr>':''}${o.shade?`<w:shd w:val="clear" w:color="auto" w:fill="${o.shade}"/>`:''}</w:pPr>${runs}</w:p>`;}
const Hd=(t,lv=1)=>P(R(t,{b:true,sz:lv===0?18:lv===1?14:12,color:'1E2350'}),{before:lv===0?0:280,after:140});
function Tbl(rows,widths,merge){
  const tw=widths.reduce((a,b)=>a+b,0),b='<w:top w:val="single" w:sz="4" w:color="BFBCD9"/><w:left w:val="single" w:sz="4" w:color="BFBCD9"/><w:bottom w:val="single" w:sz="4" w:color="BFBCD9"/><w:right w:val="single" w:sz="4" w:color="BFBCD9"/><w:insideH w:val="single" w:sz="4" w:color="BFBCD9"/><w:insideV w:val="single" w:sz="4" w:color="BFBCD9"/>';
  return `<w:tbl><w:tblPr><w:tblW w:w="${tw}" w:type="dxa"/><w:tblBorders>${b}</w:tblBorders><w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`+
    rows.map((r,ri)=>`<w:tr>${r.map((c,ci)=>{const vm=merge&&ri>0&&ci<merge?(c===null?'<w:vMerge/>':'<w:vMerge w:val="restart"/>'):'';
      return `<w:tc><w:tcPr><w:tcW w:w="${widths[ci]}" w:type="dxa"/>${vm}${ri===0?'<w:shd w:val="clear" w:color="auto" w:fill="ECEBFA"/>':''}<w:vAlign w:val="center"/></w:tcPr>${P(R(c??'',{b:ri===0,sz:9.5}),{after:0,line:260})}</w:tc>`;}).join('')}</w:tr>`).join('')+`</w:tbl>`+P('',{after:60});
}
function docx(body){
  const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1304" w:bottom="1418" w:left="1304" w:header="851" w:footer="992" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  return zip([
    {name:'[Content_Types].xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'},
    {name:'_rels/.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'},
    {name:'word/document.xml',data:doc}]);
}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);}
const today=()=>new Date().toISOString().slice(0,10);
const fname=s=>(S.title||'질적분석').replace(/[\\/:*?"<>|]/g,'').slice(0,40);

function reportDocx(){
  const T=tree(),R0=T.filter(t=>!t.unc),sp=speakers();let b='';
  b+=Hd(`${S.title||'질적 연구'} 분석 결과`,0)+P(R(`작성일 ${today()} · 연구 참여자 ${sp.length}명 · 참여자 발화 ${S.segs.filter(s=>!isIV(s.spk)).length}개`,{color:'7D8098',sz:9.5}),{after:240});
  b+=Hd('1. 연구 참여자의 일반적 특성');
  b+=Tbl([['참여자','특성','발화 수'],...sp.map(k=>[k,S.meta[k]||'-',String(S.segs.filter(s=>s.spk===k).length)])],[1400,6000,1500]);
  b+=Hd('2. 주제 도출 결과');
  const nCat=R0.reduce((a,t)=>a+t.cats.length,0),nSub=R0.reduce((a,t)=>a+t.cats.reduce((x,c)=>x+c.subs.length,0),0);
  b+=P(`자료 분석 결과 ${nSub}개의 하위범주, ${nCat}개의 범주, ${R0.length}개의 주제가 도출되었다.`);
  const rows=[['주제','범주','하위범주','참여자','발화']];
  R0.forEach((t,ti)=>t.cats.forEach((c,ci)=>(c.subs.length?c.subs:[{name:'-',spk:[],segs:[]}]).forEach((s,si)=>rows.push([ci===0&&si===0?`${ti+1}. ${t.name}`:null,si===0?c.name:null,s.name,sortSpk([...s.spk]).join(', '),String(s.segs.length)]))));
  b+=Tbl(rows,[2400,2000,2600,1300,700],2);
  b+=Hd('3. 주제별 진술');
  T.forEach((t,ti)=>{b+=Hd(`${t.unc?'':'주제 '+(ti+1)+'. '}${t.name}`,2);
    t.cats.forEach((c,ci)=>{b+=P(R(`${t.unc?'':(ti+1)+'-'+(ci+1)+'. '}${c.name}`,{b:true,sz:11}),{before:120,after:80});
      c.subs.forEach(s=>{if(!s.segs.length)return;b+=P(R(`하위범주: ${s.name} (참여자 ${sortSpk([...s.spk]).join(', ')})`,{color:'5A5C80',sz:10}),{ind:200,after:60});
        s.segs.forEach(i=>b+=P(R(`“${S.segs[i].text}”`,{sz:10})+R(` (${who(S.segs[i].spk)})`,{color:'7D8098',sz:9}),{ind:400,after:80,border:'C9C8F0'}));});});});
  b+=Hd('4. 대상자 × 주제 발화 수');
  b+=Tbl([['주제',...sp,'대상자 수'],...T.map(t=>[t.name,...sp.map(k=>String(t.segs.filter(i=>S.segs[i].spk===k).length)),`${t.spk.length}/${sp.length}`])],[3000,...sp.map(()=>Math.round(4800/Math.max(1,sp.length))),1100]);
  if(S.memos.length){b+=Hd('5. 연구자 메모');S.memos.forEach(m=>{b+=P(R(`[${targetLabel(m.target)}] `,{b:true,sz:10,color:'7F7ED0'})+R(m.title||'',{b:true,sz:10})+R(`  ${m.date}`,{sz:9,color:'7D8098'}),{before:120,after:40});
    m.text.split('\n').forEach(l=>b+=P(R(l,{sz:10}),{ind:200,after:40,shade:'FDF4D3'}));});}
  download(docx(b),`${fname()}_분석결과_${today()}.docx`);
}
function exampleDocx(){
  let b=Hd(`${EX.title} 심층면담 전사자료`,0)+P(R('[형식 안내 · 한 줄에 한 발화를 “화자: 내용”으로 적고, @ 줄은 참여자 정보, 대괄호 줄은 제목입니다]',{color:'7D8098',sz:9.5}),{after:200});
  b+=P(R('[참여자 정보]',{b:true}));
  EX.text.split('\n').forEach(l=>{if(!l.trim())return b+=P('',{after:60});
    if(/^\[.*\]$/.test(l))return b+=P(R(l,{b:true,sz:11.5,color:'1E2350'}),{before:200,after:100});
    const m=l.match(/^([^:]{1,10}):\s*(.*)$/);
    b+=m?P(R(m[1]+': ',{b:true,color:IV.test(m[1])?'7D8098':'1E2350'})+R(m[2]),{after:80}):P(R(l,{color:'5A5C80'}),{after:60});});
  download(docx(b),'예시_노인의성공적노화_면담전사.docx');
}
function sheet(aoa,widths){const ws=XLSX.utils.aoa_to_sheet(aoa);ws['!cols']=widths.map(w=>({wch:w}));return ws;}
function workbook(withResults){
  const wb=XLSX.utils.book_new(),idx=subIndex();
  XLSX.utils.book_append_sheet(wb,sheet([['순번','참여자','발화','하위범주','범주','주제'],...S.segs.map((s,i)=>[i+1,s.spk,s.text,s.codes.join('; '),[...new Set(s.codes.map(c=>idx[c]?.c.name).filter(Boolean))].join('; '),[...new Set(s.codes.map(c=>idx[c]?.t.name).filter(Boolean))].join('; ')])],[6,8,70,26,20,26]),'전사자료');
  const T=tree();
  XLSX.utils.book_append_sheet(wb,sheet([['주제','범주','하위범주','키워드','발화 수','대상자 수','대상자'],...S.hier.map(r=>{const s=idx[r.sub]?.s;return [r.theme,r.cat,r.sub,r.kw,s?s.segs.length:0,s?s.spk.length:0,s?sortSpk([...s.spk]).join(', '):''];})],[26,20,26,36,8,9,16]),'주제도출');
  XLSX.utils.book_append_sheet(wb,sheet([['참여자','특성'],...speakers().map(k=>[k,S.meta[k]||''])],[8,50]),'대상자정보');
  if(withResults){
    const q=[['주제','범주','하위범주','참여자','인용문']];T.forEach(t=>t.cats.forEach(c=>c.subs.forEach(s=>s.segs.forEach(i=>q.push([t.name,c.name,s.name,S.segs[i].spk,`“${S.segs[i].text}”`])))));
    XLSX.utils.book_append_sheet(wb,sheet(q,[26,20,26,8,70]),'인용문');
    const sp=speakers();
    XLSX.utils.book_append_sheet(wb,sheet([['주제',...sp,'대상자 수'],...T.map(t=>[t.name,...sp.map(k=>t.segs.filter(i=>S.segs[i].spk===k).length),t.spk.length])],[28,...sp.map(()=>6),9]),'대상자x주제');
    const wf=wordFreq(S.segs.map((s,i)=>i).filter(i=>!isIV(S.segs[i].spk))).slice(0,100);
    XLSX.utils.book_append_sheet(wb,sheet([['단어','빈도','대상자 수'],...wf.map(w=>[w.w,w.n,w.p])],[16,8,9]),'단어빈도');
  }
  XLSX.utils.book_append_sheet(wb,sheet([['대상','제목','메모','작성일'],...S.memos.map(m=>[targetLabel(m.target),m.title||'',m.text,m.date])],[26,20,70,16]),'연구자메모');
  return wb;
}
const needX=()=>{if(!window.XLSX){alert('엑셀 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.');return false;}return true;};
$('#x-xlsx').addEventListener('click',()=>{if(!S.segs.length)return alert('먼저 전사 자료를 넣어 주세요.');if(needX())XLSX.writeFile(workbook(true),`${fname()}_분석결과_${today()}.xlsx`);});
$('#x-docx').addEventListener('click',()=>{if(!S.segs.length)return alert('먼저 전사 자료를 넣어 주세요.');reportDocx();});
$('#x-ex-xlsx').addEventListener('click',()=>{if(!needX())return;const keep=S;S=exampleState();XLSX.writeFile(workbook(false),'예시_노인의성공적노화_전사자료.xlsx');S=keep;});
$('#x-ex-docx').addEventListener('click',exampleDocx);

// ---------- 불러오기 ----------
function importWorkbook(wb){
  const grids=wb.SheetNames.map(n=>({n,g:XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:false,defval:''}).filter(r=>r.some(c=>String(c).trim()))}));
  const find=(h,re)=>h.findIndex(c=>re.test(String(c).replace(/\s/g,'')));
  let segs=null,hier=null,meta={},memos=null;
  for(const {g} of grids){if(!g.length)continue;const h=g[0].map(String);
    const iT=find(h,/^(발화|내용|진술|응답|텍스트|전사|원문|대화)/),iS=find(h,/^(참여자|대상자|화자|이름|ID|코드명|참가자)/i);
    const iSub=find(h,/^(하위범주|코드|개념)/),iCat=find(h,/^범주/),iTh=find(h,/^(주제|대주제|테마)/),iKw=find(h,/키워드/),iM=find(h,/^메모$/);
    if(iT>=0&&iS>=0&&!segs){segs=g.slice(1).filter(r=>String(r[iT]).trim()).map(r=>({spk:normSpk(r[iS]||'?'),text:String(r[iT]).trim(),codes:iSub>=0?String(r[iSub]).split(/[;；\n]/).map(x=>x.trim()).filter(Boolean):[]}));
      if(iSub>=0&&iCat>=0&&!hier){const hh=[];g.slice(1).forEach(r=>{const subs=String(r[iSub]).split(/[;；\n]/).map(x=>x.trim()).filter(Boolean),cats=String(r[iCat]).split(/[;；\n]/).map(x=>x.trim()),ths=iTh>=0?String(r[iTh]).split(/[;；\n]/).map(x=>x.trim()):[];
        subs.forEach((s,k)=>{if(!hh.some(x=>x.sub===s))hh.push({theme:ths[k]??ths[0]??'',cat:cats[k]??cats[0]??'',sub:s,kw:''});});});if(hh.length)hier=hh;}
      continue;}
    if(iSub>=0&&(iCat>=0||iTh>=0)&&iT<0){let pt='',pc='';hier=g.slice(1).map(r=>{const t=String(r[iTh]??'').trim()||pt,c=String(r[iCat]??'').trim()||pc;pt=t;pc=c;return {theme:t,cat:c,sub:String(r[iSub]).trim(),kw:iKw>=0?String(r[iKw]).trim():''};}).filter(r=>r.sub);continue;}
    if(iS>=0&&iT<0&&iSub<0){g.slice(1).forEach(r=>{const k=normSpk(r[iS]);if(k&&k!=='?')meta[k]=r.filter((c,j)=>j!==iS&&String(c).trim()).join(', ');});continue;}
    if(iM>=0){const iTg=find(h,/^대상/),iTi=find(h,/^제목/),iD=find(h,/작성일|날짜/);
      memos=g.slice(1).filter(r=>String(r[iM]).trim()).map((r,k)=>({id:Date.now().toString(36)+k,target:labelToTarget(iTg>=0?r[iTg]:''),title:iTi>=0?String(r[iTi]):'',text:String(r[iM]),date:iD>=0?String(r[iD]):today()}));}
  }
  if(!segs){const g=grids[0]?.g||[];const p=parseTranscript(g.map(r=>r.length>=2&&String(r[0]).length<=14?`${r[0]}: ${r.slice(1).join(' ')}`:r.join(' ')).join('\n'));segs=p.segs;Object.assign(meta,p.meta);}
  if(!segs.length)throw new Error('엑셀에서 발화를 찾지 못했습니다. ‘참여자’와 ‘발화’ 열이 있는지 확인해 주세요.');
  S.segs=segs;S.meta=meta;if(hier)S.hier=hier;if(memos)S.memos=memos;
  $('#q-raw').value=toText();save();qRender();
  return `엑셀에서 발화 ${segs.length}개${hier?`, 하위범주 ${hier.length}개`:''}${memos?`, 메모 ${memos.length}개`:''}를 불러왔습니다.`;
}
function labelToTarget(l){l=String(l||'').trim();const m=l.match(/^(주제|범주|하위범주|참여자)\s*·\s*(.+)$/);if(!m)return 'all';return ({주제:'t:',범주:'c:',하위범주:'s:',참여자:'p:'})[m[1]]+m[2].trim();}
$('#q-file').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;e.target.value='';
  try{
    if(/\.docx$/i.test(f.name)){const t=await docxToText(await f.arrayBuffer());$('#q-raw').value=t;if(!applyText(t))return;
      const h=parseTranscript(t).head;S.title=(h||f.name.replace(/\.docx$/i,'')).replace(/\s*(심층)?면담\s*전사\s*자료$|\s*전사\s*자료$/,'').trim();save();summary();}
    else if(/\.xlsx?$/i.test(f.name)){if(!needX())return;const name=f.name.replace(/\.xlsx?$/i,'');if(!S.title)S.title=name;importWorkbook(XLSX.read(await f.arrayBuffer()));}
    else{const t=await f.text();$('#q-raw').value=t;applyText(t);}
  }catch(x){$('#q-summary').innerHTML=`<span class="eyebrow">불러오기 실패</span><p class="err">${esc(x.message)}</p>`;}});
$('#q-apply').addEventListener('click',()=>applyText($('#q-raw').value));
$('#q-sample').addEventListener('click',loadExample);

// ================= 예시: 노인의 성공적 노화 =================
const EX={title:'노인의 성공적 노화',text:`@A 여, 72세, 혼자 거주, 복지관 회원
@B 남, 78세, 배우자와 거주, 전직 교사
@C 여, 81세, 아들 가족과 거주, 신앙생활
@D 남, 69세, 배우자와 거주, 노인 일자리 참여
@E 여, 75세, 혼자 거주, 자원봉사자
@F 남, 84세, 배우자와 거주, 경로당 회장

[참여자 A 면담]
연구자: 어르신께서 생각하시는 ‘잘 늙는다’는 건 어떤 모습인가요?
A: 별거 있나요. 아프지 않고 내 발로 걸어 다니는 거지. 그래서 아침마다 공원을 한 시간씩 걸어요.
A: 혼자 살다 보니까 밥을 대충 먹게 되는데, 그래도 반찬 두세 가지는 꼭 해서 챙겨 먹으려고 해요.
연구자: 요즘 하루는 주로 어떻게 보내세요?
A: 복지관에 가서 노래교실도 하고 스마트폰 배우는 수업도 들어요. 이제 손주한테 사진도 보낼 줄 알아요.
A: 거기 가면 친구들이 있으니까 외로울 틈이 없어요. 혼자 집에만 있으면 우울해지거든.
A: 딸이 일주일에 한 번은 꼭 전화를 해요. 손녀 목소리 들으면 그날은 하루 종일 기분이 좋아.
연구자: 나이 드는 것에 대해서는 어떻게 생각하세요?
A: 나이 먹는 건 자연스러운 거지요. 주름 생기는 거 속상해해 봐야 뭐 해요, 받아들여야지.
A: 남들하고 비교하면 끝이 없어요. 내 분수에 맞게 사는 게 제일 편해요.

[참여자 B 면담]
연구자: 선생님께서 생각하시는 성공적인 노후는 어떤 건가요?
B: 교직에 40년 있었으니까, 이제는 내 경험을 젊은 사람들한테 전해 주는 게 보람이에요.
B: 동네 아이들한테 일주일에 두 번 한자를 가르쳐요. 그 시간이 제일 기다려집니다.
B: 집사람하고 둘이 사는데, 서로 약 챙겨 주고 병원도 같이 다니고. 의지가 많이 되지요.
연구자: 건강 관리는 어떻게 하고 계세요?
B: 혈압이 좀 있어서 해마다 건강검진은 꼭 받고, 저녁엔 집사람이랑 산책을 해요.
B: 요즘은 컴퓨터로 글 쓰는 걸 공부하고 있어요. 자서전을 한번 써 보려고요.
연구자: 앞으로의 삶에 대해서는 어떤 생각을 하세요?
B: 죽음이 두렵지는 않아요. 언젠가는 다 떠나는 거니까 담담하게 생각합니다.
B: 다만 아이들한테 짐이 되면 안 되니까, 재산 정리도 미리 해 두고 연명치료 거부 서류도 써 놨어요.

[참여자 C 면담]
연구자: 어르신은 어떨 때 ‘잘 살고 있다’고 느끼세요?
C: 새벽 기도 다녀오면 마음이 편안해요. 하나님께 감사하다는 생각뿐이지.
C: 젊었을 땐 욕심도 많았는데, 이제는 다 내려놓으니까 오히려 마음이 가벼워요.
C: 아들 내외랑 같이 사는데 며느리가 참 잘해 줘요. 손자들 커 가는 거 보는 게 낙이지.
연구자: 몸은 좀 어떠세요?
C: 무릎이 아파서 오래 서 있지는 못해요. 그래도 늙으면 다 그런 거라고 받아들이고 살아요.
C: 당뇨가 있어서 밥은 꼭 제때 먹고 약도 잘 챙겨 먹어요.
C: 교회 식구들이 수시로 와서 들여다봐 주니까 외롭지 않아요.
연구자: 마지막으로 하고 싶으신 말씀이 있으세요?
C: 갈 때가 되면 조용히 가는 게 소원이에요. 죽음은 하나님 곁으로 가는 거니까 무섭지 않아.

[참여자 D 면담]
연구자: 은퇴 후 생활은 어떻게 하고 계세요?
D: 노인 일자리로 초등학교 등굣길 안전 지킴이를 해요. 용돈 정도지만 내 손으로 버니까 떳떳하지요.
D: 일하러 나간다는 게 중요해요. 아침에 갈 데가 있다는 게 사람을 살게 해요.
D: 연금이랑 합쳐서 자식들한테 손 안 벌리고 사는 게 자립이고 자존심이에요.
연구자: 건강을 위해 하시는 것이 있나요?
D: 주말마다 친구들하고 등산을 가요. 동창 모임이 산악회처럼 됐어요.
D: 아내가 몸이 약해서 살림은 내가 맡아서 해요. 둘이 서로 의지하며 사는 거지.
연구자: 요즘 새롭게 도전하시는 게 있나요?
D: 유튜브 보면서 영어 공부를 시작했어요. 손자랑 영어로 몇 마디 하는 게 목표예요.
D: 나이는 숫자라고들 하지만 몸이 예전 같지 않은 건 받아들여야지요. 무리하지 않으려고 해요.

[참여자 E 면담]
연구자: 어르신에게 행복한 노년이란 무엇인가요?
E: 남을 도울 수 있을 때가 제일 행복해요. 도시락 배달 봉사를 10년째 하고 있어요.
E: 봉사하면서 나보다 어려운 사람을 보면 내가 가진 것에 감사하게 돼요.
E: 남편 먼저 보내고 혼자 사는데, 이웃들이 친구처럼 지내 줘서 든든해요.
연구자: 힘드신 점은 없으세요?
E: 혼자 사니까 아플 때가 제일 걱정이지. 그래서 매일 체조하고 건강검진도 빠지지 않아요.
E: 자식들한테 부담 주기 싫어서 나중에 요양원 갈 비용도 조금씩 모아 두고 있어요.
연구자: 다른 사람과 비교하실 때는 없으세요?
E: 예전엔 남들 사는 거 보면 부러웠는데, 이제는 비교 안 해요. 나는 나대로 잘 살았다 싶어요.
E: 성당에서 기도하면 마음이 가라앉아요. 신앙이 없었으면 많이 힘들었을 거예요.

[참여자 F 면담]
연구자: 회장님께서는 노년을 어떻게 보내고 계세요?
F: 경로당 회장을 5년째 하고 있어요. 동네 노인들 챙기고 모임 꾸리는 게 내 일이지요.
F: 젊은 사람들한테 옛날 농사짓던 경험을 들려주면 아주 좋아해요. 그럴 때 내가 아직 쓸모 있구나 싶어.
F: 할멈하고 60년을 같이 살았어요. 이제는 눈빛만 봐도 서로 다 알아요.
연구자: 건강은 어떠세요?
F: 여든이 넘으니 여기저기 아프지. 세월을 어떻게 이겨요, 받아들여야지.
F: 그래도 매일 아침 경로당까지 걸어가고 게이트볼도 쳐요. 운동을 안 하면 금방 누워요.
연구자: 앞으로 바라시는 것이 있다면요?
F: 마지막까지 자식들 신세 안 지고 내 집에서 지내다 가는 거. 그게 제일 큰 바람이에요.
F: 죽는 건 겁 안 나요. 다만 손주들 장가가는 건 보고 떠나고 싶어.`,
hier:[
 ['몸과 마음의 건강을 스스로 돌봄','신체 건강 관리','규칙적인 운동과 걷기','운동, 걷기, 걸어, 산책, 체조, 등산, 게이트볼'],
 ['몸과 마음의 건강을 스스로 돌봄','신체 건강 관리','식사와 건강검진 챙기기','밥, 반찬, 검진, 병원, 혈압, 당뇨'],
 ['몸과 마음의 건강을 스스로 돌봄','정서적 안정','욕심을 내려놓고 감사하기','욕심, 내려놓, 감사, 편안'],
 ['몸과 마음의 건강을 스스로 돌봄','정서적 안정','신앙에 의지하기','교회, 성당, 기도, 신앙, 하나님'],
 ['관계 속에서 의미를 찾음','가족과의 유대','자녀·손주와의 교류','자녀, 아들 내외, 딸이, 손주, 손자, 손녀, 며느리'],
 ['관계 속에서 의미를 찾음','가족과의 유대','배우자와 서로 의지하기','집사람, 아내, 남편, 할멈, 영감'],
 ['관계 속에서 의미를 찾음','사회적 관계망','친구·이웃과 어울림','친구, 이웃, 경로당, 모임, 동창'],
 ['관계 속에서 의미를 찾음','사회적 관계망','복지관 프로그램 참여','복지관, 노래교실, 수업'],
 ['여전히 쓸모 있는 존재로 살아감','사회 공헌','봉사와 나눔','봉사, 도울, 도와, 나눔'],
 ['여전히 쓸모 있는 존재로 살아감','사회 공헌','경험을 전해 주기','경험, 가르쳐, 가르치, 젊은 사람'],
 ['여전히 쓸모 있는 존재로 살아감','배움과 일의 지속','새로운 배움에 도전','배우, 공부, 스마트폰, 컴퓨터, 영어'],
 ['여전히 쓸모 있는 존재로 살아감','배움과 일의 지속','일과 경제적 자립','일자리, 일하러, 용돈, 연금, 자립'],
 ['노화를 받아들이고 삶을 정리함','노화의 수용','몸의 변화를 받아들이기','나이, 늙으면, 받아들, 자연스러운, 세월'],
 ['노화를 받아들이고 삶을 정리함','노화의 수용','남과 비교하지 않기','비교, 남들, 분수'],
 ['노화를 받아들이고 삶을 정리함','삶의 마무리 준비','죽음에 대한 담담한 태도','죽음, 죽는, 떠나, 조용히 가는'],
 ['노화를 받아들이고 삶을 정리함','삶의 마무리 준비','자녀에게 짐이 되지 않기','짐이, 부담, 재산 정리, 요양원, 신세'],
],
memos:[
 ['all','건강의 의미','6명 모두 ‘건강’을 먼저 이야기했지만 뜻은 조금씩 달랐다. A·F는 ‘내 발로 걷는 것’(이동 능력), B·C·E는 ‘질병 관리’에 가깝다. 하위범주를 나눌 근거가 됨.'],
 ['t:여전히 쓸모 있는 존재로 살아감','역할 상실과 보완','B·D·E·F의 진술에서 ‘보람’, ‘떳떳’, ‘쓸모’가 반복된다. 은퇴·사별로 잃은 사회적 역할을 봉사, 일, 경험 전수로 채우는 전략으로 해석할 수 있다.'],
 ['s:자녀에게 짐이 되지 않기','범주 경계 재검토','‘자립’(D)과 ‘짐이 되지 않기’(B·E·F)가 겹친다. 경제적 자립은 3-2, 죽음 준비 맥락의 독립은 4-2로 구분하기로 함.'],
 ['p:C','현장 노트','신앙 이야기를 할 때 표정이 가장 밝았고 목소리가 커졌다. 신앙이 정서적 안정의 중심 자원으로 보인다.'],
]};
function exampleState(){
  const p=parseTranscript(EX.text);
  const st={title:EX.title,raw:EX.text,segs:p.segs,meta:p.meta,hier:EX.hier.map(([theme,cat,sub,kw])=>({theme,cat,sub,kw})),
    memos:EX.memos.map(([target,title,text],k)=>({id:'ex'+k,target,title,text,date:today()}))};
  const keep=S;S=st;autoCode();S=keep;return st;
}
function loadExample(){S=exampleState();$('#q-raw').value=EX.text;save();
  if(document.body.dataset.term!=='qual')setTerm('qual');else qRender();}

// ================= 시작 =================
load();
if(S.segs.length)$('#q-raw').value=S.raw||toText();
setTerm(location.hash.slice(1)||store.get('jd-term')||'stat');
})();

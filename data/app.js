/* 임상심리사 2급 실기 — 진도별 학습 + 서술형 빈칸 암기 */
const D=window.CP_DATA, Q=D.questions, SUBO=D.subOrder;
const byId=Object.fromEntries(Q.map(q=>[q.id,q]));
const AREAS=[["A 기초심리평가","A"],["B 기초심리상담","B"],["C 심리치료","C"],["D 자문·교육·심리재활","D"]];
const $=s=>document.querySelector(s), main=$("#main"), nav=$("#nav");
$("#stat").textContent=`기출 ${Q.length}문항 · ${SUBO.length}단원`;
let MODE="study", CUR=null, curAns="";

function esc(s){return (s||"").replace(/&/g,'&amp;').replace(/</g,'&lt;');}
function shortTitle(q){
  let t=q.q.replace(/\([^)]*\)/g,'').replace(/\s*\d+\s*(가지|단계|개).*$/,'')
        .replace(/(을|를)?\s*(쓰고.*|기술하시오|설명하시오|제시하시오|구분하시오|답하시오|쓰시오|하시오)\.?\s*$/,'').trim();
  if(/다음.{0,6}(보기|사례)|사례를 읽고/.test(q.q)) t="["+q.st+"] 사례";
  return t.length>26? t.slice(0,26)+'…': (t||q.st);
}
// ---------- 진도별 내비 ----------
function buildNav(){
  let h="";
  for(const [aname,ac] of AREAS){
    const subs=SUBO.filter(s=>s[0]===ac);
    h+=`<div class="area">${aname}</div>`;
    for(const s of subs){
      const list=Q.filter(q=>q.sub===s).sort((a,b)=>a.rank-b.rank);
      if(!list.length) continue;
      h+=`<details data-sub="${s}"><summary>${s.slice(1)}. ${list[0].st}<span class="cnt">${list.length}</span></summary><div class="arts">`;
      if(D.ov&&D.ov[s]) h+=`<div class="art ov" onclick="showOverview('${s}')"><span class="rk ovr">📖</span><span class="tt">개관 — 이론 읽을거리</span></div>`;
      for(const q of list)
        h+=`<div class="art ${q.tier==='메인'?'main':''}" data-id="${q.id}" onclick="showQ('${q.id}')"><span class="rk">${q.rank}위</span><span class="tt">${esc(shortTitle(q))}</span></div>`;
      h+=`</div></details>`;
    }
  }
  nav.innerHTML=h;
}
function fmtAns(t){
  return t.split("\n").map(ln=>{
    const head=/^(\[|※)/.test(ln.trim());
    const html=esc(ln).replace(/\*([^*]+)\*/g,'<b>$1</b>');
    return `<div class="ln${head?' h':''}">${html||'&nbsp;'}</div>`;
  }).join("");
}
function fmtPara(t){return t.split("\n").map(p=>p.trim()?'<p>'+esc(p).replace(/\*([^*]+)\*/g,'<b>$1</b>')+'</p>':'').join("");}
function wbHtml(wb){return wb.map(x=>`<div class="wbi"><b>${esc(x.t)}</b> — ${esc(x.d).replace(/\*([^*]+)\*/g,'<b>$1</b>')}</div>`).join("");}
function mdToHtml(md){
  const lines=md.split("\n"); let h="",ul=false,tb=null;
  const inl=s=>esc(s).replace(/\[([^\]]+)\]\((Q\d+)\)/g,'<a class="qlk" onclick="showQ(\'$2\')">$1</a>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
  const cu=()=>{if(ul){h+="</ul>";ul=false;}};
  const ct=()=>{if(tb){h+="<table class='ovt'>"+tb.map((r,i)=>"<tr>"+r.map(c=>i===0?"<th>"+inl(c)+"</th>":"<td>"+inl(c)+"</td>").join("")+"</tr>").join("")+"</table>";tb=null;}};
  for(const raw of lines){
    const l=raw.trim();
    if(l.startsWith("|")&&l.endsWith("|")){ cu(); const cells=l.slice(1,-1).split("|").map(x=>x.trim()); if(cells.every(c=>/^:?-+:?$/.test(c)))continue; (tb=tb||[]).push(cells); continue; } else ct();
    if(l===""){cu();continue;}
    if(l.startsWith("### ")){cu();h+="<h3>"+inl(l.slice(4))+"</h3>";}
    else if(l.startsWith("## ")){cu();h+="<h2>"+inl(l.slice(3))+"</h2>";}
    else if(l.startsWith("> ")){cu();h+="<blockquote>"+inl(l.slice(2))+"</blockquote>";}
    else if(l.startsWith("- ")){if(!ul){h+="<ul>";ul=true;}h+="<li>"+inl(l.slice(2))+"</li>";}
    else {cu();h+="<p>"+inl(l)+"</p>";}
  }
  cu();ct();return h;
}
function showOverview(sub,skip){
  MODE="study"; setMenu('study'); CUR=null;
  const ov=D.ov&&D.ov[sub]; if(!ov){homeStudy();return;}
  pushIf(skip,{t:'ov',sub:sub},'#ov:'+sub);
  const u=Q.find(q=>q.sub===sub);
  document.querySelectorAll('nav .art').forEach(a=>a.classList.remove('active'));
  const det=nav.querySelector(`details[data-sub="${sub}"]`); if(det){det.open=true; try{det.scrollIntoView({block:'nearest'});}catch(e){}}
  main.innerHTML=`<div class="crumb"><a class="back" onclick="history.back()">← 뒤로</a> · ${esc(u?u.area:'')} › ${esc(ov.title||sub)}</div>
   <div class="qhead"><h1>📖 ${esc(ov.title||sub)} — 개관</h1></div>
   <div class="note" style="margin:-2px 0 14px 2px">본문의 <b style="color:var(--blue)">파란 밑줄 링크</b>를 누르면 해당 기출 문제로 바로 이동합니다.</div>
   <div class="reading">${mdToHtml(ov.md)}</div>`;
  try{window.scrollTo(0,0);}catch(e){}
  if(window.innerWidth<=860) nav.classList.remove('open');
}
// ---------- 서술형 빈칸 엔진 ----------
function tokLines(text){
  return text.split("\n").map(line=>{
    const segs=[];
    line.split(/(\*[^*]+\*)/).forEach(p=>{
      if(p==="") return;
      if(p.length>2 && p[0]==="*" && p[p.length-1]==="*"){ segs.push({w:p.slice(1,-1),kw:true,blankable:true}); return; }
      p.split(/(\s+)/).forEach(w=>{
        if(w==="") return;
        if(/^\s+$/.test(w)){ segs.push({w,sp:true}); return; }
        const marker=/^[①-⑳]+$|^\(\d+\)$|^[-·:;,.·()\[\]]+$/.test(w);
        segs.push({w, blankable: /[가-힣A-Za-z]/.test(w) && !marker});
      });
    });
    return segs;
  });
}
function renderDrill(text,g){
  const lines=tokLines(text), cand=[];
  lines.forEach((ln,li)=>ln.forEach((t,ti)=>{ if(t.blankable) cand.push({li,ti,pri:t.kw?0:1}); }));
  cand.sort((a,b)=>a.pri-b.pri||a.li-b.li||a.ti-b.ti);
  const n=Math.round(cand.length*g/100), bs=new Set(cand.slice(0,n).map(c=>c.li+"_"+c.ti));
  return lines.map((ln,li)=>{
    const head=ln.length&&/^(\[|※)/.test((ln[0].w||"").trim());
    return `<div class="ln${head?' h':''}">`+ln.map((t,ti)=>{
      if(t.sp) return t.w;
      const e=esc(t.w), rev=(t.kw?'<b>'+e+'</b>':e).replace(/"/g,'&quot;');
      if(t.blankable && bs.has(li+"_"+ti))
        return `<span class="bk" title="클릭하면 정답" onclick="this.outerHTML=this.getAttribute('data-r')" data-r="${rev}">${' '.repeat(0)}${'_'.repeat(Math.max(2,Math.min(t.w.length,9)))}</span>`;
      return t.kw?'<b>'+e+'</b>':e;
    }).join("")+`</div>`;
  }).join("");
}
function updateDrill(g){ const b=$("#drillBox"); if(b){b.innerHTML=renderDrill(curAns,+g);} const gv=$("#gv"); if(gv)gv.textContent=g; const r=$("#gauge"); if(r&&+r.value!==+g)r.value=g; }
function setGauge(g){ updateDrill(g); }
// ---------- 문항 상세 ----------
function showQ(id,skip){
  MODE="study"; const q=byId[id]; if(!q) return; CUR=id; curAns=q.a;
  pushIf(skip,{t:'q',id:id},'#'+id);
  setMenu('study');
  document.querySelectorAll('nav .art').forEach(a=>a.classList.toggle('active',a.dataset.id===id));
  const det=nav.querySelector(`details[data-sub="${q.sub}"]`); if(det){det.open=true; try{det.scrollIntoView({block:'nearest'});}catch(e){}}
  const kw=q.kw.map(k=>`<span>${esc(k)}</span>`).join("");
  main.innerHTML=`
   <div class="crumb"><a class="back" onclick="history.back()">← 뒤로</a> · ${esc(q.area)} › ${esc(q.st)}</div>
   <div class="qhead"><h1>${esc(q.q)}</h1></div>
   <div class="badges">
     <span class="badge ${q.tier==='메인'?'main':''}">${q.tier} · 빈도 ${q.rank}위</span>
     <span class="badge">가중치 ${q.w}</span>
     ${q.sc?`<span class="badge">평균 ${q.sc}점</span>`:''}
     ${q.star?'<span class="badge star">★ 최신 26a 출제</span>':''}
   </div>
   ${q.cs? ('<div class="sect">📋 보기 · 사례</div><div class="qbox">'+esc(q.cs).replace(/\n/g,'<br>')+'</div>') : ''}
   ${q.bg? ('<div class="sect">📖 배경 · 이해</div><div class="understand">'+fmtPara(q.bg)+'</div>') : ''}
   ${q.wb&&q.wb.length? ('<div class="sect">🔍 문항 해설 · 낱말분해</div><div class="wb">'+wbHtml(q.wb)+'</div>') : ''}
   ${q.hook? ('<div class="sect">🧠 외우기 고리</div><div class="hook">'+esc(q.hook).replace(/\*([^*]+)\*/g,'<b>$1</b>')+'</div>') : ''}
   <div class="sect">📌 핵심어 (필수 기재)</div><div class="kw">${kw}</div>
   <div class="sect">✍️ 시험용 답안</div><div class="ans">${fmtAns(q.a)}</div>
   <div class="sect">📝 서술형 빈칸 암기 <span class="dnote">가리기 <span id="gv">45</span>% · 빈칸 클릭하면 정답</span></div>
   <div class="drill-ctl">
     <button class="db" onclick="setGauge(0)">전체 보기</button>
     <input type="range" id="gauge" min="0" max="100" value="45" step="5" oninput="updateDrill(this.value)">
     <button class="db" onclick="setGauge(100)">완성(다 가리기)</button>
   </div>
   <div class="ans drill" id="drillBox"></div>
   <div class="sect">🗓️ 출제 회차 (${q.ses.length}회)</div><div class="note">${esc(q.ses.join(" · "))}</div>
   <div class="note" style="margin-top:16px">※ 핵심어(<b style="color:var(--hl)">빨강</b>)는 채점 시 반드시 들어가야 하는 단어입니다.</div>`;
  updateDrill(45);
  try{window.scrollTo(0,0);}catch(e){}
  if(window.innerWidth<=860) nav.classList.remove('open');
}
function homeStudy(skip){
  pushIf(skip,{t:'home'},'#home');
  const mainN=Q.filter(q=>q.tier==='메인').length;
  const cards=AREAS.map(([an])=>`<div class="card"><b>${Q.filter(q=>q.area===an).length}</b><br><small>${an}</small></div>`).join("");
  main.innerHTML=`<div class="intro">
    <h1 style="border-left:5px solid var(--accent);padding-left:14px">임상심리사 2급 실기 — 진도별 학습</h1>
    <p style="margin:12px 0 4px">2003~2026년 기출 <b>${Q.length}문항</b>을 출제빈도순으로 ${SUBO.length}개 세부단원에 정리했습니다. 왼쪽에서 문항을 선택하세요.</p>
    <ul>
      <li><b>메인 ${mainN}문항</b> = 누적 출제율 약 80%</li>
      <li>문항마다 핵심어 + 시험용 답안 + <b>서술형 빈칸 암기</b>(단계적으로 가리고 클릭해 확인)</li>
      <li>상단 <b>📝 빈칸 암기</b>에서 단원별로 몰아서 연습할 수 있습니다.</li>
    </ul>
    <div class="cards">${cards}</div>
  </div>`;
}
function doSearch(){
  const k=$("#q").value.trim(); if(!k) return;
  MODE="study"; setMenu('study');
  const kl=k.toLowerCase();
  const hits=Q.filter(q=>q.q.toLowerCase().includes(kl)||q.kw.join(" ").toLowerCase().includes(kl)||q.a.toLowerCase().includes(kl)).sort((a,b)=>a.rank-b.rank);
  main.innerHTML=`<div class="crumb">검색</div><h1 style="border-left:5px solid var(--accent);padding-left:14px">‘${esc(k)}’ 검색결과 ${hits.length}건</h1><div style="margin-top:14px">`+
    (hits.map(q=>`<div class="art" style="padding:8px 4px;border-bottom:1px solid #eee;cursor:pointer" onclick="showQ('${q.id}')"><span class="rk" style="background:${q.tier==='메인'?'var(--accent)':'#b9a4d6'}">${q.rank}위</span> <span>${esc(q.q.slice(0,60))}</span> <span style="color:var(--txt3);font-size:12px">· ${esc(q.st)}</span></div>`).join("")||"<p>결과 없음</p>")+`</div>`;
}
// ---------- 빈칸 암기 모드(단원별 몰아서) ----------
let dq=null;
function drillSetup(skip){
  MODE="drill"; setMenu('drill'); pushIf(skip,{t:'drill'},'#drill');
  let opts=`<option value="all">전체 (${Q.length}문항)</option>`;
  for(const [an,ac] of AREAS){
    opts+=`<optgroup label="${an}">`;
    opts+=`<option value="area:${ac}">▸ ${an} 전체 (${Q.filter(q=>q.area===ac+an.slice(1)).length||Q.filter(q=>q.sub[0]===ac).length})</option>`;
    for(const s of SUBO.filter(x=>x[0]===ac)){ const n=Q.filter(q=>q.sub===s).length; if(n)opts+=`<option value="sub:${s}">　${s.slice(1)}. ${Q.find(q=>q.sub===s).st} (${n})</option>`; }
    opts+=`</optgroup>`;
  }
  main.innerHTML=`<div class="ox-wrap"><div class="ox-setup">
    <h2>📝 서술형 빈칸 암기</h2>
    <p style="color:var(--txt2);margin-bottom:8px">단원을 골라 문항을 차례로 보며 답안을 가리고 떠올려 보세요. 빈칸을 클릭하면 정답이 나옵니다.</p>
    <div class="ox-row"><label>범위</label><select id="d-scope">${opts}</select></div>
    <div class="ox-row"><label>가리기</label>
      <select id="d-g"><option value="45">핵심어 위주(45%)</option><option value="25">조금(25%)</option><option value="70">많이(70%)</option><option value="100">완성(100%)</option></select>
      <label style="min-width:auto;margin-left:8px"><input type="checkbox" id="d-shuf"> 순서 섞기</label>
    </div>
    <div class="ox-row"><button class="btn" onclick="drillStart()">시작</button></div>
  </div></div>`;
}
function drillStart(){
  const scope=$("#d-scope").value, g=+$("#d-g").value, shuf=$("#d-shuf").checked;
  let pool=Q.slice();
  if(scope.startsWith("area:")) pool=pool.filter(q=>q.sub[0]===scope.slice(5));
  else if(scope.startsWith("sub:")) pool=pool.filter(q=>q.sub===scope.slice(4));
  pool.sort((a,b)=>a.rank-b.rank);
  if(shuf) for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  if(!pool.length){alert("문항이 없습니다.");return;}
  dq={pool,i:0,g}; drillCard();
}
function drillCard(){
  const q=dq.pool[dq.i];
  main.innerHTML=`<div class="ox-wrap">
   <div class="ox-prog"><span>${dq.i+1} / ${dq.pool.length} · ${esc(q.st)}</span><span>${q.rank}위</span></div>
   <div class="ox-bar"><i style="width:${(dq.i)/dq.pool.length*100}%"></i></div>
   <div class="crumb">${esc(q.area)} › ${esc(q.st)}</div>
   <h1 style="font-size:18px;border-left:5px solid var(--accent);padding-left:12px">${esc(q.q)}</h1>
   ${q.cs? ('<div class="qbox" style="margin-top:8px">'+esc(q.cs).replace(/\n/g,'<br>')+'</div>') : ''}
   <div class="sect">📝 답안 빈칸 <span class="dnote">가리기 <span id="gv2">${dq.g}</span>% · 빈칸 클릭 = 정답</span></div>
   <div class="drill-ctl">
     <button class="db" onclick="setGauge2(0)">전체 보기</button>
     <input type="range" id="gauge2" min="0" max="100" value="${dq.g}" step="5" oninput="setGauge2(this.value)">
     <button class="db" onclick="setGauge2(100)">완성</button>
   </div>
   <div class="ans drill" id="drillBox2"></div>
   <div style="display:flex;justify-content:space-between;margin-top:18px">
     <button class="btn ghost" onclick="drillPrev()" ${dq.i===0?'disabled':''}>← 이전</button>
     <button class="btn ghost" onclick="showQ('${q.id}')">상세 보기</button>
     <button class="btn" onclick="drillNext()">${dq.i+1>=dq.pool.length?'끝':'다음 →'}</button>
   </div></div>`;
  setGauge2(dq.g);
}
function setGauge2(g){ const b=$("#drillBox2"); if(b)b.innerHTML=renderDrill(dq.pool[dq.i].a,+g); const v=$("#gv2"); if(v)v.textContent=g; const r=$("#gauge2"); if(r&&+r.value!==+g)r.value=g; }
function drillNext(){ if(dq.i+1>=dq.pool.length){drillSetup();return;} dq.i++; drillCard(); }
function drillPrev(){ if(dq.i>0){dq.i--; drillCard();} }
// ---------- 라우팅 ----------
function setMenu(v){ $("#m-study").classList.toggle("on",v==='study'); $("#m-drill").classList.toggle("on",v==='drill'); }
function view(v){ MODE=v; setMenu(v); if(v==='drill') drillSetup(); else { if(CUR)showQ(CUR); else homeStudy(); } }
$("#q").addEventListener("keydown",e=>{ if(e.key==='Enter')doSearch(); });
function pushIf(skip,state,hash){ try{ if(skip) history.replaceState(state,'',hash); else history.pushState(state,'',hash); }catch(e){} }
window.addEventListener('popstate',e=>{ const s=e.state; if(!s) return homeStudy(true); if(s.t==='q')showQ(s.id,true); else if(s.t==='ov')showOverview(s.sub,true); else if(s.t==='drill')drillSetup(true); else homeStudy(true); });
buildNav();
(function(){ var h=decodeURIComponent((location.hash||'').replace(/^#/,'')); if(h.indexOf('ov:')===0&&D.ov&&D.ov[h.slice(3)])return showOverview(h.slice(3),true); if(/^Q\d+$/.test(h)&&byId[h])return showQ(h,true); if(h==='drill')return drillSetup(true); homeStudy(true); })();

/* Dashboard enhancements (new file). Loads after app.js and upgrades its UI functions. */
(function(){
const g=id=>document.getElementById(id);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep=ms=>new Promise(r=>setTimeout(r,reduce?10:ms));
const prefs=Object.assign({auto:true,esc:true,toast:true,fx:true},JSON.parse((()=>{try{return localStorage.getItem('sa_prefs')}catch(_){return null}})()||'{}'));
const savePrefs=()=>{try{localStorage.setItem('sa_prefs',JSON.stringify(prefs))}catch(_){}};
let attention=new Set((()=>{try{return JSON.parse(localStorage.getItem('sa_attention')||'[]')}catch(_){return[]}})());
const saveAtt=()=>{try{localStorage.setItem('sa_attention',JSON.stringify([...attention]))}catch(_){}};
const initials=n=>String(n||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?';
const hue=n=>{let h=0;for(const c of String(n))h=(h*31+c.charCodeAt(0))%360;return h};
const avatar=(n,cls='')=>`<div class="avatar ${cls}" style="background:linear-gradient(135deg,hsl(${hue(n)},70%,65%),hsl(${(hue(n)+50)%360},70%,60%))">${esc(initials(n))}</div>`;
const fmtTime=iso=>{try{return new Date(iso).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}catch(_){return''}};
function ago(iso){const s=Math.max(0,(Date.now()-new Date(iso))/1000);if(s<60)return'now';if(s<3600)return Math.floor(s/60)+'m';if(s<86400)return Math.floor(s/3600)+'h';return Math.floor(s/86400)+'d'}

/* greeting */
const hr=new Date().getHours(),first=String(window.CREATOR_NAME||'').split(' ')[0]||'there';
g('greet').innerHTML=`${hr<12?'Good morning':hr<18?'Good afternoon':'Good evening'}, <span class="grad">${esc(first)}</span>`;
g('dateLine').textContent=new Date().toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'}).toUpperCase();

/* toasts */
function toast(title,msg,red){
  if(!prefs.toast)return;
  const t=document.createElement('div');t.className='toast'+(red?' red':'');t.innerHTML=`<b>${esc(title)}</b><span>${esc(msg||'')}</span>`;
  g('toasts').appendChild(t);setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),350)},3600);
}
window.alert=m=>toast('Notice',m);

/* particles */
const cv=g('bg'),ctx=cv.getContext('2d');let W,H,P=[];
function size(){W=cv.width=innerWidth;H=cv.height=innerHeight;P=Array.from({length:Math.min(45,Math.floor(W/30))},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.2,vy:(Math.random()-.5)*.2,r:Math.random()*1.4+.4}))}
size();addEventListener('resize',size);
(function f(){ctx.clearRect(0,0,W,H);if(prefs.fx)for(const a of P){a.x+=a.vx;a.y+=a.vy;if(a.x<0||a.x>W)a.vx*=-1;if(a.y<0||a.y>H)a.vy*=-1;ctx.fillStyle='rgba(67,226,154,.4)';ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,7);ctx.fill()}if(!reduce)requestAnimationFrame(f)})();
const glow=g('glow');addEventListener('pointermove',e=>{glow.style.left=e.clientX+'px';glow.style.top=e.clientY+'px'},{passive:true});

/* view switching */
const views=['home','inbox','memory','analytics','settings'];
function showView(v){
  document.body.dataset.view=v;
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
  const target=(v==='home'||v==='inbox')?'home':v;
  ['home','memory','analytics','settings'].forEach(k=>{const el=g('v-'+k);el.hidden=k!==target;if(k===target){el.style.animation='none';void el.offsetWidth;el.style.animation=''}});
  if(v==='analytics')drawAnalytics();
  if(v==='memory')drawMemory(g('memSearch').value);
  history.replaceState(null,'','#'+v);
}
g('nav').addEventListener('click',e=>{const b=e.target.closest('button');if(b)showView(b.dataset.view)});

/* count-up stats */
const cur={sMessages:0,sReplies:0,sEscalations:0};
function countTo(id,to){
  const el=g(id),from=cur[id];cur[id]=to;if(from===to){el.textContent=to;return}
  const t0=performance.now(),dur=reduce?1:900;
  (function tick(t){const p=Math.min((t-t0)/dur,1),e=1-Math.pow(1-p,3);el.textContent=Math.round(from+(to-from)*e);if(p<1)requestAnimationFrame(tick)})(t0);
}
window.loadStats=async function(){
  try{const d=await(await fetch('/api/stats')).json();countTo('sMessages',d.messages);countTo('sReplies',d.replies);countTo('sEscalations',d.escalations);lastStats=d;
    if(document.body.dataset.view==='analytics')drawAnalytics()}catch(_){}
};
let lastStats={messages:0,replies:0,escalations:0};

/* inbox list */
let listSig='';
window.loadConversations=async function(){
  let data;try{data=await(await fetch('/api/conversations')).json()}catch(_){return}
  const sig=JSON.stringify(data.map(c=>[c.id,c.last_message,c.updated_at]))+selectedId+[...attention];
  const nb=g('navBadge');nb.textContent=attention.size;nb.hidden=!attention.size;
  if(sig===listSig)return;listSig=sig;
  g('conversationList').innerHTML=data.length?data.map((c,i)=>`
    <div class="conversation ${selectedId===c.id?'selected':''}" style="animation-delay:${Math.min(i,8)*.05}s" onclick="openConversation(${c.id})">
      ${avatar(c.sender_name)}
      <div class="tx"><b><span>${esc(c.sender_name)}</span>${attention.has(c.id)||c.status!=='active'?'<span class="badge">ATTENTION</span>':`<time>${ago(c.updated_at)}</time>`}</b><p>${esc(c.last_message||'No messages')}</p></div>
    </div>`).join(''):`<div class="placeholder"><div class="ph-ic">📭</div>No conversations yet.<br>Send a simulated DM to begin.</div>`;
};

/* conversation + messages */
window.openConversation=async function(id){
  selectedId=id;let d;try{d=await(await fetch(`/api/conversations/${id}`)).json()}catch(_){return}
  g('chatName').textContent=d.conversation.sender_name;
  g('chatAva').outerHTML=avatar(d.conversation.sender_name,'big').replace('class="avatar big"','class="avatar big" id="chatAva"');
  g('chatStatus').textContent=(attention.has(id)?'NEEDS ATTENTION':d.conversation.status.toUpperCase());
  renderMessages(d.messages);listSig='';loadConversations();
  if(innerWidth<800)g('messages').scrollIntoView({behavior:'smooth',block:'center'});
};
window.renderMessages=function(ms){
  const box=g('messages');
  box.innerHTML=ms.length?ms.map((m,i)=>`<div class="msg ${m.sender}" style="animation-delay:${Math.min(i,10)*.04}s">${esc(m.message)}<small><span>${m.sender==='ghostmate'?'Shadow Assistant':'Sender'}</span><span>${fmtTime(m.timestamp)}</span></small></div>`).join(''):`<div class="placeholder">No messages.</div>`;
  box.scrollTop=box.scrollHeight;
};
function showTyping(){const t=document.createElement('div');t.className='typing';t.id='typing';t.innerHTML='<i></i><i></i><i></i>';g('messages').appendChild(t);g('messages').scrollTop=1e9}

/* pipeline loader */
const STEPS=['Understanding intent','Retrieving creator memory','Reasoning about risk','Deciding: reply or escalate'];
async function runPipeline(signal){
  g('decisionBadge').textContent='THINKING…';g('decisionBadge').style.color='#4cc9f0';
  g('decision').innerHTML=`<div class="pipeline">${STEPS.map((s,i)=>`<div class="pstep" id="ps${i}"><i>${i+1}</i>${s}</div>`).join('')}</div>`;
  for(let i=0;i<STEPS.length;i++){
    const el=g('ps'+i);if(!el)return;el.classList.add('on');await sleep(420);
    if(i<STEPS.length-1&&el){el.classList.remove('on');el.classList.add('done');el.querySelector('i').textContent='✓'}
  }
  await signal;
}

/* send */
let busy=false;
window.sendDM=async function(){
  if(busy)return;
  const msg=g('dm').value.trim();if(!msg){g('dm').focus();return}
  const sender=g('sender').value.trim()||'Demo User';
  const id=selectedId?String(selectedId):'demo-'+sender.toLowerCase().replace(/[^a-z0-9]+/g,'-');
  busy=true;g('sendBtn').classList.add('loading');
  // optimistic bubble
  const box=g('messages');if(box.querySelector('.placeholder'))box.innerHTML='';
  box.insertAdjacentHTML('beforeend',`<div class="msg user">${esc(msg)}<small><span>Sender</span><span>${fmtTime(new Date())}</span></small></div>`);
  g('dm').value='';box.scrollTop=box.scrollHeight;
  setTimeout(showTyping,350);
  const req=fetch('/api/incoming',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sender_id:id,sender_name:sender,message:msg})}).then(async r=>({ok:r.ok,d:await r.json()})).catch(()=>({ok:false,d:{error:'Network error'}}));
  const [res]=await Promise.all([req,runPipeline(req)]);
  const t=g('typing');if(t)t.remove();
  busy=false;g('sendBtn').classList.remove('loading');
  if(!res.ok){toast('Could not send',res.d.error||'Error',true);g('decisionBadge').textContent='ERROR';return}
  const d=res.d;selectedId=d.conversation_id;
  if(d.decision.action==='escalate'){attention.add(d.conversation_id);saveAtt()}
  renderMessages(d.history);showDecision(d.decision);
  g('chatName').textContent=sender;g('chatAva').outerHTML=avatar(sender,'big').replace('class="avatar big"','class="avatar big" id="chatAva"');g('chatStatus').textContent=d.decision.action==='escalate'?'NEEDS ATTENTION':'ACTIVE';
  listSig='';await loadConversations();await loadStats();
  d.decision.action==='escalate'?toast('🚨 Escalated to you',d.decision.intent,true):toast('✓ Replied automatically',d.decision.intent);
};
g('dm').addEventListener('keydown',e=>{if(e.key==='Enter')sendDM()});

/* decision card */
window.showDecision=function(d){
  const esc_=d.action==='escalate';
  g('decisionBadge').textContent=esc_?'ESCALATION':'AUTO REPLY';
  g('decisionBadge').style.color=esc_?'#ff7f94':'#6fe5ab';
  g('decisionBadge').style.borderColor=esc_?'#5b2230':'#244a38';
  const conf=Math.round((d.confidence||0)*100),pr=d.priority||0;
  const match=(d.memory_matches&&d.memory_matches.length)?`<div class="match"><b>🔎 Memory match</b><br>${esc(d.memory_matches[0].question)} <span style="opacity:.7">· ${Math.round((d.memory_matches[0].relevance||0)*100)}%</span></div>`:'';
  g('decision').innerHTML=`<div class="decision-card">
    <label class="tag">AI DECISION</label>
    <div class="big ${esc_?'high':'low'}">${esc(d.intent)}</div>
    <div class="rings">
      <div class="ring ${esc_?'red':''}"><svg width="84" height="84" viewBox="0 0 84 84"><circle class="bg" cx="42" cy="42" r="36"/><circle class="fg" id="ringFg" cx="42" cy="42" r="36"/></svg><b id="ringNum">0%</b><small>CONFIDENCE</small></div>
      <div class="prio ${pr>=70?'hi':''}"><span>PRIORITY <b style="color:#fff">${pr}/100</b></span><div class="bar"><i id="prioBar"></i></div></div>
    </div>
    <div class="kv"><div><span>ACTION</span><b>${esc_?'Escalate':'Auto reply'}</b></div><div><span>HUMAN</span><b>${esc_?'REQUIRED':'NOT REQUIRED'}</b></div></div>
    <div class="reason"><b>Decision explanation</b><br>${esc(d.reason)}</div>
    ${match}
    <div class="draft"><b>${esc_?'Draft (not sent)':'Response sent'}</b><br>${esc(d.reply)}</div>
    <div class="action ${esc_?'escalate':'auto'}">${esc_?'🚨 Creator attention required':'✓ Shadow Assistant replied automatically'}</div>
    ${esc_?`<div class="buttons"><button class="approve" onclick="approve(${d.decision_id})">Approve Draft</button><button onclick="takeover(${d.decision_id})">Take Over</button></div>`:''}</div>`;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    g('ringFg').style.strokeDashoffset=226-226*conf/100;g('prioBar').style.width=pr+'%';
    const t0=performance.now();(function tick(t){const p=Math.min((t-t0)/1100,1);g('ringNum').textContent=Math.round(conf*p)+'%';if(p<1&&g('ringNum'))requestAnimationFrame(tick)})(t0);
  }));
};

/* approve / takeover */
window.approve=async function(id){
  await fetch(`/api/decision/${id}/approve`,{method:'POST'});
  if(selectedId){attention.delete(selectedId);saveAtt();await openConversation(selectedId)}
  loadStats();toast('✓ Draft approved','The reply was sent to the sender.');
};
window.takeover=async function(id){
  await fetch(`/api/decision/${id}/takeover`,{method:'POST'});toast('🙋 Human takeover','Recorded for this demo.');
};

/* memory view */
function drawMemory(q){
  q=(q||'').toLowerCase();const items=(window.MEMORY||[]).filter(m=>!q||(m.q+' '+m.a).toLowerCase().includes(q));
  g('memCount').textContent=items.length+' entries';
  g('memList').innerHTML=items.map((m,i)=>`<div class="mem" style="animation-delay:${Math.min(i,14)*.03}s"><b>${esc(m.q)}</b><p>${esc(m.a)}</p></div>`).join('')||'<div class="placeholder">No matching knowledge.</div>';
}
g('memSearch').addEventListener('input',e=>drawMemory(e.target.value));

/* analytics view */
function drawAnalytics(){
  const s=lastStats,total=Math.max(s.replies+s.escalations,0),C=2*Math.PI*70;
  const a=total?s.replies/total:0,e=total?s.escalations/total:0;
  g('donutBox').innerHTML=`<svg class="donut" viewBox="0 0 190 190"><g transform="rotate(-90 95 95)"><circle cx="95" cy="95" r="70" stroke="#1a222d"/>
    <circle class="seg" id="segA" cx="95" cy="95" r="70" stroke="#43e29a" stroke-dasharray="0 ${C}"/>
    <circle class="seg" id="segE" cx="95" cy="95" r="70" stroke="#ff647c" stroke-dasharray="0 ${C}" stroke-dashoffset="${-C*a}"/></g>
    <text x="95" y="93" text-anchor="middle" fill="#fff" font-size="30" font-weight="800">${total?Math.round(a*100):0}%</text><text x="95" y="114" text-anchor="middle" fill="#8792a2" font-size="10">AUTOMATED</text></svg>
    <div class="legend"><div><i style="background:#43e29a"></i>Auto replies · <b>${s.replies}</b></div><div><i style="background:#ff647c"></i>Escalations · <b>${s.escalations}</b></div><div><i style="background:#1a222d"></i>Total decisions · <b>${total}</b></div></div>`;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{const A=g('segA'),E=g('segE');if(A){A.setAttribute('stroke-dasharray',`${C*a} ${C}`);E.setAttribute('stroke-dasharray',`${C*e} ${C}`)}}));
  const mx=Math.max(s.messages,s.replies,s.escalations,1);
  const rows=[['Incoming messages',s.messages,'linear-gradient(90deg,#4cc9f0,#8b7bff)'],['AI replies',s.replies,'linear-gradient(90deg,#43e29a,#4cc9f0)'],['Escalations',s.escalations,'linear-gradient(90deg,#ff9b6b,#ff647c)']];
  g('barBox').innerHTML=rows.map(r=>`<div class="brow"><span>${r[0]}<b>${r[1]}</b></span><div class="bar"><i data-w="${r[1]/mx*100}" style="background:${r[2]}"></i></div></div>`).join('');
  requestAnimationFrame(()=>requestAnimationFrame(()=>g('barBox').querySelectorAll('i').forEach(i=>i.style.width=i.dataset.w+'%')));
}

/* settings toggles */
document.querySelectorAll('.tgl').forEach(b=>{
  b.classList.toggle('on',!!prefs[b.dataset.k]);
  b.addEventListener('click',()=>{prefs[b.dataset.k]=!prefs[b.dataset.k];b.classList.toggle('on',prefs[b.dataset.k]);savePrefs();
    if(b.dataset.k==='toast'&&prefs.toast)toast('Notifications on','You will see pop-ups for new decisions.')});
});

/* init */
const start=location.hash.slice(1);showView(views.includes(start)?start:'home');
loadConversations();loadStats();
/* app.js fires its own first load before these overrides exist; refresh once so the new UI always wins */
setTimeout(()=>{listSig='';loadConversations();loadStats()},1200);
})();

/* Landing page interactions (new file) */
(function(){
const $=s=>document.querySelector(s);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* sticky nav */
const nav=$('#nav');addEventListener('scroll',()=>nav.classList.toggle('scrolled',scrollY>20),{passive:true});

/* cursor glow */
const glow=$('#glow');
addEventListener('pointermove',e=>{glow.style.left=e.clientX+'px';glow.style.top=e.clientY+'px'},{passive:true});

/* card spotlight */
document.querySelectorAll('.card').forEach(c=>c.addEventListener('pointermove',e=>{
  const r=c.getBoundingClientRect();c.style.setProperty('--mx',(e.clientX-r.left)+'px');c.style.setProperty('--my',(e.clientY-r.top)+'px');
}));

/* phone tilt */
const stage=$('#stage'),phone=$('#phone');
if(!reduce&&matchMedia('(hover:hover)').matches){
  stage.addEventListener('pointermove',e=>{
    const r=stage.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
    phone.style.transform=`rotateY(${-8+x*14}deg) rotateX(${4-y*12}deg)`;
  });
  stage.addEventListener('pointerleave',()=>phone.style.transform='');
}

/* marquee duplicate for seamless loop */
const track=$('#track');track.innerHTML+=track.innerHTML;

/* scroll reveal + counters + pipeline */
const io=new IntersectionObserver(es=>es.forEach(en=>{
  if(!en.isIntersecting)return;en.target.classList.add('in');io.unobserve(en.target);
  en.target.querySelectorAll&&en.target.querySelectorAll('[data-count]').forEach(count);
}),{threshold:.18});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
function count(el){
  const to=+el.dataset.count,suf=el.dataset.suffix||'',t0=performance.now(),dur=1400;
  if(reduce||to===0){el.textContent=to+suf;return}
  (function tick(t){const p=Math.min((t-t0)/dur,1),e=1-Math.pow(1-p,3);el.textContent=Math.round(to*e)+suf;if(p<1)requestAnimationFrame(tick)})(t0);
}

/* particle background */
const cv=$('#bg'),ctx=cv.getContext('2d');let W,H,P=[];
function size(){W=cv.width=innerWidth;H=cv.height=innerHeight;P=Array.from({length:Math.min(70,Math.floor(W/20))},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25,r:Math.random()*1.6+.4}))}
size();addEventListener('resize',size);
function frame(){
  ctx.clearRect(0,0,W,H);
  for(const a of P){a.x+=a.vx;a.y+=a.vy;if(a.x<0||a.x>W)a.vx*=-1;if(a.y<0||a.y>H)a.vy*=-1;
    ctx.fillStyle='rgba(67,226,154,.55)';ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,7);ctx.fill();
    for(const b of P){const d=Math.hypot(a.x-b.x,a.y-b.y);if(d<120){ctx.strokeStyle=`rgba(76,201,240,${.13*(1-d/120)})`;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}}}
  requestAnimationFrame(frame);
}
if(!reduce)frame();

/* looping chat demo */
const chat=$('#chat'),chipI=$('#chipIntent'),chipD=$('#chipDecision');
const script=[
 {q:'Which camera are you shooting with these days?',intent:'Camera / gear question',a:'I usually record with my Sony A7 IV 🎥',type:'out',tag:'AUTO REPLY · 94% CONFIDENCE',dec:'✓ Auto reply',cls:'ok'},
 {q:'What do you record your voice with?',intent:'Microphone question',a:'I use the Shure SM7B for my main audio setup.',type:'out',tag:'AUTO REPLY · 91% CONFIDENCE',dec:'✓ Auto reply',cls:'ok'},
 {q:'We want to offer you ₹2,00,000 for a sponsorship next month.',intent:'Paid sponsorship offer',a:'Flagged for Alex — priority 95/100. Draft prepared, nothing promised.',type:'esc',tag:'ESCALATED · NEEDS CREATOR',dec:'🚨 Escalated',cls:'no'}
];
const sleep=ms=>new Promise(r=>setTimeout(r,reduce?Math.min(ms,50):ms));
function bub(cls,html){const d=document.createElement('div');d.className='bub '+cls;d.innerHTML=html;chat.appendChild(d);while(chat.children.length>6)chat.removeChild(chat.firstChild);return d}
async function run(){
  for(;;){
    for(const s of script){
      chipI.textContent='Understanding…';chipI.className='ok';chipD.textContent='—';chipD.className='';
      bub('in',s.q);await sleep(900);
      chipI.textContent=s.intent;await sleep(700);
      const t=document.createElement('div');t.className='typing';t.innerHTML='<i></i><i></i><i></i>';chat.appendChild(t);
      await sleep(1100);t.remove();
      bub(s.type,`${s.a}<small>${s.tag}</small>`);
      chipD.textContent=s.dec;chipD.className=s.cls;
      await sleep(2600);
    }
    chat.innerHTML='';await sleep(600);
  }
}
run();
})();

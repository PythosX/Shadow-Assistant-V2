/* Login interactions (new file) */
(function(){
const $=id=>document.getElementById(id);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* glow + particles */
const glow=$('glow');addEventListener('pointermove',e=>{glow.style.left=e.clientX+'px';glow.style.top=e.clientY+'px'},{passive:true});
const cv=$('bg'),ctx=cv.getContext('2d');let W,H,P=[];
function size(){W=cv.width=innerWidth;H=cv.height=innerHeight;P=Array.from({length:Math.min(55,Math.floor(W/24))},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25,r:Math.random()*1.5+.4}))}
size();addEventListener('resize',size);
(function f(){ctx.clearRect(0,0,W,H);for(const a of P){a.x+=a.vx;a.y+=a.vy;if(a.x<0||a.x>W)a.vx*=-1;if(a.y<0||a.y>H)a.vy*=-1;ctx.fillStyle='rgba(67,226,154,.5)';ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,7);ctx.fill()}if(!reduce)requestAnimationFrame(f)})();

/* autofill with typing animation */
function type(el,text){return new Promise(res=>{el.value='';let i=0;const t=setInterval(()=>{el.value+=text[i++];if(i>=text.length){clearInterval(t);res()}},reduce?0:28)})}
$('fill').addEventListener('click',async()=>{
  $('err').textContent='';
  await type($('email'),DEMO.email);await type($('password'),DEMO.password);$('submit').focus();
});

/* click to copy */
document.querySelectorAll('[data-copy]').forEach(c=>c.addEventListener('click',()=>{
  const old=c.textContent;navigator.clipboard&&navigator.clipboard.writeText(c.dataset.copy).then(()=>{c.textContent='Copied ✓';setTimeout(()=>c.textContent=old,1100)});
}));

/* show/hide password */
$('eye').addEventListener('click',()=>{const p=$('password'),h=p.type==='password';p.type=h?'text':'password';$('eye').textContent=h?'🙈':'👁'});

/* submit */
$('form').addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=$('submit'),err=$('err'),box=$('box');
  err.textContent='';
  const email=$('email').value.trim(),password=$('password').value;
  if(!email||!password){err.textContent='Please enter your email and password.';box.classList.remove('shake');void box.offsetWidth;box.classList.add('shake');return}
  btn.classList.add('loading');btn.disabled=true;
  try{
    const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const d=await r.json().catch(()=>({}));
    if(r.ok&&d.ok){
      $('curtain').classList.add('on');
      setTimeout(()=>location.href=d.redirect||'/dashboard',reduce?0:900);
      return;
    }
    err.textContent=d.error||'Login failed. Please try again.';
  }catch(_){err.textContent='Network error. Please try again.'}
  btn.classList.remove('loading');btn.disabled=false;
  box.classList.remove('shake');void box.offsetWidth;box.classList.add('shake');
});
})();

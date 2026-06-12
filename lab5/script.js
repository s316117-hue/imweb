import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

// ══════════════════════════════════════════
//  ELEMENTS
// ══════════════════════════════════════════
const bgCanvas  = document.getElementById('bg-canvas');
const fxCanvas  = document.getElementById('fx-canvas');
const bgCtx     = bgCanvas.getContext('2d');
const fxCtx     = fxCanvas.getContext('2d');

const camBox    = document.getElementById('cam-box');
const video     = document.getElementById('webcam');
const camStatus = document.getElementById('cam-status');
const handCursor = document.getElementById('hand-cursor');
const ringBar   = document.getElementById('ring-progress');
const CIRC      = 201;

const overlay   = document.getElementById('startup-overlay');
const startMsg  = document.getElementById('startup-msg');
const startBar  = document.getElementById('startup-bar');

const cheerCountEl = document.getElementById('cheer-count');
const cheerBtn     = document.getElementById('cheer-btn');
const gGuide       = document.getElementById('gesture-guide');
const clockEl      = document.getElementById('digital-clock');
const dateEl       = document.getElementById('digital-date');

// ══════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════
let W = window.innerWidth, H = window.innerHeight;
let handLandmarker, webcamRunning = false;
let isHand = false;
let curX = W/2, curY = H/2, tgX = W/2, tgY = H/2, prevX = W/2;
let cheerCount = 88;
let lastGesture = 0;
const EMOJIS  = ['💥','✨','🔥','⭐','💫','🌟','🎆','💖','🌸','🫧'];
const TRAILS  = ['✨','💫','🌸','🔥','⭐','🫧'];

// ══════════════════════════════════════════
//  CLOCK
// ══════════════════════════════════════════
function tick() {
    const n = new Date();
    clockEl.textContent = n.toLocaleTimeString('zh-TW',{hour12:false});
    dateEl.textContent  = `${n.getFullYear()}/${String(n.getMonth()+1).padStart(2,'0')}/${String(n.getDate()).padStart(2,'0')}`;
}
setInterval(tick, 1000); tick();

// ══════════════════════════════════════════
//  RESIZE
// ══════════════════════════════════════════
function resize() {
    W = window.innerWidth; H = window.innerHeight;
    bgCanvas.width = fxCanvas.width = W;
    bgCanvas.height = fxCanvas.height = H;
    initStars();
}
window.addEventListener('resize', resize);
resize();

// ══════════════════════════════════════════
//  BACKGROUND STARFIELD (follows hand)
// ══════════════════════════════════════════
class Star {
    constructor() { this.reset(true); }
    reset(init=false) {
        this.x  = (Math.random()-.5)*W*2.2;
        this.y  = (Math.random()-.5)*H*2.2;
        this.z  = init ? Math.random()*W : W;
        this.pz = this.z;
        this.hue = 170 + Math.random()*60; // cyan-purple
    }
    update() {
        const spd = isHand ? 3.2 : 1.4;
        this.z -= spd;
        if (this.z < 1) { this.reset(); return; }
        if (isHand) {
            this.x += ((curX - W/2) - this.x) * 0.0018;
            this.y += ((curY - H/2) - this.y) * 0.0018;
        }
    }
    draw() {
        const sx = this.x/this.z*W + W/2, sy = this.y/this.z*H + H/2;
        const px = this.x/this.pz*W + W/2, py = this.y/this.pz*H + H/2;
        const r  = (1-this.z/W)*2.8;
        const a  = (1-this.z/W)*0.75;
        bgCtx.shadowBlur = 5;
        bgCtx.shadowColor = `hsl(${this.hue},100%,75%)`;
        bgCtx.strokeStyle = `hsla(${this.hue},100%,72%,${a})`;
        bgCtx.lineWidth   = r;
        bgCtx.beginPath();
        bgCtx.moveTo(px,py); bgCtx.lineTo(sx,sy);
        bgCtx.stroke();
        this.pz = this.z;
    }
}
let stars=[];
function initStars(){ stars = Array.from({length:160},()=>new Star()); }

function drawBg(){
    bgCtx.fillStyle='rgba(3,7,18,0.2)';
    bgCtx.fillRect(0,0,W,H);
    bgCtx.shadowBlur=0;
    stars.forEach(s=>{s.update();s.draw();});
    // Ambient hand glow
    if(isHand){
        const g=bgCtx.createRadialGradient(curX,curY,0,curX,curY,420);
        g.addColorStop(0,`hsla(${180+(curX/W)*80},100%,65%,0.1)`);
        g.addColorStop(1,'transparent');
        bgCtx.fillStyle=g;
        bgCtx.fillRect(0,0,W,H);
    }
    requestAnimationFrame(drawBg);
}
drawBg();

// ══════════════════════════════════════════
//  EMOJI TRAIL (follows fingertip)
// ══════════════════════════════════════════
const trail=[];
let lastTrail=0;

function addTrail(x,y,speed){
    if(Date.now()-lastTrail < 35) return;
    lastTrail=Date.now();
    const n=Math.min(3,Math.floor(speed/12)+1);
    for(let i=0;i<n;i++){
        trail.push({
            x:x+(Math.random()-.5)*25, y:y+(Math.random()-.5)*25,
            emoji:TRAILS[Math.floor(Math.random()*TRAILS.length)],
            life:1, decay:0.022+Math.random()*0.018,
            size:16+Math.random()*20,
            vx:(Math.random()-.5)*2.5, vy:(Math.random()-.5)*2.5-2,
            rot:Math.random()*360, vr:(Math.random()-.5)*14,
        });
    }
    if(trail.length>90) trail.splice(0,trail.length-90);
}

function drawTrail(){
    for(let i=trail.length-1;i>=0;i--){
        const p=trail[i];
        p.x+=p.vx; p.y+=p.vy; p.vy-=0.06; p.rot+=p.vr; p.life-=p.decay;
        if(p.life<=0){trail.splice(i,1);continue;}
        fxCtx.save();
        fxCtx.globalAlpha=p.life;
        fxCtx.translate(p.x,p.y); fxCtx.rotate(p.rot*Math.PI/180);
        fxCtx.font=`${p.size*p.life+10}px Arial`;
        fxCtx.textAlign='center'; fxCtx.textBaseline='middle';
        fxCtx.fillText(p.emoji,0,0);
        fxCtx.restore();
    }
}

// ══════════════════════════════════════════
//  PULSE WAVES
// ══════════════════════════════════════════
const pulses=[];
let lastPulse=0;
const PCOLS=['#00f2fe','#00ffcc','#7117ea','#ff0844','#a78bfa'];

function spawnPulse(x,y){
    pulses.push({x,y,r:0,maxR:180,life:1,color:PCOLS[Math.floor(Math.random()*PCOLS.length)]});
}
function drawPulses(){
    for(let i=pulses.length-1;i>=0;i--){
        const p=pulses[i];
        p.r+=5.5; p.life=1-p.r/p.maxR;
        if(p.life<=0){pulses.splice(i,1);continue;}
        fxCtx.globalAlpha=p.life*0.65;
        fxCtx.shadowBlur=18; fxCtx.shadowColor=p.color;
        fxCtx.strokeStyle=p.color; fxCtx.lineWidth=2.5*p.life;
        fxCtx.beginPath(); fxCtx.arc(p.x,p.y,p.r,0,Math.PI*2); fxCtx.stroke();
    }
    fxCtx.globalAlpha=1; fxCtx.shadowBlur=0;
}

// ══════════════════════════════════════════
//  SPARKS (joint particles on fast move)
// ══════════════════════════════════════════
const sparks=[];
function spawnSparks(lm,speed){
    if(speed<8) return;
    [4,8,12,16,20].forEach(id=>{
        const n=Math.floor(speed/10);
        for(let i=0;i<n;i++){
            sparks.push({
                x:(1-lm[id].x)*W, y:lm[id].y*H,
                vx:(Math.random()-.5)*7, vy:(Math.random()-.5)*7-3,
                life:1, hue:170+Math.random()*200,
            });
        }
    });
}
function drawSparks(){
    for(let i=sparks.length-1;i>=0;i--){
        const s=sparks[i];
        s.x+=s.vx; s.y+=s.vy; s.vy+=0.2; s.life-=0.04;
        if(s.life<=0){sparks.splice(i,1);continue;}
        fxCtx.globalAlpha=s.life;
        fxCtx.shadowBlur=10; fxCtx.shadowColor=`hsl(${s.hue},100%,70%)`;
        fxCtx.fillStyle=`hsl(${s.hue},100%,78%)`;
        fxCtx.beginPath(); fxCtx.arc(s.x,s.y,2.5*s.life,0,Math.PI*2); fxCtx.fill();
    }
    fxCtx.globalAlpha=1; fxCtx.shadowBlur=0;
}

// ══════════════════════════════════════════
//  HAND SKELETON
// ══════════════════════════════════════════
const CONNS=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],[0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17]];
let glowHue=180;

function drawSkeleton(lm){
    glowHue=160+(curX/W)*100;
    const jx=id=>(1-lm[id].x)*W, jy=id=>lm[id].y*H;

    fxCtx.shadowBlur=20; fxCtx.shadowColor=`hsl(${glowHue},100%,65%)`;
    fxCtx.strokeStyle=`hsla(${glowHue},100%,70%,0.55)`;
    fxCtx.lineWidth=2.8;
    CONNS.forEach(([a,b])=>{
        fxCtx.beginPath(); fxCtx.moveTo(jx(a),jy(a)); fxCtx.lineTo(jx(b),jy(b)); fxCtx.stroke();
    });
    lm.forEach((_,i)=>{
        const x=jx(i),y=jy(i);
        const r=i===8?7:[4,12,16,20].includes(i)?5:3.5;
        fxCtx.shadowBlur=18; fxCtx.shadowColor=`hsl(${glowHue+i*6},100%,80%)`;
        fxCtx.fillStyle=`hsl(${glowHue+i*6},100%,82%)`;
        fxCtx.beginPath(); fxCtx.arc(x,y,r,0,Math.PI*2); fxCtx.fill();
    });
    fxCtx.shadowBlur=0;
}

// ══════════════════════════════════════════
//  HOVER-TO-CLICK (cheer button)
// ══════════════════════════════════════════
let hovEl=null, hovStart=0;
const HOVER_MS=1400;

function checkHover(x,y){
    if(!isHand){resetHov();return;}
    const els=[cheerBtn];
    let found=null;
    for(const el of els){
        const r=el.getBoundingClientRect();
        if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom){found=el;break;}
    }
    if(found){
        if(hovEl===found){
            const pct=Math.min((performance.now()-hovStart)/HOVER_MS,1);
            ringBar.style.strokeDashoffset=CIRC-pct*CIRC;
            if(pct>=1){found.click();resetHov();hovStart=performance.now()+2000;}
        } else { hovEl=found; hovStart=performance.now(); }
    } else { resetHov(); }
}
function resetHov(){ hovEl=null; hovStart=0; ringBar.style.strokeDashoffset=CIRC; }

// ══════════════════════════════════════════
//  FIST
// ══════════════════════════════════════════
function isFist(lm){
    let c=0;
    [[8,5],[12,9],[16,13],[20,17]].forEach(([t,m])=>{ if(Math.hypot(lm[t].x-lm[m].x,lm[t].y-lm[m].y)<0.08)c++; });
    return c===4;
}

// ══════════════════════════════════════════
//  CHEER
// ══════════════════════════════════════════
function doCheer(x,y){
    cheerCount++;
    cheerCountEl.textContent=cheerCount;
    cheerCountEl.classList.add('pop');
    setTimeout(()=>cheerCountEl.classList.remove('pop'),400);

    // Emoji burst
    for(let i=0;i<16;i++){
        const d=document.createElement('div');
        d.className='boom-particle';
        d.style.left=(x+(Math.random()-.5)*130)+'px';
        d.style.top=(y+(Math.random()-.5)*80)+'px';
        d.style.fontSize=(1.2+Math.random()*1.5)+'rem';
        d.style.animationDelay=(Math.random()*.25)+'s';
        d.textContent=EMOJIS[Math.floor(Math.random()*EMOJIS.length)];
        document.body.appendChild(d);
        setTimeout(()=>d.remove(),1100);
    }
    // Shockwave
    for(let i=0;i<4;i++) setTimeout(()=>pulses.push({x,y,r:i*30,maxR:500,life:1,color:`hsl(${Math.random()*60+280},100%,70%)`}),i*90);
    // Screen flash
    const fl=document.createElement('div');
    fl.style.cssText=`position:fixed;inset:0;pointer-events:none;z-index:9998;
        background:radial-gradient(circle at ${x}px ${y}px,rgba(0,242,254,0.3) 0%,transparent 65%);
        animation:flash-out 0.5s ease-out forwards;`;
    document.body.appendChild(fl); setTimeout(()=>fl.remove(),600);
}

cheerBtn.addEventListener('click',e=>{
    if(e.isTrusted) doCheer(e.clientX,e.clientY);
});

// ══════════════════════════════════════════
//  CURSOR
// ══════════════════════════════════════════
function moveCursor(){
    if(isHand){
        curX+=(tgX-curX)*0.2; curY+=(tgY-curY)*0.2;
        handCursor.style.left=curX+'px'; handCursor.style.top=curY+'px';
        handCursor.classList.remove('hidden');
    } else handCursor.classList.add('hidden');
}

// ══════════════════════════════════════════
//  STARTUP OVERLAY
// ══════════════════════════════════════════
function setStartup(msg,pct){
    startMsg.textContent=msg;
    startBar.style.width=pct+'%';
}
function dismissOverlay(){
    overlay.classList.add('gone');
    gGuide.classList.remove('hidden');
}

// ══════════════════════════════════════════
//  AI INIT
// ══════════════════════════════════════════
async function initAI(){
    if(window.location.protocol==='file:'){
        setStartup('請用 localhost 伺服器開啟頁面',0);
        return;
    }
    try {
        setStartup('正在載入 AI 模型...',15);
        const vision=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
        setStartup('AI 模型下載中...',50);
        handLandmarker=await HandLandmarker.createFromOptions(vision,{
            baseOptions:{
                modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                delegate:'GPU',
            },
            runningMode:'VIDEO', numHands:1,
        });
        setStartup('請允許相機存取...',75);
        startWebcam();
    } catch(e){
        setStartup('AI 載入失敗，請重新整理頁面',0);
        startBar.style.background='#ff4757';
    }
}

function startWebcam(){
    navigator.mediaDevices.getUserMedia({video:{width:640,height:480}})
        .then(stream=>{
            video.srcObject=stream; video.play();
            webcamRunning=true;
            setStartup('相機就緒，尋找手部中...',90);
            camStatus.textContent='尋找手部中...';
            camBox.classList.remove('hidden');
            predict();
        })
        .catch(()=>{
            setStartup('相機存取被拒，請重新整理並允許',0);
            startBar.style.background='#ff4757';
        });
}

// ══════════════════════════════════════════
//  PREDICT LOOP
// ══════════════════════════════════════════
let lastVideoTime=-1;

async function predict(){
    if(!webcamRunning)return;
    // Fade FX canvas
    fxCtx.fillStyle='rgba(3,7,18,0.32)';
    fxCtx.fillRect(0,0,W,H);

    if(video.readyState>=2 && video.currentTime!==lastVideoTime){
        lastVideoTime=video.currentTime;
        const res=handLandmarker.detectForVideo(video,performance.now());

        if(res.landmarks?.length>0){
            isHand=true;
            if(overlay.parentNode) dismissOverlay();
            camStatus.textContent='✋ 已偵測手部';

            const lm=res.landmarks[0];
            tgX=(1-lm[8].x)*W; tgY=lm[8].y*H;
            const speed=Math.abs(tgX-prevX); prevX=tgX;
            const tipX=(1-lm[8].x)*W, tipY=lm[8].y*H;

            drawSkeleton(lm);
            if(speed>4) addTrail(tipX,tipY,speed);
            spawnSparks(lm,speed);
            if(performance.now()-lastPulse>2500){spawnPulse(tipX,tipY);lastPulse=performance.now();}

            drawTrail(); drawPulses(); drawSparks();
            checkHover(curX,curY);

            if(isFist(lm)&&performance.now()-lastGesture>1800){
                doCheer(curX,curY);
                lastGesture=performance.now();
            }
        } else {
            isHand=false;
            camStatus.textContent='尋找手部中...';
            resetHov();
            drawTrail(); drawPulses(); drawSparks();
        }
    } else if(isHand){
        drawTrail(); drawPulses(); drawSparks();
    }

    moveCursor();
    requestAnimationFrame(predict);
}

// inject flash keyframe
const s=document.createElement('style');
s.textContent=`@keyframes flash-out{from{opacity:1}to{opacity:0}}`;
document.head.appendChild(s);

// BOOT
initAI();

import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

// ═══════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════
const CONFIG = {
    particleCount: 180,
    baseSpeed: 1.5,
};

// ═══════════════════════════════════════
//  CANVAS SETUP
// ═══════════════════════════════════════
const canvas    = document.getElementById('particle-canvas');
const ctx       = canvas.getContext('2d');
const handCanvas = document.getElementById('hand-canvas');
const hctx      = handCanvas.getContext('2d');

let stars = [];
let interactionPoint = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let isHandDetected = false;
let currentSpeed   = CONFIG.baseSpeed;

function resize() {
    canvas.width = handCanvas.width = window.innerWidth;
    canvas.height = handCanvas.height = window.innerHeight;
    initStars();
}
window.addEventListener('resize', resize);

window.addEventListener('mousemove', (e) => {
    if (!isHandDetected) {
        interactionPoint.x = e.clientX;
        interactionPoint.y = e.clientY;
    }
});

// ═══════════════════════════════════════
//  STARFIELD
// ═══════════════════════════════════════
class Star {
    constructor() { this.reset(); }
    reset() {
        this.x  = (Math.random() - 0.5) * canvas.width * 2;
        this.y  = (Math.random() - 0.5) * canvas.height * 2;
        this.z  = Math.random() * canvas.width;
        this.pz = this.z;
    }
    update() {
        this.z -= currentSpeed;
        if (this.z < 1) {
            this.z  = canvas.width;
            this.x  = (Math.random() - 0.5) * canvas.width * 2;
            this.y  = (Math.random() - 0.5) * canvas.height * 2;
            this.pz = this.z;
        }
        if (interactionPoint.x !== null) {
            const cx = interactionPoint.x - canvas.width / 2;
            const cy = interactionPoint.y - canvas.height / 2;
            this.x += (cx - this.x) * 0.0012;
            this.y += (cy - this.y) * 0.0012;
        }
    }
    draw() {
        const sx = map(this.x / this.z, 0, 1, 0, canvas.width)  + canvas.width  / 2;
        const sy = map(this.y / this.z, 0, 1, 0, canvas.height) + canvas.height / 2;
        const r  = map(this.z, 0, canvas.width, 3, 0);
        const px = map(this.x / this.pz, 0, 1, 0, canvas.width)  + canvas.width  / 2;
        const py = map(this.y / this.pz, 0, 1, 0, canvas.height) + canvas.height / 2;
        this.pz  = this.z;
        ctx.strokeStyle = `hsla(${200 + (this.z / canvas.width) * 40}, 100%, 70%, ${1 - this.z / canvas.width})`;
        ctx.lineWidth   = r;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
    }
}

function map(v, i0, i1, o0, o1) { return o0 + (o1 - o0) * ((v - i0) / (i1 - i0)); }
function initStars() { stars = Array.from({ length: CONFIG.particleCount }, () => new Star()); }

function animate() {
    ctx.fillStyle = 'rgba(3, 7, 18, 0.18)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawAmbientGlow();           // ✨ Effect 3: ambient glow under starfield
    stars.forEach(s => { s.update(); s.draw(); });
    requestAnimationFrame(animate);
}

// ═══════════════════════════════════════
//  EFFECT 3: AMBIENT GLOW
// ═══════════════════════════════════════
let glowHue = 180;
function drawAmbientGlow() {
    if (!isHandDetected) return;
    // Hue shifts based on cursor X position across screen
    glowHue = 160 + (cursorX / window.innerWidth) * 120;
    const grad = ctx.createRadialGradient(
        cursorX, cursorY, 0,
        cursorX, cursorY, 500
    );
    grad.addColorStop(0, `hsla(${glowHue}, 100%, 65%, 0.12)`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ═══════════════════════════════════════
//  CLOCK
// ═══════════════════════════════════════
function updateClock() {
    const now  = new Date();
    document.getElementById('digital-clock').innerText =
        now.toLocaleTimeString('zh-TW', { hour12: false });
    const yyyy = now.getFullYear();
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const dd   = String(now.getDate()).padStart(2, '0');
    document.getElementById('digital-date').innerText = `${yyyy}/${mm}/${dd}`;
}
setInterval(updateClock, 1000);
updateClock();

// ═══════════════════════════════════════
//  CHEER
// ═══════════════════════════════════════
let cheerCount = 88;
const cheerCountEl = document.getElementById('cheer-count');

document.getElementById('cheer-btn').addEventListener('click', (e) => {
    incrementCheer(e.clientX, e.clientY);
});

function incrementCheer(x, y) {
    cheerCount++;
    cheerCountEl.textContent = cheerCount;
    const card = document.querySelector('.stat-card');
    card.animate([
        { transform: 'scale(1)',    borderColor: 'rgba(255,255,255,0.08)' },
        { transform: 'scale(1.08)', borderColor: '#00ffcc', boxShadow: '0 0 25px rgba(0,255,204,0.4)' },
        { transform: 'scale(1)',    borderColor: 'rgba(255,255,255,0.08)' }
    ], { duration: 500, easing: 'ease-out' });
    triggerCheer(x, y);
}

function triggerCheer(x, y) {
    for (let i = 0; i < 65; i++) {
        const div  = document.createElement('div');
        const hues = [180, 200, 320, 270];
        const hue  = hues[Math.floor(Math.random() * hues.length)];
        const color = `hsl(${hue}, 100%, 70%)`;
        div.style.cssText = `
            position:fixed; left:${x}px; top:${y}px;
            width:${Math.random()*8+6}px; height:${Math.random()*24+12}px;
            background:${color}; box-shadow:0 0 12px ${color};
            border-radius:4px; pointer-events:none; z-index:9999;
        `;
        document.body.appendChild(div);
        const angle    = Math.random() * Math.PI * 2;
        const velocity = 12 + Math.random() * 22;
        div.animate([
            { transform: `rotate(${angle}rad) translate(0,0) scale(1.2)`, opacity: 1 },
            { transform: `rotate(${angle}rad) translate(0,${velocity*15}px) scale(0)`, opacity: 0 }
        ], { duration: 800 + Math.random() * 700, easing: 'cubic-bezier(0.1,0.8,0.3,1)' })
        .onfinish = () => div.remove();
    }
}

// ═══════════════════════════════════════
//  HAND TRACKING SETUP
// ═══════════════════════════════════════
let handLandmarker;
const video = document.getElementById('webcam');
const detSt = document.getElementById('detection-status');

const cursorEl       = document.getElementById('hand-cursor');
const progressCircle = document.querySelector('.progress-ring__circle');
const circumference  = 24 * 2 * Math.PI;
progressCircle.style.strokeDasharray  = `${circumference} ${circumference}`;
progressCircle.style.strokeDashoffset = circumference;

let cursorX = window.innerWidth / 2, cursorY = window.innerHeight / 2;
let targetX = cursorX, targetY = cursorY;

function setHoverProgress(pct) {
    progressCircle.style.strokeDashoffset = circumference - (pct / 100) * circumference;
}

let hoveredEl = null, hoverStart = 0;
const HOVER_MS = 1200;

function checkHover(x, y) {
    if (!isHandDetected) { resetHover(); return; }
    const clickables = document.querySelectorAll('.big-action-btn');
    let found = null;
    for (const el of clickables) {
        const r = el.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) { found = el; break; }
    }
    if (found) {
        if (hoveredEl === found) {
            const elapsed = performance.now() - hoverStart;
            setHoverProgress(Math.min((elapsed / HOVER_MS) * 100, 100));
            if (elapsed >= HOVER_MS) {
                found.click();
                resetHover();
                hoverStart = performance.now() + 1000;
            }
        } else {
            hoveredEl = found; hoverStart = performance.now(); setHoverProgress(0);
        }
    } else {
        resetHover();
    }
}
function resetHover() { hoveredEl = null; hoverStart = 0; setHoverProgress(0); }

// ═══════════════════════════════════════
//  EFFECT 1: COMET TRAIL (指尖粒子尾巴)
// ═══════════════════════════════════════
const trail = [];
const TRAIL_MAX = 28;

function updateTrail(x, y, speed) {
    trail.push({ x, y, life: 1.0, hue: glowHue, size: 4 + Math.min(speed * 0.1, 12) });
    if (trail.length > TRAIL_MAX) trail.shift();
}

function drawTrail() {
    trail.forEach((p, i) => {
        p.life -= 0.045;
        if (p.life <= 0) return;
        hctx.globalAlpha = p.life * 0.8;
        hctx.shadowBlur  = 12;
        hctx.shadowColor = `hsl(${p.hue}, 100%, 70%)`;
        hctx.fillStyle   = `hsl(${p.hue + i * 3}, 100%, 75%)`;
        hctx.beginPath();
        hctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        hctx.fill();
    });
    hctx.globalAlpha = 1;
    hctx.shadowBlur  = 0;
    // Clean up dead particles
    for (let i = trail.length - 1; i >= 0; i--) {
        if (trail[i].life <= 0) trail.splice(i, 1);
    }
}

// ═══════════════════════════════════════
//  EFFECT 2: PULSE WAVES (脈衝擴散波)
// ═══════════════════════════════════════
const pulseWaves = [];
let lastPulseTime = 0;

function spawnPulse(x, y, color = null) {
    pulseWaves.push({
        x, y,
        radius: 0,
        maxRadius: 180,
        life: 1.0,
        color: color || `hsl(${glowHue}, 100%, 70%)`
    });
}

function drawPulses() {
    for (let i = pulseWaves.length - 1; i >= 0; i--) {
        const w = pulseWaves[i];
        w.radius += 5;
        w.life    = 1 - (w.radius / w.maxRadius);
        if (w.life <= 0) { pulseWaves.splice(i, 1); continue; }

        hctx.globalAlpha = w.life * 0.65;
        hctx.shadowBlur  = 20;
        hctx.shadowColor = w.color;
        hctx.strokeStyle = w.color;
        hctx.lineWidth   = 2.5 * w.life;
        hctx.beginPath();
        hctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
        hctx.stroke();
    }
    hctx.globalAlpha = 1;
    hctx.shadowBlur  = 0;
}

// ═══════════════════════════════════════
//  EFFECT 4: JOINT SPARKS (關節火花)
// ═══════════════════════════════════════
const sparks = [];

function spawnSparks(lm, speed) {
    if (speed < 5) return; // Only when moving fast
    const jointIds = [4, 8, 12, 16, 20]; // Fingertips only
    const count = Math.floor(speed / 8);
    jointIds.forEach(id => {
        for (let i = 0; i < count; i++) {
            sparks.push({
                x:   (1 - lm[id].x) * handCanvas.width,
                y:   lm[id].y * handCanvas.height,
                vx:  (Math.random() - 0.5) * 6,
                vy:  (Math.random() - 0.5) * 6 - 2,
                life: 1.0,
                hue: 40 + Math.random() * 40  // Gold sparks
            });
        }
    });
}

function drawSparks() {
    sparks.forEach(s => {
        s.x    += s.vx;
        s.y    += s.vy;
        s.vy   += 0.18; // gravity
        s.life -= 0.04;
        if (s.life <= 0) return;

        hctx.globalAlpha = s.life;
        hctx.shadowBlur  = 8;
        hctx.shadowColor = `hsl(${s.hue}, 100%, 70%)`;
        hctx.fillStyle   = `hsl(${s.hue}, 100%, 80%)`;
        hctx.beginPath();
        hctx.arc(s.x, s.y, 2.5 * s.life, 0, Math.PI * 2);
        hctx.fill();
    });
    hctx.globalAlpha = 1;
    hctx.shadowBlur  = 0;
    for (let i = sparks.length - 1; i >= 0; i--) {
        if (sparks[i].life <= 0) sparks.splice(i, 1);
    }
}

// ═══════════════════════════════════════
//  EFFECT 5: SHOCKWAVE on FIST (衝擊波)
// ═══════════════════════════════════════
function triggerShockwave(x, y) {
    for (let i = 0; i < 4; i++) {
        setTimeout(() => {
            pulseWaves.push({
                x, y,
                radius: i * 30,
                maxRadius: 500,
                life: 1.0,
                color: `hsl(${Math.random() * 60 + 300}, 100%, 70%)`
            });
        }, i * 100);
    }
    // Screen flash
    const flash = document.createElement('div');
    flash.style.cssText = `
        position:fixed; inset:0; pointer-events:none; z-index:9998;
        background: radial-gradient(circle at ${x}px ${y}px,
            rgba(200,100,255,0.35) 0%, transparent 70%);
        animation: flash-out 0.6s ease-out forwards;
    `;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 600);
}

// ═══════════════════════════════════════
//  SKELETON DRAW (Enhanced)
// ═══════════════════════════════════════
function drawSkeleton(lm, speed) {
    const hue = glowHue;

    // Connections - gradient glow
    hctx.shadowBlur  = 18;
    hctx.shadowColor = `hsl(${hue}, 100%, 65%)`;
    hctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.55)`;
    hctx.lineWidth   = 2.5;

    const conns = [
        [0,1],[1,2],[2,3],[3,4],
        [0,5],[5,6],[6,7],[7,8],
        [0,9],[9,10],[10,11],[11,12],
        [0,13],[13,14],[14,15],[15,16],
        [0,17],[17,18],[18,19],[19,20],
        [5,9],[9,13],[13,17]
    ];
    conns.forEach(([a, b]) => {
        hctx.beginPath();
        hctx.moveTo((1 - lm[a].x) * handCanvas.width, lm[a].y * handCanvas.height);
        hctx.lineTo((1 - lm[b].x) * handCanvas.width, lm[b].y * handCanvas.height);
        hctx.stroke();
    });

    // Joints - pulsing dots with varying colour
    lm.forEach((p, i) => {
        const jx = (1 - p.x) * handCanvas.width;
        const jy = p.y * handCanvas.height;
        const r  = i === 8 ? 7 : (i === 0 ? 6 : 4); // Index tip largest, wrist medium

        hctx.shadowBlur  = 20;
        hctx.shadowColor = `hsl(${hue + i * 5}, 100%, 80%)`;
        hctx.fillStyle   = `hsl(${hue + i * 5}, 100%, 80%)`;
        hctx.beginPath();
        hctx.arc(jx, jy, r, 0, Math.PI * 2);
        hctx.fill();
    });

    hctx.shadowBlur = 0;
}

// ═══════════════════════════════════════
//  CURSOR
// ═══════════════════════════════════════
function updateCursor() {
    if (isHandDetected) {
        cursorX += (targetX - cursorX) * 0.18;
        cursorY += (targetY - cursorY) * 0.18;
        cursorEl.style.left = `${cursorX}px`;
        cursorEl.style.top  = `${cursorY}px`;
        cursorEl.classList.remove('hidden');
        // Tint ring with ambient hue
        progressCircle.setAttribute('stroke', `hsl(${glowHue}, 100%, 70%)`);
    } else {
        cursorEl.classList.add('hidden');
    }
}

// ═══════════════════════════════════════
//  FIST DETECTION
// ═══════════════════════════════════════
function isFist(lm) {
    const fingers = [[8,5],[12,9],[16,13],[20,17]];
    let curled = 0;
    fingers.forEach(([t, m]) => {
        if (Math.hypot(lm[t].x - lm[m].x, lm[t].y - lm[m].y, lm[t].z - lm[m].z) < 0.08) curled++;
    });
    const td = Math.hypot(lm[4].x - lm[5].x, lm[4].y - lm[5].y);
    return curled === 4 && td < 0.095;
}

// ═══════════════════════════════════════
//  STARTUP OVERLAY HELPERS
// ═══════════════════════════════════════
const overlay    = document.getElementById('ai-startup-overlay');
const startupMsg = document.getElementById('startup-msg');
const startupBar = document.getElementById('startup-bar');

function setStartup(msg, pct) {
    startupMsg.textContent = msg;
    startupBar.style.width = `${pct}%`;
}

function dismissOverlay() {
    overlay.classList.add('fade-out');
    setTimeout(() => overlay.remove(), 900);
}

// ═══════════════════════════════════════
//  AI INIT
// ═══════════════════════════════════════
async function initAI() {
    if (window.location.protocol === 'file:') {
        setStartup('請用伺服器（localhost）開啟頁面', 0);
        return;
    }
    try {
        setStartup('正在載入 AI 模型中...', 15);
        const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );
        setStartup('AI 模型下載中...', 50);
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                delegate: 'GPU'
            },
            runningMode: 'VIDEO',
            numHands: 1
        });
        setStartup('請允許相機存取...', 75);
        startWebcam();
    } catch (e) {
        setStartup('AI 載入失敗，請重新整理頁面', 0);
        startupBar.style.background = '#ff4757';
    }
}

function startWebcam() {
    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
        .then(stream => {
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                video.play();
                setStartup('相機已就緒，尋找手部中...', 90);
                detSt.innerText = '尋找手部...';
                predict();
            };
        })
        .catch(() => {
            setStartup('相機存取被拒，請重新整理並允許相機', 0);
            startupBar.style.background = '#ff4757';
            detSt.innerText = '相機權限被拒';
            detSt.style.color = '#ff4757';
        });
}

// ═══════════════════════════════════════
//  PREDICT LOOP
// ═══════════════════════════════════════
let lastVideoTime = -1, lastGestureTime = 0, prevHandX = 0;

async function predict() {
    // Fade the hand canvas (ghost trail effect)
    hctx.fillStyle = 'rgba(3, 7, 18, 0.35)';
    hctx.fillRect(0, 0, handCanvas.width, handCanvas.height);

    if (video.readyState >= 2 && lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        const results = handLandmarker.detectForVideo(video, performance.now());

        if (results.landmarks && results.landmarks.length > 0) {
            isHandDetected = true;
            // First hand detection → dismiss the startup overlay
            if (overlay && overlay.parentNode) dismissOverlay();
            detSt.innerText   = '✋ 已偵測手部';
            detSt.style.color = '#00ffcc';

            const lm = results.landmarks[0];
            targetX  = (1 - lm[8].x) * window.innerWidth;
            targetY  = lm[8].y * window.innerHeight;
            interactionPoint.x = cursorX;
            interactionPoint.y = cursorY;

            const speedDelta = Math.abs(targetX - prevHandX);
            currentSpeed = CONFIG.baseSpeed + Math.min(speedDelta * 0.18, 30);
            prevHandX = targetX;

            // ── Draw effects ──
            drawSkeleton(lm, speedDelta);

            // Effect 1: Comet trail from index tip
            updateTrail((1 - lm[8].x) * handCanvas.width, lm[8].y * handCanvas.height, speedDelta);
            drawTrail();

            // Effect 2: Auto pulse every 2s
            if (performance.now() - lastPulseTime > 2000) {
                spawnPulse((1 - lm[8].x) * handCanvas.width, lm[8].y * handCanvas.height);
                lastPulseTime = performance.now();
            }
            drawPulses();

            // Effect 4: Sparks when moving fast
            spawnSparks(lm, speedDelta);
            drawSparks();

            // Hover-to-click check
            checkHover(cursorX, cursorY);

            // Fist → cheer + Effect 5: Shockwave
            if (isFist(lm) && performance.now() - lastGestureTime > 1800) {
                incrementCheer(cursorX, cursorY);
                lastGestureTime = performance.now();
                triggerShockwave(cursorX, cursorY);
                // Flash cursor dot
                const dot = document.querySelector('.cursor-dot');
                dot.style.boxShadow = '0 0 40px 16px #ff0844';
                dot.style.background = '#ff0844';
                setTimeout(() => {
                    dot.style.boxShadow = '';
                    dot.style.background = '';
                }, 700);
            }

        } else {
            isHandDetected = false;
            detSt.innerText   = '尋找手部中...';
            detSt.style.color = '#ffcc00';
            currentSpeed = currentSpeed * 0.96 + CONFIG.baseSpeed * 0.04;
            resetHover();
            // Drain trail
            drawTrail();
            drawPulses();
            drawSparks();
        }
    } else if (isHandDetected) {
        drawTrail();
        drawPulses();
        drawSparks();
    }

    updateCursor();
    requestAnimationFrame(predict);
}

// ═══════════════════════════════════════
//  CSS injection for flash-out keyframe
// ═══════════════════════════════════════
const styleTag = document.createElement('style');
styleTag.textContent = `
@keyframes flash-out {
    from { opacity: 1; }
    to   { opacity: 0; }
}`;
document.head.appendChild(styleTag);

// ═══════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════
resize();
animate();
initAI();

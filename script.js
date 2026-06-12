import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

// ==========================================
// 1. ORIGINAL HOMEPAGE EFFECTS (Cute Background)
// ==========================================
document.addEventListener('click', function (e) {
    if(e.isTrusted) spawnClickEffect(e.pageX, e.pageY);
});

function spawnClickEffect(x, y) {
    const effect = document.createElement('div');
    effect.className = 'click-effect';
    effect.style.left = x + 'px';
    effect.style.top = y + 'px';
    const emojis = ['💖', '✨', '🌸', '🎀', '⭐', '🎈', '🍭', '🧸', '🌈'];
    effect.innerText = emojis[Math.floor(Math.random() * emojis.length)];
    document.body.appendChild(effect);
    setTimeout(() => { effect.remove(); }, 1000);
}

function createSticker() {
    const sticker = document.createElement('div');
    sticker.className = 'sticker';
    const emojis = ['🌸', '🎀', '🧸', '🍭', '🍓', '🧁', '🍦', '🍩', '🐾', '🐰'];
    sticker.innerText = emojis[Math.floor(Math.random() * emojis.length)];
    sticker.style.left = Math.random() * 90 + 5 + 'vw';
    sticker.style.top = Math.random() * 90 + 5 + 'vh';
    sticker.style.fontSize = Math.random() * 2 + 2 + 'rem';
    sticker.style.animationDelay = Math.random() * 2 + 's';
    document.body.appendChild(sticker);
    setTimeout(() => {
        sticker.style.opacity = '0';
        sticker.style.transition = 'opacity 2s';
        setTimeout(() => sticker.remove(), 2000);
    }, 8000 + Math.random() * 4000);
}

for(let i=0; i<6; i++) setTimeout(createSticker, i * 1500);
setInterval(createSticker, 6000);

function createBubble() {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    const size = Math.random() * 30 + 10; 
    bubble.style.width = size + 'px';
    bubble.style.height = size + 'px';
    bubble.style.left = Math.random() * 100 + 'vw';
    bubble.style.animationDuration = Math.random() * 4 + 5 + 's';
    document.body.appendChild(bubble);
    setTimeout(() => { bubble.remove(); }, 9000);
}
setInterval(createBubble, 600);

// ==========================================
// 2. AI HAND TRACKING MAGIC
// ==========================================
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
const handCanvas = document.getElementById('hand-canvas');
const hctx = handCanvas.getContext('2d');

let isHandDetected = false;
let handLandmarker;
let webcamRunning = false;
let aiInitialized = false;

// UI Elements
const video = document.getElementById('webcam');
const previewBox = document.getElementById('camera-preview-container');
const toggleBtn = document.getElementById('ai-toggle-btn');
const detSt = document.getElementById('detection-status');
const cheerCountEl = document.getElementById('cheer-count');
let cheerCount = 88;

const cursorEl = document.getElementById('hand-cursor');
const progressCircle = document.querySelector('.progress-ring__circle');
const circumference = 24 * 2 * Math.PI;
progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
progressCircle.style.strokeDashoffset = circumference;

let cursorX = window.innerWidth / 2, cursorY = window.innerHeight / 2;
let targetX = cursorX, targetY = cursorY;
let interactionPoint = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

// Toggle AI Logic
toggleBtn.addEventListener('click', async () => {
    if (!aiInitialized) {
        aiInitialized = true;
        toggleBtn.innerText = "⏳ 魔法鏡頭啟動中...";
        await initAI();
    } else if (webcamRunning) {
        stopWebcam();
    } else {
        startWebcam();
    }
});

function resize() {
    canvas.width = handCanvas.width = window.innerWidth;
    canvas.height = handCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ── Background Starfield ──
class Star {
    constructor() { this.reset(); }
    reset() {
        this.x = (Math.random() - 0.5) * canvas.width * 2;
        this.y = (Math.random() - 0.5) * canvas.height * 2;
        this.z = Math.random() * canvas.width;
        this.pz = this.z;
    }
    update() {
        this.z -= 1.5;
        if (this.z < 1) {
            this.z = canvas.width;
            this.x = (Math.random() - 0.5) * canvas.width * 2;
            this.y = (Math.random() - 0.5) * canvas.height * 2;
            this.pz = this.z;
        }
        if (isHandDetected) {
            const cx = interactionPoint.x - canvas.width / 2;
            const cy = interactionPoint.y - canvas.height / 2;
            this.x += (cx - this.x) * 0.003; // Drift to hand
            this.y += (cy - this.y) * 0.003;
        }
    }
    draw() {
        const sx = this.x / this.z * canvas.width + canvas.width / 2;
        const sy = this.y / this.z * canvas.height + canvas.height / 2;
        const r = (1 - this.z / canvas.width) * 3;
        ctx.fillStyle = `hsla(340, 100%, 80%, ${1 - this.z / canvas.width})`; // Cute pink stars
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
    }
}
let stars = Array.from({ length: 100 }, () => new Star());

function drawAmbient() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => { s.update(); s.draw(); });
    requestAnimationFrame(drawAmbient);
}
drawAmbient();

// ── Magic Effects ──
const trail = [];
const emojisPool = ['✨', '💖', '🌸', '🫧', '⭐'];

function updateTrail(x, y, speed) {
    if(speed > 2) {
        trail.push({ 
            x, y, 
            life: 1.0, 
            emoji: emojisPool[Math.floor(Math.random() * emojisPool.length)],
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4 - 1,
            rot: Math.random() * 360,
            vrot: (Math.random() - 0.5) * 10
        });
        if (trail.length > 30) trail.shift();
    }
}

function drawTrail() {
    hctx.clearRect(0, 0, handCanvas.width, handCanvas.height);
    for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i];
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        p.life -= 0.03;
        
        if (p.life <= 0) {
            trail.splice(i, 1);
            continue;
        }
        
        hctx.save();
        hctx.globalAlpha = p.life;
        hctx.translate(p.x, p.y);
        hctx.rotate(p.rot * Math.PI / 180);
        hctx.font = `${16 + p.life * 20}px Arial`;
        hctx.textAlign = 'center';
        hctx.textBaseline = 'middle';
        hctx.fillText(p.emoji, 0, 0);
        hctx.restore();
    }
}

function drawSkeleton(lm) {
    hctx.strokeStyle = `hsla(340, 100%, 75%, 0.6)`;
    hctx.lineWidth = 3;
    const conns = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],[0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17]];
    conns.forEach(([a, b]) => {
        hctx.beginPath();
        hctx.moveTo((1 - lm[a].x) * handCanvas.width, lm[a].y * handCanvas.height);
        hctx.lineTo((1 - lm[b].x) * handCanvas.width, lm[b].y * handCanvas.height);
        hctx.stroke();
    });
    lm.forEach((p, i) => {
        const jx = (1 - p.x) * handCanvas.width;
        const jy = p.y * handCanvas.height;
        hctx.fillStyle = i === 8 ? '#00ffcc' : '#FFB7C5';
        hctx.beginPath();
        hctx.arc(jx, jy, i===8? 6:3, 0, Math.PI * 2);
        hctx.fill();
    });
}

// ── Hover to Click ──
let hoveredEl = null, hoverStart = 0;
const HOVER_MS = 1200;

function checkHover(x, y) {
    if (!isHandDetected) { resetHover(); return; }
    const cards = document.querySelectorAll('.lab-card');
    let found = null;
    for (const el of cards) {
        const r = el.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) { found = el; break; }
    }
    if (found) {
        if (hoveredEl === found) {
            const elapsed = performance.now() - hoverStart;
            const pct = Math.min((elapsed / HOVER_MS) * 100, 100);
            progressCircle.style.strokeDashoffset = circumference - (pct / 100) * circumference;
            if (elapsed >= HOVER_MS) {
                found.click();
                resetHover();
                hoverStart = performance.now() + 2000;
            }
        } else {
            hoveredEl = found; hoverStart = performance.now();
        }
    } else {
        resetHover();
    }
}
function resetHover() { hoveredEl = null; hoverStart = 0; progressCircle.style.strokeDashoffset = circumference; }

function isFist(lm) {
    let curled = 0;
    [[8,5],[12,9],[16,13],[20,17]].forEach(([t, m]) => {
        if (Math.hypot(lm[t].x - lm[m].x, lm[t].y - lm[m].y) < 0.08) curled++;
    });
    return curled === 4;
}

function incrementCheer(x, y) {
    cheerCount++;
    cheerCountEl.textContent = cheerCount;
    spawnClickEffect(x, y);
    for(let i=0; i<10; i++) setTimeout(() => spawnClickEffect(x + (Math.random()-0.5)*100, y + (Math.random()-0.5)*100), i*50);
}

// ── AI Setup & Loop ──
async function initAI() {
    if (window.location.protocol === 'file:') {
        alert('請用伺服器 (localhost) 開啟頁面才能使用 AI 相機喔！');
        toggleBtn.innerText = "✋ 啟動 AI 魔法鏡頭";
        aiInitialized = false;
        return;
    }
    try {
        const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                delegate: 'GPU'
            },
            runningMode: 'VIDEO',
            numHands: 1
        });
        startWebcam();
    } catch (e) {
        alert('AI 載入失敗...');
        toggleBtn.innerText = "✋ 啟動 AI 魔法鏡頭";
        aiInitialized = false;
    }
}

function startWebcam() {
    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } }).then(stream => {
        video.srcObject = stream;
        video.play();
        webcamRunning = true;
        previewBox.classList.remove('hidden');
        toggleBtn.innerText = "✋ 關閉 AI 魔法鏡頭";
        detSt.innerText = '尋找魔法手中...';
        predict();
    }).catch(() => { alert('請允許相機權限喔！'); });
}

function stopWebcam() {
    webcamRunning = false;
    const stream = video.srcObject;
    if (stream) stream.getTracks().forEach(track => track.stop());
    previewBox.classList.add('hidden');
    toggleBtn.innerText = "✋ 啟動 AI 魔法鏡頭";
    isHandDetected = false;
    cursorEl.classList.add('hidden');
    hctx.clearRect(0,0,handCanvas.width, handCanvas.height);
}

let lastVideoTime = -1, lastGestureTime = 0, prevHandX = 0;

async function predict() {
    if (!webcamRunning) return;
    
    if (video.readyState >= 2 && lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        const results = handLandmarker.detectForVideo(video, performance.now());

        if (results.landmarks && results.landmarks.length > 0) {
            isHandDetected = true;
            detSt.innerText = '✋ 已偵測手部';
            const lm = results.landmarks[0];
            
            targetX = (1 - lm[8].x) * window.innerWidth;
            targetY = lm[8].y * window.innerHeight;
            interactionPoint.x = cursorX;
            interactionPoint.y = cursorY;

            const speedDelta = Math.abs(targetX - prevHandX);
            prevHandX = targetX;

            drawTrail();
            updateTrail((1 - lm[8].x) * handCanvas.width, lm[8].y * handCanvas.height, speedDelta);
            drawSkeleton(lm);
            checkHover(cursorX, cursorY);

            if (isFist(lm) && performance.now() - lastGestureTime > 1800) {
                incrementCheer(cursorX, cursorY);
                lastGestureTime = performance.now();
            }
        } else {
            isHandDetected = false;
            detSt.innerText = '尋找魔法手中...';
            resetHover();
            drawTrail();
        }
    } else if (isHandDetected) {
        drawTrail();
    }

    if (isHandDetected) {
        cursorX += (targetX - cursorX) * 0.2;
        cursorY += (targetY - cursorY) * 0.2;
        cursorEl.style.left = `${cursorX}px`;
        cursorEl.style.top = `${cursorY}px`;
        cursorEl.classList.remove('hidden');
    } else {
        cursorEl.classList.add('hidden');
    }
    
    if(webcamRunning) requestAnimationFrame(predict);
}

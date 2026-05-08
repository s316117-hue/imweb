import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

// --- Configuration ---
const CONFIG = {
    particleCount: 200,
    baseSpeed: 2,
    warpFactor: 1,
    interactionRadius: 300,
    starColor: '#ffffff'
};

// --- Particle System (Starfield) ---
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
let stars = [];
let interactionPoint = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let isHandDetected = false;
let currentSpeed = CONFIG.baseSpeed;

// --- Hand Visualization Canvas ---
const handCanvas = document.getElementById('hand-canvas');
const hctx = handCanvas.getContext('2d');

function resize() {
    canvas.width = handCanvas.width = window.innerWidth;
    canvas.height = handCanvas.height = window.innerHeight;
    initStars();
}
window.addEventListener('resize', resize);
resize();

window.addEventListener('mousemove', (e) => {
    if (!isHandDetected) {
        interactionPoint.x = e.clientX;
        interactionPoint.y = e.clientY;
    }
});

class Star {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = (Math.random() - 0.5) * canvas.width * 2;
        this.y = (Math.random() - 0.5) * canvas.height * 2;
        this.z = Math.random() * canvas.width;
        this.pz = this.z;
    }

    update() {
        this.z -= currentSpeed;
        if (this.z < 1) {
            this.z = canvas.width;
            this.x = (Math.random() - 0.5) * canvas.width * 2;
            this.y = (Math.random() - 0.5) * canvas.height * 2;
            this.pz = this.z;
        }

        // Attraction to interaction point
        if (interactionPoint.x !== null) {
            const centerX = interactionPoint.x - canvas.width / 2;
            const centerY = interactionPoint.y - canvas.height / 2;
            this.x += (centerX - this.x) * 0.001;
            this.y += (centerY - this.y) * 0.001;
        }
    }

    draw() {
        const sx = map(this.x / this.z, 0, 1, 0, canvas.width) + canvas.width / 2;
        const sy = map(this.y / this.z, 0, 1, 0, canvas.height) + canvas.height / 2;
        const r = map(this.z, 0, canvas.width, 4, 0);

        const px = map(this.x / this.pz, 0, 1, 0, canvas.width) + canvas.width / 2;
        const py = map(this.y / this.pz, 0, 1, 0, canvas.height) + canvas.height / 2;

        this.pz = this.z;

        ctx.strokeStyle = CONFIG.starColor;
        ctx.lineWidth = r;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
    }
}

function map(value, istart, istop, ostart, ostop) {
    return ostart + (ostop - ostart) * ((value - istart) / (istop - istart));
}

function initStars() {
    stars = Array.from({ length: CONFIG.particleCount }, () => new Star());
}

function animate() {
    ctx.fillStyle = 'rgba(2, 5, 10, 0.2)'; // Motion blur effect
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    stars.forEach(s => {
        s.update();
        s.draw();
    });

    requestAnimationFrame(animate);
}

// --- Hand Detection ---
let handLandmarker;
let video = document.getElementById('webcam');
const statusText = document.querySelector('.status-text');
const statusContainer = document.getElementById('camera-status');

async function initAI() {
    if (window.location.protocol === 'file:') {
        statusText.innerText = "請用伺服器開啟以啟用偵測";
        return;
    }

    try {
        statusText.innerText = "正在同步 AI 核心...";
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 1
        });
        statusText.innerText = "請允許鏡頭存取";
        startWebcam();
    } catch (e) {
        statusText.innerText = "AI 核心載入失敗";
    }
}

function startWebcam() {
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play();
            statusContainer.classList.add('active');
            statusText.innerText = "系統已就緒";
            predict();
        };
    }).catch(() => {
        statusText.innerText = "偵測權限被拒";
    });
}

let lastVideoTime = -1;
let lastGestureTime = 0;
let prevHandX = 0;

async function predict() {
    hctx.clearRect(0, 0, handCanvas.width, handCanvas.height);
    
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        const results = handLandmarker.detectForVideo(video, performance.now());

        if (results.landmarks && results.landmarks.length > 0) {
            isHandDetected = true;
            const landmarks = results.landmarks[0];
            const indexTip = landmarks[8];
            
            const targetX = (1 - indexTip.x) * window.innerWidth;
            const targetY = indexTip.y * window.innerHeight;
            
            // Interaction point with smoothing
            interactionPoint.x = interactionPoint.x * 0.8 + targetX * 0.2;
            interactionPoint.y = interactionPoint.y * 0.8 + targetY * 0.2;

            // Speed up based on movement
            const speedDelta = Math.abs(targetX - prevHandX);
            currentSpeed = CONFIG.baseSpeed + (speedDelta * 0.5);
            prevHandX = targetX;

            // Visualize hand skeleton with glow
            hctx.shadowBlur = 10;
            hctx.shadowColor = '#00d2ff';
            hctx.fillStyle = '#ffffff';
            landmarks.forEach(point => {
                hctx.beginPath();
                hctx.arc((1 - point.x) * handCanvas.width, point.y * handCanvas.height, 4, 0, Math.PI*2);
                hctx.fill();
            });

            // Fist detection
            const thumbTip = landmarks[4];
            const pinkyTip = landmarks[20];
            const dist = Math.sqrt(Math.pow(thumbTip.x - pinkyTip.x, 2) + Math.pow(thumbTip.y - pinkyTip.y, 2));
            
            if (dist < 0.07 && performance.now() - lastGestureTime > 2000) {
                triggerCheer(interactionPoint.x, interactionPoint.y);
                lastGestureTime = performance.now();
            }
        } else {
            isHandDetected = false;
            currentSpeed = currentSpeed * 0.95 + CONFIG.baseSpeed * 0.05; // Slow down
        }
    }
    requestAnimationFrame(predict);
}

// --- Interaction ---
function triggerCheer(x, y) {
    // Intense Explosion Effect
    for (let i = 0; i < 60; i++) {
        const div = document.createElement('div');
        const color = `hsl(${Math.random() * 60 + 180}, 100%, 70%)`;
        div.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: 8px;
            height: 30px;
            background: ${color};
            box-shadow: 0 0 10px ${color};
            border-radius: 4px;
            pointer-events: none;
            z-index: 1000;
        `;
        document.body.appendChild(div);
        
        const angle = Math.random() * Math.PI * 2;
        const velocity = 15 + Math.random() * 20;
        const tx = Math.cos(angle) * velocity * 20;
        const ty = Math.sin(angle) * velocity * 20;

        div.animate([
            { transform: `rotate(${angle}rad) translate(0, 0) scale(1)`, opacity: 1 },
            { transform: `rotate(${angle}rad) translate(0, ${velocity * 10}px) scale(0)`, opacity: 0 }
        ], {
            duration: 800 + Math.random() * 800,
            easing: 'ease-out'
        }).onfinish = () => div.remove();
    }
}

document.getElementById('cheer-btn').addEventListener('click', (e) => {
    triggerCheer(e.clientX, e.clientY);
});

// --- Clock ---
function updateClock() {
    const clock = document.getElementById('digital-clock');
    const now = new Date();
    clock.innerText = now.toLocaleTimeString('zh-TW', { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();

animate();
initAI();

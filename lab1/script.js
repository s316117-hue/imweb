const songs = [
    { title: "刻在我心底的名字", youtubeId: "RkX7qn2x230", startTime: 100, options: ["刻在我心底的名字", "魚仔", "幾分之幾", "我愛你"] },
    { title: "魚仔", youtubeId: "ybfWYpYhTQQ", startTime: 60, options: ["大人", "魚仔", "明仔載", "一定要相信自己"] },
    { title: "幾分之幾", youtubeId: "HQ_mU73VhEQ", startTime: 120, options: ["幾分之幾", "舒服", "愛情怎麼了", "早安，晨之美！"] },
    { title: "我愛你", youtubeId: "5luGpoxWdbo", startTime: 45, options: ["我愛你", "快快愛", "一百種生活", "校園美女2008"] },
    { title: "早安，晨之美！", youtubeId: "aG45aF95C48", startTime: 30, options: ["再見勾勾", "早安，晨之美！", "風箏", "無敵鐵金剛"] },
    { title: "一定要相信自己", youtubeId: "3xx4RlPfvUw", startTime: 80, options: ["一定要相信自己", "大人", "明仔載", "燃燒卡路里"] },
    { title: "大人", youtubeId: "Vz804Qp9V20", startTime: 50, options: ["大人", "魚仔", "幾分之幾", "刻在我心底的名字"] },
    { title: "一百種生活", youtubeId: "S01Z9p_S6pE", startTime: 20, options: ["我愛你", "一百種生活", "校園美女2008", "快快愛"] },
    { title: "明仔載", youtubeId: "Cf2pDbqUqoQ", startTime: 40, options: ["明仔載", "一定要相信自己", "魚仔", "幾分之幾"] },
    { title: "愛情怎麼了", youtubeId: "rD-T5pzH9b0", startTime: 70, options: ["幾分之幾", "舒服", "愛情怎麼了", "大人"] }
];

let currentLevel = 0;
let score = 0;
let canAnswer = false;
let ytPlayer = null;
let isYtReady = false;

const record = document.getElementById('record');
const musicNotes = document.getElementById('music-notes');
const optionsContainer = document.getElementById('options-container');
const nextBtn = document.getElementById('next-btn');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const resultOverlay = document.getElementById('result-overlay');
const resultScore = document.getElementById('result-score');
const startOverlay = document.getElementById('start-overlay');
const realStartBtn = document.getElementById('real-start-btn');

// YouTube IFrame API Ready
function onYouTubeIframeAPIReady() {
    ytPlayer = new YT.Player('player', {
        height: '0',
        width: '0',
        videoId: '',
        playerVars: {
            'autoplay': 0,
            'controls': 0,
            'showinfo': 0,
            'rel': 0
        },
        events: {
            'onReady': () => { isYtReady = true; }
        }
    });
}

// 音效系統 (使用 Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'correct') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'wrong') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(110.00, audioCtx.currentTime);
        oscillator.frequency.linearRampToValueAtTime(55.00, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
    }
}

realStartBtn.onclick = () => {
    startOverlay.style.display = 'none';
    if (audioCtx.state === 'suspended') audioCtx.resume();
    initGame();
};

function initGame() {
    currentLevel = 0;
    score = 0;
    scoreDisplay.innerText = `分數: 0`;
    loadLevel();
}

function loadLevel() {
    canAnswer = true;
    nextBtn.classList.remove('show');
    record.classList.add('playing');
    musicNotes.classList.add('active');
    
    levelDisplay.innerText = `關卡: ${currentLevel + 1}/${songs.length}`;
    
    const song = songs[currentLevel];
    optionsContainer.innerHTML = '';
    
    // 播放 YouTube 音樂
    if (isYtReady && ytPlayer) {
        ytPlayer.loadVideoById({
            videoId: song.youtubeId,
            startSeconds: song.startTime
        });
        ytPlayer.playVideo();
    }
    
    // 打亂選項
    const shuffledOptions = [...song.options].sort(() => Math.random() - 0.5);
    shuffledOptions.forEach(option => {
        const div = document.createElement('div');
        div.className = 'option';
        div.innerText = option;
        div.onclick = () => checkAnswer(option, div);
        optionsContainer.appendChild(div);
    });
}

function checkAnswer(selected, element) {
    if (!canAnswer) return;
    canAnswer = false;
    
    const song = songs[currentLevel];
    record.classList.remove('playing');
    musicNotes.classList.remove('active');
    
    // 停止音樂
    if (ytPlayer) ytPlayer.stopVideo();
    
    if (selected === song.title) {
        element.classList.add('correct');
        score += 20;
        scoreDisplay.innerText = `分數: ${score}`;
        createEmojiBurst('💖');
        createConfetti();
        playSound('correct');
    } else {
        element.classList.add('wrong');
        playSound('wrong');
        Array.from(optionsContainer.children).forEach(child => {
            if (child.innerText === song.title) {
                child.classList.add('correct');
            }
        });
        createEmojiBurst('😭');
    }
    
    if (currentLevel < songs.length - 1) {
        nextBtn.classList.add('show');
    } else {
        setTimeout(showFinalResult, 1500);
    }
}

nextBtn.onclick = () => {
    currentLevel++;
    loadLevel();
};

function showFinalResult() {
    resultOverlay.style.display = 'flex';
    resultScore.innerText = `最終得分：${score}`;
}

function createEmojiBurst(emoji) {
    for (let i = 0; i < 8; i++) {
        const div = document.createElement('div');
        div.innerText = emoji;
        div.style.position = 'fixed';
        div.style.left = '50%';
        div.style.top = '50%';
        div.style.fontSize = '2rem';
        div.style.pointerEvents = 'none';
        div.style.zIndex = '1000';
        const angle = (i / 8) * Math.PI * 2;
        const velocity = 5 + Math.random() * 5;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;
        document.body.appendChild(div);
        let posX = window.innerWidth / 2;
        let posY = window.innerHeight / 2;
        let opacity = 1;
        const anim = setInterval(() => {
            posX += vx;
            posY += vy;
            opacity -= 0.02;
            div.style.left = posX + 'px';
            div.style.top = posY + 'px';
            div.style.opacity = opacity;
            if (opacity <= 0) {
                clearInterval(anim);
                div.remove();
            }
        }, 16);
    }
}

function createConfetti() {
    for (let i = 0; i < 30; i++) {
        const div = document.createElement('div');
        div.className = 'confetti';
        div.style.left = Math.random() * 100 + 'vw';
        div.style.top = '-10px';
        div.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 70%)`;
        div.style.width = Math.random() * 10 + 5 + 'px';
        div.style.height = Math.random() * 15 + 10 + 'px';
        div.style.position = 'fixed';
        div.style.zIndex = '999';
        div.style.pointerEvents = 'none';
        document.body.appendChild(div);
        const fallDuration = 2 + Math.random() * 3;
        const sideSwing = (Math.random() - 0.5) * 200;
        div.animate([
            { transform: `translate(0, 0) rotate(0deg)`, opacity: 1 },
            { transform: `translate(${sideSwing}px, 110vh) rotate(${Math.random() * 720}deg)`, opacity: 0 }
        ], {
            duration: fallDuration * 1000,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            fill: 'forwards'
        });
        setTimeout(() => div.remove(), fallDuration * 1000);
    }
}

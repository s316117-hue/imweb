const songs = [
    { 
        title: "GIVE LOVE", 
        file: "17/Akdong Musician(AKMU) - GIVE LOVE M_V - AKMU (youtube).mp3", 
        startTime: 65,
        options: ["GIVE LOVE", "200%", "RE-BYE", "DINOSAUR"] 
    },
    { 
        title: "Lost", 
        file: "17/Jony J滿舒克- Lost『你總是盤旋在我腦海裡面』【動態歌詞Lyrics】 - 漫迹太空 (youtube).mp3", 
        startTime: 48,
        options: ["Lost", "不用去猜", "慢慢來", "玩家"] 
    },
    { 
        title: "Love Yourself", 
        file: "17/Love Yourself【愛妳自己】Justin Bieber  中文字幕 - Dawn Dawson (youtube).mp3", 
        startTime: 55,
        options: ["Love Yourself", "Sorry", "Baby", "Stay"] 
    },
    { 
        title: "我喜歡你 I Like You", 
        file: "17/派偉俊 Patrick Brasca【我喜歡你 I Like You】Official MV - 派偉俊 Patrick Brasca (youtube) (2).mp3", 
        startTime: 52,
        options: ["我喜歡你 I Like You", "保護你", "爸爸的肩膀", "不求回報"] 
    },
    { 
        title: "別怕變老", 
        file: "17/王以太,艾热 AIR - 别怕变老「对面女孩 看过来 看着我 别再盯着镜子盯着自己手机摄像头」【動態歌詞_Lyrics Video】 - WCY RAP (youtube).mp3", 
        startTime: 68,
        options: ["別怕變老", "星球墜落", "目不轉睛", "阿司匹林"] 
    }
];

let currentLevel = 0;
let score = 0;
let canAnswer = false;
let playbackTimer = null;

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
const audioPlayer = document.getElementById('audio-player');

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
    
    // 播放音樂文件
    audioPlayer.src = encodeURI(song.file);
    audioPlayer.oncanplay = () => {
        audioPlayer.currentTime = song.startTime; // 從副歌開始播放
        audioPlayer.play();
        audioPlayer.oncanplay = null;
        
        // 15 秒後停止播放
        clearTimeout(playbackTimer);
        playbackTimer = setTimeout(() => {
            if (!audioPlayer.paused) {
                audioPlayer.pause();
                record.classList.remove('playing');
                musicNotes.classList.remove('active');
            }
        }, 15000);
    };
    audioPlayer.load();
    
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
    
    clearTimeout(playbackTimer);
    const song = songs[currentLevel];
    record.classList.remove('playing');
    musicNotes.classList.remove('active');
    
    // 停止音樂
    audioPlayer.pause();
    
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

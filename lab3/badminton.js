document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startScreen = document.getElementById('startScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');
    const scoreDisplay = document.querySelector('.score-display');
    const winnerText = document.getElementById('winnerText');

    let isGameRunning = false;
    let animationId;
    
    let p1Score = 0;
    let p2Score = 0;
    const WIN_SCORE = 5;

    // --- Audio System ---
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioCtx;

    function initAudio() {
        if (!audioCtx) audioCtx = new AudioContext();
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    function playSound(type) {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        const now = audioCtx.currentTime;

        if (type === 'hit') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'score') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.setValueAtTime(600, now + 0.1);
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'win') {
            osc.type = 'square';
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, i) => {
                osc.frequency.setValueAtTime(freq, now + i * 0.1);
            });
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.6);
            osc.start(now);
            osc.stop(now + 0.6);
        }
    }
    // -------------------

    const keys = { a: false, d: false, w: false, space: false };
    const groundY = 240;

    class Player {
        constructor(x, isAI, emoji) {
            this.x = x;
            this.y = groundY;
            this.width = 40;
            this.height = 40;
            this.vx = 0;
            this.vy = 0;
            this.speed = 5;
            this.jumpForce = -10;
            this.isAI = isAI;
            this.emoji = emoji;
            this.swingTime = 0;
        }

        draw() {
            ctx.font = '40px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(this.emoji, this.x, this.y);

            // Draw racket
            ctx.save();
            ctx.translate(this.x + (this.isAI ? -15 : 15), this.y - 20);
            if (this.swingTime > 0) {
                ctx.rotate(this.isAI ? -Math.PI/2 : Math.PI/2);
            }
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -20);
            ctx.strokeStyle = '#795548';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, -25, 10, 0, Math.PI * 2);
            ctx.strokeStyle = '#FF5722';
            ctx.stroke();
            ctx.restore();
        }

        update() {
            if (!this.isAI) {
                if (keys.a && this.x > 20) this.vx = -this.speed;
                else if (keys.d && this.x < canvas.width / 2 - 20) this.vx = this.speed;
                else this.vx = 0;

                if (keys.w && this.y === groundY) {
                    this.vy = this.jumpForce;
                }
                
                if (keys.space && this.swingTime === 0) {
                    this.swingTime = 15;
                }
            } else {
                // Simple AI
                if (ball.x > canvas.width / 2 && ball.vx > 0) {
                    const targetX = ball.x + 20;
                    if (this.x < targetX - 10 && this.x < canvas.width - 20) this.vx = this.speed;
                    else if (this.x > targetX + 10 && this.x > canvas.width / 2 + 20) this.vx = -this.speed;
                    else this.vx = 0;
                    
                    if (ball.y > groundY - 80 && this.y === groundY && Math.abs(this.x - ball.x) < 50) {
                        this.vy = this.jumpForce;
                    }

                    if (Math.abs(this.x - ball.x) < 50 && ball.y > groundY - 100 && this.swingTime === 0) {
                        this.swingTime = 15;
                    }
                } else {
                    // Return to center of their side
                    const targetX = canvas.width * 0.75;
                    if (this.x < targetX - 5) this.vx = this.speed;
                    else if (this.x > targetX + 5) this.vx = -this.speed;
                    else this.vx = 0;
                }
            }

            this.x += this.vx;
            this.vy += 0.5; // gravity
            this.y += this.vy;

            if (this.y > groundY) {
                this.y = groundY;
                this.vy = 0;
            }

            if (this.swingTime > 0) this.swingTime--;

            this.draw();
        }
    }

    class Ball {
        constructor() {
            this.radius = 10;
            this.reset(1);
        }

        reset(direction) {
            this.x = direction === 1 ? 100 : 500;
            this.y = 100;
            this.vx = direction * 2;
            this.vy = 0;
            this.isDead = false;
        }

        draw() {
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🏸', this.x, this.y);
        }

        update() {
            if (this.isDead) return;

            this.vy += 0.2; // Gravity
            this.x += this.vx;
            this.y += this.vy;

            // Air resistance
            this.vx *= 0.99;
            this.vy *= 0.99;

            // Hit ground
            if (this.y > groundY) {
                this.y = groundY;
                this.isDead = true;
                handleScore(this.x < canvas.width / 2 ? 2 : 1);
            }

            // Hit net
            if (this.x > canvas.width / 2 - 5 && this.x < canvas.width / 2 + 5 && this.y > groundY - 80) {
                this.vx *= -0.5;
                this.x = this.x < canvas.width / 2 ? canvas.width / 2 - 5 : canvas.width / 2 + 5;
            }

            this.draw();
        }
    }

    let p1, p2, ball;

    function init() {
        p1 = new Player(100, false, '🐱');
        p2 = new Player(500, true, '🐶');
        ball = new Ball();
        p1Score = 0;
        p2Score = 0;
        updateUI();
    }

    function updateUI() {
        scoreDisplay.textContent = `🐱 ${p1Score} : ${p2Score} 🐶`;
    }

    function handleScore(player) {
        playSound('score');
        if (player === 1) p1Score++;
        else p2Score++;
        
        updateUI();

        if (p1Score >= WIN_SCORE || p2Score >= WIN_SCORE) {
            setTimeout(endGame, 500);
        } else {
            setTimeout(() => {
                ball.reset(player === 1 ? 1 : -1);
                p1.x = 100;
                p2.x = 500;
            }, 1000);
        }
    }

    function checkCollisions() {
        if (ball.isDead) return;

        [p1, p2].forEach(p => {
            if (p.swingTime > 0) {
                const dist = Math.hypot(p.x - ball.x, (p.y - 20) - ball.y);
                if (dist < 60) {
                    playSound('hit');
                    ball.vy = -7 - Math.random() * 2;
                    ball.vx = (p === p1 ? 1 : -1) * (5 + Math.random() * 3);
                    // Prevent double hits
                    ball.y -= 10; 
                    p.swingTime = 0;
                }
            }
        });
    }

    function drawNet() {
        ctx.fillStyle = '#607D8B';
        ctx.fillRect(canvas.width / 2 - 2, groundY - 80, 4, 80);
    }

    function animate() {
        if (!isGameRunning) return;
        animationId = requestAnimationFrame(animate);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        drawNet();
        p1.update();
        p2.update();
        ball.update();
        
        checkCollisions();
    }

    function startGame() {
        initAudio();
        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        init();
        isGameRunning = true;
        animate();
    }

    function endGame() {
        isGameRunning = false;
        playSound('win');
        cancelAnimationFrame(animationId);
        winnerText.textContent = p1Score >= WIN_SCORE ? '🎉 貓咪獲勝！' : '🎉 狗狗獲勝！';
        gameOverScreen.classList.remove('hidden');
    }

    // Input listeners
    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.a = true;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.d = true;
        if (e.code === 'KeyW' || e.code === 'ArrowUp') { keys.w = true; e.preventDefault(); }
        if (e.code === 'Space') { keys.space = true; e.preventDefault(); }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.a = false;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.d = false;
        if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.w = false;
        if (e.code === 'Space') keys.space = false;
    });

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);
});

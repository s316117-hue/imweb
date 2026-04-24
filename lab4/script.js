document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startScreen = document.getElementById('startScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');
    const scoreDisplay = document.querySelector('.score-display');
    const livesDisplay = document.querySelector('.lives-display');
    const finalScore = document.getElementById('finalScore');

    let isGameRunning = false;
    let score = 0;
    let lives = 3;
    let animationId;
    let spawnIntervalId;

    // Entities
    let player;
    let bullets = [];
    let enemies = [];
    let particles = [];

    // Keys
    const keys = {
        ArrowLeft: false,
        ArrowRight: false,
        a: false,
        d: false
    };

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

        if (type === 'shoot') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'hit') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'hurt') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.3);
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'gameover') {
            osc.type = 'triangle';
            const notes = [392.00, 329.63, 261.63, 196.00]; // G4, E4, C4, G3
            notes.forEach((freq, i) => {
                osc.frequency.setValueAtTime(freq, now + i * 0.2);
            });
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.linearRampToValueAtTime(0, now + 1.0);
            osc.start(now);
            osc.stop(now + 1.0);
        }
    }
    // -------------------

    class Player {
        constructor() {
            this.x = canvas.width / 2;
            this.y = canvas.height - 40;
            this.size = 40;
            this.speed = 5;
            this.emoji = '🐰';
        }

        draw() {
            ctx.font = `${this.size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.emoji, this.x, this.y);
            
            // Draw a cute little water gun
            ctx.fillStyle = '#03A9F4';
            ctx.beginPath();
            ctx.roundRect(this.x + 5, this.y - 15, 8, 20, 4);
            ctx.fill();
        }

        update() {
            if ((keys.ArrowLeft || keys.a) && this.x - this.size / 2 > 0) {
                this.x -= this.speed;
            }
            if ((keys.ArrowRight || keys.d) && this.x + this.size / 2 < canvas.width) {
                this.x += this.speed;
            }
            this.draw();
        }
    }

    class Bullet {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.radius = 6;
            this.speed = 7;
            this.color = `hsl(${Math.random() * 360}, 80%, 70%)`; // Random cute color bubble
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = this.color;
            ctx.stroke();
            
            // Bubble highlight
            ctx.beginPath();
            ctx.arc(this.x - 2, this.y - 2, 2, 0, Math.PI * 2, false);
            ctx.fillStyle = 'white';
            ctx.fill();
        }

        update() {
            this.y -= this.speed;
            this.draw();
        }
    }

    class Enemy {
        constructor() {
            this.size = 30;
            this.x = Math.random() * (canvas.width - this.size * 2) + this.size;
            this.y = -this.size;
            this.speed = Math.random() * 1.5 + 0.5 + (score * 0.05); // Speeds up as score increases
            const badEmojis = ['🌧️', '🐛', '👾', '🕷️'];
            this.emoji = badEmojis[Math.random() * badEmojis.length | 0];
        }

        draw() {
            ctx.font = `${this.size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.emoji, this.x, this.y);
        }

        update() {
            this.y += this.speed;
            this.draw();
        }
    }

    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.radius = Math.random() * 3 + 1;
            this.velocity = {
                x: (Math.random() - 0.5) * 6,
                y: (Math.random() - 0.5) * 6
            };
            this.color = color;
            this.alpha = 1;
        }

        draw() {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.restore();
        }

        update() {
            this.draw();
            this.velocity.y += 0.1; // gravity
            this.x += this.velocity.x;
            this.y += this.velocity.y;
            this.alpha -= 0.02;
        }
    }

    function init() {
        player = new Player();
        bullets = [];
        enemies = [];
        particles = [];
        score = 0;
        lives = 3;
        updateUI();
    }

    function spawnEnemies() {
        spawnIntervalId = setInterval(() => {
            if (!isGameRunning) return;
            enemies.push(new Enemy());
        }, 1000);
    }

    function updateUI() {
        scoreDisplay.textContent = `分數: ${score}`;
        livesDisplay.textContent = `生命: ${'❤️'.repeat(lives)}`;
    }

    function createExplosion(x, y) {
        const colors = ['#FFC107', '#FFEB3B', '#FF9800', '#fff'];
        for (let i = 0; i < 15; i++) {
            particles.push(new Particle(x, y, colors[Math.random() * colors.length | 0]));
        }
    }

    function animate() {
        if (!isGameRunning) return;
        animationId = requestAnimationFrame(animate);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        player.update();

        // Particles
        particles.forEach((particle, index) => {
            if (particle.alpha <= 0) {
                particles.splice(index, 1);
            } else {
                particle.update();
            }
        });

        // Bullets
        bullets.forEach((bullet, index) => {
            if (bullet.y + bullet.radius < 0) {
                setTimeout(() => {
                    bullets.splice(index, 1);
                }, 0);
            } else {
                bullet.update();
            }
        });

        // Enemies
        enemies.forEach((enemy, index) => {
            enemy.update();

            // Hit bottom
            if (enemy.y > canvas.height + enemy.size) {
                setTimeout(() => {
                    enemies.splice(index, 1);
                    lives--;
                    updateUI();
                    if (lives <= 0) {
                        endGame();
                    } else {
                        playSound('hurt');
                    }
                }, 0);
            }

            // Collision with bullets
            bullets.forEach((bullet, bIndex) => {
                const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
                if (dist - enemy.size / 2 - bullet.radius < 0) {
                    // Hit!
                    playSound('hit');
                    createExplosion(enemy.x, enemy.y);
                    setTimeout(() => {
                        enemies.splice(index, 1);
                        bullets.splice(bIndex, 1);
                    }, 0);
                    score += 10;
                    updateUI();
                }
            });
            
            // Collision with player
            const distToPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
            if (distToPlayer < enemy.size / 2 + player.size / 2) {
                createExplosion(player.x, player.y);
                setTimeout(() => {
                    enemies.splice(index, 1);
                    lives--;
                    updateUI();
                    if (lives <= 0) {
                        endGame();
                    } else {
                        playSound('hurt');
                    }
                }, 0);
            }
        });
    }

    function startGame() {
        initAudio();
        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        init();
        isGameRunning = true;
        animate();
        spawnEnemies();
    }

    function endGame() {
        isGameRunning = false;
        playSound('gameover');
        clearInterval(spawnIntervalId);
        cancelAnimationFrame(animationId);
        finalScore.textContent = score;
        gameOverScreen.classList.remove('hidden');
    }

    // Input listeners
    window.addEventListener('keydown', (e) => {
        if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
    });

    window.addEventListener('keyup', (e) => {
        if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    });

    canvas.addEventListener('mousedown', (e) => {
        if (!isGameRunning) return;
        
        initAudio();
        playSound('shoot');

        // Calculate relative position to handle responsive canvas
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        
        // Spawn bullet at player position, aiming slightly towards mouse isn't needed if we shoot straight up
        // We'll just shoot straight up from gun tip
        bullets.push(new Bullet(player.x + 9, player.y - 20));
    });

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);
});

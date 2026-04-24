document.addEventListener('DOMContentLoaded', () => {
    const emojis = ['🌸', '🎀', '🧸', '🍭', '🍓', '🧁', '🍦', '🍩'];
    let cardsArray = [...emojis, ...emojis];
    
    let moves = 0;
    let timer = 0;
    let timerInterval = null;
    let hasStarted = false;
    let firstCard = null;
    let secondCard = null;
    let lockBoard = false;
    let matchedPairs = 0;

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
        
        if (type === 'flip') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'match') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'win') {
            osc.type = 'square';
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
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

    const board = document.querySelector('.game-board');
    const movesDisplay = document.querySelector('.moves');
    const timerDisplay = document.querySelector('.timer');
    const restartBtn = document.querySelector('.restart-btn');

    function initGame() {
        // Reset variables
        moves = 0;
        timer = 0;
        matchedPairs = 0;
        hasStarted = false;
        firstCard = null;
        secondCard = null;
        lockBoard = false;
        movesDisplay.textContent = `步數: ${moves}`;
        timerDisplay.textContent = `時間: ${timer}s`;
        
        clearInterval(timerInterval);

        // Shuffle cards
        cardsArray.sort(() => 0.5 - Math.random());

        // Clear board
        board.innerHTML = '';

        // Generate cards
        cardsArray.forEach((emoji) => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.dataset.emoji = emoji;

            const front = document.createElement('div');
            front.classList.add('card-front');
            front.textContent = emoji;

            const back = document.createElement('div');
            back.classList.add('card-back');

            card.appendChild(front);
            card.appendChild(back);
            
            card.addEventListener('click', flipCard);
            board.appendChild(card);
        });
    }

    function startTimer() {
        if (!hasStarted) {
            hasStarted = true;
            timerInterval = setInterval(() => {
                timer++;
                timerDisplay.textContent = `時間: ${timer}s`;
            }, 1000);
        }
    }

    function flipCard() {
        initAudio(); // Ensure audio context is ready on first user interaction
        if (lockBoard) return;
        if (this === firstCard) return;

        playSound('flip');
        startTimer();

        this.classList.add('flipped');

        if (!firstCard) {
            firstCard = this;
            return;
        }

        secondCard = this;
        moves++;
        movesDisplay.textContent = `步數: ${moves}`;
        checkForMatch();
    }

    function checkForMatch() {
        let isMatch = firstCard.dataset.emoji === secondCard.dataset.emoji;

        if (isMatch) {
            playSound('match');
            disableCards();
            matchedPairs++;
            if (matchedPairs === emojis.length) {
                setTimeout(winGame, 500);
            }
        } else {
            unflipCards();
        }
    }

    function disableCards() {
        firstCard.removeEventListener('click', flipCard);
        secondCard.removeEventListener('click', flipCard);
        
        // Add a little pop effect
        firstCard.style.transform = 'rotateY(180deg) scale(1.1)';
        secondCard.style.transform = 'rotateY(180deg) scale(1.1)';
        setTimeout(() => {
            if(firstCard) firstCard.style.transform = 'rotateY(180deg) scale(1)';
            if(secondCard) secondCard.style.transform = 'rotateY(180deg) scale(1)';
            resetBoard();
        }, 300);
    }

    function unflipCards() {
        lockBoard = true;
        setTimeout(() => {
            firstCard.classList.remove('flipped');
            secondCard.classList.remove('flipped');
            resetBoard();
        }, 1000);
    }

    function resetBoard() {
        [firstCard, secondCard, lockBoard] = [null, null, false];
    }

    function winGame() {
        clearInterval(timerInterval);
        playSound('win');
        alert(`太棒了！🎉\n你花了 ${timer} 秒，共用了 ${moves} 步完成遊戲！`);
        createConfetti();
    }

    function createConfetti() {
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            confetti.style.position = 'fixed';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.top = '-50px';
            confetti.style.fontSize = Math.random() * 20 + 10 + 'px';
            confetti.style.zIndex = '9999';
            confetti.style.transition = 'transform 3s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 3s';
            
            document.body.appendChild(confetti);

            setTimeout(() => {
                confetti.style.transform = `translateY(${window.innerHeight + 100}px) rotate(${Math.random() * 360}deg)`;
                confetti.style.opacity = '0';
            }, 50);

            setTimeout(() => {
                confetti.remove();
            }, 3000);
        }
    }

    restartBtn.addEventListener('click', initGame);

    // Initialize game on load
    initGame();
});

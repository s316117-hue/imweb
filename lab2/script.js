const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const startBtn = document.getElementById('start-btn');
const shutterBtn = document.getElementById('shutter-btn');
const photosGrid = document.getElementById('photos-grid');
const countdownOverlay = document.getElementById('countdown');
const cameraPlaceholder = document.getElementById('camera-placeholder');
const flash = document.getElementById('flash');
const clearBtn = document.getElementById('clear-btn');

let stream = null;

// Start Camera
startBtn.addEventListener('click', async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 960 },
                facingMode: "user" 
            }, 
            audio: false 
        });
        video.srcObject = stream;
        
        // UI Updates
        cameraPlaceholder.style.display = 'none';
        shutterBtn.disabled = false;
        startBtn.innerText = '系統運作中 ⚡';
        startBtn.disabled = true;
    } catch (err) {
        console.error("Error accessing camera:", err);
        alert("無法啟動相機，請檢查權限設定喔！👾");
    }
});

// Take Photo Logic
shutterBtn.addEventListener('click', () => {
    startCountdown(3);
});

function startCountdown(seconds) {
    shutterBtn.disabled = true;
    countdownOverlay.style.display = 'flex';
    let count = seconds;
    countdownOverlay.innerText = count;

    const timer = setInterval(() => {
        count--;
        if (count > 0) {
            countdownOverlay.innerText = count;
        } else {
            clearInterval(timer);
            countdownOverlay.style.display = 'none';
            capturePhoto();
            shutterBtn.disabled = false;
        }
    }, 1000);
}

function capturePhoto() {
    // Flash Effect
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 500);

    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas (mirrored)
    context.save();
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    
    // Add a slight "Cyber" contrast/brightness boost
    context.filter = 'contrast(1.2) saturate(1.2)';
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.restore();

    const dataUrl = canvas.toDataURL('image/png');
    addPhotoToGallery(dataUrl);
}

function addPhotoToGallery(dataUrl) {
    const photoItem = document.createElement('div');
    photoItem.className = 'photo-item';
    
    // Random rotation for cool polaroid effect
    const rotation = (Math.random() * 8 - 4).toFixed(1);
    photoItem.style.setProperty('--rotation', `${rotation}deg`);

    photoItem.innerHTML = `
        <img src="${dataUrl}" alt="Captured Photo">
        <div class="actions">
            <button class="action-btn download-btn" title="下載檔案">💾</button>
            <button class="action-btn delete-btn" title="刪除檔案">🗑️</button>
        </div>
    `;

    // Download Functionality
    photoItem.querySelector('.download-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.download = `NEO-BOOTH-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
    });

    // Delete Functionality
    photoItem.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        photoItem.style.transform = 'scale(0) rotate(0deg)';
        photoItem.style.opacity = '0';
        setTimeout(() => photoItem.remove(), 400);
    });

    photosGrid.prepend(photoItem);
}

// Clear Gallery
clearBtn.addEventListener('click', () => {
    if (confirm("確定要清除所有記憶片段嗎？👾")) {
        photosGrid.innerHTML = '';
    }
});

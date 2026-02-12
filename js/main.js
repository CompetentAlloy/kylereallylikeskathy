/**
 * Valentine's Day Captcha Website
 * A playful fake captcha that reveals a Valentine's message
 */

// ==================== CONFIGURATION ====================
const CONFIG = {
    // Grid size (4x4 = 16 images)
    gridSize: 16,
    // How many correct selections needed to win
    correctToWin: 8,
    // How many wrong selections trigger failure
    wrongToFail: 3,
    // Delay before cycling to new image (ms)
    cycleDelay: 800,
    // Initial grid composition (out of 16) - how many are "you"
    initialCorrectCount: 10
};

// ==================== IMAGE POOLS ====================
// Replace these with actual image paths when you have real photos
// For now, using placeholder mode

const PLACEHOLDER_MODE = false; // Set to true for colored placeholder boxes

// Your photos
const ME_IMAGES = [
    'images/me/01ae95d4-6e9c-4e71-9883-1012b16293b4.jpg',
    'images/me/46608987-21cf-49bc-82a6-492edab0eaea.jpg',
    'images/me/62c9ac17-6865-4815-8c3d-aa4a1f1583eb.jpg',
    'images/me/7d97e7ad-d9b3-4d19-8a91-d3080835b4da.jpg',
    'images/me/81a082de-f98e-4b84-9074-d6800059f5a2.jpg',
    'images/me/97badd64-a13c-4d5f-9609-3e72a32beef5.jpg',
    'images/me/9f8fbd09-b46c-41a7-9827-ce2799726179.jpg',
    'images/me/caf9b8f0-b549-4428-960c-3ff22429d753.jpg',
    'images/me/cafa55a3-a9b6-40df-b72a-690ab6c2c6d6.jpg',
    'images/me/dde5ccd9-a2f7-4f33-bf77-b333b72795d1.jpg',
    'images/me/ed86276c-d85f-4c07-9e6c-54728f204f7c.jpg'
];

// Decoy images - other people, random objects, etc.
// TODO: Add decoy images to images/decoys/ folder
const DECOY_IMAGES = [
    'images/decoys/01.jpg',
    'images/decoys/02.jpg',
    'images/decoys/03.jpg',
    'images/decoys/04.jpg',
    'images/decoys/05.jpg',
    'images/decoys/06.jpg'
];

// Emoji images for floating animation on Valentine page
const EMOJI_IMAGES = [
    'images/emojis/29066.png',
    'images/emojis/29068.png',
    'images/emojis/29070.png',
    'images/emojis/29072.png',
    'images/emojis/29074.png',
    'images/emojis/29076.png',
    'images/emojis/29078.png',
    'images/emojis/29080.png',
    'images/emojis/29082.png',
    'images/emojis/29084.png',
    'images/emojis/29086.png',
    'images/emojis/29088.png',
    'images/emojis/29090.png',
    'images/emojis/29092.png',
    'images/emojis/29094.png',
    'images/emojis/29096.png'
];

// ==================== STATE ====================
const state = {
    correctSelections: 0,
    wrongSelections: 0,
    selectedCells: new Set(),
    currentGrid: [], // Array of { isMe: boolean, imageIndex: number }
    usedMeIndices: new Set(),
    usedDecoyIndices: new Set(),
    emojiInterval: null // Store interval for cleanup
};

// ==================== AUDIO ====================
const AUDIO = {
    correct: null,
    failure: null,
    valentine: null
};

// Audio file paths - add your audio files to the audio/ folder
const AUDIO_FILES = {
    correct: 'audio/correct.mp3',      // Short "ding" or positive sound (optional)
    failure: 'audio/incorrect.wav',    // Plays on "How could you?!" popup
    valentine: 'audio/success.wav'     // Plays on final Valentine page
};

// ==================== DOM ELEMENTS ====================
let screenLanding, screenCaptcha, screenValentine;
let captchaGrid, btnVerify;
let failurePopup;
let heartsBg;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM elements
    screenLanding = document.getElementById('screen-landing');
    screenCaptcha = document.getElementById('screen-captcha');
    screenValentine = document.getElementById('screen-valentine');
    captchaGrid = document.getElementById('captcha-grid');
    btnVerify = document.getElementById('btn-verify');
    failurePopup = document.getElementById('failure-popup');
    heartsBg = document.getElementById('hearts-bg');

    // Set up event listeners
    document.getElementById('btn-start').addEventListener('click', showCaptchaScreen);
    btnVerify.addEventListener('click', handleVerify);
    document.getElementById('btn-retry').addEventListener('click', dismissFailurePopup);

    // Initialize audio
    initAudio();

    console.log('Valentine Captcha initialized');
});

// ==================== SCREEN TRANSITIONS ====================
function showScreen(screen) {
    // Hide all screens
    [screenLanding, screenCaptcha, screenValentine].forEach(s => {
        s.classList.remove('active');
    });
    // Show target screen
    setTimeout(() => {
        screen.classList.add('active');
    }, 50);
}

function showCaptchaScreen() {
    showScreen(screenCaptcha);
    initCaptcha();
}

function showValentineScreen() {
    showScreen(screenValentine);
    startEmojiAnimation();
    startTimeSinceCounter();
    playSound('valentine'); // Start background music
}

// ==================== CAPTCHA LOGIC ====================
function initCaptcha() {
    // Reset state
    state.correctSelections = 0;
    state.wrongSelections = 0;
    state.selectedCells.clear();
    state.currentGrid = [];
    state.usedMeIndices.clear();
    state.usedDecoyIndices.clear();

    // Clear grid
    captchaGrid.innerHTML = '';

    // Create initial grid with mix of correct and decoy images
    const positions = shuffleArray(Array.from({ length: CONFIG.gridSize }, (_, i) => i));
    const correctPositions = new Set(positions.slice(0, CONFIG.initialCorrectCount));

    for (let i = 0; i < CONFIG.gridSize; i++) {
        const isMe = correctPositions.has(i);
        const imageData = getRandomImage(isMe);
        state.currentGrid.push(imageData);
        createCell(i, imageData);
    }

    // Set up refresh button
    document.getElementById('btn-refresh').onclick = initCaptcha;
}

function getRandomImage(isMe) {
    const pool = isMe ? ME_IMAGES : DECOY_IMAGES;
    const usedSet = isMe ? state.usedMeIndices : state.usedDecoyIndices;

    // If all images used, reset the used set
    if (usedSet.size >= pool.length) {
        usedSet.clear();
    }

    // Find unused index
    let index;
    do {
        index = Math.floor(Math.random() * pool.length);
    } while (usedSet.has(index));

    usedSet.add(index);

    return {
        isMe: isMe,
        imageIndex: index,
        imagePath: pool[index]
    };
}

function createCell(index, imageData) {
    const cell = document.createElement('div');
    cell.className = 'captcha-cell';
    cell.dataset.index = index;

    if (PLACEHOLDER_MODE) {
        // Create placeholder div
        const placeholder = document.createElement('div');
        placeholder.className = `placeholder ${imageData.isMe ? 'me' : 'decoy'}`;
        placeholder.textContent = imageData.isMe ? `ME ${imageData.imageIndex + 1}` : `OTHER`;
        cell.appendChild(placeholder);
    } else {
        // Create actual image
        const img = document.createElement('img');
        img.src = imageData.imagePath;
        img.alt = '';
        img.draggable = false;
        cell.appendChild(img);
    }

    // Add overlay with checkmark circle (Google reCAPTCHA style)
    const overlay = document.createElement('div');
    overlay.className = 'overlay';

    const checkCircle = document.createElement('div');
    checkCircle.className = 'check-circle';
    checkCircle.innerHTML = `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
    overlay.appendChild(checkCircle);

    cell.appendChild(overlay);

    // Add click handler
    cell.addEventListener('click', () => handleCellClick(index));

    captchaGrid.appendChild(cell);
}

function handleCellClick(index) {
    // Ignore if already selected
    if (state.selectedCells.has(index)) {
        return;
    }

    const cell = captchaGrid.children[index];
    const imageData = state.currentGrid[index];

    state.selectedCells.add(index);
    cell.classList.add('selected');

    if (imageData.isMe) {
        // Correct selection
        cell.classList.add('correct');
        state.correctSelections++;
        playSound('correct');

        // Check win condition
        if (state.correctSelections >= CONFIG.correctToWin) {
            setTimeout(() => {
                showValentineScreen();
            }, 500);
            return;
        }

        // Cycle to new image after delay
        setTimeout(() => {
            cycleImage(index);
        }, CONFIG.cycleDelay);

    } else {
        // Wrong selection
        cell.classList.add('wrong');
        state.wrongSelections++;

        // Check fail condition
        if (state.wrongSelections >= CONFIG.wrongToFail) {
            setTimeout(() => {
                showFailurePopup();
            }, 300);
        }
    }
}

function cycleImage(index) {
    const cell = captchaGrid.children[index];

    // Remove selection state
    state.selectedCells.delete(index);
    cell.classList.remove('selected', 'correct', 'wrong');

    // Get new random image (keep same type - always correct)
    const newImageData = getRandomImage(true);
    state.currentGrid[index] = newImageData;

    // Update cell content
    if (PLACEHOLDER_MODE) {
        const placeholder = cell.querySelector('.placeholder');
        placeholder.className = `placeholder ${newImageData.isMe ? 'me' : 'decoy'}`;
        placeholder.textContent = newImageData.isMe ? `ME ${newImageData.imageIndex + 1}` : `OTHER`;
    } else {
        const img = cell.querySelector('img');
        img.src = newImageData.imagePath;
    }
}

function handleVerify() {
    // If enough correct selections, proceed
    if (state.correctSelections >= CONFIG.correctToWin) {
        showValentineScreen();
    }
}

// ==================== FAILURE POPUP ====================
function showFailurePopup() {
    failurePopup.classList.add('active');
    playSound('failure');
}

function dismissFailurePopup() {
    stopSound('failure');
    failurePopup.classList.remove('active');
    setTimeout(() => {
        initCaptcha();
    }, 300);
}

// ==================== VALENTINE ANIMATIONS ====================
function startEmojiAnimation() {
    // Clear any existing interval
    if (state.emojiInterval) {
        clearInterval(state.emojiInterval);
    }

    // Get actual viewport height for iOS Safari compatibility
    const getViewportHeight = () => window.innerHeight;

    // Use emoji images for floating animation
    function createFloatingEmoji() {
        const img = document.createElement('img');
        img.className = 'floating-emoji';
        img.src = EMOJI_IMAGES[Math.floor(Math.random() * EMOJI_IMAGES.length)];
        img.style.left = `${Math.random() * 100}%`;

        const duration = 4 + Math.random() * 4;
        img.style.animationDuration = `${duration}s`;
        img.style.animationDelay = `${Math.random() * 0.5}s`;

        // Random size between 40px and 80px
        const size = 40 + Math.random() * 40;
        img.style.width = `${size}px`;
        img.style.height = `${size}px`;

        // Use pixel value instead of vh for iOS compatibility
        const travelDistance = getViewportHeight() + 150;
        img.style.setProperty('--travel-distance', `-${travelDistance}px`);

        heartsBg.appendChild(img);

        // Remove after animation completes
        setTimeout(() => {
            if (img.parentNode) {
                img.remove();
            }
        }, (duration + 1) * 1000);
    }

    // Create initial batch
    for (let i = 0; i < 8; i++) {
        setTimeout(() => createFloatingEmoji(), i * 300);
    }

    // Continue creating emojis and store interval for cleanup
    state.emojiInterval = setInterval(createFloatingEmoji, 600);
}

// ==================== AUDIO FUNCTIONS ====================
function initAudio() {
    // Pre-load audio files (they'll be ready to play after first user interaction)
    Object.keys(AUDIO_FILES).forEach(key => {
        AUDIO[key] = new Audio(AUDIO_FILES[key]);
        AUDIO[key].preload = 'auto';

        // Reduce success sound volume
        if (key === 'valentine') {
            AUDIO[key].volume = 0.3;
        }
    });
}

function playSound(soundName) {
    const sound = AUDIO[soundName];
    if (sound) {
        // Reset to beginning if already playing
        sound.currentTime = 0;
        sound.play().catch(err => {
            // Audio play failed - likely no user interaction yet or file missing
            console.log(`Audio play failed for ${soundName}:`, err.message);
        });
    }
}

function stopSound(soundName) {
    const sound = AUDIO[soundName];
    if (sound) {
        sound.pause();
        sound.currentTime = 0;
    }
}

// ==================== TIME SINCE COUNTER ====================
function updateTimeSince() {
    const startDate = new Date('2015-11-23T08:00:00');
    const now = new Date();
    const diff = now - startDate;

    // Calculate years, months, days, hours, minutes, seconds
    const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
    const days = Math.floor((diff % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const timeString = `${years} years, ${months} months, ${days} days, ${hours} hours, ${minutes} minutes, and ${seconds} seconds`;

    const element = document.getElementById('time-since');
    if (element) {
        element.textContent = timeString;
    }
}

function startTimeSinceCounter() {
    updateTimeSince();
    setInterval(updateTimeSince, 1000);
}

// ==================== UTILITIES ====================
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

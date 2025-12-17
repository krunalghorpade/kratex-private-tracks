// Demo Data - Tracks (Hardcoded for local file compatibility)
const FALLBACK_TRACKS = [
    { id: 1, title: "Chandra (Kratex Remix)", genre: "House", image: "assets/chandra.png", audio: "assets/music/chandra.wav", bandcamp: "https://bandcamp.com/tag/kratex" },
    { id: 2, title: "Ethereal Frequencies", genre: "House", image: "assets/album1.png", audio: "", bandcamp: "https://bandcamp.com" },
    { id: 3, title: "Deep Echoes", genre: "House", image: "assets/album2.png", audio: "", bandcamp: "https://bandcamp.com" },
    { id: 4, title: "Urban Pulse", genre: "House", image: "assets/album3.png", audio: "", bandcamp: "https://bandcamp.com" },
    { id: 5, title: "Chandra (Original)", genre: "House", image: "assets/chandra.png", audio: "assets/music/chandra.wav", bandcamp: "https://bandcamp.com" },
    { id: 6, title: "Velvet Underground", genre: "House", image: "https://placehold.co/500x500/222/FFF?text=Velvet", audio: "", bandcamp: "https://bandcamp.com" },
    { id: 7, title: "Concrete Jungle", genre: "House", image: "https://placehold.co/500x500/333/FFF?text=Concrete", audio: "", bandcamp: "https://bandcamp.com" },
    { id: 8, title: "Analog Dreams", genre: "House", image: "https://placehold.co/500x500/444/FFF?text=Analog", audio: "", bandcamp: "https://bandcamp.com" },
    { id: 9, title: "Digital Soul", genre: "House", image: "https://placehold.co/500x500/555/FFF?text=Soul", audio: "", bandcamp: "https://bandcamp.com" },
    { id: 10, title: "System Glitch", genre: "House", image: "https://placehold.co/500x500/666/FFF?text=Glitch", audio: "", bandcamp: "https://bandcamp.com" }
];

let tracks = [];

let currentAudio = null;
let audioPreviewTimeout = null;
let currentTrackId = null;

// Helper to Load Data
async function loadTracksApp() {
    try {
        // 1. Try API (if server running)
        const res = await fetch('http://localhost:3000/api/tracks');
        if (res.ok) {
            tracks = await res.json();
            console.log("Loaded tracks from Localhost API");
            return;
        }
    } catch (e) { /* API failed, try file */ }

    try {
        // 2. Try Local JSON (only works if running via server/localhost, not file://)
        const res = await fetch('tracks.json');
        if (res.ok) {
            tracks = await res.json();
            console.log("Loaded tracks from tracks.json");
            return;
        }
    } catch (e) { /* File fetch failed */ }

    // 3. Fallback
    console.warn("Using Fallback Hardcoded Data");
    tracks = FALLBACK_TRACKS;
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize App
    initNavbar();
    initFooter();
    setupMobileNav();

    initCarousel();
    fetchShows();
    renderYoutubeCarousel();
    renderMhouseCarousel();

    // Data Load Phase
    await loadTracksApp();

    renderMasterShowcase();
    renderRankings();
    setupEventListeners();
    setupSearch();

    // Deep Linking Support
    checkHashRoute();
    window.addEventListener('hashchange', checkHashRoute);
});

// --- SESSION & MODAL LOGIC ---

// Helper: Check Session
function isTrackUnlocked(id) {
    return sessionStorage.getItem(`unlocked_${id}`) === 'true';
}

function updateModalContent(trackId) {
    const modalContent = document.querySelector('#password-modal .modal-content');
    const track = tracks.find(t => t.id === trackId);

    if (isTrackUnlocked(trackId)) {
        // UNLOCKED VIEW
        modalContent.innerHTML = `
            <span class="close-modal"><i class="fa-solid fa-xmark"></i></span>
            <h3>DOWNLOADS UNLOCKED</h3>
            <p>Here are your files. Enjoy the music.</p>

            <button id="direct-dl-btn" class="btn full-width secondary-btn" style="margin-bottom: 1rem;">
                <i class="fa-solid fa-download"></i> DOWNLOAD MP3
            </button>
            
            <button id="wav-dl-btn" class="btn full-width bandcamp-btn">
                <i class="fa-solid fa-cart-shopping"></i> GET WAV (BANDCAMP)
            </button>

             <div class="modal-footer-link">
                <button id="back-to-store-link" style="background:none; border:none; color:#666; margin-top:1rem; cursor:pointer;">CLOSE</button>
            </div>
        `;

        // Mobile close listeners need re-attaching since we wiped HTML
        const closeIcon = document.querySelector('.close-modal');
        if (closeIcon) {
            closeIcon.addEventListener('click', () => {
                document.getElementById('password-modal').classList.add('hidden');
            });
        }
        document.getElementById('back-to-store-link').addEventListener('click', () => {
            document.getElementById('password-modal').classList.add('hidden');
        });

        // Attach Button Logic
        document.getElementById('direct-dl-btn').addEventListener('click', () => startDirectDownload(track));
        document.getElementById('wav-dl-btn').addEventListener('click', () => {
            window.open(track.bandcamp || "https://bandcamp.com", "_blank");
        });

    } else {
        // LOCKED VIEW (RESTORED)
        modalContent.innerHTML = `
            <span class="close-modal"><i class="fa-solid fa-xmark"></i></span>
            <h3>RESTRICTED ACCESS</h3>
            <p>Enter password to unlock download.</p>

            <input type="password" id="password-input" placeholder="ENTER PASSWORD">
            
            <button id="submit-password-btn" class="btn full-width" disabled><i class="fa-solid fa-lock"></i>
                UNLOCK</button>
            <div id="feedback-msg" class="feedback"></div>

            <div class="or-divider"><span>OR</span></div>

            <button id="buy-bandcamp-btn-locked" class="btn full-width bandcamp-btn">
                <i class="fa-solid fa-cart-shopping"></i> Download WAV File
            </button>

            <div class="modal-footer-link">
                <span>Don't have a password?</span>
                <button id="get-password-link">GET ACCESS <i class="fa-solid fa-arrow-right"></i></button>
            </div>
        `;

        // Re-attach listeners for Locked View
        const closeIcon = document.querySelector('.close-modal');
        if (closeIcon) {
            closeIcon.addEventListener('click', () => {
                document.getElementById('password-modal').classList.add('hidden');
            });
        }

        // Validation & Submit
        const passInput = document.getElementById('password-input');
        const submitBtn = document.getElementById('submit-password-btn');

        passInput.addEventListener('input', validatePasswordInput);
        passInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') checkPassword(); });
        submitBtn.addEventListener('click', checkPassword);

        // Bandcamp (Locked)
        document.getElementById('buy-bandcamp-btn-locked').addEventListener('click', () => {
            window.open(track.bandcamp || "https://bandcamp.com", "_blank");
        });

        // Get Access
        document.getElementById('get-password-link').addEventListener('click', () => {
            window.location.href = 'access.html';
        });
    }
}

function startDirectDownload(track) {
    if (track.audio && track.audio !== "") {
        const link = document.createElement('a');
        link.href = track.audio;
        link.download = `${track.title}.wav`; // Saving as .wav (source is wav)
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        alert("File not available.");
    }
}

async function validatePasswordInput() {
    const input = document.getElementById('password-input');
    const submitBtn = document.getElementById('submit-password-btn');
    const password = input.value;

    if (!password) {
        submitBtn.disabled = true;
        return;
    }

    const fingerprint = await sha256(password);
    const trackHashKey = `TRACK_${currentTrackId}`;
    const trackHash = HASHES[trackHashKey];

    if (fingerprint === HASHES.MASTER || fingerprint === trackHash) {
        // Valid Password
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-unlock"></i> DOWNLOAD NOW`;
        submitBtn.classList.add('secondary-btn'); // Make it solid orange
    } else {
        // Invalid
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-lock"></i> UNLOCK`;
        submitBtn.classList.remove('secondary-btn');
    }
}

async function checkPassword() {
    const input = document.getElementById('password-input');
    const feedback = document.getElementById('feedback-msg');
    const password = input.value;

    if (!password) return;

    feedback.innerText = "Verifying...";
    feedback.className = "feedback";

    const fingerprint = await sha256(password);
    const trackHashKey = `TRACK_${currentTrackId}`;
    const trackHash = HASHES[trackHashKey];

    if (fingerprint === HASHES.MASTER || fingerprint === trackHash) {
        // SUCCESS
        feedback.innerText = "ACCESS GRANTED.";
        feedback.className = "feedback success";

        // Save Session
        sessionStorage.setItem(`unlocked_${currentTrackId}`, 'true');

        setTimeout(() => {
            updateModalContent(currentTrackId); // Switch to Unlocked View
        }, 800);

    } else {
        feedback.innerText = "ACCESS DENIED. INCORRECT PASSWORD.";
        feedback.className = "feedback error";
    }
}

// --- STANDARD APP LOGIC ---

function setupSearch() {
    bindSearch('search-input', 'search-dropdown');
    bindSearch('mobile-search-input', 'mobile-search-dropdown', () => {
        // Toggle mobile search overlay off on selection
        document.getElementById('mobile-search-overlay').classList.add('hidden');
    });
}

function bindSearch(inputId, dropdownId, onSelect) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);

    if (!input || !dropdown) return;

    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        dropdown.innerHTML = '';

        if (query.length === 0) {
            dropdown.classList.add('hidden');
            return;
        }

        const results = tracks.filter(t => t.title.toLowerCase().includes(query) || t.genre.toLowerCase().includes(query));

        if (results.length > 0) {
            dropdown.classList.remove('hidden');
            results.slice(0, 5).forEach(track => {
                const div = document.createElement('div');
                div.className = 'search-result-item';
                div.onclick = () => {
                    openTrackPage(track.id);
                    dropdown.classList.add('hidden');
                    input.value = '';
                    if (onSelect) onSelect();
                };
                div.innerHTML = `
                    <img src="${track.image}" class="result-thumb" alt="art">
                    <div class="result-info">
                        <span class="result-title">${track.title}</span>
                        <span class="result-artist">${track.genre}</span>
                    </div>
                `;
                dropdown.appendChild(div);
            });
        } else {
            dropdown.classList.add('hidden');
        }
    });
}

function checkHashRoute() {
    const hash = window.location.hash.substring(1); // Remove '#'

    if (hash.startsWith('track/')) {
        const id = parseInt(hash.split('/')[1]);
        if (id && !isNaN(id)) {
            // Open specific track if not already open
            if (currentTrackId !== id) {
                openTrackPage(id, false); // false = don't set hash again
            }
        }
    } else {
        // No relevant hash, close pages if open
        if (currentTrackId) closeTrackPage(false);
    }
}

function renderMasterShowcase() {
    const grid = document.getElementById('shelf-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Show first 8 tracks in master
    tracks.slice(0, 8).forEach(track => {
        const div = document.createElement('div');
        div.className = 'track-card';
        div.onclick = () => openTrackPage(track.id);
        div.innerHTML = `
            <div class="card-img-wrapper">
                <img src="${track.image}" alt="${track.title}">
            </div>
            <div class="card-info">
                <h4>${track.title}</h4>
                <p>${track.genre}</p>
            </div>
        `;
        grid.appendChild(div);
    });
}

function renderRankings() {
    const list = document.getElementById('ranking-list');
    if (!list) return;
    list.innerHTML = '';

    // Sort by manual order (using JSON order as ranking)
    const sorted = tracks.slice(0, 10);

    sorted.forEach((track, index) => {
        const li = document.createElement('li');
        li.className = 'rank-item';
        li.onclick = () => openTrackPage(track.id);
        li.innerHTML = `
            <span class="rank-number">#${index + 1}</span>
            <img src="${track.image}" class="mini-art" alt="art">
            <div class="rank-details">
                <h4>${track.title}</h4>
                <p>${track.genre}</p>
            </div>
        `;
        list.appendChild(li);
    });
}

function openTrackPage(id, updateHash = true) {
    const track = tracks.find(t => t.id === id);
    if (!track) return;

    currentTrackId = id;

    // UI Update
    document.getElementById('detail-img').src = track.image;
    document.getElementById('detail-title').innerText = track.title;

    // Reset Play button
    resetAudio();

    // Render "More Like This"
    renderMoreLikeThis(id);

    // Show View
    document.getElementById('track-view').classList.remove('hidden');
    document.getElementById('home-view').classList.add('hidden');
    window.scrollTo(0, 0);

    // Update Browser URL (Deep Link)
    if (updateHash) {
        window.history.pushState(null, null, `#track/${id}`);
    }
}

function renderMoreLikeThis(currentId) {
    const grid = document.getElementById('more-like-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Filter out current, take 4 random
    const others = tracks.filter(t => t.id !== currentId)
        .sort(() => 0.5 - Math.random())
        .slice(0, 4);

    others.forEach(track => {
        const div = document.createElement('div');
        div.className = 'track-card';
        div.onclick = () => openTrackPage(track.id);
        div.innerHTML = `
            <div class="card-img-wrapper">
                <img src="${track.image}" alt="${track.title}">
            </div>
            <div class="card-info">
                <h4>${track.title}</h4>
                <p>${track.genre}</p>
            </div>
        `;
        grid.appendChild(div);
    });
}

function closeTrackPage(updateHash = true) {
    currentTrackId = null;
    resetAudio();
    document.getElementById('track-view').classList.add('hidden');
    document.getElementById('home-view').classList.remove('hidden');

    if (updateHash) {
        // Remove hash without refreshing
        window.history.pushState(null, null, ' ');
    }
}

function togglePreview() {
    const track = tracks.find(t => t.id === currentTrackId);
    const btn = document.getElementById('play-preview-btn');
    const status = document.getElementById('audio-status');

    if (currentAudio) {
        // Stop playing
        resetAudio();
    } else {
        // Start playing
        if (!track.audio || track.audio === "") {
            alert('Preview not available for this track demo.');
            return;
        }

        currentAudio = new Audio(track.audio);
        // Start at 1:00 (60s)
        currentAudio.currentTime = 60;

        currentAudio.play().then(() => {
            btn.innerHTML = `<i class="fa-solid fa-pause"></i> STOP PREVIEW`;
            status.innerText = "Playing Preview (0:30)...";

            // Stop after 30s (at 1:30)
            audioPreviewTimeout = setTimeout(() => {
                resetAudio();
            }, 30000); // 30s duration

        }).catch(e => {
            console.error(e);
            alert("Playback error or audio not found.");
        });
    }
}

function resetAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    if (audioPreviewTimeout) clearTimeout(audioPreviewTimeout);

    const btn = document.getElementById('play-preview-btn');
    if (btn) btn.innerHTML = `<i class="fa-solid fa-play"></i> PLAY PREVIEW (30s)`;
    const status = document.getElementById('audio-status');
    if (status) status.innerText = "";
}

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function setupEventListeners() {
    // Navigation
    const homeLink = document.getElementById('home-link');
    if (homeLink) homeLink.addEventListener('click', () => closeTrackPage(true));

    const backBtn = document.getElementById('back-btn');
    if (backBtn) backBtn.addEventListener('click', () => closeTrackPage(true));

    // Audio Preview
    const playBtn = document.getElementById('play-preview-btn');
    if (playBtn) playBtn.addEventListener('click', togglePreview);

    // Download Trigger (Opens Modal)
    const downloadBtn = document.getElementById('download-trigger-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!currentTrackId) return;
            // Update Modal Content based on Session State
            updateModalContent(currentTrackId);
            const modal = document.getElementById('password-modal');
            if (modal) modal.classList.remove('hidden');
        });
    }

    // Bandcamp Button (Fallback - Initial render)
    const bandcampBtn = document.getElementById('buy-bandcamp-btn');
    if (bandcampBtn) {
        bandcampBtn.addEventListener('click', () => {
            if (!currentTrackId) return;
            const track = tracks.find(t => t.id === currentTrackId);
            window.open(track.bandcamp || "https://bandcamp.com", "_blank");
        });
    }

    // Modal Close (Initial)
    const closeIcon = document.querySelector('.close-modal');
    if (closeIcon) {
        closeIcon.addEventListener('click', () => {
            const modal = document.getElementById('password-modal');
            if (modal) modal.classList.add('hidden');
        });
    }
}

// --- New Homepage Features ---

function initCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    const dotsContainer = document.querySelector('.carousel-dots');
    const prevBtn = document.querySelector('.carousel-prev');
    const nextBtn = document.querySelector('.carousel-next');

    if (slides.length === 0) return;

    let current = 0;

    // Create Dots
    dotsContainer.innerHTML = '';
    slides.forEach((_, idx) => {
        const dot = document.createElement('div');
        dot.className = `dot ${idx === 0 ? 'active' : ''}`;
        dot.onclick = () => goToSlide(idx);
        dotsContainer.appendChild(dot);
    });

    function updateCarousel() {
        slides.forEach(s => s.classList.remove('active'));
        slides[current].classList.add('active');

        const dots = document.querySelectorAll('.dot');
        dots.forEach(d => d.classList.remove('active'));
        if (dots[current]) dots[current].classList.add('active');
    }

    function goToSlide(idx) {
        current = idx;
        updateCarousel();
    }

    function nextSlide() {
        current = (current + 1) % slides.length;
        updateCarousel();
    }

    function prevSlide() {
        current = (current - 1 + slides.length) % slides.length;
        updateCarousel();
    }

    // Auto Rotate
    const interval = setInterval(nextSlide, 5000); // 5s

    // Listeners
    if (nextBtn) nextBtn.addEventListener('click', () => {
        clearInterval(interval);
        nextSlide();
    });
    if (prevBtn) prevBtn.addEventListener('click', () => {
        clearInterval(interval);
        prevSlide();
    });
}

// Pagination State
let currentPage = 1;
const tracksPerPage = 8;

function renderMasterShowcase() {
    const grid = document.getElementById('shelf-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const start = (currentPage - 1) * tracksPerPage;
    const end = start + tracksPerPage;
    const pageTracks = tracks.slice(start, end);
    const totalPages = Math.ceil(tracks.length / tracksPerPage);

    pageTracks.forEach(track => {
        const div = document.createElement('div');
        div.className = 'track-card';
        div.onclick = () => openTrackPage(track.id);
        div.innerHTML = `
            <div class="card-img-wrapper">
                <img src="${track.image}" alt="${track.title}">
            </div>
            <div class="card-info">
                <h4>${track.title}</h4>
                <p>${track.genre}</p>
            </div>
        `;
        grid.appendChild(div);
    });

    updatePaginationControls(totalPages);
}

function updatePaginationControls(totalPages) {
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const info = document.getElementById('page-info');

    if (info) info.innerText = `Page ${currentPage} of ${totalPages}`;

    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => {
            if (currentPage > 1) { currentPage--; renderMasterShowcase(); }
        }
    }

    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = () => {
            if (currentPage < totalPages) { currentPage++; renderMasterShowcase(); }
        }
    }
}

function fetchShows() {
    const grid = document.getElementById('shows-grid');
    if (!grid) return;

    const API_URL = 'https://rest.bandsintown.com/artists/kratex/events?app_id=a6c091218a1b4ce7722331b71949efd4';

    fetch(API_URL)
        .then(res => res.json())
        .then(data => {
            grid.innerHTML = '';

            // Take top 3
            const shows = Array.isArray(data) ? data.slice(0, 3) : [];

            if (shows.length === 0) {
                grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">No upcoming shows listed.</div>';
                // We still might want the View All button? 
            }

            shows.forEach(show => {
                const date = new Date(show.datetime);
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const venue = show.venue ? show.venue.name : 'TBA';
                const city = show.venue ? `${show.venue.city}, ${show.venue.country}` : '';

                // Replace /e/ with /t/ for ticket checking
                let link = show.url || 'https://shows.kratex.in';
                if (link.includes('/e/')) {
                    link = link.replace('/e/', '/t/');
                }

                const div = document.createElement('a');
                div.className = 'show-card';
                div.href = link;
                div.target = "_blank";
                div.innerHTML = `
                    <div>
                        <div class="show-date">${dateStr}</div>
                        <div class="show-venue">${venue}</div>
                        <div class="show-location">${city}</div>
                    </div>
                    <div class="show-btn">GET TICKETS &rarr;</div>
                `;
                grid.appendChild(div);
            });

            // 4th Card: View All
            if (data.length > 0) {
                const viewAll = document.createElement('a');
                viewAll.className = 'show-card view-all-card';
                viewAll.href = 'https://shows.kratex.in';
                viewAll.target = "_blank";
                viewAll.innerHTML = `<div>VIEW ALL<br>SHOWS &rarr;</div>`;
                grid.appendChild(viewAll);
            }

        })
        .catch(e => {
            console.error(e);
            grid.innerHTML = '<div style="padding:1rem;">Unable to load shows.</div>';
        });
}

function renderYoutubeCarousel() {
    const container = document.getElementById('yt-scroll');
    if (!container) return;

    const videos = [
        "dQw4w9WgXcQ", // Demo ID - Replace with real Kratex IDs
        "kJQP7kiw5Fk",
        "dummy_id_1",
        "dummy_id_2",
        "dummy_id_3"
    ]; // Using placeholders as real IDs are not provided

    container.innerHTML = '';
    videos.forEach(vid => {
        const div = document.createElement('div');
        div.className = 'video-card';
        // Use placeholder for UX if iframe is heavy, but iframe is requested
        div.innerHTML = `<iframe src="https://www.youtube.com/embed/${vid}" allowfullscreen></iframe>`;
        container.appendChild(div);
    });

    // Scroll Logic
    setupHorizontalScroll('yt-scroll', 'yt-left', 'yt-right');
}

function renderMhouseCarousel() {
    const container = document.getElementById('mhouse-scroll');
    if (!container) return;

    // Mock M-House Data
    const items = [
        { title: "Deep Unity", artist: "Kratex", image: "https://placehold.co/300x300/111/FFF?text=MH001" },
        { title: "Rhythm Soul", artist: "M-House Crew", image: "https://placehold.co/300x300/222/FFF?text=MH002" },
        { title: "Late Night", artist: "Kratex", image: "https://placehold.co/300x300/333/FFF?text=MH003" },
        { title: "Vibes", artist: "Guest Artist", image: "https://placehold.co/300x300/444/FFF?text=MH004" },
        { title: "Anthem", artist: "Kratex", image: "https://placehold.co/300x300/555/FFF?text=MH005" }
    ];

    container.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'mhouse-card';
        div.innerHTML = `
            <img src="${item.image}" alt="${item.title}">
            <div class="mhouse-info">
                <h4>${item.title}</h4>
                <p>${item.artist}</p>
            </div>
        `;
        container.appendChild(div);
    });

    // Scroll Logic
    setupHorizontalScroll('mhouse-scroll', 'mhouse-left', 'mhouse-right');
}

function setupHorizontalScroll(containerId, leftBtnId, rightBtnId) {
    const container = document.getElementById(containerId);
    const left = document.getElementById(leftBtnId);
    const right = document.getElementById(rightBtnId);

    if (!container || !left || !right) return;

    left.addEventListener('click', () => {
        container.scrollBy({ left: -300, behavior: 'smooth' });
    });

    right.addEventListener('click', () => {
        container.scrollBy({ left: 300, behavior: 'smooth' });
    });
}


// Demo Data - Tracks with Real Assets
const tracks = [
    { id: 1, title: "Chandra (Kratex Remix)", genre: "House", image: "assets/chandra.png", audio: "assets/music/chandra.wav", downloads: 5000 },
    { id: 2, title: "Ethereal Frequencies", genre: "House", image: "assets/album1.png", audio: "", downloads: 4500 },
    { id: 3, title: "Deep Echoes", genre: "House", image: "assets/album2.png", audio: "", downloads: 4200 },
    { id: 4, title: "Urban Pulse", genre: "House", image: "assets/album3.png", audio: "", downloads: 3800 },
    { id: 5, title: "Chandra (Original)", genre: "House", image: "assets/chandra.png", audio: "assets/music/chandra.wav", downloads: 3000 },
    { id: 6, title: "Velvet Underground", genre: "House", image: "https://placehold.co/500x500/222/FFF?text=Velvet", audio: "", downloads: 2500 },
    { id: 7, title: "Concrete Jungle", genre: "House", image: "https://placehold.co/500x500/333/FFF?text=Concrete", audio: "", downloads: 2100 },
    { id: 8, title: "Analog Dreams", genre: "House", image: "https://placehold.co/500x500/444/FFF?text=Analog", audio: "", downloads: 1800 },
    { id: 9, title: "Digital Soul", genre: "House", image: "https://placehold.co/500x500/555/FFF?text=Soul", audio: "", downloads: 1500 },
    { id: 10, title: "System Glitch", genre: "House", image: "https://placehold.co/500x500/666/FFF?text=Glitch", audio: "", downloads: 1200 },
];

// SHA-256 Hashes
const HASHES = {
    // 'master'
    MASTER: "fc613b4dfd6736a7bd268c8a0e74ed0d1c04a959f59dd74ef2874983fd443fc9",
    // 'track1' (Example individual password for Track 1)
    TRACK_1: "8a428b89701c7c4385ebb25d452c8cdabfad2b9bf0e3f87dfab2ce5aed3ea3ca"
};

let currentAudio = null;
let audioPreviewTimeout = null;
let currentTrackId = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    renderMasterShowcase();
    renderRankings();
    setupEventListeners();
    setupSearch();

    // Deep Linking Support
    checkHashRoute();
    window.addEventListener('hashchange', checkHashRoute);
});


// Search Functionality
function setupSearch() {
    const input = document.getElementById('search-input');
    const dropdown = document.getElementById('search-dropdown');

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
                    input.value = ''; // Clear search
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

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
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
    list.innerHTML = '';

    // Sort by downloads desc, take top 5
    const sorted = [...tracks].sort((a, b) => b.downloads - a.downloads).slice(0, 5);

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



// Audio Logic //
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
            btn.innerHTML = `<i class="lni lni-pause"></i> STOP PREVIEW`;
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
    if (btn) btn.innerHTML = `<i class="lni lni-play"></i> PLAY PREVIEW (30s)`;
    const status = document.getElementById('audio-status');
    if (status) status.innerText = "";
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
        submitBtn.innerHTML = `<i class="lni lni-unlock"></i> DOWNLOAD NOW`;
        submitBtn.classList.add('secondary-btn'); // Make it solid orange
    } else {
        // Invalid
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="lni lni-lock-alt"></i> UNLOCK`;
        submitBtn.classList.remove('secondary-btn');
    }
}

// Password & Download Logic //
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

    // Check Match: Master Key OR Individual Track Key
    if (fingerprint === HASHES.MASTER || fingerprint === trackHash) {
        feedback.innerText = "ACCESS GRANTED. DOWNLOAD STARTED.";
        feedback.className = "feedback success";

        const track = tracks.find(t => t.id === currentTrackId);

        setTimeout(() => {
            document.getElementById('password-modal').classList.add('hidden');

            // Trigger Real Download
            if (track.audio && track.audio !== "") {
                feedback.innerText = "Preparing Download...";

                fetch(track.audio)
                    .then(res => {
                        if (!res.ok) throw new Error("Network response was not ok");
                        return res.blob();
                    })
                    .then(blob => {
                        // Force generic binary type to prevent browser playback
                        const newBlob = new Blob([blob], { type: 'application/octet-stream' });
                        const url = window.URL.createObjectURL(newBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${track.title}.wav`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                        feedback.innerText = "Download Started!"; // Success
                    })
                    .catch(e => {
                        // 2. Fallback (e.g. file:// protocol blocks fetch)
                        console.warn("Fetch failed, using fallback:", e);
                        const link = document.createElement('a');
                        link.href = track.audio;
                        link.download = `${track.title}.wav`;
                        link.target = '_blank';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        feedback.innerText = "Browser blocked direct download. Opening file... Right Click > Save As.";
                    });

            } else {
                alert(`Demo download not available for: ${track.title} (File missing)`);
            }
        }, 1000);
    } else {
        feedback.innerText = "ACCESS DENIED. INCORRECT PASSWORD.";
        feedback.className = "feedback error";
    }
}

// Utils
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Event Listeners //
function setupEventListeners() {
    // Navigation
    const homeLink = document.getElementById('home-link');
    if (homeLink) homeLink.addEventListener('click', () => closeTrackPage(true));

    const backBtn = document.getElementById('back-btn');
    if (backBtn) backBtn.addEventListener('click', () => closeTrackPage(true));

    // Audio Preview
    const playBtn = document.getElementById('play-preview-btn');
    if (playBtn) {
        // Remove old listeners by cloning (optional but safe)
        // const newPlayBtn = playBtn.cloneNode(true);
        // playBtn.parentNode.replaceChild(newPlayBtn, playBtn);
        // newPlayBtn.addEventListener('click', togglePreview);
        // Actually standard addEventListener is fine since we run once.
        playBtn.addEventListener('click', togglePreview);
    }

    // Download Trigger (Opens Modal)
    const downloadBtn = document.getElementById('download-trigger-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            // Only allow if track loaded
            if (!currentTrackId) return;

            const modal = document.getElementById('password-modal');
            const input = document.getElementById('password-input');
            const submit = document.getElementById('submit-password-btn');

            modal.classList.remove('hidden');
            input.value = '';
            document.getElementById('feedback-msg').innerText = '';

            // Reset Button State
            submit.disabled = true;
            submit.innerHTML = `<i class="lni lni-lock-alt"></i> UNLOCK`;
            submit.classList.remove('secondary-btn'); // ensure it's default

            // Focus input
            setTimeout(() => input.focus(), 100);
        });
    }

    // Modal Close
    const closeIcon = document.querySelector('.close-modal');
    if (closeIcon) {
        closeIcon.addEventListener('click', () => {
            document.getElementById('password-modal').classList.add('hidden');
        });
    }

    // Password Submit
    const submitBtn = document.getElementById('submit-password-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', checkPassword);
    }

    // Enter key for password
    const passInput = document.getElementById('password-input');
    if (passInput) {
        passInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') checkPassword();
        });
        passInput.addEventListener('input', validatePasswordInput);
    }

    // ... items ...


    // Membership Navigation
    const getPassLink = document.getElementById('get-password-link');
    if (getPassLink) {
        getPassLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'access.html';
        });
    }
}

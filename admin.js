document.addEventListener('DOMContentLoaded', () => {
    // Init Navbar/Footer
    if (typeof initNavbar === 'function') initNavbar();
    if (typeof initFooter === 'function') initFooter();
    if (typeof setupMobileNav === 'function') setupMobileNav();

    // Elements
    const loginOverlay = document.getElementById('login-overlay');
    const dashboard = document.getElementById('admin-dashboard');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const loginMsg = document.getElementById('login-msg');
    const ingestForm = document.getElementById('ingest-form');

    // Manual Mode Elements
    const manualNotice = document.getElementById('manual-mode-notice');
    const jsonOutput = document.getElementById('json-output');
    const copyBtn = document.getElementById('copy-json-btn');

    // Table Elements
    const tableBody = document.getElementById('tracks-table-body');
    const refreshBtn = document.getElementById('refresh-btn');

    // State
    const ADMIN_ID = "kratexadmin123";
    const ADMIN_PASS = "adminpass123";
    let isServerAvailable = false;
    let currentTracks = [];
    let editingTrackId = null; // Track being edited

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

    // --- INITIALIZATION ---

    // 1. Check Server Status
    checkServerStatus();

    // 2. Check Auth (Remember Me)
    if (localStorage.getItem('kratexAdminAuth') === 'true') {
        showDashboard();
    }

    // --- FUNCTIONS ---

    async function checkServerStatus() {
        try {
            const res = await fetch('http://localhost:3000/api/meta');
            if (res.ok) {
                isServerAvailable = true;
                const data = await res.json();
                if (data.lastModified) {
                    const date = new Date(data.lastModified);
                    document.getElementById('last-saved-time').innerText = "Last Saved: " + date.toLocaleString();
                } else {
                    document.getElementById('last-saved-time').innerText = "Last Saved: Unknown";
                }
            }
        } catch (e) {
            isServerAvailable = false;
            document.getElementById('last-saved-time').innerText = "Server Offline (Manual Mode)";
        }
        console.log("Server Available:", isServerAvailable);
        updateModeUI();
    }

    function showDashboard() {
        loginOverlay.style.display = 'none';
        dashboard.style.display = 'block';
        dashboard.classList.remove('hidden');
        loadTracks();
    }

    function updateModeUI() {
        if (isServerAvailable) {
            manualNotice.classList.add('hidden');
        } else {
            manualNotice.classList.remove('hidden');
        }
    }

    async function loadTracks() {
        try {
            if (isServerAvailable) {
                // Fetch from API
                const res = await fetch('http://localhost:3000/api/tracks');
                currentTracks = await res.json();
            } else {
                // Fetch from static file
                const res = await fetch('tracks.json');
                currentTracks = await res.json();
            }
        } catch (e) {
            console.error("Error loading tracks", e);
            currentTracks = FALLBACK_TRACKS;
        }
        renderTable();
        if (!isServerAvailable) updateJsonPreview();
    }

    function renderTable() {
        tableBody.innerHTML = '';
        currentTracks.sort((a, b) => a.id - b.id);

        currentTracks.forEach(track => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${track.id}</td>
                <td><img src="${track.image}" class="track-thumb" onerror="this.src='assets/chandra.png'"></td>
                <td>${track.title}</td>
                <td>${track.genre}</td>
                <td>
                    <button class="edit-btn" data-id="${track.id}">EDIT</button>
                    <button class="delete-btn" data-id="${track.id}">DELETE</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Bind Buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => deleteTrack(parseInt(e.target.dataset.id)));
        });
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => startEdit(parseInt(e.target.dataset.id)));
        });
    }

    function startEdit(id) {
        const track = currentTracks.find(t => t.id === id);
        if (!track) return;

        document.getElementById('track-title').value = track.title;
        document.getElementById('track-genre').value = track.genre;
        document.getElementById('track-image').value = track.image;
        document.getElementById('track-audio').value = track.audio || "";
        document.getElementById('track-bandcamp').value = track.bandcamp || "";

        editingTrackId = id;

        const btn = ingestForm.querySelector('button[type="submit"]');
        btn.innerText = "UPDATE TRACK #" + id;
        btn.style.backgroundColor = "#EE6C4D"; // Force orange

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function resetFormState() {
        ingestForm.reset();
        editingTrackId = null;
        const btn = ingestForm.querySelector('button[type="submit"]');
        btn.innerText = "ADD TRACK TO LIST";
        btn.style.backgroundColor = ""; // Reset
    }

    async function updateTrack(id, trackData) {
        if (isServerAvailable) {
            try {
                const res = await fetch(`http://localhost:3000/api/tracks/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(trackData)
                });
                if (res.ok) {
                    alert('Track Updated Successfully!');
                    loadTracks();
                } else {
                    alert('Server Error: Failed to update track.');
                }
            } catch (e) {
                alert('Connection Error!');
            }
        } else {
            // Manual Mode
            const index = currentTracks.findIndex(t => t.id === id);
            if (index !== -1) {
                currentTracks[index] = { ...currentTracks[index], ...trackData, id: id };
                renderTable();
                updateJsonPreview();
                alert('Track updated. Copy JSON to save.');
            }
        }
    }

    // ... (addTrack, deleteTrack, uploadFiles) ...

    ingestForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('track-title').value;
        const genre = document.getElementById('track-genre').value;
        const bandcamp = document.getElementById('track-bandcamp').value || "";

        let image = document.getElementById('track-image').value;
        let audio = document.getElementById('track-audio').value || "";

        const imageFile = document.getElementById('track-image-file').files[0];
        const audioFile = document.getElementById('track-audio-file').files[0];

        // Handle File Uploads (Only if selected)
        if (imageFile || audioFile) {
            if (!isServerAvailable) {
                alert("Cannot upload files in Manual Mode. Please use URLs or start the server.");
                return;
            }
            try {
                const paths = await uploadFiles(imageFile, audioFile);
                if (paths.imagePath) image = paths.imagePath;
                if (paths.audioPath) audio = paths.audioPath;
            } catch (err) {
                alert("Upload Failed!");
                return;
            }
        }

        const trackData = { title, genre, image, audio, bandcamp };

        if (editingTrackId) {
            await updateTrack(editingTrackId, trackData);
        } else {
            await addTrack(trackData);
        }

        checkServerStatus();
        resetFormState();
    });

    // --- INITIALIZATION ---

    // 1. Check Server Status
    checkServerStatus();

    // 2. Check Auth (Remember Me)
    if (localStorage.getItem('kratexAdminAuth') === 'true') {
        showDashboard();
    }

    // --- FUNCTIONS ---

    async function checkServerStatus() {
        try {
            const res = await fetch('http://localhost:3000/api/meta');
            if (res.ok) {
                isServerAvailable = true;
                const data = await res.json();
                if (data.lastModified) {
                    const date = new Date(data.lastModified);
                    document.getElementById('last-saved-time').innerText = "Last Saved: " + date.toLocaleString();
                } else {
                    document.getElementById('last-saved-time').innerText = "Last Saved: Unknown";
                }
            }
        } catch (e) {
            isServerAvailable = false;
            document.getElementById('last-saved-time').innerText = "Server Offline (Manual Mode)";
        }
        console.log("Server Available:", isServerAvailable);
        updateModeUI();
    }

    function showDashboard() {
        loginOverlay.style.display = 'none';
        dashboard.style.display = 'block';
        dashboard.classList.remove('hidden');
        loadTracks();
    }

    function updateModeUI() {
        if (isServerAvailable) {
            manualNotice.classList.add('hidden');
        } else {
            manualNotice.classList.remove('hidden');
        }
    }

    async function loadTracks() {
        try {
            if (isServerAvailable) {
                // Fetch from API
                const res = await fetch('http://localhost:3000/api/tracks');
                currentTracks = await res.json();
            } else {
                // Fetch from static file
                const res = await fetch('tracks.json');
                currentTracks = await res.json();
            }
        } catch (e) {
            console.error("Error loading tracks", e);
            currentTracks = FALLBACK_TRACKS;
        }
        renderTable();
        if (!isServerAvailable) updateJsonPreview();
    }

    function renderTable() {
        tableBody.innerHTML = '';
        currentTracks.sort((a, b) => a.id - b.id);

        currentTracks.forEach(track => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${track.id}</td>
                <td><img src="${track.image}" class="track-thumb" onerror="this.src='assets/chandra.png'"></td>
                <td>${track.title}</td>
                <td>${track.genre}</td>
                <td>
                    <button class="delete-btn" data-id="${track.id}">DELETE</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Bind Delete Buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                deleteTrack(id);
            });
        });
    }

    async function addTrack(trackData) {
        if (isServerAvailable) {
            try {
                const res = await fetch('http://localhost:3000/api/tracks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(trackData)
                });
                if (res.ok) {
                    alert('Track Added Successfully!');
                    loadTracks();
                } else {
                    alert('Server Error: Failed to add track.');
                }
            } catch (e) {
                alert('Connection Error!');
            }
        } else {
            // Manual Mode
            // Assign ID
            const newId = currentTracks.length > 0 ? Math.max(...currentTracks.map(t => t.id)) + 1 : 1;
            trackData.id = newId;
            currentTracks.push(trackData);
            renderTable();
            updateJsonPreview();
            alert('Track added to list. Please COPY JSON to save permanent changes.');
        }
    }

    async function deleteTrack(id) {
        if (!confirm(`Are you sure you want to remove track #${id}?`)) return;

        if (isServerAvailable) {
            try {
                const res = await fetch(`http://localhost:3000/api/tracks/${id}`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    loadTracks();
                } else {
                    alert('Failed to delete track.');
                }
            } catch (e) {
                alert('Connection Error');
            }
        } else {
            // Manual Mode
            currentTracks = currentTracks.filter(t => t.id !== id);
            renderTable();
            updateJsonPreview();
        }
    }

    function updateJsonPreview() {
        if (jsonOutput) jsonOutput.value = JSON.stringify(currentTracks, null, 4);
    }

    // Helper: Upload Files
    async function uploadFiles(imageFile, audioFile) {
        const formData = new FormData();
        if (imageFile) formData.append('image', imageFile);
        if (audioFile) formData.append('audio', audioFile);

        const res = await fetch('http://localhost:3000/api/upload', {
            method: 'POST',
            body: formData
        });
        return await res.json();
    }

    // --- EVENT LISTENERS ---

    loginBtn.addEventListener('click', () => {
        const id = document.getElementById('admin-id').value;
        const pass = document.getElementById('admin-pass').value;
        const remember = document.getElementById('remember-me').checked;

        if (id === ADMIN_ID && pass === ADMIN_PASS) {
            if (remember) localStorage.setItem('kratexAdminAuth', 'true');
            showDashboard();
        } else {
            loginMsg.innerText = "Invalid Credentials.";
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('kratexAdminAuth');
        location.reload();
    });

    refreshBtn.addEventListener('click', () => {
        checkServerStatus();
        loadTracks();
    });

    ingestForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('track-title').value;
        const genre = document.getElementById('track-genre').value;
        const bandcamp = document.getElementById('track-bandcamp').value || "";

        let image = document.getElementById('track-image').value;
        let audio = document.getElementById('track-audio').value || "";

        const imageFile = document.getElementById('track-image-file').files[0];
        const audioFile = document.getElementById('track-audio-file').files[0];

        // Handle File Uploads
        if (imageFile || audioFile) {
            if (!isServerAvailable) {
                alert("Cannot upload files in Manual Mode. Please use URLs or start the server.");
                return;
            }

            try {
                const paths = await uploadFiles(imageFile, audioFile);
                if (paths.imagePath) image = paths.imagePath;
                if (paths.audioPath) audio = paths.audioPath;
            } catch (err) {
                alert("Upload Failed!");
                console.error(err);
                return;
            }
        }

        // Add Track
        const newTrack = { title, genre, image, audio, bandcamp };
        await addTrack(newTrack);

        // Refresh Time
        checkServerStatus();

        ingestForm.reset();
    });

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            jsonOutput.select();
            document.execCommand('copy');
            alert("Copied to clipboard!");
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Init Navbar/Footer
    if (typeof initNavbar === 'function') initNavbar();
    if (typeof initFooter === 'function') initFooter();
    if (typeof setupMobileNav === 'function') setupMobileNav();

    // Elements
    const loginOverlay = document.getElementById('login-overlay');
    const dashboard = document.getElementById('admin-dashboard');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn') || document.getElementById('logout-link'); // Support both
    const loginMsg = document.getElementById('login-msg');

    // Modal Elements (Add/Edit)
    const trackModal = document.getElementById('track-modal');
    const openAddBtn = document.getElementById('open-add-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const ingestForm = document.getElementById('ingest-form');
    const modalTitle = document.getElementById('modal-title');
    const submitBtn = document.querySelector('#ingest-form button[type="submit"]');

    // Delete Modal Elements
    const deleteModal = document.getElementById('delete-modal');
    const cancelDelBtn = document.getElementById('cancel-delete-btn');
    const confirmDelBtn = document.getElementById('confirm-delete-btn');
    const deleteNameDisplay = document.getElementById('delete-track-name');

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
    let editingTrackId = null;
    let pendingDeleteId = null;

    const FALLBACK_TRACKS = [
        { id: 1, title: "Chandra (Kratex Remix)", genre: "House", image: "assets/chandra.png", audio: "assets/music/chandra.wav", bandcamp: "https://bandcamp.com/tag/kratex" },
        { id: 2, title: "Ethereal Frequencies", genre: "House", image: "assets/album1.png", audio: "", bandcamp: "https://bandcamp.com" },
        { id: 3, title: "Deep Echoes", genre: "House", image: "assets/album2.png", audio: "", bandcamp: "https://bandcamp.com" },
        { id: 4, title: "Urban Pulse", genre: "House", image: "assets/album3.png", audio: "", bandcamp: "https://bandcamp.com" },
        { id: 5, title: "Chandra (Original)", genre: "House", image: "assets/chandra.png", audio: "assets/music/chandra.wav", bandcamp: "https://bandcamp.com" }
    ];

    // --- INITIALIZATION ---
    (async function init() {
        await checkServerStatus();

        // Check Auth
        if (localStorage.getItem('kratexAdminAuth') === 'true') {
            showDashboard();
        }
    })();

    // --- FUNCTIONS ---

    // 1. Delete Modal Logic
    function openDeleteModal(id) {
        pendingDeleteId = id;
        const track = currentTracks.find(t => t.id === id);
        if (deleteNameDisplay) deleteNameDisplay.innerText = track ? track.title : `#${id}`;
        if (deleteModal) deleteModal.classList.add('active');
    }

    function closeDeleteModal() {
        pendingDeleteId = null;
        if (deleteModal) deleteModal.classList.remove('active');
    }

    async function confirmDelete() {
        if (!pendingDeleteId) return;

        const id = pendingDeleteId;
        if (confirmDelBtn) confirmDelBtn.disabled = true;

        if (isServerAvailable) {
            try {
                const res = await fetch(`http://localhost:3000/api/tracks/${id}`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    loadTracks();
                } else {
                    alert('Failed to delete track from server.');
                }
            } catch (e) {
                console.error(e);
                alert('Connection Error: Could not delete track.');
            }
        } else {
            // Manual Mode
            currentTracks = currentTracks.filter(t => t.id !== id);
            renderTable();
            updateJsonPreview();
        }

        if (confirmDelBtn) confirmDelBtn.disabled = false;
        closeDeleteModal();
    }

    // 2. Add/Edit Modal Logic
    function openModal(mode = 'add', track = null) {
        trackModal.classList.add('active');
        ingestForm.reset();

        if (mode === 'edit' && track) {
            editingTrackId = track.id;
            modalTitle.innerText = "Edit Track #" + track.id;
            submitBtn.innerText = "UPDATE TRACK";

            document.getElementById('track-title').value = track.title;
            document.getElementById('track-genre').value = track.genre;
            document.getElementById('track-image').value = track.image;
            document.getElementById('track-audio').value = track.audio || "";
            document.getElementById('track-bandcamp').value = track.bandcamp || "";
        } else {
            editingTrackId = null;
            modalTitle.innerText = "Add New Track";
            submitBtn.innerText = "SAVE TRACK";
        }
    }

    function closeModal() {
        trackModal.classList.remove('active');
        editingTrackId = null;
        ingestForm.reset();
    }

    // 3. Core Logic
    async function checkServerStatus() {
        try {
            const res = await fetch(`http://localhost:3000/api/meta?t=${Date.now()}`);
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
        updateModeUI();
    }

    function showDashboard() {
        loginOverlay.style.display = 'none';
        dashboard.style.display = 'flex';
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
                const res = await fetch(`http://localhost:3000/api/tracks?t=${Date.now()}`);
                currentTracks = await res.json();
            } else {
                const res = await fetch(`tracks.json?t=${Date.now()}`);
                currentTracks = await res.json();
            }
        } catch (e) {
            console.error("Error loading tracks", e);
            currentTracks = FALLBACK_TRACKS;
        }
        renderTable();
        updateStats();
        if (!isServerAvailable) updateJsonPreview();
    }

    function updateStats() {
        const total = document.getElementById('total-tracks-val');
        if (total) total.innerText = currentTracks.length;
    }

    // Sorting State
    let currentSort = { column: 'date', direction: 'desc' };

    function renderTable() {
        tableBody.innerHTML = '';

        // Sort Data
        currentTracks.sort((a, b) => {
            let valA, valB;
            const statsA = a.stats || { views: 0, downloads: 0, wavClicks: 0 };
            const statsB = b.stats || { views: 0, downloads: 0, wavClicks: 0 };

            switch (currentSort.column) {
                case 'id':
                    valA = a.id; valB = b.id; break;
                case 'title':
                    valA = a.title.toLowerCase(); valB = b.title.toLowerCase(); break;
                case 'genre':
                    valA = a.genre.toLowerCase(); valB = b.genre.toLowerCase(); break;
                case 'views':
                    valA = statsA.views; valB = statsB.views; break;
                case 'downloads':
                    valA = statsA.downloads; valB = statsB.downloads; break;
                case 'wavs':
                    valA = statsA.wavClicks; valB = statsB.wavClicks; break;
                case 'date':
                default:
                    valA = a.uploadDate ? new Date(a.uploadDate).getTime() : 0;
                    valB = b.uploadDate ? new Date(b.uploadDate).getTime() : 0;
                    break;
            }

            if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        // Update Icons
        document.querySelectorAll('th.sortable i').forEach(icon => icon.className = 'fa-solid fa-sort');
        const activeTh = document.querySelector(`th[data-sort="${currentSort.column}"]`);
        if (activeTh) {
            const activeIcon = activeTh.querySelector('i');
            if (activeIcon) activeIcon.className = `fa-solid fa-sort-${currentSort.direction === 'asc' ? 'up' : 'down'}`;
        }

        currentTracks.forEach(track => {
            const stats = track.stats || { views: 0, downloads: 0, wavClicks: 0 };
            const dateStr = track.uploadDate ? new Date(track.uploadDate).toLocaleDateString() : 'N/A';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${track.id}</td>
                <td><img src="${track.image}" class="track-thumb" onerror="this.src='assets/chandra.png'"></td>
                <td><strong>${track.title}</strong></td>
                <td>${track.genre}</td>
                <td class="text-center text-muted">${stats.views}</td>
                <td class="text-center text-muted">${stats.downloads}</td>
                <td class="text-center text-muted">${stats.wavClicks}</td>
                <td class="text-muted" style="font-size:0.8rem;">${dateStr}</td>
                <td>
                    <button class="btn-action btn-edit" data-id="${track.id}"><i class="fa-solid fa-pen"></i> Edit</button>
                    <button class="btn-action btn-delete" data-id="${track.id}"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Sort Listeners
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            if (currentSort.column === col) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = col;
                currentSort.direction = 'desc'; // Default desc for new col often better for numbers/dates
            }
            renderTable();
        });
    });

    // 4. CRUD Operations
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
                    closeModal();
                    loadTracks();
                } else {
                    alert('Server Error: Failed to update track.');
                }
            } catch (e) {
                alert('Connection Error!');
            }
        } else {
            const index = currentTracks.findIndex(t => t.id === id);
            if (index !== -1) {
                currentTracks[index] = { ...currentTracks[index], ...trackData, id: id };
                renderTable();
                updateJsonPreview();
                closeModal();
                alert('Track updated. Copy JSON to save.');
            }
        }
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
                    closeModal();
                    loadTracks();
                } else {
                    alert('Server Error: Failed to add track.');
                }
            } catch (e) {
                alert('Connection Error!');
            }
        } else {
            const newId = currentTracks.length > 0 ? Math.max(...currentTracks.map(t => t.id)) + 1 : 1;
            trackData.id = newId;
            currentTracks.push(trackData);
            renderTable();
            updateJsonPreview();
            closeModal();
            alert('Track added to list. Please COPY JSON to save permanent changes.');
        }
    }

    function updateJsonPreview() {
        if (jsonOutput) jsonOutput.value = JSON.stringify(currentTracks, null, 4);
    }

    // Helper: Upload Files
    async function uploadFiles(imageFile, audioFile, title) {
        const formData = new FormData();
        if (title) formData.append('title', title);
        if (imageFile) formData.append('image', imageFile);
        if (audioFile) formData.append('audio', audioFile);

        const res = await fetch('http://localhost:3000/api/upload', {
            method: 'POST',
            body: formData
        });
        return await res.json();
    }

    // --- EVENT LISTENERS ---

    // 1. Delete Modal
    if (cancelDelBtn) cancelDelBtn.addEventListener('click', closeDeleteModal);
    if (confirmDelBtn) confirmDelBtn.addEventListener('click', confirmDelete);
    if (deleteModal) {
        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) closeDeleteModal();
        });
    }

    // 2. Add/Edit Modal
    if (openAddBtn) openAddBtn.addEventListener('click', () => openModal('add'));
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (trackModal) {
        trackModal.addEventListener('click', (e) => {
            if (e.target === trackModal) closeModal();
        });
    }

    // 3. Table Action Delegation
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.btn-delete');
            const editBtn = e.target.closest('.btn-edit');

            if (deleteBtn) {
                const id = parseInt(deleteBtn.dataset.id);
                openDeleteModal(id);
            } else if (editBtn) {
                const id = parseInt(editBtn.dataset.id);
                // Important: find integer ID
                const track = currentTracks.find(t => t.id === id);
                if (track) openModal('edit', track);
            }
        });
    }

    // 4. Form Submit
    if (ingestForm) {
        ingestForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Collect Data
            const title = document.getElementById('track-title').value;
            const genre = document.getElementById('track-genre').value;
            let image = document.getElementById('track-image').value;
            let audio = document.getElementById('track-audio').value;
            const bandcamp = document.getElementById('track-bandcamp').value;

            const imageFile = document.getElementById('track-image-file').files[0];
            const audioFile = document.getElementById('track-audio-file').files[0];

            // Handle Uploads
            if (imageFile || audioFile) {
                if (!isServerAvailable) {
                    alert("Cannot upload files in Manual Mode. Please use URLs or start the server.");
                    return;
                }
                try {
                    const paths = await uploadFiles(imageFile, audioFile, title);
                    if (paths.imagePath) image = paths.imagePath;
                    if (paths.audioPath) audio = paths.audioPath;
                } catch (err) {
                    alert("Upload Failed!");
                    console.error(err);
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
        });
    }

    // 5. Auth
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const user = document.getElementById('admin-id').value;
            const pass = document.getElementById('admin-pass').value;

            if (user === ADMIN_ID && pass === ADMIN_PASS) {
                localStorage.setItem('kratexAdminAuth', 'true');
                showDashboard();
            } else {
                loginMsg.innerText = "Invalid Credentials";
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('kratexAdminAuth');
            window.location.reload();
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            jsonOutput.select();
            document.execCommand('copy');
            alert("Copied directly to clipboard!");
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            checkServerStatus();
            loadTracks();
        });
    }
});

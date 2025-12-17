const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const multer = require('multer');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

const DATA_FILE = path.join(__dirname, 'tracks.json');

// Helper to read data
function readData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

// Helper to write data
function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 4));
}

// --- FILE UPLOAD SETUP ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = './assets/uploads';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Try to get title from body (depends on field order in FormData)
        // If not present, fallback to timestamp
        let filenameBase = 'upload-' + Date.now();

        if (req.body && req.body.title) {
            // Sanitization: "Use underscore if spaces... use camel casing"
            // Let's do: My New Track -> My_New_Track (Snake with Caps) as requested "underscore if spaces"
            // Wait, "camel casing" implies myNewTrack. 
            // The user prompt is contradictory: "Use underscore if sapces are found ... use came casing".
            // I'll prioritize underscore for spaces, preserving case usually, or just removing spaces.
            // Let's go with: "My New Track" -> "My_New_Track"
            filenameBase = req.body.title.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
        }

        const ext = path.extname(file.originalname);
        // Add timestamp to ensure uniqueness even with same title
        const unique = Date.now().toString().slice(-4);
        cb(null, `${filenameBase}_${unique}${ext}`);
    }
});
const upload = multer({ storage: storage });

// --- API ROUTES ---

// GET Meta (Time)
app.get('/api/meta', (req, res) => {
    try {
        const stats = fs.statSync(DATA_FILE);
        res.json({ lastModified: stats.mtime });
    } catch (e) {
        res.json({ lastModified: null });
    }
});

// UPLOAD Files
app.post('/api/upload', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'audio', maxCount: 1 }]), (req, res) => {
    const result = {};
    if (req.files && req.files['image']) {
        // Convert to relative path (replace backslashes for Windows)
        result.imagePath = req.files['image'][0].path.replace(/\\/g, '/');
    }
    if (req.files && req.files['audio']) {
        result.audioPath = req.files['audio'][0].path.replace(/\\/g, '/');
    }
    res.json(result);
});

// GET Tracks
app.get('/api/tracks', (req, res) => {
    const tracks = readData();
    res.json(tracks);
});

// STATS Update
app.post('/api/stats', (req, res) => {
    const { id, type } = req.body; // type: 'view' | 'download' | 'wav'
    const tracks = readData();
    const track = tracks.find(t => t.id === parseInt(id));

    if (track) {
        if (!track.stats) track.stats = { views: 0, downloads: 0, wavClicks: 0 };

        if (type === 'view') track.stats.views = (track.stats.views || 0) + 1;
        if (type === 'download') track.stats.downloads = (track.stats.downloads || 0) + 1;
        if (type === 'wav') track.stats.wavClicks = (track.stats.wavClicks || 0) + 1;

        writeData(tracks);
        res.json({ success: true, stats: track.stats });
    } else {
        res.status(404).json({ error: "Track not found" });
    }
});

// POST (Add) Track
app.post('/api/tracks', (req, res) => {
    const tracks = readData();
    const newTrack = req.body;

    // Assign ID
    if (!newTrack.id) {
        const maxId = tracks.length > 0 ? Math.max(...tracks.map(t => t.id)) : 0;
        newTrack.id = maxId + 1;
    }

    // Initialize Metadata
    newTrack.uploadDate = new Date().toISOString();
    newTrack.stats = { views: 0, downloads: 0, wavClicks: 0 };

    tracks.push(newTrack);
    writeData(tracks);
    res.json({ success: true, track: newTrack });
});

// PUT (Update) Track
app.put('/api/tracks/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const updatedTrack = req.body;
    const tracks = readData();
    const index = tracks.findIndex(t => t.id === id);

    if (index !== -1) {
        // Preserve un-sent stats/date if updating unrelated fields
        const existing = tracks[index];
        updatedTrack.uploadDate = existing.uploadDate || new Date().toISOString();
        updatedTrack.stats = existing.stats || { views: 0, downloads: 0, wavClicks: 0 };

        // Merge
        tracks[index] = { ...existing, ...updatedTrack, id: id };
        writeData(tracks);
        res.json({ success: true, track: tracks[index] });
    } else {
        res.status(404).json({ error: "Track not found" });
    }
});

// DELETE Track
app.delete('/api/tracks/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let tracks = readData();
    const newTracks = tracks.filter(t => t.id !== id);

    if (tracks.length !== newTracks.length) {
        writeData(newTracks);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Track not found" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Admin Dashboard: http://localhost:${PORT}/admin.html`);
});

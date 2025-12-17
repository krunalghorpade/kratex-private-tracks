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
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
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

// POST (Add) Track
app.post('/api/tracks', (req, res) => {
    const tracks = readData();
    const newTrack = req.body;

    // Assign ID if missing
    if (!newTrack.id) {
        const maxId = tracks.length > 0 ? Math.max(...tracks.map(t => t.id)) : 0;
        newTrack.id = maxId + 1;
    }

    tracks.push(newTrack);
    writeData(tracks);
    res.json({ success: true, track: newTrack });
});

// PUT (Update) Track
app.put('/api/tracks/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const updatedTrack = req.body;
    let tracks = readData();

    const index = tracks.findIndex(t => t.id === id);
    if (index !== -1) {
        tracks[index] = { ...tracks[index], ...updatedTrack, id: id };
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
    const initialLength = tracks.length;

    tracks = tracks.filter(t => t.id !== id);

    if (tracks.length < initialLength) {
        writeData(tracks);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Track not found" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Admin Dashboard: http://localhost:${PORT}/admin.html`);
});

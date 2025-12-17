const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// --- DATA SOURCE CONFIG ---
const DATA_FILE = path.join(__dirname, 'tracks.json');
let dbPool = null;

// MySQL Setup
if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME) {
    const mysql = require('mysql2/promise');
    dbPool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD || process.env.DB_PASS,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
    console.log("Attempting to connect to MySQL...");
    initDB();
} else {
    console.log("No DB credentials (DB_HOST/DB_NAME) found in .env. Using local JSON fallback.");
}

// Initialize Database Table
async function initDB() {
    if (!dbPool) return;
    try {
        const connection = await dbPool.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS tracks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                genre VARCHAR(255),
                image TEXT,
                audio TEXT,
                bandcamp VARCHAR(255),
                upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                views INT DEFAULT 0,
                downloads INT DEFAULT 0,
                wav_clicks INT DEFAULT 0
            )
        `);
        connection.release();
        console.log("MySQL: 'tracks' table verified/created.");
    } catch (err) {
        console.error("MySQL Initialization Error:", err.message);
        console.log("Switching to JSON fallback.");
        dbPool = null;
    }
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
        let filenameBase = 'upload-' + Date.now();
        if (req.body && req.body.title) {
            filenameBase = req.body.title.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
        }
        const ext = path.extname(file.originalname);
        const unique = Date.now().toString().slice(-4);
        cb(null, `${filenameBase}_${unique}${ext}`);
    }
});
const upload = multer({ storage: storage });

// --- HELPERS ---

// JSON Fallback Helpers
function readData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 4));
}

// DB Row -> App Model (Normalize keys & stats structure)
function rowToTrack(row) {
    return {
        id: row.id,
        title: row.title,
        genre: row.genre,
        image: row.image,
        audio: row.audio,
        bandcamp: row.bandcamp,
        uploadDate: row.upload_date,
        stats: {
            views: row.views || 0,
            downloads: row.downloads || 0,
            wavClicks: row.wav_clicks || 0
        }
    };
}

// --- API ROUTES ---

// GET Meta
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
        result.imagePath = req.files['image'][0].path.replace(/\\/g, '/').replace(/^public\//, ''); // simple fix if needed
    }
    if (req.files && req.files['audio']) {
        result.audioPath = req.files['audio'][0].path.replace(/\\/g, '/').replace(/^public\//, '');
    }
    res.json(result);
});

// GET Tracks
app.get('/api/tracks', async (req, res) => {
    if (dbPool) {
        try {
            const [rows] = await dbPool.query('SELECT * FROM tracks ORDER BY upload_date DESC');
            const tracks = rows.map(rowToTrack);
            return res.json(tracks);
        } catch (err) {
            console.error(err);
        }
    }
    // JSON Fallback
    res.json(readData());
});

// POST (Add) Track
app.post('/api/tracks', async (req, res) => {
    const newTrack = req.body;
    newTrack.uploadDate = new Date().toISOString();
    newTrack.stats = { views: 0, downloads: 0, wavClicks: 0 };

    if (dbPool) {
        try {
            const [result] = await dbPool.query(
                `INSERT INTO tracks (title, genre, image, audio, bandcamp, upload_date, views, downloads, wav_clicks) 
                 VALUES (?, ?, ?, ?, ?, NOW(), 0, 0, 0)`,
                [newTrack.title, newTrack.genre, newTrack.image, newTrack.audio, newTrack.bandcamp]
            );
            newTrack.id = result.insertId;
            return res.json({ success: true, track: newTrack });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Database Error" });
        }
    }

    // JSON Fallback
    const tracks = readData();
    if (!newTrack.id) {
        const maxId = tracks.length > 0 ? Math.max(...tracks.map(t => t.id)) : 0;
        newTrack.id = maxId + 1;
    }
    tracks.push(newTrack);
    writeData(tracks);
    res.json({ success: true, track: newTrack });
});

// PUT (Update) Track
app.put('/api/tracks/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const updated = req.body;

    if (dbPool) {
        try {
            await dbPool.query(
                `UPDATE tracks SET title=?, genre=?, image=?, audio=?, bandcamp=? WHERE id=?`,
                [updated.title, updated.genre, updated.image, updated.audio, updated.bandcamp, id]
            );
            // Fetch updated
            const [rows] = await dbPool.query('SELECT * FROM tracks WHERE id=?', [id]);
            if (rows.length > 0) return res.json({ success: true, track: rowToTrack(rows[0]) });
            return res.status(404).json({ error: "Track not found" });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Database update failed" });
        }
    }

    // JSON Fallback
    const tracks = readData();
    const index = tracks.findIndex(t => t.id === id);
    if (index !== -1) {
        const existing = tracks[index];
        updated.uploadDate = existing.uploadDate || new Date().toISOString();
        updated.stats = existing.stats || { views: 0, downloads: 0, wavClicks: 0 };
        tracks[index] = { ...existing, ...updated, id: id };
        writeData(tracks);
        res.json({ success: true, track: tracks[index] });
    } else {
        res.status(404).json({ error: "Track not found" });
    }
});

// DELETE Track
app.delete('/api/tracks/:id', async (req, res) => {
    const id = parseInt(req.params.id);

    if (dbPool) {
        try {
            const [result] = await dbPool.query('DELETE FROM tracks WHERE id=?', [id]);
            if (result.affectedRows > 0) return res.json({ success: true });
            return res.status(404).json({ error: "Track not found" });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Database delete failed" });
        }
    }

    // JSON Fallback
    let tracks = readData();
    const newTracks = tracks.filter(t => t.id !== id);
    if (tracks.length !== newTracks.length) {
        writeData(newTracks);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Track not found" });
    }
});

// STATS Update
app.post('/api/stats', async (req, res) => {
    const { id, type } = req.body;

    if (dbPool) {
        try {
            let col = '';
            if (type === 'view') col = 'views';
            else if (type === 'download') col = 'downloads';
            else if (type === 'wav') col = 'wav_clicks';

            if (col) {
                await dbPool.query(`UPDATE tracks SET ${col} = ${col} + 1 WHERE id = ?`, [id]);
                const [rows] = await dbPool.query('SELECT * FROM tracks WHERE id=?', [id]);
                if (rows.length) {
                    return res.json({ success: true, stats: rowToTrack(rows[0]).stats });
                }
            }
            return res.json({ success: true });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Stats Update Failed" });
        }
    }

    // JSON Fallback
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

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Admin Dashboard: http://localhost:${PORT}/admin.html`);
});

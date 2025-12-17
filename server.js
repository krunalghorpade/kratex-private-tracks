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
        host: (process.env.DB_HOST === 'localhost' ? '127.0.0.1' : process.env.DB_HOST),
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
// Initialize Database Tables and SEED Data
async function initDB() {
    if (!dbPool) return;
    try {
        const connection = await dbPool.getConnection();

        // 1. Tracks
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
                wav_clicks INT DEFAULT 0,
                plays INT DEFAULT 0
            )
        `);
        // Add plays column if missing
        try { await connection.query("ALTER TABLE tracks ADD COLUMN plays INT DEFAULT 0"); } catch (e) { }

        // 2. M-House Tracks
        await connection.query(`
            CREATE TABLE IF NOT EXISTS mhouse_tracks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                genre VARCHAR(255),
                image TEXT,
                audio TEXT,
                bandcamp VARCHAR(255),
                upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                views INT DEFAULT 0,
                downloads INT DEFAULT 0,
                wav_clicks INT DEFAULT 0,
                plays INT DEFAULT 0
            )
        `);

        // 3. Banners
        await connection.query(`
            CREATE TABLE IF NOT EXISTS banners (
                id INT AUTO_INCREMENT PRIMARY KEY,
                image_path TEXT NOT NULL,
                link_url TEXT,
                display_order INT DEFAULT 0
            )
        `);

        // 4. YouTube Tracks
        await connection.query(`
            CREATE TABLE IF NOT EXISTS youtube_tracks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                video_id VARCHAR(50) NOT NULL,
                title VARCHAR(255),
                display_order INT DEFAULT 0
            )
        `);

        // 5. Settings
        await connection.query(`
            CREATE TABLE IF NOT EXISTS settings (
                key_name VARCHAR(50) PRIMARY KEY,
                key_value TEXT
            )
        `);
        // Seed Settings
        await connection.query("INSERT IGNORE INTO settings (key_name, key_value) VALUES ('master_password', 'fc613b4dfd6736a7bd268c8a0e74ed0d1c04a959f59dd74ef2874983fd443fc9')");

        // --- SEEDING DEFAULT DATA ---

        // Seed Banners
        const [banners] = await connection.query("SELECT COUNT(*) as count FROM banners");
        if (banners[0].count === 0) {
            console.log("Seeding Banners...");
            await connection.query("INSERT INTO banners (image_path, link_url, display_order) VALUES ?", [[
                ['assets/hero1.png', 'https://shows.kratex.in', 1],
                ['assets/hero2.png', '', 2],
                ['assets/hero3.png', '', 3]
            ]]);
        }

        // Seed YouTube
        const [yt] = await connection.query("SELECT COUNT(*) as count FROM youtube_tracks");
        if (yt[0].count === 0) {
            console.log("Seeding YouTube...");
            await connection.query("INSERT INTO youtube_tracks (title, video_id, display_order) VALUES ?", [[
                ['Kratex - Taambdi Chaamdi', 'dQw4w9WgXcQ', 1],
                ['Kratex - Jevlis Ka', 'u8uZgWd_hS0', 2],
                ['Kratex Live Set', '7T2w658_ZtU', 3]
            ]]);
        }

        // Seed M-House
        const [mh] = await connection.query("SELECT COUNT(*) as count FROM mhouse_tracks");
        if (mh[0].count === 0) {
            console.log("Seeding M-House...");
            await connection.query("INSERT INTO mhouse_tracks (title, genre, image, audio) VALUES ?", [[
                ['M-House Anthem', 'M-House', 'assets/album1.png', ''],
                ['Deep Dive', 'Tech M-House', 'assets/album2.png', ''],
                ['Marathi Groove', 'M-House', 'assets/album3.png', '']
            ]]);
        }

        connection.release();
        console.log("MySQL: All tables verified and seeded.");
    } catch (err) {
        console.error("MySQL Initialization Error:", err.message);
        console.log("Switching to JSON fallback (limited functionality).");
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
// JSON Fallback Helpers
function readJson(filename) {
    try {
        const filePath = path.join(__dirname, filename);
        if (!fs.existsSync(filePath)) return [];
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

function readData() { return readJson('tracks.json'); } // Legacy alias

function writeJson(filename, data) {
    fs.writeFileSync(path.join(__dirname, filename), JSON.stringify(data, null, 4));
}

function writeData(data) { writeJson('tracks.json', data); } // Legacy alias

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
// STATS Update
app.post('/api/stats', async (req, res) => {
    const { id, type } = req.body;

    if (dbPool) {
        try {
            let col = '';
            if (type === 'view') col = 'views';
            else if (type === 'download') col = 'downloads';
            else if (type === 'wav') col = 'wav_clicks';
            else if (type === 'play') col = 'plays';

            if (col) {
                await dbPool.query(`UPDATE tracks SET ${col} = ${col} + 1 WHERE id = ?`, [id]);
                // Also try M-house
                await dbPool.query(`UPDATE mhouse_tracks SET ${col} = ${col} + 1 WHERE id = ?`, [id]);
            }
            return res.json({ success: true });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Stats Update Failed" });
        }
    }
    // JSON Fallback (simplified)
    const tracks = readData();
    const track = tracks.find(t => t.id === parseInt(id));
    if (track) {
        if (!track.stats) track.stats = { views: 0, downloads: 0, wavClicks: 0, plays: 0 };
        if (type === 'view') track.stats.views++;
        if (type === 'download') track.stats.downloads++;
        if (type === 'wav') track.stats.wavClicks++;
        if (type === 'play') track.stats.plays++;
        writeData(tracks);
    }
    res.json({ success: true });
});

// --- NEW API ROUTES (M-House, Banners, Youtube, Settings) ---

// Generic Helper for Simple Tables
// Generic Helper for Simple Tables with JSON Fallback
function createCrudRoutes(tableName, routePath, jsonFile, seedData = []) {
    // GET
    app.get(routePath, async (req, res) => {
        if (!dbPool) {
            // JSON Fallback
            let data = readJson(jsonFile);
            if (data.length === 0 && seedData.length > 0) {
                // Auto-seed JSON if empty
                data = seedData.map((item, idx) => ({ id: idx + 1, ...item }));
                writeJson(jsonFile, data);
            }
            return res.json(data);
        }
        try {
            const [rows] = await dbPool.query(`SELECT * FROM ${tableName} ORDER BY id DESC`);
            res.json(rows);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // POST
    app.post(routePath, async (req, res) => {
        const data = req.body;
        if (!dbPool) {
            // JSON Fallback
            const items = readJson(jsonFile);
            const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
            const newItem = { id: newId, ...data };
            items.push(newItem);
            writeJson(jsonFile, items);
            return res.json({ success: true, id: newId });
        }
        // DB Logic
        const keys = Object.keys(data).filter(k => k !== 'id');
        const vals = keys.map(k => data[k]);
        const placeholders = keys.map(() => '?').join(',');
        try {
            const [result] = await dbPool.query(`INSERT INTO ${tableName} (${keys.join(',')}) VALUES (${placeholders})`, vals);
            res.json({ success: true, id: result.insertId });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // DELETE
    app.delete(`${routePath}/:id`, async (req, res) => {
        const id = parseInt(req.params.id);
        if (!dbPool) {
            // JSON Fallback
            let items = readJson(jsonFile);
            const filtered = items.filter(i => i.id !== id);
            if (items.length !== filtered.length) {
                writeJson(jsonFile, filtered);
                return res.json({ success: true });
            }
            return res.status(404).json({ error: "Not found" });
        }
        try {
            await dbPool.query(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
}

// Data to Seed
const SEED_BANNERS = [
    { image_path: 'assets/hero1.png', link_url: 'https://shows.kratex.in', display_order: 1 },
    { image_path: 'assets/hero2.png', link_url: '', display_order: 2 },
    { image_path: 'assets/hero3.png', link_url: '', display_order: 3 }
];
const SEED_MHOUSE = [
    { title: 'M-House Anthem', genre: 'M-House', image: 'assets/album1.png', audio: '' },
    { title: 'Deep Dive', genre: 'Tech M-House', image: 'assets/album2.png', audio: '' },
    { title: 'Marathi Groove', genre: 'M-House', image: 'assets/album3.png', audio: '' }
];
const SEED_YOUTUBE = [
    { title: 'Kratex - Taambdi Chaamdi', video_id: 'dQw4w9WgXcQ', display_order: 1 },
    { title: 'Kratex - Jevlis Ka', video_id: 'u8uZgWd_hS0', display_order: 2 },
    { title: 'Kratex Live Set', video_id: '7T2w658_ZtU', display_order: 3 }
];

createCrudRoutes('mhouse_tracks', '/api/mhouse', 'mhouse.json', SEED_MHOUSE);
createCrudRoutes('banners', '/api/banners', 'banners.json', SEED_BANNERS);
createCrudRoutes('youtube_tracks', '/api/youtube', 'youtube.json', SEED_YOUTUBE);

// Settings Route
// Settings Route
app.get('/api/settings', async (req, res) => {
    if (!dbPool) {
        // Local Fallback
        return res.json({ master_password: 'fc613b4dfd6736a7bd268c8a0e74ed0d1c04a959f59dd74ef2874983fd443fc9' });
    }
    try {
        const [rows] = await dbPool.query("SELECT * FROM settings");
        const settings = {};
        rows.forEach(r => settings[r.key_name] = r.key_value);
        res.json(settings);
    } catch (e) { res.json({}); }
});

app.post('/api/settings', async (req, res) => {
    const { key_name, key_value } = req.body;
    if (!dbPool) {
        // Local Fallback: We don't persist settings in JSON for now to keep it simple or use settings.json
        // For MVP, just return success
        return res.json({ success: true });
    }
    try {
        await dbPool.query("INSERT INTO settings (key_name, key_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE key_value = ?", [key_name, key_value, key_value]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Admin Dashboard: http://localhost:${PORT}/admin.html`);
});

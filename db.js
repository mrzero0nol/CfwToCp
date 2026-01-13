const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Helper untuk log error ke file
function logError(context, err) {
    const msg = `[${new Date().toISOString()}] ${context}: ${err.message}\n`;
    console.error(msg.trim());
    try {
        fs.appendFileSync(path.join(__dirname, 'stderr.log'), msg);
    } catch (e) {
        console.error("Gagal menulis ke error.log:", e.message);
    }
}

// Buat connection pool agar efisien
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'test',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Fungsi untuk mengambil data (GET) - Meniru perilaku KV Storage
async function dbGet(key, options = {}) {
    try {
        const [rows] = await pool.execute('SELECT value FROM kv_store WHERE key_name = ?', [key]);
        if (rows.length === 0) return null;

        const val = rows[0].value;
        if (options.type === 'json') {
            try {
                return JSON.parse(val);
            } catch (e) {
                return null;
            }
        }
        return val;
    } catch (err) {
        logError(`DB Get Error (${key})`, err);
        return null;
    }
}

// Fungsi untuk menyimpan data (PUT) - Insert atau Update
async function dbPut(key, value) {
    try {
        const valStr = typeof value === 'object' ? JSON.stringify(value) : value;
        // Menggunakan ON DUPLICATE KEY UPDATE agar seperti behaviour KV (overwrite)
        await pool.execute(
            'INSERT INTO kv_store (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
            [key, valStr]
        );
        return true;
    } catch (err) {
        logError(`DB Put Error (${key})`, err);
        return false;
    }
}

// Fungsi untuk menghapus data (DELETE)
async function dbDelete(key) {
    try {
        await pool.execute('DELETE FROM kv_store WHERE key_name = ?', [key]);
        return true;
    } catch (err) {
        logError(`DB Delete Error (${key})`, err);
        return false;
    }
}

// Test koneksi saat start
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('Database connected successfully!');
        connection.release();
    } catch (err) {
        logError('Database Connection Failed', err);
        const tip = 'TIP: Pastikan variabel lingkungan (Environment Variables) DB_HOST, DB_USER, DB_PASS, DB_NAME sudah diatur dengan benar di cPanel atau file .env.\n';
        console.error(tip);
        try { fs.appendFileSync(path.join(__dirname, 'stderr.log'), `[TIP] ${tip}`); } catch(e){}
    }
})();

module.exports = {
    pool,
    dbGet,
    dbPut,
    dbDelete
};

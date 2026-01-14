const { pool } = require('./db');
const fs = require('fs');
const path = require('path');

async function migrate() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'schema_v2.sql'), 'utf8');
        const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

        const connection = await pool.getConnection();
        console.log('Connected to database. Applying migration...');

        for (const statement of statements) {
            await connection.query(statement);
        }

        console.log('Migration completed successfully.');
        connection.release();
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();

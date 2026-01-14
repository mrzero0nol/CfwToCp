const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

function logError(context, err) {
    const msg = `[${new Date().toISOString()}] ${context}: ${err.message}\n`;
    console.error(msg.trim());
    try {
        fs.appendFileSync(path.join(__dirname, 'stderr.log'), msg);
    } catch (e) {}
}

const isMock = process.env.MOCK_DB === 'true';

let pool;

if (isMock) {
    console.log("!!! RUNNING IN MOCK DB MODE !!!");

    // Initial Mock Data
    const mockData = {
        products: [{ code: 'test1', name: 'Mock Product', price: 50000, category: 'App', description: 'Mock Desc', image_url: '' }],
        // 10 items for test1
        product_stocks: Array(10).fill(0).map((_, i) => ({ id: i+1, product_code: 'test1', account_data: `acc${i+1}`, is_sold: 0 })),
        vouchers: [{ code: 'DISKON50', amount: 5000, valid_for: 'ALL', usage_limit: 0, usage_count: 0 }],
        orders: [],
        users: []
    };

    pool = {
        execute: async (sql, params) => {
            console.log(`[MOCK EXEC] ${sql} | Params: ${JSON.stringify(params)}`);

            // --- SELECT Handlers ---
            if (sql.includes('SELECT conf_value FROM app_config')) return [[]];

            if (sql.includes('SELECT p.*')) {
                // List products
                // Join stock count manually for mock
                const products = mockData.products.map(p => {
                    const cnt = mockData.product_stocks.filter(s => s.product_code === p.code && s.is_sold === 0).length;
                    return { ...p, stock_count: cnt };
                });
                return [products];
            }

            if (sql.includes('SELECT * FROM products WHERE code = ?')) {
                 const p = mockData.products.find(x => x.code === params[0]);
                 return p ? [[p]] : [[]];
            }

            if (sql.includes('SELECT * FROM vouchers WHERE code = ?')) {
                const v = mockData.vouchers.find(x => x.code === params[0]);
                return v ? [[v]] : [[]];
            }

            if (sql.includes('SELECT COUNT(*) as cnt')) {
                 const code = params[0];
                 const count = mockData.product_stocks.filter(s => s.product_code === code && s.is_sold === 0).length;
                 return [[{ cnt: count }]];
            }

            if (sql.includes('SELECT id, account_data FROM product_stocks')) {
                const code = params[0];
                const limit = params[1];
                const stocks = mockData.product_stocks
                    .filter(s => s.product_code === code && s.is_sold === 0)
                    .slice(0, limit);
                return [stocks];
            }

            if (sql.includes('SELECT * FROM orders WHERE order_id = ?')) {
                 const o = mockData.orders.find(x => x.order_id === params[0]);
                 return o ? [[o]] : [[]];
            }

            // --- INSERT/UPDATE Handlers ---
            if (sql.startsWith('UPDATE product_stocks')) {
                return [{ affectedRows: 1 }];
            }

            if (sql.startsWith('INSERT INTO orders')) {
                // params: order_id, product_code, quantity, total_amount, voucher_code, status, (payment_url)
                // We just store minimal info for check-status to work
                mockData.orders.push({
                    order_id: params[0],
                    product_code: params[1],
                    quantity: params[2],
                    total_amount: params[3],
                    status: params[5] || 'PENDING'
                });
                return [{ insertId: 1 }];
            }

            if (sql.startsWith('INSERT INTO users')) {
                mockData.users.push({ id: 1, username: params[0], password: params[1] });
                return [{ insertId: 1 }];
            }

            if (sql.includes('SELECT id, username FROM users')) {
                const u = mockData.users.find(x => x.username === params[0] && x.password === params[1]);
                return u ? [[u]] : [[]];
            }

            if (sql.startsWith('INSERT INTO products')) {
                mockData.products.push({
                    code: params[0],
                    name: params[1],
                    price: params[2],
                    category: params[3],
                    description: params[4],
                    image_url: params[5]
                });
                return [{ insertId: 1 }];
            }

            if (sql.startsWith('UPDATE vouchers')) {
                return [{ affectedRows: 1 }];
            }

            if (sql.startsWith('UPDATE orders')) {
                // Update status
                 if (params[0] === 'CLAIMED' && params[1]) {
                     const o = mockData.orders.find(x => x.order_id === params[1]);
                     if(o) o.status = 'CLAIMED';
                 }
                 return [{ affectedRows: 1 }];
            }

            // KV Store Mock
            if (sql.includes('FROM kv_store')) return [[]];

            return [[]];
        },
        getConnection: async () => {
            return {
                execute: async (sql, params) => pool.execute(sql, params),
                release: () => {},
                beginTransaction: async () => console.log("[MOCK] Begin Trx"),
                commit: async () => console.log("[MOCK] Commit"),
                rollback: async () => console.log("[MOCK] Rollback")
            };
        }
    };
} else {
    pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'test',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
}

async function dbGet(key, options = {}) {
    try {
        const [rows] = await pool.execute('SELECT value FROM kv_store WHERE key_name = ?', [key]);
        if (rows.length === 0) return null;
        const val = rows[0].value;
        if (options.type === 'json') {
            try { return JSON.parse(val); } catch (e) { return null; }
        }
        return val;
    } catch (err) {
        logError(`DB Get Error (${key})`, err);
        return null;
    }
}

async function dbPut(key, value) {
    try {
        const valStr = typeof value === 'object' ? JSON.stringify(value) : value;
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

async function dbDelete(key) {
    try {
        await pool.execute('DELETE FROM kv_store WHERE key_name = ?', [key]);
        return true;
    } catch (err) {
        logError(`DB Delete Error (${key})`, err);
        return false;
    }
}

if (!isMock) {
    (async () => {
        try {
            const connection = await pool.getConnection();
            console.log('Database connected successfully!');
            connection.release();
        } catch (err) {
            console.error('!!! DATABASE CONNECTION ERROR !!!');
            console.error(err);
            logError('Database Connection Failed', err);
        }
    })();
}

module.exports = { pool, dbGet, dbPut, dbDelete };

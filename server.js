const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pool, dbGet, dbPut, dbDelete } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- KONFIGURASI AWAL ---
const DEFAULT_CONFIG = {
    storeName: "Digital Premium",
    contact: "https://t.me/Mr_Redbunny",
    favicon: "https://i.postimg.cc/4y0CHYHF/dp.jpg",
    ogImage: "https://i.postimg.cc/4y0CHYHF/dp.jpg",
    ogTitle: "Digital Premium Store",
    ogDesc: "Pusat Produk Digital Termurah & Terpercaya",
    banners: [
        "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80",
        "https://images.unsplash.com/photo-1557821552-17105176677c?w=800&q=80"
    ],
    cats: ["Semua", "Streaming", "App", "Game"]
};

// --- ICONS (SVG) ---
const ICONS = {
    chat: `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`,
    cart: `<svg viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>`,
    history: `<svg viewBox="0 0 24 24"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>`,
    wallet: `<svg viewBox="0 0 24 24"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`,
    user: `<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`,
    search: `<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`,
    filter: `<svg viewBox="0 0 24 24"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>`,
    close: `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
    check: `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
    back: `<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>`,
    edit: `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`,
    next: `<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`,
    help: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>`,
    trash: `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`,
    logout: `<svg viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>`,
    copy: `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`,
    bag: `<svg viewBox="0 0 24 24"><path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2H10c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z"/></svg>`,
    settings: `<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`,
    eye: `<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`,
    camera: `<svg viewBox="0 0 24 24"><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>`,
    chart: `<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>`,
    chevronDown: `<svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>`,
    ticket: `<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v4c1.1 0 2 .9 2 2s-.9 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2V6c0-1.1-.9-2-2-2zm0 14H4v-1.5c1.93 0 3.5-1.57 3.5-3.5S5.93 9.5 4 9.5V6h16v1.5c-1.93 0-3.5 1.57-3.5 3.5s1.57 3.5 3.5 3.5V18z"/></svg>`,
    plus: `<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`,
    box: `<svg viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 4h4v2h-4V4zm10 16H4V8h16v12z"/></svg>`,
    arrowLeft: `<svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>`,
    arrowRight: `<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`,
    lock: `<svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3 3.1-3 1.71 0 3.1 1.29 3.1 3v2z"/></svg>`,
    arrowUp: `<svg viewBox="0 0 24 24"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>`,
    arrowDown: `<svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>`,
    share: `<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`,
};

// --- HELPER FUNCTIONS ---
async function getConfig() {
    let conf = { ...DEFAULT_CONFIG };
    try {
        const [rows] = await pool.execute("SELECT conf_value FROM app_config WHERE conf_key = 'CONFIG_STORE'");
        if (rows.length > 0) {
            const dbConf = JSON.parse(rows[0].conf_value);
            conf = { ...conf, ...dbConf };
        }
    } catch (e) {}
    return conf;
}

// Unified View Renderer
async function renderView(viewName, req, res, extraVars = {}) {
    try {
        const conf = await getConfig();
        const viewsDir = path.join(__dirname, 'views');

        // 1. Read Main View
        let html = fs.readFileSync(path.join(viewsDir, viewName), 'utf8');

        // 2. Read Partials
        const head = fs.readFileSync(path.join(viewsDir, 'partials', 'head.html'), 'utf8');
        const nav = fs.readFileSync(path.join(viewsDir, 'partials', 'nav_bottom.html'), 'utf8');
        const headerSimple = fs.readFileSync(path.join(viewsDir, 'partials', 'header_simple.html'), 'utf8');

        // 3. Inject Partials
        html = html.replace('{{PARTIAL_HEAD}}', head)
                   .replace('{{PARTIAL_NAV_BOTTOM}}', nav)
                   .replace('{{PARTIAL_HEADER_SIMPLE}}', headerSimple);

        // 4. Prepare Variables
        const vars = {
            STORE_NAME: conf.storeName || DEFAULT_CONFIG.storeName,
            STORE_FAVICON: conf.favicon || DEFAULT_CONFIG.favicon,
            CONTACT_URL: conf.contact || DEFAULT_CONFIG.contact,
            OG_TITLE: conf.ogTitle || DEFAULT_CONFIG.ogTitle,
            OG_DESC: conf.ogDesc || DEFAULT_CONFIG.ogDesc,
            OG_IMAGE: conf.ogImage || DEFAULT_CONFIG.ogImage,
            PAGE_TITLE: conf.storeName || DEFAULT_CONFIG.storeName,
            ICONS_JSON: JSON.stringify(ICONS),
            BANNERS_JSON: JSON.stringify(conf.banners || DEFAULT_CONFIG.banners),
            CATEGORIES_JSON: JSON.stringify(conf.cats || DEFAULT_CONFIG.cats),

            // Default Nav Active States
            NAV_ACTIVE_HOME: viewName === 'home.html' ? 'active' : '',
            NAV_ACTIVE_CART: viewName === 'cart.html' ? 'active' : '',
            NAV_ACTIVE_HISTORY: viewName === 'history.html' ? 'active' : '',
            NAV_ACTIVE_PROFILE: viewName === 'profile.html' ? 'active' : '',
            NAV_ACTIVE_ASSETS: viewName === 'assets.html' ? 'active' : '',

            // Header Simple Vars
            BACK_URL: 'javascript:history.back()',
            PAGE_HEADER_TITLE: 'Menu',

            ...extraVars // Override/Extend
        };

        // Page Titles
        if(viewName === 'cart.html') vars.PAGE_HEADER_TITLE = 'Keranjang';
        if(viewName === 'history.html') vars.PAGE_HEADER_TITLE = 'Riwayat Transaksi';
        if(viewName === 'profile.html') vars.PAGE_HEADER_TITLE = 'Profil Saya';
        if(viewName === 'assets.html') vars.PAGE_HEADER_TITLE = 'Aset Digital';
        if(viewName === 'product.html') {
             vars.PAGE_HEADER_TITLE = 'Detail Produk';
             vars.PAGE_TITLE = vars.PROD_NAME || 'Produk';
        }

        // 5. Replace Variables
        Object.keys(vars).forEach(k => {
            const regex = new RegExp(`{{${k}}}`, 'g');
            html = html.replace(regex, vars[k] || '');
        });

        // 6. Replace Icons
        Object.keys(ICONS).forEach(key => {
             const regex = new RegExp(`{{ICON_${key.toUpperCase()}}}`, 'g');
             html = html.replace(regex, ICONS[key]);
        });

        res.send(html);
    } catch (e) {
        console.error("Render Error:", e);
        res.status(500).send("Internal Server Error");
    }
}

async function recordSale(name, price, content) {
    try {
        let sales = await dbGet("ADMIN_SALES", { type: "json" }) || [];
        sales.unshift({ date: new Date().toISOString(), name, price, content });
        if (sales.length > 10000) sales = sales.slice(0, 10000);
        await dbPut("ADMIN_SALES", JSON.stringify(sales));
    } catch(e) {}
}

async function createPakasirTrx(amount, orderId) {
    if (process.env.MOCK_DB === 'true') {
        return { success: true, data: { payment: { payment_number: 'QR_MOCK_' + orderId } } };
    }
    try {
        const body = {
            project: process.env.PAKASIR_SLUG,
            order_id: orderId,
            amount: amount,
            api_key: process.env.PAKASIR_API_KEY
        };
        const response = await fetch('https://app.pakasir.com/api/transactioncreate/qris', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        return { success: true, data: data };
    } catch (e) {
        console.error("Pakasir Create Error:", e);
        return { success: false };
    }
}

async function checkPakasirStatus(oid, amount) {
    if (process.env.MOCK_DB === 'true') {
        return { success: true, data: { transaction: { status: 'completed' } } };
    }
    try {
        const url = `https://app.pakasir.com/api/transactiondetail?project=${process.env.PAKASIR_SLUG}&amount=${amount}&order_id=${oid}&api_key=${process.env.PAKASIR_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        return { success: true, data: data };
    } catch (e) {
        console.error("Pakasir Status Error:", e);
        return { success: false };
    }
}

// --- ROUTES ---

// 1. Serving HTML Pages (MPA)
app.get('/', (req, res) => renderView('home.html', req, res));
app.get('/cart', (req, res) => renderView('cart.html', req, res));
app.get('/history', (req, res) => renderView('history.html', req, res));
app.get('/profile', (req, res) => renderView('profile.html', req, res));
app.get('/assets', (req, res) => renderView('assets.html', req, res));
app.get('/p/:code', async (req, res) => {
    // Pre-fetch product for Meta Tags
    const code = req.params.code;
    let extraVars = {};
    try {
        const [rows] = await pool.execute("SELECT * FROM products WHERE code = ?", [code]);
        if (rows.length > 0) {
            const p = rows[0];
            extraVars = {
                PROD_CODE: p.code,
                PROD_NAME: p.name,
                PROD_PRICE: Number(p.price) === 0 ? 'GRATIS' : 'Rp ' + Number(p.price).toLocaleString(),
                PROD_DESC: p.description || '',
                PROD_IMG: p.image_url || '{{STORE_FAVICON}}',
                PROD_STOCK: 'Ready', // Simple check
                OG_TITLE: p.name,
                OG_DESC: p.description,
                OG_IMAGE: p.image_url
            };
            // Get accurate stock
            const [s] = await pool.execute("SELECT COUNT(*) as cnt FROM product_stocks WHERE product_code = ? AND is_sold = 0", [code]);
            extraVars.PROD_STOCK = s[0].cnt;
        }
    } catch(e) {}

    renderView('product.html', req, res, extraVars);
});

// Add New Routes
app.get('/contact', async (req, res) => {
    const conf = await getConfig();
    res.redirect(conf.contact || DEFAULT_CONFIG.contact);
});

app.get('/admin', (req, res) => renderView('admin.html', req, res));

// Catch-All Route (Must be last) - For 404 or redirect to Home
app.get('*', (req, res) => {
    if (req.accepts('html')) {
        res.redirect('/');
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

// 2. API Config
app.get('/api/config', async (req, res) => {
    const conf = await getConfig();
    res.json(conf);
});

// 3. API Products
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT p.*,
            (SELECT COUNT(*) FROM product_stocks s WHERE s.product_code = p.code AND s.is_sold = 0) as stock_count
            FROM products p
        `);
        const products = rows.map(r => ({
            code: r.code,
            name: r.name,
            price: Number(r.price),
            stock: Number(r.stock_count),
            img: r.image_url,
            category: r.category || '',
            desc: r.description || ''
        }));
        res.json({ products });
    } catch (e) {
        res.status(500).json({ products: [] });
    }
});

// 4. API Check Voucher
app.post('/api/check-voucher', async (req, res) => {
    const { code, productCode } = req.body;
    try {
        const [rows] = await pool.execute("SELECT * FROM vouchers WHERE code = ?", [code]);
        if (rows.length === 0) return res.json({ valid: false, message: "Tidak valid" });

        const v = rows[0];
        if (v.usage_limit > 0 && v.usage_count >= v.usage_limit) return res.json({ valid: false, message: "Habis" });
        if (v.valid_for !== 'ALL' && v.valid_for !== productCode) return res.json({ valid: false, message: "Tidak berlaku produk ini" });

        res.json({ valid: true, amount: Number(v.amount) });
    } catch (e) {
        res.json({ valid: false, message: "Error" });
    }
});

// 5. API Buy
app.post('/api/buy', async (req, res) => {
    const { code, qty, voucherCode } = req.body;
    const reqQty = parseInt(qty);
    if (isNaN(reqQty) || reqQty < 1) return res.json({ success: false, message: "Jumlah tidak valid" });

    try {
        const [prodRows] = await pool.execute("SELECT * FROM products WHERE code = ?", [code]);
        if (prodRows.length === 0) return res.json({ success: false, message: "Produk tidak ditemukan" });
        const prod = prodRows[0];

        const [stockRows] = await pool.execute("SELECT COUNT(*) as cnt FROM product_stocks WHERE product_code = ? AND is_sold = 0", [code]);
        const stockCount = stockRows[0].cnt;

        if (stockCount < reqQty) return res.json({ success: false, message: "Stok kurang" });

        let amount = Number(prod.price) * reqQty;
        if (voucherCode) {
            const [vRows] = await pool.execute("SELECT * FROM vouchers WHERE code = ?", [voucherCode]);
            if (vRows.length > 0) {
                const v = vRows[0];
                if (v.valid_for === 'ALL' || v.valid_for === code) {
                    if (!v.usage_limit || v.usage_count < v.usage_limit) {
                         amount = Math.max(0, amount - Number(v.amount));
                    }
                }
            }
        }

        if (amount === 0) {
            const orderId = `FREE-${Date.now()}`;
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();

                const [stocks] = await connection.execute("SELECT id, account_data FROM product_stocks WHERE product_code = ? AND is_sold = 0 LIMIT ? FOR UPDATE", [code, reqQty]);
                if (stocks.length < reqQty) {
                    await connection.rollback();
                    return res.json({ success: false, message: "Stok rebutan habis" });
                }

                const ids = stocks.map(s => s.id);
                const accounts = stocks.map(s => s.account_data);

                const placeholders = ids.map(() => '?').join(',');
                await connection.execute(`UPDATE product_stocks SET is_sold = 1, order_id = ? WHERE id IN (${placeholders})`, [orderId, ...ids]);

                await connection.execute("INSERT INTO orders (order_id, product_code, quantity, total_amount, voucher_code, status) VALUES (?, ?, ?, ?, ?, 'CLAIMED')",
                    [orderId, code, reqQty, 0, voucherCode]);

                if (voucherCode) {
                    await connection.execute("UPDATE vouchers SET usage_count = usage_count + 1 WHERE code = ?", [voucherCode]);
                }

                await connection.commit();
                await recordSale(prod.name, 0, accounts);
                return res.json({ success: true, isFree: true, accounts });
            } catch(e) {
                await connection.rollback();
                console.error(e);
                return res.json({ success: false, message: "Transaction Error" });
            } finally {
                connection.release();
            }
        }

        const orderId = `INV${Date.now()}`;
        const pgRes = await createPakasirTrx(amount, orderId);

        if (pgRes.success && pgRes.data.payment) {
            await pool.execute("INSERT INTO orders (order_id, product_code, quantity, total_amount, voucher_code, status, payment_url) VALUES (?, ?, ?, ?, ?, 'PENDING', ?)",
                [orderId, code, reqQty, amount, voucherCode, pgRes.data.payment.payment_number]);

            return res.json({ success: true, isFree: false, amount, qrString: pgRes.data.payment.payment_number, orderId });
        }
        return res.json({ success: false, message: "Gateway Error" });

    } catch(e) {
        console.error(e);
        return res.json({ success: false, message: "System Error" });
    }
});

// 6. API Check Status
app.get('/api/check-status', async (req, res) => {
    const oid = req.query.oid;
    try {
        const [rows] = await pool.execute("SELECT status, total_amount FROM orders WHERE order_id = ?", [oid]);
        if (rows.length === 0) return res.json({ status: 'PENDING' });

        const order = rows[0];
        if (order.status === 'PAID' || order.status === 'CLAIMED') return res.json({ status: 'PAID' });

        const pgRes = await checkPakasirStatus(oid, order.total_amount);
        if (pgRes.success && pgRes.data.transaction && pgRes.data.transaction.status === 'completed') {
            return res.json({ status: 'PAID' });
        }

        res.json({ status: 'PENDING' });
    } catch(e) {
        res.json({ status: 'PENDING' });
    }
});

// 7. API Claim
app.post('/api/claim', async (req, res) => {
    const { oid } = req.body;
    try {
        const [rows] = await pool.execute("SELECT * FROM orders WHERE order_id = ?", [oid]);
        if (rows.length === 0) return res.json({ success: false });
        const order = rows[0];

        if (order.status === 'CLAIMED') return res.json({ success: false });

        const pgRes = await checkPakasirStatus(oid, order.total_amount);
        if (!pgRes.success || !pgRes.data.transaction || pgRes.data.transaction.status !== 'completed') {
            return res.json({ success: false });
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            await connection.execute("UPDATE orders SET status = 'CLAIMED' WHERE order_id = ?", [oid]);

            const [stocks] = await connection.execute("SELECT id, account_data FROM product_stocks WHERE product_code = ? AND is_sold = 0 LIMIT ? FOR UPDATE", [order.product_code, order.quantity]);

            if (stocks.length < order.quantity) {
                 await connection.rollback();
                 return res.json({ success: false, message: "Stok habis saat claim" });
            }

            const ids = stocks.map(s => s.id);
            const accounts = stocks.map(s => s.account_data);

            const placeholders = ids.map(() => '?').join(',');
            await connection.execute(`UPDATE product_stocks SET is_sold = 1, order_id = ? WHERE id IN (${placeholders})`, [oid, ...ids]);

            await connection.commit();
            await recordSale(order.product_code, order.total_amount, accounts);

            return res.json({ success: true, accounts });
        } catch(e) {
            await connection.rollback();
            return res.json({ success: false });
        } finally {
            connection.release();
        }
    } catch(e) {
        return res.json({ success: false });
    }
});

// 8. Auth API
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ success: false, message: "Incomplete" });

    const hash = crypto.createHash('sha256').update(password).digest('hex');
    try {
        await pool.execute("INSERT INTO users (username, password) VALUES (?, ?)", [username, hash]);
        res.json({ success: true });
    } catch(e) {
        console.error("Register Error:", e);
        res.json({ success: false, message: "Username exists" });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const hash = crypto.createHash('sha256').update(password).digest('hex');

    try {
        const [rows] = await pool.execute("SELECT id, username FROM users WHERE username = ? AND password = ?", [username, hash]);
        if (rows.length > 0) {
            res.json({ success: true, user: rows[0] });
        } else {
            res.json({ success: false, message: "Invalid credentials" });
        }
    } catch(e) {
        res.json({ success: false, message: "Error" });
    }
});


// --- ADMIN API ---
const adminMiddleware = (req, res, next) => {
    const key = req.headers['admin-key'];
    if (key !== process.env.ADMIN_PASSWORD) return res.status(401).json({ success: false, message: "Unauthorized" });
    next();
};

app.post('/api/admin/login', (req, res) => {
    res.json({ success: req.body.password === process.env.ADMIN_PASSWORD });
});

app.post('/api/admin/stock-action', adminMiddleware, async (req, res) => {
    const { code, action, data, index } = req.body;
    try {
        if (action === 'add') {
            const newItems = data.split(';').map(i => i.trim()).filter(i => i !== '');
            for (const item of newItems) {
                await pool.execute("INSERT INTO product_stocks (product_code, account_data) VALUES (?, ?)", [code, item]);
            }
        } else if (action === 'delete') {
            const [rows] = await pool.execute("SELECT id FROM product_stocks WHERE product_code = ? AND is_sold = 0 ORDER BY id ASC LIMIT 1 OFFSET ?", [code, parseInt(index)]);
            if (rows.length > 0) {
                await pool.execute("DELETE FROM product_stocks WHERE id = ?", [rows[0].id]);
            }
        }
        const [sRows] = await pool.execute("SELECT account_data FROM product_stocks WHERE product_code = ? AND is_sold = 0", [code]);
        res.json({ success: true, newStock: sRows.map(r => r.account_data) });
    } catch(e) {
        console.error(e);
        res.json({ success: false });
    }
});

app.get('/api/admin/stats', adminMiddleware, async (req, res) => {
    const page = parseInt(req.query.page || "1");
    const limit = 7;
    const offset = (page - 1) * limit;

    try {
        const [totalRows] = await pool.execute("SELECT SUM(total_amount) as t FROM orders WHERE status IN ('PAID', 'CLAIMED')");
        const total = Number(totalRows[0].t || 0);

        const [dailyRows] = await pool.execute("SELECT SUM(total_amount) as t FROM orders WHERE status IN ('PAID', 'CLAIMED') AND DATE(created_at) = CURDATE()");
        const daily = Number(dailyRows[0].t || 0);

        const [monthlyRows] = await pool.execute("SELECT SUM(total_amount) as t FROM orders WHERE status IN ('PAID', 'CLAIMED') AND MONTH(created_at) = MONTH(CURRENT_DATE())");
        const monthly = Number(monthlyRows[0].t || 0);

        const [histRows] = await pool.execute("SELECT * FROM orders WHERE status IN ('PAID', 'CLAIMED') ORDER BY created_at DESC LIMIT " + limit + " OFFSET " + offset);

        const history = histRows.map(r => ({
            name: r.product_code,
            date: r.created_at || new Date().toISOString(),
            price: Number(r.total_amount)
        }));

        res.json({ success: true, daily, monthly, total, history, page });
    } catch(e) {
        console.error(e);
        res.json({ success: false });
    }
});

app.get('/api/admin/get-stock', adminMiddleware, async (req, res) => {
    const code = req.query.code;
    const [rows] = await pool.execute("SELECT account_data FROM product_stocks WHERE product_code = ? AND is_sold = 0", [code]);
    res.json({ stock: rows.map(r => r.account_data) });
});

app.post('/api/admin/add-product', adminMiddleware, async (req, res) => {
    const body = req.body;
    const c = body.code.replace(/\s/g, "").toLowerCase();
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.execute("INSERT INTO products (code, name, price, category, description, image_url) VALUES (?, ?, ?, ?, ?, ?)",
            [c, body.name, body.price, body.category, body.desc, body.img]);

        if (body.stockData) {
            const items = body.stockData.split(";").map(i => i.trim()).filter(i => i !== "");
            for (const item of items) {
                await connection.execute("INSERT INTO product_stocks (product_code, account_data) VALUES (?, ?)", [c, item]);
            }
        }
        await connection.commit();
        res.json({ success: true });
    } catch(e) {
        await connection.rollback();
        res.json({ success: false });
    } finally {
        connection.release();
    }
});

app.post('/api/admin/edit-product', adminMiddleware, async (req, res) => {
    const body = req.body;
    try {
        let sql = "UPDATE products SET ";
        const params = [];
        if (body.price) { sql += "price = ?, "; params.push(body.price); }
        if (body.category) { sql += "category = ?, "; params.push(body.category); }
        if (body.desc) { sql += "description = ?, "; params.push(body.desc); }
        if (body.img) { sql += "image_url = ?, "; params.push(body.img); }

        if (params.length > 0) {
            sql = sql.slice(0, -2) + " WHERE code = ?";
            params.push(body.code);
            await pool.execute(sql, params);
        }

        if (body.stockData) {
             const items = body.stockData.split(";").map(i => i.trim()).filter(i => i !== "");
             for (const item of items) {
                await pool.execute("INSERT INTO product_stocks (product_code, account_data) VALUES (?, ?)", [body.code, item]);
             }
        }
        res.json({ success: true });
    } catch(e) {
        res.json({ success: false });
    }
});

app.post('/api/admin/delete-product', adminMiddleware, async (req, res) => {
    const body = req.body;
    try {
        await pool.execute("DELETE FROM product_stocks WHERE product_code = ?", [body.code]);
        await pool.execute("DELETE FROM products WHERE code = ?", [body.code]);
        res.json({ success: true });
    } catch(e) {
        res.json({ success: false });
    }
});

app.post('/api/admin/save-voucher', adminMiddleware, async (req, res) => {
    const { code, amount, validFor, limit } = req.body;
    try {
        await pool.execute("INSERT INTO vouchers (code, amount, valid_for, usage_limit) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE amount=VALUES(amount), valid_for=VALUES(valid_for), usage_limit=VALUES(usage_limit)",
            [code, amount, validFor, limit]);
        res.json({ success: true });
    } catch(e) {
        res.json({ success: false });
    }
});

app.get('/api/admin/vouchers', adminMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM vouchers");
        const vouchers = rows.map(v => ({
            code: v.code,
            amount: Number(v.amount),
            validFor: v.valid_for,
            limit: v.usage_limit,
            used: v.usage_count
        }));
        res.json({ vouchers });
    } catch(e) {
        res.json({ vouchers: [] });
    }
});

app.post('/api/admin/del-voucher', adminMiddleware, async (req, res) => {
    try {
        await pool.execute("DELETE FROM vouchers WHERE code = ?", [req.body.code]);
        res.json({ success: true });
    } catch(e) {
        res.json({ success: false });
    }
});

app.post('/api/admin/save-config', adminMiddleware, async (req, res) => {
    const key = "CONFIG_STORE";
    const val = JSON.stringify(req.body);
    try {
        await pool.execute("INSERT INTO app_config (conf_key, conf_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE conf_value=VALUES(conf_value)", [key, val]);
        res.json({ success: true });
    } catch(e) {
        res.json({ success: false });
    }
});

// START SERVER
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

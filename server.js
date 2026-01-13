const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { dbGet, dbPut, dbDelete } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

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
    box: `<svg viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 4h4v2h-4V4zm10 16H4V8h16v12z"/></svg>`,
    arrowLeft: `<svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>`,
    arrowRight: `<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`,
    lock: `<svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3 3.1-3 1.71 0 3.1 1.29 3.1 3v2z"/></svg>`,
    arrowUp: `<svg viewBox="0 0 24 24"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>`,
    arrowDown: `<svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>`,
    share: `<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`,
};

// --- HELPER FUNCTIONS ---
// Melakukan replace placeholder di template.html dengan nilai dinamis
async function serveHtml(req, res) {
    const confRaw = await dbGet("CONFIG_STORE", { type: "json" }) || {};
    // Merge dengan default agar tidak error jika null
    const conf = { ...DEFAULT_CONFIG, ...confRaw };

    // Logic untuk OG Meta khusus halaman produk
    let title = conf.ogTitle || DEFAULT_CONFIG.ogTitle;
    let desc = conf.ogDesc || DEFAULT_CONFIG.ogDesc;
    let image = conf.ogImage || DEFAULT_CONFIG.ogImage;

    // Deteksi jika ini halaman produk (/p/KODE)
    // Express path params biasanya di req.params, tapi kita handle manual url
    // karena route kita tangkap di app.get('*', ...) atau spesifik
    if (req.params.code) {
        const code = req.params.code;
        const prod = await dbGet(`PROD_${code}`, { type: "json" });
        const img = await dbGet(`IMG_${code}`);
        if (prod) {
            title = `${prod.name} - ${conf.storeName || DEFAULT_CONFIG.storeName}`;
            desc = prod.desc || `Beli ${prod.name} murah di sini!`;
            if (img) image = img;
        }
    }

    fs.readFile(path.join(__dirname, 'template.html'), 'utf8', (err, data) => {
        if (err) return res.status(500).send('Error loading template');

        let html = data
            .replace(/{{STORE_FAVICON}}/g, conf.favicon || DEFAULT_CONFIG.favicon)
            .replace(/{{OG_IMAGE}}/g, image)
            .replace(/{{OG_TITLE}}/g, title)
            .replace(/{{OG_DESC}}/g, desc)
            .replace(/{{STORE_NAME}}/g, conf.storeName || DEFAULT_CONFIG.storeName)
            .replace(/{{CONTACT_URL}}/g, conf.contact || DEFAULT_CONFIG.contact)

            // Inject Variables
            .replace('{{ICONS_JSON}}', JSON.stringify(ICONS))
            .replace('{{BANNERS_JSON}}', JSON.stringify(conf.banners || DEFAULT_CONFIG.banners))
            .replace('{{CATEGORIES_JSON}}', JSON.stringify(conf.cats || DEFAULT_CONFIG.cats))

            // Replace ICONS (manual karena kita tidak pakai template engine kompleks)
            .replace(/{{ICON_SEARCH}}/g, ICONS.search)
            .replace(/{{ICON_FILTER}}/g, ICONS.filter)
            .replace(/{{ICON_SETTINGS}}/g, ICONS.settings)
            .replace(/{{ICON_CHAT}}/g, ICONS.chat)
            .replace(/{{ICON_HISTORY}}/g, ICONS.history)
            .replace(/{{ICON_WALLET}}/g, ICONS.wallet)
            .replace(/{{ICON_CART}}/g, ICONS.cart)
            .replace(/{{ICON_BAG}}/g, ICONS.bag)
            .replace(/{{ICON_USER}}/g, ICONS.user)
            .replace(/{{ICON_BACK}}/g, ICONS.back)
            .replace(/{{ICON_SHARE}}/g, ICONS.share)
            .replace(/{{ICON_CLOSE}}/g, ICONS.close)
            .replace(/{{ICON_BOX}}/g, ICONS.box)
            .replace(/{{ICON_TICKET}}/g, ICONS.ticket)
            .replace(/{{ICON_CHART}}/g, ICONS.chart)
            .replace(/{{ICON_LOGOUT}}/g, ICONS.logout)
            .replace(/{{ICON_CHEVRONDOWN}}/g, ICONS.chevronDown)
            .replace(/{{ICON_EYE}}/g, ICONS.eye)
            .replace(/{{ICON_ARROWLEFT}}/g, ICONS.arrowLeft)
            .replace(/{{ICON_ARROWRIGHT}}/g, ICONS.arrowRight)
            .replace(/{{ICON_TRASH}}/g, ICONS.trash)
            .replace(/{{ICON_EDIT}}/g, ICONS.edit)
            .replace(/{{ICON_CHECK}}/g, ICONS.check);

        res.send(html);
    });
}

async function recordSale(name, price, content) {
    let sales = await dbGet("ADMIN_SALES", { type: "json" }) || [];
    sales.unshift({ date: new Date().toISOString(), name, price, content });
    if (sales.length > 10000) sales = sales.slice(0, 10000);
    await dbPut("ADMIN_SALES", JSON.stringify(sales));
}

async function createPakasirTrx(amount, orderId) {
    try {
        const body = {
            project: process.env.PAKASIR_SLUG,
            order_id: orderId,
            amount: amount,
            api_key: process.env.PAKASIR_API_KEY
        };
        // Menggunakan fetch bawaan Node.js (v18+) atau perlu polyfill jika lama
        // Jika Node < 18, disarankan pakai axios/node-fetch. Asumsi Node 18+ (cPanel baru biasanya support)
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

// 1. Serving HTML Utama
app.get('/', (req, res) => serveHtml(req, res));
app.get('/p/:code', (req, res) => serveHtml(req, res));

// 2. API Config
app.get('/api/config', async (req, res) => {
    const conf = await dbGet("CONFIG_STORE", { type: "json" }) || {};
    res.json(Object.assign({}, DEFAULT_CONFIG, conf));
});

// 3. API Products
app.get('/api/products', async (req, res) => {
    let list = await dbGet("LIST_PRODUCTS", { type: "json" }) || [];
    let products = [];
    for (const code of list) {
        const prod = await dbGet(`PROD_${code}`, { type: "json" });
        if (!prod) continue;
        const stock = await dbGet(`STOCK_${code}`, { type: "json" }) || [];
        const img = await dbGet(`IMG_${code}`);
        products.push({
            code: prod.code,
            name: prod.name,
            price: parseInt(prod.price),
            stock: stock.length,
            img: img,
            category: prod.category || '',
            desc: prod.desc || ''
        });
    }
    res.json({ products });
});

// 4. API Check Voucher
app.post('/api/check-voucher', async (req, res) => {
    const { code, productCode } = req.body;
    const voucher = await dbGet(`VOUCHER_${code}`, { type: "json" });
    if (!voucher) return res.json({ valid: false, message: "Tidak valid" });
    if (voucher.limit && voucher.limit > 0 && (voucher.used || 0) >= voucher.limit) return res.json({ valid: false, message: "Habis" });
    if (voucher.validFor !== "ALL" && voucher.validFor !== productCode) return res.json({ valid: false, message: "Tidak berlaku produk ini" });
    res.json({ valid: true, amount: voucher.amount });
});

// 5. API Buy
app.post('/api/buy', async (req, res) => {
    const { code, qty, voucherCode } = req.body;
    const prod = await dbGet(`PROD_${code}`, { type: "json" });
    let stock = await dbGet(`STOCK_${code}`, { type: "json" }) || [];

    const reqQty = parseInt(qty);
    if (isNaN(reqQty) || reqQty < 1) return res.json({ success: false, message: "Jumlah tidak valid" });
    if (!prod || stock.length < reqQty) return res.json({ success: false, message: "Stok kurang" });

    let amount = parseInt(prod.price) * reqQty;
    if (voucherCode) {
        const v = await dbGet(`VOUCHER_${voucherCode}`, { type: "json" });
        if (v && (v.validFor === "ALL" || v.validFor === code) && (!v.limit || v.limit === 0 || (v.used || 0) < v.limit)) {
            amount = Math.max(0, amount - v.amount);
        }
    }

    // Jika GRATIS (Rp 0)
    if (amount === 0) {
        const accounts = [];
        for (let i = 0; i < reqQty; i++) accounts.push(stock.shift());

        await dbPut(`STOCK_${code}`, JSON.stringify(stock));
        if (voucherCode) {
            const v = await dbGet(`VOUCHER_${voucherCode}`, { type: "json" });
            if (v) {
                v.used = (v.used || 0) + 1;
                await dbPut(`VOUCHER_${voucherCode}`, JSON.stringify(v));
            }
        }
        await recordSale(prod.name, 0, accounts);
        return res.json({ success: true, isFree: true, accounts });
    }

    // Jika BAYAR (Pakasir)
    const orderId = `INV${Date.now()}`;
    const pgRes = await createPakasirTrx(amount, orderId);

    if (pgRes.success && pgRes.data.payment) {
        await dbPut(`ORDER_${orderId}`, JSON.stringify({ code, qty: reqQty, status: 'PENDING', voucherCode, amount }));
        // Expire order not automatically handled in SQL like KV TTL, but we can manage it with updated_at column later or CronJob.
        // For now, simple implementation.
        return res.json({ success: true, isFree: false, amount, qrString: pgRes.data.payment.payment_number, orderId: orderId });
    }
    return res.json({ success: false, message: "Gateway Error" });
});

// 6. API Check Status
app.get('/api/check-status', async (req, res) => {
    const oid = req.query.oid;
    const orderRaw = await dbGet(`ORDER_${oid}`);
    if (!orderRaw) return res.json({ status: 'PENDING' });

    const order = JSON.parse(orderRaw);
    const pgRes = await checkPakasirStatus(oid, order.amount);

    // Check if pakasir says completed
    const status = (pgRes.success && pgRes.data.transaction && pgRes.data.transaction.status === 'completed') ? 'PAID' : 'PENDING';
    res.json({ status });
});

// 7. API Claim (Setelah bayar sukses)
app.post('/api/claim', async (req, res) => {
    const { oid } = req.body;
    const orderRaw = await dbGet(`ORDER_${oid}`);
    if (!orderRaw || orderRaw === "CLAIMED") return res.json({ success: false });

    const order = JSON.parse(orderRaw);
    const pgRes = await checkPakasirStatus(oid, order.amount);

    if (!pgRes.success || !pgRes.data.transaction || pgRes.data.transaction.status !== 'completed') {
        return res.json({ success: false });
    }

    // Tandai sudah diklaim agar tidak double
    await dbPut(`ORDER_${oid}`, "CLAIMED");

    const prod = await dbGet(`PROD_${order.code}`, { type: "json" });
    let stock = await dbGet(`STOCK_${order.code}`, { type: "json" }) || [];

    const qtyToClaim = parseInt(order.qty);
    const accs = [];
    for (let i = 0; i < qtyToClaim; i++) if (stock.length > 0) accs.push(stock.shift());

    await dbPut(`STOCK_${order.code}`, JSON.stringify(stock));
    if (order.voucherCode) {
        const v = await dbGet(`VOUCHER_${order.voucherCode}`, { type: "json" });
        if (v) {
            v.used = (v.used || 0) + 1;
            await dbPut(`VOUCHER_${order.voucherCode}`, JSON.stringify(v));
        }
    }
    await recordSale(prod ? prod.name : order.code, order.amount, accs);
    return res.json({ success: true, accounts: accs });
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
    let stock = await dbGet(`STOCK_${code}`, { type: "json" }) || [];
    if (action === 'add') {
        const newItems = data.split(';').map(i => i.trim()).filter(i => i !== '');
        stock.push(...newItems);
    } else if (action === 'delete') {
        if (index >= 0 && index < stock.length) stock.splice(index, 1);
    }
    await dbPut(`STOCK_${code}`, JSON.stringify(stock));
    res.json({ success: true, newStock: stock });
});

app.get('/api/admin/stats', adminMiddleware, async (req, res) => {
    const page = parseInt(req.query.page || "1");
    const limit = 7;
    const sales = await dbGet("ADMIN_SALES", { type: "json" }) || [];

    const now = new Date().toISOString();
    let daily = 0, monthly = 0, total = 0;
    sales.forEach(s => {
        total += (s.price || 0);
        if (s.date.startsWith(now.split('T')[0])) daily += (s.price || 0);
        if (s.date.startsWith(now.slice(0, 7))) monthly += (s.price || 0);
    });

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedHistory = sales.slice(startIndex, endIndex);

    res.json({ success: true, daily, monthly, total, history: paginatedHistory, page });
});

app.get('/api/admin/get-stock', adminMiddleware, async (req, res) => {
    const code = req.query.code;
    const stock = await dbGet(`STOCK_${code}`, { type: "json" }) || [];
    res.json({ stock });
});

app.post('/api/admin/add-product', adminMiddleware, async (req, res) => {
    const body = req.body;
    const c = body.code.replace(/\s/g, "").toLowerCase();
    await dbPut(`PROD_${c}`, JSON.stringify({ code: c, name: body.name, price: body.price, category: body.category, desc: body.desc }));
    if (body.img) await dbPut(`IMG_${c}`, body.img);
    if (body.stockData) await dbPut(`STOCK_${c}`, JSON.stringify(body.stockData.split(";").map(i => i.trim()).filter(i => i !== "")));
    let list = await dbGet("LIST_PRODUCTS", { type: "json" }) || [];
    if (!list.includes(c)) { list.push(c); await dbPut("LIST_PRODUCTS", JSON.stringify(list)); }
    res.json({ success: true });
});

app.post('/api/admin/edit-product', adminMiddleware, async (req, res) => {
    const body = req.body;
    let p = await dbGet(`PROD_${body.code}`, { type: "json" });
    if (!p) return res.json({ success: false });
    if (body.price) p.price = parseInt(body.price);
    if (body.category !== undefined) p.category = body.category;
    if (body.desc !== undefined) p.desc = body.desc;
    await dbPut(`PROD_${body.code}`, JSON.stringify(p));
    if (body.img) await dbPut(`IMG_${body.code}`, body.img);
    if (body.stockData) {
        let s = await dbGet(`STOCK_${body.code}`, { type: "json" }) || [];
        s.push(...body.stockData.split(";").map(i => i.trim()).filter(i => i !== ""));
        await dbPut(`STOCK_${body.code}`, JSON.stringify(s));
    }
    res.json({ success: true });
});

app.post('/api/admin/delete-product', adminMiddleware, async (req, res) => {
    const body = req.body;
    await dbDelete(`PROD_${body.code}`);
    await dbDelete(`STOCK_${body.code}`);
    await dbDelete(`IMG_${body.code}`);
    let list = await dbGet("LIST_PRODUCTS", { type: "json" }) || [];
    await dbPut("LIST_PRODUCTS", JSON.stringify(list.filter(c => c !== body.code)));
    res.json({ success: true });
});

app.post('/api/admin/save-voucher', adminMiddleware, async (req, res) => {
    const body = req.body;
    const { code, amount, validFor, limit } = body;
    const ex = await dbGet(`VOUCHER_${code}`, { type: "json" });
    await dbPut(`VOUCHER_${code}`, JSON.stringify({ code, amount, validFor, limit, used: ex ? ex.used : 0 }));
    let l = await dbGet("LIST_VOUCHERS", { type: "json" }) || [];
    if (!l.includes(code)) { l.push(code); await dbPut("LIST_VOUCHERS", JSON.stringify(l)); }
    res.json({ success: true });
});

app.get('/api/admin/vouchers', adminMiddleware, async (req, res) => {
    let list = await dbGet("LIST_VOUCHERS", { type: "json" }) || [];
    let vouchers = [];
    for (const c of list) { const v = await dbGet(`VOUCHER_${c}`, { type: "json" }); if (v) vouchers.push(v); }
    res.json({ vouchers });
});

app.post('/api/admin/del-voucher', adminMiddleware, async (req, res) => {
    const body = req.body;
    await dbDelete(`VOUCHER_${body.code}`);
    let l = await dbGet("LIST_VOUCHERS", { type: "json" }) || [];
    await dbPut("LIST_VOUCHERS", JSON.stringify(l.filter(c => c !== body.code)));
    res.json({ success: true });
});

app.post('/api/admin/save-config', adminMiddleware, async (req, res) => {
    await dbPut("CONFIG_STORE", JSON.stringify(req.body));
    res.json({ success: true });
});

// START SERVER
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

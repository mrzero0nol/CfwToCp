/*
* ======================================================================================
*   DIGITAL PREMIUM STORE - MAIN JAVASCRIPT
* ======================================================================================
*   Note: Global variables (ICONS, BANNERS, CATEGORIES, etc.) are injected
*   by the server in template.html before this script is loaded.
*/

// --- GLOBAL VARIABLES ---
let allProducts = [],
    currentCode = '',
    currentOrderId = '',
    currentUser = '',
    currentSort = 'newest',
    currentCat = 'Semua',
    appliedVoucher = null;

let activeStockCode = '';
let statsPage = 1;
let bannerInterval;
let cart = [];
let tempRegImg = '';
let captchaVerified = false;

// --- INITIALIZATION ---
async function init() {
    checkSession();
    loadCart();
    checkAdminSession();
    // await loadProducts(); // Don't load everywhere, specific page will call it
    updateCartCount();

    // Handle Back Button (Modal/Sheet Close)
    window.addEventListener('popstate', function(event) {
        if (event.state && event.state.modal) {
            // handled by history back logic if needed
        } else {
            const actives = document.querySelectorAll('.modal.active, .bottom-sheet.active');
            if (actives.length > 0) {
                actives.forEach(el => {
                    if (el.id !== 'authModal') el.classList.remove('active');
                });
            }
        }
    });
}

// ==========================================
//   AUTH SYSTEM (LOGIN/REGISTER)
// ==========================================

function checkSession() {
    const session = localStorage.getItem('user_session');
    if (!session) {
        document.getElementById('authModal').classList.add('active');
    } else {
        const user = JSON.parse(localStorage.getItem('user_db_' + session));
        if (user) {
            currentUser = user.username;
            updateProfileUI(user);
            document.getElementById('authModal').classList.remove('active');
        } else {
            localStorage.removeItem('user_session');
            document.getElementById('authModal').classList.add('active');
        }
    }
}

function switchAuth(type) {
    captchaVerified = false;
    resetCaptchaUI();
    document.querySelectorAll('.auth-tab').forEach(e => e.classList.remove('active'));

    if (type === 'login') {
        document.getElementById('tabLogin').classList.add('active');
        document.getElementById('formLogin').style.display = 'block';
        document.getElementById('formRegister').style.display = 'none';
    } else {
        document.getElementById('tabRegister').classList.add('active');
        document.getElementById('formLogin').style.display = 'none';
        document.getElementById('formRegister').style.display = 'block';
    }
}

function toggleCaptcha(el) {
    const box = el.querySelector('.cf-check-box');
    if (!captchaVerified) {
        el.style.pointerEvents = 'none';
        box.innerHTML = '<div class="loader" style="width:16px;height:16px;border-width:2px;margin:0;"></div>';
        setTimeout(() => {
            captchaVerified = true;
            box.innerHTML = ICONS.check;
            box.classList.add('checked');
            el.style.pointerEvents = 'auto';
        }, 1000);
    }
}

function resetCaptchaUI() {
    document.querySelectorAll('.cf-check-box').forEach(el => {
        el.classList.remove('checked');
        el.innerHTML = '';
    });
    captchaVerified = false;
}

function handleRegImg(input) {
    const f = input.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onloadend = function() {
        const i = new Image();
        i.onload = function() {
            const c = document.createElement('canvas');
            const ctx = c.getContext('2d');
            const s = 100 / i.width;
            c.width = 100;
            c.height = i.height * s;
            ctx.drawImage(i, 0, 0, c.width, c.height);
            tempRegImg = c.toDataURL('image/jpeg', 0.7);

            const label = document.getElementById('regImgLabel');
            label.innerText = "Foto Terpilih ✓";
            label.style.color = "var(--success)";
            label.style.borderColor = "var(--success)";
        };
        i.src = r.result;
    };
    r.readAsDataURL(f);
}

async function registerUser() {
    if (!captchaVerified) return toast("Silakan verifikasi captcha", true);
    const u = document.getElementById('regUser').value.trim();
    const p = document.getElementById('regPass').value.trim();

    if (!u || !p) return toast("Isi Username & Password", true);

    try {
        const r = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });
        const d = await r.json();

        if (d.success) {
            toast("Registrasi Berhasil! Silakan Login.");
            switchAuth('login');
        } else {
            toast(d.message || "Gagal Daftar", true);
        }
    } catch(e) {
        toast("Error Koneksi", true);
    }
}

async function loginUser() {
    if (!captchaVerified) return toast("Silakan verifikasi captcha", true);
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value.trim();

    try {
        const r = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });
        const d = await r.json();

        if (d.success) {
            localStorage.setItem('user_session', d.user.username);
            // Simpan profil lokal agar UI tidak blank
            const userData = { username: d.user.username, image: '' };
            localStorage.setItem('user_db_' + d.user.username, JSON.stringify(userData));

            toast("Login Berhasil");
            currentUser = d.user.username;
            updateProfileUI(userData);
            document.getElementById('authModal').classList.remove('active');
        } else {
            toast(d.message || "Gagal Login", true);
        }
    } catch(e) {
        toast("Error Koneksi", true);
    }
}

function logoutUser() {
    localStorage.removeItem('user_session');
    location.reload();
}

function updateProfileUI(user) {
    document.getElementById('profileName').innerText = user.username;
    const av = document.getElementById('profileAvatar');
    if (user.image) {
        av.innerText = '';
        av.style.backgroundImage = `url('${user.image}')`;
        av.style.backgroundSize = 'cover';
    } else {
        av.style.backgroundImage = 'none';
        av.innerText = user.username.charAt(0).toUpperCase();
    }
}

// ==========================================
//   CORE UI FUNCTIONS
// ==========================================

function checkAdminSession() {
    if (localStorage.getItem('adminKey'))
        document.getElementById('quickAdminBtn').style.display = 'flex';
    else
        document.getElementById('quickAdminBtn').style.display = 'none';
}

async function loadConfig() {
    // Config injected by server (BANNERS, CATEGORIES), just render UI
    renderCategories();
}

function openContact() {
    window.open(CONTACT_URL, '_blank');
}

// --- MODAL & SHEET SYSTEM ---

function openModal(id) {
    // window.history.pushState({ modal: id }, ''); // Optional for simple modals
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function openSheet() {
    window.history.pushState({ sheet: 'sort' }, '');
    document.getElementById('sheetOverlay').classList.add('active');
    document.getElementById('sortSheet').classList.add('active');
}

function closeSheet() {
    document.getElementById('sheetOverlay').classList.remove('active');
    document.getElementById('sortSheet').classList.remove('active');
}

// ==========================================
//   CART SYSTEM
// ==========================================

function loadCart() {
    const c = localStorage.getItem('myCart');
    if (c) cart = JSON.parse(c);
}

function saveCart() {
    localStorage.setItem('myCart', JSON.stringify(cart));
    updateCartCount();
}

function addToCart(code) {
    const p = allProducts.find(x => x.code === code);
    if (!p) return;
    const exist = cart.find(x => x.code === code);
    if (exist) {
        exist.qty++;
    } else {
        cart.push({
            code: code,
            qty: 1,
            price: p.price,
            name: p.name,
            img: p.img,
            selected: false
        });
    }
    saveCart();
    toast("Masuk Keranjang");
}

function updateCartCount() {
    const count = cart.reduce((a, b) => a + b.qty, 0);
    const bad1 = document.getElementById('cartBadgeNav');
    const bad2 = document.getElementById('cartBadgePdp');
    if (count > 0) {
        bad1.style.display = 'block';
        bad1.innerText = count;
        bad2.style.display = 'block';
        bad2.innerText = count;
    } else {
        bad1.style.display = 'none';
        bad2.style.display = 'none';
    }
}

// --- PAGE SPECIFIC LOGIC ---

// --- PRODUCT DETAIL MODAL LOGIC ---

function openPdpModal(code) {
    currentCode = code;
    const p = allProducts.find(x => x.code === code);
    if(!p) return toast("Produk tidak ditemukan", true);

    // Populate Data
    document.getElementById('pdpModalImg').src = p.img || FAVICON_URL;
    document.getElementById('pdpModalPrice').innerText = p.price === 0 ? 'GRATIS' : 'Rp ' + p.price.toLocaleString();
    document.getElementById('pdpModalName').innerText = p.name;
    document.getElementById('pdpModalStock').innerText = p.stock < 1 ? 'Stok: Habis' : 'Stok: ' + p.stock;
    document.getElementById('pdpModalDesc').innerHTML = p.desc || '-';

    // Show Modal
    openModal('productDetailModal');

    // Update Browser URL (Optional, for sharing)
    // window.history.pushState({modal:'pdp'}, '', '/p/'+code);
}

function closePdpModal() {
    closeModal('productDetailModal');
    // window.history.pushState({}, '', '/');
}

// CART PAGE
function openCartPage() {
    const l = document.getElementById('cartList');
    if(!l) return;
    l.innerHTML = '';

    if (cart.length === 0) {
        l.innerHTML = `
            <div style="text-align:center; padding:50px; color:var(--text-muted); display:flex; flex-direction:column; align-items:center; gap:10px;">
                ${ICONS.cart}
                <span>Keranjang kosong</span>
                <a href="/" class="btn-primary" style="width:auto; margin-top:10px;">Belanja Sekarang</a>
            </div>`;
        if(document.getElementById('cartTotal')) document.getElementById('cartTotal').innerText = 'Rp 0';
    } else {
        cart.forEach((item, idx) => {
            const checkClass = item.selected ? 'active' : '';
            l.innerHTML += `
                <div class="cart-item">
                    <div class="cart-check ${checkClass}" onclick="toggleCartSelect(${idx})"></div>
                    <img src="${item.img || FAVICON_URL}" class="cart-thumb">
                    <div class="cart-info">
                        <div class="cart-title">${item.name}</div>
                        <div class="cart-price">Rp ${item.price.toLocaleString()}</div>
                        <div style="font-size:0.8rem; margin-top:4px; color:var(--text-muted);">Jumlah: ${item.qty}</div>
                    </div>
                    <div class="cart-del" onclick="removeFromCart(${idx})">${ICONS.trash}</div>
                </div>`;
        });
        updateCheckoutBtn();
    }
}

function toggleCartSelect(idx) {
    cart[idx].selected = !cart[idx].selected;
    openCartPage(); // Re-render page
}

function updateCheckoutBtn() {
    let total = 0;
    cart.forEach(item => {
        if (item.selected) total += (item.price * item.qty);
    });
    if(document.getElementById('cartTotal')) document.getElementById('cartTotal').innerText = 'Rp ' + total.toLocaleString();
}

function removeFromCart(idx) {
    cart.splice(idx, 1);
    saveCart();
    openCartPage();
}

function checkoutCart() {
    const selectedItems = cart.filter(i => i.selected);
    if (selectedItems.length === 0) return toast("Pilih produk dulu", true);

    if (selectedItems.length > 1) {
        return toast("Mohon checkout satu per satu", true);
    }

    // Process Single Item (Backend Limit)
    const item = selectedItems[0];
    currentCode = item.code;

    // Reuse logic for single buy
    const html = `
        <div>
            <h3 style="margin-top:0;">${item.name}</h3>
            <div style="display:flex; justify-content:center; align-items:center; gap:15px; margin:20px 0;">
                <span style="font-size:1.1rem; font-weight:bold;">Jumlah: ${item.qty}</span>
            </div>
            <div style="font-weight:800; font-size:1.2rem; margin-bottom:15px; color:var(--primary);" id="mTotal">
                Total: Rp ${(item.price * item.qty).toLocaleString()}
            </div>
            <input type="hidden" id="mQty" value="${item.qty}">
            <button class="btn-primary" onclick="processBuy()">Lanjut Bayar</button>
        </div>`;

    document.getElementById('trxBody').innerHTML = html;
    openModal('trxModal');
}

// ==========================================
//   PRODUCT DETAIL & BUYING FLOW
// ==========================================

function openBuy(code) {
    // OLD: window.location.href = '/p/' + code;
    // NEW: Open Modal
    openPdpModal(code);
}

function addToCartCurrent(code) {
    if(!code) code = currentCode;
    let p = allProducts.find(x => x.code === code);

    // Fallback for standalone PDP (if still used)
    if(!p && document.getElementById('pdpName')) {
        const priceStr = document.getElementById('pdpPrice').innerText.replace('Rp ', '').replace(/,/g, '').replace('GRATIS', '0');
        p = {
            code: code,
            name: document.getElementById('pdpName').innerText,
            price: parseInt(priceStr),
            img: document.getElementById('pdpImage').src
        };
    }

    if (!p) return toast("Gagal memuat info produk", true);

    const exist = cart.find(x => x.code === code);
    if (exist) {
        exist.qty++;
    } else {
        cart.push({
            code: code,
            qty: 1,
            price: p.price,
            name: p.name,
            img: p.img,
            selected: false
        });
    }
    saveCart();
    toast("Masuk Keranjang");
}

function shareCurrentProduct() {
    const url = `${window.location.origin}/p/${currentCode}`;
    if (navigator.share) {
        navigator.share({
            title: document.getElementById('pdpName').innerText,
            text: 'Cek produk ini di ' + STORE_NAME,
            url: url
        }).catch(console.error);
    } else {
        copyText(url);
        toast("Link produk disalin");
    }
}

function buyCurrent(code) {
    if(code) currentCode = code;

    let p = allProducts.find(x => x.code === currentCode);

    // Fallback for standalone PDP
    if(!p && document.getElementById('pdpName')) {
        const priceStr = document.getElementById('pdpPrice').innerText.replace('Rp ', '').replace(/,/g, '').replace('GRATIS', '0');
        const stockStr = document.getElementById('pdpStock').innerText.replace('Stok: ', '');
        p = {
            code: currentCode,
            name: document.getElementById('pdpName').innerText,
            price: parseInt(priceStr),
            stock: parseInt(stockStr) || 0
        };
    }

    if (!p) return toast("Gagal memuat produk", true);
    if (p.stock < 1) return toast("Stok Habis");

    const html = `
        <div>
            <h3 style="margin-top:0;">${p.name}</h3>
            <div style="display:flex; justify-content:center; align-items:center; gap:15px; margin:20px 0;">
                <button onclick="changeQty(-1, ${p.price}, ${p.stock})" style="width:35px;height:35px;border-radius:8px;border:1px solid #ddd;background:white;font-weight:bold;">-</button>
                <input id="mQty" value="1" readonly style="width:50px;text-align:center;font-weight:bold;border:none;font-size:1.1rem;background:transparent;">
                <button onclick="changeQty(1, ${p.price}, ${p.stock})" style="width:35px;height:35px;border-radius:8px;border:1px solid #ddd;background:white;font-weight:bold;">+</button>
            </div>
            <div style="font-weight:800; font-size:1.2rem; margin-bottom:15px; color:var(--primary);" id="mTotal">
                ${p.price === 0 ? 'GRATIS' : 'Rp ' + p.price.toLocaleString()}
            </div>
            <button class="btn-primary" onclick="processBuy()">Lanjut Bayar</button>
        </div>`;

    document.getElementById('trxBody').innerHTML = html;
    openModal('trxModal');
}

function changeQty(d, price, maxStock) {
    const e = document.getElementById('mQty');
    let v = parseInt(e.value) + d;

    if (v < 1) v = 1;
    if (v > maxStock) v = maxStock;

    e.value = v;
    document.getElementById('mTotal').innerText = price === 0 ? 'GRATIS' : 'Rp ' + (price * v).toLocaleString();
}

async function processBuy() {
    const q = parseInt(document.getElementById('mQty').value);
    document.getElementById('trxBody').innerHTML = '<div class="loader"></div><p style="text-align:center; margin-top:15px;">Memproses pesanan...</p>';

    const r = await fetch('/api/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: currentCode, qty: q, voucherCode: null })
    });
    const d = await r.json();

    if (!d.success) {
        closeModal('trxModal');
        return toast(d.message);
    }

    if (d.isFree) {
        saveHistoryItem({
            oid: 'FREE-' + Date.now(),
            name: allProducts.find(x => x.code === currentCode).name,
            date: new Date().toLocaleString(),
            status: 'PAID',
            content: d.accounts,
            price: 0
        });
        showSuccess(d.accounts, true);
    } else {
        currentOrderId = d.orderId;
        saveHistoryItem({
            oid: currentOrderId,
            name: allProducts.find(x => x.code === currentCode).name,
            date: new Date().toLocaleString(),
            status: 'PENDING',
            price: d.amount,
            qr: d.qrString
        });
        showPaymentUI(d.qrString, d.amount);
    }
}

function showPaymentUI(q, a) {
    const u = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(q)}`;
    const h = `
        <div style="text-align:center">
            <h3 style="margin-top:0;">Scan QRIS</h3>
            <div style="padding:15px;background:white;border:1px solid #eee;border-radius:12px;display:inline-block;box-shadow:var(--shadow-sm);">
                <img src="${u}" style="width:200px;display:block;">
            </div>
            <h2 style="color:var(--primary);margin:10px 0 5px;">Rp ${a.toLocaleString()}</h2>
            <p style="font-size:0.8rem;color:var(--text-muted);">ID: <span style="font-family:monospace">${currentOrderId}</span></p>
            <button class="btn-primary" onclick="checkStatus()">Cek Status Pembayaran</button>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:10px;">Otomatis cek status saat diklik</div>
        </div>`;
    document.getElementById('trxBody').innerHTML = h;
}

async function checkStatus() {
    const r = await fetch('/api/check-status?oid=' + currentOrderId);
    const d = await r.json();
    if (d.status === 'PAID') {
        const c = await fetch('/api/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oid: currentOrderId })
        });
        const res = await c.json();
        if (res.success) {
            updateHistoryStatus(currentOrderId, 'PAID', res.accounts);
            showSuccess(res.accounts, true);
        } else toast("Gagal Claim. Hubungi Admin");
    } else toast("Belum ada pembayaran masuk");
}

function showSuccess(accs, isModal = false) {
    let h = `
        <div style="text-align:center">
            <div style="font-size:50px;color:var(--success);margin-bottom:10px;">${ICONS.check}</div>
            <h3 style="margin:0 0 10px;">Berhasil!</h3>
            <p style="color:var(--text-muted); font-size:0.9rem;">Berikut produk Anda:</p>
            <div class="acc-list-container" style="background:#f8fafc; padding:15px; border-radius:12px; border:1px solid #e2e8f0; text-align:left; max-height:250px; overflow-y:auto;">`;

    accs.forEach(a => {
        h += `
            <div style="margin-bottom:10px; background:white; padding:10px; border-radius:8px; border:1px dashed #cbd5e1; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-family:monospace; font-weight:600; color:#334155; overflow-wrap:anywhere;">${a}</span>
                <div style="cursor:pointer; color:var(--primary);" onclick="copyText('${a}')">${ICONS.copy}</div>
            </div>`;
    });

    h += '</div></div>';
    document.getElementById('trxBody').innerHTML = h;
    if (!isModal) openModal('trxModal');
}

// ==========================================
//   BANNER & SLIDER
// ==========================================

function initBannerSlider() {
    const c = document.getElementById('bannerCarousel');
    if (BANNERS.length === 0) return;

    let h = '<div class="banner-slider" id="bannerSlider">';
    let d = '<div class="banner-dots">';

    BANNERS.forEach((b, i) => {
        h += `<div class="banner-slide"><img src="${b}" class="banner-img"></div>`;
        d += `<div class="banner-dot ${i === 0 ? 'active' : ''}"></div>`;
    });

    c.innerHTML = h + '</div>' + d + '</div>';

    // Dots logic
    const slider = document.getElementById('bannerSlider');
    slider.addEventListener('scroll', () => {
        const index = Math.round(slider.scrollLeft / slider.offsetWidth);
        document.querySelectorAll('.banner-dot').forEach((dot, i) => {
            if (i === index) dot.classList.add('active');
            else dot.classList.remove('active');
        });
    });

    // Auto scroll
    if (slider) {
        setInterval(() => {
            const w = slider.offsetWidth;
            if (slider.scrollLeft >= slider.scrollWidth - w - 10)
                slider.scrollTo({ left: 0, behavior: 'smooth' });
            else
                slider.scrollBy({ left: w, behavior: 'smooth' });
        }, 4000);
    }
}

// ==========================================
//   CATEGORY & SEARCH
// ==========================================

function renderCategories() {
    const l = document.getElementById('catList');
    if(!l) return;
    l.innerHTML = '';
    CATEGORIES.forEach(c => {
        l.innerHTML += `<div class="cat-pill ${c === currentCat ? 'active' : ''}" onclick="setCategory('${c}')">${c}</div>`;
    });
}

function setCategory(c) {
    currentCat = c;
    renderCategories();
    applyFilter();
}

function applyFilter() {
    const searchInput = document.getElementById('searchInput');
    const q = searchInput ? searchInput.value.toLowerCase() : '';

    let f = allProducts.filter(p => (p.name.toLowerCase().includes(q)) && (currentCat === 'Semua' || p.category === currentCat));

    // Sort
    if (currentSort === 'price_low') f.sort((a, b) => a.price - b.price);
    else if (currentSort === 'price_high') f.sort((a, b) => b.price - a.price);
    else f.reverse();

    const l = document.getElementById('productList');
    if(!l) return;

    l.innerHTML = '';

    if (f.length === 0) {
        if(document.getElementById('noResults')) document.getElementById('noResults').style.display = 'block';
    } else {
        if(document.getElementById('noResults')) document.getElementById('noResults').style.display = 'none';
        f.forEach(p => {
            const isSoldOut = p.stock < 1;
            const btnText = isSoldOut ? 'HABIS' : 'BELI';
            const priceDisp = p.price === 0 ? 'GRATIS' : 'Rp ' + p.price.toLocaleString();
            const badge = !isSoldOut && p.stock < 5 ? `<div class="badge-discount">SISA ${p.stock}</div>` : '';

            l.innerHTML += `
            <div class="card" onclick="openBuy('${p.code}')">
                <div class="prod-img-container">
                    <img src="${p.img || FAVICON_URL}" class="prod-img">
                    ${badge}
                </div>
                <div class="card-content">
                    <h4>${p.name}</h4>
                    <div class="price-row">
                        <div class="price">${priceDisp}</div>
                        <div class="sold-count">${isSoldOut ? 'Habis' : 'Ready'}</div>
                    </div>
                </div>
            </div>`;
        });
    }
}

function handleSearch(e) {
    if ((e.key === 'Enter' || e.keyCode === 13) && e.target.value.toLowerCase() === 'minkey') {
        openModal('loginModal');
        e.target.value = '';
    }
    applyFilter();
}

// ==========================================
//   ADMIN PANEL LOGIC
// ==========================================

function openAdminMenu() {
    openModal('adminMenuPage');
    switchAdminTab('prod');
    renderCategories();
}

function closeAdminMenu() {
    closeModal('adminMenuPage');
}

function switchAdminTab(t) {
    document.querySelectorAll('.sidebar-item').forEach(e => e.classList.remove('active'));
    document.getElementById('sb' + t.charAt(0).toUpperCase() + t.slice(1)).classList.add('active');

    document.querySelectorAll('.admin-content > div').forEach(e => e.style.display = 'none');
    document.getElementById('adminTab' + t.charAt(0).toUpperCase() + t.slice(1)).style.display = 'block';

    if (t === 'prod') {
        const s = document.getElementById('editProdSelect');
        s.innerHTML = '<option>Pilih Produk</option>';
        allProducts.forEach(p => s.innerHTML += `<option value="${p.code}">${p.name}</option>`);
        renderAdminCats();
    }
    if (t === 'vouc') loadAdminVouchers();
    if (t === 'stats') loadAdminStats(1);
    if (t === 'conf') initAdminConfUI();
}

function toggleAccordion(id) {
    const e = document.getElementById(id);
    const isOpen = e.classList.contains('open');
    document.querySelectorAll('.accordion').forEach(x => x.classList.remove('open'));
    if (!isOpen) e.classList.add('open');
}

// --- ADMIN HELPERS ---

function renderAdminCats() {
    const d = document.getElementById('confCatList');
    d.innerHTML = '';
    CATEGORIES.forEach((c, i) => {
        d.innerHTML += `<div class="tag">${c} <span class="tag-del" onclick="admRemCat(${i})">${ICONS.trash}</span></div>`;
    });
    updateCategorySelects();
}

function updateCategorySelects() {
    let h = '<option value="">Pilih...</option>';
    CATEGORIES.forEach(c => {
        h += `<option value="${c}">${c}</option>`;
    });
    document.getElementById('nCat').innerHTML = h;
    document.getElementById('editCat').innerHTML = h;
}

function admAddCat() {
    const v = document.getElementById('newCatInput').value;
    if (v) {
        CATEGORIES.push(v);
        document.getElementById('newCatInput').value = '';
        renderAdminCats();
        admSaveConfigSilent();
    }
}

function admRemCat(i) {
    if (confirm("Hapus?")) {
        CATEGORIES.splice(i, 1);
        renderAdminCats();
        admSaveConfigSilent();
    }
}

async function admSaveConfigSilent() {
    // USE GLOBAL VARIABLES FOR SAFETY
    const b = {
        banners: BANNERS,
        cats: CATEGORIES,
        ogTitle: OG_TITLE,
        ogDesc: OG_DESC,
        favicon: FAVICON_URL,
        ogImage: OG_IMAGE_URL
    };
    await fetch('/api/admin/save-config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Admin-Key': localStorage.getItem('adminKey')
        },
        body: JSON.stringify(b)
    });
}

function initAdminConfUI() {
    // Force value update from global variables
    document.getElementById('confFavicon').value = FAVICON_URL || "";
    document.getElementById('confOgTitle').value = OG_TITLE || "";
    document.getElementById('confOgDesc').value = OG_DESC || "";
    document.getElementById('confOgImage').value = OG_IMAGE_URL || "";
    document.getElementById('confStoreName').value = STORE_NAME || "";
    document.getElementById('confContact').value = CONTACT_URL || "";

    // INIT BANNER INPUTS (NEW LOGIC)
    renderAdminBanners();

    // Force previews update
    previewImg(document.getElementById('confFavicon'), 'prevFav');
    previewImg(document.getElementById('confOgImage'), 'prevOg');
    previewBanners();
}

// NEW DYNAMIC BANNER LOGIC
function renderAdminBanners() {
    const c = document.getElementById('bannerListContainer');
    c.innerHTML = '';
    if (!BANNERS || BANNERS.length === 0) return;

    BANNERS.forEach((url, i) => {
        // Logic for Move Buttons Visibility
        const isFirst = (i === 0);
        const isLast = (i === BANNERS.length - 1);

        // Only render buttons if not first/last to avoid errors
        let moveUpBtn = isFirst ? '' : `<div class="btn-icon-sm" onclick="admMoveBanner(${i}, -1)">${ICONS.arrowUp}</div>`;
        let moveDownBtn = isLast ? '' : `<div class="btn-icon-sm" onclick="admMoveBanner(${i}, 1)">${ICONS.arrowDown}</div>`;

        c.innerHTML += `
            <div class="banner-item">
                <div class="banner-head">
                    <span class="banner-label">Banner #${i+1}</span>
                </div>
                <input class="input-field banner-url-input" value="${url}" placeholder="URL Gambar..." oninput="previewBanners()" style="margin-bottom:0">
                <div class="banner-actions">
                    ${moveUpBtn}
                    ${moveDownBtn}
                    <div class="btn-icon-sm btn-del-sm" onclick="admRemoveBanner(${i})">${ICONS.trash}</div>
                </div>
            </div>
        `;
    });
}

function admMoveBanner(index, direction) {
    // 1. Get latest data from inputs first
    const inputs = document.querySelectorAll('.banner-url-input');
    BANNERS = Array.from(inputs).map(i => i.value);

    // 2. Perform Swap
    if (direction === -1 && index > 0) {
        [BANNERS[index], BANNERS[index - 1]] = [BANNERS[index - 1], BANNERS[index]];
    } else if (direction === 1 && index < BANNERS.length - 1) {
        [BANNERS[index], BANNERS[index + 1]] = [BANNERS[index + 1], BANNERS[index]];
    }

    // 3. Re-render
    renderAdminBanners();
    previewBanners();
}

function admAddBanner() {
    // Get data first
    const inputs = document.querySelectorAll('.banner-url-input');
    if (inputs.length > 0) BANNERS = Array.from(inputs).map(i => i.value);

    if (!BANNERS) BANNERS = [];
    BANNERS.push("");
    renderAdminBanners();
}

function admRemoveBanner(index) {
    // Get data first
    const inputs = document.querySelectorAll('.banner-url-input');
    BANNERS = Array.from(inputs).map(i => i.value);

    BANNERS.splice(index, 1);
    renderAdminBanners();
    previewBanners();
}

function previewImg(input, imgId) {
    const img = document.getElementById(imgId);
    if (input.value) {
        img.src = input.value;
        img.style.display = 'block';
    } else {
        img.style.display = 'none';
    }
}

function previewBanners() {
    // GATHER FROM INPUTS FIRST for live preview
    const inputs = document.querySelectorAll('.banner-url-input');
    const urls = [];
    inputs.forEach(input => {
        if (input.value.trim()) urls.push(input.value.trim());
    });

    const d = document.getElementById('bannerPreviews');
    d.innerHTML = '';
    urls.forEach(u => {
        d.innerHTML += `<img src="${u}" style="height:60px;border-radius:4px;border:1px solid #ddd;">`;
    });
}

function changeStatsPage(dir) {
    statsPage += dir;
    if (statsPage < 1) statsPage = 1;
    loadAdminStats(statsPage);
}

async function loadAdminStats(page) {
    const l = document.getElementById('salesHistoryList');
    l.innerHTML = '<div class="loader"></div>';
    document.getElementById('pageIndicator').innerText = page;
    document.getElementById('btnPrevPage').disabled = (page === 1);

    try {
        const r = await fetch('/api/admin/stats?page=' + page, {
            headers: { 'Admin-Key': localStorage.getItem('adminKey') }
        });
        const d = await r.json();
        if (d.success) {
            document.getElementById('statDaily').innerText = 'Rp ' + (d.daily || 0).toLocaleString();
            document.getElementById('statMonthly').innerText = 'Rp ' + (d.monthly || 0).toLocaleString();
            document.getElementById('statTotal').innerText = 'Rp ' + (d.total || 0).toLocaleString();

            let html = '';
            if (d.history.length === 0) {
                html = '<p style="text-align:center; color:var(--text-muted); padding:20px;">Tidak ada data lagi.</p>';
                document.getElementById('btnNextPage').disabled = true;
            } else {
                d.history.forEach(s => {
                    html += `
                        <div class="tx-item">
                            <div class="tx-left">
                                <span class="tx-name">${s.name}</span>
                                <span class="tx-date">${new Date(s.date).toLocaleString()}</span>
                            </div>
                            <div class="tx-right">Rp ${(s.price || 0).toLocaleString()}</div>
                        </div>`;
                });
                // Disable NEXT if less than 7 items
                document.getElementById('btnNextPage').disabled = (d.history.length < 7);
            }
            l.innerHTML = html;
        }
    } catch {
        l.innerHTML = 'Error';
    }
}

async function admSaveConfig() {
    // GATHER BANNERS FROM DYNAMIC INPUTS
    const bannerInputs = document.querySelectorAll('.banner-url-input');
    const banners = Array.from(bannerInputs).map(i => i.value.trim()).filter(x => x);

    // GATHER OTHER CONFIGS
    const newOgTitle = document.getElementById('confOgTitle').value;
    const newOgDesc = document.getElementById('confOgDesc').value;
    const newFavicon = document.getElementById('confFavicon').value;
    const newOgImage = document.getElementById('confOgImage').value;
    const newStoreName = document.getElementById('confStoreName').value;
    const newContact = document.getElementById('confContact').value;

    const b = {
        banners: banners,
        cats: CATEGORIES,
        ogTitle: newOgTitle,
        ogDesc: newOgDesc,
        favicon: newFavicon,
        ogImage: newOgImage,
        storeName: newStoreName,
        contact: newContact
    };

    const res = await fetch('/api/admin/save-config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Admin-Key': localStorage.getItem('adminKey')
        },
        body: JSON.stringify(b)
    });
    const data = await res.json();

    if (data.success) {
        // UPDATE GLOBAL VARIABLES IMMEDIATELY
        BANNERS = banners;
        OG_TITLE = newOgTitle;
        OG_DESC = newOgDesc;
        FAVICON_URL = newFavicon;
        OG_IMAGE_URL = newOgImage;
        STORE_NAME = newStoreName;
        CONTACT_URL = newContact;

        document.getElementById('headerTitle').innerText = STORE_NAME;
        document.title = STORE_NAME;

        toast("Konfigurasi disimpan");
        initBannerSlider();
    } else {
        toast("Gagal menyimpan", true);
    }
}

// ==========================================
//   USER PROFILE & SETTINGS
// ==========================================

function openInputName() {
    openModal('inputNameModal');
}

function closeUserMenu() {
    closeModal('userMenuPage');
}

function openUserMenu() {
    // 1. Get history
    const h = getHistory();
    let spend = 0;
    let assets = 0;

    // 2. Calculate stats
    h.forEach(i => {
        if (i.status === 'PAID') {
            spend += (i.price || 0);

            if (Array.isArray(i.content)) assets += i.content.length;
            else assets++;
        }
    });

    // 3. Render
    const elSpend = document.getElementById('uStatSpend');
    const elAssets = document.getElementById('uStatAssets');

    if (elSpend) elSpend.innerText = 'Rp ' + spend.toLocaleString();
    if (elAssets) elAssets.innerText = assets;

    // 4. Open Menu
    openModal('userMenuPage');
}

function changeProfilePic(input) {
    const f = input.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onloadend = function() {
        const i = new Image();
        i.onload = function() {
            const c = document.createElement('canvas');
            const ctx = c.getContext('2d');
            // Resize for lightweight storage
            const s = 100 / i.width;
            c.width = 100;
            c.height = i.height * s;
            ctx.drawImage(i, 0, 0, c.width, c.height);
            const newData = c.toDataURL('image/jpeg', 0.7);

            // Save to LocalStorage
            const session = localStorage.getItem('user_session');
            if (session) {
                let userDb = JSON.parse(localStorage.getItem('user_db_' + session));
                userDb.image = newData;
                localStorage.setItem('user_db_' + session, JSON.stringify(userDb));

                // Update UI
                updateProfileUI(userDb);
                toast("Foto Profil Diperbarui");
            }
        };
        i.src = r.result;
    };
    r.readAsDataURL(f);
}

function editProfileName() {
    const currentSession = localStorage.getItem('user_session');
    const oldName = currentSession;
    let newName = prompt("Masukkan Nama Baru:", oldName);

    if (!newName) return;
    newName = newName.trim();
    if (newName === oldName) return;
    if (newName.length < 3) return toast("Nama terlalu pendek (min 3 huruf)", true);

    if (localStorage.getItem('user_db_' + newName)) {
        return toast("Nama sudah digunakan user lain!", true);
    }

    try {
        const userData = JSON.parse(localStorage.getItem('user_db_' + oldName));
        userData.username = newName;

        localStorage.setItem('user_db_' + newName, JSON.stringify(userData));
        localStorage.setItem('user_session', newName);
        currentUser = newName;

        localStorage.removeItem('user_db_' + oldName);

        updateProfileUI(userData);
        toast("Nama berhasil diubah!");
    } catch (e) {
        console.error(e);
        toast("Gagal mengubah nama", true);
    }
}

// ==========================================
//   HISTORY & ASSETS
// ==========================================

function getHistory() {
    return JSON.parse(localStorage.getItem('myHistory') || '[]');
}

function saveHistoryItem(i) {
    let h = getHistory();
    h.unshift(i);
    localStorage.setItem('myHistory', JSON.stringify(h));
}

function updateHistoryStatus(oid, s, c) {
    let h = getHistory();
    const i = h.findIndex(x => x.oid === oid);
    if (i >= 0) {
        h[i].status = s;
        if (c) h[i].content = c;
        localStorage.setItem('myHistory', JSON.stringify(h));
    }
}

// HISTORY PAGE
function loadHistoryPage() {
    filterHist('all');
}

function filterHist(t) {
    document.querySelectorAll('.cat-pill').forEach(e => e.classList.remove('active'));
    const tabId = t === 'all' ? 'tabAll' : (t === 'pending' ? 'tabPending' : 'tabPaid');
    if(document.getElementById(tabId)) document.getElementById(tabId).classList.add('active');

    const h = getHistory();
    const f = h.filter(x => (t === 'all') ? true : (t === 'pending' ? x.status === 'PENDING' : x.status === 'PAID'));
    const l = document.getElementById('histList');
    if(!l) return;
    l.innerHTML = '';

    if (f.length === 0)
        l.innerHTML = '<div style="text-align:center;color:#888;padding:20px;">Belum ada riwayat</div>';

    f.forEach(i => {
        const st = i.status === 'PAID' ?
            '<span style="color:var(--success);background:#ECFDF5;padding:3px 8px;border-radius:6px;font-size:0.7rem;font-weight:700;">BERHASIL</span>' :
            '<span style="color:var(--danger);background:#FEF2F2;padding:3px 8px;border-radius:6px;font-size:0.7rem;font-weight:700;">MENUNGGU</span>';

        l.innerHTML += `
            <div style="background:white; padding:12px; margin-bottom:10px; border-radius:12px; border:1px solid var(--border); box-shadow:var(--shadow-sm); cursor:pointer;" onclick="showHistoryDetail('${i.oid}')">
                <div style="font-weight:700; margin-bottom:5px;">${i.name}</div>
                <div style="font-size:0.75rem; display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:var(--text-muted);">${i.date}</span>
                    ${st}
                </div>
            </div>`;
    });
}

function showHistoryDetail(oid) {
    const item = getHistory().find(x => x.oid === oid);
    if (!item) return;

    if (item.status === 'PENDING') {
        currentOrderId = oid;
        showPaymentUI(item.qr, item.price);
        openModal('trxModal');
    } else if (item.status === 'PAID') {
        showSuccess(item.content, false);
        openModal('trxModal');
    }
}

// ASSETS PAGE
function loadAssetsPage() {
    const h = getHistory().filter(x => x.status === 'PAID');
    const l = document.getElementById('myProdList');
    if(!l) return;
    l.innerHTML = '';

    if (h.length === 0)
        l.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">' + ICONS.wallet + '<br>Belum ada aset</div>';

    h.forEach(i => {
        let c = '';
        if (Array.isArray(i.content))
            i.content.forEach(x => c += `<div class="acc-box" style="background:#F8FAFC;padding:10px;border-radius:8px;border:1px dashed var(--border);margin-top:8px;display:flex;justify-content:space-between;align-items:center;"><span style="font-family:monospace;font-weight:600;">${x}</span><div style="cursor:pointer;color:var(--primary);font-size:0.8rem;" onclick="copyText('${x}')">Salin</div></div>`);

        l.innerHTML += `<div class="asset-card" style="background:white;border-radius:12px;padding:16px;border:1px solid var(--border);margin-bottom:12px;"><strong>${i.name}</strong>${c}</div>`;
    });
}

// PROFILE PAGE
function loadProfilePage() {
    const userSession = localStorage.getItem('user_session');
    if(userSession) {
        const userData = JSON.parse(localStorage.getItem('user_db_' + userSession));
        if(userData) updateProfileUI(userData);
    }

    const h = getHistory();
    let spend = 0;
    let assets = 0;

    h.forEach(i => {
        if (i.status === 'PAID') {
            spend += (i.price || 0);
            if (Array.isArray(i.content)) assets += i.content.length;
            else assets++;
        }
    });

    const elSpend = document.getElementById('uStatSpend');
    const elAssets = document.getElementById('uStatAssets');

    if (elSpend) elSpend.innerText = 'Rp ' + spend.toLocaleString();
    if (elAssets) elAssets.innerText = assets;
}

// ==========================================
//   UTILITIES
// ==========================================

function toast(m, error = false) {
    const t = document.createElement('div');
    t.className = 'toast visible';
    if (error) t.style.borderLeft = '5px solid var(--danger)';
    else t.style.borderLeft = '5px solid var(--success)';

    t.innerHTML = (error ? ICONS.close : ICONS.check) + ' ' + m;
    document.getElementById('toastContainer').appendChild(t);
    setTimeout(() => { t.remove() }, 2000);
}

function copyText(t) {
    navigator.clipboard.writeText(t).then(() => toast("Disalin"));
}

function setSort(t) {
    currentSort = t;
    closeSheet();
    applyFilter();
}

// ==========================================
//   API CALLS (ADMIN STUBS)
// ==========================================

async function loadProducts() {
    try {
        const r = await fetch('/api/products');
        if (!r.ok) throw new Error("Server Error");

        const d = await r.json();
        if(d.error) throw new Error(d.message || "Gagal memuat data");

        if(d.products && Array.isArray(d.products)) {
            allProducts = d.products;
            applyFilter();
        } else {
            // Safe fallback if JSON is valid but structure is wrong
            allProducts = [];
            applyFilter();
        }
        if(document.getElementById('loading')) document.getElementById('loading').style.display = 'none';
    } catch (e) {
        console.error("Load Products Error:", e);
        const l = document.getElementById('loading');
        if(l) {
            l.className = ''; // Remove loader spinner class
            l.style.textAlign = 'center';
            l.style.color = 'var(--danger)';
            l.innerHTML = `
                <div style="margin-bottom:10px;">${ICONS.close}</div>
                <div>Gagal memuat data.</div>
                <button class="btn-primary" style="margin-top:10px; width:auto; padding:8px 20px;" onclick="location.reload()">Coba Lagi</button>
            `;
        }
    }
}

async function doLogin() {
    const p = document.getElementById('adminPass').value;
    const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: p })
    });
    const d = await r.json();
    if (d.success) {
        localStorage.setItem('adminKey', p);
        closeModal('loginModal');
        checkAdminSession();
        toast("Login OK");
    } else toast("Salah");
}

function doLogout() {
    localStorage.removeItem('adminKey');
    closeAdminMenu();
    checkAdminSession();
}

function admOpenStockSelector() {
    const l = document.getElementById('productSelectList');
    l.innerHTML = '';
    allProducts.forEach(p => {
        l.innerHTML += `<div onclick="admFetchStock('${p.code}', '${p.name}')" style="padding:10px;border-bottom:1px solid #eee;cursor:pointer;">${p.name}</div>`;
    });
    openModal('selectProductModal');
}

async function admFetchStock(c, n) {
    activeStockCode = c;
    closeModal('selectProductModal');
    document.getElementById('stkModalName').innerText = n || c;
    openModal('stockDetailModal');
    const r = await fetch('/api/admin/get-stock?code=' + c, {
        headers: { 'Admin-Key': localStorage.getItem('adminKey') }
    });
    const d = await r.json();
    const l = document.getElementById('stockListContainer');
    l.innerHTML = '';
    if (d.stock.length === 0) l.innerHTML = '<p style="color:#888;">Stok Kosong</p>';
    else d.stock.forEach((s, i) => l.innerHTML += `<div class="stock-item"><span>${s.substring(0, 25)}...</span><span style="color:var(--danger);cursor:pointer" onclick="admDelStockDirect(${i})">${ICONS.trash}</span></div>`);
}

async function admAddStockDirect() {
    const v = document.getElementById('newStockDirect').value;
    await fetch('/api/admin/stock-action', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Admin-Key': localStorage.getItem('adminKey')
        },
        body: JSON.stringify({ code: activeStockCode, action: 'add', data: v })
    });
    document.getElementById('newStockDirect').value = '';
    admFetchStock(activeStockCode, document.getElementById('stkModalName').innerText);
    toast("Stok Ditambah");
    loadProducts();
}

async function admDelStockDirect(i) {
    if (!confirm("Hapus?")) return;
    await fetch('/api/admin/stock-action', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Admin-Key': localStorage.getItem('adminKey')
        },
        body: JSON.stringify({ code: activeStockCode, action: 'delete', index: i })
    });
    admFetchStock(activeStockCode, document.getElementById('stkModalName').innerText);
    loadProducts();
}

async function admAdd() {
    await fetch('/api/admin/add-product', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Admin-Key': localStorage.getItem('adminKey')
        },
        body: JSON.stringify({
            code: document.getElementById('nCode').value,
            name: document.getElementById('nName').value,
            price: document.getElementById('nPrice').value,
            category: document.getElementById('nCat').value,
            img: document.getElementById('nImg').value,
            desc: document.getElementById('nDesc').value,
            stockData: document.getElementById('nStock').value
        })
    });
    toast("Disimpan");
    loadProducts();
}

function loadEditForm() {
    const c = document.getElementById('editProdSelect').value;
    const p = allProducts.find(x => x.code === c);
    if (p) {
        document.getElementById('editFormArea').style.display = 'block';
        document.getElementById('editPrice').value = p.price;
        document.getElementById('editImg').value = p.img || '';
        document.getElementById('editDesc').value = p.desc || '';
        document.getElementById('editCat').value = p.category || '';
    }
}

// VOUCHER LOGIC

async function loadAdminVouchers() {
    const r = await fetch('/api/admin/vouchers', {
        headers: { 'Admin-Key': localStorage.getItem('adminKey') }
    });
    const d = await r.json();
    const l = document.getElementById('voucherListAdmin');
    l.innerHTML = '';
    if (d.vouchers.length === 0) {
        l.innerHTML = '<p style="text-align:center;color:#888;">Belum ada voucher</p>';
        return;
    }
    d.vouchers.forEach(v => {
        l.innerHTML += `
            <div class="stock-item" style="display:flex;justify-content:space-between;">
                <div><strong>${v.code}</strong> (Rp ${v.amount.toLocaleString()})</div>
                <div style="cursor:pointer;color:var(--danger);" onclick="admDelVoucher('${v.code}')">${ICONS.trash}</div>
            </div>`;
    });
}

async function admSaveVoucher() {
    const c = document.getElementById('vCode').value.trim().toUpperCase(),
        a = parseInt(document.getElementById('vAmount').value),
        t = document.getElementById('vTarget').value,
        l = parseInt(document.getElementById('vLimit').value) || 0;
    if (!c || !a) return toast("Lengkapi Data");
    await fetch('/api/admin/save-voucher', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Admin-Key': localStorage.getItem('adminKey')
        },
        body: JSON.stringify({ code: c, amount: a, validFor: t, limit: l })
    });
    toast("Voucher Dibuat");
    loadAdminVouchers();
}

async function admDelVoucher(c) {
    if (!confirm("Hapus?")) return;
    await fetch('/api/admin/del-voucher', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Admin-Key': localStorage.getItem('adminKey')
        },
        body: JSON.stringify({ code: c })
    });
    toast("Dihapus");
    loadAdminVouchers();
}

async function admDelete() {
    const c = document.getElementById('editProdSelect').value;
    if (!c) return;
    if (!confirm("Hapus produk ini?")) return;
    await fetch('/api/admin/delete-product', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Admin-Key': localStorage.getItem('adminKey')
        },
        body: JSON.stringify({ code: c })
    });
    toast("Terhapus");
    location.reload();
}

async function admSave() {
    const c = document.getElementById('editProdSelect').value;
    if (!c) return;
    await fetch('/api/admin/edit-product', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Admin-Key': localStorage.getItem('adminKey')
        },
        body: JSON.stringify({
            code: c,
            price: document.getElementById('editPrice').value,
            category: document.getElementById('editCat').value,
            img: document.getElementById('editImg').value,
            desc: document.getElementById('editDesc').value
        })
    });
    toast("Update Sukses");
    loadProducts();
}

// Start the App
init();

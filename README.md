# Panduan Deploy Web Toko Digital ke cPanel (Node.js)

Aplikasi ini adalah toko online produk digital (seperti Cloudflare Worker sebelumnya) yang sudah dikonversi agar bisa berjalan di cPanel menggunakan **Node.js** dan **MySQL**.

## ⚠️ PENTING: SOLUSI ERROR (JIKA MUNCUL)

Jika Anda melihat error seperti di bawah ini saat mengakses web atau melihat log:

### 1. Error: `Cannot find module 'express'`
**Penyebab:** Anda belum menginstall library yang dibutuhkan.
**Solusi:**
- Masuk ke menu **Setup Node.js App** di cPanel.
- Pastikan Anda sudah menekan tombol **Run NPM Install**.
- Jika tombol tersebut tidak bisa diklik, pastikan file `package.json` sudah terupload dengan benar.

### 2. Error: `Access denied for user 'root'@'localhost' (using password: NO)`
**Penyebab:** Aplikasi gagal terhubung ke Database karena username/password database belum disetting.
**Solusi:**
- Buat database dan user di **MySQL Database Wizard** cPanel.
- Masukkan detail database tersebut ke menu **Application Environment Variables** di halaman setup Node.js cPanel (Lihat Langkah 5 di bawah).

---

## Langkah-Langkah Deploy

Ikuti panduan ini langkah demi langkah agar sukses.

### Langkah 1: Persiapan Database
1. Login ke cPanel.
2. Cari menu **MySQL Database Wizard**.
3. Buat Database Baru (contoh: `namasaya_tokodb`).
4. Buat User Database Baru (contoh: `namasaya_userdb`). **Catat Passwordnya!**
5. Berikan hak akses **ALL PRIVILEGES** user tersebut ke database yang baru dibuat.
6. Buka **phpMyAdmin**, pilih database yang baru dibuat.
7. Klik tab **SQL**, lalu Copy-Paste kode berikut ini dan klik **Go** (Kirim):

```sql
CREATE TABLE IF NOT EXISTS kv_store (
    id INT AUTO_INCREMENT PRIMARY KEY,
    key_name VARCHAR(191) NOT NULL UNIQUE,
    value LONGTEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

*(Alternatif: Anda bisa juga menggunakan tab **Import** dan upload file `schema.sql`)*

### Langkah 2: Upload File
1. Buka **File Manager** di cPanel.
2. Buat folder baru (misal: `toko-app`) di luar `public_html` (agar lebih aman), atau di dalam `public_html` juga boleh.
3. Upload semua file berikut ke folder tersebut:
   - `server.js`
   - `db.js`
   - `package.json`
   - `template.html`
   - `schema.sql` (opsional jika sudah diimport)
   - `.env` (jika Anda membuatnya manual, tapi disarankan pakai cara Langkah 5).

### Langkah 3: Setup Node.js App
1. Cari menu **Setup Node.js App** di cPanel.
2. Klik **Create Application**.
3. Isi form:
   - **Node.js Version:** Pilih versi **18** atau **20** (Recommended).
   - **Application Mode:** `Production`.
   - **Application Root:** Masukkan nama folder tempat upload tadi (misal: `toko-app`).
   - **Application URL:** Pilih domain/subdomain yang diinginkan.
   - **Application Startup File:** `server.js`
4. Klik **Create**.

### Langkah 4: Install Dependencies
1. Setelah aplikasi terbuat, scroll ke bawah sedikit di halaman Node.js App tersebut.
2. Klik tombol **Run NPM Install**.
   - *Tunggu prosesnya selesai (biasanya indikator loading berputar).*
   - Jika tombol ini tidak aktif, pastikan file `package.json` ada di dalam folder `Application Root`.

### Langkah 5: Konfigurasi Database (Environment Variables)
Di halaman **Setup Node.js App** yang sama, cari bagian **Environment Variables** (biasanya tombol "Add Variable").
Tambahkan variabel berikut sesuai data database Langkah 1:

| Name | Value (Contoh) |
|------|----------------|
| `DB_HOST` | `localhost` |
| `DB_USER` | `namasaya_userdb` |
| `DB_PASS` | `password_rahasia_anda` |
| `DB_NAME` | `namasaya_tokodb` |
| `ADMIN_PASSWORD` | `ganti_password_admin123` |
| `PAKASIR_API_KEY` | `(API Key Pakasir Anda)` |
| `PAKASIR_SLUG` | `(Slug Toko Pakasir Anda)` |

*Catatan: Jika cPanel Anda tidak memiliki menu Environment Variables, Anda bisa mengedit file `.env.example` menjadi `.env` di File Manager, lalu isi datanya di sana.*

### Langkah 6: Jalankan Aplikasi
1. Klik tombol **Restart** pada aplikasi Node.js Anda.
2. Buka URL domain Anda.
3. Seharusnya web sudah berjalan!

### 🔍 Cara Cek Error (Troubleshooting)
Jika web tidak bisa dibuka atau muncul error:
1. Buka **File Manager** di cPanel.
2. Masuk ke folder aplikasi Anda (folder tempat `server.js` berada).
3. Cari file bernama `error.log`.
4. Klik kanan file tersebut lalu pilih **View** atau **Edit**.
5. Di sana Anda bisa melihat detail errornya (misalnya: password database salah, atau nama database tidak ditemukan).

---

## Cara Update Produk (Admin)
Karena ini versi Node.js + MySQL, data tersimpan di Database.
Untuk pertama kali, Anda belum punya produk.
1. Gunakan Postman / HTTP Client untuk hit API Admin, atau
2. Modifikasi kode sementara untuk bypass login admin jika perlu, tapi cara amannya adalah menggunakan endpoint yang sudah disediakan di `server.js`.

**Endpoint Admin:**
- Login: `POST /api/admin/login` (Body: `password`)
- Tambah Produk: `POST /api/admin/add-product` (Header: `admin-key: PASSWORD_ADMIN`)

*Tips: Jika Anda kesulitan menggunakan API secara manual, Anda bisa membuat halaman admin.html sederhana nanti.*

## Integrasi Pembayaran (Pakasir)
Pastikan Anda sudah mendaftar di Pakasir dan mendapatkan API Key serta Slug Toko. Masukkan data tersebut di Environment Variables (Langkah 5).

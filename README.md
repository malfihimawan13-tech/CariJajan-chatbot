# CariJajan - Chatbot Pencari Makanan UMKM

Chatbot berbasis web yang memakai **Google Gemini API** untuk membantu pembeli menemukan makanan
dari **UMKM kuliner lokal yang belum ada di aplikasi pesan-antar online**: siapa penjualnya,
lokasinya di mana, harganya berapa, jam buka, dan cara memesannya.

Proyek ini dibuat sebagai Final Project *AI Productivity and AI API Integration for Developers*
(Hacktiv8 - Maju Bareng AI).

## Masalah yang diselesaikan
Banyak UMKM kecil (penjual jajan pasar, pempek rumahan, gerobak, warung) tidak terdaftar di
aplikasi pesan-antar makanan. Akibatnya pembeli sulit menemukan mereka, dan penjual kehilangan
pelanggan. CariJajan menjadi lapisan pencarian yang mudah: cukup bertanya dengan bahasa sehari-hari,
mis. *"Aku mau beli pempek, ada di mana ya?"*.

## Fitur
- **Jawaban berbasis data (grounded):** chatbot hanya memakai data di `data/umkm.json`, tidak mengarang usaha, harga, atau alamat. Jika tidak ada, bot jujur dan menawarkan alternatif.
- **Persona & gaya bahasa** lewat `systemInstruction`: CariJajan, santai dan ramah, format rekomendasi tetap (📍 lokasi, 🕒 jam, 📲 cara pesan).
- **Parameter generasi** dikonfigurasi: `temperature` 0.4 (rendah agar faktual), `topP`, `topK`, `maxOutputTokens`.
- **Rekomendasi:** berdasarkan menu, area, dan anggaran yang disebut pengguna; mendukung pertanyaan "jajanan terfavorit" dan "rekomendasi jajanan enak" (memakai penanda `populer` dan `menu_andalan` di data).
- **Tipe usaha:** setiap UMKM ditandai *Menetap*, *Gerobak mangkal*, atau *Keliling* (beserta rute keliling), dan bisa difilter di panel UMKM.
- **Memory percakapan** (multi-turn), disimpan di browser (`localStorage`).
- **Panel direktori UMKM** dengan pencarian; klik kartu untuk bertanya langsung ke chatbot.
- Saran pertanyaan (suggestion chips) dan tombol *Percakapan baru*.
- Model dapat diganti lewat `.env`, dengan model cadangan otomatis.

> Catatan: data UMKM pada repo ini adalah **data contoh** untuk area **Depok** (demo). Ganti `data/umkm.json`
> dengan data UMKM sungguhan di daerah Anda.

## Arsitektur
```
Browser (HTML/CSS/Vanilla JS)
   | GET  /api/umkm  -> daftar UMKM untuk panel direktori
   | POST /api/chat  { conversation: [{ role, text }, ...] }
   v
Node.js + Express
   - memuat data/umkm.json ke dalam systemInstruction
   - generateContent()  -->  Gemini API
   | { result: "<jawaban AI>" }
   v
Browser menampilkan jawaban
```
API key hanya ada di backend (`.env`), tidak pernah dikirim ke browser.

## Struktur Folder
```
gemini-chatbot-api/
├── index.js          # server Express, endpoint, konfigurasi Gemini
├── package.json
├── .env.example      # contoh variabel lingkungan
├── .gitignore
├── data/
│   └── umkm.json     # data UMKM (sumber pengetahuan chatbot)
└── public/
    ├── images/hero.jpg   # foto banner (bg.jpg = latar halaman)
    ├── images/food/      # foto makanan tiap UMKM (01.jpg - 104.jpg)
    ├── index.html
    ├── style.css
    └── script.js
```

## Cara Menjalankan
Prasyarat: Node.js 18 atau lebih baru dan Gemini API key (https://aistudio.google.com/api-keys).

```bash
npm install
copy .env.example .env     # macOS/Linux: cp .env.example .env
# edit .env lalu isi GEMINI_API_KEY
npm start
```

Buka http://localhost:3000

## Menguji API dengan Postman
- Method: `POST`
- URL: `http://localhost:3000/api/chat`
- Body: raw, JSON
```json
{
  "conversation": [
    { "role": "user", "text": "Aku mau beli pempek, ada di mana ya?" }
  ]
}
```
Respons: `{ "result": "...", "model": "..." }`

Daftar UMKM: `GET http://localhost:3000/api/umkm`

## Kustomisasi
- `data/umkm.json`: tambah atau ubah UMKM (nama, menu & harga, area, alamat, jam buka, cara pesan).
- `index.js`: `buildSystemInstruction()` untuk persona dan aturan; `GENERATION_CONFIG` untuk parameter.
- `.env`: `GEMINI_MODEL` untuk mengganti model.

## Pengembangan Selanjutnya
Form pendaftaran UMKM mandiri, peta lokasi, integrasi WhatsApp untuk pemesanan langsung,
dan penyimpanan data ke database.

## Kredit
Foto banner: Johanes Christiono (jajanan pasar, Ngaliyan, Jawa Tengah).

## Teknologi
Node.js, Express, `@google/genai`, dotenv, cors, HTML, CSS, JavaScript (vanilla).

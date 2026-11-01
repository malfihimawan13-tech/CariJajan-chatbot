const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const sendBtn = document.getElementById('send-btn');
const resetBtn = document.getElementById('reset-btn');
const suggestionsEl = document.getElementById('suggestions');
const tryBox = document.getElementById('try-box');
const umkmListEl = document.getElementById('umkm-list');
const umkmCountEl = document.getElementById('umkm-count');
const searchUmkmEl = document.getElementById('search-umkm');
const filtersEl = document.getElementById('filters');
const filterToggleEl = document.getElementById('filter-toggle');
const showAllEl = document.getElementById('show-all');
const heroCountEl = document.getElementById('hero-count');
const themeToggleEl = document.getElementById('theme-toggle');
const themeKnobEl = document.getElementById('theme-knob');
const infoDialog = document.getElementById('info-dialog');
const infoTitle = document.getElementById('info-title');
const infoBody = document.getElementById('info-body');

const STORAGE_KEY = 'carijajan-conversation';
const THEME_KEY = 'carijajan-theme';
const PREVIEW_COUNT = 8;
const WELCOME =
  'Halo! Aku **CariJajan** 👋\nAku bantu kamu nemuin jajanan dan makanan UMKM di sekitarmu yang sering nggak muncul di aplikasi pesan-antar. Lagi pengen makan apa nih?';
const SUGGESTIONS = [
  { icon: '📍', text: 'Jajanan dekat lokasiku' },
  { icon: '🍴', text: 'Rekomendasi minuman segar' },
  { icon: '🏷️', text: 'Jajanan di bawah Rp10.000' },
  { icon: '🔀', text: 'Lihat daftar UMKM terdekat' },
  { icon: '⭐', text: 'Jajanan terfavorit' },
  { icon: '😋', text: 'Rekomendasi jajanan enak' },
  { icon: '🛵', text: 'Pedagang keliling & jamnya' },
  { icon: '🏪', text: 'UMKM yang menetap' },
];

const INFO = {
  about: {
    title: 'Tentang CariJajan',
    html: `<p>CariJajan adalah chatbot pencari makanan UMKM lokal di Depok. Banyak penjual kecil (gerobak, warung, jajan pasar) belum ada di aplikasi pesan-antar, sehingga sulit ditemukan.</p>
           <p>Chatbot ini memakai <b>Google Gemini</b> dan hanya menjawab berdasarkan data UMKM yang tersedia, jadi tidak mengarang penjual, harga, atau alamat. Data pada demo ini adalah <b>data contoh</b>.</p>`,
  },
  help: {
    title: 'Bantuan',
    html: `<ul>
             <li>Ketik makanan yang kamu cari, mis. <i>"mie ayam di Tanah Baru"</i>.</li>
             <li>Sebut anggaran atau area untuk hasil yang lebih pas, mis. <i>"jajanan di bawah Rp10.000"</i>.</li>
             <li>Klik kartu UMKM di panel kanan untuk melihat detailnya.</li>
             <li>Pakai kotak pencarian dan tombol Filter untuk menyaring daftar.</li>
             <li>Harga dan jam buka bisa berubah, konfirmasi ke penjual.</li>
           </ul>`,
  },
};

// Riwayat percakapan (memory) dikirim ke backend di setiap permintaan.
let conversation = loadConversation();
let umkmData = [];
let activeCategory = 'Semua';
let activeTipe = 'Semua';
let showAll = false;

/* ---------- Util ---------- */
function loadConversation() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveConversation() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversation));
  } catch {
    /* abaikan jika penyimpanan tidak tersedia */
  }
}

function nowTime() {
  return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function rupiah(n) {
  return 'Rp' + Number(n).toLocaleString('id-ID');
}

// Render markdown sederhana (aman: teks di-escape dulu).
function renderMarkdown(text) {
  const blocks = [];
  let html = escapeHtml(text).replace(/```(?:\w+)?\n?([\s\S]*?)```/g, (_, code) => {
    blocks.push(`<pre><code>${code.trim()}</code></pre>`);
    return `@@BLOCK${blocks.length - 1}@@`;
  });

  html = html
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>');

  const lines = html.split('\n');
  const out = [];
  let list = null;

  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };

  for (const line of lines) {
    const bullet = line.match(/^\s*[-*•]\s+(.*)/);
    const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)/);
    if (bullet || numbered) {
      const type = bullet ? 'ul' : 'ol';
      if (list !== type) {
        closeList();
        // Pertahankan nomor asli agar daftar bernomor tidak kembali ke 1
        out.push(numbered ? `<ol start="${numbered[1]}">` : '<ul>');
        list = type;
      }
      out.push(`<li>${(bullet || numbered)[numbered ? 2 : 1]}</li>`);
    } else if (!line.trim()) {
      closeList();
    } else {
      closeList();
      out.push(`<p>${line}</p>`);
    }
  }
  closeList();

  return out.join('').replace(/@@BLOCK(\d+)@@/g, (_, i) => blocks[Number(i)]);
}

/* ---------- Chat ---------- */
// Mengembalikan elemen gelembung (.message) agar isinya mudah diganti.
function appendMessage(sender, text, extraClass = '', time = nowTime()) {
  const row = document.createElement('div');
  row.className = `row ${sender}`;

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = sender === 'bot' ? '🤖' : '🙂';

  const col = document.createElement('div');
  col.className = 'col';

  const msg = document.createElement('div');
  msg.classList.add('message', sender);
  if (extraClass) msg.classList.add(extraClass);
  if (sender === 'bot') {
    msg.innerHTML = renderMarkdown(text);
  } else {
    msg.textContent = text;
  }

  const stamp = document.createElement('div');
  stamp.className = 'time';
  stamp.textContent = time;

  col.append(msg, stamp);
  row.append(avatar, col);
  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

function renderHistory() {
  chatBox.innerHTML = '';
  appendMessage('bot', WELCOME);
  conversation.forEach((m) =>
    appendMessage(m.role === 'user' ? 'user' : 'bot', m.text, '', m.ts || '')
  );
}

function renderSuggestions() {
  suggestionsEl.innerHTML = '';
  tryBox.hidden = false;
  SUGGESTIONS.forEach(({ icon, text }) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.innerHTML = `<span class="chip-ico">${icon}</span><span>${escapeHtml(text)}</span>`;
    chip.addEventListener('click', () => sendMessage(text));
    suggestionsEl.appendChild(chip);
  });
}

function setLoading(isLoading) {
  sendBtn.disabled = isLoading;
  input.disabled = isLoading;
  if (!isLoading) input.focus();
}

async function sendMessage(userMessage) {
  const text = userMessage.trim();
  if (!text || sendBtn.disabled) return;

  appendMessage('user', text);
  conversation.push({ role: 'user', text, ts: nowTime() });
  input.value = '';
  setLoading(true);

  const thinking = appendMessage('bot', 'Lagi nyari jajanan buat kamu...', 'thinking');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Backend hanya memerlukan role dan text
      body: JSON.stringify({ conversation: conversation.map(({ role, text }) => ({ role, text })) }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get response from server.');
    }

    thinking.classList.remove('thinking');
    if (data.result) {
      thinking.innerHTML = renderMarkdown(data.result);
      conversation.push({ role: 'model', text: data.result, ts: nowTime() });
      saveConversation();
    } else {
      thinking.textContent = 'Sorry, no response received.';
      conversation.pop(); // buang pesan user yang tidak berbalas agar giliran tetap valid
    }
  } catch (err) {
    console.error(err);
    thinking.classList.remove('thinking');
    thinking.classList.add('error');
    thinking.textContent = 'Failed to get response from server.';
    conversation.pop();
  } finally {
    setLoading(false);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

/* ---------- Panel UMKM ---------- */
const TIPE_ICONS = { Menetap: '🏪', 'Gerobak mangkal': '🛒', Keliling: '🛵' };

const CATEGORY_ICONS = {
  'Makanan berat': '🍛',
  'Makanan khas daerah': '🍲',
  'Makanan khas Bandung': '🥟',
  'Makanan ringan': '🥟',
  'Makanan pedas': '🌶️',
  Camilan: '🍢',
  'Camilan segar': '🥗',
  'Jajanan pasar': '🍡',
  'Jajanan tradisional': '🍙',
  'Jajanan malam': '🌙',
  'Kue dan roti': '🍩',
  'Kue basah': '🧁',
  'Kue dan oleh-oleh': '🎂',
  Gorengan: '🍤',
  Sarapan: '🥣',
  Minuman: '🥤',
  Angkringan: '☕',
};

function iconFor(kategori) {
  return CATEGORY_ICONS[kategori] || '🍽️';
}

function priceRange(menu) {
  const prices = menu.map((m) => m.harga);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  return lo === hi ? rupiah(lo) : `${rupiah(lo)} – ${rupiah(hi)}`;
}

function renderFilters() {
  const counts = {};
  umkmData.forEach((u) => {
    counts[u.kategori] = (counts[u.kategori] || 0) + 1;
  });
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k]) => k);

  filtersEl.innerHTML = '';
  ['Semua', ...top].forEach((cat) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter' + (cat === activeCategory ? ' active' : '');
    btn.textContent = cat === 'Semua' ? 'Semua' : `${iconFor(cat)} ${cat}`;
    btn.addEventListener('click', () => {
      activeCategory = cat;
      renderFilters();
      renderUmkm();
    });
    filtersEl.appendChild(btn);
  });

  const sep = document.createElement('div');
  sep.className = 'filter-sep';
  sep.textContent = 'Tipe usaha:';
  filtersEl.appendChild(sep);

  Object.keys(TIPE_ICONS).forEach((tipe) => {
    const n = umkmData.filter((u) => u.tipe === tipe).length;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter' + (tipe === activeTipe ? ' active' : '');
    btn.textContent = `${TIPE_ICONS[tipe]} ${tipe} (${n})`;
    btn.addEventListener('click', () => {
      activeTipe = activeTipe === tipe ? 'Semua' : tipe;
      renderFilters();
      renderUmkm();
    });
    filtersEl.appendChild(btn);
  });
}

function norm(str) {
  return String(str).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function wordsOf(str) {
  return norm(str).split(/[^a-z0-9]+/).filter(Boolean);
}

// Skor pencarian: setiap kata yang diketik harus cocok dengan AWAL kata di nama usaha,
// menu, kategori, area, atau tipe (bukan potongan di tengah kata, mis. "lilin" != "keliling").
function searchScore(u, tokens) {
  const groups = [
    { w: wordsOf(u.nama_usaha), s: 3 },
    { w: wordsOf(u.menu.map((m) => m.nama).join(' ') + ' ' + u.menu_andalan), s: 2 },
    { w: wordsOf([u.kategori, u.area, u.tipe].join(' ')), s: 1 },
  ];
  let total = 0;
  for (const t of tokens) {
    let best = 0;
    for (const g of groups) {
      if (g.w.some((w) => w.startsWith(t))) best = Math.max(best, g.s);
    }
    if (!best) return 0;
    total += best;
  }
  return total;
}

function renderUmkm() {
  const q = searchUmkmEl.value.trim();
  const tokens = wordsOf(q);
  const items = umkmData
    .map((u) => ({ u, score: tokens.length ? searchScore(u, tokens) : 1 }))
    .filter(({ u, score }) => {
      if (activeCategory !== 'Semua' && u.kategori !== activeCategory) return false;
      if (activeTipe !== 'Semua' && u.tipe !== activeTipe) return false;
      return score > 0;
    })
    .sort((a, b) => b.score - a.score)
    .map(({ u }) => u);

  umkmCountEl.textContent = `${items.length} UMKM`;
  umkmListEl.innerHTML = '';

  if (items.length === 0) {
    umkmListEl.innerHTML = '<div class="empty">Belum ada UMKM yang cocok.</div>';
    showAllEl.hidden = true;
    return;
  }

  const filtered = q || activeCategory !== 'Semua' || activeTipe !== 'Semua';
  const visible = showAll || filtered ? items : items.slice(0, PREVIEW_COUNT);
  showAllEl.hidden = visible.length >= items.length && !showAll;
  showAllEl.textContent = showAll ? 'Tampilkan lebih sedikit ↑' : 'Lihat Semua UMKM →';
  if (filtered) showAllEl.hidden = true;

  visible.forEach((u) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'umkm-card';
    card.innerHTML = `
      <div class="thumb"><img src="${escapeHtml(u.gambar || '')}" alt="${escapeHtml(u.nama_usaha)}" /></div>
      <div class="info">
        <div class="name">${escapeHtml(u.nama_usaha)}</div>
        <div class="meta">📍 ${escapeHtml(u.area)}</div>
        <div class="badges">
          <span class="tipe tipe-${u.tipe === 'Keliling' ? 'keliling' : u.tipe === 'Menetap' ? 'menetap' : 'mangkal'}">${TIPE_ICONS[u.tipe] || ''} ${escapeHtml(u.tipe)}</span>
          ${u.populer ? '<span class="fav">⭐ Favorit</span>' : ''}
        </div>
        ${u.tipe === 'Keliling' ? `<div class="jam" title="${escapeHtml((u.jadwal_keliling || []).map((j) => j.jam + ' ' + j.lokasi).join(' | '))}">🕒 ${escapeHtml(u.jam_buka)}</div>` : ''}
        <div class="price">🏷️ ${priceRange(u.menu)}</div>
      </div>
      <div class="chev">›</div>`;
    card.addEventListener('click', () =>
      sendMessage(`Ceritakan tentang ${u.nama_usaha}: menu, harga, lokasi, jam buka, dan cara pesannya.`)
    );
    const img = card.querySelector('.thumb img');
    // Jika gambar gagal dimuat, tampilkan ikon emoji kategori
    img.addEventListener('error', () => {
      img.parentElement.textContent = iconFor(u.kategori);
    });
    umkmListEl.appendChild(card);
  });
}

async function loadUmkm() {
  try {
    const res = await fetch('/api/umkm');
    const data = await res.json();
    umkmData = data.umkm || [];
    heroCountEl.textContent = umkmData.length;
    renderFilters();
    renderUmkm();
  } catch (err) {
    console.error(err);
    umkmListEl.innerHTML = '<div class="empty">Gagal memuat daftar UMKM.</div>';
  }
}

/* ---------- Tema & dialog ---------- */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeKnobEl.textContent = theme === 'dark' ? '🌙' : '☀️';
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* abaikan */
  }
}

function openInfo(key) {
  infoTitle.textContent = INFO[key].title;
  infoBody.innerHTML = INFO[key].html;
  if (typeof infoDialog.showModal === 'function') infoDialog.showModal();
}

/* ---------- Event ---------- */
searchUmkmEl.addEventListener('input', renderUmkm);

filterToggleEl.addEventListener('click', () => {
  filtersEl.hidden = !filtersEl.hidden;
  filterToggleEl.classList.toggle('on', !filtersEl.hidden);
});

showAllEl.addEventListener('click', () => {
  showAll = !showAll;
  renderUmkm();
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  sendMessage(input.value);
});

resetBtn.addEventListener('click', () => {
  conversation = [];
  saveConversation();
  renderHistory();
  renderSuggestions();
});

themeToggleEl.addEventListener('click', () => {
  applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

document.getElementById('nav-home').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  input.focus();
});
document.getElementById('nav-about').addEventListener('click', () => openInfo('about'));
document.getElementById('nav-help').addEventListener('click', () => openInfo('help'));
document.getElementById('info-close').addEventListener('click', () => infoDialog.close());

/* ---------- Mulai ---------- */
try {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'dark' || savedTheme === 'light') applyTheme(savedTheme);
} catch {
  /* abaikan */
}

renderHistory();
renderSuggestions();
loadUmkm();

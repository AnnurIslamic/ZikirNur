const STATIC_CACHE_NAME = 'zikirnur-static-v3'; // Cache untuk Aset Tetap
const DATA_CACHE_NAME = 'zikirnur-data-v3';     // Cache untuk API (Quran/Jadwal)

// DAFTAR FILE YANG WAJIB DISIMPAN PERMANEN (Pre-Cache)
const FILES_TO_CACHE = [
  './',
  './index.html',
  './dzikirpagi.mp3',     // Audio Dzikir Pagi (Wajib ada di folder project)
  './Dzikirpetang.mp3',   // Audio Dzikir Petang (Wajib ada di folder project)
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css', // Icon
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Playfair+Display:wght@700&display=swap' // Font
];

// 1. SAAT INSTALL: Download & Simpan Semua File Penting Sekaligus
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install & Pre-cache');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Menyimpan Aset Utama (HTML & MP3)...');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting(); // Langsung aktifkan SW baru tanpa nunggu tutup browser
});

// 2. SAAT AKTIF: Bersihkan Cache Versi Lama (Supaya tidak penuh)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== STATIC_CACHE_NAME && key !== DATA_CACHE_NAME) {
          console.log('[ServiceWorker] Hapus cache lama', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// 3. SAAT FETCH: Strategi "Cache First" (Prioritas Offline)
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // A. Strategi untuk API (Al-Qur'an & Jadwal Sholat)
  // Coba ambil online dulu agar data update, kalau gagal (offline) baru ambil cache.
  if (requestUrl.href.includes('api.alquran.cloud') || requestUrl.href.includes('api.aladhan.com') || requestUrl.href.includes('quran-api.santrikoding.com')) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then((cache) => {
        return fetch(event.request)
          .then((response) => {
            // Jika online berhasil, simpan data terbaru ke cache
            if (response.status === 200) {
              cache.put(event.request.url, response.clone());
            }
            return response;
          })
          .catch(() => {
            // Jika OFFLINE, ambil dari cache yang tersimpan
            return cache.match(event.request);
          });
      })
    );
    return;
  }

  // B. Strategi untuk Aset Tetap (HTML, MP3, CSS) -> "Cache First"
  // Cek memori HP dulu. Jika ada, langsung pakai (Super Cepat & Offline).
  // Jika tidak ada, baru download.
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response; // File ditemukan di cache!
      }
      return fetch(event.request); // Gak ada di cache, download dari internet
    })
  );
});

const CACHE_NAME = 'zikirnur-offline-v5';

// Daftar file statis (Shell App) yang WAJIB disimpan agar aplikasi tampil saat offline
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    // CDN Font & Icon (Disimpan agar icon tidak kotak-kotak saat offline)
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Playfair+Display:wght@700&display=swap'
];

// 1. INSTALL: Download dan simpan aset dasar saat pertama kali dibuka
self.addEventListener('install', (event) => {
    console.log('[SW] Install: Mengunduh aset statis...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting(); // Paksa Service Worker baru untuk segera aktif
});

// 2. ACTIVATE: Hapus cache versi lama jika Anda update kode
self.addEventListener('activate', (event) => {
    console.log('[SW] Activate: Membersihkan cache lama...');
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[SW] Menghapus:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim(); // Ambil alih kontrol halaman segera
});

// 3. FETCH: Mengatur lalu lintas data (Kunci Mode Offline)
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // --- A. STRATEGI KHUSUS AL-QUR'AN (Cache First) ---
    // Jika request ke API Quran (JSON Teks), simpan ke cache.
    // Agar saat offline, surat yang pernah dibuka bisa dibaca lagi.
    // Kita kecualikan file .mp3 agar memori HP tidak penuh.
    if (requestUrl.href.includes('api.alquran.cloud') && !requestUrl.href.includes('.mp3')) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    // 1. Jika data sudah ada di cache, kembalikan langsung (Offline Mode Jalan!)
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // 2. Jika tidak ada, ambil dari internet lalu simpan ke cache
                    return fetch(event.request).then((networkResponse) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    }).catch(() => {
                        // Jika internet mati dan data belum ada di cache
                        return new Response(
                            JSON.stringify({ code: 404, status: "Offline: Surat ini belum diunduh." }), 
                            { headers: { 'Content-Type': 'application/json' } }
                        );
                    });
                });
            })
        );
        return;
    }

    // --- B. STRATEGI JADWAL SHOLAT (Network First) ---
    // Prioritaskan data terbaru dari internet. Jika gagal, baru cek cache SW.
    // (Catatan: Aplikasi Anda sudah punya backup "Satpam" Android, ini hanya backup tambahan)
    if (requestUrl.href.includes('api.aladhan.com')) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                })
                .catch(() => {
                    return caches.match(event.request);
                })
        );
        return;
    }

    // --- C. ABAIKAN AUDIO STREAMING ---
    // Jangan cache file MP3 agar tidak membebani storage browser
    if (requestUrl.href.endsWith('.mp3') || requestUrl.href.includes('audio')) {
        return; // Langsung ke internet tanpa lewat SW
    }

    // --- D. STRATEGI DEFAULT (Stale-While-Revalidate) ---
    // Untuk file HTML, CSS, JS lainnya.
    // Ambil dari cache dulu biar cepat (instan), lalu update di background.
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // Update cache dengan versi terbaru dari server
                if(networkResponse && networkResponse.status === 200) {
                     caches.open(CACHE_NAME).then((cache) => {
                         cache.put(event.request, networkResponse.clone());
                     });
                }
                return networkResponse;
            }).catch(() => {
                // Jika fetch gagal (offline), tidak apa-apa, kita sudah return cachedResponse
            });
            
            // Kembalikan cache jika ada, jika tidak tunggu fetch
            return cachedResponse || fetchPromise;
        })
    );
});

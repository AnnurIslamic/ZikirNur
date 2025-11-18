const CACHE_NAME = 'zikirnur-v1';

// Aset statis (HTML, CSS, Manifest)
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Playfair+Display:wght@700&display=swap'
];

// 1. Install: Simpan aset dasar
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching Static Assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// 2. Activate: Hapus cache lama
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim();
});

// 3. Fetch: Strategi Caching Pintar
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // A. KHUSUS API QURAN (Simpan JSON text agar bisa offline)
    // Kita gunakan strategi: Stale-While-Revalidate (Pakai cache dulu, lalu update di background)
    // ATAU Cache-First (karena teks Quran tidak berubah). Kita pakai Cache-First agar cepat.
    if (requestUrl.href.includes('api.alquran.cloud')) {
        
        // Jangan cache file audio MP3, terlalu besar
        if (requestUrl.href.includes('.mp3') || requestUrl.href.includes('audio')) {
            return; // Langsung ke internet
        }

        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((response) => {
                    // Jika ada di cache, kembalikan
                    if (response) {
                        return response;
                    }
                    // Jika tidak, ambil dari internet lalu simpan
                    return fetch(event.request).then((networkResponse) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // B. API Jadwal Sholat (Network First)
    // Data berubah tiap hari/lokasi, jadi utamakan internet.
    if (requestUrl.href.includes('api.aladhan.com')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match(event.request);
            })
        );
        return;
    }

    // C. Default (Aset statis lainnya)
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

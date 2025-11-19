const CACHE_NAME = 'zikirnur-offline-v10';
const ASSETS_TO_CACHE = [
    './',                // Halaman utama
    './index.html',      // File HTML
    './dzikirpagi.mp3',  // Audio
    './Dzikirpetang.mp3' // Audio
    // Tambahkan file icon atau gambar lain jika ada
];

// 1. Install Service Worker & Cache File
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Menyimpan aset offline...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. Activate & Hapus Cache Lama
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// 3. Fetch Strategy (Cache First, Network Fallback)
// Coba ambil dari HP dulu, kalau gak ada baru ke Internet
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Jika ada di cache, pakai itu
            if (response) {
                return response;
            }
            // Jika tidak, ambil dari internet
            return fetch(event.request).catch(() => {
                // Jika internet mati dan file tidak ada di cache
                console.log('Offline dan file tidak ditemukan.');
            });
        })
    );
});

/* ==============================================================
   BOĞAZİÇİ KOLEJİ SİNEMA PLATFORMU — SERVICE WORKER (PWA)
   Version: 1.0.0
   ============================================================== */

const CACHE_NAME = 'bogazici-sinema-v1';

// Uygulamanın çevrimdışı çekirdek dosyaları (App Shell)
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './film_okuma_formu.html',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/apple-touch-icon.png',
    './icons/icon.svg'
];

// 1. INSTALL: Çekirdek dosyaları önbelleğe al ve hemen aktifleş
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(PRECACHE_ASSETS).catch((err) => {
                    console.warn('[SW] Bazı statik varlıklar önbelleğe alınamadı (ihmal edilebilir):', err);
                });
            })
            .then(() => self.skipWaiting())
    );
});

// 2. ACTIVATE: Eski önbellek sürümlerini temizle ve istemcileri devral
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keyList) => {
                return Promise.all(
                    keyList.map((key) => {
                        if (key !== CACHE_NAME) {
                            console.log('[SW] Eski önbellek silindi:', key);
                            return caches.delete(key);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

// 3. FETCH: Ağ ve Önbellek Yönetimi
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // YALNIZCA GET İSTEKLERİNİ YÖNET
    if (request.method !== 'GET') {
        return;
    }

    // -------------------------------------------------------------
    // KRİTİK İSTİSNALAR (ASLA ÖNBELLEĞE ALINMAYACAK / KESİNTİYE UĞRAMAYACAK)
    // -------------------------------------------------------------
    // A) Video Canlı Akışları (Render, Telegram Stream, Localhost 3001)
    if (url.pathname.includes('/stream/') || 
        url.hostname.includes('onrender.com') || 
        url.port === '3001' || 
        url.hostname.includes('localhost:3001')) {
        return;
    }

    // B) Video / Ses / Range İstekleri (Tarayıcının yerel medya motoruna bırakılır)
    if (request.headers.has('range') || 
        request.destination === 'video' || 
        request.destination === 'audio') {
        return;
    }

    // C) Google Apps Script & Giriş Doğrulama İstekleri
    if (url.hostname.includes('script.google.com') || 
        url.hostname.includes('googleusercontent.com')) {
        return;
    }

    // -------------------------------------------------------------
    // STRATEJİ 1: HTML Navigasyon İstekleri (Network-First)
    // Çevrimiçi ise en güncel HTML sayfasını getir, internet yoksa önbellekten sun
    // -------------------------------------------------------------
    if (request.mode === 'navigate' || request.destination === 'document') {
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return networkResponse;
                })
                .catch(async () => {
                    const cached = await caches.match(request);
                    if (cached) return cached;
                    return caches.match('./index.html');
                })
        );
        return;
    }

    // -------------------------------------------------------------
    // STRATEJİ 2: Statik Dosyalar (CSS, JS, Fontlar, Görseller)
    // Stale-While-Revalidate: Önce önbellekten anında ver, arka planda güncelle
    // -------------------------------------------------------------
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const fetchPromise = fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                        const copy = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Ağ hatasında sessizce geç
                });

            return cachedResponse || fetchPromise;
        })
    );
});

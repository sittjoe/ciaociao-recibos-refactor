const CACHE_NAME = 'ciaociao-cache-v1';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './src/home/main.js',
  './receipt/index.html',
  './src/receipt/receipt.js',
  './src/receipt/money.js',
  './src/receipt/history.js',
  './src/receipt/signature.js',
  './src/receipt/state.js',
  './quotation/index.html',
  './src/quotation/quote.js',
  './src/quotation/history.js',
  './src/quotation/state.js',
  './calculator/index.html',
  './src/calculator/calc.js',
  './ticket/index.html',
  './src/ticket/ticket.js',
  './verify/index.html',
  './src/verify/verify.js',
  './src/common/security.js',
  './src/common/templates.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(()=>{})
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null)))
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then(res => res || fetch(req).then(r => {
      const copy = r.clone();
      caches.open(CACHE_NAME).then(c => c.put(req, copy));
      return r;
    }).catch(() => res))
  );
});


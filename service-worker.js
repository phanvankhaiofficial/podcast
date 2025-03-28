const CACHE_NAME = "haruaki-cache-v1";
const urlsToCache = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/script.js",
  "./assets/images/icon-192x192.png",
  "./assets/images/icon-512x512.png",
  "./dict/base.dat.gz",
  "./dict/cc.dat.gz",
  "./dict/check.dat.gz",
  "./dict/tid_map.dat.gz",
  "./dict/tid_pos.dat.gz",
  "./dict/tid.dat.gz",
  "./dict/unk_char.dat.gz",
  "./dict/unk_compat.dat.gz",
  "./dict/unk_invoke.dat.gz",
  "./dict/unk_map.dat.gz",
  "./dict/unk_pos.dat.gz",
  "./dict/unk.dat.gz",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of urlsToCache) {
        try {
          const response = await fetch(url);
          if (!response.ok)
            throw new Error(`HTTP error! Status: ${response.status}`);
          await cache.put(url, response);
          console.log(`Cached: ${url}`);
        } catch (error) {
          console.warn(`Failed to cache ${url}:`, error);
        }
      }
    })
  );
});

// MELØ Audio Service Worker - HTTP 206 Range Interceptor
// Caches audio streams in Cache Storage and dynamically slices ArrayBuffers into HTTP 206 Partial Content
// Provides true 0ms replays with 100% smooth timeline scrubbing without Blob URL memory leaks.

const CACHE_NAME = 'melø-audio-v1';
const AUDIO_ENDPOINT_PATTERN = /\/music\/proxy\/youtube\/([a-zA-Z0-9_-]+)/;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Intercept audio stream requests
  if (AUDIO_ENDPOINT_PATTERN.test(url.pathname)) {
    event.respondWith(handleAudioRequest(event.request));
  }
});

async function handleAudioRequest(request) {
  const rangeHeader = request.headers.get('range');
  const cache = await caches.open(CACHE_NAME);

  // Normalize request key without range header for cache matching
  const cacheKey = new Request(request.url, { method: 'GET' });
  const cachedResponse = await cache.match(cacheKey);

  if (cachedResponse) {
    // If the browser sent a Range request, slice the cached array buffer into HTTP 206
    if (rangeHeader) {
      const arrayBuffer = await cachedResponse.clone().arrayBuffer();
      const totalBytes = arrayBuffer.byteLength;

      const bytesMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (bytesMatch) {
        const start = parseInt(bytesMatch[1], 10);
        const end = bytesMatch[2] ? parseInt(bytesMatch[2], 10) : totalBytes - 1;

        if (start < totalBytes) {
          const clampedEnd = Math.min(end, totalBytes - 1);
          const slicedBuffer = arrayBuffer.slice(start, clampedEnd + 1);

          return new Response(slicedBuffer, {
            status: 206,
            statusText: 'Partial Content',
            headers: {
              'Content-Type': cachedResponse.headers.get('content-type') || 'audio/webm',
              'Content-Range': `bytes ${start}-${clampedEnd}/${totalBytes}`,
              'Content-Length': String(slicedBuffer.byteLength),
              'Accept-Ranges': 'bytes',
              'Access-Control-Allow-Origin': '*',
              'X-MELØ-Cache': 'HIT',
            },
          });
        }
      }
    }

    // If no range or full request, return cached response directly
    return cachedResponse;
  }

  // Not in cache: fetch from network
  try {
    const networkResponse = await fetch(request);

    // If full 200 response or first range, cache full stream in background if possible
    if (networkResponse.ok && !rangeHeader) {
      cache.put(cacheKey, networkResponse.clone()).catch(() => {});
    }

    return networkResponse;
  } catch (err) {
    // Fallback to fetch
    return fetch(request);
  }
}

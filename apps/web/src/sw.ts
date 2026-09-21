import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

// Remove API routes from Serwist's default cache to prevent intercepting music streams
const runtimeCaching = defaultCache.filter((cacheConfig: any) => {
  if (cacheConfig.matcher instanceof RegExp) {
    if (cacheConfig.matcher.test('/api/music/stream/youtube/123')) {
      return false;
    }
  }
  return true;
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: runtimeCaching,
});

serwist.addEventListeners();

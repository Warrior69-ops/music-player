import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { Agent } from 'undici';

export const keepAliveAgent = new Agent({
  keepAliveTimeout: 60000,
  keepAliveMaxTimeout: 120000,
  pipelining: 1,
});

export interface CachedStream {
  url: string;
  headers: Record<string, string>;
  expiresAt: number;
  firstChunk?: Buffer;
  firstChunkHeaders?: Record<string, string>;
  totalLength?: number;
}

export const ANDROID_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-us,en;q=0.5',
  'Sec-Fetch-Mode': 'navigate',
};

type PendingRequest = {
  resolvers: Array<(res: CachedStream | null) => void>;
  rejecters: Array<(err: Error) => void>;
  timer: NodeJS.Timeout;
};

@Injectable()
export class YtDlpDaemonService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(YtDlpDaemonService.name);
  readonly cache = new Map<string, CachedStream>();

  private proc: ChildProcess | null = null;
  private isReady = false;
  private pending = new Map<string, PendingRequest>();
  private readonly queue: Array<{ id: string; priority: 'HIGH' | 'LOW' }> = []; // Items waiting for daemon to be ready
  private lineBuf = '';
  private destroyed = false;
  private restartTimer: NodeJS.Timeout | null = null;
  private activePrefetches = 0;
  private readonly MAX_PARALLEL = 3;

  onModuleInit() {
    this.startDaemon();
  }

  onModuleDestroy() {
    this.destroyed = true;
    if (this.restartTimer) clearTimeout(this.restartTimer);
    if (this.proc) this.proc.kill();
  }

  private startDaemon() {
    if (this.destroyed || (this.proc && !this.proc.killed)) return;

    this.logger.log('Starting Python yt-dlp daemon process...');
    const scriptPath = path.join(
      process.cwd(),
      'src',
      'music',
      'ytdlp-daemon.py',
    );

    // Ensure the script exists
    if (!fs.existsSync(scriptPath)) {
      this.logger.error(`Daemon script not found at ${scriptPath}`);
      return;
    }

    this.isReady = false;
    this.proc = spawn('python', [scriptPath], {
      // stdio: ['pipe', 'pipe', 'pipe']
    });

    this.lineBuf = '';

    this.proc.stdout!.on('data', (data: Buffer) => {
      this.lineBuf += data.toString();
      let nl: number;
      while ((nl = this.lineBuf.indexOf('\n')) >= 0) {
        const line = this.lineBuf.slice(0, nl).trim();
        this.lineBuf = this.lineBuf.slice(nl + 1);
        if (!line) continue;

        if (line === 'READY') {
          this.isReady = true;
          this.logger.log('Python yt-dlp daemon is READY. Flushing queue...');
          this.flushQueue();
          continue;
        }

        const pi = line.indexOf('|');
        if (pi < 0) continue;
        const id = line.slice(0, pi).trim();
        const urlOrError = line.slice(pi + 1).trim();

        const p = this.pending.get(id);
        if (p) {
          this.pending.delete(id);
          clearTimeout(p.timer);

          if (id === 'ERROR') {
            this.logger.error(`[YtDlpDaemon] Python Error: ${urlOrError}`);
            p.resolvers.forEach((resolve) => resolve(null));
            continue;
          }

          if (urlOrError.startsWith('http')) {
            let expiresAt = Date.now() + 2 * 60 * 60 * 1000;
            try {
              const expireParam = new URL(urlOrError).searchParams.get(
                'expire',
              );
              if (expireParam)
                expiresAt = parseInt(expireParam, 10) * 1000 - 5 * 60 * 1000;
            } catch {}

            const entry: CachedStream = {
              url: urlOrError,
              headers: { ...ANDROID_HEADERS },
              expiresAt,
            };
            this.cache.set(id, entry);
            this.logger.log(`[YtDlpDaemon] Successfully extracted ${id}`);
            p.resolvers.forEach((resolve) => resolve(entry));
            this.bufferFirstChunk(entry).catch(() => {});
          } else {
            this.logger.warn(
              `[YtDlpDaemon] Extraction failed for ${id}: ${urlOrError}`,
            );
            p.resolvers.forEach((resolve) => resolve(null));
          }
        }
      }
    });

    this.proc.stderr!.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) this.logger.warn(`[YtDlpDaemon stderr] ${msg}`);
    });

    this.proc.on('exit', (code) => {
      this.logger.warn(
        `[YtDlpDaemon] Process exited with code ${code}, restarting in 1s...`,
      );
      this.isReady = false;

      // Reject all pending
      for (const [id, p] of this.pending) {
        clearTimeout(p.timer);
        p.rejecters.forEach((reject) =>
          reject(new Error(`yt-dlp daemon restarted (was processing ${id})`)),
        );
      }
      this.pending.clear();
      this.proc = null;

      if (!this.destroyed) {
        this.restartTimer = setTimeout(() => this.startDaemon(), 1000);
      }
    });
  }

  private flushQueue() {
    while (this.queue.length > 0 && this.isReady && this.proc) {
      const item = this.queue.shift()!;
      try {
        this.proc.stdin!.write(
          `${item.priority}|https://www.youtube.com/watch?v=${item.id}\n`,
        );
      } catch (e: any) {
        this.logger.error(`[YtDlpDaemon] stdin write failed: ${e.message}`);
      }
    }
  }

  /** Buffers the first 256KB of the stream into Node.js memory for sub-15ms TTFB */
  async bufferFirstChunk(entry: CachedStream): Promise<void> {
    if (entry.firstChunk || !entry.url) return;
    try {
      const upstreamRes = await fetch(entry.url, {
        headers: {
          ...entry.headers,
          Range: 'bytes=0-262143',
        },
        // @ts-ignore
        dispatcher: keepAliveAgent,
      });

      if (upstreamRes.ok || upstreamRes.status === 206) {
        const arrayBuf = await upstreamRes.arrayBuffer();
        entry.firstChunk = Buffer.from(arrayBuf);
        entry.firstChunkHeaders = {};
        upstreamRes.headers.forEach((val, key) => {
          if (
            ['content-type', 'content-range', 'accept-ranges'].includes(
              key.toLowerCase(),
            )
          ) {
            entry.firstChunkHeaders![key.toLowerCase()] = val;
          }
        });
        const contentRange = upstreamRes.headers.get('content-range');
        if (contentRange) {
          const match = contentRange.match(/\/(\d+)$/);
          if (match) entry.totalLength = parseInt(match[1], 10);
        }
        this.logger.debug(
          `Buffered first ${entry.firstChunk.length} bytes for ${entry.url.slice(0, 30)}`,
        );
      }
    } catch (e: any) {
      this.logger.debug(`Failed to buffer first chunk: ${e.message}`);
    }
  }

  /** Background prefetch — silently resolves with LOW priority and buffers first chunk without blocking callers */
  prefetch(videoId: string): Promise<CachedStream | null> {
    if (!videoId) return Promise.resolve(null);
    const existing = this.cache.get(videoId);
    if (existing) {
      if (!existing.firstChunk) {
        this.bufferFirstChunk(existing).catch(() => {});
      }
      return Promise.resolve(existing);
    }

    this.logger.log(
      `[YtDlpDaemon] Prefetching (LOW priority) stream for: ${videoId}`,
    );
    return this.resolve(videoId, 'LOW')
      .then(async (entry) => {
        if (entry) await this.bufferFirstChunk(entry);
        return entry;
      })
      .catch(() => null);
  }

  /** Background batch prefetch — warms up an array of tracks (e.g. all 15 artist top songs) */
  prefetchBatch(videoIds: string[]): void {
    if (!Array.isArray(videoIds) || videoIds.length === 0) return;
    this.logger.log(
      `[YtDlpDaemon] Starting batch prefetch for ${videoIds.length} tracks`,
    );
    videoIds.forEach((id, idx) => {
      if (!id || this.cache.has(id)) return;
      setTimeout(() => {
        this.prefetch(id).catch(() => {});
      }, idx * 150);
    });
  }

  /** Resolve a video ID to a cached stream entry with priority. Coalesces concurrent calls into a single request. */
  async resolve(
    videoId: string,
    priority: 'HIGH' | 'LOW' = 'HIGH',
  ): Promise<CachedStream | null> {
    // 1. Cache hit (< 1ms)
    const cached = this.cache.get(videoId);
    if (cached) {
      if (Date.now() < cached.expiresAt) return cached;
      this.cache.delete(videoId);
    }

    // 2. Coalesce with already in-flight resolution for identical videoId
    if (this.pending.has(videoId)) {
      const p = this.pending.get(videoId)!;
      // If user directly clicked play, bump priority in Python daemon
      if (priority === 'HIGH' && this.isReady && this.proc) {
        try {
          this.proc.stdin!.write(
            `HIGH|https://www.youtube.com/watch?v=${videoId}\n`,
          );
        } catch {}
      }
      return new Promise<CachedStream | null>((res, rej) => {
        p.resolvers.push(res);
        p.rejecters.push(rej);
      });
    }

    // 3. Resident Python yt-dlp multi-threaded daemon (resolves in ~1s, full range-request support)
    if (!this.proc || this.proc.killed) {
      this.startDaemon();
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const p = this.pending.get(videoId);
        this.pending.delete(videoId);
        if (p) {
          p.rejecters.forEach((rej) =>
            rej(new Error(`[YtDlpDaemon] Timeout (20s) for ${videoId}`)),
          );
        }
      }, 20000);

      this.pending.set(videoId, {
        resolvers: [resolve],
        rejecters: [reject],
        timer,
      });

      if (this.isReady && this.proc) {
        try {
          this.proc.stdin!.write(
            `${priority}|https://www.youtube.com/watch?v=${videoId}\n`,
          );
        } catch (e: any) {
          clearTimeout(timer);
          this.pending.delete(videoId);
          reject(new Error(`[YtDlpDaemon] stdin write failed: ${e.message}`));
        }
      } else {
        this.queue.push({ id: videoId, priority });
      }
    });
  }
}

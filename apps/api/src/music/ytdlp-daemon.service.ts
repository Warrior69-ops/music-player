import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface CachedStream {
  url: string;
  headers: Record<string, string>;
  expiresAt: number;
}

export const ANDROID_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-us,en;q=0.5',
  'Sec-Fetch-Mode': 'navigate',
};

type PendingRequest = {
  resolve: (res: CachedStream | null) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
};

@Injectable()
export class YtDlpDaemonService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(YtDlpDaemonService.name);
  readonly cache = new Map<string, CachedStream>();
  
  private proc: ChildProcess | null = null;
  private isReady = false;
  private pending = new Map<string, PendingRequest>();
  private readonly queue: string[] = []; // IDs waiting for daemon to be ready
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
    const scriptPath = path.join(process.cwd(), 'src', 'music', 'ytdlp-daemon.py');
    
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
            p.resolve(null);
            continue;
          }

          if (urlOrError.startsWith('http')) {
            let expiresAt = Date.now() + 2 * 60 * 60 * 1000;
            try {
              const expireParam = new URL(urlOrError).searchParams.get('expire');
              if (expireParam) expiresAt = parseInt(expireParam, 10) * 1000 - 5 * 60 * 1000;
            } catch {}
            
            const entry: CachedStream = { url: urlOrError, headers: { ...ANDROID_HEADERS }, expiresAt };
            this.cache.set(id, entry);
            this.logger.log(`[YtDlpDaemon] Successfully extracted ${id}`);
            p.resolve(entry);
          } else {
             this.logger.warn(`[YtDlpDaemon] Extraction failed for ${id}: ${urlOrError}`);
             p.resolve(null);
          }
        }
      }
    });

    this.proc.stderr!.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) this.logger.warn(`[YtDlpDaemon stderr] ${msg}`);
    });

    this.proc.on('exit', (code) => {
      this.logger.warn(`[YtDlpDaemon] Process exited with code ${code}, restarting in 1s...`);
      this.isReady = false;
      
      // Reject all pending
      for (const [id, p] of this.pending) {
        clearTimeout(p.timer);
        p.reject(new Error(`yt-dlp daemon restarted (was processing ${id})`));
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
      const id = this.queue.shift()!;
      try {
        this.proc.stdin!.write(`https://www.youtube.com/watch?v=${id}\n`);
      } catch (e: any) {
        this.logger.error(`[YtDlpDaemon] stdin write failed: ${e.message}`);
      }
    }
  }

  /** Background prefetch — silently resolves without blocking callers */
  prefetch(videoId: string): void {
    if (!videoId || this.cache.has(videoId) || this.pending.has(videoId) || this.queue.includes(videoId)) return;
    if (this.activePrefetches >= this.MAX_PARALLEL) return;

    this.activePrefetches++;
    this.resolve(videoId)
      .catch(() => {})
      .finally(() => { this.activePrefetches--; });
  }

  /** Resolve a video ID to a cached stream entry. */
  resolve(videoId: string): Promise<CachedStream | null> {
    // Cache hit
    const cached = this.cache.get(videoId);
    if (cached) {
      if (Date.now() < cached.expiresAt) return Promise.resolve(cached);
      this.cache.delete(videoId);
    }

    if (!this.proc || this.proc.killed) {
      this.startDaemon();
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(videoId);
        reject(new Error(`[YtDlpDaemon] Timeout (20s) for ${videoId}`));
      }, 20000);

      this.pending.set(videoId, { resolve, reject, timer });
      
      if (this.isReady && this.proc) {
        try {
          this.proc.stdin!.write(`https://www.youtube.com/watch?v=${videoId}\n`);
        } catch (e: any) {
          clearTimeout(timer);
          this.pending.delete(videoId);
          reject(new Error(`[YtDlpDaemon] stdin write failed: ${e.message}`));
        }
      } else {
        this.queue.push(videoId);
      }
    });
  }
}

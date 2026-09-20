import os
import sys

def _bootstrap_local_deps():
    # Render persists only project files: yt-dlp is vendored into
    # apps/api/python-deps during build (--target). Ensure it's importable
    # regardless of which python runs this script or what the cwd is.
    here = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(os.getcwd(), 'python-deps'),
        os.path.normpath(os.path.join(here, '..', '..', 'python-deps')),
    ]
    for cand in candidates:
        if os.path.isdir(cand) and cand not in sys.path:
            sys.path.insert(0, cand)
            break

_bootstrap_local_deps()

import threading
import queue
import yt_dlp

ydl_opts = {
    'format': '251/140/250/249/bestaudio/18/best',
    'quiet': True,
    'no_warnings': True,
    'skip_download': True,
    'lazy_playlist': True,
    'no_color': True,
    # Render runs on datacenter IPs: the default web client gets
    # "Sign in to confirm you're not a bot". Android clients bypass it.
    'extractor_args': {
        'youtube': {
            'player_client': ['android_music', 'android', 'web'],
        },
    },
}

def _setup_cookies():
    """Optional YouTube auth via YT_COOKIES env var (Netscape cookie file
    content, e.g. exported with 'Get cookies.txt LOCALLY' for youtube.com).
    Authenticated requests pass the datacenter bot check. Returns the
    cookie file path, or None when unset/invalid."""
    data = os.environ.get('YT_COOKIES', '')
    if not data.strip():
        return None
    try:
        import tempfile
        fd, cookie_path = tempfile.mkstemp(prefix='yt-cookies-', suffix='.txt')
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(data)
            if not data.endswith('\n'):
                f.write('\n')
        return cookie_path
    except Exception as e:
        print(f'[daemon] cookie setup failed: {e}', file=sys.stderr, flush=True)
        return None

COOKIE_FILE = _setup_cookies()
if COOKIE_FILE:
    ydl_opts['cookiefile'] = COOKIE_FILE
    # Authenticated: web client works and yields the best (opus) formats.
    ydl_opts['extractor_args']['youtube']['player_client'] = [
        'web', 'android_music', 'android',
    ]
    print('[daemon] using YT_COOKIES authentication', file=sys.stderr, flush=True)

thread_local = threading.local()

def get_ydl():
    if not hasattr(thread_local, 'ydl'):
        thread_local.ydl = yt_dlp.YoutubeDL(ydl_opts)
    return thread_local.ydl

print_lock = threading.Lock()
task_queue = queue.PriorityQueue()

def worker_loop():
    # Pre-warm YoutubeDL instance in this thread
    try:
        get_ydl()
    except Exception:
        pass
        
    while True:
        try:
            priority, _, url = task_queue.get()
            try:
                ydl = get_ydl()
                info = ydl.extract_info(url, download=False)
                vid_id = info.get('id', '')
                stream_url = info.get('url', '')
                with print_lock:
                    print(f"{vid_id}|{stream_url}", flush=True)
            except Exception as e:
                vid_id = ''
                if 'v=' in url:
                    try:
                        vid_id = url.split('v=')[1].split('&')[0]
                    except Exception:
                        pass
                with print_lock:
                    print(f"{vid_id or 'ERROR'}|{str(e)}", flush=True)
            finally:
                task_queue.task_done()
        except Exception:
            pass

NUM_WORKERS = 8
counter = 0
counter_lock = threading.Lock()

# Launch 8 persistent worker threads
for _ in range(NUM_WORKERS):
    t = threading.Thread(target=worker_loop, daemon=True)
    t.start()

print('READY', flush=True)

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    
    priority = 0
    url = line
    if line.startswith('HIGH|'):
        priority = 0
        url = line[5:].strip()
    elif line.startswith('LOW|'):
        priority = 1
        url = line[4:].strip()
    
    with counter_lock:
        counter += 1
        c = counter
        
    task_queue.put((priority, c, url))

import sys
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
}

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

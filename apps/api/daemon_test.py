import sys
import yt_dlp

ydl_opts = {
    'format': '140/bestaudio/best',
    'extractor_args': {'youtube': {'player_client': ['android', 'web']}},
    'quiet': True,
    'no_warnings': True,
}

ydl = yt_dlp.YoutubeDL(ydl_opts)
print('READY', flush=True)

for line in sys.stdin:
    url = line.strip()
    if not url: continue
    try:
        info = ydl.extract_info(url, download=False)
        print(info.get('id', '') + '|' + info.get('url', ''), flush=True)
    except Exception as e:
        print('ERROR|' + str(e), flush=True)

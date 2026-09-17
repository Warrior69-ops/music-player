import { Innertube, UniversalCache, Platform } from 'youtubei.js';
import vm from 'node:vm';

Platform.shim.eval = (data) => {
  const code = typeof data === 'string' ? data : data.output || data;
  return Promise.resolve(new Function(code)());
};

async function test() {
  try {
    const yt = await Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true,
    });
    
    // Attempt to download the audio stream directly using a different client
    const stream = await yt.download('dQw4w9WgXcQ', {
      type: 'audio',
      quality: 'best',
      format: 'any',
      client: 'YTMUSIC'
    });
    
    console.log('Stream resolved (YTMUSIC)!', stream ? 'Yes' : 'No');
  } catch (err) {
    console.error('Error YTMUSIC:', err);
  }
}

test();

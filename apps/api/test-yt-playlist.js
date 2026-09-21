const { Innertube, UniversalCache } = require('youtubei.js');
async function test() {
  const yt = await Innertube.create({cache: new UniversalCache(false)});
  const search = await yt.search('top 100 songs', { type: 'playlist' });
  const firstId = search.playlists.contents[0].id;
  console.log('Valid Playlist ID:', firstId);
  const p = await yt.music.getPlaylist(firstId);
  
  if (p) {
      console.log('init items count:', p.items?.length);
      let list = p;
      let count = p.items?.length || 0;
      let continuations = 0;
      while(list.has_continuation && continuations < 5) {
          list = await list.getContinuation();
          console.log('continuation items:', list.items?.length);
          count += list.items?.length || 0;
          continuations++;
      }
      console.log('total items:', count);
  }
}
test();

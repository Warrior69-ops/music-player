const https = require('https');

https.get('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M', {headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}}, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    // try to find any script containing track data
    const match = data.match(/<script.*?>(.*?)<\/script>/g);
    if (match) {
        match.forEach(script => {
            if (script.includes('application/json')) {
                console.log("Found JSON script", script.substring(0, 150));
            } else if (script.includes('Spotify')) {
                console.log("Found Spotify script", script.substring(0, 150));
            }
        });
    }
  });
});

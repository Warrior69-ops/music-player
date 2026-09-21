const fs = require('fs');
const html = fs.readFileSync('spotify.html', 'utf8');
const jsdom = require('jsdom');
const dom = new jsdom.JSDOM(html);
const doc = dom.window.document;

const metas = doc.querySelectorAll('meta[name="music:song"], meta[property="music:song"]');
console.log('music:song metas:', metas.length);

const allMetas = doc.querySelectorAll('meta');
console.log('total metas:', allMetas.length);

// Just do a regex for song URIs
const uris = html.match(/spotify:track:[a-zA-Z0-9]+/g);
if (uris) {
    const uniqueUris = [...new Set(uris)];
    console.log("Found unique Spotify track URIs:", uniqueUris.length);
}

const https = require('https');
https.get('https://fgsever.ru/', (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const matches = data.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
    if(matches) {
       matches.forEach(m => {
          if(m.toLowerCase().includes('logo')) console.log(m);
       });
    }
  });
});

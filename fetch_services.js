const http = require('http');
http.get('http://localhost:3000/master/all', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('SERVICE TYPES:', parsed.service_types);
    } catch(e) { console.error('Parse error:', e); }
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});

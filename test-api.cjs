const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/dashboard/employees/29/master-profile',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test' // Wait, I need a real admin token to hit it.
  }
};

// Just to see if it's 401 or 404
const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});
req.end();

// Debug test for state save
const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        console.log('Response headers:', JSON.stringify(res.headers));
        console.log('Response status:', res.statusCode);
        console.log('Response body:', body);
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function main() {
  // Step 1: Login
  console.log('=== Step 1: Login ===');
  const loginData = JSON.stringify({ account: 'admin', password: 'test123' });
  const loginResult = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length,
    },
  }, loginData);

  const token = loginResult.data.token;
  console.log('Token obtained:', token.substring(0, 20) + '...');

  // Step 2: Get state
  console.log('\n=== Step 2: Get State ===');
  const stateResult = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/state',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  console.log('State obtained');

  // Step 3: Save state - send exactly what the frontend would send
  console.log('\n=== Step 3: Save State ===');
  const state = stateResult.data.state;
  const savePayload = JSON.stringify({ state });
  console.log('Payload size:', savePayload.length, 'bytes');
  console.log('Payload preview:', savePayload.substring(0, 200));
  
  const saveResult = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/state',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Content-Length': savePayload.length,
    },
  }, savePayload);

  console.log('\n=== Test Complete ===');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

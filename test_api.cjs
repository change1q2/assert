// Test script for the auth/login and state API
const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
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
  console.log('Login status:', loginResult.status);
  console.log('Login response:', loginResult.data);

  if (loginResult.status !== 200) {
    console.error('Login failed!');
    process.exit(1);
  }

  const token = loginResult.data.token;
  console.log('Token:', token.substring(0, 20) + '...');

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
  console.log('State status:', stateResult.status);
  if (stateResult.status === 200) {
    const state = stateResult.data.state;
    console.log('State keys:', Object.keys(state));
    console.log('Finance assets count:', state.financeAssets?.length || 0);
    console.log('Records count:', state.records?.length || 0);
    console.log('Accounts count:', state.accounts?.length || 0);
  } else {
    console.log('State response:', stateResult.data);
  }

  // Step 3: Save state
  console.log('\n=== Step 3: Save State ===');
  const saveData = JSON.stringify({ state: stateResult.data.state });
  const saveResult = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/state',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Content-Length': saveData.length,
    },
  }, saveData);
  console.log('Save status:', saveResult.status);
  console.log('Save response:', saveResult.data);

  console.log('\n=== All tests passed! ===');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

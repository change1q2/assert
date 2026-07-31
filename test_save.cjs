// Simplified test for state save
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
  const token = loginResult.data.token;
  console.log('Token obtained');

  // Step 2: Save state with minimal data
  console.log('\n=== Step 2: Save minimal state ===');
  const minimalState = {
    user: { account: 'admin', name: 'Test', phone: '', email: '', currency: 'CNY' },
    rates: {},
    accounts: [],
    assetClasses: [],
    records: [],
    budgets: [],
    financeAssets: [],
    financeAssetArchives: [],
  };
  const saveData = JSON.stringify({ state: minimalState });
  console.log('Request body length:', saveData.length);
  console.log('Request body preview:', saveData.substring(0, 200));
  
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
  console.log('Save response:', JSON.stringify(saveResult.data, null, 2));
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

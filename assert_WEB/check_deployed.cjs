const https = require('https');

const jsUrl = 'https://lifeassert.online/assets/index-CL-saNoz.js';

https.get(jsUrl, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    // Search for the bond check pattern in the useMemo
    // In minified code, the pattern would be something like:
    // if("债券"===at||"债权类"===l1)return["中债","美债"]
    
    // Find all occurrences of 中债
    const positions = [];
    let idx = 0;
    while ((idx = data.indexOf('中债', idx)) !== -1) {
      positions.push(idx);
      idx++;
    }
    
    console.log('Found 中债 at', positions.length, 'positions');
    
    // Print context around each occurrence
    positions.forEach((pos, i) => {
      const start = Math.max(0, pos - 200);
      const end = Math.min(data.length, pos + 200);
      console.log(`\n=== Occurrence ${i+1} at position ${pos} ===`);
      console.log(data.substring(start, end));
      console.log('---');
    });
    
    // Also check for 港股通 to see the market check
    const hkConnectPos = data.indexOf('港股通');
    if (hkConnectPos > -1) {
      console.log('\n=== 港股通 context ===');
      console.log(data.substring(Math.max(0, hkConnectPos - 200), hkConnectPos + 200));
    }
  });
}).on('error', (e) => console.error('Error:', e.message));

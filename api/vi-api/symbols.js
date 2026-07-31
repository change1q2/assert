export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  res.status(200).json({
    a: [
      { code: '600519', name: '贵州茅台' },
      { code: '000858', name: '五粮液' },
      { code: '601318', name: '中国平安' },
      { code: '300750', name: '宁德时代' },
    ],
    hk: [
      { code: '00700', name: '腾讯控股' },
      { code: '09988', name: '阿里巴巴-W' },
      { code: '01810', name: '小米集团-W' },
      { code: '02259', name: '紫金黄金' },
    ],
    us: [
      { code: 'AAPL', name: '苹果' },
      { code: 'TSM', name: '台积电' },
      { code: 'NVDA', name: '英伟达' },
      { code: 'SNDK', name: '闪迪' },
      { code: 'MU', name: '美光' },
    ],
  });
}

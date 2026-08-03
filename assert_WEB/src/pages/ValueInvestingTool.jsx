import { useState, useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';

// === Simple Markdown Parser (ported from original HTML fallback parser) ===
function inlineMd(s) {
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return s;
}

function buildMdTable(lines) {
  const rows = lines
    .map((l) =>
      l.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim())
    );
  if (rows.length < 2) return '';
  const header = rows[0];
  const body = rows.slice(2);
  let html = '<table><thead><tr>';
  header.forEach((h) => {
    html += '<th>' + inlineMd(h) + '</th>';
  });
  html += '</tr></thead><tbody>';
  body.forEach((r) => {
    html += '<tr>';
    r.forEach((c) => {
      html += '<td>' + inlineMd(c) + '</td>';
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

function parseMd(md) {
  if (!md) return '';
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*---+\s*$/.test(line)) {
      out.push('<hr>');
      i++;
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      out.push('<h' + h[1].length + '>' + inlineMd(h[2]) + '</h' + h[1].length + '>');
      i++;
      continue;
    }
    if (/^>\s/.test(line)) {
      const bq = [];
      while (i < lines.length && /^>\s/.test(lines[i])) {
        bq.push(lines[i].replace(/^>\s/, ''));
        i++;
      }
      out.push('<blockquote>' + parseMd(bq.join('\n')) + '</blockquote>');
      continue;
    }
    if (
      line.indexOf('|') !== -1 &&
      i + 1 < lines.length &&
      /^\s*\|?\s*-{2,}/.test(lines[i + 1])
    ) {
      const tblLines = [line];
      i++;
      i++;
      while (i < lines.length && lines[i].indexOf('|') !== -1) {
        tblLines.push(lines[i]);
        i++;
      }
      out.push(buildMdTable(tblLines));
      continue;
    }
    const ul = [];
    const ol = [];
    while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
      ul.push(lines[i].replace(/^\s*[-*]\s+/, ''));
      i++;
    }
    while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
      ol.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
      i++;
    }
    if (ul.length) {
      out.push(
        '<ul>' +
          ul.map((x) => '<li>' + inlineMd(x) + '</li>').join('') +
          '</ul>'
      );
      continue;
    }
    if (ol.length) {
      out.push(
        '<ol>' +
          ol.map((x) => '<li>' + inlineMd(x) + '</li>').join('') +
          '</ol>'
      );
      continue;
    }
    if (/^```/.test(line)) {
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      out.push('<pre><code>' + codeLines.join('\n') + '</code></pre>');
      continue;
    }
    if (line.trim() !== '') {
      const pLines = [line];
      i++;
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !/^(#{1,4})\s+/.test(lines[i]) &&
        !/^\s*---+\s*$/.test(lines[i]) &&
        !/^>\s/.test(lines[i]) &&
        !/^\s*[-*]\s+/.test(lines[i]) &&
        !/^\s*\d+\.\s+/.test(lines[i]) &&
        !/^```/.test(lines[i])
      ) {
        pLines.push(lines[i]);
        i++;
      }
      out.push('<p>' + inlineMd(pLines.join(' ')) + '</p>');
      continue;
    }
    i++;
  }
  return out.join('\n');
}

// === Constants ===
const MARKET_NAMES = { a: 'A股', hk: '港股', us: '美股' };

const FEATURE_TABS = [
  { key: 'analyze', label: '🔍 实时分析' },
  { key: 'score', label: '⭐ 价值评分' },
  { key: 'compare', label: '⚖️ 对比分析' },
  { key: 'deep', label: '📚 深度报告' },
  { key: 'strategy', label: '📖 策略框架' },
];

const MARKET_TABS = [
  { key: 'a', label: '🇨🇳 A股' },
  { key: 'hk', label: '🇭🇰 港股' },
  { key: 'us', label: '🇺🇸 美股' },
];

const DIM_META = {
  business: { icon: '🏢', name: '生意模式', master: '段永平', color: 'bg-purple-500', max: 30 },
  financial: { icon: '💰', name: '财务质量', master: '巴菲特', color: 'bg-blue-500', max: 25 },
  competition: { icon: '⚔️', name: '竞争格局', master: '芒格', color: 'bg-green-500', max: 25 },
  risk: { icon: '🛡️', name: '风险管理', master: '李录', color: 'bg-orange-500', max: 20 },
};

// === Helper functions ===
function fmtNum(v, prefix = '') {
  if (v == null || v === '-' || v === '' || v === 'N/A') return '-';
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  return prefix + n.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

function gradeClass(grade) {
  if (grade === 'A+' || grade === 'A') return 'vi-grade-a';
  if (grade === 'B') return 'vi-grade-b';
  if (grade === 'C') return 'vi-grade-c';
  return 'vi-grade-d';
}

function gradeColor(grade) {
  if (grade === 'A+') return '#059669';
  if (grade === 'A') return '#10b981';
  if (grade === 'B') return '#3b82f6';
  if (grade === 'C') return '#f59e0b';
  return '#ef4444';
}

function downloadBlob(content, filename, type = 'text/markdown') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// === Scoped styles (prefixed with vi- to avoid global collisions) ===
const STYLES = `
  .vi-loading-dots::after { content: ''; animation: vi-dots 1.5s steps(4, end) infinite; }
  @keyframes vi-dots { 0% { content: '' } 25% { content: '.' } 50% { content: '..' } 75% { content: '...' } }
  .vi-prose h1 { font-size: 1.75rem; font-weight: 700; margin: 1.5rem 0 1rem; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
  .vi-prose h2 { font-size: 1.375rem; font-weight: 700; margin: 1.25rem 0 0.75rem; color: #111827; }
  .vi-prose h3 { font-size: 1.125rem; font-weight: 600; margin: 1rem 0 0.5rem; color: #374151; }
  .vi-prose p { margin: 0.75rem 0; line-height: 1.8; color: #374151; }
  .vi-prose strong { color: #111827; font-weight: 600; }
  .vi-prose ul { list-style: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
  .vi-prose ol { list-style: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
  .vi-prose li { margin: 0.25rem 0; line-height: 1.7; }
  .vi-prose blockquote { border-left: 4px solid #3b82f6; padding: 0.5rem 1rem; margin: 1rem 0; background: #eff6ff; color: #1e40af; }
  .vi-prose table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.875rem; }
  .vi-prose th { background: #f3f4f6; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: left; font-weight: 600; }
  .vi-prose td { border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; }
  .vi-prose hr { border: none; border-top: 2px solid #e5e7eb; margin: 1.5rem 0; }
  .vi-prose code { background: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.875em; }
  .vi-prose pre { background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
  .vi-prose pre code { background: transparent; padding: 0; }
  .vi-prose a { color: #2563eb; text-decoration: underline; }
  .vi-card-gradient { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
  .vi-btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); transition: all 0.2s; }
  .vi-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 10px 25px -5px rgba(102,126,234,0.5); }
  .vi-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .vi-market-tab.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
  .vi-market-tab { transition: all 0.2s; }
  .vi-feature-tab.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
  .vi-feature-tab { transition: all 0.2s; }
  .vi-score-bar { height: 8px; border-radius: 4px; background: #e5e7eb; overflow: hidden; }
  .vi-score-bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
  .vi-grade-a { background: #10b981; }
  .vi-grade-b { background: #3b82f6; }
  .vi-grade-c { background: #f59e0b; }
  .vi-grade-d { background: #ef4444; }
`;

export default function ValueInvestingTool({ onBack }) {
  // --- State ---
  const [market, setMarket] = useState('a');
  const [symbol, setSymbol] = useState('600519');
  const [feature, setFeature] = useState('analyze');
  const [compareStocks, setCompareStocks] = useState([]);
  const [compareMarket, setCompareMarket] = useState('a');
  const [compareSymbol, setCompareSymbol] = useState('');
  const [examples, setExamples] = useState([]);
  const [examplesError, setExamplesError] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [scoreResult, setScoreResult] = useState(null);
  const [compareResult, setCompareResult] = useState(null);
  const [deepResult, setDeepResult] = useState(null);
  const [strategyData, setStrategyData] = useState(null);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [strategyContent, setStrategyContent] = useState('');
  const [strategyError, setStrategyError] = useState('');

  const errorTimerRef = useRef(null);
  const [footerTime] = useState(() => new Date().toLocaleString('zh-CN'));

  // --- Load examples when market changes ---
  const loadExamples = async (mkt) => {
    try {
      const res = await fetch('/api/vi-api/symbols');
      const data = await res.json();
      setExamples(data[mkt] || []);
      setExamplesError(false);
    } catch (e) {
      setExamples([]);
      setExamplesError(true);
    }
  };

  useEffect(() => {
    loadExamples(market);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market]);

  // --- Error timeout cleanup ---
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const showError = (msg) => {
    setError(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setError(''), 5000);
  };

  // --- Clear all results ---
  const clearResults = () => {
    setAnalyzeResult(null);
    setScoreResult(null);
    setCompareResult(null);
    setDeepResult(null);
    setStrategyData(null);
    setStrategyContent('');
    setStrategyError('');
    setActiveSectionId(null);
  };

  // --- Feature / market change handlers ---
  const handleFeatureChange = (f) => {
    setFeature(f);
    setError('');
    clearResults();
    if (f === 'compare') {
      setCompareStocks([]);
    } else if (f === 'strategy') {
      loadStrategy();
    }
  };

  const handleMarketChange = (m) => {
    setMarket(m);
  };

  // --- Execute single-stock action ---
  const executeAction = (overrideSymbol) => {
    const sym = (overrideSymbol ?? symbol).trim();
    if (!sym) return;
    setSymbol(sym);
    if (feature === 'analyze') analyzeStock(sym);
    else if (feature === 'score') scoreStock(sym);
    else if (feature === 'deep') deepReport(sym);
  };

  // --- Compare stock management ---
  const addCompareStock = () => {
    const sym = compareSymbol.trim().toUpperCase();
    if (!sym) return;
    if (compareStocks.length >= 6) {
      showError('最多支持对比6只股票');
      return;
    }
    setCompareStocks([...compareStocks, { market: compareMarket, symbol: sym }]);
    setCompareSymbol('');
  };

  const removeStock = (i) => {
    setCompareStocks(compareStocks.filter((_, idx) => idx !== i));
  };

  // === Analyze ===
  async function analyzeStock(sym) {
    const s = sym ?? symbol;
    setLoading(true);
    clearResults();
    try {
      const res = await fetch('/api/vi-api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market, symbol: s }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '分析失败');
      setLoading(false);
      setAnalyzeResult(data);
    } catch (e) {
      setLoading(false);
      showError(e.message);
    }
  }

  // === Score ===
  async function scoreStock(sym) {
    const s = sym ?? symbol;
    setLoading(true);
    clearResults();
    try {
      const res = await fetch('/api/vi-api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market, symbol: s }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '评分失败');
      setLoading(false);
      setScoreResult(data);
    } catch (e) {
      setLoading(false);
      showError(e.message);
    }
  }

  // === Compare ===
  async function compareStocksFn() {
    if (compareStocks.length < 2) {
      showError('至少需要添加2只股票进行对比');
      return;
    }
    setLoading(true);
    clearResults();
    try {
      const res = await fetch('/api/vi-api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stocks: compareStocks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '对比失败');
      setLoading(false);
      setCompareResult(data);
    } catch (e) {
      setLoading(false);
      showError(e.message);
    }
  }

  // === Deep Report ===
  async function deepReport(sym) {
    const s = sym ?? symbol;
    setLoading(true);
    clearResults();
    try {
      const res = await fetch('/api/vi-api/deep-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market, symbol: s }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '报告生成失败');
      setLoading(false);
      setDeepResult(data);
    } catch (e) {
      setLoading(false);
      showError(e.message);
    }
  }

  const downloadDeepReport = () => {
    if (!deepResult?.report) return;
    downloadBlob(
      deepResult.report,
      `深度研究报告_${symbol}_${new Date().toISOString().slice(0, 10)}.md`
    );
  };

  // === Strategy Framework ===
  async function loadStrategy() {
    setLoading(true);
    try {
      const res = await fetch('/api/vi-api/strategy');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '加载策略框架失败');
      setLoading(false);
      setStrategyData(data);
      if (data.sections && data.sections.length > 0) {
        loadStrategySection(data.sections[0].id);
      }
    } catch (e) {
      setLoading(false);
      showError(e.message);
    }
  }

  async function loadStrategySection(sectionId) {
    setActiveSectionId(sectionId);
    setStrategyError('');
    try {
      const res = await fetch('/api/vi-api/strategy?id=' + sectionId);
      const section = await res.json();
      if (!res.ok) throw new Error(section.error || '加载章节失败');
      setStrategyContent(section.content || '');
    } catch (e) {
      setStrategyError('加载章节失败: ' + e.message);
      setStrategyContent('');
    }
  }

  const downloadStrategy = async () => {
    try {
      const res = await fetch('/api/vi-api/strategy?id=full');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '下载失败');
      downloadBlob(
        data.content,
        `价值投资策略框架_${new Date().toISOString().slice(0, 10)}.md`
      );
    } catch (e) {
      showError('下载失败: ' + e.message);
    }
  };

  // --- Render helpers ---
  const renderPct = (v) => {
    if (v == null || v === '-' || v === '' || v === 'N/A')
      return <span className="text-gray-400">-</span>;
    const n = parseFloat(v);
    if (isNaN(n)) return <span className="text-gray-400">{v}</span>;
    const color = n >= 0 ? 'text-green-500' : 'text-red-500';
    const sign = n >= 0 ? '+' : '';
    return (
      <span className={color + ' font-semibold'}>
        {sign}
        {n.toFixed(2)}%
      </span>
    );
  };

  const actionBtnLabel =
    feature === 'analyze'
      ? '🔍 分析'
      : feature === 'score'
      ? '⭐ 价值评分'
      : feature === 'deep'
      ? '📚 生成报告'
      : '';
  const inputPlaceholder =
    feature === 'analyze'
      ? '输入股票代码 (如: 600519 / 00700 / AAPL)'
      : feature === 'score'
      ? '输入股票代码获取价值投资评分'
      : feature === 'deep'
      ? '输入股票代码生成深度研究报告'
      : '';

  const hasResult =
    analyzeResult || scoreResult || compareResult || deepResult || strategyData;
  const showEmptyState = !loading && !hasResult;

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen">
      <style>{STYLES}</style>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-white rounded-lg transition-colors shadow-sm"
                title="返回"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              📈 AI 投资分析
            </h1>
            <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-600 font-medium">
              内置工具
            </span>
          </div>
          <p className="text-gray-500">价值投资评分 · 对比分析 · 深度研究</p>
          <p className="text-xs text-gray-400 mt-1">
            基于 AkShare 实时数据 · 段永平 / 巴菲特 / 芒格 / 李录
          </p>
        </header>

        {/* Feature Tabs */}
        <div className="flex justify-center gap-2 mb-6">
          {FEATURE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleFeatureChange(tab.key)}
              className={`vi-feature-tab px-5 py-2 rounded-xl font-medium shadow hover:shadow-md ${
                feature === tab.key ? 'active' : 'text-gray-600 bg-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Market Tabs + Input Section (hidden for strategy) */}
        {feature !== 'strategy' && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex gap-2 mb-4">
              {MARKET_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleMarketChange(tab.key)}
                  className={`vi-market-tab px-6 py-2.5 rounded-lg font-medium ${
                    market === tab.key
                      ? 'active'
                      : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Single Stock Input */}
            {feature !== 'compare' && (
              <div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder={inputPlaceholder}
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none transition text-lg font-mono"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') executeAction();
                    }}
                  />
                  <button
                    onClick={() => executeAction()}
                    className="vi-btn-primary px-8 py-3 rounded-xl text-white font-semibold text-lg"
                  >
                    {actionBtnLabel}
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {examplesError ? (
                    <span className="text-xs text-gray-400">加载示例失败</span>
                  ) : (
                    examples.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSymbol(item.code);
                          executeAction(item.code);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-sm hover:bg-indigo-100 transition"
                      >
                        {item.name} ({item.code})
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Compare Input */}
            {feature === 'compare' && (
              <div>
                <div className="space-y-2 mb-4">
                  {compareStocks.length === 0 ? (
                    <div className="text-gray-400 text-sm text-center py-4">
                      请添加至少2只股票进行对比（最多6只）
                    </div>
                  ) : (
                    compareStocks.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 bg-gray-50 rounded-lg p-3"
                      >
                        <span className="text-2xl">📌</span>
                        <div className="flex-1">
                          <span className="font-mono font-semibold text-lg">
                            {s.symbol}
                          </span>
                          <span className="ml-2 text-sm text-gray-500 bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">
                            {MARKET_NAMES[s.market]}
                          </span>
                        </div>
                        <button
                          onClick={() => removeStock(i)}
                          className="text-red-400 hover:text-red-600 text-xl px-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-3 mb-4">
                  <select
                    value={compareMarket}
                    onChange={(e) => setCompareMarket(e.target.value)}
                    className="px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="a">🇨🇳 A股</option>
                    <option value="hk">🇭🇰 港股</option>
                    <option value="us">🇺🇸 美股</option>
                  </select>
                  <input
                    type="text"
                    placeholder="输入股票代码 (如: 600519)"
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none text-lg font-mono"
                    value={compareSymbol}
                    onChange={(e) => setCompareSymbol(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addCompareStock();
                    }}
                  />
                  <button
                    onClick={addCompareStock}
                    className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200"
                  >
                    ➕ 添加
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={compareStocksFn}
                    className="vi-btn-primary flex-1 px-8 py-3 rounded-xl text-white font-semibold text-lg"
                  >
                    ⚖️ 开始对比分析
                  </button>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Error display when input card is hidden (strategy feature) */}
        {feature === 'strategy' && error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-flex items-center gap-2 text-xl text-gray-600">
              <span className="vi-loading-dots">正在获取实时数据并分析</span>
            </div>
            <p className="text-sm text-gray-400 mt-3">
              数据源：AkShare 新浪 · 生成时间取决于网络速度
            </p>
          </div>
        )}

        {/* Analyze Result */}
        {analyzeResult && !loading && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
            <div className="vi-card-gradient px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-white text-xl font-bold">
                  {(analyzeResult.data?.quotes?.[0]?.name ||
                    analyzeResult.symbol) +
                    ' · ' +
                    analyzeResult.symbol}
                </h2>
                <p className="text-white/80 text-sm">
                  数据时间:{' '}
                  {analyzeResult.data?.quotes?.[0]?.datetime ||
                    analyzeResult.timestamp}
                </p>
              </div>
              <div className="text-right text-white">
                <div className="text-3xl font-bold">
                  {fmtNum(analyzeResult.data?.quotes?.[0]?.price, '$')}
                </div>
                <div>{renderPct(analyzeResult.data?.quotes?.[0]?.chg_pct)}</div>
              </div>
            </div>
            <div
              className="vi-prose p-6"
              dangerouslySetInnerHTML={{
                __html: parseMd(analyzeResult.analysis || ''),
              }}
            />
          </div>
        )}

        {/* Score Result */}
        {scoreResult && !loading && (
          <ScoreCard
            data={scoreResult.data || {}}
            scores={scoreResult.scores || {}}
            symbol={scoreResult.symbol}
            timestamp={scoreResult.timestamp}
            renderPct={renderPct}
          />
        )}

        {/* Compare Result */}
        {compareResult && !loading && (
          <CompareTable
            compareResult={compareResult}
            renderPct={renderPct}
          />
        )}

        {/* Deep Report Result */}
        {deepResult && !loading && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
            <div className="vi-card-gradient px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-white text-xl font-bold">
                  {(deepResult.data?.name || deepResult.symbol) +
                    ' · 深度研究报告'}
                </h2>
                <p className="text-white/80 text-sm">
                  评级: {deepResult.scores?.grade}{' '}
                  {deepResult.scores?.total_score}/100 ·{' '}
                  {deepResult.scores?.recommendation}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadDeepReport}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm"
                >
                  📥 下载报告
                </button>
              </div>
            </div>
            <div
              className="vi-prose p-6"
              dangerouslySetInnerHTML={{
                __html: parseMd(deepResult.report || ''),
              }}
            />
          </div>
        )}

        {/* Strategy Framework Result */}
        {strategyData && !loading && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
            <div className="vi-card-gradient px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-white text-xl font-bold">
                  📖 价值投资策略框架
                </h2>
                <p className="text-white/80 text-sm">
                  基于格雷厄姆、巴菲特等大师的经典理论
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadStrategy}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm"
                >
                  📥 下载完整框架
                </button>
              </div>
            </div>
            <div className="border-b px-6 py-3 bg-gray-50">
              <div className="flex flex-wrap gap-2">
                {strategyData.sections?.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => loadStrategySection(sec.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                      activeSectionId === sec.id
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-600'
                        : 'bg-white border-gray-200 hover:border-indigo-400 hover:text-indigo-600'
                    }`}
                  >
                    {sec.icon} {sec.title}
                  </button>
                ))}
              </div>
            </div>
            <div className="vi-prose p-6">
              {strategyError ? (
                <div className="text-red-500">{strategyError}</div>
              ) : (
                <div
                  dangerouslySetInnerHTML={{
                    __html: parseMd(strategyContent),
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {showEmptyState && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-6xl mb-4">💡</div>
            <p className="text-lg">选择功能并输入股票代码开始分析</p>
            <p className="text-sm mt-2">支持 A股 / 港股 / 美股 实时数据</p>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 mt-12 pb-4">
          <p>⚠️ 本工具基于公开数据自动生成分析，仅供参考，不构成投资建议</p>
          <p className="mt-1">数据来源: AkShare · 生成时间: {footerTime}</p>
        </footer>
      </div>
    </div>
  );
}

// === Score Card subcomponent ===
function ScoreCard({ data, scores, symbol, timestamp, renderPct }) {
  const dims = scores.dimensions || {};
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
      {/* Header */}
      <div className="vi-card-gradient px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white text-xl font-bold">
              {(data.name || symbol) + ' · 价值投资评分'}
            </h2>
            <p className="text-white/80 text-sm">
              数据时间: {data.datetime || timestamp}
            </p>
          </div>
          <div className="text-right text-white">
            <div
              className="text-4xl font-bold"
              style={{
                color: gradeColor(scores.grade),
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              {scores.grade}
            </div>
            <div className="text-lg">{scores.total_score}/100</div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-sm text-gray-500">最新价</div>
            <div className="text-xl font-bold">{fmtNum(data.price, '$')}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-sm text-gray-500">涨跌幅</div>
            <div className="text-xl font-bold">{renderPct(data.chg_pct)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-sm text-gray-500">投资建议</div>
            <div
              className={`text-sm font-bold ${gradeClass(
                scores.grade
              )} text-white px-2 py-1 rounded mt-1 inline-block`}
            >
              {scores.recommendation}
            </div>
          </div>
        </div>

        {/* Dimensions bars */}
        <div className="space-y-4">
          {['business', 'financial', 'competition', 'risk'].map((key) => {
            const dim = dims[key] || {};
            const meta = DIM_META[key];
            const pct = ((dim.score || 0) / (dim.max || meta.max)) * 100;
            return (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">
                    {meta.icon} {meta.name}（{meta.master}）
                  </span>
                  <span>
                    {dim.score || 0}/{dim.max || meta.max}
                  </span>
                </div>
                <div className="vi-score-bar">
                  <div
                    className={`vi-score-bar-fill ${meta.color}`}
                    style={{ width: pct + '%' }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Dimension Details */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.keys(dims).map((key) => {
            const dim = dims[key];
            const meta = DIM_META[key] || { icon: '', name: key };
            const details = dim.details || {};
            return (
              <div key={key} className="border rounded-lg p-4">
                <div className="font-semibold mb-3">
                  {meta.icon} {meta.name}{' '}
                  <span className="text-sm text-gray-500">({dim.weight})</span>
                </div>
                {Object.keys(details).map((k) => {
                  const item = details[k];
                  const pct = (item.score / item.max) * 100;
                  return (
                    <div key={k} className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>{k}</span>
                        <span className="text-gray-500">
                          {item.score}/{item.max}
                        </span>
                      </div>
                      <div className="vi-score-bar">
                        <div
                          className="vi-score-bar-fill bg-gray-400"
                          style={{ width: pct + '%' }}
                        />
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {item.reason}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// === Compare Table subcomponent ===
function CompareTable({ compareResult, renderPct }) {
  const results = compareResult.results || [];
  const validResults = results.filter((r) => !r.error);
  let best = null;
  let sorted = [];
  if (validResults.length >= 2) {
    best = validResults.reduce((a, b) =>
      a.scores.total_score > b.scores.total_score ? a : b
    );
    sorted = [...validResults].sort(
      (a, b) => b.scores.total_score - a.scores.total_score
    );
  }
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
      <div className="vi-card-gradient px-6 py-4">
        <h2 className="text-white text-xl font-bold">📊 对比分析结果</h2>
        <p className="text-white/80 text-sm">
          共对比 {compareResult.count} 只股票
        </p>
      </div>
      <div className="overflow-x-auto p-6">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 px-4">股票</th>
              <th className="text-center py-3 px-4">最新价</th>
              <th className="text-center py-3 px-4">涨跌幅</th>
              <th className="text-center py-3 px-4">总分</th>
              <th className="text-center py-3 px-4">评级</th>
              <th className="text-center py-3 px-4">生意模式</th>
              <th className="text-center py-3 px-4">财务质量</th>
              <th className="text-center py-3 px-4">竞争格局</th>
              <th className="text-center py-3 px-4">风险管理</th>
              <th className="text-left py-3 px-4">建议</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              if (r.error) {
                return (
                  <tr key={i} className="border-b">
                    <td
                      colSpan="10"
                      className="py-3 px-4 text-red-500"
                    >
                      {r.symbol} - {r.error}
                    </td>
                  </tr>
                );
              }
              const d = r.data || {};
              const s = r.scores || {};
              const dims = s.dimensions || {};
              return (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="font-mono font-bold">{r.symbol}</div>
                    <div className="text-xs text-gray-500">{d.name || ''}</div>
                    <div className="text-xs text-gray-400">
                      {MARKET_NAMES[r.market]}
                    </div>
                  </td>
                  <td className="text-center py-3 px-4">{fmtNum(d.price, '$')}</td>
                  <td className="text-center py-3 px-4">
                    {renderPct(d.chg_pct)}
                  </td>
                  <td className="text-center py-3 px-4 font-bold text-lg">
                    {s.total_score}
                  </td>
                  <td className="text-center py-3 px-4">
                    <span
                      className="px-2 py-1 rounded text-white font-bold text-sm"
                      style={{ background: gradeColor(s.grade) }}
                    >
                      {s.grade}
                    </span>
                  </td>
                  <td className="text-center py-3 px-4">
                    {dims.business?.score || 0}
                    <span className="text-gray-400 text-sm">/30</span>
                  </td>
                  <td className="text-center py-3 px-4">
                    {dims.financial?.score || 0}
                    <span className="text-gray-400 text-sm">/25</span>
                  </td>
                  <td className="text-center py-3 px-4">
                    {dims.competition?.score || 0}
                    <span className="text-gray-400 text-sm">/25</span>
                  </td>
                  <td className="text-center py-3 px-4">
                    {dims.risk?.score || 0}
                    <span className="text-gray-400 text-sm">/20</span>
                  </td>
                  <td className="py-3 px-4 text-sm">{s.recommendation}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {best && (
        <div className="px-6 pb-6">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4">
            <h3 className="font-bold text-lg mb-3">🏆 对比总结</h3>
            <div className="mb-3">
              <span className="text-sm text-gray-600">综合评分最高：</span>
              <span className="font-bold text-lg">
                {best.data?.name || best.symbol}
              </span>
              <span
                className="ml-2 text-2xl font-bold"
                style={{ color: gradeColor(best.scores.grade) }}
              >
                {best.scores.total_score}分
              </span>
              <span
                className="ml-2 px-2 py-1 rounded text-white text-sm font-bold"
                style={{ background: gradeColor(best.scores.grade) }}
              >
                {best.scores.grade}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              <strong>排名：</strong>
              {sorted
                .map(
                  (r, i) =>
                    `${i + 1}. ${r.data?.name || r.symbol} (${
                      r.scores.total_score
                    }分)`
                )
                .join(' → ')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

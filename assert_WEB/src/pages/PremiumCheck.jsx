import { useState, useEffect, useCallback } from 'react';
import { fetchPremium } from '../api';
import { ArrowUp, ArrowDown, RefreshCw, Search, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';

const mockPremiumData = [
  { code: '159915', direction: '美国', name: '创业板ETF', type: 'ETF', dataType2: '美国标的', applyLimit: 1000000, t0Nav: 2.5678, price: 2.6890, premiumRate: 4.72, canArbitrage: true, status: 'premium', transferRecommend: { level: 'must-sell', text: '必须转出', color: 'red' } },
  { code: '162411', direction: '美国', name: '华宝油气', type: 'LOF', dataType2: '原油', applyLimit: 500000, t0Nav: 0.8923, price: 0.9345, premiumRate: 4.73, canArbitrage: true, status: 'premium', transferRecommend: { level: 'suggest-sell', text: '建议转出', color: 'orange' } },
  { code: '513100', direction: '美国', name: '纳指ETF', type: 'ETF', dataType2: '美国标的', applyLimit: 2000000, t0Nav: 1.2345, price: 1.2456, premiumRate: 0.90, canArbitrage: false, status: 'premium', transferRecommend: { level: 'normal', text: '正常持有', color: 'gray' } },
  { code: '161129', direction: '美国', name: '白银LOF', type: 'LOF', dataType2: '白银', applyLimit: 300000, t0Nav: 1.5678, price: 1.5321, premiumRate: -2.28, canArbitrage: false, status: 'discount', transferRecommend: { level: 'suggest-buy', text: '建议转入', color: 'green-light' } },
  { code: '518880', direction: '商品', name: '黄金ETF', type: 'ETF', dataType2: '黄金', applyLimit: 5000000, t0Nav: 4.5678, price: 4.5432, premiumRate: -0.54, canArbitrage: false, status: 'discount', transferRecommend: { level: 'normal', text: '正常持有', color: 'gray' } },
  { code: '160723', direction: '美国', name: '国投瑞银白银', type: 'LOF', dataType2: '白银', applyLimit: 200000, t0Nav: 0.9876, price: 0.9765, premiumRate: -1.12, canArbitrage: false, status: 'discount', transferRecommend: { level: 'suggest-buy', text: '建议转入', color: 'green-light' } },
  { code: '513500', direction: '美国', name: '标普500ETF', type: 'ETF', dataType2: '美国标的', applyLimit: 3000000, t0Nav: 2.3456, price: 2.3678, premiumRate: 0.95, canArbitrage: false, status: 'premium', transferRecommend: { level: 'normal', text: '正常持有', color: 'gray' } },
  { code: '165513', direction: '商品', name: '原油LOF', type: 'LOF', dataType2: '原油', applyLimit: 100000, t0Nav: 1.2345, price: 1.3000, premiumRate: 5.31, canArbitrage: true, status: 'premium', transferRecommend: { level: 'must-sell', text: '必须转出', color: 'red' } },
  { code: '513300', direction: '美国', name: '中概互联ETF', type: 'ETF', dataType2: '美国标的', applyLimit: 2000000, t0Nav: 1.5678, price: 1.5567, premiumRate: -0.71, canArbitrage: false, status: 'discount', transferRecommend: { level: 'normal', text: '正常持有', color: 'gray' } },
  { code: '164205', direction: '其他国家', name: '德国ETF', type: 'LOF', dataType2: '其他国家标的', applyLimit: 500000, t0Nav: 1.8901, price: 1.8765, premiumRate: -0.72, canArbitrage: false, status: 'discount', transferRecommend: { level: 'normal', text: '正常持有', color: 'gray' } },
];

const dataType2Options = [
  { value: 'all', label: '全部' },
  { value: '美国标的', label: '美国标的' },
  { value: '其他国家标的', label: '其他国家标的' },
  { value: '原油', label: '原油' },
  { value: '黄金', label: '黄金' },
  { value: '白银', label: '白银' },
  { value: '其他商品', label: '其他商品' },
];

const transferRecommendOptions = [
  { value: 'all', label: '全部' },
  { value: 'must-sell', label: '必须转出' },
  { value: 'suggest-sell', label: '建议转出' },
  { value: 'can-sell', label: '可以转出' },
  { value: 'suggest-buy', label: '建议转入' },
  { value: 'strong-buy', label: '强烈转入' },
];

export default function PremiumCheck() {
  const [rows, setRows] = useState(mockPremiumData);
  const [filteredRows, setFilteredRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchedAt, setFetchedAt] = useState('');
  const [source, setSource] = useState('本地缓存');
  
  const [type1Filter, setType1Filter] = useState('all');
  const [dataType2Filter, setDataType2Filter] = useState('all');
  const [arbitrageFilter, setArbitrageFilter] = useState('all');
  const [transferFilter, setTransferFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [quickFilter, setQuickFilter] = useState('all');
  const [query, setQuery] = useState('');
  
  const [sortField, setSortField] = useState('premiumRate');
  const [sortOrder, setSortOrder] = useState('desc');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  
  const [holdings, setHoldings] = useState({});
  const [dataType2Map, setDataType2Map] = useState({});

  const formatPremiumRate = (value) => {
    const number = Number(value) || 0;
    return `${number > 0 ? "+" : ""}${number.toFixed(2)}%`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      premium: { text: '溢价', class: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
      discount: { text: '折价', class: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
      flat: { text: '平价', class: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' },
    };
    const badge = badges[status] || badges.flat;
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.class}`}>
        {badge.text}
      </span>
    );
  };

  const getTransferTag = (recommend) => {
    if (!recommend) return <span className="text-gray-400 text-xs">--</span>;
    const colorClasses = {
      red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
      orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
      yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
      'green-light': 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      green: 'bg-green-200 dark:bg-green-800/30 text-green-700 dark:text-green-300',
      gray: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
    };
    const colorClass = colorClasses[recommend.color] || colorClasses.gray;
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorClass}`} title={recommend.text}>
        {recommend.text}
      </span>
    );
  };

  const getRowColorClass = (row) => {
    const holding = holdings[row.code] || {};
    const amount = Number(holding.amount);
    if (amount > 0) return 'bg-red-50 dark:bg-red-900/10';
    if (amount < 0) return 'bg-green-50 dark:bg-green-900/10';
    if (amount === 0 && holding.ratio !== undefined && holding.ratio !== '') return 'bg-yellow-50 dark:bg-yellow-900/10';
    return '';
  };

  const hasActiveFilters = () => {
    return type1Filter !== 'all' ||
           dataType2Filter !== 'all' ||
           arbitrageFilter !== 'all' ||
           transferFilter !== 'all' ||
           statusFilter !== 'all' ||
           quickFilter !== 'all' ||
           query.trim() !== '';
  };

  const applyFilters = useCallback(() => {
    let result = [...rows];
    
    if (type1Filter !== 'all') {
      result = result.filter(row => row.type === type1Filter);
    }
    
    if (dataType2Filter !== 'all') {
      result = result.filter(row => {
        const rowDataType2 = dataType2Map[row.code] || row.dataType2;
        return rowDataType2 === dataType2Filter;
      });
    }
    
    if (arbitrageFilter === 'yes') {
      result = result.filter(row => row.canArbitrage === true);
    } else if (arbitrageFilter === 'no') {
      result = result.filter(row => row.canArbitrage === false);
    }
    
    if (transferFilter !== 'all') {
      result = result.filter(row => row.transferRecommend?.level === transferFilter);
    }
    
    if (statusFilter === 'premium') {
      result = result.filter(row => row.status === 'premium');
    } else if (statusFilter === 'discount') {
      result = result.filter(row => row.status === 'discount');
    }
    
    if (quickFilter === 'premium') {
      result = result.filter(row => row.status === 'premium');
    } else if (quickFilter === 'arbitrage') {
      result = result.filter(row => row.canArbitrage === true);
    } else if (quickFilter === 'transfer') {
      const levels = ['must-sell', 'suggest-sell', 'can-sell'];
      result = result.filter(row => levels.includes(row.transferRecommend?.level));
    } else if (quickFilter === 'buy') {
      result = result.filter(row => row.premiumRate < 2);
    } else if (quickFilter === 'holding') {
      result = result.filter(row => {
        const holding = holdings[row.code] || {};
        return holding.amount !== undefined && holding.amount !== '' && 
               holding.ratio !== undefined && holding.ratio !== '';
      });
    }
    
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(row => {
        const rowDataType2 = dataType2Map[row.code] || row.dataType2;
        return `${row.code} ${row.name} ${row.direction || ''} ${row.type} ${rowDataType2}`.toLowerCase().includes(q);
      });
    }
    
    result.sort((a, b) => {
      let valueA = a[sortField];
      let valueB = b[sortField];
      if (valueA === null || valueA === undefined) valueA = -Infinity;
      if (valueB === null || valueB === undefined) valueB = -Infinity;
      valueA = Number(valueA);
      valueB = Number(valueB);
      return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
    });
    
    setFilteredRows(result);
    setCurrentPage(1);
  }, [rows, type1Filter, dataType2Filter, arbitrageFilter, transferFilter, statusFilter, quickFilter, query, sortField, sortOrder, holdings, dataType2Map]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const loadPremiumMarket = async (force = false) => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const payload = await fetchPremium(force);
      if (payload.rows && payload.rows.length > 0) {
        setRows(payload.rows);
      }
      if (payload.fetchedAt) {
        setFetchedAt(payload.fetchedAt);
      }
      if (payload.source) {
        setSource(payload.source);
      }
      if (payload.stale) {
        setError('行情源暂时不可用，当前显示最近一次缓存数据。');
      }
    } catch (err) {
      setError('行情获取失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPremiumMarket();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadPremiumMarket(true);
      }
    }, 300000);
    return () => clearInterval(timer);
  }, []);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const updateHolding = (code, field, value) => {
    setHoldings(prev => {
      const current = prev[code] || {};
      const newHolding = { ...current, [field]: value };
      return { ...prev, [code]: newHolding };
    });
  };

  const updateDataType2 = (code, value) => {
    setDataType2Map(prev => ({ ...prev, [code]: value }));
  };

  const resetFilters = () => {
    setType1Filter('all');
    setDataType2Filter('all');
    setArbitrageFilter('all');
    setTransferFilter('all');
    setStatusFilter('all');
    setQuickFilter('all');
    setQuery('');
    setSortField('premiumRate');
    setSortOrder('desc');
    setError('');
  };

  const premiumTargets = rows.filter(r => r.status === 'premium');
  const arbitrageTargets = rows.filter(r => r.canArbitrage);
  const transferTargets = rows.filter(r => {
    const level = r.transferRecommend?.level;
    return level === 'must-sell' || level === 'suggest-sell' || level === 'can-sell';
  });
  const buyTargets = rows.filter(r => r.premiumRate < 2);
  const holdingTargets = rows.filter(r => {
    const h = holdings[r.code] || {};
    return h.amount !== undefined && h.amount !== '' && h.ratio !== undefined && h.ratio !== '';
  });
  const highest = premiumTargets[0] || rows[0];

  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatTime = (timestamp) => {
    if (!timestamp) return '尚未获取';
    return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
  };

  return (
    <div className="p-6">
      <div className="max-w-full mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.history.back()}
              className="text-2xl text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
            >
              ‹
            </button>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">辅助工具 / 行情</p>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">溢价查询</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              每 5 分钟自动刷新
            </span>
            <button
              onClick={() => loadPremiumMarket(true)}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? '刷新中...' : '刷新行情'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
          <button
            onClick={() => setQuickFilter('all')}
            className={`p-3 rounded-xl border transition-all ${quickFilter === 'all' ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 dark:border-indigo-500' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'}`}
          >
            <div className="text-sm text-gray-600 dark:text-gray-400">覆盖标的</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{rows.length}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">ETF / LOF</div>
          </button>
          <button
            onClick={() => setQuickFilter('premium')}
            className={`p-3 rounded-xl border transition-all ${quickFilter === 'premium' ? 'bg-red-50 dark:bg-red-900/30 border-red-500 dark:border-red-500' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'}`}
          >
            <div className="text-sm text-gray-600 dark:text-gray-400">溢价标的</div>
            <div className="text-xl font-bold text-red-600 dark:text-red-400">{premiumTargets.length}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">溢价率高于 0.50%</div>
          </button>
          <button
            onClick={() => setQuickFilter('arbitrage')}
            className={`p-3 rounded-xl border transition-all ${quickFilter === 'arbitrage' ? 'bg-green-50 dark:bg-green-900/30 border-green-500 dark:border-green-500' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'}`}
          >
            <div className="text-sm text-gray-600 dark:text-gray-400">可套利标的</div>
            <div className="text-xl font-bold text-green-600 dark:text-green-400">{arbitrageTargets.length}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">溢价>4%且申购上限≠0</div>
          </button>
          <button
            onClick={() => setQuickFilter('transfer')}
            className={`p-3 rounded-xl border transition-all ${quickFilter === 'transfer' ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-500 dark:border-orange-500' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'}`}
          >
            <div className="text-sm text-gray-600 dark:text-gray-400">建议转仓</div>
            <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{transferTargets.length}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">溢价率>6%</div>
          </button>
          <button
            onClick={() => setQuickFilter('buy')}
            className={`p-3 rounded-xl border transition-all ${quickFilter === 'buy' ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-500' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'}`}
          >
            <div className="text-sm text-gray-600 dark:text-gray-400">建议转入</div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{buyTargets.length}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">溢价率&lt;2%</div>
          </button>
          <button
            onClick={() => setQuickFilter('holding')}
            className={`p-3 rounded-xl border transition-all ${quickFilter === 'holding' ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-500 dark:border-purple-500' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'}`}
          >
            <div className="text-sm text-gray-600 dark:text-gray-400">持有标的</div>
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{holdingTargets.length}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">持有金额和比例均不为 0</div>
          </button>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">最高参考溢价</div>
            <div className={`text-xl font-bold ${highest?.premiumRate >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {highest ? formatPremiumRate(highest.premiumRate) : '--'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {highest ? `${highest.code} ${highest.name}` : '等待行情'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">行情时间</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{formatTime(fetchedAt)}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">{source}</div>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 mb-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-medium text-yellow-800 dark:text-yellow-300">持有颜色说明：</span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-200 dark:bg-red-800"></span>
              <span className="text-yellow-700 dark:text-yellow-400">红色 = 有持仓或加仓（金额 &gt; 0）</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-200 dark:bg-green-800"></span>
              <span className="text-yellow-700 dark:text-yellow-400">绿色 = 减仓操作（金额 &lt; 0）</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-yellow-200 dark:bg-yellow-800"></span>
              <span className="text-yellow-700 dark:text-yellow-400">黄色 = 持仓不变/关注中（金额 = 0，有比例）</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-700"></span>
              <span className="text-yellow-700 dark:text-yellow-400">白色 = 无数据或已清仓（默认）</span>
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-4">
          <div className="flex flex-wrap gap-4 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">类型一</span>
              <select
                value={type1Filter}
                onChange={(e) => setType1Filter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">全部</option>
                <option value="ETF">ETF</option>
                <option value="LOF">LOF</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">数据类型二</span>
              <select
                value={dataType2Filter}
                onChange={(e) => setDataType2Filter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {dataType2Options.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">可套利</span>
              <select
                value={arbitrageFilter}
                onChange={(e) => setArbitrageFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">全部</option>
                <option value="yes">可套利</option>
                <option value="no">不可套利</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">转仓推荐</span>
              <select
                value={transferFilter}
                onChange={(e) => setTransferFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {transferRecommendOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">溢价状态</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">全部</option>
                <option value="premium">溢价</option>
                <option value="discount">折价</option>
              </select>
              {hasActiveFilters() && (
                <button
                  onClick={resetFilters}
                  className="px-3 py-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  还原
                </button>
              )}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索代码、名称、方向或类型"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {error && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-4 text-amber-800 dark:text-amber-300">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider w-12">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">代码</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">投资方向</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">名称</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">类型</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">数据类型二</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">申购上限</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">T0净值模拟</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">现价</th>
                  <th
                    onClick={() => toggleSort('premiumRate')}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer flex items-center gap-1"
                  >
                    实时溢价
                    <ArrowUpDown className={`w-4 h-4 ${sortField === 'premiumRate' ? (sortOrder === 'asc' ? 'rotate-[-180deg]' : '') : 'opacity-30'}`} />
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">是否可套利</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">转仓推荐</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">持有金额</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">持有比例</th>
                </tr>
              </thead>
              <tbody>
                {loading && !rows.length ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      正在获取实时行情...
                    </td>
                  </tr>
                ) : paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      当前条件下暂无标的
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, index) => {
                    const rowDataType2 = dataType2Map[row.code] || row.dataType2;
                    const holding = holdings[row.code] || {};
                    return (
                      <tr
                        key={row.code}
                        className={`border-t border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${getRowColorClass(row)}`}
                      >
                        <td className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400 font-medium">
                          {(currentPage - 1) * pageSize + index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-gray-900 dark:text-white">{row.code}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{row.direction || '--'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-gray-900 dark:text-white">{row.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                            {row.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={rowDataType2}
                            onChange={(e) => updateDataType2(row.code, e.target.value)}
                            className="px-2 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="美国标的">美国标的</option>
                            <option value="其他国家标的">其他国家标的</option>
                            <option value="原油">原油</option>
                            <option value="黄金">黄金</option>
                            <option value="白银">白银</option>
                            <option value="其他商品">其他商品</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {row.applyLimit !== undefined && row.applyLimit !== 0 ? Number(row.applyLimit).toLocaleString() : '--'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {row.t0Nav !== undefined && row.t0Nav !== 0 ? Number(row.t0Nav).toFixed(4) : '--'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-medium text-gray-900 dark:text-white">{Number(row.price).toFixed(4)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold text-lg ${row.premiumRate >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            {formatPremiumRate(row.premiumRate)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.canArbitrage ? (
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                              ✓ 可套利
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                              ✗
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {getTransferTag(row.transferRecommend)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            value={holding.amount || ''}
                            onChange={(e) => updateHolding(row.code, 'amount', e.target.value)}
                            placeholder="输入金额"
                            className="w-20 px-2 py-1 text-right text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            value={holding.ratio || ''}
                            onChange={(e) => updateHolding(row.code, 'ratio', e.target.value)}
                            placeholder="自动计算"
                            step="0.01"
                            min="0"
                            max="100"
                            className="w-20 px-2 py-1 text-right text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">%</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-slate-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredRows.length)} 条，共 {filteredRows.length} 条
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + Math.max(1, currentPage - 2);
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 text-sm rounded ${currentPage === page ? 'bg-indigo-600 text-white' : 'border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors'}`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-gray-500 dark:text-gray-500 leading-relaxed">
          参考溢价率根据公开行情中的实时价格、IOPV、估算净值或最新净值计算，仅用于数据观察，不构成投资建议。跨境品种可能受时差、汇率及净值披露延迟影响。
        </p>
      </div>
    </div>
  );
}

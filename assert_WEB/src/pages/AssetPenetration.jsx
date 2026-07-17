import { useState, useEffect, useMemo, useRef } from 'react';
import { fetchState, saveState, fetchFinanceQuotes, fetchFundNav } from '../api';
import {
  ArrowLeft,
  TrendingUp,
  Wallet,
  PieChart,
  BarChart3,
  Layers,
  ChevronLeft,
  ChevronRight,
  Calendar,
  List,
  Trophy,
  Award,
  Medal,
  ArrowRight,
  RefreshCw,
  Target,
  Clock,
  Activity,
  X,
  HelpCircle,
} from 'lucide-react';

function formatCurrency(value) {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

function formatNum(value) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

function formatPercentage(value) {
  if (value === null || value === undefined) return '—';
  const n = parseFloat(value);
  if (isNaN(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
}

const POS_CLASS = 'text-green-600 dark:text-green-400';
const NEG_CLASS = 'text-red-500 dark:text-red-400';

const PIE_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
  '#F97316',
  '#6366F1',
];

function pnlClass(val) {
  const n = parseFloat(val);
  return isNaN(n) ? '' : (n >= 0 ? POS_CLASS : NEG_CLASS);
}

function RiskMetricCard({ label, value, rank, description, formula, explanation, ranges }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const formatValue = (v) => {
    if (label === '詹森比率') {
      return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
    }
    return v.toFixed(2);
  };
  return (
    <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700/50 dark:to-slate-700 rounded-lg relative">
      <button
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors z-10"
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {showTooltip && (
        <div className="absolute top-8 right-0 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-xl p-3 z-20 text-xs">
          <div className="font-medium text-gray-900 dark:text-white mb-2">{label}</div>
          <div className="text-gray-600 dark:text-gray-400 mb-2">{description}</div>
          <div className="font-mono bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded mb-2 text-green-600">
            {formula}
          </div>
          <div className="text-gray-500 dark:text-gray-400 mb-3">{explanation}</div>
          <div className="border-t border-gray-200 dark:border-slate-600 pt-2">
            <div className="text-gray-500 dark:text-gray-400 mb-1">评价区间：</div>
            {ranges.map((r, i) => (
              <div key={i} className={`flex justify-between ${r.color}`}>
                <span>{r.label}</span>
                <span>{r.range}</span>
              </div>
            ))}
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rotate-45" />
        </div>
      )}
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatValue(value)}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{label}</div>
      <div className="text-xs text-green-600 dark:text-green-400 mt-1">超越{rank}%</div>
    </div>
  );
}

function PieChartSVG({ data, colors, size = 200, onHover, hoveredIndex, onClick }) {
  const radius = size / 2 - 20;
  const centerX = size / 2;
  const centerY = size / 2;
  
  let startAngle = -Math.PI / 2;
  
  const paths = data.map((item, index) => {
    const sliceAngle = (item.percent / 100) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;
    
    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);
    
    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
    
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');
    
    const isHovered = hoveredIndex === index;
    const currentRadius = isHovered ? radius + 8 : radius;
    
    const x1Hover = centerX + currentRadius * Math.cos(startAngle);
    const y1Hover = centerY + currentRadius * Math.sin(startAngle);
    const x2Hover = centerX + currentRadius * Math.cos(endAngle);
    const y2Hover = centerY + currentRadius * Math.sin(endAngle);
    
    const pathDataHover = [
      `M ${centerX} ${centerY}`,
      `L ${x1Hover} ${y1Hover}`,
      `A ${currentRadius} ${currentRadius} 0 ${largeArcFlag} 1 ${x2Hover} ${y2Hover}`,
      'Z'
    ].join(' ');
    
    const midAngle = startAngle + sliceAngle / 2;
    const labelRadius = radius * 0.65;
    const labelX = centerX + labelRadius * Math.cos(midAngle);
    const labelY = centerY + labelRadius * Math.sin(midAngle);
    
    startAngle = endAngle;
    
    return (
      <g key={index}>
        <path
          d={pathDataHover}
          fill={colors[index % colors.length]}
          className="transition-all duration-200 cursor-pointer"
          style={{
            filter: isHovered ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : 'none',
          }}
          onMouseEnter={() => onHover && onHover(index)}
          onMouseLeave={() => onHover && onHover(null)}
          onClick={() => onClick && onClick(index)}
        />
        <path
          d={pathDataHover}
          fill="none"
          stroke="white"
          strokeWidth="2"
        />
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs font-bold fill-white pointer-events-none"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
        >
          {item.name}
        </text>
        <text
          x={labelX}
          y={labelY + 12}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs font-medium fill-white pointer-events-none"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
        >
          {item.percent.toFixed(0)}%
        </text>
      </g>
    );
  });
  
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto">
      {paths}
      <circle
        cx={centerX}
        cy={centerY}
        r={radius * 0.4}
        fill="white"
        className="dark:fill-slate-800"
      />
    </svg>
  );
}

export default function AssetPenetration({ onBack }) {
  const [stateData, setStateData] = useState(null);
  const [quotesMap, setQuotesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [selectedIndex, setSelectedIndex] = useState('sh000001');
  const [indexData, setIndexData] = useState(null);
  const [allIndexData, setAllIndexData] = useState({});
  const [customIndexCode, setCustomIndexCode] = useState('');
  // 搜索下拉相关状态：候选项、加载状态、是否展示下拉
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  // 防抖定时器，避免每次按键都发请求
  const searchTimerRef = useRef(null);
  // 用户自定义指数列表（localStorage 持久化），与内置 indexOptions 合并用于展示与联动
  const [customIndices, setCustomIndices] = useState(() => {
    try {
      const stored = localStorage.getItem('asset_penetration_custom_indices');
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  });
  const [chartType, setChartType] = useState('curve');
  const [analysisView, setAnalysisView] = useState('rate');
  const [selectedAnalysis, setSelectedAnalysis] = useState('');

  const [calendarView, setCalendarView] = useState('day');
  const [calendarChartType, setCalendarChartType] = useState('calendar');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarMode, setCalendarMode] = useState('rate');

  const [stockViewType, setStockViewType] = useState('chart');
  const [pieHoverIndex, setPieHoverIndex] = useState(null);
  const [showCustomTimePicker, setShowCustomTimePicker] = useState(false);
  const [indexHistoryData, setIndexHistoryData] = useState(null);
  const [indexPeriodReturns, setIndexPeriodReturns] = useState({});
  const [tooltip, setTooltip] = useState(null);

  const [positionLevel, setPositionLevel] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [positionData, setPositionData] = useState([]);
  const [selectedPositionItem, setSelectedPositionItem] = useState(null);

  // 资产分类二级钻取（资产类型→资产名称）
  const [assetDrillPath, setAssetDrillPath] = useState([]);
  const [assetPieHoverIndex, setAssetPieHoverIndex] = useState(null);

  // 仓位分析三级钻取导航路径
  // 0级=全部; 1级=资产类型(assetType); 2级=持仓分组(holdingGroup); 3级=资产名称(name)
  const [drillDownPath, setDrillDownPath] = useState([]);
  const [drillHoverIndex, setDrillHoverIndex] = useState(null);

  // 切换 selectedAnalysis 时重置钻取路径
  useEffect(() => {
    setDrillDownPath([]);
    setDrillHoverIndex(null);
  }, [selectedAnalysis]);

  const customTimeRanges = [
    { key: 'week', label: '近一周', days: 7 },
    { key: 'month', label: '近一月', days: 30 },
    { key: 'quarter', label: '近三月', days: 90 },
    { key: 'halfyear', label: '近半年', days: 180 },
    { key: 'year', label: '近一年', days: 365 },
  ];

  // 内置指数：etfCode 为对应的 ETF 代码（用于实际拉取行情），code 为业务标识（selectedIndex）
  const indexOptions = [
    { code: 'sh000001', name: '上证', color: '#3B82F6', etfCode: 'sh530060' },
    { code: 'sz399001', name: '深证', color: '#EF4444', etfCode: 'sz159943' },
    { code: 'sz399006', name: '创业板', color: '#F59E0B', etfCode: 'sz159247' },
    { code: 'sh000016', name: '上证50', color: '#8B5CF6', etfCode: 'sh510100' },
    { code: 'sh000300', name: '沪深300', color: '#EC4899', etfCode: 'sh510360' },
    { code: 'sh000905', name: '中证500', color: '#10B981', etfCode: 'sh510580' },
    { code: 'IXIC', name: '纳斯达克', color: '#0071C5', etfCode: 'sz159660' },
    { code: 'SPX', name: '标普500', color: '#EE3233', etfCode: 'sh513650' },
  ];

  // 合并内置与自定义指数（用于展示与联动）。自定义指数自身代码即作为 etfCode 使用
  const allIndexOptions = useMemo(() => {
    const custom = customIndices.map((c, i) => ({
      code: c.code,
      name: c.name || c.code,
      color: ['#06B6D4', '#A855F7', '#F97316', '#84CC16', '#14B8A6'][i % 5],
      etfCode: c.code,
      custom: true,
    }));
    return [...indexOptions, ...custom];
  }, [customIndices]);

  // 当前选中指数对应的 ETF 代码（内置用映射值，自定义用自身 code）
  const selectedEtfCode = useMemo(() => {
    const option = allIndexOptions.find(o => o.code === selectedIndex);
    return option ? (option.etfCode || option.code) : selectedIndex;
  }, [allIndexOptions, selectedIndex]);

  // 添加自定义指数：rawCode 必填，name 可选（默认 rawCode）；规范化代码、避免重复、加入后选中
  const addCustomIndex = (rawCode, name) => {
    const trimmed = (rawCode || '').trim();
    if (!trimmed) return;
    let code = trimmed;
    const upper = trimmed.toUpperCase();
    // 已是内置指数代码：仅选中、清空输入，不重复添加
    if (indexOptions.some(o => o.code === trimmed || o.code === upper)) {
      setSelectedIndex(indexOptions.find(o => o.code === trimmed || o.code === upper).code);
      setCustomIndexCode('');
      setShowSearchDropdown(false);
      setSearchResults([]);
      return;
    }
    // 规范化国内代码：纯数字 6 位以 6/9 开头补 sh，其他补 sz；已是 sh/sz 开头小写化；IXIC/SPX 保持大写
    if (/^\d{6}$/.test(trimmed)) {
      code = /^[69]/.test(trimmed) ? `sh${trimmed}` : `sz${trimmed}`;
    } else if (/^(sh|sz)\d{6}$/i.test(trimmed)) {
      code = trimmed.toLowerCase();
    } else if (upper === 'IXIC' || upper === 'SPX') {
      code = upper;
    } else if (/^(us)/i.test(trimmed)) {
      code = upper;
    }
    setCustomIndices(prev => {
      if (prev.some(c => c.code === code)) return prev;
      const next = [...prev, { code, name: name || code }];
      try { localStorage.setItem('asset_penetration_custom_indices', JSON.stringify(next)); } catch (_) {}
      return next;
    });
    setSelectedIndex(code);
    setCustomIndexCode('');
    setShowSearchDropdown(false);
    setSearchResults([]);
  };

  // 搜索输入处理：防抖 300ms 调用 /api/finance/lookup，过滤掉 Index 类型，保留 ETF/AStock 等
  const handleSearchInput = (value) => {
    setCustomIndexCode(value);
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    if (!value.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      setShowSearchDropdown(false);
      return;
    }
    setSearchLoading(true);
    setShowSearchDropdown(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/finance/lookup?q=${encodeURIComponent(value.trim())}`);
        const result = await response.json();
        const items = (result.items || [])
          .slice(0, 8);
        setSearchResults(items);
      } catch (err) {
        console.error('Failed to lookup finance:', err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  const removeCustomIndex = (code) => {
    setCustomIndices(prev => {
      const next = prev.filter(c => c.code !== code);
      try { localStorage.setItem('asset_penetration_custom_indices', JSON.stringify(next)); } catch (_) {}
      return next;
    });
    if (selectedIndex === code) setSelectedIndex('sh000001');
  };

  // 根据代码获取展示名称（优先 indexData 实时名称，再查合并列表）
  const getIndexName = (code) => {
    if (indexData && selectedIndex === code && indexData.name) return indexData.name;
    const found = allIndexOptions.find(o => o.code === code);
    return found?.name || code;
  };
  
  const positionDataMock = {
    level1: [
      { name: '股票', value: 65000, percent: 65, children: [
        { name: '大盘股', value: 35000, percent: 53.8, children: [
          { name: '金融', value: 15000, percent: 42.9 },
          { name: '消费', value: 12000, percent: 34.3 },
          { name: '科技', value: 8000, percent: 22.8 },
        ]},
        { name: '小盘股', value: 20000, percent: 30.8, children: [
          { name: '新能源', value: 10000, percent: 50 },
          { name: '医药', value: 6000, percent: 30 },
          { name: '其他', value: 4000, percent: 20 },
        ]},
        { name: '中盘股', value: 10000, percent: 15.4, children: [
          { name: '制造', value: 6000, percent: 60 },
          { name: '周期', value: 4000, percent: 40 },
        ]},
      ]},
      { name: '债券', value: 20000, percent: 20, children: [
        { name: '国债', value: 12000, percent: 60, children: [
          { name: '长期国债', value: 7000, percent: 58.3 },
          { name: '短期国债', value: 5000, percent: 41.7 },
        ]},
        { name: '企业债', value: 8000, percent: 40, children: [
          { name: 'AAA级', value: 5000, percent: 62.5 },
          { name: 'AA级', value: 3000, percent: 37.5 },
        ]},
      ]},
      { name: '基金', value: 10000, percent: 10, children: [
        { name: '股票基金', value: 6000, percent: 60, children: [
          { name: '指数基金', value: 3500, percent: 58.3 },
          { name: '主动基金', value: 2500, percent: 41.7 },
        ]},
        { name: '债券基金', value: 4000, percent: 40, children: [
          { name: '纯债基金', value: 2500, percent: 62.5 },
          { name: '混合基金', value: 1500, percent: 37.5 },
        ]},
      ]},
      { name: '现金', value: 5000, percent: 5, children: [] },
    ],
  };
  
  const getPositionData = (level, parentCategory) => {
    if (level === 1) {
      return positionDataMock.level1;
    } else if (level === 2 && parentCategory) {
      const parent = positionDataMock.level1.find(p => p.name === parentCategory);
      return parent?.children || [];
    } else if (level === 3 && parentCategory) {
      for (const level1 of positionDataMock.level1) {
        const level2 = level1.children?.find(c => c.name === parentCategory);
        if (level2) {
          return level2.children || [];
        }
      }
    }
    return [];
  };
  
  const holdingGroupData = [
    { name: '股票', value: 65000, percent: 65 },
    { name: '基金', value: 20000, percent: 20 },
    { name: '债券', value: 10000, percent: 10 },
    { name: '现金', value: 5000, percent: 5 },
  ];
  
  const buildHierarchicalData = (accounts) => {
    const map = {};
    
    accounts.forEach(item => {
      const l1 = item.categoryL1 || '未分类';
      const l2 = item.categoryL2 || '未分类';
      const l3 = item.categoryL3 || '未分类';
      const l4 = item.categoryL4 || '未分类';
      const value = parseFloat(item.currentValue) || 0;
      
      if (!map[l1]) {
        map[l1] = { value: 0, children: {} };
      }
      map[l1].value += value;
      
      if (!map[l1].children[l2]) {
        map[l1].children[l2] = { value: 0, children: {} };
      }
      map[l1].children[l2].value += value;
      
      if (!map[l1].children[l2].children[l3]) {
        map[l1].children[l2].children[l3] = { value: 0, children: {} };
      }
      map[l1].children[l2].children[l3].value += value;
      
      if (!map[l1].children[l2].children[l3].children[l4]) {
        map[l1].children[l2].children[l3].children[l4] = { value: 0 };
      }
      map[l1].children[l2].children[l3].children[l4].value += value;
    });
    
    const convertToTree = (node, parentValue) => {
      if (!node.children || Object.keys(node.children).length === 0) {
        return {
          name: node.name,
          value: node.value,
          percent: parentValue > 0 ? (node.value / parentValue) * 100 : 0,
        };
      }
      
      const children = Object.entries(node.children).map(([name, child]) => ({
        ...child,
        name,
      })).map(child => convertToTree(child, node.value));
      
      return {
        name: node.name,
        value: node.value,
        percent: parentValue > 0 ? (node.value / parentValue) * 100 : 0,
        children: children.filter(c => c.value > 0),
      };
    };
    
    const totalValue = Object.values(map).reduce((sum, node) => sum + node.value, 0);
    
    return Object.entries(map)
      .map(([name, node]) => ({ ...node, name }))
      .map(node => convertToTree(node, totalValue))
      .filter(n => n.value > 0);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchState();
        setStateData(data || {});
        const assets = data?.financeAssets || [];
        const codes = assets.map(a => a.code).filter(Boolean);
        if (codes.length > 0) {
          const quotes = await fetchFinanceQuotes(codes);
          const map = {};
          (quotes || []).forEach(q => {
            map[q.code] = q;
          });
          setQuotesMap(map);
        }
      } catch (err) {
        console.error('Failed to load state:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const fetchIndexData = async () => {
      try {
        // 使用 ETF 代码拉取行情，但数据归属于 selectedIndex（业务标识）
        const response = await fetch(`/api/finance/index?code=${selectedEtfCode}`);
        const result = await response.json();
        if (result.name) {
          setIndexData({
            name: result.name,
            price: result.price,
            change: result.change,
            changeRate: result.changeRate,
          });
        }
      } catch (err) {
        console.error('Failed to fetch index data:', err);
      }
    };
    fetchIndexData();
  }, [selectedEtfCode]);

  useEffect(() => {
    const fetchAllIndexData = async () => {
      try {
        const data = {};
        for (const option of allIndexOptions) {
          try {
            // 内置指数用 etfCode 拉取，自定义指数用自身 code
            const response = await fetch(`/api/finance/index?code=${option.etfCode || option.code}`);
            const result = await response.json();
            if (result.name) {
              // data 的 key 用 option.code（即 selectedIndex 用的 code）
              data[option.code] = {
                name: result.name,
                price: result.price,
                change: result.change,
                changeRate: result.changeRate,
              };
            }
          } catch (_) {}
        }
        setAllIndexData(data);
      } catch (err) {
        console.error('Failed to fetch all index data:', err);
      }
    };
    fetchAllIndexData();
  }, [customIndices]);

  useEffect(() => {
    const fetchIndexHistory = async () => {
      // 切换指数时先清空旧数据，避免曲线图短暂显示上一只指数的数据
      setIndexHistoryData(null);
      try {
        // 后端 getCSIndexHistory 会自动补 sh/sz 前缀，这里去掉前缀传纯代码
        const code = selectedEtfCode.startsWith('sh') || selectedEtfCode.startsWith('sz')
          ? selectedEtfCode.slice(2)
          : selectedEtfCode;
        // count 值需覆盖完整时间区间（含节假日），实际交易日约 60-70%
        let count;
        switch (timeRange) {
          case 'day': count = 5; break;
          case 'week': count = 10; break;
          case 'month': count = 50; break;
          case 'quarter': count = 120; break;
          case 'halfyear': count = 200; break;
          case 'year': count = 400; break;
          case 'all': count = 1000; break;
          case 'custom': count = 1000; break;
          default: count = 50;
        }
        const response = await fetch(`/api/finance/index-history?code=${code}&count=${count}`);
        const result = await response.json();
        if (result.history && result.history.length > 0) {
          setIndexHistoryData(result);
          const periodReturn = getIndexPeriodReturn(result.history, timeRange);
          setIndexPeriodReturns(prev => ({ ...prev, [selectedIndex]: periodReturn }));
        }
      } catch (err) {
        console.error('Failed to fetch index history:', err);
        setIndexHistoryData(null);
      }
    };
    fetchIndexHistory();
  }, [selectedEtfCode, timeRange]);

  const getDisplayDays = () => {
    switch (timeRange) {
      case 'day': return 5;
      case 'week': return 7;
      case 'month': return 30;
      case 'quarter': return 90;
      case 'halfyear': return 180;
      case 'year': return 365;
      case 'all': return Infinity;
      case 'custom': return Infinity;
      default: return 30;
    }
  };

  function formatDateLabel(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${m}-${day}`;
  }

  function getYieldCurveData(history) {
    if (!history || history.length === 0) return { data: [], labels: [] };

    if (timeRange === 'day') {
      const lastItem = history[history.length - 1];
      const open = parseFloat(lastItem.open) || parseFloat(lastItem.close) || 1;
      const close = parseFloat(lastItem.close) || open;
      const times = ['9:30', '10:30', '11:30', '13:00', '14:00', '15:00'];
      const data = times.map((time, i) => {
        const ratio = i / (times.length - 1);
        const price = open + (close - open) * ratio;
        return {
          date: lastItem.date,
          time,
          open: i === 0 ? open : price,
          close: price,
          high: price,
          low: price,
        };
      });
      return { data, labels: times.map((t, i) => ({ index: i, label: t })) };
    }

    // 根据 timeRange 精确过滤日期范围（历史数据按时间升序排列：最早在前）
    const now = new Date();
    let startDate;
    switch (timeRange) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        startDate.setDate(1);
        break;
      case 'halfyear':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 6);
        startDate.setDate(1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(0);
    }

    const filtered = (timeRange === 'day' || timeRange === 'week' || timeRange === 'all' || timeRange === 'custom')
      ? [...history]
      : history.filter(h => new Date(h.date) >= startDate);
    const data = filtered.map(item => ({ ...item }));

    let labels = [];
    if (timeRange === 'month') {
      // 本月：均匀分布约6个标签（首尾固定）
      const targetCount = 6;
      if (data.length <= targetCount) {
        data.forEach((item, i) => labels.push({ index: i, label: formatDateLabel(item.date) }));
      } else {
        const step = (data.length - 1) / (targetCount - 1);
        for (let k = 0; k < targetCount; k++) {
          const idx = Math.round(k * step);
          labels.push({ index: idx, label: formatDateLabel(data[idx].date) });
        }
      }
    } else if (timeRange === 'quarter' || timeRange === 'halfyear') {
      // 近三月/近半年：每个月的1号（按用户期望显示 MM-01）+ 今日（数据最后一天）
      const monthStartIndices = {}; // 月份 -> 该月第一个数据 index
      data.forEach((item, i) => {
        const d = new Date(item.date);
        const mKey = `${d.getFullYear()}-${d.getMonth()}`;
        if (!(mKey in monthStartIndices)) {
          monthStartIndices[mKey] = i;
        }
      });
      // 按月份顺序输出每月首日标签（显示为 MM-01，x 坐标定位到该月首条数据）
      const sortedKeys = Object.keys(monthStartIndices).sort((a, b) => {
        const [ay, am] = a.split('-').map(Number);
        const [by, bm] = b.split('-').map(Number);
        return ay !== by ? ay - by : am - bm;
      });
      sortedKeys.forEach(k => {
        const [, m] = k.split('-').map(Number);
        const idx = monthStartIndices[k];
        const mLabel = String(m + 1).padStart(2, '0') + '-01';
        labels.push({ index: idx, label: mLabel });
      });
      // 追加今日（数据最后一天）作为末端标签
      if (data.length > 0) {
        const lastIdx = data.length - 1;
        const lastLabel = formatDateLabel(data[lastIdx].date);
        const existing = labels.find(l => l.index === lastIdx);
        if (!existing) {
          labels.push({ index: lastIdx, label: lastLabel });
        }
      }
    } else if (timeRange === 'year') {
      // 今年：每月1号标签（硬编码 MM-01，定位到该月首条数据）+ 今日
      const nowYear = new Date().getFullYear();
      const monthStartIndices = {};
      data.forEach((item, i) => {
        const d = new Date(item.date);
        if (d.getFullYear() === nowYear) {
          const mKey = `${nowYear}-${d.getMonth()}`;
          if (!(mKey in monthStartIndices)) {
            monthStartIndices[mKey] = i;
          }
        }
      });
      const sortedKeys = Object.keys(monthStartIndices).sort((a, b) => {
        const [ay, am] = a.split('-').map(Number);
        const [by, bm] = b.split('-').map(Number);
        return ay !== by ? ay - by : am - bm;
      });
      sortedKeys.forEach(k => {
        const [, m] = k.split('-').map(Number);
        const idx = monthStartIndices[k];
        const mLabel = String(m + 1).padStart(2, '0') + '-01';
        labels.push({ index: idx, label: mLabel });
      });
      // 追加今日（数据最后一天）
      if (data.length > 0) {
        const lastIdx = data.length - 1;
        const lastLabel = formatDateLabel(data[lastIdx].date);
        const existing = labels.find(l => l.index === lastIdx);
        if (!existing) {
          labels.push({ index: lastIdx, label: lastLabel });
        }
      }
    } else if (timeRange === 'all' || timeRange === 'custom') {
      const seen = new Set();
      data.forEach((item, i) => {
        const d = new Date(item.date);
        if (d.getDate() === 1) {
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          if (!seen.has(key)) {
            labels.push({ index: i, label: formatDateLabel(item.date) });
            seen.add(key);
          }
        }
      });
    } else {
      labels = data.map((item, i) => ({ index: i, label: formatDateLabel(item.date) }));
    }

    if (labels.length === 0 && data.length > 0) {
      labels = [
        { index: 0, label: formatDateLabel(data[0].date) },
        { index: data.length - 1, label: formatDateLabel(data[data.length - 1].date) },
      ];
    }

    return { data, labels };
  }

  function getYAxisStep(range) {
    const absRange = Math.abs(range);
    if (absRange <= 10) return 1;
    if (absRange <= 20) return 5;
    if (absRange <= 40) return 10;
    if (absRange <= 100) return 20;
    return 50;
  }

  function getYAxisTicks(minVal, maxVal) {
    const range = maxVal - minVal;
    const step = getYAxisStep(range);
    const ticks = [];
    const start = Math.ceil(minVal / step) * step;
    const end = Math.floor(maxVal / step) * step;
    for (let v = start; v <= end; v += step) {
      if (Math.abs(v) < step / 2) {
        ticks.push(0);
      } else {
        ticks.push(v);
      }
    }
    const deduped = [...new Set(ticks)];
    const hasZero = deduped.some(t => t === 0);
    if (!hasZero && minVal < 0 && maxVal > 0) {
      deduped.push(0);
      deduped.sort((a, b) => a - b);
    }
    return deduped;
  }

  function getIndexPeriodReturn(history, timeRange) {
    if (!history || history.length === 0) return 0;
    const now = new Date();
    let startDate;
    switch (timeRange) {
      case 'day': startDate = new Date(now); break;
      case 'week': startDate = new Date(now); startDate.setDate(now.getDate() - 7); break;
      case 'month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'quarter': startDate = new Date(now); startDate.setMonth(now.getMonth() - 3); break;
      case 'halfyear': startDate = new Date(now); startDate.setMonth(now.getMonth() - 6); break;
      case 'year': startDate = new Date(now.getFullYear(), 0, 1); break;
      default: startDate = new Date(history[0].date); break;
    }
    // 找起始日之后第一个数据点
    const startItem = history.find(h => new Date(h.date) >= startDate) || history[0];
    const endItem = history[history.length - 1];
    const startClose = parseFloat(startItem.close) || 1;
    const endClose = parseFloat(endItem.close) || startClose;
    return ((endClose - startClose) / startClose) * 100;
  }

  const financeAssets = stateData?.financeAssets || [];
  const accounts = stateData?.accounts || [];

  const financeAccounts = useMemo(() => {
    return (financeAssets || []).map(a => {
      const _price = parseFloat(quotesMap[a.code]?.price) || parseFloat(a.currentPrice) || 0;
      const _cost = parseFloat(a.costPrice || a.cost) || 0;
      const _qty = parseFloat(a.shares) || parseFloat(a.quantity) || 0;
      const _unitPnl = _price - _cost;
      const _holdingPnl = _unitPnl * _qty;
      // 当日盈亏：与 Finance.jsx 的 getDailyPnl 保持一致
      // 1) 优先使用实时行情 (price - prevClose) * qty
      // 2) 其次使用资产自身存储的 prevPrice/currentPrice 计算（场外基金）
      // 3) 最后回退到资产字段 todayPnl / dailyPnl
      let _dailyPnl = 0;
      const _quote = quotesMap[a.code];
      if (_quote && _quote.price != null && _quote.prevClose != null) {
        _dailyPnl = (parseFloat(_quote.price) - parseFloat(_quote.prevClose)) * _qty;
      } else {
        const _prevPrice = parseFloat(a.prevPrice) || 0;
        const _currPrice = parseFloat(a.currentPrice) || 0;
        if (_prevPrice > 0 && _currPrice > 0) {
          _dailyPnl = (_currPrice - _prevPrice) * _qty;
        } else {
          _dailyPnl = parseFloat(a.todayPnl) || parseFloat(a.dailyPnl) || 0;
        }
      }
      let _dailyPnlRate = parseFloat(a.dailyPnlRate) || 0;
      if (_dailyPnlRate === 0 && _dailyPnl !== 0) {
        const totalCost = _cost * _qty;
        if (totalCost > 0) {
          _dailyPnlRate = (_dailyPnl / totalCost) * 100;
        }
      }
      return {
        ...a,
        cost: _cost,
        quantity: _qty,
        currentPrice: _price,
        currentValue: _price * _qty,
        holdingPnl: _holdingPnl,
        holdingPnlRate: _cost > 0 ? (_unitPnl / _cost) * 100 : 0,
        dailyPnl: _dailyPnl,
        dailyPnlRate: _dailyPnlRate,
      };
    });
  }, [financeAssets, quotesMap]);

  const positionPieData = useMemo(() => {
    const groups = {};
    financeAssets.forEach(a => {
      const cat = a.categoryL1 || '未分类';
      if (!groups[cat]) groups[cat] = 0;
      groups[cat] += parseFloat(a.currentValue) || 0;
    });
    const total = Object.values(groups).reduce((s, v) => s + v, 0);
    return Object.entries(groups).map(([name, value]) => ({
      name, value, percent: total > 0 ? (value / total * 100).toFixed(2) : 0
    })).sort((a, b) => b.value - a.value);
  }, [financeAssets]);

  // 仓位分析三级钻取数据计算
  // 路径: 0级=全部  1级=按categoryL1一级分类  2级=按assetType资产类型  3级=按资产名称
  const drilldownPieData = useMemo(() => {
    if (drillDownPath.length >= 3) return [];
    const filtered = filterAccountsByPath(financeAccounts, drillDownPath);
    // 盈亏按时间范围缩放（市值不变，仅盈亏变）
    const pnlRatio = timeRange === 'day'
      ? (totalPnl !== 0 ? totalDailyPnl / totalPnl : 0)
      : getTimePnlRatio();
    const scalePnl = (holdingPnl, cost) => {
      if (timeRange === 'day') {
        // 当日模式：按持仓市值比例分配当日总盈亏
        const pct = cost > 0 ? holdingPnl / (totalPnl || 1) : 0;
        return totalDailyPnl * pct;
      }
      return holdingPnl * pnlRatio;
    };
    const scalePnlRate = (rate) => rate * pnlRatio;
    if (drillDownPath.length === 0) {
      // 第一级：按 categoryL1（一级分类）分组
      const groups = {};
      filtered.forEach(a => {
        const key = a.categoryL1 || a.category || '未分类';
        if (!groups[key]) groups[key] = { value: 0, cost: 0, pnl: 0 };
        groups[key].value += parseFloat(a.currentValue) || 0;
        groups[key].cost += (a.cost || 0) * (a.quantity || 0);
        groups[key].pnl += parseFloat(a.holdingPnl) || 0;
      });
      const total = Object.values(groups).reduce((s, d) => s + d.value, 0);
      return Object.entries(groups)
        .map(([name, data]) => ({
          name,
          value: data.value,
          cost: data.cost,
          pnl: scalePnl(data.pnl, data.cost),
          percent: total > 0 ? (data.value / total) * 100 : 0,
          pnlRate: scalePnlRate(data.cost > 0 ? (data.pnl / data.cost) * 100 : 0),
        }))
        .sort((a, b) => b.value - a.value);
    } else if (drillDownPath.length === 1) {
      // 第二级：按 assetType（资产类型）分组
      const groups = {};
      filtered.forEach(a => {
        const key = a.assetType || a.kind || '其他';
        if (!groups[key]) groups[key] = { value: 0, cost: 0, pnl: 0 };
        groups[key].value += parseFloat(a.currentValue) || 0;
        groups[key].cost += (a.cost || 0) * (a.quantity || 0);
        groups[key].pnl += parseFloat(a.holdingPnl) || 0;
      });
      const total = Object.values(groups).reduce((s, d) => s + d.value, 0);
      return Object.entries(groups)
        .map(([name, data]) => ({
          name,
          value: data.value,
          cost: data.cost,
          pnl: scalePnl(data.pnl, data.cost),
          percent: total > 0 ? (data.value / total) * 100 : 0,
          pnlRate: scalePnlRate(data.cost > 0 ? (data.pnl / data.cost) * 100 : 0),
        }))
        .sort((a, b) => b.value - a.value);
    } else {
      // 第三级：按资产名称分组（聚合同名资产）
      const groups = {};
      filtered.forEach(a => {
        const key = a.name || a.code || '未命名';
        if (!groups[key]) {
          groups[key] = { value: 0, cost: 0, pnl: 0, code: a.code, item: a };
        }
        groups[key].value += parseFloat(a.currentValue) || 0;
        groups[key].cost += (a.cost || 0) * (a.quantity || 0);
        groups[key].pnl += parseFloat(a.holdingPnl) || 0;
      });
      const total = Object.values(groups).reduce((s, d) => s + d.value, 0);
      return Object.entries(groups)
        .map(([name, data]) => ({
          name,
          code: data.code,
          value: data.value,
          cost: data.cost,
          pnl: scalePnl(data.pnl, data.cost),
          percent: total > 0 ? (data.value / total) * 100 : 0,
          pnlRate: scalePnlRate(data.cost > 0 ? (data.pnl / data.cost) * 100 : 0),
        }))
        .sort((a, b) => b.value - a.value);
    }
  }, [financeAccounts, drillDownPath, timeRange, totalPnl, totalDailyPnl, getTimePnlRatio]);

  // 按路径过滤持仓明细
  function filterAccountsByPath(accounts, path) {
    return accounts.filter(a => {
      if (path.length >= 1 && (a.categoryL1 || a.category || '未分类') !== path[0]) return false;
      if (path.length >= 2 && (a.assetType || a.kind || '其他') !== path[1]) return false;
      return true;
    });
  }

  // 资产分类饼图数据（三级钻取）
  // 路径：0级=全部; 1级=一级分类(categoryL1); 2级=资产类型(assetType); 3级=资产名称(name)
  const assetCategoryPieData = useMemo(() => {
    if (assetDrillPath.length >= 3) return [];
    const filtered = financeAccounts.filter(a => {
      if (assetDrillPath.length >= 1 && (a.categoryL1 || '未分类') !== assetDrillPath[0]) return false;
      if (assetDrillPath.length >= 2 && (a.assetType || '其他') !== assetDrillPath[1]) return false;
      return true;
    });
    
    if (assetDrillPath.length === 0) {
      // 第一级：按 categoryL1（一级分类）分组
      const groups = {};
      filtered.forEach(a => {
        const key = a.categoryL1 || '未分类';
        if (!groups[key]) groups[key] = 0;
        groups[key] += parseFloat(a.currentValue) || 0;
      });
      const total = Object.values(groups).reduce((s, v) => s + v, 0);
      return Object.entries(groups)
        .map(([name, value]) => ({
          name,
          value,
          percent: total > 0 ? (value / total) * 100 : 0,
        }))
        .sort((a, b) => b.value - a.value);
    } else if (assetDrillPath.length === 1) {
      // 第二级：按 assetType（资产类型）分组
      const groups = {};
      filtered.forEach(a => {
        const key = a.assetType || '其他';
        if (!groups[key]) groups[key] = 0;
        groups[key] += parseFloat(a.currentValue) || 0;
      });
      const total = Object.values(groups).reduce((s, v) => s + v, 0);
      return Object.entries(groups)
        .map(([name, value]) => ({
          name,
          value,
          percent: total > 0 ? (value / total) * 100 : 0,
        }))
        .sort((a, b) => b.value - a.value);
    } else {
      // 第三级：按资产名称分组
      const groups = {};
      filtered.forEach(a => {
        const key = a.name || a.code || '未命名';
        if (!groups[key]) {
          groups[key] = { value: 0, code: a.code };
        }
        groups[key].value += parseFloat(a.currentValue) || 0;
      });
      const total = Object.values(groups).reduce((s, d) => s + d.value, 0);
      return Object.entries(groups)
        .map(([name, data]) => ({
          name,
          value: data.value,
          code: data.code,
          percent: total > 0 ? (data.value / total) * 100 : 0,
        }))
        .sort((a, b) => b.value - a.value);
    }
  }, [financeAccounts, assetDrillPath]);

  const sortedStockData = useMemo(() => {
    return [...financeAccounts].sort((a, b) => b.holdingPnl - a.holdingPnl);
  }, [financeAccounts]);

  const totalValue = useMemo(() => {
    return financeAccounts.reduce((sum, item) => {
      return sum + (parseFloat(item.currentValue) || 0);
    }, 0);
  }, [financeAccounts]);

  const totalCost = useMemo(() => {
    return financeAccounts.reduce((sum, item) => {
      return sum + item.cost * item.quantity;
    }, 0);
  }, [financeAccounts]);

  const totalPnl = useMemo(() => {
    return financeAccounts.reduce((sum, item) => {
      return sum + (parseFloat(item.holdingPnl) || 0);
    }, 0);
  }, [financeAccounts]);

  const totalPnlRate = useMemo(() => {
    return totalCost > 0 ? (totalValue - totalCost) / totalCost * 100 : 0;
  }, [totalValue, totalCost]);

  const totalDailyPnl = useMemo(() => {
    return financeAccounts.reduce((sum, item) => {
      return sum + (parseFloat(item.dailyPnl) || 0);
    }, 0);
  }, [financeAccounts]);

  const totalDailyPnlRate = useMemo(() => {
    return totalValue > 0 ? (totalDailyPnl / totalValue) * 100 : 0;
  }, [totalValue, totalDailyPnl]);

  // riskMetrics 必须放在 totalPnl/totalPnlRate 之后以避免 TDZ 错误
  const riskMetrics = useMemo(() => {
    const Rp = (totalPnlRate || 0) / 100;
    const Rf = 0.02;
    const dailyReturns = financeAccounts.map(a => (a.dailyPnlRate || 0) / 100);
    const meanDailyReturn = dailyReturns.reduce((s, r) => s + r, 0) / (dailyReturns.length || 1);
    const variance = dailyReturns.reduce((s, r) => s + Math.pow(r - meanDailyReturn, 2), 0) / (dailyReturns.length || 1) || 0.0001;
    const stdDev = Math.sqrt(variance);
    const annualStdDev = stdDev * Math.sqrt(252);
    const sharpe = annualStdDev > 0 ? (Rp - Rf) / annualStdDev : 0;
    const sharpeRank = Math.min(99.99, Math.max(0, 50 + Math.abs(sharpe) * 20));
    const marketReturn = 0.05;
    const beta = 0.85;
    const jensen = (Rp - (Rf + beta * (marketReturn - Rf))) * 100;
    const jensenRank = Math.min(99.99, Math.max(0, 50 + Math.abs(jensen) * 8));
    const treynor = beta > 0 ? (Rp - Rf) / beta : 0;
    const treynorRank = Math.min(99.99, Math.max(0, 50 + Math.abs(treynor) * 300));
    const trackingError = Math.max(0.01, stdDev * 0.8);
    const info = trackingError > 0 ? (Rp - marketReturn) / trackingError : 0;
    const infoRank = Math.min(99.99, Math.max(0, 50 + Math.abs(info) * 100));
    return {
      sharpe: Math.max(-5, Math.min(10, sharpe)),
      sharpeRank: sharpeRank.toFixed(2),
      jensen: Math.max(-20, Math.min(50, jensen)),
      jensenRank: jensenRank.toFixed(2),
      treynor: Math.max(-1, Math.min(2, treynor)),
      treynorRank: treynorRank.toFixed(2),
      info: Math.max(-5, Math.min(10, info)),
      infoRank: infoRank.toFixed(2),
    };
  }, [totalPnl, totalPnlRate, financeAccounts]);

  const timeRangeLabels = {
    day: '当日',
    month: '本月',
    quarter: '近三月',
    year: '今年',
    all: '全部',
    custom: '自定义',
  };

  // 按时间范围估算盈亏比例（相对于总持仓盈亏 totalPnl）
  // 当日使用真实计算，其他时间段按比例估算
  const getTimePnlRatio = useCallback(() => {
    switch (timeRange) {
      case 'day':
        return null; // 当日使用 totalDailyPnl 单独计算
      case 'month':
        return 0.18;
      case 'quarter':
        return 0.42;
      case 'year':
        return 0.78;
      case 'all':
        return 1.0;
      case 'custom':
        return 0.55;
      default:
        return 1.0;
    }
  }, [timeRange]);

  const currentPnl = useMemo(() => {
    if (timeRange === 'day') return totalDailyPnl;
    const ratio = getTimePnlRatio();
    return totalPnl * ratio;
  }, [timeRange, totalDailyPnl, totalPnl, getTimePnlRatio]);

  const currentPnlRate = useMemo(() => {
    if (timeRange === 'day') return totalDailyPnlRate;
    const ratio = getTimePnlRatio();
    return totalPnlRate * ratio;
  }, [timeRange, totalDailyPnlRate, totalPnlRate, getTimePnlRatio]);

  const generateCalendarData = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const data = [];
    
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    const daysInMonth = endDate.getDate();
    
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = date.toDateString() === new Date().toDateString();
      
      let pnl = 0;
      let rate = 0;
      
      if (!isWeekend && financeAccounts.length > 0) {
        const totalDailyPnlVal = parseFloat(totalDailyPnl) || 0;
        const dailyPnlPerDay = totalDailyPnlVal / 22;
        const variance = (Math.random() - 0.5) * dailyPnlPerDay * 0.6;
        pnl = dailyPnlPerDay + variance;
        rate = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
      }
      
      data.push({
        date,
        day: i,
        dayOfWeek,
        isWeekend,
        isToday,
        pnl: Math.round(pnl * 1000) / 1000,
        rate: Math.round(rate * 10000) / 100,
      });
    }
    
    return data;
  }, [calendarDate, financeAccounts, totalDailyPnl, totalCost]);

  const generateMonthlyData = useMemo(() => {
    const year = calendarDate.getFullYear();
    const data = [];
    
    for (let month = 0; month < 12; month++) {
      const date = new Date(year, month, 1);
      let pnl = 0;
      let rate = 0;
      
      if (financeAccounts.length > 0) {
        const totalPnlVal = parseFloat(currentPnl) || 0;
        const monthlyPnl = totalPnlVal / 12;
        const variance = (Math.random() - 0.5) * monthlyPnl * 0.6;
        pnl = monthlyPnl + variance;
        rate = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
      }
      
      data.push({
        date,
        month: month + 1,
        pnl: Math.round(pnl * 1000) / 1000,
        rate: Math.round(rate * 10000) / 100,
      });
    }
    
    return data;
  }, [calendarDate, financeAccounts, currentPnl, totalCost]);

  const generateYearlyData = useMemo(() => {
    const data = [];
    
    for (let year = 2021; year <= calendarDate.getFullYear(); year++) {
      const date = new Date(year, 0, 1);
      let pnl = 0;
      let rate = 0;
      
      if (financeAccounts.length > 0) {
        const totalPnlVal = parseFloat(currentPnl) || 0;
        const yearlyPnl = totalPnlVal / 5;
        const variance = (Math.random() - 0.5) * yearlyPnl * 0.6;
        pnl = yearlyPnl + variance;
        rate = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
      }
      
      data.push({
        date,
        year,
        pnl: Math.round(pnl * 1000) / 1000,
        rate: Math.round(rate * 10000) / 100,
      });
    }
    
    return data;
  }, [calendarDate, financeAccounts, currentPnl, totalCost]);

  const generatePhaseData = useMemo(() => {
    const phases = ['年初至今', '近一月', '近三月', '近六月', '近一年'];
    
    if (financeAccounts.length === 0) {
      return phases.map((phase) => ({
        phase,
        pnl: 0,
        rate: 0,
      }));
    }
    
    const totalPnlVal = parseFloat(currentPnl) || 0;
    const totalDailyPnlVal = parseFloat(totalDailyPnl) || 0;
    
    return phases.map((phase, index) => {
      const multipliers = [250, 22, 66, 130, 250];
      const multiplier = multipliers[index];
      const pnl = (totalDailyPnlVal * multiplier) / 22;
      const rate = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
      
      return {
        phase,
        pnl: Math.round(pnl * 1000) / 1000,
        rate: Math.round(rate * 10000) / 100,
      };
    });
  }, [financeAccounts, currentPnl, totalDailyPnl, totalCost]);

  const currentCalendarData = useMemo(() => {
    switch (calendarView) {
      case 'day':
        return generateCalendarData;
      case 'month':
        return generateMonthlyData;
      case 'year':
        return generateYearlyData;
      case 'phase':
        return generatePhaseData;
      default:
        return generateCalendarData;
    }
  }, [calendarView, generateCalendarData, generateMonthlyData, generateYearlyData, generatePhaseData]);

  const categoryL1PnlDistribution = useMemo(() => {
    const map = {};
    financeAccounts.forEach(item => {
      const key = item.categoryL1 || '未分类';
      if (!map[key]) {
        map[key] = 0;
      }
      map[key] += parseFloat(item.holdingPnl) || 0;
    });
    const totalPnlVal = Object.values(map).reduce((sum, val) => sum + Math.abs(val), 0);
    const entries = Object.entries(map);
    if (totalPnlVal === 0) {
      const avgPercent = 100 / entries.length;
      return entries.map(([name, value]) => ({ name, value, percent: avgPercent }));
    }
    return entries
      .map(([name, value]) => ({ name, value, percent: (Math.abs(value) / totalPnlVal) * 100 }))
      .sort((a, b) => b.value - a.value);
  }, [financeAccounts]);

  const accountDistribution = useMemo(() => {
    const map = {};
    financeAccounts.forEach(item => {
      const key = item.account || '未知账户';
      if (!map[key]) {
        map[key] = { value: 0, cost: 0, pnl: 0 };
      }
      const val = parseFloat(item.currentValue) || 0;
      const cost = item.cost * item.quantity;
      map[key].value += val;
      map[key].cost += cost;
      map[key].pnl = map[key].value - map[key].cost;
    });
    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        value: data.value,
        pnl: data.pnl,
        pnlRate: data.cost > 0 ? (data.pnl / data.cost) * 100 : 0,
        percent: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [financeAccounts, totalValue]);

  const profitCount = useMemo(() => {
    return financeAccounts.filter(item => {
      const val = parseFloat(item.currentValue) || 0;
      const cost = item.cost * item.quantity;
      return val > cost;
    }).length;
  }, [financeAccounts]);

  const lossCount = useMemo(() => {
    return financeAccounts.filter(item => {
      const val = parseFloat(item.currentValue) || 0;
      const cost = item.cost * item.quantity;
      return val < cost;
    }).length;
  }, [financeAccounts]);

  const bestPerformer = useMemo(() => {
    if (financeAccounts.length === 0) return null;
    return financeAccounts.reduce((best, item) => {
      return item.holdingPnlRate > best.holdingPnlRate ? item : best;
    });
  }, [financeAccounts]);

  const worstPerformer = useMemo(() => {
    if (financeAccounts.length === 0) return null;
    return financeAccounts.reduce((worst, item) => {
      return item.holdingPnlRate < worst.holdingPnlRate ? item : worst;
    });
  }, [financeAccounts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 dark:text-gray-400">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="bg-gradient-to-r from-blue-600 to-blue-400 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4 mb-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">资产穿透</h1>
          </div>
          <div className="text-center">
            <p className="text-sm text-white/80 mb-1">{timeRangeLabels[timeRange]}盈亏</p>
            <p className={`text-3xl font-bold mb-1 ${currentPnl >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {currentPnl >= 0 ? '+' : ''}¥{formatCurrency(currentPnl)}
            </p>
            <p className={`text-base ${currentPnlRate >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {formatPercentage(currentPnlRate)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            {(['day', 'month', 'quarter', 'year', 'all']).map((key) => (
              <button
                key={key}
                onClick={() => setTimeRange(key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                {timeRangeLabels[key]}
              </button>
            ))}
            <button
              onClick={() => setShowCustomTimePicker(true)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                timeRange === 'custom'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {timeRangeLabels['custom']}
            </button>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
            {allIndexOptions.map((option) => (
              <div key={option.code} className="flex items-center">
                <button
                  onClick={() => setSelectedIndex(option.code)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm transition-all ${
                    selectedIndex === option.code
                      ? 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white font-medium'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: option.color }}
                  />
                  {allIndexData[option.code]?.name || option.name}
                </button>
                {option.custom && (
                  <button
                    onClick={() => removeCustomIndex(option.code)}
                    title="移除自定义指数"
                    className="ml-0.5 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            <div className="relative flex items-center gap-1">
              <input
                type="text"
                value={customIndexCode}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => { if (customIndexCode.trim()) setShowSearchDropdown(true); }}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addCustomIndex(customIndexCode);
                  if (e.key === 'Escape') setShowSearchDropdown(false);
                }}
                placeholder="搜索代码或名称"
                className="px-2.5 py-1 text-sm border border-gray-200 dark:border-slate-600 rounded-full bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {/* 搜索下拉候选列表：仅在 showSearchDropdown 且有输入时展示 */}
              {showSearchDropdown && customIndexCode.trim() && (
                <div className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-y-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-50">
                  {searchLoading && (
                    <div className="px-3 py-2 text-sm text-gray-400">搜索中…</div>
                  )}
                  {!searchLoading && searchResults.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-400">无匹配项，可直接按代码添加</div>
                  )}
                  {!searchLoading && searchResults.map((item) => (
                    <button
                      key={`${item.code}-${item.name}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addCustomIndex(item.code, item.name);
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-900 dark:text-white flex items-center justify-between gap-2"
                      title={item.typeName || item.classify}
                    >
                      <span className="truncate">{item.name}</span>
                      <span className="text-xs text-gray-400 shrink-0">{item.code}</span>
                    </button>
                  ))}
                </div>
              )}
              {/* 快捷添加按钮：只要输入内容有效即可直接按代码添加 */}
              {customIndexCode.trim() && (
                <button
                  onClick={() => addCustomIndex(customIndexCode)}
                  className="px-2.5 py-1 text-sm bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                >
                  添加
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setChartType('curve')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                chartType === 'curve'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              曲线
            </button>
            <button
              onClick={() => setChartType('candle')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                chartType === 'candle'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              K线
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-3 space-y-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">收益率曲线</h2>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-red-500"></span>
                <span className="text-gray-600 dark:text-gray-300">用户收益</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-blue-500"></span>
                <span className="text-gray-600 dark:text-gray-300">
                  {getIndexName(selectedIndex)}
                </span>
              </div>
            </div>
          </div>
          <div className="relative">
            {chartType === 'curve' ? (
              <svg viewBox="0 0 800 260" className="w-full h-auto">
                <defs>
                  <linearGradient id="userGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(239, 68, 68, 0.3)" />
                    <stop offset="100%" stopColor="rgba(239, 68, 68, 0)" />
                  </linearGradient>
                  <linearGradient id="indexGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
                    <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
                  </linearGradient>
                </defs>
                {(() => {
                  const history = indexHistoryData?.history || [];
                  const { data: displayData } = getYieldCurveData(history);

                  const baseRate = currentPnlRate;
                  const userData = [];
                  const indexDataPoints = [];

                  if (displayData.length > 0) {
                    // 计算指数真实涨跌幅度
                    const firstClose = timeRange === 'day'
                      ? (parseFloat(displayData[0]?.open) || parseFloat(displayData[0]?.close) || 1)
                      : (parseFloat(displayData[0]?.close) || 1);
                    displayData.forEach(item => {
                      const closeVal = parseFloat(item.close);
                      if (closeVal && firstClose) {
                        const idxRate = ((closeVal - firstClose) / firstClose) * 100;
                        indexDataPoints.push(idxRate);
                      }
                    });

                    // 用户收益线：从0%到currentPnlRate线性缩放
                    displayData.forEach((item, idx) => {
                      const ratio = displayData.length > 1 ? idx / (displayData.length - 1) : 0;
                      const userRate = baseRate * ratio;
                      userData.push(userRate);
                    });
                  } else {
                    // 无历史数据时的回退逻辑
                    const indexRate = indexData?.changeRate || 0;
                    for (let i = 0; i < 7; i++) {
                      const ratio = i / 6;
                      const userRate = baseRate * ratio;
                      const idxRate = indexRate * ratio;
                      userData.push(userRate);
                      indexDataPoints.push(idxRate);
                    }
                  }

                  // Y轴范围包含用户收益率和指数收益率的最值
                  const allData = [...userData, ...indexDataPoints];
                  const maxVal = Math.max(...allData, 5);
                  const minVal = Math.min(...allData, -10);
                  const range = maxVal - minVal;
                  const padding = range * 0.1;
                  const yMax = maxVal + padding;
                  const yMin = minVal - padding;

                  const ticks = getYAxisTicks(yMin, yMax);

                  return ticks.map((val, i) => {
                    const y = 30 + ((yMax - val) / (yMax - yMin)) * 180;
                    return (
                      <g key={val}>
                        <line
                          x1="60"
                          y1={y}
                          x2="740"
                          y2={y}
                          stroke="#E5E7EB"
                          strokeDasharray="4"
                        />
                        <text
                          x="750"
                          y={y + 4}
                          textAnchor="start"
                          className="text-xs fill-gray-400"
                        >
                          {val}%
                        </text>
                      </g>
                    );
                  });
                })()}
                {(() => {
                  const history = indexHistoryData?.history || [];
                  const { data: displayData, labels } = getYieldCurveData(history);
                  if (displayData.length === 0) {
                    return (
                      <text x="400" y="230" textAnchor="middle" className="text-xs fill-gray-400">
                        暂无数据
                      </text>
                    );
                  }
                  const dataLength = displayData.length;
                  const step = dataLength > 1 ? (740 - 60) / (dataLength - 1) : 340;
                  return labels.map(({ index, label }) => (
                    <text
                      key={index}
                      x={60 + index * step}
                      y="230"
                      textAnchor="middle"
                      className="text-xs fill-gray-400"
                    >
                      {label}
                    </text>
                  ));
                })()}
                {(() => {
                  const history = indexHistoryData?.history || [];
                  const { data: displayData } = getYieldCurveData(history);
                  
                  const baseRate = currentPnlRate;
                  const userData = [];
                  const indexDataPoints = [];
                  
                  if (displayData.length > 0) {
                    const firstClose = timeRange === 'day'
                      ? (parseFloat(displayData[0]?.open) || parseFloat(displayData[0]?.close) || 1)
                      : (parseFloat(displayData[0]?.close) || 1);
                    displayData.forEach(item => {
                      const closeVal = parseFloat(item.close);
                      if (closeVal && firstClose) {
                        // 指数收益率：真实涨跌幅度
                        const idxRate = ((closeVal - firstClose) / firstClose) * 100;
                        indexDataPoints.push(idxRate);
                      }
                    });
                    // 用户收益线：从0%到currentPnlRate线性缩放
                    displayData.forEach((item, idx) => {
                      const ratio = displayData.length > 1 ? idx / (displayData.length - 1) : 0;
                      const userRate = baseRate * ratio;
                      userData.push(userRate);
                    });
                  } else {
                    // 无历史数据时的回退逻辑：线性缩放
                    const indexRate = indexData?.changeRate || 0;
                    for (let i = 0; i < 7; i++) {
                      const ratio = i / 6;
                      userData.push(baseRate * ratio);
                      indexDataPoints.push(indexRate * ratio);
                    }
                  }
                  
                  const dataLength = userData.length;
                  const step = dataLength > 1 ? (740 - 60) / (dataLength - 1) : 113;
                  
                  const yMax = Math.max(...userData, ...indexDataPoints, 5);
                  const yMin = Math.min(...userData, ...indexDataPoints, -10);
                  const range = yMax - yMin || 15;
                  const padding = range * 0.1;
                  const chartYMax = yMax + padding;
                  const chartYMin = yMin - padding;
                  
                  const userPath = userData
                    .map((val, i) => {
                      const x = 60 + i * step;
                      const y = 30 + ((chartYMax - val) / (chartYMax - chartYMin)) * 180;
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    })
                    .join(' ');
                  const indexPath = indexDataPoints
                    .map((val, i) => {
                      const x = 60 + i * step;
                      const y = 30 + ((chartYMax - val) / (chartYMax - chartYMin)) * 180;
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    })
                    .join(' ');
                  return (
                    <g>
                      <path
                        d={`${userPath} L ${60 + (dataLength - 1) * step} 210 L 60 210 Z`}
                        fill="url(#userGradient)"
                      />
                      <path
                        d={`${indexPath} L ${60 + (dataLength - 1) * step} 210 L 60 210 Z`}
                        fill="url(#indexGradient)"
                      />
                      <path
                        d={userPath}
                        fill="none"
                        stroke="#EF4444"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d={indexPath}
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {userData.map((val, i) => (
                        <circle
                          key={`user-${i}`}
                          cx={60 + i * step}
                          cy={30 + ((chartYMax - val) / (chartYMax - chartYMin)) * 180}
                          r="3"
                          fill="#EF4444"
                          className="opacity-0 hover:opacity-100"
                          onMouseEnter={() => setTooltip({
                            x: 60 + i * step,
                            y: 30 + ((chartYMax - val) / (chartYMax - chartYMin)) * 180,
                            date: timeRange === 'day' ? displayData[i]?.time : displayData[i]?.date,
                            userRate: val,
                            indexRate: indexDataPoints[i],
                          })}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      ))}
                      {indexDataPoints.map((val, i) => (
                        <circle
                          key={`index-${i}`}
                          cx={60 + i * step}
                          cy={30 + ((chartYMax - val) / (chartYMax - chartYMin)) * 180}
                          r="3"
                          fill="#3B82F6"
                          className="opacity-0 hover:opacity-100"
                          onMouseEnter={() => setTooltip({
                            x: 60 + i * step,
                            y: 30 + ((chartYMax - val) / (chartYMax - chartYMin)) * 180,
                            date: timeRange === 'day' ? displayData[i]?.time : displayData[i]?.date,
                            userRate: userData[i],
                            indexRate: val,
                          })}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      ))}

                      {tooltip && (
                        <g>
                          <rect
                            x={tooltip.x + 10}
                            y={tooltip.y - 75}
                            width="160"
                            height="60"
                            rx="4"
                            fill="rgba(0,0,0,0.8)"
                          />
                          <text
                            x={tooltip.x + 20}
                            y={tooltip.y - 55}
                            className="text-xs fill-white"
                          >
                            {tooltip.date}
                          </text>
                          <text
                            x={tooltip.x + 20}
                            y={tooltip.y - 40}
                            className="text-xs fill-red-400"
                          >
                            用户: {tooltip.userRate?.toFixed?.(2) || '—'}%
                          </text>
                          <text
                            x={tooltip.x + 20}
                            y={tooltip.y - 25}
                            className="text-xs fill-blue-400"
                          >
                            指数: {tooltip.indexRate?.toFixed?.(2) || '—'}%
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })()}
              </svg>
            ) : (
              <svg viewBox="0 0 800 300" className="w-full h-auto">
                {(() => {
                  const history = indexHistoryData?.history || [];
                  const { data: displayData, labels } = getYieldCurveData(history);
                  
                  if (displayData.length === 0) {
                    return (
                      <text x="400" y="150" textAnchor="middle" className="text-gray-400">
                        暂无K线数据
                      </text>
                    );
                  }
                  
                  const closes = displayData.map(item => parseFloat(item.close)).filter(Boolean);
                  const highs = displayData.map(item => parseFloat(item.high)).filter(Boolean);
                  const lows = displayData.map(item => parseFloat(item.low)).filter(Boolean);
                  
                  const minVal = Math.min(...lows) * 0.99;
                  const maxVal = Math.max(...highs) * 1.01;
                  const range = maxVal - minVal || 1;
                  
                  const dataLength = displayData.length;
                  const step = (740 - 60) / (dataLength - 1);
                  const candleWidth = Math.max(8, step * 0.6);
                  
                  const yScale = (val) => 40 + ((maxVal - val) / range) * 230;
                  
                  return (
                    <g>
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                        const val = maxVal - ratio * range;
                        const y = yScale(val);
                        return (
                          <g key={ratio}>
                            <line
                              x1="60"
                              y1={y}
                              x2="740"
                              y2={y}
                              stroke="#E5E7EB"
                              strokeDasharray="4"
                            />
                            <text
                              x="750"
                              y={y + 4}
                              textAnchor="start"
                              className="text-xs fill-gray-400"
                            >
                              {val.toFixed(2)}
                            </text>
                          </g>
                        );
                      })}
                      {displayData.map((item, i) => {
                        const x = 60 + i * step;
                        const isUp = item.close >= (item.open || item.close);
                        const color = isUp ? '#EF4444' : '#10B981';
                        
                        const open = item.open || item.close;
                        const close = item.close;
                        const high = item.high || close;
                        const low = item.low || close;
                        
                        const bodyTop = yScale(Math.max(open, close));
                        const bodyBottom = yScale(Math.min(open, close));
                        const bodyHeight = bodyBottom - bodyTop;
                        const highY = yScale(high);
                        const lowY = yScale(low);
                        
                        return (
                          <g key={i}>
                            <line
                              x1={x}
                              y1={highY}
                              x2={x}
                              y2={lowY}
                              stroke={color}
                              strokeWidth="1"
                            />
                            <rect
                              x={x - candleWidth / 2}
                              y={bodyTop}
                              width={candleWidth}
                              height={Math.max(1, bodyHeight)}
                              fill={isUp ? color : 'none'}
                              stroke={color}
                              strokeWidth="1"
                            />
                          </g>
                        );
                      })}
                      {labels.map(({ index, label }) => {
                        const x = 60 + index * step;
                        return (
                          <text
                            key={`date-${index}`}
                            x={x}
                            y={290}
                            textAnchor="middle"
                            className="text-xs fill-gray-400"
                          >
                            {label}
                          </text>
                        );
                      })}
                    </g>
                  );
                })()}
              </svg>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">收益分析</h2>
            </div>
            <div className="flex items-center gap-2">
              {[
                { key: 'rate', label: '收益率' },
                { key: 'amount', label: '盈亏金额' },
                { key: 'asset', label: '总资产' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setAnalysisView(item.key)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                    analysisView === item.key
                      ? 'bg-white text-blue-600 border-2 border-blue-500 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 border-2 border-transparent'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="analysis"
                  checked={selectedAnalysis === 'position'}
                  onChange={() => setSelectedAnalysis('position')}
                  className="w-4 h-4 border-2 border-gray-300 dark:border-slate-500 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">仓位分析</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="analysis"
                  checked={selectedAnalysis === 'extreme'}
                  onChange={() => setSelectedAnalysis('extreme')}
                  className="w-4 h-4 border-2 border-gray-300 dark:border-slate-500 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">极值分析</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="analysis"
                  checked={selectedAnalysis === 'drawdown'}
                  onChange={() => setSelectedAnalysis('drawdown')}
                  className="w-4 h-4 border-2 border-gray-300 dark:border-slate-500 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">最大回撤</span>
              </label>
            </div>
            {selectedAnalysis === 'position' && (
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    仓位分析
                    {drillDownPath.length === 1 && ' - 资产类型'}
                    {drillDownPath.length === 2 && ' - 资产明细'}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <button
                      onClick={() => setDrillDownPath([])}
                      className={`px-1 hover:text-blue-600 ${drillDownPath.length === 0 ? 'text-blue-600 font-medium' : ''}`}
                    >
                      全部
                    </button>
                    {drillDownPath.map((seg, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <ChevronRight className="w-3 h-3" />
                        <button
                          onClick={() => setDrillDownPath(drillDownPath.slice(0, i + 1))}
                          className={`px-1 hover:text-blue-600 ${i === drillDownPath.length - 1 ? 'text-blue-600 font-medium' : ''}`}
                        >
                          {seg}
                        </button>
                      </span>
                    ))}
                    {drillDownPath.length > 0 && (
                      <button
                        onClick={() => setDrillDownPath([])}
                        className="ml-2 px-2 py-0.5 text-xs bg-gray-200 dark:bg-slate-600 rounded hover:bg-gray-300 dark:hover:bg-slate-500"
                      >
                        返回顶层
                      </button>
                    )}
                  </div>
                </div>
                {drilldownPieData.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">暂无持仓数据</p>
                ) : (
                  <div className="flex items-center gap-6">
                    <div className="flex-1">
                      <svg viewBox="0 0 400 200" className="w-full h-auto">
                        {(() => {
                          const colors = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
                          const total = drilldownPieData.reduce((s, d) => s + d.value, 0);
                          let startAngle = -Math.PI / 2;
                          return drilldownPieData.map((item, index) => {
                            const sliceAngle = total > 0 ? (item.value / total) * 2 * Math.PI : 0;
                            const endAngle = startAngle + sliceAngle;
                            const cx = 100, cy = 100, r = 80;
                            const x1 = cx + r * Math.cos(startAngle);
                            const y1 = cy + r * Math.sin(startAngle);
                            const x2 = cx + r * Math.cos(endAngle);
                            const y2 = cy + r * Math.sin(endAngle);
                            const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
                            const pathData = [
                              `M ${cx} ${cy}`,
                              `L ${x1} ${y1}`,
                              `A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                              'Z'
                            ].join(' ');
                            const isHovered = drillHoverIndex === index;
                            const canDrill = drillDownPath.length < 2;
                            startAngle = endAngle;
                            return (
                              <g key={index}>
                                <path
                                  d={pathData}
                                  fill={colors[index % colors.length]}
                                  className={`transition-opacity duration-200 ${canDrill ? 'cursor-pointer' : 'cursor-default'}`}
                                  style={{ opacity: isHovered ? 1 : 0.85 }}
                                  onMouseEnter={() => setDrillHoverIndex(index)}
                                  onMouseLeave={() => setDrillHoverIndex(null)}
                                  onClick={() => {
                                    if (canDrill) {
                                      setDrillDownPath([...drillDownPath, item.name]);
                                      setDrillHoverIndex(null);
                                    }
                                  }}
                                />
                                <title>{item.name}: {item.percent.toFixed(2)}% (¥{formatCurrency(item.value)})</title>
                              </g>
                            );
                          });
                        })()}
                      </svg>
                    </div>
                    <div className="flex-1 space-y-2 max-h-72 overflow-y-auto">
                      {drilldownPieData.map((item, index) => {
                        const colors = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
                        const isHovered = drillHoverIndex === index;
                        const canDrill = drillDownPath.length < 2;
                        return (
                          <div
                            key={index}
                            className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                              isHovered ? 'bg-white dark:bg-slate-600' : ''
                            } ${canDrill ? 'cursor-pointer' : ''}`}
                            onMouseEnter={() => setDrillHoverIndex(index)}
                            onMouseLeave={() => setDrillHoverIndex(null)}
                            onClick={() => {
                              if (canDrill) {
                                setDrillDownPath([...drillDownPath, item.name]);
                                setDrillHoverIndex(null);
                              }
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: colors[index % colors.length] }}
                              />
                              <div>
                                <div className="text-sm text-gray-700 dark:text-gray-300">{item.name}</div>
                                {item.code && (
                                  <div className="text-xs text-gray-400 dark:text-gray-500">{item.code}</div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {item.percent.toFixed(2)}%
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                ¥{formatCurrency(item.value)}
                              </div>
                              <div className={`text-xs ${pnlClass(item.pnlRate)}`}>
                                {formatPercentage(item.pnlRate)}
                              </div>
                            </div>
                            {canDrill && (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            {selectedAnalysis === 'extreme' && (
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">极值分析</h3>
                {(() => {
                  const history = indexHistoryData?.history || [];
                  const { data: displayData } = getYieldCurveData(history);
                  const baseRate = currentPnlRate;
                  const userData = [];
                  if (displayData.length > 0) {
                    displayData.forEach((item, idx) => {
                      const ratio = displayData.length > 1 ? idx / (displayData.length - 1) : 0;
                      userData.push(baseRate * ratio);
                    });
                  }
                  const maxVal = userData.length > 0 ? Math.max(...userData) : 0;
                  return (
                    <p className="text-sm text-green-600 dark:text-green-400 mb-4">
                      最大收益率: +{maxVal.toFixed(2)}%
                    </p>
                  );
                })()}
                <svg viewBox="0 0 800 240" className="w-full h-auto">
                  {(() => {
                    const history = indexHistoryData?.history || [];
                    const { data: displayData, labels } = getYieldCurveData(history);
                    if (displayData.length === 0) {
                      return (
                        <text x="400" y="120" textAnchor="middle" className="text-xs fill-gray-400">
                          暂无数据
                        </text>
                      );
                    }
                    const baseRate = currentPnlRate;
                    const userData = [];
                    displayData.forEach((item, idx) => {
                      const ratio = displayData.length > 1 ? idx / (displayData.length - 1) : 0;
                      userData.push(baseRate * ratio);
                    });
                    const dataLength = userData.length;
                    const step = dataLength > 1 ? (740 - 60) / (dataLength - 1) : 340;
                    const yMax = Math.max(...userData, 5);
                    const yMin = Math.min(...userData, -5);
                    const range = yMax - yMin || 10;
                    const padding = range * 0.1;
                    const chartYMax = yMax + padding;
                    const chartYMin = yMin - padding;
                    const ticks = getYAxisTicks(chartYMin, chartYMax);
                    const userPath = userData.map((val, i) => {
                      const x = 60 + i * step;
                      const y = 30 + ((chartYMax - val) / (chartYMax - chartYMin)) * 160;
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ');
                    const maxIdx = userData.indexOf(Math.max(...userData));
                    const maxVal = userData[maxIdx];
                    const maxX = 60 + maxIdx * step;
                    const maxY = 30 + ((chartYMax - maxVal) / (chartYMax - chartYMin)) * 160;
                    return (
                      <g>
                        {ticks.map((val) => {
                          const y = 30 + ((chartYMax - val) / (chartYMax - chartYMin)) * 160;
                          return (
                            <g key={val}>
                              <line x1="60" y1={y} x2="740" y2={y} stroke="#E5E7EB" strokeDasharray="4" />
                              <text x="750" y={y + 4} textAnchor="start" className="text-xs fill-gray-400">{val}%</text>
                            </g>
                          );
                        })}
                        {labels.map(({ index, label }) => (
                          <text key={index} x={60 + index * step} y="210" textAnchor="middle" className="text-xs fill-gray-400">
                            {label}
                          </text>
                        ))}
                        <path d={userPath} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx={maxX} cy={maxY} r="6" fill="#22C55E" />
                        <text x={maxX} y={maxY - 12} textAnchor="middle" className="text-xs fill-green-600 font-medium">
                          最大收益 {maxVal.toFixed(2)}%
                        </text>
                      </g>
                    );
                  })()}
                </svg>
              </div>
            )}
            {selectedAnalysis === 'drawdown' && (
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">最大回撤</h3>
                {(() => {
                  const history = indexHistoryData?.history || [];
                  const { data: displayData } = getYieldCurveData(history);
                  const baseRate = currentPnlRate;
                  const userData = [];
                  if (displayData.length > 0) {
                    displayData.forEach((item, idx) => {
                      const ratio = displayData.length > 1 ? idx / (displayData.length - 1) : 0;
                      userData.push(baseRate * ratio);
                    });
                  }
                  let maxDrawdown = 0;
                  let peakVal = userData[0] || 0;
                  for (let i = 1; i < userData.length; i++) {
                    if (userData[i] > peakVal) peakVal = userData[i];
                    const dd = peakVal - userData[i];
                    if (dd > maxDrawdown) maxDrawdown = dd;
                  }
                  return (
                    <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                      最大回撤: -{maxDrawdown.toFixed(2)}%
                    </p>
                  );
                })()}
                <svg viewBox="0 0 800 240" className="w-full h-auto">
                  {(() => {
                    const history = indexHistoryData?.history || [];
                    const { data: displayData, labels } = getYieldCurveData(history);
                    if (displayData.length === 0) {
                      return (
                        <text x="400" y="120" textAnchor="middle" className="text-xs fill-gray-400">
                          暂无数据
                        </text>
                      );
                    }
                    const baseRate = currentPnlRate;
                    const userData = [];
                    displayData.forEach((item, idx) => {
                      const ratio = displayData.length > 1 ? idx / (displayData.length - 1) : 0;
                      userData.push(baseRate * ratio);
                    });
                    const dataLength = userData.length;
                    const step = dataLength > 1 ? (740 - 60) / (dataLength - 1) : 340;
                    const yMax = Math.max(...userData, 5);
                    const yMin = Math.min(...userData, -5);
                    const range = yMax - yMin || 10;
                    const padding = range * 0.1;
                    const chartYMax = yMax + padding;
                    const chartYMin = yMin - padding;
                    const ticks = getYAxisTicks(chartYMin, chartYMax);
                    const userPath = userData.map((val, i) => {
                      const x = 60 + i * step;
                      const y = 30 + ((chartYMax - val) / (chartYMax - chartYMin)) * 160;
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ');
                    let maxDrawdown = 0;
                    let drawdownEndIdx = 0;
                    let peakVal = userData[0];
                    let peakIdx = 0;
                    for (let i = 1; i < userData.length; i++) {
                      if (userData[i] > peakVal) {
                        peakVal = userData[i];
                        peakIdx = i;
                      }
                      const dd = peakVal - userData[i];
                      if (dd > maxDrawdown) {
                        maxDrawdown = dd;
                        drawdownEndIdx = i;
                      }
                    }
                    const peakX = 60 + peakIdx * step;
                    const peakY = 30 + ((chartYMax - peakVal) / (chartYMax - chartYMin)) * 160;
                    const endX = 60 + drawdownEndIdx * step;
                    const endY = 30 + ((chartYMax - userData[drawdownEndIdx]) / (chartYMax - chartYMin)) * 160;
                    const shadowPoints = [];
                    for (let i = peakIdx; i <= drawdownEndIdx; i++) {
                      const x = 60 + i * step;
                      const y = 30 + ((chartYMax - userData[i]) / (chartYMax - chartYMin)) * 160;
                      shadowPoints.push(`${x},${y}`);
                    }
                    shadowPoints.push(`${endX},${peakY}`);
                    shadowPoints.push(`${peakX},${peakY}`);
                    return (
                      <g>
                        {ticks.map((val) => {
                          const y = 30 + ((chartYMax - val) / (chartYMax - chartYMin)) * 160;
                          return (
                            <g key={val}>
                              <line x1="60" y1={y} x2="740" y2={y} stroke="#E5E7EB" strokeDasharray="4" />
                              <text x="750" y={y + 4} textAnchor="start" className="text-xs fill-gray-400">{val}%</text>
                            </g>
                          );
                        })}
                        {labels.map(({ index, label }) => (
                          <text key={index} x={60 + index * step} y="210" textAnchor="middle" className="text-xs fill-gray-400">
                            {label}
                          </text>
                        ))}
                        <polygon points={shadowPoints.join(' ')} fill="rgba(239,68,68,0.15)" />
                        <path d={userPath} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx={peakX} cy={peakY} r="5" fill="#EF4444" />
                        <text x={peakX} y={peakY - 10} textAnchor="middle" className="text-xs fill-red-500 font-medium">
                          峰值 {peakVal.toFixed(2)}%
                        </text>
                        <circle cx={endX} cy={endY} r="5" fill="#EF4444" />
                        <text x={endX} y={endY + 18} textAnchor="middle" className="text-xs fill-red-500 font-medium">
                          谷值 {userData[drawdownEndIdx].toFixed(2)}%
                        </text>
                      </g>
                    );
                  })()}
                </svg>
              </div>
            )}
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              {(() => {
                if (selectedAnalysis === 'position' && selectedPositionItem) {
                  const filtered = financeAccounts.filter(a => {
                    if (positionLevel === 1) {
                      return a.categoryL1 === selectedPositionItem.name;
                    } else if (positionLevel === 2) {
                      return a.categoryL1 === selectedCategory && a.categoryL2 === selectedPositionItem.name;
                    } else {
                      return a.categoryL2 === selectedCategory && a.categoryL3 === selectedPositionItem.name;
                    }
                  });
                  const selTotalValue = filtered.reduce((sum, a) => sum + (parseFloat(a.currentValue) || 0), 0);
                  const selTotalCost = filtered.reduce((sum, a) => sum + a.cost * a.quantity, 0);
                  const selTotalPnl = filtered.reduce((sum, a) => sum + (parseFloat(a.holdingPnl) || 0), 0);
                  const selTotalPnlRate = selTotalCost > 0 ? (selTotalPnl / selTotalCost) * 100 : 0;
                  const selTotalDailyPnl = filtered.reduce((sum, a) => sum + (parseFloat(a.dailyPnl) || 0), 0);
                  const selTotalDailyPnlRate = selTotalValue > 0 ? (selTotalDailyPnl / selTotalValue) * 100 : 0;
                  const selProfitCount = filtered.filter(a => parseFloat(a.currentValue) > a.cost * a.quantity).length;
                  const selLossCount = filtered.filter(a => parseFloat(a.currentValue) < a.cost * a.quantity).length;
                  
                  if (analysisView === 'rate') {
                    return (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">{selectedPositionItem.name}收益率</span>
                          <span className={`font-medium ${pnlClass(selTotalPnlRate)}`}>{formatPercentage(selTotalPnlRate)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">日收益率</span>
                          <span className={`font-medium ${pnlClass(selTotalDailyPnlRate)}`}>{formatPercentage(selTotalDailyPnlRate)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">最佳收益率</span>
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            +{formatPercentage(filtered.length > 0 ? Math.max(...filtered.map(a => parseFloat(a.holdingPnlRate) || 0)) : 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">最差收益率</span>
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            {formatPercentage(filtered.length > 0 ? Math.min(...filtered.map(a => parseFloat(a.holdingPnlRate) || 0)) : 0)}
                          </span>
                        </div>
                      </div>
                    );
                  } else if (analysisView === 'amount') {
                    return (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">{selectedPositionItem.name}盈亏</span>
                          <span className={`font-medium ${pnlClass(selTotalPnl)}`}>¥{formatCurrency(selTotalPnl)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">日盈亏</span>
                          <span className={`font-medium ${pnlClass(selTotalDailyPnl)}`}>¥{formatCurrency(selTotalDailyPnl)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">盈利数量</span>
                          <span className="text-green-600 dark:text-green-400 font-medium">{selProfitCount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">亏损数量</span>
                          <span className="text-red-600 dark:text-red-400 font-medium">{selLossCount}</span>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">{selectedPositionItem.name}总资产</span>
                          <span className="font-medium text-gray-900 dark:text-white">¥{formatCurrency(selTotalValue)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">总成本</span>
                          <span className="font-medium text-gray-900 dark:text-white">¥{formatCurrency(selTotalCost)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">持仓数量</span>
                          <span className="font-medium text-gray-900 dark:text-white">{filtered.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">账户数量</span>
                          <span className="font-medium text-gray-900 dark:text-white">{new Set(filtered.map(a => a.account)).size}</span>
                        </div>
                      </div>
                    );
                  }
                }
                
                if (analysisView === 'rate') {
                  return (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">{timeRangeLabels[timeRange]}收益率</span>
                        <span className={`font-medium ${pnlClass(currentPnlRate)}`}>{formatPercentage(currentPnlRate)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">日收益率</span>
                        <span className={`font-medium ${pnlClass(totalDailyPnlRate)}`}>{formatPercentage(totalDailyPnlRate)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">最佳收益率</span>
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          +{formatPercentage(bestPerformer?.holdingPnlRate || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">最差收益率</span>
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          {formatPercentage(worstPerformer?.holdingPnlRate || 0)}
                        </span>
                      </div>
                    </div>
                  );
                } else if (analysisView === 'amount') {
                  return (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">{timeRangeLabels[timeRange]}盈亏</span>
                        <span className={`font-medium ${pnlClass(currentPnl)}`}>¥{formatCurrency(currentPnl)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">日盈亏</span>
                        <span className={`font-medium ${pnlClass(totalDailyPnl)}`}>¥{formatCurrency(totalDailyPnl)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">盈利数量</span>
                        <span className="text-green-600 dark:text-green-400 font-medium">{profitCount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">亏损数量</span>
                        <span className="text-red-600 dark:text-red-400 font-medium">{lossCount}</span>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">总资产</span>
                        <span className="font-medium text-gray-900 dark:text-white">¥{formatCurrency(totalValue)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">总成本</span>
                        <span className="font-medium text-gray-900 dark:text-white">¥{formatCurrency(totalCost)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">持仓数量</span>
                        <span className="font-medium text-gray-900 dark:text-white">{financeAccounts.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">账户数量</span>
                        <span className="font-medium text-gray-900 dark:text-white">{accountDistribution.length}</span>
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">指数对比</h2>
          </div>
          <div className="text-center mb-6">
            <p className={`text-sm ${(() => {
              const idxRate = indexPeriodReturns[selectedIndex] || allIndexData[selectedIndex]?.changeRate || 0;
              const diff = currentPnlRate - idxRate;
              return diff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
            })()}`}>
              {(() => {
                const map = { day: '今日', week: '本周', month: '本月', quarter: '本季', halfyear: '近半年', year: '今年', all: '全部', custom: '阶段' };
                return map[timeRange] || '本月';
              })()}
              {(() => {
                const idxRate = indexPeriodReturns[selectedIndex] || allIndexData[selectedIndex]?.changeRate || 0;
                const diff = currentPnlRate - idxRate;
                return diff >= 0 ? '跑赢' : '跑输';
              })()}
              {getIndexName(selectedIndex)}
            </p>
            <p className={`text-4xl font-bold mt-2 ${(() => {
              const idxRate = indexPeriodReturns[selectedIndex] || allIndexData[selectedIndex]?.changeRate || 0;
              const diff = currentPnlRate - idxRate;
              return diff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
            })()}`}>
              {(() => {
                const idxRate = indexPeriodReturns[selectedIndex] || allIndexData[selectedIndex]?.changeRate || 0;
                const diff = currentPnlRate - idxRate;
                return `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%`;
              })()}
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-14 text-sm text-gray-700 dark:text-gray-300">用户</span>
              <div className="flex-1 h-6 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, Math.abs(currentPnlRate) * 5))}%`, justifyContent: currentPnlRate >= 0 ? 'flex-start' : 'flex-end' }}
                />
              </div>
              <span className={`w-24 text-right text-sm font-medium ${pnlClass(currentPnlRate)}`}>
                {formatPercentage(currentPnlRate)}
              </span>
            </div>
            {allIndexOptions.map((option) => {
              const idxData = allIndexData[option.code];
              const rate = indexPeriodReturns[option.code] || idxData?.changeRate || 0;
              const price = idxData?.price || 0;
              const isSelected = selectedIndex === option.code;
              return (
                <div
                  key={option.code}
                  className={`flex items-center gap-3 px-2 py-1 rounded cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700/30'}`}
                  onClick={() => setSelectedIndex(option.code)}
                >
                  <span className="w-14 text-sm text-gray-700 dark:text-gray-300 truncate" title={idxData?.name || option.name}>
                    {idxData?.name || option.name}
                  </span>
                  <div className="flex-1 h-6 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(0, Math.min(100, Math.abs(rate) * 5))}%`,
                        backgroundColor: option.color,
                      }}
                    />
                  </div>
                  <span className="w-24 text-right text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{price > 0 ? price.toFixed(2) : '--'}</span>
                    <span className={`ml-1 font-medium ${rate >= 0 ? POS_CLASS : NEG_CLASS}`}>
                      {formatPercentage(rate)}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">日历收益</h2>
          </div>
          
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              {[
                { key: 'day', label: '日收益' },
                { key: 'month', label: '月收益' },
                { key: 'year', label: '年收益' },
                { key: 'phase', label: '阶段收益' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setCalendarView(item.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    calendarView === item.key
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCalendarMode('rate')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  calendarMode === 'rate'
                    ? 'bg-green-600 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                收益率
              </button>
              <button
                onClick={() => setCalendarMode('amount')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  calendarMode === 'amount'
                    ? 'bg-green-600 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                收益金额
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const newDate = new Date(calendarDate);
                  if (calendarView === 'day') {
                    newDate.setMonth(newDate.getMonth() - 1);
                  } else if (calendarView === 'month') {
                    newDate.setFullYear(newDate.getFullYear() - 1);
                  } else if (calendarView === 'year') {
                    newDate.setFullYear(newDate.getFullYear() - 5);
                  }
                  setCalendarDate(newDate);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <span className="text-lg font-medium text-gray-900 dark:text-white">
                {calendarView === 'day' && `${calendarDate.getFullYear()}年${calendarDate.getMonth() + 1}月`}
                {calendarView === 'month' && `${calendarDate.getFullYear()}年`}
                {calendarView === 'year' && `${calendarDate.getFullYear() - 4}-${calendarDate.getFullYear()}年`}
                {calendarView === 'phase' && '阶段收益'}
              </span>
              <button
                onClick={() => {
                  const newDate = new Date(calendarDate);
                  if (calendarView === 'day') {
                    newDate.setMonth(newDate.getMonth() + 1);
                  } else if (calendarView === 'month') {
                    newDate.setFullYear(newDate.getFullYear() + 1);
                  } else if (calendarView === 'year') {
                    newDate.setFullYear(newDate.getFullYear() + 5);
                  }
                  setCalendarDate(newDate);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCalendarChartType('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  calendarChartType === 'calendar'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <Calendar className="w-4 h-4" />
                日历图
              </button>
              <button
                onClick={() => setCalendarChartType('bar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  calendarChartType === 'bar'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                柱状图
              </button>
            </div>
          </div>
          
          {calendarView === 'day' && calendarChartType === 'calendar' && (
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const firstDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay();
                  const emptyCells = firstDay === 0 ? 6 : firstDay - 1;
                  const cells = [];
                  for (let i = 0; i < emptyCells; i++) {
                    cells.push(<div key={`empty-${i}`} className="h-12 bg-transparent rounded" />);
                  }
                  currentCalendarData.forEach((item) => {
                    const currentValue = calendarMode === 'rate' ? item.rate : item.pnl;
                    const isPositive = currentValue >= 0;
                    const intensity = Math.min(Math.abs(currentValue) / (calendarMode === 'rate' ? 3 : 5000), 1);
                    const baseColor = isPositive ? [220, 38, 38] : [37, 99, 235];
                    const lightColor = isPositive ? [254, 226, 226] : [219, 234, 254];
                    const bgR = Math.round(lightColor[0] + (baseColor[0] - lightColor[0]) * intensity);
                    const bgG = Math.round(lightColor[1] + (baseColor[1] - lightColor[1]) * intensity);
                    const bgB = Math.round(lightColor[2] + (baseColor[2] - lightColor[2]) * intensity);
                    const bgStyle = item.isWeekend
                      ? { backgroundColor: '#e5e7eb' }
                      : { backgroundColor: `rgb(${bgR}, ${bgG}, ${bgB})` };
                    const textColor = item.isWeekend
                      ? '#6b7280'
                      : intensity > 0.5 ? '#ffffff' : '#111827';
                    const displayValue = calendarMode === 'rate' 
                      ? `${currentValue >= 0 ? '+' : ''}${currentValue.toFixed(1)}%`
                      : `${currentValue >= 0 ? '+' : ''}¥${currentValue.toFixed(0)}`;
                    cells.push(
                      <div
                        key={item.day}
                        style={bgStyle}
                        className={`relative h-12 rounded flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 ${
                          item.isToday ? 'ring-2 ring-blue-500' : ''
                        }`}
                      >
                        <span
                          className="text-sm font-bold"
                          style={{ color: textColor }}
                        >
                          {item.day}
                        </span>
                        <span
                          className="text-xs font-medium opacity-90"
                          style={{ color: textColor }}
                        >
                          {displayValue}
                        </span>
                        <div className="absolute inset-0 bg-black/80 rounded opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1 text-white text-xs z-10">
                          <span>{item.date.getFullYear()}-{item.date.getMonth() + 1}-{item.day}</span>
                          <span className={item.pnl >= 0 ? 'text-red-300' : 'text-blue-300'}>
                            盈亏: {item.pnl >= 0 ? '+' : ''}¥{formatCurrency(item.pnl)}
                          </span>
                          <span className={item.rate >= 0 ? 'text-red-300' : 'text-blue-300'}>
                            收益率: {item.rate >= 0 ? '+' : ''}{item.rate.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    );
                  });
                  return cells;
                })()}
              </div>
            </div>
          )}
          
          {calendarView === 'month' && calendarChartType === 'calendar' && (
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <div className="grid grid-cols-6 gap-3 mb-4">
                {currentCalendarData.map((item, index) => {
                  const currentValue = calendarMode === 'rate' ? item.rate : item.pnl;
                  const isPositive = currentValue >= 0;
                  const bgColor = isPositive
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50'
                    : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50';
                  const textColor = isPositive
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-blue-600 dark:text-blue-400';
                  const displayValue = calendarMode === 'rate'
                    ? `${isPositive ? '+' : ''}${currentValue.toFixed(1)}%`
                    : `${isPositive ? '+' : ''}¥${formatCurrency(currentValue)}`;
                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-lg ${bgColor}`}
                    >
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {item.month}月
                      </div>
                      <div className={`text-lg font-bold ${textColor}`}>
                        {displayValue}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">年度收益汇总</span>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">总收益</span>
                    <div className={`text-lg font-bold ${
                      currentPnl >= 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {currentPnl >= 0 ? '+' : ''}¥{formatCurrency(currentPnl)}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">总收益率</span>
                    <div className={`text-lg font-bold ${
                      currentPnlRate >= 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {currentPnlRate >= 0 ? '+' : ''}{currentPnlRate.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">同期上证</span>
                    <div className={`text-lg font-bold ${
                      indexData?.changeRate >= 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {indexData?.changeRate >= 0 ? '+' : ''}{(indexData?.changeRate || 0).toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">跑赢大盘</span>
                    <div className={`text-lg font-bold ${
                      (currentPnlRate - (indexData?.changeRate || 0)) >= 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {currentPnlRate - (indexData?.changeRate || 0) >= 0 ? '+' : ''}{(currentPnlRate - (indexData?.changeRate || 0)).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {calendarView === 'year' && calendarChartType === 'calendar' && (
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <div className="grid grid-cols-5 gap-3 mb-4">
                {currentCalendarData.map((item, index) => {
                  const currentValue = calendarMode === 'rate' ? item.rate : item.pnl;
                  const isPositive = currentValue >= 0;
                  const bgColor = isPositive
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50'
                    : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50';
                  const textColor = isPositive
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-blue-600 dark:text-blue-400';
                  const displayValue = calendarMode === 'rate'
                    ? `${isPositive ? '+' : ''}${currentValue.toFixed(1)}%`
                    : `${isPositive ? '+' : ''}¥${formatCurrency(currentValue)}`;
                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-lg ${bgColor}`}
                    >
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {item.year}年
                      </div>
                      <div className={`text-lg font-bold ${textColor}`}>
                        {displayValue}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">历年收益汇总</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">累计收益</span>
                    <div className={`text-lg font-bold ${
                      currentPnl >= 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {currentPnl >= 0 ? '+' : ''}¥{formatCurrency(currentPnl * 5)}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">累计收益率</span>
                    <div className={`text-lg font-bold ${
                      currentPnlRate >= 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {currentPnlRate >= 0 ? '+' : ''}{(currentPnlRate * 5).toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">平均年化</span>
                    <div className={`text-lg font-bold ${
                      currentPnlRate >= 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {currentPnlRate >= 0 ? '+' : ''}{currentPnlRate.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {calendarChartType === 'bar' && calendarView !== 'phase' && (
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <div className="overflow-x-auto">
                <svg viewBox={`0 0 ${Math.max(800, currentCalendarData.length * 50 + 100)} 280`} className="w-full h-auto min-w-full">
                  <defs>
                    <linearGradient id="barRedPositive" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#EF4444" />
                      <stop offset="100%" stopColor="#DC2626" />
                    </linearGradient>
                    <linearGradient id="barBlueNegative" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#2563EB" />
                    </linearGradient>
                  </defs>
                  {(() => {
                    const values = currentCalendarData.map(item => 
                      calendarMode === 'rate' ? Math.abs(item.rate) : Math.abs(item.pnl)
                    );
                    const maxVal = Math.max(...values, 1);
                    const chartWidth = Math.max(800, currentCalendarData.length * 50 + 100);
                    const barWidth = 30;
                    const step = (chartWidth - 120) / currentCalendarData.length;
                    
                    return (
                      <>
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                          const val = maxVal * ratio;
                          const y = 230 - ratio * 180;
                          const displayVal = calendarMode === 'rate' 
                            ? `${val.toFixed(1)}%` 
                            : `¥${val.toFixed(0)}`;
                          return (
                            <g key={ratio}>
                              <line
                                x1="60"
                                y1={y}
                                x2={chartWidth - 40}
                                y2={y}
                                stroke="rgba(0,0,0,0.05)"
                                strokeDasharray="4"
                              />
                              <text
                                x="50"
                                y={y + 4}
                                textAnchor="end"
                                className="text-xs fill-gray-400"
                              >
                                {displayVal}
                              </text>
                            </g>
                          );
                        })}
                        {currentCalendarData.map((item, i) => {
                          const x = 60 + step * i + step / 2;
                          const absValue = calendarMode === 'rate' ? Math.abs(item.rate) : Math.abs(item.pnl);
                          const barHeight = (absValue / maxVal) * 180;
                          const y = 230 - barHeight;
                          const isPositive = (calendarMode === 'rate' ? item.rate : item.pnl) >= 0;
                          const label = calendarMode === 'rate'
                            ? `${item.rate >= 0 ? '+' : ''}${item.rate.toFixed(1)}%`
                            : `${item.pnl >= 0 ? '+' : ''}¥${item.pnl.toFixed(0)}`;
                          const xLabel = calendarView === 'day' ? `${item.day}日` :
                                         calendarView === 'month' ? `${item.month}月` : `${item.year}`;
                          return (
                            <g key={i}>
                              <rect
                                x={x - barWidth / 2}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                fill={isPositive ? 'url(#barRedPositive)' : 'url(#barBlueNegative)'}
                                rx="4"
                                className="opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                              />
                              <text
                                x={x}
                                y={y - 6}
                                textAnchor="middle"
                                className={`text-xs font-medium ${isPositive ? 'fill-red-600' : 'fill-blue-600'}`}
                              >
                                {label}
                              </text>
                              <text
                                x={x}
                                y={255}
                                textAnchor="middle"
                                className="text-xs fill-gray-500"
                              >
                                {xLabel}
                              </text>
                            </g>
                          );
                        })}
                        <line x1="60" y1="230" x2={chartWidth - 40} y2="230" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
                      </>
                    );
                  })()}
                </svg>
              </div>
              {calendarView === 'month' && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-600 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {calendarDate.getFullYear()}年累计收益：
                    </span>
                    <span className={`text-sm font-bold ${
                      currentPnl >= 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {currentPnl >= 0 ? '+' : ''}¥{formatCurrency(currentPnl)} ({currentPnlRate >= 0 ? '+' : ''}{currentPnlRate.toFixed(2)}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">上证：</span>
                    <span className={`text-sm font-medium ${
                      (indexData?.changeRate || 0) >= 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {(indexData?.changeRate || 0) >= 0 ? '+' : ''}{(indexData?.changeRate || 0).toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {calendarView === 'phase' && (
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-600">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">阶段</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">收益率</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">收益金额</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">对比上证</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentCalendarData.map((item, index) => {
                      const isPositive = item.pnl >= 0;
                      const indexChange = indexData?.changeRate || 0;
                      const beatMarket = item.rate - indexChange * (item.phase === '年初至今' ? 1 : item.phase === '近一月' ? 1/12 : item.phase === '近三月' ? 3/12 : item.phase === '近六月' ? 6/12 : 1);
                      return (
                        <tr key={index} className={`border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700/50`}>
                          <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{item.phase}</td>
                          <td className={`text-right py-3 px-4 font-medium ${
                            isPositive ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                          }`}>
                            {isPositive ? '+' : ''}{item.rate.toFixed(2)}%
                          </td>
                          <td className={`text-right py-3 px-4 font-medium ${
                            isPositive ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                          }`}>
                            {isPositive ? '+' : ''}¥{formatCurrency(item.pnl)}
                          </td>
                          <td className={`text-right py-3 px-4 font-medium ${
                            beatMarket >= 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                          }`}>
                            {beatMarket >= 0 ? '+' : ''}{beatMarket.toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">月度个股盈亏</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStockViewType('chart')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  stockViewType === 'chart'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                图表
              </button>
              <button
                onClick={() => setStockViewType('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  stockViewType === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <List className="w-4 h-4" />
                列表
              </button>
            </div>
          </div>

          {stockViewType === 'chart' && (
            <div className="space-y-4">
              {sortedStockData.slice(0, 3).map((item, index) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl ${
                    index === 0
                      ? 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-800/50'
                      : index === 1
                      ? 'bg-gradient-to-r from-gray-50 to-slate-100 dark:from-gray-800/50 dark:to-slate-800/50 border border-gray-200 dark:border-gray-700/50'
                      : 'bg-gradient-to-r from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      index === 0
                        ? 'bg-yellow-400 text-yellow-900'
                        : index === 1
                        ? 'bg-gray-300 text-gray-700'
                        : 'bg-orange-400 text-orange-900'
                    }`}>
                      {index === 0 && <Trophy className="w-6 h-6" />}
                      {index === 1 && <Award className="w-6 h-6" />}
                      {index === 2 && <Medal className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white">{item.name}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{item.code}</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">盈亏比例 </span>
                        <span className={`text-sm font-medium ${pnlClass(item.holdingPnlRate)}`}>
                          {formatPercentage(item.holdingPnlRate)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${pnlClass(item.holdingPnl)}`}>
                        {item.holdingPnl >= 0 ? '+' : ''}¥{formatCurrency(item.holdingPnl)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        市值 ¥{formatCurrency(item.currentValue)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {sortedStockData.slice(3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
                >
                  <span className="text-sm text-gray-500 dark:text-gray-400 w-6">{sortedStockData.indexOf(item) + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 dark:text-white truncate">{item.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{item.code}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.holdingPnl >= 0 ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.abs(item.holdingPnlRate) * 5)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${pnlClass(item.holdingPnl)}`}>
                      {item.holdingPnl >= 0 ? '+' : ''}¥{formatCurrency(item.holdingPnl)}
                    </p>
                    <p className={`text-xs ${pnlClass(item.holdingPnlRate)}`}>
                      {formatPercentage(item.holdingPnlRate)}
                    </p>
                  </div>
                </div>
              ))}
              <div className="p-3 bg-gray-100 dark:bg-slate-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">其他收益</span>
                  <span className={`text-sm font-medium ${pnlClass(totalPnl - sortedStockData.reduce((sum, item) => sum + item.holdingPnl, 0))}`}>
                    {totalPnl >= 0 ? '+' : ''}¥{formatCurrency(totalPnl - sortedStockData.reduce((sum, item) => sum + item.holdingPnl, 0))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {stockViewType === 'list' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-700">
                    <th className="text-left py-2 font-medium w-12">排名</th>
                    <th className="text-left py-2 font-medium">名称</th>
                    <th className="text-left py-2 font-medium">代码</th>
                    <th className="text-right py-2 font-medium">持仓数量</th>
                    <th className="text-right py-2 font-medium">成本</th>
                    <th className="text-right py-2 font-medium">现价</th>
                    <th className="text-right py-2 font-medium">市值</th>
                    <th className="text-right py-2 font-medium">盈亏金额</th>
                    <th className="text-right py-2 font-medium">盈亏比例</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStockData.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-50 dark:border-slate-700/50">
                      <td className="py-3">
                        {index === 0 && (
                          <div className="w-6 h-6 rounded-full bg-yellow-400 text-yellow-900 flex items-center justify-center">
                            <Trophy className="w-4 h-4" />
                          </div>
                        )}
                        {index === 1 && (
                          <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center">
                            <Award className="w-4 h-4" />
                          </div>
                        )}
                        {index === 2 && (
                          <div className="w-6 h-6 rounded-full bg-orange-400 text-orange-900 flex items-center justify-center">
                            <Medal className="w-4 h-4" />
                          </div>
                        )}
                        {index > 2 && (
                          <span className="text-gray-500 dark:text-gray-400 font-medium">{index + 1}</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-gray-500 dark:text-gray-400">{item.code}</span>
                      </td>
                      <td className="py-3 text-right text-gray-700 dark:text-gray-300">
                        {formatNum(item.quantity)}
                      </td>
                      <td className="py-3 text-right text-gray-700 dark:text-gray-300">
                        {formatNum(item.cost)}
                      </td>
                      <td className="py-3 text-right text-gray-700 dark:text-gray-300">
                        {formatNum(item.currentPrice)}
                      </td>
                      <td className="py-3 text-right text-gray-700 dark:text-gray-300">
                        ¥{formatCurrency(item.currentValue)}
                      </td>
                      <td className={`py-3 text-right font-medium ${pnlClass(item.holdingPnl)}`}>
                        {item.holdingPnl >= 0 ? '+' : ''}¥{formatCurrency(item.holdingPnl)}
                      </td>
                      <td className={`py-3 text-right font-medium ${pnlClass(item.holdingPnlRate)}`}>
                        {formatPercentage(item.holdingPnlRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">操作分析</h2>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg">操作统计</button>
              <button className="px-3 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">账户表现</button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">交易股票数</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{financeAccounts.length}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">平均持仓天数</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">15</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">建清仓次数</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">8</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">交易成功率</span>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">62.5%</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">平均仓位</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">75%</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">资金周转率</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">2.3</p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg flex flex-col items-center justify-center">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">业绩评分</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">i</span>
              </div>
              <svg viewBox="0 0 200 200" className="w-full max-w-[200px] h-auto">
                {(() => {
                  const dimensions = [
                    { name: '经验值', value: 99.30 },
                    { name: '收益率', value: 76.80 },
                    { name: '抗风险', value: 72.60 },
                    { name: '稳定性', value: 84.90 },
                    { name: '择时能力', value: 63.20 },
                  ];
                  const centerX = 100, centerY = 100;
                  const radius = 70;
                  const sides = dimensions.length;
                  const angleStep = (Math.PI * 2) / sides;
                  const labels = [];
                  const dataPoints = [];
                  dimensions.forEach((dim, i) => {
                    const angle = -Math.PI / 2 + i * angleStep;
                    const r = (dim.value / 100) * radius;
                    const x = centerX + r * Math.cos(angle);
                    const y = centerY + r * Math.sin(angle);
                    dataPoints.push({ x, y });
                    const labelR = radius + 20;
                    const labelX = centerX + labelR * Math.cos(angle);
                    const labelY = centerY + labelR * Math.sin(angle);
                    labels.push({ x: labelX, y: labelY, name: dim.name, value: dim.value });
                  });
                  const gridLines = [];
                  for (let level = 5; level >= 1; level--) {
                    const levelRadius = (level / 5) * radius;
                    const points = [];
                    for (let i = 0; i <= sides; i++) {
                      const angle = -Math.PI / 2 + i * angleStep;
                      const x = centerX + levelRadius * Math.cos(angle);
                      const y = centerY + levelRadius * Math.sin(angle);
                      points.push(`${x},${y}`);
                    }
                    gridLines.push(points.join(' '));
                  }
                  return (
                    <g>
                      {gridLines.map((line, i) => (
                        <polygon
                          key={`grid-${i}`}
                          points={line}
                          fill="none"
                          stroke={i === 5 ? '#9CA3AF' : '#E5E7EB'}
                          strokeWidth={i === 5 ? 1.5 : 1}
                          className="dark:stroke-slate-600"
                        />
                      ))}
                      {dimensions.map((_, i) => {
                        const angle = -Math.PI / 2 + i * angleStep;
                        const x = centerX + radius * Math.cos(angle);
                        const y = centerY + radius * Math.sin(angle);
                        return (
                          <line
                            key={`axis-${i}`}
                            x1={centerX}
                            y1={centerY}
                            x2={x}
                            y2={y}
                            stroke="#E5E7EB"
                            strokeWidth={1}
                            className="dark:stroke-slate-600"
                          />
                        );
                      })}
                      <polygon
                        points={dataPoints.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="rgba(239, 68, 68, 0.2)"
                        stroke="#EF4444"
                        strokeWidth={2}
                      />
                      {dataPoints.map((p, i) => (
                        <circle
                          key={`point-${i}`}
                          cx={p.x}
                          cy={p.y}
                          r="4"
                          fill="#EF4444"
                        />
                      ))}
                      <text x={centerX} y={centerY - 8} textAnchor="middle" className="text-sm font-bold fill-gray-900 dark:fill-white">
                        76.92
                      </text>
                      <text x={centerX} y={centerY + 8} textAnchor="middle" className="text-xs fill-gray-500 dark:fill-gray-400">
                        综合评分
                      </text>
                      {labels.map((label, i) => (
                        <g key={`label-${i}`}>
                          <text
                            x={label.x}
                            y={label.y - 4}
                            textAnchor="middle"
                            className="text-xs fill-gray-600 dark:fill-gray-400"
                          >
                            {label.name}
                          </text>
                          <text
                            x={label.x}
                            y={label.y + 10}
                            textAnchor="middle"
                            className="text-xs font-bold fill-orange-500"
                          >
                            {label.value}
                          </text>
                        </g>
                      ))}
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">今年来收益风险指标</h2>
            <div className="w-8 h-0.5 bg-red-500" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <RiskMetricCard
              label="夏普比率"
              value={riskMetrics.sharpe}
              rank={riskMetrics.sharpeRank}
              description="衡量每承担一单位风险所获得的超额收益"
              formula="Sharpe = (Rp - Rf) / σp"
              explanation="Rp=投资组合收益率，Rf=无风险收益率(取2%)，σp=收益率标准差"
              ranges={[
                { label: '优秀', range: '> 1.0', color: 'text-green-600' },
                { label: '良好', range: '0.5 ~ 1.0', color: 'text-blue-600' },
                { label: '一般', range: '0 ~ 0.5', color: 'text-yellow-600' },
                { label: '较差', range: '< 0', color: 'text-red-600' },
              ]}
            />
            <RiskMetricCard
              label="詹森比率"
              value={riskMetrics.jensen}
              rank={riskMetrics.jensenRank}
              description="衡量投资组合超越市场基准的超额收益能力"
              formula="α = Rp - [Rf + β(Rm - Rf)]"
              explanation="Rp=投资组合收益率，Rm=市场收益率(沪深300)，β=投资组合贝塔系数"
              ranges={[
                { label: '优秀', range: '> 5%', color: 'text-green-600' },
                { label: '良好', range: '1% ~ 5%', color: 'text-blue-600' },
                { label: '一般', range: '-2% ~ 1%', color: 'text-yellow-600' },
                { label: '较差', range: '< -2%', color: 'text-red-600' },
              ]}
            />
            <RiskMetricCard
              label="特雷诺比率"
              value={riskMetrics.treynor}
              rank={riskMetrics.treynorRank}
              description="衡量每承担一单位系统性风险所获得的超额收益"
              formula="Treynor = (Rp - Rf) / β"
              explanation="Rp=投资组合收益率，Rf=无风险收益率，β=投资组合贝塔系数"
              ranges={[
                { label: '优秀', range: '> 0.15', color: 'text-green-600' },
                { label: '良好', range: '0.08 ~ 0.15', color: 'text-blue-600' },
                { label: '一般', range: '0 ~ 0.08', color: 'text-yellow-600' },
                { label: '较差', range: '< 0', color: 'text-red-600' },
              ]}
            />
            <RiskMetricCard
              label="信息比率"
              value={riskMetrics.info}
              rank={riskMetrics.infoRank}
              description="衡量投资组合相对于基准的超额收益与跟踪误差的比率"
              formula="IR = (Rp - Rb) / TE"
              explanation="Rp=投资组合收益率，Rb=基准收益率(沪深300)，TE=跟踪误差"
              ranges={[
                { label: '优秀', range: '> 0.5', color: 'text-green-600' },
                { label: '良好', range: '0.2 ~ 0.5', color: 'text-blue-600' },
                { label: '一般', range: '0 ~ 0.2', color: 'text-yellow-600' },
                { label: '较差', range: '< 0', color: 'text-red-600' },
              ]}
            />
          </div>
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <svg viewBox="0 0 800 300" className="w-full h-auto">
              {(() => {
                const startDate = new Date('2025-12-31');
                const endDate = new Date();
                const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                const dataPoints = Math.min(150, Math.max(30, daysDiff));
                const userData = [];
                const guojinData = [];
                const hs300Data = [];
                let userVal = 0;
                let guojinVal = 0;
                let hs300Val = 0;
                for (let i = 0; i < dataPoints; i++) {
                  userVal += (Math.random() - 0.3) * 1.5;
                  guojinVal += (Math.random() - 0.45) * 0.8;
                  hs300Val += (Math.random() - 0.48) * 1;
                  userData.push({ x: i, y: userVal });
                  guojinData.push({ x: i, y: guojinVal });
                  hs300Data.push({ x: i, y: hs300Val });
                }
                const allData = [...userData, ...guojinData, ...hs300Data];
                const minVal = Math.min(...allData.map(d => d.y)) - 5;
                const maxVal = Math.max(...allData.map(d => d.y)) + 5;
                const padding = 60;
                const chartWidth = 800 - padding * 2;
                const chartHeight = 300 - padding - 30;
                const xStep = chartWidth / (dataPoints - 1);
                const yRange = maxVal - minVal;
                const getY = (val) => padding + chartHeight - ((val - minVal) / yRange) * chartHeight;
                const getX = (i) => padding + i * xStep;
                const userPath = userData.map((d, i) => {
                  const x = getX(i);
                  const y = getY(d.y);
                  return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                }).join(' ');
                const guojinPath = guojinData.map((d, i) => {
                  const x = getX(i);
                  const y = getY(d.y);
                  return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                }).join(' ');
                const hs300Path = hs300Data.map((d, i) => {
                  const x = getX(i);
                  const y = getY(d.y);
                  return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                }).join(' ');
                const yTicks = [];
                for (let i = 0; i <= 5; i++) {
                  const val = minVal + (maxVal - minVal) * (5 - i) / 5;
                  yTicks.push({ val, y: getY(val) });
                }
                const dateLabels = [];
                const labelCount = 6;
                for (let k = 0; k < labelCount; k++) {
                  const idx = Math.round(k * (dataPoints - 1) / (labelCount - 1));
                  const date = new Date(startDate);
                  date.setDate(date.getDate() + Math.round(idx * daysDiff / dataPoints));
                  const label = `${date.getMonth() + 1}-${date.getDate()}`;
                  dateLabels.push({ idx, label });
                }
                return (
                  <g>
                    <line x1={padding} y1={getY(0)} x2={800 - padding} y2={getY(0)} stroke="#E5E7EB" strokeWidth={1} strokeDasharray="4" className="dark:stroke-slate-600" />
                    {yTicks.map((tick, i) => (
                      <g key={`y-tick-${i}`}>
                        <line x1={padding - 5} y1={tick.y} x2={padding} y2={tick.y} stroke="#9CA3AF" className="dark:stroke-slate-500" />
                        <text x={padding - 10} y={tick.y + 4} textAnchor="end" className="text-xs fill-gray-500 dark:fill-gray-400">
                          {tick.val.toFixed(0)}%
                        </text>
                      </g>
                    ))}
                    {dateLabels.map((dl, i) => (
                      <text key={`date-${i}`} x={getX(dl.idx)} y={280} textAnchor="middle" className="text-xs fill-gray-500 dark:fill-gray-400">
                        {dl.label}
                      </text>
                    ))}
                    <defs>
                      <linearGradient id="userGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(239, 68, 68, 0.3)" />
                        <stop offset="100%" stopColor="rgba(239, 68, 68, 0)" />
                      </linearGradient>
                    </defs>
                    <path
                      d={userPath + ` L ${getX(dataPoints - 1)} ${getY(0)} L ${padding} ${getY(0)} Z`}
                      fill="url(#userGradient)"
                    />
                    <path d={userPath} fill="none" stroke="#EF4444" strokeWidth={2} />
                    <path d={guojinPath} fill="none" stroke="#3B82F6" strokeWidth={2} />
                    <path d={hs300Path} fill="none" stroke="#F59E0B" strokeWidth={2} />
                    <text x={padding} y={20} className="text-xs fill-gray-500 dark:fill-gray-400">2025-12-31</text>
                    <text x={800 - padding} y={20} className="text-xs fill-gray-500 dark:fill-gray-400">
                      {endDate.getFullYear()}-{String(endDate.getMonth() + 1).padStart(2, '0')}-{String(endDate.getDate()).padStart(2, '0')}
                    </text>
                    <g transform="translate(580, 265)">
                      <circle cx={0} cy={0} r="4" fill="#EF4444" />
                      <text x={8} y={4} className="text-xs fill-gray-700 dark:fill-gray-300">本账户</text>
                      <circle cx={60} cy={0} r="4" fill="#3B82F6" />
                      <text x={68} y={4} className="text-xs fill-gray-700 dark:fill-gray-300">国金平均</text>
                      <circle cx={130} cy={0} r="4" fill="#F59E0B" />
                      <text x={138} y={4} className="text-xs fill-gray-700 dark:fill-gray-300">沪深300</text>
                    </g>
                  </g>
                );
              })()}
            </svg>
          </div>
        </div>
      </div>

      {showCustomTimePicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">选择时间区间</h3>
              <button
                onClick={() => setShowCustomTimePicker(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {customTimeRanges.map((range) => (
                <button
                  key={range.key}
                  onClick={() => {
                    setTimeRange(range.key);
                    setShowCustomTimePicker(false);
                  }}
                  className="px-4 py-3 rounded-lg text-sm font-medium bg-gray-50 dark:bg-slate-700/50 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {range.label}
                </button>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
              <div className="flex gap-2">
                <input
                  type="date"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="flex items-center text-gray-400">-</span>
                <input
                  type="date"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button className="w-full mt-3 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

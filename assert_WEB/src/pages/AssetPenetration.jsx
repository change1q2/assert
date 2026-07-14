import { useState, useEffect, useMemo } from 'react';
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
  const [chartType, setChartType] = useState('curve');
  const [analysisView, setAnalysisView] = useState('rate');
  const [analysisFeatures, setAnalysisFeatures] = useState({
    position: false,
    extreme: false,
    drawdown: false,
  });
  const [auxFeatures, setAuxFeatures] = useState({
    markTrade: false,
    label: false,
  });

  const [calendarView, setCalendarView] = useState('day');
  const [calendarChartType, setCalendarChartType] = useState('calendar');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarMode, setCalendarMode] = useState('rate');

  const [stockViewType, setStockViewType] = useState('chart');
  const [pieHoverIndex, setPieHoverIndex] = useState(null);
  const [showCustomTimePicker, setShowCustomTimePicker] = useState(false);
  const [indexHistoryData, setIndexHistoryData] = useState(null);
  
  const [positionLevel, setPositionLevel] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [positionData, setPositionData] = useState([]);
  
  const [assetCategoryLevel, setAssetCategoryLevel] = useState(1);
  const [selectedAssetCategory, setSelectedAssetCategory] = useState(null);
  const [assetPieHoverIndex, setAssetPieHoverIndex] = useState(null);
  const [groupPieHoverIndex, setGroupPieHoverIndex] = useState(null);

  const customTimeRanges = [
    { key: 'week', label: '近一周', days: 7 },
    { key: 'month', label: '近一月', days: 30 },
    { key: 'quarter', label: '近三月', days: 90 },
    { key: 'halfyear', label: '近半年', days: 180 },
    { key: 'year', label: '近一年', days: 365 },
  ];

  const indexOptions = [
    { code: 'sh000001', name: '上证', color: '#3B82F6' },
    { code: 'sz399001', name: '深证', color: '#EF4444' },
    { code: 'sz399006', name: '创业板', color: '#F59E0B' },
    { code: 'sh000016', name: '上证50', color: '#8B5CF6' },
    { code: 'sh000300', name: '沪深300', color: '#EC4899' },
    { code: 'sh000905', name: '中证500', color: '#10B981' },
    { code: 'IXIC', name: '纳斯达克', color: '#0071C5' },
    { code: 'SPX', name: '标普500', color: '#EE3233' },
  ];
  
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
        if (selectedIndex === 'IXIC' || selectedIndex === 'SPX') {
          const response = await fetch(`/api/finance/index?code=${selectedIndex}`);
          const result = await response.json();
          if (result.name) {
            setIndexData({
              name: result.name,
              price: result.price,
              change: result.change,
              changeRate: result.changeRate,
            });
          }
        } else {
          const response = await fetch(`http://hq.sinajs.cn/list=${selectedIndex}`);
          const text = await response.text();
          const match = text.match(/var hq_str_\w+="([^"]+)"/);
          if (match) {
            const parts = match[1].split(',');
            if (parts.length > 3) {
              setIndexData({
                name: parts[0],
                price: parseFloat(parts[3]),
                change: parseFloat(parts[4]),
                changeRate: parseFloat(parts[5]),
              });
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch index data:', err);
      }
    };
    fetchIndexData();
  }, [selectedIndex]);

  useEffect(() => {
    const fetchAllIndexData = async () => {
      try {
        const data = {};
        const domesticCodes = indexOptions.filter(o => o.code !== 'IXIC' && o.code !== 'SPX').map(o => o.code).join(',');
        if (domesticCodes) {
          const response = await fetch(`http://hq.sinajs.cn/list=${domesticCodes}`);
          const text = await response.text();
          const regex = /var hq_str_(\w+)="([^"]+)"/g;
          let match;
          while ((match = regex.exec(text)) !== null) {
            const code = match[1];
            const parts = match[2].split(',');
            if (parts.length > 3) {
              data[code] = {
                name: parts[0],
                price: parseFloat(parts[3]),
                change: parseFloat(parts[4]),
                changeRate: parseFloat(parts[5]),
              };
            }
          }
        }
        const usCodes = ['IXIC', 'SPX'];
        for (const code of usCodes) {
          try {
            const response = await fetch(`/api/finance/index?code=${code}`);
            const result = await response.json();
            if (result.name) {
              data[code] = {
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
  }, []);

  useEffect(() => {
    const fetchIndexHistory = async () => {
      try {
        const code = selectedIndex.startsWith('sh') || selectedIndex.startsWith('sz') 
          ? selectedIndex.slice(2) 
          : selectedIndex;
        const response = await fetch(`/api/finance/index-history?code=${code}`);
        const result = await response.json();
        if (result.history && result.history.length > 0) {
          setIndexHistoryData(result);
        }
      } catch (err) {
        console.error('Failed to fetch index history:', err);
        setIndexHistoryData(null);
      }
    };
    fetchIndexHistory();
  }, [selectedIndex]);

  const financeAssets = stateData?.financeAssets || [];
  const accounts = stateData?.accounts || [];

  const financeAccounts = useMemo(() => {
    return (financeAssets || []).map(a => {
      const _price = parseFloat(quotesMap[a.code]?.price) || parseFloat(a.currentPrice) || 0;
      const _cost = parseFloat(a.costPrice || a.cost) || 0;
      const _qty = parseFloat(a.shares || a.quantity) || 0;
      const _unitPnl = _price - _cost;
      const _holdingPnl = _unitPnl * _qty;
      const _dailyPnl = parseFloat(a.dailyPnl) || 0;
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

  const assetCategoryData = useMemo(() => {
    return {
      level1: buildHierarchicalData(financeAccounts),
    };
  }, [financeAccounts]);

  const getAssetCategoryData = (level, parentCategory) => {
    if (level === 1) {
      return assetCategoryData.level1;
    } else if (level === 2 && parentCategory) {
      const parent = assetCategoryData.level1.find(p => p.name === parentCategory);
      return parent?.children || [];
    } else if (level === 3 && parentCategory) {
      for (const level1 of assetCategoryData.level1) {
        const level2 = level1.children?.find(c => c.name === parentCategory);
        if (level2) {
          return level2.children || [];
        }
      }
    } else if (level === 4 && parentCategory) {
      for (const level1 of assetCategoryData.level1) {
        for (const level2 of level1.children || []) {
          const level3 = level2.children?.find(c => c.name === parentCategory);
          if (level3) {
            return level3.children || [];
          }
        }
      }
    }
    return [];
  };

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

  const timeRangeLabels = {
    day: '当日',
    month: '本月',
    quarter: '近三月',
    year: '今年',
    all: '全部',
    custom: '自定义',
  };

  const currentPnl = useMemo(() => {
    switch (timeRange) {
      case 'day':
        return totalDailyPnl;
      default:
        return totalPnl;
    }
  }, [timeRange, totalDailyPnl, totalPnl]);

  const currentPnlRate = useMemo(() => {
    switch (timeRange) {
      case 'day':
        return totalDailyPnlRate;
      default:
        return totalPnlRate;
    }
  }, [timeRange, totalDailyPnlRate, totalPnlRate]);

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
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">资产穿透</h1>
          </div>
          <div className="text-center">
            <p className="text-sm text-white/80 mb-2">{timeRangeLabels[timeRange]}盈亏</p>
            <p className={`text-5xl font-bold mb-2 ${currentPnl >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {currentPnl >= 0 ? '+' : ''}¥{formatCurrency(currentPnl)}
            </p>
            <p className={`text-lg ${currentPnlRate >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {formatPercentage(currentPnlRate)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-2 mb-4">
            {(['day', 'month', 'quarter', 'year', 'all']).map((key) => (
              <button
                key={key}
                onClick={() => setTimeRange(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === 'custom'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {timeRangeLabels['custom']}
            </button>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3 mb-3">
            {indexOptions.map((option) => (
              <button
                key={option.code}
                onClick={() => setSelectedIndex(option.code)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                  selectedIndex === option.code
                    ? 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white font-medium'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: option.color }}
                />
                {option.name}
              </button>
            ))}
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={customIndexCode}
                onChange={(e) => setCustomIndexCode(e.target.value)}
                placeholder="自定义指数"
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-slate-600 rounded-full bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => customIndexCode && setSelectedIndex(customIndexCode)}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setChartType('curve')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                chartType === 'curve'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              曲线
            </button>
            <button
              onClick={() => setChartType('candle')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
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

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
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
                  {indexData?.name || '指数'}
                </span>
              </div>
            </div>
          </div>
          <div className="relative">
            {chartType === 'curve' ? (
              <svg viewBox="0 0 800 300" className="w-full h-auto">
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
                  const displayData = history.slice(-30).reverse();
                  
                  const baseRate = currentPnlRate;
                  const userData = [];
                  const indexDataPoints = [];
                  
                  if (displayData.length > 0) {
                    const firstClose = displayData[0]?.close || 1;
                    displayData.forEach(item => {
                      if (item.close && firstClose) {
                        const idxRate = ((item.close - firstClose) / firstClose) * 100;
                        indexDataPoints.push(idxRate);
                        const userRate = idxRate * (baseRate / (indexData?.changeRate || 1)) * (0.9 + Math.random() * 0.2);
                        userData.push(userRate);
                      }
                    });
                  } else {
                    const indexRate = indexData?.changeRate || 0;
                    for (let i = 0; i < 7; i++) {
                      const userRate = baseRate * (0.8 + Math.random() * 0.4) + (Math.random() - 0.5) * 2;
                      const idxRate = indexRate * (0.8 + Math.random() * 0.4) + (Math.random() - 0.5) * 2;
                      userData.push(userRate);
                      indexDataPoints.push(idxRate);
                    }
                  }
                  
                  const allData = [...userData, ...indexDataPoints];
                  const maxVal = Math.max(...allData, 5);
                  const minVal = Math.min(...allData, -10);
                  const range = maxVal - minVal;
                  const padding = range * 0.1;
                  const yMax = maxVal + padding;
                  const yMin = minVal - padding;
                  
                  const ticks = [-10, -5, 0, 5].filter(t => t >= yMin && t <= yMax);
                  if (ticks.length === 0) {
                    const step = (yMax - yMin) / 4;
                    for (let i = 0; i <= 4; i++) {
                      ticks.push(Math.round((yMin + i * step) * 10) / 10);
                    }
                  }
                  
                  return ticks.map((val, i) => {
                    const y = 75 + ((yMin - val) / (yMax - yMin)) * 175;
                    return (
                      <g key={val}>
                        <line
                          x1="60"
                          y1={y}
                          x2="740"
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
                          {val}%
                        </text>
                      </g>
                    );
                  });
                })()}
                {(() => {
                  const history = indexHistoryData?.history || [];
                  const displayData = history.slice(-30).reverse();
                  const dates = displayData.map(item => {
                    const d = new Date(item.date);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  });
                  if (dates.length === 0) {
                    for (let i = 6; i >= 0; i--) {
                      const d = new Date();
                      d.setDate(d.getDate() - i);
                      dates.push(`${d.getMonth() + 1}/${d.getDate()}`);
                    }
                  }
                  const step = dates.length > 1 ? (740 - 60) / (dates.length - 1) : 113;
                  return dates.map((date, i) => (
                    <text
                      key={i}
                      x={60 + i * step}
                      y={290}
                      textAnchor="middle"
                      className="text-xs fill-gray-400"
                    >
                      {date}
                    </text>
                  ));
                })()}
                {(() => {
                  const history = indexHistoryData?.history || [];
                  const displayData = history.slice(-30).reverse();
                  
                  const baseRate = currentPnlRate;
                  const userData = [];
                  const indexDataPoints = [];
                  
                  if (displayData.length > 0) {
                    const firstClose = displayData[0]?.close || 1;
                    displayData.forEach(item => {
                      if (item.close && firstClose) {
                        const idxRate = ((item.close - firstClose) / firstClose) * 100;
                        indexDataPoints.push(idxRate);
                        const userRate = idxRate * (baseRate / (indexData?.changeRate || 1)) * (0.9 + Math.random() * 0.2);
                        userData.push(userRate);
                      }
                    });
                  } else {
                    const indexRate = indexData?.changeRate || 0;
                    for (let i = 0; i < 7; i++) {
                      const userRate = baseRate * (0.8 + Math.random() * 0.4) + (Math.random() - 0.5) * 2;
                      const idxRate = indexRate * (0.8 + Math.random() * 0.4) + (Math.random() - 0.5) * 2;
                      userData.push(userRate);
                      indexDataPoints.push(idxRate);
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
                      const y = 75 + ((chartYMin - val) / (chartYMax - chartYMin)) * 175;
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    })
                    .join(' ');
                  const indexPath = indexDataPoints
                    .map((val, i) => {
                      const x = 60 + i * step;
                      const y = 75 + ((chartYMin - val) / (chartYMax - chartYMin)) * 175;
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    })
                    .join(' ');
                  return (
                    <g>
                      <path
                        d={`${userPath} L ${60 + (dataLength - 1) * step} 250 L 60 250 Z`}
                        fill="url(#userGradient)"
                      />
                      <path
                        d={`${indexPath} L ${60 + (dataLength - 1) * step} 250 L 60 250 Z`}
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
                          cy={75 + ((chartYMin - val) / (chartYMax - chartYMin)) * 175}
                          r="3"
                          fill="#EF4444"
                          className="opacity-0 hover:opacity-100"
                        />
                      ))}
                      {indexDataPoints.map((val, i) => (
                        <circle
                          key={`index-${i}`}
                          cx={60 + i * step}
                          cy={75 + ((chartYMin - val) / (chartYMax - chartYMin)) * 175}
                          r="3"
                          fill="#3B82F6"
                          className="opacity-0 hover:opacity-100"
                        />
                      ))}
                    </g>
                  );
                })()}
              </svg>
            ) : (
              <svg viewBox="0 0 800 350" className="w-full h-auto">
                {(() => {
                  const history = indexHistoryData?.history || [];
                  const displayData = history.slice(-30).reverse();
                  
                  if (displayData.length === 0) {
                    return (
                      <text x="400" y="175" textAnchor="middle" className="text-gray-400">
                        暂无K线数据
                      </text>
                    );
                  }
                  
                  const closes = displayData.map(item => item.close).filter(Boolean);
                  const highs = displayData.map(item => item.high).filter(Boolean);
                  const lows = displayData.map(item => item.low).filter(Boolean);
                  
                  const minVal = Math.min(...lows) * 0.99;
                  const maxVal = Math.max(...highs) * 1.01;
                  const range = maxVal - minVal || 1;
                  
                  const dataLength = displayData.length;
                  const step = (740 - 60) / (dataLength - 1);
                  const candleWidth = Math.max(8, step * 0.6);
                  
                  const yScale = (val) => 50 + ((maxVal - val) / range) * 280;
                  
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
                              stroke="rgba(0,0,0,0.05)"
                              strokeDasharray="4"
                            />
                            <text
                              x="50"
                              y={y + 4}
                              textAnchor="end"
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
                      {displayData.map((item, i) => {
                        const x = 60 + i * step;
                        const d = new Date(item.date);
                        const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;
                        return (
                          <text
                            key={`date-${i}`}
                            x={x}
                            y={340}
                            textAnchor="middle"
                            className="text-xs fill-gray-400"
                          >
                            {dateLabel}
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
                  type="checkbox"
                  checked={analysisFeatures.position}
                  onChange={(e) => setAnalysisFeatures({ ...analysisFeatures, position: e.target.checked })}
                  className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-slate-500 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                  style={{ borderRadius: '50%' }}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">仓位分析</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={analysisFeatures.extreme}
                  onChange={(e) => setAnalysisFeatures({ ...analysisFeatures, extreme: e.target.checked })}
                  className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-slate-500 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                  style={{ borderRadius: '50%' }}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">极值分析</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={analysisFeatures.drawdown}
                  onChange={(e) => setAnalysisFeatures({ ...analysisFeatures, drawdown: e.target.checked })}
                  className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-slate-500 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                  style={{ borderRadius: '50%' }}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">最大回撤</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={auxFeatures.markTrade}
                  onChange={(e) => setAuxFeatures({ ...auxFeatures, markTrade: e.target.checked })}
                  className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-slate-500 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                  style={{ borderRadius: '50%' }}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">标记买卖点</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={auxFeatures.label}
                  onChange={(e) => setAuxFeatures({ ...auxFeatures, label: e.target.checked })}
                  className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-slate-500 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                  style={{ borderRadius: '50%' }}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">标签分析</span>
              </label>
            </div>
            {analysisFeatures.position && (
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">仓位分析</h3>
                  <div className="flex items-center gap-2">
                    {positionLevel > 1 && (
                      <button
                        onClick={() => {
                          if (positionLevel === 2) {
                            setPositionLevel(1);
                            setSelectedCategory(null);
                          } else if (positionLevel === 3) {
                            setPositionLevel(2);
                          }
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        ← 返回上一级
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex-1">
                    <PieChartSVG
                      data={getPositionData(positionLevel, selectedCategory)}
                      colors={PIE_COLORS}
                      size={200}
                      onHover={(index) => setPieHoverIndex(index)}
                      hoveredIndex={pieHoverIndex}
                      onClick={(index) => {
                        const data = getPositionData(positionLevel, selectedCategory);
                        const item = data[index];
                        if (item?.children?.length > 0 && positionLevel < 3) {
                          setSelectedCategory(item.name);
                          setPositionLevel(positionLevel + 1);
                        }
                      }}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    {getPositionData(positionLevel, selectedCategory).map((item, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          pieHoverIndex === index ? 'bg-white dark:bg-slate-600' : ''
                        }`}
                        onClick={() => {
                          if (item?.children?.length > 0 && positionLevel < 3) {
                            setSelectedCategory(item.name);
                            setPositionLevel(positionLevel + 1);
                          }
                        }}
                        onMouseEnter={() => setPieHoverIndex(index)}
                        onMouseLeave={() => setPieHoverIndex(null)}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {item.name}
                            {item.children?.length > 0 && ' →'}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            ¥{formatCurrency(item.value)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {item.percent}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              {analysisView === 'rate' ? (
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
              ) : analysisView === 'amount' ? (
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
              ) : (
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
              )}
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
              const selectedIdxData = allIndexData[selectedIndex];
              const diff = selectedIdxData ? currentPnlRate - selectedIdxData.changeRate : 0;
              return diff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
            })()}`}>
              本月{(() => {
                const selectedIdxData = allIndexData[selectedIndex];
                const diff = selectedIdxData ? currentPnlRate - selectedIdxData.changeRate : 0;
                return diff >= 0 ? '跑赢' : '跑输';
              })()}{indexData?.name || '上证指数'}
            </p>
            <p className={`text-4xl font-bold mt-2 ${(() => {
              const selectedIdxData = allIndexData[selectedIndex];
              const diff = selectedIdxData ? currentPnlRate - selectedIdxData.changeRate : 0;
              return diff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
            })()}`}>
              {(() => {
                const selectedIdxData = allIndexData[selectedIndex];
                const diff = selectedIdxData ? currentPnlRate - selectedIdxData.changeRate : 0;
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
            {indexOptions.map((option) => {
              const idxData = allIndexData[option.code];
              const rate = idxData?.changeRate || 0;
              const price = idxData?.price || 0;
              return (
                <div key={option.code} className="flex items-center gap-3">
                  <span className="w-14 text-sm text-gray-700 dark:text-gray-300">{option.name}</span>
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
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">重仓行业</span>
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">—</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">投资风格</span>
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">—</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">资产分类</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (assetCategoryLevel > 1) {
                    setAssetCategoryLevel(assetCategoryLevel - 1);
                    const currentData = getAssetCategoryData(assetCategoryLevel, selectedAssetCategory);
                    if (assetCategoryLevel === 2) {
                      setSelectedAssetCategory(null);
                    } else {
                      let parentName = null;
                      for (const l1 of assetCategoryData.level1) {
                        if (l1.children?.find(c => c.name === selectedAssetCategory)) {
                          parentName = l1.name;
                          break;
                        }
                        for (const l2 of l1.children || []) {
                          if (l2.children?.find(c => c.name === selectedAssetCategory)) {
                            parentName = l2.name;
                            break;
                          }
                        }
                      }
                      setSelectedAssetCategory(parentName);
                    }
                  }
                }}
                disabled={assetCategoryLevel === 1}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  assetCategoryLevel === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400'
                }`}
              >
                ← 返回上级
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {selectedAssetCategory ? `${selectedAssetCategory} / ` : ''}
                第{assetCategoryLevel}级分类
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-gray-50 dark:bg-slate-700/30 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">持仓分组</h3>
              <div className="flex justify-center mb-4">
                <div className="w-48 h-48">
                  <PieChartSVG
                    data={holdingGroupData}
                    colors={PIE_COLORS}
                    size={192}
                    onHover={setGroupPieHoverIndex}
                    hoveredIndex={groupPieHoverIndex}
                  />
                </div>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {holdingGroupData.map((item, index) => (
                  <div
                    key={item.name}
                    className={`flex items-center justify-between p-2 rounded-lg transition-all duration-200 ${
                      groupPieHoverIndex === index
                        ? 'bg-blue-100 dark:bg-blue-900/40'
                        : 'hover:bg-gray-100 dark:hover:bg-slate-600/50'
                    }`}
                    onMouseEnter={() => setGroupPieHoverIndex(index)}
                    onMouseLeave={() => setGroupPieHoverIndex(null)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      ¥{formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-slate-700/30 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
                资产层级分类
                <span className="text-xs text-gray-500 ml-2">(点击进入下一级)</span>
              </h3>
              <div className="flex justify-center mb-4">
                <div className="w-48 h-48">
                  <PieChartSVG
                    data={getAssetCategoryData(assetCategoryLevel, selectedAssetCategory)}
                    colors={PIE_COLORS}
                    size={192}
                    onHover={setAssetPieHoverIndex}
                    hoveredIndex={assetPieHoverIndex}
                  />
                </div>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {getAssetCategoryData(assetCategoryLevel, selectedAssetCategory).map((item, index) => (
                  <div
                    key={item.name}
                    className={`flex items-center justify-between p-2 rounded-lg transition-all duration-200 cursor-pointer ${
                      assetPieHoverIndex === index
                        ? 'bg-blue-100 dark:bg-blue-900/40'
                        : 'hover:bg-gray-100 dark:hover:bg-slate-600/50'
                    }`}
                    onMouseEnter={() => setAssetPieHoverIndex(index)}
                    onMouseLeave={() => setAssetPieHoverIndex(null)}
                    onClick={() => {
                      if (assetCategoryLevel < 4 && item.children && item.children.length > 0) {
                        setSelectedAssetCategory(item.name);
                        setAssetCategoryLevel(assetCategoryLevel + 1);
                        setAssetPieHoverIndex(null);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{item.name}</span>
                      {assetCategoryLevel < 4 && item.children && item.children.length > 0 && (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        ¥{formatCurrency(item.value)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {item.percent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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

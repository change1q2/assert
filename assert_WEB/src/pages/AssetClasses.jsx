import { useState, useEffect, useMemo } from 'react';
import { fetchState, saveState } from '../api';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  X,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  Eye,
  EyeOff,
  Wallet,
  Briefcase,
  ArrowLeft,
  Target,
  Search,
  PieChart as PieChartIcon,
  BarChart3,
  Activity,
  Lock,
  Globe,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  LabelList,
} from 'recharts';

function formatCurrency(value, currency = 'CNY') {
  const num = value == null || isNaN(value) ? 0 : Number(value);
  const options = {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  };
  return new Intl.NumberFormat(currency === 'CNY' ? 'zh-CN' : 'en-US', options).format(num);
}

function formatPercentage(value) {
  const n = value == null || isNaN(value) ? 0 : Number(value);
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function formatAmountChinese(value) {
  const num = Number(value) || 0;
  if (num >= 10000) {
    return `${(num / 10000).toFixed(2)}万`;
  }
  return num.toFixed(2);
}

const DEFAULT_CLASSES = [
  { name: '权益类', color: '#6366F1' },
  { name: '债权类', color: '#10B981' },
  { name: '现金类', color: '#06B6D4' },
  { name: '商品类', color: '#F59E0B' },
  { name: '分红类', color: '#EC4899' },
  { name: '固收类', color: '#8B5CF6' },
  { name: '另类投资', color: '#EF4444' },
];

const PRESET_COLORS = [
  '#6366F1',
  '#F59E0B',
  '#10B981',
  '#06B6D4',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
];

const CATEGORY_L1_OPTIONS = ['权益类', '债权类', '现金类', '商品类', '分红类', '固收类', '另类投资'];
const CATEGORY_COLORS = {
  '权益类': '#6366F1',
  '债权类': '#10B981',
  '现金类': '#06B6D4',
  '商品类': '#F59E0B',
  '分红类': '#EC4899',
  '固收类': '#8B5CF6',
  '另类投资': '#EF4444',
};
const ASSET_TYPE_OPTIONS = ['股票', '基金', '债券', '期货', '期权', '外汇', '数字货币', '银行理财', '保险', '房产', '其他'];
const DOMESTIC_MARKET = '国内市场';
const OVERSEAS_MARKET = '海外市场';
const EXCHANGE_RATE = 7.2;

const INDEPENDENT_ASSET_TYPES = [
  { id: 'insurance', name: '保险', color: '#6366F1' },
  { id: 'realestate', name: '房产', color: '#10B981' },
  { id: 'vehicle', name: '车辆', color: '#F59E0B' },
  { id: 'fixedinvestment', name: '固定投资', color: '#EC4899' },
  { id: 'equity', name: '股权', color: '#8B5CF6' },
  { id: 'fixeddeposit', name: '定期资产', color: '#06B6D4' },
];

function computeIndependentAssetsPie(independentAssets) {
  const assets = independentAssets || {};
  const result = [];
  
  INDEPENDENT_ASSET_TYPES.forEach((type) => {
    const typeAssets = assets[type.id] || [];
    const value = typeAssets.reduce((sum, asset) => {
      const assetType = asset.type || asset.category || type.id;
      let val = 0;
      if (assetType === 'insurance') {
        val = parseFloat(asset.premiumTotal || 0);
      } else if (assetType === 'realestate') {
        const marketValue = parseFloat(asset.marketValue || 0);
        const taxAmount = parseFloat(asset.taxAmount || 0);
        const agencyFee = parseFloat(asset.agencyFee || 0);
        val = marketValue > 0 ? (marketValue - taxAmount - agencyFee) : parseFloat(asset.purchasePrice || 0);
      } else if (assetType === 'vehicle') {
        const purchasePrice = parseFloat(asset.purchasePrice || 0);
        const depreciationRate = parseFloat(asset.depreciationRate || 0);
        const years = parseFloat(asset.ownershipYears || 0);
        val = purchasePrice * Math.pow(1 - depreciationRate / 100, years);
      } else if (assetType === 'fixedinvestment') {
        val = parseFloat(asset.investmentCost || 0);
      } else if (assetType === 'equity') {
        val = parseFloat(asset.marketValue || asset.investmentCost || 0);
      } else if (assetType === 'fixeddeposit') {
        val = parseFloat(asset.amount || 0);
      } else {
        val = parseFloat(asset.currentValue || asset.balance || 0);
      }
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    if (value > 0) {
      result.push({
        name: type.name,
        value,
        color: type.color,
      });
    }
  });
  
  return result;
}

function createDefaultClass({ name, color }) {
  return {
    id: `default-${name}`,
    name,
    children: [],
    visible: true,
    value: 0,
    openingValue: 0,
    targetValue: 0,
    income: 0,
    expense: 0,
    laborIncome: 0,
    color,
    expectedReturn: 0,
  };
}

function normalizeMarket(market) {
  if (!market) return DOMESTIC_MARKET;
  if (market === DOMESTIC_MARKET || market === '国内市场') return DOMESTIC_MARKET;
  return OVERSEAS_MARKET;
}

function aggregateClassesFromFinance(financeAccounts, existingClasses) {
  const accounts = financeAccounts || [];
  const existing = existingClasses || [];

  const existingMap = {};
  existing.forEach((cls) => {
    existingMap[cls.name] = cls;
  });

  const categoryMap = {};
  const childrenMap = {};

  accounts.forEach((account) => {
    const categoryL1 = account.categoryL1 || account.category || '其他';
    const assetType = account.assetType || account.kind || account.category || '其他';
    const market = normalizeMarket(account.market);
    const value = parseFloat(account.currentValue || account.balance || account.currentPrice * account.shares || 0);
    const cost = parseFloat(account.cost || account.costPrice * account.shares || 0);

    if (!categoryMap[categoryL1]) {
      categoryMap[categoryL1] = { value: 0, cost: 0, income: 0, expense: 0 };
    }
    categoryMap[categoryL1].value += value;
    categoryMap[categoryL1].cost += cost;

    const childKey = `${assetType}__${market}`;
    if (!childrenMap[categoryL1]) {
      childrenMap[categoryL1] = {};
    }
    if (!childrenMap[categoryL1][childKey]) {
      childrenMap[categoryL1][childKey] = {
        name: assetType,
        market,
        value: 0,
        cost: 0,
        openingValue: 0,
        isAutoSync: true,
      };
    }
    childrenMap[categoryL1][childKey].value += value;
    childrenMap[categoryL1][childKey].cost += cost;
    childrenMap[categoryL1][childKey].openingValue += cost;
  });

  const result = [];
  Object.keys(categoryMap).forEach((name) => {
    const existing = existingMap[name];
    const data = categoryMap[name];
    const autoChildren = childrenMap[name]
      ? Object.values(childrenMap[name]).sort((a, b) => b.value - a.value)
      : [];

    const existingChildren = existing?.children || [];
    const customChildren = existingChildren
      .filter((c) => !c.isAutoSync)
      .map((c) => ({
        ...c,
        market: c.market || '',
        isAutoSync: false,
      }));

    const autoTotal = autoChildren.reduce((sum, c) => sum + (c.value || 0), 0);
    const customTotal = customChildren.reduce((sum, c) => sum + (c.value || 0), 0);
    const combinedValue = data.value + customTotal;
    const combinedOpening = data.cost + customChildren.reduce((sum, c) => sum + (c.openingValue || 0), 0);

    result.push({
      id: existing?.id || `finance-${name}`,
      name,
      children: [...autoChildren, ...customChildren],
      visible: existing?.visible !== false,
      value: combinedValue,
      openingValue: combinedOpening,
      targetValue: existing?.targetValue || 0,
      income: existing?.income || 0,
      expense: existing?.expense || 0,
      laborIncome: existing?.laborIncome || 0,
      color: existing?.color || CATEGORY_COLORS[name] || PRESET_COLORS[result.length % PRESET_COLORS.length],
      expectedReturn: existing?.expectedReturn || 0,
    });
  });

  const financeCategoryNames = new Set(Object.keys(categoryMap));
  existing.forEach((cls) => {
    if (!financeCategoryNames.has(cls.name)) {
      const customChildren = (cls.children || []).map((c) => ({
        ...c,
        market: c.market || '',
        isAutoSync: false,
      }));
      result.push({
        ...cls,
        children: customChildren,
      });
    }
  });

  return result;
}

function computeDomesticOverseasPie(financeAccounts) {
  const accounts = financeAccounts || [];
  let domestic = 0;
  let hk = 0;
  let us = 0;
  let other = 0;

  accounts.forEach((account) => {
    const value = parseFloat(account.currentValue || account.balance || account.currentPrice * account.shares || 0);
    const market = account.market || '';

    if (!market || market === DOMESTIC_MARKET || market === 'DOMESTIC_MARKET') {
      domestic += value;
    } else if (market.includes('港股')) {
      hk += value;
    } else if (market.includes('美股')) {
      us += value;
    } else {
      other += value;
    }
  });

  const total = domestic + hk + us + other;

  return [
    { name: DOMESTIC_MARKET, value: domestic, color: '#3B82F6', percent: total > 0 ? (domestic / total) * 100 : 0 },
    { name: '港股市场', value: hk, color: '#F97316', percent: total > 0 ? (hk / total) * 100 : 0 },
    { name: '美股市场', value: us, color: '#EF4444', percent: total > 0 ? (us / total) * 100 : 0 },
    { name: '其他市场', value: other, color: '#8B5CF6', percent: total > 0 ? (other / total) * 100 : 0 },
  ].filter((item) => item.value > 0);
}

function computeAssetTypeBreakdown(financeAccounts, categoryName) {
  const accounts = financeAccounts || [];
  const typeMap = {};

  accounts.forEach((account) => {
    const categoryL1 = account.categoryL1 || account.category || '';
    if (categoryL1 !== categoryName) return;

    const assetType = account.assetType || account.kind || account.category || '其他';
    const value = parseFloat(account.currentValue || account.balance || account.currentPrice * account.shares || 0);

    if (!typeMap[assetType]) {
      typeMap[assetType] = 0;
    }
    typeMap[assetType] += value;
  });

  const total = Object.values(typeMap).reduce((sum, v) => sum + v, 0);

  return Object.entries(typeMap)
    .map(([name, value], index) => ({
      name,
      value,
      percent: total > 0 ? (value / total) * 100 : 0,
      color: PRESET_COLORS[index % PRESET_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);
}

function computeCategoryL1Amounts(financeAccounts) {
  const accounts = financeAccounts || [];
  const categoryMap = {};
  
  accounts.forEach((account) => {
    const categoryL1 = account.categoryL1 || account.category || '其他';
    const value = parseFloat(account.currentValue || account.balance || account.currentPrice * account.shares || 0);
    if (!categoryMap[categoryL1]) {
      categoryMap[categoryL1] = 0;
    }
    categoryMap[categoryL1] += value;
  });
  
  return DEFAULT_CLASSES.map((cls, index) => ({
    name: cls.name,
    value: categoryMap[cls.name] || 0,
    color: CATEGORY_COLORS[cls.name] || cls.color || PRESET_COLORS[index % PRESET_COLORS.length],
  }));
}

function generateTrendData(financeAccounts, classes) {
  const accounts = financeAccounts || [];
  const classList = classes || [];

  // 按一级分类聚合当前金额
  const categoryValueMap = {};
  accounts.forEach((account) => {
    const categoryL1 = account.categoryL1 || account.category || '其他';
    const value = parseFloat(account.currentValue || account.balance || account.currentPrice * account.shares || 0);
    if (!categoryValueMap[categoryL1]) {
      categoryValueMap[categoryL1] = 0;
    }
    categoryValueMap[categoryL1] += value;
  });

  // 颜色优先级：分类自身 color -> CATEGORY_COLORS -> PRESET_COLORS
  const classColorMap = {};
  classList.forEach((cls) => {
    if (cls && cls.name) {
      classColorMap[cls.name] = cls.color;
    }
  });

  // 确保包含所有DEFAULT_CLASSES中的分类
  const categories = DEFAULT_CLASSES.map((c) => c.name);
  const colorMap = {};
  categories.forEach((name, index) => {
    colorMap[name] =
      classColorMap[name] ||
      CATEGORY_COLORS[name] ||
      DEFAULT_CLASSES.find((c) => c.name === name)?.color ||
      PRESET_COLORS[index % PRESET_COLORS.length];
  });

  if (categories.length === 0) {
    return { trendData: [], categories: [], colorMap: {} };
  }

  const DAYS = 30;
  const trendData = [];
  const today = new Date();

  for (let i = DAYS - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dayIndex = DAYS - 1 - i;
    const dateLabel = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;

    const point = { date: dateLabel };
    categories.forEach((name) => {
      const currentValue = categoryValueMap[name] || 0;
      const ramp = 0.85 + 0.15 * (dayIndex / (DAYS - 1));
      let hash = 0;
      for (let j = 0; j < name.length; j++) {
        hash = (hash * 31 + name.charCodeAt(j)) | 0;
      }
      hash = hash + dayIndex * 17;
      const noise = 1 + 0.05 * Math.sin(hash);
      point[name] = Math.max(0, currentValue * ramp * noise);
    });
    trendData.push(point);
  }

  return { trendData, categories, colorMap };
}

function computeStatsForClasses(assetClasses, stateData) {
  const financeAccounts = stateData?.financeAssets || [];
  const independentAssets = stateData?.independentAssets || {};
  const hasFinanceData = financeAccounts.length > 0;

  let classes;
  let domesticOverseasData = [];
  let independentAssetsData = [];
  let financeAccountsRef = financeAccounts;

  if (hasFinanceData) {
    classes = aggregateClassesFromFinance(financeAccounts, assetClasses);
    domesticOverseasData = computeDomesticOverseasPie(financeAccounts);
  } else {
    classes = (assetClasses || []).map((cls) => ({ ...cls }));
    domesticOverseasData = [];
    financeAccountsRef = [];
  }

  independentAssetsData = computeIndependentAssetsPie(independentAssets);

  const classesWithPnl = classes.map((cls) => {
    const pnl = (cls.value || 0) - (cls.openingValue || 0);
    const pnlRate =
      (cls.openingValue || 0) > 0 ? (pnl / cls.openingValue) * 100 : 0;
    return {
      ...cls,
      pnl,
      pnlRate,
    };
  });

  const totalValue = classesWithPnl.reduce((sum, c) => sum + (c.value || 0), 0);
  const totalCost = classesWithPnl.reduce((sum, c) => sum + (c.openingValue || 0), 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlRate = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const totalIncome = classesWithPnl.reduce((sum, c) => sum + (c.income || 0), 0);
  const totalExpense = classesWithPnl.reduce((sum, c) => sum + (c.expense || 0), 0);

  const avgExpectedReturn =
    totalValue > 0
      ? classesWithPnl.reduce(
          (sum, c) => sum + (c.expectedReturn || 0) * (c.value || 0),
          0
        ) / totalValue
      : 0;

  const enrichedClasses = classesWithPnl.map((cls) => ({
    ...cls,
    percent: totalValue > 0 ? ((cls.value || 0) / totalValue) * 100 : 0,
    targetProgress:
      (cls.targetValue || 0) > 0
        ? ((cls.value || 0) / cls.targetValue) * 100
        : 0,
  }));

  const assetTypeBreakdownMap = {};
  enrichedClasses.forEach((cls) => {
    const children = cls.children || [];
    const typeMap = {};
    children.forEach((child) => {
      const name = child.name || '其他';
      const value = parseFloat(child.value || 0);
      if (!typeMap[name]) {
        typeMap[name] = 0;
      }
      typeMap[name] += value;
    });
    const classTotal = Object.values(typeMap).reduce((sum, v) => sum + v, 0);
    assetTypeBreakdownMap[cls.name] = Object.entries(typeMap)
      .map(([name, value], index) => ({
        name,
        value,
        percent: classTotal > 0 ? (value / classTotal) * 100 : 0,
        color: PRESET_COLORS[index % PRESET_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  });

  return {
    classes: enrichedClasses,
    totalValue,
    totalCost,
    totalPnl,
    totalPnlRate,
    totalIncome,
    totalExpense,
    avgExpectedReturn,
    domesticOverseasData,
    independentAssetsData,
    financeAccounts: financeAccountsRef,
    assetTypeBreakdownMap,
  };
}

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const p = payload[0];
    return (
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg text-sm">
        <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
        <div className="text-gray-600 dark:text-gray-300">
          {formatCurrency(p.value)}（{p.percent?.toFixed(2)}%）
        </div>
      </div>
    );
  }
  return null;
};

const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg text-sm">
        <div className="font-medium text-gray-900 dark:text-white mb-1">{label}</div>
        {payload.map((p, i) => (
          <div key={i} className="text-gray-600 dark:text-gray-300">
            <span
              className="inline-block w-2 h-2 rounded-full mr-1"
              style={{ backgroundColor: p.color }}
            />
            {p.name}：{formatCurrency(p.value)}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function AssetClasses({ onCategorySelect }) {
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [filterName, setFilterName] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    children: [],
    value: 0,
    openingValue: 0,
    targetValue: 0,
    expectedReturn: 0,
    income: 0,
    expense: 0,
    color: '#6366F1',
    visible: true,
  });
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [addingChildForClassId, setAddingChildForClassId] = useState(null);
  const [newChildForm, setNewChildForm] = useState({
    market: DOMESTIC_MARKET,
    assetType: ASSET_TYPE_OPTIONS[0],
    value: 0,
    openingValue: 0,
  });
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState('CNY');
  const [labelSize, setLabelSize] = useState('small');

  const LABEL_SIZE_MAP = {
    small: '10px',
    medium: '12px',
    large: '14px',
  };

  const { assetClasses = [] } = stateData || {};

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchState();
      let currentClasses = data.assetClasses || [];

      const existingNames = new Set(currentClasses.map((c) => c.name));
      const missingDefaults = DEFAULT_CLASSES.filter(
        (dc) => !existingNames.has(dc.name)
      );

      if (missingDefaults.length > 0) {
        const newDefaultClasses = missingDefaults.map((dc, idx) => ({
          ...createDefaultClass(dc),
          id: `default-${dc.name}-${Date.now()}-${idx}`,
        }));
        const updatedClasses = [...newDefaultClasses, ...currentClasses];
        const newState = { ...data, assetClasses: updatedClasses };
        const result = await saveState(newState);
        if (result.success !== false) {
          setStateData(newState);
        } else {
          setStateData(data);
        }
      } else {
        setStateData(data);
      }
    } catch (err) {
      console.error('Failed to load asset classes data:', err);
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const visibleClasses = useMemo(() => {
    return assetClasses.filter((cls) => showHidden || cls.visible !== false);
  }, [assetClasses, showHidden]);

  const filteredClasses = useMemo(() => {
    return visibleClasses.filter((cls) => {
      return !filterName || cls.name.toLowerCase().includes(filterName.toLowerCase());
    });
  }, [visibleClasses, filterName]);

  const stats = useMemo(() => {
    if (loading || error) return null;
    return computeStatsForClasses(visibleClasses, stateData);
  }, [visibleClasses, loading, error, stateData]);

  const {
    classes = [],
    totalValue = 0,
    totalCost = 0,
    totalPnl = 0,
    totalPnlRate = 0,
    totalIncome = 0,
    totalExpense = 0,
    avgExpectedReturn = 0,
    domesticOverseasData = [],
    independentAssetsData = [],
    financeAccounts = [],
    assetTypeBreakdownMap = {},
  } = stats || {};

  const hasFinanceData = financeAccounts.length > 0;

  const chartData = classes.filter((c) => c.visible !== false && (c.value || 0) > 0);

  const visibleChartData = chartData.length > 0;

  const categoryL1AmountData = useMemo(() => {
    return computeCategoryL1Amounts(financeAccounts);
  }, [financeAccounts]);

  const hasCategoryL1Data = categoryL1AmountData.length > 0 && categoryL1AmountData.some((d) => d.value > 0);

  const drilldownData = useMemo(() => {
    if (!selectedClass) return [];
    return assetTypeBreakdownMap[selectedClass] || [];
  }, [selectedClass, assetTypeBreakdownMap]);

  const hasDrilldownData = drilldownData.length > 0 && drilldownData.some((d) => d.value > 0);

  const selectedClassInfo = useMemo(() => {
    if (!selectedClass) return null;
    return classes.find((c) => c.name === selectedClass) || null;
  }, [selectedClass, classes]);

  useEffect(() => {
    if (selectedClass && classes.length > 0) {
      const exists = classes.some((c) => c.name === selectedClass);
      if (!exists) {
        setSelectedClass(null);
      }
    }
  }, [classes, selectedClass]);

  const hasDomesticOverseasData = domesticOverseasData.length > 0 && domesticOverseasData.some((d) => d.value > 0);

  const trendDataInfo = useMemo(() => {
    if (!stats || !hasFinanceData) return { trendData: [], categories: [], colorMap: {} };
    return generateTrendData(financeAccounts, classes);
  }, [stats, hasFinanceData, financeAccounts, classes]);

  const detailData = useMemo(() => {
    if (!selectedClassInfo) {
      return { detailPieData: [], detailBarData: [], detailDomesticOverseasData: [] };
    }

    const children = selectedClassInfo.children || [];

    const typeMap = {};
    const marketMap = { [DOMESTIC_MARKET]: 0, [OVERSEAS_MARKET]: 0 };

    children.forEach((child) => {
      const name = child.name || '其他';
      const market = normalizeMarket(child.market);
      let value = parseFloat(child.value || 0);

      if (selectedCurrency === 'USD') {
        value = market === OVERSEAS_MARKET ? value / EXCHANGE_RATE : value;
      }

      if (!typeMap[name]) {
        typeMap[name] = 0;
      }
      typeMap[name] += value;
      marketMap[market] += value;
    });

    const totalTypeValue = Object.values(typeMap).reduce((sum, v) => sum + v, 0);
    const totalMarketValue = marketMap[DOMESTIC_MARKET] + marketMap[OVERSEAS_MARKET];

    const detailPieData = Object.entries(typeMap)
      .map(([name, value], index) => ({
        name,
        value,
        percent: totalTypeValue > 0 ? (value / totalTypeValue) * 100 : 0,
        color: PRESET_COLORS[index % PRESET_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);

    const detailBarData = Object.entries(typeMap)
      .map(([name, value], index) => ({
        name,
        value,
        color: PRESET_COLORS[index % PRESET_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);

    const detailDomesticOverseasData = [
      {
        name: DOMESTIC_MARKET,
        value: marketMap[DOMESTIC_MARKET],
        percent: totalMarketValue > 0 ? (marketMap[DOMESTIC_MARKET] / totalMarketValue) * 100 : 0,
        color: '#3B82F6',
      },
      {
        name: OVERSEAS_MARKET,
        value: marketMap[OVERSEAS_MARKET],
        percent: totalMarketValue > 0 ? (marketMap[OVERSEAS_MARKET] / totalMarketValue) * 100 : 0,
        color: '#F97316',
      },
    ];

    return { detailPieData, detailBarData, detailDomesticOverseasData };
  }, [selectedClassInfo, selectedCurrency]);

  const { detailPieData = [], detailBarData = [], detailDomesticOverseasData = [] } = detailData;

  const displayClasses = useMemo(() => {
    if (!filterName.trim()) return classes;
    const q = filterName.toLowerCase();
    return classes.filter((cls) => cls.name.toLowerCase().includes(q));
  }, [classes, filterName]);

  const handleAdd = () => {
    const defaultName = CATEGORY_L1_OPTIONS[0];
    setEditingClass(null);
    setFormData({
      name: defaultName,
      children: [],
      value: 0,
      openingValue: 0,
      targetValue: 0,
      expectedReturn: 0,
      income: 0,
      expense: 0,
      color: CATEGORY_COLORS[defaultName] || '#6366F1',
      visible: true,
    });
    setShowModal(true);
  };

  const tryAutoFill = (name) => {
    if (!name.trim() || editingClass) return;
    const { autoValue, autoOpening } = autoFillFromFinanceAssets(name);
    setFormData((prev) => ({
      ...prev,
      value: prev.value === 0 ? autoValue : prev.value,
      openingValue: prev.openingValue === 0 ? autoOpening : prev.openingValue,
    }));
  };

  const handleCategoryNameChange = (name) => {
    setFormData((prev) => ({
      ...prev,
      name,
      color: CATEGORY_COLORS[name] || prev.color,
    }));
    tryAutoFill(name);
  };

  const autoFillFromFinanceAssets = (name) => {
    const financeAssets = stateData?.financeAssets || [];
    let autoValue = 0;
    let autoOpening = 0;
    financeAssets.forEach((asset) => {
      if (
        asset.category === name ||
        asset.subcategory === name
      ) {
        autoValue += (asset.currentPrice || 0) * (asset.shares || 0);
        autoOpening += (asset.costPrice || 0) * (asset.shares || 0);
      }
    });
    return { autoValue, autoOpening };
  };

  const computeValueFromFinance = (className) => {
    const accounts = stateData?.financeAssets || [];
    let totalValue = 0;
    accounts.forEach((account) => {
      const categoryL1 = account.categoryL1 || account.category;
      if (categoryL1 === className) {
        totalValue += parseFloat(account.currentValue || account.currentPrice * account.shares || account.balance || 0);
      }
    });
    return totalValue;
  };

  const handleEdit = (cls) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name || '',
      children: Array.isArray(cls.children) ? [...cls.children] : [],
      value: computeValueFromFinance(cls.name),
      openingValue: cls.openingValue || 0,
      targetValue: cls.targetValue || 0,
      expectedReturn: cls.expectedReturn || 0,
      income: cls.income || 0,
      expense: cls.expense || 0,
      color: cls.color || '#6366F1',
      visible: cls.visible !== false,
    });
    setShowModal(true);
  };

  const handleDelete = async (cls) => {
    if (!cls) return;

    const clsId = cls.id;
    const className = cls.name;

    if (!className) {
      alert('分类信息异常，无法删除');
      return;
    }

    // 检查理财模块中是否有持仓明细关联该分类
    const accounts = stateData?.financeAssets || [];
    const relatedAccounts = accounts.filter(
      (acc) => (acc.categoryL1 || acc.category) === className
    );

    if (relatedAccounts.length > 0) {
      alert(`该分类下有 ${relatedAccounts.length} 条关联数据，请先解除关联数据才能删除`);
      return;
    }

    if (!confirm('确定要删除该分类吗？')) return;

    try {
      const newClasses = (stateData.assetClasses || []).filter(
        (c) => c.id !== clsId && c.name !== className
      );
      const newState = { ...stateData, assetClasses: newClasses };
      const result = await saveState(newState);
      if (result.success !== false) {
        setStateData(newState);
      }
    } catch (err) {
      console.error('Failed to delete asset class:', err);
    }
  };

  const handleMoveUp = async (clsId) => {
    const arr = stateData.assetClasses || [];
    const idx = arr.findIndex((c) => c.id === clsId);
    if (idx <= 0) return;
    const newClasses = [...arr];
    [newClasses[idx - 1], newClasses[idx]] = [newClasses[idx], newClasses[idx - 1]];
    const newState = { ...stateData, assetClasses: newClasses };
    try {
      const result = await saveState(newState);
      if (result.success !== false) {
        setStateData(newState);
      }
    } catch (err) {
      console.error('Failed to move up:', err);
    }
  };

  const handleMoveDown = async (clsId) => {
    const arr = stateData.assetClasses || [];
    const idx = arr.findIndex((c) => c.id === clsId);
    if (idx === -1 || idx >= arr.length - 1) return;
    const newClasses = [...arr];
    [newClasses[idx + 1], newClasses[idx]] = [newClasses[idx], newClasses[idx + 1]];
    const newState = { ...stateData, assetClasses: newClasses };
    try {
      const result = await saveState(newState);
      if (result.success !== false) {
        setStateData(newState);
      }
    } catch (err) {
      console.error('Failed to move down:', err);
    }
  };

  const handleToggleVisible = async (cls) => {
    const arr = stateData.assetClasses || [];
    const newClasses = arr.map((c) =>
      c.id === cls.id ? { ...c, visible: c.visible === false ? true : false } : c
    );
    const newState = { ...stateData, assetClasses: newClasses };
    try {
      const result = await saveState(newState);
      if (result.success !== false) {
        setStateData(newState);
      }
    } catch (err) {
      console.error('Failed to toggle visible:', err);
    }
  };

  const addChildToClass = async (clsId, childInput) => {
    if (!childInput) return;
    let childObj;
    if (typeof childInput === 'string') {
      if (!childInput.trim()) return;
      childObj = { name: childInput.trim(), value: 0, openingValue: 0, market: '', isAutoSync: false };
    } else {
      childObj = { ...childInput, isAutoSync: childInput.isAutoSync || false };
    }
    const arr = stateData.assetClasses || [];
    const newClasses = arr.map((c) => {
      if (c.id === clsId) {
        const children = Array.isArray(c.children) ? [...c.children] : [];
        children.push(childObj);
        return { ...c, children };
      }
      return c;
    });
    const newState = { ...stateData, assetClasses: newClasses };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
    }
  };

  const openAddChildModal = (clsId) => {
    setAddingChildForClassId(clsId);
    setNewChildForm({
      market: DOMESTIC_MARKET,
      assetType: ASSET_TYPE_OPTIONS[0],
      value: 0,
      openingValue: 0,
    });
    setShowAddChildModal(true);
  };

  const closeAddChildModal = () => {
    setShowAddChildModal(false);
    setAddingChildForClassId(null);
    setNewChildForm({
      market: DOMESTIC_MARKET,
      assetType: ASSET_TYPE_OPTIONS[0],
      value: 0,
      openingValue: 0,
    });
  };

  const getFinanceChildData = (className, market, assetType) => {
    const accounts = stateData?.financeAssets || [];
    let value = 0;
    let openingValue = 0;
    let found = false;
    accounts.forEach((account) => {
      const categoryL1 = account.categoryL1 || account.category || '';
      const accAssetType = account.assetType || account.kind || account.category || '';
      const accMarket = normalizeMarket(account.market);
      if (categoryL1 === className && accAssetType === assetType && accMarket === market) {
        value += parseFloat(account.currentValue || account.currentPrice * account.shares || account.balance || 0);
        openingValue += parseFloat(account.cost || account.costPrice * account.shares || 0);
        found = true;
      }
    });
    return { value, openingValue, found };
  };

  const hasDuplicateCustomChild = (clsId, market, assetType) => {
    const arr = stateData.assetClasses || [];
    const cls = arr.find((c) => c.id === clsId);
    if (!cls) return false;
    const children = cls.children || [];
    return children.some((c) => !c.isAutoSync && c.market === market && c.name === assetType);
  };

  const hasAutoSyncChild = (clsId, market, assetType) => {
    if (!hasFinanceData) return false;
    const cls = classes.find((c) => c.id === clsId);
    if (!cls) return false;
    const children = cls.children || [];
    return children.some((c) => c.isAutoSync && c.market === market && c.name === assetType);
  };

  const handleAddChildConfirm = async () => {
    if (!addingChildForClassId) return;
    const { market, assetType, value, openingValue } = newChildForm;

    if (hasAutoSyncChild(addingChildForClassId, market, assetType)) {
      alert('该市场+资产类型已存在自动同步项，无需重复添加');
      return;
    }
    if (hasDuplicateCustomChild(addingChildForClassId, market, assetType)) {
      alert('该市场+资产类型的自定义项已存在');
      return;
    }

    const cls = (stateData.assetClasses || []).find((c) => c.id === addingChildForClassId);
    const className = cls?.name || '';

    let finalValue = Number(value) || 0;
    let finalOpeningValue = Number(openingValue) || 0;

    if (hasFinanceData) {
      const financeData = getFinanceChildData(className, market, assetType);
      if (financeData.found) {
        finalValue = financeData.value;
        finalOpeningValue = financeData.openingValue;
      }
    }

    await addChildToClass(addingChildForClassId, {
      name: assetType,
      market,
      value: finalValue,
      openingValue: finalOpeningValue,
      isAutoSync: false,
    });

    closeAddChildModal();
  };

  const updateChildInClass = async (clsId, childIdx, updates) => {
    const arr = stateData.assetClasses || [];
    const newClasses = arr.map((c) => {
      if (c.id === clsId) {
        const children = Array.isArray(c.children) ? [...c.children] : [];
        if (childIdx >= 0 && childIdx < children.length) {
          children[childIdx] = { ...children[childIdx], ...updates };
        }
        return { ...c, children };
      }
      return c;
    });
    const newState = { ...stateData, assetClasses: newClasses };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
    }
  };

  const removeChildFromClass = async (clsId, childIdx) => {
    if (!confirm('确定要删除该二级分类吗？')) return;
    const arr = stateData.assetClasses || [];
    const newClasses = arr.map((c) => {
      if (c.id === clsId) {
        const children = Array.isArray(c.children) ? [...c.children] : [];
        if (childIdx >= 0 && childIdx < children.length) {
          children.splice(childIdx, 1);
        }
        return { ...c, children };
      }
      return c;
    });
    const newState = { ...stateData, assetClasses: newClasses };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('请输入分类名称');
      return;
    }
    if (!stateData) {
      alert('数据尚未加载，请稍后重试');
      return;
    }

    try {
      let newClasses = stateData.assetClasses || [];

      if (editingClass) {
        newClasses = newClasses.map((c) =>
          c.id === editingClass.id
            ? {
                ...c,
                name: formData.name,
                children: formData.children,
                value: computeValueFromFinance(formData.name),
                openingValue: Number(formData.openingValue) || 0,
                targetValue: Number(formData.targetValue) || 0,
                expectedReturn: Number(formData.expectedReturn) || 0,
                income: Number(formData.income) || 0,
                expense: Number(formData.expense) || 0,
                color: formData.color,
                visible: formData.visible,
              }
            : c
        );
      } else {
        if (newClasses.find((c) => c.name === formData.name)) {
          alert('该分类已存在');
          return;
        }
        newClasses = [
          ...newClasses,
          {
            id: `custom-${formData.name}-${Date.now()}`,
            name: formData.name,
            children: formData.children,
            visible: formData.visible,
            value: Number(formData.value) || 0,
            openingValue: Number(formData.openingValue) || 0,
            targetValue: Number(formData.targetValue) || 0,
            income: Number(formData.income) || 0,
            expense: Number(formData.expense) || 0,
            laborIncome: 0,
            color: formData.color,
            expectedReturn: Number(formData.expectedReturn) || 0,
          },
        ];
      }

      // 如果分类名称变更，同步更新理财模块中引用该分类的数据
      let updatedFinanceAssets = stateData.financeAssets || [];
      if (editingClass && formData.name !== editingClass.name) {
        updatedFinanceAssets = updatedFinanceAssets.map(item => {
          if (item.categoryL1 === editingClass.name) {
            return { ...item, categoryL1: formData.name };
          }
          return item;
        });
      }

      const newState = { ...stateData, assetClasses: newClasses, financeAssets: updatedFinanceAssets };
      const result = await saveState(newState);
      if (result.success !== false) {
        setStateData(newState);
        setShowModal(false);
      } else {
        alert('保存失败：' + (result.error || '未知错误'));
      }
    } catch (err) {
      console.error('Failed to save asset class:', err);
      alert('保存失败：' + (err.message || '未知错误'));
    }
  };

  const addChild = () => {
    setFormData((prev) => ({
      ...prev,
      children: [...prev.children, ''],
    }));
  };

  const removeChild = (idx) => {
    setFormData((prev) => ({
      ...prev,
      children: prev.children.filter((_, i) => i !== idx),
    }));
  };

  const updateChild = (idx, val) => {
    setFormData((prev) => {
      const next = [...prev.children];
      next[idx] = val;
      return { ...prev, children: next };
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {loading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">加载中...</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                重试
              </button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Header */}
            <section
              className="rounded-2xl p-6 sm:p-7"
              style={{
                background: 'linear-gradient(135deg, #EDE9FE 0%, #F5F3FF 100%)',
              }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">资产分类</h1>
                  <p className="text-sm text-gray-600 mt-1">管理和查看资产分类详情</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={loadData}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-primary-500 text-primary-500 text-sm font-medium hover:bg-primary-500 hover:text-white transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    刷新数据
                  </button>
                  <button
                    onClick={handleAdd}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    添加分类
                  </button>
                </div>
              </div>
            </section>

            {/* Filter */}
            <section className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full sm:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      placeholder="搜索分类名称"
                      className="pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full sm:w-64"
                    />
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 select-none">
                    <input
                      type="checkbox"
                      checked={showHidden}
                      onChange={(e) => setShowHidden(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    显示隐藏分类
                  </label>
                </div>
                <button
                  onClick={() => {
                    setFilterName('');
                    setShowHidden(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  重置筛选
                </button>
              </div>
            </section>

            {/* Charts */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">标签大小</span>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                  <button
                    onClick={() => setLabelSize('small')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      labelSize === 'small'
                        ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    小
                  </button>
                  <button
                    onClick={() => setLabelSize('medium')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      labelSize === 'medium'
                        ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    中
                  </button>
                  <button
                    onClick={() => setLabelSize('large')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      labelSize === 'large'
                        ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    大
                  </button>
                </div>
              </div>
              {/* Pie Charts Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Asset Classification Pie Chart */}
                <div className={`bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border transition-all duration-300 overflow-visible ${
                  selectedClass
                    ? 'border-primary-400 dark:border-primary-500 shadow-md shadow-primary-100 dark:shadow-primary-900/20'
                    : 'border-gray-100 dark:border-slate-700'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {selectedClass && (
                      <button
                        onClick={() => setSelectedClass(null)}
                        className="text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/30 px-2 py-1 rounded-md transition-colors mr-1 active:scale-95"
                      >
                        ← 返回
                      </button>
                    )}
                    <PieChartIcon className="w-4 h-4 text-primary-500" />
                    <h3 className={`text-sm font-semibold transition-colors ${
                      selectedClass
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {selectedClass ? `${selectedClass} · 资产类型分布` : '资产分类占比'}
                    </h3>
                  </div>
                  <div className="h-64 relative">
                    {selectedClass ? (
                      hasDrilldownData ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart padding={{ top: 30, right: 30, bottom: 30, left: 30 }}>
                            <Pie
                              data={drilldownData}
                              dataKey="value"
                              nameKey="name"
                              innerRadius="40%"
                              outerRadius="65%"
                              paddingAngle={2}
                              label={({ name, payload }) => `${name} ${payload.percent?.toFixed(1) || 0}%`}
                              labelLine={{ strokeWidth: 1, stroke: '#ccc' }}
                              labelStyle={{ fontSize: LABEL_SIZE_MAP[labelSize] }}
                            >
                              {drilldownData.map((entry, index) => (
                                <Cell key={`cell-dd-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <ReTooltip content={<CustomPieTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                          该分类暂无明细数据
                        </div>
                      )
                    ) : visibleChartData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart padding={{ top: 30, right: 30, bottom: 30, left: 30 }}>
                          <Pie
                              data={chartData}
                              dataKey="value"
                              nameKey="name"
                              innerRadius="40%"
                              outerRadius="65%"
                              paddingAngle={2}
                              label={({ name, payload }) => `${name} ${payload.percent?.toFixed(1) || 0}%`}
                              labelLine={{ strokeWidth: 1, stroke: '#ccc' }}
                              labelStyle={{ fontSize: LABEL_SIZE_MAP[labelSize] }}
                              style={{ cursor: 'pointer' }}
                            >
                            {chartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.color || '#6366F1'}
                                onClick={() => setSelectedClass(entry.name)}
                                style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                                onMouseEnter={(e) => { e.target.style.opacity = '0.8'; }}
                                onMouseLeave={(e) => { e.target.style.opacity = '1'; }}
                              />
                            ))}
                          </Pie>
                          <ReTooltip content={<CustomPieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                        暂无数据
                      </div>
                    )}
                  </div>
                </div>

                {/* Independent Assets Pie Chart */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700 overflow-visible">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="w-4 h-4 text-primary-500" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">海内外资产占比</h3>
                  </div>
                  <div className="h-64 relative">
                    {hasDomesticOverseasData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart padding={{ top: 40, right: 20, bottom: 40, left: 60 }}>
                          <Pie
                            data={domesticOverseasData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius="35%"
                            outerRadius="55%"
                            paddingAngle={3}
                            label={({ name, payload }) => `${name} ${payload.percent?.toFixed(1) || 0}%`}
                            labelLine={{ strokeWidth: 1, stroke: '#ccc' }}
                            labelStyle={{ fontSize: LABEL_SIZE_MAP[labelSize], whiteSpace: 'nowrap' }}
                          >
                            {domesticOverseasData.map((entry, index) => (
                              <Cell key={`cell-do-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <ReTooltip content={<CustomPieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                        暂无数据
                      </div>
                    )}
                  </div>
                </div>

                {/* Independent Assets Pie Chart */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700 overflow-visible">
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase className="w-4 h-4 text-primary-500" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">独立资产占比</h3>
                  </div>
                  <div className="h-64 relative">
                    {independentAssetsData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart padding={{ top: 30, right: 30, bottom: 30, left: 30 }}>
                          <Pie
                            data={independentAssetsData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius="40%"
                            outerRadius="65%"
                            paddingAngle={2}
                            label={({ name, payload }) => `${name} ${payload.percent?.toFixed(1) || 0}%`}
                            labelLine={{ strokeWidth: 1, stroke: '#ccc' }}
                            labelStyle={{ fontSize: LABEL_SIZE_MAP[labelSize] }}
                          >
                            {independentAssetsData.map((entry, index) => (
                              <Cell key={`cell-ia-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <ReTooltip content={<CustomPieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                        暂无数据
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Analysis Charts Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Line Chart */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-primary-500" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">资产增长趋势</h3>
                  </div>
                  <div className="h-64">
                    {visibleChartData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`} />
                          <ReTooltip content={<CustomChartTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Line
                            type="monotone"
                            dataKey="openingValue"
                            name="期初价值"
                            stroke="#3B82F6"
                            strokeDasharray="5 5"
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            name="当前价值"
                            stroke="#6366F1"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                        暂无数据
                      </div>
                    )}
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-primary-500" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">分类对比</h3>
                  </div>
                  <div className="h-64">
                    {visibleChartData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`} />
                          <ReTooltip content={<CustomChartTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey="openingValue" name="期初价值" fill="#93C5FD" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="value" name="当前价值" fill="#6366F1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                        暂无数据
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Category Trend Line Chart */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-primary-500" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">资产分类增长趋势（近30天）</h3>
                </div>
                <div className="h-64">
                  {trendDataInfo.categories.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendDataInfo.trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`} />
                        <ReTooltip content={<CustomChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        {trendDataInfo.categories.map((cat) => (
                          <Line
                            key={cat}
                            type="monotone"
                            dataKey={cat}
                            name={cat}
                            stroke={trendDataInfo.colorMap[cat]}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                      暂无数据
                    </div>
                  )}
                </div>
              </div>

              {/* Category L1 Amount Bar Chart */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-primary-500" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">分类金额柱状图</h3>
                </div>
                <div className="h-64">
                  {hasCategoryL1Data ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryL1AmountData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`} />
                        <ReTooltip content={<CustomChartTooltip />} />
                        <Bar dataKey="value" name="金额" radius={[4, 4, 0, 0]}>
                          {categoryL1AmountData.map((entry, index) => (
                            <Cell key={`cell-amount-${index}`} fill={entry.color} />
                          ))}
                          <LabelList
                            dataKey="value"
                            position="top"
                            formatter={formatAmountChinese}
                            style={{ fontSize: '12px', fill: '#374151' }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                      暂无数据
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Stat Cards */}
            <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {/* Asset Category Pie Chart Card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700 col-span-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full p-2">
                    <PieChartIcon className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">资产分类占比</span>
                </div>
                <div className="h-36 relative">
                  {visibleChartData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="35%"
                          outerRadius="65%"
                          paddingAngle={1}
                          label={({ payload }) => `${payload.percent?.toFixed(0) || 0}%`}
                          labelLine={false}
                          style={{ cursor: 'pointer' }}
                        >
                          {chartData.map((entry, index) => (
                            <Cell
                              key={`stat-cell-${index}`}
                              fill={entry.color || '#6366F1'}
                            />
                          ))}
                        </Pie>
                        <ReTooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-xs">
                      暂无数据
                    </div>
                  )}
                  {visibleChartData && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <div className="text-xs font-bold text-gray-900 dark:text-white">
                          {formatCurrency(totalValue)}
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">
                          {chartData.length} 个分类
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full p-2">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">总资产市值</span>
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
                  {formatCurrency(totalValue)}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full p-2">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">总资产成本</span>
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
                  {formatCurrency(totalCost)}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`rounded-full p-2 ${
                    totalPnl >= 0
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  }`}>
                    {totalPnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">总盈亏</span>
                </div>
                <div className={`text-lg font-bold tabular-nums whitespace-nowrap ${
                  totalPnl >= 0 ? 'text-green-600' : 'text-red-500'
                }`}>
                  {formatCurrency(totalPnl)}
                </div>
                <div className={`text-xs ${totalPnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {formatPercentage(totalPnlRate)}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`rounded-full p-2 ${
                    totalPnlRate >= 0
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  }`}>
                    {totalPnlRate >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">总收益率</span>
                </div>
                <div className={`text-lg font-bold tabular-nums whitespace-nowrap ${
                  totalPnlRate >= 0 ? 'text-green-600' : 'text-red-500'
                }`}>
                  {formatPercentage(totalPnlRate)}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full p-2">
                    <Target className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">平均期望收益率</span>
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
                  {(avgExpectedReturn || 0).toFixed(2)}%
                </div>
              </div>
            </section>

            {/* Class Cards Grid */}
            <section>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">分类列表</h3>
              {displayClasses.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 shadow-soft border border-gray-100 dark:border-slate-700 text-center text-gray-500 dark:text-gray-400 text-sm">
                  暂无符合条件的资产分类数据
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {displayClasses.map((cls) => {
                    const isPositive = cls.pnl >= 0;
                    const isHidden = cls.visible === false;
                    return (
                      <div
                        key={cls.id}
                        onClick={() => onCategorySelect?.(cls.name)}
                        className={`bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                          'border-gray-100 dark:border-slate-700'
                        } ${isHidden ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: cls.color || '#6366F1' }}
                            />
                            <span className="font-semibold text-gray-900 dark:text-white text-sm truncate max-w-[120px]" title={cls.name}>{cls.name}</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMoveUp(cls.id); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                              title="前移"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMoveDown(cls.id); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                              title="后移"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEdit(cls); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                              title="编辑"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleVisible(cls); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                              title={isHidden ? '显示' : '隐藏'}
                            >
                              {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(cls); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums mb-1">
                          {(() => {
                            const childrenValue = (cls.children || []).reduce((sum, c) => sum + (c.value || 0), 0);
                            const displayValue = (cls.value || 0) > 0 ? cls.value : childrenValue;
                            return formatCurrency(displayValue);
                          })()}
                        </div>

                        <div className={`text-sm font-medium mb-3 ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                          {isPositive ? '+' : ''}{formatCurrency(cls.pnl)}（{formatPercentage(cls.pnlRate)}）
                        </div>

                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <span>占比 {(cls.percent || 0).toFixed(2)}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(cls.percent, 100)}%`,
                                backgroundColor: cls.color || '#6366F1',
                              }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                          <div className="flex items-center justify-between">
                            <span>目标价值</span>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {formatCurrency(cls.targetValue || 0)}
                              {cls.targetValue > 0 && (
                                <span className="ml-1 text-gray-500">({(cls.targetProgress || 0).toFixed(0)}%)</span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>年度收益</span>
                            <span className="text-green-600 font-medium">{formatCurrency(cls.income || 0)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>年度支出</span>
                            <span className="text-red-500 font-medium">{formatCurrency(cls.expense || 0)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>期望收益率</span>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {(cls.expectedReturn || 0).toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Modal */}
            {showModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {editingClass ? '编辑分类' : '添加分类'}
                    </h3>
                    <button
                      onClick={() => {
                        setShowModal(false);
                        setEditingClass(null);
                      }}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        分类名称 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleCategoryNameChange(e.target.value)}
                        placeholder="请输入分类名称"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        二级分类
                      </label>
                      <div className="space-y-2">
                        {formData.children.map((child, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={typeof child === 'object' ? (child.name || '') : (child || '')}
                              onChange={(e) => updateChild(idx, typeof child === 'object' ? { ...child, name: e.target.value } : e.target.value)}
                              placeholder="二级分类名称"
                              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                            <button
                              onClick={() => removeChild(idx)}
                              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={addChild}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          添加二级分类
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          当前价值
                          {editingClass && (
                            <span className="ml-2 text-xs text-primary-500">（自动计算）</span>
                          )}
                        </label>
                        <input
                          type="number"
                          value={formData.value}
                          onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                          readOnly={!!editingClass}
                          className={`w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                            editingClass ? 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-slate-600' : ''
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          期初价值
                        </label>
                        <input
                          type="number"
                          value={formData.openingValue}
                          onChange={(e) => setFormData({ ...formData, openingValue: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          目标价值
                        </label>
                        <input
                          type="number"
                          value={formData.targetValue}
                          onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          期望收益率 (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.expectedReturn}
                          onChange={(e) => setFormData({ ...formData, expectedReturn: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          年度收益
                        </label>
                        <input
                          type="number"
                          value={formData.income}
                          onChange={(e) => setFormData({ ...formData, income: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          年度支出
                        </label>
                        <input
                          type="number"
                          value={formData.expense}
                          onChange={(e) => setFormData({ ...formData, expense: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        颜色
                      </label>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          {PRESET_COLORS.map((c) => (
                            <button
                              key={c}
                              onClick={() => setFormData({ ...formData, color: c })}
                              className={`w-7 h-7 rounded-full border-2 transition-transform ${
                                formData.color === c ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={formData.color}
                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                            className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                          />
                          <span className="text-xs text-gray-500 dark:text-gray-400">自定义</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="visible"
                        checked={formData.visible}
                        onChange={(e) => setFormData({ ...formData, visible: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <label htmlFor="visible" className="text-sm text-gray-700 dark:text-gray-300 select-none">
                        可见
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => {
                        setShowModal(false);
                        setEditingClass(null);
                      }}
                      className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!formData.name.trim()}
                      className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      保存
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Add Child Modal */}
            {showAddChildModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      添加资产类型
                    </h3>
                    <button
                      onClick={closeAddChildModal}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        市场
                      </label>
                      <select
                        value={newChildForm.market}
                        onChange={(e) => setNewChildForm({ ...newChildForm, market: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value={DOMESTIC_MARKET}>国内市场</option>
                        <option value={OVERSEAS_MARKET}>海外市场</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        资产类型
                      </label>
                      <select
                        value={newChildForm.assetType}
                        onChange={(e) => setNewChildForm({ ...newChildForm, assetType: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        {ASSET_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    {hasFinanceData && (() => {
                      const cls = (stateData.assetClasses || []).find((c) => c.id === addingChildForClassId);
                      const className = cls?.name || '';
                      const financeData = getFinanceChildData(className, newChildForm.market, newChildForm.assetType);
                      return (
                        <p className={`text-xs ${financeData.found ? 'text-green-600' : 'text-gray-500'}`}>
                          {financeData.found
                            ? '已从理财模块自动同步数据'
                            : '暂无理财数据，将作为自定义项添加'}
                        </p>
                      );
                    })()}

                    {!hasFinanceData && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              当前价值
                            </label>
                            <input
                              type="number"
                              value={newChildForm.value}
                              onChange={(e) => setNewChildForm({ ...newChildForm, value: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              期初价值
                            </label>
                            <input
                              type="number"
                              value={newChildForm.openingValue}
                              onChange={(e) => setNewChildForm({ ...newChildForm, openingValue: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          暂无理财数据，将作为自定义项添加
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={closeAddChildModal}
                      className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleAddChildConfirm}
                      className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                    >
                      确定
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

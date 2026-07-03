import { useState, useEffect, useMemo } from 'react';
import { fetchState, saveState } from '../api';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  X,
  Wallet,
  Target,
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  BarChart3,
  Globe,
  Lock,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { DEFAULT_EXCHANGE_RATES } from '../utils/currency.js';

function formatCurrency(value, currency = 'CNY') {
  const options = {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  };
  return new Intl.NumberFormat(currency === 'CNY' ? 'zh-CN' : 'en-US', options).format(value);
}

function formatPercentage(value) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

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

const CATEGORY_COLORS = {
  '权益类': '#6366F1',
  '固收类': '#10B981',
  '现金类': '#06B6D4',
  '另类投资': '#8B5CF6',
  '商品': '#F59E0B',
};

const ASSET_TYPE_OPTIONS = ['股票', '基金', '债券', '期货', '期权', '外汇', '数字货币', '银行理财', '保险', '房产', '其他'];
const DOMESTIC_MARKET = '国内市场';
const OVERSEAS_MARKET = '海外市场';

const CURRENCIES = ['CNY', 'USD', 'EUR', 'JPY', 'GBP'];

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
    const assetType = account.assetType || account.category || '其他';
    const market = normalizeMarket(account.market);
    const value = parseFloat(account.currentValue || account.balance || 0);
    const cost = parseFloat(account.cost || 0);

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

function convertValue(value, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return value;
  const fromRate = DEFAULT_EXCHANGE_RATES[fromCurrency] || 1;
  const toRate = DEFAULT_EXCHANGE_RATES[toCurrency] || 1;
  if (!toRate) return value;
  return (value * fromRate) / toRate;
}

export default function CategoryDetail({ categoryName, onBack }) {
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('CNY');
  const [newChildForm, setNewChildForm] = useState({
    market: DOMESTIC_MARKET,
    assetType: ASSET_TYPE_OPTIONS[0],
    currency: 'CNY',
    value: 0,
    openingValue: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchState();
      setStateData(data);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const { assetClasses = [], accounts = [] } = stateData || {};
  const hasFinanceData = accounts.length > 0;

  const enrichedClasses = useMemo(() => {
    return aggregateClassesFromFinance(accounts, assetClasses);
  }, [accounts, assetClasses]);

  const categoryInfo = useMemo(() => {
    if (!categoryName) return null;
    return enrichedClasses.find((cls) => cls.name === categoryName) || null;
  }, [categoryName, enrichedClasses]);

  const stats = useMemo(() => {
    if (!categoryInfo) return null;

    const pnl = (categoryInfo.value || 0) - (categoryInfo.openingValue || 0);
    const pnlRate = (categoryInfo.openingValue || 0) > 0 ? (pnl / categoryInfo.openingValue) * 100 : 0;

    return {
      value: categoryInfo.value || 0,
      openingValue: categoryInfo.openingValue || 0,
      pnl,
      pnlRate,
      targetValue: categoryInfo.targetValue || 0,
      expectedReturn: categoryInfo.expectedReturn || 0,
      income: categoryInfo.income || 0,
      expense: categoryInfo.expense || 0,
    };
  }, [categoryInfo]);

  const chartData = useMemo(() => {
    if (!categoryInfo) return { pieData: [], barData: [], domesticOverseasData: [] };

    const children = categoryInfo.children || [];
    const typeMap = {};
    const marketMap = { [DOMESTIC_MARKET]: 0, [OVERSEAS_MARKET]: 0 };

    children.forEach((child) => {
      const name = child.name || '其他';
      const market = normalizeMarket(child.market);
      let value = parseFloat(child.value || 0);
      const childCurrency = child.currency || 'CNY';

      if (childCurrency !== selectedCurrency) {
        value = convertValue(value, childCurrency, selectedCurrency);
      } else if (market === OVERSEAS_MARKET && selectedCurrency === 'CNY' && childCurrency === 'CNY') {
        value = value;
      }

      if (!typeMap[name]) {
        typeMap[name] = 0;
      }
      typeMap[name] += value;
      marketMap[market] += value;
    });

    const totalTypeValue = Object.values(typeMap).reduce((sum, v) => sum + v, 0);
    const totalMarketValue = marketMap[DOMESTIC_MARKET] + marketMap[OVERSEAS_MARKET];

    const pieData = Object.entries(typeMap)
      .map(([name, value], index) => ({
        name,
        value,
        percent: totalTypeValue > 0 ? (value / totalTypeValue) * 100 : 0,
        color: PRESET_COLORS[index % PRESET_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);

    const barData = Object.entries(typeMap)
      .map(([name, value], index) => ({
        name,
        value,
        color: PRESET_COLORS[index % PRESET_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);

    const domesticOverseasData = [
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

    return { pieData, barData, domesticOverseasData };
  }, [categoryInfo, selectedCurrency]);

  const { pieData = [], barData = [], domesticOverseasData = [] } = chartData;

  const getFinanceChildData = (className, market, assetType) => {
    const accounts = stateData?.accounts || [];
    let value = 0;
    let openingValue = 0;
    let found = false;
    accounts.forEach((account) => {
      const categoryL1 = account.categoryL1 || account.category || '';
      const accAssetType = account.assetType || account.category || '';
      const accMarket = normalizeMarket(account.market);
      if (categoryL1 === className && accAssetType === assetType && accMarket === market) {
        value += parseFloat(account.currentValue || account.balance || 0);
        openingValue += parseFloat(account.cost || 0);
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
    const cls = enrichedClasses.find((c) => c.id === clsId);
    if (!cls) return false;
    const children = cls.children || [];
    return children.some((c) => c.isAutoSync && c.market === market && c.name === assetType);
  };

  const addChildToClass = async (clsId, childInput) => {
    if (!childInput) return;
    let childObj;
    if (typeof childInput === 'string') {
      if (!childInput.trim()) return;
      childObj = { name: childInput.trim(), value: 0, openingValue: 0, market: '', isAutoSync: false, currency: 'CNY' };
    } else {
      childObj = { ...childInput, isAutoSync: childInput.isAutoSync || false, currency: childInput.currency || 'CNY' };
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
    if (!confirm('确定要删除该资产类型吗？')) return;
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

  const openAddChildModal = () => {
    setNewChildForm({
      market: DOMESTIC_MARKET,
      assetType: ASSET_TYPE_OPTIONS[0],
      currency: 'CNY',
      value: 0,
      openingValue: 0,
    });
    setShowAddChildModal(true);
  };

  const closeAddChildModal = () => {
    setShowAddChildModal(false);
    setNewChildForm({
      market: DOMESTIC_MARKET,
      assetType: ASSET_TYPE_OPTIONS[0],
      currency: 'CNY',
      value: 0,
      openingValue: 0,
    });
  };

  const handleAddChildConfirm = async () => {
    if (!categoryInfo?.id) return;
    const { market, assetType, currency, value, openingValue } = newChildForm;

    if (hasAutoSyncChild(categoryInfo.id, market, assetType)) {
      alert('该市场+资产类型已存在自动同步项，无需重复添加');
      return;
    }
    if (hasDuplicateCustomChild(categoryInfo.id, market, assetType)) {
      alert('该市场+资产类型的自定义项已存在');
      return;
    }

    let finalValue = Number(value) || 0;
    let finalOpeningValue = Number(openingValue) || 0;

    if (hasFinanceData) {
      const financeData = getFinanceChildData(categoryName, market, assetType);
      if (financeData.found) {
        finalValue = financeData.value;
        finalOpeningValue = financeData.openingValue;
      }
    }

    await addChildToClass(categoryInfo.id, {
      name: assetType,
      market,
      currency,
      value: finalValue,
      openingValue: finalOpeningValue,
      isAutoSync: false,
    });

    closeAddChildModal();
  };

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const p = payload[0];
      return (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg text-sm">
          <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
          <div className="text-gray-600 dark:text-gray-300">
            {formatCurrency(p.value, selectedCurrency)}（{p.percent?.toFixed(2)}%）
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const p = payload[0];
      return (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg text-sm">
          <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
          <div className="text-gray-600 dark:text-gray-300">
            {formatCurrency(p.value, selectedCurrency)}
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
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
    );
  }

  if (!categoryInfo) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">返回</span>
            </button>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 shadow-soft border border-gray-100 dark:border-slate-700 text-center">
            <p className="text-gray-500 dark:text-gray-400">分类不存在</p>
          </div>
        </div>
      </div>
    );
  }

  const { value, pnl, pnlRate, targetValue, expectedReturn } = stats || {};

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <section className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">返回</span>
            </button>
            <div className="h-6 w-px bg-gray-200 dark:bg-slate-700" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{categoryInfo.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer"
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <button
              onClick={openAddChildModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              新增资产类型
            </button>
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full p-2">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">当前价值</span>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
              {formatCurrency(value, selectedCurrency)}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className={`rounded-full p-2 ${
                pnl >= 0
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              }`}>
                {pnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">盈亏</span>
            </div>
            <div className={`text-lg font-bold tabular-nums ${
              pnl >= 0 ? 'text-green-600' : 'text-red-500'
            }`}>
              {pnl >= 0 ? '+' : ''}{formatCurrency(pnl, selectedCurrency)}
            </div>
            <div className={`text-xs ${pnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {formatPercentage(pnlRate)}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full p-2">
                <Target className="w-4 h-4" />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">目标价值</span>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
              {formatCurrency(targetValue, selectedCurrency)}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full p-2">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">期望收益率</span>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {expectedReturn.toFixed(2)}%
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <PieChartIcon className="w-4 h-4 text-primary-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">资产类型占比</h3>
            </div>
            <div className="h-64">
              {pieData.length > 0 && pieData.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="40%"
                      outerRadius="70%"
                      paddingAngle={2}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`pie-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ReTooltip content={<CustomPieTooltip />} />
                    <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                  暂无数据
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-primary-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">资产类型金额</h3>
            </div>
            <div className="h-64">
              {barData.length > 0 && barData.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <ReTooltip content={<CustomBarTooltip />} />
                    <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]} />
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

        <section className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">海内外资产对比</h3>
          </div>
          <div className="h-64">
            {domesticOverseasData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={domesticOverseasData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="40%"
                    outerRadius="70%"
                    paddingAngle={2}
                  >
                    {domesticOverseasData.map((entry, index) => (
                      <Cell key={`do-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ReTooltip content={<CustomPieTooltip />} />
                  <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                暂无数据
              </div>
            )}
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-slate-600">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">资产类型明细</h3>
          </div>
          <div className="p-6">
            {!categoryInfo.children || categoryInfo.children.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                暂无资产类型数据，点击上方按钮添加
              </div>
            ) : (
              <div className="space-y-2">
                {(() => {
                  let customIdx = 0;
                  return categoryInfo.children.map((child, idx) => {
                    const childPnl = (child.value || 0) - (child.openingValue || 0);
                    const childPnlRate = (child.openingValue || 0) > 0
                      ? (childPnl / child.openingValue) * 100 : 0;
                    const isAuto = child.isAutoSync;
                    const market = child.market;
                    const isDomestic = market === DOMESTIC_MARKET;
                    const isOverseas = market === OVERSEAS_MARKET;
                    const currentCustomIdx = isAuto ? -1 : customIdx;
                    if (!isAuto) customIdx++;

                    const childCurrency = child.currency || 'CNY';
                    let displayValue = parseFloat(child.value || 0);
                    let displayOpeningValue = parseFloat(child.openingValue || 0);
                    let displayPnl = childPnl;

                    if (childCurrency !== selectedCurrency) {
                      displayValue = convertValue(displayValue, childCurrency, selectedCurrency);
                      displayOpeningValue = convertValue(displayOpeningValue, childCurrency, selectedCurrency);
                      displayPnl = convertValue(displayPnl, childCurrency, selectedCurrency);
                    }

                    return (
                      <div
                        key={`${child.name}-${child.market}-${isAuto ? 'auto' : 'custom'}-${idx}`}
                        className={`flex items-center justify-between rounded-lg px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors border-l-3 ${
                          isAuto
                            ? 'bg-white dark:bg-slate-700 border-primary-400 dark:border-primary-500'
                            : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {isDomestic && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                国内
                              </span>
                            )}
                            {isOverseas && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                海外
                              </span>
                            )}
                            {!isAuto && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300">
                                自定义
                              </span>
                            )}
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {child.name}
                            </span>
                            {isAuto && (
                              <Lock className="w-3 h-3 text-gray-400 shrink-0" title="自动同步" />
                            )}
                          </div>
                          <div className={`text-xs ${displayPnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {displayPnl >= 0 ? '+' : ''}{formatCurrency(displayPnl, selectedCurrency)}（{formatPercentage(childPnlRate)}）
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-base font-bold text-gray-900 dark:text-white tabular-nums">
                            {formatCurrency(displayValue, selectedCurrency)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                            期初 {formatCurrency(displayOpeningValue, selectedCurrency)}
                          </div>
                        </div>
                        {!isAuto && (
                          <div className="flex items-center gap-1 ml-4">
                            <button
                              onClick={() => {
                                const newName = prompt('修改资产类型名称：', child.name);
                                if (newName && newName !== child.name) {
                                  updateChildInClass(categoryInfo.id, currentCustomIdx, { name: newName.trim() });
                                }
                              }}
                              className="p-1.5 rounded text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                              title="编辑"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => removeChildFromClass(categoryInfo.id, currentCustomIdx)}
                              className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </section>

        {showAddChildModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">添加资产类型</h3>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    货币
                  </label>
                  <select
                    value={newChildForm.currency}
                    onChange={(e) => setNewChildForm({ ...newChildForm, currency: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {CURRENCIES.map((currency) => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                  </select>
                </div>

                {hasFinanceData && (() => {
                  const financeData = getFinanceChildData(categoryName, newChildForm.market, newChildForm.assetType);
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
      </div>
    </div>
  );
}
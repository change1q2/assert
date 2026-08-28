import { useState, useEffect, useMemo } from 'react';
import { fetchState, saveState } from '../api';
import { truncateNum } from '../utils/currency';
import {
  ArrowLeft,
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Target,
  Shield,
  CircleDollarSign,
  Check,
  Lightbulb,
  PieChart,
  BarChart3,
  Edit3,
  Trash2,
  Rocket,
  Zap,
} from 'lucide-react';
import { getStrategyById, getAssetPool, migrateStrategies } from '../utils/strategies';

const ICON_MAP = {
  Target,
  Shield,
  CircleDollarSign,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Rocket,
  Zap,
  PieChart,
  BarChart3,
  BookOpen,
  Plus,
};

const PHILOSOPHY_ICON_OPTIONS = [
  { key: 'Lightbulb', label: '灯泡' },
  { key: 'Target', label: '靶心' },
  { key: 'Shield', label: '盾牌' },
  { key: 'CircleDollarSign', label: '美元' },
  { key: 'TrendingUp', label: '上涨' },
  { key: 'Rocket', label: '火箭' },
  { key: 'Zap', label: '闪电' },
  { key: 'PieChart', label: '饼图' },
  { key: 'BarChart3', label: '柱状图' },
  { key: 'BookOpen', label: '书本' },
];

const PHILOSOPHY_COLOR_OPTIONS = [
  { key: 'purple', label: '紫色', cls: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' },
  { key: 'green', label: '绿色', cls: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' },
  { key: 'blue', label: '蓝色', cls: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
  { key: 'orange', label: '橙色', cls: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' },
  { key: 'gray', label: '灰色', cls: 'bg-gray-50 dark:bg-gray-700/30 text-gray-600 dark:text-gray-400' },
];

const COLOR_MAP = {
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    icon: 'text-purple-600 dark:text-purple-400',
    gradient: 'from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20',
    badge: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    icon: 'text-green-600 dark:text-green-400',
    gradient: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
    badge: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    icon: 'text-orange-600 dark:text-orange-400',
    gradient: 'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20',
    badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'text-blue-600 dark:text-blue-400',
    gradient: 'from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20',
    badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  },
  gray: {
    bg: 'bg-gray-50 dark:bg-gray-700/30',
    icon: 'text-gray-600 dark:text-gray-400',
    gradient: 'from-gray-50 to-slate-50 dark:from-gray-800/20 dark:to-slate-800/20',
    badge: 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400',
  },
};

function formatCurrency(value, currency = 'CNY') {
  const symbol = currency === 'CNY' ? '¥' : currency === 'USD' ? '$' : currency === 'HKD' ? 'HK$' : currency === 'JPY' ? '¥' : '¥';
  const num = parseFloat(value) || 0;
  return `${symbol}${new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(truncateNum(num, 3))}`;
}

function formatPercentage(value) {
  if (value === null || value === undefined) return '—';
  const n = parseFloat(value);
  if (isNaN(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
}

const POS_CLASS = 'text-green-600 dark:text-green-400';
const NEG_CLASS = 'text-red-500 dark:text-red-400';

function pnlClass(val) {
  const n = parseFloat(val);
  return isNaN(n) ? '' : n >= 0 ? POS_CLASS : NEG_CLASS;
}

export default function StrategyDetail({ strategyId, onBack, onNavigate }) {
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showAddPhilosophy, setShowAddPhilosophy] = useState(false);
  const [newPhilosophy, setNewPhilosophy] = useState({ title: '', description: '', icon: 'Lightbulb', color: 'gray' });
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [addAssetAccount, setAddAssetAccount] = useState('');

  useEffect(() => {
    if (!showAddAsset) {
      setAddAssetAccount('');
    }
  }, [showAddAsset]);

  const accountsForStrategy = useMemo(() => {
    const accountNames = new Set();
    // 从账户管理模块获取账户名
    (stateData?.accounts || []).forEach(a => {
      const accountName = a.name || '';
      if (accountName) accountNames.add(accountName);
    });
    // 同时从理财持仓中获取账户名（覆盖可能不在账户管理中的持仓账户）
    (stateData?.financeAssets || []).forEach(a => {
      const accountName = a.account || a.accountId || '';
      if (accountName) accountNames.add(accountName);
    });
    return [...accountNames];
  }, [stateData]);

  useEffect(() => {
    loadData();
  }, [strategyId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchState();
      if (data.strategies && !data.strategies.list) {
        data.strategies = migrateStrategies(data);
      }
      // 如果 strategies 为空，尝试从 localStorage 恢复
      if (!data.strategies || !data.strategies.list || data.strategies.list.length === 0) {
        try {
          const saved = localStorage.getItem('strategies_cache');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && Array.isArray(parsed.list)) {
              data.strategies = parsed;
              await saveState(data);
            }
          }
        } catch (e) {
          console.warn('Failed to restore strategies from cache:', e);
        }
      }
      setStateData(data);
    } catch (err) {
      console.error('Failed to load data:', err);
      // 加载失败时，尝试从缓存恢复
      try {
        const cachedState = localStorage.getItem('asset_platform_state');
        if (cachedState) {
          const parsed = JSON.parse(cachedState);
          const data = parsed?.data || parsed;
          if (data) {
            if (!data.strategies || !data.strategies.list || data.strategies.list.length === 0) {
              const saved = localStorage.getItem('strategies_cache');
              if (saved) {
                const stratParsed = JSON.parse(saved);
                if (stratParsed && Array.isArray(stratParsed.list)) {
                  data.strategies = stratParsed;
                }
              }
            }
            if (data.strategies && data.strategies.list) {
              setStateData(data);
              setError(null);
              return;
            }
          }
        }
      } catch (e) {
        console.warn('Failed to restore from cache:', e);
      }
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const strategy = useMemo(() => {
    return getStrategyById(stateData?.strategies, strategyId);
  }, [stateData, strategyId]);

  const poolIds = useMemo(() => {
    return getAssetPool(stateData?.strategies, strategyId);
  }, [stateData, strategyId]);

  const financeAssets = stateData?.financeAssets || [];

  const poolHoldings = useMemo(() => {
    return poolIds
      .map((id) => financeAssets.find((a) => String(a.id) === String(id)))
      .filter(Boolean);
  }, [poolIds, financeAssets]);

  const computedHoldings = useMemo(() => {
    return poolHoldings.map((a) => {
      const _price = parseFloat(a.currentPrice) || 0;
      const _cost = parseFloat(a.costPrice || a.cost) || 0;
      const _qty = parseFloat(a.shares || a.quantity) || 0;
      const _unitPnl = _price - _cost;
      const _holdingPnl = Math.round(_unitPnl * _qty * 100) / 100;
      const _holdingPnlRate = _cost > 0 ? Math.round((_unitPnl / _cost) * 100 * 100) / 100 : 0;
      return {
        id: a.id,
        name: a.name,
        code: a.code || '',
        assetType: a.kind || a.assetType || '',
        currency: a.currency || 'CNY',
        costPrice: _cost,
        quantity: _qty,
        cost: _cost * _qty,
        currentPrice: _price,
        currentValue: _price * _qty,
        holdingPnl: _holdingPnl,
        holdingPnlRate: _holdingPnlRate,
        transactions: a.transactions || [],
        isArchived: a.isArchived || a.status === 'archived',
        archiveDate: a.archiveDate || '',
      };
    });
  }, [poolHoldings]);

  const summary = useMemo(() => {
    const totalCost = computedHoldings.reduce((sum, h) => sum + h.cost, 0);
    const totalValue = computedHoldings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalPnl = totalValue - totalCost;
    const totalPnlRate = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
    return { totalCost, totalValue, totalPnl, totalPnlRate };
  }, [computedHoldings]);

  const cumulativeStats = useMemo(() => {
    let totalSellAmount = 0;
    let totalBuyAmount = 0;

    computedHoldings.forEach((h) => {
      const transactions = h.transactions || [];
      transactions.forEach((t) => {
        const direction = t.direction || t.type;
        const amount = parseFloat(t.amount) || 0;
        if (direction === '买入' || direction === '建仓') {
          totalBuyAmount += amount;
        } else if (direction === '卖出' || direction === '清仓') {
          totalSellAmount += Math.abs(amount);
        }
      });
    });

    const cumulativeReturn = totalSellAmount - totalBuyAmount;
    const cumulativeRate = totalBuyAmount > 0 ? (cumulativeReturn / totalBuyAmount) * 100 : 0;

    return { cumulativeReturn, cumulativeRate, totalBuyAmount, totalSellAmount };
  }, [computedHoldings]);

  const availableAssets = useMemo(() => {
    const poolIdSet = new Set(poolIds.map((id) => String(id)));
    return financeAssets.filter((a) => {
      if (poolIdSet.has(String(a.id))) return false;
      if (a.isArchived || a.status === 'archived') return false;
      if (addAssetAccount) {
        const assetAccount = String(a.account || a.accountId || '');
        if (assetAccount !== String(addAssetAccount)) return false;
      }
      return true;
    });
  }, [financeAssets, poolIds, addAssetAccount]);

  const handleSaveState = async (newState) => {
    const prevState = stateData;
    setStateData(newState);
    // 保存到 localStorage 作为备份
    try {
      localStorage.setItem('strategies_cache', JSON.stringify(newState.strategies));
    } catch (e) {
      console.warn('Failed to save strategies cache:', e);
    }
    try {
      await saveState(newState);
    } catch (err) {
      setStateData(prevState);
      console.error('Failed to save:', err);
      alert('保存失败：' + err.message);
      throw err;
    }
  };

  const handleAddPhilosophy = async () => {
    if (!newPhilosophy.title.trim()) return;
    setSaving(true);
    try {
      const phi = {
        id: `phi-${Date.now()}`,
        title: newPhilosophy.title.trim(),
        description: newPhilosophy.description.trim(),
        icon: newPhilosophy.icon,
        color: newPhilosophy.color,
      };
      const newStrategies = {
        ...stateData.strategies,
        list: stateData.strategies.list.map((s) =>
          s.id === strategyId
            ? { ...s, philosophies: [...(s.philosophies || []), phi] }
            : s
        ),
      };
      await handleSaveState({ ...stateData, strategies: newStrategies });
      setNewPhilosophy({ title: '', description: '', icon: 'Lightbulb', color: 'gray' });
      setShowAddPhilosophy(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePhilosophy = async (phiId) => {
    if (!confirm('确定删除该理念吗？')) return;
    setSaving(true);
    try {
      const newStrategies = {
        ...stateData.strategies,
        list: stateData.strategies.list.map((s) =>
          s.id === strategyId
            ? { ...s, philosophies: (s.philosophies || []).filter((p) => p.id !== phiId) }
            : s
        ),
      };
      await handleSaveState({ ...stateData, strategies: newStrategies });
    } finally {
      setSaving(false);
    }
  };

  const handleAddToPool = async () => {
    if (selectedIds.length === 0) return;
    setSaving(true);
    try {
      const newPool = [...poolIds, ...selectedIds];
      const newStrategies = {
        ...stateData.strategies,
        pools: {
          ...stateData.strategies.pools,
          [strategyId]: newPool,
        },
      };
      await handleSaveState({ ...stateData, strategies: newStrategies });
      setSelectedIds([]);
      setShowAddAsset(false);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFromPool = async (id) => {
    if (!confirm('确定从持仓池中移除此标的吗？')) return;
    setSaving(true);
    try {
      const newPool = poolIds.filter((pid) => String(pid) !== String(id));
      const newStrategies = {
        ...stateData.strategies,
        pools: {
          ...stateData.strategies.pools,
          [strategyId]: newPool,
        },
      };
      await handleSaveState({ ...stateData, strategies: newStrategies });
    } finally {
      setSaving(false);
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={loadData} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">策略未找到</p>
          <button onClick={onBack} className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
            返回
          </button>
        </div>
      </div>
    );
  }

  const colorClasses = COLOR_MAP[strategy.color] || COLOR_MAP.gray;
  const StrategyIcon = ICON_MAP[strategy.icon] || Lightbulb;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <section className={`rounded-2xl p-6 sm:p-7 bg-gradient-to-br ${colorClasses.gradient}`}>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <div className={`rounded-xl p-3 ${colorClasses.badge}`}>
              <StrategyIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{strategy.title}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">{strategy.description}</p>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary-500" />
              投资理念
            </h3>
            <button
              onClick={() => setShowAddPhilosophy(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              新增理念
            </button>
          </div>

          {strategy.philosophies && strategy.philosophies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {strategy.philosophies.map((phi) => {
                const PhiIcon = ICON_MAP[phi.icon] || Lightbulb;
                const phiCls = PHILOSOPHY_COLOR_OPTIONS.find((c) => c.key === phi.color) || PHILOSOPHY_COLOR_OPTIONS[4];
                return (
                  <div key={phi.id} className={`p-4 rounded-xl ${phiCls.cls} relative group`}>
                    <button
                      onClick={() => handleDeletePhilosophy(phi.id)}
                      className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/50 dark:hover:bg-slate-700/50 transition-opacity"
                      title="删除理念"
                    >
                      <Trash2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                    <div className="flex items-center gap-2 mb-2">
                      <PhiIcon className="w-5 h-5" />
                      <h4 className="font-medium text-gray-900 dark:text-white">{phi.title}</h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {phi.description}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500 dark:text-gray-400">暂无投资理念，点击"新增理念"添加</p>
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">总成本</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(summary.totalCost)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">总市值</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(summary.totalValue)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">总盈亏</p>
            <p className={`text-xl font-bold ${pnlClass(summary.totalPnl)}`}>
              {summary.totalPnl >= 0 ? '+' : ''}{formatCurrency(summary.totalPnl)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">总收益率</p>
            <p className={`text-xl font-bold ${pnlClass(summary.totalPnlRate)}`}>
              {formatPercentage(summary.totalPnlRate)}
            </p>
          </div>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">累计收益</p>
            <p className={`text-xl font-bold ${pnlClass(cumulativeStats.cumulativeReturn)}`}>
              {cumulativeStats.cumulativeReturn >= 0 ? '+' : ''}{formatCurrency(cumulativeStats.cumulativeReturn)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">累计收益率</p>
            <p className={`text-xl font-bold ${pnlClass(cumulativeStats.cumulativeRate)}`}>
              {formatPercentage(cumulativeStats.cumulativeRate)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">累计投入</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(cumulativeStats.totalBuyAmount)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">累计卖出</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(cumulativeStats.totalSellAmount)}
            </p>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-500" />
              持仓池
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                ({computedHoldings.length} 个标的)
              </span>
            </h3>
            <button
              onClick={() => {
                setSelectedIds([]);
                setShowAddAsset(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加标的
            </button>
          </div>

          {computedHoldings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">名称</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">代码</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">类型</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">持仓成本</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">当前市值</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">持仓盈亏</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">盈亏率</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {computedHoldings.map((h) => (
                    <tr key={h.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 ${h.isArchived ? 'opacity-70' : ''}`}>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                        <span className="flex items-center gap-1.5">
                          {h.name}
                          {h.isArchived && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
                              归档{h.archiveDate ? ` · ${h.archiveDate}` : ''}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{h.code || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{h.assetType || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right">{formatCurrency(h.cost, h.currency)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right">{formatCurrency(h.currentValue, h.currency)}</td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${pnlClass(h.holdingPnl)}`}>
                        {h.holdingPnl >= 0 ? '+' : ''}{formatCurrency(h.holdingPnl, h.currency)}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${pnlClass(h.holdingPnlRate)}`}>
                        {formatPercentage(h.holdingPnlRate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <button
                          onClick={() => handleRemoveFromPool(h.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs font-medium transition-colors"
                        >
                          移除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                持仓池为空
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
                点击"添加标的"按钮，从理财持仓中选择优质标的加入本策略持仓池。
              </p>
              <button
                onClick={() => {
                  setSelectedIds([]);
                  setShowAddAsset(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                添加标的
              </button>
            </div>
          )}
        </section>
      </div>

      {showAddPhilosophy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">新增理念</h2>
              <button
                onClick={() => setShowAddPhilosophy(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">理念标题</label>
                <input
                  type="text"
                  value={newPhilosophy.title}
                  onChange={(e) => setNewPhilosophy({ ...newPhilosophy, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="例如：长期持有"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">理念描述</label>
                <textarea
                  value={newPhilosophy.description}
                  onChange={(e) => setNewPhilosophy({ ...newPhilosophy, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="描述该投资理念的核心要点..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">图标</label>
                <div className="flex flex-wrap gap-2">
                  {PHILOSOPHY_ICON_OPTIONS.map((opt) => {
                    const Ico = ICON_MAP[opt.key];
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setNewPhilosophy({ ...newPhilosophy, icon: opt.key })}
                        className={`p-2 rounded-lg border transition-all ${
                          newPhilosophy.icon === opt.key
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-slate-600 hover:border-gray-300'
                        }`}
                        title={opt.label}
                      >
                        <Ico className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">颜色</label>
                <div className="flex gap-2">
                  {PHILOSOPHY_COLOR_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setNewPhilosophy({ ...newPhilosophy, color: opt.key })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newPhilosophy.color === opt.key ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'
                      } ${opt.cls.split(' ')[0]}`}
                      title={opt.label}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setShowAddPhilosophy(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 dark:border-slate-600 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddPhilosophy}
                disabled={!newPhilosophy.title.trim() || saving}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {saving ? '保存中...' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                添加标的到持仓池
              </h2>
              <button
                onClick={() => setShowAddAsset(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">账户本</label>
              <select
                value={addAssetAccount}
                onChange={(e) => { setAddAssetAccount(e.target.value); setSelectedIds([]); }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部账户</option>
                {accountsForStrategy.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {availableAssets.length > 0 ? (
                <div className="space-y-2">
                  {availableAssets.map((asset) => (
                    <div
                      key={asset.id}
                      onClick={() => toggleSelection(asset.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedIds.includes(asset.id)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                        selectedIds.includes(asset.id)
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300 dark:border-slate-600'
                      }`}>
                        {selectedIds.includes(asset.id) && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white text-sm">{asset.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {asset.code || '—'} · {asset.kind || asset.assetType || '—'} · {asset.currency || 'CNY'}
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-900 dark:text-white">
                        {formatCurrency(parseFloat(asset.costPrice || asset.cost || 0) * parseFloat(asset.shares || asset.quantity || 0), asset.currency)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">暂无可添加的标的</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    请先在理财模块中添加持仓
                  </p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setShowAddAsset(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 dark:border-slate-600 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddToPool}
                disabled={selectedIds.length === 0 || saving}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {saving ? '保存中...' : `添加 (${selectedIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

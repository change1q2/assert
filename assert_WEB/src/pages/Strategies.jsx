import { useState, useEffect, useMemo } from 'react';
import { fetchState, saveState } from '../api';
import {
  Lightbulb,
  RefreshCw,
  Rocket,
  Target,
  Zap,
  TrendingUp,
  ArrowRight,
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  PieChart,
  BarChart3,
  CircleDollarSign,
  Shield,
  BookOpen,
} from 'lucide-react';
import { migrateStrategies, getAssetPool } from '../utils/strategies';

const ICON_MAP = {
  Target,
  Shield,
  CircleDollarSign,
  Lightbulb,
  TrendingUp,
  Rocket,
  Zap,
  PieChart,
  BarChart3,
  BookOpen,
};

const STRATEGY_ICON_OPTIONS = [
  { key: 'Target', label: '靶心' },
  { key: 'TrendingUp', label: '上涨' },
  { key: 'Zap', label: '闪电' },
  { key: 'Rocket', label: '火箭' },
  { key: 'Lightbulb', label: '灯泡' },
  { key: 'PieChart', label: '饼图' },
  { key: 'BarChart3', label: '柱状图' },
];

const STRATEGY_COLOR_OPTIONS = [
  { key: 'purple', label: '紫色' },
  { key: 'green', label: '绿色' },
  { key: 'orange', label: '橙色' },
  { key: 'blue', label: '蓝色' },
  { key: 'gray', label: '灰色' },
];

const COLOR_MAP = {
  purple: {
    icon: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
    hover: 'hover:border-purple-300 dark:hover:border-purple-700',
  },
  green: {
    icon: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
    hover: 'hover:border-green-300 dark:hover:border-green-700',
  },
  orange: {
    icon: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
    hover: 'hover:border-orange-300 dark:hover:border-orange-700',
  },
  blue: {
    icon: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    hover: 'hover:border-blue-300 dark:hover:border-blue-700',
  },
  gray: {
    icon: 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400',
    border: 'border-gray-200 dark:border-slate-700',
    hover: 'hover:border-gray-300 dark:hover:border-slate-600',
  },
};

function formatCurrency(value) {
  const num = parseFloat(value) || 0;
  return `¥${new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)}`;
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

export default function Strategies({ onNavigate }) {
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '', icon: 'Lightbulb', color: 'gray' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchState();
      const migrated = migrateStrategies(data);
      if (!data.strategies || !data.strategies.list) {
        data.strategies = migrated;
        try {
          await saveState(data);
        } catch (e) {
          console.warn('Failed to persist migration:', e);
        }
      }
      setStateData(data);
    } catch (err) {
      console.error('Failed to load strategies data:', err);
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const strategies = stateData?.strategies?.list || [];
  const financeAssets = stateData?.financeAssets || [];

  const strategyMetrics = useMemo(() => {
    const metrics = {};
    strategies.forEach((strategy) => {
      const poolIds = getAssetPool(stateData?.strategies, strategy.id);
      const holdings = poolIds
        .map((id) => financeAssets.find((a) => String(a.id) === String(id)))
        .filter(Boolean);

      let totalCost = 0;
      let totalValue = 0;
      holdings.forEach((a) => {
        const _price = parseFloat(a.currentPrice) || 0;
        const _cost = parseFloat(a.costPrice || a.cost) || 0;
        const _qty = parseFloat(a.shares || a.quantity) || 0;
        totalCost += _cost * _qty;
        totalValue += _price * _qty;
      });
      const totalPnl = totalValue - totalCost;
      const totalPnlRate = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

      metrics[strategy.id] = { totalCost, totalValue, totalPnl, totalPnlRate, count: holdings.length };
    });
    return metrics;
  }, [strategies, stateData, financeAssets]);

  const handleStrategyClick = (strategy) => {
    if (onNavigate) {
      onNavigate('strategy-detail:' + strategy.id);
    }
  };

  const openAddModal = () => {
    setEditingStrategy(null);
    setFormData({ title: '', description: '', icon: 'Lightbulb', color: 'gray' });
    setShowModal(true);
  };

  const openEditModal = (strategy, e) => {
    e.stopPropagation();
    setEditingStrategy(strategy);
    setFormData({
      title: strategy.title,
      description: strategy.description || '',
      icon: strategy.icon || 'Lightbulb',
      color: strategy.color || 'gray',
    });
    setShowModal(true);
  };

  const handleSaveModal = async () => {
    if (!formData.title.trim()) return;
    setSaving(true);
    try {
      if (editingStrategy) {
        const newList = strategies.map((s) =>
          s.id === editingStrategy.id
            ? {
                ...s,
                title: formData.title.trim(),
                description: formData.description.trim(),
                icon: formData.icon,
                color: formData.color,
              }
            : s
        );
        const newState = {
          ...stateData,
          strategies: { ...stateData.strategies, list: newList },
        };
        setStateData(newState);
        await saveState(newState);
      } else {
        const newId = `custom-${Date.now()}`;
        const newStrategy = {
          id: newId,
          title: formData.title.trim(),
          description: formData.description.trim(),
          icon: formData.icon,
          color: formData.color,
          preset: false,
          philosophies: [],
        };
        const newState = {
          ...stateData,
          strategies: {
            ...stateData.strategies,
            list: [...strategies, newStrategy],
            pools: { ...stateData.strategies.pools, [newId]: [] },
          },
        };
        setStateData(newState);
        await saveState(newState);
      }
      setShowModal(false);
    } catch (err) {
      console.error('Failed to save strategy:', err);
      alert('保存失败：' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStrategy = async (strategy, e) => {
    e.stopPropagation();
    if (!confirm(`确定删除策略"${strategy.title}"吗？`)) return;
    setSaving(true);
    try {
      const newList = strategies.filter((s) => s.id !== strategy.id);
      const newPools = { ...(stateData.strategies.pools || {}) };
      delete newPools[strategy.id];
      const newState = {
        ...stateData,
        strategies: { ...stateData.strategies, list: newList, pools: newPools },
      };
      setStateData(newState);
      await saveState(newState);
    } catch (err) {
      console.error('Failed to delete strategy:', err);
      alert('删除失败：' + err.message);
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <section
          className="rounded-2xl p-6 sm:p-7"
          style={{
            background: 'linear-gradient(135deg, #EDE9FE 0%, #F5F3FF 100%)',
          }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">投资策略</h1>
              <p className="text-sm text-gray-600 mt-1">投资策略与资产配置</p>
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
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                新增策略
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary-500" />
            投资策略
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              ({strategies.length} 个策略)
            </span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {strategies.map((strategy) => {
              const Icon = ICON_MAP[strategy.icon] || Lightbulb;
              const colors = COLOR_MAP[strategy.color] || COLOR_MAP.gray;
              const metrics = strategyMetrics[strategy.id] || { totalCost: 0, totalValue: 0, totalPnl: 0, totalPnlRate: 0, count: 0 };
              const isPreset = strategy.preset;
              return (
                <div
                  key={strategy.id}
                  onClick={() => handleStrategyClick(strategy)}
                  className={`p-5 rounded-xl border transition-all cursor-pointer ${colors.border} ${colors.hover} hover:shadow-md relative group`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`rounded-xl p-3 ${colors.icon}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
                          {strategy.title}
                        </h4>
                        <div className="flex items-center gap-1 shrink-0">
                          {!isPreset && (
                            <>
                              <button
                                onClick={(e) => openEditModal(strategy, e)}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                title="编辑"
                              >
                                <Edit3 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteStrategy(strategy, e)}
                                className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </>
                          )}
                          <ArrowRight className="w-4 h-4 text-primary-500" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {strategy.description}
                      </p>
                      {isPreset && (
                        <span className="inline-block mt-2 text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                          预设策略
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">总市值</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(metrics.totalValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">总成本</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(metrics.totalCost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">总盈亏</p>
                      <p className={`text-sm font-semibold ${pnlClass(metrics.totalPnl)}`}>
                        {metrics.totalPnl >= 0 ? '+' : ''}{formatCurrency(metrics.totalPnl)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">收益率</p>
                      <p className={`text-sm font-semibold ${pnlClass(metrics.totalPnlRate)}`}>
                        {formatPercentage(metrics.totalPnlRate)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingStrategy ? '编辑策略' : '新增策略'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">策略标题</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="例如：量化对冲策略"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">策略描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                  placeholder="描述策略核心思路..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">图标</label>
                <div className="flex flex-wrap gap-2">
                  {STRATEGY_ICON_OPTIONS.map((opt) => {
                    const Ico = ICON_MAP[opt.key];
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setFormData({ ...formData, icon: opt.key })}
                        className={`p-2 rounded-lg border transition-all ${
                          formData.icon === opt.key
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
                  {STRATEGY_COLOR_OPTIONS.map((opt) => {
                    const cm = COLOR_MAP[opt.key];
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setFormData({ ...formData, color: opt.key })}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          formData.color === opt.key ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'
                        } ${cm.icon.split(' ')[0]}`}
                        title={opt.label}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 dark:border-slate-600 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveModal}
                disabled={!formData.title.trim() || saving}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {saving ? '保存中...' : (editingStrategy ? '保存' : '新增')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

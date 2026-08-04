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
} from 'lucide-react';

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
  return isNaN(n) ? '' : (n >= 0 ? POS_CLASS : NEG_CLASS);
}

export default function ValueInvesting({ onBack }) {
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);

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

  const financeAssets = stateData?.financeAssets || [];
  const valueInvestingPool = stateData?.strategies?.valueInvestingPool || [];

  // 池中持仓数据
  const poolHoldings = useMemo(() => {
    return valueInvestingPool
      .map(id => financeAssets.find(a => String(a.id) === String(id)))
      .filter(Boolean);
  }, [valueInvestingPool, financeAssets]);

  // 将 financeAssets 映射到前端 holding 结构（复用 Finance 模块逻辑）
  const computedHoldings = useMemo(() => {
    return poolHoldings.map(a => {
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
      };
    });
  }, [poolHoldings]);

  // 汇总数据
  const summary = useMemo(() => {
    const totalCost = computedHoldings.reduce((sum, h) => sum + h.cost, 0);
    const totalValue = computedHoldings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalPnl = totalValue - totalCost;
    const totalPnlRate = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
    return { totalCost, totalValue, totalPnl, totalPnlRate };
  }, [computedHoldings]);

  // 可添加的标的（不在池中的 financeAssets）
  const availableAssets = useMemo(() => {
    const poolIdSet = new Set(valueInvestingPool.map(id => String(id)));
    return financeAssets.filter(a => !poolIdSet.has(String(a.id)));
  }, [financeAssets, valueInvestingPool]);

  const handleAddToPool = async () => {
    if (selectedIds.length === 0) return;
    setSaving(true);
    try {
      const newPool = [...valueInvestingPool, ...selectedIds];
      const newState = {
        ...stateData,
        strategies: {
          ...(stateData?.strategies || {}),
          valueInvestingPool: newPool,
        },
      };
      await saveState(newState);
      setStateData(newState);
      setSelectedIds([]);
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to save:', err);
      alert('保存失败：' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFromPool = async (id) => {
    if (!confirm('确定从价值投资持仓池中移除此标的吗？')) return;
    setSaving(true);
    try {
      const newPool = valueInvestingPool.filter(pid => String(pid) !== String(id));
      const newState = {
        ...stateData,
        strategies: {
          ...(stateData?.strategies || {}),
          valueInvestingPool: newPool,
        },
      };
      await saveState(newState);
      setStateData(newState);
    } catch (err) {
      console.error('Failed to save:', err);
      alert('保存失败：' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* 头部 */}
        <section className="rounded-2xl p-6 sm:p-7 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">价值投资策略</h1>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            基于巴菲特价值投资理念，精选优质企业长期持有
          </p>
        </section>

        {/* 价值投资理念 */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-500" />
            价值投资理念
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h4 className="font-medium text-gray-900 dark:text-white">长期持有</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                以合理价格买入优质公司，陪伴企业成长，赚取长期复利收益。不为短期波动所动。
              </p>
            </div>
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h4 className="font-medium text-gray-900 dark:text-white">安全边际</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                只在价格显著低于内在价值时买入，预留充足的安全边际以应对不确定性。
              </p>
            </div>
            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center gap-2 mb-2">
                <CircleDollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h4 className="font-medium text-gray-900 dark:text-white">能力圈原则</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                只投资自己能理解的生意，不懂不做。在熟悉的领域中寻找确定性机会。
              </p>
            </div>
          </div>
        </section>

        {/* 汇总卡片 */}
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

        {/* 持仓池 */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-500" />
              价值投资持仓池
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                ({computedHoldings.length} 个标的)
              </span>
            </h3>
            <button
              onClick={() => {
                setSelectedIds([]);
                setShowAddModal(true);
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
                    <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">{h.name}</td>
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
                点击"添加标的"按钮，从理财持仓中选择优质标的加入价值投资持仓池。
              </p>
              <button
                onClick={() => {
                  setSelectedIds([]);
                  setShowAddModal(true);
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

      {/* 添加标的弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                添加标的到持仓池
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
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
                onClick={() => setShowAddModal(false)}
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

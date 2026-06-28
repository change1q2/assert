import { useState, useEffect } from 'react';
import { fetchState, createAccount } from '../api';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Wallet,
  Briefcase,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  X,
} from 'lucide-react';

function formatCurrency(value) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
  }).format(value);
}

function formatPercentage(value) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export default function Finance() {
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: '', category: '', balance: '', cost: '' });
  const [saving, setSaving] = useState(false);

  const { accounts = [], assetClasses = [] } = stateData || {};

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
      console.error('Failed to load finance data:', err);
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccount.name || !newAccount.balance) return;
    setSaving(true);
    try {
      await createAccount({
        ...newAccount,
        balance: parseFloat(newAccount.balance),
        cost: parseFloat(newAccount.cost) || parseFloat(newAccount.balance),
      });
      setShowAddModal(false);
      setNewAccount({ name: '', category: '', balance: '', cost: '' });
      loadData();
    } catch (err) {
      console.error('Failed to add account:', err);
    } finally {
      setSaving(false);
    }
  };

  const computeFinanceStats = () => {
    const financeAccounts = (accounts || []).filter(a => !a.liability);

    const totalValue = financeAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalCost = financeAccounts.reduce((sum, a) => sum + (a.cost || a.balance || 0), 0);
    const totalPnl = totalValue - totalCost;
    const totalPnlRate = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    const categoryMap = {};
    financeAccounts.forEach(account => {
      const category = account.category || '其他';
      if (!categoryMap[category]) {
        categoryMap[category] = { value: 0, cost: 0, count: 0 };
      }
      categoryMap[category].value += account.balance || 0;
      categoryMap[category].cost += account.cost || account.balance || 0;
      categoryMap[category].count += 1;
    });

    const categories = Object.entries(categoryMap).map(([name, data]) => ({
      name,
      value: data.value,
      cost: data.cost,
      pnl: data.value - data.cost,
      pnlRate: data.cost > 0 ? ((data.value - data.cost) / data.cost) * 100 : 0,
      count: data.count,
      percent: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
    })).sort((a, b) => b.value - a.value);

    const holdings = financeAccounts.map(a => ({
      id: a.id,
      name: a.name,
      category: a.category || '其他',
      value: a.balance || 0,
      cost: a.cost || a.balance || 0,
      pnl: (a.balance || 0) - (a.cost || a.balance || 0),
      pnlRate: (a.cost || a.balance || 0) > 0
        ? ((a.balance || 0) - (a.cost || a.balance || 0)) / (a.cost || a.balance || 0) * 100
        : 0,
    })).sort((a, b) => b.value - a.value);

    return { totalValue, totalCost, totalPnl, totalPnlRate, categories, holdings };
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

  const { totalValue, totalCost, totalPnl, totalPnlRate, categories, holdings } = computeFinanceStats();

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
              <h1 className="text-2xl font-bold text-gray-900">理财模块</h1>
            </div>
            <div className="text-center lg:text-right">
              <div className="text-4xl sm:text-5xl font-bold text-gray-900 whitespace-nowrap tabular-nums tracking-tight">
                {formatCurrency(totalValue)}
              </div>
              <div className={`mt-1 flex items-center justify-center lg:justify-end gap-1 text-sm ${
                totalPnl >= 0 ? 'text-green-600' : 'text-red-500'
              }`}>
                {totalPnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>总盈亏 {formatCurrency(totalPnl)} ({formatPercentage(totalPnlRate)})</span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => { setNewAccount({ name: '', category: '', balance: '', cost: '' }); setShowAddModal(true); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                新增
              </button>
              <button
                onClick={loadData}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-primary-500 text-primary-500 text-sm font-medium hover:bg-primary-500 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                刷新数据
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full p-2">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">总市值</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
              {formatCurrency(totalValue)}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full p-2">
                <Briefcase className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">总成本</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
              {formatCurrency(totalCost)}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className={`rounded-full p-2 ${
                totalPnl >= 0
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              }`}>
                {totalPnl >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">总盈亏</span>
            </div>
            <div className={`text-2xl font-bold tabular-nums whitespace-nowrap ${
              totalPnl >= 0 ? 'text-green-600' : 'text-red-500'
            }`}>
              {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className={`rounded-full p-2 ${
                totalPnlRate >= 0
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              }`}>
                <PieChart className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">收益率</span>
            </div>
            <div className={`text-2xl font-bold tabular-nums whitespace-nowrap ${
              totalPnlRate >= 0 ? 'text-green-600' : 'text-red-500'
            }`}>
              {formatPercentage(totalPnlRate)}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">资产分类</h3>
            <div className="space-y-3">
              {categories.map((cat, idx) => {
                const isPositive = cat.pnl >= 0;
                return (
                  <div key={cat.name} className="p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: ['#8B5CF6', '#10B981', '#F59E0B', '#06B6D4', '#EC4899'][idx % 5] }}
                        />
                        <span className="font-medium text-gray-900 dark:text-white">{cat.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">({cat.count}个)</span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
                        {formatCurrency(cat.value)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200 dark:bg-slate-600 overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full bg-primary-500"
                        style={{ width: `${cat.percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">占比 {cat.percent.toFixed(1)}%</span>
                      <span className={isPositive ? 'text-green-600' : 'text-red-500'}>
                        {isPositive ? '+' : ''}{formatCurrency(cat.pnl)} ({formatPercentage(cat.pnlRate)})
                      </span>
                    </div>
                  </div>
                );
              })}
              {categories.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  暂无资产分类数据
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">持仓列表</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700">
                    <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">名称</th>
                    <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">分类</th>
                    <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">市值</th>
                    <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">盈亏</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding) => {
                    const isPositive = holding.pnl >= 0;
                    return (
                      <tr key={holding.id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                        <td className="py-2.5 px-3 text-gray-900 dark:text-white font-medium">
                          {holding.name}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                            {holding.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-gray-900 dark:text-white tabular-nums">
                          {formatCurrency(holding.value)}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-medium tabular-nums ${
                          isPositive ? 'text-green-600' : 'text-red-500'
                        }`}>
                          {isPositive ? (
                            <span className="flex items-center justify-end gap-1">
                              <ArrowUpRight className="w-3 h-3" />
                              {formatCurrency(holding.pnl)}
                            </span>
                          ) : (
                            <span className="flex items-center justify-end gap-1">
                              <ArrowDownRight className="w-3 h-3" />
                              {formatCurrency(holding.pnl)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {holdings.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p>暂无持仓数据</p>
                </div>
              )}
            </div>
          </section>

        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">新增账户</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">账户名称</label>
                  <input type="text" value={newAccount.name} onChange={e => setNewAccount({ ...newAccount, name: e.target.value })} placeholder="如：招商银行信用卡" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">分类</label>
                  <input type="text" value={newAccount.category} onChange={e => setNewAccount({ ...newAccount, category: e.target.value })} placeholder="如：银行、证券、基金" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">当前市值</label>
                  <input type="number" value={newAccount.balance} onChange={e => setNewAccount({ ...newAccount, balance: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">成本</label>
                  <input type="number" value={newAccount.cost} onChange={e => setNewAccount({ ...newAccount, cost: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">取消</button>
                  <button onClick={handleAddAccount} disabled={saving || !newAccount.name || !newAccount.balance} className="flex-1 py-2.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

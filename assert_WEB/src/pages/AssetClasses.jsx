import { useState, useEffect } from 'react';
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

export default function AssetClasses() {
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

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
      console.error('Failed to load asset classes data:', err);
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const computeClassStats = () => {
    const financeAccounts = (accounts || []).filter(a => !a.liability);

    const classMap = {};
    financeAccounts.forEach(account => {
      const category = account.category || '其他';
      if (!classMap[category]) {
        classMap[category] = { name: category, value: 0, cost: 0, count: 0 };
      }
      classMap[category].value += account.balance || 0;
      classMap[category].cost += account.cost || account.balance || 0;
      classMap[category].count += 1;
    });

    const customClasses = assetClasses || [];
    customClasses.forEach(cls => {
      if (!classMap[cls.name]) {
        classMap[cls.name] = { name: cls.name, value: 0, cost: 0, count: 0, description: cls.description };
      } else {
        classMap[cls.name].description = cls.description;
      }
    });

    const classes = Object.values(classMap).map(cls => ({
      ...cls,
      pnl: cls.value - cls.cost,
      pnlRate: cls.cost > 0 ? ((cls.value - cls.cost) / cls.cost) * 100 : 0,
    })).sort((a, b) => b.value - a.value);

    const totalValue = classes.reduce((sum, c) => sum + c.value, 0);
    const totalCost = classes.reduce((sum, c) => sum + c.cost, 0);

    return { classes, totalValue, totalCost };
  };

  const handleAdd = () => {
    setEditingClass(null);
    setFormData({ name: '', description: '' });
    setShowModal(true);
  };

  const handleEdit = (cls) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      description: cls.description || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (clsName) => {
    if (!confirm(`确定要删除分类 "${clsName}" 吗？`)) return;

    try {
      const newClasses = (stateData.assetClasses || []).filter(c => c.name !== clsName);
      const newState = { ...stateData, assetClasses: newClasses };
      const result = await saveState(newState);
      if (result.success !== false) {
        setStateData(newState);
      }
    } catch (err) {
      console.error('Failed to delete asset class:', err);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    try {
      let newClasses = stateData.assetClasses || [];

      if (editingClass) {
        newClasses = newClasses.map(c =>
          c.name === editingClass.name
            ? { ...c, name: formData.name, description: formData.description }
            : c
        );
      } else {
        if (!newClasses.find(c => c.name === formData.name)) {
          newClasses = [...newClasses, { name: formData.name, description: formData.description }];
        }
      }

      const newState = { ...stateData, assetClasses: newClasses };
      const result = await saveState(newState);
      if (result.success !== false) {
        setStateData(newState);
        setShowModal(false);
      }
    } catch (err) {
      console.error('Failed to save asset class:', err);
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

  const { classes, totalValue, totalCost } = computeClassStats();
  const totalPnl = totalValue - totalCost;
  const totalPnlRate = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

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

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full p-2">
                <Layers className="w-5 h-5" />
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
                <Layers className="w-5 h-5" />
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
              {formatCurrency(totalPnl)} <span className="text-base">({formatPercentage(totalPnlRate)})</span>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">分类列表</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">分类名称</th>
                  <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">当前价值</th>
                  <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">成本</th>
                  <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">盈亏</th>
                  <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">持仓数</th>
                  <th className="text-center py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((cls, idx) => {
                  const isPositive = cls.pnl >= 0;
                  return (
                    <tr key={cls.name} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: ['#8B5CF6', '#10B981', '#F59E0B', '#06B6D4', '#EC4899', '#6366F1'][idx % 6] }}
                          />
                          <span className="font-medium text-gray-900 dark:text-white">{cls.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-gray-900 dark:text-white tabular-nums">
                        {formatCurrency(cls.value)}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-900 dark:text-white tabular-nums">
                        {formatCurrency(cls.cost)}
                      </td>
                      <td className={`py-3 px-3 text-right font-medium tabular-nums ${
                        isPositive ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {isPositive ? '+' : ''}{formatCurrency(cls.pnl)} ({formatPercentage(cls.pnlRate)})
                      </td>
                      <td className="py-3 px-3 text-right text-gray-900 dark:text-white">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400">
                          {cls.count}个
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(cls)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cls.name)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {classes.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p>暂无资产分类数据</p>
              </div>
            )}
          </div>
        </section>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingClass ? '编辑分类' : '添加分类'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    分类名称
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="请输入分类名称"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    描述
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="请输入分类描述（可选）"
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
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
      </div>
    </div>
  );
}

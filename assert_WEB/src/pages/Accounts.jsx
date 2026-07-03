import { useState, useEffect, useMemo } from 'react';
import { fetchState, saveState } from '../api';
import {
  Wallet,
  Plus,
  Edit2,
  Trash2,
  X,
  RefreshCw,
  CreditCard,
  Building2,
  PiggyBank,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

function formatCurrency(value) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
  }).format(value);
}

const categoryIcons = {
  '银行': Building2,
  '信用卡': CreditCard,
  '储蓄': PiggyBank,
  '投资': Wallet,
  '其他': Wallet,
};

export default function Accounts() {
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '银行',
    liability: false,
  });
  const [filters, setFilters] = useState({
    name: '',
    category: '',
    type: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { accounts = [], records = [], finance = {}, debts = [] } = stateData || {};

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
      console.error('Failed to load accounts data:', err);
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const calculateAccountBalance = useMemo(() => {
    const balanceMap = {};
    accounts.forEach(account => {
      balanceMap[account.id] = 0;
    });

    records.forEach(record => {
      const accountName = record.account || '';
      const account = accounts.find(a => a.name === accountName);
      if (account) {
        balanceMap[account.id] = (balanceMap[account.id] || 0) + (record.amount || 0);
      }
    });

    if (finance.accounts) {
      Object.values(finance.accounts).forEach(finAccount => {
        if (finAccount.account) {
          const account = accounts.find(a => a.name === finAccount.account);
          if (account) {
            const currentValue = finAccount.currentValue || 0;
            const cost = finAccount.totalCost || 0;
            balanceMap[account.id] = (balanceMap[account.id] || 0) + currentValue - cost;
          }
        }
      });
    }

    debts.forEach(debt => {
      if (debt.account) {
        const account = accounts.find(a => a.name === debt.account);
        if (account) {
          balanceMap[account.id] = (balanceMap[account.id] || 0) - (debt.balance || 0);
        }
      }
    });

    return balanceMap;
  }, [accounts, records, finance, debts]);

  const computeStats = () => {
    const accountList = accounts || [];
    const assetAccounts = accountList.filter(a => !a.liability);
    const liabilityAccounts = accountList.filter(a => a.liability);

    const totalAssets = assetAccounts.reduce((sum, a) => sum + (calculateAccountBalance[a.id] || 0), 0);
    const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + (calculateAccountBalance[a.id] || 0), 0);
    const netWorth = totalAssets - totalLiabilities;

    return { totalAssets, totalLiabilities, netWorth, assetAccounts, liabilityAccounts };
  };

  const filteredAccounts = useMemo(() => {
    return accounts.filter(account => {
      if (filters.name && !account.name.includes(filters.name)) return false;
      if (filters.category && account.category !== filters.category) return false;
      if (filters.type === 'asset' && account.liability) return false;
      if (filters.type === 'liability' && !account.liability) return false;
      return true;
    });
  }, [accounts, filters]);

  const totalPages = Math.ceil(filteredAccounts.length / pageSize);
  const paginatedAccounts = filteredAccounts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleAdd = () => {
    setEditingAccount(null);
    setFormData({
      name: '',
      category: '银行',
      currency: 'CNY',
      liability: false,
    });
    setShowModal(true);
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      category: account.category || '银行',
      currency: account.currency || 'CNY',
      liability: account.liability || false,
    });
    setShowModal(true);
  };

  const handleDelete = async (accountId) => {
    if (!confirm('确定要删除这个账户吗？')) return;

    try {
      const newAccounts = (stateData.accounts || []).filter(a => a.id !== accountId);
      const newState = { ...stateData, accounts: newAccounts };
      const result = await saveState(newState);
      if (result.success !== false) {
        setStateData(newState);
      }
    } catch (err) {
      console.error('Failed to delete account:', err);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    try {
      let newAccounts = stateData.accounts || [];

      if (editingAccount) {
        newAccounts = newAccounts.map(a =>
          a.id === editingAccount.id
            ? { ...a, ...formData }
            : a
        );
      } else {
        newAccounts = [
          ...newAccounts,
          {
            id: Date.now().toString(),
            name: formData.name,
            category: formData.category,
            liability: formData.liability,
          },
        ];
      }

      const newState = { ...stateData, accounts: newAccounts };
      const result = await saveState(newState);
      if (result.success !== false) {
        setStateData(newState);
        setShowModal(false);
      }
    } catch (err) {
      console.error('Failed to save account:', err);
    }
  };

  const getCategoryIcon = (category) => {
    return categoryIcons[category] || Wallet;
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

  const { totalAssets, totalLiabilities, netWorth, assetAccounts, liabilityAccounts } = computeStats();

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
              <h1 className="text-2xl font-bold text-gray-900">账户管理</h1>
              <p className="text-sm text-gray-600 mt-1">管理所有资产和负债账户</p>
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
                添加账户
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full p-2">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">总资产</span>
            </div>
            <div className="text-2xl font-bold text-green-600 tabular-nums whitespace-nowrap">
              {formatCurrency(totalAssets)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {assetAccounts.length} 个账户
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full p-2">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">总负债</span>
            </div>
            <div className="text-2xl font-bold text-red-500 tabular-nums whitespace-nowrap">
              {formatCurrency(totalLiabilities)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {liabilityAccounts.length} 个账户
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full p-2">
                <PiggyBank className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">净资产</span>
            </div>
            <div className={`text-2xl font-bold tabular-nums whitespace-nowrap ${
              netWorth >= 0 ? 'text-green-600' : 'text-red-500'
            }`}>
              {formatCurrency(netWorth)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              资产 - 负债
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">账户列表</h3>
          
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-500">筛选：</span>
            </div>
            <div style={{ width: '140px' }}>
              <input
                type="text"
                value={filters.name}
                onChange={(e) => { setFilters({ ...filters, name: e.target.value }); setCurrentPage(1); }}
                placeholder="账户名称"
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
              />
            </div>
            <div style={{ width: '100px' }}>
              <select
                value={filters.category}
                onChange={(e) => { setFilters({ ...filters, category: e.target.value }); setCurrentPage(1); }}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
              >
                <option value="">全部分类</option>
                <option value="银行">银行</option>
                <option value="信用卡">信用卡</option>
                <option value="储蓄">储蓄</option>
                <option value="投资">投资</option>
                <option value="其他">其他</option>
              </select>
            </div>
            <div style={{ width: '100px' }}>
              <select
                value={filters.type}
                onChange={(e) => { setFilters({ ...filters, type: e.target.value }); setCurrentPage(1); }}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
              >
                <option value="">全部类型</option>
                <option value="asset">资产</option>
                <option value="liability">负债</option>
              </select>
            </div>
            {(filters.name || filters.category || filters.type) && (
              <button
                onClick={() => { setFilters({ name: '', category: '', type: '' }); setCurrentPage(1); }}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                清除筛选
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">账户名称</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">分类</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">类型</th>
                  <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">余额</th>
                  <th className="text-center py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAccounts.map((account) => {
                  const Icon = getCategoryIcon(account.category);
                  const balance = calculateAccountBalance[account.id] || 0;
                  return (
                    <tr key={account.id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className={`rounded-lg p-2 ${
                            account.liability
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                              : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">{account.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400">
                          {account.category || '其他'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          account.liability
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        }`}>
                          {account.liability ? '负债' : '资产'}
                        </span>
                      </td>
                      <td className={`py-3 px-3 text-right font-medium tabular-nums ${
                        balance < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'
                      }`}>
                        {formatCurrency(balance)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(account)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(account.id)}
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
            {filteredAccounts.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p>暂无账户数据，点击右上角添加账户</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              共 {filteredAccounts.length} 条记录，当前显示第 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredAccounts.length)} 条
            </div>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
              >
                <option value={20}>20条/页</option>
                <option value={50}>50条/页</option>
                <option value={100}>100条/页</option>
              </select>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium min-w-[60px] text-center">
                {currentPage} / {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingAccount ? '编辑账户' : '添加账户'}
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
                    账户名称
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="请输入账户名称"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      分类
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="银行">银行</option>
                      <option value="信用卡">信用卡</option>
                      <option value="储蓄">储蓄</option>
                      <option value="投资">投资</option>
                      <option value="其他">其他</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      货币
                    </label>
                    <select
                      value={formData.currency || 'CNY'}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="CNY">人民币 (¥)</option>
                      <option value="USD">美元 ($)</option>
                      <option value="EUR">欧元 (€)</option>
                      <option value="GBP">英镑 (£)</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="liability"
                    checked={formData.liability}
                    onChange={(e) => setFormData({ ...formData, liability: e.target.checked })}
                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  />
                  <label htmlFor="liability" className="text-sm text-gray-700 dark:text-gray-300">
                    这是负债账户
                  </label>
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

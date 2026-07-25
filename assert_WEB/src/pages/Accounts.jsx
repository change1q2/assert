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
  '券商': CreditCard,
  '基金平台': PiggyBank,
  '交易所': Wallet,
  '其他': Wallet,
};

const categories = [
  { value: '银行', label: '银行' },
  { value: '券商', label: '券商' },
  { value: '基金平台', label: '基金平台' },
  { value: '交易所', label: '交易所' },
  { value: '其他', label: '其他' },
];

const subCategories = {
  '银行': [
    { value: '招商银行', label: '招商银行' },
    { value: '工商银行', label: '工商银行' },
    { value: '建设银行', label: '建设银行' },
    { value: '农业银行', label: '农业银行' },
    { value: '中国银行', label: '中国银行' },
    { value: '交通银行', label: '交通银行' },
    { value: '浦发银行', label: '浦发银行' },
    { value: '中信银行', label: '中信银行' },
    { value: '光大银行', label: '光大银行' },
    { value: '民生银行', label: '民生银行' },
    { value: '华夏银行', label: '华夏银行' },
    { value: '兴业银行', label: '兴业银行' },
    { value: '平安银行', label: '平安银行' },
    { value: '广发银行', label: '广发银行' },
    { value: '邮储银行', label: '邮储银行' },
    { value: '其他银行', label: '其他银行' },
  ],
  '券商': [
    { value: '东方财富', label: '东方财富' },
    { value: '同花顺', label: '同花顺' },
    { value: '太平洋证券', label: '太平洋证券' },
    { value: '银河证券', label: '银河证券' },
    { value: '中信证券', label: '中信证券' },
    { value: '华泰证券', label: '华泰证券' },
    { value: '海通证券', label: '海通证券' },
    { value: '广发证券', label: '广发证券' },
    { value: '招商证券', label: '招商证券' },
    { value: '申万宏源', label: '申万宏源' },
    { value: '其他券商', label: '其他券商' },
  ],
  '基金平台': [
    { value: '天天基金', label: '天天基金' },
    { value: '同花顺基金', label: '同花顺基金' },
    { value: '东方财富基金', label: '东方财富基金' },
    { value: '且慢', label: '且慢' },
    { value: '支付宝基金', label: '支付宝基金' },
    { value: '微信理财通', label: '微信理财通' },
    { value: '其他基金平台', label: '其他基金平台' },
  ],
  '交易所': [
    { value: '欧易', label: '欧易' },
    { value: '币安', label: '币安' },
    { value: 'AIDOG', label: 'AIDOG' },
    { value: '其他交易所', label: '其他交易所' },
  ],
  '其他': [
    { value: '支付宝', label: '支付宝' },
    { value: '微信支付', label: '微信支付' },
    { value: '信用卡', label: '信用卡' },
    { value: '储蓄', label: '储蓄' },
    { value: '其他', label: '其他' },
  ],
};

const currencies = [
  { value: 'CNY', label: '人民币 (¥)' },
  { value: 'HKD', label: '港元 (HK$)' },
  { value: 'USD', label: '美元 ($)' },
  { value: 'EUR', label: '欧元 (€)' },
  { value: 'JPY', label: '日元 (¥)' },
];

export default function Accounts() {
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '银行',
    subCategory: '招商银行',
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
      // 后端账户为空时，尝试从 localStorage 读取缓存
      const cachedAccounts = localStorage.getItem('wealth_os_accounts');
      if ((!data.accounts || data.accounts.length === 0) && cachedAccounts) {
        try {
          const parsed = JSON.parse(cachedAccounts);
          data.accounts = parsed;
        } catch {
          /* ignore parse error */
        }
      }
      // 首次使用：既然后端和本地都没有账户，初始化测试数据
      if (!data.accounts || data.accounts.length === 0) {
        const demoAccounts = [
          { id: 'demo-1', name: '招商银行', category: '银行', subCategory: '招商银行', currency: 'CNY', liability: false },
          { id: 'demo-2', name: '支付宝', category: '其他', subCategory: '支付宝', currency: 'CNY', liability: false },
          { id: 'demo-3', name: '微信支付', category: '其他', subCategory: '微信支付', currency: 'CNY', liability: false },
          { id: 'demo-4', name: '工商银行信用卡', category: '银行', subCategory: '工商银行', currency: 'CNY', liability: true },
        ];
        data.accounts = demoAccounts;
        localStorage.setItem('wealth_os_accounts', JSON.stringify(demoAccounts));
      }
      setStateData(data);
    } catch (err) {
      console.error('Failed to load accounts data:', err);
      // 后端完全不可用，从本地缓存加载
      const cachedAccounts = localStorage.getItem('wealth_os_accounts');
      if (cachedAccounts) {
        try {
          const parsed = JSON.parse(cachedAccounts);
          setStateData({ accounts: parsed, records: [], finance: {}, debts: [] });
        } catch {
          setError('加载数据失败');
        }
      } else {
        setError('加载数据失败');
      }
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
    const defaultSubCategory = (subCategories['银行'] || [])[0]?.value || '';
    setFormData({
      name: '',
      category: '银行',
      subCategory: defaultSubCategory,
      currency: 'CNY',
      liability: false,
    });
    setShowModal(true);
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    const availableSubs = subCategories[account.category] || subCategories['其他'];
    const subCat = availableSubs.find(s => s.value === account.subCategory)
      ? account.subCategory
      : availableSubs[0]?.value || '';
    setFormData({
      name: account.name,
      category: account.category || '银行',
      subCategory: subCat,
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
      localStorage.setItem('wealth_os_accounts', JSON.stringify(newAccounts));
      const result = await saveState(newState);
      if (result.success !== false) {
        setStateData(newState);
      }
    } catch (err) {
      console.error('Failed to delete account:', err);
      alert('后端删除失败，但本地缓存已更新');
      const newAccounts = (stateData.accounts || []).filter(a => a.id !== accountId);
      const newState = { ...stateData, accounts: newAccounts };
      localStorage.setItem('wealth_os_accounts', JSON.stringify(newAccounts));
      setStateData(newState);
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
            subCategory: formData.subCategory,
            currency: formData.currency || 'CNY',
            liability: formData.liability,
          },
        ];
      }

      const newState = { ...stateData, accounts: newAccounts };

      // 本地缓存兜底：无论后端是否成功，都先写 localStorage
      localStorage.setItem('wealth_os_accounts', JSON.stringify(newAccounts));

      const result = await saveState(newState);
      if (result.success !== false) {
        setStateData(newState);
        setShowModal(false);
      } else {
        alert('后端保存失败，但数据已写入本地缓存');
        setStateData(newState);
        setShowModal(false);
      }
    } catch (err) {
      console.error('Failed to save account:', err);
      alert('后端保存失败：' + (err.message || '网络错误') + '，数据已写入本地缓存');
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
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
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
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">大类</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">类名</th>
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
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {account.subCategory || '-'}
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
                      大类
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        const newCategory = e.target.value;
                        const availableSubs = subCategories[newCategory] || [];
                        const defaultSub = availableSubs[0]?.value || '';
                        setFormData({ ...formData, category: newCategory, subCategory: defaultSub });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      类名
                    </label>
                    <select
                      value={formData.subCategory}
                      onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {(subCategories[formData.category] || []).map(sub => (
                        <option key={sub.value} value={sub.value}>{sub.label}</option>
                      ))}
                    </select>
                  </div>
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
                    {currencies.map(curr => (
                      <option key={curr.value} value={curr.value}>{curr.label}</option>
                    ))}
                  </select>
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

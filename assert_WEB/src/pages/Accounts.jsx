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
  ChevronDown,
  Settings2,
  FolderPlus,
  FolderMinus,
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

const defaultCategories = {
  '银行': ['招商银行', '工商银行', '建设银行', '农业银行', '中国银行', '交通银行', '浦发银行', '中信银行', '光大银行', '民生银行', '华夏银行', '兴业银行', '平安银行', '广发银行', '邮储银行', '其他银行'],
  '券商': ['东方财富', '同花顺', '太平洋证券', '银河证券', '中信证券', '华泰证券', '海通证券', '广发证券', '招商证券', '申万宏源', '其他券商'],
  '基金平台': ['天天基金', '同花顺基金', '东方财富基金', '且慢', '支付宝基金', '微信理财通', '其他基金平台'],
  '交易所': ['欧易', '币安', 'AIDOG', '其他交易所'],
  '其他': ['支付宝', '微信支付', '信用卡', '储蓄', '其他'],
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
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '' });
  const [editingSubCategory, setEditingSubCategory] = useState({ main: '', index: -1, name: '' });
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSubDropdown, setShowSubDropdown] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCatName, setEditingCatName] = useState({ value: '', name: '' });
  const [addingSub, setAddingSub] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [editingSubName, setEditingSubName] = useState({ index: -1, name: '' });

  const { accounts = [], records = [], finance = {}, debts = [], accountCategories = {} } = stateData || {};

  const accountCatConfig = useMemo(() => {
    if (Object.keys(accountCategories).length === 0) {
      return defaultCategories;
    }
    return accountCategories;
  }, [accountCategories]);

  const categoryList = useMemo(() => {
    return Object.keys(accountCatConfig).map(key => ({ value: key, label: key }));
  }, [accountCatConfig]);

  const getSubCategories = (mainCategory) => {
    return (accountCatConfig[mainCategory] || []).map(name => ({ value: name, label: name }));
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchState();
      const cachedAccounts = localStorage.getItem('wealth_os_accounts');
      if ((!data.accounts || data.accounts.length === 0) && cachedAccounts) {
        try {
          const parsed = JSON.parse(cachedAccounts);
          data.accounts = parsed;
        } catch {
          /* ignore parse error */
        }
      }
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
    const firstCategory = categoryList[0]?.value || '银行';
    const defaultSub = (accountCatConfig[firstCategory] || [])[0] || '';
    setFormData({
      name: '',
      category: firstCategory,
      subCategory: defaultSub,
      currency: 'CNY',
      liability: false,
    });
    setShowModal(true);
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    const cat = account.category || categoryList[0]?.value || '银行';
    const subs = getSubCategories(cat);
    const subCat = subs.find(s => s.value === account.subCategory)
      ? account.subCategory
      : subs[0]?.value || '';
    setFormData({
      name: account.name,
      category: cat,
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

  const handleAddCategoryInModal = async () => {
    const name = newCategoryName.trim();
    if (!name || accountCatConfig[name]) return;

    const newCategories = { ...accountCatConfig, [name]: ['其他'] };
    const newState = { ...stateData, accountCategories: newCategories };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
      setFormData({ ...formData, category: name, subCategory: '其他' });
    }
    setNewCategoryName('');
    setAddingCategory(false);
  };

  const handleEditCategoryInModal = async () => {
    const { value, name } = editingCatName;
    const newName = name.trim();
    if (!newName || !value || newName === value) {
      setEditingCatName({ value: '', name: '' });
      return;
    }
    if (accountCatConfig[newName]) {
      alert('该大类名称已存在');
      return;
    }

    const newCategories = {};
    Object.keys(accountCatConfig).forEach(key => {
      if (key === value) {
        newCategories[newName] = accountCatConfig[key];
      } else {
        newCategories[key] = accountCatConfig[key];
      }
    });

    const newAccounts = (stateData.accounts || []).map(acc =>
      acc.category === value ? { ...acc, category: newName } : acc
    );

    const newState = { ...stateData, accountCategories: newCategories, accounts: newAccounts };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
      if (formData.category === value) {
        setFormData({ ...formData, category: newName });
      }
      localStorage.setItem('wealth_os_accounts', JSON.stringify(newAccounts));
    }
    setEditingCatName({ value: '', name: '' });
  };

  const handleDeleteCategoryInModal = async (catName) => {
    if (!confirm(`确定要删除大类「${catName}」吗？`)) return;

    const newCategories = { ...accountCatConfig };
    delete newCategories[catName];
    const firstCat = Object.keys(newCategories)[0] || '其他';
    const firstSub = newCategories[firstCat]?.[0] || '';

    const newAccounts = (stateData.accounts || []).map(acc =>
      acc.category === catName ? { ...acc, category: firstCat, subCategory: firstSub } : acc
    );

    const newState = { ...stateData, accountCategories: newCategories, accounts: newAccounts };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
      if (formData.category === catName) {
        setFormData({ ...formData, category: firstCat, subCategory: firstSub });
      }
      localStorage.setItem('wealth_os_accounts', JSON.stringify(newAccounts));
    }
  };

  const handleAddSubInModal = async () => {
    const name = newSubName.trim();
    if (!name) return;

    const subs = accountCatConfig[formData.category] || [];
    if (subs.includes(name)) {
      alert('该类名已存在');
      return;
    }
    const newSubs = [...subs, name];
    const newCategories = { ...accountCatConfig, [formData.category]: newSubs };
    const newState = { ...stateData, accountCategories: newCategories };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
      setFormData({ ...formData, subCategory: name });
    }
    setNewSubName('');
    setAddingSub(false);
  };

  const handleEditSubInModal = async () => {
    const { index, name } = editingSubName;
    const newName = name.trim();
    if (index < 0 || !newName) {
      setEditingSubName({ index: -1, name: '' });
      return;
    }
    const subs = accountCatConfig[formData.category] || [];
    if (subs.includes(newName) && subs[index] !== newName) {
      alert('该类名已存在');
      return;
    }
    const oldName = subs[index];
    const newSubs = [...subs];
    newSubs[index] = newName;
    const newCategories = { ...accountCatConfig, [formData.category]: newSubs };

    const newAccounts = (stateData.accounts || []).map(acc =>
      acc.category === formData.category && acc.subCategory === oldName
        ? { ...acc, subCategory: newName }
        : acc
    );

    const newState = { ...stateData, accountCategories: newCategories, accounts: newAccounts };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
      if (formData.subCategory === oldName) {
        setFormData({ ...formData, subCategory: newName });
      }
      localStorage.setItem('wealth_os_accounts', JSON.stringify(newAccounts));
    }
    setEditingSubName({ index: -1, name: '' });
  };

  const handleDeleteSubInModal = async (index) => {
    const subs = accountCatConfig[formData.category] || [];
    const subName = subs[index];
    if (!subName) return;
    if (!confirm(`确定要删除类名「${subName}」吗？`)) return;

    const newSubs = subs.filter((_, i) => i !== index);
    const newCategories = { ...accountCatConfig, [formData.category]: newSubs };
    const firstSub = newSubs[0] || '';

    const newAccounts = (stateData.accounts || []).map(acc =>
      acc.category === formData.category && acc.subCategory === subName
        ? { ...acc, subCategory: firstSub }
        : acc
    );

    const newState = { ...stateData, accountCategories: newCategories, accounts: newAccounts };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
      if (formData.subCategory === subName) {
        setFormData({ ...formData, subCategory: firstSub });
      }
      localStorage.setItem('wealth_os_accounts', JSON.stringify(newAccounts));
    }
  };

  const handleOpenCategoryModal = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '' });
    setEditingSubCategory({ main: '', index: -1, name: '' });
    setShowCategoryModal(true);
  };

  const handleAddCategory = async () => {
    const name = categoryForm.name.trim();
    if (!name || accountCatConfig[name]) return;

    const newCategories = { ...accountCatConfig, [name]: ['其他'] };
    const newState = { ...stateData, accountCategories: newCategories };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
      setCategoryForm({ name: '' });
    }
  };

  const handleDeleteCategory = async (catName) => {
    if (!confirm(`确定要删除大类「${catName}」吗？删除后相关账户的大类将变为「其他」。`)) return;

    const newCategories = { ...accountCatConfig };
    delete newCategories[catName];

    const newAccounts = (stateData.accounts || []).map(acc =>
      acc.category === catName ? { ...acc, category: '其他' } : acc
    );

    const newState = { ...stateData, accountCategories: newCategories, accounts: newAccounts };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
      localStorage.setItem('wealth_os_accounts', JSON.stringify(newAccounts));
    }
  };

  const handleAddSubCategory = async (mainCategory) => {
    const subName = editingSubCategory.name.trim();
    if (!subName) return;

    const newSubs = [...(accountCatConfig[mainCategory] || [])];
    if (!newSubs.includes(subName)) {
      newSubs.push(subName);
      const newCategories = { ...accountCatConfig, [mainCategory]: newSubs };
      const newState = { ...stateData, accountCategories: newCategories };
      const result = await saveState(newState);
      if (result.success !== false) {
        setStateData(newState);
      }
    }
    setEditingSubCategory({ main: '', index: -1, name: '' });
  };

  const handleEditSubCategory = (mainCategory, index, name) => {
    setEditingSubCategory({ main: mainCategory, index, name });
  };

  const handleSaveSubCategory = async () => {
    const { main, index, name } = editingSubCategory;
    const newName = name.trim();
    if (!newName || !main || index < 0) return;

    const newSubs = [...(accountCatConfig[main] || [])];
    newSubs[index] = newName;
    const newCategories = { ...accountCatConfig, [main]: newSubs };

    const newAccounts = (stateData.accounts || []).map(acc =>
      acc.category === main && acc.subCategory === accountCatConfig[main][index]
        ? { ...acc, subCategory: newName }
        : acc
    );

    const newState = { ...stateData, accountCategories: newCategories, accounts: newAccounts };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
      localStorage.setItem('wealth_os_accounts', JSON.stringify(newAccounts));
    }
    setEditingSubCategory({ main: '', index: -1, name: '' });
  };

  const handleDeleteSubCategory = async (mainCategory, index) => {
    const subName = accountCatConfig[mainCategory]?.[index];
    if (!subName) return;

    if (!confirm(`确定要删除类名「${subName}」吗？删除后相关账户的类名将变为空。`)) return;

    const newSubs = accountCatConfig[mainCategory].filter((_, i) => i !== index);
    const newCategories = { ...accountCatConfig, [mainCategory]: newSubs };

    const newAccounts = (stateData.accounts || []).map(acc =>
      acc.category === mainCategory && acc.subCategory === subName
        ? { ...acc, subCategory: '' }
        : acc
    );

    const newState = { ...stateData, accountCategories: newCategories, accounts: newAccounts };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
      localStorage.setItem('wealth_os_accounts', JSON.stringify(newAccounts));
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
                onClick={handleOpenCategoryModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Settings2 className="w-4 h-4" />
                分类管理
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
                {categoryList.map(cat => (
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
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => {
              setShowCategoryDropdown(false);
              setShowSubDropdown(false);
              setAddingCategory(false);
              setAddingSub(false);
              setEditingCatName({ value: '', name: '' });
              setEditingSubName({ index: -1, name: '' });
            }}
          >
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
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      大类
                    </label>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCategoryDropdown(!showCategoryDropdown);
                        setShowSubDropdown(false);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-left flex items-center justify-between hover:border-primary-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <span className="truncate">{formData.category}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showCategoryDropdown && (
                      <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}>
                        {categoryList.map(cat => (
                          <div key={cat.value} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-600">
                            {editingCatName.value === cat.value ? (
                              <input
                                type="text"
                                value={editingCatName.name}
                                onChange={(e) => setEditingCatName({ ...editingCatName, name: e.target.value })}
                                autoFocus
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-slate-500 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleEditCategoryInModal();
                                  if (e.key === 'Escape') setEditingCatName({ value: '', name: '' });
                                }}
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  const availableSubs = getSubCategories(cat.value);
                                  const defaultSub = availableSubs[0]?.value || '';
                                  setFormData({ ...formData, category: cat.value, subCategory: defaultSub });
                                  setShowCategoryDropdown(false);
                                }}
                                className={`flex-1 text-left text-sm ${formData.category === cat.value ? 'text-primary-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                              >
                                {cat.label}
                              </button>
                            )}
                            {editingCatName.value === cat.value ? (
                              <button
                                type="button"
                                onClick={handleEditCategoryInModal}
                                className="p-1 text-green-500 hover:text-green-600"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingCatName({ value: cat.value, name: cat.label });
                                  }}
                                  className="p-1 text-gray-400 hover:text-primary-500"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCategoryInModal(cat.value);
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-500"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                        <div className="border-t border-gray-100 dark:border-slate-600">
                          {addingCategory ? (
                            <div className="flex items-center gap-2 px-3 py-2">
                              <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="输入大类名称"
                                autoFocus
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-slate-500 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddCategoryInModal();
                                  if (e.key === 'Escape') { setAddingCategory(false); setNewCategoryName(''); }
                                }}
                              />
                              <button
                                type="button"
                                onClick={handleAddCategoryInModal}
                                className="px-2 py-1 text-xs rounded bg-primary-500 text-white hover:bg-primary-600"
                              >
                                添加
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setAddingCategory(true); setNewCategoryName(''); }}
                              className="w-full px-3 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-slate-600 flex items-center justify-center gap-1"
                            >
                              <Plus className="w-4 h-4" />
                              添加大类
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      类名
                    </label>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSubDropdown(!showSubDropdown);
                        setShowCategoryDropdown(false);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-left flex items-center justify-between hover:border-primary-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <span className="truncate">{formData.subCategory || '-'}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showSubDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showSubDropdown && (
                      <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}>
                        {getSubCategories(formData.category).map((sub, index) => (
                          <div key={sub.value} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-600">
                            {editingSubName.index === index ? (
                              <input
                                type="text"
                                value={editingSubName.name}
                                onChange={(e) => setEditingSubName({ ...editingSubName, name: e.target.value })}
                                autoFocus
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-slate-500 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleEditSubInModal();
                                  if (e.key === 'Escape') setEditingSubName({ index: -1, name: '' });
                                }}
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, subCategory: sub.value });
                                  setShowSubDropdown(false);
                                }}
                                className={`flex-1 text-left text-sm ${formData.subCategory === sub.value ? 'text-primary-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                              >
                                {sub.label}
                              </button>
                            )}
                            {editingSubName.index === index ? (
                              <button
                                type="button"
                                onClick={handleEditSubInModal}
                                className="p-1 text-green-500 hover:text-green-600"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSubName({ index, name: sub.label });
                                  }}
                                  className="p-1 text-gray-400 hover:text-primary-500"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSubInModal(index);
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-500"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                        <div className="border-t border-gray-100 dark:border-slate-600">
                          {addingSub ? (
                            <div className="flex items-center gap-2 px-3 py-2">
                              <input
                                type="text"
                                value={newSubName}
                                onChange={(e) => setNewSubName(e.target.value)}
                                placeholder="输入类名"
                                autoFocus
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-slate-500 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddSubInModal();
                                  if (e.key === 'Escape') { setAddingSub(false); setNewSubName(''); }
                                }}
                              />
                              <button
                                type="button"
                                onClick={handleAddSubInModal}
                                className="px-2 py-1 text-xs rounded bg-primary-500 text-white hover:bg-primary-600"
                              >
                                添加
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setAddingSub(true); setNewSubName(''); }}
                              className="w-full px-3 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-slate-600 flex items-center justify-center gap-1"
                            >
                              <Plus className="w-4 h-4" />
                              添加类名
                            </button>
                          )}
                        </div>
                      </div>
                    )}
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

        {showCategoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">分类管理</h3>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ name: e.target.value })}
                  placeholder="输入新大类名称"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  onClick={handleAddCategory}
                  disabled={!categoryForm.name.trim() || accountCatConfig[categoryForm.name]}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FolderPlus className="w-4 h-4" />
                  添加大类
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4">
                {Object.entries(accountCatConfig).map(([mainCategory, subs]) => (
                  <div key={mainCategory} className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-gray-900 dark:text-white">{mainCategory}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingSubCategory({ main: mainCategory, index: -1, name: '' });
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          添加类名
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(mainCategory)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                        >
                          <FolderMinus className="w-3 h-3" />
                          删除
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {subs.map((subName, index) => (
                        <div key={index} className="flex items-center gap-1 bg-white dark:bg-slate-600 rounded-lg px-3 py-1.5 border border-gray-200 dark:border-slate-500">
                          {editingSubCategory.main === mainCategory && editingSubCategory.index === index ? (
                            <input
                              type="text"
                              value={editingSubCategory.name}
                              onChange={(e) => setEditingSubCategory({ ...editingSubCategory, name: e.target.value })}
                              autoFocus
                              className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-slate-500 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveSubCategory();
                                if (e.key === 'Escape') setEditingSubCategory({ main: '', index: -1, name: '' });
                              }}
                            />
                          ) : (
                            <span className="text-sm text-gray-700 dark:text-gray-300">{subName}</span>
                          )}
                          {editingSubCategory.main === mainCategory && editingSubCategory.index === index ? (
                            <button
                              onClick={handleSaveSubCategory}
                              className="p-1 text-green-500 hover:text-green-600"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditSubCategory(mainCategory, index, subName)}
                                className="p-1 text-gray-400 hover:text-primary-500"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteSubCategory(mainCategory, index)}
                                className="p-1 text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                    {editingSubCategory.main === mainCategory && editingSubCategory.index === -1 && (
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingSubCategory.name}
                          onChange={(e) => setEditingSubCategory({ ...editingSubCategory, name: e.target.value })}
                          placeholder="输入类名"
                          autoFocus
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-slate-500 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddSubCategory(mainCategory);
                            }
                            if (e.key === 'Escape') {
                              setEditingSubCategory({ main: '', index: -1, name: '' });
                            }
                          }}
                        />
                        <button
                          onClick={() => handleAddSubCategory(mainCategory)}
                          className="px-3 py-1 text-xs rounded bg-primary-500 text-white hover:bg-primary-600"
                        >
                          添加
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

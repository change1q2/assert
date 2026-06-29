import { useState, useEffect } from 'react';
import { fetchState, saveState } from '../api';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  BookOpen,
  Settings,
  Edit2,
  Trash2,
  Upload,
  Image,
  SlidersHorizontal,
} from 'lucide-react';
import { CURRENCIES, getCurrencySymbol, DEFAULT_BASE_CURRENCY, convertAmount, DEFAULT_EXCHANGE_RATES } from '../utils/currency.js';

function formatCurrency(value, currencyCode) {
  const symbol = getCurrencySymbol(currencyCode);
  const isNegative = (value || 0) < 0;
  const absValue = Math.abs(value || 0);
  const formatted = absValue.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${isNegative ? '-' : ''}${symbol}${formatted}`;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const defaultCategories = {
  income: {
    '工资': ['工资', '奖金', '补贴'],
    '理财': ['利息', '分红'],
    '其他收入': ['红包', '退款', '其他'],
  },
  expense: {
    '餐饮': ['早餐', '午餐', '晚餐', '零食', '饮料', '水果'],
    '交通': ['公交', '地铁', '出租车', '加油', '停车'],
    '居住': ['房租', '水电费', '物业费'],
    '购物': ['日用品', '服装', '电子产品'],
    '医疗': ['门诊', '药品'],
    '教育': ['学费', '书籍', '培训'],
    '娱乐': ['电影', '游戏', '旅游'],
    '投资': ['股票', '基金', '债券'],
    '其他支出': ['捐赠', '丢失', '其他'],
  },
};

const defaultAccounts = [
  { id: '1', name: '现金' },
  { id: '2', name: '支付宝' },
  { id: '3', name: '微信支付' },
  { id: '4', name: '银行卡' },
];

export default function Records() {
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timePeriod, setTimePeriod] = useState('月统计');
  const [selectedMonth, setSelectedMonth] = useState('本月');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [baseCurrency, setBaseCurrency] = useState(DEFAULT_BASE_CURRENCY);
  const [selectedCurrencyFilter, setSelectedCurrencyFilter] = useState(DEFAULT_BASE_CURRENCY);
  const [newRecord, setNewRecord] = useState({ date: '', type: 'expense', category: '', subCategory: '', amount: '', account: '', book: '', note: '', currency: DEFAULT_BASE_CURRENCY });
  const [saving, setSaving] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState(defaultCategories);
  const [accounts, setAccounts] = useState(defaultAccounts);
  const [account, setAccount] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [listFilters, setListFilters] = useState({
    date: '',
    book: '',
    type: 'all',
    category: '',
    subCategory: '',
    amountMin: '',
    amountMax: '',
    cnyMin: '',
    cnyMax: '',
    tag: '',
    note: '',
  });

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('recordsVisibleColumns');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      date: true,
      book: true,
      type: true,
      category: true,
      subCategory: true,
      amount: true,
      cny: true,
      tag: true,
      note: true,
    };
  });
  const [showColumnSettingsModal, setShowColumnSettingsModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('recordsVisibleColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const handleFilterChange = (key, value) => {
    setListFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showExchangeRateModal, setShowExchangeRateModal] = useState(false);
  const [showSettingsSection, setShowSettingsSection] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState(null);
  const [newAccountName, setNewAccountName] = useState('');
  const [categoryToEdit, setCategoryToEdit] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [subCategoryToEdit, setSubCategoryToEdit] = useState(null);
  const [newSubCategoryName, setNewSubCategoryName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [uploadedImage, setUploadedImage] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);

  const { records = [] } = stateData || {};

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [timePeriod, selectedMonth, selectedDate, selectedBook, selectedCurrencyFilter]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchState();
      setStateData(data);
      setBooks(data.books || []);
      setCategories(data.categories || defaultCategories);
      setAccounts(data.accounts || defaultAccounts);
      setAccount(data.accounts?.[0] || defaultAccounts[0]);
    } catch (err) {
      console.error('Failed to load records data:', err);
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const filterByBook = (recordsToFilter) => {
    if (!selectedBook) return recordsToFilter;
    return recordsToFilter.filter(record => record.book === selectedBook);
  };

  const applyListFilters = (recordsToFilter) => {
    if (!recordsToFilter) return [];
    return recordsToFilter.filter((record) => {
      if (listFilters.date && !formatDate(record.date).includes(listFilters.date)) return false;
      if (listFilters.book && record.book !== listFilters.book) return false;
      if (listFilters.type !== 'all' && record.type !== listFilters.type) return false;
      if (listFilters.category && !(record.category || '').includes(listFilters.category)) return false;
      if (listFilters.subCategory && !(record.subCategory || '').includes(listFilters.subCategory)) return false;

      const displayAmount = convertAmount(Math.abs(record.amount || 0), record.currency || DEFAULT_BASE_CURRENCY, selectedCurrencyFilter, DEFAULT_EXCHANGE_RATES);
      if (listFilters.amountMin && displayAmount < parseFloat(listFilters.amountMin)) return false;
      if (listFilters.amountMax && displayAmount > parseFloat(listFilters.amountMax)) return false;

      const baseAmount = convertAmount(Math.abs(record.amount || 0), record.currency || DEFAULT_BASE_CURRENCY, DEFAULT_BASE_CURRENCY, DEFAULT_EXCHANGE_RATES);
      if (listFilters.cnvMin && baseAmount < parseFloat(listFilters.cnvMin)) return false;
      if (listFilters.cnvMax && baseAmount > parseFloat(listFilters.cnvMax)) return false;

      if (listFilters.tag) {
        const tags = record.tags || [];
        const tagStr = Array.isArray(tags) ? tags.join(',') : String(tags || '');
        if (!tagStr.includes(listFilters.tag)) return false;
      }
      if (listFilters.note && !(record.note || '').includes(listFilters.note)) return false;

      return true;
    });
  };

  const getSubCategories = (primaryCategory) => {
    if (!primaryCategory) return [];
    const typeCategories = categories[newRecord.type] || {};
    return typeCategories[primaryCategory] || [];
  };

  const filterByTime = (recordsToFilter) => {
    if (!recordsToFilter || recordsToFilter.length === 0) return [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return recordsToFilter.filter(record => {
      const recordDate = new Date(record.date);
      const recordYear = recordDate.getFullYear();
      const recordMonth = recordDate.getMonth();

      if (timePeriod === '日常') {
        if (selectedDate) {
          return recordDate.toDateString() === selectedDate.toDateString();
        }
        const today = now.toDateString();
        return recordDate.toDateString() === today;
      }

      if (timePeriod === '年统计') {
        return recordYear === currentYear;
      }

      if (timePeriod === '月统计' || timePeriod === '自定义') {
        let targetYear = currentYear;
        let targetMonth = currentMonth;

        if (selectedMonth === '上月') {
          targetMonth = currentMonth - 1;
          if (targetMonth < 0) {
            targetMonth = 11;
            targetYear -= 1;
          }
        } else if (selectedMonth !== '本月') {
          const monthMap = { '1月': 0, '2月': 1, '3月': 2, '4月': 3, '5月': 4, '6月': 5, '7月': 6, '8月': 7, '9月': 8, '10月': 9, '11月': 10, '12月': 11 };
          if (monthMap[selectedMonth] !== undefined) {
            targetMonth = monthMap[selectedMonth];
          }
        }

        return recordYear === targetYear && recordMonth === targetMonth;
      }

      return true;
    });
  };

  const handleAddRecord = async () => {
    if (!newRecord.date || !newRecord.amount) return;
    setSaving(true);
    try {
      const amount = parseFloat(newRecord.amount);
      const finalAmount = newRecord.type === 'expense' ? -Math.abs(amount) : Math.abs(amount);
      const newRecordData = {
        ...newRecord,
        amount: finalAmount,
        account: newRecord.account || account?.name || '',
        book: newRecord.book || selectedBook || '',
        id: Date.now(),
      };

      const updatedRecords = [...records, newRecordData];
      await saveState({
        ...stateData,
        records: updatedRecords,
        categories,
        accounts,
      });

      setShowAddModal(false);
      setNewRecord({ date: '', type: 'expense', category: '', subCategory: '', amount: '', account: '', book: '', note: '', currency: baseCurrency });
      setUploadedImage(null);
      setOcrResult(null);
      loadData();
    } catch (err) {
      console.error('Failed to add record:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAccounts = async () => {
    await saveState({
      ...stateData,
      accounts,
    });
  };

  const handleAddAccount = () => {
    if (!newAccountName.trim()) return;
    const newAccount = {
      id: Date.now().toString(),
      name: newAccountName.trim(),
    };
    setAccounts([...accounts, newAccount]);
    setNewAccountName('');
    handleSaveAccounts();
  };

  const handleEditAccount = (account) => {
    setAccountToEdit(account);
  };

  const handleSaveAccountEdit = () => {
    if (!accountToEdit || !accountToEdit.name.trim()) return;
    setAccounts(accounts.map(acc => acc.id === accountToEdit.id ? accountToEdit : acc));
    setAccountToEdit(null);
    handleSaveAccounts();
  };

  const handleDeleteAccount = async (accountId) => {
    setAccounts(accounts.filter(acc => acc.id !== accountId));
    setDeleteConfirm(null);
    handleSaveAccounts();
  };

  const handleSaveCategories = async () => {
    await saveState({
      ...stateData,
      categories,
    });
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const typeCategories = categories[newRecord.type] || {};
    if (typeCategories[newCategoryName.trim()]) return;
    const newCategories = {
      ...categories,
      [newRecord.type]: {
        ...typeCategories,
        [newCategoryName.trim()]: ['其他'],
      },
    };
    setCategories(newCategories);
    setNewCategoryName('');
    handleSaveCategories();
  };

  const handleEditCategory = (categoryName) => {
    setCategoryToEdit(categoryName);
  };

  const handleSaveCategoryEdit = () => {
    if (!categoryToEdit || !newCategoryName.trim()) return;
    const typeCategories = categories[newRecord.type] || {};
    if (typeCategories[newCategoryName.trim()] && newCategoryName.trim() !== categoryToEdit) return;

    const newCategories = {
      ...categories,
      [newRecord.type]: {
        ...typeCategories,
        [newCategoryName.trim()]: typeCategories[categoryToEdit],
      },
    };
    delete newCategories[newRecord.type][categoryToEdit];
    setCategories(newCategories);
    if (newRecord.category === categoryToEdit) {
      setNewRecord({ ...newRecord, category: newCategoryName.trim() });
    }
    setCategoryToEdit(null);
    setNewCategoryName('');
    handleSaveCategories();
  };

  const handleDeleteCategory = async (categoryName) => {
    const typeCategories = categories[newRecord.type] || {};
    const newCategories = {
      ...categories,
      [newRecord.type]: { ...typeCategories },
    };
    delete newCategories[newRecord.type][categoryName];
    setCategories(newCategories);
    if (newRecord.category === categoryName) {
      setNewRecord({ ...newRecord, category: '', subCategory: '' });
    }
    setDeleteConfirm(null);
    handleSaveCategories();
  };

  const handleAddSubCategory = () => {
    if (!newSubCategoryName.trim() || !newRecord.category) return;
    const typeCategories = categories[newRecord.type] || {};
    const subCategories = typeCategories[newRecord.category] || [];
    if (subCategories.includes(newSubCategoryName.trim())) return;

    const newCategories = {
      ...categories,
      [newRecord.type]: {
        ...typeCategories,
        [newRecord.category]: [...subCategories, newSubCategoryName.trim()],
      },
    };
    setCategories(newCategories);
    setNewSubCategoryName('');
    handleSaveCategories();
  };

  const handleEditSubCategory = (subCategoryName) => {
    setSubCategoryToEdit(subCategoryName);
  };

  const handleSaveSubCategoryEdit = () => {
    if (!subCategoryToEdit || !newSubCategoryName.trim() || !newRecord.category) return;
    const typeCategories = categories[newRecord.type] || {};
    const subCategories = typeCategories[newRecord.category] || [];
    if (subCategories.includes(newSubCategoryName.trim()) && newSubCategoryName.trim() !== subCategoryToEdit) return;

    const newCategories = {
      ...categories,
      [newRecord.type]: {
        ...typeCategories,
        [newRecord.category]: subCategories.map(sc => sc === subCategoryToEdit ? newSubCategoryName.trim() : sc),
      },
    };
    setCategories(newCategories);
    if (newRecord.subCategory === subCategoryToEdit) {
      setNewRecord({ ...newRecord, subCategory: newSubCategoryName.trim() });
    }
    setSubCategoryToEdit(null);
    setNewSubCategoryName('');
    handleSaveCategories();
  };

  const handleDeleteSubCategory = async (subCategoryName) => {
    if (!newRecord.category) return;
    const typeCategories = categories[newRecord.type] || {};
    const subCategories = typeCategories[newRecord.category] || [];

    const newCategories = {
      ...categories,
      [newRecord.type]: {
        ...typeCategories,
        [newRecord.category]: subCategories.filter(sc => sc !== subCategoryName),
      },
    };
    setCategories(newCategories);
    if (newRecord.subCategory === subCategoryName) {
      setNewRecord({ ...newRecord, subCategory: '' });
    }
    setDeleteConfirm(null);
    handleSaveCategories();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target.result);
        setOcrResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOCR = () => {
    if (!uploadedImage) return;

    const mockOCRText = `
      金额：¥128.50
      日期：2026-06-28
      2026/06/28
      总计 256.00
      日期 2026年6月28日
    `;

    const amountMatch = mockOCRText.match(/(?:金额|总计|¥)?\s*(\d+\.?\d*)/);
    const dateMatch = mockOCRText.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);

    const result = {};
    if (amountMatch) {
      result.amount = amountMatch[1];
    }
    if (dateMatch) {
      const year = dateMatch[1];
      const month = String(parseInt(dateMatch[2])).padStart(2, '0');
      const day = String(parseInt(dateMatch[3])).padStart(2, '0');
      result.date = `${year}-${month}-${day}`;
    }

    setOcrResult(result);

    if (result.amount || result.date) {
      setNewRecord(prev => ({
        ...prev,
        amount: result.amount || prev.amount,
        date: result.date || prev.date,
      }));
    }
  };

  const getDailyTotals = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const totals = {};
    records.forEach(record => {
      const d = new Date(record.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const dateKey = formatDate(d);
        if (!totals[dateKey]) totals[dateKey] = { income: 0, expense: 0 };
        const rawAmount = Math.abs(record.amount || 0);
        const fromCurrency = record.currency || DEFAULT_BASE_CURRENCY;
        const amount = convertAmount(rawAmount, fromCurrency, selectedCurrencyFilter, DEFAULT_EXCHANGE_RATES);
        if (record.type === 'income') totals[dateKey].income += amount;
        else totals[dateKey].expense += amount;
      }
    });
    return totals;
  };

  const renderCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const dayCount = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayStr = formatDate(today);
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= dayCount; i++) days.push(i);
    const totals = getDailyTotals();

    return (
      <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCalendarDate(new Date(year, month - 1, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"><ChevronLeft className="w-5 h-5" /></button>
          <span className="font-semibold">{year}年{month + 1}月</span>
          <button onClick={() => setCalendarDate(new Date(year, month + 1, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"><ChevronRight className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {['日', '一', '二', '三', '四', '五', '六'].map(d => <span key={d} className="text-gray-400 py-1">{d}</span>)}
          {days.map((day, idx) => {
            if (!day) return <span key={`empty-${idx}`} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTotals = totals[dateStr] || { income: 0, expense: 0 };
            const isToday = dateStr === todayStr;
            const isSelected = selectedDate && formatDate(selectedDate) === dateStr;
            return (
              <button
                key={day}
                onClick={() => { setSelectedDate(new Date(year, month, day)); setSelectedDate(new Date(year, month, day)); }}
                className={`p-1.5 rounded-lg text-xs relative ${isSelected ? 'bg-primary-500 text-white' : isToday ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'hover:bg-gray-100 dark:hover:bg-slate-700'} ${dayTotals.income > 0 || dayTotals.expense > 0 ? 'font-semibold' : ''}`}
              >
                {day}
                {dayTotals.expense > 0 && <span className={`absolute bottom-0 left-0 right-0 text-[8px] ${isSelected ? 'text-white/80' : 'text-red-500'}`}>支{dayTotals.expense > 999 ? (dayTotals.expense / 1000).toFixed(0) + 'k' : dayTotals.expense}</span>}
                {dayTotals.income > 0 && <span className={`absolute top-0 right-0 text-[8px] ${isSelected ? 'text-white/80' : 'text-green-500'}`}>+{dayTotals.income > 999 ? (dayTotals.income / 1000).toFixed(0) + 'k' : dayTotals.income}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs">
          <button onClick={() => { setSelectedDate(new Date()); setSelectedDate(new Date()); }} className={`px-3 py-1 rounded-full ${!selectedDate || formatDate(selectedDate) === todayStr ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-slate-700'}`}>今日</button>
          <button onClick={() => { const y = new Date(); y.setDate(y.getDate() - 1); setSelectedDate(y); setSelectedDate(y); }} className="px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-700">昨日</button>
          {selectedDate && <button onClick={() => setSelectedDate(null)} className="px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center gap-1"><X className="w-3 h-3" />清除</button>}
        </div>
      </div>
    );
  };

  const computeIncomeExpense = () => {
    const filtered = filterByTime(records);

    const incomeMap = {};
    const expenseMap = {};
    let totalIncome = 0;
    let totalExpense = 0;

    filtered.forEach(record => {
      const rawAmount = Math.abs(record.amount || 0);
      const fromCurrency = record.currency || DEFAULT_BASE_CURRENCY;
      const amount = convertAmount(rawAmount, fromCurrency, selectedCurrencyFilter, DEFAULT_EXCHANGE_RATES);
      if (record.type === 'income') {
        totalIncome += amount;
        const category = record.category || '其他收入';
        incomeMap[category] = (incomeMap[category] || 0) + amount;
      } else if (record.type === 'expense') {
        totalExpense += amount;
        const category = record.category || '其他支出';
        expenseMap[category] = (expenseMap[category] || 0) + amount;
      }
    });

    const income = Object.entries(incomeMap).map(([category, amount]) => ({
      category,
      amount,
      percent: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
    }));

    const expense = Object.entries(expenseMap).map(([category, amount]) => ({
      category,
      amount,
      percent: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
    }));

    return { income, expense, totalIncome, totalExpense };
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

  const { income, expense, totalIncome, totalExpense } = computeIncomeExpense();
  const recordList = applyListFilters(filterByBook(filterByTime(records))).sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalCount = recordList.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedRecords = recordList.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const netIncome = totalIncome - totalExpense;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:px-7 shadow-soft border border-gray-100 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-1">
              {['日常', '月统计', '年统计', '自定义'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTimePeriod(tab)}
                  className={`px-4 py-1.5 rounded-full text-sm transition-all ${
                    timePeriod === tab
                      ? 'bg-primary-500 text-white font-medium'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-primary-500 mr-1">2026年</span>
              {['本月', '上月', '4月', '3月', '2月', '1月'].map((month) => (
                <button
                  key={month}
                  onClick={() => setSelectedMonth(month)}
                  className={`px-3 py-1 rounded-full text-xs transition-all ${
                    selectedMonth === month
                      ? 'bg-primary-500 text-white font-medium'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {month}
                </button>
              ))}
            </div>
          </div>
          {timePeriod === '日常' && renderCalendar()}
        </div>

        <section
          className="rounded-2xl p-6 sm:p-7"
          style={{
            background: 'linear-gradient(135deg, #EDE9FE 0%, #F5F3FF 100%)',
          }}
        >
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold text-gray-900">收支分析</h1>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <select
                    value={selectedBook || ''}
                    onChange={(e) => setSelectedBook(e.target.value || null)}
                    className="appearance-none bg-white dark:bg-slate-700 border border-primary-300 dark:border-primary-600 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-primary-600 dark:text-primary-300 cursor-pointer hover:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">全部账本</option>
                    {books.map((book) => (
                      <option key={book.id} value={book.name}>
                        {book.name}
                      </option>
                    ))}
                  </select>
                  <BookOpen className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={selectedCurrencyFilter}
                    onChange={(e) => setSelectedCurrencyFilter(e.target.value)}
                    className="appearance-none bg-white dark:bg-slate-700 border border-primary-300 dark:border-primary-600 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-primary-600 dark:text-primary-300 cursor-pointer hover:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {CURRENCIES.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.name}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-primary-500 pointer-events-none text-xs font-bold">
                    {getCurrencySymbol(selectedCurrencyFilter)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => { setNewRecord({ date: formatDate(new Date()), type: 'expense', category: '', subCategory: '', amount: '', account: account?.name || '', book: selectedBook || '', note: '', currency: baseCurrency }); setShowAddModal(true); }}
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
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">总收入</span>
              <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full p-2">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-green-600 tabular-nums whitespace-nowrap">
              {formatCurrency(totalIncome, selectedCurrencyFilter)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
              <ArrowUpRight className="w-3 h-3" />
              <span>较上期 +12.5%</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">总支出</span>
              <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full p-2">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-red-500 tabular-nums whitespace-nowrap">
              {formatCurrency(totalExpense, selectedCurrencyFilter)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-red-500">
              <ArrowDownRight className="w-3 h-3" />
              <span>较上期 +8.3%</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">净收入</span>
              <div className={`rounded-full p-2 ${
                netIncome >= 0
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              }`}>
                {netIncome >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </div>
            </div>
            <div className={`text-3xl font-bold tabular-nums whitespace-nowrap ${
              netIncome >= 0 ? 'text-green-600' : 'text-red-500'
            }`}>
              {netIncome >= 0 ? '+' : ''}{formatCurrency(netIncome, selectedCurrencyFilter)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Calendar className="w-3 h-3" />
              <span>收入 - 支出</span>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">收入占比</h3>
            <div className="mt-3 flex justify-center">
              <div className="w-full max-w-[240px]">
                <svg viewBox="0 0 100 100" className="w-full h-auto">
                  {(() => {
                    const colors = ['#8B5CF6', '#10B981', '#F59E0B', '#06B6D4'];
                    let cumulativePercent = 0;
                    if (income.length === 0) {
                      return null;
                    }
                    return income.map((item, idx) => {
                      const startPercent = cumulativePercent;
                      cumulativePercent += item.percent;
                      const endPercent = cumulativePercent;
                      const largeArcFlag = item.percent > 50 ? 1 : 0;
                      const startAngle = (startPercent / 100) * 2 * Math.PI - Math.PI / 2;
                      const endAngle = (endPercent / 100) * 2 * Math.PI - Math.PI / 2;
                      const x1 = 50 + 40 * Math.cos(startAngle);
                      const y1 = 50 + 40 * Math.sin(startAngle);
                      const x2 = 50 + 40 * Math.cos(endAngle);
                      const y2 = 50 + 40 * Math.sin(endAngle);
                      return (
                        <path
                          key={idx}
                          d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                          fill={colors[idx % colors.length]}
                        />
                      );
                    });
                  })()}
                </svg>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {income.map((item, idx) => (
                <div key={item.category} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ['#8B5CF6', '#10B981', '#F59E0B', '#06B6D4'][idx % 4] }}
                  />
                  <span className="text-gray-500 dark:text-gray-400">{item.category}</span>
                  <span className="ml-auto text-gray-700 dark:text-gray-300 tabular-nums font-medium">
                    {item.percent.toFixed(1)}%
                  </span>
                </div>
              ))}
              {income.length === 0 && (
                <div className="col-span-2 text-center text-sm text-gray-400 py-4">
                  暂无收入数据
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">支出占比</h3>
            <div className="mt-3 flex justify-center">
              <div className="w-full max-w-[240px]">
                <svg viewBox="0 0 100 100" className="w-full h-auto">
                  {(() => {
                    const colors = ['#EC4899', '#8B5CF6', '#F59E0B', '#06B6D4', '#10B981'];
                    let cumulativePercent = 0;
                    if (expense.length === 0) {
                      return null;
                    }
                    return expense.map((item, idx) => {
                      const startPercent = cumulativePercent;
                      cumulativePercent += item.percent;
                      const endPercent = cumulativePercent;
                      const largeArcFlag = item.percent > 50 ? 1 : 0;
                      const startAngle = (startPercent / 100) * 2 * Math.PI - Math.PI / 2;
                      const endAngle = (endPercent / 100) * 2 * Math.PI - Math.PI / 2;
                      const x1 = 50 + 40 * Math.cos(startAngle);
                      const y1 = 50 + 40 * Math.sin(startAngle);
                      const x2 = 50 + 40 * Math.cos(endAngle);
                      const y2 = 50 + 40 * Math.sin(endAngle);
                      return (
                        <path
                          key={idx}
                          d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                          fill={colors[idx % colors.length]}
                        />
                      );
                    });
                  })()}
                </svg>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {expense.map((item, idx) => (
                <div key={item.category} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ['#EC4899', '#8B5CF6', '#F59E0B', '#06B6D4', '#10B981'][idx % 5] }}
                  />
                  <span className="text-gray-500 dark:text-gray-400">{item.category}</span>
                  <span className="ml-auto text-gray-700 dark:text-gray-300 tabular-nums font-medium">
                    {item.percent.toFixed(1)}%
                  </span>
                </div>
              ))}
              {expense.length === 0 && (
                <div className="col-span-2 text-center text-sm text-gray-400 py-4">
                  暂无支出数据
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">收支记录</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setListFilters({
                    date: '',
                    book: '',
                    type: 'all',
                    category: '',
                    subCategory: '',
                    amountMin: '',
                    amountMax: '',
                    cnyMin: '',
                    cnyMax: '',
                    tag: '',
                    note: '',
                  });
                  setCurrentPage(1);
                }}
                className="shrink-0 px-3 py-1.5 text-xs bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors whitespace-nowrap"
              >
                重置筛选
              </button>
              <button
                onClick={() => setShowColumnSettingsModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                高级列表设置
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  {visibleColumns.date && <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">日期</th>}
                  {visibleColumns.book && <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">账本</th>}
                  {visibleColumns.type && <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">类型</th>}
                  {visibleColumns.category && <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">一级分类</th>}
                  {visibleColumns.subCategory && <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">二级分类</th>}
                  {visibleColumns.amount && <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">金额</th>}
                  {visibleColumns.cnv && <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">折合人民币</th>}
                  {visibleColumns.tag && <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">标签</th>}
                  {visibleColumns.note && <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">备注</th>}
                </tr>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  {visibleColumns.date && (
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="筛选日期"
                        value={listFilters.date}
                        onChange={(e) => handleFilterChange('date', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                      />
                    </td>
                  )}
                  {visibleColumns.book && (
                    <td className="py-2 px-3">
                      <select
                        value={listFilters.book}
                        onChange={(e) => handleFilterChange('book', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                      >
                        <option value="">全部</option>
                        {books.map((book) => (
                          <option key={book.id} value={book.name}>{book.name}</option>
                        ))}
                      </select>
                    </td>
                  )}
                  {visibleColumns.type && (
                    <td className="py-2 px-3">
                      <select
                        value={listFilters.type}
                        onChange={(e) => handleFilterChange('type', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                      >
                        <option value="all">全部</option>
                        <option value="income">收入</option>
                        <option value="expense">支出</option>
                      </select>
                    </td>
                  )}
                  {visibleColumns.category && (
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="筛选一级"
                        value={listFilters.category}
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                      />
                    </td>
                  )}
                  {visibleColumns.subCategory && (
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="筛选二级"
                        value={listFilters.subCategory}
                        onChange={(e) => handleFilterChange('subCategory', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                      />
                    </td>
                  )}
                  {visibleColumns.amount && (
                    <td className="py-2 px-3">
                      <div className="flex flex-col gap-1">
                        <input
                          type="number"
                          placeholder="最小"
                          value={listFilters.amountMin}
                          onChange={(e) => handleFilterChange('amountMin', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                        />
                        <input
                          type="number"
                          placeholder="最大"
                          value={listFilters.amountMax}
                          onChange={(e) => handleFilterChange('amountMax', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                    </td>
                  )}
                  {visibleColumns.cnv && (
                    <td className="py-2 px-3">
                      <div className="flex flex-col gap-1">
                        <input
                          type="number"
                          placeholder="最小"
                          value={listFilters.cnvMin}
                          onChange={(e) => handleFilterChange('cnvMin', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                        />
                        <input
                          type="number"
                          placeholder="最大"
                          value={listFilters.cnvMax}
                          onChange={(e) => handleFilterChange('cnvMax', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                    </td>
                  )}
                  {visibleColumns.tag && (
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="筛选标签"
                        value={listFilters.tag}
                        onChange={(e) => handleFilterChange('tag', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                      />
                    </td>
                  )}
                  {visibleColumns.note && (
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="筛选备注"
                        value={listFilters.note}
                        onChange={(e) => handleFilterChange('note', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                      />
                    </td>
                  )}
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    {visibleColumns.date && (
                      <td className="py-2.5 px-3 text-gray-900 dark:text-white">
                        {formatDate(record.date)}
                      </td>
                    )}
                    {visibleColumns.book && (
                      <td className="py-2.5 px-3 text-gray-900 dark:text-white">
                        {record.book || '-'}
                      </td>
                    )}
                    {visibleColumns.type && (
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          record.type === 'income'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                        }`}>
                          {record.type === 'income' ? '收入' : '支出'}
                        </span>
                      </td>
                    )}
                    {visibleColumns.category && (
                      <td className="py-2.5 px-3 text-gray-900 dark:text-white">
                        {record.category || '其他'}
                      </td>
                    )}
                    {visibleColumns.subCategory && (
                      <td className="py-2.5 px-3 text-gray-900 dark:text-white">
                        {record.subCategory || '-'}
                      </td>
                    )}
                    {visibleColumns.amount && (
                      <td className={`text-right font-medium tabular-nums ${
                        record.type === 'income' ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {record.type === 'income' ? '+' : '-'}{formatCurrency(convertAmount(Math.abs(record.amount || 0), record.currency || DEFAULT_BASE_CURRENCY, selectedCurrencyFilter, DEFAULT_EXCHANGE_RATES), selectedCurrencyFilter)}
                      </td>
                    )}
                    {visibleColumns.cnv && (
                      <td className="text-right font-medium tabular-nums text-gray-700 dark:text-gray-300">
                        {formatCurrency(convertAmount(Math.abs(record.amount || 0), record.currency || DEFAULT_BASE_CURRENCY, DEFAULT_BASE_CURRENCY, DEFAULT_EXCHANGE_RATES), DEFAULT_BASE_CURRENCY)}
                      </td>
                    )}
                    {visibleColumns.tag && (
                      <td className="py-2.5 px-3 text-gray-900 dark:text-white">
                        {Array.isArray(record.tags) ? record.tags.join(', ') : (record.tags || '-')}
                      </td>
                    )}
                    {visibleColumns.note && (
                      <td className="py-2.5 px-3 text-gray-900 dark:text-white">
                        {record.note || '-'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {recordList.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p>暂无收支记录</p>
              </div>
            )}
          </div>
          {recordList.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                共 {totalCount} 条记录
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white cursor-pointer"
                >
                  {[10, 20, 50, 100].map(size => (
                    <option key={size} value={size}>{size} 条/页</option>
                  ))}
                </select>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  上一页
                </button>
                <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                  <span>第</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setCurrentPage(Math.max(1, Math.min(totalPages, val)));
                      }
                    }}
                    className="w-14 px-2 py-1.5 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                  />
                  <span>/ {totalPages} 页</span>
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </section>

        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">新增收支记录</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-4 text-center hover:border-primary-500 transition-colors">
                  {uploadedImage ? (
                    <div className="relative">
                      <img src={uploadedImage} alt="预览" className="max-h-32 mx-auto rounded-lg object-contain" />
                      <button onClick={() => { setUploadedImage(null); setOcrResult(null); }} className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="flex flex-col items-center gap-2 py-4">
                        <Upload className="w-8 h-8 text-gray-400" />
                        <span className="text-sm text-gray-500">点击上传图片</span>
                        <span className="text-xs text-gray-400">支持 JPG, PNG 格式</span>
                      </div>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  )}
                  {uploadedImage && (
                    <button onClick={handleOCR} className="mt-3 inline-flex items-center gap-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">
                      <Image className="w-4 h-4" />
                      识别
                    </button>
                  )}
                  {ocrResult && (
                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg text-sm text-green-700 dark:text-green-400">
                      识别结果：
                      {ocrResult.amount && <span className="ml-2">金额: {ocrResult.amount}</span>}
                      {ocrResult.date && <span className="ml-2">日期: {ocrResult.date}</span>}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">日期</label>
                  <input type="date" value={newRecord.date} onChange={e => setNewRecord({ ...newRecord, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">类型</label>
                  <div className="flex gap-2">
                    <button onClick={() => setNewRecord({ ...newRecord, type: 'expense', category: '', subCategory: '' })} className={`flex-1 py-2 rounded-lg font-medium ${newRecord.type === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-slate-700'}`}>支出</button>
                    <button onClick={() => setNewRecord({ ...newRecord, type: 'income', category: '', subCategory: '' })} className={`flex-1 py-2 rounded-lg font-medium ${newRecord.type === 'income' ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-slate-700'}`}>收入</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">账户</label>
                  <div className="flex gap-2">
                    <select
                      value={newRecord.account}
                      onChange={e => setNewRecord({ ...newRecord, account: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id || acc.name} value={acc.name}>{acc.name}</option>
                      ))}
                    </select>
                    <button onClick={() => setShowAccountModal(true)} className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><Settings className="w-4 h-4" /></button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">一级分类</label>
                  <div className="flex gap-2">
                    <select
                      value={newRecord.category}
                      onChange={e => setNewRecord({ ...newRecord, category: e.target.value, subCategory: '' })}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                    >
                      <option value="">请选择一级分类</option>
                      {Object.keys(categories[newRecord.type] || {}).map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <button onClick={() => setShowCategoryModal(true)} className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><Settings className="w-4 h-4" /></button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">二级分类</label>
                  <div className="flex gap-2">
                    <select
                      value={newRecord.subCategory}
                      onChange={e => setNewRecord({ ...newRecord, subCategory: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                      disabled={!newRecord.category}
                    >
                      <option value="">请选择二级分类</option>
                      {getSubCategories(newRecord.category).map((subCat) => (
                        <option key={subCat} value={subCat}>{subCat}</option>
                      ))}
                    </select>
                    {newRecord.category && (
                      <button onClick={() => setShowSubCategoryModal(true)} className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><Settings className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">金额</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">{getCurrencySymbol(newRecord.currency || baseCurrency)}</span>
                      <input type="number" value={newRecord.amount} onChange={e => setNewRecord({ ...newRecord, amount: e.target.value })} placeholder="0.00" className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                    </div>
                    <select
                      value={newRecord.currency || baseCurrency}
                      onChange={e => setNewRecord({ ...newRecord, currency: e.target.value })}
                      className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.name} ({c.symbol})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">备注</label>
                  <input type="text" value={newRecord.note} onChange={e => setNewRecord({ ...newRecord, note: e.target.value })} placeholder="可选" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                </div>
                <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setShowSettingsSection(!showSettingsSection)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <span className="flex items-center gap-2"><Settings className="w-4 h-4" />设置</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showSettingsSection ? 'rotate-180' : ''}`} />
                  </button>
                  {showSettingsSection && (
                    <div className="px-3 py-3 border-t border-gray-200 dark:border-slate-700 grid grid-cols-2 gap-2">
                      <button onClick={() => setShowBookModal(true)} className="px-3 py-2 text-sm text-left rounded-lg bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300">账本管理</button>
                      <button onClick={() => setShowTagModal(true)} className="px-3 py-2 text-sm text-left rounded-lg bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300">标签管理</button>
                      <button onClick={() => setShowCategoryModal(true)} className="px-3 py-2 text-sm text-left rounded-lg bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300">分类管理</button>
                      <button onClick={() => setShowExchangeRateModal(true)} className="px-3 py-2 text-sm text-left rounded-lg bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300">汇率设置</button>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">取消</button>
                  <button onClick={handleAddRecord} disabled={saving || !newRecord.date || !newRecord.amount || !newRecord.category} className="flex-1 py-2.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAccountModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">账户管理</h3>
                <button onClick={() => setShowAccountModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={newAccountName} onChange={e => setNewAccountName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddAccount()} placeholder="输入账户名称" className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  <button onClick={handleAddAccount} className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {accounts.map((acc) => (
                    <div key={acc.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      {accountToEdit?.id === acc.id ? (
                        <>
                          <input type="text" value={accountToEdit.name} onChange={e => setAccountToEdit({ ...accountToEdit, name: e.target.value })} className="flex-1 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-600 dark:text-white" autoFocus />
                          <button onClick={handleSaveAccountEdit} className="p-1 text-green-600 hover:bg-green-100 rounded"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => setAccountToEdit(null)} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-gray-700 dark:text-gray-300">{acc.name}</span>
                          <button onClick={() => handleEditAccount(acc)} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                          {deleteConfirm === `account-${acc.id}` ? (
                            <button onClick={() => handleDeleteAccount(acc.id)} className="p-1 text-red-600 hover:bg-red-100 rounded">确认</button>
                          ) : (
                            <button onClick={() => setDeleteConfirm(`account-${acc.id}`)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {showCategoryModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">分类管理 - {newRecord.type === 'income' ? '收入' : '支出'}</h3>
                <button onClick={() => setShowCategoryModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCategory()} placeholder="输入分类名称" className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  <button onClick={handleAddCategory} className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {Object.keys(categories[newRecord.type] || {}).map((cat) => (
                    <div key={cat} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      {categoryToEdit === cat ? (
                        <>
                          <input type="text" value={newCategoryName || cat} onChange={e => setNewCategoryName(e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-600 dark:text-white" autoFocus />
                          <button onClick={handleSaveCategoryEdit} className="p-1 text-green-600 hover:bg-green-100 rounded"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => { setCategoryToEdit(null); setNewCategoryName(''); }} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-gray-700 dark:text-gray-300">{cat}</span>
                          <button onClick={() => { setCategoryToEdit(cat); setNewCategoryName(cat); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                          {deleteConfirm === `category-${cat}` ? (
                            <button onClick={() => handleDeleteCategory(cat)} className="p-1 text-red-600 hover:bg-red-100 rounded">确认</button>
                          ) : (
                            <button onClick={() => setDeleteConfirm(`category-${cat}`)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {showSubCategoryModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">二级分类管理 - {newRecord.category}</h3>
                <button onClick={() => setShowSubCategoryModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={newSubCategoryName} onChange={e => setNewSubCategoryName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSubCategory()} placeholder="输入二级分类名称" className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  <button onClick={handleAddSubCategory} className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {getSubCategories(newRecord.category).map((subCat) => (
                    <div key={subCat} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      {subCategoryToEdit === subCat ? (
                        <>
                          <input type="text" value={newSubCategoryName || subCat} onChange={e => setNewSubCategoryName(e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-600 dark:text-white" autoFocus />
                          <button onClick={handleSaveSubCategoryEdit} className="p-1 text-green-600 hover:bg-green-100 rounded"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => { setSubCategoryToEdit(null); setNewSubCategoryName(''); }} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-gray-700 dark:text-gray-300">{subCat}</span>
                          <button onClick={() => { setSubCategoryToEdit(subCat); setNewSubCategoryName(subCat); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                          {deleteConfirm === `subcategory-${subCat}` ? (
                            <button onClick={() => handleDeleteSubCategory(subCat)} className="p-1 text-red-600 hover:bg-red-100 rounded">确认</button>
                          ) : (
                            <button onClick={() => setDeleteConfirm(`subcategory-${subCat}`)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {showColumnSettingsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">列表设置</h3>
                <button onClick={() => setShowColumnSettingsModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                {[
                  { key: 'date', label: '日期' },
                  { key: 'book', label: '账本' },
                  { key: 'type', label: '类型' },
                  { key: 'category', label: '一级分类' },
                  { key: 'subCategory', label: '二级分类' },
                  { key: 'amount', label: '金额' },
                  { key: 'cny', label: '折合人民币' },
                  { key: 'tag', label: '标签' },
                  { key: 'note', label: '备注' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns[key]}
                      onChange={(e) => setVisibleColumns(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                  </label>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowColumnSettingsModal(false)}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
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

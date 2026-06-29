import { useState, useEffect, useMemo } from 'react';
import { fetchState, saveState } from '../api';
import {
  TrendingDown,
  TrendingUp,
  RefreshCw,
  CreditCard,
  DollarSign,
  Percent,
  Calendar,
  AlertTriangle,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  FileImage,
  Eye,
  Trash2,
} from 'lucide-react';

function formatCurrency(value) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
  }).format(value || 0);
}

function renderCategoryCard(cat, catDebts, totalAmount, cardKey, isExpanded, color) {
  const colorClasses = {
    red: {
      bg: isExpanded ? 'bg-red-500' : 'bg-red-300',
      text: 'text-red-600',
    },
    emerald: {
      bg: isExpanded ? 'bg-emerald-500' : 'bg-emerald-300',
      text: 'text-emerald-600',
    },
  };
  const cls = colorClasses[color] || colorClasses.red;
  
  return (
    <div key={cardKey} className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-gray-100 dark:border-slate-700 overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50"
        onClick={() => setExpandedCards((prev) => ({ ...prev, [cardKey]: !prev[cardKey] }))}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${cls.bg}`}>
            {cat.name.charAt(0)}
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">{cat.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{catDebts.length} 笔</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className={`font-bold tabular-nums ${cls.text}`}>{formatCurrency(totalAmount)}</div>
            <div className="text-xs text-gray-400">汇总金额</div>
          </div>
          <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </div>
      {isExpanded && (
        <div className="border-t border-gray-100 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-700/50">
                <th className="text-left py-2.5 px-4 text-gray-500 font-medium">名称</th>
                <th className="text-right py-2.5 px-4 text-gray-500 font-medium">金额</th>
                <th className="text-right py-2.5 px-4 text-gray-500 font-medium">本金</th>
                <th className="text-left py-2.5 px-4 text-gray-500 font-medium">还款日期</th>
                <th className="text-center py-2.5 px-4 text-gray-500 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {catDebts.map((debt, idx) => (
                <tr key={debt.id || idx} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                  <td className="py-2.5 px-4 text-gray-900 dark:text-white font-medium">{debt.creditor || debt.name || '未知'}</td>
                  <td className={`py-2.5 px-4 text-right font-medium tabular-nums ${cls.text}`}>{formatCurrency(debt.amount || 0)}</td>
                  <td className="py-2.5 px-4 text-right text-gray-900 dark:text-white tabular-nums">{formatCurrency(debt.principal || debt.amount || 0)}</td>
                  <td className="py-2.5 px-4 text-gray-600 dark:text-gray-300">{formatDate(debt.dueDate)}</td>
                  <td className="py-2.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {debt.attachment && (
                        <button onClick={() => setPreviewImage(debt.attachment)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-indigo-600">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => openEditModal(debt)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-500">
                        <EditIcon className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(debt)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatNumber(value, digits = 2) {
  return (value || 0).toFixed(digits);
}

export default function Debts() {
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timePeriod, setTimePeriod] = useState('月统计');
  const [selectedMonth, setSelectedMonth] = useState('本月');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [totalAmountOverridden, setTotalAmountOverridden] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [expandedCards, setExpandedCards] = useState({});

  const DEFAULT_CATEGORIES = ['信用卡', '房贷', '车贷', '消费贷', '亲友借款', '其他'];
  const defaultCategories = DEFAULT_CATEGORIES.map((name, idx) => ({ id: `cat_${idx}`, name }));
  const debtCategories = stateData?.debtCategories?.length > 0 
    ? stateData.debtCategories 
    : defaultCategories;

  const [form, setForm] = useState({
    category: 'payable',
    type: '借入',
    debtCategory: 'cat_5',
    creditor: '',
    debtor: '',
    principal: '',
    annualRate: '',
    amount: '',
    startDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    repaymentMethod: 'equalPrincipalInterest',
    paidAmount: '0',
    attachment: '',
    note: '',
  });

  const { debts = [] } = stateData || {};

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
      console.error('Failed to load debts data:', err);
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (debt = null) => {
    setTotalAmountOverridden(false);
    if (debt) {
      setForm({
        category: debt.category || 'payable',
        type: debt.type || '借入',
        debtCategory: debt.debtCategory || debtCategories[0]?.id || '',
        creditor: debt.creditor || debt.name || '',
        debtor: debt.debtor || '',
        principal: debt.principal !== undefined ? String(debt.principal) : '',
        annualRate: debt.annualRate !== undefined ? String(debt.annualRate) : (debt.interestRate !== undefined ? String(debt.interestRate) : ''),
        amount: debt.amount !== undefined ? String(debt.amount) : '',
        startDate: debt.startDate || new Date().toISOString().split('T')[0],
        dueDate: debt.dueDate || '',
        repaymentMethod: debt.repaymentMethod || 'equalPrincipalInterest',
        paidAmount: debt.paidAmount !== undefined ? String(debt.paidAmount) : '0',
        attachment: debt.attachment || '',
        note: debt.note || debt.remark || '',
      });
      setEditingDebt(debt);
    } else {
      setForm({
        category: 'payable',
        type: '借入',
        debtCategory: debtCategories[0]?.id || '',
        creditor: '',
        debtor: '',
        principal: '',
        annualRate: '',
        amount: '',
        startDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        repaymentMethod: 'equalPrincipalInterest',
        paidAmount: '0',
        attachment: '',
        note: '',
      });
      setEditingDebt(null);
    }
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (debt) => {
    resetForm(debt);
    setShowAddModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm((prev) => ({ ...prev, attachment: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = () => {
    setForm((prev) => ({ ...prev, attachment: '' }));
  };

  const remainingAmount = useMemo(() => {
    const amt = parseFloat(form.amount) || 0;
    const paid = parseFloat(form.paidAmount) || 0;
    return Math.max(0, amt - paid);
  }, [form.amount, form.paidAmount]);

  const repaymentPlan = useMemo(() => {
    const principal = parseFloat(form.principal) || 0;
    const rate = parseFloat(form.annualRate) || 0;
    const method = form.repaymentMethod;
    if (!principal || !rate || !form.dueDate || !form.startDate) return null;

    const start = new Date(form.startDate);
    const due = new Date(form.dueDate);
    const months = Math.max(1, (due.getFullYear() - start.getFullYear()) * 12 + (due.getMonth() - start.getMonth()));
    const monthlyRate = rate / 100 / 12;

    let totalAmount = 0;
    let totalInterest = 0;
    let eachAmount = 0;

    if (method === 'equalPrincipalInterest') {
      // 等额本息
      const x = Math.pow(1 + monthlyRate, months);
      eachAmount = (principal * monthlyRate * x) / (x - 1);
      totalAmount = eachAmount * months;
      totalInterest = totalAmount - principal;
    } else if (method === 'equalPrincipal') {
      // 等额本金
      const basePrincipal = principal / months;
      totalInterest = 0;
      for (let i = 0; i < months; i++) {
        const remainPrincipal = principal - basePrincipal * i;
        totalInterest += remainPrincipal * monthlyRate;
      }
      totalAmount = principal + totalInterest;
      eachAmount = totalAmount / months; // 平均每期
    } else if (method === 'interestOnly') {
      // 先息后本
      totalInterest = principal * monthlyRate * months;
      totalAmount = principal + totalInterest;
      eachAmount = principal * monthlyRate;
    } else if (method === 'lumpSum') {
      // 到期一次性
      totalInterest = principal * monthlyRate * months;
      totalAmount = principal + totalInterest;
      eachAmount = totalAmount;
    }

    return {
      periods: months,
      methodLabel: method === 'equalPrincipalInterest' ? '等额本息' : method === 'equalPrincipal' ? '等额本金' : method === 'interestOnly' ? '先息后本' : '到期一次性',
      totalAmount,
      totalInterest,
      eachAmount,
      remainingAmount: totalAmount - (parseFloat(form.paidAmount) || 0),
    };
  }, [form.principal, form.annualRate, form.repaymentMethod, form.startDate, form.dueDate, form.paidAmount]);

  const handleSave = async () => {
    if (!form.creditor || !form.amount) return;
    setSaving(true);
    try {
      const debtData = {
        ...form,
        principal: parseFloat(form.principal) || 0,
        annualRate: parseFloat(form.annualRate) || 0,
        amount: parseFloat(form.amount) || 0,
        paidAmount: parseFloat(form.paidAmount) || 0,
        remainingAmount,
        id: editingDebt ? editingDebt.id : Date.now(),
      };

      let updatedDebts;
      if (editingDebt) {
        updatedDebts = debts.map((d) => (d.id === editingDebt.id ? debtData : d));
      } else {
        updatedDebts = [...debts, debtData];
      }

      await saveState({
        ...stateData,
        debts: updatedDebts,
      });

      setShowAddModal(false);
      setTotalAmountOverridden(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Failed to save debt:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (debt) => {
    if (!window.confirm('确定要删除这条债务记录吗？')) return;
    try {
      const updatedDebts = debts.filter((d) => d.id !== debt.id);
      await saveState({
        ...stateData,
        debts: updatedDebts,
      });
      loadData();
    } catch (err) {
      console.error('Failed to delete debt:', err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const filterByTime = (debtsToFilter) => {
    if (!debtsToFilter || debtsToFilter.length === 0) return [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (timePeriod === '日常') {
      const today = now.toDateString();
      return debtsToFilter.filter((debt) => {
        if (!debt.startDate) return false;
        const debtDate = new Date(debt.startDate);
        return debtDate.toDateString() === today;
      });
    }

    if (timePeriod === '年统计') {
      return debtsToFilter.filter((debt) => {
        if (!debt.startDate) return false;
        const debtDate = new Date(debt.startDate);
        return debtDate.getFullYear() === currentYear;
      });
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

      return debtsToFilter.filter((debt) => {
        if (!debt.startDate) return false;
        const debtDate = new Date(debt.startDate);
        return debtDate.getFullYear() === targetYear && debtDate.getMonth() === targetMonth;
      });
    }

    return debtsToFilter;
  };

  const getDailyTotals = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const totals = {};
    debts.forEach((debt) => {
      if (!debt.startDate) return;
      const d = new Date(debt.startDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const dateKey = formatDate(d);
        if (!totals[dateKey]) totals[dateKey] = 0;
        totals[dateKey] += debt.amount || 0;
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
          {['日', '一', '二', '三', '四', '五', '六'].map((d) => <span key={d} className="text-gray-400 py-1">{d}</span>)}
          {days.map((day, idx) => {
            if (!day) return <span key={`empty-${idx}`} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTotal = totals[dateStr] || 0;
            const isToday = dateStr === todayStr;
            const isSelected = selectedDate && formatDate(selectedDate) === dateStr;
            return (
              <button
                key={day}
                onClick={() => setSelectedDate(new Date(year, month, day))}
                className={`p-1.5 rounded-lg text-xs relative ${isSelected ? 'bg-red-500 text-white' : isToday ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'hover:bg-gray-100 dark:hover:bg-slate-700'} ${dayTotal > 0 ? 'font-semibold' : ''}`}
              >
                {day}
                {dayTotal > 0 && <span className={`absolute bottom-0 left-0 right-0 text-[8px] ${isSelected ? 'text-white/80' : 'text-red-500'}`}>{dayTotal > 999 ? (dayTotal / 1000).toFixed(0) + 'k' : dayTotal}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs">
          <button onClick={() => setSelectedDate(new Date())} className={`px-3 py-1 rounded-full ${!selectedDate || formatDate(selectedDate) === todayStr ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-slate-700'}`}>今日</button>
          {selectedDate && <button onClick={() => setSelectedDate(null)} className="px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center gap-1"><X className="w-3 h-3" />清除</button>}
        </div>
      </div>
    );
  };

  const computeStats = () => {
    let filtered = debts || [];
    
    // 关键词筛选
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      filtered = filtered.filter((d) =>
        (d.creditor || d.name || '').toLowerCase().includes(kw) ||
        (d.debtor || '').toLowerCase().includes(kw) ||
        (d.note || '').toLowerCase().includes(kw)
      );
    }
    
    const payables = filtered.filter((d) => d.category === 'payable' || (!d.category && (d.type === '借入' || d.type === '应付')));
    const receivables = filtered.filter((d) => d.category === 'receivable' || (!d.category && (d.type === '借出' || d.type === '应收')));

    const pTotal = payables.reduce((s, d) => s + (d.amount || 0), 0);
    const pPrincipal = payables.reduce((s, d) => s + (d.principal || d.amount || 0), 0);
    const pInterest = pTotal - pPrincipal;
    const pRate = pPrincipal > 0 ? (pInterest / pPrincipal) * 100 : 0;
    const pDailyRate = pRate / 365;
    const pMonthlyRate = pRate / 12;

    const rTotal = receivables.reduce((s, d) => s + (d.amount || 0), 0);
    const rPrincipal = receivables.reduce((s, d) => s + (d.principal || d.amount || 0), 0);
    const rInterest = rTotal - rPrincipal;

    const netTotal = rTotal - pTotal;
    const netPrincipal = rPrincipal - pPrincipal;
    const netInterest = rInterest - pInterest;

    // 3个新统计卡片计算（仅应付/借入）
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentMonthStart = new Date(currentYear, currentMonth, 1);
    const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    // 总欠款（所有应付债务的本金和利息）
    const totalDebtPrincipal = payables.reduce((s, d) => s + (d.principal || d.amount || 0), 0);
    const totalDebtInterest = payables.reduce((s, d) => s + Math.max(0, (d.amount || 0) - (d.principal || d.amount || 0)), 0);

    // 本年待还
    const yearDueDebts = payables.filter((d) => {
      if (!d.dueDate) return false;
      const dueDate = new Date(d.dueDate);
      return dueDate >= yearStart && dueDate <= yearEnd;
    });
    const yearDuePrincipal = yearDueDebts.reduce((s, d) => s + (d.principal || d.amount || 0), 0);
    const yearDueInterest = yearDueDebts.reduce((s, d) => s + Math.max(0, (d.amount || 0) - (d.principal || d.amount || 0)), 0);

    // 本月待还
    const monthDueDebts = payables.filter((d) => {
      if (!d.dueDate) return false;
      const dueDate = new Date(d.dueDate);
      return dueDate >= currentMonthStart && dueDate <= currentMonthEnd;
    });
    const monthDuePrincipal = monthDueDebts.reduce((s, d) => s + (d.principal || d.amount || 0), 0);
    const monthDueInterest = monthDueDebts.reduce((s, d) => s + Math.max(0, (d.amount || 0) - (d.principal || d.amount || 0)), 0);

    return {
      payables, receivables, filtered,
      pTotal, pPrincipal, pInterest, pRate, pDailyRate, pMonthlyRate, pAnnualRate: pRate, pDailyInterest: pPrincipal * pDailyRate / 100, pMonthlyInterest: pPrincipal * pMonthlyRate / 100, pAnnualInterest: pPrincipal * pRate / 100,
      rTotal, rPrincipal, rInterest,
      netTotal, netPrincipal, netInterest,
      // 3个新卡片数据
      totalDebtPrincipal, totalDebtInterest,
      yearDuePrincipal, yearDueInterest,
      monthDuePrincipal, monthDueInterest,
    };
  };

  const stats = computeStats();

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

  const renderDebtList = (list, title, color, listKey) => {
    const totalPages = Math.ceil(list.length / PAGE_SIZE);
    const paginatedList = list.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">{list.length} 笔</span>
        </div>
        {list.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            暂无记录，点击新增债务添加。
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700">
                    <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">名称</th>
                    <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">金额</th>
                    <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">本金</th>
                    <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">利率</th>
                    <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">借入日期</th>
                    <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">还款日期</th>
                    <th className="text-center py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">附件</th>
                    <th className="text-center py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map((debt, idx) => (
                    <tr key={debt.id || idx} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <td className="py-2.5 px-3 text-gray-900 dark:text-white font-medium whitespace-nowrap">
                        {debt.creditor || debt.name || '未知'}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-medium tabular-nums whitespace-nowrap ${color === 'red' ? 'text-red-600' : 'text-emerald-600'}`}>
                        {formatCurrency(debt.amount || 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
                        {formatCurrency(debt.principal || debt.amount || 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
                        {debt.annualRate !== undefined ? `${debt.annualRate}%` : debt.interestRate !== undefined ? `${debt.interestRate}%` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {formatDate(debt.startDate || debt.date)}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {formatDate(debt.dueDate)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {debt.attachment ? (
                          <button onClick={() => setPreviewImage(debt.attachment)} className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-xs">
                            <Eye className="w-3.5 h-3.5" />查看
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEditModal(debt)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-500">
                            <EditIcon className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(debt)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-lg border border-gray-300 dark:border-slate-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  第 {currentPage} / {totalPages} 页
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded-lg border border-gray-300 dark:border-slate-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <section
          className="rounded-2xl p-6 sm:p-7"
          style={{ background: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)' }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">债务模块</h1>
              <p className="text-sm text-red-600 mt-0.5">V1.0.2</p>
            </div>
            <div className="text-center lg:text-right">
              <div className="text-4xl sm:text-5xl font-bold text-red-600 whitespace-nowrap tabular-nums tracking-tight">
                {formatCurrency(stats.pTotal)}
              </div>
              <div className="mt-1 flex items-center justify-center lg:justify-end gap-1 text-sm text-red-600">
                <TrendingDown className="w-4 h-4" />
                <span>应付/借入总额</span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                新增
              </button>
              <button
                onClick={loadData}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-500 text-red-500 text-sm font-medium hover:bg-red-500 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                刷新数据
              </button>
            </div>
          </div>
        </section>

        {/* Payable stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard label="应付/借入总额" value={formatCurrency(stats.pTotal)} sub={`${stats.payables.length} 笔待管理`} color="red" />
          <StatCard label="应付/借入总本金" value={formatCurrency(stats.pPrincipal)} sub="本金合计" color="red" />
          <StatCard label="应付/借入总利息" value={formatCurrency(stats.pInterest)} sub="利息合计" color="red" />
          <StatCard label="总债务利率" value={`${formatNumber(stats.pRate)}%`} sub="总利息 / 总本金 * 100%" color="red" />
          <StatCard label="日利率" value={`${formatNumber(stats.pDailyRate, 4)}%`} sub={`日利息 ${formatCurrency(stats.pDailyInterest)}`} color="red" />
          <StatCard label="月利率" value={`${formatNumber(stats.pMonthlyRate)}%`} sub={`月利息 ${formatCurrency(stats.pMonthlyInterest)}`} color="red" />
          <StatCard label="年利率" value={`${formatNumber(stats.pAnnualRate)}%`} sub={`年利息 ${formatCurrency(stats.pAnnualInterest)}`} color="red" />
        </section>

        {/* Receivable stats */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard label="应收/借出总额" value={formatCurrency(stats.rTotal)} sub={`${stats.receivables.length} 笔待回收`} color="green" />
          <StatCard label="应收/借出总本金" value={formatCurrency(stats.rPrincipal)} sub="本金合计" color="green" />
          <StatCard label="应收/借出总利息" value={formatCurrency(stats.rInterest)} sub="利息合计" color="green" />
        </section>

        {/* Net stats */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard label="净债务" value={formatCurrency(Math.abs(stats.netTotal))} sub="应收/借出总额 - 应付/借入总额" color={stats.netTotal >= 0 ? 'green' : 'red'} signed={stats.netTotal >= 0 ? '+' : '-'} />
          <StatCard label="净本金" value={formatCurrency(Math.abs(stats.netPrincipal))} sub="应付/借入总本金 - 应收/借出总本金" color={stats.netPrincipal >= 0 ? 'green' : 'red'} signed={stats.netPrincipal >= 0 ? '+' : '-'} />
          <StatCard label="净利息" value={formatCurrency(Math.abs(stats.netInterest))} sub="应付/借入总利息 - 应收/借出总利息" color={stats.netInterest >= 0 ? 'green' : 'red'} signed={stats.netInterest >= 0 ? '+' : '-'} />
        </section>

        {/* New 3 Stats Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="text-sm opacity-80 mb-1">总欠款</div>
            <div className="text-2xl font-bold tabular-nums">{formatCurrency(stats.totalDebtPrincipal + stats.totalDebtInterest)}</div>
            <div className="mt-2 text-xs opacity-80">
              <div>欠款本金：{formatCurrency(stats.totalDebtPrincipal)}</div>
              <div>欠款利息：{formatCurrency(stats.totalDebtInterest)}</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="text-sm opacity-80 mb-1">本年待还</div>
            <div className="text-2xl font-bold tabular-nums">{formatCurrency(stats.yearDuePrincipal + stats.yearDueInterest)}</div>
            <div className="mt-2 text-xs opacity-80">
              <div>待还本金：{formatCurrency(stats.yearDuePrincipal)}</div>
              <div>待还利息：{formatCurrency(stats.yearDueInterest)}</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="text-sm opacity-80 mb-1">本月待还</div>
            <div className="text-2xl font-bold tabular-nums">{formatCurrency(stats.monthDuePrincipal + stats.monthDueInterest)}</div>
            <div className="mt-2 text-xs opacity-80">
              <div>待还本金：{formatCurrency(stats.monthDuePrincipal)}</div>
              <div>待还利息：{formatCurrency(stats.monthDueInterest)}</div>
            </div>
          </div>
        </section>

        {/* Search & Filter */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => { setSearchKeyword(e.target.value); setCurrentPage(1); }}
                placeholder="搜索名称/债权人/备注..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              共 {stats.filtered.length} 条记录
              {stats.filtered.length > PAGE_SIZE && (
                <span className="ml-2">
                  第 {currentPage}/{Math.ceil(stats.filtered.length / PAGE_SIZE)} 页
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Debt lists - Card Style */}
        <div className="space-y-4">
          {/* Payable Section */}
          <div>
            <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              应付 / 借入
            </h3>
            {stats.payables.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center text-gray-500 dark:text-gray-400">
                暂无应付/借入记录
              </div>
            ) : (
              <div className="space-y-3">
                {debtCategories.map((cat) => {
                  const catDebts = stats.payables.filter((d) => d.debtCategory === cat.id);
                  if (catDebts.length === 0) return null;
                  const totalAmount = catDebts.reduce((s, d) => s + (d.amount || 0), 0);
                  const cardKey = `payable_${cat.id}`;
                  const isExpanded = expandedCards[cardKey] !== false;
                  
                  return renderCategoryCard(cat, catDebts, totalAmount, cardKey, isExpanded, 'red');
                })}
                {/* 未分类 */}
                {(() => {
                  const uncategorized = stats.payables.filter((d) => !d.debtCategory || d.debtCategory === '');
                  if (uncategorized.length === 0) return null;
                  const totalAmount = uncategorized.reduce((s, d) => s + (d.amount || 0), 0);
                  const cardKey = 'payable_uncategorized';
                  const isExpanded = expandedCards[cardKey] !== false;
                  return renderCategoryCard({ id: 'uncategorized', name: '未分类' }, uncategorized, totalAmount, cardKey, isExpanded, 'red');
                })()}
              </div>
            )}
          </div>

          {/* Receivable Section */}
          <div>
            <h3 className="text-lg font-semibold text-emerald-600 mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              应收 / 借出
            </h3>
            {stats.receivables.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center text-gray-500 dark:text-gray-400">
                暂无应收/借出记录
              </div>
            ) : (
              <div className="space-y-3">
                {debtCategories.map((cat) => {
                  const catDebts = stats.receivables.filter((d) => d.debtCategory === cat.id);
                  if (catDebts.length === 0) return null;
                  const totalAmount = catDebts.reduce((s, d) => s + (d.amount || 0), 0);
                  const cardKey = `receivable_${cat.id}`;
                  const isExpanded = expandedCards[cardKey] !== false;
                  
                  return renderCategoryCard(cat, catDebts, totalAmount, cardKey, isExpanded, 'emerald');
                })}
                {/* 未分类 */}
                {(() => {
                  const uncategorized = stats.receivables.filter((d) => !d.debtCategory || d.debtCategory === '');
                  if (uncategorized.length === 0) return null;
                  const totalAmount = uncategorized.reduce((s, d) => s + (d.amount || 0), 0);
                  const cardKey = 'receivable_uncategorized';
                  const isExpanded = expandedCards[cardKey] !== false;
                  return renderCategoryCard({ id: 'uncategorized', name: '未分类' }, uncategorized, totalAmount, cardKey, isExpanded, 'emerald');
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-2xl shadow-xl my-8">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editingDebt ? '编辑债务' : '新增债务'}</h3>
                <button onClick={() => { setShowAddModal(false); setTotalAmountOverridden(false); }} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">大类 <span className="text-red-500">*</span></label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white">
                      <option value="payable">应付 / 借入</option>
                      <option value="receivable">应收 / 借出</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">类型</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white">
                      {form.category === 'payable' ? (
                        <><option value="借入">借入</option><option value="应付">应付</option></>
                      ) : (
                        <><option value="借出">借出</option><option value="应收">应收</option></>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      类别 <button type="button" onClick={() => setShowCategoryModal(true)} className="ml-1 text-xs text-indigo-600 hover:text-indigo-700">设置</button>
                    </label>
                    <select value={form.debtCategory} onChange={(e) => setForm({ ...form, debtCategory: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white">
                      <option value="">请选择类别</option>
                      {debtCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"><span className="text-red-500">*</span> 债权人 / 借款人</label>
                    <input type="text" value={form.creditor} onChange={(e) => setForm({ ...form, creditor: e.target.value })} placeholder="请输入债权人或借款人" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"><span className="text-red-500">*</span> 债务人 / 付款人</label>
                    <input type="text" value={form.debtor} onChange={(e) => setForm({ ...form, debtor: e.target.value })} placeholder="请输入债务人或付款人" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"><span className="text-red-500">*</span> 本金</label>
                    <input type="number" value={form.principal} onChange={(e) => {
                      setForm({ ...form, principal: e.target.value });
                      if (!totalAmountOverridden && repaymentPlan) {
                        setForm((prev) => ({ ...prev, principal: e.target.value, amount: repaymentPlan.totalAmount.toFixed(2) }));
                      }
                    }} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">利息（年化%）</label>
                    <input type="number" value={form.annualRate} onChange={(e) => {
                      setForm({ ...form, annualRate: e.target.value });
                      if (!totalAmountOverridden && repaymentPlan) {
                        setForm((prev) => ({ ...prev, annualRate: e.target.value, amount: repaymentPlan.totalAmount.toFixed(2) }));
                      }
                    }} placeholder="0" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      总金额 <span className="text-xs text-gray-400">（本金+利息）</span>
                    </label>
                    <input
                      type="number"
                      value={form.amount}
                      onChange={(e) => {
                        setForm({ ...form, amount: e.target.value });
                        setTotalAmountOverridden(true);
                      }}
                      placeholder="自动计算或手动输入"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                    />
                    {!totalAmountOverridden && repaymentPlan && (
                      <p className="text-xs text-gray-400 mt-1">自动计算：{formatCurrency(repaymentPlan.totalAmount)}（本金 {formatCurrency(parseFloat(form.principal) || 0)} + 利息 {formatCurrency(repaymentPlan.totalInterest)}）</p>
                    )}
                    {totalAmountOverridden && (
                      <button onClick={() => {
                        setTotalAmountOverridden(false);
                        if (repaymentPlan) {
                          setForm((prev) => ({ ...prev, amount: repaymentPlan.totalAmount.toFixed(2) }));
                        }
                      }} className="text-xs text-indigo-600 hover:text-indigo-700 mt-1">恢复自动计算</button>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"><span className="text-red-500">*</span> 借入日期</label>
                    <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"><span className="text-red-500">*</span> 还款日期</label>
                    <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">还款方式</label>
                    <select value={form.repaymentMethod} onChange={(e) => setForm({ ...form, repaymentMethod: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white">
                      <option value="equalPrincipalInterest">等额本息</option>
                      <option value="equalPrincipal">等额本金</option>
                      <option value="interestOnly">先息后本</option>
                      <option value="lumpSum">到期一次性</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">已还金额</label>
                    <input type="number" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} placeholder="0" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">剩余金额</label>
                    <input type="text" readOnly value={formatCurrency(remainingAmount)} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700/50 text-gray-600 dark:text-gray-300" />
                  </div>
                </div>

                {/* Attachment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">附件</label>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">
                      <FileImage className="w-4 h-4" />
                      选择文件
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    </label>
                    {!form.attachment && <span className="text-sm text-gray-400">未选择文件</span>}
                  </div>
                  {form.attachment && (
                    <div className="mt-3 inline-block relative group">
                      <img src={form.attachment} alt="attachment" className="h-20 w-auto rounded-lg border border-gray-200 dark:border-slate-600 cursor-pointer" onClick={() => setPreviewImage(form.attachment)} />
                      <button onClick={handleRemoveAttachment} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Note */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">备注</label>
                  <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} placeholder="合同编号、用途、抵押物、沟通记录等" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white resize-none" />
                </div>

                {/* Repayment plan preview */}
                {repaymentPlan && (
                  <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4 space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">期数</div>
                        <div className="font-medium text-gray-900 dark:text-white">{repaymentPlan.periods} 期</div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">还款方式</div>
                        <div className="font-medium text-gray-900 dark:text-white">{repaymentPlan.methodLabel}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">总金额</div>
                        <div className="font-medium text-gray-900 dark:text-white">{formatCurrency(repaymentPlan.totalAmount)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">总利息</div>
                        <div className="font-medium text-gray-900 dark:text-white">{formatCurrency(repaymentPlan.totalInterest)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">每期金额</div>
                        <div className="font-medium text-gray-900 dark:text-white">{formatCurrency(repaymentPlan.eachAmount)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">剩余金额</div>
                        <div className="font-medium text-gray-900 dark:text-white">{formatCurrency(repaymentPlan.remainingAmount)}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setShowAddModal(false); setTotalAmountOverridden(false); }} className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">取消</button>
                  <button onClick={handleSave} disabled={saving || !form.creditor || !form.amount} className="flex-1 py-2.5 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image preview modal */}
        {previewImage && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" onClick={() => setPreviewImage(null)}>
            <div className="relative max-w-full max-h-full">
              <img src={previewImage} alt="preview" className="max-w-full max-h-[80vh] rounded-lg shadow-2xl" />
              <button onClick={() => setPreviewImage(null)} className="absolute -top-3 -right-3 p-1.5 bg-white dark:bg-slate-800 rounded-full shadow-lg">
                <X className="w-5 h-5 text-gray-700 dark:text-gray-200" />
              </button>
            </div>
          </div>
        )}

        {/* Category Management Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">类别管理</h3>
                <button onClick={() => { setShowCategoryModal(false); setEditingCategory(null); setCategoryName(''); }} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"><X className="w-5 h-5" /></button>
              </div>
              
              {/* Add/Edit Category */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="输入类别名称"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                />
                <button
                  onClick={async () => {
                    if (!categoryName.trim()) return;
                    let updatedCategories;
                    if (editingCategory) {
                      updatedCategories = debtCategories.map((c) => c.id === editingCategory.id ? { ...c, name: categoryName } : c);
                    } else {
                      updatedCategories = [...debtCategories, { id: `cat_${Date.now()}`, name: categoryName }];
                    }
                    await saveState({
                      ...stateData,
                      debtCategories: updatedCategories,
                    });
                    setCategoryName('');
                    setEditingCategory(null);
                    loadData();
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  {editingCategory ? '更新' : '添加'}
                </button>
              </div>
              
              {/* Category List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {debtCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <span className="text-gray-900 dark:text-white">{cat.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditingCategory(cat); setCategoryName(cat.name); }}
                        className="text-indigo-600 hover:text-indigo-700 text-sm"
                      >
                        编辑
                      </button>
                      <button
                        onClick={async () => {
                          if (!window.confirm(`确定要删除类别"${cat.name}"吗？`)) return;
                          const updatedCategories = debtCategories.filter((c) => c.id !== cat.id);
                          await saveState({
                            ...stateData,
                            debtCategories: updatedCategories,
                          });
                          loadData();
                        }}
                        className="text-red-500 hover:text-red-600 text-sm"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, signed }) {
  const colorClasses = {
    red: 'text-red-600',
    green: 'text-emerald-600',
  };
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className={`text-xl sm:text-2xl font-bold tabular-nums whitespace-nowrap ${colorClasses[color] || 'text-gray-900 dark:text-white'}`}>
        {signed === '-' ? '-' : signed === '+' ? '+' : ''}{value}
      </div>
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">{sub}</div>
    </div>
  );
}

function EditIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

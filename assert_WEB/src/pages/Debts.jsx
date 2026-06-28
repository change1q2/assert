import { useState, useEffect } from 'react';
import { fetchState, createDebt } from '../api';
import {
  TrendingDown,
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
} from 'lucide-react';

function formatCurrency(value) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
  }).format(value);
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
  const [newDebt, setNewDebt] = useState({ name: '', amount: '', interestRate: '', remainingPeriods: '', dueIn30Days: '' });
  const [saving, setSaving] = useState(false);

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

  const handleAddDebt = async () => {
    if (!newDebt.name || !newDebt.amount) return;
    setSaving(true);
    try {
      await createDebt({
        ...newDebt,
        amount: parseFloat(newDebt.amount),
        interestRate: parseFloat(newDebt.interestRate) || 0,
        remainingPeriods: parseInt(newDebt.remainingPeriods) || 0,
        dueIn30Days: parseFloat(newDebt.dueIn30Days) || 0,
      });
      setShowAddModal(false);
      setNewDebt({ name: '', amount: '', interestRate: '', remainingPeriods: '', dueIn30Days: '' });
      loadData();
    } catch (err) {
      console.error('Failed to add debt:', err);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
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
      return debtsToFilter.filter(debt => {
        if (!debt.date) return false;
        const debtDate = new Date(debt.date);
        return debtDate.toDateString() === today;
      });
    }

    if (timePeriod === '年统计') {
      return debtsToFilter.filter(debt => {
        if (!debt.date) return false;
        const debtDate = new Date(debt.date);
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

      return debtsToFilter.filter(debt => {
        if (!debt.date) return false;
        const debtDate = new Date(debt.date);
        return debtDate.getFullYear() === targetYear && debtDate.getMonth() === targetMonth;
      });
    }

    return debtsToFilter;
  };

  const getDailyTotals = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const totals = {};
    debts.forEach(debt => {
      if (!debt.date) return;
      const d = new Date(debt.date);
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
          {['日', '一', '二', '三', '四', '五', '六'].map(d => <span key={d} className="text-gray-400 py-1">{d}</span>)}
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

  const computeDebtStats = () => {
    const filteredDebts = filterByTime(debts || []);

    const totalDebt = filteredDebts.reduce((sum, d) => sum + (d.amount || d.balance || 0), 0);
    const totalPrincipal = filteredDebts.reduce((sum, d) => sum + (d.principal || d.amount || 0), 0);
    const totalInterest = totalDebt - totalPrincipal;
    const totalDueIn30Days = filteredDebts.reduce((sum, d) => sum + (d.dueIn30Days || 0), 0);

    return { totalDebt, totalPrincipal, totalInterest, totalDueIn30Days, debtList: filteredDebts };
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

  const { totalDebt, totalPrincipal, totalInterest, totalDueIn30Days, debtList } = computeDebtStats();

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
                      ? 'bg-red-500 text-white font-medium'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-red-500 mr-1">2026年</span>
              {['本月', '上月', '4月', '3月', '2月', '1月'].map((month) => (
                <button
                  key={month}
                  onClick={() => setSelectedMonth(month)}
                  className={`px-3 py-1 rounded-full text-xs transition-all ${
                    selectedMonth === month
                      ? 'bg-red-500 text-white font-medium'
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
            background: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
          }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">债务模块</h1>
            </div>
            <div className="text-center lg:text-right">
              <div className="text-4xl sm:text-5xl font-bold text-red-600 whitespace-nowrap tabular-nums tracking-tight">
                {formatCurrency(totalDebt)}
              </div>
              <div className="mt-1 flex items-center justify-center lg:justify-end gap-1 text-sm text-red-600">
                <TrendingDown className="w-4 h-4" />
                <span>债务总额</span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => { setNewDebt({ name: '', amount: '', interestRate: '', remainingPeriods: '', dueIn30Days: '' }); setShowAddModal(true); }}
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

        {totalDueIn30Days > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-yellow-800 dark:text-yellow-300">近期还款提醒</div>
              <div className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                未来30天内需还款 <strong>{formatCurrency(totalDueIn30Days)}</strong>，请确保账户余额充足
              </div>
            </div>
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full p-2">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">债务总额</span>
            </div>
            <div className="text-2xl font-bold text-red-600 tabular-nums whitespace-nowrap">
              {formatCurrency(totalDebt)}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full p-2">
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">本金</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
              {formatCurrency(totalPrincipal)}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full p-2">
                <Percent className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">利息</span>
            </div>
            <div className="text-2xl font-bold text-orange-600 tabular-nums whitespace-nowrap">
              {formatCurrency(totalInterest)}
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">债务列表</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">名称</th>
                  <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">金额</th>
                  <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">利率</th>
                  <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">期限</th>
                  <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">30天待还</th>
                </tr>
              </thead>
              <tbody>
                {debtList.map((debt, idx) => (
                  <tr key={debt.id || idx} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="py-2.5 px-3 text-gray-900 dark:text-white font-medium">
                      {debt.name || debt.category || '未知债务'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-red-600 tabular-nums">
                      {formatCurrency(debt.amount || debt.balance || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-900 dark:text-white tabular-nums">
                      {debt.interestRate !== undefined ? `${debt.interestRate}%` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-900 dark:text-white">
                      {debt.remainingPeriods !== undefined ? (
                        <span className="flex items-center justify-end gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          剩余{debt.remainingPeriods}期
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {debt.dueIn30Days ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
                          {formatCurrency(debt.dueIn30Days)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {debtList.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p>暂无债务数据</p>
              </div>
            )}
          </div>
        </section>

        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">新增债务</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">债务名称</label>
                  <input type="text" value={newDebt.name} onChange={e => setNewDebt({ ...newDebt, name: e.target.value })} placeholder="如：招商银行信用卡" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">金额</label>
                  <input type="number" value={newDebt.amount} onChange={e => setNewDebt({ ...newDebt, amount: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">利率 (%)</label>
                  <input type="number" value={newDebt.interestRate} onChange={e => setNewDebt({ ...newDebt, interestRate: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">剩余期限 (期)</label>
                  <input type="number" value={newDebt.remainingPeriods} onChange={e => setNewDebt({ ...newDebt, remainingPeriods: e.target.value })} placeholder="0" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">30天待还</label>
                  <input type="number" value={newDebt.dueIn30Days} onChange={e => setNewDebt({ ...newDebt, dueIn30Days: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">取消</button>
                  <button onClick={handleAddDebt} disabled={saving || !newDebt.name || !newDebt.amount} className="flex-1 py-2.5 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

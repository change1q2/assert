import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart, LabelList
} from 'recharts';
import {
  CreditCard, DollarSign, Percent, Calendar, TrendingUp, TrendingDown, PieChart as PieChartIcon, ArrowLeft
} from 'lucide-react';
import { truncateNum } from '../utils/currency';

function formatCurrency(value) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(truncateNum(value || 0, 3));
}

function formatPercentage(value) {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function calculateRepayment(principal, annualRate, repaymentMethod, startDate, dueDate, paidAmount, useDailyInterest = false, investmentDays = 365) {
  const methodLabel = {
    equal_principal: '等额本金',
    equal_payment: '等额本息',
    bullet: '到期一次',
    interest_only: '只还利息',
    equalPrincipalInterest: '等额本息',
    equalPrincipal: '等额本金',
    interestOnly: '先息后本',
    lumpSum: '到期一次性',
  }[repaymentMethod] || repaymentMethod || '其他';

  if (!principal || !annualRate) {
    return { methodLabel, totalInterest: 0, schedule: [] };
  }

  const monthlyRate = annualRate / 100 / 12;
  const dailyRate = annualRate / 100 / (parseFloat(investmentDays) || 365);
  const start = new Date(startDate);
  const due = new Date(dueDate);
  const months = Math.max(1, Math.round((due - start) / (1000 * 60 * 60 * 24 * 30)));

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getEffectiveMonthlyRate = (paymentDate) => {
    if (useDailyInterest) return dailyRate * getDaysInMonth(paymentDate);
    return monthlyRate;
  };

  let totalInterest = 0;
  const schedule = [];

  if (repaymentMethod === 'equal_principal' || repaymentMethod === 'equalPrincipal') {
    const principalPerMonth = principal / months;
    for (let i = 0; i < months; i++) {
      const date = new Date(start);
      date.setMonth(date.getMonth() + i);
      const effRate = getEffectiveMonthlyRate(date);
      const interest = (principal - principalPerMonth * i) * effRate;
      totalInterest += interest;
      schedule.push({ period: i + 1, date: date.toISOString().split('T')[0], payment: principalPerMonth + interest });
    }
  } else if (repaymentMethod === 'equal_payment' || repaymentMethod === 'equalPrincipalInterest') {
    if (useDailyInterest) {
      const avgMonthlyRate = dailyRate * 30.4167;
      const x = Math.pow(1 + avgMonthlyRate, months);
      const payment = avgMonthlyRate === 0 ? principal / months : (principal * avgMonthlyRate * x) / (x - 1);
      let remainingPrincipal = principal;
      for (let i = 0; i < months; i++) {
        const date = new Date(start);
        date.setMonth(date.getMonth() + i);
        const effRate = getEffectiveMonthlyRate(date);
        const interest = remainingPrincipal * effRate;
        let principalPart = payment - interest;
        if (i === months - 1) principalPart = remainingPrincipal;
        remainingPrincipal -= principalPart;
        if (remainingPrincipal < 0) remainingPrincipal = 0;
        totalInterest += interest;
        schedule.push({ period: i + 1, date: date.toISOString().split('T')[0], payment: principalPart + interest });
      }
    } else {
      const payment = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
      for (let i = 0; i < months; i++) {
        const interest = principal * monthlyRate * Math.pow(1 + monthlyRate, i);
        totalInterest += interest;
        const date = new Date(start);
        date.setMonth(date.getMonth() + i);
        schedule.push({ period: i + 1, date: date.toISOString().split('T')[0], payment });
      }
    }
  } else if (repaymentMethod === 'bullet' || repaymentMethod === 'lumpSum') {
    if (useDailyInterest) {
      const totalDays = Math.max(1, Math.round((due - start) / (1000 * 60 * 60 * 24)));
      totalInterest = principal * dailyRate * totalDays;
    } else {
      totalInterest = principal * monthlyRate * months;
    }
    schedule.push({ period: 1, date: dueDate, payment: principal + totalInterest });
  } else {
    // interest_only / interestOnly
    if (useDailyInterest) {
      for (let i = 0; i < months; i++) {
        const date = new Date(start);
        date.setMonth(date.getMonth() + i);
        const effRate = getEffectiveMonthlyRate(date);
        const interest = principal * effRate;
        totalInterest += interest;
        schedule.push({ period: i + 1, date: date.toISOString().split('T')[0], payment: interest });
      }
    } else {
      totalInterest = principal * monthlyRate * months;
      for (let i = 0; i < months; i++) {
        const date = new Date(start);
        date.setMonth(date.getMonth() + i);
        schedule.push({ period: i + 1, date: date.toISOString().split('T')[0], payment: principal * monthlyRate });
      }
    }
  }

  return { methodLabel, totalInterest, schedule };
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

function adjustColor(color, amount) {
  const num = parseInt(color.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export default function DebtAnalysis({ debts, debtCategories = [] }) {
  const [drilldown, setDrilldown] = useState({ level: 0, category: null, type: null });

  // 判断债务类别是否为消费贷（按日计息）
  const isConsumerLoan = (debtCategory) => {
    const cat = debtCategories.find(c => c.id === debtCategory);
    return cat && cat.name === '消费贷';
  };

  const debtMetrics = useMemo(() => {
    let totalAmount = 0;
    let totalPrincipal = 0;
    let totalInterest = 0;
    let totalPaid = 0;
    let totalLent = 0;

    debts.forEach(debt => {
      const amount = parseFloat(debt.amount) || 0;
      const principal = parseFloat(debt.principal) || parseFloat(debt.amount) || 0;
      const paidAmount = parseFloat(debt.paidAmount) || 0;
      
      totalAmount += amount;
      totalPrincipal += principal;
      totalPaid += paidAmount;

      // 计算总借出金额
      const debtType = debt.type || (debt.category === 'payable' ? '借入' : debt.category === 'receivable' ? '借出' : debt.category);
      if (debtType === '借出' || debtType === '应收') {
        totalLent += amount;
      }

      const plan = calculateRepayment(debt.principal, debt.annualRate, debt.repaymentMethod, debt.startDate, debt.dueDate, debt.paidAmount, isConsumerLoan(debt.debtCategory), debt.investmentDays);
      totalInterest += plan.totalInterest || 0;
    });

    return { totalAmount, totalPrincipal, totalInterest, totalPaid, totalLent };
  }, [debts]);

  // Level 0: 大类分布（入账/出账）
  const categoryDistribution = useMemo(() => {
    const cats = {};
    debts.forEach(debt => {
      const cat = debt.category === 'payable' ? '入账' : debt.category === 'receivable' ? '出账' : debt.category || '其他';
      cats[cat] = (cats[cat] || 0) + (parseFloat(debt.amount) || 0);
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [debts]);

  // Level 1: 类型分布（在大类下）
  const typeDistribution = useMemo(() => {
    if (drilldown.level < 1 || !drilldown.category) return [];
    const types = {};
    debts.forEach(debt => {
      const cat = debt.category === 'payable' ? '入账' : debt.category === 'receivable' ? '出账' : debt.category;
      if (cat !== drilldown.category) return;
      const type = debt.type || (debt.category === 'payable' ? '借入' : debt.category === 'receivable' ? '借出' : '其他');
      types[type] = (types[type] || 0) + (parseFloat(debt.amount) || 0);
    });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [debts, drilldown]);

  // Level 2: 细分类别分布（在类型下）
  const subCategoryDistribution = useMemo(() => {
    if (drilldown.level < 2 || !drilldown.type) return [];
    const categories = {};
    debts.forEach(debt => {
      const type = debt.type || (debt.category === 'payable' ? '借入' : debt.category === 'receivable' ? '借出' : debt.category);
      if (type !== drilldown.type) return;
      const catId = debt.debtCategory || 'uncategorized';
      const catName = debtCategories.find(c => c.id === catId)?.name || (catId === 'uncategorized' ? '未分类' : catId);
      if (catId && catId.startsWith('cat_')) {
        const preset = ['信用卡', '房贷', '车贷', '消费贷', '亲友借款', '他人借款'];
        const idx = parseInt(catId.replace('cat_', ''), 10);
        if (!isNaN(idx) && idx >= 0 && idx < preset.length) {
          categories[preset[idx]] = (categories[preset[idx]] || 0) + (parseFloat(debt.amount) || 0);
          return;
        }
      }
      categories[catName] = (categories[catName] || 0) + (parseFloat(debt.amount) || 0);
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [debts, debtCategories, drilldown]);

  const monthlyTrend = useMemo(() => {
    const months = {};
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { month: key, amount: 0, count: 0 };
    }

    debts.forEach(debt => {
      if (debt.startDate) {
        const date = new Date(debt.startDate);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (months[key]) {
          months[key].amount += parseFloat(debt.amount) || 0;
          months[key].count += 1;
        }
      }
    });

    return Object.values(months);
  }, [debts]);

  const compareData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    
    let currentYearAmount = 0;
    let lastYearAmount = 0;
    
    debts.forEach(debt => {
      if (debt.startDate) {
        const year = new Date(debt.startDate).getFullYear();
        if (year === currentYear) {
          currentYearAmount += parseFloat(debt.amount) || 0;
        } else if (year === lastYear) {
          lastYearAmount += parseFloat(debt.amount) || 0;
        }
      }
    });

    const yoy = lastYearAmount > 0 
      ? ((currentYearAmount - lastYearAmount) / lastYearAmount) * 100
      : null;

    return { currentYearAmount, lastYearAmount, yoy };
  }, [debts, monthlyTrend]);

  const upcomingDebts = useMemo(() => {
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + 90);

    return debts
      .filter(debt => {
        if (!debt.dueDate) return false;
        const due = new Date(debt.dueDate);
        return due >= today && due <= future;
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);
  }, [debts]);

  const currentMonthRepayments = useMemo(() => {
    const today = new Date();
    const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const repayments = [];

    debts.forEach(debt => {
      if (!debt.startDate || !debt.repaymentMethod) return;

      const plan = calculateRepayment(
        debt.principal,
        debt.annualRate,
        debt.repaymentMethod,
        debt.startDate,
        debt.dueDate,
        debt.paidAmount,
        isConsumerLoan(debt.debtCategory),
        debt.investmentDays
      );

      if (plan.schedule && plan.schedule.length > 0) {
        plan.schedule.forEach(item => {
          if (item.date && item.date.startsWith(currentYearMonth)) {
            repayments.push({
              id: debt.id,
              creditor: debt.creditor || debt.name || '未知',
              type: debt.type || debt.category || '其他',
              amount: item.payment,
              date: item.date,
            });
          }
        });
      }
    });

    return repayments;
  }, [debts]);

  const totalDueThisMonth = useMemo(() => {
    return currentMonthRepayments.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }, [currentMonthRepayments]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-5 h-5" />
            <span className="text-red-100 text-sm">债务总额</span>
          </div>
          <p className="text-xl font-bold">{formatCurrency(debtMetrics.totalAmount)}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5" />
            <span className="text-orange-100 text-sm">债务总本金</span>
          </div>
          <p className="text-xl font-bold">{formatCurrency(debtMetrics.totalPrincipal)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5" />
            <span className="text-purple-100 text-sm">总借出</span>
          </div>
          <p className="text-xl font-bold">{formatCurrency(debtMetrics.totalLent)}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-5 h-5" />
            <span className="text-blue-100 text-sm">债务总利息</span>
          </div>
          <p className="text-xl font-bold">{formatCurrency(debtMetrics.totalInterest)}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5" />
            <span className="text-green-100 text-sm">已还金额</span>
          </div>
          <p className="text-xl font-bold">{formatCurrency(debtMetrics.totalPaid)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200/60 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            债务环比趋势
          </h3>
          <div className="w-full h-[280px]">
            {monthlyTrend.some(d => d.amount > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                  <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={{ stroke: '#e5e7eb' }} tickLine={{ stroke: '#e5e7eb' }} />
                  <YAxis tickFormatter={(value) => (value >= 10000 ? `${(value / 10000).toFixed(1)}万` : value)} tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={{ stroke: '#e5e7eb' }} tickLine={{ stroke: '#e5e7eb' }} />
                  <Tooltip 
                    formatter={(value) => [`${formatCurrency(value)}`, '债务金额']}
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      padding: '12px'
                    }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorAmount)" />
                  <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 5, fill: '#ffffff', stroke: '#3b82f6', strokeWidth: 2 }} activeDot={{ r: 7, fill: '#3b82f6' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">暂无数据</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200/60 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            债务同比对比
          </h3>
          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: `${new Date().getFullYear() - 1}年`, amount: compareData.lastYearAmount },
                { name: `${new Date().getFullYear()}年`, amount: compareData.currentYearAmount },
              ]} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                <defs>
                  <linearGradient id="colorBar1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9}/>
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.4}/>
                  </linearGradient>
                  <linearGradient id="colorBar2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.9}/>
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.4}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={{ stroke: '#e5e7eb' }} tickLine={{ stroke: '#e5e7eb' }} />
                <YAxis tickFormatter={(value) => (value >= 10000 ? `${(value / 10000).toFixed(1)}万` : value)} tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={{ stroke: '#e5e7eb' }} tickLine={{ stroke: '#e5e7eb' }} />
                <Tooltip 
                  formatter={(value) => [`${formatCurrency(value)}`, '债务金额']}
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    padding: '12px'
                  }}
                />
                <Bar dataKey="amount" fill="url(#colorBar1)" radius={[6, 6, 0, 0]} barSize={50}>
                  <LabelList dataKey="amount" position="top" formatter={(value) => value >= 10000 ? `${(value / 10000).toFixed(1)}万` : value} style={{ fill: '#ef4444', fontWeight: 'bold', fontSize: 12 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center mt-4">
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">同比增长</div>
              <div className={`text-sm font-semibold ${compareData.yoy >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatPercentage(compareData.yoy)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200/60 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            {drilldown.level > 0 ? (
              <button onClick={() => setDrilldown(prev => ({ level: prev.level - 1, category: prev.level === 2 ? prev.category : null, type: null }))} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700">
                <ArrowLeft className="w-4 h-4" />
                返回
              </button>
            ) : (
              <PieChartIcon className="w-5 h-5 text-purple-600" />
            )}
            {drilldown.level === 2 ? `${drilldown.type} - 类别占比` : drilldown.level === 1 ? `${drilldown.category} - 类型分布` : '债务大类分布'}
          </h3>
          <div className="w-full h-[280px]">
            {drilldown.level === 0 && categoryDistribution.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {categoryDistribution.map((entry, index) => (
                      <linearGradient key={`grad-${index}`} id={`pieGrad-${index}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={COLORS[index % COLORS.length]} />
                        <stop offset="100%" stopColor={adjustColor(COLORS[index % COLORS.length], -20)} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={categoryDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={55}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: '#9ca3af', strokeWidth: 1.5 }}
                    onClick={(entry) => setDrilldown({ level: 1, category: entry.name, type: null })}
                    style={{ cursor: 'pointer' }}
                  >
                    {categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#pieGrad-${index})`} stroke="#ffffff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${formatCurrency(value)}`, '债务金额']}
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      padding: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : drilldown.level === 1 && typeDistribution.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {typeDistribution.map((entry, index) => (
                      <linearGradient key={`grad-${index}`} id={`pieGrad2-${index}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={COLORS[index % COLORS.length]} />
                        <stop offset="100%" stopColor={adjustColor(COLORS[index % COLORS.length], -20)} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={typeDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={55}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: '#9ca3af', strokeWidth: 1.5 }}
                    onClick={(entry) => setDrilldown(prev => ({ ...prev, level: 2, type: entry.name }))}
                    style={{ cursor: 'pointer' }}
                  >
                    {typeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#pieGrad2-${index})`} stroke="#ffffff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${formatCurrency(value)}`, '债务金额']}
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      padding: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : drilldown.level === 2 && subCategoryDistribution.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {subCategoryDistribution.map((entry, index) => (
                      <linearGradient key={`grad-${index}`} id={`pieGrad3-${index}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={COLORS[index % COLORS.length]} />
                        <stop offset="100%" stopColor={adjustColor(COLORS[index % COLORS.length], -20)} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={subCategoryDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={55}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: '#9ca3af', strokeWidth: 1.5 }}
                  >
                    {subCategoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#pieGrad3-${index})`} stroke="#ffffff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${formatCurrency(value)}`, '债务金额']}
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      padding: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">暂无数据</div>
            )}
          </div>
          {drilldown.level < 2 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
              {drilldown.level === 0 ? '点击饼图区域查看类型分布' : '点击饼图区域查看类别占比'}
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200/60 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-600" />
            本月待还账单
          </h3>
          {currentMonthRepayments.length > 0 ? (
            <div className="space-y-3">
              {currentMonthRepayments.map((item, index) => (
                <div key={`${item.id}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{item.creditor}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {item.type} · {item.date}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(item.amount)}
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="font-medium text-orange-900 dark:text-orange-100">本月待还总额</div>
                <div className="text-lg font-bold text-orange-600">{formatCurrency(totalDueThisMonth)}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-500 dark:text-gray-400 text-sm">暂无本月待还账单</div>
          )}
        </div>
      </div>
    </div>
  );
}

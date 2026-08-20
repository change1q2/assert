import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Wallet, DollarSign, TrendingUp, Percent, PiggyBank, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchState, saveState, invalidateStateCache } from '../api/index.js';
import { convertAmount, DEFAULT_EXCHANGE_RATES } from '../utils/currency.js';

const CURRENCY_OPTIONS = ['CNY', 'USD', 'HKD', 'JPY', 'EUR'];

const CURRENCY_SYMBOLS = {
  CNY: '¥',
  USD: '$',
  HKD: 'HK$',
  JPY: '¥',
  EUR: '€',
};

const SURVIVAL_FUND_TYPES = ['应急储备', '日常开支', '长期储备', '投资本金'];

const FREEDOM_CATEGORIES = [
  '必要消费-住房',
  '必要消费-基础生活',
  '非必要消费-旅行',
  '非必要消费-娱乐',
  '自定义',
];

const PERIOD_OPTIONS = [
  { value: 'daily', label: '日' },
  { value: 'weekly', label: '周' },
  { value: 'monthly', label: '月' },
  { value: 'yearly', label: '年' },
];

function convertCurrency(amount, from, to, rates) {
  if (!from || !to) return amount || 0;
  if (from === to) return amount || 0;
  const ratesObj = rates && Object.keys(rates).length > 0 ? rates : DEFAULT_EXCHANGE_RATES;
  return convertAmount(parseFloat(amount) || 0, from, to, ratesObj);
}

function formatCurrency(value, currency = 'CNY') {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const symbol = CURRENCY_SYMBOLS[currency] || '¥';
  const formatted = new Intl.NumberFormat('zh-CN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(parseFloat(value) || 0);
  return `${symbol}${formatted}`;
}

function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseFloat(value) || 0);
}

function formatPercentage(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const n = parseFloat(value);
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
}

const DEFAULT_RATES = { ...DEFAULT_EXCHANGE_RATES };

export default function SurvivalFunds() {
  const [loading, setLoading] = useState(true);
  const [stateData, setStateData] = useState(null);
  const [survivalFunds, setSurvivalFunds] = useState([]);
  const [freedomBudgets, setFreedomBudgets] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [exchangeRates, setExchangeRates] = useState(DEFAULT_RATES);

  // 生存资金 - 合计显示币种
  const [survivalFundTotalCurrency, setSurvivalFundTotalCurrency] = useState('CNY');

  // 弹窗：生存资金
  const [showFundModal, setShowFundModal] = useState(false);
  const [editingFund, setEditingFund] = useState(null);
  const [fundForm, setFundForm] = useState({
    name: '',
    type: '应急储备',
    currency: 'CNY',
    amount: '',
    costBasis: '',
    accountId: '',
  });

  // 弹窗：自由现金流
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [budgetForm, setBudgetForm] = useState({
    name: '',
    category: '必要消费-住房',
    periodType: 'monthly',
    budgetAmount: '',
    actualAmount: '',
  });

  const userId = localStorage.getItem('wealth_os_user_id');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchState(userId);
      setStateData(data);
      setSurvivalFunds(data?.survivalFunds || []);
      setFreedomBudgets(data?.freedomBudgets || []);
      setAccounts(data?.accounts || []);
      const rates = data?.exchangeRates && Object.keys(data.exchangeRates).length > 0
        ? data.exchangeRates
        : DEFAULT_RATES;
      setExchangeRates(rates);
    } catch (e) {
      console.error('加载生存资金数据失败:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toCNY = (value, fromCurrency) =>
    convertCurrency(value, fromCurrency, 'CNY', exchangeRates);

  // ========== 第一行：总览卡片 ==========
  const summaryData = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    survivalFunds.forEach(fund => {
      const cur = fund.currency || 'CNY';
      totalValue += toCNY(fund.amount, cur);
      const costBasis = fund.costBasis != null && fund.costBasis !== ''
        ? fund.costBasis
        : fund.amount;
      totalCost += toCNY(costBasis, cur);
    });
    const totalProfit = totalValue - totalCost;
    const totalProfitRate = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    return { totalValue, totalCost, totalProfit, totalProfitRate };
  }, [survivalFunds, exchangeRates]);

  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white shadow-lg shadow-blue-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">总价值</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(summaryData.totalValue)}</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white shadow-lg shadow-orange-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-100 text-sm">总成本</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(summaryData.totalCost)}</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-5 text-white shadow-lg shadow-purple-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-sm">总收益</p>
            <p className={`text-2xl font-bold mt-1 ${summaryData.totalProfit >= 0 ? '' : 'text-red-200'}`}>
              {formatCurrency(summaryData.totalProfit)}
            </p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-5 text-white shadow-lg shadow-emerald-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-sm">总收益率</p>
            <p className={`text-2xl font-bold mt-1 ${summaryData.totalProfitRate >= 0 ? '' : 'text-red-200'}`}>
              {formatPercentage(summaryData.totalProfitRate)}
            </p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <Percent className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );

  // ========== 第二行：自由度卡片 + 自由现金流列表 ==========
  const freedomSummary = useMemo(() => {
    const periods = ['daily', 'weekly', 'monthly', 'yearly'];
    const result = {};
    periods.forEach(p => {
      const items = freedomBudgets.filter(b => b.periodType === p);
      const budgetAmount = items.reduce((s, b) => s + (parseFloat(b.budgetAmount) || 0), 0);
      const actualAmount = items.reduce((s, b) => s + (parseFloat(b.actualAmount) || 0), 0);
      const degree = budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0;
      result[p] = { budgetAmount, actualAmount, degree };
    });
    return result;
  }, [freedomBudgets]);

  const getFreedomColor = (degree) => {
    if (degree >= 100) return 'text-emerald-600 dark:text-emerald-400';
    if (degree < 80) return 'text-red-600 dark:text-red-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  const periodLabelMap = { daily: '日自由', weekly: '周自由', monthly: '月自由', yearly: '年自由' };

  const renderFreedomSection = () => {
    const budgetTotals = freedomBudgets.reduce((acc, b) => {
      acc.budget += parseFloat(b.budgetAmount) || 0;
      acc.actual += parseFloat(b.actualAmount) || 0;
      return acc;
    }, { budget: 0, actual: 0 });

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-emerald-500" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">自由度与自由现金流</h2>
          </div>
        </div>

        {/* 4 张自由度卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {Object.entries(periodLabelMap).map(([periodKey, label]) => {
            const info = freedomSummary[periodKey] || { budgetAmount: 0, actualAmount: 0, degree: 0 };
            return (
              <div key={periodKey} className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-700/50 rounded-xl p-4 border border-gray-100 dark:border-slate-600">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/60 dark:bg-slate-600/60 ${getFreedomColor(info.degree)}`}>
                    {info.degree.toFixed(1)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-400 mb-0.5">预算</p>
                    <p className="font-bold text-gray-900 dark:text-white tabular-nums">{formatNumber(info.budgetAmount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-0.5">实际</p>
                    <p className="font-bold text-gray-900 dark:text-white tabular-nums">{formatNumber(info.actualAmount)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 自由现金流列表表格 */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">自由现金流明细</h3>
          <button
            onClick={handleAddBudget}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>新增</span>
          </button>
        </div>
        <div className="overflow-x-auto border border-gray-100 dark:border-slate-700 rounded-xl">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">自由名称</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">分类</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">周期</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">预算金额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">实际金额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {freedomBudgets.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{b.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{b.category || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {PERIOD_OPTIONS.find(p => p.value === b.periodType)?.label || b.periodType || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white tabular-nums">{formatNumber(b.budgetAmount)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white tabular-nums">{formatNumber(b.actualAmount)}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEditBudget(b)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="编辑">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteBudget(b)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="删除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {freedomBudgets.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无自由现金流数据</td>
                </tr>
              )}
              {freedomBudgets.length > 0 && (
                <tr className="bg-indigo-50 dark:bg-indigo-900/20 font-semibold">
                  <td className="px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300" colSpan={3}>合计</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white tabular-nums">{formatNumber(budgetTotals.budget)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white tabular-nums">{formatNumber(budgetTotals.actual)}</td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ========== 第三行：账户本网格 ==========
  const renderAccountsSection = () => {
    // 收集生存资金用到的唯一 accountId
    const usedAccountIds = new Set();
    survivalFunds.forEach(f => {
      if (f.accountId) usedAccountIds.add(f.accountId);
    });

    const filteredAccounts = accounts.filter(a => {
      if (usedAccountIds.size === 0) return true;
      const key = a.id || a.name;
      return usedAccountIds.has(a.id) || usedAccountIds.has(key) || usedAccountIds.has(a.name);
    });

    const accountCount = filteredAccounts.length;
    let totalBalance = 0;

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">📒 账户本</h2>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
              共 {accountCount} 个账户
            </span>
          </div>
        </div>

        {filteredAccounts.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无关联账户，请先创建生存资金并选择账户本</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {filteredAccounts.map(account => {
                let accountAmount = 0;
                let accountCost = 0;
                survivalFunds.forEach(fund => {
                  const fundKey = fund.accountId || fund.accountName;
                  const accKey = account.id || account.name;
                  if (
                    fund.accountId === account.id ||
                    fund.accountId === accKey ||
                    fund.accountName === account.name ||
                    fundKey === accKey
                  ) {
                    const cur = fund.currency || 'CNY';
                    accountAmount += toCNY(fund.amount, cur);
                    const cb = fund.costBasis != null && fund.costBasis !== '' ? fund.costBasis : fund.amount;
                    accountCost += toCNY(cb, cur);
                  }
                });
                totalBalance += accountAmount;
                const profit = accountAmount - accountCost;
                const profitRate = accountCost > 0 ? (profit / accountCost) * 100 : 0;

                return (
                  <div key={account.id || account.name} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full p-1.5">
                          <Wallet className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">{account.name}</span>
                      </div>
                      <span className="text-xs text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                        {account.category || '未分类'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div>
                        <p className="text-gray-400 mb-0.5">当前余额</p>
                        <p className="font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(accountAmount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-0.5">收益率</p>
                        <p className={`font-bold tabular-nums ${profitRate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                          {formatPercentage(profitRate)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
              <span>账户数：<span className="font-semibold text-gray-700 dark:text-gray-200">{accountCount}</span></span>
              <span>合计余额：<span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(totalBalance)}</span></span>
            </div>
          </>
        )}
      </div>
    );
  };

  // ========== 第四行：生存资金列表 ==========
  const renderSurvivalFundTable = () => {
    const survivalTotals = survivalFunds.reduce((acc, fund) => {
      const cur = fund.currency || 'CNY';
      acc.amount += convertCurrency(fund.amount, cur, survivalFundTotalCurrency, exchangeRates);
      return acc;
    }, { amount: 0 });

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">生存资金</h3>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              合计: <span className="font-semibold text-blue-600">{formatCurrency(survivalTotals.amount, survivalFundTotalCurrency)}</span>
            </span>
            <button
              onClick={handleAddFund}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>新增</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">名称</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">类型</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">币种</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">金额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">账户本</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {survivalFunds.map(fund => (
                <tr key={fund.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{fund.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{fund.type || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{fund.currency || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white tabular-nums">
                    {fund.amount != null ? formatCurrency(fund.amount, fund.currency) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {fund.accountName || accounts.find(a => (a.id || a.name) === fund.accountId)?.name || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEditFund(fund)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="编辑">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteFund(fund)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="删除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {survivalFunds.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无生存资金数据</td>
                </tr>
              )}
              {survivalFunds.length > 0 && (
                <tr className="bg-indigo-50 dark:bg-indigo-900/20 font-semibold">
                  <td className="px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300" colSpan={2}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>合计</span>
                      <select
                        value={survivalFundTotalCurrency}
                        onChange={(e) => setSurvivalFundTotalCurrency(e.target.value)}
                        className="text-xs border border-indigo-200 dark:border-indigo-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      >
                        {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <span className="text-xs text-gray-400 font-normal">（按汇率折算）</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300">{survivalFundTotalCurrency}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white tabular-nums">{formatCurrency(survivalTotals.amount, survivalFundTotalCurrency)}</td>
                  <td></td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ========== 操作函数：生存资金 ==========
  const handleAddFund = () => {
    setEditingFund(null);
    const defaultAccountId = accounts.length > 0 ? (accounts[0].id || accounts[0].name) : '';
    setFundForm({
      name: '',
      type: '应急储备',
      currency: 'CNY',
      amount: '',
      costBasis: '',
      accountId: defaultAccountId,
    });
    setShowFundModal(true);
  };

  const handleEditFund = (fund) => {
    setEditingFund(fund);
    setFundForm({
      name: fund.name || '',
      type: fund.type || '应急储备',
      currency: fund.currency || 'CNY',
      amount: fund.amount || '',
      costBasis: fund.costBasis != null ? fund.costBasis : '',
      accountId: fund.accountId || '',
    });
    setShowFundModal(true);
  };

  const handleDeleteFund = async (fund) => {
    if (!confirm('确定删除该生存资金吗？')) return;
    const newArr = survivalFunds.filter(f => f.id !== fund.id);
    const newState = { ...stateData, survivalFunds: newArr };
    const result = await saveState(newState);
    setStateData(newState);
    setSurvivalFunds(newArr);
    invalidateStateCache();
    if (result?.cached === false) {
      await loadData();
    }
  };

  const handleSaveFund = async () => {
    if (!fundForm.name || !fundForm.name.trim()) {
      alert('请输入名称');
      return;
    }
    if (fundForm.amount === '' || fundForm.amount == null) {
      alert('请输入金额');
      return;
    }
    if (!fundForm.accountId) {
      alert('请选择账户本');
      return;
    }
    const account = accounts.find(a => (a.id || a.name) === fundForm.accountId);
    const costBasis = fundForm.costBasis != null && fundForm.costBasis !== ''
      ? parseFloat(fundForm.costBasis)
      : parseFloat(fundForm.amount);

    let newArr;
    if (editingFund) {
      newArr = survivalFunds.map(f => f.id === editingFund.id
        ? {
            ...f,
            name: fundForm.name.trim(),
            type: fundForm.type,
            currency: fundForm.currency,
            amount: parseFloat(fundForm.amount),
            costBasis,
            accountId: fundForm.accountId,
            accountName: account?.name || '',
          }
        : f
      );
    } else {
      newArr = [
        ...survivalFunds,
        {
          id: `sf_${Date.now()}`,
          name: fundForm.name.trim(),
          type: fundForm.type,
          currency: fundForm.currency,
          amount: parseFloat(fundForm.amount),
          costBasis,
          accountId: fundForm.accountId,
          accountName: account?.name || '',
        },
      ];
    }
    const newState = { ...stateData, survivalFunds: newArr };
    const result = await saveState(newState);
    setStateData(newState);
    setSurvivalFunds(newArr);
    invalidateStateCache();
    setShowFundModal(false);
    setEditingFund(null);
    if (result?.cached === false) {
      await loadData();
    }
  };

  // ========== 操作函数：自由现金流 ==========
  const handleAddBudget = () => {
    setEditingBudget(null);
    setBudgetForm({
      name: '',
      category: '必要消费-住房',
      periodType: 'monthly',
      budgetAmount: '',
      actualAmount: '',
    });
    setShowBudgetModal(true);
  };

  const handleEditBudget = (budget) => {
    setEditingBudget(budget);
    setBudgetForm({
      name: budget.name || '',
      category: budget.category || '必要消费-住房',
      periodType: budget.periodType || 'monthly',
      budgetAmount: budget.budgetAmount != null ? budget.budgetAmount : '',
      actualAmount: budget.actualAmount != null ? budget.actualAmount : '',
    });
    setShowBudgetModal(true);
  };

  const handleDeleteBudget = async (budget) => {
    if (!confirm('确定删除该自由现金流吗？')) return;
    const newArr = freedomBudgets.filter(b => b.id !== budget.id);
    const newState = { ...stateData, freedomBudgets: newArr };
    const result = await saveState(newState);
    setStateData(newState);
    setFreedomBudgets(newArr);
    invalidateStateCache();
    if (result?.cached === false) {
      await loadData();
    }
  };

  const handleSaveBudget = async () => {
    if (!budgetForm.name || !budgetForm.name.trim()) {
      alert('请输入自由名称');
      return;
    }
    if (budgetForm.budgetAmount === '' || budgetForm.budgetAmount == null) {
      alert('请输入预算金额');
      return;
    }
    let newArr;
    if (editingBudget) {
      newArr = freedomBudgets.map(b => b.id === editingBudget.id
        ? {
            ...b,
            name: budgetForm.name.trim(),
            category: budgetForm.category,
            periodType: budgetForm.periodType,
            budgetAmount: parseFloat(budgetForm.budgetAmount),
            actualAmount: budgetForm.actualAmount != null && budgetForm.actualAmount !== ''
              ? parseFloat(budgetForm.actualAmount)
              : 0,
          }
        : b
      );
    } else {
      newArr = [
        ...freedomBudgets,
        {
          id: `fb_${Date.now()}`,
          name: budgetForm.name.trim(),
          category: budgetForm.category,
          periodType: budgetForm.periodType,
          budgetAmount: parseFloat(budgetForm.budgetAmount),
          actualAmount: budgetForm.actualAmount != null && budgetForm.actualAmount !== ''
            ? parseFloat(budgetForm.actualAmount)
            : 0,
        },
      ];
    }
    const newState = { ...stateData, freedomBudgets: newArr };
    const result = await saveState(newState);
    setStateData(newState);
    setFreedomBudgets(newArr);
    invalidateStateCache();
    setShowBudgetModal(false);
    setEditingBudget(null);
    if (result?.cached === false) {
      await loadData();
    }
  };

  // ========== 弹窗：生存资金 ==========
  const renderFundModal = () => {
    if (!showFundModal) return null;
    const hasAccounts = accounts.length > 0;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{editingFund ? '编辑' : '新增'}生存资金</h2>
            <button onClick={() => setShowFundModal(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fundForm.name}
                onChange={(e) => setFundForm({ ...fundForm, name: e.target.value })}
                placeholder="请输入名称，如：6个月应急储备金"
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">类型</label>
              <select
                value={fundForm.type}
                onChange={(e) => setFundForm({ ...fundForm, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SURVIVAL_FUND_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">币种</label>
                <select
                  value={fundForm.currency}
                  onChange={(e) => setFundForm({ ...fundForm, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  金额 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={fundForm.amount}
                  onChange={(e) => setFundForm({ ...fundForm, amount: e.target.value })}
                  placeholder="请输入金额"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                成本单价 <span className="text-xs text-gray-400">(默认 = 金额)</span>
              </label>
              <input
                type="number"
                value={fundForm.costBasis}
                onChange={(e) => setFundForm({ ...fundForm, costBasis: e.target.value })}
                placeholder="留空则等于金额"
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                账户本 <span className="text-red-500">*</span>
              </label>
              {hasAccounts ? (
                <select
                  value={fundForm.accountId || ''}
                  onChange={(e) => {
                    const accountId = e.target.value;
                    setFundForm({ ...fundForm, accountId });
                  }}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择账户本</option>
                  {accounts
                    .filter(acc => acc.type !== '理财资产' && acc.type !== '打新' && acc.type !== '负债' && !acc.liability)
                    .map(account => (
                      <option key={account.id || account.name} value={account.id || account.name}>
                        {account.name}
                      </option>
                    ))}
                </select>
              ) : (
                <p className="text-sm text-orange-500">暂无可用账户，请先在「账户管理」中创建账户</p>
              )}
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
            <button
              onClick={() => setShowFundModal(false)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSaveFund}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ========== 弹窗：自由现金流 ==========
  const renderBudgetModal = () => {
    if (!showBudgetModal) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{editingBudget ? '编辑' : '新增'}自由现金流</h2>
            <button onClick={() => setShowBudgetModal(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                自由名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={budgetForm.name}
                onChange={(e) => setBudgetForm({ ...budgetForm, name: e.target.value })}
                placeholder="如：房租、餐饮"
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">分类</label>
              <select
                value={budgetForm.category}
                onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {FREEDOM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">周期</label>
              <select
                value={budgetForm.periodType}
                onChange={(e) => setBudgetForm({ ...budgetForm, periodType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PERIOD_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  预算金额 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={budgetForm.budgetAmount}
                  onChange={(e) => setBudgetForm({ ...budgetForm, budgetAmount: e.target.value })}
                  placeholder="请输入预算金额"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">实际金额</label>
                <input
                  type="number"
                  value={budgetForm.actualAmount}
                  onChange={(e) => setBudgetForm({ ...budgetForm, actualAmount: e.target.value })}
                  placeholder="请输入实际金额"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
            <button
              onClick={() => setShowBudgetModal(false)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSaveBudget}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
          <PiggyBank className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">生存资金管理</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">管理你的应急储备、日常开支与长期储备资金</p>
        </div>
      </div>

      {renderSummaryCards()}
      {renderFreedomSection()}
      {renderAccountsSection()}
      {renderSurvivalFundTable()}

      {renderFundModal()}
      {renderBudgetModal()}
    </div>
  );
}

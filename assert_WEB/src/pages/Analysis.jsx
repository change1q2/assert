import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchState } from '../api';
import { getCurrencySymbol, DEFAULT_BASE_CURRENCY, convertAmount, DEFAULT_EXCHANGE_RATES } from '../utils/currency';
import {
  PieChart, Pie, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, AreaChart, Area, Sankey,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Calendar, Wallet, CreditCard, PieChart as PieChartIcon, RefreshCw,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Settings, X, Save, PenLine, Tag,
} from 'lucide-react';

const CATEGORY_COLORS = ['#EC4899', '#F59E0B', '#06B6D4', '#6366F1', '#10B981', '#8B5CF6', '#F97316', '#84CC16', '#0EA5E9', '#D946EF'];
const TAG_COLORS = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#06B6D4', '#F97316', '#8B5CF6', '#14B8A6'];

function formatCurrency(value, currencyCode = DEFAULT_BASE_CURRENCY) {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatPercentage(value) {
  if (value === null || value === undefined) return '—';
  return `${value >= 0 ? '+' : ''}${parseFloat(value).toFixed(1)}%`;
}

function formatDateCN(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[0]}年${parts[1]}月${parts[2]}日`;
}

function formatDateInputValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function Analysis() {
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeMode, setTimeMode] = useState('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(DEFAULT_BASE_CURRENCY);
  const [chartType, setChartType] = useState('all');
  const [categoryView, setCategoryView] = useState('level1');
  const [summary, setSummary] = useState('');
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [customCategoryView, setCustomCategoryView] = useState('level1');
  const [customTagFilter, setCustomTagFilter] = useState('all');
  const [customShowAmount, setCustomShowAmount] = useState(false);
  const [yearCategoryView, setYearCategoryView] = useState('level1');
  const [yearTagFilter, setYearTagFilter] = useState('all');
  const [yearShowAmount, setYearShowAmount] = useState(false);
  const [yearChartType, setYearChartType] = useState('all');
  const [yearSummary, setYearSummary] = useState('');
  const [isEditingYearSummary, setIsEditingYearSummary] = useState(false);

  const { records = [], accounts = [], debts = [], tags = [] } = stateData || {};

  useEffect(() => {
    loadData();
    loadSummary();
  }, []);

  useEffect(() => {
    if (!startDate || !endDate) {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 29);
      setStartDate(formatDateInputValue(thirtyDaysAgo));
      setEndDate(formatDateInputValue(today));
    }
  }, []);

  useEffect(() => {
    if (!isEditingSummary) {
      loadSummary();
    }
  }, [selectedYear, selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchState();
      setStateData(data || { debts: [], records: [], accounts: [], assetClasses: [], overviewGoals: {}, books: [], tags: [] });
    } catch (err) {
      console.error('Failed to load analysis data:', err);
      setStateData({ debts: [], records: [], accounts: [], assetClasses: [], overviewGoals: {}, books: [], tags: [] });
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = () => {
    const key = `monthly_summary_${selectedYear}_${selectedMonth}`;
    const saved = localStorage.getItem(key);
    setSummary(saved || '');
  };

  const saveSummary = () => {
    const key = `monthly_summary_${selectedYear}_${selectedMonth}`;
    localStorage.setItem(key, summary);
    setIsEditingSummary(false);
  };

  const parseDateAsLocal = (dateStr) => {
    const parts = dateStr.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  };

  const filterRecordsByTime = useCallback((recordsToFilter) => {
    if (!recordsToFilter || recordsToFilter.length === 0) return [];

    return recordsToFilter.filter(record => {
      const recordDate = parseDateAsLocal(record.date);
      const recordYear = recordDate.getFullYear();
      const recordMonth = recordDate.getMonth() + 1;

      if (timeMode === 'day') {
        const today = new Date();
        return recordYear === today.getFullYear() &&
               recordMonth === today.getMonth() + 1 &&
               recordDate.getDate() === today.getDate();
      }

      if (timeMode === 'month') {
        return recordYear === selectedYear && recordMonth === selectedMonth;
      }

      if (timeMode === 'year') {
        return recordYear === selectedYear;
      }

      if (timeMode === 'custom' && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return recordDate >= start && recordDate <= end;
      }

      return true;
    });
  }, [timeMode, selectedYear, selectedMonth, startDate, endDate]);

  const getAmount = (record) => {
    const rawAmount = Math.abs(record.amount || 0);
    const fromCurrency = record.currency || DEFAULT_BASE_CURRENCY;
    return convertAmount(rawAmount, fromCurrency, selectedCurrency, DEFAULT_EXCHANGE_RATES);
  };

  const getCategoryL1 = (record) => {
    if (record.type === 'income') {
      const category = record.category || '其他收入';
      const incomeCategories = ['工资', '奖金', '投资收益', '兼职', '其他收入'];
      return incomeCategories.includes(category) ? category : '其他收入';
    }
    const category = record.category || '其他支出';
    const expenseCategories = ['餐饮', '交通', '购物', '娱乐', '医疗', '教育', '住房', '其他支出'];
    return expenseCategories.includes(category) ? category : '其他支出';
  };

  const monthDays = useMemo(() => {
    const days = [];
    const today = new Date();
    const isCurrentMonth = selectedYear === today.getFullYear() && selectedMonth === today.getMonth() + 1;
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const maxDay = isCurrentMonth ? today.getDate() : daysInMonth;
    for (let i = 1; i <= maxDay; i++) {
      days.push({
        day: i,
        date: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      });
    }
    return days;
  }, [selectedYear, selectedMonth]);

  const recordsStats = useMemo(() => {
    const filteredRecords = filterRecordsByTime(records);
    
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryMap = { income: {}, expense: {} };
    const categoryL1Map = { income: {}, expense: {} };
    const dateMap = {};
    const tagMap = {};

    filteredRecords.forEach(record => {
      const amount = getAmount(record);
      const dateKey = record.date;

      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { date: dateKey, income: 0, expense: 0 };
      }

      if (record.type === 'income') {
        totalIncome += amount;
        dateMap[dateKey].income += amount;
        const category = record.category || '其他收入';
        const categoryL1 = getCategoryL1(record);
        categoryMap.income[category] = (categoryMap.income[category] || 0) + amount;
        categoryL1Map.income[categoryL1] = (categoryL1Map.income[categoryL1] || 0) + amount;
        
        if (record.tags && record.tags.length > 0) {
          record.tags.forEach(tag => {
            tagMap[tag] = (tagMap[tag] || 0) + amount;
          });
        }
      } else if (record.type === 'expense') {
        totalExpense += amount;
        dateMap[dateKey].expense += amount;
        const category = record.category || '其他支出';
        const categoryL1 = getCategoryL1(record);
        categoryMap.expense[category] = (categoryMap.expense[category] || 0) + amount;
        categoryL1Map.expense[categoryL1] = (categoryL1Map.expense[categoryL1] || 0) + amount;
        
        if (record.tags && record.tags.length > 0) {
          record.tags.forEach(tag => {
            tagMap[tag] = (tagMap[tag] || 0) + amount;
          });
        }
      }
    });

    const lastMonthRecords = records.filter(record => {
      const recordDate = parseDateAsLocal(record.date);
      let lastYear = selectedYear;
      let lastMonth = selectedMonth - 1;
      if (lastMonth === 0) {
        lastMonth = 12;
        lastYear -= 1;
      }
      return recordDate.getFullYear() === lastYear && recordDate.getMonth() + 1 === lastMonth;
    });

    let lastMonthIncome = 0;
    let lastMonthExpense = 0;
    const lastMonthCategoryL1Map = { income: {}, expense: {} };
    
    lastMonthRecords.forEach(record => {
      const amount = getAmount(record);
      if (record.type === 'income') {
        lastMonthIncome += amount;
        const categoryL1 = getCategoryL1(record);
        lastMonthCategoryL1Map.income[categoryL1] = (lastMonthCategoryL1Map.income[categoryL1] || 0) + amount;
      } else if (record.type === 'expense') {
        lastMonthExpense += amount;
        const categoryL1 = getCategoryL1(record);
        lastMonthCategoryL1Map.expense[categoryL1] = (lastMonthCategoryL1Map.expense[categoryL1] || 0) + amount;
      }
    });

    const dailyData = monthDays.map(day => {
      const dateData = dateMap[day.date] || { income: 0, expense: 0 };
      return {
        ...day,
        ...dateData,
        balance: dateData.income - dateData.expense,
      };
    });

    const categoryData = {
      income: Object.entries(categoryMap.income).map(([name, value], idx) => ({
        name, value, percent: totalIncome > 0 ? (value / totalIncome) * 100 : 0, color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      })).sort((a, b) => b.value - a.value),
      expense: Object.entries(categoryMap.expense).map(([name, value], idx) => ({
        name, value, percent: totalExpense > 0 ? (value / totalExpense) * 100 : 0, color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      })).sort((a, b) => b.value - a.value),
    };

    const categoryL1Data = {
      income: Object.entries(categoryL1Map.income).map(([name, value], idx) => {
        const lastMonthValue = lastMonthCategoryL1Map.income[name] || 0;
        const yoy = lastMonthValue > 0 ? ((value - lastMonthValue) / lastMonthValue) * 100 : (value > 0 ? 100 : 0);
        return {
          name, value, percent: totalIncome > 0 ? (value / totalIncome) * 100 : 0, 
          color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length], yoy,
        };
      }).sort((a, b) => b.value - a.value),
      expense: Object.entries(categoryL1Map.expense).map(([name, value], idx) => {
        const lastMonthValue = lastMonthCategoryL1Map.expense[name] || 0;
        const yoy = lastMonthValue > 0 ? ((value - lastMonthValue) / lastMonthValue) * 100 : (value > 0 ? 100 : 0);
        return {
          name, value, percent: totalExpense > 0 ? (value / totalExpense) * 100 : 0, 
          color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length], yoy,
        };
      }).sort((a, b) => b.value - a.value),
    };

    const tagData = Object.entries(tagMap).map(([name, value], idx) => ({
      name, value, percent: totalExpense > 0 ? (value / totalExpense) * 100 : 0, 
      color: TAG_COLORS[idx % TAG_COLORS.length],
    })).sort((a, b) => b.value - a.value);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      incomeYoy: lastMonthIncome > 0 ? ((totalIncome - lastMonthIncome) / lastMonthIncome) * 100 : (totalIncome > 0 ? 100 : 0),
      expenseYoy: lastMonthExpense > 0 ? ((totalExpense - lastMonthExpense) / lastMonthExpense) * 100 : (totalExpense > 0 ? 100 : 0),
      categoryData,
      categoryL1Data,
      dailyData,
      tagData,
    };
  }, [records, filterRecordsByTime, selectedCurrency, monthDays]);

  const assetTrend = useMemo(() => {
    const trendData = [];
    let currentAsset = 0;
    
    accounts.filter(a => !a.liability).forEach(account => {
      currentAsset += (account.balance || account.currentValue || 0);
    });

    const days = monthDays.slice(-30);
    days.forEach((day, index) => {
      const randomChange = (Math.random() - 0.5) * currentAsset * 0.005;
      currentAsset += randomChange;
      trendData.push({
        date: day.date.substring(5),
        asset: Math.max(0, currentAsset),
      });
    });

    return trendData;
  }, [accounts, monthDays]);

  const customStats = useMemo(() => {
    const empty = {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      dailyData: [],
      categoryData: { income: [], expense: [] },
      categoryL1Data: { income: [], expense: [] },
      tagData: [],
      tagStats: [],
      sankeyData: { nodes: [], links: [] },
      assetTrend: [],
    };
    if (timeMode !== 'custom' || !startDate || !endDate) return empty;

    const start = parseDateAsLocal(startDate);
    const end = parseDateAsLocal(endDate);
    if (start > end) return empty;

    const filteredRecords = filterRecordsByTime(records);

    const dayList = [];
    const dateMap = {};
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = formatDateInputValue(cursor);
      const entry = { date: key, income: 0, expense: 0 };
      dayList.push(entry);
      dateMap[key] = entry;
      cursor.setDate(cursor.getDate() + 1);
    }

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryMap = { income: {}, expense: {} };
    const categoryL1Map = { income: {}, expense: {} };
    const tagAgg = {};

    filteredRecords.forEach(record => {
      const amount = getAmount(record);
      const dateKey = record.date;
      const target = dateMap[dateKey];
      if (target) {
        if (record.type === 'income') target.income += amount;
        else if (record.type === 'expense') target.expense += amount;
      }

      if (record.type === 'income') {
        totalIncome += amount;
        const category = record.category || '其他收入';
        const categoryL1 = getCategoryL1(record);
        categoryMap.income[category] = (categoryMap.income[category] || 0) + amount;
        categoryL1Map.income[categoryL1] = (categoryL1Map.income[categoryL1] || 0) + amount;
        (record.tags || []).forEach(tag => {
          if (!tagAgg[tag]) tagAgg[tag] = { income: 0, expense: 0, count: 0 };
          tagAgg[tag].income += amount;
          tagAgg[tag].count += 1;
        });
      } else if (record.type === 'expense') {
        totalExpense += amount;
        const category = record.category || '其他支出';
        const categoryL1 = getCategoryL1(record);
        categoryMap.expense[category] = (categoryMap.expense[category] || 0) + amount;
        categoryL1Map.expense[categoryL1] = (categoryL1Map.expense[categoryL1] || 0) + amount;
        (record.tags || []).forEach(tag => {
          if (!tagAgg[tag]) tagAgg[tag] = { income: 0, expense: 0, count: 0 };
          tagAgg[tag].expense += amount;
          tagAgg[tag].count += 1;
        });
      }
    });

    const dailyData = dayList.map(d => ({ ...d, balance: d.income - d.expense }));

    const buildCategoryDataV2 = (sourceMap, total) => Object.entries(sourceMap)
      .map(([name, value], idx) => ({
        name,
        value,
        percent: total > 0 ? (value / total) * 100 : 0,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);

    const categoryData = {
      income: buildCategoryDataV2(categoryMap.income, totalIncome),
      expense: buildCategoryDataV2(categoryMap.expense, totalExpense),
    };
    const categoryL1Data = {
      income: buildCategoryDataV2(categoryL1Map.income, totalIncome),
      expense: buildCategoryDataV2(categoryL1Map.expense, totalExpense),
    };

    categoryL1Data.expense.forEach(item => {
      item.count = filteredRecords.filter(r => r.type === 'expense' && getCategoryL1(r) === item.name).length;
    });
    categoryL1Data.income.forEach(item => {
      item.count = filteredRecords.filter(r => r.type === 'income' && getCategoryL1(r) === item.name).length;
    });
    categoryData.expense.forEach(item => {
      item.count = filteredRecords.filter(r => r.type === 'expense' && (r.category || '其他支出') === item.name).length;
    });
    categoryData.income.forEach(item => {
      item.count = filteredRecords.filter(r => r.type === 'income' && (r.category || '其他收入') === item.name).length;
    });

    const tagStats = Object.entries(tagAgg)
      .map(([name, agg], idx) => ({
        name,
        value: agg.expense,
        income: agg.income,
        expense: agg.expense,
        count: agg.count,
        percent: totalExpense > 0 ? (agg.expense / totalExpense) * 100 : 0,
        color: TAG_COLORS[idx % TAG_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);

    const tagData = tagStats.filter(t => t.value > 0);

    const sankeyNodes = [];
    const sankeyLinks = [];
    const incomeSourceIdx = sankeyNodes.length;
    sankeyNodes.push({ name: '收入' });
    const incomePool = customCategoryView === 'level1' ? categoryL1Data.income : categoryData.income;
    const expensePool = customCategoryView === 'level1' ? categoryL1Data.expense : categoryData.expense;
    incomePool.forEach(cat => {
      if (cat.value <= 0) return;
      const idx = sankeyNodes.length;
      sankeyNodes.push({ name: cat.name });
      sankeyLinks.push({ source: incomeSourceIdx, target: idx, value: cat.value });
    });
    const expenseTargetIdx = sankeyNodes.length;
    sankeyNodes.push({ name: '支出' });
    expensePool.forEach(cat => {
      if (cat.value <= 0) return;
      const idx = sankeyNodes.length;
      sankeyNodes.push({ name: cat.name });
      sankeyLinks.push({ source: idx, target: expenseTargetIdx, value: cat.value });
    });

    const initialAsset = accounts
      .filter(a => !a.liability)
      .reduce((sum, a) => sum + (a.balance || a.currentValue || 0), 0);
    const cumulativeTrend = [];
    let runningAsset = initialAsset - (totalIncome - totalExpense);
    dayList.forEach(d => {
      runningAsset += d.income - d.expense;
      cumulativeTrend.push({
        date: d.date.substring(5),
        asset: Math.max(0, runningAsset),
      });
    });

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      dailyData,
      categoryData,
      categoryL1Data,
      tagData,
      tagStats,
      sankeyData: { nodes: sankeyNodes, links: sankeyLinks },
      assetTrend: cumulativeTrend,
    };
  }, [timeMode, startDate, endDate, records, accounts, filterRecordsByTime, selectedCurrency, customCategoryView]);

  const yearStats = useMemo(() => {
    const empty = {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      incomeYoy: 0,
      expenseYoy: 0,
      monthlyData: [],
      dailyData: [],
      categoryData: { income: [], expense: [] },
      categoryL1Data: { income: [], expense: [] },
      tagData: [],
      tagStats: [],
      sankeyData: { nodes: [], links: [] },
      assetTrend: [],
      heatmapData: [],
    };
    if (timeMode !== 'year') return empty;

    const filteredRecords = filterRecordsByTime(records);
    const lastYearRecords = records.filter(record => {
      const recordDate = parseDateAsLocal(record.date);
      return recordDate.getFullYear() === selectedYear - 1;
    });

    const monthMap = {};
    const dateMap = {};
    const categoryMap = { income: {}, expense: {} };
    const categoryL1Map = { income: {}, expense: {} };
    const categoryCountMap = { income: {}, expense: {} };
    const categoryL1CountMap = { income: {}, expense: {} };
    const tagAgg = {};

    for (let m = 1; m <= 12; m++) {
      monthMap[m] = { month: m, label: `${m}月`, income: 0, expense: 0, balance: 0 };
    }

    let totalIncome = 0;
    let totalExpense = 0;

    filteredRecords.forEach(record => {
      const amount = getAmount(record);
      const recordDate = parseDateAsLocal(record.date);
      const month = recordDate.getMonth() + 1;
      const dateKey = record.date;

      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { date: dateKey, income: 0, expense: 0 };
      }

      if (record.type === 'income') {
        totalIncome += amount;
        monthMap[month].income += amount;
        dateMap[dateKey].income += amount;
        const category = record.category || '其他收入';
        const categoryL1 = getCategoryL1(record);
        categoryMap.income[category] = (categoryMap.income[category] || 0) + amount;
        categoryL1Map.income[categoryL1] = (categoryL1Map.income[categoryL1] || 0) + amount;
        categoryCountMap.income[category] = (categoryCountMap.income[category] || 0) + 1;
        categoryL1CountMap.income[categoryL1] = (categoryL1CountMap.income[categoryL1] || 0) + 1;
        (record.tags || []).forEach(tag => {
          if (!tagAgg[tag]) tagAgg[tag] = { income: 0, expense: 0, count: 0 };
          tagAgg[tag].income += amount;
          tagAgg[tag].count += 1;
        });
      } else if (record.type === 'expense') {
        totalExpense += amount;
        monthMap[month].expense += amount;
        dateMap[dateKey].expense += amount;
        const category = record.category || '其他支出';
        const categoryL1 = getCategoryL1(record);
        categoryMap.expense[category] = (categoryMap.expense[category] || 0) + amount;
        categoryL1Map.expense[categoryL1] = (categoryL1Map.expense[categoryL1] || 0) + amount;
        categoryCountMap.expense[category] = (categoryCountMap.expense[category] || 0) + 1;
        categoryL1CountMap.expense[categoryL1] = (categoryL1CountMap.expense[categoryL1] || 0) + 1;
        (record.tags || []).forEach(tag => {
          if (!tagAgg[tag]) tagAgg[tag] = { income: 0, expense: 0, count: 0 };
          tagAgg[tag].expense += amount;
          tagAgg[tag].count += 1;
        });
      }
    });

    const monthlyData = Object.values(monthMap).map(m => ({
      ...m,
      balance: m.income - m.expense,
    }));

    const dailyData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

    let lastYearIncome = 0;
    let lastYearExpense = 0;
    const lastYearCategoryL1Map = { income: {}, expense: {} };

    lastYearRecords.forEach(record => {
      const amount = getAmount(record);
      if (record.type === 'income') {
        lastYearIncome += amount;
        const categoryL1 = getCategoryL1(record);
        lastYearCategoryL1Map.income[categoryL1] = (lastYearCategoryL1Map.income[categoryL1] || 0) + amount;
      } else if (record.type === 'expense') {
        lastYearExpense += amount;
        const categoryL1 = getCategoryL1(record);
        lastYearCategoryL1Map.expense[categoryL1] = (lastYearCategoryL1Map.expense[categoryL1] || 0) + amount;
      }
    });

    const incomeYoy = lastYearIncome > 0 ? ((totalIncome - lastYearIncome) / lastYearIncome) * 100 : (totalIncome > 0 ? 100 : 0);
    const expenseYoy = lastYearExpense > 0 ? ((totalExpense - lastYearExpense) / lastYearExpense) * 100 : (totalExpense > 0 ? 100 : 0);

    const buildCategoryData = (sourceMap, countMap, total, lastYearMap) => Object.entries(sourceMap)
      .map(([name, value], idx) => {
        const lastYearValue = lastYearMap[name] || 0;
        const yoy = lastYearValue > 0 ? ((value - lastYearValue) / lastYearValue) * 100 : (value > 0 ? 100 : 0);
        return {
          name,
          value,
          count: countMap[name] || 0,
          percent: total > 0 ? (value / total) * 100 : 0,
          color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
          yoy,
        };
      })
      .sort((a, b) => b.value - a.value);

    const categoryData = {
      income: buildCategoryData(categoryMap.income, categoryCountMap.income, totalIncome, {}),
      expense: buildCategoryData(categoryMap.expense, categoryCountMap.expense, totalExpense, {}),
    };
    const categoryL1Data = {
      income: buildCategoryData(categoryL1Map.income, categoryL1CountMap.income, totalIncome, lastYearCategoryL1Map.income),
      expense: buildCategoryData(categoryL1Map.expense, categoryL1CountMap.expense, totalExpense, lastYearCategoryL1Map.expense),
    };

    const tagStats = Object.entries(tagAgg)
      .map(([name, agg], idx) => ({
        name,
        value: agg.expense,
        income: agg.income,
        expense: agg.expense,
        count: agg.count,
        percent: totalExpense > 0 ? (agg.expense / totalExpense) * 100 : 0,
        color: TAG_COLORS[idx % TAG_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);

    const tagData = tagStats.filter(t => t.value > 0);

    const sankeyNodes = [];
    const sankeyLinks = [];
    const incomeSourceIdx = sankeyNodes.length;
    sankeyNodes.push({ name: '收入' });
    const incomePool = yearCategoryView === 'level1' ? categoryL1Data.income : categoryData.income;
    const expensePool = yearCategoryView === 'level1' ? categoryL1Data.expense : categoryData.expense;
    incomePool.forEach(cat => {
      if (cat.value <= 0) return;
      const idx = sankeyNodes.length;
      sankeyNodes.push({ name: cat.name });
      sankeyLinks.push({ source: incomeSourceIdx, target: idx, value: cat.value });
    });
    const expenseTargetIdx = sankeyNodes.length;
    sankeyNodes.push({ name: '支出' });
    expensePool.forEach(cat => {
      if (cat.value <= 0) return;
      const idx = sankeyNodes.length;
      sankeyNodes.push({ name: cat.name });
      sankeyLinks.push({ source: idx, target: expenseTargetIdx, value: cat.value });
    });

    const initialAsset = accounts
      .filter(a => !a.liability)
      .reduce((sum, a) => sum + (a.balance || a.currentValue || 0), 0);
    const cumulativeTrend = [];
    let runningAsset = initialAsset - (totalIncome - totalExpense);
    monthlyData.forEach(m => {
      runningAsset += m.income - m.expense;
      cumulativeTrend.push({
        month: m.label,
        asset: Math.max(0, runningAsset),
      });
    });

    const heatmapData = [];
    for (let m = 1; m <= 12; m++) {
      const daysInMonth = new Date(selectedYear, m, 0).getDate();
      const monthData = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${selectedYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayData = dateMap[dateKey] || { income: 0, expense: 0 };
        monthData.push({
          day: d,
          date: dateKey,
          income: dayData.income,
          expense: dayData.expense,
          total: dayData.income + dayData.expense,
        });
      }
      heatmapData.push({ month: m, label: `${m}月`, days: monthData });
    }

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      incomeYoy,
      expenseYoy,
      monthlyData,
      dailyData,
      categoryData,
      categoryL1Data,
      tagData,
      tagStats,
      sankeyData: { nodes: sankeyNodes, links: sankeyLinks },
      assetTrend: cumulativeTrend,
      heatmapData,
    };
  }, [timeMode, selectedYear, records, accounts, filterRecordsByTime, selectedCurrency, yearCategoryView]);

  const loadYearSummary = useCallback(() => {
    const key = `yearly_summary_${selectedYear}`;
    const saved = localStorage.getItem(key);
    setYearSummary(saved || '');
  }, [selectedYear]);

  const saveYearSummary = () => {
    const key = `yearly_summary_${selectedYear}`;
    localStorage.setItem(key, yearSummary);
    setIsEditingYearSummary(false);
  };

  useEffect(() => {
    if (timeMode === 'year' && !isEditingYearSummary) {
      loadYearSummary();
    }
  }, [timeMode, selectedYear, isEditingYearSummary, loadYearSummary]);

  const renderCustomAnalysis = () => {
    const {
      totalIncome: cIncome,
      totalExpense: cExpense,
      balance: cBalance,
      dailyData: cDaily,
      categoryData: cCategoryData,
      categoryL1Data: cCategoryL1Data,
      tagData: cTagData,
      tagStats: cTagStats,
      sankeyData: cSankey,
      assetTrend: cAssetTrend,
    } = customStats;

    const cCategory = customCategoryView === 'level1' ? cCategoryL1Data : cCategoryData;
    const filteredTagData = customTagFilter === 'all'
      ? cTagData
      : cTagData.filter(t => t.name === customTagFilter);

    return (
      <div data-testid="custom-analysis">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700 mb-6">
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="font-medium">自定义范围</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatDateCN(startDate)} — {formatDateCN(endDate)}
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              共 {cDaily.length} 天
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
            <div className="text-blue-100 text-sm">总支出</div>
            <div className="text-2xl font-bold mt-1">{formatCurrency(cExpense)}</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
            <div className="text-blue-100 text-sm">总收入</div>
            <div className="text-2xl font-bold mt-1">{formatCurrency(cIncome)}</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
            <div className="text-blue-100 text-sm">总结余</div>
            <div className={`text-2xl font-bold mt-1 ${cBalance >= 0 ? 'text-green-200' : 'text-red-200'}`}>
              {formatCurrency(cBalance)}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700 mb-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">收支走势</h3>
          <div className="w-full h-[300px]">
            {cDaily.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cDaily} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-700" />
                  <XAxis dataKey="date" className="dark:text-gray-400" tick={{ fontSize: 10 }} />
                  <YAxis className="dark:text-gray-400" tick={{ fontSize: 10 }} tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    labelFormatter={(label) => `日期: ${label}`}
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0]?.payload || {};
                      return (
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700">
                          <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">{label}</div>
                          <div className="text-xs space-y-0.5">
                            <div className="text-red-500">支出：{formatCurrency(item.expense)}</div>
                            <div className="text-green-500">收入：{formatCurrency(item.income)}</div>
                            <div className={item.balance >= 0 ? 'text-blue-500' : 'text-red-500'}>结余：{formatCurrency(item.balance)}</div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="expense" name="支出" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="income" name="收入" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">暂无数据</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700 mb-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">资产走势</h3>
          <div className="w-full h-[300px]">
            {cAssetTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cAssetTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="customAssetGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-700" />
                  <XAxis dataKey="date" className="dark:text-gray-400" tick={{ fontSize: 10 }} />
                  <YAxis className="dark:text-gray-400" tick={{ fontSize: 10 }} tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value) => [formatCurrency(value), '资产']} />
                  <Area type="monotone" dataKey="asset" stroke="#6366F1" fill="url(#customAssetGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">暂无数据</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">收支对比</h3>
              <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                {[
                  { value: 'level1', label: '一级分类' },
                  { value: 'all', label: '全部' },
                ].map((view) => (
                  <button
                    key={view.value}
                    onClick={() => setCustomCategoryView(view.value)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      customCategoryView === view.value
                        ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-full h-[320px]">
              {cSankey.nodes.length > 1 && cSankey.links.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <Sankey
                    data={cSankey}
                    margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
                    link={{ stroke: '#94a3b8' }}
                    nodePadding={20}
                    nodeWidth={14}
                  >
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const item = payload[0]?.payload || {};
                        return (
                          <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 text-xs">
                            <div className="font-medium text-gray-900 dark:text-white">{item.name || item.source?.name || ''}</div>
                            {item.value !== undefined && (
                              <div className="text-gray-600 dark:text-gray-300">{formatCurrency(item.value)}</div>
                            )}
                          </div>
                        );
                      }}
                    />
                  </Sankey>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">暂无收支数据</div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">支出占比</h3>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customShowAmount}
                    onChange={(e) => setCustomShowAmount(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  <span>显示收支金额</span>
                </label>
                <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                  {[
                    { value: 'level1', label: '一级分类' },
                    { value: 'all', label: '全部' },
                  ].map((view) => (
                    <button
                      key={view.value}
                      onClick={() => setCustomCategoryView(view.value)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        customCategoryView === view.value
                          ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="w-full h-[320px]">
              {cCategory.expense.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={cCategory.expense}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={null}
                    >
                      {cCategory.expense.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [formatCurrency(value), name]} />
                    <text x="50%" y="45%" textAnchor="middle" className="text-xs font-medium fill-gray-700 dark:fill-gray-300">
                      {cCategory.expense[0]?.name || '支出'}
                    </text>
                    <text x="50%" y="60%" textAnchor="middle" className="text-sm font-bold fill-gray-900 dark:fill-white">
                      {cCategory.expense[0] ? `${(cCategory.expense[0].value / cTotalExpense * 100).toFixed(1)}%` : '0%'}
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">暂无支出数据</div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700 mb-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">支出数据列表</h3>
          <div className="space-y-3">
            {cCategory.expense.map((cat, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="font-medium text-gray-900 dark:text-white">{cat.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">笔数 {cat.count || 0}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{cat.percent.toFixed(1)}%</span>
                  <span className="font-semibold text-red-500">{formatCurrency(cat.value)}</span>
                </div>
              </div>
            ))}
            {cCategory.expense.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">暂无支出数据</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">标签占比</h3>
              <select
                value={customTagFilter}
                onChange={(e) => setCustomTagFilter(e.target.value)}
                className="px-3 py-1.5 bg-gray-100 dark:bg-slate-700 border-none rounded-lg text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">所有标签</option>
                {cTagData.map(tag => (
                  <option key={tag.name} value={tag.name}>{tag.name}</option>
                ))}
              </select>
            </div>
            <div className="w-full h-[280px]">
              {filteredTagData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={filteredTagData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={null}
                    >
                      {filteredTagData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [formatCurrency(value), name]} />
                    <text x="50%" y="45%" textAnchor="middle" className="text-xs font-medium fill-gray-700 dark:fill-gray-300">
                      {filteredTagData[0]?.name || '支出'}
                    </text>
                    <text x="50%" y="60%" textAnchor="middle" className="text-sm font-bold fill-gray-900 dark:fill-white">
                      {filteredTagData[0] ? `${(filteredTagData[0].value / filteredTagData.reduce((sum, t) => sum + t.value, 0) * 100).toFixed(1)}%` : '0%'}
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">暂无标签数据</div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">标签数据列表</h3>
            <div className="space-y-3 max-h-[320px] overflow-y-auto">
              {cTagStats.map((tag, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                    <span className="font-medium text-gray-900 dark:text-white">{tag.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">笔数 {tag.count}</span>
                    <span className="text-green-600 dark:text-green-400">{formatCurrency(tag.income)}</span>
                    <span className="text-red-500">{formatCurrency(tag.expense)}</span>
                  </div>
                </div>
              ))}
              {cTagStats.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">暂无标签数据</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderYearAnalysis = () => {
    const {
      totalIncome: yIncome,
      totalExpense: yExpense,
      balance: yBalance,
      incomeYoy: yIncomeYoy,
      expenseYoy: yExpenseYoy,
      monthlyData: yMonthly,
      categoryData: yCategoryData,
      categoryL1Data: yCategoryL1Data,
      tagData: yTagData,
      tagStats: yTagStats,
      sankeyData: ySankey,
      assetTrend: yAssetTrend,
      heatmapData: yHeatmap,
    } = yearStats;

    const yCategory = yearCategoryView === 'level1' ? yCategoryL1Data : yCategoryData;
    const filteredTagData = yearTagFilter === 'all'
      ? yTagData
      : yTagData.filter(t => t.name === yearTagFilter);

    const getYearChartData = () => {
      if (yearChartType === 'all') {
        return yMonthly.map(m => ({ month: m.label, expense: m.expense, income: m.income, balance: m.balance }));
      }
      if (yearChartType === 'expense') {
        return yMonthly.map(m => ({ month: m.label, value: m.expense, expense: m.expense, income: 0, balance: -m.expense }));
      }
      if (yearChartType === 'income') {
        return yMonthly.map(m => ({ month: m.label, value: m.income, expense: 0, income: m.income, balance: m.income }));
      }
      return yMonthly.map(m => ({ month: m.label, value: m.balance, expense: m.expense, income: m.income, balance: m.balance }));
    };

    const getHeatmapColor = (value, maxValue) => {
      if (value === 0 || maxValue === 0) return 'bg-gray-100 dark:bg-slate-700';
      const ratio = value / maxValue;
      if (ratio < 0.25) return 'bg-blue-100 dark:bg-blue-900/30';
      if (ratio < 0.5) return 'bg-blue-200 dark:bg-blue-800/50';
      if (ratio < 0.75) return 'bg-blue-400 dark:bg-blue-600';
      return 'bg-blue-600 dark:bg-blue-500';
    };

    const maxHeatmapValue = Math.max(...yHeatmap.flatMap(m => m.days.map(d => d.total)), 1);

    return (
      <div data-testid="year-analysis">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-blue-100 text-sm">年支出</div>
                <div className="text-2xl font-bold mt-1">{formatCurrency(yExpense)}</div>
              </div>
              <div className={`flex items-center gap-1 text-sm ${yExpenseYoy >= 0 ? 'text-red-200' : 'text-green-200'}`}>
                {yExpenseYoy >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {formatPercentage(yExpenseYoy)}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-blue-100 text-sm">年收入</div>
                <div className="text-2xl font-bold mt-1">{formatCurrency(yIncome)}</div>
              </div>
              <div className={`flex items-center gap-1 text-sm ${yIncomeYoy >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                {yIncomeYoy >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {formatPercentage(yIncomeYoy)}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-blue-100 text-sm">年结余</div>
                <div className={`text-2xl font-bold mt-1 ${yBalance >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                  {formatCurrency(yBalance)}
                </div>
              </div>
              <div className={`flex items-center gap-1 text-sm ${yBalance >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                {yBalance >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">收支统计</h3>
            <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
              {[
                { value: 'all', label: '全部' },
                { value: 'expense', label: '支出' },
                { value: 'income', label: '收入' },
                { value: 'balance', label: '结余' },
              ].map((type) => (
                <button
                  key={type.value}
                  onClick={() => setYearChartType(type.value)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    yearChartType === type.value
                      ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getYearChartData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-700" />
                <XAxis dataKey="month" className="dark:text-gray-400" tick={{ fontSize: 10 }} />
                <YAxis className="dark:text-gray-400" tick={{ fontSize: 10 }} tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0]?.payload || {};
                  const expense = item.expense || 0;
                  const income = item.income || 0;
                  const balance = item.balance || (income - expense);
                  return (
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700">
                      <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">{label}</div>
                      <div className="text-xs space-y-0.5">
                        {yearChartType === 'all' && <div className="text-red-500">支出：{formatCurrency(expense)}</div>}
                        {yearChartType === 'all' && <div className="text-green-500">收入：{formatCurrency(income)}</div>}
                        {yearChartType === 'all' && <div className={balance >= 0 ? 'text-blue-500' : 'text-red-500'}>结余：{formatCurrency(balance)}</div>}
                        {yearChartType === 'expense' && <div className="text-red-500">支出：{formatCurrency(expense)}</div>}
                        {yearChartType === 'income' && <div className="text-green-500">收入：{formatCurrency(income)}</div>}
                        {yearChartType === 'balance' && <div className={balance >= 0 ? 'text-blue-500' : 'text-red-500'}>结余：{formatCurrency(balance)}</div>}
                      </div>
                    </div>
                  );
                }} />
                <Legend />
                {yearChartType === 'all' && (
                  <>
                    <Bar dataKey="expense" name="支出" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="income" name="收入" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="balance" name="结余" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </>
                )}
                {yearChartType !== 'all' && (
                  <Bar dataKey="value" name={yearChartType === 'expense' ? '支出' : yearChartType === 'income' ? '收入' : '结余'} 
                       fill={yearChartType === 'expense' ? '#EF4444' : yearChartType === 'income' ? '#10B981' : '#3B82F6'} 
                       radius={[4, 4, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700 mb-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">收支热力日历</h3>
          <div className="space-y-4">
            {yHeatmap.map((monthData, mIdx) => (
              <div key={mIdx} className="flex items-start gap-3">
                <div className="w-10 text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0 pt-1">
                  {monthData.label}
                </div>
                <div className="flex-1 grid grid-cols-7 md:grid-cols-14 lg:grid-cols-31 gap-1">
                  {monthData.days.map((day, dIdx) => (
                    <div
                      key={dIdx}
                      className={`aspect-square rounded-sm ${getHeatmapColor(day.total, maxHeatmapValue)} cursor-pointer transition-transform hover:scale-110`}
                      title={`${day.date}\n支出: ${formatCurrency(day.expense)}\n收入: ${formatCurrency(day.income)}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-500 dark:text-gray-400">
            <span>少</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-slate-700" />
              <div className="w-3 h-3 rounded-sm bg-blue-100 dark:bg-blue-900/30" />
              <div className="w-3 h-3 rounded-sm bg-blue-200 dark:bg-blue-800/50" />
              <div className="w-3 h-3 rounded-sm bg-blue-400 dark:bg-blue-600" />
              <div className="w-3 h-3 rounded-sm bg-blue-600 dark:bg-blue-500" />
            </div>
            <span>多</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700 mb-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">资产走势</h3>
          <div className="w-full h-[300px]">
            {yAssetTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={yAssetTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="yearAssetGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-700" />
                  <XAxis dataKey="month" className="dark:text-gray-400" tick={{ fontSize: 10 }} />
                  <YAxis className="dark:text-gray-400" tick={{ fontSize: 10 }} tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value) => [formatCurrency(value), '资产']} />
                  <Area type="monotone" dataKey="asset" stroke="#6366F1" fill="url(#yearAssetGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">暂无数据</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">收支对比</h3>
              <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                {[
                  { value: 'level1', label: '一级分类' },
                  { value: 'all', label: '全部' },
                ].map((view) => (
                  <button
                    key={view.value}
                    onClick={() => setYearCategoryView(view.value)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      yearCategoryView === view.value
                        ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-full h-[320px]">
              {ySankey.nodes.length > 1 && ySankey.links.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <Sankey
                    data={ySankey}
                    margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
                    link={{ stroke: '#94a3b8' }}
                    nodePadding={20}
                    nodeWidth={14}
                  >
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const item = payload[0]?.payload || {};
                        return (
                          <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 text-xs">
                            <div className="font-medium text-gray-900 dark:text-white">{item.name || item.source?.name || ''}</div>
                            {item.value !== undefined && (
                              <div className="text-gray-600 dark:text-gray-300">{formatCurrency(item.value)}</div>
                            )}
                          </div>
                        );
                      }}
                    />
                  </Sankey>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">暂无收支数据</div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">支出占比</h3>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={yearShowAmount}
                    onChange={(e) => setYearShowAmount(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  <span>显示收支金额</span>
                </label>
                <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                  {[
                    { value: 'level1', label: '一级分类' },
                    { value: 'all', label: '全部' },
                  ].map((view) => (
                    <button
                      key={view.value}
                      onClick={() => setYearCategoryView(view.value)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        yearCategoryView === view.value
                          ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="w-full h-[320px]">
              {yCategory.expense.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={yCategory.expense}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value, percent }) => yearShowAmount
                        ? `${name} ${formatCurrency(value)}`
                        : `${name} ${percent.toFixed(1)}%`}
                      labelLine={false}
                    >
                      {yCategory.expense.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [formatCurrency(value), name]} />
                    <text x="50%" y="45%" textAnchor="middle" className="text-xs font-medium fill-gray-700 dark:fill-gray-300">
                      {yCategory.expense[0]?.name || '支出'}
                    </text>
                    <text x="50%" y="60%" textAnchor="middle" className="text-sm font-bold fill-gray-900 dark:fill-white">
                      {yCategory.expense[0] ? `${yCategory.expense[0].percent.toFixed(1)}%` : '0%'}
                    </text>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">暂无支出数据</div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700 mb-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">支出数据列表</h3>
          <div className="space-y-3">
            {yCategory.expense.map((cat, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="font-medium text-gray-900 dark:text-white">{cat.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">笔数 {cat.count || 0}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{cat.percent.toFixed(1)}%</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{formatPercentage(cat.yoy)}</span>
                  <span className="font-semibold text-red-500">{formatCurrency(cat.value)}</span>
                </div>
              </div>
            ))}
            {yCategory.expense.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">暂无支出数据</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700 mb-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">报表统计</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">月份</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">收入</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">支出</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">结余</th>
                </tr>
              </thead>
              <tbody>
                {yMonthly.map((month, index) => (
                  <tr key={index} className="border-b border-gray-100 dark:border-slate-700/50">
                    <td className="py-3 px-4 text-gray-900 dark:text-white">{month.label}</td>
                    <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">{formatCurrency(month.income)}</td>
                    <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">{formatCurrency(month.expense)}</td>
                    <td className={`py-3 px-4 text-right ${month.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(month.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">标签占比</h3>
              <select
                value={yearTagFilter}
                onChange={(e) => setYearTagFilter(e.target.value)}
                className="px-3 py-1.5 bg-gray-100 dark:bg-slate-700 border-none rounded-lg text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">所有标签</option>
                {yTagData.map(tag => (
                  <option key={tag.name} value={tag.name}>{tag.name}</option>
                ))}
              </select>
            </div>
            <div className="w-full h-[280px]">
              {filteredTagData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={filteredTagData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${percent.toFixed(1)}%`}
                      labelLine={false}
                    >
                      {filteredTagData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [formatCurrency(value), name]} />
                    <text x="50%" y="45%" textAnchor="middle" className="text-xs font-medium fill-gray-700 dark:fill-gray-300">
                      {filteredTagData[0]?.name || '标签'}
                    </text>
                    <text x="50%" y="60%" textAnchor="middle" className="text-sm font-bold fill-gray-900 dark:fill-white">
                      {filteredTagData[0] ? `${filteredTagData[0].percent.toFixed(1)}%` : '0%'}
                    </text>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">暂无标签数据</div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">标签数据列表</h3>
            <div className="space-y-3 max-h-[320px] overflow-y-auto">
              {yTagStats.map((tag, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                    <span className="font-medium text-gray-900 dark:text-white">{tag.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">笔数 {tag.count}</span>
                    <span className="text-green-600 dark:text-green-400">{formatCurrency(tag.income)}</span>
                    <span className="text-red-500">{formatCurrency(tag.expense)}</span>
                  </div>
                </div>
              ))}
              {yTagStats.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">暂无标签数据</div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">年度总结</h3>
            {!isEditingYearSummary ? (
              <button 
                onClick={() => setIsEditingYearSummary(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                <PenLine className="w-4 h-4" />
                编辑
              </button>
            ) : (
              <button 
                onClick={saveYearSummary}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
            )}
          </div>
          {isEditingYearSummary ? (
            <textarea
              value={yearSummary}
              onChange={(e) => setYearSummary(e.target.value)}
              placeholder="记录本年度的财务总结..."
              className="w-full h-32 p-4 bg-gray-50 dark:bg-slate-700 rounded-xl border-none resize-none text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-xl min-h-[128px] text-gray-900 dark:text-white">
              {yearSummary || '点击编辑按钮添加年度总结'}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
          <button onClick={loadData} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            重试
          </button>
        </div>
      </div>
    );
  }

  const { totalIncome, totalExpense, balance, incomeYoy, expenseYoy, categoryData, categoryL1Data, dailyData, tagData } = recordsStats;

  const getChartData = () => {
    if (chartType === 'all') {
      return dailyData.map(d => ({ day: d.day, expense: d.expense, income: d.income, balance: d.balance }));
    }
    if (chartType === 'expense') {
      return dailyData.map(d => ({ day: d.day, value: d.expense, expense: d.expense, income: 0, balance: -d.expense }));
    }
    if (chartType === 'income') {
      return dailyData.map(d => ({ day: d.day, value: d.income, expense: 0, income: d.income, balance: d.income }));
    }
    return dailyData.map(d => ({ day: d.day, value: d.balance, expense: d.expense, income: d.income, balance: d.balance }));
  };

  const currentCategoryData = categoryView === 'level1' ? categoryL1Data : categoryData;

  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const today = new Date();
  const currentSystemMonth = today.getMonth() + 1;
  const currentSystemYear = today.getFullYear();
  
  const prevMonth = currentSystemMonth === 1 ? 12 : currentSystemMonth - 1;
  const prevMonthYear = currentSystemMonth === 1 ? currentSystemYear - 1 : currentSystemYear;
  
  const monthButtons = [
    { label: '本月', value: currentSystemMonth, year: currentSystemYear },
    { label: '上月', value: prevMonth, year: prevMonthYear },
  ];
  
  for (let m = prevMonth - 1; m >= 1; m--) {
    monthButtons.push({ label: months[m - 1], value: m, year: currentSystemYear });
  }

  const timeModes = [
    { value: 'day', label: '日常' },
    { value: 'month', label: '月统计' },
    { value: 'year', label: '年统计' },
    { value: 'custom', label: '自定义' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <PieChartIcon className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">数据分析中心</h1>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex bg-gray-100 dark:bg-slate-700 rounded-xl p-1">
              {timeModes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setTimeMode(mode.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timeMode === mode.value
                      ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {(timeMode === 'month' || timeMode === 'year') && (
              <>
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded-lg text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}年</option>
                  ))}
                </select>

                {timeMode === 'month' && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        if (selectedMonth === 1) {
                          setSelectedYear(selectedYear - 1);
                          setSelectedMonth(12);
                        } else {
                          setSelectedMonth(selectedMonth - 1);
                        }
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-500" />
                    </button>
                    <div className="flex gap-1">
                      {monthButtons.map((btn) => (
                        <button
                          key={btn.label}
                          onClick={() => {
                            setSelectedYear(btn.year);
                            setSelectedMonth(btn.value);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            selectedYear === btn.year && selectedMonth === btn.value
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={() => {
                        if (selectedMonth === 12) {
                          setSelectedYear(selectedYear + 1);
                          setSelectedMonth(1);
                        } else {
                          setSelectedMonth(selectedMonth + 1);
                        }
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                )}

                {timeMode === 'year' && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setSelectedYear(selectedYear - 1)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-500" />
                    </button>
                    <div className="flex gap-1">
                      {[
                        { label: '今年', year: currentSystemYear },
                        { label: '去年', year: currentSystemYear - 1 },
                        { label: '2024', year: 2024 },
                        { label: '2023', year: 2023 },
                      ].map((btn) => (
                        <button
                          key={btn.label}
                          onClick={() => setSelectedYear(btn.year)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            selectedYear === btn.year
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={() => setSelectedYear(selectedYear + 1)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                )}
              </>
            )}

            {timeMode === 'custom' && (
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-500">—</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <select 
              value={selectedCurrency} 
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="px-3 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded-lg text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {['CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD'].map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>
        </div>

        {timeMode === 'custom' ? renderCustomAnalysis() : timeMode === 'year' ? renderYearAnalysis() : (
        <div data-testid="default-analysis">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-red-100 text-sm">月支出</div>
                <div className="text-2xl font-bold mt-1">{formatCurrency(totalExpense)}</div>
              </div>
              <div className={`flex items-center gap-1 text-sm ${expenseYoy >= 0 ? 'text-red-200' : 'text-green-200'}`}>
                {expenseYoy >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {formatPercentage(expenseYoy)}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-green-100 text-sm">月收入</div>
                <div className="text-2xl font-bold mt-1">{formatCurrency(totalIncome)}</div>
              </div>
              <div className={`flex items-center gap-1 text-sm ${incomeYoy >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                {incomeYoy >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {formatPercentage(incomeYoy)}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-blue-100 text-sm">月结余</div>
                <div className={`text-2xl font-bold mt-1 ${balance >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                  {formatCurrency(balance)}
                </div>
              </div>
              <div className={`flex items-center gap-1 text-sm ${balance >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                {balance >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">收支统计</h3>
              <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                {[
                  { value: 'all', label: '全部' },
                  { value: 'expense', label: '支出' },
                  { value: 'income', label: '收入' },
                  { value: 'balance', label: '结余' },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setChartType(type.value)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      chartType === type.value
                        ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getChartData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-700" />
                  <XAxis dataKey="day" className="dark:text-gray-400" tick={{ fontSize: 10 }} />
                  <YAxis className="dark:text-gray-400" tick={{ fontSize: 10 }} tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0]?.payload || {};
                    const dateStr = `${selectedYear}年${selectedMonth}月${label}日`;
                    const expense = item.expense || 0;
                    const income = item.income || 0;
                    const balance = item.balance || (income - expense);
                    return (
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700">
                        <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">{dateStr}</div>
                        <div className="text-xs space-y-0.5">
                          {chartType === 'all' && <div className="text-red-500">支出：{formatCurrency(expense)}</div>}
                          {chartType === 'all' && <div className="text-green-500">收入：{formatCurrency(income)}</div>}
                          {chartType === 'all' && <div className={balance >= 0 ? 'text-blue-500' : 'text-red-500'}>结余：{formatCurrency(balance)}</div>}
                          {chartType === 'expense' && <div className="text-red-500">支出：{formatCurrency(expense)}</div>}
                          {chartType === 'income' && <div className="text-green-500">收入：{formatCurrency(income)}</div>}
                          {chartType === 'balance' && <div className={balance >= 0 ? 'text-blue-500' : 'text-red-500'}>结余：{formatCurrency(balance)}</div>}
                        </div>
                      </div>
                    );
                  }} />
                  <Legend />
                  {chartType === 'all' && (
                    <>
                      <Bar dataKey="expense" name="支出" fill="#EF4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="income" name="收入" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="balance" name="结余" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </>
                  )}
                  {chartType !== 'all' && (
                    <Bar dataKey="value" name={chartType === 'expense' ? '支出' : chartType === 'income' ? '收入' : '结余'} 
                         fill={chartType === 'expense' ? '#EF4444' : chartType === 'income' ? '#10B981' : '#3B82F6'} 
                         radius={[4, 4, 0, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">资产走势</h3>
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={assetTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-700" />
                  <XAxis dataKey="date" className="dark:text-gray-400" tick={{ fontSize: 9 }} />
                  <YAxis className="dark:text-gray-400" tick={{ fontSize: 9 }} tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value) => [formatCurrency(value), '资产']} />
                  <Area type="monotone" dataKey="asset" stroke="#6366F1" fill="url(#assetGradient)" />
                  <defs>
                    <linearGradient id="assetGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">收支对比</h3>
              <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                {[
                  { value: 'level1', label: '一级分类' },
                  { value: 'all', label: '全部' },
                ].map((view) => (
                  <button
                    key={view.value}
                    onClick={() => setCategoryView(view.value)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      categoryView === view.value
                        ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-full h-[200px]">
              {(currentCategoryData.income.length > 0 || currentCategoryData.expense.length > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <Sankey
                    data={{
                      nodes: [
                        { name: '收入', color: '#10B981' },
                        ...currentCategoryData.income.slice(0, 3).map(cat => ({ name: cat.name, color: cat.color })),
                        ...currentCategoryData.expense.slice(0, 3).map(cat => ({ name: cat.name, color: cat.color })),
                        { name: '支出', color: '#EF4444' },
                      ],
                      links: [
                        ...currentCategoryData.income.slice(0, 3).map((cat, idx) => ({
                          source: 0,
                          target: idx + 1,
                          value: cat.value,
                          color: cat.color,
                        })),
                        ...currentCategoryData.expense.slice(0, 3).map((cat, idx) => ({
                          source: idx + 1 + currentCategoryData.income.slice(0, 3).length,
                          target: 1 + currentCategoryData.income.slice(0, 3).length + currentCategoryData.expense.slice(0, 3).length,
                          value: cat.value,
                          color: cat.color,
                        })),
                      ],
                    }}
                    layout="horizontal"
                    nodeWidth={12}
                    nodeGap={8}
                    nodeLabel={{ fontSize: 10 }}
                  >
                    <Tooltip formatter={(value) => [formatCurrency(value), '']} />
                  </Sankey>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">暂无收支数据</div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">支出占比</h3>
              <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                {[
                  { value: 'level1', label: '一级分类' },
                  { value: 'all', label: '全部' },
                ].map((view) => (
                  <button
                    key={view.value}
                    onClick={() => setCategoryView(view.value)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      categoryView === view.value
                        ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={currentCategoryData.expense} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={50} 
                    outerRadius={80} 
                    paddingAngle={2} 
                    dataKey="value" 
                    label={null}
                  >
                    {currentCategoryData.expense.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatCurrency(value), '']} />
                  <text x="50%" y="45%" textAnchor="middle" className="text-xs font-medium fill-gray-700 dark:fill-gray-300">
                    {currentCategoryData.expense[0]?.name || '支出'}
                  </text>
                  <text x="50%" y="60%" textAnchor="middle" className="text-sm font-bold fill-gray-900 dark:fill-white">
                    {currentCategoryData.expense[0] ? `${(currentCategoryData.expense[0].value / totalExpense * 100).toFixed(1)}%` : '0%'}
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">标签占比</h3>
            <div className="w-full h-[250px]">
              {tagData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={tagData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={50} 
                      outerRadius={80} 
                      paddingAngle={2} 
                      dataKey="value" 
                      label={null}
                    >
                      {tagData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(value), '']} />
                    <text x="50%" y="45%" textAnchor="middle" className="text-xs font-medium fill-gray-700 dark:fill-gray-300">
                      {tagData[0]?.name || '支出'}
                    </text>
                    <text x="50%" y="60%" textAnchor="middle" className="text-sm font-bold fill-gray-900 dark:text-white">
                      {tagData[0] ? `${(tagData[0].value / (tagData.reduce((sum, t) => sum + t.value, 0)) * 100).toFixed(1)}%` : '0%'}
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
                  暂无标签数据
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">支出数据列表</h3>
            <div className="space-y-3">
              {currentCategoryData.expense.map((cat, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="font-medium text-gray-900 dark:text-white">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-500">{formatPercentage(cat.percent)}</span>
                    <span className="text-xs text-gray-400">{formatPercentage(cat.yoy)}</span>
                    <span className="font-semibold text-red-500">{formatCurrency(cat.value)}</span>
                  </div>
                </div>
              ))}
              {currentCategoryData.expense.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">暂无支出数据</div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">标签数据列表</h3>
            <div className="space-y-3">
              {tagData.map((tag, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                    <span className="font-medium text-gray-900 dark:text-white">{tag.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-500">{formatPercentage(tag.percent)}</span>
                    <span className="font-semibold text-red-500">{formatCurrency(tag.value)}</span>
                  </div>
                </div>
              ))}
              {tagData.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">暂无标签数据</div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700 mb-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">报表统计</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">日期</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">收入</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">支出</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">结余</th>
                </tr>
              </thead>
              <tbody>
                {dailyData.map((day, index) => (
                  <tr key={index} className="border-b border-gray-100 dark:border-slate-700/50">
                    <td className="py-3 px-4 text-gray-900 dark:text-white">{day.date}</td>
                    <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">{formatCurrency(day.income)}</td>
                    <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">{formatCurrency(day.expense)}</td>
                    <td className={`py-3 px-4 text-right ${day.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(day.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">本月总结</h3>
            {!isEditingSummary ? (
              <button 
                onClick={() => setIsEditingSummary(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                <PenLine className="w-4 h-4" />
                编辑
              </button>
            ) : (
              <button 
                onClick={saveSummary}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
            )}
          </div>
          {isEditingSummary ? (
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="记录本月的财务总结..."
              className="w-full h-32 p-4 bg-gray-50 dark:bg-slate-700 rounded-xl border-none resize-none text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-xl min-h-[128px] text-gray-900 dark:text-white">
              {summary || '点击编辑按钮添加本月总结'}
            </div>
          )}
        </div>
        </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect, useMemo, useRef } from 'react';
import { fetchState, saveState, createAccount, updateAccount, deleteAccount, fetchBooks, saveBooks, lookupFinance, fetchFinanceQuotes, fetchFundNav } from '../api';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Wallet,
  Briefcase,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  X,
  Upload,
  Image,
  Camera,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Search,
  Settings,
  Edit2,
  Trash2,
  Eye,
  Check,
} from 'lucide-react';

// ── 工具函数 ──
function formatCurrency(value) {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

function formatPercentage(value) {
  if (value === null || value === undefined) return '—';
  const n = parseFloat(value);
  if (isNaN(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
}

// 计算经过 N 天的实际持仓天数
function computeHoldingDays(account) {
  if (!account) return 0;
  const base = parseInt(account.holdingDaysBase ?? account.holdingDays, 10) || 0;
  const baseDate = account.holdingDaysDate;
  if (!baseDate) return base;
  const d1 = new Date(baseDate);
  d1.setHours(0, 0, 0, 0);
  const d2 = new Date();
  d2.setHours(0, 0, 0, 0);
  const days = Math.max(0, Math.floor((d2 - d1) / 86400000));
  return base + days;
}

function formatNum(value) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

const POS_CLASS = 'text-green-600 dark:text-green-400';
const NEG_CLASS = 'text-red-500 dark:text-red-400';

function pnlClass(val) {
  const n = parseFloat(val);
  return isNaN(n) ? '' : (n >= 0 ? POS_CLASS : NEG_CLASS);
}

function pnlSign(n) {
  return n > 0 ? '+' : '';
}

// ── OCR 字段中文标签映射 ──
const fieldLabelMap = {
  name: '资产名称',
  code: '资产代码',
  quantity: '份额/数量',
  currentPrice: '现价',
  holdingPnl: '持仓盈亏',
  holdingPnlRate: '盈亏率',
  dailyPnl: '当日参考盈亏',
  dailyPnlRate: '当日收益率',
  currentValue: '当前市值',
};

// ── 表单字段子组件 ──
function FormField({ label, required, markRequired, children, fullWidth }) {
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {required && <span className="text-red-500 mr-0.5">*</span>}
        {label}
        {markRequired && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ── 共享表单样式 ──
const FORM_INPUT = 'w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors';
const FORM_SELECT = 'w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors appearance-none cursor-pointer';

// ── 账户卡片子组件 ──
function AccountCard({ name, totalValue, totalCost, totalPnl, totalPnlRate, totalDailyPnl, totalDailyPnlRate, count }) {
  const isPos = totalPnl >= 0;
  const isDayPos = totalDailyPnl >= 0;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-soft border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full p-1.5">
            <Wallet className="w-4 h-4" />
          </div>
          <span className="font-semibold text-gray-900 dark:text-white text-sm">{name}</span>
          <span className="text-xs text-gray-400">({count}项)</span>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isPos ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {formatPercentage(totalPnlRate)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">当前总市值</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{formatNum(totalValue)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">持仓总成本</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{formatNum(totalCost)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">持仓总盈亏</p>
          <p className={`text-sm font-bold tabular-nums ${isPos ? 'text-green-600' : 'text-red-500'}`}>
            {pnlSign(totalPnl)}{formatNum(totalPnl)}
          </p>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-700 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">持仓总收益率</p>
          <p className={`text-sm font-bold ${isPos ? 'text-green-600' : 'text-red-500'}`}>{formatPercentage(totalPnlRate)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">当日总盈亏</p>
          <p className={`text-sm font-bold tabular-nums ${isDayPos ? 'text-green-600' : 'text-red-500'}`}>
            {pnlSign(totalDailyPnl)}{formatNum(totalDailyPnl)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">当日总收益率</p>
          <p className={`text-sm font-bold ${isDayPos ? 'text-green-600' : 'text-red-500'}`}>{formatPercentage(totalDailyPnlRate)}</p>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ data, totalMarketValue, onClose, saveState, stateData, onRefresh }) {
  const latestData = stateData?.financeAssets?.find(item => String(item.id) === String(data?.id)) || data;
  if (!latestData) return null;
  const [uploadedImages, setUploadedImages] = useState([]);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [tradeRecords, setTradeRecords] = useState(() => {
    if (data.transactions && Array.isArray(data.transactions)) {
      return data.transactions.map(t => ({ ...t, id: t.id || Date.now() + Math.random() }));
    }
    return [];
  });

  const saveTradeRecords = async (records) => {
    if (!saveState || !stateData) return;
    try {
      const currentFinanceAssets = stateData?.financeAssets || [];
      const updatedFinanceAssets = currentFinanceAssets.map(item => {
        if (String(item.id) === String(data.id)) {
          return { ...item, transactions: records };
        }
        return item;
      });
      await saveState({
        ...stateData,
        financeAssets: updatedFinanceAssets,
      });
      // 通知父组件刷新数据
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error('Failed to save trade records:', err);
    }
  };

  const [newRecord, setNewRecord] = useState({
    type: '买入',
    date: new Date().toISOString().split('T')[0],
    time: '09:30',
    price: '',
    quantity: '',
    amount: '',
    fee: '',
  });

  const [recordPage, setRecordPage] = useState(1);
  const recordPageSize = 5;

  const [recognizedRecords, setRecognizedRecords] = useState([]);
  const [showRecognizeModal, setShowRecognizeModal] = useState(false);

  const [showDcaModal, setShowDcaModal] = useState(false);
  const [dcaSettings, setDcaSettings] = useState({
    enabled: false,
    type: 'amount',
    cycle: 'weekly',
    amount: '',
    quantity: '',
  });

  const [filterRecordType, setFilterRecordType] = useState('');

  const sortedRecords = useMemo(() => {
    const deduplicated = {};
    tradeRecords.forEach(record => {
      const key = `${record.price}_${record.date}_${record.time}_${record.quantity}_${record.amount}`;
      if (!deduplicated[key]) {
        deduplicated[key] = record;
      }
    });
    let filtered = Object.values(deduplicated);
    if (filterRecordType) {
      filtered = filtered.filter(r => r.type === filterRecordType);
    }
    return filtered.sort((a, b) => {
      const dateA = `${a.date} ${a.time}`;
      const dateB = `${b.date} ${b.time}`;
      return dateB.localeCompare(dateA);
    });
  }, [tradeRecords, filterRecordType]);

  const totalRecordPages = Math.ceil(sortedRecords.length / recordPageSize);
  const paginatedRecords = sortedRecords.slice((recordPage - 1) * recordPageSize, recordPage * recordPageSize);

  const floatPnl = Math.round((parseFloat(latestData.holdingPnl) || 0) * 100) / 100;
  const floatPnlRate = Math.round((parseFloat(latestData.holdingPnlRate) || 0) * 100) / 100;
  const currentValue = parseFloat(latestData.currentValue) || 0;
  const positionRatio = totalMarketValue > 0 ? (currentValue / totalMarketValue) * 100 : 0;
  const holdingDays = computeHoldingDays(latestData);
  const costPrice = parseFloat(latestData.costPrice || latestData.cost) || 0;
  const quantity = parseFloat(latestData.shares || latestData.quantity) || 0;
  const isBondFund = latestData.categoryL1 === '债权类' && latestData.categoryL3 === '场外';
  const prevPrice = parseFloat(latestData.prevPrice) || 0;
  const currentPrice = parseFloat(latestData.currentPrice || costPrice) || 0;
  const priceDate = latestData.priceDate || '';

  const dailyPnl = prevPrice > 0 && quantity > 0 && currentPrice > 0
    ? quantity * (currentPrice - prevPrice)
    : parseFloat(latestData.dailyPnl) || 0;
  const dailyPnlRate = prevPrice > 0 && currentPrice > 0
    ? ((currentPrice - prevPrice) / prevPrice) * 100
    : parseFloat(latestData.dailyPnlRate) || 0;

  const tradeStats = useMemo(() => {
    let buyTotalAmount = 0;
    let sellTotalAmount = 0;
    let buyTotalQty = 0;
    let sellTotalQty = 0;
    let totalFee = 0;
    let dividendTotal = 0;

    tradeRecords.forEach(record => {
      const amount = parseFloat(record.amount) || 0;
      const qty = parseFloat(record.quantity) || 0;
      const fee = parseFloat(record.fee) || 0;

      if (record.type === '买入') {
        buyTotalAmount += amount;
        buyTotalQty += qty;
      } else if (record.type === '卖出') {
        sellTotalAmount += Math.abs(amount);
        sellTotalQty += Math.abs(qty);
      } else if (record.type === '分红') {
        dividendTotal += amount;
      }
      if (!isNaN(fee)) {
        totalFee += fee;
      }
    });

    const avgBuyCost = buyTotalQty > 0 ? buyTotalAmount / buyTotalQty : 0;
    const avgSellCost = sellTotalQty > 0 ? sellTotalAmount / sellTotalQty : 0;

    return { buyTotalAmount, sellTotalAmount, buyTotalQty, sellTotalQty, avgBuyCost, avgSellCost, totalFee, dividendTotal };
  }, [tradeRecords]);

  const isFloatPos = floatPnl >= 0;
  const isDayPos = dailyPnl >= 0;

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setUploadedImages(prev => [...prev, { id: Date.now() + Math.random(), src: event.target.result, name: file.name }]);
          
          const mockRecognized = [
            { id: Date.now() + Math.random(), type: '分红', date: '2026-06-30', time: '00:00', price: '-', quantity: '0', amount: '66.60', fee: '-' },
            { id: Date.now() + Math.random() + 1, type: '买入', date: '2026-04-24', time: '09:30', price: '19.22', quantity: '100', amount: '1922.00', fee: '5.00' },
            { id: Date.now() + Math.random() + 2, type: '卖出', date: '2026-04-23', time: '14:45', price: '21.57', quantity: '-100', amount: '-2157.00', fee: '6.08' },
            { id: Date.now() + Math.random() + 3, type: '买入', date: '2026-03-23', time: '10:15', price: '18.63', quantity: '100', amount: '1863.00', fee: '5.00' },
            { id: Date.now() + Math.random() + 4, type: '买入', date: '2026-03-19', time: '09:30', price: '19.91', quantity: '200', amount: '3982.00', fee: '5.00' },
            { id: Date.now() + Math.random() + 5, type: '买入', date: '2026-03-19', time: '10:00', price: '20.20', quantity: '200', amount: '4040.00', fee: '5.00' },
            { id: Date.now() + Math.random() + 6, type: '买入', date: '2026-03-19', time: '14:30', price: '24.54', quantity: '500', amount: '12270.00', fee: '5.00' },
            { id: Date.now() + Math.random() + 7, type: '买入', date: '2026-03-09', time: '09:30', price: '23.80', quantity: '400', amount: '9520.00', fee: '5.00' },
            { id: Date.now() + Math.random() + 8, type: '买入', date: '2026-03-06', time: '09:30', price: '25.165', quantity: '400', amount: '10066.00', fee: '5.00' },
            { id: Date.now() + Math.random() + 9, type: '买入', date: '2026-03-05', time: '09:30', price: '22.96', quantity: '400', amount: '9184.00', fee: '5.00' },
            { id: Date.now() + Math.random() + 10, type: '买入', date: '2026-03-04', time: '09:30', price: '22.07', quantity: '200', amount: '4414.00', fee: '5.00' },
            { id: Date.now() + Math.random() + 11, type: '买入', date: '2026-03-04', time: '10:00', price: '22.08', quantity: '100', amount: '2208.00', fee: '5.00' },
            { id: Date.now() + Math.random() + 12, type: '买入', date: '2026-03-04', time: '14:00', price: '21.62', quantity: '300', amount: '6486.00', fee: '5.00' },
            { id: Date.now() + Math.random() + 13, type: '建仓', date: '2026-03-03', time: '09:30', price: '22.04', quantity: '100', amount: '2204.00', fee: '5.00' },
          ];
          setRecognizedRecords(mockRecognized);
          setShowRecognizeModal(true);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (id) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
  };

  const handleAddRecord = () => {
    const record = {
      id: Date.now(),
      type: newRecord.type,
      date: newRecord.date,
      time: newRecord.time,
      price: newRecord.type === '分红' ? '-' : parseFloat(newRecord.price) || 0,
      quantity: newRecord.type === '分红' ? 0 : parseFloat(newRecord.quantity) || 0,
      amount: parseFloat(newRecord.amount) || 0,
      fee: newRecord.type === '分红' ? '-' : parseFloat(newRecord.fee) || 0,
    };
    setTradeRecords(prev => {
      const newRecords = [...prev, record];
      saveTradeRecords(newRecords);
      return newRecords;
    });
    setNewRecord({
      type: '买入',
      date: new Date().toISOString().split('T')[0],
      time: '09:30',
      price: '',
      quantity: '',
      amount: '',
      fee: '',
    });
    setShowAddRecord(false);
    setRecordPage(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full p-2">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">{latestData.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">代码: {latestData.code || '-'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {isBondFund ? (
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 mb-4">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">资产（元）</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{formatCurrency(currentValue)}</p>
                {latestData.positionGroup && (
                  <span className="inline-block mt-2 px-3 py-1 text-sm bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 rounded-full">关联组合: {latestData.positionGroup}</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">昨日收益</p>
                  <p className={`text-2xl font-semibold ${dailyPnl >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {dailyPnl >= 0 ? '+' : ''}{dailyPnl.toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">持仓收益</p>
                  <p className={`text-2xl font-semibold ${floatPnl >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {floatPnl >= 0 ? '+' : ''}{floatPnl.toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">持仓收益率</p>
                  <p className={`text-2xl font-semibold ${floatPnlRate >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {floatPnlRate >= 0 ? '+' : ''}{floatPnlRate.toFixed(2)}%
                  </p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                <div className="grid grid-cols-[minmax(90px,auto)_1fr_minmax(80px,auto)_1fr] gap-x-3 gap-y-3 items-center">
                  {/* 第1行：最新净值 + 日期 | 值 | 日涨幅 | 值 */}
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-1">
                      <span className="text-base text-gray-600 dark:text-gray-300">最新净值</span>
                      {priceDate && (
                        <span className="text-sm text-gray-400 dark:text-gray-500">{priceDate.slice(5)}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-300 dark:text-gray-600">数据获取时间: {new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <span className="text-xl font-semibold text-gray-900 dark:text-white">{currentPrice > 0 ? currentPrice.toFixed(4) : '—'}</span>
                  <span className="text-base text-gray-600 dark:text-gray-300">日涨幅</span>
                  <span className={`text-lg font-semibold ${dailyPnlRate >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {dailyPnlRate >= 0 ? '+' : ''}{dailyPnlRate.toFixed(2)}%
                  </span>

                  {/* 第2行：持仓成本单价 | 值 | 累计收益 | 值 */}
                  <span className="text-base text-gray-600 dark:text-gray-300">持仓成本单价</span>
                  <span className="text-xl font-semibold text-gray-900 dark:text-white">{costPrice > 0 ? costPrice.toFixed(4) : '—'}</span>
                  <span className="text-base text-gray-600 dark:text-gray-300">累计收益</span>
                  <span className={`text-lg font-semibold ${floatPnl >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {floatPnl >= 0 ? '+' : ''}{floatPnl.toFixed(2)}
                  </span>

                  {/* 第3行：全部份额 | 值 | 可用份额 | 值 */}
                  <span className="text-base text-gray-600 dark:text-gray-300">全部份额</span>
                  <span className="text-xl font-semibold text-gray-900 dark:text-white">{quantity > 0 ? quantity.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</span>
                  <span className="text-base text-gray-600 dark:text-gray-300">可用份额</span>
                  <span className="text-xl font-semibold text-gray-900 dark:text-white">{quantity > 0 ? quantity.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</span>

                  {/* 第4行：持有收益 | 值 | 持有收益率 | 值 */}
                  <span className="text-base text-gray-600 dark:text-gray-300">持有收益</span>
                  <span className={`text-lg font-semibold ${floatPnl >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {floatPnl >= 0 ? '+' : ''}{floatPnl.toFixed(2)}
                  </span>
                  <span className="text-base text-gray-600 dark:text-gray-300">持有收益率</span>
                  <span className={`text-lg font-semibold ${floatPnlRate >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {floatPnlRate >= 0 ? '+' : ''}{floatPnlRate.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`${isFloatPos ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'} rounded-xl p-3`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">浮动盈亏</p>
                  <p className={`text-lg font-bold ${isFloatPos ? 'text-green-600' : 'text-red-500'}`}>
                    {isFloatPos ? '+' : '-'}{formatNum(Math.abs(floatPnl))}
                  </p>
                  <p className={`text-xs ${isFloatPos ? 'text-green-600' : 'text-red-500'}`}>
                    {isFloatPos ? '+' : ''}{floatPnlRate.toFixed(2)}%
                  </p>
                </div>
                <div className={`${isDayPos ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'} rounded-xl p-3`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">当日参考盈亏</p>
                  <p className={`text-lg font-bold ${isDayPos ? 'text-green-600' : 'text-red-500'}`}>
                    {isDayPos ? '+' : '-'}{formatNum(Math.abs(dailyPnl))}
                  </p>
                  <p className={`text-xs ${isDayPos ? 'text-green-600' : 'text-red-500'}`}>
                    {isDayPos ? '+' : ''}{dailyPnlRate.toFixed(2)}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">持仓天数</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{holdingDays}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">交易税费</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatNum(tradeStats.totalFee)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">分红收益</p>
                  <p className="text-sm font-semibold text-green-600">{formatNum(tradeStats.dividendTotal)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">买入总金额</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatNum(tradeStats.buyTotalAmount)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">卖出总金额</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatNum(tradeStats.sellTotalAmount)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">买入总数</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{tradeStats.buyTotalQty}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">卖出总数</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{tradeStats.sellTotalQty}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">平均买入成本</p>
                  <p className="text-sm font-semibold text-green-600">{formatNum(tradeStats.avgBuyCost)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">平均卖出成本</p>
                  <p className="text-sm font-semibold text-red-500">{formatNum(tradeStats.avgSellCost)}</p>
                </div>
              </div>
            </>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">交易记录</h4>
              <div className="flex items-center gap-2">
                <select
                  value={filterRecordType}
                  onChange={e => { setFilterRecordType(e.target.value); setRecordPage(1); }}
                  className="px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white cursor-pointer"
                >
                  <option value="">全部类型</option>
                  <option value="建仓">建仓</option>
                  <option value="买入">买入</option>
                  <option value="卖出">卖出</option>
                  <option value="分红">分红</option>
                </select>
                <button
                  onClick={() => setShowAddRecord(!showAddRecord)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  新增记录
                </button>
                <label className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  图片识别上传
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                </label>
                <button
                  onClick={() => setShowDcaModal(true)}
                  className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  定投设置
                </button>
              </div>
            </div>

            {showAddRecord && (
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 mb-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-gray-500 dark:text-gray-400 block mb-0.5">类型</label>
                    <select
                      value={newRecord.type}
                      onChange={e => setNewRecord(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                    >
                      <option value="建仓">建仓</option>
                      <option value="买入">买入</option>
                      <option value="卖出">卖出</option>
                      <option value="分红">分红</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-500 dark:text-gray-400 block mb-0.5">日期</label>
                    <input
                      type="date"
                      value={newRecord.date}
                      onChange={e => setNewRecord(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-gray-500 dark:text-gray-400 block mb-0.5">确认金额</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newRecord.amount}
                      onChange={e => setNewRecord(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                      placeholder="确认金额"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 dark:text-gray-400 block mb-0.5">确认份额</label>
                    <input
                      type="number"
                      step="0.001"
                      value={newRecord.quantity}
                      onChange={e => setNewRecord(prev => ({ ...prev, quantity: e.target.value }))}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                      placeholder="确认份额"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 dark:text-gray-400 block mb-0.5">确认净值</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={newRecord.price}
                      onChange={e => setNewRecord(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                      placeholder="确认净值"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-gray-500 dark:text-gray-400 block mb-0.5">手续费</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newRecord.fee}
                      onChange={e => setNewRecord(prev => ({ ...prev, fee: e.target.value }))}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                      placeholder="手续费"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleAddRecord}
                    className="flex-1 px-3 py-1.5 text-xs bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setShowAddRecord(false)}
                    className="flex-1 px-3 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {uploadedImages.map(img => (
                  <div key={img.id} className="relative rounded-lg overflow-hidden">
                    <img src={img.src} alt={img.name} className="w-full h-20 object-cover" />
                    <button onClick={() => removeImage(img.id)} className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-1">
              {paginatedRecords.map((record) => (
                <div key={record.id} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${record.type === '建仓' ? 'text-blue-600' : record.type === '买入' ? 'text-green-600' : record.type === '卖出' ? 'text-red-500' : 'text-blue-600'}`}>
                      {record.type}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">{record.date}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-xs">
                    <div className="col-span-2">
                      <span className="text-gray-500 dark:text-gray-400">确认金额</span>
                      <p className={`${record.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>{record.amount >= 0 ? '+' : ''}{record.amount}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">确认份额</span>
                      <p className="text-gray-900 dark:text-white">{record.quantity}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">确认净值</span>
                      <p className="text-gray-900 dark:text-white">{record.price}</p>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-500 dark:text-gray-400">手续费</span>
                      <div className="flex items-center gap-1 justify-end flex-1">
                        <span className="text-gray-900 dark:text-white">{record.fee}</span>
                        <button
                          onClick={() => {
                            setNewRecord({
                              type: record.type,
                              date: record.date,
                              time: record.time,
                              price: record.price === '-' ? '' : String(record.price),
                              quantity: String(record.quantity),
                              amount: String(record.amount),
                              fee: record.fee === '-' ? '' : String(record.fee),
                            });
                            setShowAddRecord(true);
                            setTradeRecords(prev => {
                              const newRecords = prev.filter(r => r.id !== record.id);
                              saveTradeRecords(newRecords);
                              return newRecords;
                            });
                          }}
                          className="p-1.5 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                          title="修改"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setTradeRecords(prev => {
                            const newRecords = prev.filter(r => r.id !== record.id);
                            saveTradeRecords(newRecords);
                            return newRecords;
                          })}
                          className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalRecordPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <button
                  onClick={() => setRecordPage(p => Math.max(1, p - 1))}
                  disabled={recordPage === 1}
                  className="px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  第 {recordPage} / {totalRecordPages} 页
                </span>
                <button
                  onClick={() => setRecordPage(p => Math.min(totalRecordPages, p + 1))}
                  disabled={recordPage === totalRecordPages}
                  className="px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDcaModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">定投设置</h3>
              <button
                onClick={() => setShowDcaModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">开启定投</span>
                <button
                  onClick={() => setDcaSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${dcaSettings.enabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${dcaSettings.enabled ? 'translate-x-7' : 'translate-x-1'}`}></span>
                </button>
              </div>
              
              {dcaSettings.enabled && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">定投方式</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDcaSettings(prev => ({ ...prev, type: 'amount' }))}
                        className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${dcaSettings.type === 'amount' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300'}`}
                      >
                        按金额定投
                      </button>
                      <button
                        onClick={() => setDcaSettings(prev => ({ ...prev, type: 'quantity' }))}
                        className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${dcaSettings.type === 'quantity' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300'}`}
                      >
                        按份额定投
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">定投周期</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { value: 'daily', label: '每日' },
                        { value: 'weekly', label: '每周' },
                        { value: 'biweekly', label: '每两周' },
                        { value: 'monthly', label: '每月' },
                      ].map(cycle => (
                        <button
                          key={cycle.value}
                          onClick={() => setDcaSettings(prev => ({ ...prev, cycle: cycle.value }))}
                          className={`px-2 py-1.5 text-xs rounded-lg border transition-colors ${dcaSettings.cycle === cycle.value ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300'}`}
                        >
                          {cycle.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {dcaSettings.type === 'amount' && (
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">定投金额（元）</label>
                      <input
                        type="number"
                        step="0.01"
                        value={dcaSettings.amount}
                        onChange={e => setDcaSettings(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                        placeholder="输入定投金额"
                      />
                    </div>
                  )}

                  {dcaSettings.type === 'quantity' && (
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">定投份额</label>
                      <input
                        type="number"
                        step="0.001"
                        value={dcaSettings.quantity}
                        onChange={e => setDcaSettings(prev => ({ ...prev, quantity: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                        placeholder="输入定投份额"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowDcaModal(false)}
                  className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => setShowDcaModal(false)}
                  className="flex-1 px-4 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRecognizeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">识别结果校验</h3>
              <button
                onClick={() => setShowRecognizeModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">请检查识别出的交易记录，确认无误后点击导入</p>
              <div className="space-y-3">
                {recognizedRecords.map((record, idx) => (
                  <div key={record.id} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">记录 {idx + 1}</span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${record.type === '建仓' ? 'bg-blue-100 text-blue-600' : record.type === '买入' ? 'bg-green-100 text-green-600' : record.type === '卖出' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {record.type}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <label className="text-gray-500 dark:text-gray-400 block">日期</label>
                        <input
                          type="date"
                          value={record.date}
                          onChange={e => setRecognizedRecords(prev => prev.map(r => r.id === record.id ? { ...r, date: e.target.value } : r))}
                          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                      <div className="col-span-3"></div>
                      <div className="col-span-2">
                        <label className="text-gray-500 dark:text-gray-400 block">确认金额</label>
                        <input
                          type="number"
                          step="0.01"
                          value={record.amount}
                          onChange={e => setRecognizedRecords(prev => prev.map(r => r.id === record.id ? { ...r, amount: e.target.value } : r))}
                          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-gray-500 dark:text-gray-400 block">确认份额</label>
                        <input
                          type="number"
                          step="0.001"
                          value={record.quantity}
                          onChange={e => setRecognizedRecords(prev => prev.map(r => r.id === record.id ? { ...r, quantity: e.target.value } : r))}
                          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-gray-500 dark:text-gray-400 block">确认净值</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={record.price}
                          onChange={e => setRecognizedRecords(prev => prev.map(r => r.id === record.id ? { ...r, price: e.target.value } : r))}
                          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-gray-500 dark:text-gray-400 block">手续费</label>
                        <input
                          type="number"
                          step="0.01"
                          value={record.fee}
                          onChange={e => setRecognizedRecords(prev => prev.map(r => r.id === record.id ? { ...r, fee: e.target.value } : r))}
                          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => setRecognizedRecords(prev => prev.filter(r => r.id !== record.id))}
                          className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="删除此条"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-slate-700">
              <button
                onClick={() => setRecognizedRecords(prev => [...prev, {
                  id: Date.now() + Math.random(),
                  type: '买入',
                  date: new Date().toISOString().split('T')[0],
                  time: '09:30',
                  price: '',
                  quantity: '',
                  amount: '',
                  fee: '',
                }])}
                className="w-full mb-3 px-4 py-2 text-sm border border-dashed border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors text-gray-500 dark:text-gray-400"
              >
                + 添加遗漏记录
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRecognizeModal(false)}
                  className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    const newRecords = recognizedRecords.map(r => ({
                      id: Date.now() + Math.random(),
                      type: r.type,
                      date: r.date,
                      time: r.time,
                      price: r.type === '分红' ? '-' : parseFloat(r.price) || 0,
                      quantity: r.type === '分红' ? 0 : parseFloat(r.quantity) || 0,
                      amount: parseFloat(r.amount) || 0,
                      fee: r.type === '分红' || r.fee === '-' ? '-' : parseFloat(r.fee) || 0,
                    }));
                    setTradeRecords(prev => {
                      const updatedRecords = [...prev, ...newRecords];
                      saveTradeRecords(updatedRecords);
                      return updatedRecords;
                    });
                    setShowRecognizeModal(false);
                    setRecordPage(1);
                  }}
                  className="flex-1 px-4 py-2 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                >
                  确认导入 ({recognizedRecords.length}条)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HoldingsSummaryCard({ summary }) {
  const isPos = summary.totalPnl >= 0;
  const isDayPos = summary.totalDailyPnl >= 0;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-soft border border-gray-100 dark:border-slate-700 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full p-1.5">
          <PieChart className="w-4 h-4" />
        </div>
        <span className="font-semibold text-gray-900 dark:text-white text-sm">筛选汇总</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center mb-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">当前总市值</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{formatNum(summary.totalMarketValue)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">持仓总成本</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{formatNum(summary.totalCost)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">持仓总盈亏</p>
          <p className={`text-sm font-bold tabular-nums ${isPos ? 'text-green-600' : 'text-red-500'}`}>
            {pnlSign(summary.totalPnl)}{formatNum(summary.totalPnl)}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">持仓总收益率</p>
          <p className={`text-sm font-bold tabular-nums ${isPos ? 'text-green-600' : 'text-red-500'}`}>
            {formatPercentage(summary.totalPnlRate)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">当日总盈亏</p>
          <p className={`text-sm font-bold tabular-nums ${isDayPos ? 'text-green-600' : 'text-red-500'}`}>
            {pnlSign(summary.totalDailyPnl)}{formatNum(summary.totalDailyPnl)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">当日总收益率</p>
          <p className={`text-sm font-bold tabular-nums ${isDayPos ? 'text-green-600' : 'text-red-500'}`}>
            {formatPercentage(summary.totalDailyPnlRate)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── 分页子组件 ──
function Pagination({ page, totalPages, totalCount, onPageChange, pageSize, onPageSizeChange, pageSizeOptions = [10, 20, 50, 100] }) {
  if (totalPages <= 1 && !onPageSizeChange) return null;
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        共 {totalCount} 条记录
      </div>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
            className="px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white cursor-pointer"
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>{size} 条/页</option>
            ))}
          </select>
        )}
        <button
          onClick={() => onPageChange(p => Math.max(1, p - 1))}
          disabled={page === 1}
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
            value={page}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) {
                onPageChange(Math.max(1, Math.min(totalPages, val)));
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) {
                  onPageChange(Math.max(1, Math.min(totalPages, val)));
                }
              }
            }}
            className="w-14 px-2 py-1.5 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
          />
          <span>/ {totalPages} 页</span>
        </div>
        <button
          onClick={() => onPageChange(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          下一页
        </button>
      </div>
    </div>
  );
}

const DEFAULT_COLUMNS = [
  { key: 'market', label: '市场', visible: true, align: 'left' },
  { key: 'currency', label: '货币', visible: true, align: 'left' },
  { key: 'assetKind', label: '资产种类', visible: false, align: 'left' },
  { key: 'assetType', label: '资产类型', visible: false, align: 'left' },
  { key: 'name', label: '资产名称', visible: true, align: 'left' },
  { key: 'code', label: '代码', visible: true, align: 'left' },
  { key: 'categoryL1', label: '一级分类', visible: false, align: 'left' },
  { key: 'categoryL2', label: '二级分类', visible: false, align: 'left' },
  { key: 'categoryL3', label: '三级分类', visible: false, align: 'left' },
  { key: 'categoryL4', label: '四级分类', visible: false, align: 'left' },
  { key: 'positionGroup', label: '持仓分组', visible: false, align: 'left' },
  { key: 'positionType', label: '持仓分类', visible: false, align: 'left' },
  { key: 'cost', label: '持仓成本', visible: true, align: 'right' },
  { key: 'quantity', label: '数量', visible: true, align: 'right' },
  { key: 'currentPrice', label: '现价', visible: true, align: 'right' },

  { key: 'holdingDays', label: '天数', visible: true, align: 'right' },
  { key: 'currentValue', label: '当前市值', visible: true, align: 'right', bold: true },
  { key: 'holdingPnl', label: '持仓盈亏', visible: true, align: 'right', bold: true, pnl: true },
  { key: 'holdingPnlRate', label: '持仓盈亏率', visible: true, align: 'right', pnl: true },
  { key: 'dailyPnl', label: '当日盈亏', visible: true, align: 'right', bold: true, pnl: true, indigo: true },
  { key: 'dailyPnlRate', label: '当日收益率', visible: true, align: 'right', pnl: true },
  { key: 'positionRatio', label: '仓位占比', visible: true, align: 'right' },
  { key: 'account', label: '所属账户', visible: true, align: 'left' },
  { key: 'tags', label: '标签', visible: false, align: 'left' },
];

// ── 分类表格子组件（含筛选+分页）──
function CategoryTable({
  categoryName,
  holdings,
  colorIdx,
  defaultPageSize = 10,
  onEdit,
  onDelete,
  onDetail,
  onAdd,
  marketOptions,
  currencyOptions,
  assetTypeOptions,
  assetClassOptions,
  positionGroupOptions = [],
  positionTypeOptions = [],
  allCategoryL2Options = [],
  marketGroups = [],
  tags = [],
  categoryL3CustomOptions = [],
  categoryL4Options = [],
}) {
  const [filterText, setFilterText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      const saved = localStorage.getItem(`finance_page_size_${categoryName}`);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load page size:', e);
    }
    return defaultPageSize;
  });
  const [filterAccount, setFilterAccount] = useState('');
  const [filterMarket, setFilterMarket] = useState('');
  const [filterCurrency, setFilterCurrency] = useState('');
  const [filterAssetKind, setFilterAssetKind] = useState('');

  const [filterAssetType, setFilterAssetType] = useState('');
  const [filterCategoryL1, setFilterCategoryL1] = useState('');
  const [filterCategoryL2, setFilterCategoryL2] = useState('');
  const [filterCategoryL3, setFilterCategoryL3] = useState('');
  const [filterCategoryL4, setFilterCategoryL4] = useState('');
  const [filterPositionGroup, setFilterPositionGroup] = useState('');
  const [filterPositionType, setFilterPositionType] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showFilterSettings, setShowFilterSettings] = useState(false);
  const [columnSettingsPosition, setColumnSettingsPosition] = useState('bottom');
  const columnSettingsRef = useRef(null);
  const filterSettingsRef = useRef(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBatchEdit, setShowBatchEdit] = useState(false);

  const DEFAULT_FILTERS = [
    { key: 'market', label: '市场', visible: true },
    { key: 'currency', label: '货币', visible: false },
    { key: 'assetKind', label: '资产种类', visible: false },
    { key: 'assetType', label: '资产类型', visible: false },
    { key: 'categoryL1', label: '一级分类', visible: true },
    { key: 'categoryL2', label: '二级分类', visible: true },
    { key: 'categoryL3', label: '三级分类', visible: true },
    { key: 'categoryL4', label: '四级分类', visible: false },
    { key: 'positionGroup', label: '持仓分组', visible: true },
    { key: 'positionType', label: '持仓分类', visible: true },
    { key: 'account', label: '所属账户', visible: true },
  ];

  const [filterSettings, setFilterSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(`finance_filter_settings_${categoryName}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Merge saved settings with defaults to include any new fields
          const merged = DEFAULT_FILTERS.map(defaultFilter => {
            const savedFilter = parsed.find(f => f.key === defaultFilter.key);
            return savedFilter ? { ...defaultFilter, visible: savedFilter.visible } : defaultFilter;
          });
          return merged;
        }
      }
    } catch (e) { console.error(e); }
    return DEFAULT_FILTERS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(`finance_filter_settings_${categoryName}`, JSON.stringify(filterSettings));
    } catch (e) { console.error(e); }
  }, [filterSettings, categoryName]);

  const toggleFilter = (key) => {
    setFilterSettings(prev => prev.map(f =>
      f.key === key ? { ...f, visible: !f.visible } : f
    ));
  };

  const resetFiltersSettings = () => {
    setFilterSettings([...DEFAULT_FILTERS]);
  };

  const getFilteredCurrencies = (market) => {
    if (!market) return currencyOptions;
    switch (market) {
      case '国内市场': return ['CNY'];
      case '港股市场': return ['HKD'];
      case '美股市场': return ['USD'];
      default: return currencyOptions;
    }
  };
  const [columns, setColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(`finance_column_settings_${categoryName}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter(c => c.key !== 'avgBuyPrice');
          const merged = DEFAULT_COLUMNS.map(def => {
            const savedCol = filtered.find(c => c.key === def.key);
            return savedCol || def;
          });
          return merged;
        }
      }
    } catch (e) {
      console.error('Failed to load column settings:', e);
    }
    return [...DEFAULT_COLUMNS];
  });

  useEffect(() => {
    try {
      localStorage.setItem(`finance_column_settings_${categoryName}`, JSON.stringify(columns));
    } catch (e) {
      console.error('Failed to save column settings:', e);
    }
  }, [columns, categoryName]);

  useEffect(() => {
    if (!showColumnSettings) return;
    const handleClickOutside = (e) => {
      if (columnSettingsRef.current && !columnSettingsRef.current.contains(e.target)) {
        setShowColumnSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColumnSettings]);

  useEffect(() => {
    if (!showFilterSettings) return;
    const handleClickOutside = (e) => {
      if (filterSettingsRef.current && !filterSettingsRef.current.contains(e.target)) {
        setShowFilterSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterSettings]);

  useEffect(() => {
    if (!showColumnSettings || !columnSettingsRef.current) return;
    const button = columnSettingsRef.current.querySelector('button');
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const panelHeight = 400;
    const bottomSpace = window.innerHeight - rect.bottom;
    setColumnSettingsPosition(bottomSpace > panelHeight ? 'bottom' : 'top');
  }, [showColumnSettings]);

  useEffect(() => {
    try {
      localStorage.setItem(`finance_page_size_${categoryName}`, String(pageSize));
    } catch (e) {
      console.error('Failed to save page size:', e);
    }
  }, [pageSize, categoryName]);

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(1);
  };

  const visibleColumns = useMemo(() => columns.filter(c => c.visible), [columns]);

  const toggleColumn = (key) => {
    setColumns(prev => prev.map(c =>
      c.key === key ? { ...c, visible: !c.visible } : c
    ));
  };

  const moveColumn = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === columns.length - 1) return;
    const newColumns = [...columns];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newColumns[index], newColumns[targetIndex]] = [newColumns[targetIndex], newColumns[index]];
    setColumns(newColumns);
  };

  const resetColumns = () => {
    setColumns([...DEFAULT_COLUMNS]);
  };

  const renderCell = (h, col) => {
    const val = h[col.key];
    switch (col.key) {
      case 'market':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-500">{val || '-'}</span>;
      case 'currency':
        return val || '-';
      case 'assetType':
      case 'categoryL1':
      case 'categoryL2':
      case 'categoryL3':
      case 'categoryL4':
      case 'positionGroup':
      case 'positionType':
        return val || '-';
      case 'name':
        return <span className="font-medium text-gray-900 dark:text-white">{val || '-'}</span>;
      case 'code':
        return <span className="font-mono">{val || '-'}</span>;
      case 'cost':
      case 'quantity':
      case 'currentValue':
        return formatNum(val);
      case 'currentPrice':
        let colorClass = '';
        if (h.priceChange === 'up') colorClass = 'text-green-600 dark:text-green-400';
        else if (h.priceChange === 'down') colorClass = 'text-red-500 dark:text-red-400';
        return <span className={colorClass}>{formatNum(val)}</span>;
      case 'holdingDays':
        return computeHoldingDays(h) || '-';
      case 'holdingPnl':
      case 'dailyPnl':
        return <span className={pnlClass(val)}>{pnlSign(parseFloat(val))}{formatNum(val)}</span>;
      case 'holdingPnlRate':
      case 'dailyPnlRate':
        return <span className={pnlClass(val)}>{formatPercentage(val)}</span>;
      case 'positionRatio':
        const ratio = parseFloat(val);
        return <span className="text-gray-600 dark:text-gray-400">{isNaN(ratio) ? '—' : `${ratio.toFixed(2)}%`}</span>;
      case 'account':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">{val || '-'}</span>;
      case 'tags':
        return val && Array.isArray(val) ? val.join(', ') : '-';
      default:
        return val || '-';
    }
  };

  const uniqueAccounts = useMemo(() =>
    [...new Set(holdings.map(h => h.account).filter(Boolean))].sort(),
    [holdings]
  );
  const uniqueMarkets = useMemo(() =>
    [...new Set(holdings.map(h => h.market).filter(Boolean))].sort(),
    [holdings]
  );
  const uniqueCurrencies = useMemo(() =>
    [...new Set(holdings.map(h => h.currency).filter(Boolean))].sort(),
    [holdings]
  );
  const uniqueAssetTypes = useMemo(() =>
    [...new Set(holdings.map(h => h.assetType).filter(Boolean))].sort(),
    [holdings]
  );
  const uniqueCategoryL1 = useMemo(() =>
    [...new Set(holdings.map(h => h.categoryL1 || h.category).filter(Boolean))].sort(),
    [holdings]
  );
  const uniqueCategoryL2 = useMemo(() =>
    [...new Set(holdings.map(h => h.categoryL2).filter(Boolean))].sort(),
    [holdings]
  );
  const uniquePositionGroups = useMemo(() =>
    [...new Set(holdings.map(h => h.positionGroup).filter(Boolean))].sort(),
    [holdings]
  );
  const uniquePositionTypes = useMemo(() =>
    [...new Set(holdings.map(h => h.positionType).filter(Boolean))].sort(),
    [holdings]
  );
  const uniqueTags = useMemo(() => {
    return [...tags].sort();
  }, [tags]);

  const filtered = useMemo(() => {
    return holdings.filter(h => {
      if (filterText.trim()) {
        const q = filterText.toLowerCase();
        const matchText =
          (h.name || '').toLowerCase().includes(q) ||
          (h.code || '').toLowerCase().includes(q) ||
          (h.assetType || '').toLowerCase().includes(q) ||
          (h.positionGroup || '').toLowerCase().includes(q);
        if (!matchText) return false;
      }
      if (filterAccount && h.account !== filterAccount) return false;
      if (filterMarket && h.market !== filterMarket) return false;
      if (filterCurrency && h.currency !== filterCurrency) return false;
      if (filterAssetKind && h.assetKind !== filterAssetKind) return false;
      if (filterAssetType && h.assetType !== filterAssetType) return false;
      if (filterCategoryL1 && (h.categoryL1 || h.category) !== filterCategoryL1) return false;
      if (filterCategoryL2 && h.categoryL2 !== filterCategoryL2) return false;
      if (filterCategoryL3 && h.categoryL3 !== filterCategoryL3) return false;
      if (filterCategoryL4 && h.categoryL4 !== filterCategoryL4) return false;
      if (filterPositionGroup && h.positionGroup !== filterPositionGroup) return false;
      if (filterPositionType && h.positionType !== filterPositionType) return false;
      if (filterTag && !(h.tags?.includes(filterTag))) return false;
      return true;
    });
  }, [holdings, filterText, filterAccount, filterMarket, filterCurrency, filterAssetKind, filterAssetType, filterCategoryL1, filterCategoryL2, filterCategoryL3, filterCategoryL4, filterPositionGroup, filterPositionType, filterTag]);

  const filteredWithRatio = useMemo(() => {
    const totalValue = filtered.reduce((sum, h) => sum + (parseFloat(h.currentValue) || parseFloat(h.balance) || 0), 0);
    return filtered.map(h => ({
      ...h,
      positionRatio: totalValue > 0 ? ((parseFloat(h.currentValue) || parseFloat(h.balance) || 0) / totalValue) * 100 : 0,
    }));
  }, [filtered]);

  const resetFilters = () => {
    setFilterText('');
    setFilterAccount('');
    setFilterMarket('');
    setFilterCurrency('');
    setFilterAssetType('');
    setFilterCategoryL1('');
    setFilterCategoryL2('');
    setFilterPositionGroup('');
    setFilterPositionType('');
    setFilterTag('');
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filteredWithRatio.slice((safePage - 1) * pageSize, safePage * pageSize);

  // 分类汇总行（基于筛选后的数据）
  const summary = useMemo(() => {
    const totalValue = filtered.reduce((s, h) => s + (parseFloat(h.currentValue) || parseFloat(h.balance) || 0), 0);
    const totalCost = filtered.reduce((s, h) => s + (parseFloat(h.cost) || 0), 0);
    const totalPnl = filtered.reduce((s, h) => s + (parseFloat(h.holdingPnl) || 0), 0);
    const totalDailyPnl = filtered.reduce((s, h) => s + (parseFloat(h.dailyPnl) || 0), 0);
    return {
      value: totalValue,
      cost: totalCost,
      pnl: totalPnl,
      pnlRate: totalCost > 0 ? (totalValue - totalCost) / totalCost * 100 : 0,
      dailyPnl: totalDailyPnl,
      dailyPnlRate: totalValue > 0 ? (totalDailyPnl / totalValue) * 100 : 0,
    };
  }, [filtered]);

  // 筛选汇总（基于 filtered 数据）
  const filteredSummary = useMemo(() => {
    const totalCost = filtered.reduce((sum, a) => sum + (parseFloat(a.cost) || 0), 0);
    const totalMarketValue = filtered.reduce((sum, a) => sum + (parseFloat(a.currentValue) || parseFloat(a.balance) || 0), 0);
    const totalPnl = filtered.reduce((sum, a) => sum + (parseFloat(a.holdingPnl) || 0), 0);
    const totalDailyPnl = filtered.reduce((sum, a) => sum + (parseFloat(a.dailyPnl) || 0), 0);
    return {
      totalCost,
      totalMarketValue,
      totalPnl,
      totalPnlRate: totalCost > 0 ? (totalMarketValue - totalCost) / totalCost * 100 : 0,
      totalDailyPnl,
      totalDailyPnlRate: totalMarketValue > 0 ? (totalDailyPnl / totalMarketValue) * 100 : 0,
    };
  }, [filtered]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-gray-100 dark:border-slate-700">
      {/* 筛选汇总卡片 */}
      {filtered.length > 0 && (
        <HoldingsSummaryCard summary={filteredSummary} />
      )}

      {/* 筛选栏 */}
      <div className="p-4 pb-3 space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* 所属账户下拉 */}
          {filterSettings.find(f => f.key === 'account')?.visible && uniqueAccounts.length > 0 && (
            <select
              value={filterAccount}
              onChange={e => { setFilterAccount(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部账户</option>
              {uniqueAccounts.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}

          {/* 市场 */}
          {filterSettings.find(f => f.key === 'market')?.visible && (
            <select
              value={filterMarket}
              onChange={e => { setFilterMarket(e.target.value); setFilterCurrency(''); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部市场</option>
              {marketGroups.map(g => (
                g.options.length === 1
                  ? <option key={g.options[0]} value={g.options[0]}>{g.options[0]}</option>
                  : <optgroup key={g.label} label={g.label}>
                    {g.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </optgroup>
              ))}
            </select>
          )}

          {/* 一级分类 */}
          {filterSettings.find(f => f.key === 'categoryL1')?.visible && (
            <select
              value={filterCategoryL1}
              onChange={e => { setFilterCategoryL1(e.target.value); setFilterCategoryL2(''); setFilterCategoryL3(''); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部一级分类</option>
              {assetClassOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {/* 二级分类 */}
          {filterSettings.find(f => f.key === 'categoryL2')?.visible && (
            <select
              value={filterCategoryL2}
              onChange={e => { setFilterCategoryL2(e.target.value); setFilterCategoryL3(''); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部二级分类</option>
              {allCategoryL2Options.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {/* 三级分类 */}
          {filterSettings.find(f => f.key === 'categoryL3')?.visible && (
            <select
              value={filterCategoryL3}
              onChange={e => { setFilterCategoryL3(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部三级分类</option>
              {['场内', '场外', ...categoryL3CustomOptions].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {/* 四级分类 */}
          {filterSettings.find(f => f.key === 'categoryL4')?.visible && (
            <select
              value={filterCategoryL4}
              onChange={e => { setFilterCategoryL4(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部四级分类</option>
              {[...new Set(Object.values(categoryL4Options).flat())].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {/* 持仓分组 */}
          {filterSettings.find(f => f.key === 'positionGroup')?.visible && (
            <select
              value={filterPositionGroup}
              onChange={e => { setFilterPositionGroup(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部持仓分组</option>
              {positionGroupOptions.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          )}

          {/* 持仓分类 */}
          {filterSettings.find(f => f.key === 'positionType')?.visible && (
            <select
              value={filterPositionType}
              onChange={e => { setFilterPositionType(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部持仓分类</option>
              {positionTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}

          {/* 所属账户 */}
          {filterSettings.find(f => f.key === 'account')?.visible && (
            <select
              value={filterAccount}
              onChange={e => { setFilterAccount(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部账户</option>
              {uniqueAccounts.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}

          {/* 货币（与市场联动） */}
          {filterSettings.find(f => f.key === 'currency')?.visible && (
            <select
              value={filterCurrency}
              onChange={e => { setFilterCurrency(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部货币</option>
              {getFilteredCurrencies(filterMarket).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {/* 资产种类 */}
          {filterSettings.find(f => f.key === 'assetKind')?.visible && (
            <select
              value={filterAssetKind}
              onChange={e => { setFilterAssetKind(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部资产种类</option>
              {assetKindOptions.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          )}

          {/* 资产类型 */}
          {filterSettings.find(f => f.key === 'assetType')?.visible && (
            <select
              value={filterAssetType}
              onChange={e => { setFilterAssetType(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部资产类型</option>
              {assetTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}

          {/* 标签 */}
          {filterSettings.find(f => f.key === 'tag')?.visible && uniqueTags.length > 0 && (
            <select
              value={filterTag}
              onChange={e => { setFilterTag(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部标签</option>
              {uniqueTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}

          {/* 筛选设置按钮 */}
          <div className="relative" ref={filterSettingsRef}>
            <button
              onClick={() => setShowFilterSettings(!showFilterSettings)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border rounded-lg transition-colors ${
                showFilterSettings
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                  : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              筛选设置
            </button>

            {/* 筛选设置面板 */}
            {showFilterSettings && (
              <div className={`absolute right-0 mt-1 z-50 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg ${
                columnSettingsPosition === 'bottom' ? 'top-full' : 'bottom-full'
              }`}>
                <div className="p-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">筛选设置</span>
                  <button onClick={resetFiltersSettings} className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">重置</button>
                </div>
                <div className="p-2 space-y-1 max-h-[60vh] overflow-y-auto">
                  {filterSettings.map(f => (
                    <label key={f.key} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded cursor-pointer">
                      <span className="text-xs text-gray-700 dark:text-gray-300">{f.label}</span>
                      <input
                        type="checkbox"
                        checked={f.visible}
                        onChange={() => toggleFilter(f.key)}
                        className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 列设置按钮 */}
          <div className="relative" ref={columnSettingsRef}>
            <button
              onClick={() => setShowColumnSettings(!showColumnSettings)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border rounded-lg transition-colors ${
                showColumnSettings
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                  : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              列设置
            </button>

            {/* 列设置面板 */}
            {showColumnSettings && (
              <div className={`absolute right-0 mt-1 z-50 w-72 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg ${
                columnSettingsPosition === 'bottom' ? 'top-full' : 'bottom-full'
              }`}>
                <div className="p-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">列设置</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={resetColumns}
                      className="px-2 py-0.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                    >
                      默认
                    </button>
                    <button
                      onClick={() => setShowColumnSettings(false)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-1">
                  {columns.map((col, index) => (
                    <div
                      key={col.key}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={col.visible}
                        onChange={() => toggleColumn(col.key)}
                        className="w-3.5 h-3.5 rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">
                        {col.label}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => moveColumn(index, 'up')}
                          disabled={index === 0}
                          className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveColumn(index, 'down')}
                          disabled={index === columns.length - 1}
                          className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 搜索框 */}
          <div className="relative w-44 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={filterText}
              onChange={e => { setFilterText(e.target.value); setPage(1); }}
              placeholder="搜索名称/代码/类型..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {/* 批量编辑按钮 */}
          <button
            onClick={() => { setShowBatchEdit(!showBatchEdit); setSelectedIds(new Set()); }}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-xl font-medium transition-all ${
              showBatchEdit
                ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" /> 批量编辑
          </button>

          {/* 编辑选中按钮 */}
          {showBatchEdit && selectedIds.size > 0 && (
            <button
              onClick={() => setShowBatchEditModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 active:scale-[0.97] transition-all"
            >
              <Check className="w-3.5 h-3.5" /> 编辑选中 ({selectedIds.size})
            </button>
          )}

          {/* 新增按钮 */}
          {onAdd && (
            <button onClick={onAdd}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 active:scale-[0.97] transition-all">
              <Plus className="w-3.5 h-3.5" /> 新增
            </button>
          )}
        </div>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto px-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-700 text-gray-500">
              {showBatchEdit && (
                <th className="py-2 px-1.5 font-medium text-center w-10">
                  <input
                    type="checkbox"
                    checked={paged.length > 0 && paged.every(h => selectedIds.has(h.id))}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(paged.map(h => h.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
              )}
              {visibleColumns.map(col => (
                <th
                  key={col.key}
                  className={`py-2 px-1.5 font-medium whitespace-nowrap ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  } ${col.bold ? 'font-semibold text-gray-700 dark:text-gray-300' : ''} ${
                    col.indigo ? 'text-indigo-600 dark:text-indigo-400' : ''
                  }`}
                >
                  {col.label}
                </th>
              ))}
              <th className="py-2 px-1.5 font-medium whitespace-nowrap text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((h, i) => (
              <tr key={h.id || i} className="border-b border-gray-50 dark:border-slate-700/30 hover:bg-gray-50/80 dark:hover:bg-slate-700/20">
                {showBatchEdit && (
                  <td className="py-2 px-1.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(h.id)}
                        onChange={e => {
                          const newSet = new Set(selectedIds);
                          if (e.target.checked) newSet.add(h.id);
                          else newSet.delete(h.id);
                          setSelectedIds(newSet);
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-gray-400">{(safePage - 1) * pageSize + i + 1}</span>
                    </div>
                  </td>
                )}
                {visibleColumns.map(col => (
                  <td
                    key={col.key}
                    className={`py-2 px-1.5 ${
                      col.align === 'right' ? 'text-right tabular-nums' : ''
                    } ${col.bold ? 'font-semibold' : ''} ${
                      col.pnl ? pnlClass(h[col.key]) : ''
                    } ${col.indigo ? 'text-indigo-600 dark:text-indigo-400' : ''} ${
                      col.key === 'currentValue' ? 'text-gray-900 dark:text-white' : ''
                    }`}
                  >
                    {col.key === 'currentValue'
                      ? formatNum(h.currentValue || h.balance)
                      : renderCell(h, col)}
                  </td>
                ))}
                <td className="py-2 px-1.5">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => onEdit && onEdit(h)}
                      className="p-1 rounded text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="编辑"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDetail && onDetail(h)}
                      className="px-1.5 py-0.5 text-xs rounded text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                      title="详情"
                    >
                      明细
                    </button>
                    <button
                      onClick={() => onDelete && onDelete(h.id)}
                      className="p-1 rounded text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length + 2} className="py-8 text-center text-gray-400 text-xs">
                  {filterText ? '无匹配结果' : '暂无数据'}
                </td>
              </tr>
            )}
          </tbody>
          {/* 汇总行 */}
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 dark:border-slate-600 bg-gray-50/80 dark:bg-slate-700/30 font-semibold">
                {showBatchEdit && <td className="py-2 px-1.5"></td>}
                {visibleColumns.map((col, idx) => {
                  if (idx === 0) {
                    return (
                      <td
                        key={col.key}
                        className="py-2 px-1.5 text-xs text-gray-500"
                      >
                        合计 ({filtered.length}项)
                      </td>
                    );
                  }
                  if (col.key === 'cost') {
                    return (
                      <td key={col.key} className="py-2 px-1.5 text-right tabular-nums">
                        {formatNum(summary.cost)}
                      </td>
                    );
                  }
                  if (col.key === 'currentValue') {
                    return (
                      <td key={col.key} className="py-2 px-1.5 text-right tabular-nums text-gray-900 dark:text-white">
                        {formatNum(summary.value)}
                      </td>
                    );
                  }
                  if (col.key === 'holdingPnl') {
                    return (
                      <td key={col.key} className={`py-2 px-1.5 text-right tabular-nums ${pnlClass(summary.pnl)}`}>
                        {pnlSign(summary.pnl)}{formatNum(summary.pnl)}
                      </td>
                    );
                  }
                  if (col.key === 'holdingPnlRate') {
                    return (
                      <td key={col.key} className={`py-2 px-1.5 text-right tabular-nums ${pnlClass(summary.pnlRate)}`}>
                        {summary.value > 0 ? formatPercentage(summary.pnlRate) : '—'}
                      </td>
                    );
                  }
                  if (col.key === 'dailyPnl') {
                    return (
                      <td key={col.key} className={`py-2 px-1.5 text-right tabular-nums font-semibold ${pnlClass(summary.dailyPnl)}`}>
                        {pnlSign(summary.dailyPnl)}{formatNum(summary.dailyPnl)}
                      </td>
                    );
                  }
                  if (col.key === 'dailyPnlRate') {
                    return (
                      <td key={col.key} className={`py-2 px-1.5 text-right tabular-nums ${pnlClass(summary.dailyPnlRate)}`}>
                        {summary.value > 0 ? formatPercentage(summary.dailyPnlRate) : '—'}
                      </td>
                    );
                  }
                  return <td key={col.key} className="py-2 px-1.5"></td>;
                })}
                <td className="py-2 px-1.5"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Pagination
        page={safePage}
        totalPages={totalPages}
        totalCount={filtered.length}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}

// ═══════════════════════════════════════════
//  主组件
// ═══════════════════════════════════════════

export default function Finance() {
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [quotesMap, setQuotesMap] = useState({});
  const [quotesLoading, setQuotesLoading] = useState(false);

  // 标签管理状态
  const [books, setBooks] = useState([]);
  const [tags, setTags] = useState([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagToEdit, setTagToEdit] = useState(null);
  const [newTagName, setNewTagName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [categoryL3CustomOptions, setCategoryL3CustomOptions] = useState([]);
  const [showCategoryL3Modal, setShowCategoryL3Modal] = useState(false);
  const [categoryL3ToEdit, setCategoryL3ToEdit] = useState(null);
  const [newCategoryL3Name, setNewCategoryL3Name] = useState('');

  const [categoryL4Options, setCategoryL4Options] = useState({});
  const [showCategoryL4Modal, setShowCategoryL4Modal] = useState(false);
  const [categoryL4ToEdit, setCategoryL4ToEdit] = useState(null);
  const [newCategoryL4Name, setNewCategoryL4Name] = useState('');

  // 资产类型自定义管理
  const DEFAULT_ASSET_TYPE_OPTIONS = ['股票', '基金', '债券', '现金', '期货', '期权', '外汇', '保险', '房产', '实体投资', '黄金', '白银', '原油', '数字货币', '银行理财', '其他'];
  const [assetTypeOptions, setAssetTypeOptions] = useState(() => {
    const saved = localStorage.getItem('finance_asset_type_options');
    return saved ? JSON.parse(saved) : DEFAULT_ASSET_TYPE_OPTIONS;
  });
  const [showAssetTypeModal, setShowAssetTypeModal] = useState(false);
  const [assetTypeToEdit, setAssetTypeToEdit] = useState(null);
  const [newAssetTypeName, setNewAssetTypeName] = useState('');

  // 资产种类自定义管理
  const DEFAULT_ASSET_KIND_OPTIONS = ['流动资产', '非流动资产'];
  const [assetKindOptions, setAssetKindOptions] = useState(() => {
    const saved = localStorage.getItem('finance_asset_kind_options');
    return saved ? JSON.parse(saved) : DEFAULT_ASSET_KIND_OPTIONS;
  });

  // 一级分类自定义管理（从资产分类模块动态获取）
  const DEFAULT_CATEGORY_L1_OPTIONS = ['权益类', '债权类', '现金类', '商品类', '分红类', '固收类', '另类投资'];
  const [categoryL1Options, setCategoryL1Options] = useState(DEFAULT_CATEGORY_L1_OPTIONS);

  // 当 assetClasses 数据加载后，动态更新一级分类选项
  useEffect(() => {
    const assetClassNames = stateData?.assetClasses?.map(c => c.name)?.filter(Boolean);
    if (assetClassNames && assetClassNames.length > 0) {
      setCategoryL1Options(assetClassNames);
    } else {
      const saved = localStorage.getItem('finance_category_l1_options');
      setCategoryL1Options(saved ? JSON.parse(saved) : DEFAULT_CATEGORY_L1_OPTIONS);
    }
  }, [stateData?.assetClasses]);
  const [showCategoryL1Modal, setShowCategoryL1Modal] = useState(false);
  const [categoryL1ToEdit, setCategoryL1ToEdit] = useState(null);
  const [newCategoryL1Name, setNewCategoryL1Name] = useState('');

  // 二级分类自定义管理（按一级分类分组）
  const [categoryL2OptionsMap, setCategoryL2OptionsMap] = useState(() => {
    const saved = localStorage.getItem('finance_category_l2_options');
    if (saved) return JSON.parse(saved);
    return {
      '权益类': ['A股', '港股', '美股', '其他'],
      '债权类': ['A股', '中债', '美债', '其他'],
      '现金类': ['活期存款', '定期存款', 'A股', '其他'],
      '商品类': ['A股', '其他'],
      '分红类': ['A股', '固定投资', '其他'],
      '固收类': ['A股', '其他'],
      '另类投资': ['A股', '其他'],
    };
  });
  const [showCategoryL2Modal, setShowCategoryL2Modal] = useState(false);
  const [categoryL2ToEdit, setCategoryL2ToEdit] = useState(null);
  const [newCategoryL2Name, setNewCategoryL2Name] = useState('');

  // 三级分类自定义管理（按一级+二级分类分组）
  const [categoryL3OptionsMap, setCategoryL3OptionsMap] = useState(() => {
    const saved = localStorage.getItem('finance_category_l3_options');
    if (saved) return JSON.parse(saved);
    return {};
  });

  const DEFAULT_POSITION_GROUP_OPTIONS = ['核心仓位', '卫星仓位', '观察仓位', '套利仓位', '现金仓位'];
  const [positionGroupOptions, setPositionGroupOptions] = useState(DEFAULT_POSITION_GROUP_OPTIONS);
  const [showPositionGroupModal, setShowPositionGroupModal] = useState(false);
  const [positionGroupToEdit, setPositionGroupToEdit] = useState(null);
  const [newPositionGroupName, setNewPositionGroupName] = useState('');

  // 批量编辑状态
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [batchEditData, setBatchEditData] = useState({
    market: '',
    currency: '',
    assetType: '',
    account: '',
    categoryL1: '',
    categoryL2: '',
    categoryL3: '',
    positionGroup: '',
    positionType: '',
    tag: ''
  });

  const DEFAULT_POSITION_TYPE_OPTIONS = ['核心股票仓位', '成长股仓位', '价值股仓位', 'ETF仓位', '基金定投', '打新仓位', '波段操作', '其他'];
  const [positionTypeOptions, setPositionTypeOptions] = useState(DEFAULT_POSITION_TYPE_OPTIONS);
  const [showPositionTypeModal, setShowPositionTypeModal] = useState(false);
  const [positionTypeToEdit, setPositionTypeToEdit] = useState(null);
  const [newPositionTypeName, setNewPositionTypeName] = useState('');

  // 新增弹窗表单状态
  const [newAccount, setNewAccount] = useState({
    market: '国内市场',
    currency: 'CNY',
    assetKind: '',
    assetType: '股票',
    account: '',
    categoryL1: '',
    categoryL2: '',
    categoryL3: '',
    positionGroup: '',
    positionType: '',
    name: '',
    code: '',
    cost: '',
    quantity: '',
    currentPrice: '',
    prevPrice: '',
    priceDate: '',
    avgBuyPrice: '',
    holdingDays: '',
    holdingPnl: '',
    holdingPnlRate: '',
    dailyPnl: '',
    dailyPnlRate: '',
    currentValue: '',
    tags: '',
  });

  // 自动计算当前市值
  useEffect(() => {
    const price = parseFloat(newAccount.currentPrice);
    const qty = parseFloat(newAccount.quantity);
    let newValue = '';
    if (!isNaN(price) && !isNaN(qty) && price > 0 && qty > 0) {
      newValue = (price * qty).toFixed(2);
    }
    setNewAccount(prev => {
      if (prev.currentValue === newValue) return prev;
      return { ...prev, currentValue: newValue };
    });
  }, [newAccount.currentPrice, newAccount.quantity]);

  const [saving, setSaving] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);

  const [lookupResults, setLookupResults] = useState([]);
  const [showLookupDropdown, setShowLookupDropdown] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const lookupTimerRef = useRef(null);

  const { accounts = [], assetClasses = [], financeAssets = [] } = stateData || {};

  // 页面级分页（账户本区域）
  const [accountBookPage, setAccountBookPage] = useState(1);
  const ACCOUNTS_PER_PAGE = 6;

  useEffect(() => {
    loadData();
    loadBooksAndTags();
    const saved = localStorage.getItem('finance_categoryL3_options');
    if (saved) {
      try {
        setCategoryL3CustomOptions(JSON.parse(saved));
      } catch {
        setCategoryL3CustomOptions([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('finance_categoryL3_options', JSON.stringify(categoryL3CustomOptions));
  }, [categoryL3CustomOptions]);

  useEffect(() => {
    const saved = localStorage.getItem('finance_categoryL4_options');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCategoryL4Options(typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {});
      } catch {
        setCategoryL4Options({});
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('finance_categoryL4_options', JSON.stringify(categoryL4Options));
  }, [categoryL4Options]);

  useEffect(() => {
    const saved = localStorage.getItem('finance_position_group_options');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPositionGroupOptions(parsed);
        }
      } catch {
        setPositionGroupOptions(DEFAULT_POSITION_GROUP_OPTIONS);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('finance_position_group_options', JSON.stringify(positionGroupOptions));
  }, [positionGroupOptions]);

  useEffect(() => {
    const saved = localStorage.getItem('finance_position_type_options');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPositionTypeOptions(parsed);
        }
      } catch {
        setPositionTypeOptions(DEFAULT_POSITION_TYPE_OPTIONS);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('finance_position_type_options', JSON.stringify(positionTypeOptions));
  }, [positionTypeOptions]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchState();
      setStateData(data);
      const financeAssetsData = data?.financeAssets || [];
      if (financeAssetsData.length > 0) {
        loadQuotes(financeAssetsData);
        loadFundNav(financeAssetsData, data);
      }
    } catch (err) {
      console.error('Failed to load finance data:', err);
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadQuotes = async (financeAssetsData) => {
    if (!financeAssetsData || financeAssetsData.length === 0) return;
    const codes = financeAssetsData
      .filter(a => a.code)
      .map(a => ({ code: a.code, market: a.market || '国内市场' }));
    if (codes.length === 0) return;
    setQuotesLoading(true);
    try {
      const quotes = await fetchFinanceQuotes(codes);
      const map = {};
      quotes.forEach(q => {
        if (q && q.code) {
          map[q.code] = q;
        }
      });
      setQuotesMap(map);
    } catch (err) {
      console.error('Failed to load quotes:', err);
    } finally {
      setQuotesLoading(false);
    }
  };

  // 天天基金网：场外基金净值自动获取
  const loadFundNav = async (financeAssetsData, currentState) => {
    if (!financeAssetsData || financeAssetsData.length === 0) return;
    const fundItems = financeAssetsData.filter(a => {
      if (!a.code || !/^\d{6}$/.test(String(a.code).trim())) return false;
      // 场外基金（包含 债权类/场外、商品类/场外 等任意一级分类下三级为场外的基金）
      return a.categoryL3 === '场外' || (!a.categoryL3 && a.market === '场外基金');
    });
    if (fundItems.length === 0) return;
    try {
      const codes = fundItems.map(a => ({ code: a.code }));
      const funds = await fetchFundNav(codes);
      if (!funds || funds.length === 0) return;
      let changed = false;
      const updatedAssets = (currentState?.financeAssets || []).map(a => {
        const fund = funds.find(f => f.code === a.code);
        if (!fund) return a;
        const newNav = Number.isFinite(Number(fund.nav)) ? Number(fund.nav) : null;
        const newPrevNav = Number.isFinite(Number(fund.prevNav)) ? Number(fund.prevNav) : null;
        const newDate = fund.navDate || a.priceDate || '';
        const newChangePct = Number.isFinite(Number(fund.dailyChangePct)) ? Number(fund.dailyChangePct) : null;
        // 仅在 API 返回有效数据时更新
        if (newNav == null && newPrevNav == null) return a;
        changed = true;
        return {
          ...a,
          currentPrice: newNav != null ? String(newNav) : a.currentPrice,
          prevPrice: newPrevNav != null ? String(newPrevNav) : a.prevPrice,
          priceDate: newDate,
          dailyChangePct: newChangePct != null ? newChangePct : a.dailyChangePct,
        };
      });
      if (!changed) return;
      const newState = { ...(currentState || {}), financeAssets: updatedAssets };
      setStateData(newState);
      try {
        await saveState(newState);
      } catch (e) {
        console.warn('保存基金净值失败:', e);
      }
    } catch (err) {
      console.error('Failed to load fund nav:', err);
    }
  };

  const loadBooksAndTags = async () => {
    try {
      const booksData = await fetchBooks();
      setBooks(booksData || []);
      // 从账本中提取所有唯一的标签
      const allTags = new Set();
      booksData?.forEach(book => {
        if (book.tags && Array.isArray(book.tags)) {
          book.tags.forEach(tag => allTags.add(tag));
        }
      });
      setTags(Array.from(allTags).sort());
    } catch (err) {
      console.error('Failed to load books and tags:', err);
    }
  };

  const handleSaveAccount = async () => {
    if (!newAccount.name || !newAccount.code || !newAccount.cost || !newAccount.quantity) return;
    setSaving(true);
    try {
      const _costPrice = parseFloat(newAccount.cost) || 0;
      const _quantity = parseFloat(newAccount.quantity) || 0;
      const _currentPrice = parseFloat(newAccount.currentPrice) || 0;
      const _prevPrice = parseFloat(newAccount.prevPrice) || 0;
      const _unitPnl = _currentPrice - _costPrice;
      const _holdingPnl = Math.round(_unitPnl * _quantity * 100) / 100;
      const _holdingPnlRate = _costPrice > 0 ? Math.round((_unitPnl / _costPrice) * 100 * 100) / 100 : 0;
      const _dailyPnl = _prevPrice > 0 ? Math.round((_currentPrice - _prevPrice) * _quantity * 100) / 100 : 0;
      const _dailyPnlRate = _prevPrice > 0 ? Math.round(((_currentPrice - _prevPrice) / _prevPrice) * 100 * 100) / 100 : 0;

      const payload = {
        id: editMode ? editingId : `fa${Date.now()}`,
        market: newAccount.market || '国内市场',
        currency: newAccount.currency || 'CNY',
        assetKind: newAccount.assetKind || '',
        kind: newAccount.assetType || '股票',
        accountId: newAccount.account || '',
        category: newAccount.categoryL1 || '',
        subcategory: newAccount.categoryL2 || '',
        tertiaryCategory: newAccount.categoryL3 || '',
        positionGroup: newAccount.positionGroup || '',
        positionCategory: newAccount.positionType || '',
        name: newAccount.name,
        code: newAccount.code || '',
        costPrice: _costPrice,
        shares: _quantity,
        cost: _costPrice * _quantity,
        availableShares: _quantity,
        currentPrice: _currentPrice,
        prevPrice: _prevPrice,
        priceDate: newAccount.priceDate || '',
        avgBuyPrice: parseFloat(newAccount.avgBuyPrice) || 0,
        holdingDays: parseInt(newAccount.holdingDays) || 0,
        holdingDaysBase: parseInt(newAccount.holdingDays) || 0,
        holdingDaysDate: new Date().toISOString().split('T')[0],
        pnl: _holdingPnl,
        pnlPercent: _holdingPnlRate,
        todayPnl: _dailyPnl,
        todayPnlPercent: _dailyPnlRate,
        positionWeight: 0,
        totalFees: 0,
      };

      // 获取当前的 financeAssets 数组
      const currentFinanceAssets = stateData?.financeAssets || [];
      let updatedFinanceAssets;

      if (editMode && editingId) {
        // 编辑：替换对应 id 的项
        updatedFinanceAssets = currentFinanceAssets.map(item =>
          String(item.id) === String(editingId) ? payload : item
        );
      } else {
        // 新增：push 到数组
        updatedFinanceAssets = [...currentFinanceAssets, payload];
      }

      // 使用 saveState 整体保存
      await saveState({
        ...stateData,
        financeAssets: updatedFinanceAssets,
      });

      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Failed to save account:', err);
      alert('保存失败：' + (err.message || '未知错误'));
    } finally {
      setSaving(false);
    }
  };

  const handleBatchSave = async () => {
    setSaving(true);
    try {
      const currentFinanceAssets = stateData?.financeAssets || [];
      const updatedFinanceAssets = currentFinanceAssets.map(item => {
        if (!selectedIds.has(item.id)) return item;
        return {
          ...item,
          ...(batchEditData.market ? { market: batchEditData.market } : {}),
          ...(batchEditData.currency ? { currency: batchEditData.currency } : {}),
          ...(batchEditData.assetType ? { kind: batchEditData.assetType } : {}),
          ...(batchEditData.account ? { accountId: batchEditData.account } : {}),
          ...(batchEditData.categoryL1 ? { category: batchEditData.categoryL1 } : {}),
          ...(batchEditData.categoryL2 ? { subcategory: batchEditData.categoryL2 } : {}),
          ...(batchEditData.categoryL3 ? { tertiaryCategory: batchEditData.categoryL3 } : {}),
          ...(batchEditData.positionGroup ? { positionGroup: batchEditData.positionGroup } : {}),
          ...(batchEditData.positionType ? { positionCategory: batchEditData.positionType } : {}),
          ...(batchEditData.tag ? { tags: batchEditData.tag } : {}),
        };
      });

      await saveState({
        ...stateData,
        financeAssets: updatedFinanceAssets,
      });

      setShowBatchEditModal(false);
      setBatchEditData({ market: '', currency: '', assetType: '', account: '', categoryL1: '', categoryL2: '', categoryL3: '', positionGroup: '', positionType: '', tag: '' });
      setSelectedIds(new Set());
      setShowBatchEdit(false);
      loadData();
    } catch (err) {
      console.error('Failed to batch save:', err);
      alert('批量保存失败：' + (err.message || '未知错误'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (holding) => {
    setNewAccount({
      market: holding.market || '国内市场',
      currency: holding.currency || '',
      assetKind: holding.assetKind || '',
      assetType: holding.assetType || '股票',
      account: holding.account || '',
      categoryL1: holding.categoryL1 || '',
      categoryL2: holding.categoryL2 || '',
      categoryL3: holding.categoryL3 || '',
      positionGroup: holding.positionGroup || '',
      positionType: holding.positionType || '',
      name: holding.name || '',
      code: holding.code || '',
      cost: holding.cost || holding.costPrice * holding.shares || '',
      quantity: holding.quantity || '',
      currentPrice: holding.currentPrice || '',
      prevPrice: holding.prevPrice || '',
      priceDate: holding.priceDate || '',
      avgBuyPrice: holding.avgBuyPrice || '',
      holdingDays: holding.holdingDays || '',
      holdingPnl: holding.holdingPnl || '',
      holdingPnlRate: holding.holdingPnlRate || '',
      dailyPnl: holding.dailyPnl || '',
      dailyPnlRate: holding.dailyPnlRate || '',
      currentValue: holding.currentValue || '',
      tags: holding.tags || '',
    });
    setEditMode(true);
    setEditingId(holding.id);
    setShowAddModal(true);
  };

  const handleDetail = (holding) => {
    setDetailData(holding);
    setShowDetailModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除这条持仓记录吗？')) return;
    try {
      const currentFinanceAssets = stateData?.financeAssets || [];
      const updatedFinanceAssets = currentFinanceAssets.filter(item => String(item.id) !== String(id));
      await saveState({
        ...stateData,
        financeAssets: updatedFinanceAssets,
      });
      loadData();
    } catch (err) {
      console.error('Failed to delete account:', err);
      alert('删除失败：' + (err.message || '未知错误'));
    }
  };

  const resetForm = () => {
    setNewAccount({
      market: '国内市场',
      currency: 'CNY',
      assetType: '股票',
      account: '',
      categoryL1: '',
      categoryL2: '',
      categoryL3: '',
      positionGroup: '',
      positionType: '',
      name: '',
      code: '',
      cost: '',
      quantity: '',
      currentPrice: '',
      avgBuyPrice: '',
      holdingDays: '',
      holdingPnl: '',
      holdingPnlRate: '',
      dailyPnl: '',
      dailyPnlRate: '',
      currentValue: '',
      tags: '',
    });
    setUploadedImage(null);
    setOcrResult(null);
    setEditMode(false);
    setEditingId(null);
  };

  // ─ 账本管理 ──
  const handleSaveBooks = async () => {
    try {
      await saveBooks(books);
      loadBooksAndTags();
    } catch (err) {
      console.error('Failed to save books:', err);
    }
  };

  // ── 标签管理 ──
  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    if (tags.includes(newTagName.trim())) return;
    const newTags = [...tags, newTagName.trim()].sort();
    setTags(newTags);
    setNewTagName('');
    // 更新所有账本的标签列表
    setBooks(books.map(book => ({
      ...book,
      tags: Array.from(new Set([...(book.tags || []), newTagName.trim()])),
    })));
    handleSaveBooks();
  };

  const handleEditTag = (tagName) => {
    setTagToEdit(tagName);
  };

  const handleSaveTagEdit = () => {
    if (!tagToEdit || !newTagName.trim()) return;
    if (tags.includes(newTagName.trim()) && newTagName.trim() !== tagToEdit) return;
    
    const newTags = tags.map(t => t === tagToEdit ? newTagName.trim() : t).sort();
    setTags(newTags);
    
    // 更新所有账本中的标签引用
    setBooks(books.map(book => ({
      ...book,
      tags: (book.tags || []).map(t => t === tagToEdit ? newTagName.trim() : t),
    })));
    
    setTagToEdit(null);
    setNewTagName('');
    handleSaveBooks();
  };

  const handleDeleteTag = async (tagName) => {
    const newTags = tags.filter(t => t !== tagName);
    setTags(newTags);
    
    // 从所有账本中移除该标签
    setBooks(books.map(book => ({
      ...book,
      tags: (book.tags || []).filter(t => t !== tagName),
    })));
    
    setDeleteConfirm(null);
    handleSaveBooks();
  };

  // ── 资产类型管理 ──
  const handleAddAssetType = () => {
    if (!newAssetTypeName.trim()) return;
    if (assetTypeOptions.includes(newAssetTypeName.trim())) return;
    const newOptions = [...assetTypeOptions, newAssetTypeName.trim()].sort();
    setAssetTypeOptions(newOptions);
    localStorage.setItem('finance_asset_type_options', JSON.stringify(newOptions));
    setNewAssetTypeName('');
  };
  const handleSaveAssetTypeEdit = () => {
    if (!assetTypeToEdit || !newAssetTypeName.trim()) return;
    if (assetTypeOptions.includes(newAssetTypeName.trim()) && newAssetTypeName.trim() !== assetTypeToEdit) return;
    const newOptions = assetTypeOptions.map(o => o === assetTypeToEdit ? newAssetTypeName.trim() : o).sort();
    setAssetTypeOptions(newOptions);
    localStorage.setItem('finance_asset_type_options', JSON.stringify(newOptions));
    setAssetTypeToEdit(null);
    setNewAssetTypeName('');
  };
  const handleDeleteAssetType = (name) => {
    const newOptions = assetTypeOptions.filter(o => o !== name);
    setAssetTypeOptions(newOptions);
    localStorage.setItem('finance_asset_type_options', JSON.stringify(newOptions));
    setDeleteConfirm(null);
  };

  // ── 一级分类管理 ──
  const handleAddCategoryL1 = () => {
    if (!newCategoryL1Name.trim()) return;
    if (categoryL1Options.includes(newCategoryL1Name.trim())) return;
    const newOptions = [...categoryL1Options, newCategoryL1Name.trim()].sort();
    setCategoryL1Options(newOptions);
    localStorage.setItem('finance_category_l1_options', JSON.stringify(newOptions));
    setNewCategoryL1Name('');
  };
  const handleSaveCategoryL1Edit = () => {
    if (!categoryL1ToEdit || !newCategoryL1Name.trim()) return;
    if (categoryL1Options.includes(newCategoryL1Name.trim()) && newCategoryL1Name.trim() !== categoryL1ToEdit) return;
    const newOptions = categoryL1Options.map(o => o === categoryL1ToEdit ? newCategoryL1Name.trim() : o).sort();
    setCategoryL1Options(newOptions);
    localStorage.setItem('finance_category_l1_options', JSON.stringify(newOptions));
    setCategoryL1ToEdit(null);
    setNewCategoryL1Name('');
  };
  const handleDeleteCategoryL1 = (name) => {
    const newOptions = categoryL1Options.filter(o => o !== name);
    setCategoryL1Options(newOptions);
    localStorage.setItem('finance_category_l1_options', JSON.stringify(newOptions));
    setDeleteConfirm(null);
  };

  // ── 二级分类管理（按一级分类分组）──
  const handleAddCategoryL2 = () => {
    if (!newCategoryL2Name.trim() || !newAccount.categoryL1) return;
    const key = newAccount.categoryL1;
    const currentOptions = categoryL2OptionsMap[key] || [];
    if (currentOptions.includes(newCategoryL2Name.trim())) return;
    const newOptions = [...currentOptions, newCategoryL2Name.trim()].sort();
    setCategoryL2OptionsMap(prev => ({ ...prev, [key]: newOptions }));
    localStorage.setItem('finance_category_l2_options', JSON.stringify({ ...categoryL2OptionsMap, [key]: newOptions }));
    setNewCategoryL2Name('');
  };
  const handleSaveCategoryL2Edit = () => {
    if (!categoryL2ToEdit || !newCategoryL2Name.trim() || !newAccount.categoryL1) return;
    const key = newAccount.categoryL1;
    const currentOptions = categoryL2OptionsMap[key] || [];
    if (currentOptions.includes(newCategoryL2Name.trim()) && newCategoryL2Name.trim() !== categoryL2ToEdit) return;
    const newOptions = currentOptions.map(o => o === categoryL2ToEdit ? newCategoryL2Name.trim() : o).sort();
    setCategoryL2OptionsMap(prev => ({ ...prev, [key]: newOptions }));
    localStorage.setItem('finance_category_l2_options', JSON.stringify({ ...categoryL2OptionsMap, [key]: newOptions }));
    setCategoryL2ToEdit(null);
    setNewCategoryL2Name('');
  };
  const handleDeleteCategoryL2 = (name) => {
    if (!newAccount.categoryL1) return;
    const key = newAccount.categoryL1;
    const currentOptions = categoryL2OptionsMap[key] || [];
    const newOptions = currentOptions.filter(o => o !== name);
    setCategoryL2OptionsMap(prev => ({ ...prev, [key]: newOptions }));
    localStorage.setItem('finance_category_l2_options', JSON.stringify({ ...categoryL2OptionsMap, [key]: newOptions }));
    setDeleteConfirm(null);
  };

  // ── 三级分类管理（按一级+二级分类分组）──
  const handleAddCategoryL3 = () => {
    if (!newCategoryL3Name.trim() || !newAccount.categoryL1 || !newAccount.categoryL2) return;
    const key = `${newAccount.categoryL1}__${newAccount.categoryL2}`;
    const currentOptions = categoryL3OptionsMap[key] || [];
    if (currentOptions.includes(newCategoryL3Name.trim())) return;
    const newOptions = [...currentOptions, newCategoryL3Name.trim()].sort();
    setCategoryL3OptionsMap(prev => ({ ...prev, [key]: newOptions }));
    localStorage.setItem('finance_category_l3_options', JSON.stringify({ ...categoryL3OptionsMap, [key]: newOptions }));
    setNewCategoryL3Name('');
  };
  const handleSaveCategoryL3Edit = () => {
    if (!categoryL3ToEdit || !newCategoryL3Name.trim() || !newAccount.categoryL1 || !newAccount.categoryL2) return;
    const key = `${newAccount.categoryL1}__${newAccount.categoryL2}`;
    const currentOptions = categoryL3OptionsMap[key] || [];
    if (currentOptions.includes(newCategoryL3Name.trim()) && newCategoryL3Name.trim() !== categoryL3ToEdit) return;
    const newOptions = currentOptions.map(o => o === categoryL3ToEdit ? newCategoryL3Name.trim() : o).sort();
    setCategoryL3OptionsMap(prev => ({ ...prev, [key]: newOptions }));
    localStorage.setItem('finance_category_l3_options', JSON.stringify({ ...categoryL3OptionsMap, [key]: newOptions }));
    setCategoryL3ToEdit(null);
    setNewCategoryL3Name('');
  };
  const handleDeleteCategoryL3 = (name) => {
    if (!newAccount.categoryL1 || !newAccount.categoryL2) return;
    const key = `${newAccount.categoryL1}__${newAccount.categoryL2}`;
    const currentOptions = categoryL3OptionsMap[key] || [];
    const newOptions = currentOptions.filter(o => o !== name);
    setCategoryL3OptionsMap(prev => ({ ...prev, [key]: newOptions }));
    localStorage.setItem('finance_category_l3_options', JSON.stringify({ ...categoryL3OptionsMap, [key]: newOptions }));
    setDeleteConfirm(null);
  };

  const handleAddCategoryL4 = () => {
    if (!newCategoryL4Name.trim() || !newAccount.categoryL1) return;
    const currentOptions = categoryL4Options[newAccount.categoryL1] || [];
    if (currentOptions.includes(newCategoryL4Name.trim())) return;
    const newOptions = [...currentOptions, newCategoryL4Name.trim()].sort();
    setCategoryL4Options(prev => ({ ...prev, [newAccount.categoryL1]: newOptions }));
    setNewCategoryL4Name('');
  };

  const handleSaveCategoryL4Edit = () => {
    if (!categoryL4ToEdit || !newCategoryL4Name.trim() || !newAccount.categoryL1) return;
    const currentOptions = categoryL4Options[newAccount.categoryL1] || [];
    if (currentOptions.includes(newCategoryL4Name.trim()) && newCategoryL4Name.trim() !== categoryL4ToEdit) return;
    const newOptions = currentOptions.map(o => o === categoryL4ToEdit ? newCategoryL4Name.trim() : o).sort();
    setCategoryL4Options(prev => ({ ...prev, [newAccount.categoryL1]: newOptions }));
    setCategoryL4ToEdit(null);
    setNewCategoryL4Name('');
  };

  const handleDeleteCategoryL4 = (name) => {
    if (!newAccount.categoryL1) return;
    const currentOptions = categoryL4Options[newAccount.categoryL1] || [];
    const newOptions = currentOptions.filter(o => o !== name);
    setCategoryL4Options(prev => ({ ...prev, [newAccount.categoryL1]: newOptions }));
    setDeleteConfirm(null);
  };

  const handleAddPositionGroup = () => {
    if (!newPositionGroupName.trim()) return;
    if (positionGroupOptions.includes(newPositionGroupName.trim())) return;
    const newOptions = [...positionGroupOptions, newPositionGroupName.trim()].sort();
    setPositionGroupOptions(newOptions);
    setNewPositionGroupName('');
  };

  const handleSavePositionGroupEdit = () => {
    if (!positionGroupToEdit || !newPositionGroupName.trim()) return;
    if (positionGroupOptions.includes(newPositionGroupName.trim()) && newPositionGroupName.trim() !== positionGroupToEdit) return;
    
    const newOptions = positionGroupOptions.map(o => o === positionGroupToEdit ? newPositionGroupName.trim() : o).sort();
    setPositionGroupOptions(newOptions);
    setPositionGroupToEdit(null);
    setNewPositionGroupName('');
  };

  const handleDeletePositionGroup = (name) => {
    const newOptions = positionGroupOptions.filter(o => o !== name);
    setPositionGroupOptions(newOptions);
    setDeleteConfirm(null);
  };

  const handleAddPositionType = () => {
    if (!newPositionTypeName.trim()) return;
    if (positionTypeOptions.includes(newPositionTypeName.trim())) return;
    const newOptions = [...positionTypeOptions, newPositionTypeName.trim()].sort();
    setPositionTypeOptions(newOptions);
    setNewPositionTypeName('');
  };

  const handleSavePositionTypeEdit = () => {
    if (!positionTypeToEdit || !newPositionTypeName.trim()) return;
    if (positionTypeOptions.includes(newPositionTypeName.trim()) && newPositionTypeName.trim() !== positionTypeToEdit) return;

    const newOptions = positionTypeOptions.map(o => o === positionTypeToEdit ? newPositionTypeName.trim() : o).sort();
    setPositionTypeOptions(newOptions);
    setPositionTypeToEdit(null);
    setNewPositionTypeName('');
  };

  const handleDeletePositionType = (name) => {
    const newOptions = positionTypeOptions.filter(o => o !== name);
    setPositionTypeOptions(newOptions);
    setDeleteConfirm(null);
  };

  // ── OCR 图文识别 ──
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImage(ev.target.result);
      setOcrResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleOCR = () => {
    if (!uploadedImage) return;
    const mockOCRText = `
      持仓名称: 贵州茅台
      股票代码: 600519
      持仓数量: 100
      现价: 1680.00
      成本价: 1500.50
      持仓盈亏: +17,950.00
      盈亏率: +11.96%
      当日参考盈亏: +2,340.00
      当前价值: 168,000.00
    `;
    const result = {};
    const patterns = [
      ['name', /(?:持仓名称|资产名称|名称)[\s:：]+([^\n\r]+)/],
      ['code', /(?:股票代码|代码|证券代码)[\s:：]*(\d{6})/],
      ['quantity', /(?:持仓数量|份额|数量)[\s:：]*([\d,]+\.?\d*)/],
      ['currentPrice', /(?:现价|最新价|当前价)[\s:：]*([\d,]+\.?\d*)/],
      ['avgBuyPrice', /(?:成本价|买入均价|均价)[\s:：]*([\d,]+\.?\d*)/],
      ['holdingPnl', /(?:持仓盈亏|盈亏)[\s:：]*([+-]?[\d,]+\.?\d*)/],
      ['holdingPnlRate', /(?:盈亏率|收益率)[\s:：]*([+-]?[\d.]+%?)/],
      ['dailyPnl', /(?:当日参考盈亏|日盈亏|今日盈亏)[\s:：]*([+-]?[\d,]+\.?\d*)/],
      ['currentValue', /(?:当前价值|市值|总市值)[\s:：]*([\d,]+\.?\d*)/],
    ];
    patterns.forEach(([key, regex]) => {
      const match = mockOCRText.match(regex);
      if (match) result[key] = match[1].replace(/,/g, '');
    });
    setOcrResult(result);
  };

  // ── 搜索联想 ──
  const handleCodeSearch = (q) => {
    if (lookupTimerRef.current) {
      clearTimeout(lookupTimerRef.current);
    }
    if (!q || q.trim().length < 1) {
      setLookupResults([]);
      setShowLookupDropdown(false);
      return;
    }
    setLookupLoading(true);
    setShowLookupDropdown(true);
    lookupTimerRef.current = setTimeout(async () => {
      try {
        const results = await lookupFinance(q.trim());
        setLookupResults(results);
      } catch (e) {
        console.error('Lookup failed:', e);
        setLookupResults([]);
      } finally {
        setLookupLoading(false);
      }
    }, 300);
  };

  const handleSelectLookup = async (item) => {
    setShowLookupDropdown(false);
    setNewAccount(prev => {
      const qty = parseFloat(prev.quantity) || 0;
      const cost = parseFloat(prev.cost) || 0;
      const price = item.price ? parseFloat(item.price) : parseFloat(prev.currentPrice) || 0;
      const currentValue = qty * price;
      const unitPnl = price - cost;
      const holdingPnl = unitPnl * qty;
      const holdingPnlRate = cost > 0 ? (unitPnl / cost) * 100 : 0;
      return {
        ...prev,
        code: item.code || prev.code,
        name: item.name || prev.name,
        currentPrice: item.price ? String(item.price) : prev.currentPrice,
        currentValue: (qty && price) ? currentValue.toFixed(2) : prev.currentValue,
        holdingPnl: (cost || qty || price) ? holdingPnl.toFixed(2) : prev.holdingPnl,
        holdingPnlRate: (cost || qty || price) ? holdingPnlRate.toFixed(2) : prev.holdingPnlRate,
      };
    });

    if (!item.price && item.code) {
      try {
        const quotes = await fetchFinanceQuotes([item.code]);
        if (quotes && quotes.length > 0 && quotes[0].price) {
          setNewAccount(prev => {
            const qty = parseFloat(prev.quantity) || 0;
            const cost = parseFloat(prev.cost) || 0;
            const price = parseFloat(quotes[0].price) || 0;
            const currentValue = qty * price;
            const unitPnl = price - cost;
            const holdingPnl = unitPnl * qty;
            const holdingPnlRate = cost > 0 ? (unitPnl / cost) * 100 : 0;
            return {
              ...prev,
              currentPrice: String(quotes[0].price),
              currentValue: (qty && price) ? currentValue.toFixed(2) : prev.currentValue,
              holdingPnl: (cost || qty || price) ? holdingPnl.toFixed(2) : prev.holdingPnl,
              holdingPnlRate: (cost || qty || price) ? holdingPnlRate.toFixed(2) : prev.holdingPnlRate,
            };
          });
        }
      } catch (e) {
        console.error('Fetch quotes failed:', e);
      }
    }
  };

  // ── 下拉选项常量 ──
  // 国内市场资产分类四级联动配置
  const CASCADE_OPTIONS = {
    '股票': {
      l1Options: ['权益类', '分红类'],
      l1Default: '权益类',
      l2Options: { '权益类': ['A股', '港股', '美股'], '分红类': ['A股'] },
      l2Default: { '权益类': 'A股', '分红类': 'A股' },
      l3Options: { '权益类': { 'A股': ['场内'] }, '分红类': { 'A股': ['场内'] } },
      l3Default: { '权益类': { 'A股': '场内' }, '分红类': { 'A股': '场内' } },
      l4Options: { '权益类': { 'A股': { '场内': ['长期', '短期'] } }, '分红类': { 'A股': { '场内': ['吃息'] } } }
    },
    '基金': {
      l1Options: ['权益类'],
      l1Default: '权益类',
      l2Options: { '权益类': ['A股'] },
      l2Default: { '权益类': 'A股' },
      l3Options: { '权益类': { 'A股': ['场内', '场外'] } },
      l3Default: { '权益类': { 'A股': '场内' } },
      l4Options: { '权益类': { 'A股': { '场内': ['长期', '短期'], '场外': ['长期', '短期'] } } }
    },
    '债券': {
      l1Options: ['债权类'],
      l1Default: '债权类',
      l2Options: { '债权类': ['A股'] },
      l2Default: { '债权类': 'A股' },
      l3Options: { '债权类': { 'A股': ['场内', '场外'] } },
      l3Default: { '债权类': { 'A股': '场内' } },
      l4Options: { '债权类': { 'A股': { '场内': ['国债', '可转债'], '场外': ['纯债', '混合债', '地方债', '企业债', '固收+'] } } }
    },
    '现金': {
      l1Options: ['现金类'],
      l1Default: '现金类',
      l2Options: { '现金类': ['活期存款', '定期存款'] },
      l2Default: { '现金类': '活期存款' },
      l3Options: { '现金类': { '活期存款': ['场内', '场外'], '定期存款': ['场内', '场外'] } },
      l3Default: { '现金类': { '活期存款': '场内', '定期存款': '场外' } },
      l4Options: { '现金类': { '活期存款': { '场内': ['货币基金', '短融'] }, '定期存款': { '场外': ['货币基金', '银行理财', '定期存款', '短期存款'] } } }
    },
    '期货': {
      l1Options: ['权益类'], l1Default: '权益类',
      l2Options: { '权益类': ['A股'] }, l2Default: { '权益类': 'A股' },
      l3Options: { '权益类': { 'A股': ['场内'] } }, l3Default: { '权益类': { 'A股': '场内' } },
      l4Options: { '权益类': { 'A股': { '场内': ['博弈', '对冲'] } } }
    },
    '期权': {
      l1Options: ['权益类'], l1Default: '权益类',
      l2Options: { '权益类': ['A股'] }, l2Default: { '权益类': 'A股' },
      l3Options: { '权益类': { 'A股': ['场内'] } }, l3Default: { '权益类': { 'A股': '场内' } },
      l4Options: { '权益类': { 'A股': { '场内': ['博弈', '对冲'] } } }
    },
    '外汇': {
      l1Options: ['现金类'], l1Default: '现金类',
      l2Options: { '现金类': ['欧元', '美元', '日元', '人民币'] },
      l2Default: { '现金类': '美元' },
      l3Options: { '现金类': { '欧元': ['场内'], '美元': ['场内'], '日元': ['场内'], '人民币': ['场内'] } },
      l3Default: { '现金类': { '欧元': '场内', '美元': '场内', '日元': '场内', '人民币': '场内' } },
      l4Options: { '现金类': { '欧元': { '场内': ['超期', '短期'] }, '美元': { '场内': ['超期', '短期'] }, '日元': { '场内': ['超期', '短期'] }, '人民币': { '场内': ['超期', '短期'] } } }
    },
    '保险': {
      l1Options: ['分红类'], l1Default: '分红类',
      l2Options: { '分红类': ['A股'] }, l2Default: { '分红类': 'A股' },
      l3Options: { '分红类': { 'A股': ['分红险', '储蓄险'] } }, l3Default: { '分红类': { 'A股': '分红险' } },
      l4Options: { '分红类': { 'A股': { '分红险': [], '储蓄险': [] } } }
    },
    '房产': {
      l1Options: ['分红类'], l1Default: '分红类',
      l2Options: { '分红类': ['固定投资'] }, l2Default: { '分红类': '固定投资' },
      l3Options: { '分红类': { '固定投资': ['房租'] } }, l3Default: { '分红类': { '固定投资': '房租' } },
      l4Options: { '分红类': { '固定投资': { '房租': [] } } }
    },
    '实体投资': {
      l1Options: ['分红类'], l1Default: '分红类',
      l2Options: { '分红类': ['固定投资'] }, l2Default: { '分红类': '固定投资' },
      l3Options: { '分红类': { '固定投资': ['营业收益'] } }, l3Default: { '分红类': { '固定投资': '营业收益' } },
      l4Options: { '分红类': { '固定投资': { '营业收益': [] } } }
    },
    '黄金': {
      l1Options: ['商品类'], l1Default: '商品类',
      l2Options: { '商品类': ['A股'] }, l2Default: { '商品类': 'A股' },
      l3Options: { '商品类': { 'A股': ['场内', '场外'] } }, l3Default: { '商品类': { 'A股': '场内' } },
      l4Options: { '商品类': { 'A股': { '场内': ['黄金股', '黄金ETF/LOF'], '场外': ['实物黄金', '银行积存金', '纸黄金'] } } }
    },
    '白银': {
      l1Options: ['商品类'], l1Default: '商品类',
      l2Options: { '商品类': ['A股'] }, l2Default: { '商品类': 'A股' },
      l3Options: { '商品类': { 'A股': ['场内'] } }, l3Default: { '商品类': { 'A股': '场内' } },
      l4Options: { '商品类': { 'A股': { '场内': ['白银股', '白银ETF/LOF'] } } }
    },
    '原油': {
      l1Options: ['商品类'], l1Default: '商品类',
      l2Options: { '商品类': ['A股'] }, l2Default: { '商品类': 'A股' },
      l3Options: { '商品类': { 'A股': ['场内'] } }, l3Default: { '商品类': { 'A股': '场内' } },
      l4Options: { '商品类': { 'A股': { '场内': ['原油股', '原油ETF/LOF'] } } }
    },
    '数字货币': {
      l1Options: ['另类投资'], l1Default: '另类投资',
      l2Options: { '另类投资': ['A股'] }, l2Default: { '另类投资': 'A股' },
      l3Options: { '另类投资': { 'A股': ['场内', '场外'] } }, l3Default: { '另类投资': { 'A股': '场内' } },
      l4Options: { '另类投资': { 'A股': { '场内': ['比特币', '以太坊', '其他'], '场外': ['比特币', '以太坊', '其他'] } } }
    },
    '银行理财': {
      l1Options: ['固收类'], l1Default: '固收类',
      l2Options: { '固收类': ['A股'] }, l2Default: { '固收类': 'A股' },
      l3Options: { '固收类': { 'A股': ['场外'] } }, l3Default: { '固收类': { 'A股': '场外' } },
      l4Options: { '固收类': { 'A股': { '场外': ['活期理财', '定期理财', '结构性理财'] } } }
    },
    '其他': {
      l1Options: ['另类投资'], l1Default: '另类投资',
      l2Options: { '另类投资': ['A股'] }, l2Default: { '另类投资': 'A股' },
      l3Options: { '另类投资': { 'A股': ['场内', '场外'] } }, l3Default: { '另类投资': { 'A股': '场内' } },
      l4Options: { '另类投资': { 'A股': { '场内': [], '场外': [] } } }
    }
  };
  const MARKET_OPTIONS = ['国内市场', '港股市场', '美股市场', '其他市场'];
  const MARKET_GROUPS = [
    { label: '国内市场', options: ['国内市场'] },
    { label: '海外市场', options: ['港股市场', '美股市场', '其他市场'] },
  ];
  const CURRENCY_SUGGESTIONS = ['CNY', 'CNH', 'USD', 'HKD', 'EUR', 'JPY', 'GBP', 'SGD'];
  const ASSET_TYPE_OPTIONS = ['股票', '基金', '债券', '现金', '期货', '期权', '外汇', '保险', '房产', '实体投资', '黄金', '白银', '原油', '数字货币', '银行理财', '其他'];
  const DEFAULT_CATEGORY_L1 = ['权益类', '固收类', '现金类', '另类投资', '商品'];
  const DEFAULT_CATEGORY_L2 = ['A股', '港股', '美股', '混合型', '指数型', '货币型', '债券型', 'QDII', '其他'];

  // ── 动态资产分类（从 assetClasses 获取，无数据时降级使用默认值）──
  const assetClassOptions = useMemo(() => {
    if (assetClasses && assetClasses.length > 0) {
      return assetClasses.map(c => c.name);
    }
    return DEFAULT_CATEGORY_L1;
  }, [assetClasses]);

  const categoryL2Options = useMemo(() => {
    if (newAccount.assetType === '股票') {
      return ['A股', '港股', '美股', '其他'];
    }
    if (newAccount.assetType === '基金') {
      return ['混合型', '指数型', '货币型', '债券型', '行业主题型'];
    }
    if (newAccount.assetType === '商品') {
      return ['黄金', '白银', '原油', '其他'];
    }
    if (newAccount.categoryL1 === '债权类') {
      return ['中债', '美债'];
    }
    if (assetClasses && assetClasses.length > 0 && newAccount.categoryL1) {
      const l1 = assetClasses.find(c => c.name === newAccount.categoryL1);
      if (l1 && l1.children && l1.children.length > 0) {
        return l1.children.map(c => c.name);
      }
      return [];
    }
    return DEFAULT_CATEGORY_L2;
  }, [assetClasses, newAccount.categoryL1, newAccount.assetType]);

  const allCategoryL2Options = useMemo(() => {
    if (assetClasses && assetClasses.length > 0) {
      const l2s = new Set();
      assetClasses.forEach(c => {
        if (c.children) {
          c.children.forEach(child => l2s.add(child.name));
        }
      });
      if (l2s.size > 0) return [...l2s].sort();
    }
    return DEFAULT_CATEGORY_L2;
  }, [assetClasses]);

  const categoryL3Options = useMemo(() => {
    let defaults = [];
    if (newAccount.assetType === '基金') {
      defaults = ['场外', '场内'];
    } else if (assetClasses && assetClasses.length > 0 && newAccount.categoryL1 && newAccount.categoryL2) {
      const l1 = assetClasses.find(c => c.name === newAccount.categoryL1);
      if (l1 && l1.children) {
        const l2 = l1.children.find(c => c.name === newAccount.categoryL2);
        if (l2 && l2.children && l2.children.length > 0) {
          defaults = l2.children.map(c => c.name);
        }
      }
    }
    const merged = [...new Set([...defaults, ...categoryL3CustomOptions])];
    return merged;
  }, [assetClasses, newAccount.categoryL1, newAccount.categoryL2, newAccount.assetType, categoryL3CustomOptions]);

  // ══════════════════════════════════════
  //  数据计算（核心）
  // ══════════════════════════════════════
  const computed = useMemo(() => {
    const getDailyPnl = (a) => {
      if (a.code && quotesMap[a.code] && quotesMap[a.code].price != null && quotesMap[a.code].prevClose != null) {
        const qty = parseFloat(a.shares || a.quantity) || 0;
        return (quotesMap[a.code].price - quotesMap[a.code].prevClose) * qty;
      }
      // 其次使用资产自身存储的 prevPrice + currentPrice 计算（适用于场外基金）
      const _prevPrice = parseFloat(a.prevPrice) || 0;
      const _currPrice = parseFloat(a.currentPrice) || 0;
      if (_prevPrice > 0 && _currPrice > 0) {
        const qty = parseFloat(a.shares || a.quantity) || 0;
        return (_currPrice - _prevPrice) * qty;
      }
      return parseFloat(a.todayPnl) || parseFloat(a.dailyPnl) || 0;
    };

    const getDailyPnlRate = (a) => {
      if (a.code && quotesMap[a.code] && quotesMap[a.code].changePct != null) {
        return quotesMap[a.code].changePct;
      }
      const _prevPrice = parseFloat(a.prevPrice) || 0;
      const _currPrice = parseFloat(a.currentPrice) || 0;
      // 对于场外基金，使用 (currentPrice - prevPrice) / prevPrice 计算日涨幅
      if (_prevPrice > 0 && _currPrice > 0) {
        return ((_currPrice - _prevPrice) / _prevPrice) * 100;
      }
      const dailyPnl = getDailyPnl(a);
      const cost = parseFloat(a.costPrice || a.cost) || 0;
      if (cost > 0) {
        return (dailyPnl / cost) * 100;
      }
      return parseFloat(a.todayPnlPercent) || parseFloat(a.dailyPnlRate) || 0;
    };

    // 将 financeAssets 映射到前端 holding 结构
    const financeAccounts = (financeAssets || []).map(a => {
      const _price = parseFloat(quotesMap[a.code]?.price) || parseFloat(a.currentPrice) || 0;
      const _prevClose = parseFloat(quotesMap[a.code]?.prevClose) || parseFloat(a.prevPrice) || 0;
      const _priceChange = _price > _prevClose ? 'up' : _price < _prevClose ? 'down' : 'unchanged';
      const _cost = parseFloat(a.costPrice || a.cost) || 0;
      const _qty = parseFloat(a.shares || a.quantity) || 0;
      const _unitPnl = _price - _cost;
      const _holdingPnl = Math.round(_unitPnl * _qty * 100) / 100;
      const _holdingPnlRate = _cost > 0 ? Math.round((_unitPnl / _cost) * 100 * 100) / 100 : 0;
      return {
        id: a.id,
        market: a.market || '国内市场',
        currency: a.currency || 'CNY',
        name: a.name,
        code: a.code || '',
        assetType: a.kind || a.assetType || '',
        account: a.accountId || a.account || '',
        categoryL1: a.category || a.categoryL1 || '',
        categoryL2: a.subcategory || a.categoryL2 || '',
        categoryL3: a.tertiaryCategory || a.categoryL3 || '',
        positionGroup: a.positionGroup || '',
        positionType: a.positionCategory || a.positionType || '',
        costPrice: parseFloat(a.costPrice) || parseFloat(a.cost) || 0,
        quantity: parseFloat(a.shares) || parseFloat(a.quantity) || 0,
        cost: (parseFloat(a.costPrice) || parseFloat(a.cost) || 0) * (parseFloat(a.shares) || parseFloat(a.quantity) || 0),
        currentPrice: _price,
        prevPrice: parseFloat(a.prevPrice) || _prevClose || 0,
        priceDate: a.priceDate || '',
        prevClose: _prevClose,
        priceChange: _priceChange,
        avgBuyPrice: a.avgBuyPrice || 0,
        holdingDays: computeHoldingDays(a),
        balance: _price * _qty,
        currentValue: _price * _qty,
        holdingPnl: _holdingPnl,
        holdingPnlRate: _holdingPnlRate,
        dailyPnl: getDailyPnl(a),
        dailyPnlRate: getDailyPnlRate(a),
        transactions: a.transactions || [],
      };
    });

    // 总览统计（与列表数据一致）
    const totalValue = financeAccounts.reduce((sum, a) => sum + (parseFloat(a.currentValue) || parseFloat(a.balance) || 0), 0);
    const totalCost = financeAccounts.reduce((sum, a) => sum + (parseFloat(a.cost) || 0), 0);
    const totalPnl = financeAccounts.reduce((sum, a) => sum + (parseFloat(a.holdingPnl) || 0), 0);
    const totalPnlRate = totalCost > 0 ? (totalValue - totalCost) / totalCost * 100 : 0;
    const totalDailyPnl = financeAccounts.reduce((sum, a) => sum + getDailyPnl(a), 0);
    const totalDailyPnlRate = totalValue > 0 ? (totalDailyPnl / totalValue) * 100 : 0;

    // 持仓明细汇总（基于筛选后的数据）
    const holdingsSummary = {
      totalCost: financeAccounts.reduce((sum, a) => sum + (parseFloat(a.cost) || 0), 0),
      totalMarketValue: financeAccounts.reduce((sum, a) => sum + (parseFloat(a.currentValue) || parseFloat(a.balance) || 0), 0),
      totalPnl: financeAccounts.reduce((sum, a) => sum + (parseFloat(a.holdingPnl) || 0), 0),
      totalDailyPnl: financeAccounts.reduce((sum, a) => sum + getDailyPnl(a), 0),
    };
    holdingsSummary.totalPnlRate = holdingsSummary.totalCost > 0 ? (holdingsSummary.totalMarketValue - holdingsSummary.totalCost) / holdingsSummary.totalCost * 100 : 0;
    holdingsSummary.totalDailyPnlRate = holdingsSummary.totalMarketValue > 0 ? (holdingsSummary.totalDailyPnl / holdingsSummary.totalMarketValue) * 100 : 0;

    // 分类统计
    const categoryMap = {};
    financeAccounts.forEach(account => {
      const cat = account.categoryL1 || account.category || '其他';
      if (!categoryMap[cat]) categoryMap[cat] = [];
      categoryMap[cat].push(account);
    });

    const categories = Object.entries(categoryMap).map(([name, items]) => ({
      name,
      value: items.reduce((s, a) => s + (a.balance || 0), 0),
      cost: items.reduce((s, a) => s + (a.cost || 0), 0),
      count: items.length,
      pnl: items.reduce((s, a) => s + ((a.balance || 0) - (a.cost || 0)), 0),
    })).sort((a, b) => b.value - a.value);

    // 账户本 — 按「所属账户」分组聚合
    const accountBookMap = {};
    financeAccounts.forEach(a => {
      const accName = a.account || a.name || '未分配账户';
      if (!accountBookMap[accName]) accountBookMap[accName] = [];
      accountBookMap[accName].push(a);
    });

    const accountBook = Object.entries(accountBookMap).map(([name, items]) => {
      const tv = items.reduce((s, a) => s + (parseFloat(a.currentValue) || parseFloat(a.balance) || 0), 0);
      const tc = items.reduce((s, a) => s + (parseFloat(a.cost) || 0), 0);
      const tp = items.reduce((s, a) => s + (parseFloat(a.holdingPnl) || 0), 0);
      const tdp = items.reduce((s, a) => s + (parseFloat(a.dailyPnl) || getDailyPnl(a)), 0);
      return {
        name,
        totalValue: tv,
        totalCost: tc,
        totalPnl: tp,
        totalPnlRate: tc > 0 ? (tv - tc) / tc * 100 : 0,
        totalDailyPnl: tdp,
        totalDailyPnlRate: tv > 0 ? (tdp / tv) * 100 : 0,
        count: items.length,
      };
    }).sort((a, b) => b.totalValue - a.totalValue);

    // 分类表格数据 — 带完整字段
    const categorizedHoldings = {};
    financeAccounts.forEach(a => {
      const cat = a.categoryL1 || a.category || '其他';
      if (!categorizedHoldings[cat]) categorizedHoldings[cat] = [];
      const _price = parseFloat(quotesMap[a.code]?.price) || parseFloat(a.currentPrice) || 0;
      const _prevClose = parseFloat(quotesMap[a.code]?.prevClose) || parseFloat(a.prevPrice) || 0;
      const _priceChange = _price > _prevClose ? 'up' : _price < _prevClose ? 'down' : 'unchanged';
      const _qty = parseFloat(a.quantity) || 0;
      categorizedHoldings[cat].push({
        id: a.id,
        market: a.market || '国内市场',
        currency: a.currency || 'CNY',
        name: a.name,
        code: a.code || '',
        assetType: a.assetType || a.category || '',
        account: a.account || '',
        categoryL1: a.categoryL1 || a.category || '',
        categoryL2: a.categoryL2 || '',
        categoryL3: a.categoryL3 || '',
        positionGroup: a.positionGroup || '',
        positionType: a.positionType || '',
        cost: a.cost || 0,
        quantity: a.quantity || 0,
        currentPrice: _price,
        prevPrice: parseFloat(a.prevPrice) || _prevClose || 0,
        priceDate: a.priceDate || '',
        prevClose: _prevClose,
        priceChange: _priceChange,
        avgBuyPrice: a.avgBuyPrice || 0,
        holdingDays: computeHoldingDays(a),
        balance: _price * _qty,
        currentValue: _price * _qty,
        holdingPnl: a.holdingPnl || 0,
        holdingPnlRate: a.holdingPnlRate || 0,
        dailyPnl: getDailyPnl(a),
        dailyPnlRate: getDailyPnlRate(a),
      });
    });

    return {
      totalValue, totalCost, totalPnl, totalPnlRate, totalDailyPnl, totalDailyPnlRate,
      categories, accountBook, categorizedHoldings,
      financeAccounts,
      holdingsSummary,
    };
  }, [financeAssets, quotesMap]);

  // 账户本分页
  const accountBookTotalPages = Math.max(1, Math.ceil(computed.accountBook.length / ACCOUNTS_PER_PAGE));
  const safeAccountPage = Math.min(accountBookPage, accountBookTotalPages);
  const pagedAccountBook = computed.accountBook.slice(
    (safeAccountPage - 1) * ACCOUNTS_PER_PAGE,
    safeAccountPage * ACCOUNTS_PER_PAGE
  );

  // 加载态
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
          <button onClick={loadData} className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">
            重试
          </button>
        </div>
      </div>
    );
  }

  const { totalValue, totalCost, totalPnl, totalPnlRate, totalDailyPnl, totalDailyPnlRate,
          categories, categorizedHoldings } = computed;

  const isTotalPos = totalPnl >= 0;
  const isDayPos = totalDailyPnl >= 0;
  const categoryNames = Object.keys(categorizedHoldings).sort();

  // ══════════════════════════════════════
  //  渲染
  // ══════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30 dark:from-slate-900 dark:to-slate-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* ═══ 顶栏：标题 + 总值 + 操作按钮 ═══ */}
        <section className="rounded-2xl p-5 sm:p-6 shadow-soft"
          style={{ background: 'linear-gradient(135deg, #EEEDFF 0%, #F5F3FF 40%, #FEF3E2 100%)' }}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">💎 理财模块</h1>
              <p className="text-sm text-gray-500 mt-0.5">持仓管理 · 账户总览 · 实时盈亏</p>
            </div>
            <div className="text-center lg:text-right">
              <div className="text-4xl sm:text-5xl font-black text-gray-900 whitespace-nowrap tabular-nums tracking-tight">
                ¥{formatCurrency(totalValue)}
              </div>
              <div className="mt-1 flex items-center justify-center lg:justify-end gap-2 text-sm flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  isTotalPos ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {isTotalPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  总盈亏 {isTotalPos ? '+' : ''}{formatCurrency(totalPnl)} ({formatPercentage(totalPnlRate)})
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  isDayPos ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  当日 {isDayPos ? '+' : ''}{formatCurrency(totalDailyPnl)} ({formatPercentage(totalDailyPnlRate)})
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={loadData}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-indigo-300 text-indigo-600 text-sm font-medium hover:bg-indigo-50 active:scale-[0.97] transition-all">
                <RefreshCw className={`w-4 h-4 ${loading || quotesLoading ? 'animate-spin' : ''}`} /> 刷新
              </button>
            </div>
          </div>
        </section>

        {/* ═══ 四张核心统计卡 ═══ */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { IconComp: Wallet, label: '总市值', val: `¥${formatCurrency(totalValue)}`, cls: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
            { IconComp: Briefcase, label: '总成本', val: `¥${formatCurrency(totalCost)}`, cls: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
            { IconComp: isTotalPos ? TrendingUp : TrendingDown, label: '总盈亏', val: `${isTotalPos ? '+' : '-'}¥${formatCurrency(Math.abs(totalPnl))}`, cls: `${isTotalPos ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'} dark:${isTotalPos ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}` },
            { IconComp: PieChart, label: '总收益率', val: formatPercentage(totalPnlRate), cls: `${isTotalPos ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'} dark:${isTotalPos ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}` },
          ].map((card, idx) => (
            <div key={idx} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 shadow-soft border border-gray-100/80 dark:border-slate-700/50 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className={`${card.cls} rounded-full p-1.5`}>
                  <card.IconComp className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{card.label}</span>
              </div>
              <div className={`text-lg sm:text-xl font-bold tabular-nums whitespace-nowrap ${
                card.label === '总盈亏' ? (isTotalPos ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400') :
                card.label === '总收益率' ? (isTotalPos ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400') :
                'text-gray-900 dark:text-white'
              }`}>
                {card.val}
              </div>
            </div>
          ))}
        </section>

        {/* ═══ 账户本区域 ═══ */}
        <section className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-5 shadow-soft border border-gray-100/80 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-indigo-500" />
              <h2 className="text-base font-bold text-gray-900 dark:text-white">📒 账户本</h2>
              <span className="text-xs text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                共 {computed.accountBook.length} 个账户
              </span>
            </div>
            {accountBookTotalPages > 1 && (
              <Pagination page={safeAccountPage} totalPages={accountBookTotalPages} onPageChange={setAccountBookPage} />
            )}
          </div>

          {computed.accountBook.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pagedAccountBook.map(acc =>
                <AccountCard key={acc.name} {...acc} />
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 text-sm">
              暂无账户数据，点击「新增」添加第一笔持仓
            </div>
          )}

          {/* 账户本汇总条 */}
          {computed.accountBook.length > 1 && (
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-center text-xs">
              {[
                ['账户数', `${computed.accountBook.length}个`, ''],
                ['合计市值', `¥${formatCurrency(totalValue)}`, ''],
                ['合计成本', `¥${formatCurrency(totalCost)}`, ''],
                ['合计盈亏', `${isTotalPos?'+':''}¥${formatCurrency(totalPnl)}`, isTotalPos?POS_CLASS:NEG_CLASS],
                ['合计收益率', formatPercentage(totalPnlRate), isTotalPos?POS_CLASS:NEG_CLASS],
                ['当日收益', `${isDayPos?'+':''}¥${formatCurrency(totalDailyPnl)}`, isDayPos?POS_CLASS:NEG_CLASS],
              ].map(([label, val, cls], i) => (
                <div key={i}>
                  <p className="text-gray-400 mb-0.5">{label}</p>
                  <p className={`font-semibold tabular-nums ${cls || 'text-gray-900 dark:text-white'}`}>{val}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ═══ 持仓明细 ═══ */}
        <section className="space-y-5">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">📊 持仓明细</h2>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
              共 {computed.financeAccounts.length} 项
            </span>
          </div>

          {computed.financeAccounts.length > 0 ? (
            <CategoryTable
              key="all"
              categoryName="all"
              holdings={computed.financeAccounts}
              colorIdx={0}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDetail={handleDetail}
              onAdd={() => { resetForm(); setShowAddModal(true); }}
              marketOptions={MARKET_OPTIONS}
              currencyOptions={CURRENCY_SUGGESTIONS}
              assetTypeOptions={ASSET_TYPE_OPTIONS}
              assetClassOptions={assetClassOptions}
              positionGroupOptions={positionGroupOptions}
              positionTypeOptions={positionTypeOptions}
              allCategoryL2Options={allCategoryL2Options}
              tags={tags}
              marketGroups={MARKET_GROUPS}
              categoryL3CustomOptions={categoryL3CustomOptions}
              categoryL4Options={categoryL4Options}
            />
          ) : (
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-12 text-center shadow-soft border border-gray-100/80 dark:border-slate-700/50">
              <Briefcase className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 text-sm">暂无持仓数据</p>
              <p className="text-gray-300 text-xs mt-1">点击上方「新增」按钮添加第一笔资产</p>
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════
            详情弹窗
           ══════════════════════════════════════ */}
        {showDetailModal && (
          <DetailModal
            data={detailData}
            totalMarketValue={computed.totalMarketValue || 0}
            onClose={() => setShowDetailModal(false)}
            saveState={saveState}
            stateData={stateData}
            onRefresh={loadData}
          />
        )}

        {/* ══════════════════════════════════════
            新增弹窗（保持不变，仅改货币单位为可编辑）
           ══════════════════════════════════════ */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editMode ? '编辑持仓资产' : '新增持仓资产'}</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* OCR 区域 */}
                <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-4 text-center hover:border-indigo-400 transition-colors">
                  {uploadedImage ? (
                    <div className="relative">
                      <img src={uploadedImage} alt="预览" className="max-h-40 mx-auto rounded-lg object-contain" />
                      <button onClick={() => { setUploadedImage(null); setOcrResult(null); }}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <div className="flex flex-col items-center gap-2 py-3">
                        <Upload className="w-8 h-8 text-gray-400" />
                        <span className="text-sm text-gray-500">上传截图，自动识别填充</span>
                        <span className="text-xs text-gray-400">支持交易 App 截图、持仓页面截图（JPG / PNG）</span>
                      </div>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  )}
                  {uploadedImage && !ocrResult && (
                    <button onClick={handleOCR}
                      className="mt-3 inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-medium transition-colors">
                      <Camera className="w-4 h-4" /> 识别图片
                    </button>
                  )}
                  {ocrResult && Object.keys(ocrResult).length > 0 && (
                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm">
                      <div className="flex items-start gap-2">
                        <Image className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <div className="flex-1 text-left text-green-700 dark:text-green-400 space-y-0.5">
                          <p className="font-medium mb-1">请检查识别出的交易记录，确认无误后点击导入</p>
                          {Object.entries(ocrResult).map(([k, v]) => (
                            <p key={k}><span className="text-gray-500">{fieldLabelMap[k] || k}</span>：{v}</p>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => {
                          setOcrResult(null);
                          setUploadedImage(null);
                        }} className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                          取消
                        </button>
                        <button onClick={() => {
                          const newFields = {};
                          if (ocrResult.name) newFields.name = ocrResult.name;
                          if (ocrResult.code) newFields.code = ocrResult.code;
                          if (ocrResult.quantity) newFields.quantity = ocrResult.quantity;
                          if (ocrResult.currentPrice) newFields.currentPrice = ocrResult.currentPrice;
                          if (ocrResult.avgBuyPrice) newFields.avgBuyPrice = ocrResult.avgBuyPrice;
                          if (ocrResult.cost) newFields.cost = ocrResult.cost;
                          if (ocrResult.holdingDays) newFields.holdingDays = ocrResult.holdingDays;
                          if (ocrResult.holdingPnl) newFields.holdingPnl = ocrResult.holdingPnl;
                          if (ocrResult.holdingPnlRate) newFields.holdingPnlRate = ocrResult.holdingPnlRate;
                          if (ocrResult.dailyPnl) newFields.dailyPnl = ocrResult.dailyPnl;
                          if (ocrResult.dailyPnlRate) newFields.dailyPnlRate = ocrResult.dailyPnlRate;
                          if (ocrResult.currentValue) newFields.currentValue = ocrResult.currentValue;
                          if (ocrResult.tags) newFields.tags = ocrResult.tags;
                          setNewAccount({ ...newAccount, ...newFields });
                          setOcrResult(null);
                          setUploadedImage(null);
                        }} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-medium transition-colors">
                          <Check className="w-4 h-4" /> 确认导入
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 表单主体 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                  {/* Row 1: 市场 | 货币单位（可自由编辑） */}
                  <FormField label="市场" required>
                    <select value={newAccount.market} onChange={e => {
                      const market = e.target.value;
                      let currency = newAccount.currency;
                      if (market === '国内市场') currency = 'CNY';
                      else if (market === '港股市场') currency = 'HKD';
                      else if (market === '美股市场') currency = 'USD';

                      setNewAccount({ ...newAccount, market, currency });
                    }}
                      className={FORM_SELECT}>
                      {MARKET_GROUPS.map(g => (
                        g.options.length === 1
                          ? <option key={g.options[0]} value={g.options[0]}>{g.options[0]}</option>
                          : <optgroup key={g.label} label={g.label}>
                            {g.options.map(o => <option key={o} value={o}>{o}</option>)}
                          </optgroup>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="货币单位">
                    <div className="relative">
                      <input
                        type="text"
                        list="currency-suggestions"
                        value={newAccount.currency}
                        onChange={e => setNewAccount({ ...newAccount, currency: e.target.value.toUpperCase() })}
                        placeholder="CNY / CNH / USD / 自定义..."
                        className={`${FORM_INPUT} pr-8 font-mono`}
                      />
                      <datalist id="currency-suggestions">
                        {CURRENCY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                  </FormField>

                  {/* Row 2: 资产种类 | 资产类型 | 所属账户 */}
                  <FormField label="资产种类">
                    <div className="flex gap-2">
                      <select value={newAccount.assetKind} onChange={e => {
                        setNewAccount({ ...newAccount, assetKind: e.target.value });
                      }}
                        className={`${FORM_SELECT} flex-1`}>
                        <option value="">请选择资产种类</option>
                        {assetKindOptions.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <button onClick={() => {
                        const newKind = prompt('请输入新的资产种类名称');
                        if (newKind && newKind.trim() && !assetKindOptions.includes(newKind.trim())) {
                          const updated = [...assetKindOptions, newKind.trim()];
                          setAssetKindOptions(updated);
                          localStorage.setItem('finance_asset_kind_options', JSON.stringify(updated));
                        }
                      }} className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors" title="添加资产种类">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </FormField>

                  <FormField label="资产类型" required>
                    <div className="flex gap-2">
                      <select value={newAccount.assetType} onChange={e => {
                        setNewAccount({ ...newAccount, assetType: e.target.value });
                      }}
                        className={`${FORM_SELECT} flex-1`}>
                        {assetTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <button onClick={() => setShowAssetTypeModal(true)} className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors" title="管理资产类型">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </FormField>

                  <FormField label="所属账户">
                    <select value={newAccount.account} onChange={e => setNewAccount({ ...newAccount, account: e.target.value })}
                      className={FORM_SELECT}>
                      <option value="">请选择账户</option>
                      {accounts.map(acc =>
                        <option key={acc.id || acc.name} value={acc.name}>{acc.name}</option>
                      )}
                    </select>
                  </FormField>

                  {/* Row 3: 资产分类一级 | 资产分类二级 */}
                  <FormField label="资产分类一级" required>
                    <div className="flex gap-2">
                      <select value={newAccount.categoryL1} onChange={e => {
                        const l1 = e.target.value;
                        const cascade = CASCADE_OPTIONS[newAccount.assetType];
                        if (newAccount.market === '国内市场' && cascade && cascade.l2Default[l1]) {
                          const l2 = cascade.l2Default[l1];
                          const l3 = cascade.l3Default[l1][l2];
                          setNewAccount({ ...newAccount, categoryL1: l1, categoryL2: l2, categoryL3: l3, categoryL4: '' });
                        } else {
                          setNewAccount({ ...newAccount, categoryL1: l1, categoryL2: '', categoryL3: '' });
                        }
                      }}
                        className={`${FORM_SELECT} flex-1`}>
                        <option value="">请选择</option>
                        {categoryL1Options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <button onClick={() => setShowCategoryL1Modal(true)} className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors" title="管理一级分类">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </FormField>

                  <FormField label="资产分类二级">
                    <div className="flex gap-2">
                      <select value={newAccount.categoryL2} onChange={e => {
                        const l2 = e.target.value;
                        const cascade = CASCADE_OPTIONS[newAccount.assetType];
                        if (newAccount.market === '国内市场' && cascade && cascade.l3Default[newAccount.categoryL1] && cascade.l3Default[newAccount.categoryL1][l2]) {
                          const l3 = cascade.l3Default[newAccount.categoryL1][l2];
                          setNewAccount({ ...newAccount, categoryL2: l2, categoryL3: l3, categoryL4: '' });
                        } else {
                          setNewAccount({ ...newAccount, categoryL2: l2, categoryL3: '' });
                        }
                      }}
                        className={`${FORM_SELECT} flex-1`}>
                        <option value="">请选择</option>
                        {(categoryL2OptionsMap[newAccount.categoryL1] || []).map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <button onClick={() => setShowCategoryL2Modal(true)} className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors" title="管理二级分类">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </FormField>

                  {/* Row 4: 资产分类三级 | 资产分类四级 */}
                  <FormField label="资产分类三级">
                    <div className="flex gap-2">
                      <select value={newAccount.categoryL3} onChange={e => setNewAccount({ ...newAccount, categoryL3: e.target.value, categoryL4: '' })}
                        className={`${FORM_SELECT} flex-1`}>
                        <option value="">请选择</option>
                        {(() => {
                          const cascade = CASCADE_OPTIONS[newAccount.assetType];
                          if (newAccount.market === '国内市场' && cascade && cascade.l3Options[newAccount.categoryL1] && cascade.l3Options[newAccount.categoryL1][newAccount.categoryL2]) {
                            return cascade.l3Options[newAccount.categoryL1][newAccount.categoryL2].map(o => <option key={o} value={o}>{o}</option>);
                          }
                          const key = `${newAccount.categoryL1}__${newAccount.categoryL2}`;
                          const customOptions = categoryL3OptionsMap[key] || [];
                          return (
                            <>
                              <option value="场内">场内</option>
                              <option value="场外">场外</option>
                              {customOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </>
                          );
                        })()}
                      </select>
                      <button onClick={() => setShowCategoryL3Modal(true)} className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors" title="管理三级分类">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </FormField>

                  <FormField label="资产分类四级">
                    <div className="flex gap-2">
                      <select value={newAccount.categoryL4 || ''} onChange={e => setNewAccount({ ...newAccount, categoryL4: e.target.value })}
                        className={`${FORM_SELECT} flex-1`}>
                        <option value="">请选择</option>
                        {(() => {
                          const cascade = CASCADE_OPTIONS[newAccount.assetType];
                          if (newAccount.market === '国内市场' && cascade && cascade.l4Options[newAccount.categoryL1] && cascade.l4Options[newAccount.categoryL1][newAccount.categoryL2] && cascade.l4Options[newAccount.categoryL1][newAccount.categoryL2][newAccount.categoryL3]) {
                            return cascade.l4Options[newAccount.categoryL1][newAccount.categoryL2][newAccount.categoryL3].map(o => <option key={o} value={o}>{o}</option>);
                          }
                          return (categoryL4Options[newAccount.categoryL1] || []).map(o => <option key={o} value={o}>{o}</option>);
                        })()}
                      </select>
                      <button onClick={() => setShowCategoryL4Modal(true)} className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors" title="管理四级分类">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </FormField>

                  {/* Row 5: 持仓分组 | 持仓分类 */}
                  <FormField label="持仓分组">
                    <div className="flex gap-2">
                      <select value={newAccount.positionGroup} onChange={e => setNewAccount({ ...newAccount, positionGroup: e.target.value })}
                        className={`${FORM_SELECT} flex-1`}>
                        <option value="">请选择</option>
                        {positionGroupOptions.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <button onClick={() => setShowPositionGroupModal(true)} className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors" title="管理持仓分组">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </FormField>

                  <FormField label="持仓分类" required>
                    <div className="flex gap-2">
                      <select value={newAccount.positionType} onChange={e => setNewAccount({ ...newAccount, positionType: e.target.value })}
                        className={`${FORM_SELECT} flex-1`}>
                        <option value="">请选择</option>
                        {positionTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <button onClick={() => setShowPositionTypeModal(true)} className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors" title="管理持仓分类">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </FormField>

                  {/* Row 6: 资产名称 | 资产代码 */}
                  <FormField label="资产名称" required>
                    <div className="relative">
                      <input
                        type="text"
                        value={newAccount.name}
                        onChange={e => {
                          setNewAccount({ ...newAccount, name: e.target.value });
                          handleCodeSearch(e.target.value);
                        }}
                        onFocus={() => newAccount.name && handleCodeSearch(newAccount.name)}
                        onBlur={() => setTimeout(() => setShowLookupDropdown(false), 200)}
                        placeholder="基金、股票或自定义资产名称"
                        className={FORM_INPUT}
                      />
                      {showLookupDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-50 max-h-52 overflow-y-auto">
                          {lookupLoading ? (
                            <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">搜索中...</div>
                          ) : lookupResults.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">无匹配结果</div>
                          ) : (
                            lookupResults.map((item, idx) => (
                              <div
                                key={idx}
                                onClick={() => handleSelectLookup(item)}
                                className="px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-600 border-b border-gray-100 dark:border-slate-600 last:border-b-0"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{item.code}</span>
                                  {item.price && <span className="text-xs text-gray-500 dark:text-gray-400">¥{item.price}</span>}
                                </div>
                                <div className="text-sm text-gray-800 dark:text-gray-200 truncate">{item.name}</div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </FormField>

                  {/* Row 6: 代码 | 成本 */}
                  <FormField label="资产代码" required>
                    <div className="relative">
                      <input
                        type="text"
                        value={newAccount.code}
                        onChange={e => {
                          setNewAccount({ ...newAccount, code: e.target.value });
                          handleCodeSearch(e.target.value);
                        }}
                        onFocus={() => newAccount.code && handleCodeSearch(newAccount.code)}
                        onBlur={() => setTimeout(() => setShowLookupDropdown(false), 200)}
                        placeholder="输入代码如 600519"
                        className={`${FORM_INPUT} font-mono`}
                      />
                      {showLookupDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-50 max-h-52 overflow-y-auto">
                          {lookupLoading ? (
                            <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">搜索中...</div>
                          ) : lookupResults.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">无匹配结果</div>
                          ) : (
                            lookupResults.map((item, idx) => (
                              <div
                                key={idx}
                                onClick={() => handleSelectLookup(item)}
                                className="px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-600 border-b border-gray-100 dark:border-slate-600 last:border-b-0"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{item.code}</span>
                                  {item.price && <span className="text-xs text-gray-500 dark:text-gray-400">¥{item.price}</span>}
                                </div>
                                <div className="text-sm text-gray-800 dark:text-gray-200 truncate">{item.name}</div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </FormField>

                  <FormField label="持仓成本" required>
                    <input type="number" step="0.001" value={newAccount.cost} onChange={e => {
                      const val = e.target.value;
                      setNewAccount(p => {
                        const qty = parseFloat(p.quantity) || 0;
                        const cost = parseFloat(val) || 0;
                        const price = parseFloat(p.currentPrice) || 0;
                        const currentValue = qty * price;
                        const unitPnl = price - cost;
                        const holdingPnl = unitPnl * qty;
                        const holdingPnlRate = cost > 0 ? (unitPnl / cost) * 100 : 0;
                        return {
                          ...p,
                          cost: val,
                          currentValue: currentValue ? currentValue.toFixed(2) : p.currentValue,
                          holdingPnl: (cost || qty || price) ? holdingPnl.toFixed(2) : p.holdingPnl,
                          holdingPnlRate: (cost || qty || price) ? holdingPnlRate.toFixed(2) : p.holdingPnlRate,
                        };
                      });
                    }}
                      placeholder="0.00" className={FORM_INPUT} />
                  </FormField>

                  {/* Row 7: 数量 | 现价 */}
                  <FormField label="份额 / 数量" required>
                    <input type="number" step="0.0001" value={newAccount.quantity} onChange={e => {
                      const val = e.target.value;
                      setNewAccount(p => {
                        const qty = parseFloat(val) || 0;
                        const cost = parseFloat(p.cost) || 0;
                        const price = parseFloat(p.currentPrice) || 0;
                        const prev = parseFloat(p.prevPrice) || 0;
                        const currentValue = qty * price;
                        const unitPnl = price - cost;
                        const holdingPnl = unitPnl * qty;
                        const holdingPnlRate = cost > 0 ? (unitPnl / cost) * 100 : 0;
                        const dailyPnl = qty * (price - prev);
                        const dailyPnlRate = prev > 0 ? ((price - prev) / prev) * 100 : 0;
                        return {
                          ...p,
                          quantity: val,
                          currentValue: currentValue ? currentValue.toFixed(2) : p.currentValue,
                          holdingPnl: (cost || qty || price) ? holdingPnl.toFixed(2) : p.holdingPnl,
                          holdingPnlRate: (cost || qty || price) ? holdingPnlRate.toFixed(2) : p.holdingPnlRate,
                          dailyPnl: (qty && price && prev) ? dailyPnl.toFixed(2) : p.dailyPnl,
                          dailyPnlRate: (price && prev) ? dailyPnlRate.toFixed(2) : p.dailyPnlRate,
                        };
                      });
                    }}
                      placeholder="0" className={FORM_INPUT} />
                  </FormField>

                  <FormField label="现价">
                    <input type="number" step="0.0001" value={newAccount.currentPrice} onChange={e => {
                      const val = e.target.value;
                      setNewAccount(p => {
                        const qty = parseFloat(p.quantity) || 0;
                        const cost = parseFloat(p.cost) || 0;
                        const price = parseFloat(val) || 0;
                        const prev = parseFloat(p.prevPrice) || 0;
                        const currentValue = qty * price;
                        const unitPnl = price - cost;
                        const holdingPnl = unitPnl * qty;
                        const holdingPnlRate = cost > 0 ? (unitPnl / cost) * 100 : 0;
                        const dailyPnl = qty * (price - prev);
                        const dailyPnlRate = prev > 0 ? ((price - prev) / prev) * 100 : 0;
                        return {
                          ...p,
                          currentPrice: val,
                          currentValue: currentValue ? currentValue.toFixed(2) : p.currentValue,
                          holdingPnl: (cost || qty || price) ? holdingPnl.toFixed(2) : p.holdingPnl,
                          holdingPnlRate: (cost || qty || price) ? holdingPnlRate.toFixed(2) : p.holdingPnlRate,
                          dailyPnl: (qty && price && prev) ? dailyPnl.toFixed(2) : p.dailyPnl,
                          dailyPnlRate: (price && prev) ? dailyPnlRate.toFixed(2) : p.dailyPnlRate,
                        };
                      });
                    }} placeholder="0.0000" className={FORM_INPUT} />
                  </FormField>

                  <FormField label="前一交易日净值">
                    <input type="number" step="0.0001" value={newAccount.prevPrice} onChange={e => {
                      const val = e.target.value;
                      setNewAccount(p => {
                        const qty = parseFloat(p.quantity) || 0;
                        const price = parseFloat(p.currentPrice) || 0;
                        const prev = parseFloat(val) || 0;
                        const dailyPnl = qty * (price - prev);
                        const dailyPnlRate = prev > 0 ? ((price - prev) / prev) * 100 : 0;
                        return {
                          ...p,
                          prevPrice: val,
                          dailyPnl: (qty && price && prev) ? dailyPnl.toFixed(2) : p.dailyPnl,
                          dailyPnlRate: (price && prev) ? dailyPnlRate.toFixed(2) : p.dailyPnlRate,
                        };
                      });
                    }} placeholder="0.0000" className={FORM_INPUT} />
                  </FormField>

                  <FormField label="净值日期">
                    <input type="date" value={newAccount.priceDate} onChange={e => setNewAccount({ ...newAccount, priceDate: e.target.value })}
                      className={FORM_INPUT} />
                  </FormField>

                  {/* Row 8: 持仓天数 | (空) */}
                  <FormField label="持仓天数">
                    <input type="number" value={newAccount.holdingDays} onChange={e => setNewAccount({ ...newAccount, holdingDays: e.target.value })}
                      placeholder="0" className={FORM_INPUT} />
                  </FormField>

                  <div></div>

                  {/* Row 8: 持仓盈亏 | 持仓盈亏率 */}
                  <FormField label="持仓盈亏">
                    <div className="relative">
                      <input type="number" step="0.001" value={newAccount.holdingPnl}
                        onChange={e => setNewAccount({ ...newAccount, holdingPnl: e.target.value })}
                        placeholder="自动计算 或 手动输入"
                        className={`${FORM_INPUT} pl-7 ${pnlClass(newAccount.holdingPnl)}`} />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">¥</span>
                    </div>
                  </FormField>

                  <FormField label="持仓盈亏率">
                    <div className="relative">
                      <input type="number" step="0.001" value={newAccount.holdingPnlRate}
                        onChange={e => setNewAccount({ ...newAccount, holdingPnlRate: e.target.value })}
                        placeholder="自动计算 或 手动输入" className={`${FORM_INPUT} pr-7 ${pnlClass(newAccount.holdingPnlRate)}`} />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                    </div>
                  </FormField>

                  {/* Row 9: 当前价值 — 全宽 */}
                  <div className="sm:col-span-2">
                    <FormField label="当前市值" markRequired fullWidth>
                      <div className="relative">
                        <input type="number" step="0.001" value={newAccount.currentValue}
                          readOnly
                          placeholder="自动计算"
                          className={`${FORM_INPUT} pl-7 font-semibold bg-gray-50 dark:bg-slate-700 cursor-not-allowed`} />
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">¥</span>
                      </div>
                      {(newAccount.quantity && newAccount.currentPrice) && (
                        <p className="mt-1 text-xs text-gray-400">
                          = {newAccount.quantity} × {newAccount.currentPrice} = {(parseFloat(newAccount.quantity) * parseFloat(newAccount.currentPrice)).toFixed(2)}
                        </p>
                      )}
                    </FormField>
                  </div>

                  {/* Row 12: 标签 — 全宽 */}
                  <div className="sm:col-span-2">
                    <FormField label="标签" fullWidth>
                      <div className="flex gap-2">
                        <select 
                          value={newAccount.tags || ''} 
                          onChange={e => setNewAccount({ ...newAccount, tags: e.target.value })}
                          className={`${FORM_SELECT} flex-1`}>
                          <option value="">请选择标签</option>
                          {tags.map(tag => (
                            <option key={tag} value={tag}>{tag}</option>
                          ))}
                        </select>
                        <button onClick={() => setShowTagModal(true)} className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                    </FormField>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                  <button onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 font-medium transition-colors">
                    取消
                  </button>
                  <button onClick={handleSaveAccount} disabled={saving || !newAccount.name || !newAccount.code || !newAccount.cost || !newAccount.quantity}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 font-semibold transition-colors shadow-md shadow-indigo-200">
                    {saving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ 标签管理弹窗 ═══ */}
        {showTagModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">标签管理</h3>
                <button onClick={() => setShowTagModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={newTagName} onChange={e => setNewTagName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTag()} placeholder="输入标签名称" className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  <button onClick={handleAddTag} className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {tags.length > 0 ? (
                    tags.map((tag) => (
                      <div key={tag} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        {tagToEdit === tag ? (
                          <>
                            <input type="text" value={newTagName || tag} onChange={e => setNewTagName(e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-600 dark:text-white" autoFocus />
                            <button onClick={handleSaveTagEdit} className="p-1 text-green-600 hover:bg-green-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => { setTagToEdit(null); setNewTagName(''); }} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-gray-700 dark:text-gray-300">{tag}</span>
                            <button onClick={() => { setTagToEdit(tag); setNewTagName(tag); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            {deleteConfirm === `tag-${tag}` ? (
                              <button onClick={() => handleDeleteTag(tag)} className="p-1 text-red-600 hover:bg-red-100 rounded">确认</button>
                            ) : (
                              <button onClick={() => setDeleteConfirm(`tag-${tag}`)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">暂无标签</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ 批量编辑弹窗 ═══ */}
        {showBatchEditModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">批量编辑 ({selectedIds.size} 条记录)</h3>
                <button onClick={() => { setShowBatchEditModal(false); setBatchEditData({ market: '', currency: '', assetType: '', account: '', categoryL1: '', categoryL2: '', categoryL3: '', positionGroup: '', positionType: '', tag: '' }); }} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                <FormField label="市场">
                  <select value={batchEditData.market} onChange={e => setBatchEditData({ ...batchEditData, market: e.target.value })} className={FORM_SELECT}>
                    <option value="">不修改</option>
                    {MARKET_GROUPS.map(g => (
                      g.options.length === 1
                        ? <option key={g.options[0]} value={g.options[0]}>{g.options[0]}</option>
                        : <optgroup key={g.label} label={g.label}>
                          {g.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </optgroup>
                    ))}
                  </select>
                </FormField>

                <FormField label="货币单位">
                  <div className="relative">
                    <input type="text" list="batch-currency-suggestions" value={batchEditData.currency} onChange={e => setBatchEditData({ ...batchEditData, currency: e.target.value.toUpperCase() })} placeholder="不修改 / CNY / USD..." className={`${FORM_INPUT} pr-8 font-mono`} />
                    <datalist id="batch-currency-suggestions">
                      {CURRENCY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                </FormField>

                <FormField label="资产类型">
                  <select value={batchEditData.assetType} onChange={e => setBatchEditData({ ...batchEditData, assetType: e.target.value, categoryL2: '', categoryL3: '' })} className={FORM_SELECT}>
                    <option value="">不修改</option>
                    {ASSET_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </FormField>

                <FormField label="所属账户">
                  <select value={batchEditData.account} onChange={e => setBatchEditData({ ...batchEditData, account: e.target.value })} className={FORM_SELECT}>
                    <option value="">不修改</option>
                    {accounts.map(acc => <option key={acc.id || acc.name} value={acc.name}>{acc.name}</option>)}
                  </select>
                </FormField>

                <FormField label="资产分类">
                  <select value={batchEditData.categoryL1} onChange={e => {
                    setBatchEditData({ ...batchEditData, categoryL1: e.target.value, categoryL2: '', categoryL3: '' });
                  }} className={FORM_SELECT}>
                    <option value="">不修改</option>
                    {assetClassOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </FormField>

                <FormField label="资产分类二级">
                  <select value={batchEditData.categoryL2} onChange={e => {
                    setBatchEditData({ ...batchEditData, categoryL2: e.target.value, categoryL3: '' });
                  }} className={FORM_SELECT}>
                    <option value="">不修改</option>
                    {categoryL2Options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </FormField>

                <FormField label="资产三级分类">
                  <select value={batchEditData.categoryL3} onChange={e => setBatchEditData({ ...batchEditData, categoryL3: e.target.value })} className={FORM_SELECT}>
                    <option value="">不修改</option>
                    <option value="">未分类</option>
                    {categoryL3Options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </FormField>

                <FormField label="持仓分组">
                  <select value={batchEditData.positionGroup} onChange={e => setBatchEditData({ ...batchEditData, positionGroup: e.target.value })} className={FORM_SELECT}>
                    <option value="">不修改</option>
                    {positionGroupOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </FormField>

                <FormField label="持仓分类">
                  <select value={batchEditData.positionType} onChange={e => setBatchEditData({ ...batchEditData, positionType: e.target.value })} className={FORM_SELECT}>
                    <option value="">不修改</option>
                    {positionTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </FormField>

                <FormField label="标签">
                  <select value={batchEditData.tag} onChange={e => setBatchEditData({ ...batchEditData, tag: e.target.value })} className={FORM_SELECT}>
                    <option value="">不修改</option>
                    {tags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                  </select>
                </FormField>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700 mt-4">
                <button onClick={() => { setShowBatchEditModal(false); setBatchEditData({ market: '', currency: '', assetType: '', account: '', categoryL1: '', categoryL2: '', categoryL3: '', positionGroup: '', positionType: '', tag: '' }); }} className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 font-medium transition-colors">
                  取消
                </button>
                <button onClick={handleBatchSave} className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 font-semibold transition-colors shadow-md shadow-indigo-200">
                  保存修改
                </button>
              </div>
            </div>
          </div>
        )}

        {showAssetTypeModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">资产类型管理</h3>
                <button onClick={() => setShowAssetTypeModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={newAssetTypeName} onChange={e => setNewAssetTypeName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddAssetType()} placeholder="输入资产类型名称" className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  <button onClick={handleAddAssetType} className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {assetTypeOptions.length > 0 ? (
                    assetTypeOptions.map((item) => (
                      <div key={item} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        {assetTypeToEdit === item ? (
                          <>
                            <input type="text" value={newAssetTypeName || item} onChange={e => setNewAssetTypeName(e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-600 dark:text-white" autoFocus />
                            <button onClick={handleSaveAssetTypeEdit} className="p-1 text-green-600 hover:bg-green-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => { setAssetTypeToEdit(null); setNewAssetTypeName(''); }} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-gray-700 dark:text-gray-300">{item}</span>
                            <button onClick={() => { setAssetTypeToEdit(item); setNewAssetTypeName(item); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            {deleteConfirm === `at-${item}` ? (
                              <button onClick={() => handleDeleteAssetType(item)} className="p-1 text-red-600 hover:bg-red-100 rounded">确认</button>
                            ) : (
                              <button onClick={() => setDeleteConfirm(`at-${item}`)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">暂无资产类型</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showCategoryL1Modal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">资产分类一级管理</h3>
                <button onClick={() => setShowCategoryL1Modal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={newCategoryL1Name} onChange={e => setNewCategoryL1Name(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCategoryL1()} placeholder="输入一级分类名称" className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  <button onClick={handleAddCategoryL1} className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {categoryL1Options.length > 0 ? (
                    categoryL1Options.map((item) => (
                      <div key={item} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        {categoryL1ToEdit === item ? (
                          <>
                            <input type="text" value={newCategoryL1Name || item} onChange={e => setNewCategoryL1Name(e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-600 dark:text-white" autoFocus />
                            <button onClick={handleSaveCategoryL1Edit} className="p-1 text-green-600 hover:bg-green-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => { setCategoryL1ToEdit(null); setNewCategoryL1Name(''); }} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-gray-700 dark:text-gray-300">{item}</span>
                            <button onClick={() => { setCategoryL1ToEdit(item); setNewCategoryL1Name(item); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            {deleteConfirm === `catL1-${item}` ? (
                              <button onClick={() => handleDeleteCategoryL1(item)} className="p-1 text-red-600 hover:bg-red-100 rounded">确认</button>
                            ) : (
                              <button onClick={() => setDeleteConfirm(`catL1-${item}`)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">暂无一级分类</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showCategoryL2Modal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">资产分类二级管理</h3>
                <button onClick={() => setShowCategoryL2Modal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">当前一级分类: {newAccount.categoryL1 || '未选择'}</div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={newCategoryL2Name} onChange={e => setNewCategoryL2Name(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCategoryL2()} placeholder="输入二级分类名称" className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  <button onClick={handleAddCategoryL2} className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {((categoryL2OptionsMap[newAccount.categoryL1] || []).length > 0) ? (
                    (categoryL2OptionsMap[newAccount.categoryL1] || []).map((item) => (
                      <div key={item} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        {categoryL2ToEdit === item ? (
                          <>
                            <input type="text" value={newCategoryL2Name || item} onChange={e => setNewCategoryL2Name(e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-600 dark:text-white" autoFocus />
                            <button onClick={handleSaveCategoryL2Edit} className="p-1 text-green-600 hover:bg-green-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => { setCategoryL2ToEdit(null); setNewCategoryL2Name(''); }} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-gray-700 dark:text-gray-300">{item}</span>
                            <button onClick={() => { setCategoryL2ToEdit(item); setNewCategoryL2Name(item); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            {deleteConfirm === `catL2-${item}` ? (
                              <button onClick={() => handleDeleteCategoryL2(item)} className="p-1 text-red-600 hover:bg-red-100 rounded">确认</button>
                            ) : (
                              <button onClick={() => setDeleteConfirm(`catL2-${item}`)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">暂无二级分类</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showCategoryL3Modal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">资产分类三级管理</h3>
                <button onClick={() => setShowCategoryL3Modal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">当前一级分类: {newAccount.categoryL1 || '未选择'} | 二级分类: {newAccount.categoryL2 || '未选择'}</div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={newCategoryL3Name} onChange={e => setNewCategoryL3Name(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCategoryL3()} placeholder="输入三级分类名称" className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  <button onClick={handleAddCategoryL3} className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(() => {
                    const key = `${newAccount.categoryL1}__${newAccount.categoryL2}`;
                    const options = categoryL3OptionsMap[key] || [];
                    return options.length > 0 ? (
                      options.map((item) => (
                        <div key={item} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                          {categoryL3ToEdit === item ? (
                            <>
                              <input type="text" value={newCategoryL3Name || item} onChange={e => setNewCategoryL3Name(e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-600 dark:text-white" autoFocus />
                              <button onClick={handleSaveCategoryL3Edit} className="p-1 text-green-600 hover:bg-green-100 rounded"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => { setCategoryL3ToEdit(null); setNewCategoryL3Name(''); }} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 text-gray-700 dark:text-gray-300">{item}</span>
                              <button onClick={() => { setCategoryL3ToEdit(item); setNewCategoryL3Name(item); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                              {deleteConfirm === `catL3-${item}` ? (
                                <button onClick={() => handleDeleteCategoryL3(item)} className="p-1 text-red-600 hover:bg-red-100 rounded">确认</button>
                              ) : (
                                <button onClick={() => setDeleteConfirm(`catL3-${item}`)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                              )}
                            </>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-400 text-sm">暂无三级分类</div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {showCategoryL4Modal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">资产四级分类管理</h3>
                <button onClick={() => setShowCategoryL4Modal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">当前一级分类: {newAccount.categoryL1 || '未选择'}</div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={newCategoryL4Name} onChange={e => setNewCategoryL4Name(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCategoryL4()} placeholder="输入分类名称" className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  <button onClick={handleAddCategoryL4} className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(categoryL4Options[newAccount.categoryL1] || []).length > 0 ? (
                    (categoryL4Options[newAccount.categoryL1] || []).map((item) => (
                      <div key={item} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        {categoryL4ToEdit === item ? (
                          <>
                            <input type="text" value={newCategoryL4Name || item} onChange={e => setNewCategoryL4Name(e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-600 dark:text-white" autoFocus />
                            <button onClick={handleSaveCategoryL4Edit} className="p-1 text-green-600 hover:bg-green-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => { setCategoryL4ToEdit(null); setNewCategoryL4Name(''); }} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-gray-700 dark:text-gray-300">{item}</span>
                            <button onClick={() => { setCategoryL4ToEdit(item); setNewCategoryL4Name(item); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            {deleteConfirm === `catL4-${item}` ? (
                              <button onClick={() => handleDeleteCategoryL4(item)} className="p-1 text-red-600 hover:bg-red-100 rounded">确认</button>
                            ) : (
                              <button onClick={() => setDeleteConfirm(`catL4-${item}`)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">暂无自定义分类</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showPositionGroupModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">持仓分组管理</h3>
                <button onClick={() => setShowPositionGroupModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={newPositionGroupName} onChange={e => setNewPositionGroupName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddPositionGroup()} placeholder="输入分组名称" className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  <button onClick={handleAddPositionGroup} className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {positionGroupOptions.length > 0 ? (
                    positionGroupOptions.map((item) => (
                      <div key={item} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        {positionGroupToEdit === item ? (
                          <>
                            <input type="text" value={newPositionGroupName || item} onChange={e => setNewPositionGroupName(e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-600 dark:text-white" autoFocus />
                            <button onClick={handleSavePositionGroupEdit} className="p-1 text-green-600 hover:bg-green-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => { setPositionGroupToEdit(null); setNewPositionGroupName(''); }} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-gray-700 dark:text-gray-300">{item}</span>
                            <button onClick={() => { setPositionGroupToEdit(item); setNewPositionGroupName(item); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            {deleteConfirm === `pg-${item}` ? (
                              <button onClick={() => handleDeletePositionGroup(item)} className="p-1 text-red-600 hover:bg-red-100 rounded">确认</button>
                            ) : (
                              <button onClick={() => setDeleteConfirm(`pg-${item}`)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">暂无持仓分组</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showPositionTypeModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">持仓分类管理</h3>
                <button onClick={() => setShowPositionTypeModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={newPositionTypeName} onChange={e => setNewPositionTypeName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddPositionType()} placeholder="输入分类名称" className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  <button onClick={handleAddPositionType} className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {positionTypeOptions.length > 0 ? (
                    positionTypeOptions.map((item) => (
                      <div key={item} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        {positionTypeToEdit === item ? (
                          <>
                            <input type="text" value={newPositionTypeName || item} onChange={e => setNewPositionTypeName(e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-600 dark:text-white" autoFocus />
                            <button onClick={handleSavePositionTypeEdit} className="p-1 text-green-600 hover:bg-green-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => { setPositionTypeToEdit(null); setNewPositionTypeName(''); }} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-gray-700 dark:text-gray-300">{item}</span>
                            <button onClick={() => { setPositionTypeToEdit(item); setNewPositionTypeName(item); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            {deleteConfirm === `pt-${item}` ? (
                              <button onClick={() => handleDeletePositionType(item)} className="p-1 text-red-600 hover:bg-red-100 rounded">确认</button>
                            ) : (
                              <button onClick={() => setDeleteConfirm(`pt-${item}`)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">暂无持仓分类</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

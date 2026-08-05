import { useMemo } from 'react';
import {
  PieChart, Pie, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import {
  Wallet, DollarSign, TrendingUp, TrendingDown, PieChart as PieChartIcon, Activity, BarChart3
} from 'lucide-react';
import { truncateNum } from '../utils/currency';

const CATEGORY_CONFIG = {
  insurance: { name: '保险', color: '#EC4899' },
  realestate: { name: '房产', color: '#06B6D4' },
  vehicle: { name: '车辆', color: '#F59E0B' },
  fixedinvestment: { name: '固定投资', color: '#8B5CF6' },
  equity: { name: '股权', color: '#10B981' },
  fixeddeposit: { name: '定期资产', color: '#3B82F6' },
};

const COLORS = ['#EC4899', '#06B6D4', '#F59E0B', '#8B5CF6', '#10B981', '#3B82F6'];

function formatCurrency(value) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(truncateNum(value || 0, 3));
}

function formatCurrencyShort(value) {
  const num = parseFloat(value) || 0;
  if (num >= 100000000) return `${truncateNum(num / 100000000, 3)}亿`;
  if (num >= 10000) return `${truncateNum(num / 10000, 3)}万`;
  return formatCurrency(num);
}

function formatPercentage(value) {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function calculateVehicleResidualValue(item) {
  const purchasePrice = parseFloat(item.purchasePrice) || 0;
  const purchaseDate = item.purchaseDate ? new Date(item.purchaseDate) : null;
  const years = purchaseDate ? (new Date() - purchaseDate) / (1000 * 60 * 60 * 24 * 365) : 0;
  const residualRate = Math.max(0, 1 - years * 0.1);
  return { residualValue: purchasePrice * residualRate };
}

function getItemValue(type, item) {
  if (type === 'insurance') return parseFloat(item.premiumTotal || 0);
  if (type === 'realestate') {
    if (item.usage === '出租') return parseFloat(item.purchasePrice || 0);
    const marketValue = parseFloat(item.marketValue || 0);
    const taxAmount = parseFloat(item.taxAmount || 0);
    const agencyFeeAmount = parseFloat(item.agencyFeeAmount || 0);
    return marketValue > 0 ? (marketValue - taxAmount - agencyFeeAmount) : parseFloat(item.purchasePrice || 0);
  }
  if (type === 'vehicle') return calculateVehicleResidualValue(item).residualValue;
  if (type === 'fixedinvestment') return parseFloat(item.investmentCost || 0);
  if (type === 'equity') return parseFloat(item.marketValue || 0);
  if (type === 'fixeddeposit') return parseFloat(item.amount || 0);
  return 0;
}

function getItemCost(type, item) {
  if (type === 'insurance') return parseFloat(item.premiumTotal || 0);
  if (type === 'realestate') return parseFloat(item.purchasePrice || 0);
  if (type === 'vehicle') return parseFloat(item.purchasePrice || 0);
  if (type === 'fixedinvestment') return parseFloat(item.investmentCost || 0);
  if (type === 'equity') return parseFloat(item.investmentCost || 0);
  if (type === 'fixeddeposit') return parseFloat(item.amount || 0);
  return 0;
}

function getItemDate(type, item) {
  if (type === 'insurance') return item.policyDate || item.startDate || item.createdAt;
  if (type === 'realestate') return item.purchaseDate || item.createdAt;
  if (type === 'vehicle') return item.purchaseDate || item.createdAt;
  if (type === 'fixedinvestment') return item.investmentDate || item.createdAt;
  if (type === 'equity') return item.investmentDate || item.purchaseDate || item.createdAt;
  if (type === 'fixeddeposit') return item.depositDate || item.startDate || item.createdAt;
  return item.createdAt;
}

function getCategoryCashflow(type, item) {
  const events = [];
  const itemDate = getItemDate(type, item);
  if (itemDate) {
    const cost = getItemCost(type, item);
    if (cost > 0) {
      events.push({ date: itemDate, amount: -cost, type: '投资' });
    }
  }
  if (type === 'fixedinvestment' && item.dividendRecords && Array.isArray(item.dividendRecords)) {
    item.dividendRecords.forEach(r => {
      if (r.dividendDate && r.dividendAmount) {
        events.push({ date: r.dividendDate, amount: parseFloat(r.dividendAmount) || 0, type: '分红' });
      }
    });
  }
  if (type === 'fixeddeposit' && item.actualReturn) {
    const returnDate = item.maturityDate || item.endDate;
    if (returnDate) {
      events.push({ date: returnDate, amount: parseFloat(item.actualReturn) || 0, type: '利息' });
    }
  }
  if (type === 'equity' && item.pnl) {
    const pnl = parseFloat(item.pnl) || 0;
    if (pnl !== 0) {
      events.push({ date: item.updatedAt || itemDate, amount: pnl, type: '盈亏' });
    }
  }
  if (type === 'realestate' && item.rentalRecords && Array.isArray(item.rentalRecords)) {
    item.rentalRecords.forEach(r => {
      if (r.date && r.income) {
        events.push({ date: r.date, amount: parseFloat(r.income) || 0, type: '租金' });
      }
    });
  }
  return events;
}

export default function IndependentAssetAnalysis({ independentAssets }) {
  const assets = independentAssets || {};

  const summaryMetrics = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    Object.keys(assets).forEach(type => {
      const items = assets[type] || [];
      items.forEach(item => {
        totalValue += getItemValue(type, item);
        totalCost += getItemCost(type, item);
      });
    });
    const totalPnl = totalValue - totalCost;
    const totalPnlRate = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
    return { totalValue, totalCost, totalPnl, totalPnlRate };
  }, [assets]);

  const categoryDistribution = useMemo(() => {
    const allTypes = new Set([...Object.keys(CATEGORY_CONFIG), ...Object.keys(assets)]);
    return Array.from(allTypes).map(type => {
      const items = assets[type] || [];
      const config = CATEGORY_CONFIG[type] || { name: type, color: '#999999' };
      const value = items.reduce((sum, item) => sum + getItemValue(type, item), 0);
      return {
        name: config.name,
        value,
        color: config.color,
      };
    }).filter(d => d.value > 0);
  }, [assets]);

  const valueTrend = useMemo(() => {
    const months = {};
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { month: `${date.getMonth() + 1}月`, value: 0, label: key };
    }

    Object.keys(assets).forEach(type => {
      const items = assets[type] || [];
      items.forEach(item => {
        const itemDate = getItemDate(type, item);
        if (itemDate) {
          const date = new Date(itemDate);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (months[key]) {
            months[key].value += getItemValue(type, item);
          }
        }
      });
    });

    let accumulated = 0;
    const sortedKeys = Object.keys(months).sort();
    return sortedKeys.map(key => {
      accumulated += months[key].value;
      return { month: months[key].month, value: accumulated };
    });
  }, [assets]);

  const cashflowData = useMemo(() => {
    const months = {};
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { month: `${date.getMonth() + 1}月`, investment: 0, return: 0 };
    }

    Object.keys(assets).forEach(type => {
      const items = assets[type] || [];
      items.forEach(item => {
        const events = getCategoryCashflow(type, item);
        events.forEach(ev => {
          if (ev.date) {
            const date = new Date(ev.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (months[key]) {
              if (ev.amount < 0) {
                months[key].investment += Math.abs(ev.amount);
              } else {
                months[key].return += ev.amount;
              }
            }
          }
        });
      });
    });

    return Object.values(months);
  }, [assets]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5" />
            <span className="text-blue-100 text-sm">独立总资金</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(summaryMetrics.totalValue)}</p>
        </div>
        <div className={`bg-gradient-to-br ${summaryMetrics.totalPnl >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'} rounded-xl p-5 text-white`}>
          <div className="flex items-center gap-2 mb-2">
            {summaryMetrics.totalPnl >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            <span className="text-white/90 text-sm">独立资产收益额</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(summaryMetrics.totalPnl)}</p>
        </div>
        <div className={`bg-gradient-to-br ${summaryMetrics.totalPnlRate >= 0 ? 'from-purple-500 to-purple-600' : 'from-orange-500 to-orange-600'} rounded-xl p-5 text-white`}>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5" />
            <span className="text-white/90 text-sm">独立资产收益率</span>
          </div>
          <p className="text-2xl font-bold">{formatPercentage(summaryMetrics.totalPnlRate)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200/60 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-blue-600" />
            独立资产类别占比
          </h3>
          <div className="w-full h-[320px]">
            {categoryDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  >
                    {categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${formatCurrency(value)}`, '金额']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">暂无数据</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200/60 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600" />
            独立资产走势图
          </h3>
          <div className="w-full h-[320px]">
            {valueTrend.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={valueTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={formatCurrencyShort} />
                  <Tooltip formatter={(value) => [`${formatCurrency(value)}`, '累计市值']} />
                  <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">暂无数据</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200/60 dark:border-slate-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-orange-600" />
          各种资产月现金流
        </h3>
        <div className="w-full h-[320px]">
          {cashflowData.some(d => d.investment > 0 || d.return > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashflowData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={formatCurrencyShort} />
                <Tooltip
                  formatter={(value, name) => [
                    `${formatCurrency(value)}`,
                    name === 'investment' ? '投入' : '回报'
                  ]}
                />
                <Legend formatter={(value) => value === 'investment' ? '投入' : '回报'} />
                <Bar dataKey="investment" fill="#ef4444" name="investment" />
                <Bar dataKey="return" fill="#10b981" name="return" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">暂无现金流数据</div>
          )}
        </div>
      </div>
    </div>
  );
}

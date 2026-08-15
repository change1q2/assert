import { PieChart, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getCurrencySymbol,
  formatCurrencyWithRate,
  formatPercentage,
  pnlClass,
  pnlSign,
} from './FinanceHoldingsTable.utils';

export function HoldingsSummaryCard({ summary, selectedCurrency = 'CNY', exchangeRates = {}, categoryName = 'active' }) {
  const src = selectedCurrency || 'CNY';
  if (categoryName === 'archived') {
    const isFinalPos = summary.totalFinalPnl >= 0;
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-soft border border-gray-100 dark:border-slate-700 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full p-1.5">
            <PieChart className="w-4 h-4" />
          </div>
          <span className="font-semibold text-gray-900 dark:text-white text-sm">筛选汇总</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">最终总盈亏</p>
            <p className={`text-sm font-bold tabular-nums ${isFinalPos ? 'text-green-600' : 'text-red-500'}`}>
              {pnlSign(summary.totalFinalPnl)}{formatCurrencyWithRate(summary.totalFinalPnl, src, selectedCurrency, exchangeRates).replace(getCurrencySymbol(selectedCurrency), '')}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">最终总收益率</p>
            <p className={`text-sm font-bold tabular-nums ${isFinalPos ? 'text-green-600' : 'text-red-500'}`}>
              {formatPercentage(summary.totalFinalPnlRate)}
            </p>
          </div>
        </div>
      </div>
    );
  }

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

      <div className="grid grid-cols-4 gap-2 text-center mb-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">当前总市值</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrencyWithRate(summary.totalMarketValue, src, selectedCurrency, exchangeRates)}</p>
        </div>
        {summary.totalCash != null && (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">当前总现金</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrencyWithRate(summary.totalCash, src, selectedCurrency, exchangeRates)}</p>
          </div>
        )}
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">持仓总成本</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrencyWithRate(summary.totalCost, src, selectedCurrency, exchangeRates)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">持仓总盈亏</p>
          <p className={`text-sm font-bold tabular-nums ${isPos ? 'text-green-600' : 'text-red-500'}`}>
            {pnlSign(summary.totalPnl)}{formatCurrencyWithRate(summary.totalPnl, src, selectedCurrency, exchangeRates).replace(getCurrencySymbol(selectedCurrency), '')}
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
            {pnlSign(summary.totalDailyPnl)}{formatCurrencyWithRate(summary.totalDailyPnl, src, selectedCurrency, exchangeRates).replace(getCurrencySymbol(selectedCurrency), '')}
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

export function Pagination({ page, totalPages, totalCount, onPageChange, pageSize, onPageSizeChange, pageSizeOptions = [10, 20, 50, 100] }) {
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
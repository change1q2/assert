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
  HelpCircle,
} from 'lucide-react';
import { truncateNum, CURRENCIES, DEFAULT_EXCHANGE_RATES, getCurrencySymbol } from '../utils/currency';

function formatCurrency(value, currencyCode = 'CNY') {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(truncateNum(value || 0, 3));
}

function formatNumber(value, digits = 2) {
  return (value || 0).toFixed(digits);
}

function formatCurrencyShort(value, currencyCode = 'CNY') {
  const num = parseFloat(value) || 0;
  const symbol = getCurrencySymbol(currencyCode);
  if (Math.abs(num) >= 100000000) {
    return `${symbol}${truncateNum(num / 100000000, 3)}亿`;
  }
  if (Math.abs(num) >= 10000) {
    return `${symbol}${truncateNum(num / 10000, 3)}万`;
  }
  return formatCurrency(num, currencyCode);
}

function convertToBase(amount, fromCurrency, exchangeRates = DEFAULT_EXCHANGE_RATES) {
  if (!fromCurrency || fromCurrency === 'CNY') return amount;
  const rate = exchangeRates[fromCurrency] ?? 1;
  return amount * rate;
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
  const [showRepaymentGuide, setShowRepaymentGuide] = useState(false);
  const [pagination, setPagination] = useState({});
  const [pageSizes, setPageSizes] = useState({});
  
  const DEFAULT_PAGE_SIZE = 20;
  const PAGE_SIZE_OPTIONS = [20, 50, 100];
  const [cardSizes, setCardSizes] = useState({});
  const [resizingCard, setResizingCard] = useState(null);

  const handleResizeStart = (e, cardId) => {
    e.preventDefault();
    setResizingCard(cardId);
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResize = (e) => {
    if (!resizingCard) return;
    const card = document.getElementById(`card-${resizingCard}`);
    if (card) {
      const newWidth = Math.max(300, Math.min(window.innerWidth - 40, e.clientX - card.getBoundingClientRect().left));
      setCardSizes(prev => ({ ...prev, [resizingCard]: `${newWidth}px` }));
    }
  };

  const handleResizeEnd = () => {
    setResizingCard(null);
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  const renderDebtCard = (debt, color) => {
    const colorClasses = {
      red: {
        bg: 'bg-red-500',
        lightBg: 'bg-red-50',
        text: 'text-red-600',
        border: 'border-red-200',
        badge: 'bg-red-100 text-red-700',
      },
      emerald: {
        bg: 'bg-emerald-500',
        lightBg: 'bg-emerald-50',
        text: 'text-emerald-600',
        border: 'border-emerald-200',
        badge: 'bg-emerald-100 text-emerald-700',
      },
    };
    const cls = colorClasses[color] || colorClasses.red;
    
    const plan = calculateRepayment(debt.principal, debt.annualRate, debt.repaymentMethod, debt.startDate, debt.dueDate, debt.paidAmount, isConsumerLoan(debt.debtCategory), debt.investmentDays);
    const payments = debt.payments || {};

    const cardWidth = cardSizes[debt.id] || '100%';
    
    return (
      <div 
        id={`card-${debt.id}`}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-gray-100 dark:border-slate-700 overflow-hidden relative"
        style={{ width: cardWidth, maxWidth: '100%' }}
      >
        <div 
          className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-tl-lg rounded-br-lg"
          onMouseDown={(e) => handleResizeStart(e, debt.id)}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 10L10 2M10 10V2H2" />
          </svg>
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${cls.bg}`}>
                {(debt.creditor || debt.name || '债').charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{debt.creditor || debt.name || '未知'}</h3>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${cls.badge}`}>
                  {debt.type || (debt.category === 'payable' ? '借入' : '借出')}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold tabular-nums ${cls.text}`}>{formatCurrency(debt.amount || 0, debt.currency || 'CNY')}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">总金额</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">本金</div>
              <div className="font-semibold text-gray-900 dark:text-white tabular-nums">{formatCurrency(debt.principal || debt.amount || 0, debt.currency || 'CNY')}</div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">利率</div>
              <div className="font-semibold text-gray-900 dark:text-white tabular-nums">{debt.annualRate !== undefined ? `${debt.annualRate}%` : '-'}</div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">利息</div>
              <div className="font-semibold text-gray-900 dark:text-white tabular-nums">{formatCurrency(plan?.totalInterest || 0, debt.currency || 'CNY')}</div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">已还</div>
              <div className="font-semibold text-gray-900 dark:text-white tabular-nums">{formatCurrency(debt.paidAmount || 0, debt.currency || 'CNY')}</div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">剩余</div>
              <div className={`font-semibold tabular-nums ${(debt.amount - (debt.paidAmount || 0) > 0) ? cls.text : 'text-emerald-600'}`}>
                {formatCurrency((debt.amount || 0) - (debt.paidAmount || 0), debt.currency || 'CNY')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-4">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">债务人</div>
              <div className="text-sm text-gray-900 dark:text-white">{debt.debtor || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">还款方式</div>
              <div className="text-sm text-gray-900 dark:text-white">{plan?.methodLabel || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">状态</div>
              {(() => {
                // 三级状态：true=已还, false=手动标记为正常(不逾期), undefined=自动计算
                const hasOverduePayment = plan?.schedule?.some(item => {
                  const status = payments[item.period];
                  if (status === true || status === false) return false; // 已还 or 手动标记正常，均不算逾期
                  // 只有 undefined（未手动操作）才走自动日期判断
                  return new Date(item.date) < new Date();
                });
                const isManuallyOverdue = debt.status === 'overdue';
                const showOverdue = hasOverduePayment || isManuallyOverdue;
                return (
                  <div className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                    showOverdue
                      ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300'
                  }`}>
                    {showOverdue ? '逾期未还' : '正常'}
                  </div>
                );
              })()}
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">罚息</div>
              <div className="text-sm text-gray-900 dark:text-white tabular-nums">{formatCurrency(debt.penaltyInterest || 0, debt.currency || 'CNY')}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">借入日期</div>
              <div className="text-sm text-gray-900 dark:text-white">{formatDate(debt.startDate)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">还款日期</div>
              <div className="text-sm text-gray-900 dark:text-white">{formatDate(debt.dueDate)}</div>
            </div>
          </div>

          {debt.note && (
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 mb-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">备注</div>
              <div className="text-sm text-gray-900 dark:text-white">{debt.note}</div>
            </div>
          )}

          {plan?.schedule && plan.schedule.length > 0 && (
            <div className="border-t border-gray-100 dark:border-slate-700 pt-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                还款计划 ({plan.periods} 期)
              </h4>
              
              {(() => {
                const currentPageSize = pageSizes[debt.id] || DEFAULT_PAGE_SIZE;
                const totalPages = Math.ceil(plan.schedule.length / currentPageSize);
                const currentPage = pagination[debt.id] || 1;
                
                const firstUnpaidIndex = plan.schedule.findIndex((item) => payments[item.period] !== true); // 手动标记正常(false)也视为未还，参与分页定位
                const defaultPage = firstUnpaidIndex >= 0 
                  ? Math.ceil((firstUnpaidIndex + 1) / currentPageSize)
                  : 1;
                
                const pageToShow = pagination[debt.id] || defaultPage;
                const startIdx = (pageToShow - 1) * currentPageSize;
                const endIdx = Math.min(startIdx + currentPageSize, plan.schedule.length);
                const currentSchedule = plan.schedule.slice(startIdx, endIdx);
                
                const handlePageChange = (newPage) => {
                  setPagination(prev => ({ ...prev, [debt.id]: newPage }));
                };
                
                const handlePageSizeChange = (newSize) => {
                  setPageSizes(prev => ({ ...prev, [debt.id]: newSize }));
                  setPagination(prev => ({ ...prev, [debt.id]: 1 }));
                };
                
                return (
                  <>
                    <div className="max-h-64 overflow-y-auto">
                      <div className="overflow-x-auto min-w-full">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-slate-700/50 sticky top-0">
                              <th className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">期数</th>
                              <th className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">还款日期</th>
                              <th className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">本金</th>
                              <th className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">利息</th>
                              <th className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">还款额</th>
                              <th className="text-center py-2 px-3 text-gray-500 font-medium whitespace-nowrap">状态</th>
                              <th className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">罚息</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentSchedule.map((item, idx) => {
                              const originalIdx = startIdx + idx;
                              // 三级状态：true=已还, false=手动标记正常(不逾期), undefined=自动计算
                              const periodStatus = payments[item.period];
                              const isPaid = periodStatus === true;
                              const isManuallyNormal = periodStatus === false; // 手动标记为正常（未还但不逾期）
                              const isOverdue = !isPaid && !isManuallyNormal && new Date(item.date) < new Date();
                              const periodPenalty = debt.periodPenalties?.[item.period] || 0;
                              return (
                                <tr key={originalIdx} className={`border-b border-gray-100 dark:border-slate-700/50 ${isPaid ? 'bg-green-50/50 dark:bg-green-900/20' : isOverdue ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                                  <td className="py-2 px-3 text-gray-900 dark:text-white font-medium">第 {item.period} 期</td>
                                  <td className="py-2 px-3 text-gray-600 dark:text-gray-300">{formatDate(item.date)}</td>
                                  <td className="py-2 px-3 text-left text-gray-900 dark:text-white tabular-nums">{formatCurrency(item.principal, debt.currency || 'CNY')}</td>
                                  <td className="py-2 px-3 text-left text-gray-900 dark:text-white tabular-nums">{formatCurrency(item.interest, debt.currency || 'CNY')}</td>
                                  <td className="py-2 px-3 text-left font-medium tabular-nums">{formatCurrency(item.total, debt.currency || 'CNY')}</td>
                                  <td className="py-2 px-3 text-center">
                                    <button
                                      onClick={() => handlePaymentToggle(debt, item.period)}
                                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                                        isPaid
                                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                          : isOverdue
                                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
                                      }`}
                                    >
                                      {isPaid ? (
                                        <>
                                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                          已还
                                        </>
                                      ) : isOverdue ? (
                                        <>
                                          <AlertTriangle className="w-3 h-3" />
                                          已逾期
                                        </>
                                      ) : (
                                        <>
                                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                          未还
                                        </>
                                      )}
                                    </button>
                                  </td>
                                  <td className="py-2 px-3 text-left">
                                    <input
                                      type="number"
                                      value={periodPenalty || ''}
                                      onChange={(e) => handlePeriodPenaltyChange(debt, item.period, e.target.value)}
                                      placeholder="0"
                                      className="w-20 px-1.5 py-0.5 text-xs border border-gray-200 dark:border-slate-600 rounded dark:bg-slate-700 text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    {(totalPages > 1 || plan.schedule.length > DEFAULT_PAGE_SIZE) && (
                      <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 flex-wrap">
                        <button
                          onClick={() => handlePageChange(Math.max(1, pageToShow - 1))}
                          disabled={pageToShow === 1}
                          className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700"
                        >
                          上一页
                        </button>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          第 {pageToShow} / {totalPages} 页
                        </span>
                        <button
                          onClick={() => handlePageChange(Math.min(totalPages, pageToShow + 1))}
                          disabled={pageToShow === totalPages}
                          className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700"
                        >
                          下一页
                        </button>
                        <div className="flex items-center gap-1 ml-2">
                          <span className="text-sm text-gray-500">每页:</span>
                          <select
                            value={currentPageSize}
                            onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                            className="px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            {PAGE_SIZE_OPTIONS.map((size) => (
                              <option key={size} value={size}>{size}条</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
            {debt.attachment && (
              <button onClick={() => setPreviewImage(debt.attachment)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-slate-700">
                <Eye className="w-4 h-4" />
                查看附件
              </button>
            )}
            <button onClick={() => handleStatusToggle(debt)} className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border text-sm transition-colors ${
              debt.status === 'overdue'
                ? 'border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700'
            }`}>
              {debt.status === 'overdue' ? '标记正常' : '标记逾期'}
            </button>
            <button onClick={() => openEditModal(debt)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-slate-700">
              编辑
            </button>
            <button onClick={() => handleDelete(debt)} className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600 transition-colors">
              <Trash2 className="w-4 h-4" />
              删除
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCategoryCard = (cat, catDebts, totalAmount, cardKey, isExpanded, color) => {
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
          <div className="border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4 space-y-4">
            {catDebts.map((debt) => (
              <div key={debt.id}>{renderDebtCard(debt, color)}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const DEFAULT_CATEGORIES = ['信用卡', '房贷', '车贷', '消费贷', '亲友借款', '他人借款'];
  const defaultCategories = DEFAULT_CATEGORIES.map((name, idx) => ({ id: `cat_${idx}`, name }));
  const debtCategories = stateData?.debtCategories?.length > 0 
    ? stateData.debtCategories 
    : defaultCategories;

  const [form, setForm] = useState({
    category: 'payable',
    type: '借入',
    debtCategory: 'cat_5',
    account: '',
    creditor: '',
    debtor: '',
    currency: 'CNY',
    principal: '',
    annualRate: '',
    amount: '',
    startDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    repaymentMethod: 'equalPrincipalInterest',
    paidAmount: '0',
    attachment: '',
    note: '',
    investmentDays: '365',
  });

  const { debts = [] } = stateData || {};

  useEffect(() => {
    loadData();
  }, []);

  const normalizeDebtPayments = (debts) => {
    if (!Array.isArray(debts)) return debts;
    return debts.map(debt => {
      if (!debt.payments) return debt;
      const normalized = {};
      for (const [k, v] of Object.entries(debt.payments)) {
        normalized[k] = (v === true || v === 'true' || v === 1 || v === '1') ? true : false;
      }
      return { ...debt, payments: normalized };
    });
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchState();
      if (data) {
        if (!data.accounts || data.accounts.length === 0) {
          const cachedAccounts = localStorage.getItem('wealth_os_accounts');
          if (cachedAccounts) {
            try {
              data.accounts = JSON.parse(cachedAccounts);
            } catch {
              /* ignore parse error */
            }
          }
        }
        if (data.debts) {
          data.debts = normalizeDebtPayments(data.debts);
        }
        setStateData(data);
      }
    } catch (err) {
      console.error('Failed to load debts data:', err);
      const cachedAccounts = localStorage.getItem('wealth_os_accounts');
      if (cachedAccounts) {
        try {
          const accounts = JSON.parse(cachedAccounts);
          setStateData({ debts: [], accounts, records: [] });
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

  const resetForm = (debt = null) => {
    setTotalAmountOverridden(false);
    if (debt) {
      setForm({
        category: debt.category || 'payable',
        type: debt.type || '借入',
        debtCategory: debt.debtCategory || debtCategories[0]?.id || '',
        account: debt.account || '',
        creditor: debt.creditor || debt.name || '',
        debtor: debt.debtor || '',
        currency: debt.currency || 'CNY',
        principal: debt.principal !== undefined ? String(debt.principal) : '',
        annualRate: debt.annualRate !== undefined ? String(debt.annualRate) : (debt.interestRate !== undefined ? String(debt.interestRate) : ''),
        amount: debt.amount !== undefined ? String(debt.amount) : '',
        startDate: debt.startDate || new Date().toISOString().split('T')[0],
        dueDate: debt.dueDate || '',
        repaymentMethod: debt.repaymentMethod || 'equalPrincipalInterest',
        paidAmount: debt.paidAmount !== undefined ? String(debt.paidAmount) : '0',
        attachment: debt.attachment || '',
        note: debt.note || debt.remark || '',
        status: debt.status || 'normal',
        penaltyInterest: debt.penaltyInterest !== undefined ? String(debt.penaltyInterest) : '0',
        investmentDays: debt.investmentDays !== undefined ? String(debt.investmentDays) : '365',
      });
      setEditingDebt(debt);
    } else {
      setForm({
        category: 'payable',
        type: '借入',
        debtCategory: debtCategories[0]?.id || '',
        account: '',
        creditor: '',
        debtor: '',
        currency: 'CNY',
        principal: '',
        annualRate: '',
        amount: '',
        startDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        repaymentMethod: 'equalPrincipalInterest',
        paidAmount: '0',
        attachment: '',
        note: '',
        status: 'normal',
        penaltyInterest: '0',
        investmentDays: '365',
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
    setEditingDebt(debt);
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

  // 统一构造提交给 saveState 的全量 state：始终基于 stateData（已包含 accounts/financeAssets 等），
  // 避免 Strict Mode 下 setStateData updater 被双调用导致 newStateData 被覆盖，同时确保核心字段齐全以通过后端防清空校验。
  const buildStateWithUpdatedDebt = (updatedDebt) => {
    const base = stateData || {};
    const debts = Array.isArray(base.debts) ? base.debts : [];
    const newDebts = debts.length > 0
      ? debts.map((d) => (String(d.id) === String(updatedDebt.id) ? { ...d, ...updatedDebt } : d))
      : [{ ...updatedDebt }];
    // 确保带上全部核心字段以通过后端 DATA_LOSS_PREVENTION 校验。
    // stateData 来自 fetchState，本身应完整；此处再做兜底以避免局部 state 造成误判。
    return { ...base, debts: newDebts };
  };

  const handlePaymentToggle = async (debt, period) => {
    const plan = calculateRepayment(debt.principal, debt.annualRate, debt.repaymentMethod, debt.startDate, debt.dueDate, debt.paidAmount, isConsumerLoan(debt.debtCategory), debt.investmentDays);
    const paymentItem = plan?.schedule?.find((s) => s.period === period);
    if (!paymentItem) return;

    const newPayments = { ...(debt.payments || {}) };
    const currentStatus = newPayments[period]; // true=已还, false=手动正常, undefined=自动

    // 三级状态循环切换：undefined（自动） → true（已还） → false（手动标记正常/未还但不逾期） → undefined（回到自动）
    // 但针对"逾期未还"场景：用户点击"已逾期"按钮时最常见诉求是标记为已还款，
    // 所以优化路径：若当前是自动且已逾期，先跳到 true（已还）；true → false（手动正常，避免逾期红标）；false → undefined（回到自动）
    if (currentStatus === undefined) {
      newPayments[period] = true; // 第1步：自动 → 已还
    } else if (currentStatus === true) {
      newPayments[period] = false; // 第2步：已还 → 手动标记正常（未还但不显示逾期，永久保存）
    } else {
      // currentStatus === false：手动正常 → 回到自动计算
      delete newPayments[period];
    }

    // paidAmount 只统计 payments[period] === true 的期数（手动标记正常的不累计到已还金额）
    const paidPeriods = Object.keys(newPayments).filter((k) => newPayments[k] === true);
    const newPaidAmount = paidPeriods.reduce((sum, p) => {
      const item = (plan?.schedule || []).find((s) => s.period === parseInt(p, 10));
      return sum + (item?.total || 0);
    }, 0);

    const updatedDebt = { ...debt, payments: newPayments, paidAmount: newPaidAmount };
    const newStateData = buildStateWithUpdatedDebt(updatedDebt);

    // 立即更新前端状态以即时反馈
    setStateData(newStateData);
    const result = await saveState(newStateData);
    // 如果保存失败（例如后端拒绝），重新拉取一次保证本地与后端一致
    if (result && result.ok === false) {
      console.error('[handlePaymentToggle] saveState failed:', result);
      await loadData();
    }
  };

  const handlePeriodPenaltyChange = async (debt, period, value) => {
    const penaltyValue = parseFloat(value) || 0;
    const newPeriodPenalties = { ...(debt.periodPenalties || {}) };

    if (penaltyValue > 0) {
      newPeriodPenalties[period] = penaltyValue;
    } else {
      delete newPeriodPenalties[period];
    }

    const totalPenalty = Object.values(newPeriodPenalties).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    const updatedDebt = { ...debt, periodPenalties: newPeriodPenalties, penaltyInterest: totalPenalty };
    const newStateData = buildStateWithUpdatedDebt(updatedDebt);

    setStateData(newStateData);
    const result = await saveState(newStateData);
    if (result && result.ok === false) {
      console.error('[handlePeriodPenaltyChange] saveState failed:', result);
      await loadData();
    }
  };

  const handleStatusToggle = async (debt) => {
    const newStatus = debt.status === 'overdue' ? 'normal' : 'overdue';
    const updatedDebt = { ...debt, status: newStatus };
    const newStateData = buildStateWithUpdatedDebt(updatedDebt);

    setStateData(newStateData);
    const result = await saveState(newStateData);
    if (result && result.ok === false) {
      console.error('[handleStatusToggle] saveState failed:', result);
      await loadData();
    }
  };

  // 判断债务类别是否为消费贷（按日计息）
  const isConsumerLoan = (debtCategory) => {
    const cat = debtCategories.find(c => c.id === debtCategory);
    return cat && cat.name === '消费贷';
  };

  const calculateRepayment = (principal, rate, method, startDate, dueDate, paidAmount = 0, useDailyInterest = false, investmentDays = 365) => {
    const p = parseFloat(principal) || 0;
    const r = parseFloat(rate) || 0;
    if (!p || !dueDate || !startDate) return null;

    const start = new Date(startDate);
    const due = new Date(dueDate);
    const months = Math.max(1, (due.getFullYear() - start.getFullYear()) * 12 + (due.getMonth() - start.getMonth()));
    const monthlyRate = r / 100 / 12;
    const dailyRate = r / 100 / (parseFloat(investmentDays) || 365);

    // 获取某月的天数
    const getDaysInMonth = (date) => {
      return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };
    // 按日计息时，获取某月的实际月利率
    const getEffectiveMonthlyRate = (paymentDate) => {
      if (useDailyInterest) {
        return dailyRate * getDaysInMonth(paymentDate);
      }
      return monthlyRate;
    };

    let totalAmount = 0;
    let totalInterest = 0;
    let eachAmount = 0;
    const schedule = [];

    if (method === 'equalPrincipalInterest') {
      if (useDailyInterest) {
        // 按日计息的等额本息：用平均月利率计算基础月还款额，每月利息按实际天数计算
        const avgMonthlyRate = dailyRate * 30.4167; // 年均月天数
        let remainingPrincipal = p;
        if (avgMonthlyRate === 0) {
          eachAmount = p / months;
        } else {
          const x = Math.pow(1 + avgMonthlyRate, months);
          eachAmount = (p * avgMonthlyRate * x) / (x - 1);
        }
        for (let i = 0; i < months; i++) {
          const paymentDate = new Date(start);
          paymentDate.setMonth(start.getMonth() + i + 1);
          const effRate = getEffectiveMonthlyRate(paymentDate);
          const interest = remainingPrincipal * effRate;
          let principalPart = eachAmount - interest;
          // 最后一期调整，确保本金刚好还完
          if (i === months - 1) {
            principalPart = remainingPrincipal;
          }
          remainingPrincipal -= principalPart;
          if (remainingPrincipal < 0) remainingPrincipal = 0;
          schedule.push({
            period: i + 1,
            date: paymentDate.toISOString().split('T')[0],
            principal: principalPart,
            interest,
            total: principalPart + interest,
          });
        }
        totalInterest = schedule.reduce((s, item) => s + item.interest, 0);
        totalAmount = p + totalInterest;
      } else if (monthlyRate === 0) {
        eachAmount = p / months;
        totalAmount = p;
        totalInterest = 0;
        for (let i = 0; i < months; i++) {
          const paymentDate = new Date(start);
          paymentDate.setMonth(start.getMonth() + i + 1);
          schedule.push({
            period: i + 1,
            date: paymentDate.toISOString().split('T')[0],
            principal: eachAmount,
            interest: 0,
            total: eachAmount,
          });
        }
      } else {
        const x = Math.pow(1 + monthlyRate, months);
        eachAmount = (p * monthlyRate * x) / (x - 1);
        totalAmount = eachAmount * months;
        totalInterest = totalAmount - p;

        let remainingPrincipal = p;
        for (let i = 0; i < months; i++) {
          const interest = remainingPrincipal * monthlyRate;
          const principalPart = eachAmount - interest;
          remainingPrincipal -= principalPart;
          const paymentDate = new Date(start);
          paymentDate.setMonth(start.getMonth() + i + 1);
          schedule.push({
            period: i + 1,
            date: paymentDate.toISOString().split('T')[0],
            principal: principalPart,
            interest,
            total: eachAmount,
          });
        }
      }
    } else if (method === 'equalPrincipal') {
      const basePrincipal = p / months;
      totalInterest = 0;
      let remainingPrincipal = p;

      for (let i = 0; i < months; i++) {
        const paymentDate = new Date(start);
        paymentDate.setMonth(start.getMonth() + i + 1);
        const effRate = getEffectiveMonthlyRate(paymentDate);
        const interest = remainingPrincipal * effRate;
        const totalPayment = basePrincipal + interest;
        totalInterest += interest;
        remainingPrincipal -= basePrincipal;
        schedule.push({
          period: i + 1,
          date: paymentDate.toISOString().split('T')[0],
          principal: basePrincipal,
          interest,
          total: totalPayment,
        });
      }
      totalAmount = p + totalInterest;
      eachAmount = totalAmount / months;
    } else if (method === 'interestOnly') {
      if (useDailyInterest) {
        // 按日计息的先息后本：每月利息 = 本金 × 日利率 × 当月天数
        totalInterest = 0;
        for (let i = 0; i < months - 1; i++) {
          const paymentDate = new Date(start);
          paymentDate.setMonth(start.getMonth() + i + 1);
          const effRate = getEffectiveMonthlyRate(paymentDate);
          const interest = p * effRate;
          totalInterest += interest;
          schedule.push({
            period: i + 1,
            date: paymentDate.toISOString().split('T')[0],
            principal: 0,
            interest,
            total: interest,
          });
        }
        const lastPaymentDate = new Date(start);
        lastPaymentDate.setMonth(start.getMonth() + months);
        const lastEffRate = getEffectiveMonthlyRate(lastPaymentDate);
        const lastInterest = p * lastEffRate;
        totalInterest += lastInterest;
        schedule.push({
          period: months,
          date: lastPaymentDate.toISOString().split('T')[0],
          principal: p,
          interest: lastInterest,
          total: p + lastInterest,
        });
        totalAmount = p + totalInterest;
        eachAmount = totalInterest / months;
      } else {
        totalInterest = p * monthlyRate * months;
        totalAmount = p + totalInterest;
        eachAmount = p * monthlyRate;

        for (let i = 0; i < months - 1; i++) {
          const paymentDate = new Date(start);
          paymentDate.setMonth(start.getMonth() + i + 1);
          schedule.push({
            period: i + 1,
            date: paymentDate.toISOString().split('T')[0],
            principal: 0,
            interest: eachAmount,
            total: eachAmount,
          });
        }
        const lastPaymentDate = new Date(start);
        lastPaymentDate.setMonth(start.getMonth() + months);
        schedule.push({
          period: months,
          date: lastPaymentDate.toISOString().split('T')[0],
          principal: p,
          interest: eachAmount,
          total: p + eachAmount,
        });
      }
    } else if (method === 'lumpSum') {
      if (useDailyInterest) {
        // 按日计息的到期一次性：总利息 = 本金 × 日利率 × 总天数
        const totalDays = Math.max(1, Math.round((due - start) / (1000 * 60 * 60 * 24)));
        totalInterest = p * dailyRate * totalDays;
      } else {
        totalInterest = p * monthlyRate * months;
      }
      totalAmount = p + totalInterest;
      eachAmount = totalAmount;

      const paymentDate = new Date(start);
      paymentDate.setMonth(start.getMonth() + months);
      schedule.push({
        period: 1,
        date: paymentDate.toISOString().split('T')[0],
        principal: p,
        interest: totalInterest,
        total: totalAmount,
      });
    }

    return {
      periods: months,
      methodLabel: method === 'equalPrincipalInterest' ? '等额本息' : method === 'equalPrincipal' ? '等额本金' : method === 'interestOnly' ? '先息后本' : '到期一次性',
      totalAmount,
      totalInterest,
      eachAmount,
      remainingAmount: totalAmount - (parseFloat(paidAmount) || 0),
      schedule,
    };
  };

  const getRepaymentPlan = () => {
    return calculateRepayment(form.principal, form.annualRate, form.repaymentMethod, form.startDate, form.dueDate, form.paidAmount, isConsumerLoan(form.debtCategory), form.investmentDays);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => {
      const newForm = { ...prev, [field]: value };
      if (!totalAmountOverridden && (field === 'principal' || field === 'annualRate' || field === 'startDate' || field === 'dueDate' || field === 'repaymentMethod' || field === 'debtCategory' || field === 'investmentDays')) {
        const plan = calculateRepayment(newForm.principal, newForm.annualRate, newForm.repaymentMethod, newForm.startDate, newForm.dueDate, newForm.paidAmount, isConsumerLoan(newForm.debtCategory), newForm.investmentDays);
        if (plan) {
          newForm.amount = plan.totalAmount.toFixed(2);
        }
      }
      return newForm;
    });
  };

  const handleSave = async () => {
    if (!form.creditor || !form.amount) return;
    setSaving(true);
    try {
      const plan = getRepaymentPlan();
      const existingDebt = editingDebt || null;

      const mergedBase = existingDebt ? { ...existingDebt } : {};

      const mergedForm = {
        ...mergedBase,
        ...form,
        principal: parseFloat(form.principal) || 0,
        annualRate: parseFloat(form.annualRate) || 0,
        amount: parseFloat(form.amount) || 0,
        penaltyInterest: parseFloat(form.penaltyInterest) || 0,
        currency: form.currency || mergedBase.currency || 'CNY',
        id: editingDebt ? editingDebt.id : Date.now(),
        name: form.creditor || '',
        creditorName: form.creditor || '',
        debtorName: form.debtor || '',
        category: form.category || mergedBase.category || 'payable',
        type: form.type || mergedBase.type || '借入',
        debtCategory: form.debtCategory || mergedBase.debtCategory || '',
        status: form.status || mergedBase.status || 'normal',
        payments: mergedBase.payments || {},
        periodPenalties: mergedBase.periodPenalties || {},
        cardWidth: mergedBase.cardWidth || '100%',
      };

      const derivedPaidAmount = (() => {
        const payments = mergedForm.payments || {};
        const paymentPlan = plan || (
          mergedForm.principal && mergedForm.annualRate !== undefined && mergedForm.startDate && mergedForm.dueDate
            ? calculateRepayment(mergedForm.principal, mergedForm.annualRate, mergedForm.repaymentMethod, mergedForm.startDate, mergedForm.dueDate, 0, isConsumerLoan(mergedForm.debtCategory), mergedForm.investmentDays)
            : null
        );
        if (paymentPlan?.schedule && Object.keys(payments).length > 0) {
          return paymentPlan.schedule
            .filter((s) => payments[s.period] === true)
            .reduce((sum, s) => sum + (s.total || 0), 0);
        }
        return parseFloat(form.paidAmount) || 0;
      })();

      const debtData = {
        ...mergedForm,
        paidAmount: derivedPaidAmount,
        remainingAmount: (plan?.remainingAmount !== undefined && plan?.remainingAmount !== null)
          ? plan.remainingAmount
          : mergedForm.amount - derivedPaidAmount,
      };

      let updatedDebts;
      if (editingDebt) {
        updatedDebts = debts.map((d) => (d.id === editingDebt.id ? debtData : d));
      } else {
        updatedDebts = [...debts, debtData];
      }

      const newState = {
        ...(stateData || {}),
        debts: updatedDebts,
      };
      // 立即更新前端以避免延迟感
      setStateData(newState);
      const result = await saveState(newState);

      setShowAddModal(false);
      setTotalAmountOverridden(false);
      resetForm();
      if (result && result.ok === false) {
        console.error('[handleSave] saveState failed:', result);
      }
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
      const newState = {
        ...(stateData || {}),
        debts: updatedDebts,
      };
      setStateData(newState);
      const result = await saveState(newState);
      if (result && result.ok === false) {
        console.error('[handleDelete] saveState failed:', result);
      }
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
    
    const payables = filtered.filter((d) => {
      const type = d.type || (d.category === 'payable' ? '借入' : d.category === 'receivable' ? '借出' : d.category);
      return d.category === 'payable' || type === '借入' || type === '应付';
    });
    const receivables = filtered.filter((d) => {
      const type = d.type || (d.category === 'payable' ? '借入' : d.category === 'receivable' ? '借出' : d.category);
      return d.category === 'receivable' || type === '借出' || type === '应收';
    });

    const pTotal = payables.reduce((s, d) => s + convertToBase(d.amount || 0, d.currency), 0);
    const pPrincipal = payables.reduce((s, d) => s + convertToBase(d.principal || d.amount || 0, d.currency), 0);
    const pInterest = pTotal - pPrincipal;
    
    const pAvgInvestmentDays = payables.length > 0 
      ? payables.reduce((sum, d) => {
          const days = parseFloat(d.investmentDays) || 
            (d.startDate && d.dueDate ? Math.ceil((new Date(d.dueDate) - new Date(d.startDate)) / (1000 * 60 * 60 * 24)) : 365);
          return sum + days;
        }, 0) / payables.length 
      : 365;
    const pRate = pPrincipal > 0 ? (pInterest / pPrincipal) * (365 / pAvgInvestmentDays) * 100 : 0;
    const pDailyRate = pRate / 365;
    const pMonthlyRate = pRate / 12;

    const rTotal = receivables.reduce((s, d) => s + convertToBase(d.amount || 0, d.currency), 0);
    const rPrincipal = receivables.reduce((s, d) => s + convertToBase(d.principal || d.amount || 0, d.currency), 0);
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
    const totalDebtPrincipal = payables.reduce((s, d) => s + convertToBase(d.principal || d.amount || 0, d.currency), 0);
    const totalDebtInterest = payables.reduce((s, d) => s + convertToBase(Math.max(0, (d.amount || 0) - (d.principal || d.amount || 0)), d.currency), 0);

    // 本年待还和本月待还（根据还款计划计算）
    let yearDuePrincipal = 0;
    let yearDueInterest = 0;
    let monthDuePrincipal = 0;
    let monthDueInterest = 0;

    payables.forEach((debt) => {
      const plan = calculateRepayment(debt.principal, debt.annualRate, debt.repaymentMethod, debt.startDate, debt.dueDate, debt.paidAmount, isConsumerLoan(debt.debtCategory), debt.investmentDays);
      if (plan?.schedule) {
        const payments = debt.payments || {};
        const rate = DEFAULT_EXCHANGE_RATES[debt.currency] ?? 1;
        plan.schedule.forEach((period) => {
          const periodDate = new Date(period.date);
          const isPaid = payments[period.period] === true;
          
          if (!isPaid) {
            if (periodDate >= yearStart && periodDate <= yearEnd) {
              yearDuePrincipal += (period.principal || 0) * rate;
              yearDueInterest += (period.interest || 0) * rate;
            }
            if (periodDate >= currentMonthStart && periodDate <= currentMonthEnd) {
              monthDuePrincipal += (period.principal || 0) * rate;
              monthDueInterest += (period.interest || 0) * rate;
            }
          }
        });
      }
    });

    // 逾期未还金额和罚息计算（根据还款计划中的逾期期数）
    let overdueAmount = 0;
    let overdueDebtCount = 0;
    payables.forEach((d) => {
      const plan = calculateRepayment(d.principal, d.annualRate, d.repaymentMethod, d.startDate, d.dueDate, d.paidAmount, isConsumerLoan(d.debtCategory), d.investmentDays);
      const payments = d.payments || {};
      const rate = DEFAULT_EXCHANGE_RATES[d.currency] ?? 1;
      if (plan?.schedule) {
        const hasOverdue = plan.schedule.some(item => {
          const status = payments[item.period];
          if (status === true || status === false) return false; // 已还 or 手动标记正常 → 不计入逾期
          return new Date(item.date) < new Date();
        });
        if (hasOverdue) {
          overdueDebtCount++;
          plan.schedule.forEach(item => {
            const status = payments[item.period];
            const overdue = (status !== true && status !== false) && new Date(item.date) < new Date();
            if (overdue) {
              overdueAmount += item.total * rate;
            }
          });
        }
      }
    });
    const totalPenaltyInterest = payables.reduce((s, d) => s + convertToBase(d.penaltyInterest || 0, d.currency), 0);
    const totalDebtInterestWithPenalty = totalDebtInterest + totalPenaltyInterest;

    // 按币种分组统计外币欠款
    const currencyGroups = {};
    payables.forEach((d) => {
      const cur = d.currency || 'CNY';
      if (!currencyGroups[cur]) currencyGroups[cur] = { currency: cur, principal: 0, interest: 0, total: 0, count: 0 };
      currencyGroups[cur].principal += d.principal || d.amount || 0;
      currencyGroups[cur].interest += Math.max(0, (d.amount || 0) - (d.principal || d.amount || 0)) + (d.penaltyInterest || 0);
      currencyGroups[cur].total += d.amount || 0;
      currencyGroups[cur].count += 1;
    });
    const foreignCurrencyList = Object.values(currencyGroups).filter(g => g.currency !== 'CNY');

    return {
      payables, receivables, filtered,
      pTotal, pPrincipal, pInterest: pInterest + totalPenaltyInterest, pRate, pDailyRate, pMonthlyRate, pAnnualRate: pRate, pDailyInterest: pPrincipal * pDailyRate / 100, pMonthlyInterest: pPrincipal * pMonthlyRate / 100, pAnnualInterest: pPrincipal * pRate / 100,
      rTotal, rPrincipal, rInterest,
      netTotal, netPrincipal, netInterest: netInterest + totalPenaltyInterest,
      // 3个新卡片数据
      totalDebtPrincipal, totalDebtInterest: totalDebtInterestWithPenalty,
      yearDuePrincipal, yearDueInterest,
      monthDuePrincipal, monthDueInterest,
      // 逾期相关数据
      overdueAmount,
      overdueDebtCount,
      totalPenaltyInterest,
      // 外币分组
      foreignCurrencyList,
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
                        {formatCurrency(debt.amount || 0, debt.currency || 'CNY')}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
                        {formatCurrency(debt.principal || debt.amount || 0, debt.currency || 'CNY')}
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
          <StatCard label="应付/借入总额" value={formatCurrencyShort(stats.pTotal)} title={formatCurrency(stats.pTotal)} sub={`${stats.payables.length} 笔待管理`} color="red" />
          <StatCard label="应付/借入总本金" value={formatCurrencyShort(stats.pPrincipal)} title={formatCurrency(stats.pPrincipal)} sub="本金合计" color="red" />
          <StatCard label="应付/借入总利息" value={formatCurrencyShort(stats.pInterest)} title={formatCurrency(stats.pInterest)} sub="利息合计" color="red" />
          <StatCard label="利息本金占比" value={`${formatNumber(stats.pRate)}%`} sub="利息/本金*100%" color="red" />
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

        {/* Stats Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="text-sm opacity-80 mb-1">总欠款</div>
            <div className="text-2xl font-bold tabular-nums">{formatCurrency(stats.totalDebtPrincipal + stats.totalDebtInterest)}</div>
            <div className="mt-2 text-xs opacity-80">
              <div>欠款本金：{formatCurrency(stats.totalDebtPrincipal)}</div>
              <div>欠款利息：{formatCurrency(stats.totalDebtInterest)}</div>
            </div>
            {stats.foreignCurrencyList && stats.foreignCurrencyList.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/20 text-xs opacity-90 space-y-0.5">
                <div className="font-medium opacity-80 mb-0.5">外币欠款明细</div>
                {stats.foreignCurrencyList.map((g) => (
                  <div key={g.currency} className="flex items-center justify-between">
                    <span>{getCurrencySymbol(g.currency)} {g.currency} · {g.count}笔</span>
                    <span className="tabular-nums">{formatCurrency(g.total, g.currency)}</span>
                  </div>
                ))}
              </div>
            )}
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
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="text-sm opacity-80 mb-1">逾期未还</div>
            <div className="text-2xl font-bold tabular-nums">{formatCurrency(stats.overdueAmount)}</div>
            <div className="mt-2 text-xs opacity-80">
              <div>逾期债务：{stats.overdueDebtCount || 0} 笔</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="text-sm opacity-80 mb-1">罚息</div>
            <div className="text-2xl font-bold tabular-nums">{formatCurrency(stats.totalPenaltyInterest)}</div>
            <div className="mt-2 text-xs opacity-80">
              <div>已计入总利息</div>
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
                  const totalAmount = catDebts.reduce((s, d) => s + convertToBase(d.amount || 0, d.currency), 0);
                  const cardKey = `payable_${cat.id}`;
                  const isExpanded = expandedCards[cardKey] !== false;
                  
                  return renderCategoryCard(cat, catDebts, totalAmount, cardKey, isExpanded, 'red');
                })}
                {/* 未分类 */}
                {(() => {
                  const uncategorized = stats.payables.filter((d) => !d.debtCategory || d.debtCategory === '');
                  if (uncategorized.length === 0) return null;
                  const totalAmount = uncategorized.reduce((s, d) => s + convertToBase(d.amount || 0, d.currency), 0);
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
                  const totalAmount = catDebts.reduce((s, d) => s + convertToBase(d.amount || 0, d.currency), 0);
                  const cardKey = `receivable_${cat.id}`;
                  const isExpanded = expandedCards[cardKey] !== false;
                  
                  return renderCategoryCard(cat, catDebts, totalAmount, cardKey, isExpanded, 'emerald');
                })}
                {/* 未分类 */}
                {(() => {
                  const uncategorized = stats.receivables.filter((d) => !d.debtCategory || d.debtCategory === '' || !debtCategories.find(c => c.id === d.debtCategory));
                  if (uncategorized.length === 0) return null;
                  const totalAmount = uncategorized.reduce((s, d) => s + convertToBase(d.amount || 0, d.currency), 0);
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
                    <select value={form.category} onChange={(e) => {
                      const newCategory = e.target.value;
                      const newType = newCategory === 'payable' ? '借入' : '借出';
                      setForm({ ...form, category: newCategory, type: newType, debtCategory: '' });
                    }} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white">
                      <option value="payable">入账</option>
                      <option value="receivable">出账</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">类型</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, debtCategory: '' })} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white">
                      {form.category === 'payable' ? (
                        <><option value="借入">借入</option><option value="应付">应付</option></>
                      ) : (
                        <><option value="借出">借出</option><option value="应收">应收</option></>
                      )}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        类别 <button type="button" onClick={() => setShowCategoryModal(true)} className="ml-1 text-xs text-indigo-600 hover:text-indigo-700">设置</button>
                      </label>
                      <select value={form.debtCategory} onChange={(e) => handleFormChange('debtCategory', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white">
                        <option value="">请选择类别</option>
                        {form.type === '借出' || form.type === '应收' ? (
                          <><option value="cat_4">亲友借款</option><option value="cat_5">他人借款</option></>
                        ) : (
                          debtCategories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">账户</label>
                      <select value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white">
                        <option value="">请选择账户</option>
                        {(stateData?.accounts || []).filter(acc => acc.type === '负债' || acc.liability).map((acc) => (
                          <option key={acc.id} value={acc.name}>{acc.name}</option>
                        ))}
                      </select>
                    </div>
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">货币单位</label>
                    <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white">
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.symbol} {c.name}（{c.code}）</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"><span className="text-red-500">*</span> 本金</label>
                    <input type="number" value={form.principal} onChange={(e) => handleFormChange('principal', e.target.value)} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">利息（年化%）</label>
                    <input type="number" value={form.annualRate} onChange={(e) => handleFormChange('annualRate', e.target.value)} placeholder="0" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">投资天数</label>
                    <input type="number" value={form.investmentDays} onChange={(e) => handleFormChange('investmentDays', e.target.value)} placeholder="365" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                    <p className="text-xs text-gray-400 mt-1">不填默认为365天</p>
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
                    {!totalAmountOverridden && getRepaymentPlan() && (
                      <p className="text-xs text-gray-400 mt-1">自动计算：{formatCurrency(getRepaymentPlan().totalAmount, form.currency)}（本金 {formatCurrency(parseFloat(form.principal) || 0, form.currency)} + 利息 {formatCurrency(getRepaymentPlan().totalInterest, form.currency)}）</p>
                    )}
                    {totalAmountOverridden && (
                      <button onClick={() => {
                        setTotalAmountOverridden(false);
                        const plan = getRepaymentPlan();
                        if (plan) {
                          setForm((prev) => ({ ...prev, amount: plan.totalAmount.toFixed(2) }));
                        }
                      }} className="text-xs text-indigo-600 hover:text-indigo-700 mt-1">恢复自动计算</button>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"><span className="text-red-500">*</span> 借入日期</label>
                    <input type="date" value={form.startDate} onChange={(e) => handleFormChange('startDate', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"><span className="text-red-500">*</span> 还款日期</label>
                    <input type="date" value={form.dueDate} onChange={(e) => handleFormChange('dueDate', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">还款方式</label>
                      <button onClick={() => setShowRepaymentGuide(true)} className="text-blue-500 text-xs hover:text-blue-600 flex items-center gap-0.5">
                        <HelpCircle size={12} /> 说明
                      </button>
                    </div>
                    <select value={form.repaymentMethod} onChange={(e) => handleFormChange('repaymentMethod', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white">
                      <option value="equalPrincipalInterest">等额本息</option>
                      <option value="equalPrincipal">等额本金</option>
                      <option value="interestOnly">先息后本</option>
                      <option value="lumpSum">到期一次性</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">状态</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white">
                      <option value="normal">正常</option>
                      <option value="overdue">逾期未还</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">罚息</label>
                    <input type="number" value={form.penaltyInterest} onChange={(e) => setForm({ ...form, penaltyInterest: e.target.value })} placeholder="0" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">已还金额</label>
                    <input type="number" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} placeholder="0" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">剩余金额</label>
                    <input type="text" readOnly value={formatCurrency(getRepaymentPlan()?.remainingAmount || 0, form.currency)} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700/50 text-gray-600 dark:text-gray-300" />
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
                {getRepaymentPlan() && (
                  <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4 space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">期数</div>
                        <div className="font-medium text-gray-900 dark:text-white">{getRepaymentPlan().periods} 期</div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">还款方式</div>
                        <div className="font-medium text-gray-900 dark:text-white">{getRepaymentPlan().methodLabel}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">总金额</div>
                        <div className="font-medium text-gray-900 dark:text-white">{formatCurrency(getRepaymentPlan().totalAmount, form.currency)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">总利息</div>
                        <div className="font-medium text-gray-900 dark:text-white">{formatCurrency(getRepaymentPlan().totalInterest, form.currency)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">每期金额</div>
                        <div className="font-medium text-gray-900 dark:text-white">{formatCurrency(getRepaymentPlan().eachAmount, form.currency)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">剩余金额</div>
                        <div className="font-medium text-gray-900 dark:text-white">{formatCurrency(getRepaymentPlan().remainingAmount, form.currency)}</div>
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

      {showRepaymentGuide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">还款方式说明</h3>
              <button onClick={() => setShowRepaymentGuide(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(80vh-80px)] space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">等额本息</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  <strong>计算方式：</strong>每月还款金额固定，前期利息占比高，本金占比低；后期本金占比高，利息占比低。
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>适合人群：</strong>收入稳定、希望每月还款金额固定的借款人，如上班族、房贷用户。
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">等额本金</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  <strong>计算方式：</strong>每月偿还本金固定，利息逐月递减，总利息比等额本息少。
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>适合人群：</strong>前期还款能力强、希望节省利息支出的借款人，如高收入人群、计划提前还款者。
                </p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4">
                <h4 className="font-semibold text-orange-700 dark:text-orange-400 mb-2">先息后本</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  <strong>计算方式：</strong>每期只还利息，到期一次性偿还全部本金。
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>适合人群：</strong>短期周转、现金流紧张但到期能一次性还款的借款人，如企业短期融资。
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                <h4 className="font-semibold text-purple-700 dark:text-purple-400 mb-2">到期一次性</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  <strong>计算方式：</strong>到期时一次性偿还全部本金和利息。
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>适合人群：</strong>到期有大额资金入账的借款人，如投资回款、项目结算。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color, signed, title }) {
  const colorClasses = {
    red: 'text-red-600',
    green: 'text-emerald-600',
  };
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div 
        className={`text-xl sm:text-2xl font-bold tabular-nums whitespace-nowrap ${colorClasses[color] || 'text-gray-900 dark:text-white'} cursor-help`}
        title={title}
      >
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

import { X, Plus, Trash2, Edit2 } from 'lucide-react';
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
} from '../pages/IndependentAssets';

// 计算车辆残值
function calculateVehicleResidualValue(item) {
  const purchasePrice = parseFloat(item.purchasePrice || 0);
  if (purchasePrice <= 0) {
    return {
      residualValue: 0,
      ageDepreciationRate: 0,
      mileageDepreciationRate: 0,
      combinedDepreciationRate: 0,
      age: 0,
    };
  }

  const now = new Date();
  const purchaseDate = item.purchaseDate ? new Date(item.purchaseDate) : null;
  let age = 0;
  if (purchaseDate && !isNaN(purchaseDate.getTime()) && purchaseDate <= now) {
    age = (now - purchaseDate) / (1000 * 60 * 60 * 24 * 365);
  }

  let ageDepreciationRate;
  if (age <= 0) {
    ageDepreciationRate = 0;
  } else if (age <= 1) {
    ageDepreciationRate = 0.175;
  } else if (age <= 2) {
    ageDepreciationRate = 0.175 + (age - 1) * 0.1375;
  } else if (age < 10) {
    ageDepreciationRate = 0.3125 + (age - 2) * 0.09;
  } else {
    ageDepreciationRate = 0.7;
  }

  const mileage = parseFloat(item.mileage || 0);
  const maxMileage = 30;
  const perMileageRate = (1 - 0.15) / maxMileage;
  let mileageDepreciationRate = mileage * perMileageRate;
  if (mileageDepreciationRate > 0.95) {
    mileageDepreciationRate = 0.95;
  }

  const combinedDepreciationRate = (ageDepreciationRate + mileageDepreciationRate) / 2;
  let residualValue = purchasePrice * (1 - combinedDepreciationRate);
  const minResidualValue = purchasePrice * 0.05;
  if (residualValue < minResidualValue) {
    residualValue = minResidualValue;
  }

  return {
    residualValue,
    ageDepreciationRate,
    mileageDepreciationRate,
    combinedDepreciationRate,
    age,
  };
}

// 通用弹窗外壳
function ModalShell({ title, onClose, children, width = 'max-w-md', readOnly = false }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full ${width} max-h-[90vh] overflow-y-auto`}>
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
            {readOnly && (
              <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 rounded">
                只读模式
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// 车辆详情弹窗
export function VehicleDetailModal({ item, onClose, readOnly = false }) {
  const { residualValue, ageDepreciationRate, mileageDepreciationRate, combinedDepreciationRate, age } = calculateVehicleResidualValue(item);
  const purchasePrice = parseFloat(item.purchasePrice || 0);
  const totalDepreciation = purchasePrice - residualValue;

  const basicFields = [
    { label: '品牌', value: item.brand },
    { label: '型号', value: item.model },
    { label: '年份', value: item.year },
    { label: '购买价格', value: formatCurrency(purchasePrice, item.currency), isFormatted: true },
    { label: '购买日期', value: item.purchaseDate },
    { label: '车龄', value: `${age.toFixed(2)} 年` },
    { label: '里程', value: `${item.mileage || 0} 万公里` },
    { label: '车龄折损率', value: `${(ageDepreciationRate * 100).toFixed(2)}%` },
    { label: '里程折损率', value: `${(mileageDepreciationRate * 100).toFixed(2)}%` },
    { label: '综合折损率', value: `${(combinedDepreciationRate * 100).toFixed(2)}%` },
    { label: '累计折损金额', value: formatCurrency(totalDepreciation, item.currency), isFormatted: true },
    { label: '现车残值', value: formatCurrency(residualValue, item.currency), isFormatted: true },
    { label: '车牌号', value: item.plateNumber },
    { label: '车架号', value: item.vin },
    { label: '备注', value: item.notes },
  ];

  return (
    <ModalShell title="车况明细" onClose={onClose} width="max-w-md" readOnly={readOnly}>
      <div className="p-4 space-y-3">
        {basicFields.filter(f => f.value).map(f => (
          <div key={f.label} className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{f.label}</span>
            <span className="text-gray-900 dark:text-white font-medium">{f.value}</span>
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end">
        <button onClick={onClose} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
          关闭
        </button>
      </div>
    </ModalShell>
  );
}

// 定期存款详情弹窗
export function FixedDepositDetailModal({ item, onClose, readOnly = false }) {
  const amount = parseFloat(item.amount || 0);
  const annualRate = parseFloat(item.interestRate !== undefined && item.interestRate !== '' ? item.interestRate : (item.interest || 0));

  const calculateYears = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (e <= s) return 0;
    return (e - s) / (1000 * 60 * 60 * 24) / 365;
  };

  const years = calculateYears(item.startDate, item.endDate);
  const today = new Date();
  const endDate = item.endDate ? new Date(item.endDate) : null;
  const daysToMaturity = endDate ? Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24))) : null;

  const hasAmount = amount > 0;
  const hasRate = annualRate > 0;
  const hasYears = years > 0;

  const dailyInterest = hasAmount && hasRate ? amount * (annualRate / 100) / 365 : null;
  const dailyRate = hasRate ? annualRate / 365 : null;
  const monthlyInterest = hasAmount && hasRate ? amount * (annualRate / 100) / 12 : null;
  const monthlyRate = hasRate ? annualRate / 12 : null;
  const yearlyInterest = hasAmount && hasRate ? amount * (annualRate / 100) : null;
  const totalReturn = hasAmount && hasRate && hasYears ? amount * (annualRate / 100) * years : null;
  const totalAmount = hasAmount && totalReturn !== null ? amount + totalReturn : null;
  const totalRate = hasRate && hasYears ? annualRate * years : null;

  return (
    <ModalShell title="定期资产明细" onClose={onClose} width="max-w-md" readOnly={readOnly}>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">日利息</div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{dailyInterest !== null ? formatCurrency(dailyInterest, item.currency) : '—'}</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">日利率</div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{dailyRate !== null ? `${dailyRate.toFixed(4)}%` : '—'}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">月利息</div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400">{monthlyInterest !== null ? formatCurrency(monthlyInterest, item.currency) : '—'}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">月利率</div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400">{monthlyRate !== null ? `${monthlyRate.toFixed(4)}%` : '—'}</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">年利息</div>
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{yearlyInterest !== null ? formatCurrency(yearlyInterest, item.currency) : '—'}</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">年利率</div>
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{annualRate > 0 ? `${annualRate.toFixed(2)}%` : '—'}</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">到期总金额</div>
            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{totalAmount !== null ? formatCurrency(totalAmount, item.currency) : '—'}</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">到期总收益率</div>
            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{totalRate !== null ? `${totalRate.toFixed(2)}%` : '—'}</div>
          </div>
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">到期天数</div>
            <div className="text-lg font-bold text-gray-800 dark:text-gray-200">{daysToMaturity !== null ? `${daysToMaturity}天` : '—'}</div>
          </div>
        </div>
        <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-slate-700">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">本金</span>
            <span className="text-gray-900 dark:text-white font-medium">{formatCurrency(amount, item.currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">期限</span>
            <span className="text-gray-900 dark:text-white font-medium">{years > 0 ? `${years.toFixed(2)} 年` : '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">开始日期</span>
            <span className="text-gray-900 dark:text-white font-medium">{item.startDate || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">结束日期</span>
            <span className="text-gray-900 dark:text-white font-medium">{item.endDate || '—'}</span>
          </div>
          {item.bankName && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">开户行</span>
              <span className="text-gray-900 dark:text-white font-medium">{item.bankName}</span>
            </div>
          )}
          {item.notes && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">备注</span>
              <span className="text-gray-900 dark:text-white font-medium">{item.notes}</span>
            </div>
          )}
        </div>
      </div>
      <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end">
        <button onClick={onClose} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
          关闭
        </button>
      </div>
    </ModalShell>
  );
}

// 保险详情弹窗
export function InsuranceDetailModal({ item, onClose, readOnly = false }) {
  const paidAmount = parseFloat(item.paidAmount || 0);
  const cashValue = parseFloat(item.cashValue || 0);
  const records = item.transactionRecords || [];
  const isAnnuity = item.insuranceType === '年金险';

  let displayPaidAmount = paidAmount;
  let displayCashValue = cashValue;
  let totalDividend = records.reduce((sum, r) => {
    return sum + parseFloat(r.actualProfitAmount || 0);
  }, 0);

  if (isAnnuity) {
    displayPaidAmount = records.reduce((sum, r) => {
      return sum + parseFloat(r.annualPremium || 0);
    }, 0);

    if (records.length > 0) {
      const sortedByYear = [...records].sort((a, b) => {
        const va = a.year || '';
        const vb = b.year || '';
        if ((/^\d{4}-\d{2}$/.test(va) || /^\d{4}$/.test(va)) && (/^\d{4}-\d{2}$/.test(vb) || /^\d{4}$/.test(vb))) {
          return va.localeCompare(vb);
        }
        return (parseInt(va) || 0) - (parseInt(vb) || 0);
      });
      const latestRecord = sortedByYear[sortedByYear.length - 1];
      displayCashValue = parseFloat(latestRecord.yearEndCashValue || 0);
    }

    totalDividend = records.reduce((sum, r) => {
      return sum + parseFloat(r.annualActualDividend || 0);
    }, 0);
  } else if (item.insuranceType === '储蓄险') {
    if (records.length > 0) {
      const sortedByYear = [...records].sort((a, b) => (parseInt(a.year) || 0) - (parseInt(b.year) || 0));
      const latestRecord = sortedByYear[sortedByYear.length - 1];
      displayPaidAmount = parseFloat(latestRecord.premiumPaid || 0);
      displayCashValue = parseFloat(latestRecord.guaranteedCashValue || 0);
    }
  }

  const dividendRate = displayPaidAmount > 0 && totalDividend > 0
    ? ((totalDividend / displayPaidAmount) * 100).toFixed(2) + '%'
    : '—';

  const returnProgress = displayPaidAmount > 0
    ? ((displayCashValue + totalDividend) / displayPaidAmount * 100).toFixed(2) + '%'
    : '—';

  // 取用相关3卡片
  const sortedRecords = records.slice().sort((a, b) => {
    const na = parseInt(a.year) || 0;
    const nb = parseInt(b.year) || 0;
    return nb - na;
  });
  const firstRow = sortedRecords[0] || null;
  const totalFund = firstRow ? parseFloat(firstRow.totalAmount || 0) : 0;
  const totalWithdrawn = records.reduce((s, r) => s + (parseFloat(r.cashFlowAmount || 0)), 0);
  const currentYear = new Date().getFullYear();
  const currentYearWithdrawn = records
    .filter(r => (parseInt(r.year) || 0) === currentYear || (r.date && r.date.startsWith(String(currentYear))))
    .reduce((s, r) => s + (parseFloat(r.cashFlowAmount || 0)), 0);

  // 年金险列定义（完整字段）
  const annuityColumns = [
    { key: 'year', label: '年月', render: (r) => r.year || r.date || '—' },
    { key: 'annualPremium', label: '当年保费', render: (r) => formatCurrency(parseFloat(r.annualPremium || 0), item.currency) },
    { key: 'cumulativePremium', label: '累计保费', render: (r) => formatCurrency(parseFloat(r.cumulativePremium || 0), item.currency) },
    { key: 'annualGuaranteedAnnuity', label: '当年保证年金', render: (r) => formatCurrency(parseFloat(r.annualGuaranteedAnnuity || 0), item.currency) },
    { key: 'cumulativeGuaranteedReceived', label: '累计保证领取', render: (r) => formatCurrency(parseFloat(r.cumulativeGuaranteedReceived || 0), item.currency) },
    { key: 'yearEndCashValue', label: '年末现金价值', render: (r) => formatCurrency(parseFloat(r.yearEndCashValue || 0), item.currency) },
    { key: 'annualDividendDemo', label: '当年红利(演示)', render: (r) => formatCurrency(parseFloat(r.annualDividendDemo || 0), item.currency) },
    { key: 'cumulativeDividendDemo', label: '累积红利(演示)', render: (r) => formatCurrency(parseFloat(r.cumulativeDividendDemo || 0), item.currency) },
    { key: 'totalBenefit', label: '含红利生存总利益', render: (r) => formatCurrency(parseFloat(r.yearEndCashValue || 0) + parseFloat(r.cumulativeDividendDemo || 0), item.currency) },
    { key: 'annualActualDividend', label: '当年实际红利', render: (r) => formatCurrency(parseFloat(r.annualActualDividend || 0), item.currency) },
    { key: 'cumulativeActualDividend', label: '实际累计红利', render: (r) => formatCurrency(parseFloat(r.cumulativeActualDividend || 0), item.currency) },
  ];

  // 非年金险列定义
  const normalColumns = [
    { key: 'year', label: '年度', render: (r) => r.year || r.date || '—' },
    { key: 'premiumPaid', label: '已交保费', render: (r) => formatCurrency(parseFloat(r.premiumPaid || 0), item.currency) },
    { key: 'cashFlowAmount', label: '现金流量', render: (r) => <span className="text-orange-600 dark:text-orange-400">{formatCurrency(parseFloat(r.cashFlowAmount || 0), item.currency)}</span> },
    { key: 'guaranteedCashValue', label: '现金价值', render: (r) => formatCurrency(parseFloat(r.guaranteedCashValue || 0), item.currency) },
  ];

  const columns = isAnnuity ? annuityColumns : normalColumns;

  return (
    <ModalShell title={`保险明细 - ${item.policyName || item.policyNumber || '保单'}`} onClose={onClose} width="max-w-5xl" readOnly={readOnly}>
      <div className="p-4">
        {/* 保单信息 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">保单号码</span>
            <span className="text-gray-900 dark:text-white font-medium">{item.policyNumber || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">保险名称</span>
            <span className="text-gray-900 dark:text-white font-medium">{item.policyName || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">受保人</span>
            <span className="text-gray-900 dark:text-white font-medium">{item.insured || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">受益人</span>
            <span className="text-gray-900 dark:text-white font-medium">{item.beneficiary || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">保单日期</span>
            <span className="text-gray-900 dark:text-white font-medium">{item.policyDate || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">保单状况</span>
            <span className={`text-sm font-medium ${item.policyStatus === '已生效' ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
              {item.policyStatus || '—'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">缴纳方式</span>
            <span className="text-gray-900 dark:text-white font-medium">{item.paymentMethod || '—'}</span>
          </div>
          {item.paymentMethod === '月付' && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">每月付款金额</span>
                <span className="text-gray-900 dark:text-white font-medium">{item.monthlyPaymentAmount ? formatCurrency(parseFloat(item.monthlyPaymentAmount), item.currency) : '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">已付款期数（月）</span>
                <span className="text-gray-900 dark:text-white font-medium">{item.paidPeriods || '—'}</span>
              </div>
            </>
          )}
          {item.paymentMethod === '年付' && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">每年付款金额</span>
                <span className="text-gray-900 dark:text-white font-medium">{item.annualPaymentAmount ? formatCurrency(parseFloat(item.annualPaymentAmount), item.currency) : '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">已付款期数（年）</span>
                <span className="text-gray-900 dark:text-white font-medium">{item.paidPeriods || '—'}</span>
              </div>
            </>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">货币单位</span>
            <span className="text-gray-900 dark:text-white font-medium">{item.currency || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">保险类型</span>
            <span className="text-gray-900 dark:text-white font-medium">{item.insuranceType || '—'}</span>
          </div>
        </div>

        {/* 5张概览卡片 */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">已交保费</div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(displayPaidAmount, item.currency)}</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">现金价值</div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(displayCashValue, item.currency)}</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">累计分红额</div>
            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatCurrency(totalDividend, item.currency)}</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">累计分红收益率</div>
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{dividendRate}</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">回本进度</div>
            <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{returnProgress}</div>
          </div>
        </div>

        {/* 取用相关3卡片 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">现有资金总额</div>
            <div className="text-lg font-bold text-teal-600 dark:text-teal-400">{formatCurrency(totalFund, item.currency)}</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">取用总额</div>
            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatCurrency(totalWithdrawn, item.currency)}</div>
          </div>
          <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">当年取用额</div>
            <div className="text-lg font-bold text-pink-600 dark:text-pink-400">{formatCurrency(currentYearWithdrawn, item.currency)}</div>
          </div>
        </div>

        {/* 附件 - 只读模式 */}
        {(item.attachments && item.attachments.length > 0) && (
          <div className="border-t border-gray-200 dark:border-slate-700 pt-4 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">附件</h3>
            <div className="flex flex-wrap gap-2">
              {item.attachments.map((file, index) => (
                <div key={index} className="flex items-center gap-2 bg-gray-100 dark:bg-slate-700 px-3 py-2 rounded-lg">
                  <button onClick={() => window.open(file.url, '_blank')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    {file.name}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 交易记录 */}
        {records.length > 0 && (
          <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">交易记录</h3>
              {!readOnly && (
                <span className="text-xs text-gray-500 dark:text-gray-400">共 {records.length} 条记录</span>
              )}
              {readOnly && (
                <span className="text-xs text-gray-500 dark:text-gray-400">共 {records.length} 条记录（只读）</span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    {columns.map(col => (
                      <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {records.map((record, index) => (
                    <tr key={record.id || index} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      {columns.map(col => (
                        <td key={col.key} className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                          {col.render(record)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

// 生存资金详情弹窗
export function SurvivalFundDetailModal({ fund, onClose, readOnly = false }) {
  if (!fund) return null;
  const cur = fund.currency || 'CNY';
  const initialAmount = parseFloat(fund.initialAmount) || 0;
  const transactions = fund.transactions || [];
  const inflowTotal = transactions.filter(t => t.status === 'inflow').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
  const outflowTotal = transactions.filter(t => t.status === 'outflow').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
  const currentAmount = initialAmount + inflowTotal - outflowTotal;
  const usedAmount = outflowTotal;
  const incrementalFund = inflowTotal;

  return (
    <ModalShell title={`明细：${fund.name || '—'} (${fund.currency || 'CNY'})`} onClose={onClose} width="max-w-3xl" readOnly={readOnly}>
      <div className="p-5 space-y-5">
        {/* 资金概览 */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">现有资金</div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(currentAmount, cur)}</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">已使用资金</div>
            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatCurrency(usedAmount, cur)}</div>
          </div>
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">原始资金</div>
            <div className="text-lg font-bold text-gray-800 dark:text-gray-200">{formatCurrency(initialAmount, cur)}</div>
          </div>
          <div className={`rounded-lg p-3 text-center ${incrementalFund >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <div className="text-xs text-gray-500 dark:text-gray-400">增量资金</div>
            <div className={`text-lg font-bold ${incrementalFund >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(incrementalFund, cur)}
            </div>
          </div>
        </div>

        {/* 公式说明 */}
        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg px-4 py-2 text-xs text-gray-600 dark:text-gray-400 font-mono text-center">
          现有资金 = 原始资金 {formatCurrency(initialAmount, cur)} + 增量资金 {formatCurrency(incrementalFund, cur)} − 已使用 {formatCurrency(usedAmount, cur)} = <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(currentAmount, cur)}</span>
        </div>

        {/* 资金记录表格 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">资金记录</h3>
            {readOnly && (
              <span className="text-xs text-gray-400">共 {transactions.length} 条记录（只读）</span>
            )}
          </div>
          <div className="overflow-x-auto border border-gray-100 dark:border-slate-700 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">类型</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">金额</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">状态</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">日期</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">备注</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">账户本</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-xs text-gray-500">暂无资金记录</td>
                  </tr>
                )}
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="px-3 py-2 text-gray-900 dark:text-white">{t.type || '—'}</td>
                    <td className="px-3 py-2 tabular-nums text-gray-900 dark:text-white">{formatCurrency(t.amount, cur)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        t.status === 'inflow'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {t.status === 'inflow' ? '入账' : '出账'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">{t.date || '—'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">{t.note || '—'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">{t.accountName || '—'}</td>
                  </tr>
                ))}
              </tbody>
              {transactions.length > 0 && (
                <tfoot className="bg-gray-50 dark:bg-slate-700/50">
                  <tr className="text-xs font-semibold">
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">合计</td>
                    <td className="px-3 py-2 text-green-600 dark:text-green-400">入账 {formatCurrency(inflowTotal, cur)}</td>
                    <td className="px-3 py-2 text-red-600 dark:text-red-400">出账 {formatCurrency(outflowTotal, cur)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

// 通用独立资产详情弹窗（用于房产、固定投资、股权等）
export function GenericAssetDetailModal({ item, onClose, readOnly = false }) {
  const typeLabels = {
    insurance: '保险',
    realestate: '房产',
    vehicle: '车辆',
    fixedinvestment: '固定投资',
    equity: '股权',
    fixeddeposit: '定期存款',
    survivalfund: '生存资金',
  };
  const typeLabel = typeLabels[item.assetType || item.type] || item.type || '资产';

  const entries = Object.entries(item).filter(([k, v]) => {
    if (v === null || v === undefined || v === '') return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });

  const skipKeys = new Set(['transactions', 'transactionRecords', 'dividendRecords', 'metadata']);
  const labelMap = {
    id: 'ID', name: '名称', type: '类型', assetType: '资产类型',
    currency: '货币', accountId: '账户ID', accountName: '账户名称',
    amount: '金额', balance: '余额', currentValue: '当前市值',
    purchasePrice: '购买价格', marketValue: '市场估值', residualValue: '残值',
    paidAmount: '已付金额', cashValue: '现金价值',
    dividendAmount: '分红金额', cumulativeDividend: '累计分红',
    interestRate: '利率', annualizedRate: '年化率',
    startDate: '开始日期', endDate: '结束日期',
    usage: '用途', area: '面积', location: '地点',
    manufacturer: '厂商', model: '型号',
    status: '状态', createdAt: '创建时间', updatedAt: '更新时间',
  };

  const formatVal = (key, val) => {
    if (skipKeys.has(key)) return null;
    if (key === 'transactionRecords' || key === 'dividendRecords') return `${val.length} 条记录`;
    if (key === 'metadata') return null;
    if (typeof val === 'number') return val.toLocaleString('zh-CN', { maximumFractionDigits: 4 });
    return String(val);
  };

  // 固定投资特殊处理 - 显示分红记录
  const renderFixedInvestmentDetails = () => {
    if (item.assetType !== 'fixedinvestment' && item.type !== 'fixedinvestment') return null;
    const dividendRecords = item.dividendRecords || [];
    const totalDividend = dividendRecords.reduce((s, r) => s + (parseFloat(r.amount || 0)), 0);

    return (
      <div className="mt-4 border-t border-gray-200 dark:border-slate-700 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">投资现金流（分红记录）</h4>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            累计分红: <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(totalDividend, item.currency)}</span>
            <span className="ml-2">· 共 {dividendRecords.length} 条</span>
          </span>
        </div>
        {dividendRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">日期</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">事件类型</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">金额</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">备注</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {dividendRecords.map((r, i) => (
                  <tr key={r.id || i} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="px-3 py-2 text-gray-900 dark:text-white">{r.date || '—'}</td>
                    <td className="px-3 py-2 text-gray-900 dark:text-white">{r.eventType || '—'}</td>
                    <td className="px-3 py-2 text-green-600 dark:text-green-400">{formatCurrency(parseFloat(r.amount || 0), item.currency)}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">{r.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-slate-700/50">
                <tr className="text-xs font-semibold">
                  <td colSpan={2} className="px-3 py-2 text-gray-700 dark:text-gray-300">合计</td>
                  <td className="px-3 py-2 text-green-600 dark:text-green-400">{formatCurrency(totalDividend, item.currency)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-gray-500 dark:text-gray-400">暂无分红记录</div>
        )}
      </div>
    );
  };

  // 房产特殊处理 - 显示交易记录
  const renderRealEstateDetails = () => {
    if (item.assetType !== 'realestate' && item.type !== 'realestate') return null;
    const transactionRecords = item.transactionRecords || [];

    return (
      <div className="mt-4 border-t border-gray-200 dark:border-slate-700 pt-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">交易记录</h4>
        {transactionRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">日期</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">类型</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">金额</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">备注</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {transactionRecords.map((r, i) => (
                  <tr key={r.id || i} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="px-3 py-2 text-gray-900 dark:text-white">{r.date || '—'}</td>
                    <td className="px-3 py-2 text-gray-900 dark:text-white">{r.type || '—'}</td>
                    <td className="px-3 py-2 text-gray-900 dark:text-white">{formatCurrency(parseFloat(r.amount || 0), item.currency)}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">{r.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-gray-500 dark:text-gray-400">暂无交易记录</div>
        )}
      </div>
    );
  };

  return (
    <ModalShell title={`${typeLabel}详情`} onClose={onClose} width="max-w-2xl" readOnly={readOnly}>
      <div className="p-6">
        {/* 头部卡片 */}
        <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-xl p-5 mb-5">
          <div className="text-lg font-bold text-gray-900 dark:text-white">{item.name || '未命名'}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{typeLabel} · {item.currency || ''}</div>
        </div>

        {/* 详细字段 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">详细信息</h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {entries.map(([k, v]) => {
              const formatted = formatVal(k, v);
              if (formatted === null) return null;
              const label = labelMap[k] || k;
              return (
                <div key={k} className="flex justify-between py-1.5 border-b border-gray-100 dark:border-slate-700">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                  <span className="text-sm text-gray-900 dark:text-white font-medium text-right max-w-[200px] truncate" title={String(formatted)}>{formatted}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 特殊资产的详细记录 */}
        {renderFixedInvestmentDetails()}
        {renderRealEstateDetails()}
      </div>
    </ModalShell>
  );
}

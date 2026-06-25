/**
 * 回测模块 - 回测模型和月度资产增长
 * 依赖于全局变量: state
 */

/**
 * 回测模型函数
 * 基于固定参数模拟投资组合增长
 */
function backtestModel() {
  const principal = 100000;
  const monthlyInvest = 3000;
  const annualReturn = 0.072;
  const maxDrawdown = 0.118;
  const months = 36;
  const monthlyRate = annualReturn / 12;
  let value = principal;
  const series = [];

  for (let index = 1; index <= months; index += 1) {
    value = value * (1 + monthlyRate) + monthlyInvest;
    if (index === 18) value *= 1 - maxDrawdown;
    series.push({ month: index, value });
  }

  const invested = principal + monthlyInvest * months;
  const finalValue = series.at(-1).value;
  return {
    principal,
    monthlyInvest,
    annualReturn,
    maxDrawdown,
    months,
    invested,
    finalValue,
    profit: finalValue - invested,
    annualized: Math.pow(finalValue / invested, 12 / months) - 1,
    winRate: 0.64,
    series,
  };
}

/**
 * 生成月度资产增长序列
 * @param {number} openingValue - 期初资产值
 * @param {number} currentValue - 当前资产值
 */
function generateMonthlyAssetGrowth(openingValue, currentValue) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11

  // 获取今年的年度目标数据
  const currentYearGoal = state.annualGoals?.find(g => g.year === currentYear);

  // 如果有自定义年度目标，使用目标的期初资产；否则使用传入的openingValue
  const yearOpening = currentYearGoal?.opening || openingValue;

  // 计算每月资产值（按期初到当前的线性增长，或按实际收益分布）
  const months = [];
  for (let m = 0; m <= currentMonth; m++) {
    // 如果有年度实际收益数据，按月分配
    let monthlyValue;
    if (currentYearGoal && currentYearGoal.actualProfit !== undefined) {
      // 使用实际收益，按月平均分配
      const monthlyProgress = currentYearGoal.actualProfit * (m / currentMonth);
      monthlyValue = yearOpening + monthlyProgress;
    } else {
      // 没有实际数据，按期初到当前值的线性增长
      const progress = currentMonth > 0 ? m / currentMonth : 1;
      monthlyValue = yearOpening + (currentValue - yearOpening) * progress;
    }

    months.push({
      date: `${currentYear}年${m + 1}月`,
      original: yearOpening,
      current: Math.round(monthlyValue * 100) / 100,
    });
  }

  return months;
}

export {
  backtestModel,
  generateMonthlyAssetGrowth,
};

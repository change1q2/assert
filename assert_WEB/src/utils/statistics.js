import { DEFAULT_BASE_CURRENCY } from './currency';

function normalizeDate(date) {
  if (!date) return null;
  if (typeof date === 'string') {
    return new Date(date);
  }
  return date;
}

function formatDateKey(date) {
  const d = normalizeDate(date);
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getAbsAmount(record) {
  return Math.abs(record?.amount || 0);
}

function filterByDateRange(records, dateRange) {
  if (!dateRange || (!dateRange.start && !dateRange.end)) {
    return records;
  }
  return records.filter(record => {
    const recordDate = new Date(record.date);
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      if (recordDate < startDate) return false;
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      if (recordDate > endDate) return false;
    }
    return true;
  });
}

export function filterByTag(records, tagId, recordTagList) {
  if (!tagId || !recordTagList || recordTagList.length === 0) {
    return records;
  }
  const taggedRecordIds = recordTagList
    .filter(rt => String(rt.tagId) === String(tagId))
    .map(rt => String(rt.recordId));
  return records.filter(record => taggedRecordIds.includes(String(record.id)));
}

export function getRecordTags(recordId, tags, recordTagList) {
  if (!recordTagList || !tags) return [];
  const tagIds = recordTagList
    .filter(rt => String(rt.recordId) === String(recordId))
    .map(rt => rt.tagId);
  return tags.filter(t => tagIds.includes(t.id) || tagIds.includes(String(t.id)));
}

export function getDailyStats(records, date) {
  const targetDate = normalizeDate(date);
  if (!targetDate) {
    return { income: 0, expense: 0, balance: 0 };
  }
  const targetKey = formatDateKey(targetDate);

  let income = 0;
  let expense = 0;

  records.forEach(record => {
    if (formatDateKey(record.date) !== targetKey) return;
    const amount = getAbsAmount(record);
    if (record.type === 'income') {
      income += amount;
    } else if (record.type === 'expense') {
      expense += amount;
    }
  });

  return {
    income,
    expense,
    balance: income - expense,
  };
}

export function getMonthlyStats(records, year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyMap = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    dailyMap[dateKey] = { date: `${String(day).padStart(2, '0')}日`, income: 0, expense: 0, balance: 0 };
  }

  records.forEach(record => {
    const recordDate = new Date(record.date);
    if (recordDate.getFullYear() !== year || recordDate.getMonth() !== month - 1) return;
    const dateKey = formatDateKey(recordDate);
    if (!dailyMap[dateKey]) return;
    const amount = getAbsAmount(record);
    if (record.type === 'income') {
      dailyMap[dateKey].income += amount;
    } else if (record.type === 'expense') {
      dailyMap[dateKey].expense += amount;
    }
    dailyMap[dateKey].balance = dailyMap[dateKey].income - dailyMap[dateKey].expense;
  });

  return Object.values(dailyMap);
}

export function getYearlyStats(records, year) {
  const monthlyMap = {};

  for (let month = 1; month <= 12; month++) {
    monthlyMap[month] = { date: `${month}月`, income: 0, expense: 0, balance: 0 };
  }

  records.forEach(record => {
    const recordDate = new Date(record.date);
    if (recordDate.getFullYear() !== year) return;
    const month = recordDate.getMonth() + 1;
    const amount = getAbsAmount(record);
    if (record.type === 'income') {
      monthlyMap[month].income += amount;
    } else if (record.type === 'expense') {
      monthlyMap[month].expense += amount;
    }
    monthlyMap[month].balance = monthlyMap[month].income - monthlyMap[month].expense;
  });

  return Object.values(monthlyMap);
}

export function getCategoryStats(records, type, dateRange) {
  const filteredRecords = filterByDateRange(records, dateRange);
  const categoryMap = {};
  let total = 0;

  filteredRecords.forEach(record => {
    if (record.type !== type) return;
    const categoryName = record.category || (type === 'income' ? '其他收入' : '其他支出');
    const amount = getAbsAmount(record);
    if (!categoryMap[categoryName]) {
      categoryMap[categoryName] = 0;
    }
    categoryMap[categoryName] += amount;
    total += amount;
  });

  const result = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value,
    percent: total > 0 ? value / total : 0,
  }));

  result.sort((a, b) => b.value - a.value);

  return result;
}

export function getSubCategoryStats(records, category, dateRange) {
  const filteredRecords = filterByDateRange(records, dateRange);
  const subCategoryMap = {};
  let total = 0;

  filteredRecords.forEach(record => {
    if (record.category !== category) return;
    const subCategoryName = record.subCategory || '其他';
    const amount = getAbsAmount(record);
    if (!subCategoryMap[subCategoryName]) {
      subCategoryMap[subCategoryName] = 0;
    }
    subCategoryMap[subCategoryName] += amount;
    total += amount;
  });

  const result = Object.entries(subCategoryMap).map(([name, value]) => ({
    name,
    value,
    percent: total > 0 ? value / total : 0,
  }));

  result.sort((a, b) => b.value - a.value);

  return result;
}

export function getAssetTrend(records, accounts, dateRange) {
  const filteredRecords = filterByDateRange(records, dateRange);
  if (filteredRecords.length === 0) {
    const today = formatDateKey(new Date());
    const initialAsset = (accounts || []).reduce((sum, acc) => sum + (acc.balance || 0), 0);
    return [{ date: today, asset: initialAsset, income: 0, expense: 0 }];
  }

  const sortedRecords = [...filteredRecords].sort((a, b) => new Date(a.date) - new Date(b.date));
  const dateMap = {};

  const initialAsset = (accounts || []).reduce((sum, acc) => sum + (acc.balance || 0), 0);

  sortedRecords.forEach(record => {
    const dateKey = formatDateKey(record.date);
    if (!dateMap[dateKey]) {
      dateMap[dateKey] = { income: 0, expense: 0 };
    }
    const amount = getAbsAmount(record);
    if (record.type === 'income') {
      dateMap[dateKey].income += amount;
    } else if (record.type === 'expense') {
      dateMap[dateKey].expense += amount;
    }
  });

  const sortedDates = Object.keys(dateMap).sort();
  let runningAsset = initialAsset;
  const result = sortedDates.map(date => {
    runningAsset += dateMap[date].income - dateMap[date].expense;
    return {
      date,
      asset: runningAsset,
      income: dateMap[date].income,
      expense: dateMap[date].expense,
    };
  });

  return result;
}

export function getTopRecords(records, type, limit = 10, dateRange) {
  const filteredRecords = filterByDateRange(records, dateRange);
  const typedRecords = filteredRecords.filter(record => record.type === type);

  const sorted = [...typedRecords].sort((a, b) => {
    const amountA = getAbsAmount(a);
    const amountB = getAbsAmount(b);
    return amountB - amountA;
  });

  return sorted.slice(0, limit);
}

export function getRecordsByDate(records, dateRange) {
  const filteredRecords = filterByDateRange(records, dateRange);
  const dateMap = {};

  filteredRecords.forEach(record => {
    const dateKey = formatDateKey(record.date);
    if (!dateMap[dateKey]) {
      dateMap[dateKey] = { date: dateKey, income: 0, expense: 0, balance: 0, count: 0 };
    }
    const amount = getAbsAmount(record);
    if (record.type === 'income') {
      dateMap[dateKey].income += amount;
    } else if (record.type === 'expense') {
      dateMap[dateKey].expense += amount;
    }
    dateMap[dateKey].count += 1;
    dateMap[dateKey].balance = dateMap[dateKey].income - dateMap[dateKey].expense;
  });

  const result = Object.values(dateMap).sort((a, b) => new Date(a.date) - new Date(b.date));
  return result;
}

export function getCategoryRank(records, type, level = 1, dateRange) {
  const filteredRecords = filterByDateRange(records, dateRange);
  const typedRecords = filteredRecords.filter(record => record.type === type);
  const categoryMap = {};
  let totalAmount = 0;
  let totalCount = 0;

  typedRecords.forEach(record => {
    let categoryName;
    if (level === 1) {
      categoryName = record.category || (type === 'income' ? '其他收入' : '其他支出');
    } else {
      categoryName = record.subCategory || record.category || '其他';
    }
    const amount = getAbsAmount(record);

    if (!categoryMap[categoryName]) {
      categoryMap[categoryName] = { name: categoryName, amount: 0, count: 0 };
    }
    categoryMap[categoryName].amount += amount;
    categoryMap[categoryName].count += 1;
    totalAmount += amount;
    totalCount += 1;
  });

  const result = Object.values(categoryMap).map(item => ({
    ...item,
    percent: totalAmount > 0 ? item.amount / totalAmount : 0,
    countPercent: totalCount > 0 ? item.count / totalCount : 0,
  }));

  result.sort((a, b) => b.amount - a.amount);

  return result.slice(0, 10);
}

function getRecordCurrency(record) {
  return record?.currency || DEFAULT_BASE_CURRENCY;
}

export function convertToBaseCurrency(records, rates, baseCurrency = DEFAULT_BASE_CURRENCY) {
  if (!records || records.length === 0) return [];
  const exchangeRates = rates || {};
  return records.map(record => {
    const recordCurrency = getRecordCurrency(record);
    let amount = record.amount || 0;
    if (recordCurrency !== baseCurrency) {
      const fromRate = exchangeRates[recordCurrency] ?? 1;
      const toRate = exchangeRates[baseCurrency] ?? 1;
      if (toRate !== 0) {
        amount = (amount * fromRate) / toRate;
      }
    }
    return {
      ...record,
      amount,
      originalAmount: record.amount,
      originalCurrency: recordCurrency,
      currency: baseCurrency,
    };
  });
}

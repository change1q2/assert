import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ArrowLeft, Plus, Trash2, Settings } from 'lucide-react';
import { fetchState, saveState } from '../api';

const colorPalette = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981', 
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
];

const defaultCategories = {
  expense: {
    '餐饮': ['早餐', '午餐', '晚餐', '零食', '饮料', '水果'],
    '交通': ['公交', '地铁', '出租车', '加油', '停车'],
    '居住': ['房租', '水电费', '物业费'],
    '购物': ['日用品', '服装', '电子产品'],
    '医疗': ['门诊', '药品'],
    '教育': ['学费', '书籍', '培训'],
    '娱乐': ['电影', '游戏', '旅游'],
    '投资': ['股票', '基金', '债券'],
    '其他支出': ['捐赠', '丢失', '其他'],
  },
};

export default function BudgetManagement({ stateData, onBack, onUpdateBudgets }) {
  const [localStateData, setLocalStateData] = useState(null);
  const [loading, setLoading] = useState(!stateData);
  const [error, setError] = useState(null);
  const records = (stateData?.records) || (localStateData?.records) || [];
  const initialBudgets = (stateData?.budgets) || (localStateData?.budgets) || [];
  const [budgets, setBudgets] = useState(initialBudgets);
  const [editBudgetId, setEditBudgetId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newSubCategory, setNewSubCategory] = useState('');
  const [newCategoryBudget, setNewCategoryBudget] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategorySettings, setShowCategorySettings] = useState(false);

  useEffect(() => {
    if (!stateData) {
      loadData();
    }
  }, [stateData]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchState();
      setLocalStateData(data);
      if (data?.budgets) {
        setBudgets(data.budgets);
      }
    } catch (err) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const saveBudgets = async (newBudgets) => {
    try {
      const state = await fetchState();
      state.budgets = newBudgets;
      await saveState(state);
      if (onUpdateBudgets) {
        onUpdateBudgets(newBudgets);
      }
    } catch (e) {
      console.error('Failed to save budgets:', e);
    }
  };

  const categories = defaultCategories.expense;
  const subCategories = newCategory ? (categories[newCategory] || []) : [];

  const monthRecords = useMemo(() => {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return records.filter(r => r.date.startsWith(monthStr));
  }, [records]);

  const carryOverMap = useMemo(() => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
    
    const lastMonthRecords = records.filter(r => r.date.startsWith(lastMonthStr) && r.type === 'expense');
    const result = {};
    
    budgets.forEach(b => {
      const category = b.category || b.name;
      const categoryRecords = lastMonthRecords.filter(r => {
        return r.category === category || r.subCategory === b.subCategory || r.category === b.name;
      });
      const actualSpent = categoryRecords.reduce((sum, r) => sum + Math.abs(r.amount), 0);
      const overspent = actualSpent - b.amount;
      if (overspent > 0) {
        result[b.id] = overspent;
      }
    });
    
    return result;
  }, [records, budgets]);

  const totalBudget = useMemo(() => budgets.reduce((sum, b) => sum + b.amount - (carryOverMap[b.id] || 0), 0), [budgets, carryOverMap]);
  const totalUsed = useMemo(() => {
    return budgets.reduce((sum, b) => {
      const category = b.category || b.name;
      const used = monthRecords
        .filter(r => r.type === 'expense' && (
          r.category === category || r.subCategory === b.subCategory || r.category === b.name
        ))
        .reduce((s, r) => s + Math.abs(r.amount), 0);
      return sum + used;
    }, 0);
  }, [budgets, monthRecords]);
  const totalRemaining = useMemo(() => totalBudget - totalUsed, [totalBudget, totalUsed]);
  
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const today = new Date().getDate();
  const remainingDays = daysInMonth - today;
  const dailyBudget = totalBudget / daysInMonth;
  const dailyExpense = today > 0 ? totalUsed / today : 0;
  const todayRemaining = remainingDays > 0 ? totalRemaining / remainingDays : 0;

  const budgetTrendData = useMemo(() => {
    const data = [];
    let cumulativeUsed = 0;
    for (let day = 1; day <= today; day++) {
      const dayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayExpense = monthRecords
        .filter(r => r.date === dayStr && r.type === 'expense')
        .reduce((sum, r) => sum + Math.abs(r.amount), 0);
      cumulativeUsed += dayExpense;
      data.push({
        day: `${day}日`,
        expense: cumulativeUsed,
        remaining: totalBudget - cumulativeUsed,
      });
    }
    return data;
  }, [monthRecords, totalBudget, today]);

  const yearBudgetData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const monthlyBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
    const annualBudget = monthlyBudget * 12;
    
    const yearRecords = records.filter(r => {
      const rYear = new Date(r.date).getFullYear();
      return rYear === currentYear && r.type === 'expense';
    });
    const yearUsed = yearRecords.reduce((sum, r) => sum + Math.abs(r.amount), 0);
    
    const months = [];
    for (let i = 0; i < 12; i++) {
      const monthStr = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
      const monthExpense = yearRecords
        .filter(r => r.date.startsWith(monthStr))
        .reduce((sum, r) => sum + Math.abs(r.amount), 0);
      months.push({
        month: `${i + 1}月`,
        budget: monthlyBudget,
        expense: monthExpense,
        cumulativeBudget: monthlyBudget * (i + 1),
        cumulativeExpense: months.reduce((s, m) => s + m.expense, 0) + monthExpense,
      });
    }
    
    return {
      annualBudget,
      yearUsed,
      monthlyBudget,
      months,
    };
  }, [budgets, records]);

  const handleEditBudget = (budget) => {
    setEditBudgetId(budget.id);
    setEditAmount(budget.amount.toString());
  };

  const handleSaveBudget = (budget) => {
    const newAmount = parseFloat(editAmount);
    if (!isNaN(newAmount) && newAmount >= 0) {
      const newBudgets = budgets.map(b => 
        b.id === budget.id ? { ...b, amount: newAmount } : b
      );
      setBudgets(newBudgets);
      saveBudgets(newBudgets);
      setEditBudgetId(null);
      setEditAmount('');
    }
  };

  const handleDeleteBudget = (budgetId) => {
    const newBudgets = budgets.filter(b => b.id !== budgetId);
    setBudgets(newBudgets);
    saveBudgets(newBudgets);
  };

  const handleAddCategory = async () => {
    if (!newCategory || !newCategoryBudget.trim()) {
      return;
    }
    
    const budgetName = newSubCategory ? `${newCategory} - ${newSubCategory}` : newCategory;
    
    const newBudget = {
      id: `b${Date.now()}`,
      name: budgetName,
      category: newCategory,
      subCategory: newSubCategory || '',
      amount: parseFloat(newCategoryBudget),
      used: 0,
    };
    
    const newBudgets = [...budgets, newBudget];
    setBudgets(newBudgets);
    saveBudgets(newBudgets);
    setNewCategory('');
    setNewSubCategory('');
    setNewCategoryBudget('');
    setShowAddModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-100 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={onBack} 
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">预算管理</h1>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {new Date().getFullYear()}年{new Date().getMonth() + 1}月
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-blue-100">总预算</span>
            <span className="text-blue-100">剩余: {totalRemaining.toLocaleString()}</span>
          </div>
          <div className="text-3xl font-bold mb-4">{totalBudget.toLocaleString()}</div>
          <div className="w-full bg-blue-400/30 rounded-full h-2.5 mb-4">
            <div 
              className="bg-white rounded-full h-2.5 transition-all duration-300"
              style={{ width: `${Math.min((totalUsed / totalBudget) * 100, 100)}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-blue-100 text-xs">预算支出</div>
            <div className="text-sm font-semibold">{Math.abs(totalUsed).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-blue-100 text-xs">日均预算</div>
              <div className="text-sm font-semibold">{dailyBudget.toFixed(0)}</div>
            </div>
            <div>
              <div className="text-blue-100 text-xs">日均支出</div>
            <div className="text-sm font-semibold">{Math.abs(dailyExpense).toFixed(0)}</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-400/30">
            <div className="flex items-center justify-between">
              <span className="text-blue-100 text-xs">今日剩余</span>
              <span className="text-lg font-bold">{todayRemaining.toFixed(0)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">预算趋势</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={budgetTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value, name) => [`${value.toLocaleString()}`, name]}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="expense" 
                  name="支出" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="remaining" 
                  name="剩余" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">年度预算进度</h3>
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              年度预算: <span className="font-bold text-gray-900 dark:text-white">{yearBudgetData.annualBudget.toLocaleString()}</span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              当年支出: <span className={`font-bold ${yearBudgetData.yearUsed > yearBudgetData.annualBudget ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>{yearBudgetData.yearUsed.toLocaleString()}</span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              完成度: <span className={`font-bold ${(yearBudgetData.yearUsed / yearBudgetData.annualBudget * 100) > 100 ? 'text-red-500' : 'text-blue-600'}`}>{Math.min((yearBudgetData.yearUsed / yearBudgetData.annualBudget * 100).toFixed(1), 100)}%</span>
            </div>
          </div>
          <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-3 mb-6">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${(yearBudgetData.yearUsed / yearBudgetData.annualBudget * 100) > 100 ? 'bg-red-500' : 'bg-blue-600'}`}
              style={{ width: `${Math.min((yearBudgetData.yearUsed / yearBudgetData.annualBudget) * 100, 100)}%` }}
            />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearBudgetData.months} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value, name) => [`${value.toLocaleString()}`, name]}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Legend />
                <Bar dataKey="budget" name="月预算" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="月支出" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">添加分类预算</span>
          </button>

          <div className="mt-4 space-y-3">
            {budgets.map((budget, index) => {
              const carryOver = carryOverMap[budget.id] || 0;
              const effectiveAmount = budget.amount - carryOver;
              const category = budget.category || budget.name;
              const used = monthRecords
                .filter(r => r.type === 'expense' && (
                  r.category === category || r.subCategory === budget.subCategory || r.category === budget.name
                ))
                .reduce((s, r) => s + Math.abs(r.amount), 0);
              const remaining = effectiveAmount - used;
              const percent = effectiveAmount > 0 ? (used / effectiveAmount) * 100 : (used > 0 ? 100 : 0);
              const isOverBudget = remaining < 0;
              
              return (
                <div key={budget.id} className="p-4 rounded-xl bg-gray-50 dark:bg-slate-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: colorPalette[index % colorPalette.length] }}
                      >
                        {budget.name.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{budget.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {editBudgetId === budget.id ? (
                        <>
                          <input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-24 px-2 py-1 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => handleSaveBudget(budget)}
                            className="px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => { setEditBudgetId(null); setEditAmount(''); }}
                            className="px-3 py-1 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 text-xs rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors"
                          >
                            取消
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditBudget(budget)}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDeleteBudget(budget.id)}
                            className="p-2 text-red-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {remaining.toLocaleString()} / {effectiveAmount.toLocaleString()}
                    </span>
                    <span className={`text-sm font-medium ${isOverBudget ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>
                      {percent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${isOverBudget ? 'bg-red-500' : percent >= 80 ? 'bg-orange-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    支出 {used.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">添加分类预算</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">类别 <span className="text-red-500">*</span></label>
                  <button 
                    onClick={() => setShowCategorySettings(true)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
                <select
                  value={newCategory}
                  onChange={(e) => {
                    setNewCategory(e.target.value);
                    setNewSubCategory('');
                  }}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择类别</option>
                  {Object.keys(categories).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">二级分类</label>
                <select
                  value={newSubCategory}
                  onChange={(e) => setNewSubCategory(e.target.value)}
                  disabled={!newCategory}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">请选择二级分类（可选）</option>
                  {subCategories.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">预算金额</label>
                <input
                  type="number"
                  value={newCategoryBudget}
                  onChange={(e) => setNewCategoryBudget(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入预算金额"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewCategory('');
                  setNewSubCategory('');
                  setNewCategoryBudget('');
                }}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddCategory}
                disabled={!newCategory || !newCategoryBudget.trim()}
                className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

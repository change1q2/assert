import { useState, useEffect, useRef } from 'react';
import { fetchState, saveState } from '../api';
import * as XLSX from 'xlsx';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  BookOpen,
  Settings,
  Edit2,
  Trash2,
  Upload,
  Image,
  SlidersHorizontal,
  FileSpreadsheet,
  Download,
  Wallet,
} from 'lucide-react';
import { CURRENCIES, getCurrencySymbol, DEFAULT_BASE_CURRENCY, convertAmount, DEFAULT_EXCHANGE_RATES } from '../utils/currency.js';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function formatCurrency(value, currencyCode) {
  const symbol = getCurrencySymbol(currencyCode);
  const isNegative = (value || 0) < 0;
  const absValue = Math.abs(value || 0);
  const formatted = absValue.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${isNegative ? '-' : ''}${symbol}${formatted}`;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const defaultCategories = {
  income: {
    '工资': ['工资', '奖金', '补贴'],
    '理财': ['利息', '分红'],
    '其他收入': ['红包', '退款', '其他'],
  },
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

export default function Records({ onNavigate }) {
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timePeriod, setTimePeriod] = useState('全部');
  const [selectedMonth, setSelectedMonth] = useState('本月');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [calendarSize, setCalendarSize] = useState('normal');
  const [showAddModal, setShowAddModal] = useState(false);
  const [baseCurrency, setBaseCurrency] = useState(DEFAULT_BASE_CURRENCY);
  const [selectedCurrencyFilter, setSelectedCurrencyFilter] = useState(DEFAULT_BASE_CURRENCY);
  const [newRecord, setNewRecord] = useState({ date: '', type: 'expense', category: '', subCategory: '', amount: '', book: '', account: '', note: '', tag: '', currency: DEFAULT_BASE_CURRENCY });
  const [saving, setSaving] = useState(false);
  const importInProgress = useRef(false);
  const [isBatchEditMode, setIsBatchEditMode] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState(new Set());
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showBatchEditField, setShowBatchEditField] = useState(null);
  const [batchEditValue, setBatchEditValue] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState(defaultCategories);
  const [tags, setTags] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [listFilters, setListFilters] = useState({
    date: '',
    book: '',
    type: 'all',
    category: '',
    subCategory: '',
    amountMin: '',
    amountMax: '',
    cnyMin: '',
    cnyMax: '',
    tag: '',
    note: '',
  });

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('recordsVisibleColumns');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      date: true,
      type: true,
      amount: true,
      category: true,
      subCategory: true,
      book: true,
      currency: true,
      note: true,
      tag: true,
    };
  });
  const [showColumnSettingsModal, setShowColumnSettingsModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('recordsVisibleColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const handleFilterChange = (key, value) => {
    setListFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showExchangeRateModal, setShowExchangeRateModal] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newBookName, setNewBookName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [subCategoryToEdit, setSubCategoryToEdit] = useState(null);
  const [newSubCategoryName, setNewSubCategoryName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [importPreview, setImportPreview] = useState([]);
  const [importStep, setImportStep] = useState('upload');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fieldMapping, setFieldMapping] = useState({});
  const [excelHeaders, setExcelHeaders] = useState([]);

  const [uploadedImage, setUploadedImage] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [customStartDate, setCustomStartDate] = useState(formatDate(new Date(new Date().setMonth(new Date().getMonth() - 1))));
  const [customEndDate, setCustomEndDate] = useState(formatDate(new Date()));
  const [incomePieView, setIncomePieView] = useState('category');
  const [expensePieView, setExpensePieView] = useState('category');

  const { records = [], budgets = [] } = stateData || {};

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [timePeriod, selectedMonth, selectedDate, selectedBook, selectedCurrencyFilter]);

  const getStatLabels = () => {
    switch (timePeriod) {
      case '全部':
        return { income: '总收入', expense: '总支出', net: '净收入' };
      case '日常':
        return { income: '当日收入', expense: '当日支出', net: '当日净收入' };
      case '月统计':
        return { income: '当月收入', expense: '当月支出', net: '当月净收入' };
      case '年统计':
        return { income: '当年收入', expense: '当年支出', net: '当年净收入' };
      case '自定义':
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
        if (days <= 30) {
          return { income: '区间收入', expense: '区间支出', net: '区间净收入' };
        } else if (days <= 365) {
          return { income: '期间收入', expense: '期间支出', net: '期间净收入' };
        } else {
          return { income: '跨年收入', expense: '跨年支出', net: '跨年净收入' };
        }
      default:
        return { income: '总收入', expense: '总支出', net: '净收入' };
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchState();
      const safeData = data || {};
      setStateData(safeData);
      setBooks(safeData.books || []);
      setCategories(safeData.categories || defaultCategories);
      setTags(safeData.tags || []);
    } catch (err) {
      console.error('Failed to load records data:', err);
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const filterByBook = (recordsToFilter) => {
    if (!selectedBook) return recordsToFilter;
    return recordsToFilter.filter(record => {
      const bookName = books.find(b => b.id === record.bookId)?.name || record.book || '';
      return bookName === selectedBook;
    });
  };

  const parseDateAsLocal = (dateStr) => {
    const parts = dateStr.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  };

  const isDateInRange = (dateStr, range) => {
    const recordDate = parseDateAsLocal(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (range) {
      case 'today':
        return recordDate.toDateString() === today.toDateString();
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return recordDate.toDateString() === yesterday.toDateString();
      case 'week':
        const weekStart = new Date(today);
        const dayOfWeek = today.getDay();
        const startOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        weekStart.setDate(today.getDate() - startOffset);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(today);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        return recordDate >= weekStart && recordDate <= weekEnd;
      case 'month':
        return recordDate.getMonth() === today.getMonth() && recordDate.getFullYear() === today.getFullYear();
      case 'lastMonth':
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return recordDate.getMonth() === lastMonth.getMonth() && recordDate.getFullYear() === lastMonth.getFullYear();
      default:
        return true;
    }
  };

  const applyListFilters = (recordsToFilter) => {
    if (!recordsToFilter) return [];
    return recordsToFilter.filter((record) => {
      if (listFilters.date && !isDateInRange(record.date, listFilters.date)) return false;
      if (listFilters.book && (books.find(b => b.id === record.bookId)?.name || record.book) !== listFilters.book) return false;
      if (listFilters.type !== 'all' && record.type !== listFilters.type) return false;
      if (listFilters.category && !(record.category || '').includes(listFilters.category)) return false;
      if (listFilters.subCategory && !(record.sub || record.subCategory || '').includes(listFilters.subCategory)) return false;

      const displayAmount = convertAmount(Math.abs(record.amount || 0), record.currency || DEFAULT_BASE_CURRENCY, selectedCurrencyFilter, DEFAULT_EXCHANGE_RATES);
      if (listFilters.amountMin && displayAmount < parseFloat(listFilters.amountMin)) return false;
      if (listFilters.amountMax && displayAmount > parseFloat(listFilters.amountMax)) return false;

      const baseAmount = convertAmount(Math.abs(record.amount || 0), record.currency || DEFAULT_BASE_CURRENCY, DEFAULT_BASE_CURRENCY, DEFAULT_EXCHANGE_RATES);
      if (listFilters.cnvMin && baseAmount < parseFloat(listFilters.cnvMin)) return false;
      if (listFilters.cnvMax && baseAmount > parseFloat(listFilters.cnvMax)) return false;

      if (listFilters.tag) {
        const tags = record.tag || [];
        const tagStr = Array.isArray(tags) ? tags.join(',') : String(tags || '');
        if (!tagStr.includes(listFilters.tag)) return false;
      }
      if (listFilters.note && !(record.note || '').includes(listFilters.note)) return false;

      return true;
    });
  };

  const getSubCategories = (primaryCategory, type = newRecord.type) => {
    if (!primaryCategory) return [];
    const typeCategories = categories[type] || {};
    return typeCategories[primaryCategory] || [];
  };

  const filterByTime = (recordsToFilter) => {
    if (!recordsToFilter || recordsToFilter.length === 0) return [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return recordsToFilter.filter(record => {
      const recordDate = new Date(record.date);
      const recordYear = recordDate.getFullYear();
      const recordMonth = recordDate.getMonth();

      if (timePeriod === '全部') {
        return true;
      }

      if (timePeriod === '日常') {
        if (selectedDate) {
          return recordDate.toDateString() === selectedDate.toDateString();
        }
        const today = now.toDateString();
        return recordDate.toDateString() === today;
      }

      if (timePeriod === '年统计') {
        return recordYear === currentYear;
      }

      if (timePeriod === '月统计') {
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

        return recordYear === targetYear && recordMonth === targetMonth;
      }

      if (timePeriod === '自定义') {
        const startDate = new Date(customStartDate);
        const endDate = new Date(customEndDate);
        return recordDate >= startDate && recordDate <= endDate;
      }

      return true;
    });
  };

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;
    try {
      const updatedRecords = records.filter(r => r.id !== recordToDelete.id);
      await saveState({ ...stateData, records: updatedRecords });
      setShowDeleteConfirm(false);
      setRecordToDelete(null);
      loadData();
    } catch (err) {
      console.error('Failed to delete record:', err);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRecordIds.size === 0) return;
    try {
      const updatedRecords = records.filter(r => !selectedRecordIds.has(r.id));
      await saveState({ ...stateData, records: updatedRecords });
      setShowBatchDeleteConfirm(false);
      setIsBatchEditMode(false);
      setSelectedRecordIds(new Set());
      loadData();
    } catch (err) {
      console.error('Failed to batch delete:', err);
    }
  };

  const handleEditRecord = (record) => {
    const bookName = books.find(b => b.id === record.bookId)?.name || record.book || '';
    setEditingRecord({
      ...record,
      book: bookName,
      sub: record.sub || record.subCategory || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    setSaving(true);
    try {
      const updatedRecords = records.map(r => {
        if (r.id === editingRecord.id) {
          return {
            ...editingRecord,
            bookId: books.find(b => b.name === editingRecord.book)?.id || r.bookId,
            amount: editingRecord.type === 'expense' ? -Math.abs(parseFloat(editingRecord.amount)) : Math.abs(parseFloat(editingRecord.amount)),
          };
        }
        return r;
      });
      await saveState({ ...stateData, records: updatedRecords, categories, books, tags });
      setShowEditModal(false);
      setEditingRecord(null);
      loadData();
    } catch (err) {
      console.error('Failed to save edit:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleBatchEdit = async (field, value) => {
    if (selectedRecordIds.size === 0) return;
    setSaving(true);
    try {
      const updatedRecords = records.map(r => {
        if (selectedRecordIds.has(r.id)) {
          const updated = { ...r };
          if (field === 'date') updated.date = value;
          if (field === 'category') updated.category = value;
          if (field === 'sub') updated.sub = value;
          if (field === 'book') {
            updated.book = value;
            updated.bookId = books.find(b => b.name === value)?.id || '';
          }
          if (field === 'tag') updated.tag = value;
          if (field === 'note') updated.note = value;
          if (field === 'amount') {
            const amt = parseFloat(value);
            if (!isNaN(amt)) {
              const absAmt = Math.abs(amt);
              updated.amount = updated.type === 'income' ? absAmt : -absAmt;
            }
          }
          if (field === 'type') {
            updated.type = value;
            updated.amount = value === 'income' ? Math.abs(updated.amount) : -Math.abs(updated.amount);
          }
          return updated;
        }
        return r;
      });
      await saveState({ ...stateData, records: updatedRecords, categories, books, tags });
      setShowBatchEditField(null);
      setBatchEditValue('');
      setIsBatchEditMode(false);
      setSelectedRecordIds(new Set());
      loadData();
    } catch (err) {
      console.error('Failed to batch edit:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddRecord = async () => {
    if (!newRecord.date || !newRecord.amount) return;
    setSaving(true);
    try {
      const amount = parseFloat(newRecord.amount);
      const finalAmount = newRecord.type === 'expense' ? -Math.abs(amount) : Math.abs(amount);
      const newRecordData = {
        ...newRecord,
        amount: finalAmount,
        bookId: books.find(b => b.name === newRecord.book)?.id || '',
        sub: newRecord.subCategory || '',
        tag: newRecord.tag || '',
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      };
      delete newRecordData.book;
      delete newRecordData.subCategory;

      const updatedRecords = [...records, newRecordData];
      await saveState({
        ...stateData,
        records: updatedRecords,
        categories,
      });

      setShowAddModal(false);
      setNewRecord({ date: '', type: 'expense', category: '', subCategory: '', amount: '', book: '', account: '', note: '', tag: '', currency: baseCurrency });
      setUploadedImage(null);
      setOcrResult(null);
      loadData();
    } catch (err) {
      console.error('Failed to add record:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCategories = async () => {
    await saveState({
      ...stateData,
      categories,
    });
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const typeCategories = categories[newRecord.type] || {};
    if (typeCategories[newCategoryName.trim()]) return;
    const newCategories = {
      ...categories,
      [newRecord.type]: {
        ...typeCategories,
        [newCategoryName.trim()]: ['其他'],
      },
    };
    setCategories(newCategories);
    setNewCategoryName('');
    handleSaveCategories();
  };

  const handleEditCategory = (categoryName) => {
    setCategoryToEdit(categoryName);
  };

  const handleSaveCategoryEdit = () => {
    if (!categoryToEdit || !newCategoryName.trim()) return;
    const typeCategories = categories[newRecord.type] || {};
    if (typeCategories[newCategoryName.trim()] && newCategoryName.trim() !== categoryToEdit) return;

    const newCategories = {
      ...categories,
      [newRecord.type]: {
        ...typeCategories,
        [newCategoryName.trim()]: typeCategories[categoryToEdit],
      },
    };
    delete newCategories[newRecord.type][categoryToEdit];
    setCategories(newCategories);
    if (newRecord.category === categoryToEdit) {
      setNewRecord({ ...newRecord, category: newCategoryName.trim() });
    }
    setCategoryToEdit(null);
    setNewCategoryName('');
    handleSaveCategories();
  };

  const handleDeleteCategory = async (categoryName) => {
    const typeCategories = categories[newRecord.type] || {};
    const newCategories = {
      ...categories,
      [newRecord.type]: { ...typeCategories },
    };
    delete newCategories[newRecord.type][categoryName];
    setCategories(newCategories);
    if (newRecord.category === categoryName) {
      setNewRecord({ ...newRecord, category: '', subCategory: '' });
    }
    setDeleteConfirm(null);
    handleSaveCategories();
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    const newTag = { id: Date.now(), name: newTagName.trim(), color: '#8B5CF6', createdAt: new Date().toISOString() };
    const updatedTags = [...tags, newTag];
    const currentState = stateData || await fetchState();
    await saveState({ ...currentState, tags: updatedTags });
    setNewTagName('');
    loadData();
  };

  const handleDeleteTag = async (tagToDelete) => {
    const updatedTags = tags.filter(t => t.id !== tagToDelete.id && t.name !== tagToDelete.name);
    const currentState = stateData || await fetchState();
    await saveState({ ...currentState, tags: updatedTags });
    loadData();
  };

  const handleAddBook = async () => {
    if (!newBookName.trim()) return;
    const newBook = { id: Date.now(), name: newBookName.trim(), icon: '', color: '#2563EB', createdAt: new Date().toISOString() };
    const updatedBooks = [...books, newBook];
    const currentState = stateData || await fetchState();
    await saveState({ ...currentState, books: updatedBooks });
    setNewBookName('');
    loadData();
  };

  const handleDeleteBook = async (bookToDelete) => {
    const updatedBooks = books.filter(b => b.id !== bookToDelete.id && b.name !== bookToDelete.name);
    const currentState = stateData || await fetchState();
    await saveState({ ...currentState, books: updatedBooks });
    loadData();
  };

  const handleAddSubCategory = () => {
    if (!newSubCategoryName.trim() || !newRecord.category) return;
    const typeCategories = categories[newRecord.type] || {};
    const subCategories = typeCategories[newRecord.category] || [];
    if (subCategories.includes(newSubCategoryName.trim())) return;

    const newCategories = {
      ...categories,
      [newRecord.type]: {
        ...typeCategories,
        [newRecord.category]: [...subCategories, newSubCategoryName.trim()],
      },
    };
    setCategories(newCategories);
    setNewSubCategoryName('');
    handleSaveCategories();
  };

  const handleEditSubCategory = (subCategoryName) => {
    setSubCategoryToEdit(subCategoryName);
  };

  const handleSaveSubCategoryEdit = () => {
    if (!subCategoryToEdit || !newSubCategoryName.trim() || !newRecord.category) return;
    const typeCategories = categories[newRecord.type] || {};
    const subCategories = typeCategories[newRecord.category] || [];
    if (subCategories.includes(newSubCategoryName.trim()) && newSubCategoryName.trim() !== subCategoryToEdit) return;

    const newCategories = {
      ...categories,
      [newRecord.type]: {
        ...typeCategories,
        [newRecord.category]: subCategories.map(sc => sc === subCategoryToEdit ? newSubCategoryName.trim() : sc),
      },
    };
    setCategories(newCategories);
    if (newRecord.subCategory === subCategoryToEdit) {
      setNewRecord({ ...newRecord, subCategory: newSubCategoryName.trim() });
    }
    setSubCategoryToEdit(null);
    setNewSubCategoryName('');
    handleSaveCategories();
  };

  const handleDeleteSubCategory = async (subCategoryName) => {
    if (!newRecord.category) return;
    const typeCategories = categories[newRecord.type] || {};
    const subCategories = typeCategories[newRecord.category] || [];

    const newCategories = {
      ...categories,
      [newRecord.type]: {
        ...typeCategories,
        [newRecord.category]: subCategories.filter(sc => sc !== subCategoryName),
      },
    };
    setCategories(newCategories);
    if (newRecord.subCategory === subCategoryName) {
      setNewRecord({ ...newRecord, subCategory: '' });
    }
    setDeleteConfirm(null);
    handleSaveCategories();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target.result);
        setOcrResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOCR = () => {
    if (!uploadedImage) return;

    const mockOCRText = `
      金额：¥128.50
      日期：2026-06-28
      2026/06/28
      总计 256.00
      日期 2026年6月28日
    `;

    const amountMatch = mockOCRText.match(/(?:金额|总计|¥)?\s*(\d+\.?\d*)/);
    const dateMatch = mockOCRText.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);

    const result = {};
    if (amountMatch) {
      result.amount = amountMatch[1];
    }
    if (dateMatch) {
      const year = dateMatch[1];
      const month = String(parseInt(dateMatch[2])).padStart(2, '0');
      const day = String(parseInt(dateMatch[3])).padStart(2, '0');
      result.date = `${year}-${month}-${day}`;
    }

    setOcrResult(result);

    if (result.amount || result.date) {
      setNewRecord(prev => ({
        ...prev,
        amount: result.amount || prev.amount,
        date: result.date || prev.date,
      }));
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['日期', '收支类型', '金额', '类别', '二级分类', '所属账本', '收支账户', '备注', '标签'];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '收支记录');
    XLSX.writeFile(wb, '收支记录模板.xlsx');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportError('');
    setImportSuccess('');
    setImportStep('loading');
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return 90;
        return prev + Math.random() * 10;
      });
    }, 200);

    const reader = new FileReader();
    reader.onload = (event) => {
      clearInterval(interval);
      setUploadProgress(100);
      
      setTimeout(() => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (jsonData.length === 0) {
            setImportError('文件中没有数据');
            setImportStep('upload');
            return;
          }

          const headers = Object.keys(jsonData[0]);
          setExcelHeaders(headers);

          const systemFields = ['日期', '收支类型', '金额', '类别', '二级分类', '所属账本', '收支账户', '备注', '标签'];
          const initialMapping = {};
          systemFields.forEach(field => {
            if (headers.includes(field)) {
              initialMapping[field] = field;
            } else {
              initialMapping[field] = '';
            }
          });
          setFieldMapping(initialMapping);
          setImportPreview(jsonData);
          setImportStep('mapping');
        } catch (err) {
          console.error('Excel parse error:', err);
          setImportError('解析文件失败，请确保文件格式正确');
          setImportStep('upload');
        }
      }, 300);
    };
    reader.onerror = () => {
      setImportError('文件读取失败，请重试');
    };
    reader.readAsArrayBuffer(file);
    
    e.target.value = '';
  };

  const handleImport = async () => {
    if (importInProgress.current) return;
    const validRecords = importPreview.filter(r => r.isValid);

    if (validRecords.length === 0) {
      setImportError('没有有效的记录可导入');
      return;
    }

    importInProgress.current = true;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      
      let updatedCategories = { ...categories };
      let updatedBooks = [...books];
      let updatedTags = [...tags];

      for (const row of validRecords) {
        const type = row['收支类型'] === '收入' ? 'income' : 'expense';
        const category = row['类别'];
        const subCategory = row['二级分类'];
        const bookName = row['所属账本'];
        const tagName = row['标签'];

        if (category && !updatedCategories[type]) {
          updatedCategories[type] = {};
        }

        if (category && !updatedCategories[type][category]) {
          updatedCategories[type][category] = [];
        }

        if (subCategory && category && updatedCategories[type][category] && !updatedCategories[type][category].includes(subCategory)) {
          updatedCategories[type][category] = [...updatedCategories[type][category], subCategory];
        }

        if (bookName && !updatedBooks.find(b => b.name === bookName)) {
          updatedBooks.push({
            id: Date.now() + Math.random(),
            name: bookName,
            icon: '',
            color: '#2563EB',
            createdAt: now,
          });
        }

        if (tagName && !updatedTags.find(t => t.name === tagName)) {
          updatedTags.push({
            id: Date.now() + Math.random(),
            name: tagName,
            color: '#8B5CF6',
            createdAt: now,
          });
        }
      }

      const newRecords = validRecords.map((row, idx) => {
        const amount = parseFloat(row['金额']);
        const finalAmount = row['收支类型'] === '收入' ? Math.abs(amount) : -Math.abs(amount);

        const bookId = updatedBooks.find(b => b.name === row['所属账本'])?.id || '';
        const currencyCode = CURRENCIES.find(c => c.name === row['收支账户'])?.code || DEFAULT_BASE_CURRENCY;

        return {
          id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          date: row['日期'],
          type: row['收支类型'] === '收入' ? 'income' : 'expense',
          amount: finalAmount,
          category: row['类别'],
          sub: row['二级分类'] || '',
          bookId,
          book: row['所属账本'] || '',
          currency: currencyCode,
          accountId: '',
          recorder: '',
          note: row['备注'] || '',
          tag: row['标签'] || '',
          createdAt: now,
        };
      });

      const updatedRecords = [...records, ...newRecords];
      const result = await saveState({
        ...stateData,
        records: updatedRecords,
        categories: updatedCategories,
        books: updatedBooks,
        tags: updatedTags,
      });

      if (!result || !result.ok) {
        throw new Error(result?.error || '保存失败');
      }

      setCategories(updatedCategories);
      setBooks(updatedBooks);
      setTags(updatedTags);
      setShowImportModal(false);
      setImportPreview([]);
      setImportSuccess(`成功导入 ${validRecords.length} 条记录`);
      loadData();
    } catch (err) {
      console.error('Failed to import records:', err);
      setImportError('导入失败：' + (err.message || '请重试'));
    } finally {
      importInProgress.current = false;
      setSaving(false);
    }
  };

  const getDailyTotals = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const totals = {};
    filterByBook(records).forEach(record => {
      const d = new Date(record.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const dateKey = formatDate(d);
        if (!totals[dateKey]) totals[dateKey] = { income: 0, expense: 0 };
        const rawAmount = Math.abs(record.amount || 0);
        const fromCurrency = record.currency || DEFAULT_BASE_CURRENCY;
        const amount = convertAmount(rawAmount, fromCurrency, selectedCurrencyFilter, DEFAULT_EXCHANGE_RATES);
        if (record.type === 'income') totals[dateKey].income += amount;
        else totals[dateKey].expense += amount;
      }
    });
    return totals;
  };

  const getMonthlyData = () => {
    const monthlyData = [];
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const filteredRecords = filterByBook(records).filter(r => new Date(r.date).getFullYear() === chartYear);
    
    months.forEach((month, idx) => {
      const monthRecords = filteredRecords.filter(r => new Date(r.date).getMonth() === idx);
      const income = monthRecords
        .filter(r => r.type === 'income')
        .reduce((sum, r) => {
          const rawAmount = Math.abs(r.amount || 0);
          const fromCurrency = r.currency || DEFAULT_BASE_CURRENCY;
          return sum + convertAmount(rawAmount, fromCurrency, selectedCurrencyFilter, DEFAULT_EXCHANGE_RATES);
        }, 0);
      const expense = monthRecords
        .filter(r => r.type === 'expense')
        .reduce((sum, r) => {
          const rawAmount = Math.abs(r.amount || 0);
          const fromCurrency = r.currency || DEFAULT_BASE_CURRENCY;
          return sum + convertAmount(rawAmount, fromCurrency, selectedCurrencyFilter, DEFAULT_EXCHANGE_RATES);
        }, 0);
      monthlyData.push({ month, income, expense });
    });
    
    return monthlyData;
  };

  const getYearlyData = () => {
    const yearlyData = [];
    const filteredRecords = filterByBook(records);
    const years = [...new Set(filteredRecords.map(r => new Date(r.date).getFullYear()))];
    if (years.length === 0) years.push(new Date().getFullYear());
    years.sort((a, b) => a - b);
    
    years.forEach(year => {
      const yearRecords = filteredRecords.filter(r => new Date(r.date).getFullYear() === year);
      const income = yearRecords
        .filter(r => r.type === 'income')
        .reduce((sum, r) => {
          const rawAmount = Math.abs(r.amount || 0);
          const fromCurrency = r.currency || DEFAULT_BASE_CURRENCY;
          return sum + convertAmount(rawAmount, fromCurrency, selectedCurrencyFilter, DEFAULT_EXCHANGE_RATES);
        }, 0);
      const expense = yearRecords
        .filter(r => r.type === 'expense')
        .reduce((sum, r) => {
          const rawAmount = Math.abs(r.amount || 0);
          const fromCurrency = r.currency || DEFAULT_BASE_CURRENCY;
          return sum + convertAmount(rawAmount, fromCurrency, selectedCurrencyFilter, DEFAULT_EXCHANGE_RATES);
        }, 0);
      yearlyData.push({ year: year.toString(), income, expense });
    });
    
    return yearlyData;
  };

  const getCustomData = () => {
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let displayMode = 'day';
    if (diffDays > 365) {
      displayMode = 'year';
    } else if (diffDays > 30) {
      displayMode = 'month';
    }
    
    const filteredRecords = filterByBook(records).filter(r => {
      const rDate = parseDateAsLocal(r.date);
      return rDate >= start && rDate <= end;
    });
    
    const data = [];
    const symbol = getCurrencySymbol(selectedCurrencyFilter);
    
    if (displayMode === 'year') {
      const years = [...new Set(filteredRecords.map(r => new Date(r.date).getFullYear()))];
      years.sort((a, b) => a - b);
      years.forEach(year => {
        const yearRecords = filteredRecords.filter(r => new Date(r.date).getFullYear() === year);
        const income = yearRecords.filter(r => r.type === 'income').reduce((sum, r) => {
          const rawAmount = Math.abs(r.amount || 0);
          const fromCurrency = r.currency || DEFAULT_BASE_CURRENCY;
          return sum + convertAmount(rawAmount, fromCurrency, selectedCurrencyFilter, DEFAULT_EXCHANGE_RATES);
        }, 0);
        const expense = yearRecords.filter(r => r.type === 'expense').reduce((sum, r) => {
          const rawAmount = Math.abs(r.amount || 0);
          const fromCurrency = r.currency || DEFAULT_BASE_CURRENCY;
          return sum + convertAmount(rawAmount, fromCurrency, selectedCurrencyFilter, DEFAULT_EXCHANGE_RATES);
        }, 0);
        data.push({ label: year.toString(), income, expense });
      });
    } else if (displayMode === 'month') {
      const monthMap = {};
      filteredRecords.forEach(r => {
        const d = new Date(r.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthMap[key] = monthMap[key] || { income: 0, expense: 0 };
        const rawAmount = Math.abs(r.amount || 0);
        const fromCurrency = r.currency || DEFAULT_BASE_CURRENCY;
        const amount = convertAmount(rawAmount, fromCurrency, selectedCurrencyFilter, DEFAULT_EXCHANGE_RATES);
        if (r.type === 'income') monthMap[key].income += amount;
        else monthMap[key].expense += amount;
      });
      Object.keys(monthMap).sort().forEach(key => {
        data.push({ label: key.substring(5) + '月', ...monthMap[key] });
      });
    } else {
      const dayMap = {};
      filteredRecords.forEach(r => {
        const d = new Date(r.date);
        const key = formatDate(d);
        dayMap[key] = dayMap[key] || { income: 0, expense: 0 };
        const rawAmount = Math.abs(r.amount || 0);
        const fromCurrency = r.currency || DEFAULT_BASE_CURRENCY;
        const amount = convertAmount(rawAmount, fromCurrency, selectedCurrencyFilter, DEFAULT_EXCHANGE_RATES);
        if (r.type === 'income') dayMap[key].income += amount;
        else dayMap[key].expense += amount;
      });
      Object.keys(dayMap).sort().forEach(key => {
        data.push({ label: key.substring(5), ...dayMap[key] });
      });
    }
    
    return { data, displayMode };
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

    const sizeClasses = {
      small: 'gap-0.5',
      normal: 'gap-1',
      large: 'gap-2',
    };

    const cellPaddingClasses = {
      small: 'p-0.5',
      normal: 'p-1',
      large: 'p-2',
    };

    const fontSizeClasses = {
      small: 'text-[8px]',
      normal: 'text-xs',
      large: 'text-sm',
    };

    const maxAmount = Math.max(
      ...Object.values(totals).map(t => Math.max(t.income, t.expense)),
      1
    );

    const getBarWidth = (amount) => {
      const percent = (amount / maxAmount) * 100;
      return Math.min(Math.max(percent, 5), 100);
    };

    return (
      <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200/60 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCalendarDate(new Date(year, month - 1, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"><ChevronLeft className="w-5 h-5" /></button>
          <span className="font-semibold font-mono tracking-tight">{year}年{month + 1}月</span>
          <button onClick={() => setCalendarDate(new Date(year, month + 1, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"><ChevronRight className="w-5 h-5" /></button>
        </div>
        <div className={`grid grid-cols-7 ${sizeClasses[calendarSize]} text-center ${fontSizeClasses[calendarSize]}`}>
          {['日', '一', '二', '三', '四', '五', '六'].map(d => (
            <span key={d} className="text-gray-400 py-1 font-medium">{d}</span>
          ))}
          {days.map((day, idx) => {
            if (!day) return <span key={`empty-${idx}`} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTotals = totals[dateStr] || { income: 0, expense: 0 };
            const isToday = dateStr === todayStr;
            const isSelected = selectedDate && formatDate(selectedDate) === dateStr;

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(new Date(year, month, day))}
                className={`${cellPaddingClasses[calendarSize]} rounded-lg relative transition-all duration-200 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-300'
                    : isToday
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200'
                    : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <div className={`flex justify-center items-center ${calendarSize === 'large' ? 'h-6' : ''}`}>
                  <span className={`font-semibold ${calendarSize === 'small' ? 'text-[10px]' : calendarSize === 'large' ? 'text-base' : 'text-xs'}`}>
                    {day}
                  </span>
                </div>
                {(dayTotals.income > 0 || dayTotals.expense > 0) && (
                  <div className="mt-0.5 space-y-0.5">
                    {dayTotals.expense > 0 && (
                      <div className="flex items-center gap-0.5">
                        <div
                          className={`h-1 rounded-full bg-red-400 ${isSelected ? 'bg-red-300' : ''}`}
                          style={{ width: `${getBarWidth(dayTotals.expense)}%` }}
                        />
                        <span className={`${calendarSize === 'small' ? 'text-[6px]' : calendarSize === 'large' ? 'text-xs' : 'text-[8px]'} ${isSelected ? 'text-white/80' : 'text-red-500'} flex-shrink-0`}>
                          {dayTotals.expense > 999 ? (dayTotals.expense / 1000).toFixed(1) + 'k' : Math.floor(dayTotals.expense)}
                        </span>
                      </div>
                    )}
                    {dayTotals.income > 0 && (
                      <div className="flex items-center gap-0.5">
                        <div
                          className={`h-1 rounded-full bg-green-400 ${isSelected ? 'bg-green-300' : ''}`}
                          style={{ width: `${getBarWidth(dayTotals.income)}%` }}
                        />
                        <span className={`${calendarSize === 'small' ? 'text-[6px]' : calendarSize === 'large' ? 'text-xs' : 'text-[8px]'} ${isSelected ? 'text-white/80' : 'text-green-500'} flex-shrink-0`}>
                          +{dayTotals.income > 999 ? (dayTotals.income / 1000).toFixed(1) + 'k' : Math.floor(dayTotals.income)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <div className="flex gap-4 text-xs">
            <button
              onClick={() => setSelectedDate(new Date())}
              className={`px-3 py-1 rounded-full transition-colors ${
                !selectedDate || formatDate(selectedDate) === todayStr
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              今日
            </button>
            <button
              onClick={() => {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                setSelectedDate(y);
              }}
              className="px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              昨日
            </button>
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                清除
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">卡片大小:</span>
            {[
              { size: 'small', label: '小' },
              { size: 'normal', label: '中' },
              { size: 'large', label: '大' },
            ].map(({ size, label }) => (
              <button
                key={size}
                onClick={() => setCalendarSize(size)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  calendarSize === size
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center gap-6 mt-3 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-1 bg-red-400 rounded-full" />
            <span>支出</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1 bg-green-400 rounded-full" />
            <span>收入</span>
          </div>
        </div>
      </div>
    );
  };

  const renderMonthlyChart = () => {
    const data = getMonthlyData();
    const symbol = getCurrencySymbol(selectedCurrencyFilter);
    
    return (
      <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200/60 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold font-mono tracking-tight">月度收支统计 - {chartYear}年</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setChartYear(chartYear - 1)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <input
              type="number"
              value={chartYear}
              onChange={(e) => setChartYear(Math.max(2000, Math.min(2100, parseInt(e.target.value) || 2000)))}
              className="w-16 px-2 py-1 text-center border border-gray-200 dark:border-slate-700 rounded text-sm dark:bg-slate-700"
            />
            <button onClick={() => setChartYear(chartYear + 1)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-700" />
              <XAxis dataKey="month" className="dark:text-gray-400" />
              <YAxis className="dark:text-gray-400" tickFormatter={(value) => `${symbol}${value.toLocaleString()}`} />
              <Tooltip
                formatter={(value, name) => [`${symbol}${value.toLocaleString()}`, name]}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
              />
              <Legend />
              <Bar dataKey="income" name="收入" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="支出" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderYearlyChart = () => {
    const data = getYearlyData();
    const symbol = getCurrencySymbol(selectedCurrencyFilter);
    
    return (
      <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200/60 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold font-mono tracking-tight">年度收支趋势</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-700" />
              <XAxis dataKey="year" className="dark:text-gray-400" />
              <YAxis className="dark:text-gray-400" tickFormatter={(value) => `${symbol}${value.toLocaleString()}`} />
              <Tooltip
                formatter={(value) => [`${symbol}${value.toLocaleString()}`, value > 0 ? '收入' : '支出']}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
              />
              <Legend />
              <Line type="monotone" dataKey="income" name="收入" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="expense" name="支出" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderCustomRange = () => {
    const { data, displayMode } = getCustomData();
    const symbol = getCurrencySymbol(selectedCurrencyFilter);
    
    const chartConfig = {
      day: { title: '按日统计', Chart: BarChart, Series: Bar },
      month: { title: '按月统计', Chart: BarChart, Series: Bar },
      year: { title: '按年统计', Chart: LineChart, Series: Line },
    };
    
    const { title, Chart, Series } = chartConfig[displayMode];
    
    return (
      <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200/60 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">起始日期:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm dark:bg-slate-700"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">结束日期:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm dark:bg-slate-700"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">显示模式:</span>
            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">
              {title}
            </span>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <Chart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-700" />
              <XAxis dataKey="label" className="dark:text-gray-400" />
              <YAxis className="dark:text-gray-400" tickFormatter={(value) => `${symbol}${value.toLocaleString()}`} />
              <Tooltip
                formatter={(value) => [`${symbol}${value.toLocaleString()}`, value > 0 ? '收入' : '支出']}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
              />
              <Legend />
              {displayMode === 'year' ? (
                <>
                  <Series type="monotone" dataKey="income" name="收入" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                  <Series type="monotone" dataKey="expense" name="支出" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} />
                </>
              ) : (
                <>
                  <Series dataKey="income" name="收入" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Series dataKey="expense" name="支出" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </>
              )}
            </Chart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const computeIncomeExpense = () => {
    const filtered = filterByBook(filterByTime(records));

    const incomeMap = {};
    const expenseMap = {};
    let totalIncome = 0;
    let totalExpense = 0;

    filtered.forEach(record => {
      const rawAmount = Math.abs(record.amount || 0);
      const fromCurrency = record.currency || DEFAULT_BASE_CURRENCY;
      const amount = convertAmount(rawAmount, fromCurrency, selectedCurrencyFilter, DEFAULT_EXCHANGE_RATES);
      if (record.type === 'income') {
        totalIncome += amount;
        const category = record.category || '其他收入';
        incomeMap[category] = (incomeMap[category] || 0) + amount;
      } else if (record.type === 'expense') {
        totalExpense += amount;
        const category = record.category || '其他支出';
        expenseMap[category] = (expenseMap[category] || 0) + amount;
      }
    });

    const income = Object.entries(incomeMap).map(([category, amount]) => ({
      category,
      amount,
      percent: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
    }));

    const expense = Object.entries(expenseMap).map(([category, amount]) => ({
      category,
      amount,
      percent: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
    }));

    return { income, expense, totalIncome, totalExpense };
  };

  const INCOME_CATEGORY_COLORS = [
    '#8B5CF6', '#10B981', '#F59E0B', '#06B6D4', '#EC4899', '#14B8A6',
    '#F97316', '#2563EB', '#84CC16', '#0EA5E9', '#D946EF', '#22C55E',
    '#FBBF24', '#06B6D4', '#EC4899', '#8B5CF6', '#10B981', '#F59E0B',
    '#2563EB', '#14B8A6'
  ];
  const EXPENSE_CATEGORY_COLORS = [
    '#EC4899', '#8B5CF6', '#F59E0B', '#06B6D4', '#10B981', '#F97316',
    '#2563EB', '#14B8A6', '#84CC16', '#0EA5E9', '#D946EF', '#22C55E',
    '#FBBF24', '#F43F5E', '#A855F7', '#06B6D4', '#EC4899', '#8B5CF6',
    '#10B981', '#F97316'
  ];

  const computePieChartData = () => {
    const filtered = filterByBook(filterByTime(records));

    const incomeCategoryMap = {};
    const expenseCategoryMap = {};
    const incomeDetailMap = {};
    const expenseDetailMap = {};
    let totalIncome = 0;
    let totalExpense = 0;

    const incomeCategoryOrder = Object.keys(categories.income || {});
    const expenseCategoryOrder = Object.keys(categories.expense || {});

    const findParentCategory = (subCat, type) => {
      const typeCategories = categories[type] || {};
      for (const [parent, subs] of Object.entries(typeCategories)) {
        if (subs.includes(subCat)) return parent;
      }
      return null;
    };

    filtered.forEach(record => {
      const rawAmount = Math.abs(record.amount || 0);
      const fromCurrency = record.currency || DEFAULT_BASE_CURRENCY;
      const amount = convertAmount(rawAmount, fromCurrency, selectedCurrencyFilter, DEFAULT_EXCHANGE_RATES);

      if (record.type === 'income') {
        totalIncome += amount;
        const category = record.category || '其他收入';
        incomeCategoryMap[category] = (incomeCategoryMap[category] || 0) + amount;

        const subCategory = record.sub || record.subCategory || '';
        let detailName;
        let parentCategory;
        if (subCategory) {
          detailName = subCategory;
          parentCategory = findParentCategory(subCategory, 'income') || category;
        } else {
          detailName = category + '-其他';
          parentCategory = category;
        }
        if (!incomeDetailMap[detailName]) {
          incomeDetailMap[detailName] = { value: 0, parentCategory };
        }
        incomeDetailMap[detailName].value += amount;
      } else if (record.type === 'expense') {
        totalExpense += amount;
        const category = record.category || '其他支出';
        expenseCategoryMap[category] = (expenseCategoryMap[category] || 0) + amount;

        const subCategory = record.sub || record.subCategory || '';
        let detailName;
        let parentCategory;
        if (subCategory) {
          detailName = subCategory;
          parentCategory = findParentCategory(subCategory, 'expense') || category;
        } else {
          detailName = category + '-其他';
          parentCategory = category;
        }
        if (!expenseDetailMap[detailName]) {
          expenseDetailMap[detailName] = { value: 0, parentCategory };
        }
        expenseDetailMap[detailName].value += amount;
      }
    });

    const incomeCategoryData = Object.entries(incomeCategoryMap)
      .map(([category, amount], index) => ({
        category,
        amount,
        percent: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
        color: INCOME_CATEGORY_COLORS[index % INCOME_CATEGORY_COLORS.length],
      }))
      .sort((a, b) => {
        const idxA = incomeCategoryOrder.indexOf(a.category);
        const idxB = incomeCategoryOrder.indexOf(b.category);
        if (idxA === -1 && idxB === -1) return b.amount - a.amount;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });

    const expenseCategoryData = Object.entries(expenseCategoryMap)
      .map(([category, amount], index) => ({
        category,
        amount,
        percent: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
        color: EXPENSE_CATEGORY_COLORS[index % EXPENSE_CATEGORY_COLORS.length],
      }))
      .sort((a, b) => {
        const idxA = expenseCategoryOrder.indexOf(a.category);
        const idxB = expenseCategoryOrder.indexOf(b.category);
        if (idxA === -1 && idxB === -1) return b.amount - a.amount;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });

    const incomeDetailData = Object.entries(incomeDetailMap)
      .map(([name, data], index) => ({
        name,
        value: data.value,
        percent: totalIncome > 0 ? (data.value / totalIncome) * 100 : 0,
        color: INCOME_CATEGORY_COLORS[index % INCOME_CATEGORY_COLORS.length],
        parentCategory: data.parentCategory,
      }))
      .sort((a, b) => {
        const parentIdxA = incomeCategoryOrder.indexOf(a.parentCategory);
        const parentIdxB = incomeCategoryOrder.indexOf(b.parentCategory);
        if (parentIdxA !== parentIdxB) {
          if (parentIdxA === -1) return 1;
          if (parentIdxB === -1) return -1;
          return parentIdxA - parentIdxB;
        }
        return b.value - a.value;
      });

    const expenseDetailData = Object.entries(expenseDetailMap)
      .map(([name, data], index) => ({
        name,
        value: data.value,
        percent: totalExpense > 0 ? (data.value / totalExpense) * 100 : 0,
        color: EXPENSE_CATEGORY_COLORS[index % EXPENSE_CATEGORY_COLORS.length],
        parentCategory: data.parentCategory,
      }))
      .sort((a, b) => {
        const parentIdxA = expenseCategoryOrder.indexOf(a.parentCategory);
        const parentIdxB = expenseCategoryOrder.indexOf(b.parentCategory);
        if (parentIdxA !== parentIdxB) {
          if (parentIdxA === -1) return 1;
          if (parentIdxB === -1) return -1;
          return parentIdxA - parentIdxB;
        }
        return b.value - a.value;
      });

    return {
      incomeCategoryData,
      expenseCategoryData,
      incomeDetailData,
      expenseDetailData,
    };
  };

  const computePreviousPeriod = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let prevStartDate, prevEndDate;

    switch (timePeriod) {
      case '全部':
        return { prevIncome: 0, prevExpense: 0 };
      case '日常':
        const prevDay = new Date(now);
        prevDay.setDate(prevDay.getDate() - 1);
        prevStartDate = prevDay;
        prevEndDate = prevDay;
        break;
      case '月统计':
        let prevMonth = currentMonth - 1;
        let prevYear = currentYear;
        if (prevMonth < 0) {
          prevMonth = 11;
          prevYear -= 1;
        }
        prevStartDate = new Date(prevYear, prevMonth, 1);
        prevEndDate = new Date(prevYear, prevMonth + 1, 0);
        break;
      case '年统计':
        prevStartDate = new Date(currentYear - 1, 0, 1);
        prevEndDate = new Date(currentYear - 1, 11, 31);
        break;
      case '自定义':
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        const diffMs = end.getTime() - start.getTime();
        prevStartDate = new Date(start.getTime() - diffMs);
        prevEndDate = new Date(end.getTime() - diffMs);
        break;
      default:
        return { prevIncome: 0, prevExpense: 0 };
    }

    let prevIncome = 0;
    let prevExpense = 0;

    filterByBook(records).forEach(record => {
      const recordDate = parseDateAsLocal(record.date);
      if (recordDate >= prevStartDate && recordDate <= prevEndDate) {
        const rawAmount = Math.abs(record.amount || 0);
        const fromCurrency = record.currency || DEFAULT_BASE_CURRENCY;
        const amount = convertAmount(rawAmount, fromCurrency, selectedCurrencyFilter, DEFAULT_EXCHANGE_RATES);
        if (record.type === 'income') {
          prevIncome += amount;
        } else if (record.type === 'expense') {
          prevExpense += amount;
        }
      }
    });

    return { prevIncome, prevExpense };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  const { income, expense, totalIncome, totalExpense } = computeIncomeExpense();
  const { incomeCategoryData, expenseCategoryData, incomeDetailData, expenseDetailData } = computePieChartData();
  const { prevIncome, prevExpense } = computePreviousPeriod();
  const incomeChange = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome * 100).toFixed(1) : 0;
  const expenseChange = prevExpense > 0 ? ((totalExpense - prevExpense) / prevExpense * 100).toFixed(1) : 0;
  const recordList = applyListFilters(filterByBook(filterByTime(records))).sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalCount = recordList.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedRecords = recordList.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const netIncome = totalIncome - totalExpense;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <section
          className="rounded-2xl p-6 sm:p-7"
          style={{
            background: 'linear-gradient(135deg, #EDE9FE 0%, #F5F3FF 100%)',
          }}
        >
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold font-mono tracking-tight text-gray-900">收支分析</h1>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <select
                    value={selectedBook || ''}
                    onChange={(e) => setSelectedBook(e.target.value || null)}
                    className="appearance-none bg-white dark:bg-slate-700 border border-blue-300 dark:border-blue-600 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-blue-600 dark:text-blue-300 cursor-pointer hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">全部账本</option>
                    {books.map((book) => (
                      <option key={book.id} value={book.name}>
                        {book.name}
                      </option>
                    ))}
                  </select>
                  <BookOpen className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={selectedCurrencyFilter}
                    onChange={(e) => setSelectedCurrencyFilter(e.target.value)}
                    className="appearance-none bg-white dark:bg-slate-700 border border-blue-300 dark:border-blue-600 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-blue-600 dark:text-blue-300 cursor-pointer hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {CURRENCIES.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.name}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none text-xs font-bold">
                    {getCurrencySymbol(selectedCurrencyFilter)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={loadData}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-blue-600 text-blue-600 text-sm font-medium hover:bg-blue-600 hover:text-white transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  刷新数据
                </button>
              </div>
            </div>
          </div>
        </section>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:px-7 shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200/60 dark:border-slate-800">
          <div className="flex items-center justify-center gap-1">
            {['全部', '日常', '月统计', '年统计', '自定义'].map((tab) => (
              <button
                key={tab}
                onClick={() => setTimePeriod(tab)}
                className={`px-4 py-1.5 rounded-full text-sm transition-all ${
                  timePeriod === tab
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          {timePeriod === '日常' && renderCalendar()}
          {timePeriod === '月统计' && renderMonthlyChart()}
          {timePeriod === '年统计' && renderYearlyChart()}
          {timePeriod === '自定义' && renderCustomRange()}
          {timePeriod === '全部' && (
            <div className="py-8 text-center text-gray-400 dark:text-gray-500">
              <div className="text-lg font-medium mb-1">全部数据概览</div>
              <div className="text-sm">查看下方统计卡片了解整体收支情况</div>
            </div>
          )}
        </div>



        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(() => {
            const labels = getStatLabels();
            return (
              <>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">{labels.income}</span>
              <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full p-2">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-green-600 tabular-nums whitespace-nowrap">
              {formatCurrency(totalIncome, selectedCurrencyFilter)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
              <ArrowUpRight className="w-3 h-3" />
              <span>{prevIncome > 0 ? `较上期 ${incomeChange >= 0 ? '+' : ''}${incomeChange}%` : '上期无数据'}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">{labels.expense}</span>
              <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full p-2">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-red-500 tabular-nums whitespace-nowrap">
              {formatCurrency(totalExpense, selectedCurrencyFilter)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-red-500">
              <ArrowDownRight className="w-3 h-3" />
              <span>{prevExpense > 0 ? `较上期 ${expenseChange >= 0 ? '+' : ''}${expenseChange}%` : '上期无数据'}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">{labels.net}</span>
              <div className={`rounded-full p-2 ${
                netIncome >= 0
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              }`}>
                {netIncome >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </div>
            </div>
            <div className={`text-3xl font-bold font-mono tabular-nums whitespace-nowrap ${
              netIncome >= 0 ? 'text-green-600' : 'text-red-500'
            }`}>
              {netIncome >= 0 ? '+' : ''}{formatCurrency(netIncome, selectedCurrencyFilter)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Calendar className="w-3 h-3" />
              <span>收入 - 支出</span>
            </div>
          </div>

          {(() => {
            const monthlyBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
            let budgetLabel = '全部预算';
            let budgetAmount = monthlyBudget;
            let budgetUsed = budgets.reduce((sum, b) => sum + b.used, 0);
            switch (timePeriod) {
              case '日常':
                budgetLabel = '本日预算';
                budgetAmount = monthlyBudget / (new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() || 30);
                break;
              case '月统计':
                budgetLabel = '本月预算';
                budgetAmount = monthlyBudget;
                break;
              case '年统计':
                budgetLabel = '本年预算';
                budgetAmount = monthlyBudget * 12;
                break;
              default:
                budgetLabel = '全部预算';
                budgetAmount = monthlyBudget;
            }
            return (
              <div
                onClick={() => onNavigate && onNavigate('budget')}
                className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200/60 dark:border-slate-800 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{budgetLabel}</span>
                  <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full p-2">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-blue-600 tabular-nums whitespace-nowrap">
                  {formatCurrency(budgetAmount, selectedCurrencyFilter)}
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">
                    已用 {formatCurrency(budgetUsed, selectedCurrencyFilter)}
                  </span>
                  <span className="text-blue-600">
                    剩余 {formatCurrency(Math.max(0, budgetAmount - budgetUsed), selectedCurrencyFilter)}
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (budgetUsed /
                          (budgetAmount || 1)) * 100,
                        100
                      )}%`
                    }}
                  />
                </div>
              </div>
            );
          })()}
              </>
            );
          })()}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold font-mono tracking-tight text-gray-900 dark:text-white">收入占比</h3>
              <div className="flex bg-gray-100 dark:bg-slate-700 rounded-full p-0.5">
                <button
                  onClick={() => setIncomePieView('category')}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    incomePieView === 'category'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  一级分类
                </button>
                <button
                  onClick={() => setIncomePieView('detail')}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    incomePieView === 'detail'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  全部
                </button>
              </div>
            </div>
            <div className="h-[380px]">
              {(() => {
                const data = incomePieView === 'category'
                  ? incomeCategoryData.map(item => ({ name: item.category, value: item.amount, percent: item.percent, color: item.color }))
                  : incomeDetailData;

                if (data.length === 0) {
                  return (
                    <div className="h-full flex items-center justify-center text-sm text-gray-400">
                      暂无收入数据
                    </div>
                  );
                }

                const symbol = getCurrencySymbol(selectedCurrencyFilter);
                const labelFontSize = data.length <= 5 ? 12 : data.length <= 10 ? 11 : data.length <= 15 ? 10 : data.length <= 20 ? 9 : 8;

                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={1}
                        dataKey="value"
                        labelLine={{ length: 10, strokeWidth: 1 }}
                        label={({ name, payload, x, y, textAnchor }) => (
                          <text x={x} y={y} textAnchor={textAnchor} fill="#374151" fontSize={labelFontSize} fontWeight={500}>
                            {name} {payload.percent.toFixed(1)}%
                          </text>
                        )}
                      >
                        {data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${symbol}${value.toLocaleString()}`, '金额']}
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold font-mono tracking-tight text-gray-900 dark:text-white">支出占比</h3>
              <div className="flex bg-gray-100 dark:bg-slate-700 rounded-full p-0.5">
                <button
                  onClick={() => setExpensePieView('category')}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    expensePieView === 'category'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  一级分类
                </button>
                <button
                  onClick={() => setExpensePieView('detail')}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    expensePieView === 'detail'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  全部
                </button>
              </div>
            </div>
            <div className="h-[380px]">
              {(() => {
                const data = expensePieView === 'category'
                  ? expenseCategoryData.map(item => ({ name: item.category, value: item.amount, percent: item.percent, color: item.color }))
                  : expenseDetailData;

                if (data.length === 0) {
                  return (
                    <div className="h-full flex items-center justify-center text-sm text-gray-400">
                      暂无支出数据
                    </div>
                  );
                }

                const symbol = getCurrencySymbol(selectedCurrencyFilter);
                const labelFontSize = data.length <= 5 ? 12 : data.length <= 10 ? 11 : data.length <= 15 ? 10 : data.length <= 20 ? 9 : 8;

                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={1}
                        dataKey="value"
                        labelLine={{ length: 10, strokeWidth: 1 }}
                        label={({ name, payload, x, y, textAnchor }) => (
                          <text x={x} y={y} textAnchor={textAnchor} fill="#374151" fontSize={labelFontSize} fontWeight={500}>
                            {name} {payload.percent.toFixed(1)}%
                          </text>
                        )}
                      >
                        {data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${symbol}${value.toLocaleString()}`, '金额']}
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200/60 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold font-mono tracking-tight text-gray-900 dark:text-white">收支记录</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setNewRecord({ date: formatDate(new Date()), type: 'expense', category: '', subCategory: '', amount: '', book: selectedBook || '', account: '', note: '', tag: '', currency: baseCurrency }); setShowAddModal(true); }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                新增
              </button>
              <button
                onClick={() => {
                  if (isBatchEditMode) {
                    setIsBatchEditMode(false);
                    setSelectedRecordIds(new Set());
                  } else {
                    setIsBatchEditMode(true);
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isBatchEditMode
                    ? 'border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isBatchEditMode ? '取消' : '编辑'}
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                导入
              </button>
              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                下载模板
              </button>
              <button
                onClick={() => {
                  setListFilters({
                    date: '',
                    book: '',
                    type: 'all',
                    category: '',
                    subCategory: '',
                    amountMin: '',
                    amountMax: '',
                    cnyMin: '',
                    cnyMax: '',
                    tag: '',
                    note: '',
                    currency: '',
                  });
                  setCurrentPage(1);
                }}
                className="shrink-0 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                重置筛选
              </button>
              <button
                onClick={() => setShowColumnSettingsModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                高级列表设置
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="flex border-b border-gray-200 dark:border-slate-700">
              {visibleColumns.date && (
                <div className="py-2 px-3" style={{ width: '150px', flexShrink: 0 }}>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">日期：</label>
                  <select
                    value={listFilters.date}
                    onChange={(e) => handleFilterChange('date', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-slate-700 rounded dark:bg-slate-700 dark:text-white"
                  >
                    <option value="">全部</option>
                    <option value="today">今日</option>
                    <option value="yesterday">昨日</option>
                    <option value="week">本周</option>
                    <option value="month">本月</option>
                    <option value="lastMonth">上月</option>
                  </select>
                </div>
              )}
              {visibleColumns.type && (
                <div className="py-2 px-3" style={{ width: '120px', flexShrink: 0 }}>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">收支类型：</label>
                  <select
                    value={listFilters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-slate-700 rounded dark:bg-slate-700 dark:text-white"
                  >
                    <option value="all">全部</option>
                    <option value="income">收入</option>
                    <option value="expense">支出</option>
                  </select>
                </div>
              )}
              {visibleColumns.category && (
                <div className="py-2 px-3" style={{ width: '140px', flexShrink: 0 }}>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">类别：</label>
                  <select
                    value={listFilters.category}
                    onChange={(e) => { handleFilterChange('category', e.target.value); handleFilterChange('subCategory', ''); }}
                    className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-slate-700 rounded dark:bg-slate-700 dark:text-white"
                  >
                    <option value="">全部</option>
                    {[...new Set([...Object.keys(categories.income || {}), ...Object.keys(categories.expense || {})])].map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}
              {visibleColumns.subCategory && (
                <div className="py-2 px-3" style={{ width: '140px', flexShrink: 0 }}>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">二级分类：</label>
                  <select
                    value={listFilters.subCategory}
                    onChange={(e) => handleFilterChange('subCategory', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-slate-700 rounded dark:bg-slate-700 dark:text-white"
                    disabled={!listFilters.category}
                  >
                    <option value="">全部</option>
                    {listFilters.category ? (
                      getSubCategories(listFilters.category, listFilters.type === 'all' ? 'expense' : listFilters.type).map((subCat) => (
                        <option key={subCat} value={subCat}>{subCat}</option>
                      ))
                    ) : (
                      [...new Set([...Object.values(categories.income || {}), ...Object.values(categories.expense || {})].flat())].map((subCat) => (
                        <option key={subCat} value={subCat}>{subCat}</option>
                      ))
                    )}
                  </select>
                </div>
              )}
              {visibleColumns.book && (
                <div className="py-2 px-3" style={{ width: '140px', flexShrink: 0 }}>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">所属账本：</label>
                  <select
                    value={listFilters.book}
                    onChange={(e) => handleFilterChange('book', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-slate-700 rounded dark:bg-slate-700 dark:text-white"
                  >
                    <option value="">全部</option>
                    {books.map((book) => (
                      <option key={book.id} value={book.name}>{book.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {visibleColumns.currency && (
                <div className="py-2 px-3" style={{ width: '140px', flexShrink: 0 }}>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">收支账户：</label>
                  <select
                    value={listFilters.currency}
                    onChange={(e) => handleFilterChange('currency', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-slate-700 rounded dark:bg-slate-700 dark:text-white"
                  >
                    <option value="">全部</option>
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {isBatchEditMode && (
              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  已选择 <span className="font-semibold text-blue-600 dark:text-blue-400">{selectedRecordIds.size}</span> 条记录
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">批量修改：</span>
                  {['date', 'type', 'amount', 'category', 'sub', 'book', 'tag', 'note'].map(field => {
                    const fieldNames = { date: '日期', type: '收支类型', amount: '金额', category: '类别', sub: '二级分类', book: '账本', tag: '标签', note: '备注' };
                    return (
                      <button
                        key={field}
                        onClick={() => { setShowBatchEditField(field); setBatchEditValue(''); }}
                        disabled={selectedRecordIds.size === 0}
                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                      >
                        {fieldNames[field]}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setShowBatchDeleteConfirm(true)}
                    disabled={selectedRecordIds.size === 0}
                    className="px-3 py-1.5 text-xs rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap w-12">序号</th>
                  {isBatchEditMode && (
                    <th className="text-center py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap w-10">
                      <input
                        type="checkbox"
                        checked={paginatedRecords.length > 0 && paginatedRecords.every(r => selectedRecordIds.has(r.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const newSet = new Set(selectedRecordIds);
                            paginatedRecords.forEach(r => newSet.add(r.id));
                            setSelectedRecordIds(newSet);
                          } else {
                            const newSet = new Set(selectedRecordIds);
                            paginatedRecords.forEach(r => newSet.delete(r.id));
                            setSelectedRecordIds(newSet);
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                      />
                    </th>
                  )}
                  {visibleColumns.date && <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">日期</th>}
                  {visibleColumns.type && <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">收支类型</th>}
                  {visibleColumns.amount && <th className="text-right py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">金额</th>}
                  {visibleColumns.category && <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">类别</th>}
                  {visibleColumns.subCategory && <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">二级分类</th>}
                  {visibleColumns.book && <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">所属账本</th>}
                  {visibleColumns.currency && <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">收支账户</th>}
                  {visibleColumns.note && <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">备注</th>}
                  {visibleColumns.tag && <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">标签</th>}
                  <th className="text-center py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((record, index) => (
                  <tr key={record.id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-150">
                    <td className="py-2.5 px-3 text-gray-500 text-sm">
                      {(currentPage - 1) * pageSize + index + 1}
                    </td>
                    {isBatchEditMode && (
                      <td className="text-center py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={selectedRecordIds.has(record.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedRecordIds);
                            if (e.target.checked) {
                              newSet.add(record.id);
                            } else {
                              newSet.delete(record.id);
                            }
                            setSelectedRecordIds(newSet);
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                        />
                      </td>
                    )}
                    {visibleColumns.date && (
                      <td className="py-2.5 px-3 text-gray-900 dark:text-white">
                        {formatDate(record.date)}
                      </td>
                    )}
                    {visibleColumns.type && (
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          record.type === 'income'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                        }`}>
                          {record.type === 'income' ? '收入' : '支出'}
                        </span>
                      </td>
                    )}
                    {visibleColumns.amount && (
                      <td className={`text-right font-medium font-mono tabular-nums ${
                        record.type === 'income' ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {record.type === 'income' ? '+' : '-'}{formatCurrency(convertAmount(Math.abs(record.amount || 0), record.currency || DEFAULT_BASE_CURRENCY, selectedCurrencyFilter, DEFAULT_EXCHANGE_RATES), selectedCurrencyFilter)}
                      </td>
                    )}
                    {visibleColumns.category && (
                      <td className="py-2.5 px-3 text-gray-900 dark:text-white">
                        {record.category || '其他'}
                      </td>
                    )}
                    {visibleColumns.subCategory && (
                      <td className="py-2.5 px-3 text-gray-900 dark:text-white">
                        {record.sub || '-'}
                      </td>
                    )}
                    {visibleColumns.book && (
                      <td className="py-2.5 px-3 text-gray-900 dark:text-white">
                        {books.find(b => b.id === record.bookId)?.name || (record.book || '-')}
                      </td>
                    )}
                    {visibleColumns.currency && (
                      <td className="py-2.5 px-3 text-gray-900 dark:text-white">
                        {CURRENCIES.find(c => c.code === (record.currency || DEFAULT_BASE_CURRENCY))?.name || (record.currency || '-')}
                      </td>
                    )}
                    {visibleColumns.note && (
                      <td className="py-2.5 px-3 text-gray-900 dark:text-white">
                        {record.note || '-'}
                      </td>
                    )}
                    {visibleColumns.tag && (
                      <td className="py-2.5 px-3 text-gray-900 dark:text-white">
                        {Array.isArray(record.tag) ? record.tag.join(', ') : (record.tag || '-')}
                      </td>
                    )}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditRecord(record)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setRecordToDelete(record); setShowDeleteConfirm(true); }}
                          className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recordList.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p>暂无收支记录</p>
              </div>
            )}
          </div>
          {recordList.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                共 {totalCount} 条记录
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="px-2 py-1.5 text-sm border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white cursor-pointer"
                >
                  {[10, 20, 50, 100].map(size => (
                    <option key={size} value={size}>{size} 条/页</option>
                  ))}
                </select>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  上一页
                </button>
                <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                  <span>第</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setCurrentPage(Math.max(1, Math.min(totalPages, val)));
                      }
                    }}
                    className="w-14 px-2 py-1.5 text-center text-sm border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white"
                  />
                  <span>/ {totalPages} 页</span>
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </section>

        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">新增收支记录</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-lg p-4 text-center hover:border-blue-600 transition-colors">
                  {uploadedImage ? (
                    <div className="relative">
                      <img src={uploadedImage} alt="预览" className="max-h-32 mx-auto rounded-lg object-contain" />
                      <button onClick={() => { setUploadedImage(null); setOcrResult(null); }} className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="flex flex-col items-center gap-2 py-4">
                        <Upload className="w-8 h-8 text-gray-400" />
                        <span className="text-sm text-gray-500">点击上传图片</span>
                        <span className="text-xs text-gray-400">支持 JPG, PNG 格式</span>
                      </div>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  )}
                  {uploadedImage && (
                    <button onClick={handleOCR} className="mt-3 inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <Image className="w-4 h-4" />
                      识别
                    </button>
                  )}
                  {ocrResult && (
                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg text-sm text-green-700 dark:text-green-400">
                      识别结果：
                      {ocrResult.amount && <span className="ml-2">金额: {ocrResult.amount}</span>}
                      {ocrResult.date && <span className="ml-2">日期: {ocrResult.date}</span>}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">日期</label>
                  <input type="date" value={newRecord.date} onChange={e => setNewRecord({ ...newRecord, date: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">收支类型</label>
                  <div className="flex gap-2">
                    <button onClick={() => setNewRecord({ ...newRecord, type: 'expense', category: '', subCategory: '' })} className={`flex-1 py-2 rounded-lg font-medium ${newRecord.type === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-slate-700'}`}>支出</button>
                    <button onClick={() => setNewRecord({ ...newRecord, type: 'income', category: '', subCategory: '' })} className={`flex-1 py-2 rounded-lg font-medium ${newRecord.type === 'income' ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-slate-700'}`}>收入</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">金额</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">{getCurrencySymbol(newRecord.currency || baseCurrency)}</span>
                    <input type="number" value={newRecord.amount} onChange={e => setNewRecord({ ...newRecord, amount: e.target.value })} placeholder="0.00" className="w-full pl-8 pr-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">类别</label>
                  <div className="flex gap-2">
                    <select
                      value={newRecord.category}
                      onChange={e => setNewRecord({ ...newRecord, category: e.target.value, subCategory: '' })}
                      className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white"
                    >
                      <option value="">请选择类别</option>
                      {Object.keys(categories[newRecord.type] || {}).map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <button onClick={() => setShowCategoryModal(true)} className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><Settings className="w-4 h-4" /></button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">二级分类</label>
                  <div className="flex gap-2">
                    <select
                      value={newRecord.subCategory}
                      onChange={e => setNewRecord({ ...newRecord, subCategory: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white"
                      disabled={!newRecord.category}
                    >
                      <option value="">请选择二级分类</option>
                      {getSubCategories(newRecord.category).map((subCat) => (
                        <option key={subCat} value={subCat}>{subCat}</option>
                      ))}
                    </select>
                    {newRecord.category && (
                      <button onClick={() => setShowSubCategoryModal(true)} className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><Settings className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">所属账本</label>
                  <div className="flex gap-2">
                    <select
                      value={newRecord.book}
                      onChange={e => setNewRecord({ ...newRecord, book: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white"
                    >
                      <option value="">请选择账本</option>
                      {books.map((book) => (
                        <option key={book.id || book.name} value={book.name}>{book.name}</option>
                      ))}
                    </select>
                    <button onClick={() => setShowBookModal(true)} className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><Settings className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">收支账户</label>
                    <select
                      value={newRecord.account || ''}
                      onChange={e => setNewRecord({ ...newRecord, account: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white"
                    >
                      <option value="">请选择账户</option>
                      {(stateData?.accounts || []).map((acc) => (
                        <option key={acc.id} value={acc.name}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">货币</label>
                    <select
                      value={newRecord.currency || baseCurrency}
                      onChange={e => setNewRecord({ ...newRecord, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.name} ({c.symbol})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">备注</label>
                  <input type="text" value={newRecord.note} onChange={e => setNewRecord({ ...newRecord, note: e.target.value })} placeholder="可选" className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">标签</label>
                  <div className="flex gap-2">
                    <select
                      value={newRecord.tag}
                      onChange={(e) => setNewRecord({ ...newRecord, tag: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white"
                    >
                      <option value="">请选择标签</option>
                      {tags.map((tag) => (
                        <option key={tag.id || tag.name} value={tag.name}>{tag.name}</option>
                      ))}
                    </select>
                    <button onClick={() => setShowTagModal(true)} className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><Settings className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">取消</button>
                  <button onClick={handleAddRecord} disabled={saving || !newRecord.date || !newRecord.amount || !newRecord.category} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showCategoryModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">分类管理 - {newRecord.type === 'income' ? '收入' : '支出'}</h3>
                <button onClick={() => setShowCategoryModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCategory()} placeholder="输入分类名称" className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white" />
                  <button onClick={handleAddCategory} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {Object.keys(categories[newRecord.type] || {}).map((cat) => (
                    <div key={cat} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      {categoryToEdit === cat ? (
                        <>
                          <input type="text" value={newCategoryName || cat} onChange={e => setNewCategoryName(e.target.value)} className="flex-1 px-2 py-1 border border-gray-200 dark:border-slate-700 rounded dark:bg-slate-600 dark:text-white" autoFocus />
                          <button onClick={handleSaveCategoryEdit} className="p-1 text-green-600 hover:bg-green-100 rounded"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => { setCategoryToEdit(null); setNewCategoryName(''); }} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-gray-700 dark:text-gray-300">{cat}</span>
                          <button onClick={() => { setCategoryToEdit(cat); setNewCategoryName(cat); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                          {deleteConfirm === `category-${cat}` ? (
                            <button onClick={() => handleDeleteCategory(cat)} className="p-1 text-red-600 hover:bg-red-100 rounded">确认</button>
                          ) : (
                            <button onClick={() => setDeleteConfirm(`category-${cat}`)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {showSubCategoryModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">二级分类管理 - {newRecord.category}</h3>
                <button onClick={() => setShowSubCategoryModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={newSubCategoryName} onChange={e => setNewSubCategoryName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSubCategory()} placeholder="输入二级分类名称" className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white" />
                  <button onClick={handleAddSubCategory} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {getSubCategories(newRecord.category).map((subCat) => (
                    <div key={subCat} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      {subCategoryToEdit === subCat ? (
                        <>
                          <input type="text" value={newSubCategoryName || subCat} onChange={e => setNewSubCategoryName(e.target.value)} className="flex-1 px-2 py-1 border border-gray-200 dark:border-slate-700 rounded dark:bg-slate-600 dark:text-white" autoFocus />
                          <button onClick={handleSaveSubCategoryEdit} className="p-1 text-green-600 hover:bg-green-100 rounded"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => { setSubCategoryToEdit(null); setNewSubCategoryName(''); }} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-gray-700 dark:text-gray-300">{subCat}</span>
                          <button onClick={() => { setSubCategoryToEdit(subCat); setNewSubCategoryName(subCat); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                          {deleteConfirm === `subcategory-${subCat}` ? (
                            <button onClick={() => handleDeleteSubCategory(subCat)} className="p-1 text-red-600 hover:bg-red-100 rounded">确认</button>
                          ) : (
                            <button onClick={() => setDeleteConfirm(`subcategory-${subCat}`)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {showColumnSettingsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">列表设置</h3>
                <button onClick={() => setShowColumnSettingsModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                {[
                  { key: 'date', label: '日期' },
                  { key: 'type', label: '收支类型' },
                  { key: 'amount', label: '金额' },
                  { key: 'category', label: '类别' },
                  { key: 'subCategory', label: '二级分类' },
                  { key: 'book', label: '所属账本' },
                  { key: 'currency', label: '收支账户' },
                  { key: 'note', label: '备注' },
                  { key: 'tag', label: '标签' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns[key]}
                      onChange={(e) => setVisibleColumns(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">高级筛选</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">金额范围</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="最小"
                        value={listFilters.amountMin}
                        onChange={(e) => handleFilterChange('amountMin', e.target.value)}
                        className="flex-1 px-2 py-1 text-xs border border-gray-200 dark:border-slate-700 rounded dark:bg-slate-700 dark:text-white"
                      />
                      <input
                        type="number"
                        placeholder="最大"
                        value={listFilters.amountMax}
                        onChange={(e) => handleFilterChange('amountMax', e.target.value)}
                        className="flex-1 px-2 py-1 text-xs border border-gray-200 dark:border-slate-700 rounded dark:bg-slate-700 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">标签</label>
                    <select
                      value={listFilters.tag}
                      onChange={(e) => handleFilterChange('tag', e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-slate-700 rounded dark:bg-slate-700 dark:text-white"
                    >
                      <option value="">全部</option>
                      {tags.map((tag) => (
                        <option key={tag.id || tag.name} value={tag.name}>{tag.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">备注</label>
                    <input
                      type="text"
                      placeholder="筛选备注"
                      value={listFilters.note}
                      onChange={(e) => handleFilterChange('note', e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-slate-700 rounded dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowColumnSettingsModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}

        {showTagModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">标签管理</h3>
                <button onClick={() => setShowTagModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTag()} placeholder="输入标签名称" className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white" />
                  <button onClick={handleAddTag} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {tags.map((tag) => (
                    <div key={tag.id || tag.name} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <span className="flex-1 text-gray-700 dark:text-gray-300">{tag.name}</span>
                      <button onClick={() => { setNewRecord({ ...newRecord, tag: tag.name }); setShowTagModal(false); }} className="p-1 text-gray-500 hover:bg-gray-200 rounded">选择</button>
                      <button onClick={() => handleDeleteTag(tag)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                  {tags.length === 0 && (
                    <div className="text-center text-sm text-gray-400 py-4">暂无标签</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showBookModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">账本管理</h3>
                <button onClick={() => setShowBookModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={newBookName} onChange={(e) => setNewBookName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddBook()} placeholder="输入账本名称" className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white" />
                  <button onClick={handleAddBook} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {books.map((book) => (
                    <div key={book.id || book.name} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <span className="flex-1 text-gray-700 dark:text-gray-300">{book.name}</span>
                      <button onClick={() => { setNewRecord({ ...newRecord, book: book.name }); setShowBookModal(false); }} className="p-1 text-gray-500 hover:bg-gray-200 rounded">选择</button>
                      <button onClick={() => handleDeleteBook(book)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                  {books.length === 0 && (
                    <div className="text-center text-sm text-gray-400 py-4">暂无账本</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showImportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">导入收支记录</h3>
                <button onClick={() => { setShowImportModal(false); setImportPreview([]); setImportStep('upload'); }} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                {importStep === 'upload' && (
                  <>
                    <div className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-lg p-4 text-center hover:border-green-500 transition-colors">
                      <label className="cursor-pointer">
                        <div className="flex flex-col items-center gap-2 py-4">
                          <Upload className="w-8 h-8 text-gray-400" />
                          <span className="text-sm text-gray-500">点击上传Excel文件</span>
                          <span className="text-xs text-gray-400">支持 .xlsx, .xls 格式</span>
                        </div>
                        <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
                      </label>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-sm text-blue-700 dark:text-blue-400">
                      <p className="font-medium mb-1">导入说明：</p>
                      <ul className="text-xs space-y-1">
                        <li>• 请先下载模板，按照模板格式填写数据</li>
                        <li>• 日期格式：YYYY-MM-DD（如：2026-06-30）</li>
                        <li>• 收支类型：收入或支出</li>
                        <li>• 金额：数字格式</li>
                        <li>• 类别和二级分类：需与系统中已有的分类一致</li>
                        <li>• 所属账本：需与系统中已有的账本一致</li>
                        <li>• 收支账户：如：人民币、美元等</li>
                      </ul>
                    </div>
                  </>
                )}
                {importStep === 'loading' && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">正在解析文件...</div>
                    <div className="w-full max-w-xs">
                      <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                    </div>
                  </div>
                )}
                {importStep === 'mapping' && (
                  <>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-sm text-blue-700 dark:text-blue-400">
                      <p className="font-medium mb-2">字段映射：请将Excel字段与系统字段对应</p>
                      <div className="grid grid-cols-2 gap-3">
                        {['日期', '收支类型', '金额', '类别', '二级分类', '所属账本', '收支账户', '备注', '标签'].map(field => (
                          <div key={field} className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 dark:text-gray-400 w-16">{field}:</span>
                            <select
                              value={fieldMapping[field] || ''}
                              onChange={(e) => setFieldMapping(prev => ({ ...prev, [field]: e.target.value }))}
                              className="flex-1 px-2 py-1 text-xs border border-gray-200 dark:border-slate-700 rounded dark:bg-slate-700 dark:text-white"
                            >
                              <option value="">请选择</option>
                              {excelHeaders.map(header => (
                                <option key={header} value={header}>{header}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {importStep === 'preview' && (
                  <>
                    {importError && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-sm text-red-700 dark:text-red-400">
                        {importError}
                      </div>
                    )}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-slate-700">
                            <th className="text-left py-2 px-2 text-gray-500 font-medium">行号</th>
                            <th className="text-left py-2 px-2 text-gray-500 font-medium">日期</th>
                            <th className="text-left py-2 px-2 text-gray-500 font-medium">收支类型</th>
                            <th className="text-right py-2 px-2 text-gray-500 font-medium">金额</th>
                            <th className="text-left py-2 px-2 text-gray-500 font-medium">类别</th>
                            <th className="text-left py-2 px-2 text-gray-500 font-medium">二级分类</th>
                            <th className="text-left py-2 px-2 text-gray-500 font-medium">所属账本</th>
                            <th className="text-left py-2 px-2 text-gray-500 font-medium">收支账户</th>
                            <th className="text-left py-2 px-2 text-gray-500 font-medium">状态</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.map((row, idx) => (
                            <tr key={idx} className={`border-b border-gray-100 dark:border-slate-700/50 ${row.isValid ? '' : 'bg-red-50 dark:bg-red-900/20'}`}>
                              <td className="py-2 px-2 text-gray-500">{row.rowNum}</td>
                              <td className="py-2 px-2 text-gray-900 dark:text-white">{row['日期'] || '-'}</td>
                              <td className="py-2 px-2 text-gray-900 dark:text-white">{row['收支类型'] || '-'}</td>
                              <td className="py-2 px-2 text-right text-gray-900 dark:text-white">{row['金额'] || '-'}</td>
                              <td className="py-2 px-2 text-gray-900 dark:text-white">{row['类别'] || '-'}</td>
                              <td className="py-2 px-2 text-gray-900 dark:text-white">{row['二级分类'] || '-'}</td>
                              <td className="py-2 px-2 text-gray-900 dark:text-white">{row['所属账本'] || '-'}</td>
                              <td className="py-2 px-2 text-gray-900 dark:text-white">{row['收支账户'] || '-'}</td>
                              <td className="py-2 px-2">
                                {row.isValid ? (
                                  <span className="text-green-600 dark:text-green-400">✓ 有效</span>
                                ) : (
                                  <span className="text-red-600 dark:text-red-400">{row.errors.join(', ')}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      共 {importPreview.length} 条记录，其中 {importPreview.filter(r => r.isValid).length} 条有效，{importPreview.filter(r => !r.isValid).length} 条无效
                    </div>
                  </>
                )}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setShowImportModal(false); setImportPreview([]); setImportStep('upload'); }} className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">取消</button>
                  {importStep === 'mapping' && (
                    <button onClick={() => {
                      const formatDateValue = (val) => {
                        if (val === null || val === undefined || val === '') return '';
                        if (typeof val === 'number') {
                          const d = XLSX.SSF.parse_date_code(val);
                          if (d) {
                            const yyyy = d.y;
                            const mm = String(d.m).padStart(2, '0');
                            const dd = String(d.d).padStart(2, '0');
                            return `${yyyy}-${mm}-${dd}`;
                          }
                        }
                        if (val instanceof Date) {
                          const yyyy = val.getFullYear();
                          const mm = String(val.getMonth() + 1).padStart(2, '0');
                          const dd = String(val.getDate()).padStart(2, '0');
                          return `${yyyy}-${mm}-${dd}`;
                        }
                        return String(val);
                      };
                      const todayStr = (() => {
                        const now = new Date();
                        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                      })();
                      const mappedData = importPreview.map((row, idx) => {
                        const errors = [];
                        let dateVal = formatDateValue(row[fieldMapping['日期']]);
                        let typeVal = String(row[fieldMapping['收支类型']] || '').trim();
                        const amountVal = parseFloat(row[fieldMapping['金额']]);
                        let categoryVal = String(row[fieldMapping['类别']] || '').trim();

                        // 自动补全缺失字段
                        if (!dateVal) dateVal = todayStr;
                        if (!typeVal) typeVal = !isNaN(amountVal) && amountVal >= 0 ? '收入' : '支出';
                        if (!categoryVal) categoryVal = typeVal === '收入' ? '其他收入' : '其他支出';

                        // 只有金额无效才是硬性错误
                        if (isNaN(amountVal)) errors.push('金额无效');

                        return {
                          '日期': dateVal,
                          '收支类型': typeVal,
                          '金额': isNaN(amountVal) ? row[fieldMapping['金额']] : amountVal,
                          '类别': categoryVal,
                          '二级分类': String(row[fieldMapping['二级分类']] || '').trim() || '其他',
                          '所属账本': String(row[fieldMapping['所属账本']] || '').trim(),
                          '收支账户': String(row[fieldMapping['收支账户']] || '').trim() || '人民币',
                          '备注': String(row[fieldMapping['备注']] || '').trim(),
                          '标签': String(row[fieldMapping['标签']] || '').trim(),
                          rowNum: idx + 2,
                          errors,
                          isValid: errors.length === 0,
                        };
                      });
                      setImportPreview(mappedData);
                      setImportStep('preview');
                    }} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">下一步</button>
                  )}
                  {importStep === 'preview' && (
                    <button onClick={handleImport} disabled={saving || importPreview.filter(r => r.isValid).length === 0} className="flex-1 py-2.5 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50">{saving ? '导入中...' : '确认导入'}</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {importSuccess && (
          <div className="fixed top-4 right-4 z-50 p-4 bg-green-500 text-white rounded-lg shadow-lg animate-pulse">
            {importSuccess}
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">确认删除</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                确定要删除这条记录吗？此操作不可撤销。
              </p>
              <div className="flex gap-3">
                <button onClick={() => { setShowDeleteConfirm(false); setRecordToDelete(null); }} className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">取消</button>
                <button onClick={handleDeleteRecord} className="flex-1 py-2.5 rounded-lg bg-red-500 text-white hover:bg-red-600">删除</button>
              </div>
            </div>
          </div>
        )}

        {showEditModal && editingRecord && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">编辑收支记录</h3>
                <button onClick={() => { setShowEditModal(false); setEditingRecord(null); }} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">日期</label>
                  <input type="date" value={editingRecord.date || ''} onChange={(e) => setEditingRecord({ ...editingRecord, date: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">收支类型</label>
                  <select value={editingRecord.type || 'expense'} onChange={(e) => setEditingRecord({ ...editingRecord, type: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white text-sm">
                    <option value="expense">支出</option>
                    <option value="income">收入</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">金额</label>
                  <input type="number" value={Math.abs(editingRecord.amount || 0)} onChange={(e) => setEditingRecord({ ...editingRecord, amount: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">类别</label>
                  <select value={editingRecord.category || ''} onChange={(e) => setEditingRecord({ ...editingRecord, category: e.target.value, sub: '' })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white text-sm">
                    <option value="">请选择</option>
                    {Object.keys(categories[editingRecord.type] || {}).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">二级分类</label>
                  <select value={editingRecord.sub || ''} onChange={(e) => setEditingRecord({ ...editingRecord, sub: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white text-sm">
                    <option value="">请选择</option>
                    {(categories[editingRecord.type]?.[editingRecord.category] || []).map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">所属账本</label>
                  <select value={editingRecord.book || ''} onChange={(e) => setEditingRecord({ ...editingRecord, book: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white text-sm">
                    <option value="">请选择</option>
                    {books.map(book => (
                      <option key={book.id} value={book.name}>{book.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">标签</label>
                  <select value={editingRecord.tag || ''} onChange={(e) => setEditingRecord({ ...editingRecord, tag: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white text-sm">
                    <option value="">请选择</option>
                    {tags.map(tag => (
                      <option key={tag.id} value={tag.name}>{tag.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">备注</label>
                  <input type="text" value={editingRecord.note || ''} onChange={(e) => setEditingRecord({ ...editingRecord, note: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => { setShowEditModal(false); setEditingRecord(null); }} className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">取消</button>
                <button onClick={handleSaveEdit} disabled={saving || !editingRecord.date || !editingRecord.amount || !editingRecord.category} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
              </div>
            </div>
          </div>
        )}

        {showBatchEditField && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                批量修改{({ date: '日期', type: '收支类型', amount: '金额', category: '类别', sub: '二级分类', book: '账本', tag: '标签', note: '备注' })[showBatchEditField]}
              </h3>
              <div className="mb-6">
                {showBatchEditField === 'date' && (
                  <input type="date" value={batchEditValue} onChange={(e) => setBatchEditValue(e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white text-sm" />
                )}
                {showBatchEditField === 'category' && (
                  <select value={batchEditValue} onChange={(e) => setBatchEditValue(e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white text-sm">
                    <option value="">请选择类别</option>
                    {Object.keys(categories['expense'] || {}).concat(Object.keys(categories['income'] || {})).filter((v, i, a) => a.indexOf(v) === i).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}
                {showBatchEditField === 'sub' && (
                  <input type="text" value={batchEditValue} onChange={(e) => setBatchEditValue(e.target.value)} placeholder="请输入二级分类" className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white text-sm" />
                )}
                {showBatchEditField === 'book' && (
                  <select value={batchEditValue} onChange={(e) => setBatchEditValue(e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white text-sm">
                    <option value="">请选择账本</option>
                    {books.map(book => (
                      <option key={book.id} value={book.name}>{book.name}</option>
                    ))}
                  </select>
                )}
                {showBatchEditField === 'tag' && (
                  <select value={batchEditValue} onChange={(e) => setBatchEditValue(e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white text-sm">
                    <option value="">请选择标签</option>
                    {tags.map(tag => (
                      <option key={tag.id} value={tag.name}>{tag.name}</option>
                    ))}
                  </select>
                )}
                {showBatchEditField === 'type' && (
                  <select value={batchEditValue} onChange={(e) => setBatchEditValue(e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white text-sm">
                    <option value="">请选择类型</option>
                    <option value="income">收入</option>
                    <option value="expense">支出</option>
                  </select>
                )}
                {showBatchEditField === 'amount' && (
                  <input type="number" value={batchEditValue} onChange={(e) => setBatchEditValue(e.target.value)} placeholder="请输入金额" className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white text-sm" />
                )}
                {showBatchEditField === 'note' && (
                  <input type="text" value={batchEditValue} onChange={(e) => setBatchEditValue(e.target.value)} placeholder="请输入备注" className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-700 dark:text-white text-sm" />
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowBatchEditField(null); setBatchEditValue(''); }} className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">取消</button>
                <button onClick={() => handleBatchEdit(showBatchEditField, batchEditValue)} disabled={!batchEditValue} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">确认</button>
              </div>
            </div>
          </div>
        )}

        {showBatchDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">确认批量删除</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                确定要删除选中的 <span className="font-semibold text-red-500">{selectedRecordIds.size}</span> 条记录吗？此操作不可恢复。
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowBatchDeleteConfirm(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">取消</button>
                <button onClick={handleBatchDelete} className="flex-1 py-2.5 rounded-lg bg-red-500 text-white hover:bg-red-600">删除</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { fetchState, createAccount, fetchBooks, saveBooks } from '../api';
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
  Search,
  Settings,
  Edit2,
  Trash2,
} from 'lucide-react';

// ── 工具函数 ──
function formatCurrency(value) {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercentage(value) {
  if (value === null || value === undefined) return '—';
  return `${value >= 0 ? '+' : ''}${parseFloat(value).toFixed(2)}%`;
}

function formatNum(value) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
  avgBuyPrice: '买入均价',
  holdingPnl: '持仓盈亏',
  holdingPnlRate: '盈亏率',
  dailyPnl: '当日参考盈亏',
  currentValue: '当前价值',
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
          {isPos ? '+' : ''}{formatPercentage(totalPnlRate)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">总市值</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{formatNum(totalValue)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">总成本</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{formatNum(totalCost)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">总盈亏</p>
          <p className={`text-sm font-bold tabular-nums ${isPos ? 'text-green-600' : 'text-red-500'}`}>
            {pnlSign(totalPnl)}{formatNum(totalPnl)}
          </p>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-700 grid grid-cols-2 gap-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">当日收益</span>
          <span className={`${isDayPos ? POS_CLASS : NEG_CLASS} tabular-nums`}>{pnlSign(totalDailyPnl)}{formatNum(totalDailyPnl)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">当日收益率</span>
          <span className={`${isDayPos ? POS_CLASS : NEG_CLASS}`}>{formatPercentage(totalDailyPnlRate)}</span>
        </div>
      </div>
    </div>
  );
}

// ── 分页子组件 ──
function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 transition"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-xs text-gray-500 tabular-nums">{page} / {totalPages}</span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 transition"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── 分类表格子组件（含筛选+分页）──
function CategoryTable({
  categoryName,
  holdings,
  colorIdx,
  defaultPageSize = 8,
}) {
  const [filterText, setFilterText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(defaultPageSize);

  // 筛选逻辑：支持按名称、代码、分类搜索
  const filtered = useMemo(() => {
    if (!filterText.trim()) return holdings;
    const q = filterText.toLowerCase();
    return holdings.filter(h =>
      (h.name || '').toLowerCase().includes(q) ||
      (h.code || '').toLowerCase().includes(q) ||
      (h.assetType || '').toLowerCase().includes(q) ||
      (h.positionGroup || '').toLowerCase().includes(q)
    );
  }, [holdings, filterText]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const categoryColor = ['#8B5CF6', '#10B981', '#F59E0B', '#06B6D4', '#EC4899', '#F97316'][colorIdx % 6];

  // 分类汇总行
  const summary = useMemo(() => ({
    value: filtered.reduce((s, h) => s + (parseFloat(h.currentValue) || parseFloat(h.balance) || 0), 0),
    cost: filtered.reduce((s, h) => s + (parseFloat(h.cost) || 0), 0),
    pnl: filtered.reduce((s, h) => s + (parseFloat(h.holdingPnl) || 0), 0),
    dailyPnl: filtered.reduce((s, h) => s + (parseFloat(h.dailyPnl) || 0), 0),
  }), [filtered]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-gray-100 dark:border-slate-700 overflow-hidden">
      {/* 表头 */}
      <div className="p-4 pb-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: categoryColor }} />
          <h3 className="font-semibold text-gray-900 dark:text-white text-base">{categoryName || '未分类'}</h3>
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full tabular-nums">
            {filtered.length} 项
          </span>
        </div>

        {/* 筛选 */}
        <div className="relative w-52 shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={filterText}
            onChange={e => { setFilterText(e.target.value); setPage(1); }}
            placeholder="搜索名称/代码/类型..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto px-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-700 text-gray-500">
              <th className="py-2 px-1.5 text-left font-medium whitespace-nowrap">市场</th>
              <th className="py-2 px-1.5 text-left font-medium whitespace-nowrap">货币</th>
              <th className="py-2 px-1.5 text-left font-medium whitespace-nowrap">名称</th>
              <th className="py-2 px-1.5 text-left font-medium whitespace-nowrap">代码</th>
              <th className="py-2 px-1.5 text-right font-medium whitespace-nowrap">持仓成本</th>
              <th className="py-2 px-1.5 text-right font-medium whitespace-nowrap">数量</th>
              <th className="py-2 px-1.5 text-right font-medium whitespace-nowrap">现价</th>
              <th className="py-2 px-1.5 text-right font-medium whitespace-nowrap">均价</th>
              <th className="py-2 px-1.5 text-right font-medium whitespace-nowrap">天数</th>
              <th className="py-2 px-1.5 text-right font-medium whitespace-nowrap font-semibold text-gray-700">当前价值</th>
              <th className="py-2 px-1.5 text-right font-medium whitespace-nowrap font-semibold text-gray-700">持仓盈亏</th>
              <th className="py-2 px-1.5 text-right font-medium whitespace-nowrap">盈亏率%</th>
              <th className="py-2 px-1.5 text-right font-medium whitespace-nowrap font-semibold text-indigo-600">当日盈亏</th>
              <th className="py-2 px-1.5 text-right font-medium whitespace-nowrap">日收益%</th>
              <th className="py-2 px-1.5 text-left font-medium whitespace-nowrap">所属账户</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((h, i) => (
              <tr key={h.id || i} className="border-b border-gray-50 dark:border-slate-700/30 hover:bg-gray-50/80 dark:hover:bg-slate-700/20">
                <td className="py-2 px-1.5"><span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-500">{h.market || '-'}</span></td>
                <td className="py-2 px-1.5 text-gray-500">{h.currency || '-'}</td>
                <td className="py-2 px-1.5 font-medium text-gray-900 dark:text-white">{h.name || '-'}</td>
                <td className="py-2 px-1.5 text-gray-500 tabular-nums font-mono">{h.code || '-'}</td>
                <td className="py-2 px-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300">{formatNum(h.cost)}</td>
                <td className="py-2 px-1.5 text-right tabular-nums">{formatNum(h.quantity)}</td>
                <td className="py-2 px-1.5 text-right tabular-nums">{formatNum(h.currentPrice)}</td>
                <td className="py-2 px-1.5 text-right tabular-nums">{formatNum(h.avgBuyPrice)}</td>
                <td className="py-2 px-1.5 text-right tabular-nums text-gray-500">{h.holdingDays || '-'}</td>
                <td className="py-2 px-1.5 text-right font-semibold text-gray-900 dark:text-white tabular-nums">{formatNum(h.currentValue || h.balance)}</td>
                <td className={`py-2 px-1.5 text-right tabular-nums font-semibold ${pnlClass(h.holdingPnl)}`}>
                  {pnlSign(parseFloat(h.holdingPnl))}{formatNum(h.holdingPnl)}
                </td>
                <td className={`py-2 px-1.5 text-right tabular-nums ${pnlClass(h.holdingPnlRate)}`}>
                  {formatPercentage(h.holdingPnlRate)}
                </td>
                <td className={`py-2 px-1.5 text-right tabular-nums font-semibold ${pnlClass(h.dailyPnl)}`}>
                  {pnlSign(parseFloat(h.dailyPnl))}{formatNum(h.dailyPnl)}
                </td>
                <td className={`py-2 px-1.5 text-right tabular-nums ${pnlClass(h.dailyPnlRate)}`}>
                  {formatPercentage(h.dailyPnlRate)}
                </td>
                <td className="py-2 px-1.5"><span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">{h.account || '-'}</span></td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan="15" className="py-8 text-center text-gray-400 text-xs">
                  {filterText ? '无匹配结果' : '暂无数据'}
                </td>
              </tr>
            )}
          </tbody>
          {/* 汇总行 */}
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 dark:border-slate-600 bg-gray-50/80 dark:bg-slate-700/30 font-semibold">
                <td colSpan="5" className="py-2 px-1.5 text-xs text-gray-500">合计 ({filtered.length}项)</td>
                <td className="py-2 px-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300"></td>
                <td className="py-2 px-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300"></td>
                <td className="py-2 px-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300"></td>
                <td></td>
                <td className="py-2 px-1.5 text-right tabular-nums text-gray-900 dark:text-white">{formatNum(summary.value)}</td>
                <td className={`py-2 px-1.5 text-right tabular-nums ${pnlClass(summary.pnl)}`}>{pnlSign(summary.pnl)}{formatNum(summary.pnl)}</td>
                <td className={`py-2 px-1.5 text-right tabular-nums ${pnlClass(summary.cost > 0 ? (summary.value - summary.cost) / summary.cost * 100 : 0)}`}>
                  {summary.cost > 0 ? formatPercentage((summary.value - summary.cost) / summary.cost * 100) : '—'}
                </td>
                <td className={`py-2 px-1.5 text-right tabular-nums font-semibold ${pnlClass(summary.dailyPnl)}`}>{pnlSign(summary.dailyPnl)}{formatNum(summary.dailyPnl)}</td>
                <td className="py-2 px-1.5"></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
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

  // 账本和标签管理状态
  const [books, setBooks] = useState([]);
  const [tags, setTags] = useState([]);
  const [showBookModal, setShowBookModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [bookToEdit, setBookToEdit] = useState(null);
  const [tagToEdit, setTagToEdit] = useState(null);
  const [newBookName, setNewBookName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // 新增弹窗表单状态
  const [newAccount, setNewAccount] = useState({
    market: '国内市场',
    currency: '',
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
  const [saving, setSaving] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);

  const { accounts = [], assetClasses = [] } = stateData || {};

  // 页面级分页（账户本区域）
  const [accountBookPage, setAccountBookPage] = useState(1);
  const ACCOUNTS_PER_PAGE = 6;

  useEffect(() => {
    loadData();
    loadBooksAndTags();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchState();
      setStateData(data);
    } catch (err) {
      console.error('Failed to load finance data:', err);
      setError('加载数据失败');
    } finally {
      setLoading(false);
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

  const handleAddAccount = async () => {
    if (!newAccount.name) return;
    setSaving(true);
    try {
      const payload = {
        ...newAccount,
        cost: parseFloat(newAccount.cost) || 0,
        quantity: parseFloat(newAccount.quantity) || 0,
        currentPrice: parseFloat(newAccount.currentPrice) || 0,
        avgBuyPrice: parseFloat(newAccount.avgBuyPrice) || 0,
        holdingDays: parseInt(newAccount.holdingDays) || 0,
        holdingPnl: parseFloat(newAccount.holdingPnl) || 0,
        holdingPnlRate: parseFloat(newAccount.holdingPnlRate) || 0,
        dailyPnl: parseFloat(newAccount.dailyPnl) || 0,
        dailyPnlRate: parseFloat(newAccount.dailyPnlRate) || 0,
        currentValue: parseFloat(newAccount.currentValue) || (parseFloat(newAccount.quantity) || 0) * (parseFloat(newAccount.currentPrice) || 0),
        balance: parseFloat(newAccount.currentValue) || (parseFloat(newAccount.quantity) || 0) * (parseFloat(newAccount.currentPrice) || 0),
      };
      await createAccount(payload);
      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Failed to add account:', err);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setNewAccount({
      market: '国内市场',
      currency: '',
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

  const handleAddBook = () => {
    if (!newBookName.trim()) return;
    const newBook = {
      id: Date.now().toString(),
      name: newBookName.trim(),
      tags: [],
    };
    setBooks([...books, newBook]);
    setNewBookName('');
    handleSaveBooks();
  };

  const handleEditBook = (book) => {
    setBookToEdit(book);
  };

  const handleSaveBookEdit = () => {
    if (!bookToEdit || !bookToEdit.name.trim()) return;
    setBooks(books.map(b => b.id === bookToEdit.id ? bookToEdit : b));
    setBookToEdit(null);
    handleSaveBooks();
  };

  const handleDeleteBook = async (bookId) => {
    setBooks(books.filter(b => b.id !== bookId));
    setDeleteConfirm(null);
    handleSaveBooks();
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
    if (Object.keys(result).length > 0) {
      setNewAccount(prev => ({
        ...prev,
        ...(result.name ? { name: result.name } : {}),
        ...(result.code ? { code: result.code } : {}),
        ...(result.quantity ? { quantity: result.quantity } : {}),
        ...(result.currentPrice ? { currentPrice: result.currentPrice } : {}),
        ...(result.avgBuyPrice ? { avgBuyPrice: result.avgBuyPrice } : {}),
        ...(result.holdingPnl ? { holdingPnl: result.holdingPnl } : {}),
        ...(result.holdingPnlRate ? { holdingPnlRate: result.holdingPnlRate.replace('%', '') } : {}),
        ...(result.dailyPnl ? { dailyPnl: result.dailyPnl } : {}),
        ...(result.currentValue ? { currentValue: result.currentValue } : {}),
      }));
    }
  };

  // ── 下拉选项常量 ──
  const MARKET_OPTIONS = ['国内市场', '港股市场', '美股市场', '其他市场'];
  const CURRENCY_SUGGESTIONS = ['CNY', 'CNH', 'USD', 'HKD', 'EUR', 'JPY', 'GBP', 'SGD'];
  const ASSET_TYPE_OPTIONS = ['股票', '基金', '债券', '期货', '期权', '外汇', '数字货币', '银行理财', '保险', '房产', '其他'];
  const CATEGORY_L1_OPTIONS = ['权益类', '固收类', '现金类', '另类投资', '商品'];
  const CATEGORY_L2_OPTIONS = ['A股', '港股', '美股', '混合型', '指数型', '货币型', '债券型', 'QDII', '其他'];
  const POSITION_GROUP_OPTIONS = ['核心仓位', '卫星仓位', '观察仓位', '套利仓位', '现金仓位'];
  const POSITION_TYPE_OPTIONS = ['核心股票仓位', '成长股仓位', '价值股仓位', 'ETF仓位', '基金定投', '打新仓位', '波段操作', '其他'];

  // ══════════════════════════════════════
  //  数据计算（核心）
  // ══════════════════════════════════════
  const computed = useMemo(() => {
    const financeAccounts = (accounts || []).filter(a => !a.liability);

    // 总览统计
    const totalValue = financeAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalCost = financeAccounts.reduce((sum, a) => sum + (a.cost || a.balance || 0), 0);
    const totalPnl = totalValue - totalCost;
    const totalPnlRate = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
    const totalDailyPnl = financeAccounts.reduce((sum, a) => sum + (parseFloat(a.dailyPnl) || 0), 0);
    const totalDailyPnlRate = totalCost > 0 ? (totalDailyPnl / totalCost) * 100 : 0;

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
      const tp = tv - tc;
      const tdp = items.reduce((s, a) => s + (parseFloat(a.dailyPnl) || 0), 0);
      return {
        name,
        totalValue: tv,
        totalCost: tc,
        totalPnl: tp,
        totalPnlRate: tc > 0 ? (tp / tc) * 100 : 0,
        totalDailyPnl: tdp,
        totalDailyPnlRate: tc > 0 ? (tdp / tc) * 100 : 0,
        count: items.length,
      };
    }).sort((a, b) => b.totalValue - a.totalValue);

    // 分类表格数据 — 带完整字段
    const categorizedHoldings = {};
    financeAccounts.forEach(a => {
      const cat = a.categoryL1 || a.category || '其他';
      if (!categorizedHoldings[cat]) categorizedHoldings[cat] = [];
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
        currentPrice: a.currentPrice || 0,
        avgBuyPrice: a.avgBuyPrice || 0,
        holdingDays: a.holdingDays || 0,
        balance: a.balance || 0,
        currentValue: a.currentValue || a.balance || 0,
        holdingPnl: a.holdingPnl || 0,
        holdingPnlRate: a.holdingPnlRate || 0,
        dailyPnl: a.dailyPnl || 0,
        dailyPnlRate: a.dailyPnlRate || 0,
      });
    });

    return {
      totalValue, totalCost, totalPnl, totalPnlRate, totalDailyPnl, totalDailyPnlRate,
      categories, accountBook, categorizedHoldings,
      financeAccounts,
    };
  }, [accounts]);

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
              <button onClick={() => { resetForm(); setShowAddModal(true); }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 active:scale-[0.97] transition-all shadow-md shadow-indigo-200">
                <Plus className="w-4 h-4" /> 新增
              </button>
              <button onClick={loadData}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-indigo-300 text-indigo-600 text-sm font-medium hover:bg-indigo-50 active:scale-[0.97] transition-all">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 刷新
              </button>
            </div>
          </div>
        </section>

        {/* ═══ 四张核心统计卡 ═══ */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { IconComp: Wallet, label: '总市值', val: `¥${formatCurrency(totalValue)}`, cls: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
            { IconComp: Briefcase, label: '总成本', val: `¥${formatCurrency(totalCost)}`, cls: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
            { IconComp: isTotalPos ? TrendingUp : TrendingDown, label: '总盈亏', val: `${isTotalPos ? '+' : ''}¥${formatCurrency(Math.abs(totalPnl))}`, cls: `${isTotalPos ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'} dark:${isTotalPos ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}` },
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

        {/* ═══ 各资产分类独立表格 ═══ */}
        <section className="space-y-5">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">📊 持仓明细</h2>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
              {categoryNames.length} 个分类 · 共 {computed.financeAccounts.length} 项
            </span>
          </div>

          {categoryNames.length > 0 ? (
            categoryNames.map((catName, idx) => (
              <CategoryTable
                key={catName}
                categoryName={catName}
                holdings={categorizedHoldings[catName]}
                colorIdx={idx}
              />
            ))
          ) : (
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-12 text-center shadow-soft border border-gray-100/80 dark:border-slate-700/50">
              <Briefcase className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 text-sm">暂无持仓数据</p>
              <p className="text-gray-300 text-xs mt-1">点击上方「新增」按钮添加第一笔资产</p>
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════
            新增弹窗（保持不变，仅改货币单位为可编辑）
           ══════════════════════════════════════ */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">新增持仓资产</h3>
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
                        <div className="text-left text-green-700 dark:text-green-400 space-y-0.5">
                          <p className="font-medium mb-1">识别成功，已自动填充：</p>
                          {Object.entries(ocrResult).map(([k, v]) => (
                            <p key={k}><span className="text-gray-500">{fieldLabelMap[k] || k}</span>：{v}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 表单主体 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                  {/* Row 1: 市场 | 货币单位（可自由编辑） */}
                  <FormField label="市场" required>
                    <select value={newAccount.market} onChange={e => setNewAccount({ ...newAccount, market: e.target.value })}
                      className={FORM_SELECT}>
                      {MARKET_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
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

                  {/* Row 2: 资产类型 | 所属账户（同步账户本） */}
                  <FormField label="资产类型" required>
                    <select value={newAccount.assetType} onChange={e => setNewAccount({ ...newAccount, assetType: e.target.value })}
                      className={FORM_SELECT}>
                      {ASSET_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </FormField>

                  <FormField label="所属账户">
                    <div className="flex gap-2">
                      <select value={newAccount.account} onChange={e => setNewAccount({ ...newAccount, account: e.target.value })}
                        className={`${FORM_SELECT} flex-1`}>
                        <option value="">选择或新建账户</option>
                        {[...new Set(accounts.map(a => a.account || a.name).filter(Boolean))].map(name =>
                          <option key={name} value={name}>{name}</option>
                        )}
                      </select>
                      <button onClick={() => setShowBookModal(true)} className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </FormField>

                  {/* Row 3: 资产分类 | 二级 */}
                  <FormField label="资产分类" required>
                    <select value={newAccount.categoryL1} onChange={e => setNewAccount({ ...newAccount, categoryL1: e.target.value })}
                      className={FORM_SELECT}>
                      <option value="">请选择</option>
                      {CATEGORY_L1_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </FormField>

                  <FormField label="资产分类二级">
                    <select value={newAccount.categoryL2} onChange={e => setNewAccount({ ...newAccount, categoryL2: e.target.value })}
                      className={FORM_SELECT}>
                      <option value="">请选择</option>
                      {CATEGORY_L2_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </FormField>

                  {/* Row 4: 三级分类 | 持仓分组 */}
                  <FormField label="资产三级分类">
                    <div className="flex gap-2">
                      <select value={newAccount.categoryL3} onChange={e => setNewAccount({ ...newAccount, categoryL3: e.target.value })}
                        className={`${FORM_SELECT} flex-1`}>
                        <option value="">未分类</option>
                        <option value="_custom_">自由增添</option>
                      </select>
                      {newAccount.categoryL3 === '_custom_' && (
                        <input type="text" placeholder="输入名称"
                          onBlur={e => setNewAccount(prev => ({ ...prev, categoryL3: e.target.value || '自定义' }))}
                          className={`${FORM_INPUT} w-28`} />
                      )}
                    </div>
                  </FormField>

                  <FormField label="持仓分组">
                    <select value={newAccount.positionGroup} onChange={e => setNewAccount({ ...newAccount, positionGroup: e.target.value })}
                      className={FORM_SELECT}>
                      <option value="">请选择</option>
                      {POSITION_GROUP_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </FormField>

                  {/* Row 5: 持位分类 | 名称 */}
                  <FormField label="持位分类" required>
                    <select value={newAccount.positionType} onChange={e => setNewAccount({ ...newAccount, positionType: e.target.value })}
                      className={FORM_SELECT}>
                      <option value="">请选择</option>
                      {POSITION_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </FormField>

                  <FormField label="资产名称" required>
                    <input type="text" value={newAccount.name} onChange={e => setNewAccount({ ...newAccount, name: e.target.value })}
                      placeholder="基金、股票或自定义资产名称" className={FORM_INPUT} />
                  </FormField>

                  {/* Row 6: 代码 | 成本 */}
                  <FormField label="资产代码">
                    <input type="text" value={newAccount.code} onChange={e => setNewAccount({ ...newAccount, code: e.target.value })}
                      placeholder="输入代码如 600519" className={`${FORM_INPUT} font-mono`} />
                  </FormField>

                  <FormField label="持仓成本">
                    <input type="number" step="0.01" value={newAccount.cost} onChange={e => setNewAccount({ ...newAccount, cost: e.target.value })}
                      placeholder="0.00" className={FORM_INPUT} />
                  </FormField>

                  {/* Row 7: 数量 | 现价 */}
                  <FormField label="份额 / 数量">
                    <input type="number" step="0.0001" value={newAccount.quantity} onChange={e => setNewAccount({ ...newAccount, quantity: e.target.value })}
                      placeholder="0" className={FORM_INPUT} />
                  </FormField>

                  <FormField label="现价">
                    <input type="number" step="0.01" value={newAccount.currentPrice} onChange={e => {
                      const val = e.target.value;
                      setNewAccount(p => {
                        const updated = { ...p, currentPrice: val };
                        if (val && p.quantity) updated.currentValue = (parseFloat(val) * parseFloat(p.quantity)).toFixed(2);
                        return updated;
                      });
                    }} placeholder="0.00" className={FORM_INPUT} />
                  </FormField>

                  {/* Row 8: 均价 | 天数 */}
                  <FormField label="买入均价">
                    <input type="number" step="0.01" value={newAccount.avgBuyPrice} onChange={e => setNewAccount({ ...newAccount, avgBuyPrice: e.target.value })}
                      placeholder="0.00" className={FORM_INPUT} />
                  </FormField>

                  <FormField label="持仓天数">
                    <input type="number" value={newAccount.holdingDays} onChange={e => setNewAccount({ ...newAccount, holdingDays: e.target.value })}
                      placeholder="0" className={FORM_INPUT} />
                  </FormField>

                  {/* Row 9: 持仓盈亏 | 盈亏率% */}
                  <FormField label="持仓盈亏" markRequired>
                    <div className="relative">
                      <input type="number" step="0.01" value={newAccount.holdingPnl}
                        onChange={e => setNewAccount({ ...newAccount, holdingPnl: e.target.value })}
                        placeholder="0.00"
                        className={`${FORM_INPUT} pl-7 ${pnlClass(newAccount.holdingPnl)}`} />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">¥</span>
                    </div>
                  </FormField>

                  <FormField label="盈亏率%">
                    <input type="number" step="0.01" value={newAccount.holdingPnlRate}
                      onChange={e => setNewAccount({ ...newAccount, holdingPnlRate: e.target.value })}
                      placeholder="0.00" className={FORM_INPUT} />
                  </FormField>

                  {/* Row 10: 当日参考盈亏 | 日收益率% */}
                  <FormField label="当日参考盈亏" markRequired>
                    <div className="relative">
                      <input type="number" step="0.01" value={newAccount.dailyPnl}
                        onChange={e => setNewAccount({ ...newAccount, dailyPnl: e.target.value })}
                        placeholder="0.00"
                        className={`${FORM_INPUT} pl-7 ${pnlClass(newAccount.dailyPnl)}`} />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">¥</span>
                    </div>
                  </FormField>

                  <FormField label="当日收益率%">
                    <input type="number" step="0.01" value={newAccount.dailyPnlRate}
                      onChange={e => setNewAccount({ ...newAccount, dailyPnlRate: e.target.value })}
                      placeholder="0.00" className={FORM_INPUT} />
                  </FormField>

                  {/* Row 11: 当前价值 — 全宽 */}
                  <div className="sm:col-span-2">
                    <FormField label="当前价值" markRequired fullWidth>
                      <div className="relative">
                        <input type="number" step="0.01" value={newAccount.currentValue}
                          onChange={e => setNewAccount({ ...newAccount, currentValue: e.target.value })}
                          placeholder="自动计算 或 手动输入"
                          className={`${FORM_INPUT} pl-7 font-semibold`} />
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
                  <button onClick={handleAddAccount} disabled={saving || !newAccount.name}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 font-semibold transition-colors shadow-md shadow-indigo-200">
                    {saving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ 账本管理弹窗 ══ */}
        {showBookModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">账本管理</h3>
                <button onClick={() => setShowBookModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={newBookName} onChange={e => setNewBookName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddBook()} placeholder="输入账本名称" className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  <button onClick={handleAddBook} className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {books.length > 0 ? (
                    books.map((book) => (
                      <div key={book.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        {bookToEdit?.id === book.id ? (
                          <>
                            <input type="text" value={bookToEdit.name} onChange={e => setBookToEdit({ ...bookToEdit, name: e.target.value })} className="flex-1 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-600 dark:text-white" autoFocus />
                            <button onClick={handleSaveBookEdit} className="p-1 text-green-600 hover:bg-green-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => setBookToEdit(null)} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-gray-700 dark:text-gray-300">{book.name}</span>
                            <button onClick={() => handleEditBook(book)} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            {deleteConfirm === `book-${book.id}` ? (
                              <button onClick={() => handleDeleteBook(book.id)} className="p-1 text-red-600 hover:bg-red-100 rounded">确认</button>
                            ) : (
                              <button onClick={() => setDeleteConfirm(`book-${book.id}`)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">暂无账本</div>
                  )}
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
      </div>
    </div>
  );
}

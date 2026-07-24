import { useState, useEffect } from 'react';
import { Users, UserPlus, ArrowLeft, LogOut, Loader2, Search, Edit2, Trash2, X, Save, ChevronLeft, ChevronRight, MessageSquare, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const STATUS_MAP = {
  pending: { label: '待处理', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  processing: { label: '处理中', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  resolved: { label: '已处理', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  delayed: { label: '延期处理', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
};

const REVIEW_MAP = {
  0: { label: '未审核', color: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400' },
  1: { label: '已审核', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
};

function StatusBadge({ status }) {
  const info = STATUS_MAP[status] || STATUS_MAP.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${info.color}`}>
      {info.label}
    </span>
  );
}

function ReviewBadge({ reviewed }) {
  const info = REVIEW_MAP[reviewed ? 1 : 0];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${info.color}`}>
      {info.label}
    </span>
  );
}

export default function AdminDashboard({ onBack, onLogout }) {
  const [activeTab, setActiveTab] = useState('users');
  const [stats, setStats] = useState({ totalUsers: 0, todayUsers: 0, pendingFeedback: 0 });
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(10);
  const [editingUser, setEditingUser] = useState(null);
  const [editData, setEditData] = useState({});
  const [deletingUserId, setDeletingUserId] = useState(null);

  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackKeyword, setFeedbackKeyword] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('');
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [feedbackTotalPages, setFeedbackTotalPages] = useState(0);
  const [feedbackTotal, setFeedbackTotal] = useState(0);

  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [feedbackDetail, setFeedbackDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [adminReply, setAdminReply] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!token) {
      onLogout();
      return;
    }
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/dashboard', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.status === 401) {
          localStorage.removeItem('adminToken');
          onLogout();
          return;
        }
        const data = await res.json();
        setStats(data.stats || { totalUsers: 0, todayUsers: 0, pendingFeedback: 0 });
      } catch (err) {
        console.error('Fetch stats error:', err);
      }
    };
    fetchStats();
  }, [token, onLogout]);

  useEffect(() => {
    if (!token || activeTab !== 'users') return;
    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        const url = new URL('/api/admin/users', window.location.origin);
        if (keyword) url.searchParams.set('keyword', keyword);
        url.searchParams.set('page', page);
        url.searchParams.set('pageSize', pageSize);
        const res = await fetch(url.toString(), { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.status === 401) {
          localStorage.removeItem('adminToken');
          onLogout();
          return;
        }
        if (!res.ok) throw new Error('获取用户数据失败');
        const data = await res.json();
        setUsers(data.users || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 0);
        setUsersError('');
      } catch (err) {
        setUsersError(err.message || '加载数据失败');
      } finally {
        setUsersLoading(false);
      }
    };
    fetchUsers();
  }, [keyword, page, pageSize, activeTab, token, onLogout]);

  useEffect(() => {
    if (!token || activeTab !== 'feedback') return;
    const fetchFeedback = async () => {
      try {
        setFeedbackLoading(true);
        const url = new URL('/api/admin/feedback', window.location.origin);
        if (feedbackKeyword) url.searchParams.set('keyword', feedbackKeyword);
        if (feedbackStatus) url.searchParams.set('status', feedbackStatus);
        url.searchParams.set('page', feedbackPage);
        url.searchParams.set('pageSize', pageSize);
        url.searchParams.set('sortBy', 'title');
        const res = await fetch(url.toString(), { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.status === 401) {
          localStorage.removeItem('adminToken');
          onLogout();
          return;
        }
        if (!res.ok) throw new Error('获取反馈数据失败');
        const data = await res.json();
        setFeedbackList(data.feedback || []);
        setFeedbackTotal(data.total || 0);
        setFeedbackTotalPages(data.totalPages || 0);
        setFeedbackError('');
      } catch (err) {
        setFeedbackError(err.message || '加载数据失败');
      } finally {
        setFeedbackLoading(false);
      }
    };
    fetchFeedback();
  }, [feedbackKeyword, feedbackStatus, feedbackPage, pageSize, activeTab, token, onLogout]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditData({ name: user.name, phone: user.phone, email: user.email });
  };

  const handleEditSave = async () => {
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editData)
      });
      if (res.ok) {
        setEditingUser(null);
        setEditData({});
        setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...editData } : u));
      } else {
        const data = await res.json();
        alert(data.message || '编辑失败');
      }
    } catch (error) {
      console.error('Edit user error:', error);
      alert('编辑失败');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await fetch(`/api/admin/users/${deletingUserId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setDeletingUserId(null);
        setUsers(prev => prev.filter(u => u.id !== deletingUserId));
        setTotal(prev => prev - 1);
      } else {
        const data = await res.json();
        alert(data.message || '删除失败');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      alert('删除失败');
    }
  };

  const handleSearch = (e) => {
    setKeyword(e.target.value);
    setPage(1);
  };

  const handleFeedbackSearch = (e) => {
    setFeedbackKeyword(e.target.value);
    setFeedbackPage(1);
  };

  const handleFeedbackStatusChange = (e) => {
    setFeedbackStatus(e.target.value);
    setFeedbackPage(1);
  };

  const openFeedbackDetail = async (item) => {
    setSelectedFeedback(item);
    setDetailLoading(true);
    setFeedbackDetail(null);
    setAdminReply('');
    setNewStatus(item.status);
    try {
      const res = await fetch(`/api/admin/feedback/${item.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFeedbackDetail(data.feedback);
        setAdminReply(data.feedback.admin_reply || '');
        setNewStatus(data.feedback.status);
      }
    } catch (err) {
      console.error('Fetch feedback detail error:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedFeedback) return;
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/admin/feedback/${selectedFeedback.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus, adminReply })
      });
      if (res.ok) {
        setFeedbackList(prev => prev.map(f => f.id === selectedFeedback.id ? { ...f, status: newStatus } : f));
        setSelectedFeedback(prev => prev ? { ...prev, status: newStatus } : null);
      } else {
        const data = await res.json();
        console.error('Update feedback status failed:', data.message);
      }
    } catch (err) {
      console.error('Update feedback status error:', err);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleReviewToggle = async (item) => {
    const newReviewed = item.reviewed ? 0 : 1;
    try {
      const res = await fetch(`/api/admin/feedback/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reviewed: !!newReviewed })
      });
      if (res.ok) {
        setFeedbackList(prev => prev.map(f => f.id === item.id ? { ...f, reviewed: newReviewed } : f));
        if (selectedFeedback && selectedFeedback.id === item.id) {
          setSelectedFeedback(prev => prev ? { ...prev, reviewed: newReviewed } : null);
          setFeedbackDetail(prev => prev ? { ...prev, reviewed: newReviewed } : null);
        }
      } else {
        const data = await res.json();
        alert(data.message || '审核操作失败');
      }
    } catch (err) {
      console.error('Toggle review error:', err);
      alert('审核操作失败');
    }
  };

  const isImage = (filename) => /\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(filename);
  const isVideo = (filename) => /\.(mp4|webm|ogg|mov|avi)$/i.test(filename);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Wealth OS 管理后台</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">超级管理员</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4"/>
              返回应用
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4"/>
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">总用户数</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalUsers}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400"/>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">今日新增</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.todayUsers}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-green-600 dark:text-green-400"/>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setActiveTab('feedback'); setFeedbackStatus('pending'); }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">待处理反馈</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.pendingFeedback}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-orange-600 dark:text-orange-400"/>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setActiveTab('users'); setSelectedFeedback(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4"/>
            用户列表
          </button>
          <button
            onClick={() => { setActiveTab('feedback'); setSelectedFeedback(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'feedback'
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4"/>
            问题反馈
          </button>
        </div>

        {activeTab === 'users' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">注册用户列表</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                  <input
                    type="text"
                    value={keyword}
                    onChange={handleSearch}
                    placeholder="搜索账号、昵称、手机号、邮箱..."
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                共 {total} 条记录，第 {page} / {totalPages} 页
              </p>
            </div>
            {usersLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin"/>
              </div>
            ) : usersError ? (
              <div className="p-6 text-center text-red-600 dark:text-red-400">{usersError}</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">账号</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">昵称</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">手机号</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">邮箱</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">注册时间</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                      {users.length === 0 ? (
                        <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">暂无注册用户</td></tr>
                      ) : (
                        users.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{user.account}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{user.name || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{user.phone || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{user.email || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(user.created_at)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleEditClick(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="编辑">
                                  <Edit2 className="w-4 h-4"/>
                                </button>
                                <button onClick={() => setDeletingUserId(user.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="删除">
                                  <Trash2 className="w-4 h-4"/>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {total > pageSize && (
                  <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      显示 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} 条，共 {total} 条
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <ChevronLeft className="w-4 h-4"/>
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = page <= 3 ? i + 1 : Math.min(page + 2, totalPages) - (4 - i);
                        return (
                          <button key={pageNum} onClick={() => setPage(pageNum)} className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                            page === pageNum ? 'bg-indigo-600 text-white' : 'border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                          }`}>{pageNum}</button>
                        );
                      })}
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <ChevronRight className="w-4 h-4"/>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'feedback' && !selectedFeedback && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">问题反馈列表</h2>
                <div className="flex items-center gap-3">
                  <select
                    value={feedbackStatus}
                    onChange={handleFeedbackStatusChange}
                    className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">全部状态</option>
                    <option value="pending">待处理</option>
                    <option value="processing">处理中</option>
                    <option value="resolved">已处理</option>
                    <option value="delayed">延期处理</option>
                  </select>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                    <input
                      type="text"
                      value={feedbackKeyword}
                      onChange={handleFeedbackSearch}
                      placeholder="搜索标题、内容、用户..."
                      className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                共 {feedbackTotal} 条记录，第 {feedbackPage} / {feedbackTotalPages} 页（按标题排序）
              </p>
            </div>
            {feedbackLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin"/>
              </div>
            ) : feedbackError ? (
              <div className="p-6 text-center text-red-600 dark:text-red-400">{feedbackError}</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">问题标题</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">提交用户</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">状态</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">管理员审核</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">提交时间</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                      {feedbackList.length === 0 ? (
                        <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">暂无反馈记录</td></tr>
                      ) : (
                        feedbackList.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer" onClick={() => openFeedbackDetail(item)}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                              {item.title || '(无标题)'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                              {item.user_name || item.user_account || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <StatusBadge status={item.status}/>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleReviewToggle(item)}
                                className="inline-flex items-center gap-1"
                                title={item.reviewed ? '点击取消审核' : '点击标记为已审核'}
                              >
                                <ReviewBadge reviewed={item.reviewed}/>
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(item.created_at)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {feedbackTotal > pageSize && (
                  <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      显示 {(feedbackPage - 1) * pageSize + 1} - {Math.min(feedbackPage * pageSize, feedbackTotal)} 条，共 {feedbackTotal} 条
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setFeedbackPage(p => Math.max(1, p - 1))} disabled={feedbackPage === 1} className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <ChevronLeft className="w-4 h-4"/>
                      </button>
                      {Array.from({ length: Math.min(5, feedbackTotalPages) }, (_, i) => {
                        const pageNum = feedbackPage <= 3 ? i + 1 : Math.min(feedbackPage + 2, feedbackTotalPages) - (4 - i);
                        return (
                          <button key={pageNum} onClick={() => setFeedbackPage(pageNum)} className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                            feedbackPage === pageNum ? 'bg-indigo-600 text-white' : 'border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                          }`}>{pageNum}</button>
                        );
                      })}
                      <button onClick={() => setFeedbackPage(p => Math.min(feedbackTotalPages, p + 1))} disabled={feedbackPage === feedbackTotalPages} className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <ChevronRight className="w-4 h-4"/>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'feedback' && selectedFeedback && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedFeedback(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300"/>
                </button>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">反馈详情</h2>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={newStatus || selectedFeedback.status}/>
                <ReviewBadge reviewed={feedbackDetail ? feedbackDetail.reviewed : selectedFeedback.reviewed}/>
              </div>
            </div>
            {detailLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin"/>
              </div>
            ) : feedbackDetail ? (
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">问题标题</label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{feedbackDetail.title || '(无标题)'}</p>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                  <span>提交用户：{feedbackDetail.user_name || feedbackDetail.user_account || '-'}</span>
                  <span>提交时间：{formatDate(feedbackDetail.created_at)}</span>
                  {feedbackDetail.replied_at && <span>处理时间：{formatDate(feedbackDetail.replied_at)}</span>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">问题详情</label>
                  <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {feedbackDetail.content}
                  </div>
                </div>
                {feedbackDetail.attachments && feedbackDetail.attachments.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">附件</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {feedbackDetail.attachments.map((att, idx) => (
                        <div key={idx} className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                          {isImage(att.name) ? (
                            <a href={att.url} target="_blank" rel="noreferrer">
                              <img src={att.url} alt={att.name} className="w-full h-40 object-cover"/>
                            </a>
                          ) : isVideo(att.name) ? (
                            <video src={att.url} controls className="w-full h-40 object-cover bg-black"/>
                          ) : (
                            <a href={att.url} target="_blank" rel="noreferrer" className="block p-4 text-center text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800">
                              <MessageSquare className="w-8 h-8 mx-auto mb-2"/>
                              <p className="text-sm truncate">{att.name}</p>
                            </a>
                          )}
                          <div className="px-3 py-2 bg-gray-50 dark:bg-slate-800/50">
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{att.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="border-t border-gray-200 dark:border-slate-800 pt-6">
                  <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">处理操作</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">状态</label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="pending">待处理</option>
                        <option value="processing">处理中</option>
                        <option value="resolved">已处理</option>
                        <option value="delayed">延期处理</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">管理员回复</label>
                      <textarea
                        value={adminReply}
                        onChange={(e) => setAdminReply(e.target.value)}
                        rows={4}
                        placeholder="请输入回复内容..."
                        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <button
                      onClick={handleStatusUpdate}
                      disabled={savingStatus}
                      className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {savingStatus ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>}
                      保存状态
                    </button>
                    <button
                      onClick={() => handleReviewToggle(feedbackDetail || selectedFeedback)}
                      className={`flex items-center justify-center gap-2 w-full py-3 rounded-lg transition-colors ${
                        (feedbackDetail || selectedFeedback).reviewed
                          ? 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      <CheckCircle className="w-5 h-5"/>
                      {(feedbackDetail || selectedFeedback).reviewed ? '取消审核' : '标记为已审核'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">加载失败</div>
            )}
          </div>
        )}
      </main>

      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">编辑用户信息</h3>
              <button onClick={() => { setEditingUser(null); setEditData({}); }} className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">账号</label>
                <input type="text" value={editingUser.account} disabled className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">昵称</label>
                <input type="text" value={editData.name || ''} onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="请输入昵称"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">手机号</label>
                <input type="tel" value={editData.phone || ''} onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="请输入手机号"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">邮箱</label>
                <input type="email" value={editData.email || ''} onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="请输入邮箱"/>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setEditingUser(null); setEditData({}); }} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">取消</button>
              <button onClick={handleEditSave} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                <Save className="w-4 h-4"/> 保存
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingUserId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">确认删除</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">确定要删除该用户吗？此操作不可撤销。</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingUserId(null)} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">取消</button>
              <button onClick={handleDeleteConfirm} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

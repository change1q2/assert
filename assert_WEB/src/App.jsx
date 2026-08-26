import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  Layers,
  Wallet,
  BarChart3,
  Wrench,
  Lightbulb,
  UserCog,
  Download,
  PieChart,
  LogOut,
  User,
  Briefcase,
  PiggyBank,
} from 'lucide-react';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Overview from './pages/Overview.jsx';
import Records from './pages/Records.jsx';
import Finance from './pages/Finance.jsx';
import Debts from './pages/Debts.jsx';
import AssetClasses from './pages/AssetClasses.jsx';
import CategoryDetail from './pages/CategoryDetail.jsx';
import Analysis from './pages/Analysis.jsx';
import Tools from './pages/Tools.jsx';
import Strategies from './pages/Strategies.jsx';
import ValueInvesting from './pages/ValueInvesting.jsx';
import StrategyDetail from './pages/StrategyDetail.jsx';
import Accounts from './pages/Accounts.jsx';
import Downloads from './pages/Downloads.jsx';
import UserProfile from './pages/UserProfile.jsx';
import PremiumCheck from './pages/PremiumCheck.jsx';
import HkIpo from './pages/HkIpo.jsx';
import HkipoCalculator from './pages/HkipoCalculator.jsx';
import ValueInvestingTool from './pages/ValueInvestingTool.jsx';
import MomentumRanking from './pages/MomentumRanking.jsx';
import BudgetManagement from './pages/BudgetManagement.jsx';
import AssetPenetration from './pages/AssetPenetration.jsx';
import IndependentAssets from './pages/IndependentAssets.jsx';
import SurvivalFunds from './pages/SurvivalFunds.jsx';
import { checkAndSync, getPendingSyncs } from './api/index.js';

const menuItems = [
  { id: 'overview', label: '资产总览', icon: LayoutDashboard },
  { id: 'records', label: '收支分析', icon: FileText },
  { id: 'survival-funds', label: '生存资金', icon: PiggyBank },
  { id: 'finance', label: '理财模块', icon: Layers },
  { id: 'independent-assets', label: '独立资产', icon: Briefcase },
  { id: 'debts', label: '债务模块', icon: Wallet },
  { id: 'classes', label: '资产分类', icon: PieChart },
  { id: 'analysis', label: '统计分析', icon: BarChart3 },
  { id: 'tools', label: '辅助工具', icon: Wrench },
  { id: 'strategies', label: '投资策略', icon: Lightbulb },
  { id: 'accounts', label: '账户管理', icon: UserCog },
  { id: 'downloads', label: '产品下载页', icon: Download },
];

export default function App() {
  const [activeMenu, setActiveMenu] = useState('overview');
  // Keep-alive: 记录已渲染过的页面菜单id，保持DOM挂载(display:none)避免重复mount触发重新加载
  const [mountedMenus, setMountedMenus] = useState(() => new Set(['overview']));
  const [currentPage, setCurrentPage] = useState('login');
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userAvatar, setUserAvatar] = useState('');
  const [userName, setUserName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showAssetPenetration, setShowAssetPenetration] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ pending: 0, lastSync: null });

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoggedIn(false);
        return;
      }
      try {
        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
          setLoggedIn(true);
          setIsAdmin(data.isAdmin || false);
          setUserAvatar(data.user.avatar || '');
          setUserName(data.user.name || '');
          return;
        }
        }
        localStorage.removeItem('token');
        localStorage.removeItem('state');
        setLoggedIn(false);
      } catch (e) {
        console.error('Auth check failed:', e);
        localStorage.removeItem('token');
        localStorage.removeItem('state');
        setLoggedIn(false);
      }
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  // 自动同步逻辑
  useEffect(() => {
    if (!loggedIn) return;

    const doSync = async () => {
      const pending = getPendingSyncs();
      const pendingCount = Object.keys(pending).length;
      setSyncStatus(prev => ({ ...prev, pending: pendingCount }));

      if (pendingCount > 0) {
        console.log(`🔄 检测到 ${pendingCount} 条待同步数据，正在同步...`);
        const result = await checkAndSync();
        if (result.synced > 0) {
          setSyncStatus({ pending: 0, lastSync: new Date() });
        }
      }
    };

    doSync();

    // 每30分钟同步一次
    const interval = setInterval(doSync, 30 * 60 * 1000);
    const handleOnline = () => {
      console.log('📶 网络已恢复，检查待同步数据...');
      doSync();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, [loggedIn]);

  const handleLogin = (data) => {
    setLoggedIn(true);
    setIsAdmin(data?.isAdmin || false);
    setCurrentPage('main');
    const savedState = localStorage.getItem('state');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.user) {
          setUserAvatar(state.user.avatar || '');
          setUserName(state.user.name || '');
        }
      } catch (e) {
        console.error('Failed to parse state');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('state');
    setUserAvatar('');
    setUserName('');
    setLoggedIn(false);
    setIsAdmin(false);
    setCurrentPage('login');
    setActiveMenu('overview');
    setSelectedCategory(null);
  };

  const handleCategorySelect = (categoryName) => {
    setSelectedCategory(categoryName);
  };

  const handleBackFromDetail = () => {
    setSelectedCategory(null);
  };

  // Keep-alive: 切换菜单时将新菜单记录到 mountedMenus，后续返回不会重新 mount
  const handleSetActiveMenu = (menuId) => {
    setActiveMenu(menuId);
    setSelectedCategory(null);
    // 同时处理 strategy-detail:<id> 形式
    const baseId = typeof menuId === 'string' && menuId.includes(':') ? menuId.split(':')[0] : menuId;
    setMountedMenus(prev => {
      if (prev.has(menuId)) return prev;
      const next = new Set(prev);
      next.add(menuId);
      if (baseId !== menuId) next.add(baseId);
      return next;
    });
  };

  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  // 为某个菜单id生成页面组件（含props），返回null表示该id不是主菜单项
  const buildPageForMenu = (menuId) => {
    switch (menuId) {
      case 'overview':
        return <Overview />;
      case 'records':
        return <Records onNavigate={handleSetActiveMenu} />;
      case 'survival-funds':
        return <SurvivalFunds />;
      case 'finance':
        return <Finance onAssetPenetration={() => setShowAssetPenetration(true)} />;
      case 'independent-assets':
        return <IndependentAssets />;
      case 'debts':
        return <Debts />;
      case 'classes':
        return <AssetClasses onCategorySelect={handleCategorySelect} />;
      case 'analysis':
        return <Analysis onNavigate={handleSetActiveMenu} />;
      case 'tools':
        return <Tools onNavigate={handleSetActiveMenu} />;
      case 'strategies':
        return <Strategies onNavigate={handleSetActiveMenu} />;
      case 'value-investing':
        return <StrategyDetail strategyId="value-investing" onBack={() => handleSetActiveMenu('strategies')} onNavigate={handleSetActiveMenu} />;
      case 'accounts':
        return <Accounts />;
      case 'downloads':
        return <Downloads />;
      case 'profile':
        return <UserProfile onAdmin={() => setCurrentPage('admin-login')} isAdmin={isAdmin} />;
      case 'premium-check':
        return <PremiumCheck onBack={() => handleSetActiveMenu('tools')} />;
      case 'hk-ipo':
        return <HkIpo onBack={() => handleSetActiveMenu('tools')} />;
      case 'hkipo-calculator':
        return <HkipoCalculator onBack={() => handleSetActiveMenu('tools')} />;
      case 'value-investing-tool':
        return <ValueInvestingTool onBack={() => handleSetActiveMenu('tools')} />;
      case 'momentum-ranking':
        return <MomentumRanking onBack={() => handleSetActiveMenu('tools')} />;
      case 'budget':
        return <BudgetManagement onBack={() => handleSetActiveMenu('records')} />;
      default:
        if (typeof menuId === 'string' && menuId.startsWith('strategy-detail:')) {
          const strategyId = menuId.slice('strategy-detail:'.length);
          return <StrategyDetail strategyId={strategyId} onBack={() => handleSetActiveMenu('strategies')} onNavigate={handleSetActiveMenu} />;
        }
        return null;
    }
  };

  const renderContent = () => {
    if (showAssetPenetration) {
      return <AssetPenetration onBack={() => setShowAssetPenetration(false)} />;
    }
    if (selectedCategory) {
      return <CategoryDetail categoryName={selectedCategory} onBack={handleBackFromDetail} />;
    }
    // Keep-alive 渲染：已mounted的页面保留DOM，非活跃页display:none
    const entries = [];
    // 先将当前activeMenu加入mountedMenus（若尚未）
    if (!mountedMenus.has(activeMenu)) {
      // 同步地在渲染前加入，避免额外render
      mountedMenus.add(activeMenu);
    }
    for (const menuId of mountedMenus) {
      const pageNode = buildPageForMenu(menuId);
      if (pageNode === null) continue;
      const isActive = menuId === activeMenu;
      entries.push(
        <div key={menuId} style={{ display: isActive ? 'block' : 'none' }}>
          {pageNode}
        </div>
      );
    }
    // 兜底：如果activeMenu对应的buildPageForMenu返回null（例如策略详情未正确加入mountedMenus），
    // 仍然渲染一次以保证功能
    const currentPageNode = buildPageForMenu(activeMenu);
    const alreadyIncluded = Array.from(mountedMenus).some(m => buildPageForMenu(m) !== null);
    if (currentPageNode !== null && entries.length === 0 && !alreadyIncluded) {
      return currentPageNode;
    }
    // 对于未被buildPageForMenu覆盖的activeMenu（动态strategy-detail等），直接渲染
    if (currentPageNode === null) {
      // 默认兜底页
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-gray-400 dark:text-gray-400 font-mono">功能开发中...</p>
          </div>
        </div>
      );
    }
    return <>{entries}</>;
  };

  if (!loggedIn) {
    if (currentPage === 'register') {
      return <Register onLogin={handleLogin} onBackToLogin={() => setCurrentPage('login')} />;
    }
    if (currentPage === 'forgot-password') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">忘记密码</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">请联系管理员重置密码。</p>
            <button
              onClick={() => setCurrentPage('login')}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-200"
            >
              返回登录
            </button>
          </div>
        </div>
      );
    }
    if (currentPage === 'admin') {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
          <AdminDashboard
            onBack={() => setCurrentPage('login')}
            onLogout={() => {
              localStorage.removeItem('adminToken');
              setCurrentPage('login');
            }}
          />
        </div>
      );
    }
    return (
      <Login
        onLogin={handleLogin}
        onRegister={() => setCurrentPage('register')}
        onForgotPassword={() => setCurrentPage('forgot-password')}
        onAdminLogin={() => setCurrentPage('admin')}
      />
    );
  }

  if (currentPage === 'admin-login') {
    return (
      <AdminLogin
        onLogin={() => setCurrentPage('admin')}
        onBack={() => setCurrentPage(loggedIn ? 'main' : 'login')}
      />
    );
  }

  if (currentPage === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
        <AdminDashboard
          onBack={() => setCurrentPage(loggedIn ? 'main' : 'login')}
          onLogout={() => {
            localStorage.removeItem('adminToken');
            setCurrentPage(loggedIn ? 'main' : 'login');
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
      <aside className={`w-60 bg-gradient-to-b from-white to-gray-50 dark:from-slate-900 dark:to-slate-950 border-r border-gray-200/60 dark:border-slate-800 flex flex-col ${showAssetPenetration || selectedCategory ? 'hidden' : ''}`}>
        <div className="p-5 border-b border-gray-200/60 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <div className="font-bold text-gray-900 dark:text-white font-mono tracking-tight">Wealth OS</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">V1.0.42</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isStrategyDetail = activeMenu.startsWith('strategy-detail:');
                const isActive = activeMenu === item.id || (item.id === 'strategies' && isStrategyDetail);
                return (
              <button
                key={item.id}
                onClick={() => {
                  handleSetActiveMenu(item.id);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ease-out ${
                  isActive && !selectedCategory
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium border-l-2 border-blue-600'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800/50 border-l-2 border-transparent'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200/60 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {renderContent()}
      </main>

      <button
        onClick={() => setActiveMenu('profile')}
        className="fixed top-4 right-4 w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 transition-all duration-200 z-50"
      >
        {userAvatar ? (
          <img
            src={userAvatar}
            alt="avatar"
            className="w-full h-full rounded-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
            }}
          />
        ) : (
          <span className="text-sm font-bold">{getInitial(userName)}</span>
        )}
        {syncStatus.pending > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse" title={`${syncStatus.pending} 条数据待同步`}>
            {syncStatus.pending}
          </span>
        )}
      </button>
    </div>
  );
}

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
} from 'lucide-react';
import Login from './pages/Login.jsx';
import Overview from './pages/Overview.jsx';
import Records from './pages/Records.jsx';
import Finance from './pages/Finance.jsx';
import Debts from './pages/Debts.jsx';
import AssetClasses from './pages/AssetClasses.jsx';
import CategoryDetail from './pages/CategoryDetail.jsx';
import Analysis from './pages/Analysis.jsx';
import Tools from './pages/Tools.jsx';
import Strategies from './pages/Strategies.jsx';
import Accounts from './pages/Accounts.jsx';
import Downloads from './pages/Downloads.jsx';
import UserProfile from './pages/UserProfile.jsx';
import PremiumCheck from './pages/PremiumCheck.jsx';
import HkIpo from './pages/HkIpo.jsx';
import BudgetManagement from './pages/BudgetManagement.jsx';
import AssetPenetration from './pages/AssetPenetration.jsx';

const menuItems = [
  { id: 'overview', label: '资产总览', icon: LayoutDashboard },
  { id: 'records', label: '收支分析', icon: FileText },
  { id: 'finance', label: '理财模块', icon: Layers },
  { id: 'debts', label: '债务模块', icon: Wallet },
  { id: 'classes', label: '资产分类', icon: PieChart },
  { id: 'analysis', label: '统计分析', icon: BarChart3 },
  { id: 'tools', label: '辅助工具', icon: Wrench },
  { id: 'strategies', label: '业务设计', icon: Lightbulb },
  { id: 'accounts', label: '账户管理', icon: UserCog },
  { id: 'downloads', label: '产品下载页', icon: Download },
];

export default function App() {
  const [activeMenu, setActiveMenu] = useState('overview');
  const [loggedIn, setLoggedIn] = useState(false);
  const [userAvatar, setUserAvatar] = useState('');
  const [userName, setUserName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showAssetPenetration, setShowAssetPenetration] = useState(false);

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

  const handleLogin = () => {
    setLoggedIn(true);
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
    setActiveMenu('overview');
    setSelectedCategory(null);
  };

  const handleCategorySelect = (categoryName) => {
    setSelectedCategory(categoryName);
  };

  const handleBackFromDetail = () => {
    setSelectedCategory(null);
  };

  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  const renderContent = () => {
    if (showAssetPenetration) {
      return <AssetPenetration onBack={() => setShowAssetPenetration(false)} />;
    }
    if (selectedCategory) {
      return <CategoryDetail categoryName={selectedCategory} onBack={handleBackFromDetail} />;
    }
    switch (activeMenu) {
      case 'overview':
        return <Overview />;
      case 'records':
        return <Records onNavigate={setActiveMenu} />;
      case 'finance':
        return <Finance onAssetPenetration={() => setShowAssetPenetration(true)} />;
      case 'debts':
        return <Debts />;
      case 'classes':
        return <AssetClasses onCategorySelect={handleCategorySelect} />;
      case 'analysis':
        return <Analysis onNavigate={setActiveMenu} />;
      case 'tools':
        return <Tools onNavigate={setActiveMenu} />;
      case 'strategies':
        return <Strategies />;
      case 'accounts':
        return <Accounts />;
      case 'downloads':
        return <Downloads />;
      case 'profile':
        return <UserProfile />;
      case 'premium-check':
        return <PremiumCheck />;
      case 'hk-ipo':
        return <HkIpo />;
      case 'budget':
        return <BudgetManagement onBack={() => setActiveMenu('records')} />;
      default:
        return (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-gray-400 dark:text-gray-400 font-mono">功能开发中...</p>
            </div>
          </div>
        );
    }
  };

  if (!loggedIn) {
    return <Login onLogin={handleLogin} />;
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
              <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">V1.0.2</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveMenu(item.id);
                  setSelectedCategory(null);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ease-out ${
                  activeMenu === item.id && !selectedCategory
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
      </button>
    </div>
  );
}

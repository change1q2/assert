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
import Analysis from './pages/Analysis.jsx';
import Tools from './pages/Tools.jsx';
import Strategies from './pages/Strategies.jsx';
import Accounts from './pages/Accounts.jsx';
import Downloads from './pages/Downloads.jsx';
import UserProfile from './pages/UserProfile.jsx';
import PremiumCheck from './pages/PremiumCheck.jsx';
import HkIpo from './pages/HkIpo.jsx';

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
  const [loggedIn, setLoggedIn] = useState(true);
  const [userAvatar, setUserAvatar] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const loadUserInfo = () => {
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

    loadUserInfo();
    window.addEventListener('storage', loadUserInfo);
    return () => window.removeEventListener('storage', loadUserInfo);
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
  };

  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'overview':
        return <Overview />;
      case 'records':
        return <Records />;
      case 'finance':
        return <Finance />;
      case 'debts':
        return <Debts />;
      case 'classes':
        return <AssetClasses />;
      case 'analysis':
        return <Analysis />;
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
      default:
        return (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400">功能开发中...</p>
            </div>
          </div>
        );
    }
  };

  if (!loggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900">
      <aside className="w-60 bg-white dark:bg-slate-800 border-r border-gray-100 dark:border-slate-700 flex flex-col">
        <div className="p-5 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <div className="font-bold text-gray-900 dark:text-white">Wealth OS</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">V1.0.1</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  activeMenu === item.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
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
        className="fixed top-4 right-4 w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center text-white shadow-lg transition-all z-50"
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

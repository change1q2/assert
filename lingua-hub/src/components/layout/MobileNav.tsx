import { NavLink, useLocation } from 'react-router-dom';
import { Home, BookOpen, GraduationCap, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/courses', label: '课程', icon: BookOpen },
  { path: '/learn', label: '学习', icon: GraduationCap },
  { path: '/progress', label: '进度', icon: TrendingUp },
  { path: '/community', label: '社区', icon: Users },
];

export default function MobileNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors duration-200',
                isActive ? 'text-blue-600' : 'text-gray-500'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'text-blue-600')} />
              <span className="text-xs font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

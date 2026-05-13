import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Heart, User, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function BottomNav() {
  const location = useLocation();
  const path = location.pathname;
  const { isAdmin } = useAuth();

  const navItems = [
    { icon: Home, label: '홈', href: '/', match: (p: string) => p === '/' },
    { icon: Search, label: '검색', href: '/search', match: (p: string) => p === '/search' },
    { icon: Heart, label: '찜', href: '/mypage', match: (p: string) => false },
    { icon: User, label: 'MY', href: '/mypage', match: (p: string) => p === '/mypage' },
    ...(isAdmin ? [{ icon: Shield, label: '관리', href: '/admin', match: (p: string) => p === '/admin' }] : []),
  ];

  return (
    <nav className="flex-shrink-0 bg-white border-t border-slate-100/80 safe-bottom">
      <div className="flex justify-around items-center h-14 px-2">
        {navItems.map((item, idx) => {
          const isActive = item.match(path);
          return (
            <Link
              key={idx}
              to={item.href}
              className="flex flex-col items-center justify-center gap-[2px] w-16 h-full touch-active relative"
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-indigo-600 rounded-full" />
              )}
              <item.icon
                className={`w-[22px] h-[22px] transition-all duration-200 ${
                  isActive ? 'text-indigo-600' : 'text-slate-400'
                }`}
                strokeWidth={isActive ? 2.2 : 1.6}
              />
              <span className={`text-[10px] leading-tight transition-colors duration-200 ${
                isActive ? 'text-indigo-600 font-semibold' : 'text-slate-400 font-medium'
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
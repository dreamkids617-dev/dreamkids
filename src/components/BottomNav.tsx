import { Link, useLocation } from 'react-router-dom';
import { Home, Search, MessageCircle, Newspaper, User } from 'lucide-react';

const navItems = [
  { icon: Home, label: '홈', href: '/', match: (p: string) => p === '/' },
  { icon: Search, label: '기관찾기', href: '/search', match: (p: string) => p === '/search' },
  { icon: MessageCircle, label: '커뮤니티', href: '/community', match: (p: string) => p === '/community' || p.startsWith('/community/') },
  { icon: Newspaper, label: '소식', href: '/news', match: (p: string) => p === '/news' },
  { icon: User, label: '마이', href: '/mypage', match: (p: string) => p === '/mypage' },
] as const;

export default function BottomNav() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <nav className="flex-shrink-0 bg-white border-t border-slate-100/80 safe-bottom">
      <div className="flex justify-around items-center h-14 px-1">
        {navItems.map((item) => {
          const isActive = item.match(path);
          return (
            <Link
              key={item.href}
              to={item.href}
              className="flex flex-col items-center justify-center gap-[2px] min-w-0 flex-1 max-w-[72px] h-full touch-active relative"
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
              <span
                className={`text-[10px] leading-tight transition-colors duration-200 truncate w-full text-center ${
                  isActive ? 'text-indigo-600 font-semibold' : 'text-slate-400 font-medium'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

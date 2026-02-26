import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, FileText, Library, Settings } from 'lucide-react';
import { OnlineIndicator } from './OnlineIndicator';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/scheme', icon: BookOpen, label: 'Scheme' },
  { to: '/lesson-plan', icon: FileText, label: 'Plans' },
  { to: '/templates', icon: Library, label: 'Templates' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function BottomNav() {
  const location = useLocation();

  // Hide nav on onboarding
  if (location.pathname === '/onboarding') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 touch-target rounded-lg transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b border-border bg-card/95 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <BookOpen className="h-4 w-4 text-primary-foreground" />
        </div>
        <h1 className="text-lg font-heading font-bold text-foreground">NaijaLesson</h1>
      </div>
      <OnlineIndicator />
    </header>
  );
}

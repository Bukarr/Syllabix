import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, BookOpen, FileText, PenLine, Settings,
  ClipboardCheck, Menu, X, Plus, BarChart3, Briefcase,
  LinkIcon, ChevronRight, Share2
} from 'lucide-react';
import { OnlineIndicator } from './OnlineIndicator';
import { AppLogo } from './AppLogo';

const navGroups = [
  {
    label: 'GENERATE',
    items: [
      { to: '/lesson-plan', icon: Plus, label: 'New Lesson Plan' },
      { to: '/ai-notes', icon: PenLine, label: 'AI Copy Notes' },
      { to: '/scheme', icon: BookOpen, label: 'Scheme of Work' },
    ],
  },
  {
    label: 'TRACK',
    items: [
      { to: '/class-tracker', icon: BarChart3, label: 'Class Tracker' },
      { to: '/my-plans', icon: FileText, label: 'My Notes & Plans' },
    ],
  },
  {
    label: 'REVIEW',
    items: [
      { to: '/reviewer', icon: ClipboardCheck, label: 'Lesson Reviewer' },
    ],
  },
  {
    label: 'COLLABORATE',
    items: [
      { to: '/collaborate', icon: Share2, label: 'School Workspace' },
    ],
  },
  {
    label: 'TOOLS',
    items: [
      { to: '/my-resources', icon: LinkIcon, label: 'My Resources' },
      { to: '/portfolio', icon: Briefcase, label: 'Portfolio' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

const bottomItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/lesson-plan', icon: Plus, label: 'Create' },
  { to: '/class-tracker', icon: BarChart3, label: 'Tracker' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);
  const isCurrentRoute = (to: string) => location.pathname === to;
  const handleDrawerNavigation = (to: string) => {
    setDrawerOpen(false);
    navigate(to);
  };

  // Always close the drawer whenever the route changes (covers taps on the
  // current route, programmatic navigation, and back/forward gestures).
  useEffect(() => {
    closeDrawer();
  }, [location.pathname]);

  if (location.pathname === '/onboarding') return null;

  return (
    <>
      {/* Floating bottom nav pill */}
      <nav className="fixed bottom-4 left-4 right-4 z-50">
        <div className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-xl shadow-lg" style={{ boxShadow: 'var(--shadow-md), var(--shadow-glow)' }}>
          <div className="flex items-center justify-around px-1 py-1.5">
            {bottomItems.map(({ to, icon: Icon, label }) => {
              const isActive = !drawerOpen && isCurrentRoute(to);
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={`relative flex flex-col items-center gap-0.5 px-5 py-2 rounded-xl transition-all touch-target ${
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-glow"
                      className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/20"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <Icon className="h-5 w-5 relative z-10" />
                  <span className="text-[9px] font-semibold relative z-10">{label}</span>
                </NavLink>
              );
            })}
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex flex-col items-center gap-0.5 px-5 py-2 rounded-xl text-muted-foreground hover:text-foreground transition-all touch-target"
            >
              <Menu className="h-5 w-5" />
              <span className="text-[9px] font-semibold">Menu</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Full-screen drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            key="drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-background/75 backdrop-blur-sm"
            onClick={closeDrawer}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="absolute right-0 top-0 bottom-0 z-[70] w-[82%] max-w-xs border-l border-border/50 bg-card/95 backdrop-blur-2xl"
              style={{ boxShadow: '-8px 0 32px hsl(0 0% 0% / 0.4)' }}
              onClick={(event) => event.stopPropagation()}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between p-5 border-b border-border/50">
                <div className="flex items-center gap-2.5">
                  <AppLogo size="sm" />
                  <span className="font-heading font-bold text-base">Syllabix</span>
                </div>
                <button
                  onClick={closeDrawer}
                  className="p-2 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Nav groups */}
              <div className="overflow-y-auto h-[calc(100%-72px)] px-3 py-4 space-y-5">
                {navGroups.map((group, gi) => (
                  <motion.div
                    key={group.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: gi * 0.05 }}
                  >
                    <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground mb-1.5 px-3">
                      {group.label}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map(({ to, icon: Icon, label }) => {
                        const isActive = isCurrentRoute(to);
                        return (
                          <button
                            key={to}
                            type="button"
                            onClick={() => handleDrawerNavigation(to)}
                            aria-current={isActive ? 'page' : undefined}
                            className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                              isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-foreground/80 hover:bg-muted/50 hover:text-foreground'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg ${isActive ? 'bg-primary/20' : 'bg-muted/50'}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-medium flex-1">{label}</span>
                            <ChevronRight className={`h-3.5 w-3.5 ${isActive ? 'text-primary' : 'text-muted-foreground/50'}`} />
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}

                {/* Version info */}
                <div className="pt-4 px-3 border-t border-border/30">
                  <p className="text-[10px] text-muted-foreground/60">Syllabix v1</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/90 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <AppLogo size="sm" />
        <h1 className="text-lg font-heading font-bold text-foreground">Syllabix</h1>
      </div>
      <OnlineIndicator />
    </header>
  );
}

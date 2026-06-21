import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import ThemeSwitcher from '../ui/ThemeSwitcher';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Derive dynamic page titles based on current path
  const getPageDetails = () => {
    const path = location.pathname;
    if (path === '/') return { title: 'Dashboard', subtitle: 'Overview' };
    if (path.startsWith('/designer')) return { title: 'Certificate Designer', subtitle: 'Templates' };
    if (path.startsWith('/recipients')) return { title: 'Recipients', subtitle: 'Management' };
    if (path.startsWith('/generation')) return { title: 'Generation Workflow', subtitle: 'Issuance' };
    if (path.startsWith('/verify')) return { title: 'Verification', subtitle: 'Public Portal' };
    if (path.startsWith('/campaigns')) return { title: 'Campaigns', subtitle: 'Email Lists' };
    if (path.startsWith('/analytics')) return { title: 'Analytics', subtitle: 'Performance' };
    if (path.startsWith('/users')) return { title: 'User Management', subtitle: 'Administration' };
    if (path.startsWith('/settings')) return { title: 'Settings', subtitle: 'System Configuration' };
    return { title: 'CertForge Pro', subtitle: 'System' };
  };

  const { title, subtitle } = getPageDetails();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  const notificationsList = [
    { id: 1, title: 'Bulk generation completed', desc: '5,000 certificates issued successfully.', time: '2 hours ago', type: 'success' },
    { id: 2, title: 'Verification check alert', desc: 'Invalid certificate hash check from IP.', time: 'Yesterday', type: 'alert' }
  ];

  return (
    <header className="sticky top-0 z-30 h-16 w-full bg-white border-b border-outline-variant flex justify-between items-center px-4 md:px-6 shrink-0" role="banner">
      <div className="flex items-center gap-3">
        {/* Hamburger menu for mobile */}
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-surface-container-low rounded-xl lg:hidden"
          aria-label="Toggle navigation menu"
        >
          <span className="material-symbols-outlined text-[22px] text-on-surface">menu</span>
        </button>

        <div>
          <h2 className="text-base font-bold text-on-surface leading-tight">
            {title}
          </h2>
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-on-surface-variant">
            <span>CertForge Pro</span>
            <span className="text-outline-variant">/</span>
            <span className="font-semibold text-secondary">{subtitle}</span>
          </div>
        </div>

        <div className="hidden lg:block h-6 w-px bg-outline-variant mx-1" />

        {/* Search bar — hidden on mobile */}
        <div className="relative hidden lg:flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-[18px] text-on-surface-variant">search</span>
          <input
            className="pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl text-xs w-56 focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 outline-none transition-all placeholder:text-on-surface-variant/60"
            placeholder="Search credentials..."
            type="text"
            aria-label="Search credentials"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3 relative">
        {/* Theme Switcher */}
        <ThemeSwitcher />

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
            className="p-2 text-on-surface-variant hover:text-on-surface transition-colors hover:bg-surface-container-low rounded-xl relative"
            aria-label="Notifications"
            aria-expanded={showNotifications}
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-outline-variant rounded-2xl shadow-xl z-50 p-4 animate-slide-in" role="menu">
              <h4 className="font-bold text-sm mb-3 text-on-surface border-b border-outline-variant/50 pb-2">Recent Notifications</h4>
              <div className="space-y-3">
                {notificationsList.map(n => (
                  <div key={n.id} className="text-xs" role="menuitem">
                    <div className="flex justify-between items-center font-semibold text-on-surface">
                      <span>{n.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                        n.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>{n.type.toUpperCase()}</span>
                    </div>
                    <p className="text-on-surface-variant mt-1">{n.desc}</p>
                    <span className="text-[10px] text-on-surface-variant/60 mt-1 block">{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        {user && (
          <div className="relative">
            <button
              onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
              className="flex items-center gap-2 md:gap-3 pl-2 md:pl-3 border-l border-outline-variant/50 hover:opacity-90 transition-opacity"
              aria-label="User menu"
              aria-expanded={showUserMenu}
            >
              <div className="text-right hidden sm:block">
                <p className="font-semibold text-xs text-on-surface leading-none">{user.name}</p>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-0.5 font-medium">{user.role}</p>
              </div>
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-secondary/10 flex items-center justify-center font-bold text-secondary text-xs border border-secondary/20">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-outline-variant rounded-2xl shadow-xl z-50 overflow-hidden animate-slide-in" role="menu">
                <div className="p-3 bg-surface-container-low/50 border-b border-outline-variant/50 text-xs">
                  <p className="font-bold text-on-surface">{user.name}</p>
                  <p className="text-on-surface-variant truncate">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  role="menuitem"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

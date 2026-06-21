import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuthStore();
  const currentPath = location.pathname;

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: 'dashboard' },
    { name: 'Designer', path: '/designer', icon: 'brush', roles: ['Super Admin', 'Admin', 'Issuer'] },
    { name: 'Recipients', path: '/recipients', icon: 'group', roles: ['Super Admin', 'Admin', 'Issuer'] },
    { name: 'Generation', path: '/generation', icon: 'verified_user', roles: ['Super Admin', 'Admin', 'Issuer'] },
    { name: 'Verification', path: '/verify', icon: 'fact_check' },
    { name: 'Campaigns', path: '/campaigns', icon: 'campaign', roles: ['Super Admin', 'Admin'] },
    { name: 'Analytics', path: '/analytics', icon: 'analytics' },
    { name: 'Users', path: '/users', icon: 'manage_accounts', roles: ['Super Admin'] },
    { name: 'Settings', path: '/settings', icon: 'settings', roles: ['Super Admin', 'Admin'] },
  ];

  // Filter menu items by user role
  const filteredItems = menuItems.filter(item => {
    if (!item.roles) return true;
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          w-[272px] h-screen fixed left-0 top-0 bg-white border-r border-outline-variant
          flex flex-col z-50 transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-outline-variant/50 shrink-0">
          <div className="w-9 h-9 bg-secondary/10 rounded-xl flex items-center justify-center text-lg">
            🏆
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-on-surface tracking-tight leading-none">
              CertForge Pro
            </h1>
            <p className="text-[10px] text-on-surface-variant font-medium mt-0.5 tracking-wide uppercase">
              Enterprise Trust
            </p>
          </div>
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="ml-auto p-1.5 hover:bg-surface-container rounded-lg lg:hidden"
            aria-label="Close navigation"
          >
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">close</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-3 px-3 overflow-y-auto" aria-label="Primary navigation">
          <ul className="space-y-0.5" role="list">
            {filteredItems.map((item) => {
              const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => onClose()}
                    aria-current={isActive ? 'page' : undefined}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium
                      transition-all duration-150 relative group
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50
                      ${isActive
                        ? 'bg-secondary/10 text-secondary font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                      }
                    `}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-secondary rounded-r-full" />
                    )}
                    <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-secondary' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Quick Action Footer */}
        {user && user.role !== 'Viewer' && (
          <div className="p-3 border-t border-outline-variant/50 shrink-0">
            <Link
              to="/generation"
              onClick={() => onClose()}
              className="
                w-full bg-secondary hover:bg-secondary/90 active:scale-[0.98]
                text-white font-semibold py-2.5 px-4 rounded-xl
                flex items-center justify-center gap-2 transition-all
                text-[13px] shadow-sm
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 focus-visible:ring-offset-2
              "
              aria-label="Create new certificate"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Create Certificate
            </Link>
          </div>
        )}

        {/* User Role Badge */}
        {user && (
          <div className="px-4 py-3 border-t border-outline-variant/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold text-xs">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-on-surface truncate">{user.name}</p>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-medium">{user.role}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

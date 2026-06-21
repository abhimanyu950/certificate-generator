import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import ErrorBoundary from './components/ui/ErrorBoundary';
import DashboardPage from './pages/DashboardPage';
import DesignerPage from './pages/DesignerPage';
import RecipientsPage from './pages/RecipientsPage';
import GenerationPage from './pages/GenerationPage';
import VerificationPage from './pages/VerificationPage';
import CampaignPage from './pages/CampaignPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import UserManagementPage from './pages/UserManagementPage';
import AccessDeniedPage from './pages/AccessDeniedPage';
import { useAuthStore } from './store/authStore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';
import { getUserProfile } from './firebase/firestore';

// Protected Route Guard
function ProtectedRoute({ allowedRoles }: { allowedRoles?: string[] }) {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  // If loading user state (e.g. Firebase auto-login check)
  if (isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-on-surface-variant font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <AccessDeniedPage />;
  }

  return <Outlet />;
}

// Layout Shell with responsive sidebar
function LayoutShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar — always visible on lg+, drawer on smaller */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Dynamic Content Area — pushed right on lg+ */}
      <div className="flex-1 flex flex-col min-h-screen lg:pl-[272px] transition-[padding] duration-300">
        <Header onToggleSidebar={() => setSidebarOpen(prev => !prev)} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          if (profile?.disabled) {
            await auth.signOut();
            setProfile(null);
            setLoading(false);
            return;
          }
          const defaultProfile = profile || {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.email?.split('@')[0] || 'User',
            role: 'viewer' as const,
            createdAt: new Date().toISOString(),
            disabled: false
          };
          setProfile(defaultProfile);
        } catch (e) {
          console.error("Failed to load user profile:", e);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setProfile, setLoading]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Path */}
          <Route path="/login" element={<LoginPage />} />

          {/* Secure Pages Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<LayoutShell />}>
              
              {/* Dashboard Route (super_admin, admin, viewer) */}
              <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'viewer']} />}>
                <Route path="/" element={<DashboardPage />} />
              </Route>

              {/* Verification Route (super_admin, issuer, viewer) */}
              <Route element={<ProtectedRoute allowedRoles={['super_admin', 'issuer', 'viewer']} />}>
                <Route path="/verify" element={<VerificationPage />} />
              </Route>

              {/* Analytics Route (super_admin, admin, viewer) */}
              <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'viewer']} />}>
                <Route path="/analytics" element={<AnalyticsPage />} />
              </Route>

              {/* Designer Route (super_admin, admin, issuer) */}
              <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'issuer']} />}>
                <Route path="/designer" element={<DesignerPage />} />
              </Route>

              {/* Recipients Route (super_admin, admin) */}
              <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin']} />}>
                <Route path="/recipients" element={<RecipientsPage />} />
              </Route>

              {/* Generation Route (super_admin, admin, issuer) */}
              <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'issuer']} />}>
                <Route path="/generation" element={<GenerationPage />} />
              </Route>

              {/* Campaigns/Certificates Route (super_admin, admin) */}
              <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin']} />}>
                <Route path="/campaigns" element={<CampaignPage />} />
              </Route>

              {/* Settings Route (super_admin only) */}
              <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              {/* User Management Route (super_admin only) */}
              <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
                <Route path="/users" element={<UserManagementPage />} />
              </Route>

            </Route>
          </Route>

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

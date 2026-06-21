import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function AccessDeniedPage() {
  const navigate = useNavigate();
  const { signOut, user } = useAuthStore();

  const handleGoBack = () => {
    // Navigate to a safe default page based on role
    if (!user) {
      navigate('/login');
      return;
    }
    
    switch (user.role) {
      case 'super_admin':
        navigate('/users');
        break;
      case 'admin':
        navigate('/');
        break;
      case 'issuer':
        navigate('/designer');
        break;
      case 'viewer':
      default:
        navigate('/');
        break;
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 text-xs font-sans bg-surface-container-lowest">
      <div className="max-w-md w-full bg-white border border-outline-variant rounded-2xl shadow-xl p-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
          <span className="material-symbols-outlined text-4xl select-none" style={{ fontVariationSettings: "'FILL' 1" }}>gpp_maybe</span>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-on-surface tracking-tight">403 Access Denied</h1>
          <p className="text-on-surface-variant leading-relaxed">
            Your current security role (<strong className="text-secondary font-mono">{user?.role || 'unknown'}</strong>) does not have authorization to view this area.
          </p>
        </div>

        <div className="p-4 bg-surface-container-low border border-outline-variant/60 rounded-xl text-left space-y-1.5 opacity-80">
          <p className="font-bold text-on-surface">Required Permissions:</p>
          <p className="text-on-surface-variant">Please contact a System Administrator or Super Admin if you believe this is an error.</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleGoBack}
            className="flex-1 bg-secondary text-white font-bold py-2.5 rounded-lg shadow hover:opacity-90 active:scale-95 transition-all"
          >
            Go to Safe Zone
          </button>
          <button
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
            className="flex-1 border border-outline font-semibold py-2.5 rounded-lg hover:bg-surface-container-low transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

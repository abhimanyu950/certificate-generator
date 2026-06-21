import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, resetPassword } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password reset flow
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Google Sign-In failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await resetPassword(resetEmail);
      setSuccessMsg('A password reset link has been sent to your email.');
      setIsResetMode(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to send password reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  // Demo account role login simulation (for local evaluation/testing)
  const handleDemoLogin = (role: 'Super Admin' | 'Admin' | 'Issuer' | 'Viewer') => {
    const demoProfile = {
      uid: `demo_${role.toLowerCase().replace(' ', '_')}`,
      email: `${role.toLowerCase().replace(' ', '')}@certforge.pro`,
      name: `${role} Demo User`,
      role: role,
      createdAt: new Date().toISOString(),
      disabled: false
    };
    useAuthStore.setState({ user: demoProfile, isAuthenticated: true, isLoading: false });
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center p-6 text-xs font-sans">
      <div className="max-w-md w-full bg-white border border-[#c6c6cd] rounded-2xl shadow-xl p-8 space-y-6 animate-in zoom-in-95 duration-200">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-extrabold text-[#0b1c30] tracking-tight">🏆 CertForge Pro</h1>
          <p className="text-[#45464d] text-xs">Sign in to manage and issue secure enterprise credentials</p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-center font-medium">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-green-50 text-green-700 border border-green-200 rounded-lg p-3 text-center font-medium">
            {successMsg}
          </div>
        )}

        {!isResetMode ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[10px]">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2 outline-none focus:ring-1 focus:ring-secondary/50 bg-surface-container-low"
                placeholder="admin@certforge.pro"
                required
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block font-semibold text-on-surface-variant uppercase text-[10px]">Password</label>
                <button
                  type="button"
                  onClick={() => setIsResetMode(true)}
                  className="text-secondary font-bold hover:underline text-[9px] uppercase tracking-wider"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant pl-3 pr-10 py-2 outline-none focus:ring-1 focus:ring-secondary/50 bg-surface-container-low"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/75 hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#712ae2] text-white font-bold py-2.5 rounded-lg hover:opacity-90 active:scale-95 shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full border border-outline-variant hover:bg-surface-container-low text-on-surface font-semibold py-2.5 rounded-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Sign In with Google
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <h2 className="text-sm font-bold text-on-surface uppercase border-b pb-1">Reset Password</h2>
            <p className="text-on-surface-variant text-[11px]">Enter your email address and we'll send you a recovery link.</p>
            <div>
              <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[10px]">Email Address</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2 outline-none focus:ring-1 focus:ring-secondary/50 bg-surface-container-low"
                placeholder="your-email@example.com"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsResetMode(false)}
                className="flex-1 border border-outline rounded-lg py-2 font-semibold hover:bg-surface-container"
              >
                Back to Sign In
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-secondary text-white font-bold py-2 rounded-lg hover:opacity-90 active:scale-95 shadow-md"
              >
                {isLoading ? 'Sending...' : 'Send Link'}
              </button>
            </div>
          </form>
        )}

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-outline-variant"></div>
          <span className="flex-shrink mx-4 text-on-surface-variant uppercase font-bold text-[9px] tracking-widest">Evaluate Sandbox presets</span>
          <div className="flex-grow border-t border-outline-variant"></div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <button
            onClick={() => handleDemoLogin('Super Admin')}
            className="p-2 border rounded-lg hover:bg-secondary/5 hover:border-secondary font-bold text-on-surface text-[10px]"
          >
            Super Admin
          </button>
          <button
            onClick={() => handleDemoLogin('Admin')}
            className="p-2 border rounded-lg hover:bg-secondary/5 hover:border-secondary font-bold text-on-surface text-[10px]"
          >
            Admin
          </button>
          <button
            onClick={() => handleDemoLogin('Issuer')}
            className="p-2 border rounded-lg hover:bg-secondary/5 hover:border-secondary font-bold text-on-surface text-[10px]"
          >
            Issuer
          </button>
          <button
            onClick={() => handleDemoLogin('Viewer')}
            className="p-2 border rounded-lg hover:bg-secondary/5 hover:border-secondary font-bold text-on-surface text-[10px]"
          >
            Viewer
          </button>
        </div>
      </div>
    </div>
  );
}

import { create } from 'zustand';
import { AuthService } from '../services/auth.service';
import { AuditService } from '../services/audit.service';
import type { UserProfile } from '../firebase/firestore';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, pass: string) => Promise<UserProfile>;
  signInWithGoogle: () => Promise<UserProfile>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  signIn: async (email, pass) => {
    set({ isLoading: true });
    try {
      const profile = await AuthService.emailLogin(email, pass);
      set({ user: profile, isAuthenticated: true, isLoading: false });
      
      // Log LOGIN_SUCCESS asynchronously
      AuditService.logEvent({
        action: 'LOGIN_SUCCESS',
        userId: profile.uid,
        entityType: 'user',
        entityId: profile.uid,
        metadata: { email: profile.email, name: profile.name, role: profile.role }
      });

      return profile;
    } catch (e: any) {
      set({ isLoading: false });
      
      // Log LOGIN_FAILED asynchronously
      AuditService.logEvent({
        action: 'LOGIN_FAILED',
        userId: 'anonymous',
        entityType: 'user',
        entityId: email,
        metadata: { email, error: e.message || String(e) }
      });

      throw e;
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true });
    try {
      const profile = await AuthService.googleSignIn();
      set({ user: profile, isAuthenticated: true, isLoading: false });
      
      // Log LOGIN_SUCCESS asynchronously
      AuditService.logEvent({
        action: 'LOGIN_SUCCESS',
        userId: profile.uid,
        entityType: 'user',
        entityId: profile.uid,
        metadata: { email: profile.email, name: profile.name, role: profile.role, method: 'google' }
      });

      return profile;
    } catch (e: any) {
      set({ isLoading: false });
      
      // Log LOGIN_FAILED asynchronously
      AuditService.logEvent({
        action: 'LOGIN_FAILED',
        userId: 'anonymous',
        entityType: 'user',
        entityId: 'google_oauth',
        metadata: { error: e.message || String(e) }
      });

      throw e;
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    const currentUserId = useAuthStore.getState().user?.uid || 'unknown';
    const currentUserEmail = useAuthStore.getState().user?.email || 'unknown';
    try {
      await AuthService.logout();
      set({ user: null, isAuthenticated: false, isLoading: false });
      
      // Log LOGOUT asynchronously
      AuditService.logEvent({
        action: 'LOGOUT',
        userId: currentUserId,
        entityType: 'user',
        entityId: currentUserId,
        metadata: { email: currentUserEmail }
      });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  resetPassword: async (email) => {
    try {
      await AuthService.resetUserPassword(email);
    } catch (e) {
      throw e;
    }
  },

  setProfile: (profile) => set({ user: profile, isAuthenticated: !!profile }),
  setLoading: (loading) => set({ isLoading: loading })
}));

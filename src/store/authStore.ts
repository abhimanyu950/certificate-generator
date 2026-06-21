import { create } from 'zustand';
import { AuthService } from '../services/auth.service';
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
      return profile;
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true });
    try {
      const profile = await AuthService.googleSignIn();
      set({ user: profile, isAuthenticated: true, isLoading: false });
      return profile;
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await AuthService.logout();
      set({ user: null, isAuthenticated: false, isLoading: false });
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

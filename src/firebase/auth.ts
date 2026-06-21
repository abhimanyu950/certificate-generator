import { auth } from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  GoogleAuthProvider, 
  signInWithPopup, 
  sendPasswordResetEmail,
  OAuthProvider,
  GithubAuthProvider
} from 'firebase/auth';
import type { UserCredential } from 'firebase/auth';

// Sign in with Email and Password
export const loginWithEmail = async (email: string, pass: string): Promise<UserCredential> => {
  try {
    return await signInWithEmailAndPassword(auth, email, pass);
  } catch (error) {
    console.error('Email sign in error:', error);
    throw error;
  }
};

// Sign in with Google Account popup
export const loginWithGoogle = async (): Promise<UserCredential> => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return await signInWithPopup(auth, provider);
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  }
};

// Sign out current authenticated session
export const logoutUser = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

// Send a password reset invitation link
export const sendPasswordReset = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Password reset link error:', error);
    throw error;
  }
};

// Microsoft Login integration placeholder
export const loginWithMicrosoft = async (): Promise<UserCredential> => {
  try {
    const provider = new OAuthProvider('microsoft.com');
    // Configure standard tenants/scopes if required
    return await signInWithPopup(auth, provider);
  } catch (error) {
    console.error('Microsoft sign in error:', error);
    throw error;
  }
};

// GitHub Login integration placeholder
export const loginWithGitHub = async (): Promise<UserCredential> => {
  try {
    const provider = new GithubAuthProvider();
    return await signInWithPopup(auth, provider);
  } catch (error) {
    console.error('GitHub sign in error:', error);
    throw error;
  }
};

import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig } from './firebase';
import { 
  loginWithEmail, 
  loginWithGoogle, 
  logoutUser, 
  sendPasswordReset 
} from '../firebase/auth';
import { 
  getUserProfile, 
  createUserProfile, 
  updateUserProfile, 
  deleteUserProfile, 
  getActiveUserProfiles
} from '../firebase/firestore';
import type { UserProfile } from '../firebase/firestore';

export class AuthService {
  // Signs in via Email, fetches Firestore profile, rejects if account is disabled.
  static async emailLogin(email: string, pass: string): Promise<UserProfile> {
    const cred = await loginWithEmail(email, pass);
    const profile = await getUserProfile(cred.user.uid);

    if (profile?.disabled) {
      await logoutUser();
      throw new Error('Your user account has been disabled. Please contact a Super Admin.');
    }

    if (!profile) {
      // If profile is missing, initialize a Viewer profile
      const newProfile: UserProfile = {
        uid: cred.user.uid,
        email: cred.user.email || email,
        name: email.split('@')[0],
        role: 'viewer',
        createdAt: new Date().toISOString(),
        disabled: false
      };
      await createUserProfile(cred.user.uid, newProfile);
      return newProfile;
    }

    // Update lastLogin timestamp
    await updateUserProfile(cred.user.uid, { lastLogin: new Date().toISOString() });
    return { ...profile, lastLogin: new Date().toISOString() };
  }

  // Signs in via Google popup, fetches/registers profile, rejects if disabled.
  static async googleSignIn(): Promise<UserProfile> {
    const cred = await loginWithGoogle();
    const profile = await getUserProfile(cred.user.uid);

    if (profile?.disabled) {
      await logoutUser();
      throw new Error('Your user account has been disabled. Please contact a Super Admin.');
    }

    if (!profile) {
      // Create new profile for first-time Google sign-in users
      const newProfile: UserProfile = {
        uid: cred.user.uid,
        email: cred.user.email || '',
        name: cred.user.displayName || cred.user.email?.split('@')[0] || 'Google User',
        role: 'viewer',
        createdAt: new Date().toISOString(),
        disabled: false
      };
      await createUserProfile(cred.user.uid, newProfile);
      return newProfile;
    }

    // Update lastLogin
    await updateUserProfile(cred.user.uid, { lastLogin: new Date().toISOString() });
    return { ...profile, lastLogin: new Date().toISOString() };
  }

  // Signs out
  static async logout(): Promise<void> {
    await logoutUser();
  }

  // Resets password
  static async resetUserPassword(email: string): Promise<void> {
    await sendPasswordReset(email);
  }

  // Super Admin Action: Create user inside Firebase Auth without breaking current session
  static async adminCreateUser(
    email: string, 
    pass: string, 
    name: string, 
    role: UserProfile['role'],
    org?: string
  ): Promise<string> {
    // Instantiate temporary secondary app to register user
    const tempAppName = `temp_auth_app_${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
      const userCred = await createUserWithEmailAndPassword(tempAuth, email, pass);
      const newUid = userCred.user.uid;

      // Register profile in Firestore
      await createUserProfile(newUid, {
        email,
        name,
        role,
        org: org || '',
        createdAt: new Date().toISOString(),
        disabled: false
      });

      // Cleanup
      await tempAuth.signOut();
      await deleteApp(tempApp);
      return newUid;
    } catch (error) {
      // Ensure app is cleaned up on failure
      try {
        await deleteApp(tempApp);
      } catch (err) {}
      console.error('Admin create user error:', error);
      throw error;
    }
  }

  // Super Admin Action: Disable/Enable user
  static async adminToggleUserStatus(uid: string, disabled: boolean): Promise<void> {
    await updateUserProfile(uid, { disabled });
  }

  // Super Admin Action: Change User Role
  static async adminChangeUserRole(uid: string, role: UserProfile['role']): Promise<void> {
    await updateUserProfile(uid, { role });
  }

  // Super Admin Action: Delete User Document
  static async adminDeleteUser(uid: string): Promise<void> {
    await deleteUserProfile(uid);
  }

  // Super Admin Action: Fetch All Users list
  static async adminListUsers(): Promise<UserProfile[]> {
    return await getActiveUserProfiles();
  }

  // Super Admin Action: Edit User Profile (Name, Org, Role)
  static async adminUpdateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    await updateUserProfile(uid, updates);
  }
}

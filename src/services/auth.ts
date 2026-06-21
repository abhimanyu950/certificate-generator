import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export type UserRole = 'super_admin' | 'admin' | 'issuer' | 'viewer';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  org?: string;
  createdAt: string;
}

// Get user profile from Firestore
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

// Create a new user profile in Firestore (for seed/auth registration)
export const createUserProfile = async (uid: string, profile: Omit<UserProfile, 'uid'>): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, { ...profile, uid }, { merge: true });
  } catch (error) {
    console.error('Error creating user profile:', error);
  }
};

import { db, auth } from '../services/firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  displayName?: string;
  role: 'super_admin' | 'admin' | 'issuer' | 'viewer';
  org?: string;
  createdAt: string;
  lastLogin?: string;
  disabled?: boolean;
}

// Fetch user profile from Firestore users collection
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    let docSnap;
    try {
      docSnap = await getDoc(userDocRef);
    } catch (e: any) {
      if (e.code === 'permission-denied' || e.message?.includes('permission') || e.message?.includes('denied')) {
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.uid === uid) {
          const newProfile = {
            uid: uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
            role: 'viewer',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            disabled: false
          };
          await setDoc(userDocRef, newProfile);
          return {
            ...newProfile,
            name: newProfile.displayName,
            role: 'viewer'
          } as UserProfile;
        }
      }
      throw e;
    }

    if (docSnap.exists()) {
      const data = docSnap.data();
      const role = data.role === 'SUPER_ADMIN' ? 'super_admin' : data.role;
      return {
        ...data,
        role,
        name: data.name || data.displayName || data.email?.split('@')[0] || 'User'
      } as UserProfile;
    }

    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === uid) {
      const newProfile = {
        uid: uid,
        email: currentUser.email || '',
        displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
        role: 'viewer',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        disabled: false
      };
      await setDoc(userDocRef, newProfile);
      return {
        ...newProfile,
        name: newProfile.displayName,
        role: 'viewer'
      } as UserProfile;
    }

    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

// Create or overwrite a user profile in Firestore
export const createUserProfile = async (uid: string, profile: Omit<UserProfile, 'uid'>): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, { ...profile, uid }, { merge: true });
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

// Update an existing user profile (e.g. role change or disabled state)
export const updateUserProfile = async (uid: string, updates: Partial<UserProfile>): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, updates as any);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Delete user profile document from Firestore users collection
export const deleteUserProfile = async (uid: string): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    await deleteDoc(userDocRef);
  } catch (error) {
    console.error('Error deleting user profile:', error);
    throw error;
  }
};

// Fetch list of all user profiles in users collection
export const getActiveUserProfiles = async (): Promise<UserProfile[]> => {
  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    const list: UserProfile[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as UserProfile);
    });
    return list;
  } catch (error) {
    console.error('Error listing user profiles:', error);
    throw error;
  }
};

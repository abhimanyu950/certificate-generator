import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const uploadAssetToStorage = async (
  file: File,
  folder: 'logos' | 'backgrounds'
): Promise<string> => {
  try {
    const fileRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(fileRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error) {
    console.warn('Firebase Storage upload failed, falling back to local FileReader:', error);
    // Fallback: Read as base64 Data URL (allows offline operation)
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('FileReader returned empty result'));
        }
      };
      reader.onerror = () => reject(new Error('FileReader encountered an error'));
      reader.readAsDataURL(file);
    });
  }
};

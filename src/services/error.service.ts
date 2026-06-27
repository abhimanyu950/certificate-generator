import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface SystemError {
  errorType:
    | 'PDF_GENERATION_FAILED'
    | 'STORAGE_UPLOAD_FAILED'
    | 'FIRESTORE_WRITE_FAILED'
    | 'EMAILJS_FAILED'
    | 'VERIFICATION_FAILED'
    | 'SECURITY_VIOLATION';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack?: string;
  timestamp?: any;
  userId: string;
}

export class ErrorService {
  /**
   * Log an error in the `system_errors` collection.
   */
  static async logError(error: Omit<SystemError, 'timestamp'>): Promise<void> {
    try {
      const activeUserId = error.userId || auth.currentUser?.uid || 'anonymous';
      
      const logData = {
        errorType: error.errorType,
        severity: error.severity,
        message: error.message,
        stack: error.stack || '',
        timestamp: serverTimestamp(),
        userId: activeUserId
      };

      const errorsCol = collection(db, 'system_errors');
      await addDoc(errorsCol, logData);
    } catch (err) {
      console.error('Failed to write system error to firestore:', err);
    }
  }
}

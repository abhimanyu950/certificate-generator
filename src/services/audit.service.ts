import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface AuditLog {
  action:
    | 'CERTIFICATE_GENERATED'
    | 'CERTIFICATE_DOWNLOADED'
    | 'CERTIFICATE_VERIFIED'
    | 'CERTIFICATE_REVOKED'
    | 'RECIPIENT_CREATED'
    | 'RECIPIENT_IMPORTED'
    | 'RECIPIENT_UPDATED'
    | 'TEMPLATE_CREATED'
    | 'TEMPLATE_UPDATED'
    | 'TEMPLATE_DELETED'
    | 'EMAIL_SENT'
    | 'EMAIL_DELIVERED'
    | 'EMAIL_FAILED'
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'LOGOUT';
  userId: string;
  timestamp?: any;
  entityType: 'certificate' | 'template' | 'recipient' | 'user' | 'system';
  entityId: string;
  metadata: Record<string, any>;
}

export class AuditService {
  /**
   * Log an event in the `audit_logs` collection.
   * If `userId` is empty/undefined, it will attempt to extract it from the current auth session.
   */
  static async logEvent(event: Omit<AuditLog, 'timestamp'>): Promise<void> {
    try {
      const activeUserId = event.userId || auth.currentUser?.uid || 'public';
      
      const logData = {
        action: event.action,
        userId: activeUserId,
        timestamp: serverTimestamp(),
        entityType: event.entityType,
        entityId: event.entityId,
        metadata: event.metadata || {}
      };

      const logsCol = collection(db, 'audit_logs');
      await addDoc(logsCol, logData);
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }
}

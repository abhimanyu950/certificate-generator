import { db } from './firebase';
import { 
  collection, 
  getDocs, 
  getDoc,
  doc, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';

export interface MonthlyTrend {
  month: string;
  Issued: number;
  Verified: number;
}

export interface EmailMetrics {
  successRate: number;
  totalSent: number;
  totalFailed: number;
}

export interface TemplateStat {
  rank: string;
  name: string;
  count: number;
}

export interface ActiveUser {
  name: string;
  email: string;
  role: string;
  count: number;
}

export class AnalyticsService {
  /**
   * Get total certificates issued.
   */
  static async getTotalCertificates(): Promise<number> {
    try {
      const certsCol = collection(db, 'certificates');
      const snapshot = await getDocs(certsCol);
      return snapshot.size;
    } catch (e) {
      console.error('Error in getTotalCertificates:', e);
      return 0;
    }
  }

  /**
   * Get verification rate and total verified certificates.
   */
  static async getVerificationRate(): Promise<{ rate: number; totalVerified: number; totalChecks: number }> {
    try {
      const logsCol = collection(db, 'audit_logs');
      const q = query(logsCol, where('action', '==', 'CERTIFICATE_VERIFIED'));
      const snapshot = await getDocs(q);
      
      let totalVerified = 0;
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.metadata?.isValid === true) {
          totalVerified++;
        }
      });

      const totalChecks = snapshot.size;
      const rate = totalChecks > 0 ? (totalVerified / totalChecks) * 100 : 0;
      
      return { rate, totalVerified, totalChecks };
    } catch (e) {
      console.error('Error in getVerificationRate:', e);
      return { rate: 0, totalVerified: 0, totalChecks: 0 };
    }
  }

  /**
   * Get monthly issuance and verification trends for the last 6 months.
   */
  static async getMonthlyIssuance(): Promise<MonthlyTrend[]> {
    try {
      const certsCol = collection(db, 'certificates');
      const certsSnapshot = await getDocs(certsCol);
      
      const logsCol = collection(db, 'audit_logs');
      const verifQuery = query(logsCol, where('action', '==', 'CERTIFICATE_VERIFIED'));
      const verifSnapshot = await getDocs(verifQuery);

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const counts: Record<string, { Issued: number; Verified: number }> = {};
      
      const result: MonthlyTrend[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const mName = months[d.getMonth()];
        counts[mName] = { Issued: 0, Verified: 0 };
        result.push({ month: mName, Issued: 0, Verified: 0 });
      }

      certsSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        let date: Date | null = null;
        if (data.issuedAt) {
          if (typeof data.issuedAt.toDate === 'function') {
            date = data.issuedAt.toDate();
          } else {
            date = new Date(data.issuedAt);
          }
        }
        if (date && !isNaN(date.getTime())) {
          const mName = months[date.getMonth()];
          if (counts[mName]) {
            counts[mName].Issued++;
          }
        }
      });

      verifSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.metadata?.isValid === true) {
          let date: Date | null = null;
          if (data.timestamp) {
            if (typeof data.timestamp.toDate === 'function') {
              date = data.timestamp.toDate();
            } else {
              date = new Date(data.timestamp);
            }
          }
          if (date && !isNaN(date.getTime())) {
            const mName = months[date.getMonth()];
            if (counts[mName]) {
              counts[mName].Verified++;
            }
          }
        }
      });

      return result.map(r => ({
        month: r.month,
        Issued: counts[r.month].Issued,
        Verified: counts[r.month].Verified
      }));
    } catch (e) {
      console.error('Error in getMonthlyIssuance:', e);
      return [];
    }
  }

  /**
   * Get email metrics success rate and counts.
   */
  static async getEmailMetrics(): Promise<EmailMetrics> {
    try {
      const logsCol = collection(db, 'audit_logs');
      const snapshot = await getDocs(logsCol);
      
      let sentCount = 0;
      let failedCount = 0;
      
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.action === 'EMAIL_SENT') {
          sentCount++;
        } else if (data.action === 'EMAIL_FAILED') {
          failedCount++;
        }
      });
      
      const successRate = (sentCount + failedCount) > 0 ? (sentCount / (sentCount + failedCount)) * 100 : 100;
      return { successRate, totalSent: sentCount, totalFailed: failedCount };
    } catch (e) {
      console.error('Error in getEmailMetrics:', e);
      return { successRate: 100, totalSent: 0, totalFailed: 0 };
    }
  }

  /**
   * Get recent audit activities.
   */
  static async getRecentActivity(limitCount = 10): Promise<any[]> {
    try {
      const logsCol = collection(db, 'audit_logs');
      const q = query(logsCol, orderBy('timestamp', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          ...data,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp
        });
      });
      return list;
    } catch (e) {
      console.error('Error in getRecentActivity:', e);
      return [];
    }
  }

  /**
   * Get template popularity statistics based on issued certificates.
   */
  static async getTemplateStatistics(): Promise<TemplateStat[]> {
    try {
      const certsCol = collection(db, 'certificates');
      const snapshot = await getDocs(certsCol);
      
      const counts: Record<string, number> = {};
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const title = data.title || 'Standard Professional';
        counts[title] = (counts[title] || 0) + 1;
      });
      
      const sorted = Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
        
      return sorted.slice(0, 5).map((item, idx) => ({
        rank: `0${idx + 1}`.slice(-2),
        name: item.name,
        count: item.count
      }));
    } catch (e) {
      console.error('Error in getTemplateStatistics:', e);
      return [];
    }
  }

  /**
   * Get most active users based on audit logs.
   */
  static async getMostActiveUsers(): Promise<ActiveUser[]> {
    try {
      const logsCol = collection(db, 'audit_logs');
      const snapshot = await getDocs(logsCol);
      
      const counts: Record<string, number> = {};
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const uid = data.userId;
        if (uid && uid !== 'public' && uid !== 'anonymous') {
          counts[uid] = (counts[uid] || 0) + 1;
        }
      });

      const activeUids = Object.keys(counts);
      const usersList: ActiveUser[] = [];
      
      for (const uid of activeUids) {
        try {
          const userDocRef = doc(db, 'users', uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            usersList.push({
              name: userData.name || 'Admin User',
              email: userData.email || '',
              role: userData.role || 'Admin',
              count: counts[uid]
            });
          } else {
            usersList.push({
              name: 'System Operator',
              email: 'admin@certforge.pro',
              role: 'Admin',
              count: counts[uid]
            });
          }
        } catch (e) {
          console.error(`Error loading user ${uid}:`, e);
        }
      }

      return usersList.sort((a, b) => b.count - a.count).slice(0, 5);
    } catch (e) {
      console.error('Error in getMostActiveUsers:', e);
      return [];
    }
  }

  /**
   * Get hourly verification traffic counts for the last 9 hours.
   */
  static async getVerificationTraffic(): Promise<{ time: string; count: number }[]> {
    try {
      const logsCol = collection(db, 'audit_logs');
      const q = query(logsCol, where('action', '==', 'CERTIFICATE_VERIFIED'));
      const snapshot = await getDocs(q);
      const hoursMap: Record<string, number> = {};
      
      const result: { time: string; count: number }[] = [];
      for (let i = 8; i >= 0; i--) {
        const d = new Date();
        d.setHours(d.getHours() - i);
        const timeStr = `${`0${d.getHours()}`.slice(-2)}:00`;
        hoursMap[timeStr] = 0;
        result.push({ time: timeStr, count: 0 });
      }

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        let date: Date | null = null;
        if (data.timestamp) {
          if (typeof data.timestamp.toDate === 'function') {
            date = data.timestamp.toDate();
          } else {
            date = new Date(data.timestamp);
          }
        }
        if (date) {
          const timeStr = `${`0${date.getHours()}`.slice(-2)}:00`;
          if (hoursMap[timeStr] !== undefined) {
            hoursMap[timeStr]++;
          }
        }
      });

      return result.map(r => ({
        time: r.time,
        count: hoursMap[r.time]
      }));
    } catch (e) {
      console.error('Error in getVerificationTraffic:', e);
      return [];
    }
  }

  /**
   * Get certificates issued today.
   */
  static async getCertificatesIssuedToday(): Promise<number> {
    try {
      const certsCol = collection(db, 'certificates');
      const snapshot = await getDocs(certsCol);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      let count = 0;
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        let date: Date | null = null;
        if (data.issuedAt) {
          date = data.issuedAt.toDate ? data.issuedAt.toDate() : new Date(data.issuedAt);
        }
        if (date && date >= startOfToday) {
          count++;
        }
      });
      return count;
    } catch (e) {
      console.error('Error in getCertificatesIssuedToday:', e);
      return 0;
    }
  }

  /**
   * Get certificates issued this month.
   */
  static async getCertificatesIssuedThisMonth(): Promise<number> {
    try {
      const certsCol = collection(db, 'certificates');
      const snapshot = await getDocs(certsCol);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      let count = 0;
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        let date: Date | null = null;
        if (data.issuedAt) {
          date = data.issuedAt.toDate ? data.issuedAt.toDate() : new Date(data.issuedAt);
        }
        if (date && date >= startOfMonth) {
          count++;
        }
      });
      return count;
    } catch (e) {
      console.error('Error in getCertificatesIssuedThisMonth:', e);
      return 0;
    }
  }

  /**
   * Get verification requests today.
   */
  static async getVerificationRequestsToday(): Promise<number> {
    try {
      const logsCol = collection(db, 'audit_logs');
      const q = query(logsCol, where('action', '==', 'CERTIFICATE_VERIFIED'));
      const snapshot = await getDocs(q);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      let count = 0;
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        let date: Date | null = null;
        if (data.timestamp) {
          date = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
        }
        if (date && date >= startOfToday) {
          count++;
        }
      });
      return count;
    } catch (e) {
      console.error('Error in getVerificationRequestsToday:', e);
      return 0;
    }
  }

  /**
   * Get active users count.
   */
  static async getActiveUsersCount(): Promise<number> {
    try {
      const usersCol = collection(db, 'users');
      const snapshot = await getDocs(usersCol);
      let count = 0;
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.disabled !== true) {
          count++;
        }
      });
      return count;
    } catch (e) {
      console.error('Error in getActiveUsersCount:', e);
      return 0;
    }
  }

  /**
   * Get revoked certificates count.
   */
  static async getRevokedCertificatesCount(): Promise<number> {
    try {
      const certsCol = collection(db, 'certificates');
      const q = query(certsCol, where('status', '==', 'revoked'));
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (e) {
      console.error('Error in getRevokedCertificatesCount:', e);
      return 0;
    }
  }

  /**
   * Get Firestore and Storage operations estimate for Cost Monitoring.
   */
  static async getResourceUsageEstimate(): Promise<{
    reads: number;
    writes: number;
    storageGb: number;
    estimatedCost: number;
  }> {
    try {
      // Fetch collections to count documents representing reads/writes
      const certs = await getDocs(collection(db, 'certificates'));
      const logs = await getDocs(collection(db, 'audit_logs'));
      const emailLogs = await getDocs(collection(db, 'email_logs'));

      const certsCount = certs.size;
      const logsCount = logs.size;
      const emailCount = emailLogs.size;

      // Operations Estimates
      // Writes = certificates + audit logs + email logs + system errors
      const writes = certsCount + logsCount + emailCount;
      // Reads = roughly 10x writes (simulated user queries, dashboards reads) + active lookups
      const reads = (writes * 10) + 1500;

      // Costs: Firestore Reads ($0.06/100k), Firestore Writes ($0.18/100k)
      const firestoreReadCost = (reads / 100000) * 0.06;
      const firestoreWriteCost = (writes / 100000) * 0.18;

      const estimatedCost = firestoreReadCost + firestoreWriteCost;

      return {
        reads,
        writes,
        storageGb: 0,
        estimatedCost: parseFloat(estimatedCost.toFixed(2))
      };
    } catch (e) {
      console.error('Error in getResourceUsageEstimate:', e);
      return { reads: 0, writes: 0, storageGb: 0, estimatedCost: 0 };
    }
  }

  /**
   * Get Security Events feed from audit logs.
   */
  static async getSecurityEvents(limitCount = 50): Promise<any[]> {
    try {
      const logsCol = collection(db, 'audit_logs');
      const snapshot = await getDocs(logsCol);
      
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (
          data.action === 'LOGIN_FAILED' ||
          data.action === 'PERMISSION_DENIED' ||
          data.action === 'SECURITY_ALERT' ||
          data.action === 'USER_DISABLED' ||
          data.action === 'CERTIFICATE_REVOKED'
        ) {
          list.push({
            id: docSnap.id,
            ...data,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp
          });
        }
      });

      // Sort by timestamp desc and limit
      return list
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limitCount);
    } catch (e) {
      console.error('Error in getSecurityEvents:', e);
      return [];
    }
  }
}


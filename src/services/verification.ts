import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { computeCertificateHash } from '../utils/crypto';

export interface VerificationResult {
  isValid: boolean;
  status: 'valid' | 'revoked' | 'not_found' | 'compromised';
  certificateData?: any;
  reason?: string;
}

export const verifyCertificate = async (certId: string): Promise<VerificationResult> => {
  try {
    const certDocRef = doc(db, 'certificates', certId);
    const docSnap = await getDoc(certDocRef);

    if (!docSnap.exists()) {
      return {
        isValid: false,
        status: 'not_found',
        reason: 'Certificate ID not found'
      };
    }

    const data = docSnap.data();
    
    if (data.status === 'revoked') {
      return {
        isValid: false,
        status: 'revoked',
        certificateData: data,
        reason: 'This certificate has been revoked'
      };
    }

    // Recompute hash
    const computedHash = await computeCertificateHash({
      certId: data.certId,
      recipientName: data.name,
      courseName: data.course,
      issueDate: data.date,
      issuerName: data.issuedBy
    });

    // If the hash is missing in the database, we check against database data.
    // If it exists in the database, compare it.
    if (data.hash && data.hash !== computedHash) {
      console.warn('Hash mismatch! Computed:', computedHash, 'Stored:', data.hash);
      return {
        isValid: false,
        status: 'compromised',
        certificateData: data,
        reason: 'Cryptographic integrity check failed (compromised data)'
      };
    }

    return {
      isValid: true,
      status: 'valid',
      certificateData: data
    };
  } catch (error: any) {
    console.error('Verification error:', error);
    return {
      isValid: false,
      status: 'compromised',
      reason: 'Verification error: ' + error.message
    };
  }
};

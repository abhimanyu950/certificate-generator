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

    // Recompute hash
    const computedHash = await computeCertificateHash({
      certId: data.certificateId || '',
      recipientName: data.recipientName || '',
      courseName: data.course || '',
      issueDate: data.issueDate || '',
      issuerName: data.organizationName || ''
    });

    // Compare stored sha256 hash with computed hash
    if (!data.sha256 || data.sha256 !== computedHash) {
      console.warn('Hash mismatch! Computed:', computedHash, 'Stored:', data.sha256);
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

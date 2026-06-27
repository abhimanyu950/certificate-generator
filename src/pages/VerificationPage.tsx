import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { verifyCertificate } from '../services/verification';
import type { VerificationResult } from '../services/verification';
import { downloadPDFBlob } from '../utils/pdf';
import { AuditService } from '../services/audit.service';
import { ErrorService } from '../services/error.service';

export default function VerificationPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [certIdInput, setCertIdInput] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const queryId = id || searchParams.get('id');

  const executeVerification = async (id: string) => {
    if (!id.trim()) return;
    setIsValidating(true);
    setResult(null);
    
    // Simulate minor delay for authentic validation feel
    await new Promise(r => setTimeout(r, 600));

    // Rate-limit check (Excessive Verification Requests)
    const now = Date.now();
    const verificationAttemptsKey = 'cf_verification_attempts';
    const attemptsStr = localStorage.getItem(verificationAttemptsKey) || '[]';
    let attempts: number[] = JSON.parse(attemptsStr);
    attempts = attempts.filter(t => now - t < 60000); // 1 minute window
    attempts.push(now);
    localStorage.setItem(verificationAttemptsKey, JSON.stringify(attempts));

    if (attempts.length >= 10) {
      console.warn('Excessive verification requests detected');
    }

    const check = await verifyCertificate(id.trim());
    setResult(check);
    setIsValidating(false);

    // If verification failed or is compromised, log system error
    if (!check.isValid) {
      await ErrorService.logError({
        errorType: 'VERIFICATION_FAILED',
        severity: check.status === 'compromised' ? 'high' : 'medium',
        message: check.reason || 'Certificate verification failed',
        userId: 'public'
      });
    }

    // Log CERTIFICATE_VERIFIED event
    await AuditService.logEvent({
      action: 'CERTIFICATE_VERIFIED',
      userId: '',
      entityType: 'certificate',
      entityId: id.trim(),
      metadata: {
        isValid: check.isValid,
        status: check.status,
        recipientName: check.certificateData?.name || 'unknown',
        course: check.certificateData?.course || 'unknown',
        reason: check.reason || ''
      }
    });
  };

  useEffect(() => {
    if (queryId) {
      setCertIdInput(queryId);
      executeVerification(queryId);
    }
  }, [queryId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeVerification(certIdInput);
  };

  const handleDownloadPDF = () => {
    const certData = result?.certificateData;
    if (!certData) return;

    // Log CERTIFICATE_DOWNLOADED event
    AuditService.logEvent({
      action: 'CERTIFICATE_VERIFIED', // Changed from DOWNLOADED as we don't store PDF
      userId: '',
      entityType: 'certificate',
      entityId: certData.certificateId || 'unknown',
      metadata: {
        name: certData.recipientName,
        course: certData.course
      }
    });

    if (certData.pdf_base64) {
      let base64Data = certData.pdf_base64;
      if (base64Data.startsWith('data:application/pdf;base64,')) {
        base64Data = base64Data.split(',')[1];
      }
      
      const binaryStr = window.atob(base64Data);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'application/pdf' });
      downloadPDFBlob(blob, `Certificate_${certData.recipientName}`);
    } else if (certData.downloadUrl) {
      window.open(certData.downloadUrl, '_blank');
    }
  };

  useEffect(() => {
    if (result && result.isValid && searchParams.get('download') === 'true') {
      handleDownloadPDF();
    }
  }, [result, searchParams]);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Verification Query Card */}
      {!queryId && !result && (
        <div className="bg-white border border-outline-variant rounded-2xl shadow-sm p-6 space-y-4 text-xs">
          <div>
            <h3 className="text-sm font-bold text-on-surface">Secure Verification Portal</h3>
            <p className="text-on-surface-variant">Check validity of certifications signed via CertForge protocols.</p>
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={certIdInput}
              onChange={(e) => setCertIdInput(e.target.value)}
              placeholder="Enter Certificate Verification ID (e.g. CF-171892284)"
              className="flex-1 bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-secondary/50 outline-none"
              required
            />
            <button
              type="submit"
              disabled={isValidating}
              className="bg-secondary text-white font-bold px-4 py-2 rounded-lg hover:opacity-90 active:scale-95 shadow flex items-center gap-1.5"
            >
              {isValidating ? 'Validating...' : 'Verify'}
            </button>
          </form>
        </div>
      )}

      {/* Loading state */}
      {isValidating && (
        <div className="text-center py-12 text-on-surface-variant">
          <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xs font-semibold">Running SHA-256 cryptographic check...</p>
        </div>
      )}

      {/* Results View */}
      {result && !isValidating && (
        <div className="bg-white border border-outline-variant rounded-2xl shadow-xl p-8 text-center animate-in zoom-in-95 duration-200 text-xs">
          {result.status === 'valid' && (
            <>
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <span className="material-symbols-outlined text-4xl select-none" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              </div>
              <h2 className="text-lg font-black text-green-600 uppercase">VALID CERTIFICATE</h2>
              <p className="text-on-surface-variant mt-1 mb-6">This credential matches SHA-256 security protocols.</p>

              <div className="bg-surface-container-low border border-outline-variant p-4 rounded-xl text-left space-y-3 mb-6">
                <div className="flex justify-between border-b pb-1.5 border-outline-variant/30">
                  <span className="text-on-surface-variant font-semibold">Recipient:</span>
                  <span className="font-bold text-on-surface text-right">{result.certificateData.recipientName}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5 border-outline-variant/30">
                  <span className="text-on-surface-variant font-semibold">Course:</span>
                  <span className="font-bold text-on-surface text-right">{result.certificateData.course}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5 border-outline-variant/30">
                  <span className="text-on-surface-variant font-semibold">Issued By:</span>
                  <span className="font-bold text-on-surface text-right">{result.certificateData.organizationName}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5 border-outline-variant/30">
                  <span className="text-on-surface-variant font-semibold">Issue Date:</span>
                  <span className="font-bold text-on-surface text-right">{result.certificateData.issueDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant font-semibold">Certificate ID:</span>
                  <span className="font-mono text-secondary font-bold text-right">{result.certificateData.certificateId}</span>
                </div>
              </div>

              <div className="flex gap-2 justify-center">
                {(result.certificateData.pdf_base64 || result.certificateData.downloadUrl) && (
                  <button
                    onClick={handleDownloadPDF}
                    className="flex-1 bg-secondary text-white font-bold py-2.5 rounded-lg shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">download</span>
                    Download PDF
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="flex-1 border border-outline font-semibold py-2.5 rounded-lg hover:bg-surface-container transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  Print Audit
                </button>
              </div>
            </>
          )}

          {result.status === 'revoked' && (
            <>
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-4xl select-none" style={{ fontVariationSettings: "'FILL' 1" }}>gpp_maybe</span>
              </div>
              <h2 className="text-lg font-black text-amber-600 uppercase">INVALID CERTIFICATE</h2>
              <p className="text-on-surface-variant mt-1 mb-4">This certificate has been revoked by the administrator.</p>

              <div className="p-4 bg-amber-50 text-amber-800 rounded-xl text-left border border-amber-200 mb-6 space-y-2">
                <p className="font-bold">REVOCATION DETAILS:</p>
                <p><span className="font-semibold">Reason:</span> {result.certificateData?.revocationReason || 'No reason specified by administrator.'}</p>
                {result.certificateData?.revokedAt && (
                  <p><span className="font-semibold">Date Revoked:</span> {new Date(result.certificateData.revokedAt).toLocaleString()}</p>
                )}
              </div>
            </>
          )}

          {result.status === 'compromised' && (
            <>
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-4xl select-none" style={{ fontVariationSettings: "'FILL' 1" }}>gpp_bad</span>
              </div>
              <h2 className="text-lg font-black text-red-600 uppercase">INVALID CERTIFICATE</h2>
              <p className="text-on-surface-variant mt-1 mb-4">Cryptographic integrity validation failed.</p>

              <div className="p-4 bg-red-50 text-red-700 rounded-xl font-mono text-[10px] text-left border border-red-200 mb-6">
                WARNING: COMPROMISED DATA! Dynamic SHA-256 hash validation does not match the original digital signature registered at issuance. The certificate text or values may have been tampered with.
              </div>
            </>
          )}

          {result.status === 'not_found' && (
            <>
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-4xl select-none" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
              </div>
              <h2 className="text-lg font-black text-red-600 uppercase">INVALID CERTIFICATE</h2>
              <p className="text-on-surface-variant mt-1 mb-6">The certificate ID you entered is not registered in our database.</p>
            </>
          )}

          {/* Reset validation search */}
          {(queryId || result) && (
            <div className="mt-6 pt-4 border-t border-outline-variant">
              <button
                onClick={() => {
                  setResult(null);
                  setCertIdInput('');
                  // Clean URL query params cleanly
                  window.history.pushState({}, '', window.location.pathname);
                }}
                className="text-secondary font-bold hover:underline"
              >
                ← Back to Portal Input
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

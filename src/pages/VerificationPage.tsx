import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { verifyCertificate } from '../services/verification';
import type { VerificationResult } from '../services/verification';
import { downloadPDFBlob } from '../utils/pdf';

export default function VerificationPage() {
  const [searchParams] = useSearchParams();
  const [certIdInput, setCertIdInput] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const queryId = searchParams.get('id');

  const executeVerification = async (id: string) => {
    if (!id.trim()) return;
    setIsValidating(true);
    setResult(null);
    
    // Simulate minor delay for authentic validation feel
    await new Promise(r => setTimeout(r, 600));

    const check = await verifyCertificate(id.trim());
    setResult(check);
    setIsValidating(false);
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
    if (!result?.certificateData?.pdf_base64) return;
    
    let base64Data = result.certificateData.pdf_base64;
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
    downloadPDFBlob(blob, `Certificate_${result.certificateData.name}`);
  };

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
          {result.isValid ? (
            <>
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <span className="material-symbols-outlined text-4xl select-none" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              </div>
              <h2 className="text-lg font-bold text-on-surface">Certificate Verified</h2>
              <p className="text-on-surface-variant mt-1 mb-6">This credential matches SHA-256 security protocols.</p>

              <div className="bg-surface-container-low border border-outline-variant p-4 rounded-xl text-left space-y-3 mb-6">
                <div className="flex justify-between border-b pb-1.5 border-outline-variant/30">
                  <span className="text-on-surface-variant font-semibold">Recipient:</span>
                  <span className="font-bold text-on-surface text-right">{result.certificateData.name}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5 border-outline-variant/30">
                  <span className="text-on-surface-variant font-semibold">Course:</span>
                  <span className="font-bold text-on-surface text-right">{result.certificateData.course}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5 border-outline-variant/30">
                  <span className="text-on-surface-variant font-semibold">Issued By:</span>
                  <span className="font-bold text-on-surface text-right">{result.certificateData.issuedBy}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5 border-outline-variant/30">
                  <span className="text-on-surface-variant font-semibold">Issue Date:</span>
                  <span className="font-bold text-on-surface text-right">{result.certificateData.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant font-semibold">Certificate ID:</span>
                  <span className="font-mono text-secondary font-bold text-right">{result.certificateData.certId}</span>
                </div>
              </div>

              <div className="flex gap-2 justify-center">
                {result.certificateData.pdf_base64 && (
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
          ) : (
            <>
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-4xl select-none" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
              </div>
              <h2 className="text-lg font-bold text-on-surface">Verification Failed</h2>
              <p className="text-on-surface-variant mt-1 mb-4">{result.reason || 'This certificate has been revoked or tampered.'}</p>
              
              <div className="p-4 bg-red-50 text-red-700 rounded-xl font-mono text-[10px] text-left border border-red-200 mb-6">
                ALERT: Cryptographic SHA-256 match comparison rejected. Hash discrepancy or revoking key detected.
              </div>
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

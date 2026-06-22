import { useState, useRef } from 'react';
import { useDesignerStore } from '../store/designerStore';
import { useRecipientStore } from '../store/recipientStore';
import { db, storage, auth } from '../services/firebase';
import { doc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { computeCertificateHash } from '../utils/crypto';
import { EmailService } from '../services/email.service';
import { AuditService } from '../services/audit.service';
import { generateCertificatePDF } from '../utils/pdf';
import JSZip from 'jszip';
import QRCode from 'qrcode';

export default function GenerationPage() {
  const { elements, certSettings, background, backgroundImage, canvasWidth, canvasHeight } = useDesignerStore();
  const { recipients, selectedIds, updateRecipient, toggleSelect } = useRecipientStore();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [genLogs, setGenLogs] = useState<string[]>([]);
  const [generatedPDFs, setGeneratedPDFs] = useState<{ name: string; blob: Blob; certId: string }[]>([]);
  const [activeTemplate, setActiveTemplate] = useState('Standard Professional');
  const [emailDelay, setEmailDelay] = useState(1000);

  const hiddenCanvasRef = useRef<HTMLDivElement>(null);

  const selectedRecipients = recipients.filter(r => selectedIds.includes(r.id));

  const addLog = (msg: string) => {
    setGenLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleNextStep = (step: number) => {
    if (step === 2 && selectedRecipients.length === 0) {
      // Auto-select all pending if none selected
      const pendingIds = recipients.filter(r => r.status !== 'sent').map(r => r.id);
      if (pendingIds.length > 0) {
        useRecipientStore.getState().selectAll(true);
      }
    }
    setCurrentStep(step);
  };

  // Run generation loop
  const executeBatchGeneration = async (list: typeof recipients) => {
    if (list.length === 0) return;
    
    setIsGenerating(true);
    setCurrentStep(4);
    setProgress(0);
    setProcessedCount(0);
    
    const compiledPDFs: { name: string; blob: Blob; certId: string }[] = [...generatedPDFs];

    // Load configurations from settings
    const emailSettings = {
      serviceId: localStorage.getItem('cf_emailSettings_service') || '',
      templateId: localStorage.getItem('cf_emailSettings_template') || '',
      publicKey: localStorage.getItem('cf_emailSettings_key') || ''
    };

    const pipelinePromises: Promise<void>[] = [];

    for (let i = 0; i < list.length; i++) {
      const recipient = list[i];
      const stepProgress = Math.round(((i + 0.5) / list.length) * 100);
      setProgress(stepProgress);
      
      const certId = recipient.certId || `${certSettings.prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const verifyUrl = `${window.location.origin}/verify/${certId}`;

      let pdfBlob: Blob | null = null;

      try {
        if (hiddenCanvasRef.current) {
          const nameEl = hiddenCanvasRef.current.querySelector('[data-role="recipient_name"]');
          const courseEl = hiddenCanvasRef.current.querySelector('[data-role="course_title"]');
          const certIdEl = hiddenCanvasRef.current.querySelector('[data-role="cert-id"]');
          const orgEl = hiddenCanvasRef.current.querySelector('[data-role="organisation"]');

          if (nameEl) nameEl.textContent = recipient.name;
          if (courseEl) courseEl.textContent = recipient.course || certSettings.course;
          if (certIdEl) certIdEl.textContent = certId;
          if (orgEl) orgEl.textContent = certSettings.org;

          // Generate and load QR code image
          const qrContainer = hiddenCanvasRef.current.querySelector('[data-role="qr"]');
          if (qrContainer) {
            const imgEl = qrContainer.querySelector('img');
            if (imgEl) {
              const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
                margin: 1,
                width: 300 // High resolution
              });
              await new Promise<void>((resolve, reject) => {
                imgEl.onload = () => {
                  imgEl.style.display = 'block';
                  resolve();
                };
                imgEl.onerror = () => reject(new Error('Failed to load QR code image onto canvas'));
                imgEl.src = qrDataUrl;
              });
            }
          }

          // 1. Generate PDF
          try {
            pdfBlob = await generateCertificatePDF(hiddenCanvasRef.current);
            if (!compiledPDFs.some(p => p.certId === certId)) {
              compiledPDFs.push({ name: recipient.name, blob: pdfBlob, certId });
            }
          } catch (e: any) {
            console.error('PDF Generation failed:', e);
            addLog(`✗ PDF Generation failed: ${e.message}`);
          }
        }
      } catch (err: any) {
        console.error(err);
        const errorMsg = err.text || err.message || 'Generation or delivery failed';
        updateRecipient(recipient.id, { status: 'failed', error: errorMsg });
        addLog(`✗ ${recipient.name} — Failed: ${errorMsg}`);
      }

      if (pdfBlob) {
        // Run network pipeline concurrently in the background
        const networkTask = (async (blob: Blob, cId: string, vUrl: string) => {
          let downloadUrl = '';
          let pdfBase64 = '';

          // 1. Upload PDF to Firebase Storage (or fallback to Firestore base64 if not set up)
          addLog(`Uploading PDF for ${recipient.name} to Firebase Storage...`);
          const fileRef = ref(storage, `certificates/${cId}.pdf`);
          console.time(`4. Firebase Storage Upload [${recipient.name}]`);
          try {
            const uploadPromise = uploadBytes(fileRef, blob);
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Firebase Storage Upload timed out (15000ms)')), 15000)
            );
            const uploadSnapshot = await Promise.race([uploadPromise, timeoutPromise]);
            downloadUrl = await getDownloadURL(uploadSnapshot.ref);
            addLog(`✓ [${recipient.name}] Uploaded successfully to Firebase Storage`);
          } catch (e: any) {
            console.warn(`Firebase Storage upload failed/timed out, falling back to database base64 storage:`, e);
            addLog(`⚠ [${recipient.name}] Firebase Storage upload failed: ${e.message || String(e)}. Falling back to database storage...`);
            
            try {
              // Convert blob to base64 string
              pdfBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
              downloadUrl = `${vUrl}?download=true`;
            } catch (err: any) {
              console.error('Fallback base64 conversion failed:', err);
              const errMsg = err.message || String(err);
              addLog(`✗ [${recipient.name}] Fallback base64 conversion failed: ${errMsg}`);
              updateRecipient(recipient.id, { status: 'failed', error: 'Upload Failed' });
              
              try {
                await addDoc(collection(db, 'audit_logs'), {
                  action: 'EMAIL_FAILED',
                  userId: auth.currentUser?.uid || 'anonymous',
                  timestamp: serverTimestamp(),
                  entityType: 'certificate',
                  entityId: cId,
                  metadata: { error: `Upload & base64 Fallback Failed: ${errMsg}` },
                  eventType: 'UPLOAD_FAILED',
                  certificateId: cId,
                  recipientEmail: recipient.email,
                  status: 'failed',
                  errorMessage: `Upload & base64 Fallback Failed: ${errMsg}`
                });
              } catch (logErr) {}
              return; // Abort pipeline
            }
          } finally {
            console.timeEnd(`4. Firebase Storage Upload [${recipient.name}]`);
          }

          // 2. Compute cryptographic hash (SHA-256)
          let shaHash = '';
          console.time(`3. SHA256 Hashing [${recipient.name}]`);
          try {
            shaHash = await computeCertificateHash({
              certId: cId,
              recipientName: recipient.name,
              courseName: recipient.course || certSettings.course,
              issueDate: certSettings.date,
              issuerName: certSettings.org
            });
          } catch (e: any) {
            console.error(`SHA256 Hashing failed for ${recipient.name}:`, e);
            const errMsg = e.message || String(e);
            addLog(`✗ [${recipient.name}] SHA256 Hashing failed: ${errMsg}`);
            updateRecipient(recipient.id, { status: 'failed', error: 'Verification Failed' });

            try {
              await addDoc(collection(db, 'audit_logs'), {
                action: 'EMAIL_FAILED',
                userId: auth.currentUser?.uid || 'anonymous',
                timestamp: serverTimestamp(),
                entityType: 'certificate',
                entityId: cId,
                metadata: { error: `Hash Failed: ${errMsg}` },
                eventType: 'HASH_FAILED',
                certificateId: cId,
                recipientEmail: recipient.email,
                status: 'failed',
                errorMessage: `Verification Failed: Hash Failed: ${errMsg}`
              });
            } catch (err) {}
            return;
          } finally {
            console.timeEnd(`3. SHA256 Hashing [${recipient.name}]`);
          }

          // 3. Save metadata document in Firestore
          console.time(`5. Firestore Write [${recipient.name}]`);
          try {
            const writePromise = setDoc(doc(db, 'certificates', cId), {
              certId: cId,
              name: recipient.name,
              email: recipient.email,
              course: recipient.course || certSettings.course,
              date: certSettings.date,
              issuedBy: certSettings.org,
              title: certSettings.title,
              hash: shaHash,
              verifyUrl: vUrl,
              downloadUrl: downloadUrl,
              pdf_base64: pdfBase64,
              status: 'valid',
              issuedAt: serverTimestamp()
            });
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Firestore Write timed out (15000ms)')), 15000)
            );
            await Promise.race([writePromise, timeoutPromise]);
            addLog(`✓ [${recipient.name}] Registered & Signed metadata in Firestore`);
            
            // Log CERTIFICATE_GENERATED event
            try {
              await AuditService.logEvent({
                action: 'CERTIFICATE_GENERATED',
                userId: '',
                entityType: 'certificate',
                entityId: cId,
                metadata: {
                  name: recipient.name,
                  email: recipient.email,
                  course: recipient.course || certSettings.course,
                  title: certSettings.title
                }
              });
            } catch (e) {}
          } catch (e: any) {
            console.error(`Firestore Write failed/timed out for ${recipient.name}:`, e);
            const errMsg = e.message || String(e);
            addLog(`✗ [${recipient.name}] Firestore Write failed: ${errMsg}`);
            updateRecipient(recipient.id, { status: 'failed', error: 'Verification Failed' });

            try {
              await addDoc(collection(db, 'audit_logs'), {
                action: 'EMAIL_FAILED',
                userId: auth.currentUser?.uid || 'anonymous',
                timestamp: serverTimestamp(),
                entityType: 'certificate',
                entityId: cId,
                metadata: { error: `Firestore Write Failed: ${errMsg}` },
                eventType: 'REGISTRATION_FAILED',
                certificateId: cId,
                recipientEmail: recipient.email,
                status: 'failed',
                errorMessage: `Verification Failed: Firestore Write failed: ${errMsg}`
              });
            } catch (err) {}
            return;
          } finally {
            console.timeEnd(`5. Firestore Write [${recipient.name}]`);
          }

          // 4. Send EmailJS notification
          addLog(`Sending EmailJS template to ${recipient.email}...`);
          console.time(`6. EmailJS Sending [${recipient.name}]`);
          try {
            const emailParams = {
              recipient_name: recipient.name,
              recipient_email: recipient.email,
              certificate_id: cId,
              verification_url: vUrl,
              certificate_title: certSettings.title || recipient.course || certSettings.course || 'Certificate',
              pdf_url: downloadUrl,
              organization_name: certSettings.org || 'CertForge Pro',
              // Fallbacks
              course_name: recipient.course || certSettings.course,
              issue_date: certSettings.date,
              download_url: downloadUrl
            };

            // Before EmailJS send, output payload (Task 3)
            console.log({
              recipient_name: emailParams.recipient_name,
              certificate_title: emailParams.certificate_title,
              certificate_id: emailParams.certificate_id,
              organization_name: emailParams.organization_name,
              verification_url: emailParams.verification_url,
              pdf_url: emailParams.pdf_url
            });

            const emailPromise = EmailService.sendCertificateEmail(emailParams, emailSettings);
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('EmailJS Sending timed out (15000ms)')), 15000)
            );
            await Promise.race([emailPromise, timeoutPromise]);
            addLog(`✓ [${recipient.name}] Emailed successfully`);

            // 5. Everything succeeded
            updateRecipient(recipient.id, { status: 'sent', certId: cId, error: null });

            try {
              await addDoc(collection(db, 'audit_logs'), {
                action: 'EMAIL_SENT',
                userId: auth.currentUser?.uid || 'anonymous',
                timestamp: serverTimestamp(),
                entityType: 'certificate',
                entityId: cId,
                metadata: { email: recipient.email },
                eventType: 'GENERATION_SUCCESS',
                certificateId: cId,
                recipientEmail: recipient.email,
                status: 'success',
                errorMessage: ''
              });
            } catch (err) {}
          } catch (e: any) {
            console.error(`EmailJS Sending failed/timed out for ${recipient.name}:`, e);
            const errMsg = e.message || String(e);
            addLog(`✗ [${recipient.name}] EmailJS Sending failed: ${errMsg}`);
            updateRecipient(recipient.id, { status: 'failed', error: 'Email Failed' });

            try {
              await addDoc(collection(db, 'audit_logs'), {
                action: 'EMAIL_FAILED',
                userId: auth.currentUser?.uid || 'anonymous',
                timestamp: serverTimestamp(),
                entityType: 'certificate',
                entityId: cId,
                metadata: { error: errMsg },
                eventType: 'EMAIL_FAILED',
                certificateId: cId,
                recipientEmail: recipient.email,
                status: 'failed',
                errorMessage: `Email Failed: ${errMsg}`
              });
            } catch (err) {}
          } finally {
            console.timeEnd(`6. EmailJS Sending [${recipient.name}]`);
          }
        })(pdfBlob, certId, verifyUrl);

        pipelinePromises.push(networkTask);
      }

      setProcessedCount(i + 1);
      setProgress(Math.round(((i + 1) / list.length) * 100));

      if (i < list.length - 1 && emailDelay > 0) {
        await new Promise(r => setTimeout(r, emailDelay));
      }
    }

    if (pipelinePromises.length > 0) {
      addLog(`Awaiting all concurrent background dispatches (${pipelinePromises.length}) to complete...`);
      await Promise.all(pipelinePromises);
    }

    setGeneratedPDFs(compiledPDFs);
    setIsGenerating(false);
    addLog('Batch generation process complete!');
  };

  const startBatchGeneration = async () => {
    if (selectedRecipients.length === 0) {
      alert('No recipients selected for generation.');
      return;
    }
    setGenLogs([]);
    addLog(`Initiating cryptographic generation pipeline for ${selectedRecipients.length} recipients...`);
    await executeBatchGeneration(selectedRecipients);
  };

  const retryFailedBatch = async () => {
    const failedList = selectedRecipients.filter(r => {
      const rec = recipients.find(x => x.id === r.id);
      return rec?.status === 'failed';
    });
    if (failedList.length === 0) {
      alert('No failed recipients in selected list.');
      return;
    }
    addLog(`--- Retrying ${failedList.length} failed credential transfers ---`);
    await executeBatchGeneration(failedList);
  };

  const downloadZipArchive = async () => {
    if (generatedPDFs.length === 0) return;
    addLog('Assembling ZIP archive...');
    const zip = new JSZip();
    const folder = zip.folder('Certificates');
    
    generatedPDFs.forEach(item => {
      const cleanName = item.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      folder?.file(`${cleanName}_${item.certId}.pdf`, item.blob);
    });

    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = `CertForge_Batch_${new Date().toISOString().split('T')[0]}.zip`;
    link.click();
    addLog('ZIP archive downloaded successfully!');
  };

  const sentCount = selectedRecipients.filter(r => r.status === 'sent').length;
  const failedCount = selectedRecipients.filter(r => r.status === 'failed').length;

  return (
    <div className="p-6 space-y-6">
      {/* Wizard Step Navigation */}
      <div className="flex items-center justify-center max-w-4xl mx-auto w-full px-8 pb-4">
        <div className="flex items-center w-full relative">
          {/* Step 1 */}
          <div className="flex flex-col items-center gap-2 z-10">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow ${
              currentStep >= 1 ? 'bg-secondary text-white' : 'bg-surface-container-high text-on-surface'
            }`}>1</div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Template</span>
          </div>
          <div className="flex-1 h-[2px] bg-outline-variant mx-[-4px] relative top-[-14px]">
            <div className="h-full bg-secondary transition-all duration-300" style={{ width: currentStep > 1 ? '100%' : '0%' }}></div>
          </div>

          {/* Step 2 */}
          <div className={`flex flex-col items-center gap-2 z-10 ${currentStep < 2 ? 'opacity-40' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow ${
              currentStep >= 2 ? 'bg-secondary text-white' : 'bg-surface-container-high text-on-surface'
            }`}>2</div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Recipients</span>
          </div>
          <div className="flex-1 h-[2px] bg-outline-variant mx-[-4px] relative top-[-14px]">
            <div className="h-full bg-secondary transition-all duration-300" style={{ width: currentStep > 2 ? '100%' : '0%' }}></div>
          </div>

          {/* Step 3 */}
          <div className={`flex flex-col items-center gap-2 z-10 ${currentStep < 3 ? 'opacity-40' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow ${
              currentStep >= 3 ? 'bg-secondary text-white' : 'bg-surface-container-high text-on-surface'
            }`}>3</div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Review</span>
          </div>
          <div className="flex-1 h-[2px] bg-outline-variant mx-[-4px] relative top-[-14px]">
            <div className="h-full bg-secondary transition-all duration-300" style={{ width: currentStep > 3 ? '100%' : '0%' }}></div>
          </div>

          {/* Step 4 */}
          <div className={`flex flex-col items-center gap-2 z-10 ${currentStep < 4 ? 'opacity-40' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow ${
              currentStep >= 4 ? 'bg-secondary text-white' : 'bg-surface-container-high text-on-surface'
            }`}>4</div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Generate</span>
          </div>
        </div>
      </div>

      {/* Wizard Canvas Area */}
      <div className="max-w-4xl mx-auto w-full min-h-[460px] bg-white border border-outline-variant rounded-2xl shadow-sm flex overflow-hidden">
        {/* Step 1: Template Selection */}
        {currentStep === 1 && (
          <div className="flex-1 flex flex-col p-8 text-xs">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-on-surface mb-1">Select Certificate Template</h3>
              <p className="text-on-surface-variant">Choose the structural base design for your batch credentials.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              <div
                onClick={() => setActiveTemplate('Standard Professional')}
                className={`border p-4 rounded-xl cursor-pointer hover:border-secondary transition-all ${
                  activeTemplate === 'Standard Professional' ? 'border-secondary bg-secondary/5' : 'border-outline-variant'
                }`}
              >
                <div className="aspect-[1.5] bg-surface-container-low border border-outline-variant rounded-lg mb-3 flex items-center justify-center font-bold text-secondary">
                  GUI Classic
                </div>
                <h4 className="font-bold text-sm text-on-surface">Standard Professional</h4>
                <p className="text-on-surface-variant mt-1 text-[11px]">Deep Blue accents, classic roman layout for corporate certifications.</p>
              </div>

              <div
                onClick={() => setActiveTemplate('Custom Layout')}
                className={`border p-4 rounded-xl cursor-pointer hover:border-secondary transition-all ${
                  activeTemplate === 'Custom Layout' ? 'border-secondary bg-secondary/5' : 'border-outline-variant'
                }`}
              >
                <div className="aspect-[1.5] bg-surface-container-low border border-outline-variant rounded-lg mb-3 flex items-center justify-center font-bold text-secondary">
                  Designer Canvas Elements
                </div>
                <h4 className="font-bold text-sm text-on-surface">Custom Active Design</h4>
                <p className="text-on-surface-variant mt-1 text-[11px]">Uses your current configuration in the Certificate Designer page.</p>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => handleNextStep(2)}
                className="flex items-center gap-1 bg-secondary text-white px-6 py-2.5 font-bold rounded-lg shadow"
              >
                Next: Configure Recipients
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Recipients Selector */}
        {currentStep === 2 && (
          <div className="flex-1 flex flex-col p-8 text-xs">
            <div className="mb-6 flex justify-between items-end">
              <div>
                <h3 className="text-lg font-bold text-on-surface mb-1">Select Recipients</h3>
                <p className="text-on-surface-variant">Check recipients from your current roster to issue certificates to.</p>
              </div>
              <span className="font-bold text-secondary bg-secondary/5 px-3 py-1 rounded-full border border-secondary/15">
                Selected: {selectedRecipients.length}
              </span>
            </div>

            <div className="border border-outline-variant rounded-xl overflow-y-auto max-h-60 flex-1">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    <th className="p-3 w-10"></th>
                    <th className="p-3 font-label-code uppercase tracking-wider text-[10px] text-on-surface-variant">Name</th>
                    <th className="p-3 font-label-code uppercase tracking-wider text-[10px] text-on-surface-variant">Email</th>
                    <th className="p-3 font-label-code uppercase tracking-wider text-[10px] text-on-surface-variant">Course</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {recipients.length > 0 ? (
                    recipients.map(r => (
                      <tr key={r.id} className="hover:bg-surface-container-low/40">
                        <td className="p-3">
                          <input
                            checked={selectedIds.includes(r.id)}
                            onChange={() => toggleSelect(r.id)}
                            className="rounded text-secondary cursor-pointer"
                            type="checkbox"
                          />
                        </td>
                        <td className="p-3 font-bold text-on-surface">{r.name}</td>
                        <td className="p-3 text-on-surface-variant">{r.email}</td>
                        <td className="p-3">{r.course || certSettings.course}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-on-surface-variant opacity-60">
                        Please add recipients on the Recipients page first.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => handleNextStep(1)}
                className="flex items-center gap-1 text-on-surface-variant hover:text-secondary font-bold px-4 py-2"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Back
              </button>
              <button
                onClick={() => handleNextStep(3)}
                className="flex items-center gap-1 bg-secondary text-white px-6 py-2.5 font-bold rounded-lg shadow"
                disabled={selectedRecipients.length === 0}
              >
                Next: Final Review
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {currentStep === 3 && (
          <div className="flex-1 flex flex-col p-8 text-xs">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-on-surface mb-1">Final Validation</h3>
              <p className="text-on-surface-variant">Verify details before launching the secure cryptographic signatures pipeline.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              <div className="bg-surface-container-low border border-outline-variant p-4 rounded-xl space-y-3">
                <span className="font-label-code text-[10px] text-on-surface-variant block uppercase font-bold border-b pb-1">Template Signature</span>
                <div>
                  <p className="font-bold text-sm text-on-surface">{activeTemplate}</p>
                  <p className="text-on-surface-variant mt-1">Org: {certSettings.org}</p>
                  <p className="text-on-surface-variant">Cert Title: {certSettings.title}</p>
                  <p className="text-on-surface-variant">Dynamic Bindings: Name, Course, QR Code, Date, ID</p>
                </div>
              </div>

              <div className="bg-surface-container-low border border-outline-variant p-4 rounded-xl space-y-2">
                <span className="font-label-code text-[10px] text-on-surface-variant block uppercase font-bold border-b pb-1">Batch Settings</span>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant font-medium">Recipients count:</span>
                    <span className="font-bold text-on-surface">{selectedRecipients.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant font-medium">Format:</span>
                    <span className="font-bold text-on-surface">Secure PDF (Signed)</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <label className="text-on-surface-variant font-medium">Email delay (ms):</label>
                    <input
                      type="number"
                      min={0}
                      max={5000}
                      step={250}
                      value={emailDelay}
                      onChange={(e) => setEmailDelay(parseInt(e.target.value) || 0)}
                      className="w-16 border rounded p-1 text-center bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-secondary/5 border border-secondary/15 rounded-xl p-4 flex gap-3 mt-4 items-center">
              <span className="material-symbols-outlined text-secondary text-2xl select-none">security</span>
              <p className="text-[11px] text-on-surface-variant">
                By clicking initiate, CertForge will generate unique SHA-256 signatures for each document using browser Web Crypto APIs and register them.
              </p>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => handleNextStep(2)}
                className="flex items-center gap-1 text-on-surface-variant hover:text-secondary font-bold px-4 py-2"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Back
              </button>
              <button
                onClick={startBatchGeneration}
                className="flex items-center gap-1.5 bg-secondary text-white px-8 py-3 font-bold rounded-lg shadow-md hover:scale-102 transition-all"
              >
                <span className="material-symbols-outlined text-sm">send</span>
                Send Certificates
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Progress Panel */}
        {currentStep === 4 && (
          <div className="flex-1 flex flex-col p-8 text-xs justify-center items-center">
            {isGenerating ? (
              <div className="w-full max-w-md text-center space-y-6">
                <div className="relative w-32 h-32 mx-auto flex items-center justify-center border-4 border-surface-container-low rounded-full">
                  <div className="absolute inset-0 border-4 border-secondary rounded-full border-t-transparent animate-spin"></div>
                  <span className="text-xl font-extrabold text-secondary">{progress}%</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-on-surface mb-1">Generating Credentials...</h3>
                  <p className="text-on-surface-variant text-[11px]">Executing secure hashing engine and mail client...</p>
                </div>
                <div className="space-y-1 text-left">
                  <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                    <div className="bg-secondary h-full transition-all duration-200" style={{ width: `${progress}%` }}></div>
                  </div>
                  <div className="flex justify-between text-[9px] font-label-code text-on-surface-variant font-bold">
                    <span>Batch Queue: CF-BATCH</span>
                    <span>Processed: {processedCount} / {selectedRecipients.length}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-lg text-center space-y-6 animate-in fade-in duration-300">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                  <span className="material-symbols-outlined text-4xl select-none" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-on-surface mb-1">Batch Process Completed</h3>
                  <p className="text-on-surface-variant text-[11px]">
                    {selectedRecipients.length} certificates have been digitally signed, registered, and processed.
                  </p>
                  <p className="text-xs font-bold text-secondary mt-2 bg-secondary/5 border border-secondary/15 rounded-lg py-2 px-4 inline-block">
                    {sentCount} Emailed Successfully · {failedCount} Failed
                  </p>
                </div>
                
                <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                  <button
                    onClick={downloadZipArchive}
                    disabled={generatedPDFs.length === 0}
                    className="flex items-center justify-center gap-2 border border-outline hover:bg-surface-container-low font-bold py-2.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">folder_zip</span>
                    Download ZIP
                  </button>

                  {failedCount > 0 && (
                    <button
                      onClick={retryFailedBatch}
                      className="flex items-center justify-center gap-2 border border-red-500 text-red-500 hover:bg-red-50 font-bold py-2.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">replay</span>
                      Retry Failed ({failedCount})
                    </button>
                  )}

                  <button
                    onClick={() => handleNextStep(1)}
                    className="flex items-center justify-center gap-2 bg-secondary hover:opacity-90 active:scale-95 text-white font-bold py-2.5 rounded-lg transition-all shadow-md cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    Start New Batch
                  </button>
                </div>
              </div>
            )}

            {/* Hashing Audit Logs */}
            {genLogs.length > 0 && (
              <div className="w-full mt-6 bg-[#1a1a1a] text-green-400 p-4 rounded-xl font-mono text-[9px] text-left max-h-36 overflow-y-auto space-y-1">
                {genLogs.map((log, idx) => (
                  <p key={idx}>{log}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden canvas for off-screen html2canvas + pdf-lib compilation */}
      <div className="absolute left-[-9999px] top-[-9999px]">
        <div
          ref={hiddenCanvasRef}
          style={{
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            background: backgroundImage ? `url(${backgroundImage})` : background,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {elements.map((el) => (
            <div
              key={el.id}
              data-role={el.role}
              className="absolute"
              style={{
                left: el.left,
                top: el.top,
                width: el.styles?.width || 'auto',
                height: el.styles?.height || 'auto',
                zIndex: el.styles?.zIndex || 10
              }}
            >
              {el.type === 'text' && (
                <span
                  style={{
                    fontSize: el.styles?.fontSize || '14px',
                    fontWeight: el.styles?.fontWeight || '400',
                    fontStyle: el.styles?.fontStyle || 'normal',
                    color: el.styles?.color || '#000000',
                    textAlign: el.styles?.textAlign || 'left',
                    fontFamily: el.styles?.fontFamily || 'Inter',
                    lineHeight: el.styles?.lineHeight || 1.2,
                    letterSpacing: el.styles?.letterSpacing || 'normal',
                    display: 'inline-block',
                    width: '100%'
                  }}
                >
                  {el.value}
                </span>
              )}
              {el.type === 'qr' && (
                <div 
                  data-role="qr"
                  className="flex items-center justify-center" 
                  style={{ width: el.styles?.width || '100px', height: el.styles?.height || '100px', backgroundColor: 'transparent' }}
                >
                  <img
                    alt="Verification QR"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'none'
                    }}
                  />
                </div>
              )}
              {el.type === 'divider' && (
                <div style={{ width: el.styles?.width || '150px', height: el.styles?.height || '2px', background: el.styles?.color || '#d4af37' }} />
              )}
              {el.type === 'seal' && (
                <div className="flex items-center justify-center text-center font-bold text-[#d4af37] text-[10px]" style={{ width: '80px', height: '80px', borderRadius: '50%', border: el.styles?.border || '3px double #d4af37' }}>
                  OFFICIAL SEAL
                </div>
              )}
              {el.type === 'border' && (
                <div style={{ width: '100%', height: '100%', border: el.styles?.border || '4px double #d4af37' }} />
              )}
              {el.type === 'image' && (
                <img src={el.value} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="asset" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

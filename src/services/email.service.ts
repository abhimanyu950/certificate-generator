import emailjs from '@emailjs/browser';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import { AuditService } from './audit.service';

export interface EmailJSConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

export interface CertificateEmailParams {
  recipient_name: string;
  recipient_email: string;
  certificate_id: string;
  verification_url: string;
  
  certificate_title?: string;
  pdf_url?: string;
  organization_name?: string;
  
  // Backwards compatibility fallbacks
  course_name?: string;
  issue_date?: string;
  download_url?: string;
}

// Fetch configurations: Env variables first, then localStorage
export const getEmailConfig = (custom?: Partial<EmailJSConfig>): EmailJSConfig => {
  const serviceId = custom?.serviceId || 
                    (import.meta.env.VITE_EMAILJS_SERVICE_ID as string) || 
                    localStorage.getItem('cf_emailSettings_service') || '';
  const templateId = custom?.templateId || 
                     (import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string) || 
                     localStorage.getItem('cf_emailSettings_template') || '';
  const publicKey = custom?.publicKey || 
                    (import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string) || 
                    localStorage.getItem('cf_emailSettings_key') || '';
  
  return { serviceId, templateId, publicKey };
};

export class EmailService {
  // Validate configuration presence
  static validateEmailConfiguration(customSettings?: Partial<EmailJSConfig>): boolean {
    const { serviceId, templateId, publicKey } = getEmailConfig(customSettings);
    return !!(serviceId && templateId && publicKey);
  }

  // Send a single certificate email and log results to Firestore email_logs collection
  static async sendCertificateEmail(
    params: CertificateEmailParams,
    customSettings?: Partial<EmailJSConfig>
  ): Promise<void> {
    const config = getEmailConfig(customSettings);
    
    if (!config.serviceId || !config.templateId || !config.publicKey) {
      throw new Error('EmailJS credentials are not configured. Check environment variables or Settings.');
    }

    // Validate required email template fields (Issue 3)
    const requiredFields = {
      recipient_name: params.recipient_name,
      certificate_title: params.certificate_title || params.course_name,
      certificate_id: params.certificate_id,
      organization_name: params.organization_name,
      verification_url: params.verification_url,
      pdf_url: params.pdf_url || params.download_url
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, val]) => !val || String(val).trim() === '')
      .map(([key]) => key);

    if (missingFields.length > 0) {
      const errMsg = `Validation aborted: Missing required email template fields: ${missingFields.join(', ')}`;
      console.error(errMsg);

      // Write failure audit log asynchronously before throwing
      try {
        await AuditService.logEvent({
          action: 'EMAIL_FAILED',
          userId: '',
          entityType: 'certificate',
          entityId: params.certificate_id || 'unknown',
          metadata: {
            error: errMsg,
            missingFields,
            recipientEmail: params.recipient_email
          }
        });
        
        const logsCol = collection(db, 'email_logs');
        await addDoc(logsCol, {
          certificateId: params.certificate_id || 'unknown',
          recipientEmail: params.recipient_email || 'unknown',
          templateId: config.templateId || 'unknown',
          status: 'failed',
          sentAt: new Date().toISOString(),
          errorMessage: errMsg
        });
      } catch (logErr) {
        console.error('Failed to log validation error:', logErr);
      }

      throw new Error(errMsg);
    }

    // Initialize EmailJS
    emailjs.init(config.publicKey);

    // EmailJS params mapping
    const templateParams = {
      recipient_name: params.recipient_name,
      recipient_email: params.recipient_email,
      certificate_title: params.certificate_title || params.course_name || '',
      certificate_id: params.certificate_id,
      verification_url: params.verification_url,
      pdf_url: params.pdf_url || params.download_url || '',
      organization_name: params.organization_name || 'CertForge Pro',
      // Fallbacks
      course_name: params.course_name || params.certificate_title || '',
      issue_date: params.issue_date || new Date().toLocaleDateString(),
      download_url: params.download_url || params.pdf_url || '',
      to_name: params.recipient_name,
      to_email: params.recipient_email
    };

    let attempts = 0;
    const maxAttempts = 3;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        await emailjs.send(config.serviceId, config.templateId, templateParams);

        const sentAt = new Date().toISOString();

        // 1. Log to email_logs
        await this.logEmailResult({
          certificateId: params.certificate_id,
          recipientEmail: params.recipient_email,
          templateId: config.templateId,
          status: 'success',
          sentAt,
          errorMessage: ''
        });

        // 2. Log to audit_logs
        await AuditService.logEvent({
          action: 'EMAIL_SENT',
          userId: '',
          entityType: 'certificate',
          entityId: params.certificate_id,
          metadata: {
            certificateId: params.certificate_id,
            recipientEmail: params.recipient_email,
            templateId: config.templateId,
            status: 'success',
            sentAt,
            errorMessage: ''
          }
        });
        return; // Success, exit method
      } catch (error: any) {
        lastError = error;
        console.warn(`EmailJS certificate send attempt ${attempts} failed:`, error);
        if (attempts < maxAttempts) {
          // Wait 500ms before retrying
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }

    // If we reach here, all attempts failed
    const errorMsg = lastError.text || lastError.message || String(lastError);
    const sentAt = new Date().toISOString();
    console.error('EmailJS single dispatch failed after all retries:', errorMsg);

    // 1. Log to email_logs
    await this.logEmailResult({
      certificateId: params.certificate_id,
      recipientEmail: params.recipient_email,
      templateId: config.templateId,
      status: 'failed',
      sentAt,
      errorMessage: errorMsg
    });

    // 2. Log to audit_logs
    await AuditService.logEvent({
      action: 'EMAIL_FAILED',
      userId: '',
      entityType: 'certificate',
      entityId: params.certificate_id,
      metadata: {
        certificateId: params.certificate_id,
        recipientEmail: params.recipient_email,
        templateId: config.templateId,
        status: 'failed',
        sentAt,
        errorMessage: errorMsg
      }
    });

    throw lastError;
  }

  // Send campaign email and log to Firestore
  static async sendCampaignEmail(
    campaignName: string,
    recipient: { name: string; email: string },
    templateParams: any,
    customSettings?: Partial<EmailJSConfig>
  ): Promise<void> {
    const config = getEmailConfig(customSettings);

    if (!config.serviceId || !config.templateId || !config.publicKey) {
      throw new Error('EmailJS configuration is incomplete for Campaign.');
    }

    emailjs.init(config.publicKey);

    const params = {
      recipient_name: recipient.name,
      recipient_email: recipient.email,
      campaign_name: campaignName,
      to_name: recipient.name,
      to_email: recipient.email,
      ...templateParams
    };

    let attempts = 0;
    const maxAttempts = 3;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        await emailjs.send(config.serviceId, config.templateId, params);

        await this.logEmailResult({
          certificateId: `campaign_${campaignName}`,
          recipientEmail: recipient.email,
          templateId: config.templateId,
          status: 'success',
          sentAt: new Date().toISOString(),
          errorMessage: ''
        });
        return; // Success, exit method
      } catch (error: any) {
        lastError = error;
        console.warn(`EmailJS campaign send attempt ${attempts} failed:`, error);
        if (attempts < maxAttempts) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }

    // If we reach here, all attempts failed
    const errorMsg = lastError.text || lastError.message || String(lastError);
    const sentAt = new Date().toISOString();
    console.error('Campaign dispatch failed after all retries:', errorMsg);

    await this.logEmailResult({
      certificateId: `campaign_${campaignName}`,
      recipientEmail: recipient.email,
      templateId: config.templateId,
      status: 'failed',
      sentAt,
      errorMessage: errorMsg
    });

    throw lastError;
  }

  // Send bulk emails sequentially, triggering callback on updates
  static async sendBulkCertificateEmails(
    recipients: Array<{
      name: string;
      email: string;
      certId: string;
      course: string;
      date: string;
      downloadUrl: string;
      verifyUrl: string;
    }>,
    progressCallback?: (sent: number, failed: number) => void,
    customSettings?: Partial<EmailJSConfig>
  ): Promise<{ sent: number; failed: number; failedRecipients: any[] }> {
    let sentCount = 0;
    let failedCount = 0;
    const failedRecipients: any[] = [];

    for (const recipient of recipients) {
      try {
        await this.sendCertificateEmail({
          recipient_name: recipient.name,
          recipient_email: recipient.email,
          certificate_id: recipient.certId,
          course_name: recipient.course,
          issue_date: recipient.date,
          download_url: recipient.downloadUrl,
          verification_url: recipient.verifyUrl
        }, customSettings);

        sentCount++;
      } catch (e) {
        failedCount++;
        failedRecipients.push(recipient);
      }

      if (progressCallback) {
        progressCallback(sentCount, failedCount);
      }
    }

    return { sent: sentCount, failed: failedCount, failedRecipients };
  }

  // Firestore logger helper
  private static async logEmailResult(log: {
    certificateId: string;
    recipientEmail: string;
    templateId: string;
    status: 'success' | 'failed';
    sentAt: string;
    errorMessage: string;
  }): Promise<void> {
    try {
      const logsCol = collection(db, 'email_logs');
      await addDoc(logsCol, log);
    } catch (e) {
      console.error('Failed to log email result in Firestore collection:', e);
    }
  }
}

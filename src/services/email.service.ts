import emailjs from '@emailjs/browser';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

export interface EmailJSConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

export interface CertificateEmailParams {
  recipient_name: string;
  recipient_email: string;
  certificate_id: string;
  course_name: string;
  issue_date: string;
  download_url: string;
  verification_url: string;
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

    try {
      // Initialize EmailJS
      emailjs.init(config.publicKey);

      // EmailJS params mapping
      const templateParams = {
        recipient_name: params.recipient_name,
        recipient_email: params.recipient_email,
        certificate_id: params.certificate_id,
        course_name: params.course_name,
        issue_date: params.issue_date,
        download_url: params.download_url,
        verification_url: params.verification_url,
        // Fallbacks for generic templates
        to_name: params.recipient_name,
        to_email: params.recipient_email
      };

      await emailjs.send(config.serviceId, config.templateId, templateParams);

      // Log success in Firestore
      await this.logEmailResult({
        recipientEmail: params.recipient_email,
        certificateId: params.certificate_id,
        status: 'success',
        timestamp: new Date().toISOString(),
        error: ''
      });

    } catch (error: any) {
      const errorMsg = error.text || error.message || String(error);
      console.error('EmailJS single dispatch failed:', errorMsg);

      // Log failure in Firestore
      await this.logEmailResult({
        recipientEmail: params.recipient_email,
        certificateId: params.certificate_id,
        status: 'failed',
        timestamp: new Date().toISOString(),
        error: errorMsg
      });

      throw error;
    }
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

    try {
      emailjs.init(config.publicKey);

      const params = {
        recipient_name: recipient.name,
        recipient_email: recipient.email,
        campaign_name: campaignName,
        to_name: recipient.name,
        to_email: recipient.email,
        ...templateParams
      };

      await emailjs.send(config.serviceId, config.templateId, params);

      await this.logEmailResult({
        recipientEmail: recipient.email,
        certificateId: `campaign_${campaignName}`,
        status: 'success',
        timestamp: new Date().toISOString(),
        error: ''
      });
    } catch (error: any) {
      const errorMsg = error.text || error.message || String(error);
      console.error('Campaign dispatch failed:', errorMsg);

      await this.logEmailResult({
        recipientEmail: recipient.email,
        certificateId: `campaign_${campaignName}`,
        status: 'failed',
        timestamp: new Date().toISOString(),
        error: errorMsg
      });

      throw error;
    }
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
    recipientEmail: string;
    certificateId: string;
    status: 'success' | 'failed';
    timestamp: string;
    error: string;
  }): Promise<void> {
    try {
      const logsCol = collection(db, 'email_logs');
      await addDoc(logsCol, log);
    } catch (e) {
      console.error('Failed to log email result in Firestore collection:', e);
    }
  }
}

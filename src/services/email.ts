import emailjs from '@emailjs/browser';

export interface EmailSettings {
  key: string; // public key
  service: string; // service ID
  template: string; // template ID
  fallbackGmail: boolean;
}

export interface EmailPayload {
  toName: string;
  toEmail: string;
  certId: string;
  courseName: string;
  verifyUrl: string;
  pdfBase64?: string; // base64 attachment data
  orgName: string;
}

export const sendCertificateEmail = async (
  payload: EmailPayload,
  settings: EmailSettings
): Promise<void> => {
  if (settings.key && settings.service && settings.template) {
    try {
      emailjs.init(settings.key);
      
      const emailParams = {
        to_name: payload.toName,
        to_email: payload.toEmail,
        cert_id: payload.certId,
        course: payload.courseName,
        verify_url: payload.verifyUrl,
        certificate_pdf: payload.pdfBase64 || '', // attaches base64 to mail variable
        message: `Dear ${payload.toName},\n\nYour certificate for ${payload.courseName} is ready!\n\nCertificate ID: ${payload.certId}\nVerify authenticity: ${payload.verifyUrl}\n\nBest regards,\n${payload.orgName}`
      };

      await emailjs.send(settings.service, settings.template, emailParams);
      return;
    } catch (error) {
      console.error('EmailJS sending failed:', error);
      if (!settings.fallbackGmail) {
        throw error;
      }
    }
  }

  // Fallback to opening Gmail in compose window
  if (settings.fallbackGmail) {
    openGmailCompose(payload);
  } else {
    throw new Error('EmailJS settings missing and Gmail fallback disabled.');
  }
};

export const openGmailCompose = (payload: EmailPayload) => {
  const subject = encodeURIComponent(`Your Certificate - ${payload.courseName}`);
  const body = encodeURIComponent(
    `Dear ${payload.toName},\n\nPlease find your certificate details below.\n\nCertificate ID: ${payload.certId}\nVerify authenticity: ${payload.verifyUrl}\n\nBest Regards,\n${payload.orgName}`
  );
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${payload.toEmail}&su=${subject}&body=${body}`;
  window.open(gmailUrl, '_blank');
};

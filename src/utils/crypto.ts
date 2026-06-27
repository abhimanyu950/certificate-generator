export const generateSHA256 = async (message: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

export interface CertificateHashPayload {
  certId: string;
  recipientName: string;
  courseName: string;
  issueDate: string;
  issuerName: string;
}

export const computeCertificateHash = async (payload: CertificateHashPayload): Promise<string> => {
  const contentString = payload.certId + payload.recipientName + payload.courseName + payload.issueDate + payload.issuerName;
  return generateSHA256(contentString);
};

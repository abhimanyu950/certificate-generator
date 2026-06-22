import { useState } from 'react';
import { EmailService } from '../services/email.service';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'firebase' | 'branding' | 'security' | 'team'>('firebase');
  
  // Settings Form States (loaded/cached in local storage)
  const [firebaseProject, setFirebaseProject] = useState(() => localStorage.getItem('cf_firebaseSettings_projectId') || (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || 'certforge-prod-ax7');
  const [firebaseApiKey, setFirebaseApiKey] = useState(() => localStorage.getItem('cf_firebaseSettings_apiKey') || (import.meta.env.VITE_FIREBASE_API_KEY as string) || 'AIzaSyA_4X9mZ9K8L7J6I5H4G3F2E1D');
  
  const [emailKey, setEmailKey] = useState(() => localStorage.getItem('cf_emailSettings_key') || (import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string) || '');
  const [emailService, setEmailService] = useState(() => localStorage.getItem('cf_emailSettings_service') || (import.meta.env.VITE_EMAILJS_SERVICE_ID as string) || '');
  const [emailTemplate, setEmailTemplate] = useState(() => localStorage.getItem('cf_emailSettings_template') || (import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string) || '');

  const [brandColor, setBrandColor] = useState(() => localStorage.getItem('cf_brandColor') || '#712ae2');
  const [orgName, setOrgName] = useState(() => localStorage.getItem('cf_orgName') || 'CertForge Academy');

  const [tfaEnabled, setTfaEnabled] = useState(true);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev && prev.message === message ? null : prev);
    }, 4000);
  };

  const handleTestEmail = async () => {
    if (!testEmailAddress) {
      showToast('Please enter a recipient email address to send the test email.', 'error');
      return;
    }
    if (!emailKey || !emailService || !emailTemplate) {
      showToast('Please fill out all EmailJS configuration fields (Public Key, Service ID, Template ID) first.', 'error');
      return;
    }
    setIsTestingEmail(true);
    try {
      await EmailService.sendCertificateEmail({
        recipient_name: 'Test Recipient',
        recipient_email: testEmailAddress,
        certificate_id: 'TEST_ID_123',
        certificate_title: 'SaaS Platform Setup Test',
        pdf_url: 'https://certforge-web.web.app/favicon.svg',
        verification_url: 'https://certforge-web.web.app/verify.html?id=TEST_ID_123',
        organization_name: orgName || 'CertForge Pro',
        // Fallbacks
        course_name: 'SaaS Platform Setup Test',
        issue_date: new Date().toLocaleDateString(),
        download_url: 'https://certforge-web.web.app/favicon.svg'
      }, {
        serviceId: emailService,
        templateId: emailTemplate,
        publicKey: emailKey
      });
      showToast('Test email sent successfully via EmailJS! Check your inbox.', 'success');
    } catch (e: any) {
      showToast(`Test email dispatch failed: ${e.text || e.message || String(e)}`, 'error');
    } finally {
      setIsTestingEmail(false);
    }
  };

  const teamMembers = [
    { name: 'Adrian Lewis', email: 'a.lewis@certforge.pro', role: 'ADMIN', status: 'Active' },
    { name: 'Sarah Miller', email: 's.miller@certforge.pro', role: 'EDITOR', status: 'Active' },
    { name: 'Mike Peterson', email: 'm.peterson@certforge.pro', role: 'ISSUER', status: 'Pending' }
  ];

  const handleSave = () => {
    localStorage.setItem('cf_firebaseSettings_projectId', firebaseProject);
    localStorage.setItem('cf_firebaseSettings_apiKey', firebaseApiKey);
    
    localStorage.setItem('cf_emailSettings_key', emailKey);
    localStorage.setItem('cf_emailSettings_service', emailService);
    localStorage.setItem('cf_emailSettings_template', emailTemplate);

    localStorage.setItem('cf_brandColor', brandColor);
    localStorage.setItem('cf_orgName', orgName);
    
    showToast('Global settings saved successfully!', 'success');
  };

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div className="flex flex-col lg:flex-row gap-6 text-xs">
        {/* Tab Selection */}
        <nav className="w-full lg:w-64 flex flex-col gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('firebase')}
            className={`flex items-center justify-between px-4 py-3 rounded-lg border font-bold transition-all ${
              activeTab === 'firebase'
                ? 'border-outline-variant bg-white text-secondary shadow-sm'
                : 'border-transparent text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="flex items-center gap-3">
              <span className="material-symbols-outlined">database</span>
              Infrastructure (APIs)
            </span>
            <span className="material-symbols-outlined text-secondary">chevron_right</span>
          </button>

          <button
            onClick={() => setActiveTab('branding')}
            className={`flex items-center justify-between px-4 py-3 rounded-lg border font-bold transition-all ${
              activeTab === 'branding'
                ? 'border-outline-variant bg-white text-secondary shadow-sm'
                : 'border-transparent text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="flex items-center gap-3">
              <span className="material-symbols-outlined">palette</span>
              Branding & Profile
            </span>
            <span className="material-symbols-outlined text-secondary">chevron_right</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center justify-between px-4 py-3 rounded-lg border font-bold transition-all ${
              activeTab === 'security'
                ? 'border-outline-variant bg-white text-secondary shadow-sm'
                : 'border-transparent text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="flex items-center gap-3">
              <span className="material-symbols-outlined">security</span>
              Security & Access
            </span>
            <span className="material-symbols-outlined text-secondary">chevron_right</span>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`flex items-center justify-between px-4 py-3 rounded-lg border font-bold transition-all ${
              activeTab === 'team'
                ? 'border-outline-variant bg-white text-secondary shadow-sm'
                : 'border-transparent text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="flex items-center gap-3">
              <span className="material-symbols-outlined">group</span>
              Team Management
            </span>
            <span className="material-symbols-outlined text-secondary">chevron_right</span>
          </button>
        </nav>

        {/* Configurations Dashboard Area */}
        <div className="flex-1 bg-white border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[380px]">
          <div>
            {/* Infrastructure Config */}
            {activeTab === 'firebase' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-on-surface">Infrastructure Integrations</h3>
                  <p className="text-on-surface-variant mt-0.5">Integrate database endpoints and certificate email providers.</p>
                </div>
                
                <div className="space-y-3 max-w-xl">
                  <h4 className="font-bold border-b pb-1 text-on-surface">Firebase SDK</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[10px]">Project ID</label>
                      <input
                        value={firebaseProject}
                        onChange={(e) => setFirebaseProject(e.target.value)}
                        className="w-full rounded-lg border border-outline-variant px-3 py-2 outline-none focus:ring-1 focus:ring-secondary/50 bg-surface-container-low"
                        type="text"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[10px]">API Key</label>
                      <input
                        value={firebaseApiKey}
                        onChange={(e) => setFirebaseApiKey(e.target.value)}
                        className="w-full rounded-lg border border-outline-variant px-3 py-2 outline-none focus:ring-1 focus:ring-secondary/50 bg-surface-container-low"
                        type="password"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 max-w-xl pt-4">
                  <h4 className="font-bold border-b pb-1 text-on-surface">EmailJS Settings</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[10px]">Public Key</label>
                      <input
                        value={emailKey}
                        onChange={(e) => setEmailKey(e.target.value)}
                        className="w-full rounded-lg border border-outline-variant px-3 py-2 outline-none focus:ring-1 focus:ring-secondary/50 bg-surface-container-low"
                        placeholder="Public Key"
                        type="text"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[10px]">Service ID</label>
                      <input
                        value={emailService}
                        onChange={(e) => setEmailService(e.target.value)}
                        className="w-full rounded-lg border border-outline-variant px-3 py-2 outline-none focus:ring-1 focus:ring-secondary/50 bg-surface-container-low"
                        placeholder="Service ID"
                        type="text"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[10px]">Template ID</label>
                      <input
                        value={emailTemplate}
                        onChange={(e) => setEmailTemplate(e.target.value)}
                        className="w-full rounded-lg border border-outline-variant px-3 py-2 outline-none focus:ring-1 focus:ring-secondary/50 bg-surface-container-low"
                        placeholder="Template ID"
                        type="text"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-outline-variant/60 flex items-end gap-3 max-w-md">
                    <div className="flex-1">
                      <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[9px]">Test Email Address</label>
                      <input
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                        className="w-full rounded-lg border border-outline-variant px-3 py-1.5 outline-none focus:ring-1 focus:ring-secondary/50 bg-surface-container-low text-xs"
                        placeholder="test@example.com"
                        type="email"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleTestEmail}
                      disabled={isTestingEmail}
                      className="px-4 py-2 bg-secondary text-white font-bold rounded-lg hover:opacity-90 active:scale-95 text-xs h-[32px] flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {isTestingEmail ? 'Sending...' : 'Test Email'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Branding Panel */}
            {activeTab === 'branding' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-on-surface">Organization Branding</h3>
                  <p className="text-on-surface-variant mt-0.5">Customize default templates and emails metadata branding.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl pt-2">
                  <div className="space-y-3">
                    <div>
                      <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[10px]">Organization Name</label>
                      <input
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="w-full rounded-lg border border-outline-variant px-3 py-2 outline-none focus:ring-1 focus:ring-secondary/50 bg-surface-container-low"
                        type="text"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[10px]">Brand Accent Color</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={brandColor}
                          onChange={(e) => setBrandColor(e.target.value)}
                          className="w-12 h-12 rounded-lg cursor-pointer border p-0.5 bg-surface-container-low border-outline-variant"
                        />
                        <div>
                          <p className="font-bold text-sm uppercase">{brandColor}</p>
                          <p className="text-[10px] text-on-surface-variant">Primary button elements color scheme</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border border-outline-variant rounded-xl p-4 flex flex-col items-center justify-center text-center bg-surface-container-low/20">
                    <span className="material-symbols-outlined text-4xl text-secondary mb-1">domain</span>
                    <h4 className="font-bold text-on-surface text-sm">{orgName}</h4>
                    <p className="text-[10px] text-on-surface-variant mt-0.5">Branding Profile Mockup</p>
                  </div>
                </div>
              </div>
            )}

            {/* Security Config */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-on-surface">Security & Session Profiles</h3>
                  <p className="text-on-surface-variant mt-0.5">Maintain organizational control configurations and credentials access logs.</p>
                </div>

                <div className="divide-y divide-outline-variant/30 max-w-xl">
                  <div className="py-3 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-on-surface">Two-Factor Authentication (2FA)</h4>
                      <p className="text-[10px] text-on-surface-variant">Secure all administrator session access profiles.</p>
                    </div>
                    <button
                      onClick={() => setTfaEnabled(!tfaEnabled)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${tfaEnabled ? 'bg-secondary' : 'bg-outline-variant'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${tfaEnabled ? 'right-1' : 'left-1'}`}></div>
                    </button>
                  </div>

                  <div className="py-3">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h4 className="font-bold text-on-surface">Active Session Tokens</h4>
                        <p className="text-[10px] text-on-surface-variant">Tokens initialized across device profiles.</p>
                      </div>
                      <button onClick={() => showToast('All other sessions revoked!', 'info')} className="text-red-600 hover:underline font-bold">
                        Revoke All
                      </button>
                    </div>
                    
                    <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3 space-y-2 text-[10px]">
                      <div className="flex justify-between items-center border-b pb-1.5 border-outline-variant/30">
                        <div className="flex gap-2 items-center">
                          <span className="material-symbols-outlined text-secondary text-sm">desktop_windows</span>
                          <div>
                            <p className="font-bold text-on-surface">Chrome on Desktop (This device)</p>
                            <p className="text-[9px] text-on-surface-variant">IP: 192.168.1.42 • San Francisco, US</p>
                          </div>
                        </div>
                        <span className="bg-secondary/15 text-secondary px-2 py-0.5 rounded font-bold uppercase text-[8px]">Active Now</span>
                      </div>

                      <div className="flex justify-between items-center opacity-70">
                        <div className="flex gap-2 items-center">
                          <span className="material-symbols-outlined text-sm">smartphone</span>
                          <div>
                            <p className="font-bold text-on-surface">CertForge Mobile App (iPhone)</p>
                            <p className="text-[9px] text-on-surface-variant">IP: 72.14.201.1 • Last Active: 2h ago</p>
                          </div>
                        </div>
                        <button className="material-symbols-outlined hover:text-red-600 text-sm">close</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Team Roles */}
            {activeTab === 'team' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-on-surface">Team Management</h3>
                    <p className="text-on-surface-variant mt-0.5">Manage permissions and team access groups.</p>
                  </div>
                  <button
                    onClick={() => showToast('New team invitation modal opened', 'info')}
                    className="flex items-center gap-1 bg-secondary text-white font-bold px-3 py-1.5 rounded-lg text-[10px]"
                  >
                    <span className="material-symbols-outlined text-xs">person_add</span>
                    Invite Member
                  </button>
                </div>

                <div className="border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-surface-container-low border-b border-outline-variant text-[10px] text-on-surface-variant font-label-code uppercase">
                      <tr>
                        <th className="p-3">User</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30">
                      {teamMembers.map((m, i) => (
                        <tr key={i} className="hover:bg-surface-container-low/20">
                          <td className="p-3">
                            <p className="font-bold text-on-surface">{m.name}</p>
                            <p className="text-on-surface-variant text-[10px]">{m.email}</p>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-surface-container text-on-surface-variant rounded font-mono font-bold text-[9px] uppercase">
                              {m.role}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 ${
                              m.status === 'Active' ? 'text-green-600' : 'text-amber-600'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                m.status === 'Active' ? 'bg-green-600' : 'bg-amber-600'
                              }`}></span>
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t pt-4">
            <button
              onClick={() => {
                if (confirm('Discard changes and restore defaults?')) {
                  window.location.reload();
                }
              }}
              className="px-4 py-2 border border-outline-variant font-semibold hover:bg-surface-container rounded-lg"
            >
              Discard Changes
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-secondary text-white font-bold hover:opacity-90 rounded-lg shadow-md"
            >
              Save Global Settings
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-5 ${
          toast.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : toast.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <span className="material-symbols-outlined text-lg">
            {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
          </span>
          <span className="font-semibold text-xs">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75 flex items-center">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}
    </div>
  );
}

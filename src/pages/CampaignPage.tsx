import { useState } from 'react';
import { useRecipientStore } from '../store/recipientStore';
import { EmailService } from '../services/email.service';
import { useDesignerStore } from '../store/designerStore';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  Tooltip 
} from 'recharts';

const initialDeliveryData = [
  { day: 'Mon', Sent: 8200 },
  { day: 'Tue', Sent: 12400 },
  { day: 'Wed', Sent: 10100 },
  { day: 'Thu', Sent: 18900 },
  { day: 'Fri', Sent: 14200 },
  { day: 'Sat', Sent: 4500 },
  { day: 'Sun', Sent: 3800 }
];

const CAMPAIGN_TEMPLATES = [
  { id: 'custom', name: 'Custom Message (Blank)', subject: '', body: '' },
  { 
    id: 'cert_notice', 
    name: 'Standard Certificate Notification', 
    subject: 'Your Certificate for {{course_name}} is ready!', 
    body: 'Hello {{recipient_name}},\n\nYour certificate for {{course_name}} has been issued.\n\nCertificate ID: {{certificate_id}}\nDownload: {{download_url}}\nVerify: {{verification_url}}\n\nBest regards,\nCertForge Administration' 
  },
  { 
    id: 'feedback', 
    name: 'Feedback & Course Review Request', 
    subject: 'How was your experience with {{course_name}}?', 
    body: 'Hello {{recipient_name}},\n\nCongratulations on receiving your certificate for {{course_name}}!\n\nWe would love to know how your learning experience was. Please reply or fill out our feedback form.\n\nBest regards,\nCertForge Administration' 
  }
];

export default function CampaignPage() {
  const { certSettings } = useDesignerStore();
  const { recipients } = useRecipientStore();

  const [deliveryData, setDeliveryData] = useState(initialDeliveryData);
  const [campaignList, setCampaignList] = useState([
    { id: 'c1', name: 'Q3 Cloud Certifications', date: 'Jul 10, 2026', status: 'Finished', sent: 12450, failed: 42 },
    { id: 'c2', name: 'Global Security Refresh', date: 'Jul 15, 2026', status: 'Finished', sent: 4120, failed: 12 },
    { id: 'c3', name: 'Partner Program Launch', date: 'Completed Jul 12', status: 'Finished', sent: 85000, failed: 105 }
  ]);

  // Campaign Form States
  const [campaignName, setCampaignName] = useState('');
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignBody, setCampaignBody] = useState('Hello {{recipient_name}},\n\nYour certificate is ready! Please check your credentials portal.');
  const [selectedTemplateId, setSelectedTemplateId] = useState('custom');
  const [selectedRecipients, setSelectedRecipients] = useState<(string | number)[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [campaignLogs, setCampaignLogs] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const toggleRecipient = (id: string | number) => {
    setSelectedRecipients(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRecipients.length === recipients.length) {
      setSelectedRecipients([]);
    } else {
      setSelectedRecipients(recipients.map(r => r.id));
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = CAMPAIGN_TEMPLATES.find(t => t.id === templateId);
    if (template && templateId !== 'custom') {
      let resolvedSubject = template.subject;
      let resolvedBody = template.body;
      
      if (certSettings?.course) {
        resolvedSubject = resolvedSubject.replace(/\{\{course_name\}\}/g, certSettings.course);
        resolvedBody = resolvedBody.replace(/\{\{course_name\}\}/g, certSettings.course);
      }
      
      setCampaignSubject(resolvedSubject);
      setCampaignBody(resolvedBody);
    }
  };

  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName || !campaignSubject || selectedRecipients.length === 0) {
      alert('Please fill out all fields and select at least one recipient.');
      return;
    }

    setIsSending(true);
    setSendProgress(0);
    setSentCount(0);
    setFailedCount(0);
    setCampaignLogs([`Starting Campaign: "${campaignName}" targeting ${selectedRecipients.length} recipients...`]);

    const emailSettings = {
      serviceId: localStorage.getItem('cf_emailSettings_service') || '',
      templateId: localStorage.getItem('cf_emailSettings_template') || '',
      publicKey: localStorage.getItem('cf_emailSettings_key') || ''
    };

    let localSent = 0;
    let localFailed = 0;

    const replaceTemplateVariables = (
      text: string,
      recipient: any,
      certId: string,
      downloadUrl: string,
      verifyUrl: string
    ) => {
      return text
        .replace(/\{\{recipient_name\}\}/g, recipient.name)
        .replace(/\{\{recipient_email\}\}/g, recipient.email)
        .replace(/\{\{certificate_id\}\}/g, certId)
        .replace(/\{\{course_name\}\}/g, recipient.course || certSettings?.course || 'Course')
        .replace(/\{\{issue_date\}\}/g, certSettings?.date || new Date().toLocaleDateString())
        .replace(/\{\{download_url\}\}/g, downloadUrl)
        .replace(/\{\{verification_url\}\}/g, verifyUrl);
    };

    for (let i = 0; i < selectedRecipients.length; i++) {
      const recId = selectedRecipients[i];
      const rec = recipients.find(r => r.id === recId);
      if (!rec) continue;

      setCampaignLogs(prev => [...prev, `Sending to ${rec.name} (${rec.email})...`]);

      try {
        const certId = rec.certId || '';
        let downloadUrl = '';
        let verifyUrl = '';

        if (certId) {
          try {
            const certDoc = await getDoc(doc(db, 'certificates', certId));
            if (certDoc.exists()) {
              const data = certDoc.data();
              downloadUrl = data.downloadUrl || '';
              verifyUrl = data.verifyUrl || '';
            }
          } catch (err) {
            console.warn(`Failed to fetch certificate metadata for ID ${certId}:`, err);
          }
        }

        if (!verifyUrl) {
          verifyUrl = `${certSettings?.verifyUrl || 'https://certforge.pro/verify'}?id=${certId}`;
        }
        if (!downloadUrl && certId) {
          downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${localStorage.getItem('cf_firebaseSettings_projectId') || 'certforge-prod-ax7'}.appspot.com/o/certificates%2F${certId}.pdf?alt=media`;
        }

        const resolvedSubject = replaceTemplateVariables(campaignSubject, rec, certId, downloadUrl, verifyUrl);
        const resolvedBody = replaceTemplateVariables(campaignBody, rec, certId, downloadUrl, verifyUrl);

        await EmailService.sendCampaignEmail(campaignName, {
          name: rec.name,
          email: rec.email
        }, {
          subject: resolvedSubject,
          message: resolvedBody
        }, emailSettings);

        localSent++;
        setSentCount(localSent);
        setCampaignLogs(prev => [...prev, `✓ Successfully sent to ${rec.name}`]);
      } catch (err: any) {
        console.error(err);
        localFailed++;
        setFailedCount(localFailed);
        setCampaignLogs(prev => [...prev, `✗ Failed for ${rec.name}: ${err.message || 'EmailJS failure'}`]);
      }

      setSendProgress(Math.round(((i + 1) / selectedRecipients.length) * 100));
      // Small artificial delay between campaign dispatches to prevent flooding
      await new Promise(r => setTimeout(r, 800));
    }

    // Add completed campaign to list
    const newCamp = {
      id: `c_${Date.now()}`,
      name: campaignName,
      date: new Date().toLocaleDateString(),
      status: 'Finished',
      sent: localSent,
      failed: localFailed
    };
    setCampaignList(prev => [newCamp, ...prev]);

    // Update chart
    setDeliveryData(prev => {
      const next = [...prev];
      next[next.length - 1].Sent += localSent;
      return next;
    });

    setIsSending(false);
    alert(`Campaign complete! Sent: ${localSent}, Failed: ${localFailed}`);
  };

  return (
    <div className="p-6 space-y-6 text-xs font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-on-surface">Email Campaigns</h1>
          <p className="text-on-surface-variant mt-0.5">Blast custom templates, announcements, and newsletters to your recipient lists</p>
        </div>
        <button
          onClick={() => { setShowCreateModal(true); setCampaignLogs([]); }}
          className="bg-secondary hover:opacity-90 active:scale-95 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-md"
        >
          <span className="material-symbols-outlined text-sm font-bold">rocket_launch</span>
          New Email Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tracking Chart Section */}
        <section className="lg:col-span-2 bg-white border border-outline-variant rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-on-surface">Delivery Tracking</h3>
              <p className="text-[11px] text-on-surface-variant">Real-time performance across active dispatches</p>
            </div>
            <select className="bg-white border border-outline-variant text-[11px] rounded px-3 py-1 focus:ring-secondary outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          
          <div className="h-64 w-full pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={deliveryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#45464d' }} />
                <Tooltip />
                <Area type="monotone" dataKey="Sent" stroke="#712ae2" fill="rgba(113, 42, 226, 0.15)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Quick Stats Cards */}
        <div className="flex flex-col gap-4">
          <div className="bg-secondary p-5 rounded-2xl text-white flex flex-col justify-between flex-1 shadow">
            <span className="material-symbols-outlined text-4xl">rocket_launch</span>
            <div>
              <p className="text-[11px] opacity-80">Total Emails Sent</p>
              <h4 className="text-3xl font-extrabold leading-none mb-1">1,248,302</h4>
              <div className="flex items-center gap-1 text-[9px]">
                <span className="material-symbols-outlined text-[10px]">trending_up</span>
                <span>+12.5% from last month</span>
              </div>
            </div>
          </div>
          <div className="bg-white border border-outline-variant p-5 rounded-2xl flex flex-col justify-between flex-1 shadow-sm">
            <span className="material-symbols-outlined text-secondary text-4xl">error_outline</span>
            <div>
              <p className="text-[11px] text-on-surface-variant font-semibold">Global Failure Rate</p>
              <h4 className="text-3xl font-bold leading-none mb-1 text-on-surface">0.04%</h4>
              <div className="text-[10px] text-on-surface-variant font-medium">Automatic retries enabled</div>
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns List Table */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-on-surface">Email Campaigns Log</h3>
        <div className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">
                  <th className="px-5 py-3">Campaign Name</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date Dispatched</th>
                  <th className="px-5 py-3 text-right">Delivered Successfully</th>
                  <th className="px-5 py-3 text-right">Failures</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {campaignList.map(c => (
                  <tr key={c.id} className="hover:bg-surface-container-low/40">
                    <td className="px-5 py-3">
                      <p className="font-bold text-on-surface text-xs">{c.name}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-100 text-blue-700">
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-on-surface-variant">{c.date}</td>
                    <td className="px-5 py-3 text-right font-semibold text-green-600">{c.sent.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-red-600 font-semibold">{c.failed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Create New Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-outline-variant p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-extrabold text-on-surface uppercase">Compose New Email Campaign</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-surface-container rounded-full text-on-surface-variant"
                disabled={isSending}
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {isSending ? (
              <div className="py-10 text-center space-y-4">
                <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto" />
                <h4 className="font-bold text-on-surface">Sending Campaign Blasts...</h4>
                <div className="max-w-md mx-auto w-full space-y-1">
                  <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                    <div className="bg-secondary h-full" style={{ width: `${sendProgress}%` }} />
                  </div>
                  <div className="flex justify-between text-[9px] font-bold text-on-surface-variant font-mono">
                    <span>Sent: {sentCount}</span>
                    <span>Failed: {failedCount}</span>
                  </div>
                </div>
                <div className="bg-[#1a1a1a] text-green-400 p-3 rounded-lg text-left font-mono text-[9px] max-h-32 overflow-y-auto space-y-1">
                  {campaignLogs.map((log, idx) => (
                    <p key={idx}>{log}</p>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendCampaign} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[9px]">Select Template</label>
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => handleTemplateChange(e.target.value)}
                        className="w-full rounded border border-outline-variant px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-secondary/55 bg-surface-container-low font-semibold text-on-surface-variant"
                      >
                        {CAMPAIGN_TEMPLATES.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[9px]">Campaign Name</label>
                      <input
                        type="text"
                        required
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        className="w-full rounded border border-outline-variant px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-secondary/55 bg-surface-container-low"
                        placeholder="Q3 Certificate Invitation"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[9px]">Email Subject</label>
                      <input
                        type="text"
                        required
                        value={campaignSubject}
                        onChange={(e) => setCampaignSubject(e.target.value)}
                        className="w-full rounded border border-outline-variant px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-secondary/55 bg-surface-container-low"
                        placeholder="Congratulations! Claim your digital credentials"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[9px]">Message Body</label>
                      <textarea
                        required
                        rows={6}
                        value={campaignBody}
                        onChange={(e) => setCampaignBody(e.target.value)}
                        className="w-full rounded border border-outline-variant px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-secondary/55 bg-surface-container-low font-mono"
                        placeholder="Hello {{recipient_name}}..."
                      />
                      <span className="text-[9px] text-on-surface-variant block mt-1 leading-relaxed">
                        Token tags available: <code>{"{{recipient_name}}"}</code>, <code>{"{{course_name}}"}</code>, <code>{"{{certificate_id}}"}</code>, <code>{"{{download_url}}"}</code>, <code>{"{{verification_url}}"}</code>
                      </span>
                    </div>
                  </div>

                  {/* Recipient Selection checklist */}
                  <div className="flex flex-col border border-outline-variant rounded-xl p-3 bg-surface-container-low/20">
                    <div className="flex justify-between items-center mb-2 border-b pb-1">
                      <span className="font-bold text-[9px] text-on-surface-variant uppercase">Select Recipients ({selectedRecipients.length})</span>
                      <button 
                        type="button" 
                        onClick={toggleSelectAll} 
                        className="text-secondary font-bold text-[9px] hover:underline uppercase"
                      >
                        {selectedRecipients.length === recipients.length ? 'Clear All' : 'Select All'}
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1.5 max-h-56">
                      {recipients.length === 0 ? (
                        <p className="text-on-surface-variant opacity-60 text-center py-10">No recipients in database. Add them in the Recipients tab.</p>
                      ) : (
                        recipients.map(r => (
                          <label key={r.id} className="flex items-center gap-2.5 p-1.5 rounded hover:bg-surface-container cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={selectedRecipients.includes(r.id)}
                              onChange={() => toggleRecipient(r.id)}
                              className="rounded text-secondary"
                            />
                            <div className="truncate">
                              <p className="font-bold text-on-surface text-[10px]">{r.name}</p>
                              <p className="text-[9px] text-on-surface-variant/80 truncate">{r.email}</p>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 border border-outline rounded-lg py-2 font-semibold hover:bg-surface-container"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-secondary text-white font-bold py-2 rounded-lg hover:opacity-90 active:scale-95 shadow-md flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">send</span>
                    Send Campaign
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  Tooltip, 
  AreaChart, 
  Area 
} from 'recharts';
import { db } from '../services/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { AnalyticsService } from '../services/analytics.service';

export default function DashboardPage() {
  const [issuedCount, setIssuedCount] = useState<number>(0);
  const [verifiedCount, setVerifiedCount] = useState<number>(0);
  const [verificationRate, setVerificationRate] = useState<number>(0);
  const [emailSuccessRate, setEmailSuccessRate] = useState<number>(100);
  const [trends, setTrends] = useState<any[]>([]);
  const [traffic, setTraffic] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. Subscribe to certificates collection changes
    const unsubCerts = onSnapshot(collection(db, 'certificates'), async () => {
      try {
        const total = await AnalyticsService.getTotalCertificates();
        setIssuedCount(total);
        
        const monthlyTrends = await AnalyticsService.getMonthlyIssuance();
        setTrends(monthlyTrends);
      } catch (err) {
        console.error('Error fetching certificates stats:', err);
      }
    });

    // 2. Subscribe to audit logs collection changes
    const unsubLogs = onSnapshot(collection(db, 'audit_logs'), async () => {
      try {
        const verifData = await AnalyticsService.getVerificationRate();
        setVerifiedCount(verifData.totalVerified);
        setVerificationRate(verifData.rate);

        const emailData = await AnalyticsService.getEmailMetrics();
        setEmailSuccessRate(emailData.successRate);

        const recent = await AnalyticsService.getRecentActivity(5);
        setRecentLogs(recent);

        const trafficData = await AnalyticsService.getVerificationTraffic();
        setTraffic(trafficData);
      } catch (err) {
        console.error('Error fetching audit logs stats:', err);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      unsubCerts();
      unsubLogs();
    };
  }, []);

  const renderLogActivity = (log: any) => {
    let icon = 'info';
    let title = 'System Activity';
    let desc = 'An event occurred in the system.';
    let tagColor = 'bg-surface-container-high text-on-surface-variant';
    let tagText = 'EVENT';

    switch (log.action) {
      case 'CERTIFICATE_GENERATED':
        icon = 'auto_awesome';
        title = 'Certificate issued';
        desc = `Issued to ${log.metadata?.name || 'unknown'} (${log.metadata?.email || ''}) for ${log.metadata?.course || ''}.`;
        tagColor = 'bg-green-100 text-green-700';
        tagText = 'SUCCESS';
        break;
      case 'CERTIFICATE_VERIFIED':
        icon = log.metadata?.isValid ? 'verified' : 'gpp_maybe';
        title = 'Verification check';
        desc = `Certificate ${log.entityId} check result: ${log.metadata?.isValid ? 'VALID' : 'FAILED/INVALID'} (${log.metadata?.reason || 'Verified'}).`;
        tagColor = log.metadata?.isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
        tagText = log.metadata?.isValid ? 'VALID' : 'ALERT';
        break;
      case 'CERTIFICATE_DOWNLOADED':
        icon = 'download';
        title = 'Certificate PDF downloaded';
        desc = `PDF downloaded for certificate ${log.entityId} (${log.metadata?.name || ''}).`;
        tagColor = 'bg-blue-100 text-blue-700';
        tagText = 'DOWNLOAD';
        break;
      case 'EMAIL_SENT':
      case 'EMAIL_DELIVERED':
        icon = 'mail';
        title = 'Email dispatched';
        desc = `Email notifications sent to ${log.metadata?.email || ''}.`;
        tagColor = 'bg-green-50 text-green-700';
        tagText = 'EMAIL';
        break;
      case 'EMAIL_FAILED':
        icon = 'mail_lock';
        title = 'Email dispatch failed';
        desc = `Failed to email ${log.metadata?.email || ''}: ${log.metadata?.error || 'unknown error'}.`;
        tagColor = 'bg-red-100 text-red-700';
        tagText = 'FAILED';
        break;
      case 'TEMPLATE_CREATED':
      case 'TEMPLATE_UPDATED':
        icon = 'palette';
        title = log.action === 'TEMPLATE_CREATED' ? 'Template created' : 'Template updated';
        desc = `Design template '${log.metadata?.name || 'Untitled'}' saved in Firestore.`;
        tagColor = 'bg-blue-50 text-blue-700';
        tagText = 'TEMPLATE';
        break;
      case 'TEMPLATE_DELETED':
        icon = 'delete';
        title = 'Template deleted';
        desc = `Template ${log.entityId} was permanently deleted.`;
        tagColor = 'bg-red-100 text-red-700';
        tagText = 'DELETED';
        break;
      case 'RECIPIENT_CREATED':
        icon = 'person_add';
        title = 'Recipient added';
        desc = `Recipient ${log.metadata?.name || ''} (${log.metadata?.email || ''}) was added to roster.`;
        tagColor = 'bg-amber-100 text-amber-700';
        tagText = 'RECIPIENT';
        break;
      case 'RECIPIENT_IMPORTED':
        icon = 'upload_file';
        title = 'CSV bulk import';
        desc = `Imported ${log.metadata?.count || 0} recipients successfully.`;
        tagColor = 'bg-amber-100 text-amber-700';
        tagText = 'IMPORT';
        break;
      case 'LOGIN_SUCCESS':
        icon = 'login';
        title = 'User signed in';
        desc = `Admin session started for user ${log.metadata?.email || log.userId}.`;
        tagColor = 'bg-purple-100 text-purple-700';
        tagText = 'SESSION';
        break;
      case 'LOGIN_FAILED':
        icon = 'lock';
        title = 'Sign in failed';
        desc = `Failed login attempt for user ${log.metadata?.email || log.entityId || ''}.`;
        tagColor = 'bg-red-100 text-red-700';
        tagText = 'SECURITY';
        break;
      case 'LOGOUT':
        icon = 'logout';
        title = 'User signed out';
        desc = `Session ended for user ${log.metadata?.email || log.userId}.`;
        tagColor = 'bg-purple-100 text-purple-700';
        tagText = 'SESSION';
        break;
    }

    return (
      <div key={log.id} className="flex gap-4 items-start relative z-10">
        <div className={`${tagColor} p-2 rounded-full shrink-0 flex items-center justify-center`}>
          <span className="material-symbols-outlined text-sm">{icon}</span>
        </div>
        <div className="flex-1 text-xs">
          <p className="font-semibold text-on-surface">{title}</p>
          <p className="text-on-surface-variant mt-0.5">{desc}</p>
          <span className="text-[10px] text-on-surface-variant opacity-60 mt-1 block">
            {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Just now'}
          </span>
        </div>
        <div className={`px-2 py-0.5 rounded ${tagColor} text-[9px] font-bold`}>{tagText}</div>
      </div>
    );
  };

  if (isLoading && issuedCount === 0 && recentLogs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-xs text-on-surface-variant">
        <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin mr-3"></div>
        <span>Syncing live dashboard metrics...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Metric Cards Top Tier */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Key metrics">
        <div className="sm:col-span-2 bg-white border border-outline-variant rounded-2xl p-5 flex items-center justify-between overflow-hidden relative group shadow-sm min-h-[120px]">
          <div className="relative z-10">
            <p className="font-label-code text-[11px] text-on-surface-variant uppercase tracking-tighter mb-1">
              Total Certificates Issued
            </p>
            <h3 className="font-display-lg text-4xl font-extrabold text-secondary tracking-tighter">
              {issuedCount.toLocaleString()}
            </h3>
            <div className="flex items-center gap-1.5 mt-2 text-green-600">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              <span className="text-xs font-bold">Real-time database sync active</span>
            </div>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-32 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-[120px] translate-x-4 translate-y-4">verified</span>
          </div>
        </div>

        <div className="bg-white border border-outline-variant rounded-2xl p-5 flex flex-col justify-center shadow-sm min-h-[120px]">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-surface-container-low rounded-lg text-secondary flex items-center">
              <span className="material-symbols-outlined text-md">fact_check</span>
            </div>
            <p className="text-xs text-on-surface-variant font-semibold">Certificates Verified</p>
          </div>
          <h4 className="text-xl font-bold text-on-surface">{verifiedCount.toLocaleString()}</h4>
          <p className="text-[10px] text-on-surface-variant mt-1">Verification Rate: {verificationRate.toFixed(1)}%</p>
        </div>

        <div className="bg-white border border-outline-variant rounded-2xl p-5 flex flex-col justify-center shadow-sm min-h-[120px]">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 rounded-lg text-green-600 flex items-center">
              <span className="material-symbols-outlined text-md">mail</span>
            </div>
            <p className="text-xs text-on-surface-variant font-semibold">Email Delivery Success</p>
          </div>
          <h4 className="text-xl font-bold text-on-surface">{emailSuccessRate.toFixed(2)}%</h4>
          <div className="w-full bg-surface-container-low h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-green-600 h-full rounded-full" style={{ width: `${emailSuccessRate}%` }}></div>
          </div>
        </div>
      </section>

      {/* Charts Bento Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Monthly Trend Chart */}
        <div className="lg:col-span-2 bg-white border border-outline-variant rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-title-lg text-sm font-bold text-on-surface">Monthly Issuance Trends</h3>
              <p className="text-xs text-on-surface-variant">Active Year-To-Date Issuances</p>
            </div>
            <div className="flex gap-1">
              <button className="px-3 py-1 bg-secondary text-white text-[10px] font-bold rounded-lg">MONTHLY</button>
            </div>
          </div>
          
          <div className="h-[240px] md:h-[280px] w-full">
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#45464d' }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                  <Bar dataKey="Issued" fill="#712ae2" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-on-surface-variant opacity-60">
                No issuance trend data available yet.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Actions & Live Traffic */}
        <div className="flex flex-col gap-6">
          {/* Quick Actions */}
          <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm">
            <h3 className="font-title-lg text-sm font-bold text-on-surface mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/designer" className="w-full flex items-center justify-between p-3 bg-surface-container-low hover:bg-surface-container-high border border-outline-variant rounded-lg group transition-all">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary">add_circle</span>
                  <span className="text-xs font-semibold">New Template</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
              </Link>
              <Link to="/recipients" className="w-full flex items-center justify-between p-3 bg-surface-container-low hover:bg-surface-container-high border border-outline-variant rounded-lg group transition-all">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary">upload_file</span>
                  <span className="text-xs font-semibold">Import Recipients</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
              </Link>
              <Link to="/generation" className="w-full flex items-center justify-between p-3 bg-secondary hover:opacity-95 text-white rounded-lg group transition-all shadow-md">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined">send</span>
                  <span className="text-xs font-bold">Issue Bulk</span>
                </div>
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">chevron_right</span>
              </Link>
            </div>
          </div>

          {/* Area Chart: Verification Traffic */}
          <div className="bg-[#1a1c2e] text-white border border-outline rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-xs font-bold opacity-80 uppercase tracking-widest">Verification Traffic</h4>
              <span className="text-[#acedff] text-[10px] font-bold animate-pulse">● LIVE</span>
            </div>
            <div className="h-16 w-full pr-4">
              {traffic.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={traffic} margin={{ top: 0, right: 0, left: -40, bottom: 0 }}>
                    <Tooltip contentStyle={{ backgroundColor: '#1a1c2e', borderColor: '#45464d', color: 'white' }} />
                    <Area type="monotone" dataKey="count" stroke="#acedff" fill="rgba(172, 237, 255, 0.15)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[10px] text-white opacity-40">
                  No verification traffic recorded.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Logs */}
      <section className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm" role="region" aria-label="Recent activity">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-title-lg text-sm font-bold text-on-surface">Recent Activity</h3>
          <Link to="/analytics" className="text-secondary text-xs font-bold hover:underline">View All Logs</Link>
        </div>
        
        <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant">
          {recentLogs.length > 0 ? (
            recentLogs.map((log) => renderLogActivity(log))
          ) : (
            <div className="text-center py-6 text-xs text-on-surface-variant opacity-60">
              No recent system activities logged.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

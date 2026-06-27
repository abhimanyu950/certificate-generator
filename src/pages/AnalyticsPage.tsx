import { useEffect, useState } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  Tooltip, 
  Legend 
} from 'recharts';
import { db } from '../services/firebase';
import { collection, onSnapshot, getDocs, limit, query } from 'firebase/firestore';
import { AnalyticsService } from '../services/analytics.service';
import type { MonthlyTrend, TemplateStat, ActiveUser } from '../services/analytics.service';


export default function AnalyticsPage() {
  const [totalIssuance, setTotalIssuance] = useState<number>(0);
  const [verificationRate, setVerificationRate] = useState<number>(0);
  const [emailSuccessRate, setEmailSuccessRate] = useState<number>(100);
  const [dbLatency, setDbLatency] = useState<string>('24ms');
  const [chartData, setChartData] = useState<MonthlyTrend[]>([]);
  const [emailSentCount, setEmailSentCount] = useState<number>(0);
  const [emailFailedCount, setEmailFailedCount] = useState<number>(0);
  const [topTemplates, setTopTemplates] = useState<TemplateStat[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Cost & Security Telemetry states
  const [activeSubTab, setActiveSubTab] = useState<'performance' | 'cost' | 'security'>('performance');
  const [costEstimate, setCostEstimate] = useState<any>(null);
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [securityStats, setSecurityStats] = useState({
    failedLogins: 0,
    permissionDenied: 0,
    excessiveVerifications: 0,
    excessiveEmailFailures: 0
  });

  const loadOpsMetrics = async () => {
    try {
      const est = await AnalyticsService.getResourceUsageEstimate();
      setCostEstimate(est);
      const secLogs = await AnalyticsService.getSecurityEvents(30);
      setSecurityEvents(secLogs);

      let logins = 0;
      let perms = 0;
      let excessVerif = 0;
      let excessEmail = 0;

      secLogs.forEach(l => {
        if (l.action === 'LOGIN_FAILED') logins++;
        if (l.action === 'PERMISSION_DENIED') perms++;
        if (l.action === 'SECURITY_ALERT') {
          if (l.metadata?.type === 'EXCESSIVE_VERIFICATIONS') excessVerif++;
          if (l.metadata?.type === 'EXCESSIVE_EMAIL_FAILURES') excessEmail++;
        }
      });

      setSecurityStats({
        failedLogins: logins,
        permissionDenied: perms,
        excessiveVerifications: excessVerif,
        excessiveEmailFailures: excessEmail
      });
    } catch (e) {
      console.warn('Failed to load ops metrics:', e);
    }
  };

  // Measure Firestore latency
  const measureLatency = async () => {
    try {
      const start = Date.now();
      const q = query(collection(db, 'templates'), limit(1));
      await getDocs(q);
      const diff = Date.now() - start;
      setDbLatency(`${diff}ms`);
    } catch (e) {
      console.warn('Failed to measure Firestore latency:', e);
    }
  };

  useEffect(() => {
    measureLatency();
    loadOpsMetrics();

    // 1. Subscribe to certificates collection changes
    const unsubCerts = onSnapshot(collection(db, 'certificates'), async () => {
      try {
        const total = await AnalyticsService.getTotalCertificates();
        setTotalIssuance(total);

        const doubleChart = await AnalyticsService.getMonthlyIssuance();
        setChartData(doubleChart);

        const templateStats = await AnalyticsService.getTemplateStatistics();
        setTopTemplates(templateStats);
        loadOpsMetrics();
      } catch (err) {
        console.error('Error fetching certificates analytics:', err);
      }
    });

    // 2. Subscribe to audit logs collection changes
    const unsubLogs = onSnapshot(collection(db, 'audit_logs'), async () => {
      try {
        const verifData = await AnalyticsService.getVerificationRate();
        setVerificationRate(verifData.rate);

        const emailData = await AnalyticsService.getEmailMetrics();
        setEmailSuccessRate(emailData.successRate);
        setEmailSentCount(emailData.totalSent);
        setEmailFailedCount(emailData.totalFailed);

        const activeUsrs = await AnalyticsService.getMostActiveUsers();
        setActiveUsers(activeUsrs);
        loadOpsMetrics();
        
        // Periodic latency check
        measureLatency();
      } catch (err) {
        console.error('Error fetching logs analytics:', err);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      unsubCerts();
      unsubLogs();
    };
  }, []);

  if (isLoading && totalIssuance === 0 && activeUsers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-xs text-on-surface-variant">
        <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin mr-3"></div>
        <span>Compiling real-time system performance audits...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-on-surface">Operations & Threat Observation</h2>
          <p className="text-xs text-on-surface-variant">Visualizing database latency, resources consumption, and cryptographic telemetry.</p>
        </div>
        <button
          onClick={() => alert('Feature incoming: Generating PDF Annual Audit Report...')}
          className="flex items-center gap-1.5 px-4 py-2 bg-secondary hover:opacity-90 active:scale-95 text-white font-bold rounded-lg text-xs shadow-md"
        >
          <span className="material-symbols-outlined text-sm">download</span>
          Download Annual Report
        </button>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex gap-2 border-b pb-1">
        <button
          onClick={() => setActiveSubTab('performance')}
          className={`px-4 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-all ${
            activeSubTab === 'performance'
              ? 'border-secondary text-secondary bg-surface-container-low/50 shadow-sm'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          System Performance
        </button>
        <button
          onClick={() => setActiveSubTab('cost')}
          className={`px-4 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-all ${
            activeSubTab === 'cost'
              ? 'border-secondary text-secondary bg-surface-container-low/50 shadow-sm'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Resource & Cost Monitoring
        </button>
        <button
          onClick={() => setActiveSubTab('security')}
          className={`px-4 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-all ${
            activeSubTab === 'security'
              ? 'border-secondary text-secondary bg-surface-container-low/50 shadow-sm'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Security Telemetry
        </button>
      </div>

      {activeSubTab === 'performance' && (
        <>
          {/* Top Tier Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Issuance', val: totalIssuance.toLocaleString(), icon: 'workspace_premium', color: 'text-secondary' },
              { label: 'Verification Rate', val: `${verificationRate.toFixed(1)}%`, icon: 'verified', color: 'text-green-600' },
              { label: 'Email Success Rate', val: `${emailSuccessRate.toFixed(1)}%`, icon: 'mail', color: 'text-blue-600' },
              { label: 'DB Read Latency', val: dbLatency, icon: 'bolt', color: 'text-on-surface-variant' }
            ].map((m, i) => (
              <div key={i} className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-center text-on-surface-variant">
                  <span className="text-[10px] font-bold uppercase tracking-wider">{m.label}</span>
                  <span className={`material-symbols-outlined text-md ${m.color}`}>{m.icon}</span>
                </div>
                <p className="text-2xl font-black text-on-surface mt-2">{m.val}</p>
              </div>
            ))}
          </div>

          {/* Comparative Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recharts comparative double bar chart */}
            <div className="lg:col-span-2 bg-white border border-outline-variant rounded-xl p-5 shadow-sm text-xs">
              <h3 className="font-bold text-sm text-on-surface mb-1">Monthly Issuance vs. Verification</h3>
              <p className="text-on-surface-variant mb-6">Comparative analysis of certificate creation and successful validation audits.</p>
              
              <div className="h-64 w-full pr-4">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#45464d' }} />
                      <Tooltip cursor={{ fill: 'rgba(0,0,0,0.01)' }} />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 10, paddingBottom: 10 }} />
                      <Bar dataKey="Issuance" fill="#712ae2" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Verifications" fill="#c6c6cd" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-on-surface-variant opacity-60">
                    No monthly trends available.
                  </div>
                )}
              </div>
            </div>

            {/* Deliverability Statistics Card */}
            <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm text-xs flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm text-on-surface mb-1">Email Delivery Performance</h3>
                <p className="text-on-surface-variant mb-6">Email throughput and service success tracking metrics.</p>
                
                <div className="space-y-4">
                  {[
                    { label: 'Successful Dispatches', percentage: Math.round(emailSuccessRate), value: `${emailSentCount} sent` },
                    { label: 'Failed Transmissions', percentage: Math.round(100 - emailSuccessRate), value: `${emailFailedCount} failed` }
                  ].map((p, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span className="text-on-surface-variant">{p.label}</span>
                        <span className="font-label-code">{p.value} ({p.percentage}%)</span>
                      </div>
                      <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${i === 0 ? 'bg-secondary' : 'bg-red-500'}`} 
                          style={{ width: `${p.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="pt-4 border-t flex items-center gap-3 mt-4">
                <div className="p-2 bg-secondary/10 rounded-lg text-secondary flex items-center">
                  <span className="material-symbols-outlined text-sm font-bold">trending_up</span>
                </div>
                <span className="text-[11px] text-on-surface-variant">
                  Delivery metrics are synced in real-time with browser-level dispatch logging.
                </span>
              </div>
            </div>
          </div>

          {/* Global Heatmap and Leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Most Active Admins / Users Leaderboard */}
            <div className="lg:col-span-2 bg-white border border-outline-variant rounded-xl p-5 shadow-sm text-xs flex flex-col">
              <h3 className="font-bold text-sm text-on-surface mb-1">Most Active Operators</h3>
              <p className="text-on-surface-variant mb-4">Top database contributors based on logged audit actions.</p>
              <div className="flex-1 overflow-x-auto">
                {activeUsers.length > 0 ? (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-outline-variant/60 font-label-code text-[10px] text-on-surface-variant uppercase font-bold">
                        <th className="pb-2">Operator</th>
                        <th className="pb-2">Role</th>
                        <th className="pb-2 text-right">Actions Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30">
                      {activeUsers.map((u, idx) => (
                        <tr key={idx} className="hover:bg-surface-container-low/20">
                          <td className="py-2.5">
                            <p className="font-bold text-on-surface">{u.name}</p>
                            <p className="text-[10px] text-on-surface-variant">{u.email}</p>
                          </td>
                          <td className="py-2.5">
                            <span className="px-1.5 py-0.5 bg-surface-container text-on-surface-variant rounded text-[9px] font-mono uppercase font-bold">
                              {u.role}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-bold text-secondary">{u.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="h-full flex items-center justify-center text-on-surface-variant opacity-60 py-6">
                    No active operator records available.
                  </div>
                )}
              </div>
            </div>

            {/* Top Templates Leaderboard */}
            <div className="lg:col-span-2 bg-white border border-outline-variant rounded-xl p-5 flex flex-col shadow-sm text-xs justify-between">
              <div>
                <h3 className="font-bold text-sm text-on-surface mb-1">Top Templates</h3>
                <p className="text-on-surface-variant mb-4">Most frequently used design structures.</p>
                <div className="space-y-4">
                  {topTemplates.length > 0 ? (
                    topTemplates.map(t => (
                      <div key={t.rank} className="flex items-center justify-between border-b pb-2 border-outline-variant/20 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <span className="font-label-code text-on-surface-variant font-bold">{t.rank}</span>
                          <span className="font-medium text-on-surface">{t.name}</span>
                        </div>
                        <span className="font-label-code font-bold text-secondary">{t.count} issued</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-on-surface-variant opacity-60">
                      No certificates issued yet to rank templates.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeSubTab === 'cost' && (
        <div className="space-y-6">
          {/* Top cost summary banner */}
          <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white rounded-2xl p-6 shadow-lg border border-purple-500/20 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 opacity-10 pointer-events-none">
              <span className="material-symbols-outlined text-[180px] font-black text-white">payments</span>
            </div>
            <div className="max-w-xl space-y-2">
              <span className="bg-purple-500/30 text-purple-200 border border-purple-400/30 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                GCP Billing Telemetry
              </span>
              <h3 className="text-2xl font-black">Estimated Monthly GCP Costs</h3>
              <p className="text-xs text-purple-200/80">
                A live forecast of Firestore database operations and Cloud Storage consumption based on certificate issuances and audits.
              </p>
              <div className="pt-4 flex items-baseline gap-2">
                <span className="text-4xl font-black tracking-tight">
                  ${costEstimate?.estimatedCost !== undefined ? costEstimate.estimatedCost.toFixed(2) : '0.00'}
                </span>
                <span className="text-xs text-purple-200/60">/ Month (USD)</span>
              </div>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                title: 'Firestore Reads',
                val: costEstimate?.reads !== undefined ? costEstimate.reads.toLocaleString() : '0',
                cost: `$${costEstimate?.reads !== undefined ? (costEstimate.reads / 100000 * 0.06).toFixed(4) : '0.0000'}`,
                unit: '0.06$ per 100k',
                icon: 'database',
                color: 'from-blue-500/5 to-cyan-500/5 border-blue-500/20 text-blue-600',
                desc: 'Dashboard loads, audit queries, and verification requests.'
              },
              {
                title: 'Firestore Writes',
                val: costEstimate?.writes !== undefined ? costEstimate.writes.toLocaleString() : '0',
                cost: `$${costEstimate?.writes !== undefined ? (costEstimate.writes / 100000 * 0.18).toFixed(4) : '0.0000'}`,
                unit: '0.18$ per 100k',
                icon: 'edit_square',
                color: 'from-purple-500/5 to-pink-500/5 border-purple-500/20 text-purple-600',
                desc: 'Certificate issuance, audit logging, and registry modifications.'
              },
              {
                title: 'Storage Capacity',
                val: costEstimate?.storageGb !== undefined ? `${costEstimate.storageGb.toFixed(4)} GB` : '0 GB',
                cost: `$${costEstimate?.storageGb !== undefined ? (costEstimate.storageGb * (0.18 + 0.026)).toFixed(4) : '0.0000'}`,
                unit: '0.18$ + 0.026$ per GB',
                icon: 'cloud',
                color: 'from-green-500/5 to-emerald-500/5 border-green-500/20 text-green-600',
                desc: 'PDF documents stored in Firebase Storage & DB metadata.'
              }
            ].map((c, i) => (
              <div key={i} className={`bg-white border rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{c.title}</span>
                    <p className="text-xl font-black text-on-surface mt-1">{c.val}</p>
                  </div>
                  <span className={`material-symbols-outlined text-md p-1.5 rounded-lg bg-surface-container`}>{c.icon}</span>
                </div>
                <div className="mt-4 pt-3 border-t border-outline-variant/60 flex justify-between items-baseline">
                  <div>
                    <span className="text-[9px] text-on-surface-variant uppercase block">Calculated Cost</span>
                    <span className="font-label-code font-bold text-on-surface">{c.cost}</span>
                  </div>
                  <span className="text-[9px] text-on-surface-variant font-mono">{c.unit}</span>
                </div>
                <p className="text-[10px] text-on-surface-variant mt-2 opacity-80 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>

          {/* Pricing detail list */}
          <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm text-xs">
            <h3 className="font-bold text-sm text-on-surface mb-1">Cost Projection Breakdown</h3>
            <p className="text-on-surface-variant mb-4">Detailed pricing factors based on Google Cloud Platform pricing calculators.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-outline-variant/60 font-label-code text-[10px] text-on-surface-variant uppercase font-bold">
                    <th className="pb-2">GCP Resource</th>
                    <th className="pb-2">Operation/Metric</th>
                    <th className="pb-2 text-right">Estimated Monthly Usage</th>
                    <th className="pb-2 text-right">GCP Unit Price</th>
                    <th className="pb-2 text-right font-bold text-secondary">Estimated Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30 font-medium">
                  <tr>
                    <td className="py-2.5">
                      <p className="font-bold text-on-surface">Firestore Reads</p>
                      <p className="text-[9px] text-on-surface-variant">Real-time snapshots & dashboards</p>
                    </td>
                    <td className="py-2.5 text-on-surface-variant">Document Reads</td>
                    <td className="py-2.5 text-right font-mono">
                      {costEstimate?.reads !== undefined ? costEstimate.reads.toLocaleString() : '0'}
                    </td>
                    <td className="py-2.5 text-right font-mono">$0.06 / 100k</td>
                    <td className="py-2.5 text-right font-bold text-secondary">
                      ${costEstimate?.reads !== undefined ? (costEstimate.reads / 100000 * 0.06).toFixed(4) : '0.0000'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5">
                      <p className="font-bold text-on-surface">Firestore Writes</p>
                      <p className="text-[9px] text-on-surface-variant">Credentials creation & audit trials</p>
                    </td>
                    <td className="py-2.5 text-on-surface-variant">Document Writes</td>
                    <td className="py-2.5 text-right font-mono">
                      {costEstimate?.writes !== undefined ? costEstimate.writes.toLocaleString() : '0'}
                    </td>
                    <td className="py-2.5 text-right font-mono">$0.18 / 100k</td>
                    <td className="py-2.5 text-right font-bold text-secondary">
                      ${costEstimate?.writes !== undefined ? (costEstimate.writes / 100000 * 0.18).toFixed(4) : '0.0000'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5">
                      <p className="font-bold text-on-surface">Cloud Storage Capacity</p>
                      <p className="text-[9px] text-on-surface-variant">Signed certificate PDF documents</p>
                    </td>
                    <td className="py-2.5 text-on-surface-variant">Object Storage</td>
                    <td className="py-2.5 text-right font-mono">
                      {costEstimate?.storageGb !== undefined ? `${costEstimate.storageGb.toFixed(4)} GB` : '0 GB'}
                    </td>
                    <td className="py-2.5 text-right font-mono">$0.026 / GB</td>
                    <td className="py-2.5 text-right font-bold text-secondary">
                      ${costEstimate?.storageGb !== undefined ? (costEstimate.storageGb * 0.026).toFixed(4) : '0.0000'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5">
                      <p className="font-bold text-on-surface">Firestore DB Storage</p>
                      <p className="text-[9px] text-on-surface-variant">Database document indexes & metadata</p>
                    </td>
                    <td className="py-2.5 text-on-surface-variant">Database Storage</td>
                    <td className="py-2.5 text-right font-mono">
                      {costEstimate?.storageGb !== undefined ? `${costEstimate.storageGb.toFixed(4)} GB` : '0 GB'}
                    </td>
                    <td className="py-2.5 text-right font-mono">$0.18 / GB</td>
                    <td className="py-2.5 text-right font-bold text-secondary">
                      ${costEstimate?.storageGb !== undefined ? (costEstimate.storageGb * 0.18).toFixed(4) : '0.0000'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 p-4 bg-surface-container/60 rounded-xl border border-outline-variant/40 flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary text-sm font-bold mt-0.5">info</span>
              <div className="space-y-1">
                <span className="font-bold text-on-surface text-xs block">Firebase Spark (Free Tier) Allowance</span>
                <p className="text-on-surface-variant text-[11px] leading-relaxed">
                  Firestore free tiers grant 50,000 Reads and 20,000 Writes daily, along with 1 GB of database storage. Cloud Storage includes 5 GB of free capacity. If operations remain within these parameters, actual Google Cloud Platform invoices will reflect a <strong>$0.00 balance</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'security' && (
        <div className="space-y-6">
          {/* Top Threat Indicators Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              {
                label: 'Failed Login Attempts',
                val: securityStats.failedLogins,
                icon: 'login',
                color: 'text-red-600 bg-red-50 border-red-200'
              },
              {
                label: 'Access Denials',
                val: securityStats.permissionDenied,
                icon: 'gpp_bad',
                color: 'text-amber-600 bg-amber-50 border-amber-200'
              },
              {
                label: 'Verification Spikes',
                val: securityStats.excessiveVerifications,
                icon: 'policy',
                color: 'text-red-600 bg-red-50 border-red-200'
              },
              {
                label: 'Email Dispatch Failures',
                val: securityStats.excessiveEmailFailures,
                icon: 'mail_lock',
                color: 'text-red-600 bg-red-50 border-red-200'
              }
            ].map((m, i) => (
              <div key={i} className={`bg-white border rounded-xl p-5 shadow-sm flex items-center justify-between ${m.color.split(' ')[2]}`}>
                <div>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{m.label}</span>
                  <p className="text-2xl font-black text-on-surface mt-1">{m.val}</p>
                </div>
                <span className={`material-symbols-outlined text-lg p-2 rounded-xl ${m.color.split(' ')[0]} ${m.color.split(' ')[1]}`}>{m.icon}</span>
              </div>
            ))}
          </div>

          {/* Live security logs log-table */}
          <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm text-xs">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-sm text-on-surface mb-1">Threat Telemetry & Security Audit Feed</h3>
                <p className="text-on-surface-variant">Real-time log of administrative changes, authorization failures, and compliance events.</p>
              </div>
              <span className="flex items-center gap-1 text-[10px] bg-red-500/10 text-red-600 font-bold border border-red-500/20 px-2 py-0.5 rounded-full animate-pulse">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                LIVE AUDIT
              </span>
            </div>

            <div className="overflow-x-auto">
              {securityEvents.length > 0 ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-outline-variant/60 font-label-code text-[10px] text-on-surface-variant uppercase font-bold">
                      <th className="pb-2">Timestamp</th>
                      <th className="pb-2">Security Event</th>
                      <th className="pb-2">Actor (UID)</th>
                      <th className="pb-2">Target Entity</th>
                      <th className="pb-2">Audit Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30 font-medium">
                    {securityEvents.map((evt) => {
                      let badgeColor = 'bg-surface-container text-on-surface-variant';
                      if (evt.action === 'LOGIN_FAILED' || evt.action === 'SECURITY_ALERT') {
                        badgeColor = 'bg-red-500/15 text-red-700 border border-red-500/20';
                      } else if (evt.action === 'PERMISSION_DENIED') {
                        badgeColor = 'bg-amber-500/15 text-amber-700 border border-amber-500/20';
                      } else if (evt.action === 'USER_DISABLED' || evt.action === 'CERTIFICATE_REVOKED') {
                        badgeColor = 'bg-orange-500/15 text-orange-700 border border-orange-500/20';
                      } else if (evt.action === 'STORAGE_FALLBACK_USED') {
                        badgeColor = 'bg-amber-500/15 text-amber-700 border border-amber-500/20';
                      }

                      return (
                        <tr key={evt.id} className="hover:bg-surface-container-low/20">
                          <td className="py-2.5 text-on-surface-variant font-mono whitespace-nowrap text-[10px]">
                            {new Date(evt.timestamp).toLocaleString()}
                          </td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold ${badgeColor}`}>
                              {evt.action}
                            </span>
                          </td>
                          <td className="py-2.5 font-mono text-[10px] text-on-surface-variant max-w-[120px] truncate" title={evt.userId}>
                            {evt.userId}
                          </td>
                          <td className="py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.2 bg-surface-container text-on-surface-variant rounded text-[9px] uppercase font-bold">
                                {evt.entityType}
                              </span>
                              <span className="font-mono text-[10px] text-on-surface-variant max-w-[80px] truncate" title={evt.entityId}>
                                {evt.entityId}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 text-on-surface text-[11px]">
                            {evt.action === 'SECURITY_ALERT' && (
                              <span className="text-red-600 font-semibold">
                                {evt.metadata?.type || 'ALERT'}: {evt.metadata?.message || 'Suspicious activity detected.'}
                              </span>
                            )}
                            {evt.action === 'PERMISSION_DENIED' && (
                              <span className="text-amber-700">
                                Path: {evt.metadata?.path || 'N/A'} (Unauthorized access attempt)
                              </span>
                            )}
                            {evt.action === 'USER_DISABLED' && (
                              <span>Account disabled. Reason: {evt.metadata?.reason || 'Security lock'}</span>
                            )}
                            {evt.action === 'CERTIFICATE_REVOKED' && (
                              <span className="text-red-700">
                                Revocation initiated. Reason: <span className="font-bold">{evt.metadata?.reason || 'None provided'}</span>
                              </span>
                            )}
                            {evt.action === 'LOGIN_FAILED' && (
                              <span>Failed login attempt for account: <span className="font-mono">{evt.metadata?.email || 'unknown'}</span></span>
                            )}
                            {evt.action === 'STORAGE_FALLBACK_USED' && (
                              <span className="text-amber-700">
                                Warning: {evt.metadata?.reason || 'Firebase Storage upload skipped/failed (database fallback active)'}
                              </span>
                            )}
                            {![ 'SECURITY_ALERT', 'PERMISSION_DENIED', 'USER_DISABLED', 'CERTIFICATE_REVOKED', 'LOGIN_FAILED', 'STORAGE_FALLBACK_USED' ].includes(evt.action) && (
                              <span className="text-on-surface-variant">{JSON.stringify(evt.metadata)}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-on-surface-variant opacity-60">
                  No security audit logs recorded.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

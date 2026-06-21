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
import { AnalyticsService, MonthlyTrend, TemplateStat, ActiveUser } from '../services/analytics.service';

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

    // 1. Subscribe to certificates collection changes
    const unsubCerts = onSnapshot(collection(db, 'certificates'), async () => {
      try {
        const total = await AnalyticsService.getTotalCertificates();
        setTotalIssuance(total);

        const doubleChart = await AnalyticsService.getMonthlyIssuance();
        setChartData(doubleChart);

        const templateStats = await AnalyticsService.getTemplateStatistics();
        setTopTemplates(templateStats);
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
          <h2 className="text-xl font-bold text-on-surface">System Performance</h2>
          <p className="text-xs text-on-surface-variant">Visualizing credential integrity and distribution flow across global nodes.</p>
        </div>
        <button
          onClick={() => alert('Feature incoming: Generating PDF Annual Audit Report...')}
          className="flex items-center gap-1.5 px-4 py-2 bg-secondary hover:opacity-90 active:scale-95 text-white font-bold rounded-lg text-xs shadow-md"
        >
          <span className="material-symbols-outlined text-sm">download</span>
          Download Annual Report
        </button>
      </div>

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
    </div>
  );
}

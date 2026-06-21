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
import { useRecipientStore } from '../store/recipientStore';
import { getCertificatesLog } from '../services/certificates';

// High-fidelity analytics datasets
const trendsData = [
  { month: 'Jan', Issued: 12000, Verified: 8000 },
  { month: 'Feb', Issued: 18000, Verified: 11000 },
  { month: 'Mar', Issued: 14000, Verified: 9000 },
  { month: 'Apr', Issued: 24000, Verified: 16000 },
  { month: 'May', Issued: 31000, Verified: 20000 },
  { month: 'Jun', Issued: 42000, Verified: 28000 }
];

const trafficData = [
  { time: '10:00', count: 40 },
  { time: '11:00', count: 25 },
  { time: '12:00', count: 68 },
  { time: '13:00', count: 32 },
  { time: '14:00', count: 90 },
  { time: '15:00', count: 42 },
  { time: '16:00', count: 55 },
  { time: '17:00', count: 38 },
  { time: '18:00', count: 85 }
];

export default function DashboardPage() {
  const { recipients } = useRecipientStore();
  const [issuedCount, setIssuedCount] = useState(1284000);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    // Large counter animate-up logic from static template
    let current = 1284000;
    const target = 1284092 + recipients.length; // Add imported count
    const increment = Math.ceil((target - current) / 20);
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      setIssuedCount(current);
    }, 25);
    return () => clearInterval(timer);
  }, [recipients]);

  useEffect(() => {
    const fetchLogs = async () => {
      const logs = await getCertificatesLog(5);
      setRecentLogs(logs);
    };
    fetchLogs();
  }, []);

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
              <span className="text-xs font-bold">+12.4% from last month</span>
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
          <h4 className="text-xl font-bold text-on-surface">842,109</h4>
          <p className="text-[10px] text-on-surface-variant mt-1">Verification Rate: 65.5%</p>
        </div>

        <div className="bg-white border border-outline-variant rounded-2xl p-5 flex flex-col justify-center shadow-sm min-h-[120px]">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 rounded-lg text-green-600 flex items-center">
              <span className="material-symbols-outlined text-md">mail</span>
            </div>
            <p className="text-xs text-on-surface-variant font-semibold">Email Delivery Success</p>
          </div>
          <h4 className="text-xl font-bold text-on-surface">99.82%</h4>
          <div className="w-full bg-surface-container-low h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-green-600 h-full rounded-full" style={{ width: '99.82%' }}></div>
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
              <p className="text-xs text-on-surface-variant">Jan 2024 - Jun 2024</p>
            </div>
            <div className="flex gap-1">
              <button className="px-3 py-1 bg-surface-container-low text-[10px] font-bold rounded-lg border border-outline-variant">WEEKLY</button>
              <button className="px-3 py-1 bg-secondary text-white text-[10px] font-bold rounded-lg">MONTHLY</button>
            </div>
          </div>
          
          <div className="h-[240px] md:h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#45464d' }} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                <Bar dataKey="Issued" fill="#712ae2" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficData} margin={{ top: 0, right: 0, left: -40, bottom: 0 }}>
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#acedff" fill="rgba(172, 237, 255, 0.15)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
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
            recentLogs.map((log, idx) => (
              <div key={log.id || idx} className="flex gap-4 items-start relative z-10">
                <div className="bg-surface-container-high p-2 rounded-full text-secondary shrink-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-semibold text-on-surface">Certificate issued</p>
                  <p className="text-on-surface-variant mt-0.5">
                    Issued to <strong>{log.name}</strong> ({log.email}) for {log.course}.
                  </p>
                  <span className="text-[10px] text-on-surface-variant opacity-60 mt-1 block">
                    {new Date(log.issuedAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-[9px] font-bold">SUCCESS</div>
              </div>
            ))
          ) : (
            <>
              <div className="flex gap-4 items-start relative z-10">
                <div className="bg-purple-100 p-2 rounded-full text-secondary shrink-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-semibold text-on-surface">Bulk generation completed</p>
                  <p className="text-on-surface-variant mt-0.5">5,000 certificates issued for 'Q2 Professional Growth' campaign.</p>
                  <span className="text-[10px] text-on-surface-variant opacity-60 mt-1 block">2 hours ago</span>
                </div>
                <div className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-[9px] font-bold">SUCCESS</div>
              </div>

              <div className="flex gap-4 items-start relative z-10">
                <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">palette</span>
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-semibold text-on-surface">New template created</p>
                  <p className="text-on-surface-variant mt-0.5">Designer 'Sarah Jenkins' published 'Annual Award v2.0'.</p>
                  <span className="text-[10px] text-on-surface-variant opacity-60 mt-1 block">5 hours ago</span>
                </div>
                <div className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-bold">TEMPLATE</div>
              </div>

              <div className="flex gap-4 items-start relative z-10">
                <div className="bg-red-100 p-2 rounded-full text-red-600 shrink-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">security</span>
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-semibold text-on-surface">Verification check failed</p>
                  <p className="text-on-surface-variant mt-0.5">Invalid certificate hash detected from IP: 192.168.1.1</p>
                  <span className="text-[10px] text-on-surface-variant opacity-60 mt-1 block">Yesterday at 11:30 PM</span>
                </div>
                <div className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[9px] font-bold">ALERT</div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

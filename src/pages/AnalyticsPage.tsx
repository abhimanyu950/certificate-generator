import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  Tooltip, 
  Legend 
} from 'recharts';

const doubleChartData = [
  { month: 'Jan', Issuance: 12000, Verifications: 8000 },
  { month: 'Feb', Issuance: 18000, Verifications: 11000 },
  { month: 'Mar', Issuance: 14000, Verifications: 9000 },
  { month: 'Apr', Issuance: 24000, Verifications: 16000 },
  { month: 'May', Issuance: 31000, Verifications: 20000 },
  { month: 'Jun', Issuance: 42000, Verifications: 28000 },
  { month: 'Jul', Issuance: 45000, Verifications: 31000 }
];

export default function AnalyticsPage() {
  const regions = [
    { rank: '01', name: 'North America', count: '412k' },
    { rank: '02', name: 'Europe', count: '385k' },
    { rank: '03', name: 'Asia Pacific', count: '291k' },
    { rank: '04', name: 'LATAM', count: '115k' }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-on-surface">System Performance</h2>
          <p className="text-xs text-on-surface-variant">Visualizing credential integrity and distribution flow across global nodes.</p>
        </div>
        <button
          onClick={() => alert('Report download queued...')}
          className="flex items-center gap-1.5 px-4 py-2 bg-secondary hover:opacity-90 active:scale-95 text-white font-bold rounded-lg text-xs shadow-md"
        >
          <span className="material-symbols-outlined text-sm">download</span>
          Download Annual Report
        </button>
      </div>

      {/* Top Tier Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Issuance', val: '1.28M', icon: 'workspace_premium', color: 'text-secondary' },
          { label: 'Verification Rate', val: '94.2%', icon: 'verified', color: 'text-green-600' },
          { label: 'Avg. Open Rate', val: '68.5%', icon: 'mail', color: 'text-blue-600' },
          { label: 'Server Latency', val: '24ms', icon: 'bolt', color: 'text-on-surface-variant' }
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
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={doubleChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#45464d' }} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.01)' }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 10, paddingBottom: 10 }} />
                <Bar dataKey="Issuance" fill="#712ae2" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Verifications" fill="#c6c6cd" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Deliverability Statistics Card */}
        <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm text-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-on-surface mb-1">Delivery Performance</h3>
            <p className="text-on-surface-variant mb-6">Email throughput efficiency tracking metrics.</p>
            
            <div className="space-y-4">
              {[
                { label: 'Successful Deliveries', percentage: 99.8 },
                { label: 'Unique Opens', percentage: 68.5 },
                { label: 'Credentials Claimed', percentage: 54.2 },
                { label: 'Social Sharing Ratio', percentage: 32.1 }
              ].map((p, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span className="text-on-surface-variant">{p.label}</span>
                    <span className="font-label-code">{p.percentage}%</span>
                  </div>
                  <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-secondary" style={{ width: `${p.percentage}%` }}></div>
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
              Deliverability ratio is <strong className="text-on-surface">4.2% higher</strong> than standard industry baselines.
            </span>
          </div>
        </div>
      </div>

      {/* Global Heatmap and Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white border border-outline-variant rounded-xl p-5 h-[340px] flex flex-col shadow-sm relative overflow-hidden text-xs">
          <div>
            <h3 className="font-bold text-sm text-on-surface mb-1">Global Heatmap</h3>
            <p className="text-on-surface-variant">Real-time certificate distribution by geographic region.</p>
          </div>
          <div className="flex-1 bg-surface-container-low/40 rounded-xl mt-4 flex items-center justify-center relative select-none">
            {/* World Map Overlay Graphics */}
            <span className="text-4xl text-on-surface-variant opacity-15">MAP DATA VISUALIZATION AREA</span>
            
            {/* Animated Pulse Points */}
            <div className="absolute top-[30%] left-[20%] w-4 h-4 bg-secondary rounded-full dot-pulse shadow-[0_0_15px_rgba(113,42,226,0.6)]"></div>
            <div className="absolute top-[45%] left-[55%] w-3 h-3 bg-secondary rounded-full dot-pulse shadow-[0_0_10px_rgba(113,42,226,0.4)]"></div>
            <div className="absolute top-[25%] left-[80%] w-5 h-5 bg-secondary rounded-full dot-pulse shadow-[0_0_20px_rgba(113,42,226,0.8)]"></div>
          </div>
        </div>

        <div className="bg-white border border-outline-variant rounded-xl p-5 flex flex-col shadow-sm text-xs justify-between">
          <div>
            <h3 className="font-bold text-sm text-on-surface mb-6">Top Regions</h3>
            <div className="space-y-5">
              {regions.map(r => (
                <div key={r.rank} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-label-code text-on-surface-variant font-bold">{r.rank}</span>
                    <span className="font-medium text-on-surface">{r.name}</span>
                  </div>
                  <span className="font-label-code font-bold text-secondary">{r.count}</span>
                </div>
              ))}
            </div>
          </div>
          
          <button className="w-full py-2 border border-outline hover:bg-surface-container rounded-lg font-bold text-[11px] mt-6 flex justify-center items-center gap-1 text-on-surface">
            View Regional Details
            <span className="material-symbols-outlined text-xs">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}

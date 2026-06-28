import { motion } from 'framer-motion';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, FileText, MessageSquare, BarChart2, Zap, Users, Calendar, Download } from 'lucide-react';
import { Badge } from '../components/ui';
import { analyticsData } from '../store/mockData';

const CHART_COLORS = ['#4F46E5', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

const topPrompts = [
  { name: 'Summarize Agreement', count: 142, pct: 82 },
  { name: 'Risk Analysis', count: 118, pct: 68 },
  { name: 'Extract Obligations', count: 96, pct: 55 },
  { name: 'Find Missing Clauses', count: 74, pct: 43 },
  { name: 'GDPR Compliance', count: 52, pct: 30 },
];

export default function Analytics() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Usage insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input-field py-1.5 text-sm w-auto">
            <option>Last 30 days</option>
            <option>Last 7 days</option>
            <option>Last 90 days</option>
          </select>
          <button className="btn-secondary py-1.5">
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Documents Processed', value: analyticsData.documentsProcessed, icon: FileText, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20', change: '+12%' },
          { label: 'AI Conversations', value: analyticsData.totalConversations, icon: MessageSquare, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20', change: '+18%' },
          { label: 'Reports Generated', value: analyticsData.reportsGenerated, icon: BarChart2, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', change: '+5%' },
          { label: 'Total AI Queries', value: analyticsData.aiQueries.toLocaleString(), icon: Zap, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20', change: '+24%' },
        ].map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="card p-5">
            <div className={`w-10 h-10 rounded-xl ${m.color} flex items-center justify-center mb-3`}>
              <m.icon size={18} />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{m.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{m.label}</div>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp size={11} className="text-emerald-500" />
              <span className="text-xs text-emerald-600 font-medium">{m.change} vs last period</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Monthly trend */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Monthly Trend</h2>
            <p className="text-xs text-slate-500">Documents processed and AI queries over time</p>
          </div>
          <Badge variant="primary">6 months</Badge>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={analyticsData.monthlyTrend}>
            <defs>
              <linearGradient id="docs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="queries" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 12, fontSize: 12, color: '#F1F5F9' }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="docs" stroke="#4F46E5" strokeWidth={2} fill="url(#docs)" name="Documents" />
            <Area type="monotone" dataKey="queries" stroke="#8B5CF6" strokeWidth={2} fill="url(#queries)" name="Queries" yAxisId="right" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly breakdown */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Weekly Activity</h2>
          <p className="text-xs text-slate-500 mb-5">Daily breakdown this week</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analyticsData.weeklyActivity} barSize={8} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 10, fontSize: 11, color: '#F1F5F9' }} cursor={false} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="queries" fill="#4F46E5" radius={[3,3,0,0]} name="Queries" />
              <Bar dataKey="docs" fill="#8B5CF6" radius={[3,3,0,0]} name="Documents" />
              <Bar dataKey="reports" fill="#06B6D4" radius={[3,3,0,0]} name="Reports" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Top prompts */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Most Used Prompts</h2>
          <p className="text-xs text-slate-500 mb-5">Top prompts by usage this month</p>
          <div className="space-y-4">
            {topPrompts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{p.name}</span>
                    <span className="text-xs text-slate-500">{p.count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${p.pct}%` }} transition={{ delay: 0.4 + i * 0.1, duration: 0.6 }}
                      className="h-full rounded-full" style={{ background: CHART_COLORS[i] }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Document types + Risk distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Document Types</h2>
          <p className="text-xs text-slate-500 mb-4">Distribution by format</p>
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={analyticsData.docTypes} cx="50%" cy="50%" innerRadius={45} outerRadius={68} dataKey="value" stroke="none">
                  {analyticsData.docTypes.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 10, fontSize: 11, color: '#F1F5F9' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-2">
              {analyticsData.docTypes.map(d => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                    <span className="text-slate-600 dark:text-slate-400">{d.name}</span>
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="lg:col-span-2 card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Risk Distribution</h2>
          <p className="text-xs text-slate-500 mb-5">Issues identified across all documents</p>
          {[
            { label: 'Critical', value: 4, max: 20, color: 'bg-red-500' },
            { label: 'High', value: 11, max: 20, color: 'bg-orange-500' },
            { label: 'Medium', value: 18, max: 20, color: 'bg-amber-500' },
            { label: 'Low', value: 7, max: 20, color: 'bg-emerald-500' },
          ].map(r => (
            <div key={r.label} className="flex items-center gap-3 mb-4">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-14">{r.label}</span>
              <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(r.value / r.max) * 100}%` }} transition={{ delay: 0.5, duration: 0.6 }}
                  className={`h-full ${r.color} rounded-full`} />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-4">{r.value}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

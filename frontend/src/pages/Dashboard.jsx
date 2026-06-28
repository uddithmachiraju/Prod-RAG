import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Upload, Plus, MessageSquare, BarChart2, StickyNote, ArrowRight, FileText, Clock, TrendingUp, Zap, Users, Activity } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Avatar, Badge, RiskBadge, Skeleton } from '../components/ui';
import { analyticsData, activityFeed } from '../store/mockData';
import { formatTimeAgo } from '../utils/date';

const fadeUp = (delay = 0) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay } });

export default function Dashboard() {
  const { user, documents, chats, projects, fetchRecentChats } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecentChats();
  }, [fetchRecentChats]);

  const metrics = [
    { label: 'Documents Processed', value: analyticsData.documentsProcessed, icon: FileText, color: 'bg-blue-500', change: '+12%', chartData: [30,45,38,52,60,55,70,65,80,75,90,127] },
    { label: 'Total Conversations', value: analyticsData.totalConversations, icon: MessageSquare, color: 'bg-purple-500', change: '+18%', chartData: [80,110,95,130,145,160,175,190,220,240,310,342] },
    { label: 'Reports Generated', value: analyticsData.reportsGenerated, icon: BarChart2, color: 'bg-emerald-500', change: '+5%', chartData: [5,8,7,10,12,11,15,14,18,20,25,28] },
    { label: 'AI Queries', value: analyticsData.aiQueries.toLocaleString(), icon: Zap, color: 'bg-amber-500', change: '+24%', chartData: [400,600,550,750,800,900,1050,1100,1300,1450,1700,1847] },
    { label: 'Active Projects', value: analyticsData.activeProjects, icon: Activity, color: 'bg-red-500', change: '0%', chartData: [2,2,3,3,3,4,4,4,5,5,5,5] },
  ];

  const quickActions = [
    { label: 'Upload Document', icon: '📤', desc: 'Add PDF, DOCX, or TXT', action: () => navigate('/documents'), color: '#4F46E5' },
    { label: 'Create Project', icon: '📁', desc: 'Organize your work', action: () => navigate('/projects'), color: '#8B5CF6' },
    { label: 'New Chat', icon: '💬', desc: 'Ask about a document', action: () => navigate('/documents'), color: '#06B6D4' },
    { label: 'Generate Report', icon: '📊', desc: 'AI-powered reports', action: () => navigate('/reports'), color: '#10B981' },
    { label: 'Open Notes', icon: '📝', desc: 'Review saved findings', action: () => navigate('/notes'), color: '#F59E0B' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome */}
      <motion.div {...fadeUp(0)} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Good morning, {user.name.split(' ')[0]} 👋</h1>
          <p className="text-sm text-slate-500 mt-0.5">You have {documents.filter(d => d.status === 'processing').length} document{documents.filter(d => d.status === 'processing').length !== 1 ? 's' : ''} being processed.</p>
        </div>
        <button onClick={() => navigate('/documents')} className="btn-primary">
          <Plus size={16} /> New Chat
        </button>
      </motion.div>

      {/* Metrics */}
      <motion.div {...fadeUp(0.05)} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {metrics.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
            className="card p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-8 h-8 rounded-lg ${m.color}/10 flex items-center justify-center`}>
                <m.icon size={16} className={m.color.replace('bg-', 'text-')} />
              </div>
              <span className="text-xs text-emerald-600 font-medium">{m.change}</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-0.5">{m.value}</div>
            <div className="text-xs text-slate-500">{m.label}</div>
            <div className="mt-3 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={m.chartData.map((v, i) => ({ v }))}>
                  <Area type="monotone" dataKey="v" stroke="#4F46E5" strokeWidth={1.5} fill="#4F46E5" fillOpacity={0.1} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <motion.div {...fadeUp(0.15)} className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Activity Overview</h2>
              <p className="text-xs text-slate-500">This week's queries, documents & reports</p>
            </div>
            <Badge variant="primary">This Week</Badge>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analyticsData.weeklyActivity} barSize={10} barGap={4}>
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 12, fontSize: 12, color: '#F1F5F9' }} cursor={false} />
              <Bar dataKey="queries" fill="#4F46E5" radius={[4,4,0,0]} name="Queries" />
              <Bar dataKey="docs" fill="#8B5CF6" radius={[4,4,0,0]} name="Documents" />
              <Bar dataKey="reports" fill="#06B6D4" radius={[4,4,0,0]} name="Reports" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Doc Types Pie */}
        <motion.div {...fadeUp(0.2)} className="card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Document Types</h2>
          <p className="text-xs text-slate-500 mb-5">Breakdown by file format</p>
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={analyticsData.docTypes} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" stroke="none">
                  {analyticsData.docTypes.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 12, fontSize: 12, color: '#F1F5F9' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-2 mt-2">
              {analyticsData.docTypes.map(d => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                    <span className="text-slate-600 dark:text-slate-400">{d.name}</span>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div {...fadeUp(0.25)}>
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {quickActions.map((qa, i) => (
            <motion.button key={qa.label} onClick={qa.action}
              whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
              className="card p-4 text-left hover:shadow-md transition-all group">
              <div className="text-2xl mb-3">{qa.icon}</div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-0.5 group-hover:text-primary transition-colors">{qa.label}</div>
              <div className="text-xs text-slate-400">{qa.desc}</div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Conversations */}
        <motion.div {...fadeUp(0.3)} className="card">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Recent Conversations</h2>
            <button onClick={() => navigate('/chats')} className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></button>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {chats.slice(0, 4).map(chat => (
              <div key={chat.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MessageSquare size={14} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{chat.title}</div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">{chat.lastMessage}</div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Clock size={11} className="text-slate-400" />
                      <span className="text-[10px] text-slate-400">{formatTimeAgo(chat.updatedAt)}</span>
                      <Badge variant="purple">{chat.agent}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Documents */}
        <motion.div {...fadeUp(0.35)} className="card">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Recent Documents</h2>
            <button onClick={() => navigate('/documents')} className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></button>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {documents.slice(0, 4).map(doc => (
              <div key={doc.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{doc.type}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{doc.name}</div>
                    {doc.summary && <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{doc.summary}</div>}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-slate-400">{doc.uploadedAt} · {doc.pages} pages</span>
                      {doc.risk && <RiskBadge level={doc.risk} />}
                      <Badge variant={doc.status === 'analyzed' ? 'success' : 'warning'}>
                        {doc.status === 'analyzed' ? 'Analyzed' : 'Processing'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Activity Feed */}
      <motion.div {...fadeUp(0.4)} className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Activity Timeline</h2>
          <Badge variant="default">Today</Badge>
        </div>
        <div className="space-y-3">
          {activityFeed.map((item, i) => (
            <div key={item.id} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-base">{item.icon}</div>
              <div className="flex-1 pt-1">
                <div className="text-sm text-slate-700 dark:text-slate-300">{item.text}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-400">{item.project}</span>
                  <span className="text-xs text-slate-300 dark:text-slate-600">·</span>
                  <span className="text-xs text-slate-400">{item.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

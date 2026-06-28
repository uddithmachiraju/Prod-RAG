import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Shield, Activity, Key, CreditCard, BarChart2, Plus, Search, MoreHorizontal, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Avatar, Badge, StatusDot } from '../components/ui';
import { teamMembers } from '../store/mockData';

const sections = [
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'roles', label: 'Roles & Permissions', icon: Shield },
  { id: 'audit', label: 'Audit Logs', icon: Activity },
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'usage', label: 'Usage Monitoring', icon: BarChart2 },
];

const auditLogs = [
  { id: 'l1', user: 'Sanjay Mehta', action: 'Uploaded document', resource: 'MSA-TechCorp.pdf', time: '2h ago', status: 'success' },
  { id: 'l2', user: 'Sarah Chen', action: 'Generated report', resource: 'Risk Assessment Q4', time: '4h ago', status: 'success' },
  { id: 'l3', user: 'Marcus Williams', action: 'Exported data', resource: 'Compliance Review', time: '6h ago', status: 'success' },
  { id: 'l4', user: 'Priya Patel', action: 'Failed login attempt', resource: 'Authentication', time: '8h ago', status: 'error' },
  { id: 'l5', user: 'Sanjay Mehta', action: 'Invited team member', resource: 'james@accorder.ai', time: '1d ago', status: 'success' },
  { id: 'l6', user: 'Sarah Chen', action: 'Deleted document', resource: 'Draft-v1.pdf', time: '2d ago', status: 'warning' },
];

export default function AdminConsole() {
  const [active, setActive] = useState('users');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={20} className="text-primary" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Admin Console</h1>
          <Badge variant="primary">Admin</Badge>
        </div>
        <p className="text-sm text-slate-500">Manage users, permissions, and organization settings</p>
      </div>

      <div className="flex gap-6">
        <nav className="w-48 flex-shrink-0 space-y-1">
          {sections.map(s => (
            <button key={s.id} onClick={() => setActive(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${active === s.id ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              <s.icon size={15} />
              {s.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 space-y-4">
          {active === 'users' && <UsersPanel />}
          {active === 'roles' && <RolesPanel />}
          {active === 'audit' && <AuditPanel />}
          {active === 'billing' && <BillingPanel />}
          {active === 'usage' && <UsagePanel />}
          {active === 'api' && <APIPanel />}
        </div>
      </div>
    </div>
  );
}

function UsersPanel() {
  const [search, setSearch] = useState('');
  const members = [...teamMembers, { id: 'tm0', name: 'Sanjay Mehta', email: 'sanjay@accorder.ai', role: 'Admin', status: 'online', initials: 'SM' }];
  const filtered = members.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="card">
      <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Team Members ({members.length})</h2>
        <button className="btn-primary text-xs py-1.5"><Plus size={13} /> Invite User</button>
      </div>
      <div className="p-4 border-b border-slate-100 dark:border-slate-700">
        <div className="relative max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="input-field pl-8 py-1.5 text-xs" />
        </div>
      </div>
      <div className="divide-y divide-slate-50 dark:divide-slate-800">
        {filtered.map(member => (
          <div key={member.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="relative">
              <Avatar name={member.name} size="md" />
              <StatusDot status={member.status} className="absolute -bottom-0.5 -right-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{member.name}</div>
              <div className="text-xs text-slate-400">{member.email}</div>
            </div>
            <Badge variant={member.role === 'Admin' ? 'primary' : 'default'}>{member.role}</Badge>
            <StatusDot status={member.status} />
            <span className="text-xs text-slate-400 capitalize">{member.status}</span>
            <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
              <MoreHorizontal size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function RolesPanel() {
  const roles = [
    { name: 'Admin', desc: 'Full access to all features and settings', users: 1, perms: ['All permissions'] },
    { name: 'Manager', desc: 'Manage projects, documents, and team members', users: 2, perms: ['Create/delete projects', 'Invite users', 'Generate reports', 'Export data'] },
    { name: 'Analyst', desc: 'Analyze documents and generate reports', users: 1, perms: ['Upload documents', 'Create chats', 'Generate reports', 'View analytics'] },
    { name: 'Viewer', desc: 'Read-only access to shared content', users: 1, perms: ['View documents', 'View reports', 'View chats'] },
  ];

  return (
    <div className="space-y-4">
      {roles.map((role, i) => (
        <motion.div key={role.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
          className="card p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">{role.name}</h3>
                <Badge variant="default">{role.users} user{role.users !== 1 ? 's' : ''}</Badge>
              </div>
              <p className="text-xs text-slate-500">{role.desc}</p>
            </div>
            <button className="btn-secondary text-xs py-1.5">Edit Role</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {role.perms.map(p => (
              <span key={p} className="inline-flex items-center gap-1 text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                <CheckCircle size={10} /> {p}
              </span>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function AuditPanel() {
  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-700">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Audit Logs</h2>
        <p className="text-xs text-slate-500 mt-0.5">All user actions and system events</p>
      </div>
      <div className="divide-y divide-slate-50 dark:divide-slate-800">
        {auditLogs.map(log => (
          <div key={log.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'success' ? 'bg-emerald-400' : log.status === 'error' ? 'bg-red-400' : 'bg-amber-400'}`} />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-700 dark:text-slate-300">
                <span className="font-medium">{log.user}</span> · {log.action}
              </div>
              <div className="text-xs text-slate-400">{log.resource}</div>
            </div>
            <span className="text-xs text-slate-400 flex-shrink-0">{log.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BillingPanel() {
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Current Plan</h2>
          <Badge variant="primary">Enterprise</Badge>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { label: 'Users', value: '5 / 25', pct: 20 },
            { label: 'Documents', value: '127 / 5,000', pct: 2.5 },
            { label: 'AI Queries', value: '1,847 / 50,000', pct: 3.7 },
          ].map(item => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">{item.label}</span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{item.value}</span>
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${item.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Next billing date: February 1, 2026</div>
            <div className="text-xs text-slate-400">$499/month · Annual billing</div>
          </div>
          <button className="btn-secondary text-xs py-1.5">Manage Plan</button>
        </div>
      </div>
    </div>
  );
}

function UsagePanel() {
  return (
    <div className="card p-5">
      <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Usage by Team Member</h2>
      <div className="space-y-4">
        {teamMembers.map((m, i) => {
          const queries = [342, 218, 156, 89][i] || 50;
          const max = 400;
          return (
            <div key={m.id} className="flex items-center gap-3">
              <Avatar name={m.name} size="sm" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{m.name}</span>
                  <span className="text-xs text-slate-500">{queries} queries</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(queries / max) * 100}%` }} transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                    className="h-full bg-primary rounded-full" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function APIPanel() {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Organization API Keys</h2>
        <button className="btn-primary text-xs py-1.5"><Plus size={13} /> Generate Key</button>
      </div>
      <p className="text-xs text-slate-500 mb-4">API keys provide programmatic access to Accorder AI. Rotate keys regularly.</p>
      <div className="space-y-3">
        {[
          { name: 'CI/CD Pipeline', key: 'org_ci_••••••••••••a1b2', created: '2025-01-01', requests: '12,450' },
          { name: 'Webhook Receiver', key: 'org_wh_••••••••••••c3d4', created: '2025-02-15', requests: '3,820' },
        ].map(k => (
          <div key={k.name} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <Key size={16} className="text-slate-400 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{k.name}</div>
              <div className="font-mono text-xs text-slate-400">{k.key}</div>
              <div className="text-xs text-slate-400">Created {k.created} · {k.requests} requests</div>
            </div>
            <button className="text-xs text-red-500 hover:underline">Revoke</button>
          </div>
        ))}
      </div>
    </div>
  );
}

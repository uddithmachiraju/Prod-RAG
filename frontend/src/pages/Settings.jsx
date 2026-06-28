import { Bell, Brain, Eye, EyeOff, Key, LogOut, Monitor, Moon, Palette, Save, Shield, Sun, User } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/ui';
import { useApp } from '../context/AppContext';

const sections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'ai', label: 'AI Preferences', icon: Brain },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'api', label: 'API Keys', icon: Key },
];

export default function Settings() {
  const { user, theme, toggleTheme } = useApp();
  const [active, setActive] = useState('profile');
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <nav className="w-44 flex-shrink-0 space-y-1">
          {sections.map(s => (
            <button key={s.id} onClick={() => setActive(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${active === s.id ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              <s.icon size={15} />
              {s.label}
            </button>
          ))}
          <div className="my-2 border-t border-slate-200 dark:border-slate-700" />
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
            <LogOut size={15} />
            Log Out
          </button>
        </nav>

        {/* Content */}
        <div className="flex-1 card p-6 space-y-6">
          {active === 'profile' && <ProfileSection user={user} onSave={save} />}
          {active === 'appearance' && <AppearanceSection theme={theme} onToggleTheme={toggleTheme} />}
          {active === 'notifications' && <NotificationsSection />}
          {active === 'ai' && <AIPreferencesSection />}
          {active === 'security' && <SecuritySection />}
          {active === 'api' && <APIKeysSection />}

          {['profile', 'notifications', 'ai'].includes(active) && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
              <button onClick={save} className="btn-primary">
                {saved ? '✓ Saved!' : <><Save size={15} /> Save Changes</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileSection({ user }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);

  return (
    <div className="space-y-5">
      <h2 className="font-semibold text-slate-900 dark:text-slate-100">Profile Information</h2>
      <div className="flex items-center gap-4">
        <Avatar name={user.name} size="xl" />
        <div>
          <button className="btn-secondary text-xs py-1.5">Change Photo</button>
          <p className="text-xs text-slate-400 mt-1">JPG, PNG, GIF up to 2MB</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Full Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Role</label>
          <input value={user.role} className="input-field" readOnly />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Timezone</label>
          <select className="input-field">
            <option>Asia/Kolkata (IST)</option>
            <option>America/New_York (EST)</option>
            <option>Europe/London (GMT)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function AppearanceSection({ theme, onToggleTheme }) {
  const themes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];
  return (
    <div className="space-y-5">
      <h2 className="font-semibold text-slate-900 dark:text-slate-100">Appearance</h2>
      <div>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3 block">Theme</label>
        <div className="grid grid-cols-3 gap-3">
          {themes.map(t => (
            <button key={t.id} onClick={() => t.id !== 'system' && onToggleTheme()}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${(theme === t.id || (t.id === 'light' && theme === 'light') || (t.id === 'dark' && theme === 'dark')) ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200'}`}>
              <t.icon size={20} className={theme === t.id ? 'text-primary' : 'text-slate-400'} />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3 block">Accent Color</label>
        <div className="flex gap-2">
          {['#4F46E5', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'].map(c => (
            <button key={c} style={{ background: c }}
              className="w-8 h-8 rounded-full hover:ring-2 hover:ring-offset-2 hover:ring-slate-400 transition-all" />
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 block">Font Size</label>
        <select className="input-field max-w-xs">
          <option>Small</option>
          <option selected>Medium</option>
          <option>Large</option>
        </select>
      </div>
    </div>
  );
}

function NotificationsSection() {
  const notifs = [
    { label: 'Document analysis complete', key: 'analysis', enabled: true },
    { label: 'Report generation complete', key: 'report', enabled: true },
    { label: 'New document shared with me', key: 'share', enabled: true },
    { label: 'Team member activity', key: 'team', enabled: false },
    { label: 'AI recommendations', key: 'ai', enabled: true },
    { label: 'Weekly usage summary', key: 'weekly', enabled: false },
  ];
  const [state, setState] = useState(Object.fromEntries(notifs.map(n => [n.key, n.enabled])));

  return (
    <div className="space-y-5">
      <h2 className="font-semibold text-slate-900 dark:text-slate-100">Notification Preferences</h2>
      <div className="space-y-3">
        {notifs.map(n => (
          <div key={n.key} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800 last:border-0">
            <span className="text-sm text-slate-700 dark:text-slate-300">{n.label}</span>
            <button onClick={() => setState(prev => ({ ...prev, [n.key]: !prev[n.key] }))}
              className={`relative w-10 h-5 rounded-full transition-colors ${state[n.key] ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${state[n.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AIPreferencesSection() {
  const [model, setModel] = useState('claude-sonnet-4-5');
  const [memory, setMemory] = useState(true);
  const [citations, setCitations] = useState(true);
  const [language, setLanguage] = useState('en');

  return (
    <div className="space-y-5">
      <h2 className="font-semibold text-slate-900 dark:text-slate-100">AI Preferences</h2>
      <div>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Default AI Model</label>
        <select value={model} onChange={e => setModel(e.target.value)} className="input-field max-w-xs">
          <option value="claude-sonnet-4-5">Claude Sonnet 4.5 (Recommended)</option>
          <option value="claude-opus-4-6">Claude Opus 4.6 (Most Capable)</option>
          <option value="claude-haiku-4-5">Claude Haiku 4.5 (Fastest)</option>
        </select>
      </div>
      <div className="space-y-3">
        {[
          { label: 'Enable conversation memory', desc: 'AI remembers context from previous chats in a project', key: 'memory', val: memory, set: setMemory },
          { label: 'Show source citations', desc: 'Display page references and confidence scores', key: 'citations', val: citations, set: setCitations },
        ].map(item => (
          <div key={item.key} className="flex items-start justify-between py-2 border-b border-slate-50 dark:border-slate-800 last:border-0">
            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
            </div>
            <button onClick={() => item.set(!item.val)}
              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ml-4 mt-1 ${item.val ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${item.val ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Response Language</label>
        <select value={language} onChange={e => setLanguage(e.target.value)} className="input-field max-w-xs">
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="es">Spanish</option>
        </select>
      </div>
    </div>
  );
}

function SecuritySection() {
  const [showPass, setShowPass] = useState(false);
  return (
    <div className="space-y-5">
      <h2 className="font-semibold text-slate-900 dark:text-slate-100">Security</h2>
      <div>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Current Password</label>
        <div className="relative max-w-sm">
          <input type={showPass ? 'text' : 'password'} className="input-field pr-9" placeholder="••••••••" />
          <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">New Password</label>
          <input type="password" className="input-field" placeholder="Min. 8 characters" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Confirm Password</label>
          <input type="password" className="input-field" placeholder="Repeat password" />
        </div>
      </div>
      <button className="btn-primary">Update Password</button>
      <div className="border-t border-slate-100 dark:border-slate-700 pt-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Two-Factor Authentication</h3>
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl max-w-sm">
          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Authenticator App</div>
            <div className="text-xs text-slate-400">Not configured</div>
          </div>
          <button className="btn-secondary text-xs py-1.5">Enable</button>
        </div>
      </div>
    </div>
  );
}

function APIKeysSection() {
  const [keys] = useState([
    { id: 'k1', name: 'Production Key', key: 'acc_prod_••••••••••••3f8a', created: '2025-01-15', lastUsed: '2h ago' },
    { id: 'k2', name: 'Development Key', key: 'acc_dev_••••••••••••92bc', created: '2025-02-01', lastUsed: '5d ago' },
  ]);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">API Keys</h2>
        <button className="btn-primary text-xs py-1.5">+ Generate Key</button>
      </div>
      <p className="text-xs text-slate-500">Use these keys to authenticate API requests. Keep them secret — never share publicly.</p>
      <div className="space-y-3">
        {keys.map(k => (
          <div key={k.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <Key size={16} className="text-slate-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{k.name}</div>
              <div className="font-mono text-xs text-slate-400 mt-0.5">{k.key}</div>
              <div className="text-xs text-slate-400 mt-0.5">Created {k.created} · Last used {k.lastUsed}</div>
            </div>
            <button className="text-xs text-red-500 hover:underline flex-shrink-0">Revoke</button>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Plus, ExternalLink, Settings } from 'lucide-react';
import { Badge, Modal } from '../components/ui';

const integrations = [
  { id: 'gdrive', name: 'Google Drive', desc: 'Import documents directly from your Drive', icon: '🗂️', category: 'Storage', connected: true, color: '#4285F4' },
  { id: 'onedrive', name: 'OneDrive', desc: 'Sync documents from Microsoft OneDrive', icon: '☁️', category: 'Storage', connected: false, color: '#0078D4' },
  { id: 'sharepoint', name: 'SharePoint', desc: 'Connect to your SharePoint document libraries', icon: '🏢', category: 'Storage', connected: false, color: '#036AC4' },
  { id: 'dropbox', name: 'Dropbox', desc: 'Import files from your Dropbox account', icon: '📦', category: 'Storage', connected: false, color: '#0061FF' },
  { id: 'slack', name: 'Slack', desc: 'Share findings and reports to Slack channels', icon: '💬', category: 'Communication', connected: true, color: '#4A154B' },
  { id: 'teams', name: 'Microsoft Teams', desc: 'Send notifications and share reports via Teams', icon: '👥', category: 'Communication', connected: false, color: '#5059C9' },
  { id: 'jira', name: 'Jira', desc: 'Create issues and track action items in Jira', icon: '🎯', category: 'Project Management', connected: false, color: '#0052CC' },
  { id: 'confluence', name: 'Confluence', desc: 'Export reports and findings to Confluence pages', icon: '📖', category: 'Project Management', connected: false, color: '#0052CC' },
  { id: 'notion', name: 'Notion', desc: 'Save notes and findings to Notion databases', icon: '📋', category: 'Project Management', connected: false, color: '#000000' },
  { id: 'salesforce', name: 'Salesforce', desc: 'Link contracts to Salesforce opportunities', icon: '☁️', category: 'CRM', connected: false, color: '#00A1E0' },
  { id: 'docusign', name: 'DocuSign', desc: 'Send contracts for e-signature directly', icon: '✍️', category: 'Legal', connected: false, color: '#FFD400' },
  { id: 'webhook', name: 'Custom Webhook', desc: 'Integrate with any service via webhooks', icon: '🔗', category: 'Developer', connected: false, color: '#64748B' },
];

const categories = ['All', ...new Set(integrations.map(i => i.category))];

export default function Integrations() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [connectModal, setConnectModal] = useState(null);
  const [connected, setConnected] = useState(new Set(integrations.filter(i => i.connected).map(i => i.id)));

  const filtered = integrations.filter(i => activeCategory === 'All' || i.category === activeCategory);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Integrations</h1>
          <p className="text-sm text-slate-500 mt-0.5">{connected.size} connected · {integrations.length} available</p>
        </div>
        <button className="btn-secondary">
          <ExternalLink size={15} /> Request Integration
        </button>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 flex-wrap">
        {categories.map(c => (
          <button key={c} onClick={() => setActiveCategory(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeCategory === c ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((integration, i) => {
          const isConnected = connected.has(integration.id);
          return (
            <motion.div key={integration.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="card p-5 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: `${integration.color}15` }}>
                  {integration.icon}
                </div>
                {isConnected && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                    <CheckCircle size={11} /> Connected
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">{integration.name}</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">{integration.desc}</p>
              <div className="flex items-center justify-between">
                <Badge variant="default">{integration.category}</Badge>
                <div className="flex items-center gap-1">
                  {isConnected ? (
                    <>
                      <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                        <Settings size={14} />
                      </button>
                      <button onClick={() => setConnected(prev => { const s = new Set(prev); s.delete(integration.id); return s; })}
                        className="text-xs text-red-500 hover:underline px-2">Disconnect</button>
                    </>
                  ) : (
                    <button onClick={() => setConnectModal(integration)}
                      className="btn-primary text-xs py-1.5">
                      <Plus size={13} /> Connect
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <ConnectModal open={!!connectModal} onClose={() => setConnectModal(null)} integration={connectModal}
        onConnect={(id) => { setConnected(prev => new Set([...prev, id])); setConnectModal(null); }} />
    </div>
  );
}

function ConnectModal({ open, onClose, integration, onConnect }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  if (!integration) return null;

  const handleConnect = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    setStep(2);
    setTimeout(() => { onConnect(integration.id); setStep(1); }, 1500);
  };

  return (
    <Modal open={open} onClose={onClose} title={`Connect ${integration.name}`} size="sm">
      <div className="p-6">
        {step === 1 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: `${integration.color}15` }}>
                {integration.icon}
              </div>
              <div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">{integration.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{integration.desc}</div>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Connecting will allow Accorder AI to access your {integration.name} account to import documents and export findings.
            </p>
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Permissions requested:</div>
              {['Read files and documents', 'List folders and workspaces', 'Export reports and findings'].map(perm => (
                <div key={perm} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <CheckCircle size={13} className="text-emerald-500" /> {perm}
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handleConnect} disabled={loading} className="btn-primary flex-1 justify-center">
                {loading ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : 'Authorize & Connect'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-emerald-500" />
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">{integration.name} Connected!</h3>
            <p className="text-xs text-slate-500">Your integration is ready to use.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

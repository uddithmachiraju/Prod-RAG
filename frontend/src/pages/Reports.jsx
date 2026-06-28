import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Download, Share2, Eye, FileText, BarChart2, Shield, Search, Filter, Clock, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Badge, Modal, EmptyState } from '../components/ui';
import { reports } from '../store/mockData';

const reportTypes = [
  { id: 'executive', label: 'Executive Summary', icon: '📋', desc: 'High-level overview of key findings', color: '#4F46E5' },
  { id: 'risk', label: 'Risk Assessment', icon: '⚠️', desc: 'Detailed risk analysis and scoring', color: '#EF4444' },
  { id: 'compliance', label: 'Compliance Review', icon: '🛡️', desc: 'Regulatory compliance analysis', color: '#10B981' },
  { id: 'due-diligence', label: 'Due Diligence', icon: '🔍', desc: 'Comprehensive due diligence report', color: '#F59E0B' },
  { id: 'clause', label: 'Clause Review', icon: '📜', desc: 'Clause-by-clause analysis', color: '#8B5CF6' },
];

export default function Reports() {
  const [search, setSearch] = useState('');
  const [generateOpen, setGenerateOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const filtered = reports.filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">{reports.length} reports generated</p>
        </div>
        <button onClick={() => setGenerateOpen(true)} className="btn-primary">
          <Plus size={16} /> Generate Report
        </button>
      </div>

      {/* Report type cards */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Report Templates</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {reportTypes.map((rt, i) => (
            <motion.button key={rt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => setGenerateOpen(true)} whileHover={{ y: -2 }}
              className="card p-4 text-left hover:shadow-md transition-all group">
              <div className="text-2xl mb-2">{rt.icon}</div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1 group-hover:text-primary transition-colors">{rt.label}</div>
              <div className="text-[10px] text-slate-400 leading-relaxed">{rt.desc}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports..." className="input-field pl-9" />
      </div>

      {/* Reports list */}
      {filtered.length === 0 ? (
        <EmptyState icon="📊" title="No reports found" description="Generate your first AI report to get started."
          action={<button onClick={() => setGenerateOpen(true)} className="btn-primary"><Plus size={14} /> Generate Report</button>} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Report</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden lg:table-cell">Created</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filtered.map((report, i) => (
                <motion.tr key={report.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <BarChart2 size={16} className="text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{report.title}</div>
                        <div className="text-xs text-slate-400">{report.pages} pages</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge variant="primary">{report.type}</Badge>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">{report.createdAt}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                      <CheckCircle size={11} /> Ready
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setSelectedReport(report); setPreviewOpen(true); }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400" title="Preview">
                        <Eye size={14} />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400" title="Download">
                        <Download size={14} />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400" title="Share">
                        <Share2 size={14} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <GenerateReportModal open={generateOpen} onClose={() => setGenerateOpen(false)} />
      <ReportPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} report={selectedReport} />
    </div>
  );
}

function GenerateReportModal({ open, onClose }) {
  const [type, setType] = useState('risk');
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 2000));
    setGenerating(false);
    setDone(true);
    setTimeout(() => { setDone(false); onClose(); }, 1200);
  };

  return (
    <Modal open={open} onClose={onClose} title="Generate Report" size="md">
      <div className="p-6 space-y-5">
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 block">Report Type</label>
          <div className="grid grid-cols-1 gap-2">
            {reportTypes.map(rt => (
              <button key={rt.id} onClick={() => setType(rt.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${type === rt.id ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200'}`}>
                <span className="text-xl">{rt.icon}</span>
                <div>
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{rt.label}</div>
                  <div className="text-xs text-slate-400">{rt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Output Format</label>
          <div className="flex gap-2">
            {['PDF', 'DOCX', 'Markdown'].map(f => (
              <button key={f} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-400 hover:border-primary hover:text-primary transition-colors">
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleGenerate} disabled={generating || done}
            className="btn-primary flex-1 justify-center">
            {done ? <><CheckCircle size={15} /> Generated!</> : generating ? (
              <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Generating...</>
            ) : 'Generate Report'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ReportPreviewModal({ open, onClose, report }) {
  if (!report) return null;
  return (
    <Modal open={open} onClose={onClose} title={report.title} size="lg">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <Badge variant="primary">{report.type}</Badge>
          <span className="text-xs text-slate-400">{report.pages} pages · {report.createdAt}</span>
        </div>
        <div className="prose prose-sm max-w-none dark:prose-invert bg-slate-50 dark:bg-slate-900 rounded-xl p-5">
          <h2>Executive Summary</h2>
          <p>This report provides a comprehensive analysis of the Master Service Agreement between Acme Corporation and TechCorp Inc. The review identified <strong>4 critical issues</strong>, 11 high-risk items, and 18 medium-priority concerns requiring attention before execution.</p>
          <h3>Key Findings</h3>
          <ul>
            <li><strong>Critical:</strong> Uncapped liability clause in §8.3 poses significant financial exposure</li>
            <li><strong>High:</strong> IP assignment language is ambiguous and could transfer pre-existing IP</li>
            <li><strong>High:</strong> Auto-renewal clause lacks adequate notice period (currently 90 days)</li>
            <li><strong>Medium:</strong> Dispute resolution mechanism favors the Service Provider</li>
          </ul>
          <h3>Recommendations</h3>
          <p>Negotiate liability cap to $5M or 12 months of fees. Clarify IP ownership provisions. Extend termination notice to 180 days. Review arbitration venue selection.</p>
        </div>
        <div className="flex gap-2 mt-5">
          <button className="btn-secondary flex-1 justify-center"><Download size={15} /> Download PDF</button>
          <button className="btn-secondary flex-1 justify-center"><Share2 size={15} /> Share</button>
          <button onClick={onClose} className="btn-primary flex-1 justify-center">Close Preview</button>
        </div>
      </div>
    </Modal>
  );
}

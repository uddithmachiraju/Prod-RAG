export const currentUser = {
  id: 'u1',
  name: 'Sanjay Mehta',
  email: 'sanjay@accorder.ai',
  role: 'Admin',
  avatar: null,
  initials: 'SM',
};

export const workspaces = [
  { id: 'w1', name: 'Accorder AI', type: 'Enterprise', color: '#4F46E5' },
  { id: 'w2', name: 'Legal Team', type: 'Team', color: '#8B5CF6' },
  { id: 'w3', name: 'Compliance Hub', type: 'Team', color: '#06B6D4' },
];

export const projects = [
  { id: 'p1', name: 'Vendor Agreement Review', icon: '📋', color: '#4F46E5', docs: 12, chats: 8, status: 'active', updatedAt: '2h ago', pinned: true, description: 'Q4 vendor contract analysis and risk review' },
  { id: 'p2', name: 'Employment Contracts', icon: '👥', color: '#8B5CF6', docs: 34, chats: 21, status: 'active', updatedAt: '1d ago', pinned: true, description: 'HR contract compliance and onboarding docs' },
  { id: 'p3', name: 'Policy Analysis', icon: '📜', color: '#06B6D4', docs: 7, chats: 5, status: 'active', updatedAt: '3d ago', pinned: false, description: 'Internal policy review and gap analysis' },
  { id: 'p4', name: 'Research Workspace', icon: '🔬', color: '#10B981', docs: 19, chats: 12, status: 'active', updatedAt: '1w ago', pinned: false, description: 'Market research and competitive intelligence' },
  { id: 'p5', name: 'M&A Due Diligence', icon: '⚖️', color: '#F59E0B', docs: 45, chats: 30, status: 'archived', updatedAt: '2w ago', pinned: false, description: 'Acquisition target documentation review' },
];

export const documents = [
  { id: 'd1', name: 'Master Service Agreement - TechCorp.pdf', type: 'PDF', size: '2.3 MB', pages: 42, uploadedAt: '2h ago', status: 'analyzed', project: 'p1', summary: 'Standard MSA covering SaaS delivery, IP ownership, and liability caps. Notable: uncapped liability clause in section 8.3.', risk: 'high', tags: ['contract', 'SaaS', 'vendor'] },
  { id: 'd2', name: 'Software License Agreement v2.docx', type: 'DOCX', size: '890 KB', pages: 18, uploadedAt: '5h ago', status: 'analyzed', project: 'p1', summary: 'License agreement for proprietary software with perpetual license grant and source code escrow provisions.', risk: 'medium', tags: ['license', 'software'] },
  { id: 'd3', name: 'NDA - Confidential Disclosure.pdf', type: 'PDF', size: '340 KB', pages: 6, uploadedAt: '1d ago', status: 'analyzed', project: 'p1', summary: 'Mutual NDA with 3-year confidentiality period. Both parties retain IP ownership.', risk: 'low', tags: ['NDA', 'confidentiality'] },
  { id: 'd4', name: 'Employment Agreement Template.docx', type: 'DOCX', size: '1.1 MB', pages: 22, uploadedAt: '2d ago', status: 'analyzed', project: 'p2', summary: 'Standard employment agreement with at-will employment, benefits, and non-compete clauses.', risk: 'medium', tags: ['employment', 'HR'] },
  { id: 'd5', name: 'Data Processing Addendum.pdf', type: 'PDF', size: '560 KB', pages: 14, uploadedAt: '3d ago', status: 'processing', project: 'p1', summary: null, risk: null, tags: ['GDPR', 'data'] },
  { id: 'd6', name: 'SOW - Cloud Migration Project.pdf', type: 'PDF', size: '1.8 MB', pages: 31, uploadedAt: '4d ago', status: 'analyzed', project: 'p1', summary: 'Statement of Work for 6-month cloud migration engagement. Fixed-price with milestone-based payments.', risk: 'low', tags: ['SOW', 'cloud'] },
];

export const chats = [
  { id: 'c1', title: 'MSA Risk Analysis', projectId: 'p1', docId: 'd1', lastMessage: 'The uncapped liability clause in section 8.3 poses significant financial risk...', updatedAt: '1h ago', agent: 'Contract Reviewer', pinned: true, messages: [] },
  { id: 'c2', title: 'License Terms Review', projectId: 'p1', docId: 'd2', lastMessage: 'The perpetual license grant is standard but the source code escrow provisions...', updatedAt: '4h ago', agent: 'Contract Reviewer', pinned: false, messages: [] },
  { id: 'c3', title: 'NDA Compliance Check', projectId: 'p1', docId: 'd3', lastMessage: 'This NDA meets standard requirements. Key concern: definition of confidential information...', updatedAt: '1d ago', agent: 'Compliance Expert', pinned: false, messages: [] },
  { id: 'c4', title: 'Employment Terms Analysis', projectId: 'p2', docId: 'd4', lastMessage: 'The non-compete clause duration of 2 years may be unenforceable in California...', updatedAt: '2d ago', agent: 'Risk Analyzer', pinned: false, messages: [] },
  { id: 'c5', title: 'GDPR Data Processing Review', projectId: 'p1', docId: 'd5', lastMessage: 'Analyzing data processing addendum for GDPR compliance...', updatedAt: '3d ago', agent: 'Compliance Expert', pinned: false, messages: [] },
];

export const agents = [
  { id: 'a1', name: 'General Assistant', description: 'Versatile AI for any document task', specialty: 'General', color: '#4F46E5', icon: '🤖' },
  { id: 'a2', name: 'Contract Reviewer', description: 'Expert in contract law and terms', specialty: 'Contracts', color: '#8B5CF6', icon: '📋' },
  { id: 'a3', name: 'Compliance Expert', description: 'Regulatory and compliance analysis', specialty: 'Compliance', color: '#06B6D4', icon: '⚖️' },
  { id: 'a4', name: 'Risk Analyzer', description: 'Identifies and quantifies risks', specialty: 'Risk', color: '#EF4444', icon: '⚠️' },
  { id: 'a5', name: 'Financial Analyst', description: 'Financial terms and obligations', specialty: 'Finance', color: '#10B981', icon: '💰' },
  { id: 'a6', name: 'Research Assistant', description: 'Deep research and synthesis', specialty: 'Research', color: '#F59E0B', icon: '🔬' },
];

export const promptLibrary = [
  { id: 'pr1', category: 'Contract Review', title: 'Summarize Agreement', prompt: 'Provide a comprehensive executive summary of this agreement including parties, key obligations, term, and commercial terms.', icon: '📋', favorite: true },
  { id: 'pr2', category: 'Contract Review', title: 'Extract Obligations', prompt: 'List all obligations for each party, including deadlines, deliverables, and performance requirements.', icon: '✅', favorite: true },
  { id: 'pr3', category: 'Contract Review', title: 'Identify Missing Clauses', prompt: 'What standard clauses are missing from this agreement? Flag any gaps that could create legal exposure.', icon: '🔍', favorite: false },
  { id: 'pr4', category: 'Contract Review', title: 'Risk Analysis', prompt: 'Analyze the key legal and commercial risks in this document. Rate each risk as Critical, High, Medium, or Low.', icon: '⚠️', favorite: true },
  { id: 'pr5', category: 'Compliance', title: 'GDPR Compliance Check', prompt: 'Review this document for GDPR compliance. Identify any data processing terms that need updating.', icon: '🛡️', favorite: false },
  { id: 'pr6', category: 'Compliance', title: 'Policy Review', prompt: 'Evaluate this policy against current regulatory requirements and industry best practices.', icon: '📜', favorite: false },
  { id: 'pr7', category: 'Research', title: 'Explain Document', prompt: 'Explain this document in plain language suitable for a non-lawyer. Use simple terms and examples.', icon: '💡', favorite: false },
  { id: 'pr8', category: 'Research', title: 'Generate Questions', prompt: 'Generate 10 important questions I should ask the other party based on this document.', icon: '❓', favorite: false },
  { id: 'pr9', category: 'Contract Review', title: 'Find Important Dates', prompt: 'Extract all dates, deadlines, notice periods, and renewal windows from this document.', icon: '📅', favorite: false },
  { id: 'pr10', category: 'Research', title: 'Create Action Items', prompt: 'Based on this document, create a prioritized action item list with owners and deadlines.', icon: '✔️', favorite: false },
];

export const notes = [
  { id: 'n1', title: 'MSA Key Risks Summary', content: 'Critical finding: Uncapped liability in §8.3. Recommend negotiating $5M cap. Also note: auto-renewal clause requires 90-day notice.', tags: ['risk', 'MSA'], projectId: 'p1', createdAt: '1h ago', pinned: true },
  { id: 'n2', title: 'IP Ownership Concerns', content: 'The work-for-hire clause needs clarification. Current language could transfer ownership of pre-existing IP.', tags: ['IP', 'legal'], projectId: 'p1', createdAt: '3h ago', pinned: false },
  { id: 'n3', title: 'Non-Compete Enforceability', content: 'California employees: non-compete is void under CA BPC §16600. Recommend separate state-specific addendums.', tags: ['employment', 'compliance'], projectId: 'p2', createdAt: '2d ago', pinned: false },
];

export const analyticsData = {
  documentsProcessed: 127,
  totalConversations: 342,
  reportsGenerated: 28,
  aiQueries: 1847,
  activeProjects: 5,
  weeklyActivity: [
    { day: 'Mon', queries: 45, docs: 8, reports: 3 },
    { day: 'Tue', queries: 72, docs: 12, reports: 5 },
    { day: 'Wed', queries: 58, docs: 9, reports: 4 },
    { day: 'Thu', queries: 91, docs: 15, reports: 7 },
    { day: 'Fri', queries: 63, docs: 11, reports: 4 },
    { day: 'Sat', queries: 24, docs: 3, reports: 1 },
    { day: 'Sun', queries: 18, docs: 2, reports: 0 },
  ],
  docTypes: [
    { name: 'PDF', value: 68, fill: '#4F46E5' },
    { name: 'DOCX', value: 24, fill: '#8B5CF6' },
    { name: 'TXT', value: 8, fill: '#06B6D4' },
  ],
  monthlyTrend: [
    { month: 'Jan', docs: 18, queries: 210 },
    { month: 'Feb', docs: 24, queries: 290 },
    { month: 'Mar', docs: 31, queries: 380 },
    { month: 'Apr', docs: 28, queries: 340 },
    { month: 'May', docs: 42, queries: 520 },
    { month: 'Jun', docs: 38, queries: 480 },
  ],
};

export const notifications = [
  { id: 'notif1', type: 'analysis', title: 'Analysis complete', message: 'MSA - TechCorp.pdf has been analyzed', time: '2m ago', read: false },
  { id: 'notif2', type: 'report', title: 'Report ready', message: 'Risk Assessment Report is ready to download', time: '1h ago', read: false },
  { id: 'notif3', type: 'upload', title: 'Upload complete', message: 'Data Processing Addendum uploaded successfully', time: '3h ago', read: true },
  { id: 'notif4', type: 'share', title: 'Document shared', message: 'Sarah shared "Employment Agreement Template"', time: '1d ago', read: true },
];

export const activityFeed = [
  { id: 'a1', type: 'upload', text: 'Uploaded Master Service Agreement', project: 'Vendor Agreement Review', time: '2h ago', icon: '📤' },
  { id: 'a2', type: 'analysis', text: 'AI analysis completed for 3 documents', project: 'Vendor Agreement Review', time: '2h ago', icon: '🧠' },
  { id: 'a3', type: 'report', text: 'Generated Risk Assessment Report', project: 'Vendor Agreement Review', time: '3h ago', icon: '📊' },
  { id: 'a4', type: 'chat', text: 'Started conversation: MSA Risk Analysis', project: 'Vendor Agreement Review', time: '4h ago', icon: '💬' },
  { id: 'a5', type: 'note', text: 'Saved finding: IP Ownership Concerns', project: 'Vendor Agreement Review', time: '5h ago', icon: '📝' },
  { id: 'a6', type: 'upload', text: 'Uploaded Employment Agreement Template', project: 'Employment Contracts', time: '1d ago', icon: '📤' },
];

export const reports = [
  { id: 'r1', title: 'Risk Assessment - TechCorp MSA', type: 'Risk Assessment', project: 'p1', createdAt: '2h ago', status: 'ready', pages: 8 },
  { id: 'r2', title: 'Compliance Review Q4 2025', type: 'Compliance Review', project: 'p1', createdAt: '1d ago', status: 'ready', pages: 14 },
  { id: 'r3', title: 'Executive Summary - Vendor Contracts', type: 'Executive Summary', project: 'p1', createdAt: '3d ago', status: 'ready', pages: 5 },
  { id: 'r4', title: 'Due Diligence Report', type: 'Due Diligence', project: 'p5', createdAt: '1w ago', status: 'ready', pages: 22 },
];

export const teamMembers = [
  { id: 'tm1', name: 'Sarah Chen', email: 'sarah@accorder.ai', role: 'Legal Analyst', status: 'online', initials: 'SC' },
  { id: 'tm2', name: 'Marcus Williams', email: 'marcus@accorder.ai', role: 'Compliance Officer', status: 'away', initials: 'MW' },
  { id: 'tm3', name: 'Priya Patel', email: 'priya@accorder.ai', role: 'Risk Manager', status: 'offline', initials: 'PP' },
  { id: 'tm4', name: 'James Torres', email: 'james@accorder.ai', role: 'Researcher', status: 'online', initials: 'JT' },
];

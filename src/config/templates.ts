// FILE: src/config/templates.ts

// Field mapping metadata for auto-fill from AI analysis
export type FieldMapping = {
    keywords: string[];           // Keywords that AI might extract for this field
    entityTypes: ('people' | 'organizations' | 'dates' | 'deadlines' | 'amounts' | 'other')[];
    fallback?: string;            // Default value if not found
};

export type DocumentTemplateField = {
    id: string;
    label: string;
    placeholder?: string;
    required?: boolean;
    mapping?: FieldMapping;       // Auto-fill mapping config
};

export type DocumentTemplate = {
    id: string;
    name: string;
    description: string;
    suggestedTitle: string;
    fields: DocumentTemplateField[];
    aiInstruction: string;
};

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
    {
        id: 'certificate_completion',
        name: 'Certificate of Completion',
        description: 'Formal certificate for course or training completion',
        suggestedTitle: 'Certificate of Completion',
        fields: [
            {
                id: 'recipient_name',
                label: 'Recipient Name',
                placeholder: 'John Doe',
                required: true,
                mapping: {
                    keywords: ['recipient', 'student', 'participant', 'trainee', 'attendee', 'name', 'full_name'],
                    entityTypes: ['people'],
                }
            },
            {
                id: 'course_name',
                label: 'Course Name',
                placeholder: 'Advanced Web Development',
                required: true,
                mapping: {
                    keywords: ['course', 'program', 'training', 'certification', 'workshop', 'class'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'issuer_name',
                label: 'Issuer Name',
                placeholder: 'Tech Academy',
                required: true,
                mapping: {
                    keywords: ['issuer', 'institution', 'academy', 'school', 'university', 'organization', 'provider'],
                    entityTypes: ['organizations'],
                }
            },
            {
                id: 'date',
                label: 'Date',
                placeholder: 'January 15, 2024',
                required: true,
                mapping: {
                    keywords: ['date', 'completion_date', 'issue_date', 'awarded_date'],
                    entityTypes: ['dates'],
                }
            },
        ],
        aiInstruction: 'Act as a formal certificate writer. Write a certificate of completion in 1-2 short paragraphs mentioning the recipient name, course name, issuer name, and date. Use formal, ceremonial language appropriate for a certificate. Do not use markdown formatting, headers, or special characters. Write in plain text only.',
    },
    {
        id: 'offer_letter',
        name: 'Offer Letter',
        description: 'Job offer or internship offer letters',
        suggestedTitle: 'Offer Letter',
        fields: [
            {
                id: 'candidate_name',
                label: 'Candidate Name',
                placeholder: 'Jane Smith',
                required: true,
                mapping: {
                    keywords: ['candidate', 'applicant', 'employee', 'name', 'full_name', 'person'],
                    entityTypes: ['people'],
                }
            },
            {
                id: 'position',
                label: 'Position',
                placeholder: 'Senior Software Engineer',
                required: true,
                mapping: {
                    keywords: ['position', 'role', 'job_title', 'designation', 'title'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'company_name',
                label: 'Company Name',
                placeholder: 'Tech Solutions Inc.',
                required: true,
                mapping: {
                    keywords: ['company', 'employer', 'organization', 'firm', 'corporation'],
                    entityTypes: ['organizations'],
                }
            },
            {
                id: 'start_date',
                label: 'Start Date',
                placeholder: 'February 1, 2024',
                required: true,
                mapping: {
                    keywords: ['start_date', 'joining_date', 'commencement', 'effective_date'],
                    entityTypes: ['dates'],
                }
            },
            {
                id: 'salary_details',
                label: 'Salary Details',
                placeholder: '$120,000/year',
                required: false,
                mapping: {
                    keywords: ['salary', 'compensation', 'pay', 'wage', 'package', 'ctc', 'annual'],
                    entityTypes: ['amounts'],
                }
            },
            {
                id: 'extras',
                label: 'Additional Notes/Benefits',
                placeholder: 'Health insurance, 401k, PTO',
                required: false,
                mapping: {
                    keywords: ['benefits', 'perks', 'extras', 'allowances'],
                    entityTypes: ['other'],
                }
            },
        ],
        aiInstruction: 'Act as a professional HR writer. Create a job offer letter with clear structure: introduction congratulating the candidate, role description, terms including start date and compensation, additional benefits if provided, and a polite closing. Tone should be professional and welcoming. Plain text only, no markdown.',
    },
    {
        id: 'experience_letter',
        name: 'Experience Letter',
        description: 'Employment experience or internship completion letters',
        suggestedTitle: 'Experience Letter',
        fields: [
            {
                id: 'employee_name',
                label: 'Employee Name',
                placeholder: 'Alex Johnson',
                required: true,
                mapping: {
                    keywords: ['employee', 'staff', 'worker', 'name', 'full_name', 'person'],
                    entityTypes: ['people'],
                }
            },
            {
                id: 'role',
                label: 'Role/Position',
                placeholder: 'Project Manager',
                required: true,
                mapping: {
                    keywords: ['role', 'position', 'job_title', 'designation', 'title'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'company_name',
                label: 'Company Name',
                placeholder: 'Innovation Corp',
                required: true,
                mapping: {
                    keywords: ['company', 'employer', 'organization', 'firm'],
                    entityTypes: ['organizations'],
                }
            },
            {
                id: 'duration',
                label: 'Duration',
                placeholder: 'Jan 2020 - Dec 2023',
                required: true,
                mapping: {
                    keywords: ['duration', 'tenure', 'period', 'from_to', 'employment_period'],
                    entityTypes: ['dates'],
                }
            },
            {
                id: 'performance_notes',
                label: 'Performance Notes',
                placeholder: 'Excellent team leadership',
                required: false,
                mapping: {
                    keywords: ['performance', 'achievements', 'contributions', 'accomplishments'],
                    entityTypes: ['other'],
                }
            },
        ],
        aiInstruction: 'Summarize the employee\'s tenure, key responsibilities, and performance in a formal experience letter. Include the duration of employment, role, company name, and positive performance notes if provided. Keep it professional and factual. Plain text format, no markdown.',
    },
    {
        id: 'custom_freeform',
        name: 'AI Writer',
        description: 'Create any professional document — AI detects the type automatically',
        suggestedTitle: 'Custom Document',
        fields: [],
        aiInstruction: 'Help the user draft a professional document based on the provided title and context. Write in clear, formal language appropriate for business use. Plain text only, no markdown formatting.',
    },
    {
        id: 'business_email_letter',
        name: 'Business Emails & Letters',
        description: 'Internal updates, client emails, formal letters',
        suggestedTitle: 'Business Email',
        fields: [
            {
                id: 'doc_type',
                label: 'Type (email or letter)',
                placeholder: 'Email',
                required: true,
                mapping: {
                    keywords: ['type', 'format', 'email', 'letter'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'audience',
                label: 'Audience (client, manager, team, etc.)',
                placeholder: 'Client',
                required: true,
                mapping: {
                    keywords: ['audience', 'recipient', 'to', 'addressee'],
                    entityTypes: ['people', 'organizations'],
                }
            },
            {
                id: 'topic',
                label: 'Topic / subject of the message',
                placeholder: 'Project Update',
                required: true,
                mapping: {
                    keywords: ['topic', 'subject', 'regarding', 'about', 're'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'tone',
                label: 'Tone (formal, neutral, friendly)',
                placeholder: 'Formal',
                required: true,
                mapping: {
                    keywords: ['tone', 'style'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'length',
                label: 'Length (e.g. under 150 words)',
                placeholder: 'Under 150 words',
                required: false
            },
            {
                id: 'bullet_points',
                label: 'Key points or notes',
                placeholder: 'Completed phase 1, starting phase 2',
                required: true,
                mapping: {
                    keywords: ['points', 'key_points', 'notes', 'bullets'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'deadline',
                label: 'Deadline (optional)',
                placeholder: 'March 15, 2024',
                required: false,
                mapping: {
                    keywords: ['deadline', 'due_date', 'by_date'],
                    entityTypes: ['deadlines', 'dates'],
                }
            },
        ],
        aiInstruction: 'Act as a professional business communicator. Write an email or letter to the specified audience about the given topic. Include: 3 subject line options if it is an email, short opening context, main message in clear short paragraphs based on the bullet points provided, specific call to action using the deadline if provided, and polite closing appropriate to the requested tone. Follow the specified length constraint. Do not use markdown; return plain text.',
    },
    {
        id: 'business_report',
        name: 'Reports (Status & Project)',
        description: 'Weekly/monthly status, project, or business reports',
        suggestedTitle: 'Project Status Report',
        fields: [
            {
                id: 'report_type',
                label: 'Report type (weekly, monthly, project, etc.)',
                placeholder: 'Weekly',
                required: true,
                mapping: {
                    keywords: ['report_type', 'type', 'frequency'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'topic',
                label: 'Report topic or project name',
                placeholder: 'Q1 Marketing Campaign',
                required: true,
                mapping: {
                    keywords: ['project', 'topic', 'campaign', 'initiative'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'period',
                label: 'Reporting period or date range',
                placeholder: 'Jan 1 - Jan 7, 2024',
                required: true,
                mapping: {
                    keywords: ['period', 'date_range', 'duration', 'timeframe'],
                    entityTypes: ['dates'],
                }
            },
            {
                id: 'objectives',
                label: 'Objectives or scope',
                placeholder: 'Launch campaign, track engagement',
                required: true,
                mapping: {
                    keywords: ['objectives', 'goals', 'scope', 'targets'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'metrics',
                label: 'Key metrics / KPIs',
                placeholder: '1000 leads, 5% conversion',
                required: false,
                mapping: {
                    keywords: ['metrics', 'kpis', 'numbers', 'statistics'],
                    entityTypes: ['amounts', 'other'],
                }
            },
            {
                id: 'issues',
                label: 'Issues and risks',
                placeholder: 'Budget overrun, timeline delay',
                required: false,
                mapping: {
                    keywords: ['issues', 'risks', 'challenges', 'problems'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'next_steps',
                label: 'Next steps and owners',
                placeholder: 'Review analytics - John, by Friday',
                required: true,
                mapping: {
                    keywords: ['next_steps', 'action_items', 'todos', 'follow_up'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'audience',
                label: 'Audience (e.g. leadership, team, client)',
                placeholder: 'Leadership',
                required: true,
                mapping: {
                    keywords: ['audience', 'stakeholders', 'readers'],
                    entityTypes: ['people', 'organizations'],
                }
            },
        ],
        aiInstruction: 'Act as a clear, data-focused report writer. Create a status/business report with: title and period, 3-5 bullet executive summary, objectives or scope section, key metrics or facts section, detailed sections for progress/results, issues and risks, and next steps with owners. Tone must be concise, professional, and factual. Use headings and bullet lists. Base the content on the provided objectives, metrics, issues, and notes. Return plain text with headings and bullets, no markdown syntax.',
    },
    {
        id: 'proposal_quotation',
        name: 'Proposals & Quotations',
        description: 'Sales proposals, internal project proposals, budget asks',
        suggestedTitle: 'Project Proposal',
        fields: [
            {
                id: 'project_or_service',
                label: 'Project / service / product',
                placeholder: 'Website Redesign',
                required: true,
                mapping: {
                    keywords: ['project', 'service', 'product', 'offering'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'client_or_stakeholder',
                label: 'Client or stakeholder name',
                placeholder: 'Acme Corp',
                required: true,
                mapping: {
                    keywords: ['client', 'customer', 'stakeholder', 'company'],
                    entityTypes: ['organizations', 'people'],
                }
            },
            {
                id: 'audience',
                label: 'Audience type (executives, technical, mixed)',
                placeholder: 'Executives',
                required: true,
                mapping: {
                    keywords: ['audience', 'readers'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'problem_opportunity',
                label: 'Problem or opportunity description',
                placeholder: 'Outdated website affecting conversions',
                required: true,
                mapping: {
                    keywords: ['problem', 'opportunity', 'challenge', 'issue'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'solution_approach',
                label: 'Proposed solution / approach',
                placeholder: 'Modern responsive design with CMS',
                required: true,
                mapping: {
                    keywords: ['solution', 'approach', 'methodology', 'strategy'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'scope_timeline',
                label: 'Scope and timeline details',
                placeholder: '3 months, 5 pages, mobile-first',
                required: true,
                mapping: {
                    keywords: ['scope', 'timeline', 'duration', 'deliverables'],
                    entityTypes: ['dates', 'other'],
                }
            },
            {
                id: 'benefits',
                label: 'Benefits and value points',
                placeholder: 'Increase conversions 30%, better UX',
                required: true,
                mapping: {
                    keywords: ['benefits', 'value', 'outcomes', 'results'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'pricing_notes',
                label: 'Pricing / budget notes',
                placeholder: '$50,000 total, payment in 3 milestones',
                required: false,
                mapping: {
                    keywords: ['pricing', 'budget', 'cost', 'investment', 'fee'],
                    entityTypes: ['amounts'],
                }
            },
            {
                id: 'constraints',
                label: 'Requirements or constraints',
                placeholder: 'Must integrate with existing CRM',
                required: false,
                mapping: {
                    keywords: ['constraints', 'requirements', 'limitations'],
                    entityTypes: ['other'],
                }
            },
        ],
        aiInstruction: 'Act as a senior consultant preparing a proposal. Draft a proposal for the specified project/service/product for the given client or stakeholder. Include: title and short overview, problem/opportunity description, proposed solution with approach, scope and timeline, benefits and value bulleted, pricing/budget section, implementation plan with phases, and clear call to action with decision deadline. Tone should be persuasive but realistic, appropriate for the specified audience. Base the proposal on the requirements, offer details, and constraints. Plain text only, no markdown.',
    },
    {
        id: 'policy_sop_manual',
        name: 'Policies, SOPs & Manuals',
        description: 'HR policies, process manuals, standard operating procedures',
        suggestedTitle: 'Standard Operating Procedure',
        fields: [
            {
                id: 'doc_type',
                label: 'Document type (policy, SOP, manual section)',
                placeholder: 'SOP',
                required: true,
                mapping: {
                    keywords: ['type', 'document_type'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'topic',
                label: 'Topic or process name',
                placeholder: 'Customer Onboarding Process',
                required: true,
                mapping: {
                    keywords: ['topic', 'process', 'procedure', 'subject'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'department',
                label: 'Department or team',
                placeholder: 'Customer Success',
                required: true,
                mapping: {
                    keywords: ['department', 'team', 'division', 'unit'],
                    entityTypes: ['organizations'],
                }
            },
            {
                id: 'roles',
                label: 'Roles and responsibilities',
                placeholder: 'CS Manager approves, Rep executes',
                required: true,
                mapping: {
                    keywords: ['roles', 'responsibilities', 'accountable', 'raci'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'steps',
                label: 'Step-by-step procedure',
                placeholder: '1. Receive signup 2. Send welcome email 3. Schedule call',
                required: true,
                mapping: {
                    keywords: ['steps', 'procedure', 'process', 'workflow'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'tools',
                label: 'Required tools/systems',
                placeholder: 'CRM, email platform, calendar',
                required: false,
                mapping: {
                    keywords: ['tools', 'systems', 'software', 'platforms'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'compliance',
                label: 'Compliance or policy rules',
                placeholder: 'GDPR compliance required',
                required: false,
                mapping: {
                    keywords: ['compliance', 'regulations', 'policies', 'rules'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'kpis',
                label: 'KPIs and quality checks',
                placeholder: 'Complete within 24 hours, 95% satisfaction',
                required: false,
                mapping: {
                    keywords: ['kpis', 'metrics', 'quality', 'sla'],
                    entityTypes: ['amounts', 'other'],
                }
            },
            {
                id: 'issues',
                label: 'Common issues and solutions',
                placeholder: 'Delayed response - escalate to manager',
                required: false,
                mapping: {
                    keywords: ['issues', 'problems', 'troubleshooting', 'faq'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'audience',
                label: 'Audience (team, company-wide, etc.)',
                placeholder: 'Team',
                required: true,
                mapping: {
                    keywords: ['audience', 'readers'],
                    entityTypes: ['other'],
                }
            },
        ],
        aiInstruction: 'Act as an operations/process documentation specialist. Write a structured policy/SOP/procedure manual section for the requested topic/department. Structure: title, purpose and objectives, scope (who/what is included or excluded), roles and responsibilities, step-by-step procedure (numbered steps), required tools/systems, compliance or policy rules, KPIs and quality checks, common issues and how to handle them. Tone must be clear, instructional, and easy for a new hire to follow. Use headings and numbered/bulleted lists. Base on the provided notes and rough steps. Plain text, no markdown syntax.',
    },
    {
        id: 'contract_skeleton',
        name: 'Contracts & Agreements (Skeletons)',
        description: 'NDAs, service agreements, employment agreements for later legal review',
        suggestedTitle: 'Service Agreement Skeleton',
        fields: [
            {
                id: 'contract_type',
                label: 'Type (NDA, service agreement, employment agreement, etc.)',
                placeholder: 'Service Agreement',
                required: true,
                mapping: {
                    keywords: ['contract_type', 'agreement_type', 'type'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'party_a',
                label: 'Party A (e.g. company name)',
                placeholder: 'ABC Corp',
                required: true,
                mapping: {
                    keywords: ['party_a', 'first_party', 'company', 'employer', 'provider'],
                    entityTypes: ['organizations'],
                }
            },
            {
                id: 'party_b',
                label: 'Party B (e.g. individual or company)',
                placeholder: 'John Doe Consulting',
                required: true,
                mapping: {
                    keywords: ['party_b', 'second_party', 'contractor', 'employee', 'client'],
                    entityTypes: ['people', 'organizations'],
                }
            },
            {
                id: 'effective_date',
                label: 'Effective date',
                placeholder: 'January 1, 2024',
                required: true,
                mapping: {
                    keywords: ['effective_date', 'start_date', 'commencement'],
                    entityTypes: ['dates'],
                }
            },
            {
                id: 'service_or_role',
                label: 'Service or role description',
                placeholder: 'Software development consulting',
                required: true,
                mapping: {
                    keywords: ['service', 'role', 'scope', 'work'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'key_points',
                label: 'Key points / terms to cover',
                placeholder: 'Payment terms, IP ownership, confidentiality',
                required: true,
                mapping: {
                    keywords: ['terms', 'key_points', 'clauses'],
                    entityTypes: ['other'],
                }
            },
        ],
        aiInstruction: 'Act as a professional technical writer (not a lawyer). Create a structured skeleton for the specified contract type that a qualified lawyer can review. Include sections: title and parties with effective date, purpose, definitions, main clauses covering scope of services/role, payment/compensation, confidentiality, IP ownership, term and termination, responsibilities of each party, high-level dispute resolution and governing law placeholders, and signature blocks. Use clear headings and numbered clauses. Do not add jurisdiction-specific legal language; leave placeholders for lawyers. Base the outline on the service/role description and key points. Plain text only.',
    },
    {
        id: 'financial_summary',
        name: 'Financial Summaries',
        description: 'Monthly/quarterly/annual summaries for P&L, performance, etc.',
        suggestedTitle: 'Monthly Financial Summary',
        fields: [
            {
                id: 'period_type',
                label: 'Type (monthly, quarterly, annual)',
                placeholder: 'Monthly',
                required: true,
                mapping: {
                    keywords: ['period_type', 'frequency', 'type'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'period',
                label: 'Period covered',
                placeholder: 'January 2024',
                required: true,
                mapping: {
                    keywords: ['period', 'month', 'quarter', 'year'],
                    entityTypes: ['dates'],
                }
            },
            {
                id: 'company_or_unit',
                label: 'Company or department name',
                placeholder: 'Sales Department',
                required: true,
                mapping: {
                    keywords: ['company', 'department', 'unit', 'division'],
                    entityTypes: ['organizations'],
                }
            },
            {
                id: 'key_numbers',
                label: 'Key numbers / P&L highlights',
                placeholder: 'Revenue $500k, Expenses $300k',
                required: true,
                mapping: {
                    keywords: ['revenue', 'expenses', 'profit', 'numbers', 'financials'],
                    entityTypes: ['amounts'],
                }
            },
            {
                id: 'variances',
                label: 'Key variances vs prior period or budget',
                placeholder: 'Revenue up 15%, costs down 5%',
                required: false,
                mapping: {
                    keywords: ['variances', 'changes', 'delta', 'comparison'],
                    entityTypes: ['amounts', 'other'],
                }
            },
            {
                id: 'drivers',
                label: 'Drivers of performance',
                placeholder: 'New product launch, cost optimization',
                required: false,
                mapping: {
                    keywords: ['drivers', 'factors', 'reasons', 'causes'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'recommendations',
                label: 'Action-oriented recommendations',
                placeholder: 'Increase marketing spend, hire 2 reps',
                required: false,
                mapping: {
                    keywords: ['recommendations', 'actions', 'suggestions'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'audience',
                label: 'Audience (non-finance stakeholders, leadership, etc.)',
                placeholder: 'Leadership',
                required: true,
                mapping: {
                    keywords: ['audience', 'readers', 'stakeholders'],
                    entityTypes: ['other'],
                }
            },
        ],
        aiInstruction: 'Act as a financial analyst creating a business-friendly summary. Write a financial summary for the given company/department and period. Include: title and period, 3-5 bullet executive summary of key figures, revenue and cost overview, profitability section (gross profit, net profit), key variances vs previous period or budget, simple commentary on drivers of performance, and action-oriented recommendations. Tone should be clear for non-finance stakeholders. Use headings and bullet points. Base everything on the provided numbers and notes. Plain text, no markdown symbols.',
    },
    {
        id: 'marketing_brief',
        name: 'Marketing Content Briefs',
        description: 'Campaign briefs, content briefs, social media plans',
        suggestedTitle: 'Campaign Brief',
        fields: [
            {
                id: 'channel_or_campaign',
                label: 'Channel or campaign name',
                placeholder: 'Q1 Email Campaign',
                required: true,
                mapping: {
                    keywords: ['campaign', 'channel', 'initiative'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'objective',
                label: 'Overview and objective',
                placeholder: 'Generate 500 qualified leads',
                required: true,
                mapping: {
                    keywords: ['objective', 'goal', 'target', 'aim'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'target_segment',
                label: 'Target audience',
                placeholder: 'B2B SaaS companies, 50-500 employees',
                required: true,
                mapping: {
                    keywords: ['target', 'audience', 'segment', 'demographic'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'product_info',
                label: 'Product/service info',
                placeholder: 'AI-powered analytics platform',
                required: true,
                mapping: {
                    keywords: ['product', 'service', 'offering'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'key_message',
                label: 'Key message and positioning',
                placeholder: 'Make better decisions faster with AI',
                required: true,
                mapping: {
                    keywords: ['message', 'positioning', 'tagline', 'value_prop'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'formats_assets',
                label: 'Content formats and required assets',
                placeholder: '5 emails, 3 landing pages, 10 social posts',
                required: true,
                mapping: {
                    keywords: ['formats', 'assets', 'deliverables', 'content'],
                    entityTypes: ['other'],
                }
            },
            {
                id: 'timeline',
                label: 'Timeline and milestones',
                placeholder: 'Launch Feb 1, review Feb 15',
                required: true,
                mapping: {
                    keywords: ['timeline', 'milestones', 'schedule', 'dates'],
                    entityTypes: ['dates', 'deadlines'],
                }
            },
            {
                id: 'kpis',
                label: 'KPIs and success metrics',
                placeholder: '20% open rate, 5% conversion',
                required: false,
                mapping: {
                    keywords: ['kpis', 'metrics', 'success', 'targets'],
                    entityTypes: ['amounts', 'other'],
                }
            },
            {
                id: 'constraints',
                label: 'Constraints or notes for the team',
                placeholder: 'Must comply with brand guidelines',
                required: false,
                mapping: {
                    keywords: ['constraints', 'notes', 'guidelines', 'requirements'],
                    entityTypes: ['other'],
                }
            },
        ],
        aiInstruction: 'Act as a marketing strategist. Create a content/campaign brief for the specified channel or campaign. Include: overview and objective, target audience, key message and positioning, content formats and required assets, timeline and milestones, and KPIs and success metrics. Tone should be practical and action-focused, for marketing and creative teams. Base it on the provided product info, goals, and constraints. Use headings and bullet lists. Plain text only.',
    },
];

export function getTemplateById(id: string): DocumentTemplate | undefined {
    return DOCUMENT_TEMPLATES.find((t) => t.id === id);
}

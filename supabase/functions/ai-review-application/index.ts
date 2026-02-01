import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RLSPolicyInfo {
  table_name: string;
  policy_count: number;
  has_rls: boolean;
}

interface PreviousReviewSummary {
  score: number;
  date: string;
  topIssues: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      focusAreas = ['all'], 
      projectContext,
      includeDatabase = true,
      includeUI = true,
      includeSecurity = true,
      includePerformance = true,
      includeComponents = true,
      includeOperational = true
    } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Gather comprehensive application context
    const applicationContext = await gatherApplicationContext(supabase, includeDatabase);

    // Get previous review for comparison
    const previousReview = await getPreviousReview(supabase);

    // Build comprehensive review prompt with enhanced context
    const reviewPrompt = buildEnhancedReviewPrompt({
      applicationContext,
      previousReview,
      projectContext,
      focusAreas,
      includeUI,
      includePerformance,
      includeSecurity,
      includeComponents,
      includeOperational,
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert full-stack software architect and engineering application specialist. 
You provide detailed, actionable code reviews with specific recommendations that include:
- Exact file paths when known
- Priority order for implementation
- Dependencies between fixes
- Test criteria for each fix
- Effort estimates

You must respond with valid JSON matching the specified format exactly.`
          },
          {
            role: "user",
            content: reviewPrompt
          }
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const reviewText = data.choices[0].message.content;
    
    let reviewData;
    try {
      reviewData = JSON.parse(reviewText);
    } catch (e) {
      console.error("Failed to parse JSON, returning raw text:", e);
      reviewData = {
        overallScore: 0,
        summary: reviewText,
        categories: {},
        quickWins: [],
        priorityActions: [],
        longTermRecommendations: []
      };
    }

    // Store the review in database for history with link to previous review
    const { data: savedReview, error: saveError } = await supabase
      .from('application_reviews')
      .insert({
        review_data: reviewData,
        focus_areas: focusAreas,
        overall_score: reviewData.overallScore || 0,
        review_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving review:", saveError);
    }

    return new Response(
      JSON.stringify({ 
        ...reviewData,
        reviewId: savedReview?.id,
        reviewDate: new Date().toISOString(),
        previousReviewScore: previousReview?.score,
        contextUsed: {
          tables: applicationContext.databaseTables.length,
          rlsPolicies: applicationContext.rlsPolicies.length,
          edgeFunctions: applicationContext.edgeFunctions.length,
          storageBuckets: applicationContext.storageBuckets.length,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-review-application function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

interface TableRelationship {
  table_name: string;
  column_name: string;
  foreign_table: string;
  foreign_column: string;
}

interface TableColumn {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: boolean;
}

interface FileStructureSummary {
  components: number;
  pages: number;
  hooks: number;
  utils: number;
  edgeFunctions: number;
  componentCategories: string[];
}

async function gatherApplicationContext(supabase: any, includeDatabase: boolean) {
  const context = {
    projectInfo: {
      name: "EngiOps Nexus",
      type: "Electrical Engineering Project Management",
      techStack: ["React", "TypeScript", "Tailwind CSS", "shadcn/ui", "Supabase", "TanStack Query"],
    },
    features: [
      "Project Management & Multi-project support",
      "Tenant Tracking & Management",
      "Generator Sizing & Reports",
      "Cost Reports & Budget Management",
      "Cable Schedules & Calculations",
      "Bulk Services Documentation (SANS 204)",
      "Floor Plan Designer with Equipment Placement",
      "Handover Document Management",
      "Staff Management & HR",
      "Site Diary & Task Management",
      "Messaging System",
      "Document Templates & PDF Generation",
      "AI-powered tools (chatbot, document generation, cost prediction, data analysis)",
    ],
    databaseTables: [] as string[],
    tableColumns: [] as TableColumn[],
    tableRelationships: [] as TableRelationship[],
    rlsPolicies: [] as RLSPolicyInfo[],
    edgeFunctions: [] as string[],
    storageBuckets: [] as string[],
    fileStructure: {
      components: 147,
      pages: 23,
      hooks: 34,
      utils: 28,
      edgeFunctions: 68,
      componentCategories: [
        "admin", "ai-tools", "budget", "cable-schedules", "cost-report",
        "documents", "floor-plan", "generator", "handover", "hr",
        "messaging", "projects", "reports", "site-diary", "tenants", "ui"
      ]
    } as FileStructureSummary,
  };

  if (includeDatabase) {
    try {
      // Get database tables
      const { data: tables } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .limit(100);
      
      context.databaseTables = (tables?.map((t: any) => t.table_name) || []) as string[];

      // Get table columns for key tables (first 20)
      const keyTables = context.databaseTables.slice(0, 20);
      for (const tableName of keyTables) {
        try {
          const { data: columns } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable')
            .eq('table_schema', 'public')
            .eq('table_name', tableName)
            .limit(50);
          
          if (columns) {
            context.tableColumns.push(...columns.map((c: any) => ({
              table_name: tableName,
              column_name: c.column_name,
              data_type: c.data_type,
              is_nullable: c.is_nullable === 'YES',
            })));
          }
        } catch (e) {
          // Skip if can't get column info
        }
      }

      // Get foreign key relationships
      try {
        const { data: fkData } = await supabase.rpc('get_table_relationships');
        if (fkData) {
          context.tableRelationships = fkData;
        }
      } catch (e) {
        // Fallback: extract relationships from common patterns
        console.log("Could not get FK relationships via RPC, using pattern-based detection");
        context.tableRelationships = inferRelationshipsFromColumns(context.tableColumns);
      }

      // Get RLS status for each table
      for (const tableName of context.databaseTables.slice(0, 30)) {
        try {
          const { count } = await supabase
            .from('pg_policies')
            .select('*', { count: 'exact', head: true })
            .eq('tablename', tableName);
          
          context.rlsPolicies.push({
            table_name: tableName,
            policy_count: count || 0,
            has_rls: (count || 0) > 0,
          });
        } catch (e) {
          // Skip if can't get policy info
        }
      }
    } catch (e) {
      console.error("Error gathering database context:", e);
    }

    // Get storage buckets
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      context.storageBuckets = buckets?.map((b: any) => b.name) || [];
    } catch (e) {
      console.error("Error gathering storage context:", e);
    }
  }

  // Edge functions list - comprehensive from codebase
  context.edgeFunctions = [
    "ai-chat", "ai-review-application", "send-review-findings",
    "generate-cable-schedule-report", "generate-cost-report", "generate-generator-report",
    "generate-handover-report", "generate-bulk-services-report",
    "process-document", "embed-document", "send-notification-email",
    "ai-cost-prediction", "ai-data-analysis", "ai-document-generator",
    "analyze-project-data", "create-database-backup", "send-message-notification",
  ];

  return context;
}

// Infer relationships from column naming patterns (e.g., project_id -> projects.id)
function inferRelationshipsFromColumns(columns: TableColumn[]): TableRelationship[] {
  const relationships: TableRelationship[] = [];
  const tableNames = new Set(columns.map(c => c.table_name));
  
  for (const col of columns) {
    if (col.column_name.endsWith('_id') && col.column_name !== 'id') {
      // Extract potential foreign table name
      const foreignTableSingular = col.column_name.replace('_id', '');
      const foreignTablePlural = foreignTableSingular + 's';
      const foreignTableWithEs = foreignTableSingular + 'es';
      
      // Check if foreign table exists
      let foreignTable = '';
      if (tableNames.has(foreignTablePlural)) {
        foreignTable = foreignTablePlural;
      } else if (tableNames.has(foreignTableWithEs)) {
        foreignTable = foreignTableWithEs;
      } else if (tableNames.has(foreignTableSingular)) {
        foreignTable = foreignTableSingular;
      }
      
      if (foreignTable && foreignTable !== col.table_name) {
        relationships.push({
          table_name: col.table_name,
          column_name: col.column_name,
          foreign_table: foreignTable,
          foreign_column: 'id',
        });
      }
    }
  }
  
  return relationships;
}

interface DetailedIssue {
  category: string;
  severity: string;
  title: string;
  description: string;
}

interface EnhancedPreviousReview extends PreviousReviewSummary {
  allIssues: DetailedIssue[];
  categoryScores: Record<string, number>;
  quickWinsCount: number;
  priorityActionsCount: number;
}

async function getPreviousReview(supabase: any): Promise<EnhancedPreviousReview | null> {
  try {
    const { data } = await supabase
      .from('application_reviews')
      .select('overall_score, review_date, review_data')
      .order('review_date', { ascending: false })
      .limit(1)
      .single();

    if (!data) return null;

    const reviewData = data.review_data as any;
    const topIssues: string[] = [];
    const allIssues: DetailedIssue[] = [];
    const categoryScores: Record<string, number> = {};

    // Extract ALL issues from previous review for comprehensive tracking
    if (reviewData?.categories) {
      for (const [category, catData] of Object.entries(reviewData.categories)) {
        const catInfo = catData as any;
        const issues = catInfo?.issues || [];
        
        // Store category score
        if (catInfo?.score !== undefined) {
          categoryScores[category] = catInfo.score;
        }
        
        // Store all issues for comparison
        for (const issue of issues) {
          allIssues.push({
            category,
            severity: issue.severity || 'medium',
            title: issue.title || 'Untitled',
            description: issue.description || '',
          });
          
          // Also track high-priority for summary
          if (issue.severity === 'high' || issue.severity === 'critical') {
            topIssues.push(`${category}: ${issue.title}`);
          }
        }
      }
    }

    return {
      score: data.overall_score,
      date: data.review_date,
      topIssues: topIssues.slice(0, 10),
      allIssues,
      categoryScores,
      quickWinsCount: reviewData?.quickWins?.length || 0,
      priorityActionsCount: reviewData?.priorityActions?.length || 0,
    };
  } catch (e) {
    console.error("Error fetching previous review:", e);
    return null;
  }
}

interface ReviewPromptParams {
  applicationContext: any;
  previousReview: EnhancedPreviousReview | null;
  projectContext: any;
  focusAreas: string[];
  includeUI: boolean;
  includePerformance: boolean;
  includeSecurity: boolean;
  includeComponents: boolean;
  includeOperational: boolean;
}

function buildEnhancedReviewPrompt(params: ReviewPromptParams): string {
  const {
    applicationContext,
    previousReview,
    projectContext,
    focusAreas,
    includeUI,
    includePerformance,
    includeSecurity,
    includeComponents,
    includeOperational,
  } = params;

  // Build file structure summary
  const fs = applicationContext.fileStructure;
  const fileStructureSummary = `
├── src/components/ (${fs.components} components)
│   └── Categories: ${fs.componentCategories.join(', ')}
├── src/pages/ (${fs.pages} pages)
├── src/hooks/ (${fs.hooks} custom hooks)
├── src/utils/ (${fs.utils} utility modules)
└── supabase/functions/ (${fs.edgeFunctions} edge functions)`;

  // Build RLS summary
  const tablesWithRLS = applicationContext.rlsPolicies.filter((p: RLSPolicyInfo) => p.has_rls);
  const tablesWithoutRLS = applicationContext.rlsPolicies.filter((p: RLSPolicyInfo) => !p.has_rls);

  let rlsSummary = `Tables with RLS: ${tablesWithRLS.length}/${applicationContext.rlsPolicies.length}\n`;
  if (tablesWithoutRLS.length > 0) {
    rlsSummary += `⚠️ Tables WITHOUT RLS: ${tablesWithoutRLS.map((t: RLSPolicyInfo) => t.table_name).join(', ')}\n`;
  }

  // Build database schema summary with relationships
  const tableColumns = applicationContext.tableColumns || [];
  const tableRelationships = applicationContext.tableRelationships || [];
  
  // Group columns by table for schema summary
  const schemaByTable: Record<string, string[]> = {};
  for (const col of tableColumns.slice(0, 100)) {
    if (!schemaByTable[col.table_name]) {
      schemaByTable[col.table_name] = [];
    }
    const nullable = col.is_nullable ? '?' : '';
    schemaByTable[col.table_name].push(`${col.column_name}${nullable}: ${col.data_type}`);
  }
  
  let schemaSummary = '';
  const keyTables = ['projects', 'tenants', 'cable_schedules', 'electrical_budgets', 'employees', 'messages'];
  for (const tableName of keyTables) {
    if (schemaByTable[tableName]) {
      const cols = schemaByTable[tableName].slice(0, 8);
      schemaSummary += `\n**${tableName}:** ${cols.join(', ')}${schemaByTable[tableName].length > 8 ? '...' : ''}`;
    }
  }

  // Build relationships summary
  let relationshipsSummary = '';
  if (tableRelationships.length > 0) {
    const keyRelationships = tableRelationships.slice(0, 15);
    relationshipsSummary = keyRelationships
      .map((r: TableRelationship) => `  ${r.table_name}.${r.column_name} → ${r.foreign_table}.${r.foreign_column}`)
      .join('\n');
  }

  // Build comprehensive previous review context
  let previousReviewContext = '';
  if (previousReview) {
    const daysSinceReview = Math.floor((Date.now() - new Date(previousReview.date).getTime()) / (1000 * 60 * 60 * 24));
    
    // Category score summary
    const categoryScoreLines = Object.entries(previousReview.categoryScores || {})
      .map(([cat, score]) => `  ${cat}: ${score}/100`)
      .join('\n');

    // Group issues by severity
    const criticalIssues = previousReview.allIssues.filter(i => i.severity === 'critical');
    const highIssues = previousReview.allIssues.filter(i => i.severity === 'high');
    const mediumIssues = previousReview.allIssues.filter(i => i.severity === 'medium');

    previousReviewContext = `
═══════════════════════════════════════════════════════════════
PREVIOUS REVIEW COMPARISON (${daysSinceReview} days ago)
═══════════════════════════════════════════════════════════════

**Previous Overall Score:** ${previousReview.score}/100
**Quick Wins Identified:** ${previousReview.quickWinsCount}
**Priority Actions:** ${previousReview.priorityActionsCount}

**Category Scores:**
${categoryScoreLines}

**Outstanding Issues to Track:**
${criticalIssues.length > 0 ? `\n🔴 CRITICAL (${criticalIssues.length}):
${criticalIssues.slice(0, 5).map(i => `  - [${i.category}] ${i.title}`).join('\n')}` : ''}
${highIssues.length > 0 ? `\n🟠 HIGH (${highIssues.length}):
${highIssues.slice(0, 5).map(i => `  - [${i.category}] ${i.title}`).join('\n')}` : ''}
${mediumIssues.length > 0 ? `\n🟡 MEDIUM (${mediumIssues.length}):
${mediumIssues.slice(0, 3).map(i => `  - [${i.category}] ${i.title}`).join('\n')}` : ''}

**IMPORTANT:** Compare this review against the previous one:
1. Identify which issues from above have been RESOLVED
2. Identify which issues are STILL PRESENT (persistent)
3. Identify any NEW issues not in the previous review
4. Note any score improvements or regressions by category
`;
  }

  const reviewPrompt = `You are an expert software architect and code reviewer specializing in full-stack applications. 
Perform a comprehensive review of this electrical engineering project management application.

═══════════════════════════════════════════════════════════════
APPLICATION OVERVIEW
═══════════════════════════════════════════════════════════════

**Project:** ${applicationContext.projectInfo.name}
**Type:** ${applicationContext.projectInfo.type}
**Tech Stack:** ${applicationContext.projectInfo.techStack.join(', ')}

═══════════════════════════════════════════════════════════════
CODEBASE STRUCTURE
═══════════════════════════════════════════════════════════════
${fileStructureSummary}

═══════════════════════════════════════════════════════════════
CURRENT FEATURES
═══════════════════════════════════════════════════════════════

${applicationContext.features.map((f: string) => `• ${f}`).join('\n')}

═══════════════════════════════════════════════════════════════
DATABASE SCHEMA & RELATIONSHIPS
═══════════════════════════════════════════════════════════════

**Total Tables:** ${applicationContext.databaseTables.length}
**All Tables:** ${applicationContext.databaseTables.join(', ')}

**Key Table Schemas:**${schemaSummary}

**Table Relationships (Foreign Keys):**
${relationshipsSummary || '  (Could not retrieve - using pattern-based inference)'}

**RLS Security Status:**
${rlsSummary}

**Storage Buckets:** ${applicationContext.storageBuckets.join(', ') || 'None configured'}

**Edge Functions (${applicationContext.edgeFunctions.length}):**
${applicationContext.edgeFunctions.join(', ')}

${previousReviewContext}

═══════════════════════════════════════════════════════════════
FOCUS AREAS: ${focusAreas.join(', ')}
═══════════════════════════════════════════════════════════════

REVIEW REQUIREMENTS:
Provide a detailed analysis covering:

${includeUI ? `
**1. User Experience & Interface:**
- UI/UX improvements with specific component paths
- Accessibility issues (ARIA, keyboard navigation, color contrast)
- Mobile responsiveness problems
- Navigation and workflow optimization
- Design consistency issues
- Loading state handling
` : ''}

${includePerformance ? `
**2. Performance Optimization:**
- Frontend performance issues (bundle size, lazy loading)
- Database query optimization opportunities
- Caching strategies recommendations
- Large dataset handling (virtualization needs)
- Image optimization opportunities
- API call optimization
` : ''}

${includeSecurity ? `
**3. Security & Data Protection:**
- RLS policy gaps and recommendations
- Authentication/authorization issues
- Data validation vulnerabilities
- Sensitive data handling problems
- API security concerns
- Input sanitization issues
` : ''}

${includeComponents ? `
**4. Component Structure & Reusability:**
- Component organization issues
- Reusable component opportunities
- Props design improvements
- Component composition patterns
- Shared utilities and hooks
- Design system adherence
` : ''}

${includeOperational ? `
**5. Operational Functionality & Workflows:**
- Business workflow efficiency issues
- Feature completeness gaps for electrical engineering
- User journey optimization opportunities
- Automation opportunities
- Integration improvements
- Reporting and analytics gaps
- Data entry workflow improvements
` : ''}

**6. Code Quality & Architecture:**
- Code organization and structure issues
- Type safety improvements needed
- Error handling pattern issues
- State management concerns

**7. Technical Debt:**
- Deprecated patterns found
- Inconsistencies to address
- Code duplication to refactor
- Dependency updates needed

**8. Best Practices:**
- React best practices violations
- TypeScript usage improvements
- Supabase pattern issues
- Testing coverage gaps

═══════════════════════════════════════════════════════════════
RESPONSE FORMAT (JSON)
═══════════════════════════════════════════════════════════════

Return a JSON object with this EXACT structure:
{
  "overallScore": number (0-100),
  "summary": "Brief executive summary (2-3 sentences)",
  "categories": {
    "ux": {
      "score": number (0-100),
      "issues": [
        {
          "severity": "critical" | "high" | "medium" | "low",
          "title": "Clear issue title",
          "description": "What the problem is",
          "recommendation": "Specific fix with file paths if known",
          "affectedFiles": ["src/components/...", "src/pages/..."],
          "estimatedEffort": "1-2 hours" | "half day" | "1 day" | "2-3 days" | "1 week+"
        }
      ],
      "strengths": ["What's working well"]
    },
    "performance": { same structure },
    "security": { same structure },
    "components": { same structure },
    "operational": { same structure },
    "codeQuality": { same structure },
    "technicalDebt": { same structure }
  },
  "quickWins": [
    {
      "title": "Quick win title",
      "effort": "low" | "medium" | "high",
      "impact": "low" | "medium" | "high",
      "description": "What to do and why",
      "affectedFiles": ["src/..."]
    }
  ],
  "priorityActions": [
    {
      "priority": 1-5,
      "title": "Action title",
      "description": "Detailed description with implementation steps",
      "estimatedEffort": "2 hours",
      "dependencies": ["Other actions this depends on"],
      "testCriteria": ["How to verify this is fixed"]
    }
  ],
  "longTermRecommendations": ["Strategic recommendations"],
  "resolvedFromPrevious": ["Issues from previous review that appear resolved"],
  "newIssues": ["Issues not present in previous review"]
}

Be specific, actionable, and prioritize recommendations that will have the most impact for an electrical engineering project management application.`;

  return reviewPrompt;
}

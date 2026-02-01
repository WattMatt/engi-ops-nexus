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
    rlsPolicies: [] as RLSPolicyInfo[],
    edgeFunctions: [] as string[],
    storageBuckets: [] as string[],
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

  // Edge functions are known from the codebase
  context.edgeFunctions = [
    "ai-chat", "ai-review-application", "send-review-findings",
    "generate-cable-schedule-report", "generate-cost-report",
    "process-document", "embed-document", "send-notification-email",
  ];

  return context;
}

async function getPreviousReview(supabase: any): Promise<PreviousReviewSummary | null> {
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

    // Extract top issues from previous review
    if (reviewData?.categories) {
      for (const [category, catData] of Object.entries(reviewData.categories)) {
        const issues = (catData as any)?.issues || [];
        const highIssues = issues.filter((i: any) => i.severity === 'high' || i.severity === 'critical');
        topIssues.push(...highIssues.slice(0, 2).map((i: any) => `${category}: ${i.title}`));
      }
    }

    return {
      score: data.overall_score,
      date: data.review_date,
      topIssues: topIssues.slice(0, 5),
    };
  } catch (e) {
    return null;
  }
}

interface ReviewPromptParams {
  applicationContext: any;
  previousReview: PreviousReviewSummary | null;
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

  // Build RLS summary
  const tablesWithRLS = applicationContext.rlsPolicies.filter((p: RLSPolicyInfo) => p.has_rls);
  const tablesWithoutRLS = applicationContext.rlsPolicies.filter((p: RLSPolicyInfo) => !p.has_rls);

  let rlsSummary = `Tables with RLS: ${tablesWithRLS.length}/${applicationContext.rlsPolicies.length}\n`;
  if (tablesWithoutRLS.length > 0) {
    rlsSummary += `⚠️ Tables WITHOUT RLS: ${tablesWithoutRLS.map((t: RLSPolicyInfo) => t.table_name).join(', ')}\n`;
  }

  // Build previous review context
  let previousReviewContext = '';
  if (previousReview) {
    previousReviewContext = `
PREVIOUS REVIEW (${new Date(previousReview.date).toLocaleDateString()}):
- Previous Score: ${previousReview.score}/100
- Unresolved High-Priority Issues:
${previousReview.topIssues.map(i => `  - ${i}`).join('\n')}

Please identify which issues from the previous review may still be relevant and which should be considered resolved.
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
CURRENT FEATURES
═══════════════════════════════════════════════════════════════

${applicationContext.features.map((f: string) => `• ${f}`).join('\n')}

═══════════════════════════════════════════════════════════════
DATABASE CONTEXT
═══════════════════════════════════════════════════════════════

**Total Tables:** ${applicationContext.databaseTables.length}
**Key Tables:** ${applicationContext.databaseTables.slice(0, 20).join(', ')}

**RLS Security Status:**
${rlsSummary}

**Storage Buckets:** ${applicationContext.storageBuckets.join(', ') || 'None configured'}

**Edge Functions (${applicationContext.edgeFunctions.length}):**
${applicationContext.edgeFunctions.join(', ')}

═══════════════════════════════════════════════════════════════
KNOWN CODEBASE PATTERNS
═══════════════════════════════════════════════════════════════

• Components in src/components/ organized by feature
• Pages in src/pages/ with React Router
• Custom hooks in src/hooks/
• Supabase client in src/integrations/supabase/
• Edge functions in supabase/functions/
• Tailwind CSS with shadcn/ui component library
• TanStack Query for data fetching
• React Hook Form + Zod for form validation
• PDFMake for PDF generation
• Recharts for data visualization

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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Gather application context
    let applicationContext: {
      projectInfo: any;
      features: string[];
      databaseTables: string[];
      edgeFunctions: string[];
      storageBuckets: string[];
    } = {
      projectInfo: projectContext || {},
      features: [],
      databaseTables: [],
      edgeFunctions: [],
      storageBuckets: [],
    };

    // Get database schema if requested
    if (includeDatabase) {
      const { data: tables } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .limit(50);
      
      applicationContext.databaseTables = (tables?.map((t: any) => t.table_name) || []) as string[];
    }

    // Build comprehensive review prompt
    const reviewPrompt = `You are an expert software architect and code reviewer specializing in full-stack applications. 
Perform a comprehensive review of this electrical engineering project management application.

APPLICATION OVERVIEW:
This is a React + TypeScript application with Supabase backend (PostgreSQL + Edge Functions).
Tech Stack: React, TypeScript, Tailwind CSS, shadcn/ui, Recharts, Supabase, TanStack Query

CURRENT FEATURES:
- Project Management & Multi-project support
- Tenant Tracking & Management
- Generator Sizing & Reports
- Cost Reports & Budget Management
- Cable Schedules & Calculations
- Bulk Services Documentation (SANS 204)
- Floor Plan Designer with Equipment Placement
- Handover Document Management
- Staff Management & HR
- Site Diary & Task Management
- Messaging System
- Document Templates & PDF Generation
- AI-powered tools (chatbot, document generation, cost prediction, data analysis)

DATABASE TABLES: ${applicationContext.databaseTables.join(', ')}

PROJECT CONTEXT: ${JSON.stringify(applicationContext.projectInfo, null, 2)}

FOCUS AREAS: ${focusAreas.join(', ')}

REVIEW REQUIREMENTS:
Provide a detailed analysis covering:

${includeUI ? `
1. **User Experience & Interface:**
   - UI/UX improvements
   - Accessibility issues
   - Mobile responsiveness
   - Navigation and workflow optimization
   - Design consistency
` : ''}

${includePerformance ? `
2. **Performance Optimization:**
   - Frontend performance issues
   - Database query optimization
   - Caching strategies
   - Bundle size optimization
   - Loading states and perceived performance
` : ''}

${includeSecurity ? `
3. **Security & Data Protection:**
   - RLS policy coverage
   - Authentication/authorization gaps
   - Data validation issues
   - Sensitive data handling
   - API security
` : ''}

${includeComponents ? `
4. **Component Structure & Reusability:**
   - Component organization and file structure
   - Reusable component patterns
   - Props design and API consistency
   - Component composition patterns
   - Shared utilities and hooks
   - Design system adherence
` : ''}

${includeOperational ? `
5. **Operational Functionality & Workflows:**
   - Business workflow efficiency
   - Feature completeness for electrical engineering tasks
   - User journey optimization
   - Automation opportunities
   - Integration improvements
   - Reporting and analytics enhancements
   - Data entry and validation workflows
` : ''}

6. **Code Quality & Architecture:**
   - Code organization and structure
   - Type safety improvements
   - Error handling patterns
   - State management

7. **Technical Debt:**
   - Deprecated patterns
   - Inconsistencies
   - Code duplication
   - Outdated dependencies

8. **Best Practices:**
   - React best practices
   - TypeScript usage
   - Supabase patterns
   - Testing coverage

RESPONSE FORMAT:
Return a JSON object with this structure:
{
  "overallScore": number (0-100),
  "summary": "Brief executive summary",
  "categories": {
    "ux": {
      "score": number (0-100),
      "issues": [{"severity": "high|medium|low", "title": "", "description": "", "recommendation": ""}],
      "strengths": [""]
    },
    "performance": { same structure },
    "security": { same structure },
    "components": { same structure },
    "operational": { same structure },
    "codeQuality": { same structure },
    "technicalDebt": { same structure }
  },
  "quickWins": [{"title": "", "effort": "low|medium|high", "impact": "low|medium|high", "description": ""}],
  "priorityActions": [{"priority": 1-5, "title": "", "description": "", "estimatedEffort": ""}],
  "longTermRecommendations": [""]
}

Be specific, actionable, and prioritize recommendations that will have the most impact for an electrical engineering project management application.`;

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
            content: "You are an expert full-stack software architect and engineering application specialist. Provide detailed, actionable code reviews with specific recommendations. You must respond with valid JSON."
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

    // Store the review in database for history
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
        reviewDate: new Date().toISOString()
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

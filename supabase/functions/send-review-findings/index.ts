import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, DEFAULT_FROM_ADDRESSES } from "../_shared/email.ts";
import { emailWrapper } from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReviewFinding {
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  recommendation: string;
  location?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting AI application review...");

    // Perform AI review
    const reviewResponse = await fetch(`${supabaseUrl}/functions/v1/ai-review-application`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        focusAreas: ["ui", "performance", "security", "architecture"],
        projectContext: "Full electrical engineering project management application",
        includeDatabase: true,
      }),
    });

    if (!reviewResponse.ok) {
      const errorText = await reviewResponse.text();
      throw new Error(`Review failed: ${errorText}`);
    }

    const reviewData = await reviewResponse.json();
    console.log("Review completed, processing findings...");

    // Extract all findings from the review - FIXED to use correct structure
    const findings: ReviewFinding[] = [];

    // Handle the correct response format: categories[categoryKey].issues
    if (reviewData.categories && typeof reviewData.categories === 'object') {
      for (const [categoryKey, categoryData] of Object.entries(reviewData.categories)) {
        const category = categoryData as {
          score?: number;
          issues?: Array<{
            severity?: string;
            title?: string;
            description?: string;
            recommendation?: string;
            location?: string;
          }>;
          strengths?: string[];
        };
        
        if (category.issues && Array.isArray(category.issues)) {
          for (const issue of category.issues) {
            findings.push({
              category: formatCategoryName(categoryKey),
              severity: normalizeSeverity(issue.severity),
              title: issue.title || "Untitled Finding",
              description: issue.description || "",
              recommendation: issue.recommendation || "",
              location: issue.location,
            });
          }
        }
      }
    }

    // Also include quick wins as findings
    if (reviewData.quickWins && Array.isArray(reviewData.quickWins)) {
      for (const win of reviewData.quickWins) {
        findings.push({
          category: "Quick Win",
          severity: win.impact === "high" ? "high" : "medium",
          title: win.title || "Untitled Quick Win",
          description: win.description || "",
          recommendation: `Effort: ${win.effort}, Impact: ${win.impact}`,
        });
      }
    }

    // Include priority actions
    if (reviewData.priorityActions && Array.isArray(reviewData.priorityActions)) {
      for (const action of reviewData.priorityActions) {
        findings.push({
          category: "Priority Action",
          severity: action.priority <= 2 ? "critical" : action.priority <= 3 ? "high" : "medium",
          title: action.title || "Untitled Priority Action",
          description: action.description || "",
          recommendation: `Priority: ${action.priority}, Effort: ${action.estimatedEffort}`,
        });
      }
    }

    console.log(`Found ${findings.length} findings to report`);

    // Build consolidated email with all findings
    const severityEmoji = {
      critical: "🔴",
      high: "🟠",
      medium: "🟡",
      low: "🟢",
    };

    const severityColors = {
      critical: { badge: "badge-red", border: "#ef4444" },
      high: { badge: "badge-orange", border: "#f97316" },
      medium: { badge: "badge-orange", border: "#f59e0b" },
      low: { badge: "badge-green", border: "#10b981" },
    };

    // Count by severity
    const criticalCount = findings.filter((f) => f.severity === "critical").length;
    const highCount = findings.filter((f) => f.severity === "high").length;
    const mediumCount = findings.filter((f) => f.severity === "medium").length;
    const lowCount = findings.filter((f) => f.severity === "low").length;

    // Generate findings HTML (limit to top 15 for email)
    const topFindings = findings
      .sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return order[a.severity] - order[b.severity];
      })
      .slice(0, 15);

    const findingsHtml = topFindings
      .map((finding) => {
        const config = severityColors[finding.severity];
        return `
          <div class="card" style="margin-bottom: 12px; border-left: 3px solid ${config.border};">
            <p style="margin: 0 0 8px 0;">
              <span class="badge ${config.badge}">${severityEmoji[finding.severity]} ${finding.severity.toUpperCase()}</span>
              <span class="badge badge-blue" style="margin-left: 8px;">${finding.category}</span>
            </p>
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #1f2937;">${finding.title}</p>
            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">${finding.description}</p>
            ${finding.location ? `<p class="meta" style="margin: 0;">📍 ${finding.location}</p>` : ""}
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 13px; color: #059669;">💡 ${finding.recommendation}</p>
            </div>
          </div>
        `;
      })
      .join("");

    const emailContent = `
      <p style="margin: 0 0 16px 0; font-size: 15px;">Hi Team,</p>
      
      <p style="margin: 0 0 20px 0; font-size: 15px;">
        The automated application review has been completed. Here's a summary of the findings:
      </p>
      
      <div style="margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 8px;">
        <p style="margin: 0 0 12px 0; font-weight: 600; font-size: 16px;">
          📊 Overall Score: ${reviewData.overallScore || 'N/A'}/100
        </p>
        <p style="margin: 0; color: #64748b; font-size: 14px;">
          ${reviewData.summary || 'No summary available'}
        </p>
      </div>
      
      <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px;">
        ${criticalCount > 0 ? `<span class="badge badge-red">🔴 ${criticalCount} Critical</span>` : ""}
        ${highCount > 0 ? `<span class="badge badge-orange">🟠 ${highCount} High</span>` : ""}
        ${mediumCount > 0 ? `<span class="badge badge-orange">🟡 ${mediumCount} Medium</span>` : ""}
        ${lowCount > 0 ? `<span class="badge badge-green">🟢 ${lowCount} Low</span>` : ""}
      </div>
      
      <div class="divider"></div>
      
      <p style="margin: 0 0 16px 0; font-weight: 600; font-size: 16px;">Findings (${topFindings.length} of ${findings.length})</p>
      
      ${findingsHtml}
      
      ${findings.length > 15 ? `
        <p class="meta" style="text-align: center; margin-top: 16px;">
          + ${findings.length - 15} more findings in full report
        </p>
      ` : ""}
      
      <p class="meta" style="margin-top: 24px; text-align: center;">
        Review Date: ${new Date().toLocaleString()}
      </p>
    `;

    const emailHtml = emailWrapper(
      emailContent,
      "🔍 Application Review Complete",
      `${findings.length} findings detected`
    );

    // Send consolidated email via Resend
    const emailResult = await sendEmail({
      to: "arno@wmeng.co.za",
      subject: `Application Review: ${findings.length} findings (${criticalCount} critical, ${highCount} high) - Score: ${reviewData.overallScore || 'N/A'}/100`,
      html: emailHtml,
      from: DEFAULT_FROM_ADDRESSES.system,
      tags: [
        { name: "type", value: "review_findings" },
        { name: "findings_count", value: String(findings.length) },
        { name: "critical_count", value: String(criticalCount) },
        { name: "overall_score", value: String(reviewData.overallScore || 0) },
      ],
    });

    console.log(`Consolidated review email sent: ${emailResult.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        totalFindings: findings.length,
        emailId: emailResult.id,
        reviewData: reviewData,
        findingsByCategory: {
          critical: criticalCount,
          high: highCount,
          medium: mediumCount,
          low: lowCount,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in send-review-findings:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// Helper function to format category names
function formatCategoryName(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// Helper function to normalize severity values
function normalizeSeverity(severity?: string): "critical" | "high" | "medium" | "low" {
  if (!severity) return "medium";
  const normalized = severity.toLowerCase();
  if (normalized === "critical") return "critical";
  if (normalized === "high") return "high";
  if (normalized === "low") return "low";
  return "medium";
}

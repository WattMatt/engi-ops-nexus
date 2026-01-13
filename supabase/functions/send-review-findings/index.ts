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

    // Extract all findings from the review
    const findings: ReviewFinding[] = [];

    if (reviewData.sections) {
      for (const section of reviewData.sections) {
        if (section.findings && Array.isArray(section.findings)) {
          for (const finding of section.findings) {
            findings.push({
              category: section.category || "General",
              severity: finding.severity || "medium",
              title: finding.title || "Untitled Finding",
              description: finding.description || "",
              recommendation: finding.recommendation || "",
              location: finding.location,
            });
          }
        }
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
      .map((finding, index) => {
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
      subject: `Application Review: ${findings.length} findings (${criticalCount} critical, ${highCount} high)`,
      html: emailHtml,
      from: DEFAULT_FROM_ADDRESSES.system,
      tags: [
        { name: "type", value: "review_findings" },
        { name: "findings_count", value: String(findings.length) },
        { name: "critical_count", value: String(criticalCount) },
      ],
    });

    console.log(`Consolidated review email sent: ${emailResult.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        totalFindings: findings.length,
        emailId: emailResult.id,
        reviewData: reviewData,
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
